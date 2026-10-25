import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createAmazonSpiderMonkey } from "./amazon_spider_monkey.js";
import {
  sampleCanopyTraverse,
  placeCanopyMonkey,
} from "./amazon_canopy_motion.js";
import { amazonChannels, amazonSurfaceHeight } from "./amazon_config.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 少量树栖居民：支撑藤蔓连接实际树干，世界位移与换手抓点共同驱动蒙皮。 */
export function createAmazonArboreal(parent, trees, assets, resources) {
  const root = new THREE.Group();
  root.name = "amazon_spider_monkeys";
  parent.add(root);
  const material = new THREE.MeshStandardMaterial({
    color: 0x594e35,
    roughness: 0.96,
  });
  addSurfaceDetail(material, "wood", 0.35);
  resources.add(material);
  // 河岸低枝作为活动前景；不把角色藏进高处的林冠。
  function shoreAt(tree) {
    const channel = amazonChannels(tree.z).sort(
      (a, b) => Math.abs(a.center - tree.x) - Math.abs(b.center - tree.x),
    )[0];
    const side = Math.sign(tree.x - channel.center);
    let wet = channel.center,
      dry = tree.x;
    for (let i = 0; i < 24; i++) {
      const x = (wet + dry) * 0.5;
      if (amazonSurfaceHeight(x, tree.z) > 0) dry = x;
      else wet = x;
    }
    return { x: dry + side * 2, side, channel: channel.side };
  }
  const near = trees.filter(
    (tree) =>
      tree.kind === "kapok" &&
      tree.y > 4 &&
      tree.y < 20 &&
      tree.z < -160 &&
      tree.z > -1230 &&
      Math.abs(tree.x - shoreAt(tree).x) < 28,
  );
  const pairs = [];
  for (let i = 0; i < near.length; i++)
    for (let j = i + 1; j < near.length; j++) {
      const a = near[i],
        b = near[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 32) continue;
      const sa = shoreAt(a),
        sb = shoreAt(b),
        span = Math.hypot(sa.x - sb.x, a.z - b.z),
        y = Math.max(a.y, b.y) + 4;
      if (
        sa.side !== sb.side ||
        sa.channel !== sb.channel ||
        span < 14 ||
        span > 27 ||
        y > 24
      )
        continue;
      let clear = true;
      for (let t = 0; t <= 1; t += 0.05)
        if (
          amazonSurfaceHeight(
            THREE.MathUtils.lerp(sa.x, sb.x, t),
            THREE.MathUtils.lerp(a.z, b.z, t),
          ) >
          y - 6
        )
          clear = false;
      if (clear) pairs.push({ a, b, sa, sb, y, z: (a.z + b.z) * 0.5 });
    }
  const actors = [],
    probe = new THREE.Mesh(assets.kapok.geometry, assets.kapok.material),
    ray = new THREE.Raycaster(),
    center = new THREE.Vector3(),
    target = new THREE.Vector3(),
    direction = new THREE.Vector3();
  probe.matrixAutoUpdate = false;
  function trunkHit(tree, origin, y) {
    probe.matrix.copy(tree.matrix);
    probe.updateMatrixWorld(true);
    for (const offset of [0, -1, 1, -2, 2]) {
      target.set(tree.x + offset, y, tree.z);
      direction.subVectors(target, origin).normalize();
      ray.set(origin, direction);
      ray.far = origin.distanceTo(target) + 5;
      const hit = ray.intersectObject(probe, false)[0];
      if (hit) return hit.point.addScaledVector(direction, 0.12);
    }
    return null;
  }
  for (const zone of [-245, -430, -615, -800, -985, -1170]) {
    pairs.sort(
      (a, b) => Math.abs(a.z - zone) + a.y * 3 - Math.abs(b.z - zone) - b.y * 3,
    );
    for (const pair of pairs) {
      if (
        Math.abs(pair.z - zone) > 135 ||
        actors.some(
          (a) =>
            Math.hypot(
              a.root.position.x - (pair.a.x + pair.b.x) * 0.5,
              a.root.position.z - pair.z,
            ) < 115,
        )
      )
        continue;
      // Keep the selected shoreline route; lift only the two lowest crossings
      // enough for the newly turning, flexed whole body to clear the bank.
      const height = Math.max(15.5, pair.y);
      let a = new THREE.Vector3(pair.sa.x, height, pair.a.z),
        b = new THREE.Vector3(pair.sb.x, height, pair.b.z);
      center.copy(a).lerp(b, 0.5);
      const supportA = trunkHit(pair.a, a.clone().setY(height + 2), height + 2),
        supportB = trunkHit(pair.b, b.clone().setY(height + 2), height + 2);
      if (!supportA || !supportB) continue;
      const supports = [
        [supportA, a.clone()],
        [supportB, b.clone()],
      ];
      // 面向水域。两端低枝从真实树干伸出，藤蔓和抓点共用同一空间曲线。
      const channel = amazonChannels(pair.z).sort(
        (c, d) => Math.abs(c.center - center.x) - Math.abs(d.center - center.x),
      )[0];
      direction.subVectors(b, a).normalize();
      if (-direction.z * (channel.center - center.x) < 0) [a, b] = [b, a];
      const group = new THREE.Group(),
        span = a.distanceTo(b);
      group.position.copy(a).lerp(b, 0.5);
      group.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
      group.name = "rainforest_monkey_traverse";
      root.add(group);
      const points = Array.from({ length: 25 }, (_, i) => {
        const x = (i / 24 - 0.5) * span;
        return new THREE.Vector3(x, canopyVineHeight(x, span), 0);
      });
      const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        48,
        0.1,
        5,
        false,
      );
      group.updateMatrixWorld(true);
      const parts = [geometry];
      for (const [trunk, tip] of supports) {
        const start = group.worldToLocal(trunk.clone()),
          end = group.worldToLocal(tip.clone()),
          branch = new THREE.CylinderGeometry(
            0.17,
            0.56,
            start.distanceTo(end),
            7,
            3,
          );
        const alignment = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          end.clone().sub(start).normalize(),
        );
        branch.applyQuaternion(alignment);
        branch.translate(...start.clone().lerp(end, 0.5).toArray());
        parts.push(branch);
      }
      const joined = mergeGeometries(parts);
      for (const part of parts) part.dispose();
      resources.add(joined);
      const vine = new THREE.Mesh(joined, material);
      vine.name = "rainforest_traverse_liana";
      group.add(vine);
      const monkey = createAmazonSpiderMonkey();
      group.add(monkey.root);
      resources.add({ dispose: monkey.dispose });
      const actor = {
        root: group,
        monkey,
        span,
        phase: actors.length * 9.71,
        state: { hands: [{}, {}] },
        centerOffset: new THREE.Vector3(),
        hands: [new THREE.Vector3(), new THREE.Vector3()],
        anchors: [a.toArray(), b.toArray()],
        supports: supports.map((ends) => ends.map((p) => p.toArray())),
      };
      actors.push(actor);
      break;
    }
  }
  root.updateMatrixWorld(true);
  function update(t, position, reducedMotion = false) {
    root.visible = position.y > -20;
    for (const actor of actors) {
      actor.root.visible =
        root.visible &&
        Math.hypot(
          actor.root.position.x - position.x,
          actor.root.position.z - position.z,
        ) < 210;
      if (!actor.root.visible) continue;
      const time = (reducedMotion ? 0 : t) + actor.phase,
        pose = sampleCanopyTraverse(time, actor.span, actor.state);
      placeCanopyMonkey(
        actor.monkey,
        pose,
        canopyVineHeight(pose.x, actor.span),
        actor.centerOffset,
      );
      for (let i = 0; i < 2; i++) {
        const h = pose.hands[i];
        actor.hands[i].set(h.x, canopyVineHeight(h.x, actor.span) - h.drop, 0);
        actor.root.localToWorld(actor.hands[i]);
      }
      actor.monkey.pose(time, actor.hands, reducedMotion, pose);
    }
  }
  update(0, { x: 0, y: 0, z: -600 });
  root.userData.anchors = actors.map((a) => a.anchors);
  root.userData.supports = actors.map((a) => a.supports);
  return { root, actors, update };
}

export function canopyVineHeight(x, span) {
  return -0.65 * (1 - ((2 * x) / span) ** 2);
}
