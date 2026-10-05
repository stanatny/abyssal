import { buildOdysseyInvertebrate } from "./creature_odyssey_extra_invertebrates.js";
import { buildOdysseyVertebrate } from "./creature_odyssey_extra_vertebrates.js";

/** 七种补充生物使用独立体制，而非既有鱼体换色。 */
export const ODYSSEY_EXTRA_KINDS = new Set([
  "iris_cuttlefish",
  "amphora_hermit",
  "aegean_jelly",
  "silver_pipefish",
  "aegis_sturgeon",
  "thalassa_manta",
  "cerulean_hound",
]);
/** 将带独立关节的新增解剖附到调用方身体，动画统一交由主时钟驱动。 */
export function buildOdysseyExtra(kind, body, motions) {
  if (["iris_cuttlefish", "amphora_hermit", "aegean_jelly"].includes(kind))
    buildOdysseyInvertebrate(kind, body, motions);
  else buildOdysseyVertebrate(kind, body, motions);
}
