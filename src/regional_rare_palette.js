/** Read the shared CSS palette once when building textures/SVG, never per frame. */
export function rareMarkerPalette() {
  const style = getComputedStyle(document.documentElement);
  return ["sky", "violet", "rose", "pearl", "mint"].map((name) =>
    style.getPropertyValue(`--rare-marker-${name}`).trim(),
  );
}
