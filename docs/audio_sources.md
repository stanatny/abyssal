# 音频素材来源与处理记录

v0.6.7 的成年男女惨叫改用真人表演录音，替代 v0.6.6 的合成人声。v0.6.8 将鱼类吞食改为由 CC0 水声拟音制作的三个短变体。配乐与其他既有程序音效继续沿用各自实现；不能将当前全部音频描述为原创合成。

## 真人录音来源

| 用途     | 作者与来源                                                                                     | 使用文件                               | 许可                                                 |
| -------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| 成年男声 | HaelDB · [Male Grunt/Yelling sounds](https://opengameart.org/content/male-gruntyelling-sounds) | `yelling sounds.zip` 中的 `3yell1.wav` | 来源页同时提供 OGA-BY 3.0 和 CC0，本项目选择 CC0 1.0 |
| 成年女声 | AuraVoice · [Female Scream 1](https://opengameart.org/content/female-scream-1)                 | `female_scream_1.ogg`                  | CC0 1.0                                              |

女声页面的上传账号为 `Nocturnal_Vanguard`，正文表演者自述为 AuraVoice；此处同时保留两者，避免将上传账号与表演者混淆。两份素材均按来源页提供的 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) 使用，本项目仍记录作者和链接便于追溯。

本地来源页面快照为 `.local/v6_7_audio_sources/male_source.html` 和 `female_source.html`；原压缩包、原音频与处理中间文件也留在该目录，不作为运行时依赖。运行时使用随应用打包的两份 WAV，不从素材网站临时播放声音。

## 裁切与成品

| 用途     | 原文件裁切区间 | 成品时长 | 运行时文件                          | 字节数  |
| -------- | -------------- | -------- | ----------------------------------- | ------- |
| 成年男声 | 0.37—2.02 秒   | 1.65 秒  | `src/assets/audio/human_male.wav`   | 105,644 |
| 成年女声 | 0.55—1.55 秒   | 1.00 秒  | `src/assets/audio/human_female.wav` | 64,044  |

两份成品均为 32,000 Hz、单声道、16 位 PCM WAV。离线处理包括 65 Hz 高通、0.008 秒淡入、0.17 秒淡出和峰值归一至 0.68；未做变调或时间拉伸。处理记录中的归一增益分别为男声 `1.2458238747553816`、女声 `1.1128538607531715`。

最终文件的 SHA-256：

```text
human_male.wav
  a10a5ea757e7ef37013be68a7905b85a417fa0bd71d79263449de1360f9434bf
human_female.wav
  66597d35c4bb7b7c44c673a5270200658e4d777924f15be348581ae272e1cebd
```

以上时长、大小与哈希对应 `.local/v6_7_audio_sources/processed.json`，已与工作区运行时文件核对。更新录音或重新处理时应同步本记录，不将中间试听文件的哈希当作最终资产哈希。

## 游戏内播放

v0.6.7 由 `human_voice_assets.js` 预取两份资产；v0.6.8 将共用预取与按音频上下文缓存解码的逻辑放入 `RecordedAudioBank`，人声仍使用独立实例。`audio.eatHuman(length, sex)` 使用实际被捕食人物的性别选择样本。播放速率固定为 `1`，保留原音高和原速度。

人声前半程低通截止频率维持 7,800 Hz，后半程逐步下降，在样本进度 94% 时到达 950 Hz，模拟入水后的闷化。该处理属于运行时滤波，不是离线改写音高。静音、暂停、重开和并发人声管理仍由现有音频生命周期处理。

本记录说明来源、许可标注和处理参数，不代表已完成主观试听或真实设备听感验收。浏览器播放、捕食路由、失败重试和预览结果统一见 [验证记录](verification.md)。

## v0.6.8 鱼类吞食水声来源

作者 **jcpmcdonald** 的 [Skippy Fish Water Sound Collection](https://opengameart.org/content/skippy-fish-water-sound-collection) 以 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) 提供水声。本轮使用 `water.wav`、`waterReentry.wav` 和 `bubbles.wav`；来源页面快照为 `.local/v6_8_audio_sources/source.html`，原件与处理回执保存在同目录。

作者说明素材用水杯、吸管、木棒和自己的声音拟制。它们是水声拟音，不能标注为真实海下捕食实录。本项目未使用该素材集中的人物叫声；成年男女仍使用前述 v0.6.7 的两份真人表演录音。

| 原文件             | 用途             | SHA-256                                                            |
| ------------------ | ---------------- | ------------------------------------------------------------------ |
| `water.wav`        | 主要吸入水流     | `6107b595a7f1c19a1fde61200726726e31aec98af6de31aef00048ea336a973e` |
| `waterReentry.wav` | 较低沉的咬合冲击 | `7c07d1f0ee7d2fe140a4327f8be194b8cd72a0ea05077724f8f7d195e6b25b8e` |
| `bubbles.wav`      | 较轻的气泡尾声   | `c4f0a47bd5eaa3c4a5a34a1889c6189661360fb874ebf120147f3cc98fc84165` |

### 可复现处理

`scripts/process_fish_audio.mjs` 接收含三个原始 WAV 的目录，第二个可选参数为输出目录；该工具依赖本机 `ffmpeg`，不参与运行时构建。例如：

```bash
node scripts/process_fish_audio.mjs .local/v6_8_audio_sources src/assets/audio
```

三路素材都先经 70 Hz 高通，再分别经 1,450、700、900 Hz 的二阶低通，转为 32,000 Hz 单声道，并将各自 RMS 缩放至 0.16。随后按下表截取混音；三路权重始终按水流／冲击／气泡排列。

| 成品              | 时长    | 三路取样偏移（秒）    | 三路权重           | 文件字节数 |
| ----------------- | ------- | --------------------- | ------------------ | ---------- |
| `fish_bite_0.wav` | 0.34 秒 | 0.018 / 0 / 0.070     | 0.75 / 0.26 / 0.10 | 21,804     |
| `fish_bite_1.wav` | 0.36 秒 | 0.036 / 0.014 / 0.190 | 0.66 / 0.32 / 0.13 | 23,084     |
| `fish_bite_2.wav` | 0.38 秒 | 0.006 / 0.027 / 0.310 | 0.82 / 0.21 / 0.09 | 24,364     |

冲击层延后 0.022 秒并按 0.12 秒时间常数衰减，气泡层延后 0.075 秒并按 0.13 秒时间常数衰减；总包络为 0.018 秒淡入、末尾 0.10 秒的平方淡出。最终各文件峰值归一至 0.60，输出为 32 kHz、单声道、16 位 PCM WAV。未加入正弦气泡振荡器。

成品位于 `src/assets/audio/`，处理回执为 `.local/v6_8_audio_sources/processed.json`，SHA-256 如下：

```text
fish_bite_0.wav
  62ac9c6030c4c823b5217d4e13d1219dc4f840ee49db4e445e59c04e4046f929
fish_bite_1.wav
  c7b9a22b51b4a5e6c33c0c440e870c7beff456543be7130b6185ea5a55e7425b
fish_bite_2.wav
  7942fdcc34e9496d6cdd00afbc9eb04ffe171b6fdffdd668043721ac331f495d
```

### 游戏内鱼声播放

三个变体相邻不重复，播放速率为 `0.97—1.03`，基础增益为 `0.32`，另沿用体型音量缩放。鱼声与人声使用独立录音库实例，共用 `RecordedAudioBank` 实现；任一类别加载失败不要求另一类别同时等待。

鱼声尚未就绪或加载失败时，当次立即使用 0.30 秒、峰值 0.30 的轻柔滤波噪声回退，不排队补播。以上为实现参数和来源记录；主观听感与浏览器验收仍以本轮 [反馈记录](feedback_v0_6_8.md) 和 [验证记录](verification.md) 为准。
