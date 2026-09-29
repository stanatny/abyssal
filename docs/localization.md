# Localization and documentation language

Project documentation, README files, development rules, and project Skill instructions are written in English. The game supports Simplified Chinese (`zh-CN`) and English (`en`). Existing Chinese code comments remain valid; logs and error messages use English.

## Player experience

The first visit follows the browser's primary language: Chinese variants select Simplified Chinese; other languages select English. The language selector appears in the header and is enabled only on the home screen. The language remains locked during launch, play, pause, and results; returning to Home ends the expedition and unlocks selection. The pause/results panel does not contain a language selector. An explicit choice is stored under `abyssal-language`. Storage failures leave switching usable for the current page.

A language change updates menu copy, character abilities, HUD, radar, sonar labels, warnings, results, guide entries, and reward/territory labels in the 3D world. It does not restart the round, change the selected character, reset a skill cooldown, or alter balance. The guide retains the selected category/entry and model cache. Search accepts Chinese names, English names, and scientific labels. Settings, guide filters, and details retain their ordinary scrolling behavior on narrow screens.

The visible language option names remain in their native forms so players can recover from an accidental selection. Character names, ability names, and gameplay numbers use the same underlying configuration in both languages.

## Authoring copy

`src/i18n.js` provides locale selection, translation, structured messages, change subscriptions, and controlled DOM updates. English translations live in `src/locales/ui_en.js` and `src/locales/catalog_en.js`. Existing Chinese source strings serve as translation keys; keep their spelling and punctuation consistent.

- Use `t(source)` for a literal or configured label, and the `tr` tagged template for immediately rendered parameterized copy. Keep variable values as parameters instead of concatenating translated fragments.
- Use the `message` tagged template for a notification that may remain visible across a language change. The notification owner translates it when rendered, preserving nested names and numeric parameters.
- Add a matching English entry for every new player-facing source string. Numbered placeholders identify template parameters and must be preserved. Do not translate stable IDs, class names, file paths, or gameplay values.
- Use `setMarkup` for controlled UI templates and `translateDOM` when mounting static UI. Neither uses a mutation observer nor adds an animation loop. Repeated identical markup is cached. These helpers are for trusted project templates, not untrusted HTML.
- Regenerate derived catalog text on a language change. Update only display state: do not recreate a character, reset the simulation, allocate another guide renderer, or start another guide RAF.
- World-space Canvas labels redraw into their existing texture. Unsubscribe from locale changes when the texture is disposed. Never replace a scene just to translate its labels.

The ordinary species, character, reward, ecology, and combat configurations remain the source of gameplay values. English text must preserve those values and any distinction between game scale, natural history, and fantasy creatures.

## Verification

Run the relevant checks while the development server is available:

```bash
npm test
npm run check
npm run build
npm run test:browser
node scripts/verify_i18n.mjs
```

The bilingual browser verifier uses the real language controls, checks persistence and preserved state, inspects guide content and model reuse, and captures desktop, small portrait, and landscape layouts. It writes evidence to ignored `.local/i18n_verification/`. Browser emulation is not real-phone acceptance, and a language-only change does not revalidate audio quality or a natural full round.

The main gameplay verifier explicitly uses a Chinese browser locale so its existing text assertions do not depend on the developer's system language. For local Vite testing, operate the page's language controls instead of importing a second unversioned copy of an HMR module: a second module instance has independent state and cannot reliably test the loaded application.

See [verification](verification.md) for the checks actually completed for the current candidate. A candidate remains unpublished until the user authorizes the applicable commit and release.
