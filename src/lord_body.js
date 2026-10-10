import * as THREE from "three";

// 只取承重躯干和头骨；鳍、翅、触腕之间的空水域不能成为一整块障碍。
const CORE =
  /^(kraken_ribbed_mantle|gran_maja_continuous_swimming_body|gran_maja_(upper|lower)_head_disc|hydra_broad_torso|hydra_carved_skull|leviathan_armored_torso|leviathan_predator_skull|three_lobed_mantle|long_mantle|long_continuous_serpent|flattened_serpent_skull|serpent_mandible|scylla_armored_core|scylla_head\d_sculpted_skull|karkinos_sculpted_carapace|massive_turtle_carapace|thick_turtle_plastron|broad_robed_torso|sculpted_human_head)$/;
const KEYS =
  /^(white_tiger_feline_torso_v4|bird_v2_vermilion_bird|dragon_v2_azure_dragon_\d+|xuanwu_blocky_turtle_skull)$/;
const KINDS = new Set([
  "kraken",
  "mayan",
  "hydra",
  "leviathan",
  "abyss_weaver",
  "lumen_stalker",
  "yacumama",
  "rootjaw",
  "azure_dragon",
  "white_tiger",
  "vermilion_bird",
  "black_tortoise",
  "sword_sage",
  "scylla",
  "charybdis",
  "karkinos",
]);
const point = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const scale = new THREE.Vector3();
const orientation = new THREE.Quaternion();
const posedBounds = new THREE.Box3();

/** 合批前读取真实解剖截面；静态部件只保留截面数值与仍在场景中的关节。 */
export function prepareLordBody(root, kind) {
  if (!KINDS.has(kind) || root.userData.lordBody) return;
  const sections = [];
  root.traverse((part) => {
    if (!part.isMesh) return;
    const crocodile =
      kind === "rootjaw" &&
      (part.isSkinnedMesh ||
        (part.parent?.name === "crocodilian_head" &&
          part.geometry.attributes.position.count > 1800));
    if (part.name === "charybdis_annular_armored_hull") {
      // 环形外壳分段，保留中央口器的凹陷和通水孔。
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        sections.push(
          makeSection(
            part,
            new THREE.Vector3(
              Math.cos(angle) * 0.285,
              Math.sin(angle) * 0.285,
              0.05,
            ),
            new THREE.Vector3(0.113, 0.098, 0.194),
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1),
              angle,
            ),
          ),
        );
      }
      return;
    }
    if (
      !CORE.test(part.name) &&
      !KEYS.test(part.userData.anatomyKey || "") &&
      !crocodile
    )
      return;
    const vertices = part.geometry.attributes.position;
    const box = new THREE.Box3().setFromBufferAttribute(vertices);
    const size = box.getSize(new THREE.Vector3());
    const axis = ["x", "y", "z"].sort((a, b) => size[b] - size[a])[0];
    const others = ["x", "y", "z"].filter((a) => a !== axis);
    const ratio =
      size[axis] / Math.max(size[others[0]], size[others[1]], 0.001);
    const count = ratio > 1.6 ? Math.min(12, Math.ceil(ratio * 2)) : 1;
    const span = size[axis] / count;
    for (let i = 0; i < count; i++) {
      const low = box.min[axis] + i * span;
      const high = low + span;
      const indices = [];
      const sectionBox = new THREE.Box3();
      for (let j = 0; j < vertices.count; j++) {
        point.fromBufferAttribute(vertices, j);
        if (point[axis] < low - span * 0.08 || point[axis] > high + span * 0.08)
          continue;
        sectionBox.expandByPoint(point);
        indices.push(j);
      }
      if (!indices.length) continue;
      const center = sectionBox.getCenter(new THREE.Vector3());
      const radii = sectionBox
        .getSize(new THREE.Vector3())
        .multiplyScalar(0.46);
      if (count > 1) radii[axis] = span * 0.78;
      if (Math.min(radii.x, radii.y, radii.z) < 0.001) continue;
      const section = makeSection(part, center, radii);
      if (part.isSkinnedMesh) {
        section.skin = part;
        // 固定截面样本随骨骼变形；成本上限，不逐帧重扫整张网格。
        const step = Math.max(1, Math.ceil(indices.length / 96));
        section.samples = indices.filter((_, j) => j % step === 0);
        section.axis = axis;
        section.span = span;
      }
      sections.push(section);
    }
  });
  root.userData.lordBody = {
    sections,
    skins: [
      ...new Set(sections.map((section) => section.skin).filter(Boolean)),
    ],
    colliders: sections.map(() => ({
      type: "ellipsoid",
      rotation: new THREE.Quaternion(),
      axes: { x: 1, y: 1, z: 1 },
      tag: "lord_body",
    })),
  };
}

function makeSection(part, center, radii, rotation = new THREE.Quaternion()) {
  part.updateMatrix();
  return {
    parent: part.parent,
    local: part.matrix.clone(),
    center,
    radii,
    rotation,
  };
}

/** 当前姿态的实体体积；仅遭遇系统调用，图鉴与普通生物不注册世界障碍。 */
export function updateLordBody(root) {
  const body = root.userData.lordBody;
  if (!body) return [];
  root.updateWorldMatrix(true, false);
  // SkinnedMesh 的重载同步 bindMatrixInverse；通用 updateWorldMatrix 不会调用它。
  root.updateMatrixWorld(true);
  for (const skin of body.skins) skin.skeleton.update();
  body.sections.forEach((section, i) => {
    if (section.skin) {
      const box = posedBounds.makeEmpty();
      for (const index of section.samples) {
        section.skin.getVertexPosition(index, point);
        box.expandByPoint(point);
      }
      box.getCenter(section.center);
      box.getSize(section.radii).multiplyScalar(0.46);
      section.radii[section.axis] = Math.max(
        section.radii[section.axis],
        section.span * 0.65,
      );
    }
    matrix.multiplyMatrices(section.parent.matrixWorld, section.local);
    matrix.decompose(point, orientation, scale);
    const collider = body.colliders[i];
    point.copy(section.center).applyMatrix4(matrix);
    collider.x = point.x;
    collider.y = point.y;
    collider.z = point.z;
    collider.axes.x = Math.max(0.01, section.radii.x * Math.abs(scale.x));
    collider.axes.y = Math.max(0.01, section.radii.y * Math.abs(scale.y));
    collider.axes.z = Math.max(0.01, section.radii.z * Math.abs(scale.z));
    collider.rotation.copy(orientation).multiply(section.rotation);
  });
  return body.colliders;
}
