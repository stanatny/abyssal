import { createElectricArcs } from "./electric_arcs.js";

/** 四槽空间电弧池；电击当帧覆盖原范围，余弧仅消散、不再次结算伤害。 */
export function createElectricDischarge(
  parent,
  { reducedMotion = () => false } = {},
) {
  const slots = Array.from({ length: 4 }, (_, slot) => ({
    arcs: createElectricArcs(parent, 88, "river_electric_discharge"),
    age: 0,
    radius: 12,
    frame: -1,
    slot,
  }));
  function draw(s) {
    const { arcs, age, radius } = s,
      fade = Math.max(0, 1 - age / 0.65);
    arcs.core.material.opacity = fade * 0.95;
    arcs.halo.material.opacity = fade * 0.14;
    const frame = reducedMotion() ? 0 : Math.floor(age * 12);
    if (frame === s.frame) return;
    s.frame = frame;
    arcs.begin();
    for (let ray = 0; ray < 8; ray++) {
      const angle =
          (ray * Math.PI) / 4 + s.slot * 0.23 + Math.sin(ray * 3.7) * 0.2,
        elevation = Math.sin(ray * 2.4 + 0.7) * 0.55,
        reach = radius * (0.7 + (ray % 3) * 0.13),
        horizontal = Math.sqrt(1 - elevation * elevation);
      let x = 0,
        y = 0,
        z = 0;
      for (let j = 1; j <= 9; j++) {
        const t = j / 9,
          jitter = Math.sin(ray * 32 + j * 47 + frame * 9) * radius * 0.027,
          nx =
            Math.cos(angle) * reach * t * horizontal + Math.sin(angle) * jitter,
          nz =
            Math.sin(angle) * reach * t * horizontal - Math.cos(angle) * jitter,
          ny =
            elevation * reach * t +
            Math.sin(j * 11 + ray + frame) * radius * 0.022;
        arcs.segment(x, y, z, nx, ny, nz, radius * 0.0013 * (1.1 - t * 0.45));
        if (j === 6) {
          const branchAngle = angle + 0.62,
            bx = nx + Math.cos(branchAngle) * radius * 0.11,
            bz = nz + Math.sin(branchAngle) * radius * 0.11,
            by = ny + radius * 0.055;
          arcs.segment(nx, ny, nz, bx, by, bz, radius * 0.0009);
          arcs.segment(
            bx,
            by,
            bz,
            bx + Math.cos(angle) * radius * 0.1,
            by - radius * 0.04,
            bz + Math.sin(angle) * radius * 0.1,
            radius * 0.0006,
          );
        }
        x = nx;
        y = ny;
        z = nz;
      }
    }
    arcs.finish();
  }
  let cursor = 0,
    disposed = false;
  return {
    emit(point, radius = 12) {
      if (disposed) return;
      const s = slots[cursor++ % slots.length];
      s.arcs.group.position.copy(point);
      s.radius = radius;
      s.age = 0;
      s.frame = -1;
      s.arcs.group.visible = true;
      draw(s);
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0 || disposed) return;
      for (const s of slots) {
        if (!s.arcs.group.visible) continue;
        s.age += dt;
        if (s.age >= 0.65) s.arcs.group.visible = false;
        else draw(s);
      }
    },
    reset() {
      for (const s of slots) s.arcs.group.visible = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const s of slots) s.arcs.dispose();
    },
  };
}
