import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { acquireMarianaStrataAsset } from "../src/mariana_strata_asset.js";
import {
  createMarianaOcean,
  createMarianaOceanAsync,
} from "../src/mariana_ocean.js";
import { createHash } from "node:crypto";

const kinds = ["hydra", "kraken", "maja", "leviathan"];
test("四层实际岩体保留同源彩色回退、有限几何和独立材质", () => {
  const assets = kinds.map(acquireMarianaStrataAsset);
  try {
    assert.equal(new Set(assets.map((a) => a.geometry)).size, 4);
    assert.equal(new Set(assets.map((a) => a.material)).size, 4);
    for (const a of assets) {
      assert.ok(a.geometry.index.count / 3 <= 10000);
      const colors = a.geometry.attributes.color;
      let min = 1,
        max = 0;
      for (let i = 0; i < colors.count; i++) {
        min = Math.min(min, colors.getX(i));
        max = Math.max(max, colors.getX(i));
      }
      assert.ok(max - min > 0.1, "Fallback retains real mineral variation");
      for (const name of ["position", "normal", "uv"])
        assert.ok(
          [...a.geometry.attributes[name].array].every(Number.isFinite),
        );
      assert.equal(a.material.transparent, false);
      assert.equal(a.material.side, T.FrontSide);
    }
  } finally {
    for (const a of assets) a.release();
  }
});

test("完整 HF 基底落在加宽后的真实岩台上，不能只有中心点接地", () => {
  const o = createMarianaOcean(new T.Scene());
  try {
    o.root.updateMatrixWorld(true);
    const strata = o.root.userData.marianaStrata;
    assert.equal(strata.placements.length, 4);
    const ray = new T.Raycaster(),
      down = new T.Vector3(0, -1, 0),
      point = new T.Vector3();
    for (const row of strata.placements) {
      const a = strata.assets.get(row.kind),
        p = a.geometry.attributes.position,
        box = a.geometry.boundingBox;
      const matrix = new T.Matrix4().fromArray(row.matrix),
        host = o.root.getObjectByName(`mariana_landmark_${row.site}_stone`);
      const record =
        o.root.userData.marianaLandmarkGeometry.supportRecords.find(
          (r) => r.site === row.site && r.id === "hf_strata_base",
        );
      let count = 0,
        minGap = Infinity,
        maxGap = -Infinity;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) > box.min.y + (box.max.y - box.min.y) * 0.025) continue;
        point.fromBufferAttribute(p, i).applyMatrix4(matrix);
        ray.set(point.clone().add(new T.Vector3(0, 8, 0)), down);
        ray.far = 16;
        const hit = ray
          .intersectObject(host)
          .find((h) => h.faceIndex < record.hostFaceRange[1]);
        assert.ok(hit, `${row.kind} missing base support`);
        const gap = point.y - hit.point.y;
        maxGap = Math.max(maxGap, gap);
        minGap = Math.min(minGap, gap);
        count++;
      }
      assert.ok(count >= 13);
      assert.ok(maxGap < -0.34, `${row.kind} hovering: ${maxGap}`);
      assert.ok(minGap > -4, `${row.kind} excessive burial: ${minGap}`);
      assert.ok(
        row.bounds.max[2] < record.root[2] + 7.1,
        "Rear rock stays behind the turning circle",
      );
    }
  } finally {
    o.dispose();
  }
});

test("静态纹理和原型只在最后引用离开时释放，实例地形仍由各自地图拥有", () => {
  const first = acquireMarianaStrataAsset("hydra"),
    second = acquireMarianaStrataAsset("hydra");
  assert.equal(first.geometry, second.geometry);
  let count = 0;
  first.geometry.addEventListener("dispose", () => count++);
  first.release();
  first.release();
  assert.equal(count, 0);
  second.release();
  second.release();
  assert.equal(count, 1);
  const third = acquireMarianaStrataAsset("hydra");
  assert.notEqual(third.geometry, first.geometry);
  third.release();
});

test("同步和分片建图的新版岩湾、固体及位置完全一致", async () => {
  const a = createMarianaOcean(new T.Scene()),
    b = await createMarianaOceanAsync(new T.Scene());
  const hash = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  try {
    assert.equal(hash(a.colliders), hash(b.colliders));
    assert.equal(
      hash(a.root.userData.marianaStrata.placements),
      hash(b.root.userData.marianaStrata.placements),
    );
    const m = new T.Vector3(0, -355, -510);
    a.update(10, m);
    const root = a.root.getObjectByName("mariana_landmark_hydra_shoulder");
    assert.equal(root.visible, true);
    a.update(10, new T.Vector3(0, -2400, -500));
    assert.equal(root.visible, false);
  } finally {
    a.dispose();
    b.dispose();
  }
});
