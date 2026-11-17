# v0.11.30 — Runtime cache, airborne aim and feeding motion

## Scope

On 2026-11-18 the user authorizes committing and pushing the accepted candidate
to main, following v0.11.29 / `6fbbb9e`. Refreshed remote main has no concurrent
changes. All 2,228 delivered inputs and 981 preview-runtime artifacts match before
release-only metadata and documentation edits.

- Add optional bounded persistent caching of original hashed runtime assets,
  truthful cached-read counts and a deadline-based fallback. Existing HTTP cache
  remains useful; first downloads and scene preparation still take time. HTML
  and navigation are not cached, and offline navigation is not supported.
- Let Mechanical Shark aim independently of its physical airborne glide, with
  one muzzle direction shared by the sight and permitted shots. Ordinary-ocean
  airborne firing remains unavailable; Penglai retains its existing permission.
- Animate ordinary characters' and the Zombie Shark companion's swallowed prey
  into their actual moving mouth, with bounded water effects and local feeding
  poses. The final Orca refinement reduces excessive opening and head inflation
  while retaining a brief swallow and return. Capture, rewards and Giant Squid's
  dedicated feeding behavior remain unchanged.

The [runtime review](cache_air_feeding_revision.md) and
[feeding-pose review](feeding_head_pose_revision.md) retain their dated candidate
checks and visual evidence. Earlier candidate-only/no-push labels are historical
for this accepted scope. No additional gameplay proposal, tag, separate GitHub
Release or personal Skill update is included. Existing preview services, assets
and runtime archives remain.

## Verification and delivery

Candidate evidence includes 260 focused runtime checks, six HTTP server checks,
cold/warm/browser-restart cache probes, independent keyboard/touch air aiming and
real live-loop swallowing fixtures. The stronger feeding-pose pass had 179 focused
checks; the final Orca-only reduction passed 42 related checks and a native
three-meal capture. These results retain their exact tested scope and do not
establish physical-phone performance or an unassisted full expedition.

Publication checks and exact-commit deployment receipts are retained in the
ignored `release_v0_11_30_20261118` task folder. Package metadata and both localized
menu footers identify v0.11.30. Both README languages link this release; screenshot
captions preserve their actual v0.11.28 capture provenance.

The initial full publication run exposed a test-only ordering mismatch for
fingerprinted names containing underscores. Its expected cache manifest used
locale-aware sorting, while the reproducible build uses fixed character order.
The assertion now uses that fixed ordering and still compares every resource
path and byte size. Runtime behavior and the delivered art are unchanged by this
publication correction.

Fresh publication checks pass: all 2,376 Node tests, six actual HTTP server
checks, repository formatting and the production build. The focused build tests
also pass after the test-only correction. The existing main-push Pages workflow
independently runs tests, formatting and build before deploying.

Formal delivery is <https://stanatny.github.io/abyssal/>. Completion requires the
authorized main push, its successful exact-commit deployment, matched formal
runtime assets and native Pages entry/cache checks. Host-side checks do not
establish every user's network or physical-device performance.
