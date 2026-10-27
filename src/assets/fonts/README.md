# Penglai brush inscriptions

`penglai-brush.woff2` is a local character subset of **Zhi Mang Xing Regular**
by Wei Zhimang, version 2.001. It covers `玄冥深潭玄武镇渊以气御剑` only and
serves Penglai world inscriptions; it does not replace general UI typography.

Source: <https://github.com/google/fonts/tree/main/ofl/zhimangxing>
License: [SIL Open Font License 1.1](ZhiMangXing-OFL.txt), retained in full.
The original upstream copyright/license are also retained in the font names.
No external font service is contacted during play.

Reproduce with `uv run --with fonttools --with brotli python
scripts/prepare_penglai_brush_font.py PATH/TO/ZhiMangXing-Regular.ttf`.
The script embeds the complete OFL in name record 13, so the built font carries
its license even when distributed without repository Markdown files.
