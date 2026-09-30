import * as THREE from "three";
import { createBermudaBuilder, bermudaMaterials } from "./bermuda_geometry.js";
import { seaFanGeometry, addSurfaceDetail } from "./ocean_visuals.js";
import { bermudaCoralColonyGeometry } from "./bermuda_reef.js";

/** 礁峡、失事残骸与热液群落；地标有实体接触，植物装饰合批并保持航道净空。 */
export function createBermudaBiomes(parent, { heightAt } = {}) {
  const root = new THREE.Group();
  root.name = "bermuda_exploration_biomes";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    m = bermudaMaterials(keep),
    b = createBermudaBuilder(root, keep),
    contacts = [],
    lights = [],
    landmarks = [];
  const stone = keep(
    new THREE.MeshStandardMaterial({ color: "#536362", roughness: 1 }),
  );
  stone.name = "fractured_basalt";
  addSurfaceDetail(stone, "stone", 1);
  const colony = keep(
    new THREE.MeshStandardMaterial({
      color: "#687e6a",
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  colony.name = "marine_colonies";
  const bacteria = keep(
    new THREE.MeshStandardMaterial({
      color: "#8c815b",
      roughness: 0.9,
      emissive: "#69866b",
      emissiveIntensity: 0.5,
    }),
  );
  bacteria.name = "vent_bacterial_mats";
  for (const [id, x, z] of [
    ["reef_arch", -180, -365],
    ["trench_arch", 170, -775],
  ]) {
    const y = heightAt(x, z),
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x - 35, heightAt(x - 35, z), z),
        new THREE.Vector3(x - 28, y + 32, z + 4),
        new THREE.Vector3(x, y + 50, z),
        new THREE.Vector3(x + 27, y + 33, z - 4),
        new THREE.Vector3(x + 35, heightAt(x + 35, z), z),
      ]);
    const geo = new THREE.TubeGeometry(curve, 48, 4.5, 12, false),
      p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = Math.sin(p.getX(i) * 0.83 + p.getZ(i) * 0.47) * 0.5;
      const c = curve.getPointAt(Math.floor(i / 13) / 48);
      p.setXYZ(
        i,
        p.getX(i) + (p.getX(i) - c.x) * k * 0.09,
        p.getY(i) + (p.getY(i) - c.y) * k * 0.09,
        p.getZ(i) + (p.getZ(i) - c.z) * k * 0.09,
      );
    }
    geo.computeVertexNormals();
    b.add(geo, stone);
    for (let j = 0; j < 24; j++) {
      const a = curve.getPointAt(j / 24),
        c = curve.getPointAt((j + 1) / 24),
        direction = c.clone().sub(a),
        center = a.clone().add(c).multiplyScalar(0.5);
      contacts.push({
        id: `${id}_${j}`,
        type: "box",
        x: center.x,
        y: center.y,
        z: center.z,
        halfSize: new THREE.Vector3(5, direction.length() / 2 + 1, 5),
        rotation: new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize(),
        ),
      });
    }
    landmarks.push({
      name: id === "reef_arch" ? "迷雾礁拱" : "深沟石门",
      position: new THREE.Vector3(x, y + 35, z),
      radius: 75,
    });
  }
  for (let i = 0; i < 28; i++) {
    const x = (i % 2 ? 1 : -1) * (155 + (i % 5) * 19),
      z = -310 - Math.floor(i / 2) * 51,
      y = heightAt(x, z),
      h = 12 + (i % 6) * 8;
    const g = new THREE.CylinderGeometry(2 + (i % 3), 5 + (i % 4), h, 7, 4),
      p = g.attributes.position;
    for (let j = 0; j < p.count; j++)
      p.setX(j, p.getX(j) + Math.sin(p.getY(j) * 0.21 + i) * 1.4);
    g.computeVertexNormals();
    b.add(g, stone, [x, y + h * 0.42, z]);
    contacts.push({
      id: `bermuda_spire_${i}`,
      type: "ellipsoid",
      x,
      y: y + h * 0.42,
      z,
      axes: new THREE.Vector3(7, h * 0.56, 7),
      rotation: new THREE.Quaternion(),
    });
  }
  // 失事双引擎飞机：连续机身、折断翼、舱口、发动机和弯折螺旋桨。
  const aircraft = [174, heightAt(174, -570) + 5, -570];
  const [ax, ay, az] = aircraft;
  const fuselage = new THREE.SphereGeometry(1, 32, 16);
  fuselage.scale(3.4, 3, 17);
  b.add(fuselage, m.pale, aircraft);
  b.box(m.steel, [ax, ay - 0.5, az + 2], [45, 0.65, 6], true, 0.14);
  b.box(m.rust, [ax + 22, ay - 1, az + 6], [12, 0.65, 5], true, 0.75);
  b.box(m.steel, [ax, ay + 1, az + 14], [17, 0.4, 4], true);
  b.box(m.steel, [ax, ay + 5, az + 13], [0.5, 8, 5], true);
  b.box(m.glass, [ax, ay + 2, az - 11], [4.6, 1.3, 5]);
  for (const side of [-1, 1]) {
    b.add(
      new THREE.CylinderGeometry(2.3, 2.6, 6, 20).rotateX(Math.PI / 2),
      m.rust,
      [ax + side * 10, ay, az - 2],
    );
    for (let i = 0; i < 3; i++)
      b.box(m.brass, [ax + side * 10, ay, az - 5.3], [0.4, 7, 0.25], false, [
        0,
        0,
        (i * Math.PI) / 3,
      ]);
    for (let i = 0; i < 8; i++)
      b.add(new THREE.SphereGeometry(0.13, 5, 4), m.brass, [
        ax + side * 3.4,
        ay,
        az - 8 + i * 2,
      ]);
  }
  contacts.push({
    id: "bermuda_aircraft_fuselage",
    type: "ellipsoid",
    x: ax,
    y: ay,
    z: az,
    axes: new THREE.Vector3(3.5, 3.1, 17.2),
    rotation: new THREE.Quaternion(),
  });
  landmarks.push({
    name: "失踪机群残骸",
    position: new THREE.Vector3(...aircraft),
    radius: 60,
  });
  // 深处小型货船残骸与断锚链，形成第二个探索点而不是空海床。
  const sx = 185,
    sz = -930,
    sy = heightAt(sx, sz) + 1;
  b.box(m.rust, [sx, sy, sz], [23, 1, 57], true);
  for (const side of [-1, 1])
    for (let j = 0; j < 11; j++) {
      const z = sz - 25 + j * 5,
        x = sx + side * (10 - Math.abs(j - 5) * 0.7);
      b.box(m.steel, [x, sy + 5, z], [0.75, 10, 1], true, [0, 0, side * 0.18]);
      b.beam(m.rust, [x, sy + 10, z], [x, sy + 10, z + 4], 0.35);
    }
  for (let i = 0; i < 6; i++)
    b.box(
      m.wood,
      [sx - 5 + (i % 3) * 5, sy + 2, sz - 15 + Math.floor(i / 3) * 16],
      [4, 3.4, 5],
      true,
    );
  for (let i = 0; i < 18; i++)
    b.add(
      new THREE.TorusGeometry(0.5, 0.13, 6, 12).rotateX(
        i % 2 ? Math.PI / 2 : 0,
      ),
      m.brass,
      [sx - 13 - i * 0.55, sy - 0.2, sz - 18 + i * 0.5],
    );
  landmarks.push({
    name: "锈蚀货船墓地",
    position: new THREE.Vector3(sx, sy + 8, sz),
    radius: 60,
  });
  for (let i = 0; i < 12; i++) {
    const x = (i % 2 ? 1 : -1) * (195 + (i % 3) * 15),
      z = -740 - Math.floor(i / 2) * 55,
      y = heightAt(x, z),
      h = 9 + (i % 4) * 5;
    const g = new THREE.CylinderGeometry(1.4, 3.4, h, 13, 8, true),
      p = g.attributes.position;
    for (let j = 0; j < p.count; j++)
      p.setX(j, p.getX(j) + Math.sin(p.getY(j) * 0.3 + i) * 0.7);
    g.computeVertexNormals();
    b.add(g, stone, [x, y + h / 2, z]);
    b.add(
      new THREE.TorusGeometry(1.5, 0.5, 8, 20).rotateX(Math.PI / 2),
      bacteria,
      [x + Math.sin(h * 0.15 + i) * 0.7, y + h, z],
    );
    contacts.push({
      id: `vent_${i}`,
      type: "ellipsoid",
      x,
      y: y + h / 2,
      z,
      axes: new THREE.Vector3(4, h / 2, 4),
      rotation: new THREE.Quaternion(),
    });
    for (let j = 0; j < 12; j++) {
      const a = j * 2.4,
        r = 3 + (j % 3);
      b.add(
        new THREE.CylinderGeometry(0.13, 0.25, 1.8 + (j % 4), 6),
        bacteria,
        [x + Math.cos(a) * r, y + 1.2, z + Math.sin(a) * r],
      );
    }
    if (i % 3 === 0)
      lights.push({
        position: new THREE.Vector3(x, y + h + 2, z),
        color: 0x73c6b9,
        intensity: 15,
        distance: 40,
      });
  }
  const coralGeometry = keep(bermudaCoralColonyGeometry());
  const fanGeometry = keep(seaFanGeometry());
  const coralMaterial = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
  );
  // 珊瑚、海扇、海绵与管虫覆盖侧路，使用已合批结构而非独立摆件堆。
  for (let i = 0; i < 90; i++) {
    const x = (i % 2 ? 1 : -1) * (72 + (i % 7) * 25),
      z = -190 - Math.floor(i / 2) * 20,
      y = heightAt(x, z);
    if (x > -150 && x < 35 && z < -360 && z > -940) continue;
    if (i % 3 === 0) {
      const g = coralGeometry.clone();
      g.scale(3 + (i % 4), 3 + (i % 4), 3 + (i % 4));
      b.add(g, coralMaterial, [x, y, z]);
    } else if (i % 3 === 1) {
      const g = fanGeometry.clone();
      g.scale(4 + (i % 3), 5 + (i % 3), 4);
      g.rotateY(i * 0.7);
      b.add(g, colony, [x, y, z]);
    } else {
      for (let j = 0; j < 4; j++)
        b.add(
          new THREE.CylinderGeometry(0.5, 0.7, 2 + j * 0.7, 8, 3, true),
          bacteria,
          [x + j * 0.6, y + 1 + j * 0.35, z],
        );
    }
  }
  const colliders = [...b.finish(), ...contacts];
  const time = { value: 0 };
  const snowGeo = keep(new THREE.BufferGeometry()),
    positions = [];
  for (let i = 0; i < 700; i++)
    positions.push(
      ((i * 37.17) % 120) - 60,
      ((i * 13.73) % 80) - 40,
      ((i * 23.87) % 120) - 60,
    );
  snowGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const snowMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time },
      vertexShader:
        "uniform float time;varying float fade;void main(){vec3 p=position;p.y=mod(p.y+40.-time*.5,80.)-40.;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(90./-v.z,1.,2.5);fade=.16*(1.-smoothstep(30.,80.,-v.z));}",
      fragmentShader:
        "varying float fade;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.62,.76,.73,fade*(1.-smoothstep(.1,.5,d)));}",
    }),
  );
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  root.add(snow);
  let disposed = false;
  return {
    root,
    colliders,
    lightSources: lights,
    landmarks,
    update(t, position, quality = true) {
      time.value = t;
      snow.position.copy(position);
      snow.visible = position.y < -30;
      snowGeo.setDrawRange(0, quality ? 700 : 300);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const r of resources) r.dispose();
      resources.clear();
      root.clear();
      colliders.length = 0;
    },
  };
}
