import * as T from "three";
import { penglaiGiantAsset, penglaiGiantFit } from "./penglai_giant_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, createLordBones } from "./hawaii_lord_rig.js";

export const PENGLAI_HF_GIANTS = new Set(["bashe", "kui", "kun"]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);

/** The serpent, monopod and cloud-whale each deform around their own measured anatomy. */
export function buildPenglaiGiantHF(kind, root, motions) {
  const fit = penglaiGiantFit(kind),
    chains = fit.chains.map((c) => ({
      ...c,
      points: c.points.map((p) => [...p]),
    }));
  const bones = createLordBones(root, chains),
    base = bones[0],
    p = new T.Vector3();
  const find = (name) => chains.find((c) => c.name === name);
  const axis = find("axis"),
    tail = find("tail"),
    leg = find("leg"),
    neck = find("neck");
  const fins = chains.filter((c) => c.type === "paddle");
  const asset = penglaiGiantAsset(kind, (x, y, z, ids, w, o) => {
    p.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    if (kind === "bashe") {
      // Axial ownership follows longitudinal position, avoiding nearest-branch flips
      // where the original curved source comes close to itself.
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
    } else if (kind === "kun") {
      const paddle =
        smooth(0.115, 0.2, Math.abs(x)) * (1 - smooth(-0.04, 0.09, z));
      if (paddle > 0) chainWeights(fins[x < 0 ? 0 : 1], p, paddle, ids, w, o);
      else chainWeights(tail, p, smooth(-0.07, 0.13, z), ids, w, o);
    } else {
      const legWeight =
        (1 - smooth(fit.legY - 0.07, fit.legY + 0.045, y)) *
        (1 - smooth(0.12, 0.24, Math.abs(z - fit.legZ)));
      if (legWeight > 0) chainWeights(leg, p, legWeight, ids, w, o);
      else if (z > fit.tailStart)
        chainWeights(
          tail,
          p,
          smooth(fit.tailStart, fit.tailStart + 0.09, z),
          ids,
          w,
          o,
        );
      else
        chainWeights(
          neck,
          p,
          smooth(0.24, 0.39, -z) * smooth(-0.06, 0.08, y),
          ids,
          w,
          o,
        );
    }
  });
  if (kind === "kui" && !asset.geometry.userData.terrainRigidVertexIndices) {
    const a = asset.geometry.attributes,
      flexible = new Set([...leg.ids, ...tail.ids]);
    const rigid = [];
    for (let i = 0; i < a.position.count; i++) {
      let w = 0;
      for (let j = 0; j < 4; j++)
        if (flexible.has(a.skinIndex.array[i * 4 + j]))
          w += a.skinWeight.array[i * 4 + j];
      if (w < 0.25) rigid.push(i);
    }
    asset.geometry.userData.terrainRigidVertexIndices = rigid;
  }
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.65,
  );
  root.userData.hfRig = { kind, mesh, bones, chains, axis, tail, leg, fins };
  root.userData.artRevision = "trellis_penglai_giants_20261027";
  root.userData.mythicAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.groundSupport = fit.ground;
  const head = new T.Vector3(...fit.head);
  root.userData.getHeadWorldPositions = () => [root.localToWorld(head.clone())];
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const absolute = axis?.ids.map(() => new T.Quaternion()),
    inverse = new T.Quaternion(),
    euler = new T.Euler(0, 0, 0, "YXZ");
  // The caller already advances phase with effort. Never multiply an accumulated
  // clock by the current speed: sprint transitions must stay continuous.
  motions.push((phase, effort, state) => {
    if (kind === "bashe") {
      for (let i = 0; i < axis.ids.length; i++) {
        const u = i / (axis.ids.length - 1),
          wave = phase * 0.64 - u * Math.PI * 2.3;
        absolute[i].setFromEuler(
          euler.set(
            Math.sin(wave - 0.6) * (0.025 + 0.1 * u),
            Math.cos(wave) * (0.045 + 0.64 * u),
            0,
            "YXZ",
          ),
        );
        const q = bones[axis.ids[i]].quaternion;
        if (i)
          q.copy(inverse.copy(absolute[i - 1]).invert()).multiply(absolute[i]);
        else q.copy(absolute[i]);
      }
    } else if (kind === "kun") {
      tail.ids.forEach((id, j) => {
        bones[id].rotation.x =
          Math.sin(phase * 0.65 - j * 0.6) * (0.028 + j * 0.022);
        bones[id].rotation.y = Math.sin(phase * 0.37 - j * 0.55) * 0.012;
      });
      for (const c of fins)
        c.ids.forEach((id, j) => {
          bones[id].rotation.z =
            c.side *
            Math.sin(phase * 0.65 - 0.65 - j * 0.4) *
            (j ? 0.08 : 0.18);
          bones[id].rotation.y =
            c.side * Math.sin(phase * 0.65 - 1 - j * 0.4) * 0.035;
        });
    } else {
      const moving = state
        ? T.MathUtils.clamp(
            (state.speed ?? 0) / Math.max(0.1, root.scale.x * 0.15),
            0,
            1,
          )
        : 1;
      const crouch =
        state?.phase === "windup" ? smooth(0, 0.5, state.progress ?? 1) : 0;
      const leap =
        state?.phase === "leap"
          ? Math.sin(Math.PI * (state.progress ?? 0.5))
          : 0;
      const cycle = (Math.sin(phase) + 1) * 0.5,
        hop = Math.max(0, Math.sin(phase)) ** 2;
      base.position.y =
        0.028 * hop * moving * (1 - crouch) * (1 - leap) - 0.012 * crouch;
      bones[leg.ids[0]].rotation.x =
        (cycle - 0.5) * 0.12 * moving * (1 - crouch) + 0.16 * leap;
      bones[leg.ids[0]].scale.y = 1 - 0.065 * crouch - 0.045 * hop * moving;
      bones[leg.ids[1]].rotation.x = -bones[leg.ids[0]].rotation.x;
      bones[neck.ids[0]].rotation.x =
        0.014 * Math.sin(phase - 0.4) * moving - 0.025 * crouch;
      tail.ids.forEach((id, j) => {
        bones[id].rotation.y = Math.sin(phase * 0.4 - j * 0.5) * 0.035;
      });
    }
  });
}
