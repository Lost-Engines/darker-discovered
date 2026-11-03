# Research article maintenance notes

The public articles explain the retail mechanisms and the two archived demo
packages. This file keeps verification details out of the reading flow. Paths
below refer to the sibling `darker-reverse` checkout unless stated otherwise.

## Sound

| Subject | Source |
| --- | --- |
| Driver/resource selection and note-command counts | `docs/audio-investigation.md`, `docs/music-hardware-variants.md` |
| Scheduler, 24 event-stream comparisons and per-driver differences | `docs/music-hardware-variants.md`, section “Runtime sequencer verification” |
| LAPC instrument uploads and missing rhythm entries | `analysis/audio/variants/lapc1-initialisation.json`, native initialiser results described in the hardware notes |
| Independent loop boundaries | `analysis/audio/roland-gm-percussion-bank/native-loop-trace.json`, hardware notes; integers 9168/8784 and 4608/768 are musical ticks |
| AWE32/GUS native integration and polling-audio correction | Hardware notes, “Native AWE32 and Gravis playback” |
| Effects detection and zero FM effect sends | `docs/sound-effects.md` |
| Scene assignments | `analysis/presentations/music.html`, `docs/music-hardware-variants.md` |

The embedded comparison uses complete group-6 loops from the existing native
collection, without copying audio into this repository. Configuration and source
hashes are in its `manifest.json`, engine commit
`ce0cb6169bb287838f318cc65de2f4cabab41a21`. It contains DBOPL, AWE32/EMU8000,
UltraMID 1.12/GF1 at 1 MiB, Munt/CM-32L 1.02 and SC-55 renders. SC-55 is attenuated
6.0206 dB as in the source export. The playback selector retains media time; it
does not resynthesise or level-match the files. These are emulated recordings.
The corrected Roland mixes are explicitly identified as edited listening
references. Music credit remains PC Music.

## Missions

| Subject | Source |
| --- | --- |
| 124 records, world setup, configurations and template formats | `docs/mission-scripts.md`, `analysis/missions/scenarios.json` |
| Queue order, activation and counted-object state | `docs/mission-activation.md`, `analysis/missions/activation-verification.json` |
| Continuations, deadline arithmetic, checkpoints and mission-one example | `docs/mission-scheduler.md`, `analysis/missions/scheduler-verification.json` |
| Callback order and same-update versus next-update activation | `docs/mission-update-order.md` |
| Seven embedded x86 blocks | `docs/mission-native-setup.md` |
| Shared blackout and Nightmare | `docs/blackout-missions.md`; distinguish the fixed-step shared replay from combat-gated Nightmare |
| Persistence, eligibility counts and outcome handling | `docs/persistent-cell-state.md`, `docs/city-retry-and-selection.md`, `docs/save-file-format.md` |

The mission-one table is a controlled original-code trace. Its objective count
is supplied by the fixture, and its starting clock is arbitrary. It is described
that way in the article. We do not assign the synthetic time 1000 to a point in
an actual playthrough. Native notes contain old “remaining work” paragraphs;
later sections and results supersede the earlier claims about setup/exit paths.

## Combat

`docs/weapon-behaviour.md` supplies strength/resistance arithmetic, the recovery
shift, hit-count table, guidance and special-weapon routines. The Terrablitz
identification follows the manual/model comparison; the older “probable” label
in one table is stale. `docs/player-collision-and-damage.md` supplies swept
collision and the type-11 player-response exception. The real-model census is
`analysis/flight-physics/player-collision-verification.json`.

The diagram is a schematic entrance, not a reconstructed office collision mesh.
Types 86–89 have five protected volumes and one recessed vulnerable volume;
the article links the inspector for their full geometry. The warehouse block
is **type 76**; type 77 must not be substituted for it.

The calculator repeats equal successful ordinary-aircraft hits. For strength
S and resistance R, D is 1 below/equal R, 65536 at/above 2R, otherwise
`257 * floor((256*(S-R)+R)/R) + 1`. With recovery H per interval and D below
65536: D <= H prevents accumulation; otherwise the required count is
`1 + ceil((65536-D)/(D-H))`. H is whole ticks times `2**shift`. Ground targets,
special scripted objects, player shields and weapon travel are outside this
calculator. Their mechanisms are distinguished in the surrounding prose.

## Loader

`docs/executable-unpacking.md`, `tools/unpack_exe.py` and
`analysis/unpacked/manifest.json` provide the five-byte handler, transformations,
token counts, fourteen relocations and recovered startup state. Canonical image:
`7599201a01aa24b7e6ad1ae4295d493821cde7c3a43b247c464522626c0380a4`.
The unpacked image was matched to an independent DOSBox capture. The A0/B0
illustration and AB overlap example are teaching diagrams, labelled accordingly.
No commercial packer identity or development-tool brand is asserted.

## Demo history

| Subject | Source |
| --- | --- |
| Packages, dates, resource counts and fonts | `docs/demo-releases.md`, `analysis/demos/manifest.json`, `analysis/demos/font-comparison.json` |
| Full X/X1/X2 address-normalised comparison | `analysis/demos/early-build-normalization.json` |
| City changes | `analysis/demos/map-comparison.json`; SVG checks against this site's committed map arrays |
| Dish and indirect model references | `analysis/demos/content-reference-audit.json` |
| Name-based scenario selection and actual later menu paths | `analysis/demos/save-scenario-selection.json` and native checks in the demo notes |
| 17 distinct scripts and Nightmare timing | `analysis/demos/scenario-analysis.json`, `analysis/demos/nightmare-timelines.json` |
| Recharge, timer caps, configuration gains and Skimma changes | `analysis/demos/boost-comparison.json`, `steering-startup-comparison.json`, `runtime-setup-comparison.json`, corresponding sections of `docs/demo-releases.md` |
| Dual Launch evolution | `analysis/demos/weapon-path-verification.json`, `followup-verification.json` |

Package labels are used as snapshot names. We do not assign every file a proven
1993/1995 build date. The occupancy diagram compares occupied/empty cells and raw
type IDs, with model-bank differences explained in its caption. The dish image
is the existing modern-viewer rendering, not gameplay footage. Timed demo
messages use the native script clock, not DOSBox wall-clock measurements.

## Figures and checks

`scripts/render-research-diagrams.py` regenerates the eleven SVGs from explicit
schematics, documented arithmetic and committed map arrays. It uses Python's
standard library and is an optional maintainer step; normal builds need only
Node. `public/data/research-articles-provenance.json` lists figures and audio
sources. No generated bitmap art or new emulator captures are used.

Before publishing: `npm run build`, `npm run check`, then inspect desktop/mobile
layouts, all five audio sources, retained playback position, damage boundary
cases and the JavaScript-disabled fallbacks. Verify external links including
section fragments; those live on a separately maintained site.
