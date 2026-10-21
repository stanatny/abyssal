import { RecordedAudioBank } from "./recorded_audio_bank.js";

/** 用户试听选定的四段拟音；来源、处理和哈希见 docs/audio_sources.md。 */
export const COMBAT_AUDIO_URLS = Object.freeze({
  ordinary: new URL("./assets/audio/combat_ordinary.wav", import.meta.url).href,
  yellow: new URL("./assets/audio/combat_yellow.wav", import.meta.url).href,
  hurt: new URL("./assets/audio/combat_hurt.wav", import.meta.url).href,
  lord: new URL("./assets/audio/combat_lord.wav", import.meta.url).href,
});

export class CombatAudioBank extends RecordedAudioBank {
  constructor(options) {
    super(COMBAT_AUDIO_URLS, options);
  }
}
