import { RecordedAudioBank } from "./recorded_audio_bank.js";

/** 真人表演录音随应用打包；来源、CC0许可与处理记录见 docs/audio_sources.md。 */
export const HUMAN_VOICE_URLS = Object.freeze({
  male: new URL("./assets/audio/human_male.wav", import.meta.url).href,
  female: new URL("./assets/audio/human_female.wav", import.meta.url).href,
});

/** 真人声音专用入口，保持男女录音独立缓存与原有构造参数。 */
export class HumanVoiceBank extends RecordedAudioBank {
  constructor(options) {
    super(HUMAN_VOICE_URLS, options);
  }
}
