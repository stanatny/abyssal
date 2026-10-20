import * as THREE from "three";
import { setOctopusJetBlend } from "./octopus_jet_pose.js";

/** Mantle-driven transit, with quiet trailing arms rather than eight rowing legs. */
export function createOctopusSwim(chains, bones, mesh) {
  const arms = chains.slice(0, 8).map((chain) => ({
    chain,
    axis: new THREE.Vector3(-Math.sin(chain.angle), Math.cos(chain.angle), 0),
  }));
  let previousPhase,
    defenseBlend = 0,
    travelBlend = 0;
  return (phase, effort, hunterPhase = "idle", travel = 1) => {
    if (phase === previousPhase) return;
    const defending = ["windup", "active"].includes(hunterPhase) ? 1 : 0;
    const target = THREE.MathUtils.clamp(travel, 0, 1);
    if (previousPhase === undefined || phase < previousPhase) {
      defenseBlend = defending;
      travelBlend = target;
    } else {
      const blend = 1 - Math.exp(-Math.min(0.2, phase - previousPhase) * 1.3);
      defenseBlend += (defending - defenseBlend) * blend;
      travelBlend += (target - travelBlend) * blend;
    }
    previousPhase = phase;
    const cycle =
        THREE.MathUtils.euclideanModulo(phase * 0.95, Math.PI * 2) /
        (Math.PI * 2),
      // Slow refill, brief expulsion, soft recovery; timings are a game adaptation.
      power =
        THREE.MathUtils.smoothstep(cycle, 0.5, 0.61) *
        (1 - THREE.MathUtils.smoothstep(cycle, 0.73, 0.94)),
      fill = THREE.MathUtils.smoothstep(cycle, 0.04, 0.48) * (1 - power),
      jet =
        travelBlend *
        (0.82 + effort * 0.13 + power * 0.03 + defenseBlend * 0.02);
    setOctopusJetBlend(mesh, jet);
    for (const { chain, axis } of arms) {
      // The compact surface supplies posture. Keep only delayed tip drift.
      bones[chain.ids[0]].quaternion.identity();
      for (let j = 1; j < chain.ids.length; j++) {
        const wave = Math.sin(phase * 0.55 - j * 0.82 + chain.index * 0.73),
          amplitude = (0.014 + j * 0.006) * (1 - travelBlend * 0.45);
        bones[chain.ids[j]].quaternion.setFromAxisAngle(axis, wave * amplitude);
      }
    }
    const squeeze = travelBlend * power * (0.065 + effort * 0.025),
      inhale = travelBlend * fill * 0.018,
      breath = (1 - travelBlend) * Math.sin(phase * 0.48) * 0.005;
    bones[chains[8].ids[0]].scale.set(
      1 + inhale - squeeze + breath,
      1 + inhale - squeeze + breath,
      1 + squeeze * 0.3,
    );
  };
}
