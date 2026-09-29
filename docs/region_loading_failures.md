# Region loading failure recovery

Development candidate; not published. Region selection builds the new ocean and surface before replacing the current environment. A failure keeps the original region selected and presents a dismissible error panel. The loading panel locks background interaction and language selection until recovery completes.

Two distinct transaction states are tracked: `detached` means the original population has started leaving the scene, while `swapped` means the environment references and region identity have actually changed. A failure before detachment does not cache the original region's population under the destination region. A failure after swapping can retain successfully constructed destination creatures for a retry. Population seeding counts existing instances by species and creates the missing instances, so a nonempty partial cache does not suppress the remaining population.

## Focused failure checks

`scripts/verify_region_loading_failures.mjs` uses normal region-picker clicks and two controlled one-shot failures in a desktop Chrome development session at 1440 × 900:

1. The browser's received `creatures.js` module is instrumented to throw on the twelfth ordinary Atlantis creature construction after the region swap. Surface seagulls and guardians are excluded so that the failure targets population seeding. The script checks that Hawaii returns with its original 285 creature identities, then retries Atlantis and verifies all 390 individuals across 17 species against the configured population counts. The eleven successfully created Atlantis creature identities must be reused.
2. The development API's `effects.reset` receives a one-shot exception before population detachment. Hawaii must retain all 285 original creatures. Retrying Atlantis must produce the complete 390-individual population without any Hawaii creature identities contaminating the destination cache.

Both checks assert that scene entities remain attached, exactly one ocean and one surface environment survive, the failed replacement ocean is detached, the prior ocean is removed only after successful retry, selection and expedition identity agree, language and menu interaction unlock, and focus returns to the region control. Injected exceptions are counted separately from unexpected console/page errors. The script never writes application source files.

## Evidence and limits

`node scripts/verify_region_loading_failures.mjs`: **2/2 scenarios passed**, exactly two expected injected exceptions, and **zero unexpected console or page errors**. Both retries restored all 390 Atlantis individuals across 17 species with exact configured counts. The partial construction scenario retained and reused all eleven successful creature identities. Failure rollback restored the exact original 285 Hawaii identities, and the pre-detachment exception did not contaminate the Atlantis cache. All scene attachment, environment-count, selection, focus and interaction-lock assertions passed.

The report and four screenshots are in `.local/region_loading_failures/`. The English failure panel and successful retry views were visually inspected; the panel has a readable error explanation and return action, and the destination selection agrees with the returned scene.

These are deliberately injected failures, not observed production crashes. They cover scene attachment and identity/resource ownership behavior but do not measure GPU allocation recovery, out-of-memory handling, physical-phone performance, or every possible constructor exception. The ordinary loading and compilation-failure flows have a separate browser script.
