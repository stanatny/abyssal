import * as THREE from "three";
import { preyCaptureRadius, frenzyReachBonus } from "./prey_capture.js";

/**
 * 创建向嘴部收束的狂食水流；位置与小鱼实际吸引区一致，软边短流带沿弧线内收。
 * 参数scene为现有场景；返回update/reset/dispose，复用固定缓冲区且不创建额外循环。
 */
export function createFrenzyEffect(scene) {
  const root = new THREE.Group();
  root.name = "frenzy_intake";
  root.visible = false;
  scene.add(root);
  const streams = 14,
    segments = 16;
  const positions = new Float32Array(streams * (segments + 1) * 2 * 3);
  const uv = [],
    indices = [];
  for (let i = 0; i < streams; i++)
    for (let j = 0; j <= segments; j++) {
      uv.push(j / segments, 0, j / segments, 1);
      if (j < segments) {
        const a = (i * (segments + 1) + j) * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  const pixels = new Uint8Array(32 * 16 * 4);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 32; x++) {
      const p = (y * 32 + x) * 4;
      pixels[p] = pixels[p + 1] = pixels[p + 2] = 255;
      pixels[p + 3] = Math.round(
        255 *
          Math.sin((Math.PI * x) / 31) ** 0.7 *
          Math.sin((Math.PI * y) / 15) ** 2,
      );
    }
  const texture = new THREE.DataTexture(pixels, 32, 16);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    color: "#ffe1b1",
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const ribbons = new THREE.Mesh(geometry, material);
  ribbons.frustumCulled = false;
  root.add(ribbons);
  const direction = new THREE.Vector3(),
    side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let intensity = 0,
    disposed = false;
  return {
    root,
    update({ active, dt, time, position, length, highQuality = true }) {
      intensity = THREE.MathUtils.damp(
        intensity,
        active ? 1 : 0,
        active ? 6 : 9,
        dt,
      );
      root.visible = intensity > 0.015;
      if (!root.visible) return;
      root.position.copy(position);
      const radius =
        preyCaptureRadius(length, 0.8, false, true) + frenzyReachBonus(length);
      root.userData.radius = radius;
      material.opacity = intensity * 0.38;
      const count = highQuality ? streams : 8;
      geometry.setDrawRange(0, count * segments * 6);
      for (let i = 0; i < count; i++) {
        const phase = (time * 0.52 + i * 0.618034) % 1;
        const y = -0.85 + ((i * 0.754877) % 1) * 1.7;
        const horizontal = Math.sqrt(1 - y * y);
        for (let j = 0; j <= segments; j++) {
          const travel = THREE.MathUtils.clamp(
            phase + (j / segments - 0.5) * 0.32,
            0,
            1,
          );
          const radial = radius * (1 - travel) ** 0.78;
          const azimuth = i * 2.399963 + travel * 1.25;
          direction.set(
            Math.cos(azimuth) * horizontal,
            y,
            Math.sin(azimuth) * horizontal,
          );
          side.crossVectors(direction, up).normalize();
          const width =
            (0.045 + Math.min(length, 25) * 0.002) * Math.sin(travel * Math.PI);
          const offset = (i * (segments + 1) + j) * 6;
          for (let edge = 0; edge < 2; edge++) {
            const sign = edge ? 1 : -1;
            positions[offset + edge * 3] =
              direction.x * radial + side.x * width * sign;
            positions[offset + edge * 3 + 1] =
              direction.y * radial + side.y * width * sign;
            positions[offset + edge * 3 + 2] =
              direction.z * radial + side.z * width * sign;
          }
        }
      }
      geometry.attributes.position.needsUpdate = true;
    },
    reset() {
      intensity = 0;
      root.visible = false;
      material.opacity = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
