import { RecordedAudioBank } from "./recorded_audio_bank.js";
/** 四类任务事件，解谜家族共用mechanism；原始生成及处理记录见音频来源文档。 */
export const QUEST_AUDIO_URLS = Object.freeze({
  key: new URL("./assets/audio/quest_key.wav", import.meta.url).href,
  mechanism: new URL("./assets/audio/quest_mechanism.wav", import.meta.url)
    .href,
  guardian: new URL("./assets/audio/quest_guardian.wav", import.meta.url).href,
  chest: new URL("./assets/audio/quest_chest.wav", import.meta.url).href,
});
export class QuestAudioBank extends RecordedAudioBank {
  constructor(options) {
    super(QUEST_AUDIO_URLS, options);
  }
}
