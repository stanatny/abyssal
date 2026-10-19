import * as THREE from "three";
import { acquireHawaiiVehicleAsset } from "./hawaii_vehicle_asset.js";

/** 图鉴与真实载具共用 HF 艇壳；只有独立转子和真实发射事件的有限气泡参与动画。 */
export function createHawaiiVehicleModel(kind, length) {
  const asset = acquireHawaiiVehicleAsset(kind),
    root = new THREE.Group();
  root.name = kind === "submarine" ? kind : "submarine_attack_torpedo";
  root.scale.setScalar(length);
  const body = new THREE.Mesh(asset.geometry, asset.material);
  body.name = `${kind}_pressure_shell`;
  root.add(body);
  const fit = asset.data.fittings;
  body.position.y = -fit.axisY;
  const rotor = new THREE.Mesh(asset.rotorGeometry, asset.rotorMaterial);
  rotor.name = `${kind}_independent_propeller`;
  rotor.position.set(0, 0, fit.rotorZ);
  rotor.scale.setScalar(fit.rotorRadius);
  root.add(rotor);
  let disposed = false;
  const effects =
    kind === "submarine" ? makeDefenseVisual(root, body, length) : null;
  root.userData.kind = kind;
  root.userData.length = length;
  root.userData.artRevision = "trellis_hawaii_vehicles_20261020";
  root.userData.prepareMaterials = asset.prepare;
  root.userData.vehicleArt = { body, rotor, effects };
  root.userData.animate = (now) => {
    if (disposed || !Number.isFinite(now)) return;
    rotor.rotation.z = now * (kind === "submarine" ? 5 : 24);
    effects?.update(now);
  };
  if (effects) {
    root.userData.setDefenseVisual = effects.setWarning;
    root.userData.launchTorpedoVisual = effects.launch;
    root.userData.resetDefenseVisual = effects.reset;
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    effects?.dispose();
    asset.release();
    root.removeFromParent();
  };
  root.userData.dispose = dispose;
  root.userData.disposeLocalMotion = dispose;
  asset.prepare();
  return root;
}

/** 射流沿原规则的真实发射方向，从艇壳表面扩散到原有艇外生成点，不改变弹道或伤害。 */
function makeDefenseVisual(root, body, length) {
  const glow = new THREE.MeshBasicMaterial({ color: 0xe6bd72 });
  const lampGeometry = new THREE.SphereGeometry(0.006, 8, 6);
  const lamps = new THREE.InstancedMesh(lampGeometry, glow, 2);
  lamps.name = "submarine_pressure_indicators";
  const matrix = new THREE.Object3D(),
    ray = new THREE.Raycaster();
  const direction = new THREE.Vector3(),
    inverse = new THREE.Quaternion();
  // 在单位艇壳上射线定位，避免把灯和喷口贴在名义圆柱外而悬空。
  const probe = new THREE.Mesh(
    body.geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  probe.position.copy(body.position);
  probe.updateMatrixWorld(true);
  const surface = (dir, target) => {
    ray.set(dir.clone().multiplyScalar(2), dir.clone().negate());
    const hit = ray.intersectObject(probe, false)[0];
    return hit
      ? target.copy(hit.point).addScaledVector(dir, 0.004)
      : target.copy(dir).multiplyScalar(0.12);
  };
  for (let side = -1, i = 0; side <= 1; side += 2, i++) {
    direction.set(side, 0.16, -0.7).normalize();
    surface(direction, matrix.position);
    matrix.scale.setScalar(1);
    matrix.updateMatrix();
    lamps.setMatrixAt(i, matrix.matrix);
  }
  root.add(lamps);
  const bubblesMaterial = new THREE.MeshBasicMaterial({
    color: 0xcce6e4,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const bubbleGeometry = new THREE.IcosahedronGeometry(1, 1);
  const bubbles = new THREE.InstancedMesh(bubbleGeometry, bubblesMaterial, 18);
  bubbles.name = "submarine_ejection_water";
  bubbles.frustumCulled = false;
  bubbles.visible = false;
  // 瞬时水花不参与实体取景；未激活实例的单位球不能扩大图鉴的艇身包围盒。
  bubbles.boundingBox = new THREE.Box3();
  bubbles.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
  root.add(bubbles);
  const launchDirection = new THREE.Vector3(0, 0, -1),
    origin = new THREE.Vector3(),
    across = new THREE.Vector3(),
    up = new THREE.Vector3();
  let firedAt = -Infinity,
    warning = null;
  function setWarning(remaining, aim, now) {
    warning = Number.isFinite(remaining) ? remaining : null;
    glow.color.setHex(warning === null ? 0x91b7b4 : 0xffae57);
    glow.color.multiplyScalar(
      warning === null ? 0.7 : 0.85 + 0.15 * Math.sin(now * 13),
    );
  }
  function launch(aim, now) {
    if (!aim || aim.lengthSq() < 0.001) return;
    root.updateWorldMatrix(true, false);
    root.getWorldQuaternion(inverse).invert();
    launchDirection.copy(aim).applyQuaternion(inverse).normalize();
    surface(launchDirection, origin);
    across.set(0, 1, 0);
    if (Math.abs(launchDirection.y) > 0.9) across.set(1, 0, 0);
    across.cross(launchDirection).normalize();
    up.crossVectors(launchDirection, across).normalize();
    firedAt = now;
    bubbles.visible = true;
    update(now);
  }
  function update(now) {
    const age = now - firedAt;
    bubbles.visible = age >= 0 && age < 0.72;
    if (!bubbles.visible) return;
    const fade = 1 - age / 0.72;
    bubblesMaterial.opacity = 0.5 * fade;
    const distance = Math.max(0.02, 11 / length - origin.dot(launchDirection));
    for (let i = 0; i < 18; i++) {
      const step = i / 17,
        phase = i * 2.39996,
        spread = (0.004 + age * 0.026) * (0.4 + step);
      matrix.position
        .copy(origin)
        .addScaledVector(
          launchDirection,
          distance * Math.min(1, age * 5 + step * 0.24),
        );
      matrix.position
        .addScaledVector(across, Math.cos(phase) * spread)
        .addScaledVector(up, Math.sin(phase) * spread);
      matrix.scale.setScalar((0.005 + age * 0.014) * (0.7 + (i % 3) * 0.2));
      matrix.updateMatrix();
      bubbles.setMatrixAt(i, matrix.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  }
  function reset() {
    firedAt = -Infinity;
    warning = null;
    bubbles.visible = false;
    setWarning(null, null, 0);
  }
  reset();
  return {
    lamps,
    bubbles,
    origin,
    launchDirection,
    setWarning,
    launch,
    update,
    reset,
    dispose() {
      lamps.dispose();
      bubbles.dispose();
      lampGeometry.dispose();
      glow.dispose();
      bubbleGeometry.dispose();
      bubblesMaterial.dispose();
      probe.material.dispose();
    },
  };
}
