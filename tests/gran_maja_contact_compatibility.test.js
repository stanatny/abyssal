import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { findBossContact } from "../src/encounters.js";

// 以下期望值仅由已发布 v0.7.1 / 21cf9a4 的冻结源码执行生成，
// 不调用当前分支的 legacy helper 生成预期；CI 无需本地冻结目录。
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
      hash: "98aff8cb5e0807b5dede24f152a24b5a9468b65c5b721e5b31cf40cd0b56a334",
    },
    {
      parent: "mayan_sculpted_jaw",
      count: 5184,
      hash: "a741a3f7f72eeaa3d078ff714e354159e92a4f9ce0589a37645417033e964ead",
    },
    {
      parent: "mayan_stone_flipper_-1",
      count: 312,
      hash: "267b36b65d2baac6dfa13ce861c707b6afa53fb6dc2653948bdd24e0b1bc25a8",
    },
    {
      parent: "mayan_stone_flipper_1",
      count: 312,
      hash: "8bedbe1f646d7f78d244007a0ed7922b0eaf7b1f0b669c3ab76e1c8ac8917556",
    },
    {
      parent: "mayan_tail",
      count: 384,
      hash: "565d2786fc74c372efd88bc9d81a1a58e314aca5f237c3c27ff431ffc2a910f0",
    },
    {
      parent: "anatomy",
      count: 37128,
      hash: "c61cef81ad3332cbfca7d697038eb037932f8040a6517c4a8516eca1ab5378e7",
    },
    {
      parent: "anatomy",
      count: 6888,
      hash: "45616413dbc61429e4ed7118f7092319e5ecabe64e5251c062ad4f7208065306",
    },
    {
      parent: "anatomy",
      count: 2592,
      hash: "71e7d826aead90fce6fe9426874a0cafe6098360c0d68de0de9d1e8aa03f47e2",
    },
    {
      parent: "anatomy",
      count: 4464,
      hash: "0a41cd953ac46810bbdcbaeba3b7ac98930edbeb7685b3765bf95c5dce558ef7",
    },
    {
      parent: "anatomy",
      count: 5184,
      hash: "f82ed4dd2b6bd1a80ef891592d5e8db07ea1972e800d12225954f5334c051903",
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
      poses: [
        {
          vertices:
            "67c88b9c5b6a61925cb103a92d99d14963fb002d3fee367a3e8b4797ecae5504",
          matrices:
            "18d5e9fbcae779f2efccf7ac5e6bd3c8070aac0c725cc4c1423c656bb81a07d8",
        },
        {
          vertices:
            "be3aff4203dd6c9e6db96ae8710516306a5b6677d324e2cc354993588c0e7853",
          matrices:
            "2504aaebdff793809f92e87edda6b363170d905d5e9799443e3154845a64b10a",
        },
        {
          vertices:
            "5848b8ef80f46d186b35f652bf233459a2893c0326489b98f009fb6114a806fa",
          matrices:
            "ff6880a32e68f1e4a000b9c9d2938622651795138244773d0a337a0eda5d61d6",
        },
        {
          vertices:
            "8dd6ddd9da8aba68dcaa9328989afb18145120e80beb1991b86b9fae25574c8f",
          matrices:
            "5f84583a024dc591a8bc6b859eac8cb6680e37506dc6de7fd741b049b9d66cf8",
        },
        {
          vertices:
            "8dd6ddd9da8aba68dcaa9328989afb18145120e80beb1991b86b9fae25574c8f",
          matrices:
            "5f84583a024dc591a8bc6b859eac8cb6680e37506dc6de7fd741b049b9d66cf8",
        },
        {
          vertices:
            "d1737fa2a8929b480efa8a665bbf0b7dd6efd65e037dc90d88a92ab9851ca9e1",
          matrices:
            "597951bcd4d5d3bc7e82050b0510ac445ba5ba6523907392a4eaa96874dc0d4e",
        },
        {
          vertices:
            "a979cdd8c62a107ecf66a0fe67180708c4603458c0b74a65dcb3f768ca25edf4",
          matrices:
            "5e7ca64e5f125123d4001b789d0d73c986b8429212ee81c52c8eeb863ac53116",
        },
        {
          vertices:
            "a979cdd8c62a107ecf66a0fe67180708c4603458c0b74a65dcb3f768ca25edf4",
          matrices:
            "5e7ca64e5f125123d4001b789d0d73c986b8429212ee81c52c8eeb863ac53116",
        },
        {
          vertices:
            "bba6817fdaaf121a71da85c89f3330206b1f78f963922cde6200f4f0c2068fcf",
          matrices:
            "b6eda21ae23d31d5243aa35180327b9fc02786f07c3e1c0bd9fe1e6b2f753740",
        },
        {
          vertices:
            "0e4a2dd0388b9651117d799cbebcda70f3637672cafe9d0cb591a28cefb55404",
          matrices:
            "7e5c6e4b2547feccefb6e8dea168ecbd1ea3ee2c9ea3acdca086336c3607bf0f",
        },
      ],
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
      poses: [
        {
          vertices:
            "ac9bed8fa2e70daf71294047cc98992b313338dfd747fb6e9c3bd54edaf695ec",
          matrices:
            "f67a51a37eed8f8b6d3e5e1a7c26850794dcee7abcd96b681dc3b80836183649",
        },
        {
          vertices:
            "f741f839fc25e13844c4bc13b9a9979d4424c3b4991df1718e20f8bb3ee4810c",
          matrices:
            "b04126641a85c242b6be0c0d7f304c52d1bd0a8d9f1646de6f8965ca3a69378a",
        },
        {
          vertices:
            "5f75be295cfd5b5d89e3abf34644a7c8f5a1e1e54b09d48715d4c4c4d5ce8063",
          matrices:
            "27aad25636ece24b033318902c213fbee340bdf36e82119bd26b8f8716270af8",
        },
        {
          vertices:
            "8f38c77c400b09d97de7cac68038ff53e4544b876e098f6c6a106834dae9cff0",
          matrices:
            "0d240a71ae58dd934d6b464cd147d25bd57c8050bbb0dd75cf7654d21fe5f910",
        },
        {
          vertices:
            "8f38c77c400b09d97de7cac68038ff53e4544b876e098f6c6a106834dae9cff0",
          matrices:
            "0d240a71ae58dd934d6b464cd147d25bd57c8050bbb0dd75cf7654d21fe5f910",
        },
        {
          vertices:
            "45bbb038cdf52ffebea563a5b6298c754b7da093742b574cece1e2aa49a91fa5",
          matrices:
            "7c76233391116382b527f0b32931fd91af571169f39782faf66b6a141cff21aa",
        },
        {
          vertices:
            "2ca47bbf2155de99e8ac01ee63f0b2d0d2f6d36e755ef4190af5966ffb631ad0",
          matrices:
            "8f02b82557492f33f35072872f3a4882f13ee9a3a31a2c4fb2338dfb8e6a6d92",
        },
        {
          vertices:
            "2ca47bbf2155de99e8ac01ee63f0b2d0d2f6d36e755ef4190af5966ffb631ad0",
          matrices:
            "8f02b82557492f33f35072872f3a4882f13ee9a3a31a2c4fb2338dfb8e6a6d92",
        },
        {
          vertices:
            "f2d973c912ed85d5c4f10ea5cbe2155e16f27e3b47acb6e8efa297206e8a7cc7",
          matrices:
            "ab488cb1feab3c38ca396452164542cd7b1efc864086eba891e609354eb6eae7",
        },
        {
          vertices:
            "2acfb640b90c10b44bd363e0f19268484b6001691d7a635a948098558630dc4e",
          matrices:
            "490ed06d7e545715e4ad5377613456f5f3594c50d3a4b30a18946f7760778d67",
        },
      ],
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
      poses: [
        {
          vertices:
            "7ec45d384c98486b33700051fd839a26652a067bb0eabe813968cb33d043ef84",
          matrices:
            "42be834e9055210fb6c96ad325fb601e076094014a63715a68c43cf3e6f18f89",
        },
        {
          vertices:
            "3f9042b8344f9814e97dce1d17e9a55b023c23e6e18ea4a84f6f25979d2b57bc",
          matrices:
            "0f344f0e0ad22d35e6749f175bb708ef26c321ef702a5ecdb67303a624f427f4",
        },
        {
          vertices:
            "740748531f9903460701d36c3a63ade424423dbfde022ce1e308eaa4139b75c6",
          matrices:
            "5c8923952725574d50d7c737b33e4cfbb8e78a457a362504f13d5fd6bb55306d",
        },
        {
          vertices:
            "5b4516515c4373cd42d9784ef79100e198fe8989a0d96658c258d15e2b0b6623",
          matrices:
            "d406b1f2f397d8266251490ca6d6fb58e47d61a91a78ac47cda6fe3c7c9151a9",
        },
        {
          vertices:
            "5b4516515c4373cd42d9784ef79100e198fe8989a0d96658c258d15e2b0b6623",
          matrices:
            "d406b1f2f397d8266251490ca6d6fb58e47d61a91a78ac47cda6fe3c7c9151a9",
        },
        {
          vertices:
            "528e17e638d44b8702a6d8f7e8e0a8b97c9732cf2280affaacd4d5a21903badc",
          matrices:
            "af52d8171f21a2372df04e857f600df2b81cdf46784e8d9f8aa2ebf73ec69b51",
        },
        {
          vertices:
            "4c820f2e7778145228df7aa11e76ca3843dc02cd7cabb08fea96c3746319fe08",
          matrices:
            "67d2f746c7d78dae881e3a2cc0c7cf26266e179fb0c8ac81501081ae9f25ae9f",
        },
        {
          vertices:
            "4c820f2e7778145228df7aa11e76ca3843dc02cd7cabb08fea96c3746319fe08",
          matrices:
            "67d2f746c7d78dae881e3a2cc0c7cf26266e179fb0c8ac81501081ae9f25ae9f",
        },
        {
          vertices:
            "ad1acde2c57f2dc84c7936260b725b3674a538169162e4f3d16bdbaaca0f39bc",
          matrices:
            "371ee3e3f0cb4ca34ff7288bef16ceca8b558f446b56e66ea642b54992977563",
        },
        {
          vertices:
            "8fe952667799359c6c0fb3494b60373eeb60a3c09dc0169156cbcf32f6e4ef71",
          matrices:
            "e4556261324639d3d24ea522692b5b2ab63db8bcf42df7313de4b1ea9dfeb7db",
        },
      ],
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
      poses: [
        {
          vertices:
            "9202aa748d005338c273629c6a18d2f8f03bd7e7390ec1c02f47a9047b139819",
          matrices:
            "646fe615b13cca717b468452e4c92a0646eef5f28ee1bebcd6f46141e4a59b73",
        },
        {
          vertices:
            "5736bc18731e20e73717080f69ecbbafa898e22b79d741343f72178af46f06be",
          matrices:
            "942ea152e8e627ddd290008c9a79a6e533f1d7fc887b2543fab3a22fc1cb02a4",
        },
        {
          vertices:
            "7d0b200656eb8052cd5ccd88f97368f5461fa7b640cbcb8466e2d7e8735822e5",
          matrices:
            "6d6066351a9141ac7cfa44bce96244b2e0fdcd9f86d206c7c5e79ddd999e94e6",
        },
        {
          vertices:
            "cf3bd72693e489e6f58bc6fdeb814a6acfbdc6a106a3a5be1f3f0478d1d3335c",
          matrices:
            "0d4c3dbcce830008336b5a915fa4087dd029909bc7491efc021b4f89ea5058e7",
        },
        {
          vertices:
            "cf3bd72693e489e6f58bc6fdeb814a6acfbdc6a106a3a5be1f3f0478d1d3335c",
          matrices:
            "0d4c3dbcce830008336b5a915fa4087dd029909bc7491efc021b4f89ea5058e7",
        },
        {
          vertices:
            "0a7d8ed672290cd11b542253230a40b15a64cec29641257703c176a749d91455",
          matrices:
            "229f06f0297d59cbe9b6590581be7eefb2e842f3fbd12615ad3b337e6e9e6fb7",
        },
        {
          vertices:
            "a8cba5da9139998a9ee1e1dd92c9c53bcb88e50be2b5a964148e08803229744e",
          matrices:
            "8315f8cdda833c1a6822c4fd4acb307dc9803d543b8841edebe098ee76912091",
        },
        {
          vertices:
            "a8cba5da9139998a9ee1e1dd92c9c53bcb88e50be2b5a964148e08803229744e",
          matrices:
            "8315f8cdda833c1a6822c4fd4acb307dc9803d543b8841edebe098ee76912091",
        },
        {
          vertices:
            "a9ea49ceb4a8bba24316a113e1ee56f9db3baaf750d5f4f35435846fb3e0e00f",
          matrices:
            "b60d0e8d843c08f6862d6d41a77268bb247015adbdf09b5309ddc75aad85759c",
        },
        {
          vertices:
            "e1da36ed7c5e3e4d33b0df99965c67d8645754d4e752f53a4be55028e3fd5e41",
          matrices:
            "5abea4a80d9bc04fbdf627270a1d4932f3981d01b5de33ad5b63aa41dd5b3e64",
        },
      ],
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

function fixture(config) {
  const root = createCreature("mayan", config.length, config.seed);
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

test("兼容代理的每个合批缓冲、顺序和原始发布网格完全一致", () => {
  const root = fixture(PUBLISHED.cases[0].config);
  const proxy = root.userData.contactRoot;
  assert.ok(proxy);
  assert.equal(proxy.visible, false);
  assert.equal(meshes(proxy).length, 10);
  assert.ok(meshes(proxy).every((part) => part.visible));
  assert.deepEqual(geometryHashes(proxy), PUBLISHED.geometry);
});

for (const entry of PUBLISHED.cases) {
  test(`发布版原种子、旋转缩放和逐帧世界顶点一致：${entry.config.name}`, () => {
    const root = fixture(entry.config);
    for (let step = 0; step < PUBLISHED.timeline.length; step++) {
      root.userData.animate(...PUBLISHED.timeline[step]);
      assert.deepEqual(
        worldFingerprint(root.userData.contactRoot),
        entry.poses[step],
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
