# Edible retaliation identification

The user authorized a local checkpoint of the accepted Mechanical Shark feature, visual/aim refinement and Guide roster order. Commit `8d55481` on `feature/mechanical-shark` contains that reviewed work. It was not pushed; formal Pages remains v0.8.3. This subsequent presentation change is uncommitted for review.

## Change

Previously, edible predators that could retaliate shared the dangerous-hunter style. The ordinary target hint, sonar anchor/label and radar echo now use yellow (`#f3d36d`) when the creature is both edible and dangerous. Non-edible dangerous hunters retain their existing red style. Harmless edible prey remain green; lords retain their separate styling. The existing wording and sonar title still identify eligibility and retaliation, so color is not the only cue.

The change uses existing eligibility and danger flags. It does not modify the strict feeding-size test, the 5 m absolute-advantage boundary, pursuit, contact damage, ecology, sonar clocks, layout or resource lifecycle. English and Chinese predator Guide tips explain the color distinction.

## Validation

Before the checkpoint: all 763 unit tests and project formatting pass; the preceding build and public roster checks remain recorded in the handoff. For this follow-up, 45 focused sonar, marker-layout, radar, predator, localization and Guide tests pass. Formatting and the production build pass. Two actual development-runtime views (English 1440×900 desktop and Chinese 390×667 touch emulation) confirm yellow edible retaliation, the preserved red non-edible danger style, and the green safe state at the exact 5 m advantage boundary. Each state checks the ordinary hint, sonar anchor/label and radar fill from real shared classification; pause clears the overlay. Both-language Guide tips render correctly, with no page/console errors or horizontal overflow. Controlled encounters do not replace natural full-round or physical-device review. Two compiled public bilingual views also verify Guide color explanations, preserved menu/Guide roster order, and real start → pause → home interaction with no page/console errors or production debug API. All eight served artifacts and 210 current runtime source fingerprints match the rebuilt candidate. Receipts are in ignored `.local/retaliation_marker/`.

This is a presentation-only refinement, not a new balance or performance claim. Physical-phone rendering remains subject to user review.
