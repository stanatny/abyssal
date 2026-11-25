import * as THREE from "three";
import {
  AEOLUS_HOMEWARD_FINISH,
  buildOdysseyHomewardPath,
} from "./odyssey_homeward_site.js";
import {
  createTideTrial,
  updateTideTrial,
  rotateTideRotor,
  testTideGate,
  tideTrialStatus,
  TIDE_RULES,
} from "./odyssey_tide_rules.js";
import { createTideLayout, TIDE_GATE_SITES } from "./odyssey_tide_layout.js";
import { createTideContacts } from "./odyssey_tide_contacts.js";
import { odysseySeabedHeight } from "./odyssey_config.js";
import { odysseyText as t } from "./odyssey_species.js";

const NAMES = {
  pillar_gate: t("石柱之门", "Pillar Gate"),
  reef_gate: t("浅礁之门", "Reef Gate"),
  echo_gate: t("回声之门", "Echo Gate"),
  vortex_gate: t("涡心之门", "Vortex Gate"),
};
const COPY = {
  locked: t(
    "先击败这里的守卫，石盘封链才会解除。",
    "Defeat this guardian to release the chained stone wheels.",
  ),
  adjusted: t(
    "石盘已转动 · 连通全部四个风纹后，触碰试潮石提交",
    "Wheel turned · Connect all four glyphs, then touch the test stone",
  ),
  testing: t(
    "正在试潮 · 等待水流抵达归航口",
    "Testing the tide · Wait for the flow to reach the homeward outlet",
  ),
  settling: t(
    "石盘尚在转动 · 等待刻度停稳再试潮",
    "Wheel still moving · Wait for its notch to settle before testing",
  ),
  cooldown: t(
    "石盘已复位 · 试潮石恢复中",
    "Wheels reset · The test stone is recovering",
  ),
  protected: t(
    "受伤保护期间不能操作机关 · 离开后重新接近",
    "Mechanism controls are unavailable during damage protection · Leave and approach again",
  ),
  cancelled: t(
    "保护状态中止试潮 · 未判定成败，离开后重新接近",
    "Protection cancelled the test · No result was judged; leave and approach again",
  ),
  failed: t(
    "试潮失败 · 扣20基础生命，四盘复位，题目不变",
    "Tide test failed · 20 base damage, all four wheels reset; the clues stay unchanged",
  ),
  solved: t("试潮成功 · 风神像升起一级", "Tide solved · Aeolus rises one step"),
  ready: t(
    "调整不判对错；接通后仍需到试潮石提交。",
    "Adjustments are not graded; reach the test stone to submit your connected route.",
  ),
};

/** 物种、规则与实体共用纯地点表，只在这里附上本地化名称。 */
export const FITTED_WIND_GATES = Object.freeze(
  TIDE_GATE_SITES.map((gate) =>
    Object.freeze({ ...gate, name: NAMES[gate.id] }),
  ),
);
export const HOMEWARD_FINISH = AEOLUS_HOMEWARD_FINISH;
export const HOMEWARD_PATH = Object.freeze(buildOdysseyHomewardPath());

const temp = new THREE.Vector3();
const local = new THREE.Vector3();
const inverse = new THREE.Matrix4();
const relative = new THREE.Matrix4();
const box = new THREE.Box3();
const partBox = new THREE.Box3();

/** 门附近才读取真实姿态包络；八角点保守包住所有可见身体，而非吞食锚点。 */
export function visibleWindBody(avatar, position, forward, length) {
  avatar.updateWorldMatrix(true, true);
  inverse.copy(avatar.matrixWorld).invert();
  box.makeEmpty();
  avatar.traverseVisible((part) => {
    if (!part.isMesh || !part.geometry?.attributes.position) return;
    if (part.isSkinnedMesh) {
      part.skeleton.update();
      part.computeBoundingBox();
      partBox.copy(part.boundingBox);
    } else {
      if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
      partBox.copy(part.geometry.boundingBox);
    }
    relative.multiplyMatrices(inverse, part.matrixWorld);
    partBox.applyMatrix4(relative);
    box.union(partBox);
  });
  const points = [];
  if (!box.isEmpty())
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z])
          points.push(
            temp.set(x, y, z).applyMatrix4(avatar.matrixWorld).toArray(),
          );
  return {
    position: position.toArray(),
    forward: forward.toArray(),
    length,
    points,
  };
}

/** 连接实体鼻端、纯潮环规则与共享反馈；不读取昂贵骨骼包络，也不改变移动或生命。 */
export function createWindTrialRuntime({ seed } = {}) {
  let generation = 0;
  const nextSeed = () =>
    seed === undefined
      ? Math.floor(Math.random() * 0x100000000)
      : (seed + generation++) >>> 0;
  const makeState = () =>
    createTideTrial({
      gateDefs: FITTED_WIND_GATES,
      finish: HOMEWARD_FINISH,
      seed: nextSeed(),
    });
  let state = makeState();
  const layouts = FITTED_WIND_GATES.map((gate) =>
    createTideLayout(gate, odysseySeabedHeight),
  );
  const origins = layouts.map((layout) => new THREE.Vector3(...layout.origin));
  const controls = layouts.map((layout) =>
    [...layout.rotors, layout.master].map(
      (p) => new THREE.Vector3(...p.position),
    ),
  );
  const contacts = controls.map((points) => createTideContacts(points));
  const normals = FITTED_WIND_GATES.map(
    (gate) => new THREE.Vector3(...gate.normal),
  );
  const velocity = new THREE.Vector3();
  const routeStart = new THREE.Vector3();
  const routeEnd = new THREE.Vector3();
  const line = new THREE.Line3();
  const nose = new THREE.Vector3();
  const previousNose = new THREE.Vector3();
  const previousPosition = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const guardians = {};
  let hasPrevious = false;
  let nearest = null;
  let monumentReady = false;
  let cachedMapPaths = null;
  let notice = "",
    noticeRemaining = 0;
  const suspend = () => {
    for (const contact of contacts) contact.reset();
    hasPrevious = false;
  };
  const setNotice = (text, seconds = 3) => {
    notice = text;
    noticeRemaining = seconds;
  };
  const inGate = (gate, position) => {
    const dx = position.x - gate.center[0],
      dy = position.y - gate.center[1],
      dz = position.z - gate.center[2];
    return (
      Math.abs(dz) < 48 &&
      (dx / (gate.width * 0.5)) ** 2 + (dy / (gate.height * 0.5)) ** 2 < 1
    );
  };
  return {
    get state() {
      return state;
    },
    get status() {
      return tideTrialStatus(state);
    },
    get layouts() {
      return layouts;
    },
    get notice() {
      return noticeRemaining > 0 ? notice : "";
    },
    get nearPuzzle() {
      return nearest && nearest.distance < 105
        ? {
            state: state.gates[nearest.gate.id],
            name: nearest.gate.name,
            layout: layouts[nearest.index],
          }
        : null;
    },
    suspend,
    setMonumentReady(ready) {
      monumentReady = ready === true;
    },
    reset() {
      state = makeState();
      monumentReady = false;
      suspend();
      nearest = null;
      cachedMapPaths = null;
      notice = "";
      noticeRemaining = 0;
    },
    containsCurrent(position) {
      return FITTED_WIND_GATES.some(
        (gate) => state.gates[gate.id].solved && inGate(gate, position),
      );
    },
    current(position) {
      velocity.set(0, 0, 0);
      for (const gate of FITTED_WIND_GATES) {
        if (state.gates[gate.id].solved && inGate(gate, position))
          return velocity.fromArray(gate.normal).multiplyScalar(18);
      }
      if (state.unlocked) {
        let distance = Infinity;
        for (let i = 1; i < HOMEWARD_PATH.length; i++) {
          routeStart.fromArray(HOMEWARD_PATH[i - 1]);
          routeEnd.fromArray(HOMEWARD_PATH[i]);
          line
            .set(routeStart, routeEnd)
            .closestPointToPoint(position, true, local);
          const d = local.distanceToSquared(position);
          if (d < 22 ** 2 && d < distance) {
            distance = d;
            velocity
              .copy(routeEnd)
              .sub(routeStart)
              .normalize()
              .multiplyScalar(16);
          }
        }
      }
      return velocity;
    },
    update(
      dt,
      player,
      position,
      forward,
      _avatar,
      bosses = [],
      notify = () => {},
      audio,
      { blocked = () => false, damage, active = true } = {},
    ) {
      const playing =
        active &&
        !player.dead &&
        !player.timedOut &&
        !player.won &&
        Number.isFinite(dt) &&
        dt > 0 &&
        !state.won;
      if (!playing) {
        suspend();
        return [];
      }
      noticeRemaining = Math.max(0, noticeRemaining - dt);
      for (const key of Object.keys(guardians)) delete guardians[key];
      for (const boss of bosses)
        if (boss.enabled && boss.state?.species?.kind)
          guardians[boss.state.species.kind] = boss.state;
      nearest = FITTED_WIND_GATES.reduce((best, gate, index) => {
        const distance = Math.min(
          position.distanceTo(origins[index]),
          position.distanceTo(controls[index][4]),
        );
        return !best || distance < best.distance
          ? { gate, distance, index }
          : best;
      }, null);
      direction.copy(forward).normalize();
      nose.copy(position).addScaledVector(direction, player.length * 0.42);
      const continuous =
        hasPrevious &&
        dt <= TIDE_RULES.maximumStepDuration &&
        position.distanceTo(previousPosition) <=
          TIDE_RULES.maximumContinuousSpeed * dt + 0.3 &&
        nose.distanceTo(previousNose) <=
          TIDE_RULES.maximumContinuousSpeed * dt + player.length * 0.12 + 0.3;
      const protectedFrame = player.invulnerable > 0;
      if (!hasPrevious) state.previousPosition = null;
      for (let i = 0; i < contacts.length; i++) {
        const index = contacts[i].sample(
          hasPrevious ? previousNose : nose,
          nose,
          {
            active: true,
            continuous,
            front: position,
            normal: normals[i],
            blocked: (target) =>
              blocked(position, target) || blocked(nose, target),
          },
        );
        if (index < 0) continue;
        const id = FITTED_WIND_GATES[i].id;
        const result =
          index === 4
            ? testTideGate(state, id, { protected: protectedFrame })
            : rotateTideRotor(state, id, index, { protected: protectedFrame });
        if (result.kind === "rotated") setNotice(COPY.adjusted);
        else if (result.kind === "testing") {
          setNotice(COPY.testing, 2);
          audio?.quest("mechanism");
        } else if (COPY[result.reason]) setNotice(COPY[result.reason]);
      }
      const events = updateTideTrial(state, dt, {
        position,
        length: player.length,
        guardians,
        active: true,
        protected: protectedFrame,
        finishReady: monumentReady,
      });
      for (const event of events) {
        if (event.type === "guardian_defeated") {
          setNotice(COPY.ready, 5);
          notify(
            t(
              "守卫已败 · 潮环封链解除，连通四块石盘后试潮",
              "Guardian defeated · The wheels are released; connect all four and test the tide",
            ),
            5,
          );
        } else if (event.type === "test_cancelled")
          setNotice(COPY.cancelled, 4);
        else if (event.type === "puzzle_failed") {
          damage?.(event.damage, event);
          setNotice(COPY.failed, 5);
          notify(COPY.failed, 5);
        } else if (event.type === "gate_solved") {
          audio?.quest("guardian");
          setNotice(COPY.solved, 6);
          notify(
            {
              key: t(
                "风路已连通 · 风神像升起 {0}/4 级",
                "Wind route connected · Aeolus rises {0}/4 steps",
              ),
              values: [event.completed],
            },
            6,
          );
        } else if (event.type === "homeward_unlocked") {
          audio?.quest("chest");
          notify(
            t(
              "四风已定 · 沿金色水路进入风神像基座的归航拱门",
              "The Four Winds are still · Follow the golden current into the homeward arch beneath Aeolus",
            ),
            8,
          );
        }
      }
      previousNose.copy(nose);
      previousPosition.copy(position);
      hasPrevious = true;
      return events;
    },
    hint() {
      const near = this.nearPuzzle;
      if (!near) return null;
      const gate = near.state;
      return {
        key: "{0} · {1}",
        values: [
          near.name,
          gate.solved
            ? COPY.solved
            : !gate.defeated
              ? COPY.locked
              : noticeRemaining > 0
                ? notice
                : COPY.ready,
        ],
      };
    },
    mapPaths(paths) {
      if (!state.unlocked) return paths;
      return (cachedMapPaths ||= [
        ...(paths || []),
        HOMEWARD_PATH.map(([x, _y, z]) => [x, z]),
      ]);
    },
    waypoints() {
      return state.unlocked
        ? [
            {
              x: HOMEWARD_FINISH.center[0],
              y: HOMEWARD_FINISH.center[1],
              z: HOMEWARD_FINISH.center[2],
              final: true,
              open: false,
            },
          ]
        : FITTED_WIND_GATES.map((g, index) => ({
            x: layouts[index].origin[0],
            y: layouts[index].origin[1],
            z: layouts[index].origin[2],
            mechanism: true,
            open: state.gates[g.id].solved,
          }));
    },
  };
}
