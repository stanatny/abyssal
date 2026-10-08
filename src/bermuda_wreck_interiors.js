import * as THREE from "three";

/** 舱内所有大件保留自己的实体足迹；雕刻和五金附着于该实体而不另占主航道。 */
export function addBermudaWreckInteriors(builder, materials, origin) {
  const b = builder,
    m = materials,
    rooms = [],
    fixtures = [];
  let currentRoom;

  function room(id, type, bounds, eye, target, build) {
    currentRoom = id;
    const start = fixtures.length;
    build();
    rooms.push({
      id,
      type,
      bounds,
      eye,
      target,
      fixtureCount: fixtures.length - start,
    });
  }
  function remember(kind, collider) {
    collider.roomId = currentRoom;
    collider.fixtureKind = kind;
    fixtures.push({ id: collider.id, roomId: currentRoom, kind, collider });
  }
  function box(kind, material, center, size, rotation = 0) {
    b.box(material, center, size, true, rotation);
    remember(kind, b.colliders.at(-1));
  }
  function reserve(kind, center, size, quaternion = new THREE.Quaternion()) {
    const collider = {
      type: "box",
      id: `bermuda_interior_${fixtures.length}`,
      x: center[0] + origin.x,
      y: center[1] + origin.y,
      z: center[2] + origin.z,
      halfSize: new THREE.Vector3(...size).multiplyScalar(0.5),
      rotation: {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w,
      },
    };
    b.colliders.push(collider);
    remember(kind, collider);
  }
  function pipe(kind, material, from, to, radius) {
    b.beam(material, from, to, radius, 10);
    const a = new THREE.Vector3(...from),
      z = new THREE.Vector3(...to),
      direction = z.clone().sub(a),
      quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      );
    reserve(
      kind,
      a.add(z).multiplyScalar(0.5).toArray(),
      [radius * 2, direction.length(), radius * 2],
      quaternion,
    );
  }
  function roundBox(width, height, depth, radius = 0.2) {
    const r = Math.min(radius, width / 3, height / 3),
      x = -width / 2,
      y = -height / 2,
      shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 3,
    });
    geometry.translate(0, 0, -depth / 2);
    // 既有合批输入都是索引几何；保留挤出面的独立法线并补顺序索引。
    geometry.setIndex(
      Array.from({ length: geometry.attributes.position.count }, (_, i) => i),
    );
    return geometry;
  }
  function ring(
    material,
    center,
    radius,
    tube = 0.1,
    angles = [Math.PI / 2, 0, 0],
  ) {
    b.add(
      new THREE.TorusGeometry(radius, tube, 5, 16),
      material,
      center,
      angles,
    );
  }
  function cabinet(x, floor, z, width, height, depth, kind = "cabinet") {
    box(kind, m.wood, [x, floor + height / 2, z], [width, height, depth]);
    const frontX = x - Math.sign(x) * (width / 2 + 0.035);
    for (const y of [height * 0.25, height * 0.62]) {
      b.box(
        m.dark,
        [frontX, floor + y, z],
        [0.07, height * 0.24, depth * 0.82],
      );
      for (const edge of [-1, 1])
        b.box(
          m.brass,
          [frontX - Math.sign(x) * 0.04, floor + y, z + edge * depth * 0.43],
          [0.1, height * 0.29, 0.12],
        );
      b.box(
        m.brass,
        [frontX - Math.sign(x) * 0.07, floor + y, z],
        [0.13, 0.16, 0.55],
      );
    }
    b.box(
      m.brass,
      [x, floor + height + 0.03, z],
      [width + 0.06, 0.12, depth + 0.06],
    );
  }
  function chair(x, floor, z, facing) {
    const seatY = floor + 1.5;
    for (const dx of [-0.9, 0.9])
      for (const dz of [-0.8, 0.8])
        box(
          "chair_leg",
          m.wood,
          [x + dx, floor + 0.7, z + dz],
          [0.28, 1.4, 0.28],
        );
    b.add(roundBox(2.35, 0.5, 2.25), m.red, [x, seatY, z]);
    reserve("chair_seat", [x, seatY, z], [2.35, 0.5, 2.25]);
    box(
      "chair_back",
      m.wood,
      [x, floor + 2.35, z - facing * 1.0],
      [2.45, 2.1, 0.3],
    );
    b.add(roundBox(1.85, 1.45, 0.11, 0.35), m.red, [
      x,
      floor + 2.55,
      z - facing * 0.81,
    ]);
    for (const dx of [-1.15, 1.15])
      b.beam(
        m.brass,
        [x + dx, seatY, z - facing],
        [x + dx, floor + 3.5, z - facing],
        0.1,
      );
  }
  function diningTable(x, floor, z) {
    const top = new THREE.CylinderGeometry(1, 1, 0.45, 20);
    top.scale(2.6, 1, 3.8);
    b.add(top, m.wood, [x, floor + 3.25, z]);
    reserve("oval_dining_table", [x, floor + 3.25, z], [5.2, 0.45, 7.6]);
    box("table_pedestal", m.wood, [x, floor + 1.5, z], [1.3, 3, 3.0]);
    box("table_foot", m.brass, [x, floor + 0.17, z], [3.2, 0.34, 4.5]);
    for (const dz of [-2.5, 0, 2.5]) {
      b.add(new THREE.CylinderGeometry(0.58, 0.65, 0.11, 12), m.pale, [
        x,
        floor + 3.53,
        z + dz,
      ]);
      ring(m.brass, [x, floor + 3.6, z + dz], 0.42, 0.055);
    }
    for (const direction of [-1, 1])
      chair(x, floor, z + direction * 5.35, -direction);
  }
  function sofa(side, floor, z) {
    const x = side * 19.65;
    box("salon_sofa_plinth", m.wood, [x, floor + 0.8, z], [3.25, 1.6, 8.5]);
    for (const dz of [-2.8, 0, 2.8])
      b.add(roundBox(3.15, 0.65, 2.65, 0.28), m.red, [x, floor + 1.88, z + dz]);
    box(
      "salon_sofa_back",
      m.wood,
      [side * 21.1, floor + 2.6, z],
      [0.35, 3.7, 8.6],
    );
    b.add(roundBox(0.18, 2.4, 7.8, 0.24), m.red, [
      side * 20.83,
      floor + 2.9,
      z,
    ]);
    for (const dz of [-4.1, 4.1])
      box("salon_sofa_arm", m.wood, [x, floor + 2.3, z + dz], [3.3, 1.8, 0.4]);
    box(
      "salon_table_base",
      m.brass,
      [side * 16.4, floor + 0.7, z],
      [1.6, 1.4, 2.4],
    );
    b.add(roundBox(1.9, 0.32, 4.5, 0.15), m.wood, [
      side * 16.4,
      floor + 1.56,
      z,
    ]);
    reserve(
      "salon_table_top",
      [side * 16.4, floor + 1.56, z],
      [1.9, 0.32, 4.5],
    );
  }
  function cabin(side, z) {
    const floor = 44.7,
      x = side * 18.8;
    room(
      `cabin_${side < 0 ? "port" : "starboard"}_${z}`,
      "passenger_cabin",
      [
        [side < 0 ? -21.45 : 15.4, floor, z - 10],
        [side < 0 ? -15.4 : 21.45, 61.3, z + 10],
      ],
      [side * 13.2, floor + 7, z],
      [x, floor + 3.2, z],
      () => {
        // 舱门对着中庭，开口仅属于支线小舱，不冒充成人主通路。
        for (const dz of [-10, 10])
          box(
            "cabin_partition",
            m.wood,
            [x, floor + 8.2, z + dz],
            [6.4, 16.4, 0.38],
          );
        for (const dz of [-6.8, 6.8])
          box(
            "cabin_door_jamb",
            m.wood,
            [side * 15.6, floor + 8.2, z + dz],
            [0.35, 16.4, 6.4],
          );
        box(
          "cabin_door_lintel",
          m.wood,
          [side * 15.6, floor + 13.5, z],
          [0.35, 5.8, 7.2],
        );
        for (const dz of [-3.6, 3.6])
          b.box(
            m.brass,
            [side * 15.36, floor + 5.35, z + dz],
            [0.12, 10.7, 0.15],
          );
        const bedX = side * 19.6,
          bedZ = z - 4.3;
        box(
          "cabin_bed_frame",
          m.wood,
          [bedX, floor + 0.8, bedZ],
          [3.3, 1.6, 7.2],
        );
        b.add(roundBox(3.1, 0.65, 6.8, 0.28), m.pale, [
          bedX,
          floor + 1.9,
          bedZ,
        ]);
        reserve("cabin_mattress", [bedX, floor + 1.9, bedZ], [3.1, 0.65, 6.8]);
        b.add(roundBox(2.55, 0.5, 1.4, 0.22), m.pale, [
          bedX,
          floor + 2.465,
          bedZ - 2.3,
        ]);
        box(
          "cabin_headboard",
          m.wood,
          [bedX, floor + 2.25, bedZ - 3.5],
          [3.5, 4.5, 0.32],
        );
        for (const dx of [-1.58, 1.58])
          b.beam(
            m.brass,
            [bedX + dx, floor + 0.2, bedZ - 3.5],
            [bedX + dx, floor + 4.75, bedZ - 3.5],
            0.11,
          );
        cabinet(side * 17.15, floor, z - 5.5, 1.7, 2.6, 2.1, "cabin_drawers");
        cabinet(side * 19.55, floor, z + 6.0, 3.0, 7.5, 3.5, "cabin_wardrobe");
        for (const y of [floor + 1.1, floor + 6.0])
          b.box(m.brass, [side * 21.38, y, z], [0.12, 0.16, 18.7]);
        b.box(m.dark, [side * 21.3, floor + 6.1, z + 1.5], [0.16, 4.3, 3.6]);
        for (const dz of [-0.4, 3.4])
          b.box(
            m.brass,
            [side * 21.17, floor + 6.1, z + dz],
            [0.14, 4.6, 0.15],
          );
      },
    );
  }
  function trunk(x, floor, z, width = 3.8, depth = 2.5, height = 2.4) {
    b.add(roundBox(width, height, depth, 0.22), m.wood, [
      x,
      floor + height / 2,
      z,
    ]);
    reserve(
      "luggage_trunk",
      [x, floor + height / 2, z],
      [width, height, depth],
    );
    for (const dx of [-width * 0.3, width * 0.3])
      b.box(
        m.brass,
        [x + dx, floor + height / 2, z],
        [0.15, height + 0.04, depth + 0.04],
      );
    b.box(
      m.brass,
      [x, floor + height * 0.62, z + depth / 2 + 0.025],
      [0.65, 0.5, 0.13],
    );
    b.beam(
      m.brass,
      [x - 0.5, floor + height * 0.7, z + depth / 2 + 0.11],
      [x + 0.5, floor + height * 0.7, z + depth / 2 + 0.11],
      0.1,
    );
  }
  function crate(x, floor, z, height) {
    box("cargo_crate", m.wood, [x, floor + height / 2, z], [5.7, height, 7.4]);
    for (const y of [floor + 0.35, floor + height - 0.35])
      b.box(m.brass, [x, y, z], [5.77, 0.22, 7.47]);
    for (const side of [-1, 1]) {
      for (let i = 1; i < 5; i++)
        b.box(
          m.dark,
          [x + side * 2.87, floor + (height * i) / 5, z],
          [0.035, 0.065, 7.25],
        );
      b.beam(
        m.brass,
        [x + side * 2.91, floor + 0.4, z - 3.35],
        [x + side * 2.91, floor + height - 0.4, z + 3.35],
        0.1,
      );
    }
  }
  function barrel(x, floor, z) {
    const height = 6.2,
      radius = 2.2;
    b.add(new THREE.CylinderGeometry(1.9, 1.9, height, 16, 1), m.wood, [
      x,
      floor + height / 2,
      z,
    ]);
    for (const y of [0.3, 1.8, 4.4, 5.9])
      ring(m.brass, [x, floor + y, z], 1.92, 0.1);
    b.add(new THREE.CylinderGeometry(radius, radius, 2.6, 16), m.wood, [
      x,
      floor + height / 2,
      z,
    ]);
    reserve(
      "cargo_barrel",
      [x, floor + height / 2, z],
      [radius * 2, height, radius * 2],
    );
    for (const i of [-1, 0, 1])
      b.box(
        m.dark,
        [x + i * 1.1, floor + height + 0.03, z],
        [0.045, 0.06, 3.1],
      );
  }
  function boiler(side, z) {
    const x = side * 10.7,
      floor = 2,
      y = floor + 4.1,
      radius = 3.0,
      length = 12;
    for (const dz of [-4, 4])
      box("boiler_saddle", m.steel, [x, floor + 0.8, z + dz], [5.3, 1.6, 2]);
    b.add(
      new THREE.CylinderGeometry(radius, radius, length, 20),
      m.rust,
      [x, y, z],
      [Math.PI / 2, 0, 0],
    );
    reserve("engine_boiler", [x, y, z], [radius * 2, radius * 2, length]);
    for (const dz of [-5.8, -2, 2, 5.8])
      ring(m.steel, [x, y, z + dz], radius + 0.025, 0.16, [0, 0, 0]);
    b.add(
      new THREE.CylinderGeometry(2.0, 2.0, 0.3, 16),
      m.dark,
      [x, y, z + 6.1],
      [Math.PI / 2, 0, 0],
    );
    reserve("engine_boiler_hatch", [x, y, z + 6.25], [4, 4, 0.7]);
    ring(m.brass, [x, y, z + 6.32], 1.7, 0.13, [0, 0, 0]);
    for (const dx of [-1.3, 1.3])
      b.beam(
        m.brass,
        [x + dx, y - 0.7, z + 6.4],
        [x + dx, y + 0.7, z + 6.4],
        0.09,
      );
    pipe("engine_steam_pipe", m.steel, [x, y + 2.9, z], [x, 13.8, z], 0.38);
    pipe(
      "engine_steam_header",
      m.steel,
      [x, 13.8, z],
      [side * 13.5, 13.8, z],
      0.38,
    );
    ring(m.brass, [x, y + 4.5, z], 0.7, 0.09, [0, Math.PI / 2, 0]);
    pipe(
      "engine_valve_stem",
      m.brass,
      [x, y + 4.5, z],
      [x - side * 1.2, y + 4.5, z],
      0.11,
    );
  }

  for (const side of [-1, 1]) {
    const sideName = side < 0 ? "port" : "starboard";
    room(
      `dining_${sideName}`,
      "dining_room",
      [
        [side < 0 ? -24 : 15.5, 23.7, 28],
        [side < 0 ? -15.5 : 24, 42.3, 85],
      ],
      [side * 10.5, 32.5, 49],
      [side * 20, 27.5, 52],
      () => {
        for (const z of [42, 65]) diningTable(side * 19.5, 23.7, z);
        cabinet(side * 23.1, 23.7, 80, 2.0, 4.3, 8.0, "dining_sideboard");
        for (const z of [31, 54, 78]) {
          box("dining_panel", m.wood, [side * 24, 30.2, z], [0.45, 13, 8.5]);
          b.box(m.pale, [side * 23.71, 32, z], [0.12, 5.4, 6.9]);
          for (const y of [25.3, 36.2])
            b.box(m.brass, [side * 23.61, y, z], [0.11, 0.16, 8.1]);
        }
      },
    );
    room(
      `salon_${sideName}`,
      "salon",
      [
        [side < 0 ? -21.4 : 15.4, 44.7, 31],
        [side < 0 ? -15.4 : 21.4, 61.3, 88],
      ],
      [side * 11, 52, 48],
      [side * 19, 47.8, 59],
      () => {
        for (const z of [43, 66]) sofa(side, 44.7, z);
        cabinet(side * 19.55, 44.7, 82, 3.0, 7.5, 4.8, "salon_bookcase");
        for (const dz of [-1.55, -0.6, 0.6, 1.55])
          b.box(
            dz < 0 ? m.red : m.pale,
            [side * 17.99, 49.6, 82 + dz],
            [0.16, 2.9, 0.6],
          );
        for (const z of [36, 56, 78]) {
          b.box(m.wood, [side * 21.37, 54.5, z], [0.15, 10.5, 8.9]);
          b.box(m.dark, [side * 21.25, 55.4, z], [0.11, 4.7, 6.0]);
          for (const dz of [-3.1, 3.1])
            b.box(m.brass, [side * 21.15, 55.4, z + dz], [0.12, 4.9, 0.15]);
        }
      },
    );
    for (const z of [-77, -5]) cabin(side, z);
  }
  room(
    "engine_gallery",
    "engine_room",
    [
      [-14.3, 2, -54],
      [14.3, 21.3, -2],
    ],
    [0, 15.5, -52],
    [10.7, 6.1, -28],
    () => {
      for (const side of [-1, 1]) {
        for (const z of [-41, -20]) boiler(side, z);
        const x = side * 10.7;
        box("engine_pump_plinth", m.steel, [x, 3.05, -6], [5.9, 2.1, 6.2]);
        box("engine_pump", m.rust, [x, 5.8, -6], [4.2, 3.4, 3.1]);
        ring(m.brass, [x, 6.1, -3.9], 2.3, 0.22, [0, 0, 0]);
        reserve("engine_flywheel", [x, 6.1, -3.9], [5.04, 5.04, 0.44]);
        pipe("engine_piston", m.steel, [x, 6.1, -10], [x, 6.1, -2], 0.3);
        for (const z of [-47, -35, -23, -11]) {
          box(
            "engine_pipe_support",
            m.steel,
            [side * 13.9, 9.4, z],
            [0.4, 14.8, 0.4],
          );
          box(
            "engine_wall_mount",
            m.steel,
            [side * 14, 8.5, z],
            [0.6, 3.7, 1.0],
          );
          b.add(
            new THREE.CylinderGeometry(0.56, 0.56, 0.24, 12),
            m.pale,
            [side * 13.6, 8.7, z],
            [0, 0, Math.PI / 2],
          );
          b.beam(
            m.dark,
            [side * 13.47, 8.4, z - 0.15],
            [side * 13.47, 9.03, z + 0.12],
            0.035,
          );
        }
        pipe(
          "engine_wall_conduit",
          m.brass,
          [side * 13.5, 16.8, -51],
          [side * 13.5, 16.8, -2],
          0.3,
        );
      }
    },
  );
  for (const [id, z0] of [
    ["bow_cargo", -83],
    ["stern_luggage", 80],
  ]) {
    room(
      id,
      id === "bow_cargo" ? "cargo_hold" : "luggage_hold",
      [
        [-14.3, 2, z0 - 15],
        [14.3, 21.3, z0 + 15],
      ],
      [0, 14.5, z0 + 14],
      [10.8, 5, z0],
      () => {
        for (const side of [-1, 1]) {
          const x = side * 10.9;
          crate(x, 2, z0 - 7, 6.3);
          if (id === "bow_cargo") {
            barrel(x, 2, z0 + 7);
            trunk(x, 8.3, z0 - 7, 3.8, 2.5, 2.3);
          } else {
            for (const z of [z0 + 4, z0 + 9]) {
              trunk(x, 2, z, 5.3, 3.4, 2.7);
              trunk(x + side * 0.2, 4.7, z, 3.8, 2.5, 2.1);
            }
          }
        }
      },
    );
  }
  return { rooms, fixtures };
}
