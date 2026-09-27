import * as THREE from "three";

import { REWARDS } from "./reward_config.js";
export { REWARDS } from "./reward_config.js";

// 海中只保留图形和名称；详细效果放入首页图鉴。
export function createReward(kind) {
  const info = REWARDS[kind],
    group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: info.color });
  const core = new THREE.Group();
  // 中心宝石锚定轮廓，旋转时各角度都有可读形体。
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), material);
  core.add(gem);
  if (kind === "stamina") {
    core.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 2, 0.45), material));
    core.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.45, 0.45), material));
  } else if (kind === "flow") {
    for (const x of [-0.45, 0.45]) {
      const shape = new THREE.Shape();
      shape.moveTo(x - 0.3, -0.7);
      shape.lineTo(x + 0.35, 0);
      shape.lineTo(x - 0.3, 0.7);
      shape.lineTo(x - 0.1, 0);
      shape.closePath();
      core.add(
        new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.18,
            bevelEnabled: false,
          }),
          material,
        ),
      );
    }
  } else {
    const jaw = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.1, 5, 18, Math.PI * 1.55),
      material,
    );
    jaw.rotation.z = -Math.PI * 0.27;
    core.add(jaw);
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.9, 5),
        material,
      );
      fang.position.set(side * 0.7, -0.1, 0);
      fang.rotation.z = side * 0.55;
      core.add(fang);
    }
  }
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.65, 0.035, 5, 36),
    material,
  );
  const gyro = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.03, 5, 30),
    material,
  );
  gyro.rotation.x = Math.PI / 2.4;
  core.add(gyro);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: info.color,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.scale.setScalar(6.5);
  group.add(core, ring, halo);
  const label = makeLabel(`${info.symbol} ${info.name}`, "", info.color);
  label.position.y = 3;
  label.scale.set(8, 1.25, 1);
  group.add(label);
  group.userData.core = core;
  group.userData.label = label;
  return group;
}

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 31);
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.3)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function makeLabel(title, subtitle, color = "#aaffdf") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = subtitle ? 128 : 80;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(3,24,35,0.82)";
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, canvas.height, 16);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 5, canvas.height);
  ctx.textAlign = "center";
  ctx.font = "600 34px sans-serif";
  ctx.fillText(title, 256, 50);
  ctx.fillStyle = "#d0e8ea";
  ctx.font = "25px sans-serif";
  if (subtitle) ctx.fillText(subtitle, 256, 95);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
}
