/** 并发上限覆盖整批，失败后等待在途任务退出，防止重试叠加请求。 */
export async function preloadPreviewLayers(
  layers,
  load,
  { concurrency = 8, onProgress = () => {} } = {},
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)
    throw new Error("Invalid preview preload concurrency");
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

/** 用浏览器模块映射准备叶子到入口，避免最终 import 再爆发大量网络请求。 */
export function preloadPreviewModule(path, documentObject = document) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, documentObject.baseURI);
    if (
      url.origin !== new URL(documentObject.baseURI).origin ||
      !/^\/.*assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\.js$/.test(url.pathname)
    ) {
      reject(new Error("Invalid preview module URL"));
      return;
    }
    const link = documentObject.createElement("link");
    link.rel = "modulepreload";
    link.crossOrigin = "anonymous";
    link.href = url.href;
    const timer = setTimeout(
      () => finish(new Error("Preview module request timed out")),
      45000,
    );
    const finish = (error) => {
      clearTimeout(timer);
      link.onload = link.onerror = null;
      if (error) link.remove();
      error ? reject(error) : resolve();
    };
    link.onload = () => finish();
    link.onerror = () => finish(new Error("Preview module request failed"));
    documentObject.head.append(link);
  });
}

/** 只用于临时试玩包；原游戏入口、模型和音频的内容指纹保持不变。 */
export function startPreviewBootstrap({ layers, entry }) {
  const panel = document.getElementById("loading");
  if (!panel) throw new Error("Preview loading panel is missing");
  let language = navigator.language?.startsWith("zh") ? "zh-CN" : "en";
  try {
    const saved = localStorage.getItem("abyssal-language");
    if (["zh-CN", "en"].includes(saved)) language = saved;
  } catch {
    /* 存储不可用时沿用浏览器语言。 */
  }
  const copy =
    language === "zh-CN"
      ? {
          title: "正在唤醒海洋",
          note: "首次进入需要准备海域资源，请稍候。",
          preparing: "正在准备海域…",
          failure: "暂时未能完成加载，请检查网络后重试。",
          retry: "重新加载",
        }
      : {
          title: "Waking the ocean",
          note: "Preparing the ocean for your first visit. Please wait.",
          preparing: "Preparing the ocean…",
          failure:
            "Loading could not finish. Check your connection and try again.",
          retry: "Reload",
        };
  panel.textContent = "";
  Object.assign(panel.style, {
    animation: "none",
    zIndex: "2000",
    padding: "24px",
    textAlign: "center",
    letterSpacing: "1px",
  });
  const card = document.createElement("div");
  card.style.maxWidth = "360px";
  const brand = document.createElement("p");
  brand.textContent = "ABYSSAL";
  brand.style.cssText =
    "font:28px Georgia,serif;color:#e5f1ed;letter-spacing:6px;margin:0 0 24px";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = copy.title;
  const bar = document.createElement("progress");
  bar.max = 100;
  bar.value = 0;
  bar.setAttribute("aria-label", copy.title);
  bar.style.cssText = "width:100%;height:6px;accent-color:#92cfbc";
  const note = document.createElement("p");
  note.textContent = copy.note;
  note.style.cssText =
    "font-size:13px;line-height:1.8;letter-spacing:0;color:#a4bdbd";
  const retry = document.createElement("button");
  retry.textContent = copy.retry;
  retry.hidden = true;
  retry.style.marginTop = "16px";
  retry.addEventListener("click", () => location.reload());
  card.append(brand, status, bar, note, retry);
  panel.append(card);
  preloadPreviewLayers(layers, preloadPreviewModule, {
    onProgress(completed, total) {
      const percent = Math.floor((completed / total) * 100);
      bar.value = percent;
      status.textContent = `${copy.title} · ${percent}%`;
    },
  })
    .then(async () => {
      status.textContent = copy.preparing;
      note.textContent = "";
      await import(new URL(entry, document.baseURI).href);
    })
    .catch((error) => {
      console.error("Preview startup failed", error);
      panel.hidden = false;
      status.textContent = copy.failure;
      note.textContent = "";
      bar.hidden = true;
      retry.hidden = false;
    });
}
