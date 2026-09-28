import { RecordedAudioBank } from "./recorded_audio_bank.js";

/** 以CC0水声拟音制作的三个吞食变体，素材来源见docs/audio_sources.md。 */
export const FISH_BITE_URLS = Object.freeze({
  0: new URL("./assets/audio/fish_bite_0.wav", import.meta.url).href,
  1: new URL("./assets/audio/fish_bite_1.wav", import.meta.url).href,
  2: new URL("./assets/audio/fish_bite_2.wav", import.meta.url).href,
});

/** FishBiteBank 只负责下载与解码，声音选择和限流由OceanAudio管理。 */
export class FishBiteBank extends RecordedAudioBank {
  constructor(options) {
    super(FISH_BITE_URLS, options);
  }
}
