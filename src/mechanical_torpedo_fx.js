import * as THREE from "three";

/**
 * 四组复用水压爆炸与一批尾迹气泡；峰值、扩散、涟漪、消退由主循环驱动。
 * @param {THREE.Object3D} parent 场景根节点。
 * @returns {object} burst、update、reset、dispose接口与成本可查的固定资源池。
 */
export function createMechanicalTorpedoFx(parent) {
  const root = new THREE.Group();
  root.name = "mechanical_torpedo_fx";
  parent.add(root);
  const geo = new THREE.TorusGeometry(1, 0.025, 6, 64),
    texture = glowTexture();
  const sphere = new THREE.SphereGeometry(0.15, 6, 5);
  const bubbleMat = new THREE.MeshBasicMaterial({
    color: 0xafe0ec,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const bubbles = new THREE.InstancedMesh(sphere, bubbleMat, 120);
  bubbles.frustumCulled = false;
  root.add(bubbles);
  const events = Array.from({ length: 4 }, () => {
    const group = new THREE.Group();
    root.add(group);
    group.visible = false;
    const flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: 0xc3f6ff,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    );
    group.add(flash);
    const rings = Array.from({ length: 2 }, (_, i) => {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: i ? 0x487da0 : 0x96e2ed,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      m.rotation.x = i ? Math.PI / 2 : Math.PI * 0.28;
      group.add(m);
      return m;
    });
    return { group, flash, rings, age: 0, active: false, radius: 14 };
  });
  const dummy = new THREE.Object3D(),
    temp = new THREE.Vector3();
  let cursor = 0,
    disposed = false;
  function burst(point, radius = 14) {
    if (disposed) return;
    const e = events[cursor++ % events.length];
    e.group.position.copy(point);
    e.age = 0;
    e.radius = radius;
    e.active = true;
    e.group.visible = true;
  }
  function update(dt, shots = []) {
    if (disposed || !(dt > 0)) return;
    let count = 0;
    for (const e of events) {
      if (!e.active) continue;
      e.age += dt;
      if (e.age >= 1.35) {
        e.active = false;
        e.group.visible = false;
        continue;
      }
      const t = e.age / 1.35;
      e.flash.scale.setScalar(
        2 + Math.sin((Math.min(1, t * 5) * Math.PI) / 2) * e.radius * 0.7,
      );
      e.flash.material.opacity = 0.5 * Math.exp(-t * 9);
      e.rings.forEach((m, i) => {
        const a = Math.max(0, (t - i * 0.08) / (1 - i * 0.08));
        m.scale.setScalar(1 + e.radius * a);
        m.material.opacity = Math.max(0, 0.35 * (1 - a) ** 2);
      });
      for (let i = 0; i < 24; i++) {
        const theta = i * 2.399963,
          y = 1 - (2 * (i + 0.5)) / 24,
          r = Math.sqrt(1 - y * y),
          travel = e.radius * 0.55 * t;
        temp
          .set(Math.cos(theta) * r, y, Math.sin(theta) * r)
          .multiplyScalar(travel)
          .add(e.group.position);
        temp.y += t * 0.7;
        dummy.position.copy(temp);
        dummy.scale.setScalar((0.6 + t) * (1 - t));
        dummy.updateMatrix();
        bubbles.setMatrixAt(count++, dummy.matrix);
      }
    }
    for (const p of shots) {
      if (!p.active) continue;
      for (let i = 0; i < 12; i++) {
        dummy.position
          .copy(p.mesh.position)
          .addScaledVector(p.direction, -1.3 - i * 0.55);
        dummy.position.y += Math.sin(i * 1.7 + p.distance * 0.4) * 0.08;
        dummy.scale.setScalar(0.6 + i * 0.025);
        dummy.updateMatrix();
        bubbles.setMatrixAt(count++, dummy.matrix);
      }
    }
    bubbles.count = count;
    bubbles.visible = count > 0;
    if (count) bubbles.instanceMatrix.needsUpdate = true;
  }
  function reset() {
    for (const e of events) {
      e.active = false;
      e.group.visible = false;
      e.age = 0;
    }
    bubbles.visible = false;
    bubbles.count = 0;
  }
  reset();
  return {
    root,
    events,
    bubbles,
    burst,
    update,
    reset,
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      root.removeFromParent();
      geo.dispose();
      sphere.dispose();
      bubbleMat.dispose();
      texture.dispose();
      bubbles.dispose();
      for (const e of events) {
        e.flash.material.dispose();
        e.rings.forEach((m) => m.material.dispose());
      }
    },
  };
}
function glowTexture() {
  const size = 32,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(
          ((x + 0.5) / size) * 2 - 1,
          ((y + 0.5) / size) * 2 - 1,
        ),
        i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(
        Math.max(0, (1 - r * r) ** 3) * (r < 1 ? 255 : 0),
      );
    }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  return texture;
}
