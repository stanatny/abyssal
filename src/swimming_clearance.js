// A wide swimmer can clear a floor at its centre while its outer skin cuts a
// slope. Sample the lower spherical envelope; only explicitly opted-in species
// pay this cost. The fixed rings avoid per-frame geometry/vertex scans.
const FOOTPRINT = [0.55, 0.9].flatMap((radius) =>
  Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    return [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      Math.sqrt(1 - radius * radius),
    ];
  }),
);

export function swimmingFloorHeight(x, z, species, heightAt, margin) {
  const center = heightAt(x, z);
  if (!(species.swimClearance > 0)) return center + margin;
  const radius = species.length * species.swimClearance;
  let floor = center + Math.max(radius, margin);
  for (const [dx, dz, below] of FOOTPRINT)
    floor = Math.max(
      floor,
      heightAt(x + dx * radius, z + dz * radius) + below * radius,
    );
  // Covers gaps between samples on Europa's sloping, gently rippled bed.
  // Static ice cliffs/arches use their separate swept colliders.
  return floor + radius * 0.12 + 0.15;
}
