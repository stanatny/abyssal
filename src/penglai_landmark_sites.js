/** 三座神兽建筑占用既有领地侧缘；四象位置与地图边界均不改变。 */
export const PENGLAI_LANDMARK_SITES = Object.freeze([
  Object.freeze({
    id: "azure_cloud_gate",
    name: "苍龙云阙",
    x: 315,
    z: -655,
    yaw: Math.PI / 2,
  }),
  Object.freeze({
    id: "tiger_watchtowers",
    name: "白虎镇山阙",
    x: -375,
    z: -650,
    yaw: -Math.PI / 2,
  }),
  Object.freeze({
    id: "vermilion_sun_altar",
    name: "朱雀朝阳台",
    x: 100,
    z: -390,
    yaw: Math.PI,
  }),
]);
export function guardianLandmarkReserved(x, z, margin = 0) {
  return PENGLAI_LANDMARK_SITES.some((site, i) => {
    const dx = x - site.x,
      dz = z - site.z,
      c = Math.cos(site.yaw),
      s = Math.sin(site.yaw);
    const lx = dx * c - dz * s,
      lz = dx * s + dz * c;
    return i === 2
      ? Math.hypot(lx, lz) < 41 + margin ||
          (Math.abs(lx) < 12 + margin && lz < 0 && lz > -57 - margin)
      : Math.abs(Math.abs(lx) - (i === 0 ? 43 : 35)) < 14 + margin &&
          Math.abs(lz) < 16 + margin;
  });
}
