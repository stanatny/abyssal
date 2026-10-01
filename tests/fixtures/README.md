# Frozen published model reference

`published_mayan_v0_7_1.json` contains the exact UTF-8 sources of the twelve static dependencies of `src/creatures.js` from ABYSSAL v0.7.1, commit `21cf9a4e50afd11c3d8634d92c461b43f85fe791`. Each source has its original SHA-256; the test loader also authenticates the complete ordered dependency closure. The original algorithms, relative imports, batching, seeded phase and animation wrapper are preserved. This is project-owned source, not an external art asset.

The compatibility test uses these sources as an independent reference for the original Maya Beast contact model. Both old and current factories run with the same installed Three.js **0.180.0** and Node runtime. This avoids raw fingerprint differences between Node versions while retaining exact geometry, order, transform and per-frame coordinate comparisons. Fixed published contact samples remain a separate check.

`tests/helpers/published_mayan_oracle.js` validates source bytes before rewriting only bare Three package imports to the current canonical module URLs. It creates an isolated temporary ESM directory, preserves the complete frozen dependency graph and removes it after tests or import failure. Nothing under this directory is imported by the production game.

Do not regenerate the reference from the current legacy helper, replace it with a reconstructed subset, introduce platform-specific golden hashes or add numeric tolerances to make a failure pass. A deliberate compatibility or Three version change requires independent review of its contact behavior and the reference contract. For the initial cross-runtime diagnosis and exact differences, see [release verification](../../docs/verification.md).

## Accepted Atlantis preparation baseline

`accepted_atlantis_v0_8_0_base.json` freezes the complete 46-module relative dependency closure of `src/atlantis_ocean.js` from accepted checkpoint `329210459a939d979412d81a7b7fe0c928711545`, using Three.js 0.180.0. Source bytes were extracted with `git show` from that commit, not regenerated from the optimized implementation. The helper authenticates the commit, each source SHA-256 and a fixed closure digest before loading it independently. Exact collider, obstacle and mesh/buffer comparisons run on the same Node/Three runtime. This replaces Mac-specific numeric output hashes without adding numerical tolerance or changing production art. Only the external Three dependency URL is resolved to the test environment; relative dependencies remain frozen. Temporary modules are removed after use.
