## Opening the earlier boxes

The surviving Darker demos contain much more than a shortened campaign. They preserve earlier city layouts, different flight arithmetic, unfinished weapon behaviour and small pieces of the development process left in the menus and scripts.

We have two packages, labelled **1993** and **1995** in the archive. The earlier README gives a date of 21 May 1993; its directory also contains later packaging material. Those labels are useful handles for the two snapshots. The interesting chronology comes from comparing their contents with each other and with retail.

The early package contains three executables, `X`, `X1` and `X2`, alongside one data pack. The later package has one executable and a larger pack. All four executables expand to 65,536-byte initialized images using the same family of LZ/XOR decoding as retail. That common starting point lets us follow routines and data formats as they change.

| Material | Earlier demo | Later demo | Retail |
| --- | ---: | ---: | ---: |
| Decoded demo-pack resources | 31 | 55 | Resources spread across several packs |
| Surface maps | 2 | 2 | Delphi and Halon |
| Underground maps | 2 | 1 | 8 |
| Main image size | 64 KiB | 64 KiB | 64 KiB |

The [demo browser][browser] brings the maps, models, scenarios, key tables and source sheets together. Here we will follow a few changes far enough to see what they meant for the game.

## Three executables, two missing calls

At first, three differently named executables looked like a promising sequence of game revisions. Their decoded images contain many differences, but most are address changes caused by insertions, deletions and padding.

To compare them, we mapped the corresponding code regions and checked every changed word against that mapping. Absolute addresses, relative calls and negative address displacements needed different treatment. Ignoring all changed immediates would have hidden genuine tuning changes, so the comparison retained them unless a specific relocation explained the value.

Two differences account for the substantive startup changes:

| Pair | Removed call |
| --- | --- |
| `X` → `X1` | An extended `INT 33h` device probe |
| `X1` → `X2` | A sound-hardware probe with Gravis/GF1 register operations |

The sound probe stalled in our local startup tests. Removing its call explains why one copy could run where another stopped at the splash. The identity of the device expected by the extended `INT 33h` probe remains unresolved.

Some of the address changes are unusually indirect. One word patches the displacement of a later `CALL`; another table describes a chain of patches applied to the renderer. Executing the original patch walker produced 42 writes in each compared image, all agreeing under the address map.

After accounting for those changes, the decoded-image comparison has no unexplained bytes. The three files preserve startup variants of the same game snapshot. The large numerical diff mostly records where the code moved. [Full X/X1/X2 comparison][builds]

## The city grew into familiar streets

The demo maps use the same 128-by-128 cell scale as the retail cities. Each occupied cell names a model from that map's bank, so an occupancy comparison gives a useful first view of additions and removals.

From the later demo's Surface A to retail Delphi, **972 previously empty cells become occupied**, 29 become empty and 34 occupied cells change their raw type number. Much of the earlier street plan remains recognisable beneath the added detail.

<figure>
<a href="../images/demos/city-growth.svg"><img src="../images/demos/city-growth.svg" width="880" height="530" alt="Side-by-side occupancy maps compare the later demo's Surface A with retail Delphi. A difference map highlights 972 added occupied cells, 29 removals and 34 changed type numbers." loading="lazy"></a>
<figcaption>Cell occupancy from the recovered maps. Green marks additions, red removals and gold changed type numbers. Geometry can also change within a model bank without changing its map entry.</figcaption>
</figure>

The tunnels changed in both directions. Comparing the early first tunnel with the later one gives 166 additions, 178 removals and 47 changed type entries. Several sections of the route were rebuilt between the demos.

There are also two surface maps in each demo. They share much of their layout while changing placements and model banks. The bank matters as much as the map: the same type number can select a different structure or appearance in the other surface version.

The [city explorer](../cities/?era=1995&map=199538) lets us move between these versions, and the [cell comparison archive][maps] records the exact changed coordinates.

## A dish with no place to stand

The early Surface A bank contains a satellite dish at city type 13: an 88-face model with no placement on its map. We followed the other routes by which a model might appear—scenario definitions, geometry aliases, alternate forms and damage links—and found no reference to that pool entry in the audited content.

<figure>
<a href="../models/?bank=199308&amp;model=city-13"><img src="../images/model-dish.webp" width="600" height="460" alt="The earlier demo's satellite dish model, shown in the modern model viewer." loading="lazy"></a>
<figcaption>The early Surface A dish, rendered from the recovered model data. Open it to turn it around in the gallery.</figcaption>
</figure>

Following those links is important because the model directory contains plenty of shared geometry. In the later underground bank, 47 definitions have no direct map or scenario reference but connect to used geometry through aliases or state chains. The dish is a more interesting orphan because those additional searches still leave it unreferenced.

The early package also has a fourth map that none of the decoded player/scenario configurations selects. It remains available to explore, along with the model definitions stored for it. Those leftovers show how much material can survive in a demonstration even when its menu offers only a few routes into the game. [Content reference audit][references]

## Your name chooses the scenario

The early demo supplies four saved pilots. Its launch code chooses a record using:

```text
record = (first byte of pilot name − 1) & 7
```

For the supplied uppercase names, that makes A select record zero, B record one, and so on. The saved campaign stage is ignored for this particular choice.

| Pilot | Selected record | World |
| --- | ---: | --- |
| Adrian Armstrong | 0 | Surface A |
| Bernard Biggins | 1 | Surface B |
| Christine Craven | 2 | First underground map |
| Edith Edwards | 4 | First underground map, different scenario |

This is a wonderfully small way to turn an existing saved-game menu into a demo selector. The names carry part of the program's configuration.

The later demo changes the menu's purpose. Its four ordinary entries display information; **A GLIMPSE UNDERGROUND** also launches the underground scene. A separate fifth entry, **NIGHTMARE**, enters the Run menu and launches the surface scenario. We traced the selection branches and checked the menu behaviour in play, which resolved some initial confusion over which stored records were actually accessible. [Save and menu selection][selection]

## The script slots contain a lot of repetition

Across both demos we extracted 195 framed scenario records. Comparing their bytes reduces them to seventeen distinct sequences: eight early and nine later. Each package contains ninety copies of the same fourteen-byte configuration-1 placeholder, whose entry scripts immediately stop.

The useful content is concentrated in the remaining records. The early first pilot's script introduces radio messages, announces enemy craft and then becomes rather less formal. At clock 9,000 it displays “My tunny's full of Kraft cheese slices”; later it points out that the enemies have no weapons. These lines appear during the supplied scenario, with regular timed delays between them.

The later Nightmare is considerably more elaborate. Its setup contains twenty flying craft and ten ground vehicles. The player script sends messages, waits on time and schedules beacon sweeps. The aircraft begin with their normal AI callbacks and stopped scripts, while the ground vehicles follow compact route programs.

| Approximate script time | Later-demo Nightmare event |
| ---: | --- |
| 0 s | Radio asks whether Tolly is all right. |
| 7 s | The pursuit detector is reported to have failed. |
| 17 s | Halon craft are announced from all directions. |
| 107 s | The closing message sequence begins as the lights fade. |
| 135.4 s | The final promotional message appears. |

Those times come from executing the original script at its nominal clock rate. Its checkpoint wait is timed, so killing enemies more quickly does not advance those messages. The route programs independently move the ten vehicles; five eventually schedule their own destruction, while the others reach repeated route addresses in our traces.

Retail Nightmare grows into a longer challenge with combat-gated waves and a more involved beacon sequence, covered in the [mission article](../missions/#programming-a-blackout). The later demo already uses those ingredients to turn the city into a moving demonstration of the game. [Distinct scenarios and Nightmare traces][nightmare]

## Flight changed underneath familiar controls

Comparing the demos is especially interesting after learning the [retail flight model](../flight/). Much of the structure is already present: beacon energy, stored boost, damped steering and separate underground control. The details continue to change.

One clear balancing change is boost recharge. With equal beacon input `E` and transformed timestep `T`, the two demos use:

```text
P = max(0, E − 250) × T
gain = P >> 18
```

Retail shifts by 17 instead, then adds `T >> 8` when the gain is nonzero. The boost-consumption arithmetic remains the same. At `T = 514`, the comparison looks like this:

| Beacon input | Either demo: reserve gain | Retail: reserve gain |
| ---: | ---: | ---: |
| 250 | 0 | 0 |
| 1,000 | 1 | 4 |
| 6,579 | 12 | 26 |

This isolates one change in the recharge rule. It shows a substantially more generous return from the same input, including help at low gains where integer truncation is particularly visible.

Steering also evolves. The early bounded-error helper has asymmetric branches and extra doubling. The later demo limits the error magnitude at `0x2000`; retail raises that limit to `0x2800` and changes rounding in the angular integration. Configuration gains change too: the early surface Caero expands to 400, versus 416 later. Reading a raw configuration byte alone would miss that the early expander multiplies it by four and the later one by eight.

Skimma braking uses a base term of 60 early and 130 in the later demo and retail. Other changes affect heading response, horizontal integration and vertical lift. Underground has its own evolving geometry queries and controller. Together these are enough to make the versions feel different even when the ship and controls look familiar. [Recharge comparison][boost] · [Runtime tuning and flight comparisons][flight]

## Handling a slow frame

All three versions program the startup timer with divisor 2,386, giving about 500.075 ticks per second. The later versions change how many elapsed ticks gameplay can accumulate while waiting for another frame.

The early path passes through the whole elapsed interval. The later demo and retail cap it at **80 ticks**, about 160 milliseconds, during play. Once that limit has been reached, the game clock stops accumulating further time until the frame snapshot advances.

This matters for a fixed-point flight model. A very large update can move farther, cross more geometry and round differently from a series of small ones. The cap bounds the timestep after a stall. On a persistently slow machine it also means simulation time falls behind wall time.

<figure>
<a href="../images/demos/timestep.svg"><img src="../images/demos/timestep.svg" width="880" height="330" alt="A graph compares elapsed time admitted by the early and later clock paths. The early line continues upwards; the later-demo and retail line stops at 80 game ticks, about 160 milliseconds." loading="lazy"></a>
<figcaption>The later timer path limits the accumulated interval for a frame. The nominal interrupt frequency stays the same.</figcaption>
</figure>

[Original interrupt and frame-clock comparisons][flight]

## A two-stage weapon still taking shape

The Dual Launch selection cycle is already present in the early demo: fire the first capsule, switch to the follow-up, then switch back. Its follow-up accepts a nonzero candidate pointer. The later demo checks that the candidate really is the primary capsule.

The impact behaviour changes further. In the early version, both units share an ordinary homing updater. The later follow-up has a distance-dependent approach adjustment, becoming slower near its target capsule. Both later-demo impact paths still use the same handler for ordinary object or building hits.

Retail adds the close-proximity paired area attack described in the [combat article](../combat/#steering-a-projectile-or-intercepting-your-own-capsule). The distinctive two-shot idea survived across the builds while the validation, approach behaviour and eventual payoff developed around it. [Native weapon-path comparisons][weapons]

## Small traces of interface work

The fonts preserve a quieter change. Both demo font resources decode identically. In the compact font, 77 of the 95 shared glyphs retain exactly the same bitmap dimensions and pixels in retail, but their top offset moves down by one pixel. The ordinary `<` and `>` glyphs are replaced with larger graphical arrows, and two extra slots are added.

Separating stored pixels from placement turned an apparent font redesign into a much smaller interface adjustment. It is the sort of detail that becomes visible once the resource format is understood well enough to compare individual fields.

The files around the game add a little more context. The early README provides its May 1993 date; a Macintosh Word document in the package contains references to Palatino and LaserWriter, preserving part of the document-production workflow. The playable code tells the more detailed story: a growing city, increasingly controlled flight updates, a demonstration assembled from saved-game machinery, and weapons still being worked out in public builds.

The [demo browser][browser] keeps those snapshots available side by side. The most rewarding comparisons usually start with something small—a missing call, a changed shift, a model that never appears—and follow it far enough to see what changed on screen.

[browser]: https://lostengines.com/darker/analysis/demos/index.html
[builds]: https://lostengines.com/darker/docs/demo-releases.html#complete-x--x1--x2-decoded-image-comparison
[maps]: https://lostengines.com/darker/analysis/demos/map-comparison.json
[references]: https://lostengines.com/darker/docs/demo-releases.html#model-reference-audit-and-dual-launch-comparison
[selection]: https://lostengines.com/darker/docs/demo-releases.html#native-save-selection-and-first-radio-timeline
[nightmare]: https://lostengines.com/darker/analysis/demos/nightmare-timelines.json
[boost]: https://lostengines.com/darker/docs/demo-releases.html#retail-recharges-more-generously
[flight]: https://lostengines.com/darker/docs/demo-releases.html#runtime-tuning-elapsed-time-skimma-and-underground-controls
[weapons]: https://lostengines.com/darker/docs/demo-releases.html#dual-launch-behaviour-before-retail
