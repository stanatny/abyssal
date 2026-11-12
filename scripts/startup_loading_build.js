import { resolve } from "node:path";
import { prepareStartupLoader } from "./prepare_preview_loader.mjs";

/** 只处理成功写盘的浏览器构建；开发、SSR和内存构建保持原入口。 */
export function startupLoading() {
  let config;
  let failed = false;
  return {
    name: "abyssal-startup-loading",
    apply: "build",
    enforce: "post",
    configResolved(value) {
      config = value;
    },
    buildStart() {
      failed = false;
    },
    buildEnd(error) {
      failed = Boolean(error);
    },
    writeBundle: {
      order: "post",
      sequential: true,
      async handler() {
        if (
          failed ||
          !config?.build.write ||
          config.build.ssr ||
          config.build.lib
        )
          return;
        await prepareStartupLoader(resolve(config.root, config.build.outDir));
      },
    },
  };
}
