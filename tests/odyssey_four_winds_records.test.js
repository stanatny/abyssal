import test from "node:test";
import assert from "node:assert/strict";
import {
  RUN_RECORD_KEY,
  RUN_RECORD_LIMIT,
  RUN_RULESET,
  runRuleset,
  createRunRecordStore,
} from "../src/run_records.js";

const currentRuleset = "odyssey-eye-reef-2026-11-25";
function memoryStorage(rows = []) {
  const values = new Map([
    [RUN_RECORD_KEY, JSON.stringify({ version: 1, rows })],
  ]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
function oldRow(id, ruleset, region = "odyssey") {
  return {
    id,
    region,
    character: "orca",
    ruleset,
    timeMs: 1000,
    at: 1,
    name: "Legacy",
  };
}
function completedRun(id, seconds = 100) {
  return {
    id,
    region: "odyssey",
    character: "orca",
    seconds,
    won: true,
    at: 2,
    name: "Homeward",
  };
}

test("only Odyssey changes to the eye-and-reef record identity", () => {
  assert.equal(runRuleset("odyssey"), currentRuleset);
  assert.equal(runRuleset("hawaii"), "currents-2026-10-30");
  assert.equal(runRuleset("bermuda"), "currents-2026-10-30");
  assert.equal(runRuleset("atlantis"), "atlantis-mural-2026-10-31");
  assert.equal(runRuleset("europa"), "expedition-2026-10-14");
  assert.equal(runRuleset("amazon"), "expedition-2026-10-14");
  assert.equal(runRuleset("mariana"), RUN_RULESET);
  assert.equal(runRuleset("penglai"), RUN_RULESET);
});

test("legacy three-lord and current-era Odyssey rows survive saving but cannot rank as Four Winds clears", () => {
  const legacy = [
    oldRow("legacy-growth", "survival-2026-10"),
    oldRow("legacy-three-lords", "currents-2026-10-30"),
    oldRow("legacy-crossing", "odyssey-four-winds-2026-11-24"),
    oldRow("legacy-tide-court", "odyssey-tide-trial-2026-11-25"),
    oldRow("legacy-slow-giant-arch", "odyssey-homeward-arch-2026-11-25"),
    oldRow("legacy105", "odyssey-quick-boulder-2026-11-25"),
    oldRow("legacy240", "odyssey-fast-flight-2026-11-25"),
    oldRow("legacy-sentinel", "odyssey-sentinel-2026-11-25"),
  ];
  const other = oldRow("hawaii-intact", runRuleset("hawaii"), "hawaii");
  const disk = memoryStorage([...legacy, other]);
  const store = createRunRecordStore(disk, ["odyssey", "hawaii"]);
  assert.deepEqual(store.list("odyssey"), []);
  assert.equal(store.list("hawaii")[0].id, other.id);
  const row = store.record(completedRun("first-four-winds"));
  assert.equal(row.ruleset, currentRuleset);
  assert.equal(store.list("odyssey").length, 1);
  const saved = JSON.parse(disk.getItem(RUN_RECORD_KEY));
  for (const original of [...legacy, other])
    assert.deepEqual(
      saved.rows.find((r) => r.id === original.id),
      original,
    );
  const loaded = createRunRecordStore(disk, ["odyssey", "hawaii"]);
  assert.deepEqual(loaded.list("odyssey"), store.list("odyssey"));
  assert.equal(loaded.list("hawaii")[0].id, other.id);
});

test("new and historical rule buckets each keep their own fastest ten and remain independently named", () => {
  const oldRulesets = [
    "currents-2026-10-30",
    "odyssey-fast-flight-2026-11-25",
    "odyssey-sentinel-2026-11-25",
  ];
  const legacy = oldRulesets.flatMap((ruleset, bucket) =>
    Array.from({ length: RUN_RECORD_LIMIT }, (_, i) => ({
      ...oldRow(bucket ? `old-${bucket}-${i}` : `old-${i}`, ruleset),
      timeMs: 1000 + i,
    })),
  );
  const disk = memoryStorage(legacy);
  const store = createRunRecordStore(disk, ["odyssey"]);
  for (let i = 13; i >= 0; i--) store.record(completedRun(`new-${i}`, 100 + i));
  assert.equal(store.list("odyssey").length, RUN_RECORD_LIMIT);
  assert.equal(store.list("odyssey")[0].timeMs, 100000);
  const saved = JSON.parse(disk.getItem(RUN_RECORD_KEY)).rows;
  for (const ruleset of oldRulesets)
    assert.equal(
      saved.filter((r) => r.ruleset === ruleset).length,
      RUN_RECORD_LIMIT,
      `Historical bucket ${ruleset} must retain its own fastest ten`,
    );
  assert.equal(
    saved.filter((r) => r.ruleset === currentRuleset).length,
    RUN_RECORD_LIMIT,
  );
  assert.ok(store.rename("old-0", "Old voyager"));
  assert.equal(
    store.list("odyssey").some((r) => r.id === "old-0"),
    false,
  );
  assert.equal(
    JSON.parse(disk.getItem(RUN_RECORD_KEY)).rows.find((r) => r.id === "old-0")
      .name,
    "Old voyager",
  );
});

test("incomplete new journeys and malformed future rules never enter the current leaderboard", () => {
  const disk = memoryStorage([
    oldRow("future", "odyssey-future-rule"),
    oldRow("accepted", currentRuleset),
  ]);
  const store = createRunRecordStore(disk, ["odyssey"]);
  assert.equal(
    store.record({ ...completedRun("incomplete"), won: false }),
    null,
  );
  assert.deepEqual(
    store.list("odyssey").map((r) => r.id),
    ["accepted"],
  );
  const record = store.record(completedRun("valid"));
  assert.equal(record.ruleset, currentRuleset);
  assert.equal(store.record(completedRun("valid", 1)).timeMs, 100000);
});
