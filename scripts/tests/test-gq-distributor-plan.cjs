const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// The GQ Distributor's allocation (docs/features/gq-distributor.md): fixed cases, then invariants on random inputs.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-qol-buttons/hs-gq-distributor-plan.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
    });
    const runtime = new Module(path.join(root, 'gq-plan-test-runtime.cjs'), module);
    runtime._compile(bundled.outputFiles[0].text, runtime.filename = path.join(root, 'gq-plan-test-runtime.cjs'));
    const { planGQDistribution } = runtime.exports;
    const upgrade = (id, weight, invested = 0, buyable = true) => ({ id, weight, invested, buyable });
    const spends = plan => Object.fromEntries(plan.spendById);
    let scenarios = 0;

    // Nothing to spend
    assert.equal(planGQDistribution([upgrade('a', 0), upgrade('b', 0)], 100, false), undefined);
    assert.equal(planGQDistribution([], 100, true), undefined);
    assert.equal(planGQDistribution([upgrade('a', 1)], 0.9, false), undefined);
    assert.equal(planGQDistribution([upgrade('a', 1)], -5, true), undefined);
    scenarios++;

    // Off: the balance (rounded down) in proportion to the ratios; a ratio of 0 is left out
    let plan = planGQDistribution([upgrade('a', 1), upgrade('b', 1), upgrade('c', 2), upgrade('z', 0)], 100.9, false);
    assert.deepEqual(spends(plan), { a: 25, b: 25, c: 50 });
    assert.equal(plan.budget, 100);
    assert.equal(plan.total, 100);
    // Largest remainder: the whole balance is planned
    plan = planGQDistribution([upgrade('a', 1), upgrade('b', 1), upgrade('c', 1)], 100, false);
    assert.equal(plan.total, 100);
    assert.deepEqual(Object.values(spends(plan)).sort(), [33, 33, 34]);
    // Past investments don't count when off
    plan = planGQDistribution([upgrade('a', 1, 1e6), upgrade('b', 1)], 10, false);
    assert.deepEqual(spends(plan), { a: 5, b: 5 });
    // An upgrade that can't be bought keeps its share unspent
    plan = planGQDistribution([upgrade('a', 1), upgrade('b', 1, 0, false)], 100, false);
    assert.deepEqual(spends(plan), { a: 50, b: 0 });
    assert.equal(plan.total, 50);
    scenarios++;

    // On: the final totals track the ratios
    plan = planGQDistribution([upgrade('a', 1, 10), upgrade('b', 1)], 30, true);
    assert.deepEqual(spends(plan), { a: 10, b: 20 });
    // An upgrade above its target gets nothing and nothing is taken from it; the others share the rest
    plan = planGQDistribution([upgrade('a', 1, 100), upgrade('b', 1), upgrade('c', 3)], 40, true);
    assert.deepEqual(spends(plan), { a: 0, b: 10, c: 30 });
    plan = planGQDistribution([upgrade('a', 1, 100), upgrade('b', 1, 0, false), upgrade('c', 1)], 50, true);
    assert.deepEqual(spends(plan), { a: 0, b: 0, c: 25 });
    assert.equal(plan.total, 25);
    scenarios++;

    // Random inputs, both modes, balances up to 1e13 (seeded, so a failure repeats)
    let seed = 12345;
    const random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const magnitude = max => Math.floor(10 ** (random() * max));
    for (let i = 0; i < 5000; i++) {
        const count = 1 + Math.floor(random() * 12);
        const upgrades = Array.from({ length: count }, (_, idx) => upgrade(`u${idx}`,
            random() < 0.15 ? 0 : Math.round(random() * 10000) / 100,
            random() < 0.3 ? 0 : magnitude(13),
            random() < 0.85));
        const balance = magnitude(13) + random();
        const balanceInvestments = random() < 0.5;
        const label = JSON.stringify({ upgrades, balance, balanceInvestments });
        const result = planGQDistribution(upgrades, balance, balanceInvestments);
        const weighted = upgrades.filter(entry => entry.weight > 0);
        if (weighted.length === 0 || balance < 1) {
            assert.equal(result, undefined, label);
            continue;
        }
        assert.equal(result.budget, Math.floor(balance), label);
        assert.deepEqual([...result.spendById.keys()], weighted.map(entry => entry.id), label);
        for (const entry of weighted) {
            const spend = result.spendById.get(entry.id);
            assert.ok(Number.isInteger(spend) && spend >= 0, label);
            if (!entry.buyable) assert.equal(spend, 0, label);
        }
        assert.equal(result.total, [...result.spendById.values()].reduce((sum, spend) => sum + spend, 0), label);
        assert.ok(result.total <= result.budget, label);
        if (weighted.every(entry => entry.buyable)) assert.equal(result.total, result.budget, label);

        // The shares, unspent ones included, rebuilt with the buyable flag on
        const shares = planGQDistribution(weighted.map(entry => ({ ...entry, buyable: true })), balance, balanceInvestments).spendById;
        const tolerance = 1 + result.budget * 1e-9;
        if (!balanceInvestments) {
            const weightSum = weighted.reduce((sum, entry) => sum + entry.weight, 0);
            for (const entry of weighted) {
                assert.ok(Math.abs(shares.get(entry.id) - result.budget * entry.weight / weightSum) < tolerance, label);
            }
        } else {
            // Water level: the upgrades given GQ end level with each other; the others were already at or above it.
            // Each share is rounded by less than 1 GQ, which moves the level by up to 1 GQ per upgrade.
            const filled = weighted.filter(entry => shares.get(entry.id) > 0);
            const level = filled.reduce((sum, entry) => sum + entry.invested + shares.get(entry.id), 0)
                / filled.reduce((sum, entry) => sum + entry.weight, 0);
            for (const entry of weighted) {
                const final = entry.invested + shares.get(entry.id);
                const margin = weighted.length + level * entry.weight * 1e-9;
                if (shares.get(entry.id) > 0) assert.ok(Math.abs(final - level * entry.weight) < margin, label);
                else assert.ok(entry.invested > level * entry.weight - margin, label);
            }
        }
    }
    scenarios++;

    console.log(`Passed ${scenarios} GQ Distributor plan scenarios.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
