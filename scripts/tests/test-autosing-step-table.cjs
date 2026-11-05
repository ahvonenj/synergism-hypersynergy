const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// The step timings table (docs/features/autosing.md, "Step timings"): what a run's timings say per singularity.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-autosing/hs-autosingStepTable.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
    });
    const runtime = new Module(path.join(root, 'step-table-test-runtime.cjs'), module);
    runtime._compile(bundled.outputFiles[0].text, runtime.filename = path.join(root, 'step-table-test-runtime.cjs'));
    const { buildStepTable, stepTableSummaryLines, stepTableText } = runtime.exports;

    const step = (sing, phase, index, ms, waitMs = 0, extra = {}) => ({
        sing, phase, pass: 1, index, number: index + 1, action: `C${index + 1}`, waitBefore: waitMs, waitMs, ms, ...extra,
    });
    const sing = (n, ms, extra = {}) => ({ sing: n, ms, goldenQuarks: 10, quarks: 100, c15: 1e6, phases: {}, ...extra });
    const timings = (over = {}) => ({
        strategy: 'Basic', target: 275, steps: [], passes: [], transitions: [], singularities: [],
        dropped: { steps: 0, passes: 0, transitions: 0, singularities: 0 },
        current: { sing: 1, startedAt: 0, passCount: {}, phaseMs: {} },
        ...over,
    });
    const nearly = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);
    const stepRows = table => table.rows.filter(r => r.kind === 'step');
    const rowOf = (table, kind) => table.rows.find(r => r.kind === kind);

    // Nothing finished yet: no rows, whatever the steps already held
    let table = buildStepTable(timings({ steps: [step(1, 'a', 0, 50)] }));
    assert.equal(table.singularities, 0);
    assert.deepEqual(table.rows, []);

    // Two singularities: per-singularity figures, a step run twice in the second, the running singularity left out
    table = buildStepTable(timings({
        current: { sing: 3, startedAt: 0, passCount: {}, phaseMs: {} },
        singularities: [sing(1, 1000), sing(2, 2000)],
        steps: [
            step(1, 'b', 1, 100, 40), step(1, 'a', 0, 300), step(2, 'a', 0, 500), step(2, 'b', 1, 200, 40), step(2, 'b', 1, 300, 60),
            step(3, 'a', 0, 99999),
        ],
        // Transition starting S1 (before-record part counted nowhere), S2, then S3 whose first part belongs to S2
        transitions: [{ sing: 1, ms: 70, msBeforeRecord: 30 }, { sing: 2, ms: 100, msBeforeRecord: 60 }, { sing: 3, ms: 90, msBeforeRecord: 50 }],
    }));
    assert.equal(table.singularities, 2);
    nearly(table.avgMs, 1500);
    nearly(table.sdMs, Math.sqrt(500000));
    nearly(table.quarksPerHour, 200 / 3000 * 3600000);
    nearly(table.goldenQuarksPerHour, 20 / 3000 * 3600000);
    nearly(table.c15, 1e6);
    // Phases rank as they first ran
    assert.deepEqual(stepRows(table).map(r => `${r.phase}:${r.step}`), ['b:2', 'a:1']);
    const b = stepRows(table)[0];
    nearly(b.runs, 1.5);
    nearly(b.ms, 300);
    nearly(b.waitMs, 70);
    nearly(b.share, 300 / 1500);
    // Between: (70-30)+(100-60) after the record, +60+50 before it, per singularity
    nearly(rowOf(table, 'between').ms, (40 + 40 + 60 + 50) / 2);
    // Other: what's left of the average
    nearly(rowOf(table, 'other').ms, 1500 - 300 - 400 - 95);
    nearly(table.rows.reduce((sum, r) => sum + r.share, 0), 1);

    // The steps' cap dropped part of S2: S2 is left out, and S1's steps are gone anyway
    table = buildStepTable(timings({
        current: { sing: 5, startedAt: 0, passCount: {}, phaseMs: {} },
        dropped: { steps: 2000, passes: 0, transitions: 0, singularities: 0 },
        singularities: [sing(1, 9000), sing(2, 9000), sing(3, 1000), sing(4, 1000)],
        steps: [step(2, 'a', 0, 7777), step(3, 'a', 0, 100), step(4, 'a', 0, 200)],
    }));
    assert.equal(table.singularities, 2);
    nearly(table.avgMs, 1000);
    nearly(stepRows(table)[0].ms, 150);

    // The singularities' cap can drop more than the steps'
    table = buildStepTable(timings({
        current: { sing: 4, startedAt: 0, passCount: {}, phaseMs: {} },
        dropped: { steps: 0, passes: 0, transitions: 0, singularities: 200 },
        singularities: [sing(3, 1000)],
        steps: [step(1, 'a', 0, 5000), step(3, 'a', 0, 100)],
    }));
    assert.equal(table.singularities, 1);
    nearly(stepRows(table)[0].ms, 100);

    // More time in the steps than a singularity (a pass counted in its own): no negative row
    table = buildStepTable(timings({
        current: { sing: 2, startedAt: 0, passCount: {}, phaseMs: {} },
        singularities: [sing(1, 100)],
        steps: [step(1, 'a', 0, 150)],
    }));
    assert.equal(rowOf(table, 'other').ms, 0);

    // A C15 out of a number's range is ignored, and none at all gives no figure
    table = buildStepTable(timings({ current: { sing: 3, startedAt: 0, passCount: {}, phaseMs: {} }, singularities: [sing(1, 1, { c15: Infinity }), sing(2, 1, { c15: 1e10 })] }));
    nearly(table.c15, 1e10);
    table = buildStepTable(timings({ current: { sing: 2, startedAt: 0, passCount: {}, phaseMs: {} }, singularities: [sing(1, 1, { c15: 0 })] }));
    assert.equal(table.c15, null);
    assert.ok(!stepTableSummaryLines(table).join().includes('C15'));

    // The text: header lines, columns, the strategy's order, and no tab or line break from a name or a comment
    table = buildStepTable(timings({
        strategy: 'My\tstrategy',
        current: { sing: 2, startedAt: 0, passCount: {}, phaseMs: {} },
        singularities: [sing(1, 1000)],
        steps: [step(1, 'a', 0, 250, 100, { comment: 'line one\nline\ttwo', action: 'Ascend', number: 0 }), step(1, 'a', 1, 500)],
    }));
    const lines = stepTableText(table, { modVersion: '2.14.7', loadouts: ['L1', 'L2'] }).split('\n');
    assert.equal(lines[0], 'HyperSynergism v2.14.7 · My strategy · S275 · Ambrosia: L1, L2');
    assert.equal(lines[1], '1 singularity · 1.00 s ± 0.00 · Quarks 3.60e5/hr · Golden quarks 3.60e4/hr · C15 1.00e6');
    assert.equal(lines[2], '');
    assert.equal(lines[3], 'ms/sing\t%\tWait ms\tRuns\tPhase\tStep\tAction\tComment');
    assert.equal(lines[4], '250\t25.0\t100\t1\ta\t0\tAscend\tline one line two');
    assert.equal(lines[5], '500\t50.0\t0\t1\ta\t2\tC2\t');
    assert.equal(lines[6], '0\t0.0\t\t\t\t\tBetween singularities\t');
    assert.equal(lines[7], '250\t25.0\t\t\t\t\tOutside the steps\t');
    assert.equal(lines.length, 8);

    console.log('autosing step table tests passed');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
