// 只撤销获准的外海增密：旧群体索引和全部受保护栖地必须仍能逐字对账。
const ROUTE_BASE_COUNTS = {
  needlefish: 6,
  sunfish: 4,
  tuna: 8,
  ray: 6,
};

export function restoreBermudaShoalDensityBaseline(roster) {
  return roster.map((source) => {
    if (source.bermudaShoalDensityRevision !== "20261123") return source;
    const count = ROUTE_BASE_COUNTS[source.kind];
    if (!count || !source.schoolProfiles)
      throw new Error("Unexpected Bermuda shoal density revision");
    const copy = { ...source };
    delete copy.bermudaShoalDensityRevision;
    copy.schoolProfiles = source.schoolProfiles
      .filter((profile) => !profile.bermudaDensitySchool)
      .map((profile) =>
        profile.bermudaRouteSchool && !profile.bermudaCaveId
          ? { ...profile, count }
          : profile,
      );
    copy.population = copy.schoolProfiles.reduce((n, p) => n + p.count, 0);
    return copy;
  });
}
