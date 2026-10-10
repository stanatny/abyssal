import { RecordedAudioBank } from "./recorded_audio_bank.js";

/** CC0分裂拟音与爆破素材制作的尸鲨技能声，来源与制作步骤见docs/audio_sources.md。 */
export const ZOMBIE_AUDIO_URLS = Object.freeze({
  fission: new URL("./assets/audio/zombie_fission.wav", import.meta.url).href,
  burst: new URL("./assets/audio/zombie_corpse_burst.wav", import.meta.url)
    .href,
});

/** 分裂/尸爆共用录音缓存；预取和解码不会创建或补播技能事件。 */
export class ZombieAudioBank extends RecordedAudioBank {
  constructor(options) {
    super(ZOMBIE_AUDIO_URLS, options);
  }
}
