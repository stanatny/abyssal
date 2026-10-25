import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createAmazonWaterSurface } from "../src/amazon_water_surface.js";
import { amazonWaterlilyLayout } from "../src/amazon_waterlilies.js";
import { AMAZON_WORLD as W, amazonSeabedHeight } from "../src/amazon_config.js";

function create() {
  const root = new T.Group(),
    resources = new Set(),
    time = { value: 0 };
  return {
    ...createAmazonWaterSurface(root, resources, time),
    root,
    resources,
    time,
    dispose() {
      root.traverse((n) => n.isInstancedMesh && n.dispose());
      for (const r of resources) r.dispose();
      root.clear();
    },
  };
}

test("river surface stays at its physical waterline and samples actual riverbed depth", () => {
  const s = create(),
    p = s.water.geometry.attributes.position,
    d = s.water.geometry.attributes.riverDepth;
  try {
    for (let i = 0; i < p.count; i++) {
      assert.equal(p.getY(i), W.surfaceY);
      assert.ok(
        Math.abs(
          d.getX(i) -
            Math.max(0, W.surfaceY - amazonSeabedHeight(p.getX(i), p.getZ(i))),
        ) < 0.0001,
      );
    }
    assert.equal(s.water.geometry.index.count / 3, 3072);
    assert.equal(s.water.material.depthWrite, false);
  } finally {
    s.dispose();
  }
});

test("water contacts follow all accepted leaf centers without adding collision or per-frame matrices", () => {
  const s = create(),
    leaves = amazonWaterlilyLayout().leaves,
    m = new T.Matrix4(),
    v = new T.Vector3();
  try {
    assert.equal(s.rings.count, leaves.length);
    assert.equal(s.rings.count * (s.rings.geometry.index.count / 3), 460);
    leaves.forEach((l, i) => {
      s.rings.getMatrixAt(i, m);
      v.setFromMatrixPosition(m);
      assert.ok(Math.abs(v.x - l.x) < 0.0001);
      assert.ok(Math.abs(v.z - l.z) < 0.0001);
      assert.ok(v.y > W.surfaceY && v.y < W.surfaceY + 0.007);
    });
    const before = s.rings.instanceMatrix.array.slice();
    s.update({ y: -100 });
    assert.equal(s.rings.visible, false);
    s.update({ y: 3.55 });
    assert.equal(s.rings.visible, true);
    assert.deepEqual(s.rings.instanceMatrix.array, before);
    assert.equal(s.colliders, undefined);
  } finally {
    s.dispose();
  }
});

test("separate river scenes own their water clocks and resources", () => {
  const a = create(),
    b = create();
  try {
    const shader = {
      uniforms: {},
      vertexShader: T.ShaderLib.standard.vertexShader,
      fragmentShader: T.ShaderLib.standard.fragmentShader,
    };
    a.water.material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.riverTime, a.time);
    assert.equal(a.rings.material.uniforms.riverTime, a.time);
    assert.notEqual(a.rings.material.uniforms.riverTime, b.time);
    a.time.value = 35;
    assert.equal(b.time.value, 0);
    assert.equal(a.resources.size, 4);
    for (const resource of a.resources) assert.ok(!b.resources.has(resource));
  } finally {
    a.dispose();
    b.dispose();
  }
});
