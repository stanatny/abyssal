import { odysseySeabedHeight } from "./odyssey_config.js";

/** 雕像、承重底座、实际归航拱门与水路共用同一处实体地点。 */
export const AEOLUS_MONUMENT_SITE = Object.freeze({
  position: Object.freeze([-160, 106, -600]),
  height: 180,
  yaw: 0,
  riseDistance: 216,
  plinthThickness: 6,
  plinthWidth: 112,
  plinthDepth: 72,
  width: 120,
  depth: 76,
});
export const AEOLUS_ARCH = Object.freeze({
  center: Object.freeze([-160, -50, -600]),
  halfWidth: 28,
  floorY: -85,
  roofY: -15,
  halfDepth: 38,
  southGateZ: -640,
  gateOpeningDuration: 2.2,
});
export const AEOLUS_HOMEWARD_FINISH = Object.freeze({
  center: Object.freeze([-160, -45, -588]),
  radius: 18,
});

/** 深处主段仍沿中央水层归航，末段转入风神像承重基座里的真正拱门。 */
export function buildOdysseyHomewardPath(heightAt = odysseySeabedHeight) {
  const points = [];
  const level = (x, z) => Math.min(-45, heightAt(x, z) + 120);
  for (let z = -2164; z < -900; z += 24) points.push([-90, level(-90, z), z]);
  const controls = [
    [-90, level(-90, -900), -900],
    [-100, -275, -840],
    [-195, -250, -785],
    [-245, -215, -735],
    [-210, -135, -690],
    [-160, -75, -650],
    [-160, -45, -620],
    [...AEOLUS_HOMEWARD_FINISH.center],
  ];
  // 深水航段在入拱前逐渐转弯上升，经过原有神谕鲸补给附近；没有折线直角或空中终点。
  const previous = points.at(-1);
  const final = controls.at(-1);
  const after = [final[0], final[1], final[2] + 24];
  const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const cubic = (p0, p1, p2, p3, t) =>
    p1.map((v, axis) => {
      const a = p0[axis],
        b = p2[axis],
        c = p3[axis];
      return (
        0.5 *
        (2 * v +
          (-a + b) * t +
          (2 * a - 5 * v + 4 * b - c) * t * t +
          (-a + 3 * v - 3 * b + c) * t * t * t)
      );
    });
  points.push(controls[0]);
  for (let i = 0; i < controls.length - 1; i++) {
    const p0 = controls[i - 1] ?? previous;
    const p1 = controls[i],
      p2 = controls[i + 1];
    const p3 = controls[i + 2] ?? after;
    const sample = (t) => cubic(p0, p1, p2, p3, t);
    // 以弦长和弯曲误差自适应细分；视觉线和实际水流共享这些点，不另作切角平滑。
    const split = (lo, hi, start, end, depth) => {
      const middleT = (lo + hi) / 2,
        middle = sample(middleT);
      const chordMiddle = start.map((v, axis) => (v + end[axis]) / 2);
      if (
        depth < 12 &&
        (distance(start, end) > 16 || distance(middle, chordMiddle) > 0.25)
      ) {
        split(lo, middleT, start, middle, depth + 1);
        split(middleT, hi, middle, end, depth + 1);
      } else points.push(end);
    };
    split(0, 1, p1, p2, 0);
  }
  // 保留原深水折线的几何，只细分过长弦，避免24m纵向采样因坡度变成更大的实际跨度。
  const dense = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const count = Math.ceil(distance(a, b) / 24);
    for (let n = 1; n <= count; n++)
      dense.push(a.map((v, axis) => v + ((b[axis] - v) * n) / count));
  }
  return dense.map((point) => Object.freeze(point));
}
