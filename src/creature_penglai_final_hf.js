import * as T from "three";
import { penglaiFinalAsset, penglaiFinalFit } from "./penglai_final_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  nearestChain,
  chainWeights,
  createLordBones,
} from "./hawaii_lord_rig.js";
export const PENGLAI_HF_FINAL = new Set([
  "gate_dragon",
  "peng",
  "gilded_cloud_carp",
  "taotie",
]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);

/** Final Penglai forms: continuous axial support and anatomically owned appendages. */
export function buildPenglaiFinalHF(kind, root, motions) {
  const fit = penglaiFinalFit(kind),
    chains = fit.chains.map((c) => ({
      ...c,
      points: c.points.map((p) => [...p]),
    }));
  const bones = createLordBones(root, chains),
    point = new T.Vector3();
  const axis = chains.find((c) => c.name === "axis"),
    tail = chains.find((c) => c.name === "tail"),
    neck = chains.find((c) => c.name === "neck"),
    jaw = chains.find((c) => c.name === "jaw");
  const legs = chains.filter((c) => c.type === "leg"),
    wings = chains.filter((c) => c.type === "wing"),
    fins = chains.filter((c) => c.type === "paddle");
  // A dragon's feet move with the section of its long trunk supporting them.
  if (axis)
    for (const c of legs) {
      let i = 0;
      while (
        i < axis.points.length - 1 &&
        axis.points[i + 1][2] <= c.points[0][2]
      )
        i++;
      const b = bones[c.ids[0]];
      bones[axis.ids[i]].add(b);
      b.position.fromArray(c.points[0]).sub(new T.Vector3(...axis.points[i]));
    }
  function axial(z, ids, w, o) {
    let i = 0;
    while (i < axis.points.length - 2 && z > axis.points[i + 1][2]) i++;
    const u = T.MathUtils.clamp(
      (z - axis.points[i][2]) / (axis.points[i + 1][2] - axis.points[i][2]),
      0,
      1,
    );
    ids[o] = axis.ids[i];
    ids[o + 1] = axis.ids[i + 1];
    w[o] = 1 - u;
    w[o + 1] = u;
  }
  const asset = penglaiFinalAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    if (axis) {
      axial(z, ids, w, o);
      // The raised face is one rigid head; the lower neck blends into the trunk.
      const head = smooth(-0.075, -0.035, y) * (1 - smooth(-0.39, -0.33, z));
      w[o] *= 1 - head;
      w[o + 1] *= 1 - head;
      ids[o + 2] = axis.ids[0];
      w[o + 2] = head;
    }
    if (kind === "peng") {
      const amount = smooth(0.07, 0.145, Math.abs(x));
      if (amount > 0)
        chainWeights(wings[x < 0 ? 0 : 1], point, amount, ids, w, o);
      else if (z > 0.08)
        chainWeights(tail, point, smooth(0.08, 0.24, z), ids, w, o);
    } else if (kind === "gilded_cloud_carp") {
      const fin =
        smooth(0.065, 0.145, Math.abs(x)) *
        (1 - smooth(-0.08, 0.1, z)) *
        (1 - smooth(-0.02, 0.035, y));
      if (fin > 0) chainWeights(fins[x < 0 ? 0 : 1], point, fin, ids, w, o);
      else chainWeights(tail, point, smooth(-0.08, 0.08, z), ids, w, o);
    } else {
      if (kind === "taotie") {
        if (z > 0.32 && y > -0.07)
          chainWeights(tail, point, smooth(0.32, 0.4, z), ids, w, o);
        else {
          const head = smooth(0.16, 0.34, -z) * smooth(-0.11, -0.045, y);
          chainWeights(neck, point, head, ids, w, o);
          const mouth =
            head * (1 - smooth(fit.jawY - 0.015, fit.jawY + 0.02, y));
          const near = nearestChain(point, jaw),
            sum = new Map();
          for (let j = 0; j < 4; j++)
            if (w[o + j])
              sum.set(
                ids[o + j],
                (sum.get(ids[o + j]) || 0) + w[o + j] * (1 - mouth),
              );
          sum.set(near.a, (sum.get(near.a) || 0) + mouth * (1 - near.t));
          sum.set(near.b, (sum.get(near.b) || 0) + mouth * near.t);
          const top = [...sum].sort((a, b) => b[1] - a[1]).slice(0, 4),
            total = top.reduce((n, v) => n + v[1], 0);
          for (let j = 0; j < 4; j++) {
            ids[o + j] = top[j]?.[0] || 0;
            w[o + j] = (top[j]?.[1] || 0) / total;
          }
        }
      }
      // Blend only the actual under-body leg regions, never a nearest limb through the belly.
      const candidates = legs.map((c) => ({ c, near: nearestChain(point, c) }));
      const closest = Math.min(...candidates.map((v) => v.near.distance));
      const low = 1 - smooth(fit.legY - 0.08, fit.legY + 0.025, y);
      const coverage = low * (1 - smooth(0.075, 0.14, Math.sqrt(closest)));
      if (coverage > 0) {
        const sum = new Map();
        for (let j = 0; j < 4; j++)
          if (w[o + j])
            sum.set(
              ids[o + j],
              (sum.get(ids[o + j]) || 0) + w[o + j] * (1 - coverage),
            );
        let total = 0;
        for (const v of candidates) {
          v.k = Math.exp(-(v.near.distance - closest) / 0.0007);
          total += v.k;
        }
        for (const v of candidates) {
          const q = (coverage * v.k) / total;
          sum.set(v.near.a, (sum.get(v.near.a) || 0) + q * (1 - v.near.t));
          sum.set(v.near.b, (sum.get(v.near.b) || 0) + q * v.near.t);
        }
        const top = [...sum].sort((a, b) => b[1] - a[1]).slice(0, 4),
          norm = top.reduce((s, v) => s + v[1], 0);
        for (let j = 0; j < 4; j++) {
          ids[o + j] = top[j]?.[0] || 0;
          w[o + j] = (top[j]?.[1] || 0) / norm;
        }
        return;
      }
    }
  });
  if (kind === "taotie" && !asset.geometry.userData.terrainRigidVertexIndices) {
    const a = asset.geometry.attributes,
      flexible = new Set([...legs, tail].flatMap((c) => c.ids)),
      rigid = [];
    for (let i = 0; i < a.position.count; i++) {
      let n = 0;
      for (let j = 0; j < 4; j++)
        if (flexible.has(a.skinIndex.array[i * 4 + j]))
          n += a.skinWeight.array[i * 4 + j];
      if (n < 0.25) rigid.push(i);
    }
    asset.geometry.userData.terrainRigidVertexIndices = rigid;
  }
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.8,
  );
  root.userData.hfRig = {
    kind,
    mesh,
    bones,
    chains,
    axis,
    tail,
    legs,
    wings,
    fins,
  };
  root.userData.artRevision = "trellis_penglai_final_20261027";
  root.userData.mythicAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.groundSupport = fit.ground;
  if (fit.head) {
    const head = new T.Vector3(...fit.head);
    if (axis) {
      root.updateMatrixWorld(true);
      const local = bones[axis.ids[0]].worldToLocal(
        root.localToWorld(head.clone()),
      );
      root.userData.getHeadWorldPositions = () => {
        root.updateMatrixWorld(true);
        return [bones[axis.ids[0]].localToWorld(local.clone())];
      };
    } else
      root.userData.getHeadWorldPositions = () => [
        root.localToWorld(head.clone()),
      ];
  }
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const stride = legs.map((c) => {
    const [a, b, d] = c.points;
    const first = [b[1] - a[1], b[2] - a[2]],
      second = [d[1] - b[1], d[2] - b[2]];
    const angle1 = Math.atan2(first[1], first[0]),
      angle2 = Math.atan2(second[1], second[0]);
    const bend = Math.atan2(
      Math.sin(angle2 - angle1),
      Math.cos(angle2 - angle1),
    );
    return {
      c,
      length1: Math.hypot(...first),
      length2: Math.hypot(...second),
      angle1,
      bend,
    };
  });
  const axialPositions = axis?.points.map((p) => new T.Vector3(...p));
  const abs = axis?.ids.map(() => new T.Quaternion()),
    inv = new T.Quaternion(),
    euler = new T.Euler(0, 0, 0, "YXZ");
  motions.push((phase, effort, state) => {
    if (axis) {
      for (let i = 0; i < axis.ids.length; i++) {
        const u = i / (axis.ids.length - 1),
          wave = phase * 0.6 - u * 7;
        const lateral = 0.038 + 0.025 * u,
          vertical = 0.015 + 0.008 * u;
        axialPositions[i].fromArray(axis.points[i]);
        axialPositions[i].x += Math.sin(wave) * lateral;
        axialPositions[i].y += Math.sin(wave - 0.8) * vertical;
        abs[i].setFromEuler(
          euler.set(
            Math.atan(
              (vertical * 7 * Math.cos(wave - 0.8) -
                0.008 * Math.sin(wave - 0.8)) /
                0.95,
            ),
            Math.atan(
              (0.025 * Math.sin(wave) - lateral * 7 * Math.cos(wave)) / 0.95,
            ),
            0,
            "YXZ",
          ),
        );
      }
      for (let i = 0; i < axis.ids.length; i++) {
        const bone = bones[axis.ids[i]];
        bone.position.copy(axialPositions[i]);
        if (i) {
          inv.copy(abs[i - 1]).invert();
          bone.position.sub(axialPositions[i - 1]).applyQuaternion(inv);
          bone.quaternion.copy(inv).multiply(abs[i]);
        } else bone.quaternion.copy(abs[i]);
      }
      for (const c of legs) {
        bones[c.ids[0]].rotation.x = Math.sin(phase * 0.6 + c.side) * 0.06;
        bones[c.ids[1]].rotation.x =
          Math.sin(phase * 0.6 + c.side - 0.4) * 0.06;
      }
    } else if (kind === "peng") {
      const flap = Math.sin(phase * 0.65);
      for (const c of wings) {
        bones[c.ids[0]].rotation.z = c.side * (-0.16 + flap * 0.32);
        bones[c.ids[1]].rotation.z =
          c.side * (0.08 + Math.sin(phase * 0.65 - 0.6) * 0.2);
        bones[c.ids[2]].rotation.z = c.side * Math.sin(phase * 0.65 - 1) * 0.1;
      }
      tail.ids.forEach((id, i) => {
        bones[id].rotation.x = Math.sin(phase * 0.4 - i * 0.5) * 0.025;
        bones[id].rotation.y = Math.sin(phase * 0.33 - i * 0.5) * 0.015;
      });
    } else if (kind === "gilded_cloud_carp") {
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y =
            Math.sin(phase * 0.85 - i * 0.7) * (0.035 + i * 0.022)),
      );
      for (const c of fins) {
        bones[c.ids[0]].rotation.y =
          c.side * Math.sin(phase * 0.85 - 0.8) * 0.13;
        bones[c.ids[1]].rotation.z =
          c.side * Math.sin(phase * 0.85 - 1.3) * 0.1;
      }
    } else {
      const gait = (state?.gaitPhase ?? phase * 0.7) * 1.5,
        moving = state
          ? T.MathUtils.clamp(
              (state.speed ?? 0) / Math.max(0.1, root.scale.x * 0.13),
              0,
              1,
            )
          : 1;
      // A four-beat walk: planted paws travel backward relative to the trunk,
      // then lift and recover. Fit each asymmetric generated leg in its own rest frame.
      for (const { c, length1, length2, angle1, bend } of stride) {
        // A blocked or stopped walker keeps its last planted stance.
        if (state && moving === 0) continue;
        const offset = (c.side === 1 ? 0.5 : 0) + (c.front ? 0 : 0.25);
        const cycle = T.MathUtils.euclideanModulo(
          gait / (Math.PI * 2) + offset,
          1,
        );
        const stance = 0.62;
        const swing = T.MathUtils.clamp((cycle - stance) / (1 - stance), 0, 1);
        const z =
          cycle < stance
            ? T.MathUtils.lerp(-0.075, 0.075, cycle / stance)
            : 0.075 * Math.cos(swing * Math.PI);
        const lift = Math.sin(swing * Math.PI) ** 2 * 0.05;
        const dy = -0.245 + lift - c.points[0][1],
          dz = z + (c.front ? -0.015 : 0.025);
        const distance = Math.min(
          Math.hypot(dy, dz),
          (length1 + length2) * 0.985,
        );
        const knee =
          Math.sign(bend || 1) *
          Math.acos(
            T.MathUtils.clamp(
              (distance * distance - length1 * length1 - length2 * length2) /
                (2 * length1 * length2),
              -1,
              1,
            ),
          );
        const hip =
          Math.atan2(dz, dy) -
          Math.atan2(
            length2 * Math.sin(knee),
            length1 + length2 * Math.cos(knee),
          );
        const hipRotation = Math.atan2(
          Math.sin(hip - angle1),
          Math.cos(hip - angle1),
        );
        const kneeRotation = knee - bend;
        bones[c.ids[0]].rotation.x = hipRotation;
        bones[c.ids[1]].rotation.x = kneeRotation;
        bones[c.ids[2]].rotation.x = -(hipRotation + kneeRotation);
      }
      neck.ids.forEach(
        (id, i) =>
          (bones[id].rotation.x = Math.sin(phase * 0.4 - i * 0.3) * 0.018),
      );
      jaw.ids.forEach(
        (id) =>
          (bones[id].rotation.x = -(state?.phase === "windup"
            ? 0.075
            : state?.phase === "leap"
              ? 0.11
              : 0.025 + Math.sin(phase * 0.4) * 0.018)),
      );
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y = Math.sin(phase * 0.45 - i * 0.5) * 0.06),
      );
    }
  });
}
