import * as THREE from "three";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { createSurfaceShipImpact } from "./surface_ship_impact.js";
import { acquireMarianaFleetAsset } from "./mariana_fleet_asset.js";
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
function buildVessel(length, width, _materials, keep, tender) {
  const root = new THREE.Group();
  root.name = tender ? "survey_tender" : "research_vessel";
  const asset = acquireMarianaFleetAsset(tender ? "tender" : "research");
  keep({ dispose: asset.release });
  const body = new THREE.Mesh(asset.geometry, asset.material);
  body.name = tender
    ? "mariana_tender_hf_surface"
    : "mariana_research_hf_surface";
  body.scale.setScalar(length);
  root.add(body);
  root.userData.artRevision = "mariana-survey-fleet-hf-20261024";
  root.userData.shipArt = { body };
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  // 碰撞与冲撞契约沿用原船队；外观离线适配长宽、甲板和两米吃水。
  const h = tender ? 2.8 : 6,
    deck = h - 2;
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
    specs.push({
      kind: "ship_deck",
      center: [0, deck + 2, length * 0.22],
      size: [6, 4, 4],
    });
  }
  return { root, length, width, specs, edible: false, collidable: true };
}

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
