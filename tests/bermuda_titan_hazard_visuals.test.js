import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  BERMUDA_TITAN_HAZARD_LIMITS as LIMITS,
  createBermudaTitanHazardVisuals,
} from "../src/bermuda_titan_hazard_visuals.js";

const vector = (x, y, z) => ({ x, y, z });
const path = (id = 0, segments = 12) => ({
  id,
  points: Array.from({ length: segments + 1 }, (_, i) =>
    vector(-160 + i * 5, -588 - i * i * 0.14, -1590 + id * i * 0.7),
  ),
  radius: 1.6,
  impact: vector(-100, -612, -1590 + id * 8.4),
  impactRadius: 6.5,
  impactHeight: 4,
  impactNormal: vector(0.15, 1, -0.1),
});
const rock = (id, phase = "falling") => ({
  id,
  phase,
  warningPoint: vector(-90 + id * 5, -610, -1560),
  warningNormal: vector(0.1, 1, 0),
  previous: vector(-90 + id * 5, -592, -1560),
  position: vector(-90 + id * 5, -595, -1560),
  radius: 2.6,
  progress: 0.65,
});
const snapshot = (phase = "active") => ({
  clock: 12,
  awake: 0.4,
  lava: { phase, progress: 0.5, paths: [path(0), path(1), path(2)] },
  rocks: [],
  terminal: { active: false, progress: 0 },
});
const child = (v, name) => v.root.getObjectByName(name);
const stream = (v) => child(v, "titan_complete_molten_salvo");
function frozen(value) {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) frozen(item);
    Object.freeze(value);
  }
  return value;
}
function withVisual(fn) {
  const parent = new T.Group(),
    visual = createBermudaTitanHazardVisuals(parent);
  try {
    fn(visual, parent);
  } finally {
    visual.dispose();
  }
}

test("Warning is only the true ground footprint and warm mouth charge; active paths appear whole and off leaves no lava", () =>
  withVisual((v) => {
    const warning = frozen(snapshot("warning"));
    v.update(warning);
    assert.equal(stream(v).visible, false);
    assert.equal(stream(v).geometry.drawRange.count, 0);
    assert.equal(
      child(v, "titan_four_metre_molten_impact_crowns").visible,
      false,
    );
    assert.equal(child(v, "titan_hazard_ground_marks").count, 3);
    const charge = child(v, "titan_mouth_molten_charge");
    assert.equal(charge.visible, true);
    assert.deepEqual(
      charge.position.toArray(),
      Object.values(warning.lava.paths[0].points[0]),
    );
    assert.equal(charge.material.transparent, false);
    assert.ok(charge.material.isMeshStandardMaterial);
    assert.equal(charge.material.metalness, 0);
    const active = snapshot();
    for (const progress of [0, 0.02, 0.5, 0.98, 1]) {
      active.lava.progress = progress;
      v.update(active);
      assert.equal(v.stats.paths, 3);
      assert.ok(v.stats.vertices > 669 && v.stats.vertices <= 3711);
      assert.ok(v.stats.triangles > 1224 && v.stats.triangles <= 6840);
      assert.equal(charge.visible, false);
      assert.equal(stream(v).material.transparent, false);
      assert.equal(stream(v).material.depthWrite, true);
    }
    v.update(snapshot("off"));
    assert.ok(v.root.children.every((m) => !m.visible));
    assert.equal(stream(v).geometry.drawRange.count, 0);
  }));

test("Complete welded stream skin stays inside the supplied real capsule paths, including curved ends and vertical trajectories", () =>
  withVisual((v) => {
    const s = snapshot();
    s.lava.paths[2].points = Array.from({ length: 13 }, (_, i) =>
      vector(-180, -560 - i * 5, -1610),
    );
    v.update(s);
    const g = stream(v).geometry,
      p = g.attributes.position,
      n = g.attributes.normal,
      actual = new T.Vector3(),
      nearest = new T.Vector3(),
      a = new T.Vector3(),
      b = new T.Vector3(),
      c = new T.Vector3(),
      cross = new T.Vector3(),
      mean = new T.Vector3();
    for (let i = 0; i < v.stats.vertices; i++) {
      actual.fromBufferAttribute(p, i);
      assert.ok(actual.toArray().every(Number.isFinite));
      const source =
        s.lava.paths[
          stream(v).userData.pathRanges.findIndex(
            (range) =>
              i >= range.firstVertex &&
              i < range.firstVertex + range.vertexCount,
          )
        ];
      let distance = Infinity;
      for (let j = 1; j < source.points.length; j++) {
        const line = new T.Line3(
          a.copy(source.points[j - 1]),
          b.copy(source.points[j]),
        );
        line.closestPointToPoint(actual, true, nearest);
        distance = Math.min(distance, nearest.distanceTo(actual));
      }
      assert.ok(
        distance <= source.radius + 0.0002,
        `vertex ${i} outside actual capsule: ${distance}`,
      );
      actual.addScaledVector(a.fromBufferAttribute(n, i), -0.06);
      distance = Infinity;
      for (let j = 1; j < source.points.length; j++) {
        const line = new T.Line3(
          a.copy(source.points[j - 1]),
          b.copy(source.points[j]),
        );
        line.closestPointToPoint(actual, true, nearest);
        distance = Math.min(distance, nearest.distanceTo(actual));
      }
      assert.ok(
        distance <= source.radius + 0.0002,
        `maximum HF vertex relief escaped actual capsule: ${distance}`,
      );
    }
    for (let i = 0; i < g.drawRange.count; i += 3) {
      const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
      a.fromBufferAttribute(p, ids[0]);
      b.fromBufferAttribute(p, ids[1]);
      c.fromBufferAttribute(p, ids[2]);
      cross.subVectors(b, a).cross(c.sub(a));
      assert.ok(cross.lengthSq() > 1e-10, `collapsed face ${i / 3}`);
      mean
        .fromBufferAttribute(n, ids[0])
        .add(a.fromBufferAttribute(n, ids[1]))
        .add(b.fromBufferAttribute(n, ids[2]));
      assert.ok(cross.dot(mean) > 0, `reversed face ${i / 3}`);
    }
  }));

test("Sloped impact crown occupies the actual radius and four-metre height; falling HF rock fits its real spherical envelope", () =>
  withVisual((v) => {
    const s = snapshot();
    s.rocks = [rock(1)];
    v.update(s);
    const g = child(v, "titan_four_metre_molten_impact_crowns").geometry,
      pos = new T.Vector3(),
      rel = new T.Vector3();
    assert.equal(g.drawRange.count, 3 * 720);
    for (let i = 0; i < s.lava.paths.length; i++) {
      const source = s.lava.paths[i],
        normal = new T.Vector3().copy(source.impactNormal).normalize();
      let top = 0,
        edge = 0;
      for (let j = i * 152; j < (i + 1) * 152; j++) {
        pos.fromBufferAttribute(g.attributes.position, j);
        rel.copy(pos).sub(source.impact);
        const height = rel.dot(normal),
          radial = rel.clone().addScaledVector(normal, -height).length();
        assert.ok(height >= -0.0002 && height <= 4.0002);
        assert.ok(radial <= source.impactRadius + 0.0002);
        top = Math.max(top, height);
        edge = Math.max(edge, radial);
      }
      assert.ok(
        top > 3.95,
        "a thin disc cannot portray the dangerous four-metre splash",
      );
      assert.ok(edge > 6.49);
    }
    const rocks = child(v, "titan_real_falling_hf_rocks"),
      matrix = new T.Matrix4();
    rocks.getMatrixAt(0, matrix);
    for (let i = 0; i < rocks.geometry.attributes.position.count; i++) {
      pos
        .fromBufferAttribute(rocks.geometry.attributes.position, i)
        .applyMatrix4(matrix);
      assert.ok(
        pos.distanceTo(s.rocks[0].position) <= s.rocks[0].radius + 0.0002,
      );
    }
    s.rocks[0].phase = "impact";
    v.update(s);
    assert.equal(rocks.count, 0);
    assert.equal(child(v, "titan_impact_underwater_steam").count, 10);
  }));

test("Bounded pools reuse all geometry, index and instance buffers through pause, reduced motion, maximal rocks and terminal disaster", () =>
  withVisual((v) => {
    const s = snapshot();
    s.rocks = Array.from({ length: 20 }, (_, i) => rock(i));
    const objects = v.root.children.map((m) => ({
      geometry: m.geometry,
      position: m.geometry.attributes.position.array,
      index: m.geometry.index?.array,
      instances: m.instanceMatrix?.array,
    }));
    v.update(s);
    assert.equal(v.stats.rocks, LIMITS.rocks);
    assert.equal(v.stats.groundMarks, 6);
    assert.ok(
      v.stats.visibleDrawCalls <= LIMITS.drawCalls && LIMITS.drawCalls <= 8,
    );
    assert.equal(v.stats.bufferBytes, 186519);
    assert.ok(v.stats.bufferBytes < 192 * 1024);
    const before = Float32Array.from(
      stream(v).geometry.attributes.position.array,
    );
    v.update(s);
    assert.deepEqual(
      stream(v).geometry.attributes.position.array,
      before,
      "paused clock cannot move the hazard",
    );
    assert.equal(
      stream(v).material.userData.lavaUniforms.uLavaClock.value,
      s.clock,
    );
    const completeIndices = stream(v).geometry.drawRange.count;
    v.update(s, { reducedMotion: true });
    assert.equal(
      stream(v).geometry.drawRange.count,
      completeIndices,
      "reduced motion keeps the complete hazard path",
    );
    assert.equal(v.stats.paths, 3);
    assert.equal(
      stream(v).material.userData.lavaUniforms.uLavaMotion.value,
      0.18,
    );
    const terminal = {
      clock: 15,
      lava: { phase: "off", paths: [] },
      rocks: [],
      terminal: {
        active: true,
        progress: 0.7,
        center: vector(-40, -600, -1460),
        ground: vector(-40, -620, -1460),
        roof: vector(-40, -490, -1460),
      },
    };
    v.update(terminal);
    assert.equal(
      stream(v).visible,
      false,
      "a terminal disaster cannot throw an old mouth beam through walls",
    );
    assert.equal(v.stats.rocks, 6);
    assert.ok(child(v, "titan_four_metre_molten_impact_crowns").visible);
    assert.equal(
      v.root.children.some((m) => m.isLight || m.isSprite),
      false,
    );
    const rockMatrix = new T.Matrix4(),
      actualRock = new T.Vector3();
    for (let i = 0; i < 6; i++) {
      child(v, "titan_real_falling_hf_rocks").getMatrixAt(i, rockMatrix);
      actualRock.setFromMatrixPosition(rockMatrix);
      assert.ok(Math.hypot(actualRock.x + 40, actualRock.z + 1460) <= 7.01);
      assert.ok(
        actualRock.y < terminal.terminal.roof.y &&
          actualRock.y > terminal.terminal.center.y - 3,
      );
    }
    v.root.children.forEach((m, i) => {
      assert.equal(m.geometry, objects[i].geometry);
      assert.equal(m.geometry.attributes.position.array, objects[i].position);
      assert.equal(m.geometry.index?.array, objects[i].index);
      assert.equal(m.instanceMatrix?.array, objects[i].instances);
    });
    v.reset();
    assert.ok(v.root.children.every((m) => !m.visible));
    v.update({ ...terminal, terminal: { active: true, progress: 0.7 } });
    assert.equal(
      v.stats.visibleDrawCalls,
      0,
      "restart cannot retain the previous disaster layout",
    );
  }));

test("HF impacts are closed thick volumes with geometric normals, and terminal inundation has a broad rising top rather than a stretched crown", () =>
  withVisual((v) => {
    const s = snapshot();
    s.lava.paths = [path(0)];
    v.update(s);
    const mesh = child(v, "titan_four_metre_molten_impact_crowns"),
      g = mesh.geometry,
      p = g.attributes.position,
      n = g.attributes.normal,
      a = new T.Vector3(),
      b = new T.Vector3(),
      c = new T.Vector3(),
      cross = new T.Vector3(),
      edges = new Map();
    const key = (i) =>
      [p.getX(i), p.getY(i), p.getZ(i)]
        .map((x) => Math.round(x * 1e4))
        .join(",");
    let volume = 0,
      up = 0,
      down = 0,
      side = 0;
    const normal = new T.Vector3()
      .copy(s.lava.paths[0].impactNormal)
      .normalize();
    for (let i = 0; i < 152; i++) {
      a.fromBufferAttribute(n, i);
      assert.ok(Math.abs(a.length() - 1) < 1e-5);
      const dot = a.dot(normal);
      if (dot > 0.5) up++;
      else if (dot < -0.5) down++;
      else side++;
    }
    for (let i = 0; i < g.drawRange.count; i += 3) {
      const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
      for (let j = 0; j < 3; j++) {
        const x = key(ids[j]),
          y = key(ids[(j + 1) % 3]),
          edge = x < y ? x + "/" + y : y + "/" + x;
        edges.set(edge, (edges.get(edge) || 0) + 1);
      }
      a.fromBufferAttribute(p, ids[0]).sub(s.lava.paths[0].impact);
      b.fromBufferAttribute(p, ids[1]).sub(s.lava.paths[0].impact);
      c.fromBufferAttribute(p, ids[2]).sub(s.lava.paths[0].impact);
      volume += a.dot(cross.crossVectors(b, c)) / 6;
      cross.subVectors(b, a).cross(c.sub(a)).normalize();
      if (Math.abs(cross.dot(normal)) < 0.1) {
        a.fromBufferAttribute(n, ids[0])
          .add(b.fromBufferAttribute(n, ids[1]))
          .add(c.fromBufferAttribute(n, ids[2]))
          .normalize();
        if (Math.abs(a.dot(normal)) < 0.5) side++;
      }
    }
    assert.ok(
      [...edges.values()].every((x) => x === 2),
      "visible liquid must include top, sides and bottom",
    );
    assert.ok(volume > 20 && up > 10 && down > 10 && side > 10);
    v.update({
      clock: 20,
      lava: { phase: "off", paths: [] },
      rocks: [],
      terminal: {
        active: true,
        progress: 1,
        center: vector(0, -600, 0),
        ground: vector(0, -620, 0),
        roof: vector(0, -500, 0),
      },
    });
    assert.equal(mesh.material.isMeshStandardMaterial, true);
    assert.equal(mesh.material.side, T.DoubleSide);
    v.root.updateMatrixWorld(true);
    const inside = new T.Vector3(0, -600, 0),
      ray = new T.Raycaster(inside, new T.Vector3(1, 0, 0));
    assert.ok(
      ray
        .intersectObject(mesh, false)
        .some((hit) => hit.distance > 43 && hit.distance < 128.1),
      "a camera inside the opaque flood must still see its side wall",
    );
    ray.set(inside, new T.Vector3(0, 1, 0));
    assert.ok(
      ray.intersectObject(mesh, false).length > 0,
      "inside view retains the broad top",
    );
    for (const groundY of [-620, -675]) {
      v.update({
        clock: 20,
        lava: { phase: "off", paths: [] },
        rocks: [],
        terminal: {
          active: true,
          progress: 1,
          center: vector(0, -600, 0),
          ground: vector(0, groundY, 0),
          roof: vector(0, -500, 0),
        },
      });
      g.computeBoundingSphere();
      v.root.updateMatrixWorld(true);
      let minOutline = Infinity,
        maxOutline = 0;
      for (let j = 0; j <= 24; j++) {
        const at = 1 + 5 * 25 + j,
          radius = Math.hypot(p.getX(at), p.getZ(at));
        minOutline = Math.min(minOutline, radius);
        maxOutline = Math.max(maxOutline, radius);
        assert.ok(
          p.getY(1 + 3 * 25 + j) - groundY < (-600 - groundY + 7) * 0.03,
          "rounded shoulders reach the ground instead of a tall vertical cake wall",
        );
      }
      assert.ok(
        minOutline >= 112 &&
          maxOutline <= 128.001 &&
          maxOutline - minOutline > 2.5,
      );
      for (let j = 0; j < 12; j++) {
        const angle = (j / 12) * Math.PI * 2;
        ray.set(
          new T.Vector3(Math.cos(angle) * 43, -580, Math.sin(angle) * 43),
          new T.Vector3(0, -1, 0),
        );
        const hit = ray.intersectObject(mesh, false)[0];
        assert.ok(
          hit && hit.point.y >= -596.8,
          "the final flood engulfs the whole 32m body and the 43m camera vicinity in every direction",
        );
      }
    }
    assert.equal(
      mesh.material.userData.lavaUniforms.uLavaMaxRelief.value,
      0,
      "pool contact is not displaced away from the true ground",
    );
  }));

test("Oversize or invalid trajectories fail whole instead of truncating into a misleading partial stream", () =>
  withVisual((v) => {
    const s = snapshot();
    s.lava.paths = [
      path(1, 13),
      { ...path(2), points: [vector(0, 0, 0), vector(NaN, 0, 0)] },
    ];
    v.update(s);
    assert.equal(v.stats.paths, 0);
    assert.equal(stream(v).visible, false);
    s.lava.paths = [path()];
    s.lava.paths[0].impactNormal = vector(0, 0, 0);
    v.update(s);
    assert.ok(
      child(
        v,
        "titan_four_metre_molten_impact_crowns",
      ).geometry.attributes.position.array.every(Number.isFinite),
    );
  }));

test("The actual four-metre muzzle elbow is rounded and time-turbulent while sampled faces stay inside the unchanged real capsules", () =>
  withVisual((v) => {
    // Relative points from the actual lava_close inspection, not a gentler test-only arc.
    const source = path(0);
    source.points = [
      [0, 0, 0],
      [3.99755, -0.128658, 0.055118],
      [7.303841, 6.73362, -1.555385],
      [10.633722, 11.289996, -6.050367],
      [13.915876, 13.724442, -12.789744],
      [17.078985, 14.220927, -21.13343],
      [20.051731, 12.963423, -30.441342],
      [22.762798, 10.135899, -40.073397],
      [25.140868, 5.922327, -49.389508],
      [27.114623, 0.506678, -57.749594],
      [28.612746, -5.927079, -64.513568],
      [29.563919, -13.194972, -69.041348],
      [29.896825, -21.113031, -70.692849],
    ].map(([x, y, z]) => vector(x, y, z));
    source.impact = vector(30, -23, -70.5);
    const s = snapshot();
    s.lava.paths = [source];
    frozen(s.lava.paths);
    const sample = new T.Vector3(),
      a = new T.Vector3(),
      b = new T.Vector3(),
      c = new T.Vector3();
    let first,
      checked = 0,
      maximum = 0,
      maxMotion = 0;
    function distance(point) {
      let value = Infinity;
      for (let i = 1; i < source.points.length; i++) {
        const from = source.points[i - 1],
          to = source.points[i],
          dx = to.x - from.x,
          dy = to.y - from.y,
          dz = to.z - from.z,
          t = Math.max(
            0,
            Math.min(
              1,
              ((point.x - from.x) * dx +
                (point.y - from.y) * dy +
                (point.z - from.z) * dz) /
                (dx * dx + dy * dy + dz * dz),
            ),
          );
        value = Math.min(
          value,
          Math.hypot(
            point.x - from.x - dx * t,
            point.y - from.y - dy * t,
            point.z - from.z - dz * t,
          ),
        );
      }
      return value;
    }
    for (const clock of [0, 0.1, 0.7, 2]) {
      s.clock = clock;
      v.update(s);
      const g = stream(v).geometry,
        p = g.attributes.position;
      assert.ok(
        v.stats.vertices > 223,
        "the elbow needs actual intermediate cross sections",
      );
      if (!first) first = Float32Array.from(p.array);
      for (let i = 0; i < v.stats.vertices; i++) {
        sample.fromBufferAttribute(p, i);
        maxMotion = Math.max(
          maxMotion,
          sample.distanceTo(a.fromArray(first, i * 3)),
        );
      }
      for (let i = 0; i < g.drawRange.count; i += 3) {
        a.fromBufferAttribute(p, g.index.getX(i));
        b.fromBufferAttribute(p, g.index.getX(i + 1));
        c.fromBufferAttribute(p, g.index.getX(i + 2));
        for (const weights of [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
          [0.5, 0.5, 0],
          [0, 0.5, 0.5],
          [0.5, 0, 0.5],
          [1 / 3, 1 / 3, 1 / 3],
        ]) {
          sample
            .copy(a)
            .multiplyScalar(weights[0])
            .addScaledVector(b, weights[1])
            .addScaledVector(c, weights[2]);
          const d = distance(sample);
          maximum = Math.max(maximum, d);
          checked++;
          assert.ok(
            d <= source.radius + 1e-5,
            `actual flowing surface escaped the real radius: ${d}`,
          );
        }
      }
    }
    assert.ok(checked > 10000);
    assert.ok(maximum > source.radius * 0.85);
    assert.ok(
      maxMotion > 0.1 && maxMotion < source.radius,
      `coherent liquid motion stays inside the full true radius: ${maxMotion}`,
    );
  }));

test("Independent factories share accepted HF geology while owned resources and leases dispose exactly once", async () => {
  const parent = new T.Group(),
    a = createBermudaTitanHazardVisuals(parent),
    b = createBermudaTitanHazardVisuals(parent),
    ar = child(a, "titan_real_falling_hf_rocks"),
    br = child(b, "titan_real_falling_hf_rocks");
  assert.equal(ar.geometry, br.geometry);
  assert.equal(ar.material, br.material);
  let sharedDispose = 0,
    ownedDispose = 0;
  ar.geometry.addEventListener("dispose", () => sharedDispose++);
  stream(a).geometry.addEventListener("dispose", () => ownedDispose++);
  try {
    a.update(snapshot());
    const sb = snapshot();
    sb.clock = 24;
    b.update(sb);
    assert.equal(stream(a).material.userData.lavaUniforms.uLavaClock.value, 12);
    assert.equal(stream(b).material.userData.lavaUniforms.uLavaClock.value, 24);
    a.dispose();
    a.dispose();
    assert.equal(sharedDispose, 0);
    assert.equal(ownedDispose, 1);
    assert.equal(parent.children.length, 1);
    assert.equal(await a.prepare(), false);
    b.update(snapshot());
    assert.equal(br.geometry.attributes.position.count, 2376);
    b.dispose();
    b.dispose();
    assert.equal(sharedDispose, 1);
    assert.equal(parent.children.length, 0);
  } finally {
    a.dispose();
    b.dispose();
  }
});

test("Continuous pressure bulges are visibly axial but frame-coherent, and terminal side UVs use circumference by height", () =>
  withVisual((v) => {
    const s = snapshot(),
      straight = path(0);
    straight.points = Array.from({ length: 13 }, (_, i) =>
      vector(i * 10, 20, 0),
    );
    straight.impact = vector(120, 0, 0);
    s.lava.paths = [straight];
    s.clock = 0;
    v.update(s);
    const g = stream(v).geometry,
      p = g.attributes.position,
      range = stream(v).userData.pathRanges[0],
      count = (range.vertexCount - 2) / 13 - 4,
      centre = new T.Vector3(),
      point = new T.Vector3();
    let minimum = Infinity,
      maximum = 0;
    for (let ring = 0; ring < count; ring++) {
      const first = range.firstVertex + 1 + (ring + 2) * 13;
      centre.set(0, 0, 0);
      for (let j = 0; j < 12; j++)
        centre.add(point.fromBufferAttribute(p, first + j));
      centre.multiplyScalar(1 / 12);
      let radius = 0;
      for (let j = 0; j < 12; j++)
        radius = Math.max(
          radius,
          point.fromBufferAttribute(p, first + j).distanceTo(centre),
        );
      minimum = Math.min(minimum, radius);
      maximum = Math.max(maximum, radius);
    }
    assert.ok(
      maximum / minimum > 1.45 &&
        maximum > straight.radius * 0.84 &&
        minimum < straight.radius * 0.65,
      "the complete core needs actual bulges and constrictions, not a uniformly printed cable",
    );
    const before = Float32Array.from(p.array);
    s.clock = 1 / 30;
    v.update(s);
    let frameMotion = 0;
    for (let i = 0; i < v.stats.vertices; i++)
      frameMotion = Math.max(
        frameMotion,
        point
          .fromBufferAttribute(p, i)
          .distanceTo(centre.fromArray(before, i * 3)),
      );
    assert.ok(
      frameMotion < straight.radius * 0.12,
      "coherent advection cannot jump its silhouette frame to frame",
    );
    const uniforms = stream(v).material.userData.lavaUniforms;
    assert.ok(uniforms.uLavaAxialScale.value <= 0.3);
    assert.ok(
      uniforms.uLavaFlow.value / (0.14 * uniforms.uLavaAxialScale.value) >= 6,
      "nominal surface flow is expressed in real path metres per second",
    );
    v.update({
      clock: 12,
      lava: { phase: "off", paths: [] },
      rocks: [],
      terminal: {
        active: true,
        progress: 1,
        center: vector(0, -600, 0),
        ground: vector(0, -620, 0),
        roof: vector(0, -500, 0),
      },
    });
    const pool = child(v, "titan_four_metre_molten_impact_crowns").geometry,
      uv = pool.attributes.uv,
      q = pool.attributes.position;
    for (let j = 0; j <= 24; j++) {
      const top = 1 + 3 * 25 + j,
        wall = 1 + 4 * 25 + j,
        bottom = 1 + 5 * 25 + j;
      assert.ok(
        point
          .fromBufferAttribute(q, top)
          .distanceTo(centre.fromBufferAttribute(q, wall)) < 1e-6,
      );
      assert.ok(Math.abs(uv.getX(wall) - uv.getX(bottom)) < 1e-6);
      assert.ok(
        Math.abs(
          uv.getY(wall) -
            uv.getY(bottom) -
            (q.getY(wall) - q.getY(bottom)) * 0.12,
        ) < 1e-5,
      );
      assert.ok(
        Math.abs(uv.getX(wall) - uv.getX(1 + 4 * 25) - (j / 24) * 97) < 1e-5,
      );
    }
  }));

test("Reduced motion slows real CPU bulges together with HF flow while keeping the full stream", () => {
  const normal = createBermudaTitanHazardVisuals(new T.Group()),
    slow = createBermudaTitanHazardVisuals(new T.Group()),
    a = snapshot(),
    b = snapshot(),
    point = new T.Vector3(),
    previous = new T.Vector3();
  try {
    a.clock = 0.9;
    b.clock = 5;
    normal.update(a);
    slow.update(b, { reducedMotion: true });
    const n = stream(normal).geometry.attributes.position,
      r = stream(slow).geometry.attributes.position;
    const n0 = Float32Array.from(n.array),
      r0 = Float32Array.from(r.array);
    assert.equal(normal.stats.vertices, slow.stats.vertices);
    for (let i = 0; i < normal.stats.vertices; i++)
      assert.ok(
        point
          .fromBufferAttribute(n, i)
          .distanceTo(previous.fromBufferAttribute(r, i)) < 1e-6,
        "same effective clock gives the same actual bulge phase",
      );
    a.clock += 1 / 30;
    b.clock += 1 / 30;
    normal.update(a);
    slow.update(b, { reducedMotion: true });
    let fullMovement = 0,
      slowMovement = 0;
    for (let i = 0; i < normal.stats.vertices; i++) {
      fullMovement = Math.max(
        fullMovement,
        point
          .fromBufferAttribute(n, i)
          .distanceTo(previous.fromArray(n0, i * 3)),
      );
      slowMovement = Math.max(
        slowMovement,
        point
          .fromBufferAttribute(r, i)
          .distanceTo(previous.fromArray(r0, i * 3)),
      );
    }
    assert.ok(fullMovement > 0.005);
    assert.ok(
      slowMovement < fullMovement * 0.3 && slowMovement > fullMovement * 0.05,
      "actual reduced-motion vertices must move substantially less per real frame",
    );
    assert.equal(
      stream(normal).geometry.drawRange.count,
      stream(slow).geometry.drawRange.count,
    );
  } finally {
    normal.dispose();
    slow.dispose();
  }
});
