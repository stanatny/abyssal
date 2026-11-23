import * as THREE from "three";
import { acquireAtlantisQuestAsset } from "./atlantis_quest_asset.js";
import { createBermudaTitanRelic } from "./bermuda_titan_relic.js";
import {
  createBermudaTitanHazards,
  isTitanLavaCellBlocked,
} from "./bermuda_titan_hazards.js";
import { createBermudaTitanHazardVisuals } from "./bermuda_titan_hazard_visuals.js";
import {
  castIndexedSegment,
  queryStaticColliders,
} from "./static_collider_grid.js";
import { bodyRadius, castSegment, isPositionBlocked } from "./collision.js";
import {
  BERMUDA_TITAN_RULES,
  BERMUDA_TITAN_SEALS,
  createBermudaTitanState,
  resetBermudaTitanState,
  stepBermudaTitan,
  confirmBermudaTitanSecured,
  createTitanBreathSegment,
  bermudaTitanBreathFrame,
} from "./bermuda_titan_rules.js";

/** 主循环独占活动计时与伤害；update只改现有画面，真实HF嘴由setBreath接入。 */
export function createBermudaTitanQuest(
  parent,
  {
    layout,
    heightAt,
    colliders = [],
    onDamage = () => {},
    onNotice = () => {},
    onCollected = () => {},
    inLair = null,
    canAccessRelic = null,
    syncBreathPose = null,
    dynamicContacts = null,
    hazardSites = [],
    hazardSeed,
    checkEscape = null,
    isEscapeSafe = null,
    sealPortals = null,
    resetPortals = () => {},
  },
) {
  if (
    layout.seals.length !== 3 ||
    !BERMUDA_TITAN_SEALS.every((id, i) => layout.seals[i].id === id)
  )
    throw new Error("Titan seals must match the visible tablet order");
  const root = new THREE.Group();
  root.name = "bermuda_sleeping_titan_quest";
  parent.add(root);
  const makeSeed = () =>
      typeof hazardSeed === "function"
        ? hazardSeed() >>> 0
        : Number.isFinite(hazardSeed)
          ? hazardSeed >>> 0
          : Math.floor(Math.random() * 0x100000000),
    owned = new Set(),
    keep = (r) => (owned.add(r), r),
    state = createBermudaTitanState({ seed: makeSeed() }),
    lit = (color) =>
      keep(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      ),
    runeMaterials = BERMUDA_TITAN_SEALS.map(() => lit(0x7ed3da)),
    tabletMaterial = lit(0xb0d6b2),
    relicRingMaterial = lit(0xb0d6b2),
    barrierMaterial = lit(0x4e91d5),
    heartAsset = createBermudaTitanRelic(),
    plaqueAsset = acquireAtlantisQuestAsset("plaque");
  owned.add({ dispose: heartAsset.dispose });
  owned.add({ dispose: plaqueAsset.release });
  const prepare = async (options) =>
    (
      await Promise.all([
        plaqueAsset.prepare(options),
        hazardVisuals.prepare?.(options) ?? true,
      ])
    ).every(Boolean);
  root.userData.prepareMaterials = prepare;

  const vec = (p) =>
      Array.isArray(p)
        ? new THREE.Vector3(...p)
        : new THREE.Vector3(p.x, p.y, p.z),
    mesh = (group, geometry, material) => {
      const object = new THREE.Mesh(keep(geometry), material);
      group.add(object);
      return object;
    },
    tube = (group, points, material, radius = 0.22) =>
      mesh(
        group,
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points.map(vec)),
          24,
          radius,
          5,
          false,
        ),
        material,
      );
  function glyph(group, id, material, scale = 1) {
    const g = new THREE.Group();
    g.scale.setScalar(scale);
    group.add(g);
    if (id === "wave") {
      for (const y of [-2, 0, 2])
        tube(
          g,
          Array.from({ length: 13 }, (_, i) => [
            -4 + (i * 2) / 3,
            y + Math.sin((i * Math.PI) / 3) * 0.7,
            0,
          ]),
          material,
        );
    } else if (id === "bone") {
      for (const side of [-1, 1]) {
        tube(
          g,
          [
            [-3, side * -3, 0],
            [3, side * 3, 0],
          ],
          material,
          0.4,
        );
        for (const end of [-1, 1]) {
          const b = mesh(g, new THREE.SphereGeometry(0.7, 8, 6), material);
          b.position.set(end * 3, end * side * 3, 0);
        }
      }
    } else
      tube(
        g,
        [
          [0, -4, 0],
          [-3, -2, 0],
          [-3, 0, 0],
          [-1, 2, 0],
          [0, 5, 0],
          [2, 2, 0],
          [3, -1, 0],
          [2, -3, 0],
          [0, -4, 0],
        ],
        material,
        0.36,
      );
    return g;
  }
  const seals = layout.seals.map((row, i) => {
    const group = new THREE.Group();
    group.name = `titan_seal_${row.id}`;
    group.position.copy(vec(row.point));
    root.add(group);
    const plaque = plaqueAsset.create();
    plaque.scale.setScalar(2.3);
    plaque.position.z = 0.3;
    group.add(plaque);
    const mark = glyph(group, row.id, runeMaterials[i], 1.15);
    mark.position.z = -1;
    const ring = mesh(
      group,
      new THREE.TorusGeometry(10, 0.22, 6, 40),
      runeMaterials[i],
    );
    ring.position.z = -1;
    return {
      id: row.id,
      point: group.position,
      group,
      ring,
      mark,
      radius: row.radius ?? 11,
    };
  });
  const tablet = new THREE.Group();
  tablet.name = "titan_seal_order_tablet";
  tablet.position.copy(vec(layout.tablet));
  if (layout.tabletNormal) {
    const normal = vec(layout.tabletNormal);
    if (normal.lengthSq() > 1e-10)
      tablet.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        normal.normalize(),
      );
  }
  if (!layout.tabletNormal) tablet.rotation.y = Math.PI;
  root.add(tablet);
  const tabletPlaque = plaqueAsset.create();
  tabletPlaque.scale.set(6, 2.4, 1.6);
  tablet.add(tabletPlaque);
  BERMUDA_TITAN_SEALS.forEach((id, i) => {
    const mark = glyph(tablet, id, tabletMaterial, 0.7);
    mark.position.set((i - 1) * 8, 0, -0.8);
    if (i < 2)
      tube(
        tablet,
        [
          [-2 + i * 8, 0, -1],
          [0 + i * 8, 0, -1],
          [-1 + i * 8, 1, -1],
        ],
        tabletMaterial,
        0.13,
      );
  });

  const relic = new THREE.Group();
  relic.name = "sleeping_titan_relic";
  relic.position.copy(vec(layout.relic));
  if (layout.relicQuaternion)
    relic.quaternion.copy(
      Array.isArray(layout.relicQuaternion)
        ? new THREE.Quaternion(...layout.relicQuaternion)
        : layout.relicQuaternion,
    );
  root.add(relic);
  const relicModel = heartAsset.root;
  relic.add(relicModel);
  const barrier = mesh(
    relic,
    new THREE.SphereGeometry(6, 24, 12),
    barrierMaterial,
  );
  barrierMaterial.opacity = 0.08;
  const relicRing = mesh(
    relic,
    new THREE.TorusGeometry(1.9, 0.08, 6, 40),
    relicRingMaterial,
  );
  relicRing.rotation.x = Math.PI / 2;
  const mouthPoint = new THREE.Vector3(),
    hazardVisuals = createBermudaTitanHazardVisuals(root);
  owned.add({ dispose: hazardVisuals.dispose });
  const lightSources = [
    { position: mouthPoint, color: 0xff6b24, intensity: 0, distance: 65 },
    { position: relic.position, color: 0xffbf5e, intensity: 12, distance: 45 },
    ...seals.map((s) => ({
      position: s.point,
      color: 0x65bde0,
      intensity: 7,
      distance: 35,
    })),
  ];
  let disposed = false,
    lastSource = null,
    lastCount = -1,
    allColliders = [],
    relicColliders = [],
    breathColliders = [],
    breathLayout = null,
    segment = null,
    fieldKey = null,
    currentFrame = null,
    previous = null,
    previousIntake = null,
    discovered = false,
    touchingTablet = false;
  function refreshColliders() {
    const source = typeof colliders === "function" ? colliders() : colliders;
    if (source === lastSource && source.length === lastCount) return false;
    lastSource = source;
    lastCount = source.length;
    allColliders = source;
    // 静态洞壁/头部仍遮挡；标明会动的护臂由调用方按真实当前HF姿态判断，不能拿旧姿态堵死宝心。
    relicColliders =
      typeof canAccessRelic === "function"
        ? source.filter((c) => !c.titanGuardArm)
        : source;
    // 怪兽躯体仍挡玩家，只从本体嘴部的吐息查询排除；其余洞壁和掩体照常遮挡。
    breathColliders = source.filter((c) => !c.titanBreathIgnore);
    return true;
  }
  function obstruct(from, to, radius, { originGrace = true } = {}) {
    // 只让嘴端第一段离开皮肤；随后真实躯体和当前护臂同样挡水焰，不能整身透射。
    const staticHit = castIndexedSegment(from, to, {
        staticColliders: originGrace ? breathColliders : allColliders,
        radius,
      }),
      moving =
        !originGrace && typeof dynamicContacts === "function"
          ? dynamicContacts(from, to, { radius, padding: 0 })
          : [],
      dynamicHit = moving.length ? castSegment(from, to, moving, radius) : null,
      hit =
        dynamicHit && dynamicHit.distance < (staticHit?.distance ?? Infinity)
          ? dynamicHit
          : staticHit,
      direction = vec(to).sub(vec(from)).normalize(),
      range = vec(to).distanceTo(vec(from));
    let floorDistance = Infinity;
    const floor = (p) =>
      typeof heightAt.supportHeight === "function"
        ? heightAt.supportHeight(p.x, p.z, radius)
        : heightAt(p.x, p.z) + radius;
    // 最后一段不足两米也必须采到端点，避免水焰末端胶囊钻进斜坡。
    const steps = Math.max(1, Math.ceil(range / 2));
    for (let i = 0; i <= steps; i++) {
      const d = (range * i) / steps,
        p = vec(from).addScaledVector(direction, d);
      if (p.y > floor(p)) continue;
      let low = Math.max(0, (range * (i - 1)) / steps),
        high = d;
      for (let j = 0; j < 9; j++) {
        const middle = (low + high) / 2,
          q = vec(from).addScaledVector(direction, middle);
        if (q.y <= floor(q)) high = middle;
        else low = middle;
      }
      floorDistance = low;
      break;
    }
    if (floorDistance < (hit?.distance ?? Infinity))
      return {
        point: vec(from).addScaledVector(direction, floorDistance),
        distance: floorDistance,
      };
    return hit;
  }
  function rebuildField(force = false) {
    if (!breathLayout) return;
    const key = [
      state.clock,
      state.cycles,
      state.phase,
      state.remaining,
      state.phaseDuration,
      state.guardAmount,
      state.awareness,
      state.secured,
      state.entombed,
      lastCount,
    ].join("/");
    if (!force && key === fieldKey) return;
    currentFrame = bermudaTitanBreathFrame(state);
    if (typeof syncBreathPose === "function") {
      const actual = syncBreathPose(currentFrame, state);
      if (actual?.mouth && actual?.direction) {
        breathLayout.mouth = vec(actual.mouth);
        breathLayout.direction = vec(actual.direction);
      }
      if (actual?.relicPoint) relic.position.copy(vec(actual.relicPoint));
      if (actual?.relicQuaternion)
        relic.quaternion.copy(actual.relicQuaternion);
    }
    // 旧单段只保留惰性调试；画面与判伤由同一完整熔岩/落石snapshot负责。
    segment = null;
    mouthPoint.copy(breathLayout.mouth);
    fieldKey = key;
  }
  function setBreath(value) {
    if (disposed) return;
    breathLayout = {
      mouth: vec(value.mouth),
      direction: vec(value.direction),
      radius: value.radius ?? BERMUDA_TITAN_RULES.beamRadius,
      range: value.range ?? BERMUDA_TITAN_RULES.beamRange,
    };
    refreshColliders();
    rebuildField(true);
  }
  function pathClear(points, radius, { kind, clearance = 0 } = {}) {
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1],
        to = points[i],
        length = vec(from).distanceTo(vec(to)),
        extra = i <= 2 || i === points.length - 1 ? 0 : clearance,
        hit = obstruct(from, to, radius + extra, {
          originGrace: kind === "lava" && i === 1,
        });
      if (
        hit &&
        (hit.distance ?? vec(from).distanceTo(vec(hit.point))) < length - 0.025
      )
        return false;
    }
    return true;
  }
  let cellMemoEpoch = null;
  const cellMemo = new Map();
  function cellClear(cell, options = {}) {
    if (cellMemoEpoch !== fieldKey) {
      cellMemoEpoch = fieldKey;
      cellMemo.clear();
    }
    const key =
      (options.originGrace ? "mouth/" : "world/") +
      (cell.allowLanding ? "land/" : "flight/") +
      cell.vertices.map((p) => `${p.x},${p.y},${p.z}`).join("/");
    if (cellMemo.has(key)) return cellMemo.get(key);
    const result = clearCellVolume(cell, options);
    if (cellMemo.size >= 8192) cellMemo.delete(cellMemo.keys().next().value);
    cellMemo.set(key, result);
    return result;
  }
  function clearCellVolume(cell, { originGrace = false } = {}) {
    // 整个立体片单元都必须在水体内，不能以中央导引线代替宽熔流的实体检查。
    const box = new THREE.Box3().setFromPoints(cell.vertices.map(vec)),
      solids = queryStaticColliders(
        originGrace ? breathColliders : allColliders,
        box.min,
        box.max,
      );
    if (isTitanLavaCellBlocked(cell, solids)) return false;
    const moving =
      !originGrace && typeof dynamicContacts === "function"
        ? dynamicContacts(box.min, box.max, {
            radius: 0,
            padding: 0.25,
            segment: false,
          })
        : [];
    if (isTitanLavaCellBlocked(cell, moving, { padding: 0.25 })) return false;
    // 下表面以实际地形三角面采样，落地围裙可以贴地，但不能钻到坡面以下。
    for (const ids of [
      [0, 1, 3],
      [0, 3, 2],
    ]) {
      const [a, b, c] = ids.map((i) => vec(cell.vertices[i])),
        steps = Math.max(
          1,
          Math.ceil(
            Math.max(a.distanceTo(b), a.distanceTo(c), b.distanceTo(c)) / 2,
          ),
        );
      for (let i = 0; i <= steps; i++)
        for (let j = 0; j <= steps - i; j++) {
          const p = a
            .clone()
            .addScaledVector(b.clone().sub(a), i / steps)
            .addScaledVector(c.clone().sub(a), j / steps);
          if (p.y < heightAt(p.x, p.z) - (cell.allowLanding ? 0.2 : 0.025))
            return false;
        }
    }
    return true;
  }
  const hazards = createBermudaTitanHazards({
    sites: hazardSites,
    seed: state.hazardSeed,
    pathClear,
    cellClear,
    clearanceVersion: () => lastCount,
    terminalContext: (position) => {
      const choices =
          typeof hazardSites === "function" ? hazardSites() : hazardSites,
        nearest = choices.reduce(
          (a, b) =>
            !a ||
            Math.hypot(b.impact.x - position.x, b.impact.z - position.z) <
              Math.hypot(a.impact.x - position.x, a.impact.z - position.z)
              ? b
              : a,
          null,
        );
      return {
        center: { x: position.x, y: position.y, z: position.z },
        ground: {
          x: position.x,
          y: heightAt(position.x, position.z),
          z: position.z,
        },
        roof: nearest?.roof
          ? { ...nearest.roof }
          : { x: position.x, y: position.y + 30, z: position.z },
      };
    },
    coverBetween: (from, to) => {
      if (
        castIndexedSegment(from, to, {
          staticColliders: allColliders,
          radius: 0.15,
        })
      )
        return true;
      const moving =
        typeof dynamicContacts === "function"
          ? dynamicContacts(from, to, { radius: 0.15, padding: 0 })
          : [];
      return !!castSegment(from, to, moving, 0.15);
    },
  });
  refreshColliders();
  if (layout.mouth && layout.direction) setBreath(layout);

  function contactPoint(point, position, before, radius) {
    const delta = position.clone().sub(before),
      distance = delta.lengthSq(),
      fraction = distance
        ? THREE.MathUtils.clamp(
            point.clone().sub(before).dot(delta) / distance,
            0,
            1,
          )
        : 0,
      closest = before.clone().addScaledVector(delta, fraction);
    return closest.distanceTo(point) <= radius ? closest : null;
  }
  function touch(point, position, before, radius) {
    const closest = contactPoint(point, position, before, radius);
    return (
      !!closest &&
      !castIndexedSegment(closest, point, {
        staticColliders: allColliders,
        radius: 0.2,
      })
    );
  }
  return {
    root,
    state,
    colliders: [],
    landmarks: [],
    lightSources,
    prepare,
    records: {
      seals,
      tablet: tablet.position,
      relic: relic.position,
      relicQuaternion: relic.quaternion,
      mouth: mouthPoint,
    },
    get segment() {
      return (segment ??= createTitanBreathSegment(breathLayout, obstruct));
    },
    get hazards() {
      return hazards.snapshot;
    },
    get field() {
      const lava = hazards.snapshot.lava;
      return {
        active: lava.phase === "active",
        warning: lava.phase === "warning",
        cells: (lava.sheets ?? []).flatMap((sheet) =>
          sheet.tetrahedra.map((indices) => ({
            type: "tetrahedron",
            vertices: indices.map((i) => sheet.vertices[i]),
          })),
        ),
      };
    },
    presentTerminal(dt) {
      hazards.presentTerminal(dt);
    },
    setBreath,
    setRelicPoint(point) {
      if (disposed) return;
      relic.position.copy(vec(point));
    },
    step(
      dt,
      {
        active = true,
        activeTimeDt,
        position,
        previous: suppliedPrevious,
        intakePoint,
        previousIntakePoint,
        forward = { x: 0, y: 0, z: -1 },
        previousForward = forward,
        playerLength = 3,
      } = {},
    ) {
      if (disposed || !active || !position) return [];
      if (refreshColliders()) fieldKey = null;
      const p = vec(position),
        before = vec(suppliedPrevious || previous || p);
      const intake = vec(intakePoint || p),
        intakeBefore = vec(previousIntakePoint || previousIntake || intake),
        jumped = p.distanceTo(before) > 8;
      if (jumped) before.copy(p);
      if (jumped || intake.distanceTo(intakeBefore) > 8)
        intakeBefore.copy(intake);
      previous = p.clone();
      previousIntake = intake.clone();
      const radius = bodyRadius(playerLength),
        contact = seals.find((s) =>
          touch(s.point, p, before, s.radius + radius),
        ),
        relicContact = () => {
          rebuildField();
          return contactPoint(relic.position, intake, intakeBefore, 8);
        },
        relicAccessible = () => {
          const nearRelic = relicContact();
          if (
            !nearRelic ||
            typeof canAccessRelic !== "function" ||
            state.relicHeld ||
            !state.barrierOpen ||
            !state.guardOpen
          )
            return false;
          const surfacePoints = heartAsset
            .getPickupSurfacePoints(nearRelic)
            .filter(
              (point) =>
                nearRelic.distanceTo(point) <= 8.00001 &&
                !castIndexedSegment(nearRelic, point, {
                  staticColliders: relicColliders,
                  radius: 0.2,
                }),
            )
            .map((point) => point.clone());
          return (
            surfacePoints.length > 0 &&
            canAccessRelic({
              position: p,
              previous: before,
              relicPoint: relic.position.clone(),
              surfacePoints,
              intakePoint: nearRelic.clone(),
              previousIntakePoint: intakeBefore.clone(),
              playerLength,
              forward,
              guardOpen: state.guardOpen,
              guardAmount: state.guardAmount,
            }) === true
          );
        },
        body = {
          length: playerLength,
          radius,
          forward,
          previousForward: jumped ? forward : previousForward,
        },
        escapeContact =
          state.escaping && typeof checkEscape === "function"
            ? checkEscape(before, p, body)
            : null,
        exitId = escapeContact?.id || state.escapePortal,
        escapeSafe =
          !!exitId &&
          typeof isEscapeSafe === "function" &&
          isEscapeSafe(p, body, exitId) === true,
        events = stepBermudaTitan(state, dt, {
          active,
          activeTimeDt,
          seal: contact?.id ?? null,
          relic: () => !!relicContact(),
          relicAccessible,
          beamContact: false,
          guardContact: () => {
            rebuildField();
            if (typeof dynamicContacts !== "function") return false;
            const arms = dynamicContacts(p, p, {
              radius,
              padding: playerLength * 0.52,
            }).filter((c) => c.titanGuardArm === true);
            return isPositionBlocked(p, {
              radius,
              length: playerLength,
              forward,
              colliders: arms,
            });
          },
          escapeContact,
          escapeSafe,
        }).filter((e) => e.kind !== "breath_pulse");
      if (events.some((e) => e.kind === "entombed")) {
        // 失败当帧真实封洞；死亡菜单不再创建另一条计时循环，也不能取得胜利旗标。
        state.sealAmount = 1;
        state.sealed =
          typeof sealPortals === "function" && sealPortals(1) === true;
      } else if (
        state.escaped &&
        !state.secured &&
        !state.entombed &&
        escapeSafe
      ) {
        const physicalClosed =
          typeof sealPortals === "function" &&
          sealPortals(state.sealAmount) === true;
        events.push(
          ...confirmBermudaTitanSecured(state, {
            escapeSafe,
            portalsSealed: physicalClosed,
          }),
        );
      } else if (events.some((e) => e.kind === "escape_returned")) {
        // 玩家回入时取消尚未落定的封门进度，必须重新完整游出。
        resetPortals();
      }
      refreshColliders();
      rebuildField();
      events.push(
        ...hazards.step(
          activeTimeDt === undefined
            ? Math.max(0, Math.min(0.12, dt))
            : activeTimeDt,
          {
            active,
            state,
            mouth: breathLayout?.mouth,
            direction: breathLayout?.direction,
            position: p,
            previous: before,
            body,
          },
        ),
      );
      if (
        !discovered &&
        (inLair ? inLair(p) : p.distanceTo(tablet.position) < 90)
      ) {
        discovered = true;
        events.unshift({ kind: "discovered" });
      }
      const tabletContact = touch(tablet.position, p, before, 12 + radius);
      if (tabletContact && !touchingTablet)
        events.push({ kind: "tablet", order: [...BERMUDA_TITAN_SEALS] });
      touchingTablet = tabletContact;
      for (const event of events) {
        if (event.damage) onDamage(event.damage, event.kind, event);
        if (event.kind === "secured") onCollected(event);
        // 蓄光和吐息只用画面与目标短行表达，不逐阶段或逐次受击刷提示。
        if (
          ![
            "phase",
            "breath_hit",
            "breath_pulse",
            "hazard_hit",
            "guard_crush",
          ].includes(event.kind)
        )
          onNotice(event);
      }
      return events;
    },
    update(
      elapsed,
      position,
      { highQuality = true, reducedMotion = false, terminalDt = 0 } = {},
    ) {
      if (disposed) return;
      refreshColliders();
      rebuildField();
      const p = vec(position),
        near = p.distanceTo(relic.position) < (highQuality ? 320 : 280),
        charging = state.phase === "charging",
        active = hazards.snapshot.lava.emitting,
        glow = charging
          ? 1 - state.remaining / state.phaseDuration
          : active
            ? 1
            : 0;
      for (let i = 0; i < seals.length; i++) {
        const seal = seals[i],
          done = i < state.completed;
        seal.group.visible = p.distanceTo(seal.point) < 220;
        runeMaterials[i].color.set(
          done ? 0x8ef0b6 : state.phase === "cooldown" ? 0x8cdde7 : 0xde934f,
        );
        runeMaterials[i].opacity = done
          ? 0.9
          : reducedMotion
            ? 0.65
            : 0.6 + 0.2 * Math.sin(elapsed * 1.5 + i);
        seal.ring.rotation.z = reducedMotion
          ? 0
          : Math.sin(elapsed * 0.3) * 0.05;
      }
      tablet.visible = p.distanceTo(tablet.position) < 220;
      relic.visible = near && !state.relicHeld;
      barrier.visible = !state.barrierOpen;
      relicRingMaterial.color.set(state.guardOpen ? 0x9ef2cd : 0xe0ae68);
      relicRingMaterial.opacity = state.guardOpen ? 0.9 : 0.35;
      barrierMaterial.opacity = reducedMotion
        ? 0.06
        : 0.06 + Math.sin(elapsed * 1.2) * 0.015;
      // 琥珀心核固定在真实双爪怀中，不绕世界轴旋转或离开护臂。
      hazards.presentTerminal(terminalDt);
      hazardVisuals.root.visible = near || hazards.snapshot.terminal.active;
      hazardVisuals.update(hazards.snapshot, { reducedMotion });
      lightSources[0].intensity = glow * 24;
      lightSources[1].intensity = state.relicHeld ? 0 : 12;
    },
    reset({ seed = makeSeed() } = {}) {
      resetBermudaTitanState(state, { seed });
      hazards.reset(seed);
      hazardVisuals.reset();
      resetPortals();
      previous = null;
      previousIntake = null;
      discovered = false;
      touchingTablet = false;
      fieldKey = null;
      rebuildField();
      relic.visible = barrier.visible = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      for (const resource of owned) resource.dispose();
    },
  };
}
