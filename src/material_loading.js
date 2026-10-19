import * as THREE from "three";

const queue = [];
const recoverable = new Set();
let active = 0,
  listening = false;
function pump() {
  queue.sort((a, b) => b.priority - a.priority);
  while (active < 6 && queue.length) {
    const job = queue.shift();
    job.running = true;
    active++;
    Promise.resolve()
      .then(job.run)
      .then(job.resolve, () => job.resolve(false))
      .finally(() => {
        active--;
        pump();
      });
  }
}

/** 全部重绘生物共用有界下载队列；超时从真正发出请求计，不包含排队时间。 */
export function createMaterialPreparation(slots, onReady) {
  const loaded = new Map(),
    controllers = new Set(),
    jobs = new Set();
  let task,
    retryAfter = 0,
    disposed = false;
  const load = async ({ name, url, colorSpace, apply }) => {
    if (loaded.has(name)) return true;
    for (let attempt = 0; attempt < 2 && !disposed; attempt++) {
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 15000);
      let bitmap, texture;
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw Error("Material texture unavailable");
        bitmap = await createImageBitmap(await response.blob());
        if (disposed) {
          bitmap.close();
          return false;
        }
        texture = new THREE.Texture(bitmap);
        texture.flipY = false;
        texture.colorSpace = colorSpace;
        texture.needsUpdate = true;
        apply(texture);
        loaded.set(name, texture);
        return true;
      } catch {
        texture?.dispose();
        bitmap?.close();
      } finally {
        clearTimeout(timeout);
        controllers.delete(controller);
      }
    }
    return false;
  };
  const prepare = ({ priority = 0, retry = false } = {}) => {
    if (typeof window === "undefined" || disposed)
      return Promise.resolve(false);
    if (!listening) {
      window.addEventListener("online", () => {
        for (const recover of [...recoverable]) recover({ retry: true });
      });
      listening = true;
    }
    if (loaded.size === slots.length) return Promise.resolve(true);
    for (const job of jobs) job.priority = Math.max(job.priority, priority);
    if (task) return task;
    if (!retry && Date.now() < retryAfter) return Promise.resolve(false);
    prepare.state = "loading";
    task = Promise.all(
      slots.map((slot) => {
        if (loaded.has(slot.name)) return true;
        return new Promise((resolve) => {
          const job = {
            priority,
            running: false,
            run: () => (disposed ? false : load(slot)),
            resolve: (value) => {
              jobs.delete(job);
              resolve(value);
            },
          };
          jobs.add(job);
          queue.push(job);
        });
      }),
    ).then((results) => {
      const ready = results.every(Boolean) && !disposed;
      if (!disposed) {
        onReady(ready);
        prepare.state = ready ? "ready" : "error";
        if (ready) recoverable.delete(prepare);
        else recoverable.add(prepare);
      }
      retryAfter = ready ? 0 : Date.now() + 10000;
      task = undefined;
      return ready;
    });
    queueMicrotask(pump);
    return task;
  };
  prepare.state = "idle";
  prepare.dispose = () => {
    if (disposed) return;
    disposed = true;
    prepare.state = "disposed";
    recoverable.delete(prepare);
    for (const controller of controllers) controller.abort();
    for (const job of [...jobs])
      if (!job.running) {
        const i = queue.indexOf(job);
        if (i >= 0) queue.splice(i, 1);
        job.resolve(false);
      }
    for (const texture of loaded.values()) {
      texture.dispose();
      texture.image.close?.();
    }
    loaded.clear();
  };
  return prepare;
}

/** 启动等待有上限，但不会中止仍在下载的贴图；后续完成会直接更新共享材质。 */
export async function waitForMaterials(tasks, budget = 5000) {
  let timer;
  try {
    return await Promise.race([
      Promise.all(tasks),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), budget);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
