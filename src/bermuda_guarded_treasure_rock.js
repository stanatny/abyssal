import * as THREE from "three";
import { createTitanRestingRock } from "./bermuda_titan_resting_rock.js";
import { createTerrainSurface } from "./terrain_surface.js";

/** 护宝石台落在原海床上；东侧缓坡连接前庭，开口与身体净空由真实怪兽姿态约束。 */
export function createBermudaGuardedTreasureRock(
  parent,
  { heightAt, frontOrigin, topOffset = -30.8836933 },
) {
  const origin = new THREE.Vector3().copy(frontOrigin),
    topY = origin.y + topOffset,
    center = new THREE.Vector3(origin.x + 60, topY, origin.z),
    smooth = THREE.MathUtils.smoothstep,
    desiredTop = (x, z) => {
      const ground = heightAt(x, z),
        west = smooth(x, origin.x + 23, origin.x + 28),
        east = 1 - smooth(x, origin.x + 71, origin.x + 105),
        side = 1 - smooth(Math.abs(z - origin.z), 25, 34);
      return ground + Math.max(0, topY - ground) * west * east * side;
    },
    rock = createTitanRestingRock(parent, {
      center,
      rx: 50,
      rz: 38,
      heightAt,
      topAt: desiredTop,
      fitted: true,
      id: "titan_guarded_treasure_rock",
    });
  rock.mesh.name = "bermuda_titan_guarded_treasure_rock";
  rock.mesh.userData.terrainContact = true;
  rock.mesh.updateWorldMatrix(true, false);
  // 只索引这块固定石台；fallback保留传入的原海床，不能回调后来组合的ocean包装器。
  const surface = createTerrainSurface(rock.mesh, { fallback: heightAt }),
    floorSurface = (x, z) => Math.max(heightAt(x, z), surface(x, z));
  floorSurface.supportHeight = (x, z, radius) =>
    Math.max(
      heightAt.supportHeight
        ? heightAt.supportHeight(x, z, radius)
        : heightAt(x, z) + radius,
      surface.supportHeight(x, z, radius),
    );
  // 岩床通用边格在陡海床边缘偶尔会过宽；只对真正超出本块三角面包络的格局部重拟合。
  // 原网格和整块源体积不动，重新裁剪的子格继续覆盖其足迹内所有真实顶面。
  const fits = (contact) => {
      const top = contact.y + contact.halfSize.y;
      for (const sx of [-1, 0, 1])
        for (const sz of [-1, 0, 1])
          if (
            top >
            floorSurface.supportHeight(
              contact.x + sx * contact.halfSize.x,
              contact.z + sz * contact.halfSize.z,
              1.9,
            )
          )
            return false;
      return true;
    },
    topGrid = new Map(),
    p = rock.mesh.geometry.attributes.position,
    index = rock.mesh.geometry.index,
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    refined = [];
  let indexedTop = false,
    fragments = 0;
  const indexTop = () => {
    if (indexedTop) return;
    indexedTop = true;
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(p, index.getX(i));
      b.fromBufferAttribute(p, index.getX(i + 1));
      c.fromBufferAttribute(p, index.getX(i + 2));
      normal.crossVectors(b.clone().sub(a), c.clone().sub(a));
      if (normal.y <= 1e-10) continue;
      const row = [a.clone(), b.clone(), c.clone()];
      for (
        let x = Math.floor(Math.min(a.x, b.x, c.x) / 4);
        x <= Math.floor(Math.max(a.x, b.x, c.x) / 4);
        x++
      )
        for (
          let z = Math.floor(Math.min(a.z, b.z, c.z) / 4);
          z <= Math.floor(Math.max(a.z, b.z, c.z) / 4);
          z++
        ) {
          const key = x + "/" + z;
          if (!topGrid.has(key)) topGrid.set(key, []);
          topGrid.get(key).push(row);
        }
    }
  };
  const refine = (x, z, width, depth, level = 0) => {
    const rows = new Set(),
      heights = [];
    for (let gx = Math.floor(x / 4); gx <= Math.floor((x + width) / 4); gx++)
      for (let gz = Math.floor(z / 4); gz <= Math.floor((z + depth) / 4); gz++)
        for (const row of topGrid.get(gx + "/" + gz) ?? []) rows.add(row);
    for (const row of rows) {
      let polygon = row;
      for (const [axis, edge, above] of [
        ["x", x, true],
        ["x", x + width, false],
        ["z", z, true],
        ["z", z + depth, false],
      ]) {
        const clipped = [];
        for (let i = 0; i < polygon.length; i++) {
          const from = polygon[i],
            to = polygon[(i + 1) % polygon.length],
            inside = above ? from[axis] >= edge : from[axis] <= edge,
            nextInside = above ? to[axis] >= edge : to[axis] <= edge;
          if (inside) clipped.push(from);
          if (inside !== nextInside)
            clipped.push(
              from
                .clone()
                .lerp(to, (edge - from[axis]) / (to[axis] - from[axis])),
            );
        }
        polygon = clipped;
        if (!polygon.length) break;
      }
      for (const point of polygon) heights.push(point.y);
    }
    if (!heights.length) return;
    const bottom =
        Math.min(
          heightAt(x, z),
          heightAt(x + width, z),
          heightAt(x, z + depth),
          heightAt(x + width, z + depth),
        ) - 2,
      top = Math.max(...heights) + 0.15,
      contact = {
        id: `titan_guarded_treasure_rock_refined_${fragments++}`,
        type: "box",
        x: x + width / 2,
        y: (bottom + top) / 2,
        z: z + depth / 2,
        halfSize: new THREE.Vector3(
          width / 2 + 0.02,
          (top - bottom) / 2,
          depth / 2 + 0.02,
        ),
        rotation: new THREE.Quaternion(),
        titanBreathIgnore: true,
      };
    if (fits(contact)) refined.push(contact);
    else {
      if (level >= 12 || Math.max(width, depth) <= 0.0625)
        throw new Error(
          "Guarded treasure rock requires a tighter true-surface contact",
        );
      if (width >= depth) {
        refine(x, z, width / 2, depth, level + 1);
        refine(x + width / 2, z, width / 2, depth, level + 1);
      } else {
        refine(x, z, width, depth / 2, level + 1);
        refine(x, z + depth / 2, width, depth / 2, level + 1);
      }
    }
  };
  for (const contact of rock.contacts)
    if (fits(contact)) refined.push(contact);
    else {
      indexTop();
      refine(
        contact.x - contact.halfSize.x + 0.02,
        contact.z - contact.halfSize.z + 0.02,
        contact.halfSize.x * 2 - 0.04,
        contact.halfSize.z * 2 - 0.04,
      );
    }
  rock.contacts.splice(0, rock.contacts.length, ...refined);
  // 本石台两级拟合均为裁剪实三角最高点+.15；保留+.05真实外包，给贴地熔流留下水隙。
  // 只收回本块新增代理的多余顶垫，底面、足迹、实际三角和共享岩床拟合均不变。
  for (const contact of rock.contacts) {
    const bottom = contact.y - contact.halfSize.y,
      top = contact.y + contact.halfSize.y - 0.1;
    contact.y = (bottom + top) / 2;
    contact.halfSize.y = (top - bottom) / 2;
  }
  topGrid.clear();
  let disposed = false;
  return {
    mesh: rock.mesh,
    contacts: rock.contacts,
    topY,
    topAt: rock.topAt,
    floorSurface,
    turnBay: {
      // 净水包络仍需与开闭HF皮肤联合验收；这里仅提供不会抬高转身身体的地面。
      center: new THREE.Vector3(
        origin.x + 60,
        topY + 6.3236933,
        origin.z + 4.35,
      ),
      radius: 21,
      plateau: {
        minX: origin.x + 28,
        maxX: origin.x + 71,
        minZ: origin.z - 25,
        maxZ: origin.z + 25,
      },
      eastJoin: new THREE.Vector3(-125, -600, -1560),
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      surface.dispose();
      rock.dispose();
      rock.contacts.length = 0;
    },
  };
}
