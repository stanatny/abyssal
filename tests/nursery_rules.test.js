import test from "node:test";
import assert from "node:assert/strict";
import { ECOSYSTEM_SPECIES } from "../src/ecosystem_config.js";
import {
  NURSERY,
  isNursery,
  predatorTerritory,
  inPredatorTerritory,
  canPredatorHunt,
  constrainPredatorTerritory,
} from "../src/nursery_rules.js";

const shark = ECOSYSTEM_SPECIES.find((species) => species.kind === "shark");

test("核心浅滩采用明确的海区与水深边界，不按玩家等级隐身猎手", () => {
  assert.equal(isNursery({ x: 0, y: -18, z: 75 }), true);
  assert.equal(isNursery({ x: 290, y: -72, z: -120 }), true);
  assert.equal(isNursery({ x: 0, y: -72.01, z: -120 }), false);
  assert.equal(isNursery({ x: 0, y: -18, z: -120.01 }), false);
});

test("整片外礁只有一只锤头鲨和一只白鲨，其他猎手身体完整留在外海", () => {
  const edgeKinds = [];
  for (const species of ECOSYSTEM_SPECIES) {
    for (let index = 0; index < species.population; index++) {
      const territory = predatorTerritory(species, index);
      if (!species.predator) {
        assert.equal(territory, null);
        continue;
      }
      if (territory.edge) edgeKinds.push(species.kind);
      assert.ok(inPredatorTerritory(species, index, territory.center));
      const bodyFront = territory.maxZ + species.length * 0.5;
      assert.ok(bodyFront < NURSERY.predatorShoreLimit);
      if (!territory.edge) assert.ok(bodyFront < NURSERY.outerSeaLimit);
    }
  }
  assert.deepEqual(edgeKinds.sort(), ["hammerhead", "shark"]);
  assert.strictEqual(predatorTerritory(shark, 0), predatorTerritory(shark, 0));
});

test("追击、技能与伤害许可在离开固定领地后立即关闭，记忆不能带回浅滩", () => {
  const predator = { ...predatorTerritory(shark, 0).center };
  const target = { ...predator, z: predator.z + 15 };
  assert.equal(canPredatorHunt(shark, 0, predator, target), true);
  assert.equal(
    canPredatorHunt(shark, 0, predator, { ...target, z: -110 }),
    false,
  );
  assert.equal(
    canPredatorHunt(shark, 0, predator, { ...target, z: -375 }),
    false,
  );
  assert.equal(canPredatorHunt(shark, 1, predator, target), false);
  assert.equal(
    canPredatorHunt(shark, 0, { ...predator, z: 75 }, target),
    false,
  );
});

test("突袭速度越界后仍有最终位置保障，只移除朝外速度且不篡改水层", () => {
  const territory = predatorTerritory(shark, 0);
  const position = { x: territory.maxX + 9, y: -30, z: territory.maxZ + 22 };
  const velocity = { x: 5, y: 2, z: 34 };
  assert.equal(constrainPredatorTerritory(shark, 0, position, velocity), true);
  assert.deepEqual(position, { x: territory.maxX, y: -30, z: territory.maxZ });
  assert.deepEqual(velocity, { x: 0, y: 2, z: 0 });
  assert.equal(constrainPredatorTerritory(shark, 0, position, velocity), false);
  position.z += 1;
  velocity.z = -4;
  constrainPredatorTerritory(shark, 0, position, velocity);
  assert.equal(velocity.z, -4, "回游速度应保留");
});
