import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { createTideLayout, TIDE_PORTS } from "./odyssey_tide_layout.js";
import { traceTideGate, TIDE_RULES } from "./odyssey_tide_rules.js";
import { POLYPHEMUS_SITE } from "./odyssey_polyphemus_site.js";
import { AEOLUS_MONUMENT_SITE, AEOLUS_ARCH } from "./odyssey_homeward_site.js";
import { ODYSSEY_WORLD } from "./odyssey_config.js";
import columnData from "./assets/models/odyssey_column_hf_mesh.json" with { type: "json" };
import aeolusData from "./assets/models/aeolus_hf_mesh.json" with { type: "json" };
import cragData from "./assets/models/odyssey_crag_hf_mesh.json" with { type: "json" };

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

/** 水平航门的局部 Z 为水流前进方向，真正净空和可见门框共用尺寸。 */
export function odysseyWindGateBasis(definition) {
  const center = new THREE.Vector3(...definition.center);
  const normal = new THREE.Vector3(...definition.normal).normalize();
  if (Math.abs(normal.y) > 0.001 || normal.lengthSq() < 0.99)
    throw new Error("Wind gates require a nonzero horizontal normal");
  const rotation = new THREE.Quaternion().setFromUnitVectors(Z, normal);
  return { center, normal, rotation };
}

/** 门框仅有四边实体；支柱在洞外，不能用整块碰撞盒封住穿越水路。 */
export function createOdysseyWindGateColliders(definition, heightAt) {
  const { center, rotation } = odysseyWindGateBasis(definition);
  const width = definition.width ?? 60,
    height = definition.height ?? 55,
    depth = definition.throat ?? 8;
  const colliders = [];
  const local = new THREE.Vector3();
  function box(name, position, size) {
    local
      .set(...position)
      .applyQuaternion(rotation)
      .add(center);
    colliders.push({
      type: "box",
      id: `${definition.id}_${name}`,
      kind: "odyssey_wind_gate",
      x: local.x,
      y: local.y,
      z: local.z,
      halfSize: new THREE.Vector3(...size).multiplyScalar(0.5),
      rotation: rotation.clone(),
    });
  }
  for (const side of [-1, 1]) {
    box(`jamb_${side}`, [side * (width / 2 + 3), 0, 0], [6, height, depth]);
    box(
      `beam_${side}`,
      [0, side * (height / 2 + 3), 0],
      [width + 12, 6, depth],
    );
    const x = side * (width / 2 + 21);
    local.set(x, 0, 0).applyQuaternion(rotation).add(center);
    const top = center.y + height / 2 + 9;
    // 整个方形柱脚按实际朝向采样，不以固定小圆遗漏斜坡上的高角。
    const initialHeight = top - heightAt(local.x, local.z);
    const sourceWidth = Math.max(
      columnData.max[0] - columnData.min[0],
      columnData.max[2] - columnData.min[2],
    );
    const footWidth = Math.max(15, sourceWidth * initialHeight + 2);
    const footSamples = [];
    const steps = Math.max(4, Math.ceil(footWidth / 2));
    const corner = new THREE.Vector3();
    for (let ix = 0; ix <= steps; ix++)
      for (let iz = 0; iz <= steps; iz++) {
        corner
          .set(
            (ix / steps - 0.5) * footWidth,
            0,
            (iz / steps - 0.5) * footWidth,
          )
          .applyQuaternion(rotation)
          .add(local);
        footSamples.push(heightAt(corner.x, corner.z));
      }
    const floor = Math.max(...footSamples),
      bottom = Math.min(...footSamples) - 2;
    if (floor >= center.y - height / 2 - 2)
      throw new Error(
        `Wind gate ${definition.id} support intrudes into its aperture`,
      );
    const supportHeight = top - floor;
    // 源 HF 柱身的完整横向包络，按统一缩放保留实际凹凸轮廓。
    const hfWidth =
      Math.max(
        columnData.max[0] - columnData.min[0],
        columnData.max[2] - columnData.min[2],
      ) * supportHeight;
    box(
      `column_${side}`,
      [x, (floor + top) / 2 - center.y, 0],
      [hfWidth, supportHeight, hfWidth],
    );
    box(
      `foot_${side}`,
      [x, (bottom + floor + 3) / 2 - center.y, 0],
      [footWidth, floor + 3 - bottom, footWidth],
    );
    box(
      `capital_${side}`,
      [side * (width / 2 + 10), height / 2 + 7, 0],
      [32, 4, 15],
    );
  }
  return colliders;
}

function rectangleShape(width, height) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  return shape;
}

/** 门洞周围是带真实厚度、铆钉和嵌槽的青铜机械构件。 */
function ringGeometry(width, height, depth) {
  const shape = rectangleShape(width + 12, height + 12);
  const hole = new THREE.Path();
  hole.moveTo(-width / 2, -height / 2);
  hole.lineTo(-width / 2, height / 2);
  hole.lineTo(width / 2, height / 2);
  hole.lineTo(width / 2, -height / 2);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function packedStatic(data, color) {
  const geometry = decodeOrganicMesh(data, null, (_x, _y, _z, c) =>
    c.set(color),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  return geometry;
}

const PIPE_POINTS = [
  [0, 18, -0.7],
  [0, 8, -0.7],
  [0.61, 4.94, -0.7],
  [2.34, 2.34, -0.7],
  [4.94, 0.61, -0.7],
  [8, 0, -0.7],
  [18, 0, -0.7],
];

/** 实际管槽和试潮水迹共用同一条折弯，不用穿过答案盘中心的直线代替。 */
function selectedPipePoints(tile, rotation, entry) {
  const offset = new THREE.Vector3(tile % 2 ? 24 : -24, tile < 2 ? 18 : -18, 0);
  const q = new THREE.Quaternion().setFromAxisAngle(
    Z,
    (-rotation * Math.PI) / 2,
  );
  const points = PIPE_POINTS.map((p) =>
    new THREE.Vector3(...p).applyQuaternion(q).add(offset),
  );
  return entry === rotation ? points : points.reverse();
}

function linePath(points) {
  const spans = [0];
  for (let i = 1; i < points.length; i++)
    spans.push(spans[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = spans.at(-1) || 1;
  return (t, target) => {
    const d = Math.max(0, Math.min(1, t)) * total;
    let i = 1;
    while (i < spans.length - 1 && spans[i] < d) i++;
    return target
      .copy(points[i - 1])
      .lerp(
        points[i],
        (d - spans[i - 1]) / Math.max(0.001, spans[i] - spans[i - 1]),
      );
  };
}

/** 当前地图独立拥有所有资源与异步贴图，不污染既有 HF 资产缓存。 */
export function createOdysseyWindEnvironment({
  gateDefs = [],
  finish,
  heightAt = () => -1000,
  waterHeightAt = () => ODYSSEY_WORLD.surfaceY,
  monument = null,
  loadMonument = () => Promise.resolve(aeolusData),
  homewardPath = [],
} = {}) {
  const group = new THREE.Group();
  group.name = "odyssey_four_winds_environment";
  const resources = new Set();
  const keep = (value) => (resources.add(value), value);
  const texturePreparations = [];
  const colliders = [];
  // 移动神像绝不进入静态空间索引；运行时单独接入这组紧贴真实网格的包络。
  const dynamicColliders = [];
  const layouts = new Map();
  const motionQuery = globalThis.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  );
  const gates = new Map();
  let disposed = false,
    activeTime = 0,
    waterlineTime = 0,
    nextMonumentAttempt = 0;
  const state = {
    monument: "unrequested",
    lastError: null,
    gateCount: gateDefs.length,
    disposed: false,
    homewardReady: false,
  };
  group.userData.fourWinds = state;
  function dispose() {
    if (disposed) return;
    disposed = true;
    state.disposed = true;
    for (const prep of texturePreparations) prep.dispose();
    // 实例缓冲归属于 InstancedMesh，自有几何和材质的释放不能替代这个事件。
    group.traverse((node) => {
      if (node.isInstancedMesh) node.dispose();
    });
    for (const resource of resources) resource.dispose?.();
    resources.clear();
    gates.clear();
    layouts.clear();
    dynamicColliders.length = 0;
    group.removeFromParent();
    group.clear();
  }
  try {
    const material = (name, color, roughness = 0.7, metalness = 0) => {
      const value = keep(
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );
      value.name = name;
      addSurfaceDetail(value, metalness ? "metal" : "stone", 0.34);
      return value;
    };
    const bronze = material("wind_gate_aged_bronze", 0x62786b, 0.62, 0.48);
    const gold = material("wind_gate_worn_inlay", 0xb09859, 0.55, 0.53);
    const limestone = material("wind_gate_limestone", 0xa9b2a4, 0.92);
    const boxGeometry = keep(new THREE.BoxGeometry(1, 1, 1));
    const columnGeometry = keep(packedStatic(columnData, 0xadaf9e));
    const columnMaterial = material("wind_gate_hf_column", 0xffffff, 0.94);
    columnMaterial.vertexColors = true;
    const prepareColumns = createMaterialPreparation(
      [
        {
          name: "color",
          url: new URL(
            "./assets/models/odyssey_column_hf_color.webp",
            import.meta.url,
          ),
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            columnMaterial.map = texture;
            columnMaterial.vertexColors = false;
            columnMaterial.needsUpdate = true;
          },
        },
      ],
      () => {},
    );
    texturePreparations.push(prepareColumns);
    prepareColumns();
    const matrix = new THREE.Matrix4(),
      dummy = new THREE.Object3D();
    function merged(parts, meshMaterial, parent, name) {
      const pieces = [];
      for (const { position, scale, rotation = [0, 0, 0] } of parts) {
        dummy.position.set(...position);
        dummy.scale.set(...scale);
        dummy.rotation.set(...rotation);
        dummy.updateMatrix();
        pieces.push(boxGeometry.clone().applyMatrix4(dummy.matrix));
      }
      if (!pieces.length) return;
      const geometry = keep(mergeGeometries(pieces));
      for (const part of pieces) part.dispose();
      const mesh = new THREE.Mesh(geometry, meshMaterial);
      mesh.name = name;
      parent.add(mesh);
      return mesh;
    }
    const channelCurve = new THREE.Curve();
    const channelPoint = linePath(
      PIPE_POINTS.map((p) => new THREE.Vector3(...p)),
    );
    channelCurve.getPoint = (t, target = new THREE.Vector3()) =>
      channelPoint(t, target);
    const pipeGeometry = keep(
      new THREE.TubeGeometry(channelCurve, 28, 1.6, 6, false),
    );
    const pipeBoreGeometry = keep(
      new THREE.TubeGeometry(channelCurve, 28, 0.77, 5, false),
    );
    const pipeBore = material("tide_unfilled_channel", 0x184c54, 0.42, 0.18);
    const lockMaterial = material("tide_guardian_chain", 0x645b4b, 0.72, 0.65);
    function worldBox(
      id,
      position,
      size,
      rotation,
      kind = "odyssey_tide_support",
    ) {
      const c = new THREE.Vector3(...position);
      colliders.push({
        type: "box",
        id,
        kind,
        x: c.x,
        y: c.y,
        z: c.z,
        halfSize: new THREE.Vector3(...size).multiplyScalar(0.5),
        rotation: rotation.clone(),
      });
    }
    for (const def of gateDefs) {
      const { center, rotation } = odysseyWindGateBasis(def);
      const width = def.width ?? 60,
        height = def.height ?? 55,
        depth = def.throat ?? 8;
      const root = new THREE.Group();
      root.name = `${def.id}_architecture`;
      root.position.copy(center);
      root.quaternion.copy(rotation);
      group.add(root);
      const frame = new THREE.Mesh(
        keep(ringGeometry(width, height, depth)),
        bronze,
      );
      frame.name = `${def.id}_solid_bronze_frame`;
      root.add(frame);
      const details = [];
      const strips = [];
      // 双面槽带与回纹由实体浮雕构成，避开真正净空，不拿发光平面盖住洞口。
      for (const front of [-1, 1]) {
        for (const side of [-1, 1]) {
          strips.push({
            position: [side * (width / 2 + 3), 0, front * (depth / 2 + 0.13)],
            scale: [0.32, height + 8, 0.22],
          });
          strips.push({
            position: [0, side * (height / 2 + 3), front * (depth / 2 + 0.13)],
            scale: [width + 8, 0.32, 0.22],
          });
        }
        for (let j = 0; j <= 12; j++) {
          const x = -width / 2 - 3 + (j * (width + 6)) / 12;
          for (const side of [-1, 1])
            details.push({
              position: [
                x,
                side * (height / 2 + 3),
                front * (depth / 2 + 0.32),
              ],
              scale: [0.6, 0.6, 0.65],
            });
        }
        for (let j = 1; j < 10; j++) {
          const y = -height / 2 + (j * height) / 10;
          for (const side of [-1, 1])
            details.push({
              position: [side * (width / 2 + 3), y, front * (depth / 2 + 0.32)],
              scale: [0.6, 0.6, 0.65],
            });
        }
      }
      merged(details, gold, root, `${def.id}_cast_bronze_studs`);
      const glowMaterial = keep(
        new THREE.MeshStandardMaterial({
          color: 0xb5a576,
          emissive: 0x739c88,
          emissiveIntensity: 0.18,
          roughness: 0.6,
          metalness: 0.2,
        }),
      );
      merged(strips, glowMaterial, root, `${def.id}_wind_channels`);
      const gateColliders = createOdysseyWindGateColliders(def, heightAt);
      colliders.push(...gateColliders);
      const foundationParts = [];
      for (const side of [-1, 1]) {
        const support = gateColliders.find((c) =>
          c.id.endsWith(`column_${side}`),
        );
        const foot = gateColliders.find((c) => c.id.endsWith(`foot_${side}`));
        const shaft = new THREE.Mesh(columnGeometry, columnMaterial);
        const supportHeight = support.halfSize.y * 2;
        shaft.scale.setScalar(supportHeight);
        shaft.position.set(side * (width / 2 + 21), support.y - center.y, 0);
        root.add(shaft);
        foundationParts.push({
          position: [side * (width / 2 + 21), foot.y - center.y, 0],
          scale: foot.halfSize.clone().multiplyScalar(2).toArray(),
        });
        foundationParts.push({
          position: [side * (width / 2 + 10), height / 2 + 7, 0],
          scale: [32, 4, 15],
        });
      }
      merged(foundationParts, limestone, root, `${def.id}_grounded_stylobates`);
      // 叶轮装在门楣之上；所有转动部件始终留在可通行矩形之外。
      const vaneRoot = new THREE.Group();
      vaneRoot.name = `${def.id}_wind_vane`;
      vaneRoot.position.set(0, height / 2 + 16, 0);
      root.add(vaneRoot);
      const vaneGeometry = keep(new THREE.BoxGeometry(0.7, 6.8, 0.75));
      const vanes = new THREE.InstancedMesh(vaneGeometry, gold, 8);
      const q = new THREE.Quaternion();
      for (let j = 0; j < 8; j++) {
        const angle = (j * Math.PI) / 4;
        matrix.compose(
          new THREE.Vector3(Math.sin(angle) * 4, Math.cos(angle) * 4, 0),
          q.setFromAxisAngle(Z, -angle),
          new THREE.Vector3(1, 1, 1),
        );
        vanes.setMatrixAt(j, matrix);
      }
      vaneRoot.add(vanes);
      const hub = new THREE.Mesh(
        keep(new THREE.CylinderGeometry(1.8, 1.8, 2.2, 12)),
        bronze,
      );
      hub.rotation.x = Math.PI / 2;
      vaneRoot.add(hub);
      const flowMaterial = keep(
        new THREE.MeshBasicMaterial({
          color: 0xafd5c7,
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
        }),
      );
      const flowGeometry = keep(new THREE.OctahedronGeometry(0.48, 0));
      const flow = new THREE.InstancedMesh(flowGeometry, flowMaterial, 48);
      flow.name = `${def.id}_actual_direction_water`;
      flow.frustumCulled = false;
      const layout = createTideLayout(def, heightAt);
      layouts.set(def.id, layout);
      const board = new THREE.Group();
      board.name = `${def.id}_tide_board`;
      board.position.set(...layout.origin);
      board.quaternion.fromArray(layout.rotation);
      group.add(board);
      board.add(flow);
      flow.visible = false;
      const stoneParts = [],
        inlayParts = [],
        drumParts = [];
      const boardQ = board.quaternion;
      const boardPoint = (p) =>
        new THREE.Vector3(...p).applyQuaternion(boardQ).add(board.position);
      const localBox = (name, p, size) =>
        worldBox(`${def.id}_${name}`, boardPoint(p).toArray(), size, boardQ);
      for (const side of [-1, 1]) {
        stoneParts.push({ position: [side * 43, 0, -8], scale: [6, 76, 7] });
        stoneParts.push({ position: [0, side * 36, -8], scale: [92, 5, 7] });
        localBox(`tide_jamb_${side}`, [side * 43, 0, -8], [6, 76, 7]);
        localBox(`tide_lintel_${side}`, [0, side * 36, -8], [92, 5, 7]);
        const foot = boardPoint([side * 43, 0, -8]);
        const ground = [];
        for (const dx of [-8, 0, 8])
          for (const dz of [-8, 0, 8]) {
            const p = new THREE.Vector3(dx, 0, dz)
              .applyQuaternion(boardQ)
              .add(foot);
            ground.push(heightAt(p.x, p.z));
          }
        const bottom = Math.min(...ground) - 2,
          h = board.position.y + 36 - bottom;
        // 深坡的长塔由完整 HF 柱段叠成，单段不超过65m，避免一根柱子等比放大到挡住旋钮。
        const segments = Math.max(1, Math.ceil(h / 65)),
          segmentHeight = h / segments;
        for (let j = 0; j < segments; j++) {
          const shaft = new THREE.Mesh(columnGeometry, columnMaterial);
          shaft.scale.setScalar(segmentHeight);
          shaft.position.copy(foot).setY(bottom + (j + 0.5) * segmentHeight);
          shaft.name = `${def.id}_tide_grounded_column_${side}_${j}`;
          group.add(shaft);
          const w =
            Math.max(
              columnData.max[0] - columnData.min[0],
              columnData.max[2] - columnData.min[2],
            ) * segmentHeight;
          worldBox(
            shaft.name,
            shaft.position.toArray(),
            [w, segmentHeight, w],
            boardQ,
          );
        }
      }
      const rotors = [];
      for (const control of layout.rotors) {
        const [x, y] = control.local;
        const anchor = new THREE.Object3D();
        anchor.name = `${def.id}_rotor_${control.index}_contact_anchor`;
        anchor.position.set(x, y, 0);
        board.add(anchor);
        stoneParts.push({ position: [x, y, -4.6], scale: [29, 29, 4] });
        localBox(`rotor_back_${control.index}`, [x, y, -4.6], [29, 29, 4]);
        // 中央旋钮可以被鼻端碰触；阻挡体只在其后方的真实石盘上。
        for (const [radius, tube, z] of [
          [13.9, 0.65, -1.7],
          [11.8, 0.32, -1.6],
          [2.5, 0.45, 0.3],
        ]) {
          const geom = new THREE.TorusGeometry(radius, tube, 5, 28);
          geom.translate(x, y, z);
          drumParts.push(geom);
        }
        const drum = new THREE.CylinderGeometry(13.5, 13.5, 1.5, 28);
        drum.rotateX(Math.PI / 2);
        drum.translate(x, y, -2.2);
        drumParts.push(drum);
        const knob = new THREE.CylinderGeometry(2.05, 2.35, 2.4, 12);
        knob.rotateX(Math.PI / 2);
        knob.translate(x, y, 0);
        drumParts.push(knob);
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          inlayParts.push({
            position: [x + 12.8 * Math.sin(a), y + 12.8 * Math.cos(a), -0.95],
            scale: [0.45, 1.1, 0.35],
            rotation: [0, 0, -a],
          });
        }
        // 四枚回纹印记要求整条水路经过全部石盘，印记并不提示哪个方向正确。
        inlayParts.push({ position: [x, y, 1.4], scale: [2.6, 0.48, 0.45] });
        inlayParts.push({ position: [x, y, 1.4], scale: [0.48, 2.6, 0.45] });
        // 石盘左上角的希腊字母与图解对应，不随转轮改变，也不遮住管口。
        const letters = [
          [
            [-1.3, 0, 0.46, 6.6, -0.34],
            [1.3, 0, 0.46, 6.6, 0.34],
            [0, -0.7, 3.3, 0.46, 0],
          ],
          [
            [-2.1, 0, 0.46, 6.2, 0],
            [0, 2.85, 4.2, 0.46, 0],
            [0, 0, 4.2, 0.46, 0],
            [0, -2.85, 4.2, 0.46, 0],
            [2.1, 1.45, 0.46, 2.5, 0],
            [2.1, -1.45, 0.46, 2.5, 0],
          ],
          [
            [-2.1, 0, 0.5, 6.2, 0],
            [0, 2.85, 4.2, 0.5, 0],
          ],
          [
            [-1.3, 0, 0.46, 6.6, -0.34],
            [1.3, 0, 0.46, 6.6, 0.34],
            [0, -2.85, 4.6, 0.46, 0],
          ],
        ][control.index];
        for (const [dx, dy, w, h, a] of letters)
          inlayParts.push({
            position: [x - 11 + dx, y + 10.5 + dy, -2.15],
            scale: [w, h, 0.38],
            rotation: [0, 0, a],
          });
        const pivot = new THREE.Group();
        pivot.position.set(x, y, 0);
        pivot.name = `${def.id}_rotor_${control.index}_moving_channel`;
        board.add(pivot);
        const pipe = new THREE.Mesh(pipeGeometry, bronze);
        pivot.add(pipe);
        // 管槽前缘的凹槽是常暗的选项本身；实际试潮才出现亮水。
        const bore = new THREE.Mesh(pipeBoreGeometry, pipeBore);
        bore.position.z = 1.1;
        pivot.add(bore);
        const chain = merged(
          [
            {
              position: [-8, 0, 2],
              scale: [18, 0.65, 0.75],
              rotation: [0, 0, Math.PI / 4],
            },
            {
              position: [8, 0, 2],
              scale: [18, 0.65, 0.75],
              rotation: [0, 0, -Math.PI / 4],
            },
          ],
          lockMaterial,
          pivot,
          `${def.id}_guardian_lock_${control.index}`,
        );
        rotors.push({
          pivot,
          chain,
          angle: 0,
          start: 0,
          target: 0,
          elapsed: TIDE_RULES.settleDuration,
          value: 0,
        });
      }
      merged(stoneParts, limestone, board, `${def.id}_tide_masonry`);
      merged(inlayParts, gold, board, `${def.id}_tide_mariner_engravings`);
      const drumGeometry = keep(mergeGeometries(drumParts));
      for (const piece of drumParts) piece.dispose();
      const drums = new THREE.Mesh(drumGeometry, bronze);
      drums.name = `${def.id}_tide_gear_castings`;
      board.add(drums);
      // 固定的四条短接管只负责格间距离；变体的入口、归航船形出口另行定位。
      const bridges = [];
      for (const y of [-18, 18])
        bridges.push({ position: [0, y, -0.7], scale: [12, 2.3, 2.3] });
      merged(bridges, bronze, board, `${def.id}_fixed_joint_bridges`);
      const makePort = (name, sink) => {
        const p = new THREE.Group();
        p.name = `${def.id}_${name}`;
        board.add(p);
        if (sink) {
          merged(
            [
              { position: [0, -1, 0], scale: [8, 1.7, 2] },
              { position: [0, 2.5, 0], scale: [0.7, 6, 0.7] },
              { position: [1.7, 3, 0], scale: [2.7, 3.2, 0.6] },
            ],
            gold,
            p,
            `${def.id}_return_ship_carving`,
          );
        } else {
          const shell = new THREE.Mesh(
            keep(new THREE.TorusGeometry(3.8, 1.05, 6, 18, Math.PI * 1.65)),
            gold,
          );
          shell.name = `${def.id}_source_conch`;
          p.add(shell);
          merged(
            [{ position: [0, -1, 0], scale: [1.2, 7, 1.2] }],
            gold,
            p,
            `${def.id}_source_inlet`,
          );
        }
        return p;
      };
      const sourcePort = makePort("source_port", false),
        sinkPort = makePort("sink_port", true);
      const master = new THREE.Group();
      master.name = `${def.id}_master_test_stela`;
      master.position.set(...layout.master.position);
      master.quaternion.copy(boardQ);
      group.add(master);
      const masterFloor = heightAt(master.position.x, master.position.z),
        masterHeight = master.position.y - masterFloor - 4;
      const masterPieces = [
        {
          position: [0, -4 - masterHeight / 2, -6],
          scale: [8, masterHeight, 7],
        },
      ];
      merged(masterPieces, limestone, master, `${def.id}_master_stone_support`);
      worldBox(
        `${def.id}_master_back`,
        new THREE.Vector3(0, -4 - masterHeight / 2, -6)
          .applyQuaternion(boardQ)
          .add(master.position)
          .toArray(),
        [8, masterHeight, 7],
        boardQ,
      );
      const back = new THREE.Mesh(
        keep(new THREE.CylinderGeometry(4.8, 4.8, 3.2, 18)),
        bronze,
      );
      back.rotation.x = Math.PI / 2;
      back.position.z = -4.2;
      master.add(back);
      worldBox(
        `${def.id}_master_contact_back`,
        new THREE.Vector3(0, 0, -4.2)
          .applyQuaternion(boardQ)
          .add(master.position)
          .toArray(),
        [9.6, 9.6, 3.2],
        boardQ,
      );
      const button = new THREE.Mesh(
        keep(new THREE.CylinderGeometry(3, 3.7, 2.8, 18)),
        gold,
      );
      button.rotation.x = Math.PI / 2;
      button.name = `${def.id}_master_contact_knob`;
      master.add(button);
      const sail = merged(
        [
          { position: [0, 0, 1.5], scale: [0.55, 4, 0.4] },
          { position: [1.1, 0.5, 1.5], scale: [1.7, 2.2, 0.4] },
          { position: [0, -2.1, 1.5], scale: [5, 0.65, 0.4] },
        ],
        gold,
        master,
        `${def.id}_master_ship_mark`,
      );
      // 胜利水冠从真实门框升起；一次事件的四道风弧，而非无休止的粒子暴雨。
      const crown = new THREE.Group();
      crown.name = `${def.id}_solved_water_crown`;
      root.add(crown);
      crown.visible = false;
      const crownMaterial = keep(
        new THREE.MeshBasicMaterial({
          color: 0x8ee4db,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        }),
      );
      const masterWave = new THREE.Group();
      masterWave.name = `${def.id}_master_success_water`;
      master.add(masterWave);
      masterWave.visible = false;
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          keep(
            new THREE.TorusGeometry(6.5 + i * 2.4, 0.42, 5, 40, Math.PI * 1.6),
          ),
          crownMaterial,
        );
        ring.position.z = 3 + i;
        ring.rotation.z = i * Math.PI * 0.65;
        masterWave.add(ring);
      }
      const crownCurve = new THREE.Curve();
      crownCurve.getPoint = (t, target = new THREE.Vector3()) =>
        target.set(
          Math.sin(t * Math.PI * 6) * (width / 2 + 10),
          (t - 0.5) * (height + 35),
          Math.cos(t * Math.PI * 6) * 12,
        );
      crown.add(
        new THREE.Mesh(
          keep(new THREE.TubeGeometry(crownCurve, 144, 0.65, 5, false)),
          crownMaterial,
        ),
      );
      for (let i = 0; i < 4; i++) {
        const arc = new THREE.Mesh(
          keep(
            new THREE.TorusGeometry(
              width / 2 + 9 + i * 1.5,
              0.5,
              5,
              48,
              Math.PI * 1.35,
            ),
          ),
          crownMaterial,
        );
        arc.rotation.set(
          (i * Math.PI) / 9,
          (i * Math.PI) / 7,
          (i * Math.PI) / 2,
        );
        crown.add(arc);
      }
      gates.set(def.id, {
        definition: def,
        root,
        vaneRoot,
        glowMaterial,
        flow,
        flowMaterial,
        phase: 0,
        layout,
        board,
        rotors,
        sourcePort,
        sinkPort,
        master,
        sail,
        crown,
        crownMaterial,
        masterWave,
        variantKey: null,
        testActive: false,
        testTime: 0,
        testPath: null,
        testTrace: null,
        testBurst: 0,
        solved: false,
      });
    }
    if (gateDefs.some((definition) => definition.guardian === "polyphemus")) {
      const { x, z, width, depth, top, bottom } = POLYPHEMUS_SITE;
      const parts = [
        {
          position: [x, (top + bottom) / 2, z],
          scale: [width, top - bottom, depth],
        },
      ];
      worldBox(
        "polyphemus_grounded_dais",
        [x, (top + bottom) / 2, z],
        [width, top - bottom, depth],
        new THREE.Quaternion(),
        "odyssey_polyphemus_dais",
      );
      // 台面下的接地墙逐层收口，古代浮雕沿四壁布置；没有悬空的碰撞地板。
      for (let i = 0; i < 3; i++) {
        const y = top - 2 - i * 4;
        for (const side of [-1, 1]) {
          parts.push({
            position: [x, y, z + side * (depth / 2 + 0.5)],
            scale: [width + 1.5, 0.8, 1],
          });
          parts.push({
            position: [x + side * (width / 2 + 0.5), y, z],
            scale: [1, 0.8, depth + 1.5],
          });
        }
      }
      merged(parts, limestone, group, "polyphemus_ancient_grounded_dais");
      const relief = [];
      for (let i = 0; i < 12; i++)
        for (const side of [-1, 1]) {
          relief.push({
            position: [
              x + (i - 5.5) * 5.5,
              top - 8,
              z + side * (depth / 2 + 1.1),
            ],
            scale: [2, 3, 0.5],
            rotation: [0, 0, Math.PI / 4],
          });
        }
      merged(relief, gold, group, "polyphemus_dais_homeric_reliefs");
      state.polyphemusDais = { ...POLYPHEMUS_SITE };
    } else if (gateDefs.some((definition) => definition.guardian === "ladon")) {
      const x = -365,
        z = -950,
        height = 130;
      const width =
        Math.max(
          columnData.max[0] - columnData.min[0],
          columnData.max[2] - columnData.min[2],
        ) * height;
      const ground = [];
      for (let ix = 0; ix <= 12; ix++)
        for (let iz = 0; iz <= 12; iz++)
          ground.push(
            heightAt(
              x + (ix / 12 - 0.5) * (width + 6),
              z + (iz / 12 - 0.5) * (width + 6),
            ),
          );
      const floor = Math.max(...ground),
        lowest = Math.min(...ground) - 2;
      const pillar = new THREE.Mesh(columnGeometry, columnMaterial);
      pillar.name = "ladon_hf_central_guard_column";
      pillar.scale.setScalar(height);
      pillar.position.set(x, floor + 3 + height / 2, z);
      group.add(pillar);
      const base = new THREE.Mesh(boxGeometry, limestone);
      base.name = "ladon_guard_column_foundation";
      base.position.set(x, (lowest + floor + 3) / 2, z);
      base.scale.set(width + 6, floor + 3 - lowest, width + 6);
      group.add(base);
      const pos = columnGeometry.attributes.position;
      for (let band = 0; band < 20; band++) {
        const bounds = new THREE.Box3(),
          lo = -0.5 + band / 20,
          hi = lo + 1 / 20;
        for (let i = 0; i < pos.count; i++)
          if (pos.getY(i) >= lo - 0.015 && pos.getY(i) <= hi + 0.015)
            bounds.expandByPoint(
              new THREE.Vector3().fromBufferAttribute(pos, i),
            );
        if (bounds.isEmpty()) continue;
        const c = bounds
          .getCenter(new THREE.Vector3())
          .multiplyScalar(height)
          .add(pillar.position);
        const size = bounds
          .getSize(new THREE.Vector3())
          .multiplyScalar(height / 2);
        colliders.push({
          type: "box",
          id: `ladon_guard_column_band_${band}`,
          kind: "odyssey_ladon_pillar",
          x: c.x,
          y: c.y,
          z: c.z,
          halfSize: size,
        });
      }
      colliders.push({
        type: "box",
        id: "ladon_guard_column_foundation",
        kind: "odyssey_ladon_pillar_base",
        x,
        y: base.position.y,
        z,
        halfSize: base.scale.clone().multiplyScalar(0.5),
      });
      state.ladonPillar = {
        position: pillar.position.toArray(),
        height,
        width,
      };
    }
    const monumentChannels = [];
    const statueBands = [];
    const supportPieces = [];
    const gateLeaves = [];
    let movingPlinth = null,
      masonry = null,
      gateRoot = null,
      gateProgress = 0,
      riseWater = null,
      riseWaterMaterial = null;
    let updateMonumentStructure = () => {};
    let riseLevel = 0,
      riseTarget = 0,
      riseFrom = 0,
      riseTo = 0,
      riseElapsed = 0;
    const riseDuration = 6;
    const monumentSite = monument ?? (finish ? AEOLUS_MONUMENT_SITE : null);
    function refreshMovingContacts() {
      // 原生碰撞层始终引用同一数组，重置时也不能更换数组。
      dynamicColliders.length = 0;
      if (state.monumentPlatformCollider)
        dynamicColliders.push(state.monumentPlatformCollider);
      for (const part of supportPieces)
        if (part.mesh.visible) dynamicColliders.push(part.collider);
      for (const leaf of gateLeaves) dynamicColliders.push(leaf.collider);
      for (const band of statueBands) dynamicColliders.push(band.collider);
      if (state.monumentSupportColliders) {
        state.monumentSupportColliders.length = 0;
        for (const part of supportPieces)
          if (part.mesh.visible)
            state.monumentSupportColliders.push(part.collider);
      }
    }
    if (monumentSite) {
      const [x, y, z] = monumentSite.position;
      const height = monumentSite.height ?? 180;
      const supportTop = y - height / 2;
      const riseDistance = monumentSite.riseDistance ?? 208;
      const thickness = monumentSite.plinthThickness ?? 6;
      const width = monumentSite.width ?? 120;
      const depth = monumentSite.depth ?? 76;
      const plinthWidth = monumentSite.plinthWidth ?? width;
      const plinthDepth = monumentSite.plinthDepth ?? depth;
      state.monumentPlinthSize = [plinthWidth, thickness, plinthDepth];
      state.monumentFoundationSize = [width, depth];
      const verticalOffset = supportTop - 16;
      const archFloor = AEOLUS_ARCH.floorY + verticalOffset;
      const archRoof = AEOLUS_ARCH.roofY + verticalOffset;
      state.monumentPosition = [x, y - riseDistance, z];
      state.monumentRiseDistance = riseDistance;
      state.monumentFinalMinY = supportTop;
      state.monumentPlinthFinalMinY = supportTop - thickness;
      state.monumentStep = 0;
      state.monumentRiseTarget = 0;
      state.monumentSupportColliders = [];
      const initialBase = supportTop - riseDistance;
      const q = new THREE.Quaternion().setFromAxisAngle(
        UP,
        monumentSite.yaw ?? 0,
      );
      let highest = -Infinity,
        lowest = Infinity;
      for (let dx = -width / 2; dx <= width / 2; dx += 2)
        for (let dz = -depth / 2; dz <= depth / 2; dz += 2) {
          const p = new THREE.Vector3(dx, 0, dz).applyQuaternion(q);
          const floor = heightAt(x + p.x, z + p.z);
          highest = Math.max(highest, floor);
          lowest = Math.min(lowest, floor);
        }
      if (highest > initialBase - thickness - 1)
        throw new Error(
          "Aeolus submerged platform intrudes into local terrain",
        );
      state.monumentFloorClearance = initialBase - thickness - 1 - highest;
      const bottom = lowest - 4;
      state.monumentFoundationBottom = bottom;
      const supportRoot = new THREE.Group();
      supportRoot.position.set(x, 0, z);
      supportRoot.quaternion.copy(q);
      supportRoot.name = "aeolus_grounded_masonry_temple";
      group.add(supportRoot);
      const mortar = material("aeolus_basalt_mortar", 0x515e56, 0.98);
      const dressedStone = material("aeolus_rusticated_marble", 0x9aa493, 0.94);
      dressedStone.polygonOffset = true;
      dressedStone.polygonOffsetFactor = -1;
      dressedStone.polygonOffsetUnits = -1;
      // 湿痕固定在真实四米水线；随神殿升起的石块经过水线时自然转为干燥。
      // 只调整原有石材着色，不添加漂浮光圈、额外灯光或透明覆盖面。
      for (const stone of [mortar, dressedStone]) {
        const priorCompile = stone.onBeforeCompile;
        const priorKey = stone.customProgramCacheKey;
        stone.onBeforeCompile = (shader, renderer) => {
          priorCompile.call(stone, shader, renderer);
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying float vAeolusStoneHeight;",
            )
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
              vec4 aeolusStonePoint = vec4(transformed, 1.);
              #ifdef USE_INSTANCING
                aeolusStonePoint = instanceMatrix * aeolusStonePoint;
              #endif
              vAeolusStoneHeight = (modelMatrix * aeolusStonePoint).y;
            `,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying float vAeolusStoneHeight;",
            )
            .replace(
              "#include <color_fragment>",
              `#include <color_fragment>
              float aeolusDry = smoothstep(${(ODYSSEY_WORLD.surfaceY - 0.6).toFixed(2)}, ${(ODYSSEY_WORLD.surfaceY + 1.4).toFixed(2)}, vAeolusStoneHeight);
              float aeolusWaterline = smoothstep(${(ODYSSEY_WORLD.surfaceY - 6).toFixed(2)}, ${(ODYSSEY_WORLD.surfaceY - 1).toFixed(2)}, vAeolusStoneHeight);
              diffuseColor.rgb *= mix(1., mix(.58, 1.04, aeolusDry), aeolusWaterline);
              float aeolusSalt = smoothstep(${(ODYSSEY_WORLD.surfaceY + 0.1).toFixed(2)}, ${(ODYSSEY_WORLD.surfaceY + 0.3).toFixed(2)}, vAeolusStoneHeight)
                * (1. - smoothstep(${(ODYSSEY_WORLD.surfaceY + 0.7).toFixed(2)}, ${(ODYSSEY_WORLD.surfaceY + 1.1).toFixed(2)}, vAeolusStoneHeight));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.53, .58, .47), aeolusSalt * .3);
            `,
            );
        };
        stone.customProgramCacheKey = () =>
          `${priorKey.call(stone)}_aeolus_wet_line_${ODYSSEY_WORLD.surfaceY}`;
      }
      function structuralPiece(id, localX, localZ, sx, sz) {
        const mesh = new THREE.Mesh(boxGeometry, mortar);
        mesh.name = id;
        supportRoot.add(mesh);
        const p = new THREE.Vector3(localX, 0, localZ)
          .applyQuaternion(q)
          .add(new THREE.Vector3(x, 0, z));
        const collider = {
          type: "box",
          id,
          kind: "odyssey_monument_support",
          x: p.x,
          y: 0,
          z: p.z,
          halfSize: new THREE.Vector3(sx / 2, 0, sz / 2),
          rotation: q.clone(),
        };
        const part = { mesh, collider, localX, localZ, sx, sz };
        supportPieces.push(part);
        return part;
      }
      const leftPier = structuralPiece(
        "aeolus_monument_west_pier",
        -44,
        0,
        32,
        depth,
      );
      const rightPier = structuralPiece(
        "aeolus_monument_east_pier",
        44,
        0,
        32,
        depth,
      );
      const lowerCore = structuralPiece(
        "aeolus_monument_lower_core",
        0,
        0,
        56,
        depth,
      );
      // 前方四米由移动门冠承重；最后与后方拱顶拼接，避免重叠表面闪烁。
      const upperCore = structuralPiece(
        "aeolus_monument_upper_vault",
        0,
        2,
        56,
        depth - 4,
      );
      const crown = structuralPiece(
        "aeolus_monument_travelling_crown",
        0,
        -36,
        56,
        4,
      );
      const jambs = [-1, 1].map((side) => {
        const part = structuralPiece(
          `aeolus_monument_gate_jamb_${side}`,
          side * 30,
          -40,
          4,
          4,
        );
        part.mesh.material = limestone;
        return part;
      });
      function setPiece(part, lo, hi) {
        const h = hi - lo;
        part.mesh.visible = h > 0.001;
        if (!part.mesh.visible) return;
        part.mesh.position.set(part.localX, (lo + hi) / 2, part.localZ);
        part.mesh.scale.set(part.sx, h, part.sz);
        part.collider.y = (lo + hi) / 2;
        part.collider.halfSize.y = h / 2;
      }
      // 石块按固定高度分层显露，避免把一张纹理拉伸到整座基台；碰撞仍用少量实体盒。
      masonry = new THREE.InstancedMesh(boxGeometry, dressedStone, 2400);
      masonry.name = "aeolus_finite_rusticated_masonry_courses";
      masonry.frustumCulled = false;
      supportRoot.add(masonry);
      const courseHeight = Math.max(
        7,
        Math.ceil((supportTop - thickness - bottom) / 80),
      );
      const stoneColor = new THREE.Color();
      let lastCourseTop = NaN;
      function updateMasonry(top) {
        if (top === lastCourseTop) return;
        lastCourseTop = top;
        let count = 0;
        function stone(px, py, pz, sx, sy, sz) {
          if (count >= 2400)
            throw new Error("Aeolus masonry course capacity exceeded");
          dummy.position.set(px, py, pz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(sx, sy, sz);
          dummy.updateMatrix();
          masonry.setMatrixAt(count, dummy.matrix);
          masonry.setColorAt(
            count,
            stoneColor.setHSL(0.16, 0.09, 0.48 + ((count * 7) % 9) * 0.012),
          );
          count++;
        }
        for (let row = 0, lo = bottom; lo < top; row++, lo += courseHeight) {
          const hi = Math.min(lo + courseHeight, top),
            cy = (lo + hi) / 2;
          if (hi - lo < 0.15) continue;
          for (const side of [-1, 1]) {
            // 石层在门洞顶底处切开，保留真正的 56 × 70 米全身通道。
            for (let column = 0; column < 8; column++) {
              const px = -52.5 + column * 15;
              let slo = lo,
                shi = hi;
              if (Math.abs(px) < 28) {
                if (lo < archFloor) shi = Math.min(hi, archFloor);
                else if (hi > archRoof) slo = Math.max(lo, archRoof);
                else continue;
              }
              if (shi - slo < 0.15) continue;
              const span =
                Math.abs(px) < 28 ? 13.9 : Math.abs(px) === 37.5 ? 17.7 : 13.9;
              stone(
                px,
                (slo + shi) / 2,
                side * (depth / 2 - 0.35),
                span,
                shi - slo - 0.12,
                0.7,
              );
            }
            for (let column = 0; column < 6; column++)
              stone(
                side * (width / 2 - 0.35),
                cy,
                -31.5 + column * 12.6,
                0.7,
                hi - lo - 0.12,
                12.45,
              );
          }
        }
        masonry.count = count;
        masonry.instanceMatrix.needsUpdate = true;
        if (masonry.instanceColor) masonry.instanceColor.needsUpdate = true;
        state.monumentMasonryCount = count;
      }
      movingPlinth = new THREE.Mesh(boxGeometry, limestone);
      movingPlinth.name = "aeolus_moving_marble_plinth";
      movingPlinth.scale.set(plinthWidth, thickness, plinthDepth);
      movingPlinth.position.set(x, initialBase - thickness / 2, z);
      movingPlinth.quaternion.copy(q);
      group.add(movingPlinth);
      state.monumentPlatformCollider = {
        type: "box",
        id: "aeolus_monument_moving_plinth",
        kind: "odyssey_monument_moving",
        x,
        y: initialBase - thickness / 2,
        z,
        halfSize: new THREE.Vector3(
          plinthWidth / 2,
          thickness / 2,
          plinthDepth / 2,
        ),
        rotation: q.clone(),
      };
      gateRoot = new THREE.Group();
      gateRoot.name = "aeolus_homeward_bronze_double_gate";
      gateRoot.position.set(0, initialBase - thickness - 60, -40);
      supportRoot.add(gateRoot);
      const gateState = {
        center: [0, 0, 0],
        progress: 0,
        angle: 0,
        open: false,
        colliders: [],
      };
      state.monumentGate = gateState;
      for (const side of [-1, 1]) {
        const hinge = new THREE.Group();
        hinge.name = `aeolus_homeward_gate_hinge_${side}`;
        hinge.position.set(side * 30, 0, 0);
        gateRoot.add(hinge);
        const panel = merged(
          [
            { position: [-side * 15, 0, 0], scale: [30, 70, 2.8] },
            ...[-1, 1].flatMap((edge) => [
              {
                position: [-side * 15 + edge * 13.8, 0, -1.5],
                scale: [1, 68, 0.5],
              },
              {
                position: [-side * 15, edge * 33.8, -1.5],
                scale: [28, 1, 0.5],
              },
            ]),
            ...[-21, 0, 21].map((py) => ({
              position: [-side * 15, py, -1.5],
              scale: [24, 18, 0.5],
            })),
          ],
          bronze,
          hinge,
          `aeolus_homeward_bronze_leaf_${side}`,
        );
        const ornaments = [];
        for (const py of [-21, 0, 21]) {
          ornaments.push({
            position: [-side * 15, py, -1.9],
            scale: [16, 0.7, 0.4],
            rotation: [0, 0, Math.PI / 4],
          });
          ornaments.push({
            position: [-side * 15, py, -1.9],
            scale: [16, 0.7, 0.4],
            rotation: [0, 0, -Math.PI / 4],
          });
        }
        merged(ornaments, gold, hinge, `aeolus_gate_wind_inlay_${side}`);
        const collider = {
          type: "box",
          id: `aeolus_homeward_bronze_leaf_${side}`,
          kind: "odyssey_homeward_gate",
          x: 0,
          y: 0,
          z: 0,
          halfSize: new THREE.Vector3(15, 35, 2.1),
          rotation: new THREE.Quaternion(),
        };
        gateLeaves.push({ side, hinge, panel, collider });
        gateState.colliders.push(collider);
      }
      // 四条风纹从承重台基汇入实际门冠，让归航入口与神像连为一体。
      state.monumentWindChannels = [];
      for (let channel = 0; channel < 4; channel++) {
        const mat = keep(
          new THREE.MeshStandardMaterial({
            color: 0xa8a276,
            emissive: 0x9bc0a1,
            emissiveIntensity: 0.04,
            metalness: 0.42,
            roughness: 0.7,
          }),
        );
        const from = new THREE.Vector3(-21 + channel * 14, 66.4, 2.25);
        const to = new THREE.Vector3(-3 + channel * 2, 37.2, 2.25);
        const curve = new THREE.LineCurve3(from, to);
        const mesh = new THREE.Mesh(
          keep(new THREE.TubeGeometry(curve, 1, 0.42, 5, false)),
          mat,
        );
        mesh.name = `aeolus_monument_wind_channel_${channel}`;
        gateRoot.add(mesh);
        monumentChannels.push(mat);
        state.monumentWindChannels.push({
          from: from.toArray(),
          to: to.toArray(),
          mesh,
        });
      }
      // 浪沫只落在承重墙与真实波面的交线上，外缘在两米内淡出。
      // 32 段、64 顶点和一个材质全程复用，不以漂浮粒子代替实际支撑。
      const foamSegments = 32;
      const foamWidth = 2;
      const foamPositions = new Float32Array(foamSegments * 2 * 3);
      const foamColors = new Float32Array(foamSegments * 2 * 4);
      const foamIndices = [];
      const foamLocal = [];
      for (let i = 0; i < foamSegments; i++) {
        const side = Math.floor(i / 8);
        const t = (i % 8) / 8;
        for (let edge = 0; edge < 2; edge++) {
          const halfX = width / 2 + edge * foamWidth;
          const halfZ = depth / 2 + edge * foamWidth;
          const point =
            side === 0
              ? [-halfX + t * halfX * 2, -halfZ]
              : side === 1
                ? [halfX, -halfZ + t * halfZ * 2]
                : side === 2
                  ? [halfX - t * halfX * 2, halfZ]
                  : [-halfX, halfZ - t * halfZ * 2];
          foamLocal.push(point);
          foamColors.set([0.76, 0.81, 0.69, 0], (i * 2 + edge) * 4);
        }
        const a = i * 2,
          b = ((i + 1) % foamSegments) * 2;
        foamIndices.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const foamGeometry = keep(new THREE.BufferGeometry());
      foamGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(foamPositions, 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      foamGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(foamColors, 4).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      foamGeometry.setIndex(foamIndices);
      const foamMaterial = keep(
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: true,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: true,
        }),
      );
      const foam = new THREE.Mesh(foamGeometry, foamMaterial);
      foam.name = "aeolus_actual_wall_waterline_foam";
      foam.visible = false;
      foam.frustumCulled = false;
      foam.renderOrder = 2;
      group.add(foam);
      state.monumentWaterline = {
        visible: false,
        vertexCount: foamSegments * 2,
        width: foamWidth,
      };
      const foamPoint = new THREE.Vector3();
      function updateWaterline(underside) {
        let strength = 0;
        for (let i = 0; i < foamLocal.length; i++) {
          foamPoint.set(foamLocal[i][0], 0, foamLocal[i][1]).applyQuaternion(q);
          const px = x + foamPoint.x,
            pz = z + foamPoint.z;
          const wave = waterHeightAt(px, pz, waterlineTime);
          foamPositions[i * 3] = px;
          foamPositions[i * 3 + 1] = wave + 0.08;
          foamPositions[i * 3 + 2] = pz;
          const contact = THREE.MathUtils.clamp((underside - wave) / 0.9, 0, 1);
          const alpha =
            i % 2 === 0
              ? contact *
                (0.68 + 0.12 * Math.sin(i * 0.73 + waterlineTime * 0.4))
              : 0;
          foamColors[i * 4 + 3] = alpha;
          strength = Math.max(strength, alpha);
        }
        foam.visible = strength > 0.005;
        state.monumentWaterline.visible = foam.visible;
        foamGeometry.attributes.position.needsUpdate = true;
        foamGeometry.attributes.color.needsUpdate = true;
      }
      const localCenter = new THREE.Vector3();
      const leafQ = new THREE.Quaternion();
      updateMonumentStructure = (baseY, advance = 0, canOpen = false) => {
        const underside = baseY - thickness;
        setPiece(leftPier, bottom, underside);
        setPiece(rightPier, bottom, underside);
        setPiece(lowerCore, bottom, Math.min(underside, archFloor));
        setPiece(upperCore, archRoof, underside);
        // 门冠只占前方四米；尚未露出下基座时不重复绘制同一块实体。
        setPiece(crown, Math.max(underside - 25, archFloor), underside);
        const gateY = underside - 60;
        for (const jamb of jambs) setPiece(jamb, gateY - 35, gateY + 35);
        gateRoot.position.y = gateY;
        updateMasonry(underside);
        updateWaterline(underside);
        gateProgress = canOpen
          ? Math.min(
              1,
              gateProgress + advance / AEOLUS_ARCH.gateOpeningDuration,
            )
          : 0;
        const eased = gateProgress * gateProgress * (3 - 2 * gateProgress);
        const angle = eased * THREE.MathUtils.degToRad(108);
        for (const leaf of gateLeaves) {
          const localAngle = -leaf.side * angle;
          leaf.hinge.rotation.y = localAngle;
          leafQ.setFromAxisAngle(UP, localAngle);
          localCenter
            .set(-leaf.side * 15, 0, 0)
            .applyQuaternion(leafQ)
            .add(leaf.hinge.position)
            .add(gateRoot.position)
            .applyQuaternion(q)
            .add(new THREE.Vector3(x, 0, z));
          leaf.collider.x = localCenter.x;
          leaf.collider.y = localCenter.y;
          leaf.collider.z = localCenter.z;
          leaf.collider.rotation.copy(q).multiply(leafQ);
        }
        localCenter
          .copy(gateRoot.position)
          .applyQuaternion(q)
          .add(new THREE.Vector3(x, 0, z));
        gateState.center = localCenter.toArray();
        gateState.angle = angle;
        gateState.progress = gateProgress;
        gateState.open = canOpen && gateProgress >= 1;
        state.homewardReady = gateState.open;
        state.monumentCurrentBaseY = baseY;
        state.monumentSupportTop = underside;
        refreshMovingContacts();
      };
      updateMonumentStructure(initialBase);
      riseWaterMaterial = keep(
        new THREE.MeshBasicMaterial({
          color: 0xa5e6d6,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        }),
      );
      riseWater = new THREE.InstancedMesh(
        keep(new THREE.OctahedronGeometry(1.1, 0)),
        riseWaterMaterial,
        96,
      );
      riseWater.name = "aeolus_step_rising_water";
      riseWater.visible = false;
      riseWater.frustumCulled = false;
      group.add(riseWater);

      const cragGeometry = keep(packedStatic(cragData, 0x879b9d));
      const cragMaterial = keep(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          roughness: 0.96,
        }),
      );
      const cliff = new THREE.Mesh(cragGeometry, cragMaterial);
      cliff.name = "aeolus_hf_cliff_backing";
      const cliffHeight = monumentSite.cliffHeight ?? 65;
      // 神殿移开旧洋流和鱼群后，保留已验收岩壁的原有世界位置与实际碰撞。
      const cliffX = monument ? x - 120 : -380;
      const cliffZ = monument ? z - 20 : -580;
      const cliffFloor =
        Math.min(
          ...[-cliffHeight / 2, 0, cliffHeight / 2].flatMap((dx) =>
            [-cliffHeight * 0.36, 0, cliffHeight * 0.36].map((dz) =>
              heightAt(cliffX + dx, cliffZ + dz),
            ),
          ),
        ) - 4;
      cliff.position.set(cliffX, cliffFloor + cliffHeight / 2, cliffZ);
      cliff.scale.setScalar(cliffHeight);
      group.add(cliff);
      const p = cragGeometry.attributes.position;
      for (let band = 0; band < 12; band++) {
        const box = new THREE.Box3();
        const lo = -0.5 + band / 12,
          hi = lo + 1 / 12;
        for (let i = 0; i < p.count; i++)
          if (p.getY(i) >= lo - 0.03 && p.getY(i) <= hi + 0.03)
            box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, i));
        if (box.isEmpty()) continue;
        const c = box
          .getCenter(new THREE.Vector3())
          .multiplyScalar(cliffHeight)
          .add(cliff.position);
        const size = box
          .getSize(new THREE.Vector3())
          .multiplyScalar(cliffHeight * 0.5);
        colliders.push({
          type: "box",
          id: `aeolus_cliff_band_${band}`,
          kind: "odyssey_monument_cliff",
          x: c.x,
          y: c.y,
          z: c.z,
          halfSize: size,
        });
      }
      const cliffPrepare = createMaterialPreparation(
        [
          {
            name: "color",
            url: new URL(
              "./assets/models/odyssey_crag_hf_color.webp",
              import.meta.url,
            ),
            colorSpace: THREE.SRGBColorSpace,
            apply(texture) {
              cragMaterial.map = texture;
              cragMaterial.vertexColors = false;
              cragMaterial.needsUpdate = true;
            },
          },
        ],
        () => {},
      );
      texturePreparations.push(cliffPrepare);
      cliffPrepare();
    }
    const finishChannels = [];
    let threshold = null;
    if (finish && monumentSite) {
      threshold = new THREE.Group();
      threshold.visible = false;
      threshold.name = "aeolus_underwater_arrival_court";
      threshold.position.set(
        monumentSite.position[0],
        0,
        monumentSite.position[2],
      );
      threshold.rotation.y = monumentSite.yaw ?? 0;
      group.add(threshold);
      const offset =
        monumentSite.position[1] - (monumentSite.height ?? 180) / 2 - 16;
      // 归航嵌纹落在真正的拱内侧墙与底板上，撤去会阻挡新入口的远端四柱。
      for (let i = 0; i < 4; i++) {
        const m = keep(
          new THREE.MeshStandardMaterial({
            color: 0xd1be8f,
            emissive: 0xa6cbb3,
            emissiveIntensity: 0.08,
            roughness: 0.64,
            metalness: 0.2,
          }),
        );
        merged(
          [
            {
              position: [-27.8, -50 + offset, -24 + i * 16],
              scale: [0.3, 18, 1.2],
            },
            {
              position: [27.8, -50 + offset, -24 + i * 16],
              scale: [0.3, 18, 1.2],
            },
            {
              position: [0, -84.8 + offset, -24 + i * 16],
              scale: [52, 0.2, 1.2],
            },
          ],
          m,
          threshold,
          `aeolus_homeward_threshold_inlay_${i}`,
        );
        finishChannels.push(m);
      }
    }
    const homewardRoot = new THREE.Group();
    homewardRoot.name = "aeolus_homeward_current";
    homewardRoot.visible = false;
    group.add(homewardRoot);
    let homewardCurve = null;
    let homewardBeads = null;
    if (homewardPath.length >= 2) {
      const points = homewardPath.map((p) => new THREE.Vector3(...p));
      const spans = [0];
      for (let i = 1; i < points.length; i++)
        spans.push(spans[i - 1] + points[i].distanceTo(points[i - 1]));
      const total = spans.at(-1);
      homewardCurve = new THREE.Curve();
      // 可见归航线逐段跟随调用方的真实强制水路，不用平滑曲线切进岩体。
      homewardCurve.getPoint = (t, target = new THREE.Vector3()) => {
        const d = Math.max(0, Math.min(1, t)) * total;
        let i = 1;
        while (i < spans.length - 1 && spans[i] < d) i++;
        return target
          .copy(points[i - 1])
          .lerp(
            points[i],
            (d - spans[i - 1]) / Math.max(0.0001, spans[i] - spans[i - 1]),
          );
      };
      const segments = Math.max(
        24,
        Math.min(512, Math.ceil(homewardCurve.getLength() / 12)),
      );
      const ribbonGeometry = keep(
        new THREE.TubeGeometry(homewardCurve, segments, 1.1, 4, false),
      );
      const ribbonMaterial = keep(
        new THREE.MeshBasicMaterial({
          color: 0xc4ca91,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      );
      const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      ribbon.name = "aeolus_homeward_water_ribbon";
      homewardRoot.add(ribbon);
      homewardBeads = new THREE.InstancedMesh(
        keep(new THREE.OctahedronGeometry(0.8, 0)),
        keep(
          new THREE.MeshBasicMaterial({
            color: 0xd4d8a4,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }),
        ),
        64,
      );
      homewardBeads.name = "aeolus_homeward_direction_beads";
      homewardBeads.frustumCulled = false;
      homewardRoot.add(homewardBeads);
    }
    let monumentTask = null;
    function prepareMonument() {
      if (
        disposed ||
        monumentTask ||
        !monumentSite ||
        !loadMonument ||
        activeTime < nextMonumentAttempt
      )
        return monumentTask;
      state.monument = "loading";
      monumentTask = Promise.resolve()
        .then(loadMonument)
        .then((asset) => {
          if (disposed) return false;
          const data = asset.default ?? asset;
          const geometry = keep(packedStatic(data, 0xc3c4ad));
          const material = keep(
            new THREE.MeshStandardMaterial({
              color: 0xffffff,
              vertexColors: true,
              roughness: 0.93,
            }),
          );
          material.name = "aeolus_hf_aged_marble";
          const statue = new THREE.Mesh(geometry, material);
          statue.name = "aeolus_hf_wind_keeper_monument";
          const height = monumentSite.height ?? 180;
          statue.scale.setScalar(height);
          statue.position.set(...state.monumentPosition);
          statue.rotation.y = monumentSite.yaw ?? 0;
          group.add(statue);
          const p = geometry.attributes.position;
          const q = statue.quaternion;
          for (let band = 0; band < 24; band++) {
            const lo = -0.5 + band / 24,
              hi = lo + 1 / 24,
              bounds = new THREE.Box3();
            for (let i = 0; i < p.count; i++)
              if (p.getY(i) >= lo - 0.012 && p.getY(i) <= hi + 0.012)
                bounds.expandByPoint(
                  new THREE.Vector3().fromBufferAttribute(p, i),
                );
            if (bounds.isEmpty()) continue;
            const offset = bounds
              .getCenter(new THREE.Vector3())
              .multiplyScalar(height)
              .applyQuaternion(q);
            const c = offset.clone().add(statue.position);
            const collider = {
              type: "box",
              id: `aeolus_actual_statue_band_${band}`,
              kind: "odyssey_monument_moving",
              x: c.x,
              y: c.y,
              z: c.z,
              halfSize: bounds
                .getSize(new THREE.Vector3())
                .multiplyScalar(height / 2),
              rotation: q.clone(),
            };
            statueBands.push({ collider, offset });
            dynamicColliders.push(collider);
          }
          state.monument = "ready";
          state.lastError = null;
          state.monumentMesh = statue;
          if (monumentSite.textureUrl !== false) {
            const prep = createMaterialPreparation(
              [
                {
                  name: "color",
                  url:
                    monumentSite.textureUrl ??
                    new URL(
                      "./assets/models/aeolus_hf_color.webp",
                      import.meta.url,
                    ),
                  colorSpace: THREE.SRGBColorSpace,
                  apply(texture) {
                    material.map = texture;
                    material.vertexColors = false;
                    material.needsUpdate = true;
                  },
                },
              ],
              () => {},
            );
            texturePreparations.push(prep);
            prep();
          }
          return true;
        })
        .catch((error) => {
          if (disposed) return false;
          state.lastError =
            error instanceof Error ? error.message : String(error);
          nextMonumentAttempt = activeTime + 10;
          state.monument = "error";
          monumentTask = null;
          return false;
        });
      return monumentTask;
    }
    prepareMonument();
    return {
      group,
      colliders,
      dynamicColliders,
      layouts,
      state,
      prepareMonument,
      async prepare() {
        await prepareMonument();
        if (disposed) return false;
        const results = await Promise.all(
          texturePreparations.map((prepare) => prepare()),
        );
        if (disposed) return false;
        state.texturesReady = results.every(Boolean);
        return state.monument === "ready" && state.texturesReady;
      },
      update(dt, time = 0, trial = {}) {
        if (disposed) return;
        const advance = Math.max(0, Number(dt) || 0);
        const reduced = trial.reducedMotion ?? motionQuery?.matches ?? false;
        activeTime += advance;
        if (advance > 0) waterlineTime = time;
        for (const [id, gate] of gates) {
          const s = trial.gates?.[id] ?? {};
          const completed = Boolean(s.solved || s.stabilized);
          const unlocked = Boolean(s.defeated || completed);
          const result = s.result ?? s.lastResult ?? "";
          const rotations = s.testing
            ? (s.testRotations ?? s.rotations ?? [0, 0, 0, 0])
            : (s.rotations ?? [0, 0, 0, 0]);
          for (let i = 0; i < 4; i++) {
            const rotor = gate.rotors[i],
              value = rotations[i] ?? 0;
            if (value !== rotor.value) {
              const delta = (value - rotor.value + 4) % 4;
              rotor.start = rotor.angle;
              rotor.target =
                rotor.angle - ((delta === 3 ? -1 : delta) * Math.PI) / 2;
              rotor.elapsed = 0;
              rotor.value = value;
            }
            rotor.elapsed = Math.min(
              TIDE_RULES.settleDuration,
              rotor.elapsed + advance,
            );
            const t = reduced ? 1 : rotor.elapsed / TIDE_RULES.settleDuration;
            rotor.angle = THREE.MathUtils.lerp(
              rotor.start,
              rotor.target,
              t * t * (3 - 2 * t),
            );
            rotor.pivot.rotation.z = rotor.angle;
            rotor.chain.visible = !unlocked;
          }
          const variantKey = s.variant
            ? `${s.variant.source?.tile}:${s.variant.source?.port}>${s.variant.sink?.tile}:${s.variant.sink?.port}`
            : "";
          if (variantKey !== gate.variantKey) {
            gate.variantKey = variantKey;
            for (const [port, definition] of [
              [gate.sourcePort, s.variant?.source],
              [gate.sinkPort, s.variant?.sink],
            ]) {
              port.visible = Boolean(definition);
              if (definition) {
                const p = gate.layout.portPosition(
                  definition.tile,
                  definition.port,
                  9,
                );
                port.position.copy(
                  gate.board.worldToLocal(new THREE.Vector3(...p)),
                );
              }
            }
          }
          if (s.testing && !gate.testActive) {
            // 只有玩家明确试潮时才读取答案判定，调整期间不会偷跑“接对”提示。
            gate.testTrace = traceTideGate(s.variant, rotations);
            const points = [];
            const source = s.variant?.source;
            if (source) {
              const sourcePoint = gate.layout.portPosition(
                source.tile,
                source.port,
                10,
              );
              points.push(
                gate.board.worldToLocal(new THREE.Vector3(...sourcePoint)),
              );
              const inlet = gate.layout.portPosition(source.tile, source.port);
              points.push(gate.board.worldToLocal(new THREE.Vector3(...inlet)));
            }
            for (const segment of gate.testTrace.segments)
              points.push(
                ...selectedPipePoints(
                  segment.tile,
                  rotations[segment.tile],
                  segment.entry,
                ),
              );
            if (points.length < 2) points.push(new THREE.Vector3(0, 0, 0));
            gate.testPath = linePath(points);
            gate.testTime = 0;
          }
          if (!s.testing && gate.testActive) {
            gate.testTrace = s.lastTrace ?? gate.testTrace;
            gate.testBurst =
              result === "success" || completed
                ? 4
                : result === "wrong" ||
                    result === "failure" ||
                    result === "failed"
                  ? 2.5
                  : 0;
          }
          if (completed && !gate.solved) gate.testBurst = 4;
          if (!completed && gate.solved) {
            gate.testBurst = 0;
            gate.testPath = null;
            gate.testTrace = null;
          }
          gate.testActive = Boolean(s.testing);
          gate.solved = completed;
          gate.testTime += s.testing ? advance : 0;
          gate.testBurst = Math.max(0, gate.testBurst - advance);
          gate.phase += reduced
            ? 0
            : advance *
              (completed ? 0.18 : s.testing ? 0.8 : unlocked ? 0.08 : 0);
          gate.vaneRoot.rotation.z = gate.phase;
          gate.glowMaterial.emissiveIntensity = completed
            ? 0.95
            : s.testing
              ? 0.42
              : unlocked
                ? 0.2
                : 0.04;
          gate.crown.visible = completed && gate.testBurst > 0;
          gate.masterWave.visible = gate.crown.visible;
          gate.masterWave.rotation.z = reduced ? 0 : gate.phase * 2;
          gate.crown.rotation.y = reduced ? 0 : gate.phase;
          gate.crownMaterial.opacity = 0.68 * Math.min(1, gate.testBurst);
          const failed = !completed && !s.testing && gate.testBurst > 0;
          gate.flow.visible = Boolean(s.testing || failed);
          gate.flowMaterial.color.set(failed ? 0xd6a16d : 0x92e3df);
          gate.flowMaterial.opacity = 0.8;
          // 水迹严格沿本次选择的弯管推进；错误时从实际终点向下排空。
          if (gate.flow.visible)
            for (let j = 0; j < 48; j++) {
              const t = (j / 48 + gate.testTime * 0.7) % 1;
              const visible =
                s.testing &&
                t <=
                  Math.min(1, (gate.testTime / TIDE_RULES.testDuration) * 1.18);
              if (failed && gate.testPath) {
                gate.testPath(1, dummy.position);
                const fall = (2.5 - gate.testBurst) * 18 + j * 0.45;
                dummy.position.x +=
                  Math.sin(j * 2.4) * Math.min(6, fall * 0.22);
                dummy.position.y -= fall;
                dummy.position.z += 1 + (j % 3);
              } else if (gate.testPath) gate.testPath(t, dummy.position);
              else dummy.position.set(0, 0, 0);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.setScalar(visible || failed ? 1 : 0);
              dummy.updateMatrix();
              gate.flow.setMatrixAt(j, dummy.matrix);
            }
          if (gate.flow.visible) gate.flow.instanceMatrix.needsUpdate = true;
          gate.board.userData.locked = !unlocked;
          gate.board.userData.testing = Boolean(s.testing);
          gate.board.userData.solved = completed;
          gate.board.userData.rotations = rotations;
        }
        const stable = Object.values(trial.gates ?? {}).filter(
          (s) => s.solved || s.stabilized,
        ).length;
        if (monumentSite) {
          const count = Math.min(4, stable);
          if (count < riseTarget) {
            riseTarget = riseLevel = riseFrom = riseTo = 0;
            riseElapsed = 0;
          } else riseTarget = count;
          let remaining = advance;
          for (let step = 0; step < 5; step++) {
            if (riseFrom === riseTo && riseLevel < riseTarget) {
              riseFrom = riseLevel;
              riseTo = riseLevel + 1;
              riseElapsed = 0;
            }
            if (riseFrom === riseTo) break;
            const slice = Math.min(remaining, riseDuration - riseElapsed);
            riseElapsed += slice;
            remaining -= slice;
            if (riseElapsed >= riseDuration - 1e-8) {
              riseLevel = riseTo;
              riseFrom = riseTo;
              riseElapsed = 0;
            }
            if (remaining <= 0) break;
          }
          const t = riseFrom === riseTo ? 0 : riseElapsed / riseDuration;
          const level =
            riseFrom === riseTo
              ? riseLevel
              : THREE.MathUtils.lerp(riseFrom, riseTo, t * t * (3 - 2 * t));
          const [x, finalY, z] = monumentSite.position;
          const riseDistance = state.monumentRiseDistance;
          const yy = finalY - riseDistance + (level * riseDistance) / 4;
          state.monumentPosition[1] = yy;
          state.monumentStep = riseLevel;
          state.monumentRiseTarget = riseTarget;
          state.monumentRising = riseFrom !== riseTo;
          state.monumentMesh?.position.setY(yy);
          const baseY = yy - (monumentSite.height ?? 180) / 2;
          const thickness = monumentSite.plinthThickness ?? 6;
          movingPlinth.position.y = baseY - thickness / 2;
          state.monumentPlatformCollider.y = baseY - thickness / 2;
          for (const { collider, offset } of statueBands)
            collider.y = yy + offset.y;
          updateMonumentStructure(
            baseY,
            remaining,
            riseLevel === 4 &&
              !state.monumentRising &&
              Boolean(trial.homewardAvailable),
          );
          riseWater.visible = state.monumentRising;
          if (riseWater.visible) {
            riseWaterMaterial.opacity = reduced ? 0.36 : 0.72;
            for (let i = 0; i < 96; i++) {
              const a =
                (i / 96) * Math.PI * 8 + (reduced ? 0 : activeTime * 0.8);
              const ring = Math.floor(i / 24);
              dummy.position.set(
                x + Math.cos(a) * (62 + ring * 2),
                baseY + 4 + ((i % 24) / 24) * (monumentSite.height ?? 180),
                z + Math.sin(a) * (40 + ring * 2),
              );
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(reduced ? 1.2 : 0.9, reduced ? 1.2 : 3.5, 0.9);
              dummy.updateMatrix();
              riseWater.setMatrixAt(i, dummy.matrix);
            }
            riseWater.instanceMatrix.needsUpdate = true;
          }
        }
        finishChannels.forEach((m, i) => {
          m.emissiveIntensity = trial.homewardAvailable
            ? 0.95
            : i < stable
              ? 0.58
              : 0.08;
        });
        monumentChannels.forEach((m, i) => {
          m.emissiveIntensity = trial.homewardAvailable
            ? 0.95
            : i < stable
              ? 0.6
              : 0.04;
        });
        if (!monumentSite)
          state.homewardReady = Boolean(trial.homewardAvailable);
        group.userData.homewardAvailable = state.homewardReady;
        homewardRoot.visible = state.homewardReady;
        if (threshold) threshold.visible = state.homewardReady;
        if (homewardCurve && homewardBeads && homewardRoot.visible) {
          const speed = 22 / Math.max(1, homewardCurve.getLength());
          for (let i = 0; i < 64; i++) {
            const t = (i / 64 + activeTime * speed) % 1;
            dummy.position.copy(homewardCurve.getPointAt(t));
            dummy.quaternion.setFromUnitVectors(
              UP,
              homewardCurve.getTangentAt(t),
            );
            dummy.scale.set(0.8, 3.5, 0.8);
            dummy.updateMatrix();
            homewardBeads.setMatrixAt(i, dummy.matrix);
          }
          homewardBeads.instanceMatrix.needsUpdate = true;
        }
        if (state.monument === "error" && advance > 0) prepareMonument();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
