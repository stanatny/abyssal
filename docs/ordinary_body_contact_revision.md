# Ordinary large-creature body contact — 2026-10-22

The user accepted the delivered body-contact and post-bite rear-follow candidate
on 2026-10-22 and requested a local commit. All delivered input hashes match
before acceptance-only notes. Verification below keeps its original dates and
limits; earlier pending-review labels are historical. No push is requested.

The user accepts the silhouette/interior display and requests a local commit,
then reports that fish bodies pass through one another in the chase video.
The accepted display is saved as `2f66234`, without push. This separate contact
candidate remains uncommitted and awaits player review.

## Diagnosis

The ordinary-creature loop checks swept mouth attacks and applies a five-metre
knockback only when damage succeeds. It does not otherwise separate a hunter's
trunk from the player. The chase target can therefore converge on the player
centre, including during ordinary post-hit invulnerability. Lords already have
a separate articulated core-collider path.

A native Atlantis reproduction stages a 3 m player and a 28 m Ichthyotitan,
then leaves the normal movement/AI loop running. Both normal-health and
invulnerable cases converge to about 0.01 m between their centres. The existing
visible-mesh inside query returns false for the generated hollow shell; that
result must not be used as evidence of no body overlap. The accepted camera-near
fill is a rendering helper, not a physics collider.

## Candidate behavior

- Ordinary creatures at least 8 m long receive compact trunk sections fitted
  before static mesh batching. All 44 current ordinary kinds in this size class
  are covered. Lords keep their existing colliders.
- Body blocking applies only while an ordinary creature is alive/available and
  at least as long as the player. Smaller edible prey keep the original feeding
  path. Damage immunity and attack cooldown do not disable body contact.
- Player movement uses the existing swept multi-sphere solver against nearby
  trunks. NPC movement uses a relative sweep; the NPC yields or slides at
  contact instead of continuing through the player or continuously carrying
  the player forward. Existing world navigation and floor/boundary constraints
  still apply. Initial/growth overlaps are resolved in the same frame.
- Bite contact is settled before the NPC correction. The front of a trunk
  reserves the existing mouth interaction region. A roster-wide attack check
  catches oversized heads that would otherwise block their own bite. Damage,
  bite cooldown, feeding size thresholds, rewards and lord rules are unchanged.
- The follow camera and accepted silhouette/interior passes are unchanged.
  A large opaque animal can still block the lens or terrain: physical camera
  penetration remains the earlier accepted trade-off.

This is a kinematic **player-to-large-creature trunk** constraint, not a full
rigid-body engine or exact triangle-level collision. Fins, jaw openings and
soft appendages retain motion clearance. Ordinary NPC-to-NPC, minion-to-ordinary
body separation and small-fish crowd physics are outside this change. A small
amount of skin/appendage intersection is still possible around approximate
sections; the purpose is to prevent sustained interpenetration of main bodies.

## Implementation and costs

`ordinary_body.js` prepares shared rest profiles from actual geometry. Generated
skins exclude limb-weighted vertices; procedural models use a bounded set of
volumetric body pieces. Stable cross-sections use at most 64 skin samples each;
centres follow posed displacement, while section radii remain stable. Mouth
clearance is applied in model-root coordinates before batching. Source vertices,
materials, rigging and accepted models are not modified.

Only nearby bodies are updated, with a segment broad phase and a separate
zero-length query path. Profiles use weak geometry keys, instance sections keep
no GPU resources, and no new model/texture downloads or render passes are added.
This nevertheless adds CPU collision work; no physical-phone frame-rate or
thermal improvement is claimed. Scene-owned section state retires with the
existing creature population.

## Evidence

Evidence directory: `.local/creature_contact_20261022/`.

- `baseline/`: normal and invulnerable native reproductions of centre overlap.
- `targeted.log`: current 44-kind body sweeps/transforms, high-speed relative
  sweeps, all large-predator mouth reach, edible/retired/small/lord exclusions,
  and unchanged skin buffers/independent instance state.
- `final_1280/` and `final_390/`: staged close encounters with the real movement
  loop, normal damage, sprint/turn escape, pause and game-camera recordings.
  Side stills use an explicitly temporary inspection camera; they are not the
  gameplay camera. The 390 px case is desktop touch emulation, not a phone.
- `full_final.log`: complete regression after the final runtime change.
- `artifacts.json` and `public/report.json`: rebuilt preview byte checks and
  native production flows after delivery preparation.

Earlier `first_candidate`, `review_*` and `side` receipts precede the final mouth
clearance correction and are retained as diagnostic history. Final counts and
public-build identity are recorded in the delivery receipt rather than treating
an earlier preview as the current one.

## Current verification receipt

All 1,568 tests and formatting checks pass after the final runtime change. Six
native close-encounter cases produce 801 recorded samples with no fitted-core
overlap; damage, escape and pause work. This is not a claim of zero intersection
at every animated appendage. Camera functions match the accepted commit exactly.

The preview builds to `index-BTyVNBxh.js`: 260 runtime files, 78,116,706 bytes,
all downloaded and SHA-256 matched against dist from loopback and public HTTPS.
Eleven source/directory paths remain denied and all four service identities are
retained. The first subsequent native public review completes its six flows but
fails its clean-network assertion: the tunnel loses a QUIC connection at
08:30:08 UTC and automatically reconnects at 08:30:17 UTC, producing HTTP
502/530 resource failures. `public/report.json` keeps that failure; the fresh
`public_retry/report.json` records the same-address recheck separately.

The first retry fails navigation with `ERR_CONNECTION_CLOSED`. A later public
index/entry recheck returns matching HTTP 200 responses, and the final fresh
`public_smoke.json` passes Atlantis start/sprint/pause/resume/Home/same-address
refresh with no page or resource failures and no production debug hook. The
complete bilingual six-case production suite passes through loopback in
`production_local/report.json`. These receipts preserve the intermittent public
network failure rather than calling the first run clean; a user's external
connection and physical phone are still unverified.

## Post-bite trailing follow-up — 2026-10-22

The user's next feedback requests staying behind after a successful bite and
preparing the next attack, rather than sliding ahead. The initial contact
candidate still chased the player centre at full pursuit speed; body separation
alone could turn that motion into a side pass. This follow-up changes pursuit
intent while retaining the trunk constraint.

`hunter_tail_follow.js` supplies a rear target based on the existing mouth
reach and both body lengths. After an actual damaging bite, an eligible ordinary
large swimming hunter approaches that target with bounded pursuit speed and
arrival braking. Measured player movement provides feed-forward; a blocked
player does not supply a fictional forward speed. The waiting gap closes during
the final 0.65 seconds of the existing bite cooldown. A second bite still
requires the original swept mouth contact, line of sight, damage eligibility and
cooldown. No automatic repeated damage, teleport, attachment or stamina charge
is introduced. The five-metre hit knockback remains unchanged.

A landed special strike can brake rather than continuing through its victim.
The next special attack retains its existing windup and locked attack path;
following does not change ability timers or damage multipliers. Each hunter owns
its follow state, which retires with the existing hunter lifecycle. Ending the
hunt, losing threat eligibility or becoming edible clears the follow intent.
Terminal modes stop simulation; a new population recreates the hunter state. Lords, land/air/benthic movement and edible prey remain
on their existing paths. Sharp reversals and obstacles can interrupt ideal rear
alignment: this is a steering goal, not a positional guarantee overriding the
world or the player's movement.

Evidence: `.local/hunter_tail_follow_20261022/`. Four new focused tests exercise
repeated reachable bites across 8–60 m hunters, stationary arrival, bounded curved
pursuit, sprint separation, special-strike transitions and state recreation.
The existing five body-contact tests remain intact. Native fixtures stage an
encounter once, then run real movement and attacks without per-frame NPC pinning:
three species receive straight/repeated-bite/sprint checks, two receive turn and
special-burst checks, with pause checks. The 390 px cases are desktop touch
emulation, not physical-phone evidence. Side stills are explicitly inspection
views; videos use the unchanged game camera.

The initial desktop straight run precedes the final landed-special braking
addition; those idle-phase cases do not exercise that added branch. The
subsequent touch and turn/burst receipts use the final runtime source. Final
build identity, regression counts and public delivery are recorded below after
verification. The previous contact candidate's receipts above remain historical.

### Follow-up verification receipt

All 1,572 tests, including the nine focused pursuit/contact cases, and formatting
pass. The eight staged native cases record 1,146 samples with no fitted-core
overlap. All post-hit samples keep the hunter centre behind the player's forward
plane in these tested straight/turn trajectories; this is not an all-geometry
or arbitrary-turn guarantee. The six straight cases each land a second legal
bite, and all sprint finishes open distance. The special case observes actual
windup, active and recovery phases. Pause checks pass. Camera functions compare
exactly with the preceding candidate; all previous asset, contact-profile and
attack-rule source hashes are preserved. No physical phone is tested.

The same preview now serves `index-DwyFbaHQ.js`: 260 files, 78,118,310 bytes,
all freshly downloaded from loopback and public HTTPS and SHA-256 matched to
dist. Eleven source/directory paths remain denied; all four process identities
are unchanged. The initial native browser navigation times out before loading.
A fresh native Chrome run with a process-local `--no-proxy-server` flag passes
start/sprint/pause/resume/Home/same-address refresh, with no failed responses or
page errors and no production debug hook. System proxy settings are not changed.
The failure and successful direct run are both retained (`public_smoke.json`,
`public_direct.json`); the direct check is not proof that every external network
will behave identically. This candidate remains uncommitted and awaits review.
