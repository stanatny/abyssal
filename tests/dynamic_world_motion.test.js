import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAst } from "rolldown/parseAst";
import * as THREE from "three";
import { bodyOffsets, bodyRadius, resolveMotion } from "../src/collision.js";
import {
  createStaticColliderGrid,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import { WORLD } from "../src/world_config.js";

const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const declarations = parseAst(source).body;
function actualCallback(name, environment) {
  const declaration = declarations.find(
    (node) => node.type === "FunctionDeclaration" && node.id.name === name,
  );
  assert.ok(declaration, "The actual world movement callback must exist");
  return new Function(
    ...Object.keys(environment),
    "return (" + source.slice(declaration.start, declaration.end) + ");",
  )(...Object.values(environment));
}
function signature(result) {
  return {
    position: { ...result.position },
    ids: result.contacts.map((contact) => contact.collider.id),
    blocked: result.blocked,
    recovered: result.recovered,
    stuck: result.stuck,
  };
}

// 起点粗筛看不到第二块实体；第一块脱困后必须重新查询，不能复用初始数组。
for (const name of ["resolvePlayerMotion", "resolveMinionMotion"])
  test(
    "actual " + name + " requeries dynamic bodies after overlap recovery",
    () => {
      const length = 3,
        radius = bodyRadius(length),
        previous = new THREE.Vector3(0, -30, -20),
        position = previous.clone(),
        forward = new THREE.Vector3(0, 0, -1),
        colliders = [
          {
            id: "first_overlap",
            type: "box",
            x: 1.6,
            y: -30,
            z: -20,
            halfSize: { x: 9, y: 9, z: 9 },
          },
          {
            id: "new_recovery_neighbor",
            type: "box",
            x: -8.2,
            y: -30,
            z: -20,
            halfSize: { x: 0.2, y: 0.2, z: 0.2 },
          },
        ],
        grid = createStaticColliderGrid(colliders, { cellSize: 2 }),
        calls = [],
        ocean = {
          colliders: [],
          barriers: [],
          dynamicContacts(start, end, dimensions) {
            calls.push({ start: { ...start }, end: { ...end }, dimensions });
            return grid.query(start, end, dimensions);
          },
        },
        floorHeight = () => -200,
        options = {
          radius,
          length,
          forward,
          floorHeight,
          bounds: {
            minX: WORLD.minX + 5,
            maxX: WORLD.maxX - 5,
            minZ: WORLD.minZ + 5,
            maxZ: WORLD.maxZ - 5,
            minY: -WORLD.maxDepth + radius,
            maxY: WORLD.surfaceY - length * 0.15,
          },
        },
        initial = grid.query(previous, previous, {
          radius,
          padding: length * 0.52,
        });
      assert.deepEqual(initial, [colliders[0]]);
      const stale = resolveMotion(previous, previous, {
          ...options,
          colliders: initial,
        }),
        full = resolveMotion(previous, previous, { ...options, colliders });
      assert.notDeepEqual(signature(stale), signature(full));
      assert.ok(full.contacts.some((c) => c.collider === colliders[1]));
      const callback = actualCallback(name, {
        bodyRadius,
        resolveIndexedMotion,
        ocean,
        player: { length },
        position,
        forward,
        surface: { colliders: [], applyCollision() {} },
        humans: { colliders: [] },
        encounters: { bodyColliders: () => [] },
        nearbyOrdinaryBodies: () => [],
        entities: [],
        activeWorld: () => WORLD,
        activeContactSurface: () => floorHeight,
        playerFloorHeight: floorHeight,
        bodyTerrainFloor,
        WORLD_EDGE_INSET: 5,
        WORLD,
        mode: "playing",
        lastCollision: null,
      });
      const result =
        name === "resolvePlayerMotion"
          ? callback(previous)
          : callback(previous, position, forward, length);
      assert.deepEqual(signature(result), signature(full));
      assert.ok(calls.some((call) => call.start.x < -7));
      const extent = Math.max(
        ...bodyOffsets(options).map((p) => Math.hypot(p.x, p.y, p.z)),
      );
      assert.ok(calls.every((call) => call.dimensions.padding === extent));
    },
  );

test("indexed motion refreshes dynamic neighbors reached by a sloping-wall slide", () => {
  const start = { x: -3, y: 0, z: 0 },
    end = { x: 3, y: 0, z: 0 },
    radius = 0.1,
    rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 4,
    ),
    colliders = [
      {
        id: "slope",
        type: "box",
        x: 0,
        y: 0,
        z: 0,
        halfSize: { x: 0.1, y: 3, z: 4 },
        rotation,
      },
      {
        id: "side",
        type: "box",
        x: 1,
        y: 0,
        z: 1.35,
        halfSize: { x: 0.3, y: 0.3, z: 0.3 },
      },
    ],
    grid = createStaticColliderGrid(colliders, { cellSize: 0.5 }),
    query = (a, b, dimensions) => grid.query(a, b, dimensions),
    initial = query(start, end, { radius }),
    full = resolveMotion(start, end, { radius, colliders });
  assert.deepEqual(initial, [colliders[0]]);
  assert.notDeepEqual(
    signature(
      resolveIndexedMotion(start, end, { radius, dynamicColliders: initial }),
    ),
    signature(full),
  );
  assert.deepEqual(
    signature(
      resolveIndexedMotion(start, end, { radius, dynamicColliders: query }),
    ),
    signature(full),
  );
});
