# Editorial evidence map

Paths below refer to the separate full analysis checkout, not public site
links. They let an editor verify claims without shipping the technical archive.

| Article subject | Primary investigation evidence |
| --- | --- |
| Loader interleaving, 64 KiB image and independent match | `docs/executable-unpacking.md`, `tools/unpack_exe.py`, `analysis/unpacked/manifest.json` |
| Geometry interpreter and shared definitions | `docs/model-bytecode.md`, `docs/model-components-and-aliases.md` |
| Cell layout and corrected orientation | `docs/resources-and-city.md`, `docs/city-scene.md`, `tools/verify_city_orientation.py`, `tools/verify_city_placement.py` |
| Palette ranges, vertex shades and F9 | `docs/model-colours.md`, `tools/verify_model_colours.py` |
| Gates, fountain and model states | `docs/model-animation-and-states.md`, `tools/verify_model_animation.py` |
| Hidden prompt, exact phrases and limits | `docs/hidden-commands.md`, `docs/player-collision-and-damage.md`, `analysis/hidden-commands/ui/04-star-three.png` |
| Assembly inference and callback trick | `docs/build-provenance.md`, `docs/flight-physics-and-charging.md` |
| Audio component identification | `docs/audio-investigation.md`, `docs/music-hardware-variants.md` |
| Demo provenance, maps and X/X1/X2 | `docs/demo-releases.md`, `analysis/demos/early-build-normalization.json` |
| Demo model references and Nightmare | `analysis/demos/content-reference-audit.json`, `analysis/demos/nightmare-timelines.json`, `analysis/demos/followup-verification.json` |
| Speaker cue | `analysis/demos/speaker-path-verification.json`, `tools/trace_demo_speaker.py`, `tools/trace_demo_followups.py` |
| Reconstruction direction | `docs/reconstruction-direction.md` and the agreed two-stage project scope |

Editorial rules: distinguish a build/package date from an independently proven
binary date; a 64 KiB initialized image from the complete game; a model record
from unique geometry; no map placement from proven non-use; and a successful
native helper probe from an end-to-end gameplay validation. Do not describe
Nightmare as hidden, identify an assembler without evidence, or label vertex
shade pairs as texture coordinates.

Screenshots named `city-*` and `model-*` come from this site's modern renderer.
`star-three.webp` is a format-converted DOSBox evidence capture from the source
analysis. SVG diagrams are explanatory illustrations, not recovered originals.
