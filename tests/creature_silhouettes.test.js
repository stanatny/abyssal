import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

// 在同一实际全长下比较中段几何，忽略颜色与花纹，防止退回同模换皮。
function middleOutline(kind) {
  const root = createCreature(kind, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(),
    point = new THREE.Vector3();
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      if (point.z >= -0.13 && point.z <= 0.15) box.expandByPoint(point);
    }
  });
  return box.getSize(new THREE.Vector3());
}

test("normalized marine silhouettes retain species-specific depth and breadth", () => {
  const anchovy = middleOutline("anchovy"),
    herring = middleOutline("herring"),
    sardine = middleOutline("sardine"),
    mackerel = middleOutline("mackerel");
  assert.ok(herring.y > sardine.y * 1.25);
  assert.ok(sardine.y > anchovy.y * 1.4);
  assert.ok(mackerel.x > anchovy.x * 1.2);
  assert.ok(middleOutline("tuna").x > mackerel.x * 1.5);
  assert.ok(middleOutline("fish").y > middleOutline("fish").x * 2);
});

test("mythic pond fish keep visibly different physical silhouettes", () => {
  const jade = middleOutline("jade_minnow"),
    mask = middleOutline("chiru"),
    koi = middleOutline("spirit_carp"),
    gold = middleOutline("dragon_carp");
  assert.ok(mask.y > jade.y * 2);
  assert.ok(koi.y > jade.y * 1.5);
  assert.ok(gold.x > koi.x * 1.25);
  assert.ok(mask.y > gold.y * 1.2);
});
