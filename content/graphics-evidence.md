# Graphics-engine article: editorial evidence

The published page is built from `content/graphics-engine.md`. It describes the
1995 retail renderer, not the modern inspection viewers or Redux. C++ source
links are pinned to faithful-engine revision
`7cece8ab1208ef3771516a71f44ff88064c815ad`.

Paths in the following table belong to the sibling repositories. They are
editorial references, not deploy-time dependencies or local website URLs.

| Article claim / illustration | Evidence |
| --- | --- |
| 320 × 240 display; mode-13h startup followed by changed VGA timing | `darker-reverse/docs/executable-unpacking.md`; `darker-cpp/src/render/frame_layout.h` |
| 128 × 128 map; type/state; linked forms and placement | `darker-cpp/src/resources/geometry_bank.cpp`, `src/game/city_map.cpp`, `src/graphics/city_scene.cpp`; analysis `model-animation-and-states.md` |
| Stateful model bytecode and one-byte mirror commands | `darker-cpp/src/graphics/model_renderer.cpp`, `model_projection.cpp`; analysis `model-bytecode.md` |
| Camera projection, 256-pixel focal length, fixed-point scales and table quantisation | `darker-cpp/src/graphics/render_geometry.h`, `camera.cpp`, `near_clip.cpp`, `src/maths/view_basis.cpp`, `angle.h`, `sine_table.h` |
| Shared FCD3 fraction and BA opcode inclusion | `darker-cpp/docs/model_rendering.md`; native projection / animation fixture generators |
| Surface radius 15, underground radius 8, scan order | `darker-cpp/src/graphics/city_visibility.cpp`, `tunnel_visibility.cpp`; `docs/underground_visibility.md` |
| Extent-based admission, flat/point thresholds, backgrounds and sort keys | `darker-cpp/src/graphics/city_scene.cpp`; `camera.cpp`; native city-placement and object-sorting fixtures |
| Clipping at 32, asymmetric edge coverage and Gouraud integer spans | `darker-cpp/src/graphics/near_clip.cpp`, `flat_polygon.cpp`, `gouraud_polygon.cpp`; native fixture generators |
| 60/28 shade rows, 28 ordinary codes, depth + beacon adjustment | `darker-cpp/src/graphics/model_lighting.cpp`; native `model_lighting_samples.h` fixtures |
| Palette sources, special colour path, no established model bitmap textures | `darker-reverse/docs/model-colours.md`; `darker-cpp/src/graphics/model_renderer.cpp` |
| Shade-table interactive demonstration | Exact 28-row and 60-row table hashes checked against original x86 fixture hashes: `5053c42f6103ef0e` and `365a28a9b55f706d` (FNV-1a over row-major bytes) |
| Sky/ground bands and steep-pitch shortcut | `darker-cpp/src/graphics/sky_ground.cpp`; native background fixtures |
| Nearest nine-cell lattice lookup; dim lamps need not disappear | `darker-cpp/src/graphics/city_scene.cpp`, `model_lighting.cpp`; decoded type-11 colour commands. Do not equate regional visual light with charging or radar coverage. |
| Fountain reflection heights, colours, absence of alpha and order | `darker-reverse/docs/model-components-and-aliases.md`, type-101 bytecode; `docs/model-animation-and-states.md` |
| Fountain six heights and 2048-tick period | `darker-cpp/src/graphics/model_renderer.cpp`; analysis timer/animation comparisons |
| Fixed emitter/trail pools and discrete sprite sizes | `darker-cpp/src/game/effects.h`, `src/graphics/particles.cpp`, `docs/particle_effects.md` |
| Source atlas versus cockpit cache; masks and update history | `darker-cpp/docs/cockpit_rendering.md`; `src/graphics/cockpit.cpp`, `blit.cpp` |
| Original creator credits | `darker-reverse/darker/READ.ME`, also transcribed in `docs/executable-first-pass.md` |
| Gouraud predates Darker | Gouraud, *Continuous Shading of Curved Surfaces*, IEEE Transactions on Computers, June 1971, DOI `10.1109/T-C.1971.223313`. Publisher metadata checked through Crossref. |
| Doom comparison | id Software's released `linuxdoom-1.10/r_bsp.c`; no performance comparison or claim of historical superiority. |

## Scope of the figures

`public/data/graphics-figures.json` records image hashes, capture interventions,
engine revision, controlled-renderer camera/state inputs and reproduction commands.
The five PNGs are unresampled native images. Two are existing H004 gameplay
captures. Three are controlled calls into the faithful scene renderer, with source
RGB output; they are explicitly not DOS or mission-completion captures.

The nine SVGs are explanatory illustrations. The map uses exact committed map
occupancy but a schematic search circle. Palette strips use decoded original
source RGB. The rectangle bytecode example, pipeline, projection, scanline and
painter illustrations explain mechanisms; they are not recovered original files
or execution traces. SVGs are clickable for full-size reading.

The optional C++ figure helper is a maintainer tool only. Normal website builds
need neither the game archives nor the engine checkout, compiler or Python.

## Editorial boundaries

- Do not claim an industry first without independent contemporary evidence.
- Do not identify an assembler, original source language for every component,
  or a specific modelling workflow from these results.
- Distinguish geometric Gouraud interpolation from computed dynamic illumination.
- Preserve the distinction between global model ordering and authored primitive order.
- Do not describe the fountain water as transparent or its reflection as a second render.
- Do not turn old milestone notes in the engine docs into current missing features.
- The article demonstrates ordinary shade codes; dynamic disc colours and VGA DAC
  output are explained separately and are not simulated by the interactive swatches.
- Fabien Sanglard's Build article is an acknowledged presentation inspiration,
  not a technical source for Darker.
