import {
  loadPenglaiBrushFont,
  penglaiBrushReady,
  PENGLAI_BRUSH_FAMILY,
} from "./penglai_calligraphy.js";
import { createPenglaiTempleCarvings } from "./penglai_temple_asset.js";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PENGLAI_BIXI } from "./penglai_config.js";
import { getLanguage } from "./i18n.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 赑屃驮碑：临潭山肩上的静态石雕，资源归区域所有，不另建动画循环。 */
export function createPenglaiBixi(parent, keep, colliders) {
  const site = PENGLAI_BIXI,
    root = new THREE.Group();
  root.name = "xuanming_bixi_stele";
  root.position.set(site.x, site.platformY, site.z);
  root.rotation.y = site.yaw || 0;
  parent.add(root);
  const stone = keep(
      new THREE.MeshStandardMaterial({
        color: "#aaa797",
        roughness: 0.96,
        vertexColors: true,
      }),
    ),
    relief = keep(
      new THREE.MeshStandardMaterial({
        color: "#b6b1a0",
        roughness: 0.9,
        vertexColors: true,
      }),
    ),
    buckets = new Map(),
    transform = new THREE.Object3D();
  for (const m of [stone, relief]) addSurfaceDetail(m, "stone", 0.11);
  function part(g, m, p, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    transform.position.set(...p);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    const mesh = g.index ? g.toNonIndexed() : g.clone();
    g.dispose();
    mesh.applyMatrix4(transform.matrix);
    const positions = mesh.attributes.position,
      colors = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i),
        tone =
          0.91 +
          0.05 * Math.sin(x * 1.7 + z * 0.7) * Math.sin(y * 2.3) +
          0.025 * Math.cos(z * 3.9 + y);
      colors.push(tone, tone, tone);
    }
    mesh.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(mesh);
  }
  const block = (m, p, size, radius = 0.5) =>
    part(new RoundedBoxGeometry(...size, 2, radius), m, p);
  const rotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    site.yaw || 0,
  );
  function worldPoint(x, y, z) {
    return new THREE.Vector3(x, y, z)
      .applyQuaternion(rotation)
      .add(root.position);
  }
  function boxCollider(kind, x, y, z, sx, sy, sz) {
    const p = worldPoint(x, y, z);
    colliders.push({
      type: "box",
      kind,
      x: p.x,
      y: p.y,
      z: p.z,
      rotation,
      halfSize: { x: sx / 2, y: sy / 2, z: sz / 2 },
    });
  }
  // 三层石台的底面埋入同源地形，圆角只削边，不制造不可见大墙。
  block(stone, [0, -1.5, 0], [52, 7, 70], 1.2);
  block(relief, [0, 2.2, 0], [49, 1.2, 67], 0.4);
  block(stone, [0, 3.5, 0], [46, 1.8, 64], 0.6);
  boxCollider("bixi_foundation", 0, -0.2, 0, 52, 9.6, 70);
  for (let i = 0; i < 3; i++) {
    const z = 34 + i * 3.2,
      top = 2.8 - i * 1.2;
    block(stone, [0, (top - 5) / 2, z], [18, top + 5, 5.6], 0.3);
    boxCollider("bixi_step", 0, (top - 5) / 2, z, 18, top + 5, 5.6);
  }
  const sculpture = createPenglaiTempleCarvings(keep);
  sculpture("bixi_bearer", root, [0, 13.65, -3], [42, 18.5, 62], colliders);
  // 碑座压入龟背，碑身、双重边框与螭龙碑额有厚度，正背均可辨认。
  block(relief, [0, 20.2, 3], [23, 4.5, 11], 0.65);
  // 四周实体框围住真正凹入的碑面，中央不再堆叠近乎共面的石片和透明字片。
  for (const x of [-8.5, 8.5]) block(stone, [x, 39, 3], [4, 36, 7], 0.45);
  for (const y of [23, 55]) block(stone, [0, y, 3], [14, 4, 7], 0.45);
  boxCollider("bixi_stele", 0, 40, 3, 21, 41, 7);
  for (const side of [-1, 1]) {
    const face = 3 + side * 3.7;
    for (const x of [-9, 9]) block(relief, [x, 38, face], [1.2, 32, 0.7], 0.24);
    for (const y of [22.8, 53.2])
      block(relief, [0, y, face], [18.8, 1.25, 0.7], 0.24);
  }
  sculpture("bixi_crown", root, [0, 60.5, 3], [24, 12, 8.5], colliders);
  for (const [material, parts] of buckets) {
    const merged = keep(mergeGeometries(parts, false));
    parts.forEach((p) => p.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = "bixi_carved_stone";
    root.add(mesh);
  }
  let paintedLanguage, paintedBrush, texture, context;
  loadPenglaiBrushFont();
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    context = canvas.getContext("2d");
    if (context) {
      texture = keep(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const faceMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: "#aaa797",
      map: texture || null,
      roughness: 1,
    }),
  );
  faceMaterial.userData.prepareMaterials = loadPenglaiBrushFont;
  addSurfaceDetail(faceMaterial, "stone", 0.11);
  const faces = [];
  for (const side of [-1, 1]) {
    const face = new THREE.PlaneGeometry(14, 28);
    if (side < 0) face.rotateY(Math.PI);
    face.translate(0, 39, 3 + side * 3);
    faces.push(face);
  }
  const faceGeometry = keep(mergeGeometries(faces, false));
  faces.forEach((face) => face.dispose());
  const inscription = new THREE.Mesh(faceGeometry, faceMaterial);
  inscription.name = "bixi_bilingual_inscription";
  root.add(inscription);
  function update() {
    const language = getLanguage();
    const brush = penglaiBrushReady();
    if (language === paintedLanguage && brush === paintedBrush) return;
    paintedBrush = brush;
    paintedLanguage = language;
    root.userData.language = language;
    root.userData.inscription =
      language === "en" ? "XUANMING · BLACK TORTOISE" : "玄冥深潭 · 玄武镇渊";
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 1024);
    context.fillStyle = "#38463c";
    context.textAlign = "center";
    if (language === "en") {
      context.font = "600 49px Georgia, serif";
      context.fillText("XUANMING", 256, 250, 460);
      context.font = "42px Georgia, serif";
      context.fillText("DEEP BASIN", 256, 340, 450);
      context.font = "600 52px Georgia, serif";
      context.fillText("BLACK", 256, 580, 450);
      context.fillText("TORTOISE", 256, 665, 460);
      context.font = "32px Georgia, serif";
      context.fillText("GUARDS THE DEPTHS", 256, 840, 450);
    } else {
      context.font = `176px ${PENGLAI_BRUSH_FAMILY}`;
      [..."玄冥深潭"].forEach((char, i) =>
        context.fillText(char, 256, 225 + i * 190),
      );
      context.font = `48px ${PENGLAI_BRUSH_FAMILY}`;
      context.fillText("玄武镇渊", 256, 955, 400);
    }
    texture.needsUpdate = true;
  }
  update();
  return { root, update };
}
