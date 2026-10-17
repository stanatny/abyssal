import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createAetherSurface } from "../src/aether_surface.js";
import { PENGLAI_WORLD } from "../src/penglai_config.js";
import {
  PENGLAI_FLIGHT_RULES,
  stepPenglaiFlightSteering,
} from "../src/penglai_flight.js";
import {
  PLAYER_CHARACTERS,
  characterMovement,
} from "../src/character_rules.js";
import {
  createPlayer,
  tickVitals,
  PLAYER_MOVEMENT,
} from "../src/simulation.js";
const context = ({
  y = 200,
  pitch = Math.PI / 6,
  yaw = 0,
  speed = 12,
  boosting = false,
  slowing = false,
} = {}) => {
  const previousPosition = new T.Vector3(0, y, 0),
    forward = new T.Vector3(0, 0, -1).applyEuler(
      new T.Euler(pitch, yaw, 0, "YXZ"),
    );
  return {
    previousPosition,
    position: previousPosition.clone(),
    forward,
    speed,
    boosting,
    slowing,
    yaw,
  };
};
const advance = (surface, c, dt = 1 / 60) => {
  c.position.copy(c.previousPosition).addScaledVector(c.forward, c.speed * dt);
  return surface.move(dt, c);
};
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test("All characters glide down despite upward steering, while real sprint can climb", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  for (const character of PLAYER_CHARACTERS) {
    for (const pitch of [0, Math.PI / 6, (Math.PI * 85) / 180]) {
      const c = context({ pitch });
      assert.equal(advance(surface, c, 1).flightMode, "glide");
      assert.ok(c.position.y < c.previousPosition.y);
      close(
        c.previousPosition.y - c.position.y,
        PENGLAI_FLIGHT_RULES.glideSink,
      );
      close(c.position.distanceTo(c.previousPosition), c.speed);
      close(Math.asin(c.forward.y), -PENGLAI_FLIGHT_RULES.glideAngle);
    }
    const c = context({
      speed: characterMovement(character.id, true).sprintSpeed,
      boosting: true,
    });
    assert.equal(advance(surface, c, 1).flightMode, "sprint");
    assert.ok(c.position.y > c.previousPosition.y + 15);
  }
});

test("Slow descends faster without turning sprint-release momentum into an abrupt dive", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  for (const speed of [41.6, 32, 20, 12, 5]) {
    const c = context({ speed, slowing: true });
    assert.equal(advance(surface, c, 0.25).flightMode, "sink");
    close(
      (c.previousPosition.y - c.position.y) / 0.25,
      PENGLAI_FLIGHT_RULES.slowSink,
    );
    assert.ok(
      PENGLAI_FLIGHT_RULES.slowSink > PENGLAI_FLIGHT_RULES.glideSink * 3,
    );
  }
  const c = context({ speed: 41.6 });
  advance(surface, c, 0.25);
  close(
    (c.previousPosition.y - c.position.y) / 0.25,
    PENGLAI_FLIGHT_RULES.glideSink,
  );
});

test("Free water motion stays unchanged, unpowered surface crossings cannot ratchet altitude, and sprint takes off", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  const underwater = context({ y: -30 });
  advance(surface, underwater, 1);
  close(underwater.position.y, -24);
  for (const pitch of [Math.PI / 6, (Math.PI * 85) / 180]) {
    const c = context({ y: PENGLAI_WORLD.surfaceY - 0.01, pitch });
    for (let i = 0; i < 100; i++) {
      c.forward.set(0, Math.sin(pitch), -Math.cos(pitch));
      advance(surface, c);
      assert.ok(c.position.y <= PENGLAI_WORLD.surfaceY);
      c.previousPosition.copy(c.position);
    }
    c.boosting = true;
    assert.equal(advance(surface, c).flightMode, "sprint");
    assert.ok(c.position.y > PENGLAI_WORLD.surfaceY);
  }
});

test("Intentional dives retain heading, actual posed direction and water reentry without a ballistic state", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  const c = context({
    y: PENGLAI_WORLD.surfaceY + 0.01,
    pitch: -Math.PI / 3,
    yaw: 0.7,
  });
  const result = advance(surface, c, 0.2);
  assert.ok(c.position.y < PENGLAI_WORLD.surfaceY);
  close(result.posePitch, -Math.PI / 3);
  close(result.poseYaw, 0.7);
  close(c.forward.angleTo(c.position.clone().sub(c.previousPosition)), 0);
  assert.equal(surface.airborne, false);
  assert.equal(surface.charge, 0);
  c.previousPosition.copy(c.position);
  c.forward.set(0, -1, 0);
  assert.equal(advance(surface, c).flightMode, "water");
});

test("No climb leaks from exhaustion, Slow cannot override a legal sprint, and jets without sprint still glide", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD }),
    player = createPlayer();
  player.stamina = 0;
  player.exhausted = true;
  const c = context({ speed: 32 });
  for (let i = 0; i < 50; i++) {
    c.boosting = tickVitals(player, 1 / 60, { boosting: true }).boosting;
    assert.equal(c.boosting, false);
    c.forward.set(0, 0.5, -Math.sqrt(0.75));
    advance(surface, c);
    assert.ok(c.position.y < c.previousPosition.y);
    c.previousPosition.copy(c.position);
  }
  const both = context({ boosting: true, slowing: true, speed: 32 });
  assert.equal(advance(surface, both).flightMode, "sprint");
  assert.ok(both.position.y > both.previousPosition.y);
  const jet = context({ speed: 72 });
  advance(surface, jet, 1);
  close(jet.position.y, 200 - PENGLAI_FLIGHT_RULES.glideSink);
});

test("Every character gains net altitude over two real stamina-budgeted sprint/glide cycles", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  for (const character of PLAYER_CHARACTERS) {
    for (const length of [15, 30]) {
      const p = createPlayer(character.id, 15);
      p.length = length;
      let y = 100,
        speed = PLAYER_MOVEMENT.cruiseSpeed,
        orientation = { yaw: 0, pitch: Math.PI / 6 },
        previousMotion;
      for (let cycle = 0; cycle < 2; cycle++) {
        const startY = y;
        for (const sprint of [true, false]) {
          let frames = 0;
          do {
            const boosting = tickVitals(p, 1 / 60, {
                boosting: sprint,
              }).boosting,
              target = boosting
                ? characterMovement(character.id, true).sprintSpeed
                : 12;
            speed = T.MathUtils.damp(speed, target, 3, 1 / 60);
            orientation = stepPenglaiFlightSteering(
              orientation,
              { x: 0, y: sprint && orientation.pitch < Math.PI / 6 ? 1 : 0 },
              characterMovement(character.id, boosting),
              1 / 60,
              { inAir: true, boosting, previousMotion },
            );
            const c = context({ y, speed, boosting, pitch: orientation.pitch });
            previousMotion = advance(surface, c);
            y = c.position.y;
            assert.ok(++frames < 1000);
          } while (sprint ? p.stamina > 20 : p.stamina < 100);
        }
        assert.ok(y > startY + 65, `${character.id} ${length}m net ascent`);
        assert.equal(p.stamina, 100);
        assert.equal(p.exhausted, false);
        assert.equal(p.dead, false);
      }
    }
  }
});

test("Zero/invalid elapsed time and reset add no hidden air momentum or lifetime", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  for (const dt of [0, -1, NaN, Infinity]) {
    const c = context();
    const original = c.position.clone();
    surface.move(dt, c);
    assert.deepEqual(c.position, original);
  }
  const a = context(),
    b = context();
  advance(surface, a);
  surface.reset();
  advance(surface, b);
  assert.deepEqual(a.position, b.position);
  assert.equal(surface.move().airborne, false);
});

test("Sprint after glide/Slow preserves the visible direction and never resurrects hidden upward pitch", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  for (const character of PLAYER_CHARACTERS)
    for (const previousPitch of [-Math.PI / 36, (-Math.PI * 2) / 9]) {
      let orientation = { yaw: 0.4, pitch: 1.2 },
        previousMotion = { flightMode: "glide", posePitch: previousPitch };
      for (let i = 0; i < 120; i++) {
        orientation = stepPenglaiFlightSteering(
          orientation,
          { x: 0, y: 0 },
          characterMovement(character.id, true),
          1 / 60,
          { inAir: true, boosting: true, previousMotion },
        );
        close(orientation.pitch, previousPitch);
        const c = context({
          boosting: true,
          speed: characterMovement(character.id, true).sprintSpeed,
          pitch: orientation.pitch,
          yaw: orientation.yaw,
        });
        previousMotion = advance(surface, c);
        assert.ok(c.position.y <= c.previousPosition.y);
      }
    }
});

test("Upward input alone changes resumed sprint pitch, while lateral/down inputs keep their own axes", () => {
  const before = { yaw: 0.3, pitch: 1 },
    previousMotion = { flightMode: "sink", posePitch: -0.3 },
    movement = characterMovement("orca", true),
    options = { inAir: true, boosting: true, previousMotion };
  const up = stepPenglaiFlightSteering(
      before,
      { x: 0, y: 1 },
      movement,
      0.05,
      options,
    ),
    right = stepPenglaiFlightSteering(
      before,
      { x: 1, y: 0 },
      movement,
      0.05,
      options,
    ),
    down = stepPenglaiFlightSteering(
      before,
      { x: 0, y: -1 },
      movement,
      0.05,
      options,
    );
  close(up.pitch, previousMotion.posePitch + movement.pitchRate * 0.05);
  close(up.yaw, before.yaw);
  close(right.pitch, previousMotion.posePitch);
  close(right.yaw, before.yaw - movement.yawRate * 0.05);
  assert.ok(down.pitch < previousMotion.posePitch);
  assert.equal(before.pitch, 1);
});

test("Underwater, continuing sprint, absent prior flight and pause keep normal heading ownership", () => {
  const before = { yaw: 0.3, pitch: 0.6 },
    input = { x: 0, y: 0 },
    movement = characterMovement("orca", true);
  for (const [dt, options] of [
    [
      1 / 60,
      {
        inAir: false,
        boosting: true,
        previousMotion: { flightMode: "glide", posePitch: -0.2 },
      },
    ],
    [
      1 / 60,
      {
        inAir: true,
        boosting: true,
        previousMotion: { flightMode: "sprint", posePitch: -0.2 },
      },
    ],
    [1 / 60, { inAir: true, boosting: true }],
    [
      0,
      {
        inAir: true,
        boosting: true,
        previousMotion: { flightMode: "glide", posePitch: -0.2 },
      },
    ],
  ]) {
    const result = stepPenglaiFlightSteering(
      before,
      input,
      movement,
      dt,
      options,
    );
    close(result.pitch, before.pitch);
    close(result.yaw, before.yaw);
  }
});
