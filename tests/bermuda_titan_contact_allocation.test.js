import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import * as THREE from "three";
import contactCache from "../src/assets/models/bermuda_titan_whole_contacts.json" with { type: "json" };
import { createBermudaTitanWhole } from "../src/bermuda_titan_whole.js";

// 原34b7b609模块的两个算术函数；独立旧模块保留旧分配和运算次序，不消费新scratch。
function legacySphere(points, padding) {
  const u = points[1].clone().sub(points[0]),
    v = points[2].clone().sub(points[0]),
    n = new THREE.Vector3().crossVectors(u, v),
    edges = [
      u.lengthSq(),
      v.lengthSq(),
      points[1].distanceToSquared(points[2]),
    ],
    longest = edges.indexOf(Math.max(...edges)),
    pair = longest === 0 ? [0, 1] : longest === 1 ? [0, 2] : [1, 2],
    center = points[pair[0]].clone().add(points[pair[1]]).multiplyScalar(0.5);
  if (
    edges.reduce((a, b) => a + b, 0) > 2 * edges[longest] + 1e-16 &&
    n.lengthSq() > 1e-20
  ) {
    center.copy(points[0]);
    center.addScaledVector(
      new THREE.Vector3().crossVectors(v, n),
      edges[0] / (2 * n.lengthSq()),
    );
    center.addScaledVector(
      new THREE.Vector3().crossVectors(n, u),
      edges[1] / (2 * n.lengthSq()),
    );
  }
  return {
    center,
    radius: Math.max(...points.map((p) => p.distanceTo(center))) + padding,
  };
}
function legacyContact(index) {
  const row = patchRows[index];
  if (!row) return null;
  const key = row.moving ? version : -1,
    old = posed.get(index);
  if (old?.key === key) return old.data;
  const parent = parentPoints(row.face),
    points = Array.from({ length: 3 }, (_, k) =>
      new THREE.Vector3()
        .addScaledVector(parent[0], row.bary[k * 3])
        .addScaledVector(parent[1], row.bary[k * 3 + 1])
        .addScaledVector(parent[2], row.bary[k * 3 + 2]),
    ),
    fit = enclosingSphere(points, padding),
    data = {
      type: "sphere",
      id: `sleeping_titan_whole_${index}`,
      index,
      x: fit.center.x,
      y: fit.center.y,
      z: fit.center.z,
      radius: fit.radius,
      titanGuardArm: row.moving,
      dynamic: row.moving,
    };
  posed.set(index, { key, data });
  return data;
}

const moduleURL = new URL("../src/bermuda_titan_whole.js", import.meta.url);
function replaceBlock(source, begin, end, replacement) {
  const start = source.indexOf(begin),
    finish = source.indexOf(end, start);
  assert.ok(start >= 0 && finish > start, `Missing source block: ${begin}`);
  return source.slice(0, start) + replacement + "\n\n" + source.slice(finish);
}
async function oldFactory() {
  let source;
  if (process.env.ABYSSAL_TITAN_BEFORE_SOURCE)
    source = readFileSync(process.env.ABYSSAL_TITAN_BEFORE_SOURCE, "utf8");
  else {
    source = readFileSync(moduleURL, "utf8");
    source = replaceBlock(
      source,
      "function enclosingSphere(",
      "/** 单一原HF整身",
      legacySphere
        .toString()
        .replace("function legacySphere", "function enclosingSphere"),
    );
    source = replaceBlock(
      source,
      "  function getPosedContact(",
      "  function syncPlacement()",
      "  " +
        legacyContact
          .toString()
          .replace("function legacyContact", "function getPosedContact"),
    );
  }
  source = source.replace(
    /from "([^"]+)"/g,
    (_, name) =>
      `from ${JSON.stringify(name.startsWith(".") ? new URL(name, moduleURL).href : import.meta.resolve(name))}`,
  );
  const old = await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
  return old.createBermudaTitanWhole;
}

function sphereNumbers(actor) {
  const numbers = new Float64Array(contactCache.patches.length * 4);
  for (let i = 0; i < contactCache.patches.length; i++) {
    const c = actor.getPosedContact(i);
    assert.equal(c.index, i);
    assert.equal(c.id, `sleeping_titan_whole_${i}`);
    assert.equal(c.type, "sphere");
    numbers.set([c.x, c.y, c.z, c.radius], i * 4);
  }
  return Buffer.from(numbers.buffer);
}

test("All derived sphere outputs are bit-identical to the independent old module at five wrist poses", async () => {
  const createOld = await oldFactory(),
    old = createOld(new THREE.Group(), { contactCache }),
    current = createBermudaTitanWhole(new THREE.Group(), { contactCache });
  try {
    assert.equal(
      contactCache.patches.length,
      contactCache.header.counts.patches,
    );
    assert.equal(current.staticContacts.length, 42360);
    assert.equal(
      current.dynamicRestContacts.length,
      contactCache.header.counts.movingPatches,
    );
    for (const guard of [1, 0.75, 0.5, 0.25, 0]) {
      old.setGuard(guard);
      current.setGuard(guard);
      assert.deepEqual(
        sphereNumbers(current),
        sphereNumbers(old),
        `guard ${guard}`,
      );
    }
  } finally {
    old.dispose();
    current.dispose();
  }
});

test("Independent actor scratch cannot change another pose, cached identity or retained contact snapshots", async () => {
  const createOld = await oldFactory(),
    aParent = new THREE.Group(),
    bParent = new THREE.Group(),
    a = createBermudaTitanWhole(aParent, { contactCache }),
    b = createBermudaTitanWhole(bParent, { contactCache }),
    old = createOld(new THREE.Group(), { contactCache });
  try {
    const id =
        a.dynamicRestContacts[Math.floor(a.dynamicRestContacts.length / 2)]
          .index,
      staticId = a.staticContacts[0].index,
      retained = a.getPosedContact(id),
      saved = { ...retained },
      fixed = a.getPosedContact(staticId),
      version = a.poseVersion;
    assert.equal(a.getPosedContact(id), retained);
    a.setGuard(1);
    assert.equal(a.poseVersion, version);
    assert.equal(a.getPosedContact(id), retained);
    b.setGuard(0.25);
    const other = b.getPosedContact(id),
      otherSaved = { ...other };
    for (const guard of [0.75, 0.5, 0]) {
      a.setGuard(guard);
      old.setGuard(guard);
      for (const row of a.dynamicRestContacts) {
        const actual = a.getPosedContact(row.index);
        if (row.index === id)
          assert.deepEqual(actual, old.getPosedContact(row.index));
      }
      assert.equal(a.getPosedContact(staticId), fixed);
      assert.deepEqual(retained, saved);
      assert.deepEqual(other, otherSaved);
      assert.equal(b.getPosedContact(id), other);
    }
    assert.notEqual(a.getPosedContact(id), retained);
    assert.equal(a.getPosedContact(-1), null);
    let disposed = 0;
    a.near.material.addEventListener("dispose", () => disposed++);
    a.dispose();
    a.dispose();
    assert.equal(disposed, 1);
    assert.equal(aParent.children.length, 0);
    assert.deepEqual(a.queryDynamicContacts({ x: 0, y: 0, z: 0 }), []);
    assert.equal(a.staticContacts.length, 0);
    assert.equal(a.dynamicRestContacts.length, 0);
    assert.ok(b.getPosedContact(id));
  } finally {
    a.dispose();
    b.dispose();
    old.dispose();
  }
});

test("Warm identical query and guard sequences keep results while measuring the allocation-only experiment", async (t) => {
  const createOld = await oldFactory(),
    old = createOld(new THREE.Group(), { contactCache }),
    current = createBermudaTitanWhole(new THREE.Group(), { contactCache }),
    guards = [1, 0.75, 0.5, 0.25, 0],
    start = new THREE.Vector3(-0.16, -0.1, -0.35),
    end = new THREE.Vector3(-0.09, -0.1, -0.3),
    dimensions = { radius: 3.9 / 280, padding: 8.7 / 280, segment: true },
    run = (actor) => {
      const result = [],
        begin = performance.now();
      for (const guard of guards) {
        actor.setGuard(guard);
        for (let repeat = 0; repeat < 4; repeat++)
          result.push(
            actor
              .queryDynamicContacts(start, end, dimensions)
              .map((c) => c.index),
          );
      }
      return { ms: performance.now() - begin, result };
    };
  try {
    assert.deepEqual(run(current).result, run(old).result);
    const oldTimes = [],
      newTimes = [];
    for (let sample = 0; sample < 3; sample++) {
      let a, b;
      if (sample % 2) {
        b = run(current);
        a = run(old);
      } else {
        a = run(old);
        b = run(current);
      }
      assert.deepEqual(b.result, a.result);
      oldTimes.push(a.ms);
      newTimes.push(b.ms);
    }
    const median = (values) => [...values].sort((a, b) => a - b)[1];
    t.diagnostic(
      `20 queries/5 guards, warm medians old=${median(oldTimes).toFixed(3)} ms scratch=${median(newTimes).toFixed(3)} ms; samples ${JSON.stringify({ old: oldTimes, scratch: newTimes })}; no FPS assertion`,
    );
  } finally {
    old.dispose();
    current.dispose();
  }
});
