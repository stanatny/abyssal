"""从有 OFL 授权的志莽行书原件裁剪碑匾字库，并嵌入完整许可证。"""
from pathlib import Path
import argparse
from fontTools import subset
from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("--output", type=Path, default=Path("src/assets/fonts/penglai-brush.woff2"))
args = parser.parse_args()
font = TTFont(args.source)
options = subset.Options()
options.name_IDs = ["*"]
options.name_legacy = True
options.name_languages = ["*"]
subsetter = subset.Subsetter(options=options)
subsetter.populate(text="玄冥深潭玄武镇渊以气御剑")
subsetter.subset(font)
license_text = Path("src/assets/fonts/ZhiMangXing-OFL.txt").read_text()
for record in font["name"].names:
    if record.nameID == 13:
        record.string = license_text.encode(record.getEncoding())
font.flavor = "woff2"
font.save(args.output)
print(f"Local subset with embedded OFL: {args.output.stat().st_size} bytes")
