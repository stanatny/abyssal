import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { findBossContact } from "../src/encounters.js";

import {
  loadPublishedMayan,
  validatePublishedMayanSnapshot,
} from "./helpers/published_mayan_oracle.js";

// 固定接触样本来自已发布 v0.7.1 / 21cf9a4；几何和姿态与冻结源码在同一运行时逐字节比较。
// 不读取当前 legacy helper，不引入数值容差，也不依赖本机冻结目录。
const oracle = await loadPublishedMayan();
after(() => oracle.dispose());
const PUBLISHED = {
  sourceCommit: "21cf9a4e50afd11c3d8634d92c461b43f85fe791",
  sourceHashes: {
    creatures:
      "52e837f3121f988ab7e4f2e6c1cf2f655b72e5b226fdbf0e76a4d83070f72d8c",
    creature_lords:
      "a160799d9d3a2f78f2a69c2aad327bea309845b97598f34872965951f8253407",
    creature_surface:
      "9f5e8b3c1cfc7b3d9ba85e08f330c905072ac2367189375bed822bd22c937fb0",
    encounters:
      "e07729ba43fdaebbf19d0ba6e539638fa5319880adde3c8676a2b7be4d7e2c4a",
  },
  timeline: [
    [0, 1],
    [0.016, 0.2],
    [0.049, 2.9],
    [0.16, 3],
    [0.16, 3],
    [1.5, 0.4],
    [1.4, 1],
    [-1, 1],
    [100, 2],
    [100.016, 1],
  ],
  geometry: [
    {
      parent: "mayan_sculpted_jaw",
      count: 5904,
    },
    {
      parent: "mayan_sculpted_jaw",
      count: 5184,
    },
    {
      parent: "mayan_stone_flipper_-1",
      count: 312,
    },
    {
      parent: "mayan_stone_flipper_1",
      count: 312,
    },
    {
      parent: "mayan_tail",
      count: 384,
    },
    {
      parent: "anatomy",
      count: 37128,
    },
    {
      parent: "anatomy",
      count: 6888,
    },
    {
      parent: "anatomy",
      count: 2592,
    },
    {
      parent: "anatomy",
      count: 4464,
    },
    {
      parent: "anatomy",
      count: 5184,
    },
  ],
  cases: [
    {
      config: {
        name: "published_encounter",
        length: 48,
        seed: 92,
        position: [17, -440, -8],
        rotation: [0.31, 0.75, -0.12],
        scale: [1, 1, 1],
      },
      contacts: {
        samples: 695,
        hits: 62,
        hash: "fef25e006257f78ad2a0b60879bd693ed3e8832c6a32491d28cf54d09df11482",
        first: [null, null],
      },
    },
    {
      config: {
        name: "guide",
        length: 1,
        seed: 24,
        position: [0, 0, 0],
        rotation: [0, 0.2, 0],
        scale: [1, 1, 1],
      },
      contacts: {
        samples: 695,
        hits: 64,
        hash: "bcc160878ee506f5a94cd4e4cc6a9df42dde38bb0a5de80987fcf7cbdf75f3cf",
        first: [[-0.110989223722553, -0.005, -0.4468572391910699], null],
      },
    },
    {
      config: {
        name: "rotated_parent",
        length: 42,
        seed: 1,
        position: [-153, -516, 98],
        rotation: [-0.62, -1.2, 0.37],
        scale: [1.2, 0.85, 1.1],
        parent: {
          position: [7, -22, 14],
          rotation: [0.19, 0.41, -0.21],
          scale: [0.8, 1.1, 0.95],
        },
      },
      contacts: {
        samples: 695,
        hits: 64,
        hash: "20331571a9e4b02073c65fb52b7ceb17f08beb88735f431d73286f58ff988b1c",
        first: [
          [-163.7444681458678, -583.093314268652, 78.18324596069886],
          null,
        ],
      },
    },
    {
      config: {
        name: "alternate_seed",
        length: 63,
        seed: 987654,
        position: [-13, -312, 76],
        rotation: [0.42, 2.5, -0.09],
        scale: [1, 1, 1],
      },
      contacts: {
        samples: 695,
        hits: 63,
        hash: "88103522e30ee31408c0731431e68cd4ef51f21ddf9bde06876c81aa12be3252",
        first: [
          [-29.31568548545207, -321.9632331726988, 97.8187904542448],
          null,
        ],
      },
    },
  ],
};

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function meshes(root) {
  const result = [];
  root.traverse((part) => {
    if (part.isMesh) result.push(part);
  });
  return result;
}

function geometryHashes(root) {
  return meshes(root).map((part) => {
    const buffers = [];
    for (const key of ["position", "normal", "color"]) {
      const attribute = part.geometry.attributes[key];
      if (attribute)
        buffers.push(
          Buffer.from(
            attribute.array.buffer,
            attribute.array.byteOffset,
            attribute.array.byteLength,
          ),
        );
    }
    if (part.geometry.index) {
      const values = part.geometry.index.array;
      buffers.push(
        Buffer.from(values.buffer, values.byteOffset, values.byteLength),
      );
    }
    return {
      parent: part.parent === root ? "anatomy" : part.parent.name,
      count:
        part.geometry.index?.count || part.geometry.attributes.position.count,
      hash: hash(Buffer.concat(buffers)),
    };
  });
}

function worldFingerprint(root) {
  root.updateWorldMatrix(true, true);
  const coordinates = [],
    matrices = [],
    point = new THREE.Vector3();
  for (const part of meshes(root)) {
    matrices.push(...part.matrixWorld.elements);
    const positions = part.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld);
      coordinates.push(point.x, point.y, point.z);
    }
  }
  return {
    vertices: hash(Buffer.from(new Float64Array(coordinates).buffer)),
    matrices: hash(Buffer.from(new Float64Array(matrices).buffer)),
  };
}

function fixture(config, factory = createCreature) {
  const root = factory("mayan", config.length, config.seed);
  root.position.set(...config.position);
  root.rotation.set(...config.rotation);
  root.scale.multiply(new THREE.Vector3(...config.scale));
  if (config.parent) {
    const parent = new THREE.Group();
    parent.position.set(...config.parent.position);
    parent.rotation.set(...config.parent.rotation);
    parent.scale.set(...config.parent.scale);
    parent.add(root);
  }
  return root;
}

function sampleLocal(index) {
  if (index === 0) return [-0.02, -0.005, -0.46];
  if (index === 1) return [-0.09, -0.005, -0.215];
  const i = index - 2;
  return [
    -0.32 + (i % 9) * 0.08,
    -0.19 + (Math.floor(i / 9) % 7) * 0.075,
    -0.56 + Math.floor(i / 63) * 0.112,
  ];
}

test("冻结发布源码来自已知提交，内容或依赖记录被改写时拒绝加载", () => {
  assert.equal(oracle.sourceCommit, PUBLISHED.sourceCommit);
  for (const name of ["creatures", "creature_lords", "creature_surface"])
    assert.equal(oracle.sourceHashes[name], PUBLISHED.sourceHashes[name]);
  const snapshot = JSON.parse(
    readFileSync(
      new URL("./fixtures/published_mayan_v0_7_1.json", import.meta.url),
      "utf8",
    ),
  );
  snapshot.sources["creature_lords.js"].source += "\n";
  assert.throws(
    () => validatePublishedMayanSnapshot(snapshot),
    /integrity mismatch/,
  );
  snapshot.sources["creature_lords.js"].sha256 = hash(
    snapshot.sources["creature_lords.js"].source,
  );
  assert.throws(
    () => validatePublishedMayanSnapshot(snapshot),
    /dependency integrity mismatch/,
  );
});

test("兼容代理的每个合批缓冲、顺序和原始发布网格完全一致", () => {
  const root = fixture(PUBLISHED.cases[0].config);
  const proxy = root.userData.contactRoot;
  assert.ok(proxy);
  assert.equal(proxy.visible, false);
  assert.equal(meshes(proxy).length, 10);
  assert.ok(meshes(proxy).every((part) => part.visible));
  const published = fixture(PUBLISHED.cases[0].config, oracle.createCreature);
  const reference = published.children[0];
  const actual = geometryHashes(proxy);
  assert.deepEqual(
    actual.map(({ parent, count }) => ({ parent, count })),
    PUBLISHED.geometry,
  );
  assert.deepEqual(actual, geometryHashes(reference));
});

for (const entry of PUBLISHED.cases) {
  test(`发布版原种子、旋转缩放和逐帧世界顶点一致：${entry.config.name}`, () => {
    const root = fixture(entry.config);
    const published = fixture(entry.config, oracle.createCreature);
    for (let step = 0; step < PUBLISHED.timeline.length; step++) {
      root.userData.animate(...PUBLISHED.timeline[step]);
      published.userData.animate(...PUBLISHED.timeline[step]);
      assert.deepEqual(
        worldFingerprint(root.userData.contactRoot),
        worldFingerprint(published.children[0]),
        `Published world vertices and matrices at step ${step}`,
      );
    }
  });
  test(`命中点和空水域逐值匹配已发布版本：${entry.config.name}`, () => {
    const root = fixture(entry.config);
    for (const frame of PUBLISHED.timeline) root.userData.animate(...frame);
    root.updateWorldMatrix(true, true);
    let hits = 0;
    const contacts = [];
    for (let index = 0; index < entry.contacts.samples; index++) {
      const point = new THREE.Vector3(...sampleLocal(index)).applyMatrix4(
        root.matrixWorld,
      );
      const contact = findBossContact(
        root,
        point,
        entry.config.length * 0.00625,
      );
      if (contact) hits++;
      contacts.push(contact ? contact.toArray() : null);
    }
    assert.equal(hits, entry.contacts.hits);
    assert.equal(hash(JSON.stringify(contacts)), entry.contacts.hash);
    assert.deepEqual(contacts.slice(0, 2), entry.contacts.first);
  });
}

test("接触代理不计入可见渲染预算，重绘模块不启动额外帧循环", () => {
  const root = createCreature("mayan", 48, 92);
  const visible = [];
  root.traverseVisible((part) => {
    if (part.isMesh) visible.push(part);
  });
  assert.equal(visible.length, 11);
  const triangles = visible.reduce(
    (total, part) =>
      total +
      (part.geometry.index?.count || part.geometry.attributes.position.count) /
        3,
    0,
  );
  assert.equal(triangles, 32376);
  assert.ok(
    visible.every((part) => !meshes(root.userData.contactRoot).includes(part)),
  );
  for (const name of [
    "creature_gran_maja.js",
    "creature_gran_maja_geometry.js",
  ]) {
    const source = readFileSync(
      new URL(`../src/${name}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /requestAnimationFrame|setInterval|setTimeout/);
  }
});
