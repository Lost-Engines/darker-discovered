## Back to Darker's city

In Darker, released by Psygnosis in 1995, you learn the city a few streets at a time. Buildings disappear into the distance, light towers keep your craft supplied with energy, and the view from the cockpit gives you only a small part of the picture. Seeing the whole place laid out at once was one of the attractions of taking the game apart.

We started with a working DOS installation. The aim was to recover its assets and understand enough of the code to build a faithful new implementation. We soon found ourselves decoding a model instruction language, checking flight arithmetic and trying cheat phrases that apparently nobody had published in thirty years. Two demos supplied earlier versions of the same engine, along with some rather less finished cities.

<figure><img src="../images/city-hero.webp" alt="The reconstructed Delphi city viewed from above, with its dense skyline and regularly spaced light towers." width="1440" height="900"><figcaption>Delphi assembled from the recovered map and model definitions. This is our modern inspection renderer, not a screenshot of the DOS game. <a href="../cities/?map=68">Explore the city →</a></figcaption></figure>

## Getting past the loader

The first disassembly was mostly nonsense. The executable had a valid DOS header and ran in DOSBox, so we knew there had to be a sensible path through those bytes. Reading them in order was getting us nowhere.

The loader uses the processor's **trap flag**, normally used for single-stepping. After an instruction executes, a tiny interrupt handler exchanges the next instruction address with another saved address. Execution alternates between two streams. A branch can land in bytes that the disassembler has already treated as part of a different instruction.

Our first emulator experiment stopped at that interrupt. We had failed to reproduce the handler that the program installed for itself. An uninterrupted DOSBox trace let us follow the loader through to its decompression routine.

We then wrote a standalone extractor that applies the loader's transformations and an LZ-style decoder. It recovered an initialised **65,536-byte executable image**, identical to an independent DOSBox memory capture. The rest of the game, including its cities, models and audiovisual resources, is stored in separate data files.

<figure><img src="../images/unpacking.svg" alt="Packed DOS executable passes through the interleaved loader and LZ-style decoding to a 64 KiB executable image; an independent DOSBox capture verifies the result." width="960" height="300"><figcaption>The extractor's output matches the executable image captured from DOSBox, byte for byte.</figcaption></figure>

The packer's identity remains unknown. We have no evidence yet that the loader was written specifically for Darker.

## The models are programs

A model is a stream of commands for a small interpreter. Those commands produce vertices, draw faces and decide which parts of an object are visible.

One command supplies coordinates. Others retain a coordinate, replace it, zero it or negate it. To make a symmetrical part, a definition can reuse an earlier point with a sign change and save storing three more numbers. Relative calls allow models to share drawing subroutines. Other commands test visibility or distance, or draw coloured lines and special effects.

To extract a model, we had to implement that interpreter. Searching the files for plausible sets of coordinates would have missed most of the instructions needed to assemble them. It also became clear why the object lists contained so many similar craft: several definitions can refer to the same geometry, or build related objects from shared pieces.

<figure><img src="../images/model-craft.webp" alt="Recovered Caero fighter geometry, showing its angular form and palette-based shading." width="1200" height="800"><figcaption>The Caero fighter in the model gallery. Stored colours and shades do much of the visual work. <a href="../models/?bank=30&amp;model=special-25">Rotate the model →</a></figcaption></figure>

Each city map is a **128 × 128 grid** of object types. A type selects a model definition, with placement information and links to other states. Changes made during play are kept separately from this base map. The explorer on this site uses those definitions to assemble the city in a modern renderer.

<figure><img src="../images/engine.svg" alt="Map cells select model definitions; model commands generate geometry. Runtime cell state selects alternate or damaged forms. The palette and shades feed the software rasteriser, which produces the indexed framebuffer." width="960" height="480"><figcaption>How the map, model commands and palette contribute to a frame. The division into boxes is ours; the original source-code structure is unknown.</figcaption></figure>

Our first assembled city had plenty of convincing buildings and some deeply unconvincing roads. We had applied rotations in the wrong direction. Correcting that exposed a second mistake: the entire 3D map was reflected east to west. Comparing it with the correctly oriented 2D map let us put that right too.

## Colour without texture maps

Some surfaces on the craft looked as though they carried simple textures. The drawing commands revealed that the extra values were **vertex indices paired with shades**.

The renderer interpolates between those shades using a limited range of palette colours. The resulting bands can look like surface detail. Pressing F9 in the game switches from this shading to a flat-colour fallback. We found no bitmap texture mapping in these commands.

Each face-colour byte selects both a palette range and a shade. Its upper bits choose one of eight 32-entry ranges; the lower bits give the shade or a special dynamic value. Distance lookup tables modify the result before drawing. Changing a palette therefore affects the shading and distance effects as well as the colours of individual objects.

The gallery's **Flat colours** switch shows the difference. Our viewer uses the recovered palettes and vertex shades with modern projection, clipping and GPU rasterisation. It does not reproduce DOS rounding, visibility branches or distance fading.

## A city with more than one state

Closed hangars have linked definitions containing their open interiors. Landing lights have dim and lit forms, and damaged buildings can switch to different models. Several apparently unused definitions turned out to be the other state of an object already on the map.

A light tower combines ordinary geometry for its base and top with a camera-facing disc for the ball of light. The explorer starts with the towers illuminated, as they usually are in the game.

The fountains move by **displacing vertices**, using stored parameters and a sine table. We checked the decoded motion against a recording made in the game: a cycle took a little over four seconds, agreeing with the roughly 4.1 seconds implied by the recovered clock. Gates have their own extension parameter, which the model gallery exposes as a slider.

<figure><img src="../images/model-fountain.webp" alt="One of the recovered fountain ornaments displayed in the model viewer." width="1200" height="800"><figcaption>A fountain ornament. The pool, moving pieces and effects have separate definitions; the gallery lets you inspect each part.</figcaption></figure>

## Bringing undocumented cheats to light

**To our knowledge, this is the first public documentation of Darker's hidden cheat commands.** We are not aware of any earlier account in contemporary games magazines or online. We recovered the commands from the executable and tested them in the game. An older source may yet turn up, but they appear to have gone unpublished for more than thirty years.

The first clues were strings such as “The Jason Brooke special” and “Lyndon's little snooze”. Tracing the code that referred to them led to a hidden input mode. It borrows the game's name-entry editor, then sends the text to a separate command handler.

On the retail game-selection screen, type **`*3`**: Shift+8, release Shift, then 3 on the number row. The prompt changes to **STAR THREE — What do you want?** Exact phrases, including punctuation, select handlers that patch the running program.

<figure><img src="../images/star-three.webp" alt="The original DOS game displaying STAR THREE and the prompt What do you want?" width="960" height="720"><figcaption>The hidden prompt in the original game, captured under DOSBox.</figcaption></figure>

| Retail phrase | What the investigation established |
| --- | --- |
| The Jason Brooke special | Unlimited boost recharges, confirmed in play. |
| Lyndon's little snooze | Enables Z to suspend the player's flight update. Other craft keep moving. |
| Who gives true life? | Alters damage handling; it is not blanket protection from scenery collisions. |
| Level X | Enables X to advance to the next-level sequence. |

“Level XI” briefly looked like another clue. The final I was actually a byte from a handler address, immediately after the text. The game's matcher accepted **Level X** and rejected the extra letter. Even the cheat list needed debugging.

Some of these phrases also exist in the demos, where their effects differ. The table above applies to the retail game.

## Assembly and arithmetic

Much of the core looks like handwritten 16-bit x86 assembly. It stores some state directly in instruction operands, shares the ends of routines, and enters functions halfway through. Registers and processor flags pass information in ways tailored to particular callers. We cannot identify the assembler, or say that every component was written this way; the source and authoring tools remain missing.

One particularly economical helper takes its caller's return address and installs it as an object's next update function. It then continues execution there. The following code has become the object's new behaviour, without the caller having to supply its address explicitly.

Changing update functions lets craft move between startup, flight and landing behaviours. Elsewhere, mission commands go through their own dispatcher, model commands through the geometry interpreter, and audio through identifiable Sound Images Generation 2 drivers. These give us useful boundaries to follow when reading the code.

Flight calculations use fixed-point arithmetic, accumulated fractional positions, wrapping angles and stored trigonometric tables. A floating-point translation could look equivalent on paper and still fly differently. Operand widths, rounding and the order of operations all matter.

To check our interpretations, we ran original instruction sequences with controlled inputs and compared the results. That let us examine individual movement steps and charging rules without steering a ship by hand for every experiment. Full playtesting is still needed to check how those pieces behave together.

## Earlier cities, earlier code

We eventually obtained two demo packages, labelled here as the **1993 demo** and **1995 demo**. The early README is dated May 1993, though that does not date every executable in its package with certainty.

The early city has a substantially different layout. Its second surface uses much of the same layout with additions and another palette, including light towers in the city that resembles the later Halon. Retail Halon has none. Underground routes also differ, and the model bank contains a satellite dish for which we have found no use in the content examined. The first save’s radio traffic includes “Your weapons aren't very powerful are they!”, followed by “Never mind:- They haven't got any weapons at all!” These messages appear during play.

The early package came with three executables: X, X1 and X2. Only X2 initially ran for us. This seemed a promising place to look for lost gameplay revisions, but a complete comparison accounted for the differences through relocation, padding and startup probe calls. Bypassing a troublesome probe in temporary copies got X and X1 running. Playtesting then found no obvious visual difference. Three executables had mostly bought us three ways to start the same game, two of which got stuck.

The menu's **Nightmare** choice deserved a closer look too. In the 1995 demo, its script arranges radio warnings and a staged blackout. Ground vehicles follow their own route programs, including scheduled destruction. We initially confused some route bytes with mission commands; separating those interpreters made the sequence readable.

There is also a short rising chirp produced by direct writes to the PC-speaker port. One use in the 1995 demo is a Skimma hit cue, triggered by a building or object hit without checking whether it caused damage. The speaker can sound even with a sound card in use. Related loops occur elsewhere, including a repeating path that looks diagnostic. We cannot yet tell which were intended effects and which were leftovers from development.

Maps from all three releases are available in the city explorer. We have kept the demo map names **Surface A** and **Surface B**, since their resemblance to the retail cities does not establish that they had the same names or roles.

## Towards a playable reconstruction

The viewers let us inspect the recovered cities and models. They leave the original gameplay and much of the software renderer to a separate reconstruction project.

That work has two planned stages. First, a readable implementation preserving Darker's arithmetic, drawing logic and interpretation of the original assets. Once that behaviour is understood and reproduced, a later engine can use converted assets and support the browser, flexible window sizes and adjustable graphics.

The [full investigation](https://lostengines.com/darker) includes code references, extraction tools, execution experiments and the detailed studies of missions and audio. It contains the evidence behind this account, including the parts we still cannot explain.

### Evidence and credits

We used static decoding, controlled execution of original code, DOSBox captures and hands-on playtesting. The 3D illustrations come from our inspection renderer; the cheat-prompt capture comes from the DOS game. The diagrams are explanatory drawings made for this site.

Darker was published by Psygnosis. Its original artwork and game content belong to their respective creators and rights holders. This independent reverse-engineering project provides the viewers, analysis and web presentation.
