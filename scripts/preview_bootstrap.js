export const STARTUP_COPY = Object.freeze({
  en: Object.freeze({
    title: "Waking the ocean",
    note: "Loading the resources needed to start. World visuals and audio are prepared next.",
    progress: "Startup resources",
    initializing: "Initializing the ocean…",
    initializingNote:
      "Startup resources are ready. Preparing the selected world.",
    direct: "Preparing the ocean…",
    directNote:
      "This browser loads the program directly, so resource progress is unavailable. World textures and audio load separately.",
    indeterminate: "Progress unavailable",
    waiting:
      "Still working. Large resources or a slow connection can take longer.",
    resourceFailure: "Startup resources could not finish loading.",
    initializationFailure: "The game could not finish initializing.",
    directFailure: "Direct loading or initialization could not finish.",
    failureNote: "Check your connection, then reload to try again.",
    initializationFailureNote:
      "Reload to try again. If this continues, check your connection and use a WebGL 2 browser with hardware acceleration enabled.",
    retry: "Reload and retry",
    ready: "Ready to explore",
  }),
  "zh-CN": Object.freeze({
    title: "正在唤醒海洋",
    note: "正在读取启动所需的资源，完成后继续准备海域画面和声音。",
    progress: "启动资源",
    initializing: "正在初始化海洋…",
    initializingNote: "启动资源已就绪，正在准备所选海域。",
    direct: "正在准备海洋…",
    directNote:
      "当前浏览器直接加载程序，无法显示资源进度。海域贴图和音频会另行加载。",
    indeterminate: "暂无法显示进度",
    waiting: "仍在加载中，较大的资源或较慢的网络可能需要更长时间。",
    resourceFailure: "启动资源未能完成加载。",
    initializationFailure: "游戏未能完成初始化。",
    directFailure: "程序直接加载或初始化未能完成。",
    failureNote: "请检查网络，然后重新加载。",
    initializationFailureNote:
      "请重新加载。若仍失败，请确认网络正常，并使用支持 WebGL 2 且已启用硬件加速的浏览器。",
    retry: "重新加载",
    ready: "海洋已就绪",
  }),
});

/** 只读取传入的语言与存储；隐私模式拒绝存储时仍可进入。 */
export function selectStartupLanguage(navigatorObject, storageObject) {
  const language = /^zh/i.test(navigatorObject?.language || "")
    ? "zh-CN"
    : "en";
  try {
    const saved = storageObject?.getItem("abyssal-language");
    if (saved === "en" || saved === "zh-CN") return saved;
  } catch {
    // 存储拒绝不影响启动，沿用浏览器语言。
  }
  return language;
}

/** 并发上限覆盖整批，失败后等待在途任务退出，防止重试叠加请求。 */
export async function preloadPreviewLayers(
  layers,
  load,
  { concurrency = 8, onProgress = () => {} } = {},
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)
    throw new Error("Invalid preview preload concurrency");
  if (!Array.isArray(layers) || layers.some((layer) => !Array.isArray(layer)))
    throw new Error("Invalid startup resource layers");
  const total = layers.reduce((sum, layer) => sum + layer.length, 0);
  let completed = 0;
  for (const layer of layers) {
    let cursor = 0;
    let failure;
    const workers = Array.from(
      { length: Math.min(concurrency, layer.length) },
      async () => {
        while (!failure && cursor < layer.length) {
          const url = layer[cursor++];
          try {
            await load(url);
            onProgress(++completed, total);
          } catch (error) {
            failure ||= error;
          }
        }
      },
    );
    await Promise.all(workers);
    if (failure) throw failure;
  }
}

function startupAssetURL(path, documentObject, extension) {
  if (typeof path !== "string") throw new Error("Invalid startup asset URL");
  const page = new URL(documentObject.URL || documentObject.baseURI);
  const directory = new URL(".", page);
  const assets = new URL("./assets/", directory);
  const url = new URL(path, directory);
  const filename = url.pathname.slice(assets.pathname.length);
  const pattern = new RegExp(
    "^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\\." + extension + "$",
  );
  if (
    url.origin !== page.origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith(assets.pathname) ||
    !pattern.test(filename)
  )
    throw new Error("Invalid startup asset URL: " + path);
  return url;
}

function preloadStartupLink(
  path,
  documentObject,
  kind,
  {
    timeoutMs = 180000,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
  } = {},
) {
  return new Promise((resolve, reject) => {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      reject(new Error("Invalid startup resource timeout"));
      return;
    }
    let url;
    try {
      url = startupAssetURL(
        path,
        documentObject,
        kind === "stylesheet" ? "css" : "js",
      );
    } catch (error) {
      reject(error);
      return;
    }
    const link = documentObject.createElement("link");
    link.rel = kind;
    link.crossOrigin = "anonymous";
    link.href = url.href;
    let settled = false,
      timer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimer(timer);
      link.onload = link.onerror = null;
      if (error) link.remove();
      error ? reject(error) : resolve();
    };
    link.onload = () => finish();
    link.onerror = () => finish(new Error("Startup resource request failed"));
    timer = setTimer(
      () => finish(new Error("Startup resource request timed out")),
      timeoutMs,
    );
    try {
      documentObject.head.append(link);
    } catch (error) {
      finish(error);
    }
  });
}

/** modulepreload 填充模块映射；入口仍使用同一原始 URL，不依赖 HTTP 缓存。 */
export function preloadPreviewModule(path, documentObject = document, options) {
  return preloadStartupLink(path, documentObject, "modulepreload", options);
}

/** 样式表实际就绪后才继续；与第一层模块共享并发预算。 */
export function preloadPreviewStylesheet(
  path,
  documentObject = document,
  options,
) {
  return preloadStartupLink(path, documentObject, "stylesheet", options);
}

function supportsModulePreload(documentObject) {
  try {
    return (
      documentObject
        .createElement("link")
        .relList?.supports?.("modulepreload") === true
    );
  } catch {
    return false;
  }
}

/** 正式包与临时试玩共用；仅准备启动依赖，海域构建仍交给原游戏入口。 */
export async function startPreviewBootstrap(
  { layers, entry, styles = [] },
  options = {},
) {
  const documentObject = options.documentObject || globalThis.document;
  const navigatorObject = options.navigatorObject || globalThis.navigator;
  const locationObject = options.locationObject || globalThis.location;
  const importEntry = options.importEntry || ((url) => import(url));
  const loadModule = options.loadModule || preloadPreviewModule;
  const loadStylesheet = options.loadStylesheet || preloadPreviewStylesheet;
  const consoleObject = options.consoleObject || globalThis.console;
  const setTimer = options.setTimer || globalThis.setTimeout;
  const clearTimer = options.clearTimer || globalThis.clearTimeout;
  const waitingMs = options.waitingMs ?? 15000;
  const linkOptions = {
    timeoutMs: options.timeoutMs ?? 180000,
    setTimer,
    clearTimer,
  };
  const panel = documentObject?.getElementById("loading");
  if (!panel) throw new Error("Startup loading panel is missing");
  let storageObject = options.storageObject;
  if (!Object.prototype.hasOwnProperty.call(options, "storageObject")) {
    try {
      storageObject = globalThis.localStorage;
    } catch {
      // 获取存储对象本身也可能被拒绝。
    }
  }
  const language = selectStartupLanguage(navigatorObject, storageObject);
  const copy = STARTUP_COPY[language];
  const total =
    (Array.isArray(styles) ? styles.length : 0) +
    (Array.isArray(layers)
      ? layers.reduce(
          (sum, layer) => sum + (Array.isArray(layer) ? layer.length : 0),
          0,
        )
      : 0);
  panel.textContent = "";
  panel.hidden = false;
  const panelStyle = {
    position: "fixed",
    inset: "0",
    display: "grid",
    placeItems: "center",
    overflow: "auto",
    boxSizing: "border-box",
    padding:
      "max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))",
    background: "#020a12",
    color: "#e8f6f2",
    font: '14px/1.5 system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
    animation: "none",
    transition: "none",
    opacity: "1",
    outline: "none",
    zIndex: "2000",
    textAlign: "left",
    letterSpacing: "0",
  };
  const keepFocus = (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    (retry.hidden ? panel : retry).focus?.({ preventScroll: true });
  };
  const ownPanel = () => {
    panel.tabIndex = -1;
    panel.removeAttribute("aria-modal");
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", "startup-title");
    panel.setAttribute("aria-busy", "true");
    panel.addEventListener("keydown", keepFocus);
    Object.assign(panel.style, panelStyle);
  };
  const releasePanel = () => {
    // 游戏稍后会复用这个容器显示显卡恢复信息，不能留下已被移除标题的引用。
    panel.removeEventListener?.("keydown", keepFocus);
    if (documentObject.activeElement === panel) panel.blur?.();
    for (const name of [
      "role",
      "aria-labelledby",
      "aria-modal",
      "aria-busy",
      "tabindex",
    ])
      panel.removeAttribute(name);
  };
  ownPanel();
  const element = (tag, id, text) => {
    const node = documentObject.createElement(tag);
    node.id = id;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const card = element("div", "startup-card");
  card.setAttribute("lang", language);
  card.style.cssText = "width:100%;max-width:420px;min-width:0;margin:auto";
  const brand = element("p", "startup-brand", "ABYSSAL");
  brand.style.cssText =
    "font:26px/1.3 Georgia,serif;letter-spacing:5px;margin:0 0 20px";
  const status = element("p", "startup-title", copy.title);
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  status.style.cssText =
    "font-size:18px;line-height:1.4;margin:0 0 12px;overflow-wrap:anywhere";
  const bar = element("div", "startup-progress");
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", copy.progress);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.style.cssText =
    "height:8px;width:100%;overflow:hidden;background:#17323b;border-radius:4px";
  const fill = element("div", "startup-progress-fill");
  fill.style.cssText =
    "height:100%;width:0;background:#92cfbc;animation:none;transition:none";
  bar.append(fill);
  const count = element("p", "startup-count");
  count.setAttribute("aria-hidden", "true");
  count.style.cssText = "font-size:12px;color:#b8d0c0;margin:8px 0";
  const note = element("p", "startup-note", copy.note);
  note.style.cssText =
    "font-size:13px;line-height:1.6;color:#a4bdbd;margin:8px 0 0;overflow-wrap:anywhere";
  const waiting = element("p", "startup-waiting", copy.waiting);
  waiting.hidden = true;
  waiting.style.cssText =
    "font-size:12px;line-height:1.5;color:#a4bdbd;margin:10px 0 0;overflow-wrap:anywhere";
  const retry = element("button", "startup-retry", copy.retry);
  retry.type = "button";
  retry.hidden = true;
  retry.style.cssText =
    "min-height:44px;max-width:100%;margin-top:16px;padding:10px 16px;border:1px solid #92cfbc;border-radius:6px;background:#17323b;color:#e8f6f2;font:inherit;white-space:normal;cursor:pointer";
  retry.addEventListener("click", () => {
    if (retry.disabled) return;
    retry.disabled = true;
    locationObject.reload();
  });
  card.append(brand, status, bar, count, note, waiting, retry);
  panel.append(card);
  panel.focus?.({ preventScroll: true });

  let phase = "resources",
    waitingTimer;
  const setState = (state) => {
    panel.dataset.startupState = state;
  };
  const clearWaiting = () => {
    if (waitingTimer !== undefined) clearTimer(waitingTimer);
    waitingTimer = undefined;
    waiting.hidden = true;
  };
  const awaitActivity = () => {
    clearWaiting();
    if (Number.isFinite(waitingMs) && waitingMs > 0)
      waitingTimer = setTimer(() => {
        waiting.hidden = false;
      }, waitingMs);
  };
  const updateProgress = (completed, resourceTotal) => {
    const percent = resourceTotal
      ? Math.floor((completed / resourceTotal) * 100)
      : 100;
    bar.dataset.completed = String(completed);
    bar.dataset.total = String(resourceTotal);
    bar.dataset.mode = "determinate";
    bar.setAttribute("aria-valuenow", String(percent));
    const value = completed + " / " + resourceTotal + " · " + percent + "%";
    bar.setAttribute("aria-valuetext", copy.progress + " " + value);
    count.textContent = copy.progress + " " + value;
    fill.hidden = false;
    fill.style.width = percent + "%";
    awaitActivity();
  };
  const indeterminate = () => {
    bar.dataset.mode = "indeterminate";
    bar.removeAttribute("aria-valuenow");
    bar.setAttribute("aria-valuetext", copy.indeterminate);
    fill.hidden = true;
    count.textContent = copy.indeterminate;
    awaitActivity();
  };
  setState("resources");
  updateProgress(0, total);
  try {
    if (
      !Array.isArray(layers) ||
      layers.some((layer) => !Array.isArray(layer)) ||
      !Array.isArray(styles)
    )
      throw new Error("Invalid startup resource manifest");
    const entryURL = startupAssetURL(entry, documentObject, "js");
    const canonical = [
      ...styles.map(
        (path) => startupAssetURL(path, documentObject, "css").href,
      ),
      ...layers
        .flat()
        .map((path) => startupAssetURL(path, documentObject, "js").href),
    ];
    if (new Set(canonical).size !== canonical.length)
      throw new Error("Duplicate startup resource");
    if (supportsModulePreload(documentObject)) {
      const resourceLayers = layers.length
        ? [[...styles, ...layers[0]], ...layers.slice(1)]
        : [styles];
      const stylesheetPaths = new Set(styles);
      await preloadPreviewLayers(
        resourceLayers,
        (path) =>
          (stylesheetPaths.has(path) ? loadStylesheet : loadModule)(
            path,
            documentObject,
            linkOptions,
          ),
        { onProgress: updateProgress },
      );
      phase = "initialization";
      setState("initializing");
      status.textContent = copy.initializing;
      note.textContent = copy.initializingNote;
      awaitActivity();
    } else {
      setState("direct");
      status.textContent = copy.direct;
      note.textContent = copy.directNote;
      indeterminate();
      await preloadPreviewLayers([styles], (path) =>
        loadStylesheet(path, documentObject, linkOptions),
      );
      phase = "direct";
    }
    releasePanel();
    await importEntry(entryURL.href);
    setState("ready");
    status.textContent = copy.ready;
    return true;
  } catch (error) {
    consoleObject?.error?.("Startup " + phase + " failed", error);
    clearWaiting();
    // 原入口可能已显示具体的显卡错误，不能用泛化网络提示覆盖它。
    const entryDetail =
      phase !== "resources" && panel.contains?.(card) === false
        ? panel.textContent.trim()
        : "";
    panel.textContent = "";
    panel.append(card);
    ownPanel();
    panel.hidden = false;
    panel.setAttribute("aria-busy", "false");
    setState("failed-" + phase);
    status.textContent =
      phase === "resources"
        ? copy.resourceFailure
        : phase === "direct"
          ? copy.directFailure
          : copy.initializationFailure;
    note.textContent =
      entryDetail ||
      (phase === "resources"
        ? copy.failureNote
        : copy.initializationFailureNote);
    retry.hidden = false;
    retry.focus?.({ preventScroll: true });
    return false;
  } finally {
    clearWaiting();
  }
}
