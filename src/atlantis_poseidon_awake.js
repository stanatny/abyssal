import * as THREE from "three";

const bindingCache = new WeakMap();

/** 为已验收的雕像原网格增加连续肩肘绑定；持戟手和整柄武器同一刚性变换。 */
export function createPoseidonAwakening(
  asset,
  origin,
  scale,
  sourceColliders,
  transformCollider,
) {
  const geometry = asset.geometry.clone();
  let binding = bindingCache.get(asset.geometry);
  if (!binding) {
    binding = createPoseidonBinding(asset.geometry);
    bindingCache.set(asset.geometry, binding);
  }
  const { ids, weights } = binding;
  const smooth = THREE.MathUtils.smoothstep;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  const mesh = new THREE.SkinnedMesh(geometry, asset.material);
  mesh.name = "poseidon_hf_monument";
  mesh.position.copy(origin);
  mesh.scale.setScalar(scale);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const root = new THREE.Bone(),
    shoulder = new THREE.Bone(),
    elbow = new THREE.Bone();
  shoulder.position.set(-7.1, 50, 0);
  elbow.position.set(-3.5, -5.5, 1.6);
  root.add(shoulder);
  shoulder.add(elbow);
  mesh.add(root);
  const skeleton = new THREE.Skeleton([root, shoulder, elbow]);
  mesh.bind(skeleton);
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x9cfff4).multiplyScalar(2),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
  });
  // 直接复用真实眼窝的三角面，只以深度偏移消除重叠，不再把发光球悬在脸前。
  eyeMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vEyeSurface;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvEyeSurface = position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vEyeSurface;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec2 eye = vec2((abs(vEyeSurface.x) - 1.12) / 0.48, (vEyeSurface.y - 59.6) / 0.18);
        diffuseColor.a *= 1.0 - smoothstep(0.45, 1.0, dot(eye, eye));
        if (diffuseColor.a < 0.005) discard;`,
      );
  };
  eyeMaterial.customProgramCacheKey = () => "poseidon_surface_eyes_v1";
  const eyes = [];
  for (const x of [-1.12, 1.12]) {
    const eye = new THREE.Mesh(surfaceEyeGeometry(geometry, x), eyeMaterial);
    eye.name = `poseidon_surface_eye_${x < 0 ? "right" : "left"}`;
    mesh.add(eye);
    eyes.push(eye);
  }
  const tipMaterial = new THREE.MeshBasicMaterial({
    color: 0x9cfff4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const tipGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12),
    tipMaterial,
  );
  mesh.add(tipGlow);
  const fixed = [],
    moving = [],
    bindings = [];
  for (const c of sourceColliders) {
    const transformed = transformCollider(
      c,
      origin.x,
      origin.y,
      origin.z,
      scale,
      0,
    );
    if (/right_upper_arm|right_forearm|right_hand|trident/.test(c.kind)) {
      moving.push(transformed);
      bindings.push({
        source: c,
        collider: transformed,
        bone: c.kind.includes("upper_arm") ? 1 : 2,
      });
    } else fixed.push(transformed);
  }
  let time = 0,
    active = false,
    disposed = false;
  const transforms = [
    new THREE.Matrix4(),
    new THREE.Matrix4(),
    new THREE.Matrix4(),
  ];
  function update(dt) {
    if (disposed) return;
    if (active) time = Math.min(5, time + Math.max(0, Math.min(dt, 0.1)));
    const progress = smooth(time, 0.5, 4);
    shoulder.rotation.z = -1.35 * progress;
    elbow.rotation.z = 1.35 * progress;
    eyeMaterial.opacity = active ? smooth(time, 0, 0.5) * 0.95 : 0;
    tipMaterial.opacity = eyeMaterial.opacity;
    mesh.updateMatrixWorld(true);
    skeleton.bones.forEach((bone, i) =>
      transforms[i]
        .multiplyMatrices(bone.matrixWorld, skeleton.boneInverses[i])
        .multiply(mesh.bindMatrix),
    );
    for (const { source, collider, bone } of bindings) {
      for (const key of ["a", "b"]) {
        const v = new THREE.Vector3(
          source[key].x,
          source[key].y,
          source[key].z,
        ).applyMatrix4(transforms[bone]);
        Object.assign(collider[key], { x: v.x, y: v.y, z: v.z });
      }
    }
    // 戟尖与手臂共用矩阵，光点不能留在旧的高度。
    const tip = new THREE.Vector3(-9.8, 81.5, 4.2).applyMatrix4(transforms[2]);
    mesh.worldToLocal(tip);
    tipGlow.position.copy(tip);
  }
  update(0);
  return {
    mesh,
    fixed,
    moving,
    eyes,
    target: new THREE.Vector3(0, 47.5, 7.4).multiplyScalar(scale).add(origin),
    get progress() {
      return time;
    },
    awaken() {
      active = true;
    },
    update,
    reset() {
      active = false;
      time = 0;
      update(0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      skeleton.dispose();
      eyeMaterial.dispose();
      tipMaterial.dispose();
      eyes.forEach((eye) => eye.geometry.dispose());
      tipGlow.geometry.dispose();
    },
  };
}

/** 发光片完全沿用面部原顶点；片元遮罩限定眼裂，不填平眼窝或改变侧面轮廓。 */
function surfaceEyeGeometry(source, centerX) {
  const position = source.attributes.position,
    indices = source.index.array,
    vertices = [];
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [indices[i], indices[i + 1], indices[i + 2]];
    const xs = triangle.map((v) => position.getX(v)),
      ys = triangle.map((v) => position.getY(v)),
      zs = triangle.map((v) => position.getZ(v));
    if (
      Math.max(...xs) < centerX - 0.5 ||
      Math.min(...xs) > centerX + 0.5 ||
      Math.max(...ys) < 59.4 ||
      Math.min(...ys) > 59.8 ||
      Math.min(...zs) < 0.5 ||
      Math.max(...zs) > 3.5
    )
      continue;
    triangle.forEach((v) =>
      vertices.push(position.getX(v), position.getY(v), position.getZ(v)),
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  return geometry;
}

/** 同位置的图集重复点共用邻接权重；固定身体、手与整柄武器，只柔化肩肘过渡。 */
function createPoseidonBinding(source) {
  const position = source.attributes.position,
    index = source.index.array;
  const ids = new Uint16Array(position.count * 4),
    weights = new Float32Array(position.count * 4);
  const nodeForVertex = new Uint32Array(position.count),
    lookup = new Map(),
    nodes = [];
  const smooth = THREE.MathUtils.smoothstep;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const key = `${x},${y},${z}`;
    let node = lookup.get(key);
    if (node === undefined) {
      node = nodes.length;
      lookup.set(key, node);
      const weapon = (x < -8.3 && y < 40) || y > 67;
      const grip = y < 40 ? 0 : smooth(z, 1.8, 3.2) * smooth(-x, 7, 9);
      const arm = weapon
        ? 1
        : Math.max(smooth(-x, 5.8, 8.6) * smooth(y, 40, 44), grip);
      const fore = weapon
        ? 1
        : Math.max(
            smooth(y, 44, 53) * smooth(-x, 6.5, 9) * smooth(z, -0.5, 2.5),
            grip,
          );
      const pin =
        weapon || (x < -8.5 && y > 53 && z > 2.5)
          ? 2
          : arm === 0 || (y < 35 && x > -8) || x > -4.8
            ? 0
            : -1;
      nodes.push({
        weights: [1 - arm, arm * (1 - fore), arm * fore],
        neighbors: new Set(),
        pin,
      });
    }
    nodeForVertex[i] = node;
  }
  for (let i = 0; i < index.length; i += 3)
    for (let edge = 0; edge < 3; edge++) {
      const a = nodeForVertex[index[i + edge]],
        b = nodeForVertex[index[i + ((edge + 1) % 3)]];
      if (a !== b) {
        nodes[a].neighbors.add(b);
        nodes[b].neighbors.add(a);
      }
    }
  let current = new Float64Array(nodes.flatMap((node) => node.weights));
  const next = current.slice();
  for (let iteration = 0; iteration < 64; iteration++) {
    nodes.forEach((node, i) => {
      for (let bone = 0; bone < 3; bone++) {
        const k = i * 3 + bone;
        if (node.pin >= 0) next[k] = bone === node.pin ? 1 : 0;
        else if (node.neighbors.size) {
          let total = 0;
          for (const neighbor of node.neighbors)
            total += current[neighbor * 3 + bone];
          next[k] = current[k] * 0.4 + (total / node.neighbors.size) * 0.6;
        } else next[k] = current[k];
      }
    });
    current.set(next);
  }
  for (let i = 0; i < position.count; i++) {
    ids.set([0, 1, 2, 0], i * 4);
    const j = nodeForVertex[i] * 3;
    weights.set([current[j], current[j + 1], current[j + 2], 0], i * 4);
  }
  return { ids, weights };
}
