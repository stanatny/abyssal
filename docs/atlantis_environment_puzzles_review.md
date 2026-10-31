# Atlantis puzzles — candidate withdrawn, 2026-10-30

The user rejected the five-family implementation after reviewing its videos:
the objective and win/loss conditions were unclear, and the activity should be
between the shallows and Poseidon Temple. The prior technical passes do not
constitute player acceptance. The replacement is a
[design proposal](atlantis_environment_puzzles_design.md), not a second build.

## Rollback scope

All 28 modified/untracked candidate files matched the prior final SHA-256
inventory before rollback. Their exact contents, binary-capable Git diff and
hash manifest were preserved in:

`.local/atlantis_puzzles_redesign_20261030/`

The complete original design and review are retained under
`withdrawn_candidate/docs/`; prior videos, successful technical receipts and
failed attempts remain in `.local/atlantis_puzzles_20261030/`.

The tracked candidate changes were restored from accepted local checkpoint
`ba1eb8dbbd14912897c26ca1f490ebf1e1364c24`. Only the backed-up untracked candidate
files were removed. The working tree was clean immediately after restoration.
Subsequent edits are limited to README, HANDOFF and these two documentation files.
Source, tests, assets, score rules, locales and key candidates match the accepted
checkpoint. No commit, push, release or personal Skill edit was performed.

This restores the original key-and-guardian chest and all twelve original key
sites. Removing conspicuous plaque-adjacent key sites remains planned work; none
of the rejected implementation was silently retained as accepted behavior.

## Fresh verification

- Production build succeeds and reproduces accepted entry `index-ByVSSP5c.js`.
- 23 focused tests pass: Atlantis scene preparation, relic, hiding routes,
  expedition objectives and stored run rules.
- The restricted same-origin preview was rebuilt in place. HTML, entry JavaScript
  and CSS match the local build byte for byte; eleven private/source paths remain
  denied. The manager verified current build artifact hashes against runtime.
- Native desktop Chrome reloads the existing public origin into the restored
  entry with its normal cache path. Chinese and English Atlantis start, pause,
  resume and return home pass; the puzzle panel and new quest wording are absent.
  No captured JavaScript errors or failed resource responses were observed.
- Existing dev/restricted/tunnel/awake process identities were retained. This is
  desktop validation, not a physical-phone or full-expedition playthrough.

Preview: <https://saver-recorded-digit-could.trycloudflare.com/>.
An already-open old tab needs a refresh. Main/Pages is unchanged.
