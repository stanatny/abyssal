/**
 * RecordedAudioBank 预取录音并按音频上下文缓存解码结果，不创建或调度声源。
 * @param {object} urls 样本标识到URL的映射。
 * @param {object} options fetcher 可注入下载函数，用于离线或失败路径验证。
 */
export class RecordedAudioBank {
  constructor(urls, { fetcher = (...args) => globalThis.fetch(...args) } = {}) {
    this.urls = urls;
    this.fetcher = fetcher;
    this.bytes = new Map();
    this.pending = null;
    this.decoded = new WeakMap();
  }

  /** preload 预取配置中的录音，返回原始样本Map；失败可重试，成功项继续复用。 */
  preload() {
    if (this.pending) return this.pending;
    this.pending = Promise.all(
      Object.entries(this.urls).map(async ([key, url]) => {
        if (this.bytes.has(key)) return;
        const response = await this.fetcher(url, {
          signal: globalThis.AbortSignal?.timeout?.(10000),
        });
        if (!response.ok)
          throw new Error(
            `Recorded audio asset request failed: ${response.status}`,
          );
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength) throw new Error("Recorded audio asset is empty");
        this.bytes.set(key, bytes);
      }),
    )
      .then(() => this.bytes)
      .catch((error) => {
        this.pending = null;
        throw error;
      });
    return this.pending;
  }

  /** load 返回当前上下文的AudioBuffer；缓存Promise去重，不持有播放事件。 */
  load(context) {
    if (this.decoded.has(context)) return this.decoded.get(context);
    const pending = this.preload()
      .then(async (bytes) => {
        const entries = await Promise.all(
          [...bytes].map(async ([key, data]) => {
            // decodeAudioData可能转移原buffer，保留原始副本供其他上下文及重试使用。
            const buffer = await context.decodeAudioData(data.slice(0));
            if (!Number.isFinite(buffer.duration) || buffer.duration <= 0)
              throw new Error("Decoded audio asset has no duration");
            return [key, buffer];
          }),
        );
        return new Map(entries);
      })
      .catch((error) => {
        this.decoded.delete(context);
        throw error;
      });
    this.decoded.set(context, pending);
    return pending;
  }
}
