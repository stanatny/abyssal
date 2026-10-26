import * as THREE from "three";
import { EUROPA_LORD_PACKED, europaLordAsset } from "./europa_lord_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  nearestChain,
  chainWeights,
  prepareLordSkinChunks,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
import { createLumenSwim } from "./lumen_swim.js";
import { reachTentacle } from "./tentacle_motion.js";
export const EUROPA_HF_LORDS = new Set(Object.keys(EUROPA_LORD_PACKED));
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
/** 真实 HF 连续表面与测量中心线共用，保留原有领主技能接口。 */
export function buildEuropaLordHF(kind, root, motions) {
  const packed = EUROPA_LORD_PACKED[kind],
    brine = kind === "brine_regent",
    lumen = kind === "lumen_stalker";
  const anatomy = new THREE.Group();
  anatomy.name =
    kind === "abyss_weaver" ? "weaver_continuous_mantle" : kind + "_anatomy";
  root.add(anatomy);
  const base = new THREE.Bone();
  anatomy.add(base);
  const bones = [base];
  const chains = packed.rig.chains.map((c) => ({
    ...c,
    points: c.points.map((p) => p.slice()),
    ids: [],
  }));
  for (const c of chains) {
    const group = new THREE.Group();
    group.name = kind + "_" + c.name;
    group.position.fromArray(c.points[0]);
    base.add(group);
    c.group = group;
    const local = c.points.map((p) =>
      new THREE.Vector3(...p).sub(group.position),
    );
    c.points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = c.name + "_" + i;
      b.position.copy(local[i]);
      if (i) b.position.sub(local[i - 1]);
      (i ? bones[c.ids[i - 1]] : group).add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    c.local = local;
    c.group.userData.tentacle = {
      bones: c.ids.map((id) => bones[id]),
      points: local,
      posePoints: local.map(() => new THREE.Vector3()),
      poseRotations: local.map(() => new THREE.Quaternion()),
      restLength: local
        .slice(1)
        .reduce((s, p, i) => s + p.distanceTo(local[i]), 0),
    };
  }
  const tail = chains.find((c) => c.type === "tail"),
    arms = chains.filter((c) => c.type === "arm"),
    point = new THREE.Vector3();
  const bind = (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    if (brine) {
      chainWeights(tail, point, smooth(-0.11, 0.07, z), ids, w, o);
      if (z < -0.415) {
        let a = Math.atan2(y - 0.025, x);
        if (a < 0) a += Math.PI * 2;
        const jaw = chains.find(
          (c) => c.name === "jaw_" + (Math.round(a / (Math.PI / 3)) % 6),
        );
        chainWeights(
          {
            ...jaw,
            points: [jaw.points[0], [x, y, -0.5]],
            ids: [jaw.ids[0], jaw.ids[0]],
          },
          point,
          smooth(0.415, 0.47, -z),
          ids,
          w,
          o,
        );
        return;
      }
      const candidates = chains.filter(
        (c) => c.type === "fin" && Math.sign(x) === c.side,
      );
      let best, c;
      for (const candidate of candidates) {
        const n = nearestChain(point, candidate);
        if (!best || n.distance < best.distance) {
          best = n;
          c = candidate;
        }
      }
      const f =
        smooth(0.092, 0.145, Math.abs(x)) *
        (1 - smooth(-0.055, -0.005, y)) *
        (1 - smooth(0.04, 0.12, z));
      if (c && f > 0) chainWeights(c, point, f, ids, w, o);
    } else {
      let c, best;
      for (const candidate of arms) {
        const n = nearestChain(point, candidate);
        if (!best || n.distance < best.distance) {
          best = n;
          c = candidate;
        }
      }
      const f = lumen
        ? Math.max(smooth(0.12, 0.24, Math.hypot(x, y)), smooth(0.15, 0.25, -z))
        : smooth(-0.2, -0.08, z);
      chainWeights(c, point, f, ids, w, o);
    }
  };
  const asset = europaLordAsset(kind, bind),
    material = asset.material.clone(),
    charge = { value: 0.16 };
  material.name = kind + "_hf_instance";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.lordOrganGlow = charge;
    shader.vertexShader =
      "attribute float alienLuminescence; varying float alienGlow; varying vec3 lordLocal;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nlordLocal = position; alienGlow = alienLuminescence;",
    );
    shader.fragmentShader =
      "uniform float lordOrganGlow;\nvarying float alienGlow; varying vec3 lordLocal;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
  #ifdef USE_MAP
    diffuseColor.rgb=mix(diffuseColor.rgb,sqrt(max(diffuseColor.rgb,vec3(0.0)))*.70,.22);
  #endif`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
  #ifdef USE_MAP
   vec3 organ=texture2D(map,vMapUv).rgb;
   float intensity=${brine ? "smoothstep(.06,.22,organ.r-organ.b)*smoothstep(.12,.5,organ.r)*(1.0-smoothstep(-.22,-.12,lordLocal.z))" : lumen ? "smoothstep(.08,.32,organ.b-organ.r)*smoothstep(.25,.65,organ.b)" : "smoothstep(.04,.18,organ.b-organ.g)*smoothstep(.25,.65,organ.r)"};
   totalEmissiveRadiance+=organ*intensity*lordOrganGlow;
   totalEmissiveRadiance+=vec3(.10,.48,.78)*alienGlow*(.6+lordOrganGlow*2.0);
  #endif`,
    );
  };
  material.customProgramCacheKey = () => kind + "_hf_organs_v2";
  const mesh = bindOrganicBody(
    anatomy,
    kind + "_hf_body",
    asset.geometry,
    material,
    bones,
    1.6,
  );
  const groups = Array.from({ length: 6 }, () => []),
    p = asset.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const core = brine
      ? Math.abs(x) < (z < -0.3 ? 0.13 : z < 0.05 ? 0.1 : 0.045) &&
        y > -0.07 &&
        z < 0.3
      : lumen
        ? z > -0.11 && Math.abs(x) < 0.15 && Math.abs(y) < 0.14
        : z < -0.17;
    if (core)
      groups[Math.max(0, Math.min(5, Math.floor((z + 0.5) * 6)))].push(i);
  }
  mesh.userData.lordCoreParts = groups.filter((g) => g.length > 24);
  prepareLordSkinChunks(mesh);
  root.userData.hfRig = { kind, mesh, bones, chains, asset, material, charge };
  root.userData.artRevision = "trellis_europa_lords_20261026";
  root.userData.normalizedLength = 1;
  root.userData.guideRadius = lumen ? 2.2 : 0.85;
  let state = "dormant",
    previous,
    tension = 0,
    disposed = false;
  const effort = lordEffortSmoother();
  root.userData.setBossPhase = (p) => (state = p);
  const detachMaterial = asset.attachMaterial(material);
  root.userData.prepareMaterials = (options) => asset.prepare(options);
  root.userData.prepareMaterials();
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    detachMaterial();
    mesh.skeleton.dispose();
    material.dispose();
  };
  const restore = (c) =>
    c.ids.forEach((id, i) => {
      bones[id].position.copy(c.local[i]);
      if (i) bones[id].position.sub(c.local[i - 1]);
      bones[id].quaternion.identity();
    });
  const lumenSwim = lumen ? createLumenSwim(anatomy, base, arms, bones) : null;
  if (lumen) {
    root.userData.lumenSwim = lumenSwim.state;
    root.userData.setSwimTravel = (distance, dt) =>
      lumenSwim.travel(distance, dt, root.userData.length);
    const selected = [arms[0], arms[3], arms[6]],
      target = new THREE.Vector3();
    root.userData.lashArms = selected.map((c) => c.group);
    root.userData.resetLumenLash = () => {
      selected.forEach(restore);
      root.updateMatrixWorld(true);
    };
    root.userData.poseLumenLash = (targets, poses) => {
      selected.forEach((c, i) => {
        if (poses[i].amount > 0) {
          target.copy(targets[i]);
          c.group.worldToLocal(target);
          reachTentacle(c.group, target, poses[i].amount, i === 1 ? -1 : 1);
        }
      });
      root.updateMatrixWorld(true);
    };
  }
  motions.push((time, speed) => {
    const dt =
      previous === undefined || time < previous
        ? 0
        : Math.min(0.6, time - previous);
    previous = time;
    tension +=
      ((state === "windup" ? 1 : state === "attack" ? 0.85 : 0) - tension) *
      (1 - Math.exp(-dt * 5));
    const drive = smooth(0.2, 3, effort(time, speed));
    charge.value = 0.18 + tension * 0.8;
    for (const c of chains) {
      restore(c);
      let px = 0,
        py = 0;
      c.ids.forEach((id, i) => {
        const b = bones[id],
          t = i / Math.max(1, c.ids.length - 1);
        if (c.type === "tail") {
          const a =
            Math.sin(time * (1.35 + drive * 0.25) - t * 3.5) *
            t *
            (0.09 + drive * 0.06);
          b.rotation.y = a - py;
          py = a;
        } else if (c.type === "fin") {
          b.rotation.z =
            c.side *
            Math.sin(time * 1.15 - c.index * 0.9 - i * 0.5) *
            (0.045 + drive * 0.035);
          b.rotation.y = -c.side * (0.04 + drive * 0.055);
        } else if (c.type === "jaw") {
          b.rotation.x = Math.sin(c.angle) * tension * 0.1;
          b.rotation.y = -Math.cos(c.angle) * tension * 0.1;
        } else {
          const a =
              Math.sin(time * 0.7 - t * 4.3 + c.index * 0.8) * t * 0.1 +
              tension * Math.sin(c.index) * t * 0.06,
            b2 = Math.sin(time * 0.57 - t * 4 + c.index * 0.95) * t * 0.09;
          b.rotation.x = a - px;
          b.rotation.y = b2 - py;
          px = a;
          py = b2;
        }
      });
    }
    lumenSwim?.pose(time, speed, state);
  });
}
