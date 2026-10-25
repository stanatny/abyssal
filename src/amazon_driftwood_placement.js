import * as THREE from "three";
import {
  amazonSeabedHeight,
  amazonIslandBounds,
  amazonIslandCeiling,
} from "./amazon_config.js";
const gates = [-330, -650, -940];
/** 在原有岸边避让河石；沿地形转动沉木及胶囊，保持中央和横向通路畅通。 */
export function fitAmazonDriftwood(item, rocks) {
  const [ox, , oz] = item.p,
    scale = item.s[0],
    sin = Math.sin(item.yaw),
    cos = Math.cos(item.yaw);
  const candidates = [];
  for (const lateral of [0, 4, -4, 8, -8, 12, -12, 18, -18, 24, -24, 32, -32])
    for (const along of [0, 6, -6, 12, -12, 20, -20])
      for (const turn of [0, 0.4, -0.4, 0.8, -0.8, Math.PI / 2])
        candidates.push({
          lateral,
          along,
          turn,
          cost: Math.hypot(lateral, along) + Math.abs(turn) * 5,
        });
  candidates.sort((a, b) => a.cost - b.cost);
  const nearby = rocks.filter((r) => Math.hypot(r.p[0] - ox, r.p[2] - oz) < 65);
  let best;
  for (const { lateral, along, turn } of candidates) {
    const x = ox + cos * lateral + sin * along,
      z = oz - sin * lateral + cos * along,
      yaw = item.yaw + turn;
    const sy = Math.sin(yaw),
      cy = Math.cos(yaw),
      endA = amazonSeabedHeight(x - sy * 6 * scale, z - cy * 6 * scale),
      endB = amazonSeabedHeight(x + sy * 6 * scale, z + cy * 6 * scale);
    const pitch = -Math.atan2(endB - endA, 12 * scale);
    if (Math.abs(pitch) > 0.38) continue;
    const rotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitch, yaw, 0, "YXZ"),
    );
    const offsets = Array.from({ length: 13 }, (_, i) =>
      new THREE.Vector3(0, 0, (i / 12 - 0.5) * 12 * scale).applyQuaternion(
        rotation,
      ),
    );
    if (
      offsets.some(
        (p) =>
          Math.abs(x + p.x) < 36 ||
          gates.some((g) => Math.abs(z + p.z - g) < 24),
      )
    )
      continue;
    const ground = offsets.map((p) => amazonSeabedHeight(x + p.x, z + p.z));
    if (Math.max(...ground) > -12) continue;
    const support = ground.map((f, i) => f - offsets[i].y);
    if (Math.max(...support) - Math.min(...support) > 1.15 * scale) continue;
    const y = Math.max(...support) + 0.45 * scale;
    const pts = offsets.map((p) => p.add(new THREE.Vector3(x, y, z)));
    if (
      pts.some((p) => {
        const bounds = amazonIslandBounds(p.z);
        return (
          bounds &&
          p.x > bounds.left &&
          p.x < bounds.right &&
          p.y + 2 * scale > amazonIslandCeiling(p.x, p.z)
        );
      })
    )
      continue;
    let overlap = false;
    for (const rock of nearby) {
      const cr = Math.cos(rock.yaw),
        sr = Math.sin(rock.yaw),
        axes = [
          rock.s[0] * 1.14 + 0.9 * scale,
          rock.s[1] * 0.65 * 1.14 + 0.9 * scale,
          rock.s[2] * 1.14 + 0.9 * scale,
        ];
      if (
        pts.some((p) => {
          const dx = p.x - rock.p[0],
            dz = p.z - rock.p[2];
          return (
            ((cr * dx - sr * dz) / axes[0]) ** 2 +
              ((p.y - rock.p[1]) / axes[1]) ** 2 +
              ((sr * dx + cr * dz) / axes[2]) ** 2 <
            1
          );
        })
      ) {
        overlap = true;
        break;
      }
    }
    if (!overlap) {
      best = { x, y, z, yaw, pitch, rotation };
      break;
    }
  }
  if (!best) return false;
  item.p = [best.x, best.y, best.z];
  item.pitch = best.pitch;
  item.yaw = best.yaw;
  for (const [key, sign] of [
    ["a", -1],
    ["b", 1],
  ])
    item.collider[key]
      .set(0, 0, sign * 6 * scale)
      .applyQuaternion(best.rotation)
      .add(new THREE.Vector3(...item.p));
  return true;
}
