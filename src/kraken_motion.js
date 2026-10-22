import * as THREE from "three";

/** 克拉肯的视觉状态；真实位移和战斗阶段只读，暂停不推进收腕或喷射节奏。 */
export function createKrakenMotion(root, chains, bones, intake, mesh) {
  let phase = "dormant",
    travel = null,
    previous,
    gather = 0,
    spread = 0,
    wrap = 0,
    reach = 0;
  const target = new THREE.Vector3(0, -0.06, -0.5);
  const state = { gather: 0, spread: 0, wrap: 0, reach: 0 };
  root.userData.setKrakenTarget = (worldTarget) => {
    root.updateWorldMatrix(true, false);
    root.worldToLocal(target.copy(worldTarget));
  };
  root.userData.setBossPhase = (value) => {
    phase = value;
  };
  root.userData.setSwimTravel = (distance, dt) => {
    travel = dt > 0 ? Math.max(0, distance / dt) : 0;
  };
  root.userData.krakenMotion = state;
  const reset = () => {
    phase = "dormant";
    travel = null;
    previous = undefined;
    gather = spread = wrap = reach = 0;
    mesh.morphTargetInfluences[0] = 0;
    Object.assign(state, { gather: 0, spread: 0, wrap: 0, reach: 0 });
  };
  const update = (clock, effort, grip) => {
    const step =
      previous === undefined ? 0 : Math.max(0, Math.min(0.4, clock - previous));
    previous = clock;
    const attack = phase === "attack",
      windup = phase === "windup";
    const moving =
      travel === null
        ? THREE.MathUtils.smoothstep(effort, 0.2, 1.5)
        : THREE.MathUtils.smoothstep(travel, 0.2, 9);
    const ease = 1 - Math.exp(-step * 1.6);
    gather += ((attack || windup ? 0.08 : moving) - gather) * ease;
    spread += ((windup ? 1 : attack ? -0.65 : 0) - spread) * ease;
    const closing = intake.state.held || intake.state.biting ? 1 : grip;
    wrap += (closing - wrap) * (1 - Math.exp(-step * 2.8));
    reach += ((attack ? 1 : windup ? 0.25 : 0) - reach) * ease;
    Object.assign(state, { gather, spread, wrap, reach });
    mesh.morphTargetInfluences[0] = reach;
    for (const c of chains) {
      const offset = c.index * 1.35 + c.side * 0.65;
      for (let i = 0; i < c.ids.length; i++) {
        const bone = bones[c.ids[i]],
          u = i / (c.ids.length - 1),
          envelope = THREE.MathUtils.smoothstep(
            u,
            c.index >= 2 ? 0.1 : 0.35,
            c.index >= 2 ? 0.4 : 0.65,
          ),
          wave = clock * 0.85 - u * 4 + offset;
        const fold = [1, 0.75, 0.4, 0.12][c.index];
        bone.rotation.y =
          c.side *
          envelope *
          (Math.max(gather, wrap * 0.9) * fold * 0.12 -
            spread * 0.04 +
            wrap * (c.index >= 2 ? 0.07 : 0.012) +
            Math.sin(wave) * (0.01 + gather * 0.015));
        bone.rotation.x =
          envelope *
          (Math.sin(wave - 0.8) * (0.025 + gather * 0.035) +
            wrap * ((c.index - 1.5) * 0.028 + (c.index >= 2 ? 0.025 : 0)));
        bone.rotation.z =
          c.side *
          envelope *
          (Math.sin(wave * 0.7) * 0.022 +
            (c.index - 1.5) * gather * 0.035 +
            wrap * (c.index < 2 ? 0.1 : c.index === 2 ? 0.05 : -0.05));
        const bend = [1, 2, 3, 2, 1][i - 2] || 0;
        bone.rotation.y +=
          ((c.side * bend) / 9) *
          (c.index < 2 ? 1 : 0.25) *
          (c.index < 2 ? wrap * 0.45 - gather : Math.max(gather, wrap));
        bone.rotation.z +=
          ((c.side * bend) / 9) * (c.index < 2 ? 0.45 : -0.2) * wrap;
        bone.rotation.x *= 0.85 * (1 - reach);
        bone.rotation.y *= 0.85 * (1 - reach);
        bone.rotation.z *= 0.85 * (1 - reach);
        bone.rotation.x +=
          Math.sin(clock * 1.2 - u * 3 + offset) * 0.008 * reach * envelope;
        bone.rotation.y += c.side * wrap * reach * envelope * 0.005;
      }
      // The encounter already turns the body toward its target; add a small
      // local correction without swinging the shared web through the mantle.
      bones[c.ids[0]].rotation.y -=
        THREE.MathUtils.clamp(target.x, -0.2, 0.2) * 0.15 * reach;
      bones[c.ids[0]].rotation.x +=
        THREE.MathUtils.clamp(target.y + 0.06, -0.2, 0.2) * 0.15 * reach;
    }
  };
  return { update, reset };
}
