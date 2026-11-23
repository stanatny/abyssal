import * as THREE from "three";
import { isPositionBlocked } from "./collision.js";
import { queryStaticColliders } from "./static_collider_grid.js";
import {
  createTitanLavaSheet,
  isTitanLavaCellBlocked,
} from "./bermuda_titan_hazards.js";

/** 落点来自现有主洞真实海床/洞顶；不扩地图，不给伤害或画面各算一套地面。 */
export function createBermudaTitanHazardSites({
  cave,
  heightAt,
  colliders,
  dynamicContacts = () => [],
  anchors = [],
  mouth = null,
  direction = null,
}) {
  const sites = [],
    ray = new THREE.Raycaster(),
    up = new THREE.Vector3(0, 1, 0),
    point = new THREE.Vector3(),
    pairs = [];
  if (typeof cave.interiorAt === "function") {
    // 随现有洞室曲折轴线布点，不把旧直洞坐标写死成只有巢前一小片。
    for (let i = 2; i <= 18; i++)
      for (const across of [-0.62, -0.38, -0.12, 0.14, 0.4, 0.64]) {
        const p = cave.interiorAt(i / 20, across, 0.08);
        pairs.push([p.x, p.z]);
      }
  } else
    for (const z of [-1660, -1636, -1612, -1588, -1564, -1540, -1516, -1460])
      for (const x of [-130, -105, -80, -55, -30, -5, 20]) pairs.push([x, z]);
  const source = mouth && new THREE.Vector3().copy(mouth),
    forward = direction && new THREE.Vector3(direction.x, 0, direction.z);
  if (source && forward?.lengthSq() > 1e-8) {
    forward.normalize();
    const across = new THREE.Vector3(-forward.z, 0, forward.x);
    // 新石台改变了落地面；沿真实嘴前铺设近、中、远落点，而非只碰运气命中旧横带。
    for (const distance of [20.25, 24, 32, 44, 58, 74, 94])
      for (const offset of [-24, -12, 0, 12, 24]) {
        const p = source
          .clone()
          .addScaledVector(forward, distance)
          .addScaledVector(across, offset);
        pairs.push([p.x, p.z]);
      }
  }
  for (const anchor of anchors) pairs.push([anchor.x, anchor.z]);
  cave.shell.updateWorldMatrix(true, false);
  const mouthSolids = source
    ? colliders.filter((c) => !c.titanBreathIgnore)
    : null;
  function legalLavaSheet(site) {
    if (!source || !forward) return true;
    const dx = site.impact.x - source.x,
      dz = site.impact.z - source.z,
      run = Math.hypot(dx, dz),
      projection = dx * forward.x + dz * forward.z;
    if (run < 20 || projection < 18 || projection / run < 0.75) return false;
    // 这里只剔除实际最小厚片也无路可落的点；生产每次仍验证当前姿态的完整140格。
    for (const lift of [20, 8]) {
      const sheet = createTitanLavaSheet(source, direction, site, {
        lift,
        width: 18,
        seed: 1,
      });
      const clear = sheet.cells
        .filter((cell) => cell.allowLanding)
        .every((cell) => {
          const box = new THREE.Box3().setFromPoints(
              cell.vertices.map((p) => new THREE.Vector3().copy(p)),
            ),
            fixed = queryStaticColliders(
              cell.nearMouth ? mouthSolids : colliders,
              box.min,
              box.max,
            );
          if (isTitanLavaCellBlocked(cell, fixed)) return false;
          // 蓄光会改变唇缝与抬头；构造期不拿静息动态代理否掉稍后才打开的真实水路。
          // 当前护臂/头部仍由生产cellClear在每次锁点和发射时完整复核。
          for (const ids of [
            [0, 1, 3],
            [0, 3, 2],
          ]) {
            const [a, b, c] = ids.map((i) =>
                new THREE.Vector3().copy(cell.vertices[i]),
              ),
              ab = b.clone().sub(a),
              ac = c.clone().sub(a),
              steps = Math.max(
                1,
                Math.ceil(
                  Math.max(ab.length(), ac.length(), b.distanceTo(c)) / 2,
                ),
              );
            for (let i = 0; i <= steps; i++)
              for (let j = 0; j <= steps - i; j++) {
                const p = a
                  .clone()
                  .addScaledVector(ab, i / steps)
                  .addScaledVector(ac, j / steps);
                if (
                  p.y <
                  heightAt(p.x, p.z) - (cell.allowLanding ? 0.2 : 0.025)
                )
                  return false;
              }
          }
          return true;
        });
      if (clear) return true;
    }
    return false;
  }
  const seen = new Set();
  for (const [x, z] of pairs) {
    const key = `${x.toFixed(2)}/${z.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // 唯一正式入口外留成人体型的等候/绕行空间，避免把出口本身设作落点。
    if (
      (cave.portals || []).some(
        (portal) =>
          Math.hypot(x - portal.position.x, z - portal.position.z) < 30,
      )
    )
      continue;
    const ground = heightAt(x, z);
    point.set(x, ground + 5, z);
    if (!cave.contains(point, 2)) continue;
    const nearby = queryStaticColliders(colliders, point, point, {
      radius: 2.5,
    });
    const blockedForBody = isPositionBlocked(point, {
      radius: 2.5,
      colliders: [...nearby, ...dynamicContacts(point, point, { radius: 2.5 })],
    });
    if (blockedForBody) {
      if (!source) continue;
      // 角色球最高到地上7.5m，不代表四米高熔池无处可落；最终仍核整片真实体积。
      const poolPoint = new THREE.Vector3(x, ground + 2.12, z),
        poolRadius = 1.9;
      if (
        isPositionBlocked(poolPoint, {
          radius: poolRadius,
          colliders: [
            ...queryStaticColliders(colliders, poolPoint, poolPoint, {
              radius: poolRadius,
            }),
            ...dynamicContacts(poolPoint, poolPoint, { radius: poolRadius }),
          ],
        })
      )
        continue;
    }
    ray.set(point, up);
    ray.near = 0.01;
    ray.far = 260;
    const roofHit = ray.intersectObject(cave.shell, false)[0];
    if (!roofHit || roofHit.point.y - ground < 30) continue;
    const normal = new THREE.Vector3(
      heightAt(x - 1, z) - heightAt(x + 1, z),
      2,
      heightAt(x, z - 1) - heightAt(x, z + 1),
    ).normalize();
    if (normal.y < 0.45) continue;
    const sector =
      z > -1490 ? "north" : z < -1620 ? "south" : x < -90 ? "cradle" : "east";
    const site = {
      id: `titan_hazard_${sites.length}`,
      impact: { x, y: ground + 0.12, z },
      normal: { x: normal.x, y: normal.y, z: normal.z },
      roof: { x, y: roofHit.point.y, z },
      sector,
      floorAt: heightAt,
      contains: cave.contains,
    };
    site.lavaEligible = legalLavaSheet(site);
    sites.push(site);
  }
  return sites;
}
