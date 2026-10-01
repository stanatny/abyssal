import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  constructionScope,
  finishScenePreparation,
  prepareScene,
} from "../src/scene_preparation.js";

test("分片保留执行顺序和最终返回值，预算耗尽后才让出主线程", async () => {
  let clock = 0;
  const events = [];
  function* build() {
    for (let i = 0; i < 5; i++) {
      events.push(i);
      clock += 4;
      yield i;
    }
    return { ready: true };
  }
  const value = await prepareScene(build(), {
    now: () => clock,
    budgetMs: 8,
    yieldTask: async () => events.push("yield"),
  });
  assert.deepEqual(events, [0, 1, "yield", 2, 3, "yield", 4]);
  assert.deepEqual(value, { ready: true });
  assert.deepEqual(finishScenePreparation(build()), value);
});

test("让出、进度或构造失败都关闭迭代器，原始异常仍可用于回退", async () => {
  for (const failure of ["yield", "progress", "build"]) {
    let closed = false;
    const error = new Error(failure);
    function* build() {
      try {
        if (failure === "build") throw error;
        yield 1;
        return 2;
      } finally {
        closed = true;
      }
    }
    await assert.rejects(
      prepareScene(build(), {
        budgetMs: 0,
        yieldTask: async () => {
          if (failure === "yield") throw error;
        },
        onStep: () => {
          if (failure === "progress") throw error;
        },
      }),
      error,
    );
    assert.equal(closed, true);
  }
});

test("未完成场景清理子模块及本层资源，不释放已完成场景", () => {
  const parent = new THREE.Group(),
    root = new THREE.Group(),
    child = new THREE.Group();
  parent.add(root);
  root.add(child);
  let childDisposals = 0,
    resourceDisposals = 0;
  const scope = constructionScope(
    root,
    new Set([
      {
        dispose() {
          resourceDisposals++;
        },
      },
    ]),
  );
  scope.own({
    dispose() {
      childDisposals++;
      child.removeFromParent();
    },
  });
  scope.close();
  scope.close();
  assert.equal(parent.children.length, 0);
  assert.equal(root.children.length, 0);
  assert.equal(childDisposals, 1);
  assert.equal(resourceDisposals, 1);
  const ready = new THREE.Group();
  parent.add(ready);
  const complete = constructionScope(ready);
  assert.equal(complete.finish(ready), ready);
  complete.close();
  assert.equal(parent.children[0], ready);
});
