# Polyphemus fast flight correction

2026-11-25 — completed local follow-up to review candidate e86a0c03fba35f8b. The player still found the actual rock too slow. No commit, push, version change or main publication is authorized.

## Changed behavior

Nominal flight speed is now **240 m/s**, up from 105 m/s. The minimum flight time is **0.16 s**, down from 0.45 s; the maximum remains 3 s. One shared policy feeds the actual trajectory, warning and Guide. The 6.8 s attack cycle, 1.8 s windup, locked aim, 0.42 palm release, 3 s recovery, damage, range, ring dimensions and accepted planted-body animation are unchanged.

The prior native records show roughly 99–139 m paths taking 0.946–1.320 s, so the visible problem was primarily the giant's 90 m scale, rather than the old minimum-time clamp. That clamp also slowed close throws: a 30 m path used to take 0.45 s. The new floor makes it 0.16 s. The short throw remains avoidable by reading the existing windup; this does not promise a post-launch close-range reaction window.

A fresh same-camera, same-initial-station observation measures the actual production path to its locked target:

| Build            | Measured path | Full target-flight duration |
| ---------------- | ------------- | --------------------------- |
| Previous 105 m/s | 99.56 m       | 0.948 s                     |
| New 240 m/s      | 102.30 m      | 0.426 s                     |

The target positions differ slightly because existing lead prediction consumes projectile speed. Real contact with the character can stop the stone before the locked target. The delivered clip uses original-speed footage from both versions; it does not accelerate playback.

## Verification and delivery

- 51 focused flight, projectile, combat-rule, Guide and record checks pass. New actual-HF palm/rock tests include 60/30/15 FPS flight durations, exact endpoints, a crossing hit whose frame endpoints both miss, finite-radius cover, one damage event, pause/resume and reset during the 0.16 s throw.
- A separate actual-ocean audit passes 120 lifecycle cases and 4 moving crossings for 25/30 m bodies, including 4 FPS intervals. Real pillars still intercept the stone; depth escape stays clear and every hazard ends.
- Both 25 m and 30 m native populated-world runs pass an outer-range throw, real unprotected hit, native turning/sprint and depth/sprint dodges, and three actual-skin counters. Body/stations are staged; NPC phase/timer/health/defeat and player protection are not written. These are controlled tests, not a natural full expedition.
- Accepted HF geometry, textures, rig/motion, food/nursery, four mechanisms and grounded Aeolus homecoming remain. Earlier records survive in their own buckets; this faster flight has a new Odyssey record identity.

Candidate [d473fa7bc7c5be76](https://abstract-socks-accomplish-buf.trycloudflare.com/?candidate=d473fa7bc7c5be76) is verified: 1,622 production/script inputs and all 1,012 installed artifacts match the frozen build. Eleven public resources, source-path denial, live refresh and unchanged Amazon preview pass. Compiled bilingual/narrow Guide shows the new 240 m/s value; native start/dive/pause/resume/home and reload pass without errors. Formatting and build pass. Evidence is in ignored `.local/polyphemus_fast_flight_20261125/`, including the previous source snapshot, true before/after observations, native 25/30 runs and low-frame-rate world audit. Existing services, Amazon work, formal main and previous runtime archives are preserved. No new FPS or thermal improvement is claimed.
