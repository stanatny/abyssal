import * as THREE from "three";
import { createFluidTexture } from "./effect_textures.js";

/** 嘴边的短促向内水流；固定十个对象，连续进食只续用同一通道。 */
export function createSwallowEffect(
  parent,
  { reducedMotion = () => false } = {},
) {
  const group = new THREE.Group();
  group.name = "swallow_intake_flow";
  group.visible = false;
  group.matrixAutoUpdate = false;
  parent.add(group);
  const geometry = new THREE.TorusGeometry(1, 0.011, 3, 20, Math.PI * 0.58);
  const arcs = Array.from({ length: 2 }, () => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xb9dcd8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    group.add(mesh);
    return mesh;
  });
  const texture = createFluidTexture("bubble");
  const bubbles = Array.from({ length: 8 }, () => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: 0xd5e9e6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    group.add(sprite);
    return sprite;
  });
  const normal = new THREE.Vector3(),
    position = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    placement = new THREE.Matrix4(),
    inverse = new THREE.Matrix4();
  let active = false,
    disposed = false,
    age = 0,
    remaining = 0,
    radius = 0.3,
    quiet = false;
  function emit(preyLength, bodyLength) {
    if (
      disposed ||
      !Number.isFinite(preyLength + bodyLength) ||
      preyLength <= 0 ||
      bodyLength <= 0
    )
      return false;
    const nextRadius = THREE.MathUtils.clamp(
      bodyLength * 0.095 + Math.sqrt(preyLength) * 0.08,
      0.28,
      1.8,
    );
    radius = active ? Math.max(radius, nextRadius) : nextRadius;
    if (!active) age = 0;
    quiet = Boolean(reducedMotion());
    remaining = 0.62;
    active = group.visible = true;
    return true;
  }
  function update(dt, { mouth, direction } = {}) {
    if (
      !active ||
      disposed ||
      !Number.isFinite(dt) ||
      dt <= 0 ||
      !mouth ||
      !direction ||
      !Number.isFinite(mouth.x + mouth.y + mouth.z) ||
      !Number.isFinite(direction.x + direction.y + direction.z) ||
      direction.x ** 2 + direction.y ** 2 + direction.z ** 2 < 1e-12
    )
      return;
    age += dt;
    remaining -= dt;
    if (remaining <= 0) return reset();
    normal.copy(direction).normalize();
    position.copy(mouth).addScaledVector(normal, radius * 0.12);
    rotation.setFromUnitVectors(Z, normal);
    placement.compose(position, rotation, UNIT);
    parent.updateWorldMatrix(true, false);
    group.matrix
      .copy(inverse.copy(parent.matrixWorld).invert())
      .multiply(placement);
    group.matrixWorldNeedsUpdate = true;
    const fade = Math.min(1, age / 0.07, remaining / 0.16);
    arcs.forEach((mesh, i) => {
      const u = quiet ? 0.45 + i * 0.2 : (age * 1.8 + i * 0.46) % 1;
      const size = radius * (1 - u * 0.82);
      mesh.scale.setScalar(size);
      mesh.position.z = radius * (0.3 - u * 0.35);
      mesh.rotation.z = i * 3.4 + (quiet ? 0 : u * 0.7);
      mesh.material.opacity =
        fade * (quiet ? 0.17 : Math.sin(u * Math.PI) * 0.3);
    });
    bubbles.forEach((sprite, i) => {
      const u = quiet ? 0.55 : (age * 1.55 + i / bubbles.length) % 1;
      const angle = i * 2.39996 + (quiet ? 0 : u * 0.65);
      const orbit = radius * (0.85 - u * 0.75);
      sprite.position.set(
        Math.cos(angle) * orbit,
        Math.sin(angle) * orbit,
        radius * (0.38 - u * 0.48),
      );
      sprite.scale.setScalar(radius * (0.1 + (i % 3) * 0.025));
      sprite.material.opacity =
        fade * (quiet ? 0.15 : Math.sin(u * Math.PI) * 0.38);
    });
  }
  function reset() {
    active = group.visible = false;
    remaining = age = 0;
  }
  return {
    group,
    emit,
    update,
    reset,
    snapshot: () => ({
      active,
      age,
      remaining,
      radius,
      quiet,
      objects: group.children.length,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      group.removeFromParent();
      geometry.dispose();
      texture.dispose();
      for (const node of [...arcs, ...bubbles]) node.material.dispose();
      group.clear();
    },
  };
}

const Z = new THREE.Vector3(0, 0, 1),
  UNIT = new THREE.Vector3(1, 1, 1);
