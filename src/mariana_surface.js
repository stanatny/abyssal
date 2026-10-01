import * as THREE from "three";
import { createBermudaBuilder, hullStripGeometry } from "./bermuda_geometry.js";
import { createSurfaceShipImpact } from "./surface_ship_impact.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 马里亚纳远洋科考船队：工作甲板、探测缆机与A形吊架；复用船体冲撞规则。 */
export function createMarianaFleet(parent, options = {}) {
  const root = new THREE.Group();
  root.name = "mariana_survey_fleet";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r);
  const materials = {};
  for (const [name, color, metalness] of [
    ["hull", "#233f58", 0.35],
    ["enamel", "#d0d5cf", 0.18],
    ["deck", "#758c88", 0.2],
    ["orange", "#d48642", 0.25],
    ["steel", "#657c86", 0.65],
    ["rubber", "#172c35", 0.05],
    ["glass", "#183e50", 0.4],
    ["cable", "#374449", 0.45],
  ]) {
    const m = keep(
      new THREE.MeshStandardMaterial({
        color,
        metalness,
        roughness: name === "glass" ? 0.25 : 0.66,
      }),
    );
    m.name = `survey_${name}`;
    addSurfaceDetail(m, "metal", 0.32);
    materials[name] = m;
  }
  const ships = [
    buildVessel(68, 14, materials, keep, false),
    buildVessel(22, 5.8, materials, keep, true),
  ];
  const wakeTime = { value: 0 };
  const wakeMaterial = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { time: wakeTime },
      vertexShader: `varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time;varying vec2 v;void main(){float edge=pow(max(0.,sin(v.x*3.14159)),1.4);float tail=1.-smoothstep(.15,1.,v.y);float foam=pow(.5+.5*sin(v.y*83.-time*2.+sin(v.x*32.)*2.),3.);gl_FragColor=vec4(.75,.87,.86,edge*tail*foam*.36);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`,
    }),
  );
  const colliders = [],
    temp = new THREE.Vector3();
  ships.forEach((ship, i) => {
    ship.kind = i ? "sloop" : "cruise";
    ship.label = i ? "海沟观测艇" : "马里亚纳科考船";
    ship.anchor = new THREE.Vector3(i ? 105 : -75, 4, i ? -120 : -185);
    ship.phase = i * 2 + 0.5;
    ship.heading = 0;
    root.add(ship.root);
    const wake = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(ship.width * 1.7, ship.length * 0.6)),
      wakeMaterial,
    );
    wake.name = "ship_wake";
    wake.rotation.x = -Math.PI / 2;
    root.add(wake);
    ship.wake = wake;
    ship.colliders = ship.specs.map((s, j) => ({
      type: "box",
      id: `mariana_vessel_${i}_${j}`,
      kind: s.kind || "ship_hull",
      owner: "ship",
      x: 0,
      y: 0,
      z: 0,
      halfSize: new THREE.Vector3(...s.size).multiplyScalar(0.5),
      rotation: new THREE.Quaternion(),
      localCenter: new THREE.Vector3(...s.center),
    }));
    colliders.push(...ship.colliders);
  });
  const impact = createSurfaceShipImpact(parent, ships, colliders, options);
  const buoys = [];
  for (const [i, p] of [
    [-130, -65],
    [132, -245],
    [-105, -430],
  ].entries()) {
    const g = new THREE.Group();
    g.name = `trench_observatory_${i}`;
    root.add(g);
    const b = createBermudaBuilder(g, keep),
      m = materials;
    b.add(new THREE.CylinderGeometry(1.5, 1.9, 1.2, 20), m.orange, [0, 0, 0]);
    b.add(
      new THREE.TorusGeometry(1.85, 0.24, 8, 24),
      m.rubber,
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    );
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      b.beam(m.steel, [Math.cos(a), 0.5, Math.sin(a)], [0, 3.8, 0], 0.09);
    }
    b.box(m.enamel, [0, 2.4, 0], [1.6, 0.2, 1.5]);
    b.box(m.glass, [0, 2.52, 0], [1.5, 0.05, 1.4]);
    b.beam(m.steel, [0, 3.4, 0], [0, 5.8, 0], 0.04);
    b.add(new THREE.SphereGeometry(0.21, 10, 6), m.orange, [0, 4.3, 0]);
    b.beam(m.cable, [0, -0.6, 0], [0, -7, 0], 0.055);
    b.finish();
    const collider = {
      type: "sphere",
      id: `survey_buoy_${i}`,
      x: p[0],
      y: 4,
      z: p[1],
      radius: 2,
    };
    colliders.push(collider);
    buoys.push({ g, x: p[0], z: p[1], collider });
  }
  let disposed = false;
  function update(time, position) {
    if (disposed) return;
    wakeTime.value = time;
    ships.forEach((ship, i) => {
      if (ship.state.destroyed) return;
      ship.root.position.copy(ship.anchor);
      ship.root.position.x += Math.sin(time * 0.006 + ship.phase) * 18;
      ship.root.position.z += Math.cos(time * 0.006 + ship.phase) * 24;
      ship.root.position.y += Math.sin(time * 0.7 + ship.phase) * 0.28;
      ship.root.rotation.set(
        Math.sin(time * 0.37 + i) * 0.01,
        i ? 0.75 : -0.42,
        Math.sin(time * 0.45 + i) * 0.012,
      );
      ship.heading = ship.root.rotation.y;
      ship.wake.visible = true;
      ship.wake.position.set(
        ship.root.position.x + Math.sin(ship.heading) * ship.length * 0.78,
        4.65,
        ship.root.position.z + Math.cos(ship.heading) * ship.length * 0.78,
      );
      ship.wake.rotation.set(-Math.PI / 2, 0, -ship.heading);
    });
    impact.update(time, position);
    for (const ship of ships) {
      ship.root.updateMatrixWorld(true);
      for (const c of ship.colliders) {
        temp.copy(c.localCenter).applyMatrix4(ship.root.matrixWorld);
        c.x = temp.x;
        c.y = temp.y;
        c.z = temp.z;
        c.rotation.copy(ship.root.quaternion);
      }
    }
    for (const b of buoys) {
      b.g.position.set(b.x, 4 + Math.sin(time * 0.8 + b.x) * 0.32, b.z);
      b.g.rotation.z = Math.sin(time * 0.65 + b.z) * 0.06;
      b.collider.y = b.g.position.y;
    }
  }
  update(0, new THREE.Vector3());
  return {
    root,
    ships,
    colliders,
    update,
    onMovement: impact.onMovement,
    reset() {
      if (disposed) return;
      impact.reset();
      colliders.push(...buoys.map((b) => b.collider));
      update(0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      impact.dispose();
      root.removeFromParent();
      root.clear();
      for (const r of resources) r.dispose();
      resources.clear();
      colliders.length = 0;
    },
  };
}

/** 原创船体按材质合批，船首收尖、船尾工作区及上层驾驶室采用不同轮廓。 */
function buildVessel(length, width, m, keep, tender) {
  const root = new THREE.Group();
  root.name = tender ? "survey_tender" : "research_vessel";
  const b = createBermudaBuilder(root, keep),
    h = tender ? 2.8 : 6,
    deck = h - 2;
  for (const side of [-1, 1])
    b.add(hullStripGeometry(length, width, h, { side }), m.hull, [0, -2, 0]);
  const shape = new THREE.Shape();
  shape.moveTo(0, -length * 0.5);
  shape.quadraticCurveTo(
    width * 0.5,
    -length * 0.45,
    width * 0.5,
    -length * 0.28,
  );
  shape.lineTo(width * 0.5, length * 0.37);
  shape.quadraticCurveTo(width * 0.45, length * 0.49, 0, length * 0.5);
  shape.quadraticCurveTo(
    -width * 0.45,
    length * 0.49,
    -width * 0.5,
    length * 0.37,
  );
  shape.lineTo(-width * 0.5, -length * 0.28);
  shape.quadraticCurveTo(-width * 0.5, -length * 0.45, 0, -length * 0.5);
  const deckGeo = new THREE.ShapeGeometry(shape, 20);
  deckGeo.rotateX(-Math.PI / 2);
  b.add(deckGeo, m.deck, [0, deck, 0]);
  // 与两侧船壳逐截面闭合龙骨，水下观察时不出现空底。
  const keelP = [],
    keelI = [];
  for (let row = 0; row <= 64; row++) {
    const z = (row / 64 - 0.5) * length,
      taper = Math.min(
        1,
        Math.max(0.03, (length / 2 - Math.abs(z)) / (length * 0.12)),
      );
    keelP.push(-width * 0.275 * taper, -2, z, width * 0.275 * taper, -2, z);
    if (row < 64) {
      const a = row * 2;
      keelI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const keel = new THREE.BufferGeometry();
  keel.setAttribute("position", new THREE.Float32BufferAttribute(keelP, 3));
  keel.setIndex(keelI);
  keel.computeVertexNormals();
  b.add(keel, m.hull);
  const specs = [];
  for (let i = 0; i < 9; i++) {
    const z = (i / 8 - 0.5) * length * 0.9,
      taper = Math.min(
        1,
        Math.max(0.18, (length / 2 - Math.abs(z)) / (length * 0.12)),
      );
    specs.push({
      center: [0, deck - h * 0.46, z],
      size: [width * taper, h, length / 9],
    });
  }
  const cabinZ = -length * 0.14,
    cabinW = width * 0.7,
    cabinL = length * 0.27;
  b.box(m.enamel, [0, deck + 2, cabinZ], [cabinW, 4, cabinL]);
  b.box(m.enamel, [0, deck + 4.5, cabinZ - 1], [cabinW + 1, 1, cabinL + 1.5]);
  specs.push({
    kind: "ship_deck",
    center: [0, deck + 2, cabinZ],
    size: [cabinW, 4, cabinL],
  });
  if (!tender) {
    specs.push({
      kind: "ship_deck",
      center: [0, deck + 5.6, cabinZ - 2],
      size: [cabinW * 0.78, 1.25, cabinL * 0.6],
    });
    b.box(
      m.enamel,
      [0, deck + 5.6, cabinZ - 2],
      [cabinW * 0.78, 1.25, cabinL * 0.6],
    );
    b.box(
      m.rubber,
      [0, deck + 6.28, cabinZ - 2],
      [cabinW * 0.81, 0.12, cabinL * 0.63],
    );
    for (const side of [-1, 1])
      for (let j = 0; j < 5; j++)
        b.box(
          m.glass,
          [
            side * (cabinW * 0.39 + 0.015),
            deck + 5.65,
            cabinZ - cabinL * 0.25 + j * cabinL * 0.1,
          ],
          [0.045, 0.65, 1.0],
        );
    for (let step = 0; step < 6; step++)
      b.box(
        m.deck,
        [
          -cabinW * 0.5 + 0.9,
          deck + 0.2 + step * 0.32,
          cabinZ + cabinL * 0.5 + 3 - step * 0.45,
        ],
        [1.5, 0.3, 0.65],
      );
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < (tender ? 3 : 8); i++)
      b.box(
        m.glass,
        [
          side * (cabinW / 2 + 0.025),
          deck + 2.8,
          cabinZ - cabinL * 0.38 + (i * cabinL * 0.76) / ((tender ? 3 : 8) - 1),
        ],
        [0.06, 1.1, tender ? 1 : 1.4],
      );
    for (let j = 0; j < 16; j++) {
      const z = -length * 0.4 + (j * length * 0.8) / 15,
        taper = Math.min(1, (length / 2 - Math.abs(z)) / (length * 0.12)),
        x = side * ((width / 2) * taper - 0.2);
      b.beam(m.enamel, [x, deck, z], [x, deck + 1.15, z], 0.05);
      if (j < 15) {
        const nz = z + (length * 0.8) / 15,
          nx =
            side *
            ((width / 2) *
              Math.min(1, (length / 2 - Math.abs(nz)) / (length * 0.12)) -
              0.2);
        for (const y of [0.65, 1.15])
          b.beam(m.enamel, [x, deck + y, z], [nx, deck + y, nz], 0.045);
      }
    }
    for (let j = 0; j < 6; j++)
      b.add(
        new THREE.TorusGeometry(tender ? 0.3 : 0.65, 0.12, 6, 14),
        m.rubber,
        [side * width * 0.49, deck - 0.55, -length * 0.22 + j * length * 0.09],
        [0, Math.PI / 2, 0],
      );
  }
  for (let j = -2; j <= 2; j++)
    b.box(
      m.glass,
      [j * cabinW * 0.17, deck + 2.8, cabinZ - cabinL / 2 - 0.03],
      [cabinW * 0.14, 1.1, 0.06],
    );
  b.beam(
    m.steel,
    [0, deck + 5, cabinZ],
    [0, deck + (tender ? 8 : 14), cabinZ],
    0.15,
  );
  for (const y of [7, 9, 11])
    if (!tender || y === 7)
      b.beam(
        m.enamel,
        [-width * 0.28, deck + y, cabinZ],
        [width * 0.28, deck + y, cabinZ],
        0.09,
      );
  b.add(new THREE.SphereGeometry(tender ? 0.6 : 1.5, 20, 12), m.enamel, [
    0,
    deck + (tender ? 7 : 9),
    cabinZ + 3,
  ]);
  b.box(m.rubber, [1.5, deck + 5.5, cabinZ + 2], [0.8, 2, 1.5]);
  if (!tender) {
    // A形吊架、拖曳缆绞车、取样瓶架与救生艇均有实体体积。
    for (const side of [-1, 1]) {
      b.beam(
        m.orange,
        [side * width * 0.39, deck, length * 0.38],
        [side * width * 0.3, deck + 10, length * 0.43],
        0.38,
        12,
      );
      b.beam(
        m.orange,
        [side * width * 0.39, deck, length * 0.22],
        [side * width * 0.3, deck + 10, length * 0.43],
        0.25,
        10,
      );
      b.beam(
        m.cable,
        [side * width * 0.3, deck + 9.5, length * 0.43],
        [side * width * 0.3, deck + 2, length * 0.35],
        0.065,
      );
    }
    b.beam(
      m.orange,
      [-width * 0.3, deck + 10, length * 0.43],
      [width * 0.3, deck + 10, length * 0.43],
      0.42,
      12,
    );
    b.add(
      new THREE.CylinderGeometry(2, 2, 5, 24),
      m.cable,
      [0, deck + 2, length * 0.22],
      [0, 0, Math.PI / 2],
    );
    for (const x of [-2.6, 2.6])
      b.add(
        new THREE.CylinderGeometry(2.3, 2.3, 0.22, 24),
        m.orange,
        [x, deck + 2, length * 0.22],
        [0, 0, Math.PI / 2],
      );
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      b.add(new THREE.CylinderGeometry(0.18, 0.18, 2.8, 8), m.steel, [
        Math.cos(a) * 1.4,
        deck + 1.6,
        length * 0.04 + Math.sin(a) * 1.4,
      ]);
    }
    for (const y of [0.25, 3.1])
      b.add(
        new THREE.TorusGeometry(1.65, 0.12, 6, 20),
        m.orange,
        [0, deck + y, length * 0.04],
        [Math.PI / 2, 0, 0],
      );
    const lifeboat = new THREE.SphereGeometry(1, 20, 12);
    lifeboat.scale(1.3, 0.85, 3.4);
    b.add(lifeboat, m.orange, [width * 0.38, deck + 5, cabinZ + 4]);
    for (let j = 0; j < 11; j++)
      b.beam(
        m.steel,
        [-width * 0.37, deck + j * 0.4, cabinZ + 5],
        [-width * 0.37, deck + j * 0.4, cabinZ + 6],
        0.06,
      );
    specs.push({
      kind: "ship_deck",
      center: [0, deck + 2, length * 0.22],
      size: [6, 4, 4],
    });
  }
  b.finish();
  return { root, length, width, specs, edible: false, collidable: true };
}

/** 冷色远洋层云与远处火山岛，水下隐藏天空，避免云层穿透水面。 */
export function createMarianaSky(parent) {
  const root = new THREE.Group();
  root.name = "mariana_overcast_horizon";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    time = { value: 0 };
  const skyMat = keep(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { time },
      vertexShader: `varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time;varying vec3 v;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 n=normalize(v);float h=max(0.,n.y);vec2 p=n.xz/(h+.18)*2.+vec2(time*.003,0.);float c=noise(p)*.55+noise(p*2.1)*.28+noise(p*4.3)*.17;
      vec3 col=mix(vec3(.56,.67,.71),vec3(.29,.39,.48),sqrt(h));col=mix(col,vec3(.71,.75,.75),smoothstep(.42,.74,c)*smoothstep(.02,.25,h));
      gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(
        ";#include",
        ";\n#include",
      ),
    }),
  );
  const sky = new THREE.Mesh(
    keep(new THREE.SphereGeometry(1900, 32, 20)),
    skyMat,
  );
  sky.name = "pacific_stratus";
  root.add(sky);
  const rock = keep(
    new THREE.MeshStandardMaterial({
      color: 0x46575c,
      roughness: 1,
      flatShading: true,
    }),
  );
  addSurfaceDetail(rock, "stone", 0.025);
  const islands = new THREE.Group();
  islands.name = "distant_volcanic_islands";
  root.add(islands);
  for (const [i, spec] of [
    [-510, 38, -440, 155],
    [460, 55, -900, 185],
    [-390, 23, 510, 95],
  ].entries()) {
    const geo = new THREE.ConeGeometry(1, 1, 48, 18),
      p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k),
        z = p.getZ(k),
        y = p.getY(k) + 0.5,
        a = Math.atan2(z, x);
      const folds =
        1 + Math.sin(a * 7 + i) * 0.1 + Math.sin(a * 13 + y * 11) * 0.05;
      p.setXYZ(
        k,
        x * spec[3] * folds,
        Math.pow(y, 0.78) * spec[1] * 2,
        z * spec[3] * folds,
      );
    }
    geo.computeVertexNormals();
    const island = new THREE.Mesh(keep(geo), rock);
    island.position.set(spec[0], -4, spec[2]);
    islands.add(island);
  }
  let disposed = false;
  return {
    root,
    update(elapsed, position, { aboveWater }) {
      if (disposed) return;
      root.visible = aboveWater;
      time.value = elapsed;
      sky.position.set(position.x, 0, position.z);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      for (const r of resources) r.dispose();
      resources.clear();
    },
  };
}
