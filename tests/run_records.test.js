import test from "node:test";
import assert from "node:assert/strict";
import {
  createRunRecordStore,
  RUN_RECORD_KEY,
  formatRunTime,
  normalizeRunName,
} from "../src/run_records.js";
const regions = ["hawaii", "atlantis", "bermuda", "mariana"];
function storage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}
function run(id, region = "hawaii", seconds = 100, extra = {}) {
  return {
    id,
    region,
    seconds,
    won: true,
    character: "orca",
    at: 123,
    name: "Player",
    ...extra,
  };
}
test("各海域独立保留最快十次，刷新重载不丢失最佳，平局顺序确定", () => {
  const disk = storage(),
    store = createRunRecordStore(disk, regions);
  for (const region of regions)
    for (let n = 13; n >= 0; n--)
      store.record(run(`${region}-${n}`, region, 100 + n, { at: n }));
  const restored = createRunRecordStore(disk, regions);
  for (const region of regions) {
    assert.equal(restored.list(region).length, 10);
    assert.deepEqual(
      restored.list(region).map((row) => row.timeMs),
      Array.from({ length: 10 }, (_, n) => 100000 + n * 1000),
    );
  }
  store.record(run("tie", "hawaii", 100, { at: 200 }));
  assert.equal(store.list("hawaii")[0].id, "hawaii-0");
});
test("胜利只记一次，名称更新不新增成绩，查询不能修改存储", () => {
  const disk = storage(),
    store = createRunRecordStore(disk, regions);
  store.record(run("one"));
  store.record(run("one", "hawaii", 5));
  assert.equal(store.list("hawaii").length, 1);
  assert.equal(store.list("hawaii")[0].timeMs, 100000);
  assert.equal(store.rename("one", "  测试\n名字  "), true);
  assert.equal(store.list("hawaii")[0].name, "测试名字");
  const copy = store.list("hawaii");
  copy[0].name = "mutated";
  assert.equal(
    createRunRecordStore(disk, regions).list("hawaii")[0].name,
    "测试名字",
  );
});
test("只接收真正完成且合法的时长和海域，异常存储和跨规则数据不污染榜单", () => {
  const disk = storage(),
    store = createRunRecordStore(disk, regions);
  for (const change of [
    { won: false },
    { seconds: 0 },
    { seconds: -1 },
    { seconds: NaN },
    { seconds: Infinity },
    { seconds: 1801 },
    { region: "unknown" },
    { character: "alien" },
  ])
    assert.equal(store.record(run("bad", "hawaii", 100, change)), null);
  const row = store.record(run("good"));
  disk.setItem(
    RUN_RECORD_KEY,
    JSON.stringify({
      version: 1,
      rows: [
        row,
        { ...row, id: "duplicate" },
        { ...row, id: "old", ruleset: "older" },
        { ...row, id: "bad", timeMs: -1 },
      ],
    }),
  );
  assert.equal(createRunRecordStore(disk, regions).list("hawaii").length, 2);
  disk.setItem(RUN_RECORD_KEY, "broken");
  assert.deepEqual(createRunRecordStore(disk, regions).list("hawaii"), []);
});
test("存储拒绝读写时降级内存，仍可登记及改名而不影响游戏", () => {
  const disk = {
    getItem() {
      throw Error("Denied");
    },
    setItem() {
      throw Error("Quota");
    },
  };
  const store = createRunRecordStore(disk, regions);
  store.record(run("one"));
  assert.equal(store.persistent, false);
  assert.equal(store.rename("one", "Memory"), true);
  assert.equal(store.list("hawaii")[0].name, "Memory");
});
test("计时包含百分之一秒，名称按码点限制并去除控制字符", () => {
  assert.equal(formatRunTime(123456), "02:03.45");
  assert.equal(formatRunTime(1800000), "30:00.00");
  assert.equal(formatRunTime(9), "00:00.00");
  assert.equal(Array.from(normalizeRunName("🐟".repeat(30))).length, 24);
  assert.equal(normalizeRunName("a\u202eb\n"), "ab");
});

test("通关角色与成绩一起持久保存，改名和新角色扩展不会混淆旧角色", () => {
  const disk = storage(),
    store = createRunRecordStore(disk, regions);
  store.record(run("orca-run", "mariana", 750));
  store.record(run("squid-run", "mariana", 710, { character: "squid" }));
  store.rename("orca-run", "Stan");
  const restored = createRunRecordStore(disk, regions, [
    "orca",
    "squid",
    "future",
  ]);
  assert.deepEqual(
    restored.list("mariana").map((r) => [r.id, r.character, r.timeMs]),
    [
      ["squid-run", "squid", 710000],
      ["orca-run", "orca", 750000],
    ],
  );
  restored.record(run("future-run", "atlantis", 900, { character: "future" }));
  assert.equal(restored.list("atlantis")[0].character, "future");
});
