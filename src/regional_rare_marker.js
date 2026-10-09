import * as THREE from "three";
import { rareMarkerPalette } from "./regional_rare_palette.js";
let markerMaterial;
let glowMaterial;
let glintMaterial;
/** 远处渐隐，避免把微光变成全海域的定位灯；有限近景不增加真实光源。 */
export function rareShimmerVisibility(distance) {
  const u = THREE.MathUtils.clamp((distance - 65) / 115, 0, 1);
  return 1 - u * u * (3 - 2 * u);
}
/** 柔光虹彩菱形是珍兽专属标识；接受深度遮挡，不隔墙提示位置。 */
export function attachRareMarker(root) {
  if (root.userData.updateRareShimmer)
    return root.getObjectByName("regional_rare_marker");
  if (!markerMaterial) {
    const palette = rareMarkerPalette();
    const spectrum = (ctx, size) => {
      const g = ctx.createConicGradient(-Math.PI / 2, size / 2, size / 2);
      palette.forEach((color, i) => g.addColorStop(i / palette.length, color));
      g.addColorStop(1, palette[0]);
      return g;
    };
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const c = canvas.getContext("2d");
    c.strokeStyle = spectrum(c, 128);
    c.shadowColor = palette[1];
    c.shadowBlur = 7;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(64, 18);
    c.lineTo(100, 64);
    c.lineTo(64, 110);
    c.lineTo(28, 64);
    c.closePath();
    c.stroke();
    c.fillStyle = spectrum(c, 128);
    c.beginPath();
    c.arc(64, 64, 7, 0, Math.PI * 2);
    c.fill();
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    markerMaterial = new THREE.SpriteMaterial({
      map,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    // 虹彩经径向透明遮罩淡出；正常混合，不产生叠加白核或真实光源。
    const texture = (draw) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      draw(canvas.getContext("2d"));
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    glowMaterial = new THREE.SpriteMaterial({
      map: texture((ctx) => {
        ctx.fillStyle = spectrum(ctx, 64);
        ctx.fillRect(0, 0, 64, 64);
        ctx.globalCompositeOperation = "destination-in";
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
        g.addColorStop(0, "rgba(255,255,255,0.55)");
        g.addColorStop(0.45, "rgba(255,255,255,0.28)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      }),
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    glintMaterial = new THREE.SpriteMaterial({
      map: texture((ctx) => {
        ctx.fillStyle = spectrum(ctx, 64);
        ctx.beginPath();
        ctx.moveTo(32, 3);
        ctx.lineTo(38, 25);
        ctx.lineTo(59, 32);
        ctx.lineTo(38, 39);
        ctx.lineTo(32, 61);
        ctx.lineTo(26, 39);
        ctx.lineTo(5, 32);
        ctx.lineTo(26, 25);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = "destination-in";
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 29);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.35, "rgba(255,255,255,0.75)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      }),
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
  }
  // 贴图共用，透明度每个实例独立；缓存种群最多各海域一套，不逐帧分配。
  const marker = new THREE.Sprite(markerMaterial.clone());
  marker.name = "regional_rare_marker";
  marker.position.set(0, 0.55, 0);
  marker.scale.setScalar(0.75);
  root.add(marker);
  const halo = new THREE.Sprite(glowMaterial.clone());
  halo.name = "regional_rare_glow";
  halo.scale.setScalar(1.1);
  root.add(halo);
  const glints = [];
  const material = glintMaterial.clone();
  for (let i = 0; i < 4; i++) {
    const glint = new THREE.Sprite(material);
    glint.name = "regional_rare_glint";
    root.add(glint);
    glints.push(glint);
  }
  root.userData.updateRareShimmer = (time, distance, reducedMotion = false) => {
    const strength = rareShimmerVisibility(distance);
    const t = reducedMotion ? 0 : time;
    marker.visible = halo.visible = strength > 0;
    marker.material.opacity = strength * (0.7 + Math.sin(t * 2.1) * 0.12);
    marker.scale.setScalar(0.75 + Math.sin(t * 2.1) * 0.025);
    halo.material.opacity = strength * (0.48 + Math.sin(t * 1.7) * 0.08);
    material.opacity = strength * 0.7;
    for (let i = 0; i < glints.length; i++) {
      const a = t * 0.65 + i * Math.PI * 0.5;
      const glint = glints[i];
      glint.visible = strength > 0;
      glint.position.set(
        Math.cos(a) * 0.22,
        0.06 + Math.sin(a * 1.3) * 0.16,
        Math.sin(a) * 0.36,
      );
      glint.scale.setScalar(0.095 + 0.035 * Math.sin(t * 2.7 + i * 1.7));
    }
  };
  root.userData.updateRareShimmer(0, 0);
  return marker;
}
