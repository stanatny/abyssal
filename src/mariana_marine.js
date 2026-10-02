import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 将软体底栖装饰贴附最终岩壁三角形；不增加食物、伤害或阻挡通道的碰撞体。 */
export function addMarianaMarine({ root, keep, group, floor, time }) {
  const mat = (name, color, emissive = 0) => {
    const m = keep(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.86,
        side: THREE.DoubleSide,
        emissive,
        emissiveIntensity: emissive ? 0.35 : 0,
      }),
    );
    m.name = name;
    addSurfaceDetail(m, "coral", 1.7);
    return m;
  };
  const sponge = mat("trench_glass_sponge", 0xc9d4c2),
    anemone = mat("trench_anemone", 0xc17560),
    crust = mat("trench_encrusting_plates", 0x839fa5),
    star = mat("trench_brittle_star", 0xcfae82),
    glow = mat("trench_living_glimmer", 0x6bc6ce, 0x368cab);
  // 动态只在GPU推进，根部位移为零，不逐帧遍历实例。
  const previous = anemone.onBeforeCompile;
  anemone.onBeforeCompile = (s, r) => {
    previous(s, r);
    s.uniforms.marineTime = time;
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float marineTime;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x+=sin(marineTime*.65+position.y*2.)*pow(max(0.,position.y),2.)*.035;",
      );
  };
  anemone.customProgramCacheKey = () => "mariana_anemone_surface_v1";
  const geometries = [
    keep(spongeGeometry()),
    keep(anemoneGeometry()),
    keep(plateGeometry()),
    keep(starGeometry()),
    keep(new THREE.SphereGeometry(0.16, 8, 6).translate(0, 0.12, 0)),
  ];
  const materials = [sponge, anemone, crust, star, glow];
  const ray = new THREE.Raycaster(),
    up = new THREE.Vector3(0, 1, 0),
    normal = new THREE.Vector3(),
    dummy = new THREE.Object3D();
  const records = [];
  root.updateMatrixWorld(true);
  let seed = 7293;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const walls = [];
  root.traverse((n) => {
    if (n.isMesh && /^trench_(side|back)_/.test(n.name)) walls.push(n);
  });
  const buckets = new Map();
  function attach(host, origin, direction, type, scale, section) {
    ray.set(origin, direction);
    ray.far = 5200;
    const hit = ray.intersectObject(host, false)[0];
    if (!hit) return;
    normal.copy(hit.face.normal).transformDirection(host.matrixWorld);
    if (normal.dot(direction) > 0) normal.negate();
    dummy.position.copy(hit.point).addScaledVector(normal, -0.035);
    dummy.quaternion.setFromUnitVectors(up, normal);
    dummy.rotateY(random() * Math.PI * 2);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    const key = `${section}:${type}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(dummy.matrix.clone());
    records.push({
      host: host.name,
      type,
      root: hit.point.toArray(),
      normal: normal.toArray(),
      scale,
      section,
    });
  }
  for (const host of walls) {
    const section = Number(host.name.split("_").at(-1)),
      back = host.name.startsWith("trench_back"),
      side = host.name.includes("_-1_") ? -1 : 1;
    const amount = section > 12 ? 5 : 10;
    for (let patch = 0; patch < amount; patch++) {
      const along = back ? -170 + random() * 340 : -600 + random() * 440,
        y = -section * 180 - 20 - random() * 135;
      for (let item = 0; item < 6; item++) {
        const a = along + (random() - 0.5) * 12,
          yy = y + (random() - 0.5) * 10;
        const origin = back
          ? new THREE.Vector3(a, yy, -530)
          : new THREE.Vector3(0, yy, a);
        const direction = back
          ? new THREE.Vector3(0, 0, -1)
          : new THREE.Vector3(side, 0, 0);
        const type =
          item === 0 ? 0 : item === 1 ? 1 : item === 2 ? 2 : patch % 2 ? 3 : 4;
        attach(
          host,
          origin,
          direction,
          type,
          (type === 4 ? 1.8 : type === 0 ? 3.4 : 2.7) +
            random() * (type === 0 ? 1.8 : 1.4),
          section,
        );
      }
    }
  }
  // 陡坡顶部到下层出口也有附着群落，采样最终地形，避免只装饰两侧而漏掉下降坑面。
  for (let i = 0; i < 120; i++) {
    const z = -90 - random() * 162,
      x = (random() - 0.5) * 350;
    ray.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
    ray.far = 2900;
    const hit = ray.intersectObject(floor, false)[0];
    if (!hit) continue;
    const section = Math.min(15, Math.floor(-hit.point.y / 180));
    const p = hostPoint(floor, hit.face.a),
      q = hostPoint(floor, hit.face.b),
      r = hostPoint(floor, hit.face.c);
    normal.copy(hit.face.normal).transformDirection(floor.matrixWorld);
    if (normal.y < 0) normal.negate();
    for (let j = 0; j < 6; j++) {
      const target = [p, q, r][j % 3],
        point = hit.point.clone().lerp(target, 0.02 + j * 0.009);
      dummy.position.copy(point).addScaledVector(normal, -0.035);
      dummy.quaternion.setFromUnitVectors(up, normal);
      dummy.rotateY(random() * Math.PI * 2);
      dummy.scale.setScalar(0.8 + random() * 1.5);
      dummy.updateMatrix();
      const type = (i + j) % 5,
        key = `${section}:${type}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(dummy.matrix.clone());
      records.push({
        host: floor.name,
        type,
        root: point.toArray(),
        normal: normal.toArray(),
        scale: dummy.scale.x,
        section,
      });
    }
  }
  for (let section = 0; section < 16; section++) {
    const g = group(`trench_marine_${section}`, -section * 180 - 90);
    for (let type = 0; type < 5; type++) {
      const matrices = buckets.get(`${section}:${type}`);
      if (!matrices) continue;
      const mesh = new THREE.InstancedMesh(
        geometries[type],
        materials[type],
        matrices.length,
      );
      mesh.name = `trench_marine_${section}_${materials[type].name}`;
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      const palette =
        section < 4
          ? [0xced6b6, 0xd39378, 0x8aac97, 0xd2b27e]
          : section < 8
            ? [0xa1c8cc, 0x988ed0, 0x7aa1c1, 0xc39da0]
            : section < 12
              ? [0xd1b7ce, 0x9c92c6, 0x8491ac, 0xc6b8a2]
              : [0xd3d4c3, 0xb29ead, 0x9aafb1, 0xdacdb0];
      const tint = new THREE.Color(type === 4 ? 0xffffff : palette[type]);
      for (let i = 0; i < matrices.length; i++) mesh.setColorAt(i, tint);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      g.add(mesh);
    }
  }
  // 开发验收用轻量元数据：每个附着点可重新射线验证，不将宿主或临时几何留在闭包中。
  root.userData.marineAttachments = records;
  return { count: records.length };
}

function spongeGeometry() {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.18, 0),
      new THREE.Vector2(0.25, 0.25),
      new THREE.Vector2(0.42, 0.7),
      new THREE.Vector2(0.63, 1.6),
      new THREE.Vector2(0.59, 2.3),
      new THREE.Vector2(0.48, 2.38),
      new THREE.Vector2(0.4, 2.25),
      new THREE.Vector2(0.44, 1.6),
      new THREE.Vector2(0.27, 0.72),
      new THREE.Vector2(0.1, 0.38),
    ],
    20,
  );
}
function merge(parts) {
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}
function anemoneGeometry() {
  const parts = [
    new THREE.SphereGeometry(0.42, 12, 8)
      .scale(1, 0.75, 1)
      .translate(0, 0.2, 0),
  ];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      r = 0.28;
    const points = [
      new THREE.Vector3(Math.cos(a) * r, 0.2, Math.sin(a) * r),
      new THREE.Vector3(Math.cos(a) * 0.55, 0.6, Math.sin(a) * 0.55),
      new THREE.Vector3(
        Math.cos(a) * 0.92,
        0.98 + (i % 3) * 0.1,
        Math.sin(a) * 0.92,
      ),
      new THREE.Vector3(Math.cos(a) * 1.06, 0.73, Math.sin(a) * 1.06),
    ];
    parts.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        8,
        0.045,
        5,
        false,
      ),
    );
  }
  return merge(parts);
}
function plateGeometry() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.SphereGeometry(1, 14, 6),
      p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k),
        z = p.getZ(k),
        a = Math.atan2(z, x);
      p.setXYZ(
        k,
        x * (1 + Math.sin(a * 7 + i) * 0.1),
        p.getY(k) * 0.07,
        z * (1 + Math.cos(a * 9) * 0.1),
      );
    }
    g.computeVertexNormals();
    g.scale(1 - i * 0.12, 1, 1 - i * 0.12);
    g.translate(
      Math.sin(i * 2.4) * 0.35,
      0.1 + i * 0.16,
      Math.cos(i * 2.4) * 0.3,
    );
    parts.push(g);
  }
  return merge(parts);
}
function starGeometry() {
  const parts = [
    new THREE.SphereGeometry(0.24, 10, 6)
      .scale(1, 0.38, 1)
      .translate(0, 0.1, 0),
  ];
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5,
      points = [];
    for (let j = 0; j < 6; j++) {
      const r = j * 0.27,
        t = a + Math.sin(j * 0.7) * 0.35;
      points.push(
        new THREE.Vector3(
          Math.cos(t) * r,
          0.1 + Math.sin(j * 0.8) * 0.05,
          Math.sin(t) * r,
        ),
      );
    }
    parts.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        12,
        0.065,
        5,
        false,
      ),
    );
  }
  return merge(parts);
}

function hostPoint(host, index) {
  return new THREE.Vector3()
    .fromBufferAttribute(host.geometry.attributes.position, index)
    .applyMatrix4(host.matrixWorld);
}
