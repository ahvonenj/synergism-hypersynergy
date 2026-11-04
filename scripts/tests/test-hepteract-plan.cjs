const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Copy of the game's autoCraftHepteracts (Hepteracts.ts), on a plan type. Returns the hepteracts it spends.
function gameAutoCraft(type, amount) {
    let baseCap = type.baseCapacity;
    let heptCap = type.finalCapacity;
    let amountToCraft = Math.floor(amount / type.unitCost);
    let amountCrafted = 0;

    let craft = Math.min(heptCap - type.balance, amountToCraft);
    type.balance += craft;
    amountCrafted += craft;
    amountToCraft -= craft;

    while (type.balance >= heptCap && amountToCraft >= baseCap) {
        type.balance -= baseCap;
        heptCap *= 2;
        baseCap *= 2;

        craft = Math.min(heptCap - type.balance, amountToCraft);
        type.balance += craft;
        amountCrafted += craft;
        amountToCraft -= craft;
    }

    type.baseCapacity = baseCap;
    type.finalCapacity = heptCap;
    return amountCrafted * type.unitCost;
}

// The Hepteract Distributor's plan (docs/features/hepteract-distributor.md): fixed cases, then invariants on random
// inputs, each plan also crafted through the copy of the game's auto-craft, as the run does.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-distributor-plan.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
    });
    const runtime = new Module(path.join(root, 'hepteract-plan-test-runtime.cjs'), module);
    runtime._compile(bundled.outputFiles[0].text, runtime.filename = path.join(root, 'hepteract-plan-test-runtime.cjs'));
    const { nextHepteractStep, applyHepteractStep, planHepteractDistribution, hepteractCraftAmount } = runtime.exports;
    const hept = (key, ratio, unitCost, balance, baseCapacity, finalCapacity = baseCapacity) => ({ key, ratio, unitCost, balance, baseCapacity, finalCapacity });
    let scenarios = 0;

    // Crafts a plan as the run does: one type at a time, each changing its balance or its capacity, none off its plan
    const craftThroughGame = (state, plan, label) => {
        const live = state.types.map(type => ({ ...type }));
        let owned = state.hepteracts;
        for (const target of plan.targets) {
            const type = live.find(candidate => candidate.key === target.key);
            const before = { ...type };
            owned = Math.max(0, owned - gameAutoCraft(type, hepteractCraftAmount(target, owned, type.unitCost)));
            assert.ok(type.balance !== before.balance || type.finalCapacity !== before.finalCapacity, label);
            // A partial type takes what is left, a few float steps off the plan on a large stock
            if (target.partial) assert.ok(Math.abs(type.balance - target.balance) <= target.balance * 1e-9, label);
            else assert.equal(type.balance, target.balance, label);
            assert.equal(type.finalCapacity, target.finalCapacity, label);
            assert.equal(type.baseCapacity, target.baseCapacity, label);
        }
    };

    // The type furthest behind goes first, by what its balance is worth in hepteracts, not by its units
    let state = { hepteracts: 1e9, types: [hept('a', 1, 100, 5, 1000), hept('b', 4, 10, 100, 1000)] };
    assert.deepEqual(nextHepteractStep(state, false), { step: { key: 'b', expand: false, craft: 900, partial: false } });
    // On a tie, the first
    state = { hepteracts: 1e9, types: [hept('a', 1, 10, 0, 1000), hept('b', 1, 10, 0, 1000)] };
    assert.equal(nextHepteractStep(state, false).step.key, 'a');
    // A ratio of 0 is left alone, whatever its balance
    state = { hepteracts: 1e9, types: [hept('z', 0, 10, 0, 1000), hept('a', 1, 10, 500, 1000)] };
    assert.equal(nextHepteractStep(state, false).step.key, 'a');
    state = { hepteracts: 1e9, types: [hept('z', 0, 10, 0, 1000)] };
    assert.deepEqual(planHepteractDistribution(state, true), { targets: [], waitingFor: undefined, hepteractsLeft: 1e9, steps: 0 });
    scenarios++;

    // A full meter expands first: the base capacity is consumed, and the top doubles
    state = { hepteracts: 1e6, types: [hept('a', 1, 1, 1000, 1000)] };
    let next = nextHepteractStep(state, false);
    assert.deepEqual(next.step, { key: 'a', expand: true, craft: 2000, partial: false });
    applyHepteractStep(state, next.step);
    assert.deepEqual(state, { hepteracts: 1e6 - 2000, types: [hept('a', 1, 1, 2000, 2000)] });
    // With the double capacity reward, an expansion keeps a quarter of the new top
    state = { hepteracts: 1e6, types: [hept('a', 1, 1, 2000, 1000, 2000)] };
    next = nextHepteractStep(state, false);
    assert.deepEqual(next.step, { key: 'a', expand: true, craft: 3000, partial: false });
    applyHepteractStep(state, next.step);
    assert.deepEqual(state, { hepteracts: 1e6 - 3000, types: [hept('a', 1, 1, 4000, 2000, 4000)] });
    scenarios++;

    // The type furthest behind can't pay: it waits, and the others get nothing, even if they could pay
    state = { hepteracts: 29999, types: [hept('a', 1, 30, 0, 1000), hept('b', 1, 1, 5000, 10000)] };
    assert.deepEqual(planHepteractDistribution(state, false), { targets: [], waitingFor: { key: 'a', hepteractsNeeded: 30000 }, hepteractsLeft: 29999, steps: 0 });
    // A whole distribution, stopped by the next expansion
    state = { hepteracts: 3500, types: [hept('a', 1, 1, 0, 1000), hept('b', 1, 1, 0, 1000)] };
    let plan = planHepteractDistribution(state, false);
    assert.deepEqual(plan.targets.map(target => [target.key, target.units, target.balance, target.partial]), [['a', 1000, 1000, false], ['b', 1000, 1000, false]]);
    assert.deepEqual(plan.waitingFor, { key: 'a', hepteractsNeeded: 2000 });
    assert.equal(plan.hepteractsLeft, 1500);
    assert.equal(plan.steps, 2);
    craftThroughGame(state, plan, 'whole steps');
    scenarios++;

    // Partial: what is left goes into a meter that isn't full
    state = { hepteracts: 500, types: [hept('a', 1, 1, 100, 1000)] };
    assert.deepEqual(nextHepteractStep(state, true).step, { key: 'a', expand: false, craft: 500, partial: true });
    assert.deepEqual(nextHepteractStep(state, false), { waitingFor: { key: 'a', hepteractsNeeded: 900 } });
    // Nothing affordable: no step
    state = { hepteracts: 0.5, types: [hept('a', 1, 1, 100, 1000)] };
    assert.deepEqual(nextHepteractStep(state, true), { waitingFor: { key: 'a', hepteractsNeeded: 900 } });
    // A full meter only expands when what it consumes can be crafted back
    state = { hepteracts: 999, types: [hept('a', 1, 1, 1000, 1000)] };
    assert.deepEqual(nextHepteractStep(state, true), { waitingFor: { key: 'a', hepteractsNeeded: 2000 } });
    state = { hepteracts: 1500, types: [hept('a', 1, 1, 1000, 1000)] };
    assert.deepEqual(nextHepteractStep(state, true).step, { key: 'a', expand: true, craft: 1500, partial: true });
    // Paid back to the unit: the balance stays, only the capacity changes
    state = { hepteracts: 1000, types: [hept('a', 1, 1, 1000, 1000)] };
    assert.deepEqual(nextHepteractStep(state, true).step, { key: 'a', expand: true, craft: 1000, partial: true });
    plan = planHepteractDistribution(state, true);
    assert.equal(plan.targets[0].balance, 1000);
    assert.equal(plan.targets[0].finalCapacity, 2000);
    craftThroughGame(state, plan, 'paid back to the unit');
    scenarios++;

    // The partial type comes last, even when it was also the first crafted
    state = { hepteracts: 3500, types: [hept('a', 1, 1, 0, 1000), hept('b', 1, 1, 0, 1000)] };
    plan = planHepteractDistribution(state, true);
    assert.deepEqual(plan.targets.map(target => [target.key, target.units, target.balance, target.partial]), [['b', 1000, 1000, false], ['a', 2500, 1500, true]]);
    assert.equal(plan.hepteractsLeft, 0);
    craftThroughGame(state, plan, 'partial last');
    scenarios++;

    // A partial step ends the plan: the cheap type could still take a partial step, but would then come after the
    // expensive one, whose 5% margin would eat what is planned for it
    state = { hepteracts: 505000, types: [hept('cheap', 1, 1, 0, 2000), hept('dear', 1, 5000, 0, 1000)] };
    plan = planHepteractDistribution(state, true);
    assert.deepEqual(plan.targets.map(target => [target.key, target.units, target.partial]), [['cheap', 2000, false], ['dear', 100, true]]);
    assert.deepEqual(plan.waitingFor, { key: 'cheap', hepteractsNeeded: 4000 });
    assert.equal(plan.hepteractsLeft, 3000);
    assert.equal(plan.steps, 2);
    craftThroughGame(state, plan, 'partial ends the plan');
    scenarios++;

    // The amount given to the Auto
    const target = { key: 'a', units: 100, balance: 100, baseCapacity: 1000, finalCapacity: 1000, partial: false };
    assert.ok(Math.abs(hepteractCraftAmount(target, 1e9, 10) - 1055) < 1e-6);
    assert.equal(hepteractCraftAmount(target, 700, 10), 700);
    assert.equal(hepteractCraftAmount({ ...target, partial: true }, 1e9, 10), 1e9);
    scenarios++;

    // Random inputs, both modes (seeded, so a failure repeats). The capacities are either anywhere, or close to each
    // other as after earlier distributions. A balance never starts above its meter: the game caps it.
    let seed = 12345;
    const random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const DATA = { chronos: [1000, 1e4], hyperrealism: [1000, 1e4], challenge: [1000, 5e4], abyss: [1, 1e8], accelerator: [1000, 1e5], acceleratorBoost: [1000, 2e5], multiplier: [1000, 3e5] };
    let partialPlans = 0;
    for (let i = 0; i < 20000; i++) {
        const double = random() < 0.5;
        const debuff = random() < 0.3 ? 1 : 1 + random() * 10 ** (random() * 6);
        const close = random() < 0.5;
        const around = Math.floor(random() * 30);
        const types = Object.entries(DATA).filter(() => random() < 0.8).map(([key, [base, conversion]]) => {
            const doublings = close ? Math.max(0, around + Math.floor(random() * 5) - 2) : Math.floor(random() * 30);
            const baseCapacity = base * 2 ** doublings;
            const finalCapacity = baseCapacity * (double ? 2 : 1);
            const shape = random();
            const balance = shape < 0.3 ? 0 : shape < 0.6 ? finalCapacity : Math.floor(random() * finalCapacity);
            return hept(key, random() < 0.15 ? 0 : 10 ** (random() * 4), conversion * debuff, balance, baseCapacity, finalCapacity);
        });
        const input = { hepteracts: Math.floor(10 ** (random() * (random() < 0.5 ? 12 : 30))), types };
        const allowPartial = random() < 0.5;
        const label = JSON.stringify({ input, allowPartial });
        const result = planHepteractDistribution(input, allowPartial);

        assert.equal(JSON.stringify({ input, allowPartial }), label);
        assert.ok(result.steps < 5000, label);
        assert.ok(result.hepteractsLeft >= 0, label);
        let spent = 0;
        for (const entry of result.targets) {
            const from = types.find(type => type.key === entry.key);
            assert.ok(from.ratio > 0, label);
            assert.ok(entry.units > 0, label);
            assert.ok(entry.balance >= from.balance, label);
            if (!entry.partial) assert.ok(entry.balance >= entry.finalCapacity, label);
            spent += entry.units * from.unitCost;
        }
        assert.ok(Math.abs(input.hepteracts - spent - result.hepteractsLeft) <= input.hepteracts * 1e-9 + 1e-6, label);

        const partials = result.targets.filter(entry => entry.partial);
        assert.ok(partials.length <= 1, label);
        if (partials.length === 1) {
            assert.ok(allowPartial, label);
            assert.equal(result.targets.at(-1), partials[0], label);
            partialPlans++;
        } else if (types.some(type => type.ratio > 0)) {
            assert.ok(result.waitingFor, label);
        }
        craftThroughGame(input, result, label);
    }
    assert.ok(partialPlans > 100, `Only ${partialPlans} plans ended on a partial step`);
    scenarios++;

    console.log(`Passed ${scenarios} Hepteract Distributor plan scenarios.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
