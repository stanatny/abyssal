import * as T from "three";
import { applyScyllaFootBinding } from "./scylla_skin.js";
import { bindScyllaSwim } from "./scylla_swim.js";
import {
  ODYSSEY_HF_LORD_DATA,
  odysseyLordHFAsset,
} from "./odyssey_lord_hf_asset.js";
import { decodePackedArray } from "./packed_array.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  nearestChain,
  prepareLordSkinChunks,
} from "./hawaii_lord_rig.js";
/** 六颈分别从真实肩根驱动；十二鳍足划水，吐息仍由既有六个嘴锚点发射。 */
export function buildScyllaHF(root, motions) {
  const body = new T.Group();
  body.name = "scylla_odyssean_anatomy";
  root.add(body);
  const heads = [],
    feet = [],
    tail = {
      name: "scylla_tail",
      type: "tail",
      points: [
        [0, -0.145, 0.19],
        [-0.015, -0.11, 0.31],
        [-0.06, -0.04, 0.42],
        [-0.12, 0.015, 0.47],
      ],
    };
  for (let row = 0; row < 3; row++)
    for (const side of [-1, 1]) {
      const x = side < 0 ? -0.068 : 0.105;
      const points = [
        [
          [x, -0.14, -0.34],
          [x, -0.035, -0.37],
          [x, 0.025, -0.445],
        ],
        [
          [x, -0.095, -0.26],
          [x, 0.075, -0.29],
          [x, 0.13, -0.395],
        ],
        [
          [x, -0.065, -0.125],
          [x, 0.12, -0.105],
          [x, 0.19, -0.21],
        ],
      ][row];
      heads.push({
        name: `scylla_neck${heads.length}`,
        side,
        row,
        points,
        mouth: [
          x,
          row === 0 ? 0.004 : row === 1 ? 0.107 : 0.17,
          row === 0 ? -0.49 : row === 1 ? -0.442 : -0.261,
        ],
      });
    }
  const rows = [-0.34, -0.235, -0.12, 0.05, 0.13, 0.21];
  for (const side of [-1, 1])
    for (let row = 0; row < 6; row++)
      feet.push({
        name: `scylla_fin_foot_${side}_${row}`,
        side,
        row,
        points: [
          [side * 0.075, -0.15, rows[row]],
          [side * 0.135, -0.195, rows[row]],
          [side * 0.175, -0.215, rows[row] - 0.01],
        ],
      });
  const chains = [...heads, ...feet, tail],
    bones = createLordBones(body, chains),
    p = new T.Vector3(),
    smooth = (a, b, v) => T.MathUtils.smoothstep(v, a, b);
  const ownership = decodePackedArray(
    ODYSSEY_HF_LORD_DATA.scylla.anatomyPart,
    Uint8Array,
  );
  const headBlend = decodePackedArray(
    ODYSSEY_HF_LORD_DATA.scylla.headBlend,
    Uint16Array,
  );
  const bind = (x, y, z, ids, w, o, index) => {
    p.set(x, y, z);
    if (ownership[index]) {
      const foot = feet[ownership[index] - 1];
      // 补齐的鳍足是根部埋入腹侧的独立连续表面；整片随根关节划水，
      // 不在足掌中段与不动躯干混合，否则大幅回桨会把足掌拉长。
      chainWeights(foot, p, 1, ids, w, o);
      return;
    }
    if (y < -0.1 && Math.abs(x) > 0.1 && z < 0.29) {
      // 原 HF 足根之间仍有连续腹侧皮肤；归属在该表面渐变，不能沿 Z 切断。
      const width = 0.004 + 0.035 * (1 - smooth(0.105, 0.145, Math.abs(x))),
        cuts = x < 0 ? [-0.205, -0.02, 0.14] : [-0.23, -0.065, 0.13],
        split = cuts.map((c) => smooth(c - width, c + width, z)),
        fractions = [
          1 - split[0],
          split[0] * (1 - split[1]),
          split[1] * (1 - split[2]),
          split[2],
        ],
        rows = [0, 2, 3, 5],
        amount =
          smooth(0.085, 0.16, Math.abs(x)) * (1 - smooth(-0.15, -0.1, y)),
        mix = new Map([[0, 1 - amount]]);
      for (let k = 0; k < 4; k++) {
        const weight = fractions[k] * amount;
        if (weight < 1e-6) continue;
        const n = nearestChain(p, feet[(x < 0 ? 0 : 6) + rows[k]]);
        mix.set(n.a, (mix.get(n.a) || 0) + weight * (1 - n.t));
        mix.set(n.b, (mix.get(n.b) || 0) + weight * n.t);
      }
      const terms = [...mix].sort((a, b) => b[1] - a[1]).slice(0, 4),
        total = terms.reduce((v, t) => v + t[1], 0);
      for (let j = 0; j < terms.length; j++) {
        ids[o + j] = terms[j][0];
        w[o + j] = terms[j][1] / total;
      }
      return;
    }
    if (z > 0.17) {
      chainWeights(tail, p, smooth(0.17, 0.29, z), ids, w, o);
      return;
    }
    const amount = smooth(-0.105, -0.015, y) * (1 - smooth(-0.095, -0.035, z)),
      mix = new Map([[0, 1 - amount]]);
    let sum = 0;
    for (let h = 0; h < 6; h++) {
      const weight = (headBlend[index * 6 + h] / 65535) * amount;
      if (weight < 1e-6) continue;
      sum += weight;
      const n = nearestChain(p, heads[h]),
        t = smooth(0.15, 0.9, n.t);
      mix.set(n.a, (mix.get(n.a) || 0) + weight * (1 - t));
      mix.set(n.b, (mix.get(n.b) || 0) + weight * t);
    }
    if (!sum) {
      w[o] = 1;
      return;
    }
    const terms = [...mix].sort((a, b) => b[1] - a[1]).slice(0, 4),
      total = terms.reduce((v, t) => v + t[1], 0);
    for (let j = 0; j < terms.length; j++) {
      ids[o + j] = terms[j][0];
      w[o + j] = terms[j][1] / total;
    }
  };
  const asset = odysseyLordHFAsset("scylla", bind);
  applyScyllaFootBinding(
    asset.geometry,
    ODYSSEY_HF_LORD_DATA.scylla.footRootBinding,
  );
  const mesh = bindOrganicBody(
      body,
      "scylla_hf_six_necks",
      asset.geometry,
      asset.material,
      bones,
      0.16,
    ),
    parts = Array.from({ length: 7 }, () => []),
    pos = asset.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (y < -0.05 && Math.abs(x) < 0.12 && z < 0.3 && z > -0.38)
      parts[Math.min(6, Math.max(0, Math.floor(((z + 0.38) / 0.68) * 7)))].push(
        i,
      );
  }
  mesh.userData.lordCoreParts = parts;
  prepareLordSkinChunks(mesh);
  const mouths = heads.map((h, i) => {
    const mouth = new T.Object3D();
    mouth.name = `scylla_head${i}_mouth`;
    mouth.position.fromArray(h.mouth).sub(new T.Vector3(...h.points.at(-1)));
    bones[h.ids.at(-1)].add(mouth);
    return mouth;
  });
  Object.assign(root.userData, {
    mouthAnchors: mouths,
    combatAnchor: mouths[0],
    getHeadWorldPositions: () =>
      mouths.map((m) => m.getWorldPosition(new T.Vector3())),
    anatomy: { heads: 6, longNecks: 6, finFeet: 12, independentHeads: true },
    normalizedLength: 1,
    odysseyAnatomy: "scylla",
    artRevision: "odyssey_lords_hf_v1",
    prepareMaterials: asset.prepare,
    guideRadius: 0.75,
    hfRig: { asset, mesh, bones, chains, heads, feet, tail },
  });
  void asset.prepare();
  bindScyllaSwim(root, motions, { bones, heads, feet, tail });
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
}
