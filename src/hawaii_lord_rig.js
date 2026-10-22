import * as THREE from "three";

const v = new THREE.Vector3(),
  a = new THREE.Vector3(),
  b = new THREE.Vector3(),
  closest = new THREE.Vector3();

/** 将顶点绑定到实际解剖中心线的相邻关节；末端整片结构不拆成互相撕扯的骨节。 */
export function nearestChain(point, chain) {
  let best = { distance: Infinity, a: chain.ids[0], b: chain.ids[0], t: 0 };
  for (let i = 0; i < chain.points.length - 1; i++) {
    a.fromArray(chain.points[i]);
    b.fromArray(chain.points[i + 1]);
    const direction = b.sub(a),
      length2 = direction.lengthSq();
    const t = THREE.MathUtils.clamp(
      v.copy(point).sub(a).dot(direction) / Math.max(length2, 1e-9),
      0,
      1,
    );
    closest.copy(a).addScaledVector(direction, t);
    const distance = closest.distanceToSquared(point);
    if (distance < best.distance)
      best = { distance, a: chain.ids[i], b: chain.ids[i + 1], t };
  }
  return best;
}

/** 分支起点与母体连续混合，UV 副本使用相同坐标得到相同权重。 */
export function chainWeights(chain, point, blend, ids, weights, offset) {
  const nearest = nearestChain(point, chain);
  ids[offset] = 0;
  ids[offset + 1] = nearest.a;
  ids[offset + 2] = nearest.b;
  weights[offset] = 1 - blend;
  weights[offset + 1] = blend * (1 - nearest.t);
  weights[offset + 2] = blend * nearest.t;
}

/** 构造独立关节；配置中的点为模型局部空间，不把生成图中的位置当转轴。 */
export function createLordBones(root, chains) {
  const base = new THREE.Bone();
  base.name = "lord_root";
  root.add(base);
  const bones = [base];
  for (const chain of chains) {
    chain.ids = [];
    chain.points.forEach((p, i) => {
      const bone = new THREE.Bone();
      bone.name = `${chain.name}_${i}`;
      bone.position.fromArray(p);
      if (i) bone.position.sub(new THREE.Vector3(...chain.points[i - 1]));
      let parent = i ? bones[chain.ids[i - 1]] : base;
      if (!i && chain.type === "fin") {
        const tail = chains.find((c) => c.type === "tail");
        let support = -1;
        tail.points.forEach((q, j) => {
          if (q[2] <= p[2]) support = j;
        });
        if (support >= 0) {
          parent = bones[tail.ids[support]];
          bone.position.sub(new THREE.Vector3(...tail.points[support]));
        }
      }
      parent.add(bone);
      chain.ids.push(bones.length);
      bones.push(bone);
    });
  }
  return bones;
}

/** 平滑运动强度仅依赖既有活动相位；暂停时重复相位不能继续变形。 */
export function lordEffortSmoother() {
  let previous,
    value = 1;
  return (phase, effort) => {
    const target = THREE.MathUtils.clamp(effort, 0.15, 3);
    if (previous === undefined || phase < previous) value = target;
    else
      value +=
        (target - value) * (1 - Math.exp(-Math.min(0.6, phase - previous) * 3));
    previous = phase;
    return value;
  };
}

/** 以实际顶点选择承重截面，腕足和鳍间空水域不会被包成整块刚体。 */
export function lordCoreParts(geometry, kind) {
  const p = geometry.attributes.position,
    groups =
      kind === "kraken"
        ? [[]]
        : Array.from({ length: kind === "hydra" ? 10 : 8 }, () => []);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    if (kind === "kraken") {
      if (z > 0.02 && Math.abs(x) < 0.17) groups[0].push(i);
    } else if (kind === "mayan") {
      if (z < 0.36) groups[Math.min(7, Math.floor((z + 0.5) * 8))].push(i);
    } else if (kind === "leviathan") {
      const radius =
        z < -0.3 ? 0.075 : z < -0.1 ? 0.105 : z < 0.1 ? 0.06 : 0.035;
      if (Math.abs(x) < radius && y < 0.08 && z < 0.28)
        groups[Math.min(7, Math.floor(((z + 0.5) / 0.9) * 8))].push(i);
    } else if (kind === "hydra") {
      if (y > 0.22 && z < -0.15) {
        const centers = [
          [-0.24, 0.27, -0.26],
          [-0.1, 0.33, -0.34],
          [0.04, 0.27, -0.43],
        ];
        let nearest = 0,
          distance = Infinity;
        centers.forEach((c, j) => {
          const d = (x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2;
          if (d < distance) {
            nearest = j;
            distance = d;
          }
        });
        groups[7 + nearest].push(i);
      } else if (y < 0.12 && Math.abs(x) < 0.105 && z > -0.2 && z < 0.43)
        groups[
          Math.min(6, Math.max(0, Math.floor(((z + 0.2) / 0.63) * 7)))
        ].push(i);
    }
  }
  return groups.filter((ids) => ids.length > 24);
}

/** 缓存索引三角形块的骨节局部盒，复用既有精确接触粗筛，避免每次咬击扫完整模型。 */
export function prepareLordSkinChunks(mesh) {
  const g = mesh.geometry;
  if (!g.userData.lordSkinChunks) {
    const chunks = [],
      p = g.attributes.position,
      ids = g.attributes.skinIndex,
      weights = g.attributes.skinWeight;
    for (let start = 0; start < g.index.count; start += 192) {
      const end = Math.min(start + 192, g.index.count),
        influences = new Map();
      for (let j = start; j < end; j++) {
        const i = g.index.getX(j);
        v.fromBufferAttribute(p, i).applyMatrix4(mesh.bindMatrix);
        for (let slot = 0; slot < 4; slot++) {
          if (weights.array[i * 4 + slot] === 0) continue;
          const joint = ids.array[i * 4 + slot];
          if (!influences.has(joint)) influences.set(joint, new THREE.Box3());
          influences
            .get(joint)
            .expandByPoint(
              a.copy(v).applyMatrix4(mesh.skeleton.boneInverses[joint]),
            );
          // Capture morphs must be inside the same broad-phase envelope as the
          // bind pose, otherwise visible reaching arms can be skipped by contact.
          for (const target of g.morphAttributes.position || []) {
            a.fromBufferAttribute(target, i);
            if (g.morphTargetsRelative) a.add(b.fromBufferAttribute(p, i));
            influences
              .get(joint)
              .expandByPoint(
                a
                  .applyMatrix4(mesh.bindMatrix)
                  .applyMatrix4(mesh.skeleton.boneInverses[joint]),
              );
          }
        }
      }
      chunks.push({ start, end, influences: [...influences] });
    }
    g.userData.lordSkinChunks = chunks;
  }
  mesh.userData.tentacleChunks = g.userData.lordSkinChunks;
  mesh.userData.tentacleBounds = { bones: mesh.skeleton.bones, padding: 1 };
}
