import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import armor from "./assets/models/mechanical_shark_armor.json" with { type: "json" };
const SKY_BLUE = new THREE.MeshStandardMaterial({
  color: 0x78c9ec,
  metalness: 0.72,
  roughness: 0.32,
});
const GRAPHITE = new THREE.MeshStandardMaterial({
  color: 0x162832,
  metalness: 0.65,
  roughness: 0.44,
});
const FASTENER = new THREE.MeshStandardMaterial({
  color: 0x8196a0,
  metalness: 0.8,
  roughness: 0.34,
});
let hardware;
const part = (g, p = [0, 0, 0], r = [0, 0, 0]) =>
  g
    .rotateX(r[0])
    .rotateY(r[1])
    .rotateZ(r[2])
    .translate(...p);
const combine = (parts) => {
  const expanded = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const g = mergeGeometries(expanded);
  new Set([...parts, ...expanded]).forEach((p) => p.dispose());
  return g;
};
function geometry() {
  if (hardware) return hardware;
  const plates = [],
    dark = [],
    bolts = [];
  for (const panel of armor.panels) {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(panel.position, 3),
    );
    g.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        new Float32Array((panel.position.length / 3) * 2),
        2,
      ),
    );
    const smooth = mergeVertices(g, 0.000001);
    smooth.computeVertexNormals();
    plates.push(smooth);
    g.dispose();
    for (const f of panel.fasteners) {
      const g = new THREE.CylinderGeometry(0.003, 0.003, 0.002, 6);
      g.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(...f.normal),
        ),
      );
      g.translate(...f.point);
      bolts.push(g);
    }
  }
  for (const side of [-1, 1]) {
    const x = side * 0.094,
      y = 0.001;
    const profile = [
      [-0.052, 0.037],
      [-0.04, 0.048],
      [0.015, 0.052],
      [0.06, 0.045],
      [0.105, 0.029],
      [0.115, 0.022],
    ].map(([z, r]) => new THREE.Vector2(r, z));
    for (let i = 0; i < 6; i++)
      plates.push(
        part(
          new THREE.LatheGeometry(
            profile,
            8,
            (i * Math.PI) / 3 + 0.025,
            Math.PI / 3 - 0.05,
          ),
          [x, y, 0],
          [Math.PI / 2, 0, 0],
        ),
      );
    for (const [z, rad] of [
      [-0.053, 0.037],
      [0.115, 0.022],
    ])
      plates.push(part(new THREE.TorusGeometry(rad, 0.002, 6, 32), [x, y, z]));
    dark.push(
      part(
        new THREE.CircleGeometry(0.034, 32),
        [x, y, -0.054],
        [0, Math.PI, 0],
      ),
    );
    // Actual vent louvers, with deep dark slots between them.
    for (let i = 0; i < 3; i++) {
      const z = -0.271 + i * 0.017;
      plates.push(
        part(
          new THREE.BoxGeometry(0.006, 0.06, 0.005),
          [side * 0.089, -0.001, z],
          [0, 0, -side * 0.15],
        ),
      );
    }
  }
  const rotor = [];
  rotor.push(part(new THREE.SphereGeometry(0.009, 12, 8), [0, 0, 0]));
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5,
      vertices = [
        [0.008, a, -0.002],
        [0.03, a + 0.22, 0],
        [0.027, a + 0.52, 0.004],
        [0.01, a + 0.32, 0.003],
      ].map(
        ([r, t, z]) => new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, z),
      );
    const positions = [],
      emit = (a, b, c) =>
        positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    const front = vertices.map((v) =>
        v.clone().add(new THREE.Vector3(0, 0, -0.0007)),
      ),
      back = vertices.map((v) =>
        v.clone().add(new THREE.Vector3(0, 0, 0.0007)),
      );
    emit(front[0], front[2], front[1]);
    emit(front[0], front[3], front[2]);
    emit(back[0], back[1], back[2]);
    emit(back[0], back[2], back[3]);
    for (let j = 0; j < 4; j++) {
      const k = (j + 1) % 4;
      emit(front[j], front[k], back[j]);
      emit(front[k], back[k], back[j]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    g.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        new Float32Array((positions.length / 3) * 2),
        2,
      ),
    );
    rotor.push(g);
  }
  const collars = [
    { rx: 0.0276154, ry: 0.0456851, y: -0.047026 },
    { rx: 0.0169758, ry: 0.0213847, y: -0.0528016 },
    { rx: 0.025548, ry: 0.0485294, y: -0.0473625 },
  ].map(({ rx, y }) => {
    const parts = [];
    for (const side of [-1, 1]) {
      parts.push(
        part(
          new THREE.CylinderGeometry(0.01, 0.012, 0.005, 12),
          [side * (rx - 0.002), y, 0],
          [0, 0, Math.PI / 2],
        ),
      );
      parts.push(
        part(
          new THREE.CylinderGeometry(0.005, 0.005, 0.006, 6),
          [side * (rx - 0.003), y, 0],
          [0, 0, Math.PI / 2],
        ),
      );
    }
    return combine(parts);
  });
  const hub = new THREE.CylinderGeometry(0.016, 0.018, 0.012, 12).rotateZ(
    Math.PI / 2,
  );
  hardware = {
    plates: combine(plates),
    dark: combine(dark),
    bolts: combine(bolts),
    rotor: combine(rotor),
    collars,
    hub,
  };
  return hardware;
}
/** Fit shared physical armor to the existing rigid front and moving joint frames. */
export function addMechanicalHardware(root, bones, motions) {
  const h = geometry(),
    core = bones[0];
  for (const [name, g, mat] of [
    ["bevelled_armor", h.plates, SKY_BLUE],
    ["recessed_intakes", h.dark, GRAPHITE],
    ["armor_fasteners", h.bolts, FASTENER],
  ]) {
    const m = new THREE.Mesh(g, mat);
    m.name = name;
    m.position.z = -core.position.z;
    m.userData.keepSeparate = true;
    core.add(m);
  }
  const rotors = [-1, 1].map((side) => {
    const m = new THREE.Mesh(h.rotor, SKY_BLUE);
    m.name = "intake_turbine";
    m.position.set(side * 0.094, 0.001, -0.061 - core.position.z);
    m.userData.keepSeparate = true;
    core.add(m);
    return m;
  });
  h.collars.forEach((g, i) => {
    const m = new THREE.Mesh(g, FASTENER);
    m.name = "tail_servo_joint";
    m.userData.keepSeparate = true;
    bones[i + 1].add(m);
  });
  for (const [i, side] of [
    [5, -1],
    [6, 1],
  ]) {
    const m = new THREE.Mesh(h.hub, FASTENER);
    m.name = "pectoral_servo_hub";
    m.position.x = side * 0.017;
    m.userData.keepSeparate = true;
    bones[i].add(m);
  }
  motions.push((phase) => {
    for (const r of rotors) r.rotation.z = phase * 2.5;
  });
  root.userData.mechanicalHardware = {
    panels: armor.panels.length,
    turbines: 2,
    tailServos: 3,
    finHubs: 2,
  };
}
