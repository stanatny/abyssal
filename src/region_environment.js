/**
 * 菜单选中海域后才加载该环境模块；成功模块由浏览器缓存，失败由原切图事务回退。
 * 图鉴、共享生物与夏威夷初始环境保留同步入口，不混用“已缓存”和“已建成”。
 * @param {string} regionId 当前选择的海域标识。
 * @returns {Promise<object>} 对应环境的原始导出，不创建或持有场景资源。
 */
export async function loadRegionEnvironment(regionId) {
  try {
    switch (regionId) {
      case "hawaii":
        return Promise.resolve(null);
      case "atlantis":
        return await import("./atlantis_ocean.js");
      case "odyssey":
        return await import("./odyssey_ocean.js");
      case "penglai":
        return await import("./penglai_ocean.js");
      case "amazon":
        return await import("./amazon_ocean.js");
      case "europa":
        return await import("./europa_ocean.js");
      case "mariana":
        return await import("./mariana_ocean.js");
      case "bermuda":
        return await import("./bermuda_ocean.js");
      default:
        return Promise.reject(
          new Error(`Unknown region environment: ${regionId}`),
        );
    }
  } catch (cause) {
    // 浏览器会记住失败的ES模块；不要把同页重复import伪装成可用的网络重试。
    const error = new Error("Region environment download failed", { cause });
    error.reloadRequired = true;
    throw error;
  }
}
