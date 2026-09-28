# v0.6.3 Slow reef prey and system-themed Ocean Guide

This round builds incrementally on uncommitted v0.6.2. The user wanted more slow shallow-water prey, similar to sunfish and suitable for juveniles, plus a desktop guide that follows system appearance. Local visual snapshot `94c2a95` remains the baseline; no commit or push. Official Pages remains v0.5.1.

## Three additional shallow-water fish

| Species             | Game length | Population / school size | Base speed | Game depth | Nutrition / growth |
| ------------------- | ----------- | ------------------------ | ---------- | ---------- | ------------------ |
| Longhorn cowfish    | 0.45 m      | 8 / 2                    | 2          | 5–22       | 10 / 0.024         |
| Bumphead parrotfish | 1.3 m       | 8 / 4                    | 2.4        | 7–28       | 20 / 0.045         |
| Humphead wrasse     | 1.7 m       | 4 / 2                    | 2.6        | 10–32      | 23 / 0.055         |

All belong to Shallows & Schools and do not attack. Eight schools remain near spawn instead of relocating after the player. Their smaller alarm ranges let ordinary cruise catch up. They still avoid close approaches rather than acting as stationary pickups. Existing seabed/collision constraints, respawn, juvenile growth, and healing-first rules remain. Speed, depth, and nutrition are balance values; displayed depth is still world depth ×4.

The models share skin/geometry caches with independent movement instances. Cowfish has paired horns, spots, and box-shaped armor; parrotfish has a high forehead and fused beak; wrasse has thick lips, facial patterns, and a long dorsal fin. All enter the guide. Ordinary creatures now total **24 types and 235 individuals**, Shallows & Schools **13 types**, and the guide **35 character, creature, and human-activity entries**, plus three reward types.

Rules tests starting at 3 meters and full health yield approximately 3.98 / 4.01 / 4.59 meters after 12 consecutive cowfish / parrotfish / wrasse respectively. This is neither a natural-play timing prediction nor a guarantee of consecutive catches of one species.

## Following system appearance

The guide uses `prefers-color-scheme`: a warm-white archive in light mode and a deep teal archive in dark mode. Changing system appearance while it is open updates immediately without reopening or refresh. Phones follow the same logic.

Backgrounds, text, search, focus, selected categories, rewards, scrollbars, and the 3D display change together. Preview changes adjust only existing lights/exposure, adding no renderer, environment map, cache, or animation loop. Closing and reopening retain model caches. Other game screens retain their deep-sea appearance independently.

## References and design boundaries

- [National Aquarium: Longhorn Cowfish](https://aqua.org/explore/animals/longhorn-cowfish): armor, horns, distribution, and length up to about 20 inches. Real cowfish have toxin defenses, not implemented here; easy in-game feeding is not real-world dietary advice.
- [NOAA Fisheries: The Fish That Shapes the Reef](https://www.fisheries.noaa.gov/science-blog/fish-shapes-reef): bumphead parrotfish can reach about 1.3 meters; high forehead, fused beak, and shallow-reef schooling inform the model/distribution.
- [Georgia Aquarium: Humphead Wrasse](https://www.georgiaaquarium.org/animal/humphead-wrasse/): the roughly 1.7-meter game scale references the high forehead, thick lips, blue-green body, and pectoral propulsion. Slow swimming and low escape speed serve juvenile feeding, not a claim that these animals cannot evade threats.

Actual checks and temporary-preview artifacts are in [verification](verification.md). Browser viewport emulation and isolated feeding scenes are not real-device or complete natural-round acceptance.
