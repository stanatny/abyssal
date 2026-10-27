import * as THREE from "three";
import { getLanguage } from "./i18n.js";

export const PENGLAI_BRUSH_FAMILY =
  '"Penglai Brush", "STKaiti", "KaiTi", serif';
let fontReady = false,
  pending = null;
export const penglaiBrushReady = () => fontReady;

/** 本地小字库跨场景复用；异步只更新就绪标志，不持有已释放碑面或回调。 */
export function loadPenglaiBrushFont() {
  if (
    fontReady ||
    typeof FontFace === "undefined" ||
    !globalThis.document?.fonts
  )
    return Promise.resolve(fontReady);
  if (pending) return pending;
  const font = new FontFace(
    "Penglai Brush",
    `url(${new URL("./assets/fonts/penglai-brush.woff2", import.meta.url).href})`,
  );
  pending = font
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      fontReady = true;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** 不依赖系统字体，切换语言或字库完成后才重绘；使用单张不透明牌面。 */
export function createPenglaiTemplePlaque(keep) {
  let context, texture, painted;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 468;
    context = canvas.getContext("2d");
    if (context) {
      texture = keep(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const material = keep(
    new THREE.MeshStandardMaterial({
      map: texture || null,
      color: texture ? "#ffffff" : "#293e38",
      roughness: 0.83,
    }),
  );
  material.userData.prepareMaterials = loadPenglaiBrushFont;
  function update() {
    const language = getLanguage(),
      state = language + ":" + fontReady;
    if (!context || painted === state) return;
    painted = state;
    const c = context;
    c.fillStyle = "#263b35";
    c.fillRect(0, 0, 1536, 468);
    // 细小漆面纹理在底色中，不叠透明图层，也不让随机闪动进入每帧。
    for (let i = 0; i < 2400; i++) {
      c.fillStyle = `rgba(144,124,78,${0.025 + (i % 5) * 0.005})`;
      c.fillRect((i * 571) % 1536, (i * 83) % 468, 2 + (i % 13), 1);
    }
    c.strokeStyle = "#9d8d60";
    c.lineWidth = 9;
    c.strokeRect(23, 22, 1490, 424);
    c.lineWidth = 3;
    c.strokeRect(40, 39, 1456, 390);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#d2bd7b";
    if (language === "en") {
      c.font = "600 88px Georgia, serif";
      c.fillText("SPIRIT GUIDES", 768, 174, 1350);
      c.font = "600 88px Georgia, serif";
      c.fillText("THE SWORD", 768, 300, 1350);
    } else {
      c.font = `326px ${PENGLAI_BRUSH_FAMILY}`;
      [..."以气御剑"].forEach((char, i) =>
        c.fillText(char, 285 + i * 326, 238),
      );
    }
    texture.needsUpdate = true;
  }
  loadPenglaiBrushFont();
  update();
  return { material, update };
}
