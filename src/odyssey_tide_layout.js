import * as THREE from "three";
import { POLYPHEMUS_SITE } from "./odyssey_polyphemus_site.js";
import { odysseySeabedHeight } from "./odyssey_config.js";

/** 规则、实体、补给共用地点；不引用运行时或物种，从而避免生态装配环。 */
export const TIDE_GATE_SITES = Object.freeze(
  [
    ["pillar_gate", "polyphemus", -455, -1035, 100],
    ["reef_gate", "karkinos", 275, -720, 40],
    ["echo_gate", "scylla", -220, -1610, 120],
    ["vortex_gate", "charybdis", 326, -1890, 100],
  ].map(([id, guardian, x, z, clearance]) =>
    Object.freeze({
      id,
      guardian,
      center: Object.freeze([x, odysseySeabedHeight(x, z) + clearance, z]),
      normal: Object.freeze([0, 0, -1]),
      width: 60,
      height: 55,
      throat: 8,
      boardOffset: Object.freeze([
        { pillar_gate: -110, echo_gate: 200, vortex_gate: -65 }[id] ?? 0,
        0,
      ]),
    }),
  ),
);

export const TIDE_PORTS = Object.freeze([
  Object.freeze([0, 1, 0]),
  Object.freeze([1, 0, 0]),
  Object.freeze([0, -1, 0]),
  Object.freeze([-1, 0, 0]),
]);
export const TIDE_CONTROL_RADIUS = 3.5;
export const TIDE_REARM_RADIUS = 6;
export const TIDE_BOARD_DISTANCE = 64;
export const TIDE_PORT_DISTANCE = 18;

/** 从入口看去始终是左上、右上、左下、右下；图解与世界中的右方向相同。 */
export function createTideLayout(definition, heightAt = () => -1000) {
  const fittedFloor = (x, z) => {
    const site = POLYPHEMUS_SITE;
    const dais =
      definition.guardian === "polyphemus" &&
      Math.abs(x - site.x) <= site.width / 2 &&
      Math.abs(z - site.z) <= site.depth / 2;
    return Math.max(heightAt(x, z), dais ? site.top : -Infinity);
  };
  const center = new THREE.Vector3(...definition.center);
  const flow = new THREE.Vector3(...definition.normal).normalize();
  if (Math.abs(flow.y) > 0.001 || flow.lengthSq() < 0.99)
    throw new Error("Tide puzzle requires a horizontal gate direction");
  const front = flow.clone().negate();
  const right = new THREE.Vector3(front.z, 0, -front.x).normalize();
  const rotation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, new THREE.Vector3(0, 1, 0), front),
  );
  const origin = center.clone().addScaledVector(flow, -TIDE_BOARD_DISTANCE);
  const offset = definition.boardOffset ?? [0, 0];
  origin.addScaledVector(right, offset[0]).addScaledVector(front, offset[1]);
  // 只在必要时抬高整套石盘，不把下排控制埋入斜坡，也不分别移动答案格。
  let highest = -Infinity;
  for (const x of [-40, -24, 0, 24, 40])
    for (const z of [-8, 0, 8]) {
      const p = origin
        .clone()
        .addScaledVector(right, x)
        .addScaledVector(front, z);
      highest = Math.max(highest, fittedFloor(p.x, p.z));
    }
  origin.y = Math.max(origin.y, highest + 38);
  const locals = [
    [-24, 18, 0],
    [24, 18, 0],
    [-24, -18, 0],
    [24, -18, 0],
  ];
  const world = (local) =>
    new THREE.Vector3(...local).applyQuaternion(rotation).add(origin).toArray();
  const rotors = locals.map((local, index) =>
    Object.freeze({
      id: `${definition.id}_rotor_${index}`,
      index,
      local: Object.freeze(local),
      position: Object.freeze(world(local)),
      radius: TIDE_CONTROL_RADIUS,
    }),
  );
  const master = center.clone().addScaledVector(flow, -116);
  master.addScaledVector(right, offset[0]).addScaledVector(front, offset[1]);
  // 朝石钮游来的成年身体仍在钮前约 30 m；上坡不能只检查鼻尖脚下的一点。
  let approachFloor = -Infinity;
  for (const dx of [-6, 0, 6])
    for (let distance = 0; distance <= 44; distance += 4) {
      const p = master
        .clone()
        .addScaledVector(right, dx)
        .addScaledVector(front, distance);
      approachFloor = Math.max(approachFloor, fittedFloor(p.x, p.z));
    }
  master.y = Math.max(
    origin.y,
    fittedFloor(master.x, master.z) + 22,
    approachFloor + 7,
  );
  return Object.freeze({
    id: definition.id,
    origin: Object.freeze(origin.toArray()),
    front: Object.freeze(front.toArray()),
    right: Object.freeze(right.toArray()),
    rotation: Object.freeze(rotation.toArray()),
    rotors: Object.freeze(rotors),
    master: Object.freeze({
      id: `${definition.id}_test`,
      position: Object.freeze(master.toArray()),
      radius: TIDE_CONTROL_RADIUS,
    }),
    portPosition(tile, port, extra = 0) {
      if (!rotors[tile] || !TIDE_PORTS[port]) return null;
      const local = new THREE.Vector3(...locals[tile]).addScaledVector(
        new THREE.Vector3(...TIDE_PORTS[port]),
        TIDE_PORT_DISTANCE + extra,
      );
      return world(local.toArray());
    },
  });
}

/** 操作区前方追加普通成年食物，旧居民原样保留；不引用运行时和物种目录。 */
export const TIDE_MEAL_HABITATS = Object.freeze(
  TIDE_GATE_SITES.flatMap((definition) => {
    const layout = createTideLayout(definition, odysseySeabedHeight);
    const origin = new THREE.Vector3(...layout.origin),
      right = new THREE.Vector3(...layout.right),
      front = new THREE.Vector3(...layout.front);
    return [
      ["bronze_turtle", -45, 34, 38],
      ["oracle_whale", 45, 38, 38],
      ["thalassa_manta", 0, 55, 65],
    ].map(([kind, dx, dy, dz]) => {
      const p = origin
        .clone()
        .addScaledVector(right, dx)
        .addScaledVector(front, dz);
      p.y += dy;
      let floor = -Infinity;
      for (const side of [-12, 0, 12])
        for (const ahead of [-12, 0, 12]) {
          const point = p
            .clone()
            .addScaledVector(right, side)
            .addScaledVector(front, ahead);
          floor = Math.max(floor, odysseySeabedHeight(point.x, point.z));
        }
      p.y = Math.max(p.y, floor + 22);
      return Object.freeze({
        gate: definition.id,
        kind,
        anchor: Object.freeze(p.toArray()),
      });
    });
  }),
);
