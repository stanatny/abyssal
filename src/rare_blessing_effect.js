import * as THREE from "three";

/** 一次珍兽捕获的彩光收束、三环恩赐与星芒；固定12个网格，无灯光与逐帧资源创建。 */
export function createRareBlessingEffect(
  parent,
  { colors, reducedMotion = () => false } = {},
) {
  const palette = (
    colors || ["#60baff", "#bb8eff", "#ff87c6", "#f4f5ff", "#8cf4c9"]
  ).map((color) => new THREE.Color(color));
  const group = new THREE.Group();
  group.name = "rare_blessing";
  group.visible = false;
  parent.add(group);
  const ringGeometry = new THREE.TorusGeometry(1, 0.012, 3, 64, Math.PI * 1.82);
  const vertices = ringGeometry.attributes.position;
  const color = new Float32Array(vertices.count * 3);
  const mix = new THREE.Color();
  for (let i = 0; i < vertices.count; i++) {
    const angle = Math.atan2(vertices.getY(i), vertices.getX(i));
    const u =
      (((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) *
      palette.length;
    const index = Math.floor(u);
    mix
      .copy(palette[index % palette.length])
      .lerp(palette[(index + 1) % palette.length], u - index);
    mix.toArray(color, i * 3);
  }
  ringGeometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  const makeMaterial = (color, vertexColors = false) =>
    new THREE.MeshBasicMaterial({
      color,
      vertexColors,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
  const rings = Array.from({ length: 3 }, () => {
    const mesh = new THREE.Mesh(ringGeometry, makeMaterial(0xffffff, true));
    group.add(mesh);
    return mesh;
  });
  const starGeometry = new THREE.OctahedronGeometry(0.065);
  const stars = Array.from({ length: 9 }, (_, i) => {
    const mesh = new THREE.Mesh(
      starGeometry,
      makeMaterial(palette[i % palette.length]),
    );
    group.add(mesh);
    return mesh;
  });
  const origin = new THREE.Vector3();
  let age = 0,
    size = 1,
    active = false,
    quiet = false,
    disposed = false;
  const duration = 2.6;
  function emit(point, length = 5) {
    if (disposed || !point || !Number.isFinite(point.x + point.y + point.z))
      return false;
    origin.copy(point);
    group.position.copy(point);
    size = THREE.MathUtils.clamp(length * 0.48, 3, 17);
    quiet = reducedMotion();
    age = 0;
    active = group.visible = true;
    return true;
  }
  function update(dt, cameraPosition, playerPosition) {
    if (!active || disposed) return;
    age += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (age >= duration) {
      reset();
      return;
    }
    const gather = quiet ? 1 : THREE.MathUtils.smoothstep(age, 0, 0.5);
    group.position.copy(origin).lerp(playerPosition, gather);
    group.lookAt(cameraPosition);
    const alpha =
      Math.min(1, age / 0.16) *
      THREE.MathUtils.clamp((duration - age) / 0.85, 0, 1);
    group.scale.setScalar(size * (quiet ? 1 : 0.65 + 0.35 * gather));
    rings.forEach((mesh, i) => {
      const turn = quiet ? 0 : age * (i % 2 ? -0.32 : 0.26);
      mesh.rotation.set(i * 0.28, (i - 1) * 0.26, i * 2.1 + turn);
      mesh.scale.setScalar(
        0.78 + i * 0.16 + (quiet ? 0 : Math.sin(age * 2 + i) * 0.018),
      );
      mesh.material.opacity = alpha * (i === 1 ? 0.85 : 0.55);
    });
    stars.forEach((mesh, i) => {
      const a = (i * Math.PI * 2) / stars.length + (quiet ? 0 : age * 0.2);
      const radius = 0.8 + (i % 3) * 0.13;
      mesh.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0.08);
      mesh.scale.set(0.62, 1.2, 0.62);
      mesh.rotation.z = -a;
      mesh.material.opacity = alpha * 0.9;
    });
  }
  function reset() {
    active = group.visible = false;
    age = 0;
  }
  return {
    group,
    emit,
    update,
    reset,
    get active() {
      return active;
    },
    dispose() {
      if (disposed) return;
      reset();
      disposed = true;
      group.removeFromParent();
      ringGeometry.dispose();
      starGeometry.dispose();
      for (const mesh of [...rings, ...stars]) mesh.material.dispose();
      group.clear();
    },
  };
}
