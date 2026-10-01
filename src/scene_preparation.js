/** 同一建模迭代器既可同步运行供测试/工具使用，也可按预算让出浏览器主线程。 */
export function finishScenePreparation(iterator) {
  try {
    let step;
    do step = iterator.next();
    while (!step.done);
    return step.value;
  } catch (error) {
    iterator.return?.();
    throw error;
  }
}

/**
 * 分片执行实际建模工作，不改变其顺序或随机数序列。
 * @param {Generator} iterator 各步之间可安全暂停的构造迭代器。
 * @param {object} options 预算、让出主线程函数及进度回调；单个不可分步骤仍可能超过预算。
 * @returns {Promise<object>} 完整场景；异常会关闭迭代器并释放未完成资源。
 */
export async function prepareScene(
  iterator,
  {
    budgetMs = 8,
    now = () => performance.now(),
    yieldTask = () =>
      globalThis.scheduler?.yield
        ? globalThis.scheduler.yield()
        : new Promise((resolve) => setTimeout(resolve, 0)),
    onStep = () => {},
  } = {},
) {
  let sliceStart = now();
  try {
    while (true) {
      const step = iterator.next();
      if (step.done) return step.value;
      onStep(step.value);
      if (now() - sliceStart >= budgetMs) {
        await yieldTask();
        sliceStart = now();
      }
    }
  } catch (error) {
    iterator.return?.();
    throw error;
  }
}

/** 未完成构造的资源归属；子模块先释放，剩余实例缓冲及本层私有资源随后清理。 */
export function constructionScope(
  root,
  owned = new Set(),
  { disposeInstances = true } = {},
) {
  const children = [];
  let complete = false;
  return {
    own(child) {
      children.push(child);
      return child;
    },
    finish(value) {
      complete = true;
      return value;
    },
    close() {
      if (complete) return;
      complete = true;
      for (const child of children) child.dispose();
      root.removeFromParent();
      if (disposeInstances)
        root.traverse((node) => {
          if (node.isInstancedMesh) node.dispose();
        });
      for (const resource of owned) resource.dispose();
      owned.clear();
      root.clear();
    },
  };
}
