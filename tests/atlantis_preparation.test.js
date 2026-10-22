import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  loadAcceptedAtlantis,
  validateAcceptedAtlantisSnapshot,
} from "./helpers/accepted_atlantis_oracle.js";
import { cityArchitecture } from "../src/atlantis_architecture.js";
import { atlantisMaterials } from "../src/atlantis_art_geometry.js";
import { createAtlantisOceanAsync } from "../src/atlantis_ocean.js";

test("分片古城保留已验收版本的全部实体、障碍及近景模型数据", async (context) => {
  const oracle = await loadAcceptedAtlantis();
  context.after(() => oracle.dispose());
  const referenceParent = new THREE.Group();
  const reference = oracle.createOcean(referenceParent);
  context.after(() => reference.dispose());
  const parent = new THREE.Group();
  const ocean = await createAtlantisOceanAsync(parent);
  context.after(() => ocean.dispose());
  const hash = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  // 认证基线 3292104 在同一 Node/Three 环境构造；保持逐字比较，避免跨运行时硬编码浮点哈希。
  assert.equal(hash(ocean.colliders), hash(reference.colliders));
  assert.equal(hash(ocean.obstacles), hash(reference.obstacles));
  assert.equal(ocean.city.stats.colliders, 20964);
  // 已验收布局快照保持冻结；豁免已替换建筑/纪念碑以及本次任务道具外观。
  // 建筑碰撞逐字一致；未替换建筑与原方尖碑刻痕继续逐字比较。
  const geometryDigest = (g) => {
    const h = createHash("sha256");
    for (const key of Object.keys(g.attributes).sort()) {
      h.update(key);
      h.update(Buffer.from(g.attributes[key].array.buffer));
    }
    if (g.index) h.update(Buffer.from(g.index.array.buffer));
    return h.digest("hex");
  };
  const replacedObelisk = new Set(
    cityArchitecture("obelisk")
      .parts.filter((p) => p.material !== atlantisMaterials().guideTeal)
      .map((p) => geometryDigest(p.geometry)),
  );
  const replacedCivic = new Set(
    ["temple", "rotunda", "gateway"].flatMap((kind) =>
      cityArchitecture(kind).parts.map((p) => geometryDigest(p.geometry)),
    ),
  );
  const geometryHash = (root) => {
    const digest = createHash("sha256");
    root.traverse((node) => {
      if (!node.isMesh) return;
      // 任务道具由独立几何/铰链/拾取测试覆盖；圣珠、封印和旧基座仍逐字比较。
      let ancestor = node.parent;
      while (ancestor) {
        // 家具仅替换皮肤；完整实体仍与冻结基线逐字比较，独立射线/生命周期测试覆盖拟合。
        if (ancestor.userData.furnitureStats) return;
        if (ancestor.name === "atlantis_conch_key_and_inscriptions") return;
        if (
          ancestor.name === "poseidon_sacred_pearl" &&
          ![
            "carved_octagonal_dais",
            "pearl_dais_upper",
            "dais_bronze_inlay",
            "sacred_pearl",
            "guardian_seal",
            "pearl_orbit",
          ].includes(node.name)
        )
          return;
        ancestor = ancestor.parent;
      }
      const geometry = node.geometry;
      if (
        node.parent?.name === "poseidon_monument" ||
        node.parent?.name === "atlantis_poseidon_temple" ||
        node.material.name === "atlantis_obelisk_hf_stone" ||
        replacedObelisk.has(geometryDigest(geometry)) ||
        geometry.name.startsWith("civic_") ||
        replacedCivic.has(geometryDigest(geometry))
      )
        return;
      digest.update(
        JSON.stringify({
          name: node.name,
          matrix: node.matrix.toArray(),
          position: node.position.toArray(),
          scale: node.scale.toArray(),
          quaternion: node.quaternion.toArray(),
          material: {
            color: node.material.color?.getHexString(),
            emissive: node.material.emissive?.getHexString(),
            // 仅共享石材的表面响应属于本次材质修订，保留其他材质比较。
            roughness:
              node.material === atlantisMaterials().marble
                ? 0.78
                : node.material === atlantisMaterials().bronze
                  ? 0.46
                  : node.material.roughness,
          },
        }),
      );
      for (const name of Object.keys(geometry.attributes).sort()) {
        digest.update(name);
        digest.update(Buffer.from(geometry.attributes[name].array.buffer));
      }
      if (geometry.index)
        digest.update(Buffer.from(geometry.index.array.buffer));
      if (node.isInstancedMesh)
        digest.update(Buffer.from(node.instanceMatrix.array.buffer));
    });
    return digest.digest("hex");
  };
  assert.equal(geometryHash(ocean.root), geometryHash(reference.root));
  reference.dispose();
  oracle.dispose();
  ocean.dispose();
  ocean.dispose();
  assert.equal(parent.children.length, 0);
});

test("深层分片构造中断释放半成品，已完成的子模块不留在父场景", async () => {
  const parent = new THREE.Group();
  await assert.rejects(
    createAtlantisOceanAsync(parent, {
      onStep(label) {
        if (label === "residential-district")
          throw new Error("Injected construction failure");
      },
    }),
    /Injected construction failure/,
  );
  assert.equal(parent.children.length, 0);
});

test("冻结古城基线拒绝改写源码或伪造的逐文件哈希", () => {
  const snapshot = JSON.parse(
    readFileSync(
      new URL("./fixtures/accepted_atlantis_v0_8_0_base.json", import.meta.url),
      "utf8",
    ),
  );
  validateAcceptedAtlantisSnapshot(snapshot);
  snapshot.sources["atlantis_ocean.js"].source += "\n// forged baseline\n";
  assert.throws(
    () => validateAcceptedAtlantisSnapshot(snapshot),
    /source integrity/,
  );
  snapshot.sources["atlantis_ocean.js"].sha256 = createHash("sha256")
    .update(snapshot.sources["atlantis_ocean.js"].source)
    .digest("hex");
  assert.throws(
    () => validateAcceptedAtlantisSnapshot(snapshot),
    /dependency integrity/,
  );
});
