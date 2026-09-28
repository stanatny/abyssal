import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createArticulatedHuman } from "./human_models.js";

/**
 * islandHeight 返回北侧岛屿连续地表高度；x、z 为世界坐标，base 为原海床高度。
 * 岛屿位于可游玩北界之外，幼鱼区内完全沿用原海床。
 */
export function islandHeight(x, z, base) {
  if (z <= 140) return base;
  const radius = Math.hypot(x / 305, (z - 335) / 166);
  const inland = (1 - radius) * 155;
  const beach = 4 + Math.min(inland * 0.24, 7.2);
  const coast = inland < 0 ? 4 + inland * 1.1 : beach;
  const r = Math.hypot((x - 137) / 110, (z - 337) / 78);
  const angle = Math.atan2((z - 337) / 78, (x - 137) / 110);
  const rim = Math.exp(-(((r - 0.77) / 0.24) ** 2));
  const summit = 43 + 15 * Math.cos(angle + 1.1);
  const erosion =
    1 + 0.08 * Math.sin(angle * 19 + r * 4) + 0.04 * Math.sin(angle * 37);
  const hill =
    rim * summit * erosion * THREE.MathUtils.smoothstep(inland, 20, 60);
  const land =
    coast +
    hill +
    Math.max(0, Math.min(inland / 25, 1)) *
      (Math.sin(x * 0.061) * Math.sin(z * 0.071) * 0.45);
  return THREE.MathUtils.lerp(
    base,
    Math.max(base, land),
    THREE.MathUtils.smoothstep(z, 140, 158),
  );
}

/**
 * createBeachEnvironment 创建有连续沙岸的度假岛；参数为父节点与共享地表函数。
 * 返回 update(time) 与 dispose()；成人仅为背景，不加入捕食、碰撞或生成系统。
 */
export function createBeachEnvironment(parent, { seabedHeight }) {
  const root = new THREE.Group();
  root.name = "hawaii_vacation_island";
  parent.add(root);
  const resources = new Set();
  const buckets = new Map();
  const people = [];
  const keep = (value) => (resources.add(value), value);
  const materials = new Map();
  const material = (color, roughness = 0.85) => {
    if (!materials.has(color))
      materials.set(
        color,
        keep(
          new THREE.MeshStandardMaterial({
            color,
            roughness,
            side: THREE.DoubleSide,
          }),
        ),
      );
    return materials.get(color);
  };
  const sandMaterial = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }),
  );
  const terrain = keep(new THREE.PlaneGeometry(720, 420, 144, 112));
  terrain.rotateX(-Math.PI / 2);
  terrain.translate(0, 0, 350);
  const p = terrain.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      y = seabedHeight(x, z);
    p.setY(i, y);
    const inland = (1 - Math.hypot(x / 305, (z - 335) / 166)) * 155;
    color.set("#a39269");
    color.lerp(
      new THREE.Color("#ddc99c"),
      THREE.MathUtils.smoothstep(y, 4.5, 5.7),
    );
    color.lerp(
      new THREE.Color("#74824c"),
      THREE.MathUtils.smoothstep(inland + Math.sin(x * 0.065) * 4, 25, 44),
    );
    color.lerp(
      new THREE.Color("#8e8460"),
      THREE.MathUtils.smoothstep(y, 20, 52),
    );
    color.multiplyScalar(0.94 + Math.sin(x * 0.13 + z * 0.09) * 0.055);
    colors.push(color.r, color.g, color.b);
  }
  terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const land = new THREE.Mesh(terrain, sandMaterial);
  land.name = "continuous_sand_dunes_and_tuff_ridge";
  land.receiveShadow = true;
  root.add(land);

  // 浪缘仅沿岛屿临海轮廓生成，水面透明层之后绘制，不覆盖干沙。
  const foamTime = { value: 0 };
  const foamMaterial = keep(
    new THREE.ShaderMaterial({
      uniforms: { beachTime: foamTime },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float beachTime; varying vec2 vUv;
      void main(){
        float crest=pow(max(0.0,sin(vUv.y*3.14159)),1.6);
        float broken=smoothstep(-0.55,0.35,sin(vUv.x*173.0+sin(vUv.x*37.0)*4.0+beachTime*0.25));
        float lace=0.5+0.5*sin(vUv.x*897.0+vUv.y*19.0);
        gl_FragColor=vec4(0.79,0.88,0.82,crest*broken*(0.13+lace*0.2));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const foamPositions = [],
    foamUvs = [],
    foamIndices = [];
  for (let row = 0; row <= 240; row++) {
    const t = row / 240,
      a = Math.PI + 0.12 + t * (Math.PI - 0.24);
    for (let side = 0; side < 2; side++) {
      const r = 1.002 + side * 0.009;
      foamPositions.push(
        Math.cos(a) * 305 * r,
        4.21,
        335 + Math.sin(a) * 166 * r,
      );
      foamUvs.push(t, side);
    }
    if (row < 240) {
      const i = row * 2;
      foamIndices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const foamGeometry = keep(new THREE.BufferGeometry());
  foamGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(foamPositions, 3),
  );
  foamGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(foamUvs, 2));
  foamGeometry.setIndex(foamIndices);
  const foam = new THREE.Mesh(foamGeometry, foamMaterial);
  foam.renderOrder = 2;
  foam.name = "island_shore_break";
  root.add(foam);

  // 静态布料、家具和植物按材质合批；避免每根伞骨、叶片各占一次绘制。
  function batch(
    geometry,
    mat,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  ) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    geometry.deleteAttribute("uv");
    geometry.applyMatrix4(matrix);
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geometry);
  }
  function rod(a, b, radius, mat) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      delta = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius * 1.06,
      delta.length(),
      7,
    );
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.normalize(),
      ),
    );
    geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
    batch(geometry, mat);
  }
  const timber = material("#987750"),
    frame = material("#d6cfb5"),
    cream = material("#e7ddbc");
  const turquoise = material("#328b91"),
    rust = material("#cc7352"),
    navy = material("#476d81");
  const palette = [turquoise, rust, navy];
  function umbrella(x, z, variant, size = 1) {
    const y = seabedHeight(x, z),
      height = 3.35 * size,
      radius = 2.35 * size;
    rod([x, y, z], [x, y + height + 0.18, z], 0.047 * size, timber);
    for (let sector = 0; sector < 10; sector++) {
      const vertices = [],
        indices = [];
      for (let row = 0; row <= 5; row++) {
        const r = row / 5;
        for (let col = 0; col <= 6; col++) {
          const u = col / 6,
            a = ((sector + u) / 10) * Math.PI * 2;
          const scallop = Math.sin(u * Math.PI);
          const radial = radius * r * (1 - 0.025 * scallop * r);
          const drop = radius * (0.31 * r + 0.065 * r * r * scallop);
          vertices.push(
            x + Math.cos(a) * radial,
            y + height - drop,
            z + Math.sin(a) * radial,
          );
          if (row < 5 && col < 6) {
            const k = row * 7 + col;
            if (row > 0) indices.push(k, k + 7, k + 1);
            indices.push(k + 1, k + 7, k + 8);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      batch(g, sector % 2 ? cream : palette[variant]);
      const a = (sector / 10) * Math.PI * 2;
      rod(
        [x, y + height - 0.04, z],
        [
          x + Math.cos(a) * radius,
          y + height - radius * 0.31 - 0.04,
          z + Math.sin(a) * radius,
        ],
        0.017,
        frame,
      );
    }
    batch(new THREE.SphereGeometry(0.085 * size, 10, 6), timber, [
      x,
      y + height + 0.18,
      z,
    ]);
  }
  function chair(x, z, angle, variant) {
    const y = seabedHeight(x, z);
    const transform = (a) => [
      x + a[0] * Math.cos(angle) + a[2] * Math.sin(angle),
      y + a[1],
      z - a[0] * Math.sin(angle) + a[2] * Math.cos(angle),
    ];
    for (const s of [-1, 1]) {
      rod(
        transform([s * 0.4, 0.35, -0.95]),
        transform([s * 0.4, 0.47, 0.45]),
        0.032,
        frame,
      );
      rod(
        transform([s * 0.4, 0.47, 0.4]),
        transform([s * 0.4, 1.15, 0.9]),
        0.032,
        frame,
      );
      rod(
        transform([s * 0.4, 0, -0.7]),
        transform([s * 0.4, 0.44, -0.45]),
        0.03,
        frame,
      );
      rod(
        transform([s * 0.4, 0, 0.65]),
        transform([s * 0.4, 0.44, 0.25]),
        0.03,
        frame,
      );
    }
    batch(
      new THREE.BoxGeometry(0.75, 0.045, 1.43),
      palette[variant],
      transform([0, 0.42, -0.25]),
      [0, angle, 0],
    );
    batch(
      new THREE.BoxGeometry(0.75, 0.045, 0.88),
      palette[variant],
      transform([0, 0.8, 0.65]),
      [-0.94, angle, 0],
    );
    batch(
      new THREE.BoxGeometry(0.6, 0.13, 0.24),
      cream,
      transform([0, 1.07, 0.81]),
      [-0.94, angle, 0],
    );
  }
  const groups = [
    [-59, 181, 0],
    [-37, 178, 1],
    [-12, 178, 2],
    [17, 181, 0],
    [44, 185, 1],
    [74, 190, 2],
    [-92, 190, 1],
  ];
  for (const [x, z, v] of groups) {
    umbrella(x, z, v, 1.15);
    chair(x - 1.7, z - 1.6, -0.12, v);
    chair(x + 1.4, z - 1.5, 0.16, v);
    const towel = new THREE.PlaneGeometry(1.2, 2.5, 3, 8);
    towel.rotateX(-Math.PI / 2);
    towel.rotateY(-0.12);
    towel.translate(x + 4, 0, z - 1);
    const towelPositions = towel.attributes.position;
    for (let i = 0; i < towelPositions.count; i++) {
      towelPositions.setY(
        i,
        seabedHeight(towelPositions.getX(i), towelPositions.getZ(i)) + 0.04,
      );
    }
    towel.computeVertexNormals();
    batch(towel, cream);
  }

  const trunkMat = material("#78674b"),
    leafMat = material("#496d3a"),
    leafLight = material("#6a853e");
  // 弧形树干与羽状叶冠，单片叶的中脊和两侧小叶共同构成可读轮廓。
  function palm(x, z, height, lean, phase) {
    const y = seabedHeight(x, z);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x + lean * 0.15, y + height * 0.38, z),
      new THREE.Vector3(x + lean * 0.6, y + height * 0.76, z + 0.2),
      new THREE.Vector3(x + lean, y + height, z + 0.4),
    ]);
    batch(new THREE.TubeGeometry(curve, 12, 0.22, 8, false), trunkMat);
    const top = curve.getPoint(1);
    for (let leaf = 0; leaf < 9; leaf++) {
      const a = (leaf / 9) * Math.PI * 2 + phase,
        length = 3.8 + Math.sin(leaf * 8 + phase) * 0.6;
      const point = (t) =>
        top
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(a) * length * t,
              Math.sin(t * Math.PI) * 0.85 - t * t * 1.65,
              Math.sin(a) * length * t,
            ),
          );
      const path = new THREE.CatmullRomCurve3(
        Array.from({ length: 10 }, (_, i) => point(i / 9)),
      );
      batch(new THREE.TubeGeometry(path, 12, 0.025, 4, false), leafLight);
      const vertices = [],
        indices = [];
      for (let i = 1; i < 13; i++) {
        const t = i / 14,
          mid = point(t),
          breadth = Math.sin(t * Math.PI) * 0.82;
        for (const side of [-1, 1]) {
          const outward = new THREE.Vector3(
            -Math.sin(a) * side * breadth + Math.cos(a) * 0.26,
            -0.15 - breadth * 0.3,
            Math.cos(a) * side * breadth + Math.sin(a) * 0.26,
          );
          const tip = mid.clone().add(outward),
            k = vertices.length / 3;
          vertices.push(
            ...mid.toArray(),
            ...point(t + 0.055).toArray(),
            ...tip.toArray(),
          );
          indices.push(k, k + 1, k + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      batch(g, leaf % 3 ? leafMat : leafLight);
    }
  }
  for (const [i, [x, z]] of [
    [-105, 215],
    [-85, 205],
    [-52, 213],
    [-19, 215],
    [15, 211],
    [48, 219],
    [81, 222],
    [105, 236],
    [-145, 233],
    [-171, 255],
    [-121, 275],
    [-65, 258],
    [9, 257],
  ].entries())
    palm(x, z, 9 + Math.sin(i * 4) * 1.7, Math.sin(i * 2) * 1.8, i * 1.9);

  // 沿用已验收的成人解剖、衣着和骨骼，重设为站立交谈或沙滩休息姿态。
  function adult(x, z, sex, heading, pose, phase) {
    const human = createArticulatedHuman("swimmer", 2.35, sex);
    human.name = `vacation_adult_${sex}_${pose}`;
    const bones = human.userData.poseBones;
    for (const bone of Object.values(bones)) bone.rotation.set(0, 0, 0);
    human.rotation.set(Math.PI / 2, 0, 0);
    const placement = new THREE.Group();
    placement.rotation.y = heading;
    placement.position.set(x, seabedHeight(x, z) + 1.01, z);
    placement.add(human);
    root.add(placement);
    bones.left_shoulder.rotation.y = -0.12;
    bones.right_shoulder.rotation.y = 0.1;
    bones.left_elbow.rotation.x = -0.18;
    bones.right_elbow.rotation.x = pose === "talking" ? -1.0 : -0.22;
    bones.right_shoulder.rotation.x = pose === "talking" ? 0.3 : 0;
    bones.left_hip.rotation.y = -0.025;
    bones.right_hip.rotation.y = 0.025;
    bones.left_ankle.rotation.x = 1.35;
    bones.right_ankle.rotation.x = 1.35;
    if (pose === "sunbathing") {
      human.rotation.x = Math.PI;
      bones.left_ankle.rotation.x = 0.15;
      bones.right_ankle.rotation.x = 0.15;
      placement.position.y = seabedHeight(x, z) + 0.17;
      bones.left_shoulder.rotation.y = -0.5;
      bones.right_shoulder.rotation.y = 0.5;
      bones.right_hip.rotation.x = 0.2;
      bones.right_knee.rotation.x = -0.28;
    }
    // 以真实蒙皮顶点求接地，避免沿用游泳模型包络导致脚或背部埋入斜沙面。
    placement.updateMatrixWorld(true);
    let clearance = Infinity;
    const vertex = new THREE.Vector3();
    human.traverse((mesh) => {
      if (!mesh.isSkinnedMesh) return;
      mesh.skeleton.update();
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
        clearance = Math.min(
          clearance,
          vertex.y - seabedHeight(vertex.x, vertex.z),
        );
      }
    });
    placement.position.y += (pose === "sunbathing" ? 0.055 : 0.015) - clearance;
    people.push({ human, bones, phase, pose });
  }
  adult(-33, 175.6, "female", -0.9, "talking", 0);
  adult(-34.5, 175.8, "male", 0.9, "standing", 2);
  adult(21, 180, "female", -0.1, "sunbathing", 4);
  adult(48, 184, "male", -0.2, "sunbathing", 1);
  adult(-10, 174.8, "male", 0.3, "standing", 3);
  adult(70, 187, "female", -0.5, "talking", 5);

  for (const [mat, geometries] of buckets) {
    const geometry = keep(mergeGeometries(geometries));
    geometries.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = "beach_batched_furniture_and_palms";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  let disposed = false;
  return {
    root,
    update(time) {
      if (disposed) return;
      foamTime.value = time;
      for (const { bones, phase, pose } of people) {
        bones.head.rotation.z = Math.sin(time * 0.35 + phase) * 0.035;
        bones.chest.rotation.x = Math.sin(time * 0.7 + phase) * 0.006;
        if (pose === "talking")
          bones.right_elbow.rotation.x =
            -1 + Math.sin(time * 0.6 + phase) * 0.08;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      people.forEach(({ human }) => human.userData.dispose());
      resources.forEach((resource) => resource.dispose());
      root.removeFromParent();
    },
  };
}
