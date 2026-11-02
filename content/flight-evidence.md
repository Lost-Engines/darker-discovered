# Flight-model article: editorial evidence

The public page is built from `content/flight-model.md`, at `flight/`. It explains
the 1995 retail player controllers, not Redux improvements or the AI aircraft as
if they were player-flyable variants. Faithful-engine source links are pinned to
`7cece8ab1208ef3771516a71f44ff88064c815ad`.

Paths below refer to sibling research repositories; they are not website links
or build dependencies. The normal site build needs only the committed content,
SVGs, PNGs and JSON, plus its existing Node dependencies.

| Claim / illustration | Primary evidence |
| --- | --- |
| Fictional shuttle origin and dependence on city beacons | Original manual, English printed p.4; cockpit terminology pp.6–8. Local scan hash in `public/data/flight-provenance.json`. |
| Two player velocity components; integer speed magnitude; midpoint integration and zero-delta increment | `darker-cpp/src/game/flight_motion.cpp`, native `flight_motion_samples.h`; original `8208`, `8254`, `826E`. |
| Keyboard and mouse target filtering, damping and response | `flight_controls.cpp`, `angular_motion.cpp`; native controls/angular fixtures; original `7AD6`, `7C04`, `7C50`, `7C73`, `83B3`–`8411`. |
| Timer frequency and frame steps | `darker-reverse/docs/model-animation-and-states.md`; `darker-cpp/src/main.cpp` uses `1193180 / 2386`; `src/game/game_clock.cpp` preserves tick accumulation and frame cap. |
| One source selected, no fallback/occlusion/streetlight supply | `src/game/beacon_light.cpp`; original `0396` lookup and `8450`; `tests/reference/beacon_energy_samples.h` (768 cases); earlier analysis source-type probe. |
| 2,400 source height; minimum denominator; 11,616 cutoff; partial source strength | Same beacon function and fixtures. `scripts/export-flight-figures.cpp` calls it and verifies the native fixture before exporting. |
| Interactive beacon arithmetic | `src/flight.js`, checked against all 768 native tuples, including fractional coordinates, invalid cell types, outside-map lookup and signed height values. UI controls remain within normal in-city inputs. |
| Working buffer, weapons reserve, stored and active boost are different | `caero_energy.cpp`, `caero_flight.cpp`; original `7F35`–`7FBF`, `8529`, `B963`. Instrument identities corrected in `darker-reverse/docs/hud-and-formatted-text.md`. |
| Boost cost 8,192 and active budget 0x3800; about 0.45s | `activate_caero_boost`; for ordinary step `t`, `drive_step = floor(floor(257t/2)/2)`; `14336 / (64.25 × 500.075)` is approximately 0.446s, before fractional/retrigger effects. This is budget duration, not a speed duration. |
| Immediate lift, next-update forward bias, brake effects and altitude penalty | `caero_flight.cpp`; original `7F50`, `7FD4`–`802C`. Worked lift terms: zero pitch/roll at height 2,400, input 13,107, projection 16,382 gives lift 1,638, bias −90, height penalty −67. Brake gives lift 127. |
| Braking while still charging | Direct complete-callback two-step export: original source/parameters, frame step8, initial speed and horizontal velocity600, vertical0, buffer16384, other stores0, level at a tower centre. All interventions and outputs in the provenance/data JSON. |
| Caero absolute versus Skimma signed projection | `flight_attitude.cpp` and each craft callback. Chart freezes attitude; it does not execute roll centring or a manoeuvre. |
| Caero low-speed assistance and indicator hysteresis | `caero_flight.cpp` speed≤300, target−4096; `graphics/flight_instruments.cpp` dim<200, recover≥410. Distinct mechanisms. |
| A-key assistance and mission restrictions | `player_flight.cpp`, `caero_flight.cpp`, `mission_script.cpp`; `darker-reverse/docs/blackout-missions.md` records Nightmare opcode `38 00 02`, desired height512. |
| Skimma/Supa response and bias | `object_definitions.h` slots26/27: angular seeds44/48 scaled by8, signed bias150/146 = −106/−110. Steady controller shared. |
| Skimma settings248/500/640, brake130, speed feedback and shield E key | `flight_rules.h`, `player_flight.cpp`, `skimma_flight.cpp`; original `B913/B918/B956`, `8108`. Pad setup can initialise256; settings are not exact physical speeds. |
| Squared speed deficit, roll centring, height-related pitch assistance | `skimma_flight.cpp`; original `8108`–`8207`. The response plot is the raw gain as a percentage, not a flight trajectory or degrees/sec. |
| Tunnel steering, connection power, resistance, off-route state and slow aiming | `tunnel_flight.cpp`; original `D510/D5C9`; 3,072 native tunnel callback fixtures plus separate route/navigation tests. |
| Tunnel portal96/384/130/96 drive stages and capture | `tunnel_portal.cpp`, `hangar.cpp`; original `BD65`, `C582/C5CD`, `7CEF/7D32`. These settings are stage-dependent, not keyboard speed choices. |
| Damage kick, beacon-independent repair, shield accumulation | `player_damage.cpp`, `object_impact.cpp`; original `84D0`, `8514`, `8108`. No claim that every other damage path is covered in this flight article. |
| Landing and departure are state transitions | `hangar.cpp`, `supply_pad.cpp`, `player_flight.cpp`; type17 hangar and type3 supply pad capture paths, with their original gates. |
| Native-code validation scope and repair harness accommodation | `tools/generate_caero_flight_reference.py`, `generate_skimma_flight_reference.py`, `generate_beacon_energy_reference.py`, `generate_tunnel_flight_reference.py`. |

## Figure and data reproduction

`public/data/flight-provenance.json` records helper and asset hashes, source
revision, original image and manual hashes, capture intervention and commands.
The exporter links the faithful engine; it does not add code to that repository.
It checks the original beacon fixture, exports five spatial power profiles,
fixed-attitude lift terms and two complete Caero update steps in four conditions.

`scripts/render-flight-diagrams.py` draws five explanatory diagrams and three
numerical plots. It only needs the exported JSON and matplotlib. No unverified
trajectory is presented as recorded gameplay. The Caero and reused tunnel
screenshots come from the previously recorded H004 faithful-native capture set.

## Editorial boundaries

- These are native target velocities and integer contributions, not forces in
  newtons, watts, mph, metres or a general aerodynamic simulation.
- Distinguish current source strength from the stored buffer, weapon and boost
  reserves. A brake is not an engine switch; lift is not a pitch change.
- Preserve the one-update delay of the Caero's saved forward bias.
- Do not say a dark beacon searches for a brighter neighbour or that visible
  streetlights power the craft. Rendering light and radar are separate systems.
- The bank plot compares each craft to its own upright lift. It does not claim
  the Caero and Skimma produce equal lift or keep the same altitude when banked.
- Surface altitude hold, stall assistance, warning hysteresis and mission-forced
  target heights are separate rules.
- Tunnel guidance can fail and the craft can collide; “on rails” is not literal.
  Connected tunnel power is not a surface beacon hidden inside the tunnel.
- Do not convert early investigation TODOs into present-day fidelity gaps.
- Distinctive game design does not establish an industry-first historical claim.

The Skimma illustration is a new canvas capture of this site’s existing Three.js
model gallery, with retail bank31 special-model26 and one dollyOut(1.35) adjustment. Viewer
controls were hidden for the illustration; it is explicitly labelled as modern
model rendering, not a native game or DOS capture.
