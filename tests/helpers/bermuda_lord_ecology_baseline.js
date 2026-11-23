import { restoreBermudaShoalDensityBaseline } from "./bermuda_shoal_density_baseline.js";

// 先排除独立外海增密，再精确还原这十三个旧槽位；不刷新历史整图哈希。
export const BERMUDA_LORD_HOME_BASELINE = Object.freeze({
  sperm_whale: Object.freeze({
    0: [-400, -85, -610],
    1: [-210, -95, -650],
    2: [410, -300, -850],
    3: [-400, -490, -1330],
  }),
  pliosaur: Object.freeze({
    0: [180, -315, -970],
    1: [-180, -430, -1220],
  }),
  megalodon: Object.freeze({ 0: [-180, -535, -1180] }),
  livyatan: Object.freeze({
    0: [-210, -100, -470],
    1: [240, -290, -1050],
    2: [-360, -515, -1130],
  }),
  ichthyotitan: Object.freeze({
    0: [-255, -35, -625],
    1: [355, -280, -945],
    2: [-235, -505, -1305],
  }),
});

export function restoreBermudaLordHomeBaseline(species) {
  return restoreBermudaShoalDensityBaseline(species).map((source) => {
    const copy = { ...source };
    delete copy.bermudaLordSiteRevision;
    const homes = BERMUDA_LORD_HOME_BASELINE[source.kind];
    if (homes) {
      copy.spawnAnchors = source.spawnAnchors.slice();
      for (const [index, home] of Object.entries(homes)) {
        if (!copy.spawnAnchors[index])
          throw Error("The lord migration baseline requires existing stock");
        copy.spawnAnchors[index] = home.slice();
      }
    }
    return copy;
  });
}
