// 此文件保持自包含：构建器将原文和清单写入根目录的模块 Service Worker。
export const RUNTIME_CACHE_PROTOCOL = Object.freeze({
  status: "ABYSSAL_RUNTIME_CACHE_STATUS",
  read: "ABYSSAL_RUNTIME_CACHE_READ",
});

const HASHED_ASSET = /^assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9]+$/;
const INDEX_VERSION = 1;
const MAX_CLIENTS = 32;

export function installRuntimeCache(scope, config, options = {}) {
  const {
    buildId,
    assets,
    maxBytes = 384 * 1024 * 1024,
    maxEntries = 1024,
    cacheName = "abyssal-runtime-v1",
  } = config ?? {};
  const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
  if (
    typeof buildId !== "string" ||
    !buildId ||
    buildId.length > 128 ||
    !Array.isArray(assets) ||
    !positiveInteger(maxBytes) ||
    !positiveInteger(maxEntries) ||
    typeof cacheName !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(cacheName)
  )
    throw new TypeError("Invalid runtime cache configuration");

  const base = new URL(scope.registration.scope);
  if (
    !["https:", "http:"].includes(base.protocol) ||
    base.search ||
    base.hash ||
    !base.pathname.endsWith("/")
  )
    throw new TypeError("Invalid runtime cache scope");
  const manifest = new Map();
  for (const item of assets) {
    if (
      !item ||
      typeof item.path !== "string" ||
      !HASHED_ASSET.test(item.path) ||
      !Number.isSafeInteger(item.size) ||
      item.size < 0
    )
      throw new TypeError("Invalid runtime cache asset");
    const url = new URL(item.path, base).href;
    if (manifest.has(url)) throw new TypeError("Duplicate runtime cache asset");
    manifest.set(url, item.size);
  }

  const names = {
    assets: `${cacheName}:${base.href}:assets`,
    metadata: `${cacheName}:${base.href}:metadata`,
  };
  const indexUrl = new URL("__runtime_cache_index_v1__", base).href;
  const fetchResource = options.fetch ?? ((request) => scope.fetch(request));
  const now = options.now ?? (() => Date.now());
  const cacheTimeoutMs = options.cacheTimeoutMs ?? 1500;
  const flushDelayMs = options.flushDelayMs ?? 50;
  const entries = new Map();
  const clients = new Map();
  const inFlight = new Map();
  let totalBytes = 0;
  let storagePromise;
  let storageFailed = false;
  let storageAvailable = false;
  let mutation = Promise.resolve();
  let revision = 0;
  let flushedRevision = 0;
  let flushPromise;

  function assetUrl(value) {
    try {
      const url = new URL(value);
      if (
        url.origin !== base.origin ||
        url.search ||
        url.hash ||
        !url.pathname.startsWith(base.pathname)
      )
        return null;
      return HASHED_ASSET.test(url.pathname.slice(base.pathname.length))
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  async function bounded(promise) {
    let timeout;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error("Runtime cache operation timed out")),
            cacheTimeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  function enqueue(task) {
    const result = mutation.then(task);
    mutation = result.catch(() => {});
    return result;
  }

  function markStorageFailure() {
    // 缓存不可用时只退回浏览器原有网络/HTTP 缓存，不重发请求、不阻断启动。
    storageFailed = true;
    storageAvailable = false;
  }

  async function trim(store, incomingUrl = null, incomingSize = 0) {
    const previous = entries.get(incomingUrl);
    let count = entries.size + (incomingUrl && !previous ? 1 : 0);
    let bytes = totalBytes - (previous?.size ?? 0) + incomingSize;
    const victims = [...entries.entries()]
      .filter(([url]) => url !== incomingUrl)
      .sort(
        ([urlA, a], [urlB, b]) =>
          Number(manifest.has(urlA)) - Number(manifest.has(urlB)) ||
          a.used - b.used ||
          urlA.localeCompare(urlB),
      );
    for (const [url, entry] of victims) {
      if (count <= maxEntries && bytes <= maxBytes) break;
      await bounded(store.delete(url));
      entries.delete(url);
      totalBytes -= entry.size;
      bytes -= entry.size;
      count -= 1;
      revision += 1;
    }
  }

  function serializeIndex() {
    return new Response(
      JSON.stringify({
        version: INDEX_VERSION,
        entries: [...entries].map(([url, value]) => ({ url, ...value })),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  function storage() {
    if (!storagePromise) {
      storagePromise = bounded(
        (async () => {
          if (!scope.caches?.open) return null;
          const [store, metadata] = await Promise.all([
            scope.caches.open(names.assets),
            scope.caches.open(names.metadata),
          ]);
          const saved = await metadata.match(indexUrl);
          let index;
          try {
            index = saved ? await saved.json() : null;
          } catch {
            index = null;
          }
          const oldEntries = new Map();
          if (
            index?.version === INDEX_VERSION &&
            Array.isArray(index.entries)
          ) {
            // 元数据也有固定上限；损坏记录不能绕过真实文件的容量核算。
            for (const item of index.entries.slice(0, 4096)) {
              if (
                assetUrl(item?.url) &&
                Number.isSafeInteger(item.size) &&
                item.size >= 0 &&
                Number.isFinite(item.used) &&
                item.used >= 0
              )
                oldEntries.set(item.url, { size: item.size, used: item.used });
            }
          }
          for (const request of await store.keys()) {
            const url = assetUrl(request.url);
            const prior = oldEntries.get(url);
            const size = manifest.get(url) ?? prior?.size;
            if (!url || size === undefined) {
              await store.delete(request);
              continue;
            }
            entries.set(url, { size, used: prior?.used ?? 0 });
            totalBytes += size;
          }
          await trim(store);
          if (storageFailed) return null;
          await metadata.put(indexUrl, serializeIndex());
          flushedRevision = revision;
          storageAvailable = true;
          return { store, metadata };
        })(),
      ).catch(() => {
        markStorageFailure();
        return null;
      });
    }
    return storagePromise;
  }

  function scheduleFlush() {
    if (!flushPromise && !storageFailed) {
      flushPromise = (async () => {
        do {
          // 将一批并发模块命中合成一次小索引写入，不把每个命中变成同步写盘。
          await new Promise((resolve) => setTimeout(resolve, flushDelayMs));
          await enqueue(async () => {
            const state = await storage();
            if (!state || storageFailed || flushedRevision === revision) return;
            const snapshotRevision = revision;
            await bounded(state.metadata.put(indexUrl, serializeIndex()));
            flushedRevision = snapshotRevision;
          });
        } while (!storageFailed && flushedRevision !== revision);
      })()
        .catch(markStorageFailure)
        .finally(() => {
          flushPromise = undefined;
        });
    }
    return flushPromise ?? Promise.resolve();
  }

  function extend(event, promise) {
    // 测试和非标准宿主不一定提供 waitUntil；缓存工作本身始终吞掉可选存储错误。
    event?.waitUntil?.(promise.catch(() => {}));
  }

  function readStats(clientId) {
    if (!clientId) return { hitCount: 0, networkCount: 0 };
    let stats = clients.get(clientId);
    if (!stats) stats = { hitCount: 0, networkCount: 0 };
    clients.delete(clientId);
    clients.set(clientId, stats);
    while (clients.size > MAX_CLIENTS)
      clients.delete(clients.keys().next().value);
    return stats;
  }

  function notifyRead(clientId, url, source, event) {
    if (!clientId) return;
    const stats = readStats(clientId);
    stats[source === "persistent" ? "hitCount" : "networkCount"] += 1;
    extend(
      event,
      Promise.resolve(scope.clients?.get?.(clientId))
        .then((client) =>
          client?.postMessage({
            type: RUNTIME_CACHE_PROTOCOL.read,
            url,
            source,
            buildId,
          }),
        )
        .catch(() => {}),
    );
  }

  function cacheableResponse(response, url) {
    if (
      response.status !== 200 ||
      response.redirected ||
      ["opaque", "opaqueredirect", "error"].includes(response.type) ||
      /(?:^|,)\s*no-store\b/i.test(response.headers.get("Cache-Control") ?? "")
    )
      return false;
    const mime = (response.headers.get("Content-Type") ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    const extension = new URL(url).pathname.split(".").at(-1).toLowerCase();
    if (extension === "js")
      return /^(?:application|text)\/(?:javascript|ecmascript)$/.test(mime);
    if (extension === "css") return mime === "text/css";
    const binary = mime === "application/octet-stream";
    // Pages 的二进制 MIME 可能较宽泛，但图片、音频仍不能缓存 HTML 或文本错误页。
    if (/^(?:avif|gif|jpe?g|png|svg|webp)$/.test(extension))
      return binary || mime.startsWith("image/");
    if (/^(?:m4a|mp3|ogg|wav)$/.test(extension))
      return binary || mime.startsWith("audio/") || mime === "video/mp4";
    if (/^(?:woff2?|ttf|otf)$/.test(extension))
      return (
        binary ||
        mime.startsWith("font/") ||
        /^application\/(?:font-|x-font-|vnd\.ms-fontobject)/.test(mime)
      );
    if (/^(?:glb|gltf|bin)$/.test(extension))
      return binary || mime.startsWith("model/") || mime === "application/json";
    if (/^(?:mp4|webm)$/.test(extension))
      return binary || mime.startsWith("video/");
    return false;
  }

  async function saveResponse(state, request, response, url) {
    const size = manifest.get(url);
    if (!state || storageFailed || size > maxBytes) return;
    try {
      await enqueue(async () => {
        if (storageFailed) return;
        await trim(state.store, url, size);
        await bounded(state.store.put(request, response));
        totalBytes -= entries.get(url)?.size ?? 0;
        entries.set(url, { size, used: now() });
        totalBytes += size;
        revision += 1;
      });
      await scheduleFlush();
    } catch {
      markStorageFailure();
    }
  }

  async function loadNetwork(request, url, state, event) {
    // 只合并同一时刻相同模式的真实请求；不预取整份清单，也不为写缓存再下载。
    const key = `${url}|${request.cache}|${request.credentials}|${request.mode}`;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = Promise.resolve().then(() => fetchResource(request));
      inFlight.set(key, pending);
      const saving = pending.then(async (response) => {
        if (
          state &&
          manifest.has(url) &&
          request.cache !== "no-store" &&
          cacheableResponse(response, url)
        )
          await saveResponse(state, request, response.clone(), url);
      });
      // 保留到写入完成，避免同 URL 的下一次读取落在 fetch 与 cache.put 的夹缝里。
      const settled = saving.finally(() => inFlight.delete(key));
      extend(event, settled);
      settled.catch(() => {});
    }
    return (await pending).clone();
  }

  async function handleRequest(event, url) {
    const { request, clientId } = event;
    const state = storageFailed ? null : await storage();
    if (state && !["reload", "no-store"].includes(request.cache)) {
      try {
        const cached = await bounded(state.store.match(request));
        if (cached && cacheableResponse(cached, url)) {
          const entry = entries.get(url);
          if (entry) {
            entry.used = now();
            revision += 1;
            extend(event, scheduleFlush());
          }
          notifyRead(clientId, url, "persistent", event);
          return cached;
        }
      } catch {
        markStorageFailure();
      }
    }
    notifyRead(clientId, url, "network", event);
    return loadNetwork(request, url, state, event);
  }

  async function getStatus(clientId = "") {
    await storage();
    return {
      type: RUNTIME_CACHE_PROTOCOL.status,
      buildId,
      available: storageAvailable && !storageFailed,
      maxBytes,
      maxEntries,
      entryCount: entries.size,
      totalBytes,
      ...readStats(clientId),
    };
  }

  scope.addEventListener("install", (event) => {
    extend(event, Promise.resolve(scope.skipWaiting()));
  });
  scope.addEventListener("activate", (event) => {
    // 接管首次访问，后续实际模块请求即可写缓存；HTML 始终走浏览器原有加载路径。
    extend(event, Promise.resolve(scope.clients.claim()));
  });
  scope.addEventListener("message", (event) => {
    if (event.data?.type !== RUNTIME_CACHE_PROTOCOL.status) return;
    extend(
      event,
      getStatus(event.source?.id).then((status) => {
        const target = event.ports?.[0] ?? event.source;
        target?.postMessage(status);
      }),
    );
  });
  scope.addEventListener("fetch", (event) => {
    const request = event.request;
    if (
      request.method !== "GET" ||
      request.mode === "navigate" ||
      request.headers.has("Range") ||
      request.headers.has("Authorization")
    )
      return;
    const url = assetUrl(request.url);
    if (!url) return;
    event.respondWith(handleRequest(event, url));
  });

  return { getStatus, names };
}
