/** GPU生成的贴图没有可重新上传的CPU像素，必须按当前环境重新生成。 */
export function createEnvironmentCache(generate) {
  const targets = new Map();
  let selected = "day",
    disposed = false;
  const select = (kind = selected) => {
    if (disposed) return null;
    selected = kind;
    if (!targets.has(kind)) targets.set(kind, generate(kind));
    return targets.get(kind).texture;
  };
  const invalidate = () => {
    for (const target of targets.values()) target.dispose();
    targets.clear();
  };
  return {
    select,
    invalidate,
    restore() {
      if (disposed) return null;
      invalidate();
      return select();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const target of targets.values()) target.dispose();
      targets.clear();
    },
  };
}

/** 恢复完成前冻结世界；重复中断与卸载会使旧异步回调失效，不自动继续游戏。 */
export function createGraphicsRecovery(
  canvas,
  { restore, onLost = () => {}, onReady = () => {}, onError = () => {} },
) {
  let pending = false,
    disposed = false,
    generation = 0;
  function lost(event) {
    event.preventDefault();
    generation++;
    pending = true;
    onLost();
  }
  async function restored() {
    const token = ++generation;
    pending = true;
    try {
      await restore(() => !disposed && token === generation);
      if (disposed || token !== generation) return;
      pending = false;
      onReady();
    } catch (error) {
      if (!disposed && token === generation) onError(error);
    }
  }
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return {
    get pending() {
      return pending;
    },
    dispose() {
      disposed = true;
      generation++;
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    },
  };
}

/** 丢失期间退役旧顶点/实例缓冲监听器；dispose不删除CPU顶点或模型绑定。 */
export function releaseLostSceneResources(renderer, roots) {
  if (!renderer.getContext().isContextLost()) return;
  const geometries = new Set(),
    instances = new Set();
  for (const root of roots)
    root?.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.isInstancedMesh) instances.add(object);
    });
  // 只退役GPU实例缓冲，保留InstancedMesh.dispose会清空的morphTexture引用。
  for (const instance of instances) instance.dispatchEvent({ type: "dispose" });
  for (const geometry of geometries) geometry.dispose();
  // Three 0.180的旧纹理释放回调仍引用旧properties；清空失效GPU句柄，
  // 不能调用业务纹理dispose，否则会取消奖励标签的语言订阅或关闭源图。
  renderer.properties.dispose();
}
