# Regional Rare Eyes and Touch-Control Triangle

Status: uncommitted development candidate on `fix/penglai-ground-navigation`, based on local checkpoint `55f999f`. This follows and preserves the uncommitted Europa arm-combat revision. It is not a formal v0.10.1 update.

## Defects and implementation

Crimson Sailfin (Bermuda) and Gilded Cloud Carp (Penglai) reused an eye offset suited to a narrower fish; their wider heads buried the eyes. Their paired eyes now follow the actual interpolated head section, including its vertical curvature. The same fish helper keeps Jade Arowana fitted as well. Six-wing Crystal Seraph (Europa) had wing sensory nodes but no complete eye pair; it now has recessed dark orbital rims, cyan irises, pupils and restrained reflective glints. No emissive light was added. The ordinary body shape, scale, wings, animation and feeding rules remain unchanged, including Pearl Nautilus's accepted continuous arms.

Phone slow swim moves above the skill/sprint pair. A shared set of CSS dimensions defines the triangle and adapts to narrow portrait screens, landscape phones, tablets and safe-area insets. The apex lies between the lower button centers. The existing independent pointer capture still releases slow swim when the finger leaves the button and lifts; sprint and skills retain their own touch events. The surface momentum hint moves to the left so it cannot cover the apex. Desktop controls remain unchanged. No player-facing text or ability values changed, so existing Chinese/English copy remains applicable.

## Focused verification

Before/after images come from the actual native Guide and the shared world factory, with both-side views of the three affected specimens and all seven rare specimens inspected. A surface-ray check finds the outer pupil before the torso on both sides of four profile-eyed specimens at seven normal/sprint animation phases (56 checks). Existing rare/reward/marker, visual/contact and tentacle tests pass 38/38. This is focused verification of a visual fix; the preceding Europa revision's 881-unit full-suite receipt is separate.

Touch-emulated checks cover 320×568, 390×667, 390×844, 430×932, 844×390 and 768×1024, four protagonists and both languages. They inspect bounds, triangle ordering, sampled control/HUD overlap and page overflow, plus real CDP hold/move/release and dual-touch input. Active sonar and surface hints have additional English/Chinese short-portrait and landscape checks; actual Europa warning/pause/reset checks cover both lords at 320/390 widths. Physical-device notch handling and finger ergonomics remain user-review limits.

The five-model before/after geometry probe retains triangle totals for Crimson Sailfin, Gilded Cloud Carp, Jade Arowana and Pearl Nautilus. Crystal Seraph increases from 9,944 to 12,760 triangles for the eye pair, still one rare individual per expedition. Eye parts use existing cached surfaces/materials and static batching; there is no new simulation task, animation loop, scene light or population. This small geometry receipt is not an FPS or phone-temperature claim.

Formatting and production build must pass before the restricted candidate is refreshed. Verify served local/public JS and CSS against the build manifest, native rare Guide views and touch controls, private-path denial and absent production debug hooks. Record final compiled receipts in the current verification log rather than presenting a reachable URL as sufficient proof.

## Final delivery receipt

Final native checks pass **48** layouts (six viewports × four characters × two languages), including CDP hold/move/release and dual-touch handling. Six English/Chinese active-sonar/surface-hint cases have no sampled overlap, and four real Europa lord warning/pause/reset cases pass at 320/390 widths. Formatting and production build pass; the pre-existing large-bundle warning remains.

The refreshed restricted compiled **local and public** hosts each pass **six** affected-region gameplay/pause/home flows and **six** rare Guide views, with the triangular controls functioning in Chinese 390×667 touch emulation. All **nine** artifacts on each host match byte-for-byte; all **273** runtime input fingerprints match. Private/development paths are denied, the production debug API is absent and no page/console errors are observed. The preceding candidate build is retained for rollback. This verifies the candidate from the host through its public address, not physical-phone finger ergonomics or a formal release.

## Rollback

Restore only this follow-up's `creature_regional_rare.js` eye-placement delta and `style.css` triangle/hint delta from the ignored before snapshots. Preserve the earlier Pearl Nautilus animation and all other Europa changes. Rebuild and restore the preceding candidate runtime if needed. No commit or formal publication occurs without separate user authorization.
