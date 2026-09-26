import * as THREE from "three";

export const REWARDS = Object.freeze({
  stamina: {
    name: "体力泉",
    symbol: "＋",
    color: "#85ffd1",
    effect: "体力立即回满",
  },
  flow: {
    name: "洋流之息",
    symbol: "»",
    color: "#70d8ff",
    effect: "12 秒冲刺不耗体力",
  },
  frenzy: {
    name: "深渊狂食",
    symbol: "⌁",
    color: "#ffba70",
    effect: "10 秒越级捕食",
  },
});

// 奖励始终带图形和名称，远近距离分别读取轮廓与用途。
export function createReward(kind) {
  const info = REWARDS[kind],
    group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: info.color });
  const core = new THREE.Group();
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
  group.add(core, ring);
  const label = makeLabel(
    `${info.symbol} ${info.name}`,
    info.effect,
    info.color,
  );
  label.position.y = 3;
  label.scale.set(10, 2.5, 1);
  group.add(label);
  group.userData.core = core;
  group.userData.label = label;
  return group;
}

export function makeLabel(title, subtitle, color = "#aaffdf") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(3,24,35,0.82)";
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 128, 16);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 5, 128);
  ctx.textAlign = "center";
  ctx.font = "600 34px sans-serif";
  ctx.fillText(title, 256, 50);
  ctx.fillStyle = "#d0e8ea";
  ctx.font = "25px sans-serif";
  ctx.fillText(subtitle, 256, 95);
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
