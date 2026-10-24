import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  loadAcceptedMariana,
  validateAcceptedMarianaSnapshot,
} from "./helpers/accepted_mariana_oracle.js";
import { createMarianaOceanAsync } from "../src/mariana_ocean.js";

test("分片海沟保留已验收实体、障碍及本轮群落之外的近景数据", async (context) => {
  const oracle = await loadAcceptedMariana();
  context.after(() => oracle.dispose());
  const referenceParent = new THREE.Group();
  const reference = oracle.createOcean(referenceParent);
  context.after(() => reference.dispose());
  const parent = new THREE.Group();
  const ocean = await createMarianaOceanAsync(parent);
  context.after(() => ocean.dispose());
  const hash = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  // 认证基线 f2adc31 在同一 Node/Three 环境构造；保持逐字比较，避免跨运行时硬编码浮点哈希。
  // 四层后缘岩湾和 HF 岩体明确更换实体；其余全地图实体仍与冻结基线逐项一致。
  const changedSite = (id) =>
    [
      "hydra_shoulder",
      "kraken_echo_gallery",
      "maja_fossil_garden",
      "leviathan_pressure_cathedral",
    ].some(
      (site) =>
        id?.startsWith(`landmark_${site}_`) ||
        id?.startsWith(`mariana_hf_strata_${site}_`),
    );
  const revisedBuilding = (id) =>
    id === "pineapple_house" ||
    id === "mariana_bottom_refuge_1" ||
    /^refuge_(pineapple|stone|rock_house|restaurant|bank_|hf_)/.test(id);
  assert.equal(
    hash(
      ocean.colliders.filter(
        (c) => !changedSite(c.id) && !revisedBuilding(c.id),
      ),
    ),
    hash(
      reference.colliders.filter(
        (c) => !changedSite(c.id) && !revisedBuilding(c.id),
      ),
    ),
  );
  assert.equal(hash(ocean.obstacles), hash(reference.obstacles));
  assert.equal(hash(ocean.landmarks), hash(reference.landmarks));
  assert.equal(
    hash(ocean.root.userData.marineAttachments),
    hash(reference.root.userData.marineAttachments),
  );

  const geometryHash = (root, legacy = false) => {
    const digest = createHash("sha256");
    root.traverse((node) => {
      if (!node.isMesh) return;
      // 本批只更新避难所建筑/铺地，居民的逐顶点基线由专门检查保留。
      for (let p = node.parent; p; p = p.parent)
        if (p.name === "mariana_bottom_refuge") return;
      // 只排除这四个地貌岩湾；最低暖色地标、避难所及其余岩壁、浮岩仍严格比较。
      if (
        [
          "hydra_shoulder",
          "kraken_echo_gallery",
          "maja_fossil_garden",
          "leviathan_pressure_cathedral",
        ].some((site) => node.parent?.name === `mariana_landmark_${site}`)
      )
        return;
      // 只排除本批自然群落和小型化石，冻结基线本身不得改写。
      if (
        node.name.startsWith("mariana_hf_colony_") ||
        node.name.startsWith("mariana_hf_fossils_")
      )
        return;
      if (
        legacy &&
        (node.name === "mariana_living_reef" ||
          (node.parent?.name.startsWith("trench_ecology_") &&
            node === node.parent.children[1]))
      )
        return;
      let geometry = node.geometry;
      // 只裁掉旧合批尾部七个扇形及其亮色中脊，大型雕塑和矿脉仍逐顶点比较。
      if (legacy && /^mariana_landmark_.*_(relief|inlay)$/.test(node.name)) {
        const inlay = node.name.endsWith("_inlay");
        const count =
          geometry.attributes.position.count - 7 * (inlay ? 68 : 150);
        assert.ok(count >= 0);
        if (!count) return;
        const trimmed = new THREE.BufferGeometry();
        for (const [key, attribute] of Object.entries(geometry.attributes))
          trimmed.setAttribute(
            key,
            new THREE.BufferAttribute(
              attribute.array.slice(0, count * attribute.itemSize),
              attribute.itemSize,
              attribute.normalized,
            ),
          );
        trimmed.setIndex(
          new THREE.BufferAttribute(
            geometry.index.array.slice(
              0,
              geometry.index.count - 7 * (inlay ? 110 : 296) * 3,
            ),
            1,
          ),
        );
        geometry = trimmed;
      }
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
            roughness: node.material.roughness,
          },
        }),
      );
      for (const name of Object.keys(geometry.attributes).sort()) {
        digest.update(name);
        digest.update(Buffer.from(geometry.attributes[name].array.buffer));
      }
      if (geometry.index)
        digest.update(Buffer.from(geometry.index.array.buffer));
      if (node.isInstancedMesh) {
        digest.update(Buffer.from(node.instanceMatrix.array.buffer));
        if (node.instanceColor)
          digest.update(Buffer.from(node.instanceColor.array.buffer));
      }
    });
    return digest.digest("hex");
  };
  assert.equal(geometryHash(ocean.root), geometryHash(reference.root, true));
  reference.dispose();
  oracle.dispose();
  ocean.dispose();
  ocean.dispose();
  assert.equal(parent.children.length, 0);
});

test("深层分片构造中断释放半成品，已完成的子模块不留在父场景", async () => {
  const parent = new THREE.Group();
  await assert.rejects(
    createMarianaOceanAsync(parent, {
      onStep(label) {
        if (label === "landmark")
          throw new Error("Injected construction failure");
      },
    }),
    /Injected construction failure/,
  );
  assert.equal(parent.children.length, 0);
});

test("冻结海沟基线拒绝改写源码或伪造的逐文件哈希", () => {
  const snapshot = JSON.parse(
    readFileSync(
      new URL("./fixtures/accepted_mariana_v0_11_5.json", import.meta.url),
      "utf8",
    ),
  );
  validateAcceptedMarianaSnapshot(snapshot);
  snapshot.sources["mariana_ocean.js"].source += "\n// forged baseline\n";
  assert.throws(
    () => validateAcceptedMarianaSnapshot(snapshot),
    /source integrity/,
  );
  snapshot.sources["mariana_ocean.js"].sha256 = createHash("sha256")
    .update(snapshot.sources["mariana_ocean.js"].source)
    .digest("hex");
  assert.throws(
    () => validateAcceptedMarianaSnapshot(snapshot),
    /dependency integrity/,
  );
});
