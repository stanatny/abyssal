import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseAst } from "rolldown/parseAst";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { createZombieMinion } from "../src/zombie_minion.js";
import { createPlayer } from "../src/simulation.js";
import { isMechanicalAirAim } from "../src/mechanical_aim_direction.js";

const kinds = ["mechanical_shark", "zombie_shark"];
const bodyOf = (root) =>
  root.getObjectByName(
    root.userData.kind === "mechanical_shark"
      ? "mechanical_shark_hf_body"
      : "zombie_shark_hf_body",
  );
function updateMatrices(root) {
  root.updateMatrixWorld(true);
  bodyOf(root).skeleton.update();
}
function pose(root, feed, phase = 0) {
  Object.assign(root.userData.motionState, {
    phase,
    feed,
    power: 0.3,
    boost: 0,
    turn: 0,
    pitchInput: 0,
  });
  root.userData.animate(0, 1, { dt: 0 });
  updateMatrices(root);
}
function vertices(root) {
  updateMatrices(root);
  const body = bodyOf(root);
  return Array.from(
    { length: body.geometry.attributes.position.count },
    (_, i) => body.getVertexPosition(i, new THREE.Vector3()),
  );
}
function mouth(root) {
  return root.worldToLocal(root.userData.getFeedingMouth(new THREE.Vector3()));
}
function resources(root) {
  const nodes = [];
  root.traverse((node) => nodes.push(node));
  return nodes;
}
function geometryDigest(body) {
  const hash = createHash("sha256");
  for (const attr of [
    ...Object.values(body.geometry.attributes),
    body.geometry.index,
  ])
    hash.update(
      Buffer.from(
        attr.array.buffer,
        attr.array.byteOffset,
        attr.array.byteLength,
      ),
    );
  return hash.digest("hex");
}

// 直接执行资产构造器的真实权重循环，检查混合带三维体积的朝向，而非复制一套权重公式。
function skinField(kind) {
  const source = readFileSync(
      new URL(`../src/${kind}_asset.js`, import.meta.url),
      "utf8",
    ),
    ast = parseAst(source),
    shared = ast.body.find(
      (node) =>
        node.type === "FunctionDeclaration" &&
        node.id.name === "sharedGeometry",
    ),
    loop = shared.body.body.find(
      (node) =>
        node.type === "ForStatement" &&
        source.slice(node.start, node.end).includes("const x = xyz"),
    ),
    stationsNode = ast.body
      .flatMap((node) => node.declarations || [])
      .find((node) => node.id.name === "stations").init,
    stations = new Function(
      "return " + source.slice(stationsNode.start, stationsNode.end),
    )(),
    apply = new Function(
      "THREE",
      "smooth",
      "stations",
      "ids",
      "weights",
      "xyz",
      "packed",
      source.slice(loop.start, loop.end),
    ),
    ids = new Uint16Array(4),
    weights = new Float32Array(4),
    xyz = new Float32Array(3),
    packed = { vertices: 1 },
    point = new THREE.Vector3(),
    transformed = new THREE.Vector3(),
    smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
  return (out, x, y, z, matrices) => {
    xyz[0] = x;
    xyz[1] = y;
    xyz[2] = z;
    apply(THREE, smooth, stations, ids, weights, xyz, packed);
    point.fromArray(xyz);
    out.set(0, 0, 0);
    for (let k = 0; k < 4; k++)
      if (weights[k])
        out.addScaledVector(
          transformed.copy(point).applyMatrix4(matrices[ids[k]]),
          weights[k],
        );
    return out;
  };
}

function rearFollowCamera(kind) {
  const source = readFileSync(
      new URL("../src/main.js", import.meta.url),
      "utf8",
    ),
    node = parseAst(source).body.find(
      (node) =>
        node.type === "FunctionDeclaration" &&
        node.id.name === "followCameraPose",
    ),
    camera = new THREE.PerspectiveCamera(60, 1280 / 800, 0.1, 1000),
    readPose = new Function(
      "THREE",
      "Clamp",
      "player",
      "position",
      "forward",
      "touchPointer",
      "waterMotion",
      "pitch",
      "yaw",
      "minion",
      "camera",
      "mechanicalAimContext",
      "isMechanicalAirAim",
      "floorAt",
      "shortenCamera",
      source.slice(node.start, node.end) + "\nreturn followCameraPose();",
    ),
    pose = readPose(
      THREE,
      THREE.MathUtils.clamp,
      { length: 8 },
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -1),
      { matches: false },
      { posePitch: 0 },
      0,
      0,
      null,
      camera,
      () => ({
        characterId: kind,
        surfaceMode: "ocean",
        positionY: -50,
        surfaceY: 4,
        airborne: false,
      }),
      isMechanicalAirAim,
      () => -1000,
      () => {},
    );
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  return camera;
}

// 小型深度光栅化保留真实身体遮挡，不把被躯干盖住的头顶点误算为可见轮廓。
function visibleHeadSpan(root, camera) {
  const width = 640,
    height = 400,
    body = bodyOf(root),
    { position: p } = body.geometry.attributes,
    indices = body.geometry.index,
    depth = new Float32Array(width * height).fill(Infinity),
    head = new Uint8Array(width * height),
    points = vertices(root).map((point) => {
      point.applyMatrix4(body.matrixWorld).project(camera);
      return [
        (point.x * 0.5 + 0.5) * width,
        (-point.y * 0.5 + 0.5) * height,
        point.z,
      ];
    });
  for (let i = 0; i < indices.count; i += 3) {
    const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)],
      [a, b, c] = ids.map((id) => points[id]),
      area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (area >= -1e-8) continue;
    const isHead = ids.every((id) => p.getZ(id) < -0.245),
      minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))),
      maxX = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0]))),
      minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))),
      maxY = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5,
          py = y + 0.5,
          u = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area,
          v = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area,
          w = 1 - u - v;
        if (u < 0 || v < 0 || w < 0) continue;
        const z = u * a[2] + v * b[2] + w * c[2],
          index = y * width + x;
        if (z < depth[index]) {
          depth[index] = z;
          head[index] = Number(isHead);
        }
      }
  }
  let min = width,
    max = -1;
  for (let i = 0; i < head.length; i++)
    if (head[i]) {
      min = Math.min(min, i % width);
      max = Math.max(max, i % width);
    }
  return Math.max(0, max - min + 1) * 2;
}

test("the real open-water rear follow pose gains at least eight visible head pixels at 1280×800 after body occlusion", () => {
  for (const kind of kinds) {
    const root = createCreature(kind, 8),
      camera = rearFollowCamera(kind);
    pose(root, 0);
    const closed = visibleHeadSpan(root, camera);
    pose(root, 1);
    const opened = visibleHeadSpan(root, camera);
    assert.ok(opened - closed >= 8, `${kind}: ${closed} → ${opened} px`);
    root.userData.disposeLocalMotion?.();
  }
});

test("a real held meal pulse opens both jaws 12–18 degrees and widens existing head sides by 25–35 percent", () => {
  for (const kind of kinds) {
    for (const length of [3, 15, 30]) {
      const root = createCreature(kind, length, 1),
        body = bodyOf(root),
        weights = body.geometry.attributes.skinWeight;
      root.position.set(3, -40, 8);
      root.rotation.set(0.3, 0.6, -0.1);
      root.userData.resetMotion();
      updateMatrices(root);
      const transform = root.matrix.toArray();
      root.userData.triggerFeed();
      let peak;
      for (let i = 0; i < 40; i++) {
        root.userData.animate(i / 60, 1, { dt: 1 / 60, speed: 12 });
        const state = root.userData.motionState;
        if (!peak || state.feed > peak.feed)
          peak = { feed: state.feed, phase: state.phase };
      }
      assert.ok(peak.feed > 0.8 && peak.feed <= 1);
      pose(root, 0, peak.phase);
      const closed = vertices(root),
        closedMouth = mouth(root),
        closedAngle = body.skeleton.bones[4].rotation.x;
      pose(root, peak.feed, peak.phase);
      const opened = vertices(root),
        delta = closedAngle - body.skeleton.bones[4].rotation.x,
        degrees = THREE.MathUtils.radToDeg(delta);
      assert.ok(degrees >= 12 && degrees <= 18, `${kind}: ${degrees}`);
      assert.ok(mouth(root).y < closedMouth.y - 0.025);
      assert.equal(
        root.getObjectByName("feeding_mouth").parent,
        body.skeleton.bones[4],
      );
      const widths = [0, 0];
      let cheekVertices = 0,
        jawVertices = 0;
      for (let i = 0; i < weights.count; i++) {
        if (weights.getW(i) > 0.9999) {
          cheekVertices++;
          widths[0] = Math.max(widths[0], Math.abs(closed[i].x));
          widths[1] = Math.max(widths[1], Math.abs(opened[i].x));
        }
        if (
          weights.getZ(i) > 0.9999 &&
          body.geometry.attributes.skinIndex.getZ(i) === 4 &&
          closed[i].z < -0.4
        ) {
          jawVertices++;
          assert.ok(opened[i].y < closed[i].y - 0.025);
        }
      }
      assert.ok(cheekVertices > 100 && jawVertices > 50);
      const spread = widths[1] / widths[0];
      assert.ok(spread >= 1.25 && spread <= 1.35, `${kind}: ${spread}`);
      assert.deepEqual(root.matrix.toArray(), transform);
      root.userData.disposeLocalMotion?.();
    }
  }
});

test("the unchanged mouth rim retains facing while the stronger head blend keeps a positive local volume orientation", () => {
  for (const kind of kinds) {
    const root = createCreature(kind, 1),
      body = bodyOf(root),
      g = body.geometry,
      p = g.attributes.position,
      weights = g.attributes.skinWeight,
      triangles = [],
      blend = new Map(),
      deform = skinField(kind);
    for (let i = 0; i < p.count; i++)
      if (weights.getW(i) > 1e-5 && weights.getW(i) < 0.99999) {
        const point = [p.getX(i), p.getY(i), p.getZ(i)];
        blend.set(point.join(","), point);
      }
    assert.ok(blend.size > 100);
    for (let k = 0; k < g.index.count; k += 3) {
      const ids = [g.index.getX(k), g.index.getX(k + 1), g.index.getX(k + 2)];
      if (
        ids.some((i) => p.getZ(i) < -0.2) &&
        ids.every((i) => weights.getW(i) === 0)
      )
        triangles.push(ids);
    }
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      normal = new THREE.Vector3(),
      openedNormal = new THREE.Vector3(),
      plus = new THREE.Vector3(),
      minus = new THREE.Vector3(),
      dx = new THREE.Vector3(),
      dy = new THREE.Vector3(),
      dz = new THREE.Vector3(),
      epsilon = 0.0001;
    for (const phase of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      pose(root, 0, phase);
      const closed = vertices(root);
      for (const feed of [0.05, 0.1, 0.2, 0.3, 0.4, 0.476, 1]) {
        pose(root, feed, phase);
        const opened = vertices(root);
        for (const [i, j, k] of triangles) {
          normal.crossVectors(
            a.copy(closed[j]).sub(closed[i]),
            b.copy(closed[k]).sub(closed[i]),
          );
          openedNormal.crossVectors(
            a.copy(opened[j]).sub(opened[i]),
            b.copy(opened[k]).sub(opened[i]),
          );
          assert.ok(
            normal.dot(openedNormal) >= 0,
            `${kind}: folded head triangle ${i}/${j}/${k}, feed ${feed}`,
          );
        }
        const matrices = body.skeleton.bones.map((bone, i) =>
          new THREE.Matrix4().multiplyMatrices(
            bone.matrixWorld,
            body.skeleton.boneInverses[i],
          ),
        );
        // 新轮廓会让合法的表面法线转过90度；正Jacobian可区分这种转向和真正的局部翻折。
        for (const [x, y, z] of blend.values()) {
          dx.copy(deform(plus, x + epsilon, y, z, matrices))
            .sub(deform(minus, x - epsilon, y, z, matrices))
            .multiplyScalar(1 / (2 * epsilon));
          dy.copy(deform(plus, x, y + epsilon, z, matrices))
            .sub(deform(minus, x, y - epsilon, z, matrices))
            .multiplyScalar(1 / (2 * epsilon));
          dz.copy(deform(plus, x, y, z + epsilon, matrices))
            .sub(deform(minus, x, y, z - epsilon, matrices))
            .multiplyScalar(1 / (2 * epsilon));
          const determinant = dx.dot(a.crossVectors(dy, dz));
          assert.ok(
            determinant > 0.2,
            `${kind}: locally inverted blend at ${x}/${y}/${z}, feed ${feed}: ${determinant}`,
          );
        }
      }
    }
    root.userData.disposeLocalMotion?.();
  }
});

test("new head weights preserve UV seams, normalization, original bone indices, and rigid mechanical panel interiors", () => {
  const originalNames = {
    mechanical_shark: [
      "armored_hull",
      "tail_servo",
      "tail_joint",
      "swept_caudal",
      "segmented_jaw",
      "servo_pectoral_-1",
      "servo_pectoral_1",
    ],
    zombie_shark: [
      "zombie_shark_axial_0",
      "zombie_shark_axial_1",
      "zombie_shark_axial_2",
      "zombie_shark_axial_3",
      "zombie_shark_broken_mandible",
      "zombie_shark_pectoral_-1",
      "zombie_shark_pectoral_1",
    ],
  };
  for (const kind of kinds) {
    const root = createCreature(kind, 1),
      body = bodyOf(root),
      { position: p, skinIndex: ids, skinWeight: w } = body.geometry.attributes,
      duplicates = new Map(),
      interiors = [[], []];
    assert.equal(body.skeleton.bones.length, 9);
    assert.deepEqual(
      body.skeleton.bones.slice(0, 7).map((bone) => bone.name),
      originalNames[kind],
    );
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(","),
        skin = [];
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        const index = ids.getComponent(i, j),
          weight = w.getComponent(i, j);
        assert.ok(index >= 0 && index < body.skeleton.bones.length);
        assert.ok(weight >= 0 && weight <= 1);
        sum += weight;
        skin.push(index, weight);
      }
      assert.ok(Math.abs(sum - 1) < 1e-6);
      if (duplicates.has(key)) assert.deepEqual(skin, duplicates.get(key));
      else duplicates.set(key, skin);
      if (w.getW(i) === 1) interiors[p.getX(i) < 0 ? 0 : 1].push(i);
    }
    pose(root, 0);
    const closed = vertices(root);
    pose(root, 0.476);
    const opened = vertices(root);
    if (kind === "mechanical_shark") {
      for (const side of interiors) {
        assert.ok(side.length > 100);
        for (let j = 1; j < side.length; j += 19) {
          const a = side[0],
            b = side[j];
          assert.ok(
            Math.abs(
              closed[a].distanceTo(closed[b]) - opened[a].distanceTo(opened[b]),
            ) < 1e-7,
          );
        }
      }
      for (const bone of body.skeleton.bones.slice(7))
        assert.deepEqual(bone.scale.toArray(), [1, 1, 1]);
    }
    root.userData.disposeLocalMotion?.();
  }
});

test("feeding leaves torso, fins, tail and all launcher/thruster hardware on their existing support transforms", () => {
  for (const kind of kinds) {
    const root = createCreature(kind, 15),
      body = bodyOf(root),
      p = body.geometry.attributes.position;
    pose(root, 0, 1.2);
    const closed = vertices(root),
      muzzle = root.userData.getTorpedoMuzzle?.(new THREE.Vector3()),
      hardware = resources(root).filter((node) =>
        /^(?:waterjet_|thruster_|ventral_torpedo|mechanical_launcher|launcher_|pectoral_servo_hub)/.test(
          node.name,
        ),
      ),
      transforms = hardware.map((node) => node.matrixWorld.toArray());
    pose(root, 0.476, 1.2);
    const opened = vertices(root);
    for (let i = 0; i < p.count; i++)
      if (p.getZ(i) > -0.19) assert.ok(closed[i].distanceTo(opened[i]) < 1e-10);
    assert.deepEqual(
      hardware.map((node) => node.matrixWorld.toArray()),
      transforms,
    );
    if (muzzle) {
      assert.ok(
        root.userData.getTorpedoMuzzle(new THREE.Vector3()).distanceTo(muzzle) <
          1e-10,
      );
      assert.equal(
        hardware.filter((node) => node.name === "pectoral_servo_hub").length,
        2,
      );
      assert.equal(
        root.getObjectByName("ventral_torpedo_exit").parent,
        body.skeleton.bones[0],
      );
    }
    root.userData.disposeLocalMotion?.();
  }
});

test("instances share immutable geometry while feeding stays bounded, frozen on pause and restored on restart", () => {
  for (const kind of kinds) {
    const root = createCreature(kind, 6, 2),
      peer = createCreature(kind, 6, 2),
      body = bodyOf(root),
      other = bodyOf(peer);
    root.userData.resetMotion();
    peer.userData.resetMotion();
    const before = vertices(root).map((point) => point.toArray()),
      peerBefore = vertices(peer).map((point) => point.toArray()),
      digest = geometryDigest(body),
      nodes = resources(root);
    assert.equal(body.geometry, other.geometry);
    assert.equal(body.material, other.material);
    body.skeleton.bones.forEach((bone, i) =>
      assert.notEqual(bone, other.skeleton.bones[i]),
    );
    root.userData.triggerFeed();
    for (let i = 0; i < 12; i++)
      root.userData.animate(i / 60, 1, { dt: 1 / 60, speed: 12 });
    const frozen = vertices(root).map((point) => point.toArray()),
      frozenMouth = mouth(root).toArray();
    for (let i = 0; i < 30; i++) root.userData.animate(100 + i, 1, { dt: 0 });
    assert.deepEqual(
      vertices(root).map((point) => point.toArray()),
      frozen,
    );
    assert.deepEqual(mouth(root).toArray(), frozenMouth);
    for (let i = 0; i < 600; i++) {
      if (i % 18 === 0) root.userData.triggerFeed();
      root.userData.animate(i / 60, 1, { dt: 1 / 60, speed: 12 });
    }
    assert.deepEqual(resources(root), nodes);
    assert.equal(geometryDigest(body), digest);
    assert.deepEqual(
      vertices(peer).map((point) => point.toArray()),
      peerBefore,
    );
    root.userData.resetMotion();
    assert.deepEqual(
      vertices(root).map((point) => point.toArray()),
      before,
    );
    assert.equal(root.userData.motionState.feed, 0);
    root.userData.disposeLocalMotion?.();
    peer.userData.disposeLocalMotion?.();
  }
});

test("the actual summoned Zombie companion inherits the same independent jaw and cheek rig", () => {
  const scene = new THREE.Scene(),
    owner = createCreature("zombie_shark", 15),
    player = createPlayer("zombie_shark", 15),
    minion = createZombieMinion(scene, {
      getOwnerMesh: () => owner,
      blockedBetween: () => false,
      effects: { mealMist() {}, bite() {} },
    });
  assert.equal(
    minion.activate(
      player,
      new THREE.Vector3(0, -40, 0),
      new THREE.Vector3(0, 0, -1),
    ),
    true,
  );
  const mesh = minion.mesh,
    body = bodyOf(mesh);
  assert.equal(body.geometry, bodyOf(owner).geometry);
  assert.equal(body.skeleton.bones.length, 9);
  pose(mesh, 0);
  const closed = mouth(mesh);
  pose(mesh, 0.476);
  assert.ok(mouth(mesh).y < closed.y - 0.025);
  assert.ok(body.skeleton.bones[7].scale.x > 1.24);
  assert.equal(bodyOf(owner).skeleton.bones[7].scale.x, 1);
  minion.reset();
  assert.equal(mesh.userData.motionState.feed, 0);
  assert.equal(body.skeleton.bones[7].scale.x, 1);
});
