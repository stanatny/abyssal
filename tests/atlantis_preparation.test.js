import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createAtlantisOceanAsync } from "../src/atlantis_ocean.js";

test("分片古城保留已验收版本的全部实体、障碍及近景模型数据", async () => {
  const parent = new THREE.Group();
  const ocean = await createAtlantisOceanAsync(parent);
  const hash = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  // 固定基线 3292104；远景只是额外绘制层，不能改动真实实体或原精细资产。
  assert.equal(
    hash(ocean.colliders),
    "31917fbc63676bffadf632b956b69ef98c3f0b9e6195b68fbc362bf5f255c94b",
  );
  assert.equal(
    hash(ocean.obstacles),
    "2b96eeb7ed8453e4073000bc199355f29fe8aded716e13a46ca40c53e24f30d9",
  );
  assert.equal(ocean.city.stats.colliders, 20964);
  const digest = createHash("sha256");
  ocean.root.traverse((node) => {
    if (!node.isMesh) return;
    const geometry = node.geometry;
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
    if (geometry.index) digest.update(Buffer.from(geometry.index.array.buffer));
    if (node.isInstancedMesh)
      digest.update(Buffer.from(node.instanceMatrix.array.buffer));
  });
  assert.equal(
    digest.digest("hex"),
    "126fe9af4ca0327161d68e622650c881d1fc0ce5a0065b708535c92a4d4c6f5d",
  );
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
