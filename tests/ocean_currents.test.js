import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  OCEAN_CURRENT_RULES as R,
  oceanCurrentPhase,
  oceanCurrentRoutes,
  createOceanCurrentState,
  nearestCurrentPoint,
} from "../src/ocean_current_rules.js";
import { attachOceanCurrents } from "../src/ocean_currents.js";
import { resolveMotion, bodyRadius } from "../src/collision.js";
import { stepSurface, createSurfaceState } from "../src/surface_rules.js";
const sample = () => ({ point: new T.Vector3(), direction: new T.Vector3() });
const forward = new T.Vector3(0, 0, -1);
function active() {
  const routes = oceanCurrentRoutes("hawaii"),
    c = createOceanCurrentState(routes);
  c.state.time = 18;
  return { c, routes, position: routes[0].points[12].clone() };
}

test("Temporary currents are scoped to the four ocean maps and stay horizontal inside their bounds", () => {
  for (const region of ["hawaii", "atlantis", "bermuda", "odyssey"]) {
    const routes = oceanCurrentRoutes(region);
    assert.equal(routes.length, 2);
    assert.ok(routes[0].length > (region === "odyssey" ? 1400 : 920));
    assert.ok(routes[0].points[0].z > routes[0].points.at(-1).z);
    assert.ok(routes[1].points[0].z < routes[1].points.at(-1).z);
    for (const r of routes)
      for (const p of r.points) {
        assert.equal(p.y, -24);
        assert.ok(p.x > -280 && p.x < 280);
        assert.ok(p.z >= (region === "odyssey" ? -1700 : -1130) && p.z < 120);
      }
  }
  for (const region of ["mariana", "amazon", "europa", "penglai"])
    assert.deepEqual(oceanCurrentRoutes(region), []);
});
test("Current schedule has warning, usable interval, expiry and a quiet gap", () => {
  for (const [t, phase, force] of [
    [0, "quiet", 0],
    [12, "forming", 0],
    [17.9, "forming", 0],
    [18, "active", 1],
    [89.9, "active", 1],
    [93, "fading", 0.5],
    [96, "quiet", 0],
    [191.9, "quiet", 0],
    [192, "forming", 0],
    [198, "active", 1],
  ]) {
    const p = oceanCurrentPhase(t);
    assert.equal(p.phase, phase);
    assert.equal(p.force, force);
  }
});
test("Water pushes downstream for every heading, including reverse and slow swimming", () => {
  for (const region of R.regions)
    for (const route of oceanCurrentRoutes(region)) {
      const position = route.points[45].clone(),
        dir = route.points[46].clone().sub(position).normalize();
      for (const reverse of [false, true]) {
        const c = createOceanCurrentState([route]);
        c.state.time = 18;
        const f = dir.clone().multiplyScalar(reverse ? -1 : 1);
        for (let i = 0; i < 120; i++)
          c.step(1 / 60, { position, forward: f, slowing: true });
        assert.ok(c.state.speed > 71);
        assert.equal(c.state.against, reverse);
        const net = f.clone().multiplyScalar(12).add(c.state.velocity);
        assert.ok(net.dot(dir) > (reverse ? 59 : 83));
        assert.equal(net.y, 0);
        assert.ok(f.equals(dir.clone().multiplyScalar(reverse ? -1 : 1)));
        c.step(1, { position, forward: f, enabled: false });
        assert.equal(c.state.speed, 0);
      }
    }
});
test("A moving player can leave through the side or dive out without a forced yaw or depth", () => {
  for (const mode of ["side", "dive"]) {
    const { c, position } = active();
    for (let i = 0; i < 100; i++) c.step(0.02, { position, forward });
    const f =
      mode === "side" ? new T.Vector3(1, 0, 0) : new T.Vector3(0, -1, 0);
    const y = position.y;
    for (let i = 0; i < 200; i++) {
      const s = c.step(0.02, { position, forward: f });
      position.addScaledVector(f, 12 * 0.02).addScaledVector(s.velocity, 0.02);
    }
    assert.equal(c.state.route, null);
    assert.equal(c.state.speed, 0);
    if (mode === "side") assert.equal(position.y, y);
    else assert.ok(position.y < y - 40);
  }
});
test("A sustained lane trip gives substantial horizontal travel without yaw or depth control", () => {
  for (const region of R.regions)
    for (const route of oceanCurrentRoutes(region)) {
      const c = createOceanCurrentState([route]);
      c.state.time = 18;
      const p = route.points[0].clone();
      const heading = route.points[1].clone().sub(p).normalize();
      const s = sample();
      let duration = 0,
        max = 0;
      while (duration < 35) {
        // 固定初始朝向，水流的切线应能自然带过缓弯，不需逐帧吸附。
        const v = c.step(1 / 60, { position: p, forward: heading });
        p.addScaledVector(heading, 12 / 60).addScaledVector(v.velocity, 1 / 60);
        duration += 1 / 60;
        max = Math.max(max, v.speed);
        nearestCurrentPoint(route, p, s);
        if (s.progress >= route.length - 3) break;
      }
      assert.ok(duration < 30, `${region}/${route.id}: ${duration}`);
      assert.ok(max > 70);
      assert.equal(p.y, -24);
      assert.ok(s.distance < 14);
    }
});
test("The existing surface/collision integrator keeps horizontal flow but cannot tunnel a thin wall", () => {
  const { c, position } = active();
  for (let i = 0; i < 120; i++) c.step(1 / 60, { position, forward });
  const desired = position
    .clone()
    .addScaledVector(forward, 12 * 0.04)
    .addScaledVector(c.state.velocity, 0.04);
  const water = stepSurface(createSurfaceState(), 0.04, {
    previousPosition: position,
    position: desired,
    forward,
    speed: 12,
    length: 30,
    surfaceY: 4,
  });
  assert.equal(water.position.y, -24);
  assert.ok(position.distanceTo(desired) > 3);
  const collision = resolveMotion(position, desired, {
    radius: bodyRadius(30),
    length: 30,
    forward,
    colliders: [
      {
        type: "box",
        x: position.x,
        y: -24,
        z: position.z - 12,
        halfSize: { x: 50, y: 50, z: 0.2 },
      },
    ],
  });
  assert.equal(collision.blocked, true);
  assert.ok(collision.position.z > position.z - 15);
  c.blocked();
  assert.equal(c.state.speed, 0);
  assert.equal(c.state.route, null);
  assert.equal(c.state.cooldown, 2);
});
test("Scene ownership resets and disposes only its resources once; quiet states allocate nothing each frame", () => {
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0, 0.01);
  const root = new T.Group();
  scene.add(root);
  let resets = 0,
    disposals = 0,
    updates = 0;
  const ocean = {
    root,
    update() {
      updates++;
    },
    reset() {
      resets++;
    },
    dispose() {
      disposals++;
    },
  };
  attachOceanCurrents(ocean, "hawaii");
  const group = root.children[0];
  assert.equal(group.children.length, 4);
  let n = 0;
  for (const mesh of group.children) {
    mesh.geometry.addEventListener("dispose", () => n++);
    mesh.material.addEventListener("dispose", () => n++);
  }
  const ids = group.children.map((m) => m.geometry.uuid);
  ocean.currents.state.time = 30;
  ocean.currents.state.opacity = 1;
  ocean.update(30, new T.Vector3(), 0.016, true, null, false);
  assert.ok(group.visible);
  ocean.currents.reset();
  assert.equal(group.visible, false);
  assert.equal(ocean.currents.state.time, 0);
  ocean.reset();
  assert.equal(resets, 1);
  ocean.update(0, new T.Vector3(), 0);
  assert.deepEqual(
    group.children.map((m) => m.geometry.uuid),
    ids,
  );
  assert.equal(updates, 2);
  ocean.dispose();
  ocean.dispose();
  assert.equal(disposals, 1);
  assert.equal(n, 8);
  assert.equal(root.children.length, 0);
});

test("Changing from downstream to upstream does not turn off the environmental flow", () => {
  const { c, position } = active();
  for (let i = 0; i < 100; i++) c.step(0.02, { position, forward });
  const back = forward.clone().negate();
  for (let i = 0; i < 100; i++) c.step(0.02, { position, forward: back });
  assert.equal(c.state.against, true);
  assert.ok(c.state.speed > 71);
  assert.ok(c.state.velocity.z < -70);
  c.reset();
  assert.equal(c.state.against, false);
  assert.equal(c.state.speed, 0);
});
test("Visible microbubble heads travel downstream in both lanes even without the HF texture", () => {
  const ocean = { root: new T.Group(), update() {}, dispose() {} };
  attachOceanCurrents(ocean, "hawaii");
  const g = ocean.root.children[0];
  ocean.currents.state.opacity = 1;
  ocean.currents.state.time = 20;
  ocean.update(20, new T.Vector3(), 0.016);
  const before = [g.children[1], g.children[3]].map((m) =>
    new T.Vector3().fromBufferAttribute(m.geometry.attributes.center, 40),
  );
  ocean.currents.state.time = 20.1;
  ocean.update(20.1, new T.Vector3(), 0.1);
  for (const [j, index] of [1, 3].entries()) {
    const m = g.children[index],
      after = new T.Vector3().fromBufferAttribute(
        m.geometry.attributes.center,
        40,
      ),
      axis = new T.Vector3().fromBufferAttribute(
        m.geometry.attributes.axis,
        40,
      );
    assert.ok(after.sub(before[j]).dot(axis) > 7);
    assert.equal(g.children[index - 1].material.uniforms.ready.value, 0);
  }
  ocean.dispose();
  assert.equal(ocean.currents.prepare.state, "disposed");
});
