## A familiar skyline, an unfamiliar machine

Darker, released by Psygnosis in 1995, makes its city the centre of the experience. You fly between buildings, seek out light to replenish your energy, and learn a landscape that is much larger than the view through your cockpit. Its stark silhouettes and narrow colour ramps give it a remarkably distinctive atmosphere.

This investigation began with an ordinary DOS installation and a practical question: **what is actually inside it?** Could its cities, craft and systems be recovered well enough to understand how the game worked—and eventually reproduce that behaviour?

The answer involved more than extracting a few meshes. The executable hid its startup behind interleaved instruction streams. Models turned out to be little drawing programs. Familiar surfaces that looked textured were carrying vertex shades. Two demo releases then supplied an unexpected record of the engine's development.

<figure><img src="../images/city-hero.webp" alt="The reconstructed Delphi city viewed from above, with its dense skyline and regularly spaced light towers." width="1440" height="900"><figcaption>Delphi assembled from the recovered map and model definitions. This is our modern inspection renderer, not a screenshot of the DOS game. <a href="../cities/?map=68">Explore the city →</a></figcaption></figure>

## First, persuade the executable to make sense

The executable had a valid DOS header, but reading its startup as a conventional sequence of instructions produced nonsense. The copy was known to run. The problem was our interpretation.

Its loader uses the processor's **trap flag**, normally associated with single-stepping, as part of its control flow. After an instruction executes, a tiny interrupt handler exchanges the next instruction address with another saved address. Execution weaves between two streams. A branch can enter bytes that a linear disassembler has already interpreted as part of a different instruction.

That distinction mattered in practice. An initial emulator experiment stopped at the interrupt instead of reproducing the installed handler. It looked like failure in the executable, but it was a missing part of the experimental environment. Following an uninterrupted DOSBox trace exposed the actual path to the depacker.

Once understood, the loader could be reduced to deterministic transformations and an LZ-style decoder. A standalone extractor recovered an initialized **65,536-byte image**, matching an independent DOSBox memory capture byte for byte. That figure describes the recovered executable image, **not the size of the whole game**: city geometry, maps, audiovisual resources and other data live elsewhere.

<figure><img src="../images/unpacking.svg" alt="Packed DOS executable passes through the interleaved loader and LZ-style decoding to a 64 KiB executable image; an independent DOSBox capture verifies the result." width="960" height="300"><figcaption>Two independent paths to the same bytes. Matching a runtime capture gave us a firmer foundation than plausible-looking disassembly alone.</figcaption></figure>

We have not identified the packer or established whether the unusual loader was written specifically for Darker. An unfamiliar encoding is not enough to attach a tool name or a motive to it.

## The models are programs

A conventional model file might give you a list of vertices followed by faces. Darker's geometry streams instead tell an interpreter **how to produce the vertices and draw the model**.

One command supplies coordinates. Others retain a coordinate, replace it, zero it or negate it. A symmetric component can reuse a previous point with a sign change rather than storing three fresh numbers. Relative calls let definitions share drawing subroutines. There are also visibility and distance tests, coloured lines, polygons and special components.

This explains why a clean extraction requires executing or interpreting the format rather than searching for blocks of plausible coordinates. It also explains why “number of model definitions” is not the same as “number of different meshes”: several records can refer to the same geometry, or build related objects from shared pieces.

<figure><img src="../images/model-craft.webp" alt="Recovered Caero fighter geometry, showing its angular form and palette-based shading." width="1200" height="800"><figcaption>The Caero fighter in the model gallery. Stored colours and shades do much of the visual work. <a href="../models/?bank=30&amp;model=special-25">Rotate the model →</a></figcaption></figure>

The city adds another layer. Each map is a **128 × 128 grid** of type references. A type leads to a model definition, with placement information and links to other states. Runtime cell state is kept separately. The original engine interprets that information while drawing; our public explorer assembles a convenient modern view of the recovered content.

<figure><img src="../images/engine.svg" alt="Map cells select model definitions; model commands generate geometry. Runtime cell state selects alternate or damaged forms. The palette and shades feed the software rasterizer, which produces the indexed framebuffer." width="960" height="480"><figcaption>A simplified path from map data to an image. This diagram describes recovered relationships, rather than claiming to reproduce the original source-code modules.</figcaption></figure>

Getting placement right was its own investigation. Rotation direction and a reflected horizontal axis each produced cities that initially looked plausible. Roads and walls exposed the rotation error; comparison with the correctly oriented 2D map exposed the reflection. A recognisable skyline was a useful milestone, but not sufficient evidence of correct coordinates.

## Colour without texture maps

Some of the craft's surfaces initially suggested simple texture mapping. Tracing their drawing commands revealed a different explanation: the extra values were **vertex indices paired with shades**.

The renderer interpolates shades within a palette range. With a small number of discrete colours, that interpolation can look surprisingly texture-like. The F9 rendering toggle changes the shaded path to a flat-colour fallback; the decoded commands did not establish bitmap texture mapping.

The face-colour byte also carries structure. Its upper bits select one of eight 32-entry palette ranges, while the lower bits identify a shade or a special dynamic value. Distance-dependent lookup tables then alter the result. The palette is part of the rendering machinery, not merely a final choice of colours.

Try the **Flat colours** switch in the gallery to compare these two presentations. The viewer preserves the recovered palettes and vertex shades, but its projection, clipping and GPU rasterization are modern. It does not reproduce every DOS rounding decision, visibility branch or distance fade.

## A city with more than one state

An apparently closed hangar and an open interior can be linked definitions of the same structure. Landing lights have dim and lit forms. Destroyed buildings can change models. Some of the definitions with no direct map placement are essential alternate states rather than abandoned objects.

The light tower is especially revealing. Its solid base and top are geometry, while the ball of light above it is a separate camera-facing disc. Treating everything as triangles would lose part of the object. The explorer normally shows the towers illuminated, matching the familiar experience of flying through the game.

Fountains provided another surprise. Their motion comes from **procedural vertex displacement**, driven by stored parameters and a sine table. A player-recorded cycle of roughly four seconds helped check the interpretation; the recovered clock relationship gives a cycle of about 4.1 seconds. Gates use a separate extension parameter. These are small authored mechanisms, not imported skeletal animation.

<figure><img src="../images/model-fountain.webp" alt="One of the recovered fountain ornaments displayed in the model viewer." width="1200" height="800"><figcaption>The gallery exposes recovered animation and linked states where available. Fountain pieces and their effects are separate definitions; one component is not the whole assembled fountain.</figcaption></figure>

## A prompt that had been waiting for decades

Strings in the executable included “The Jason Brooke special” and “Lyndon's little snooze”. Their consumers led to an undisclosed input mode, sharing an editor with ordinary name entry but taking a different dispatch path.

On the retail game-selection screen, type **`*3`**: Shift+8, release Shift, then 3 on the number row. The prompt changes to **STAR THREE — What do you want?** Exact phrases, including punctuation, select handlers that patch the running program.

<figure><img src="../images/star-three.webp" alt="The original DOS game displaying STAR THREE and the prompt What do you want?" width="960" height="720"><figcaption>The hidden prompt captured in the original executable under DOSBox. Unlike the 3D illustrations, this is evidence from the running game.</figcaption></figure>

| Retail phrase | What the investigation established |
| --- | --- |
| The Jason Brooke special | Unlimited boost recharges, confirmed in play. |
| Lyndon's little snooze | Enables Z to suspend the player's flight update. Other craft keep moving. |
| Who gives true life? | Alters damage handling; it is not blanket protection from scenery collisions. |
| Level X | Enables X to advance to the next-level sequence. |

Even the string boundaries contained a trap. An apparent “Level XI” ended with a byte that was really part of a handler address. The original matcher accepted **Level X** and rejected the extra letter. That is the sort of detail a strings dump cannot settle by itself.

The demos reuse some phrases but do not consistently give them the retail effects. A familiar label is not evidence of identical behaviour across releases.

## A compact engine with very specific arithmetic

The inspected core strongly suggests substantial handwritten 16-bit x86 assembly. State is sometimes stored in immediate operands inside instructions. Helpers share code tails or enter intermediate labels. Registers and flags carry carefully tailored interfaces. One small transition helper takes its caller's return address, installs it as an object's next update callback, and continues there.

That is strong evidence about the style of construction, but it does **not** identify a particular assembler or prove that every component was written in assembly. The original source organization and authoring tools have not been recovered.

Object callbacks give the engine recognisable structure: craft can move between startup, normal flight, landing and other behaviours by changing their update function. Mission commands have their own dispatch machinery. Rendering has a geometry interpreter. Audio has separately identifiable Sound Images Generation 2 drivers. A compact executable can still contain several distinct systems.

Flight itself depends on fixed-point arithmetic, fractional position accumulation, wrapping angles and stored trigonometric tables. Replacing these with convenient floating-point formulas could change behaviour even if the new code looked mathematically equivalent. The useful question is not only “what formula is this?” but “what widths, rounding, ordering and side effects does this machine actually use?”

We therefore used controlled execution of original instruction sequences to test interpretations. Those experiments help isolate a charging rule or a movement step, while keeping their limits explicit: a helper running in a synthetic harness is not a complete playthrough.

## The demos are a development record

Two demo packages expanded the investigation beyond the released game. We call them the **1993 demo** and **1995 demo** after the supplied packages. The early README carries a May 1993 date; that is a useful clue, not independently established dating for every binary in the package.

The early surface maps show a substantially different city. Its second surface shares the layout with additions and a different palette, and has light towers where the retail Halon city does not. There are different underground layouts, a satellite-dish model with no identified use in the audited content, and radio messages that make the unfinished character of the build unmistakable.

Three early executables—X, X1 and X2—initially promised three gameplay revisions. The result was subtler. After accounting for relocation and padding, the complete decoded-image comparison left no unexplained bytes: the substantive differences were startup probe calls. Bypassing the troublesome probe in temporary copies let X and X1 run, and playtesting found no obvious visual difference.

Nightmare is a visible special menu choice, not a newly discovered hidden mission. Its later script stages radio warnings and a blackout; vehicle definitions carry their own route programs, including scheduled destruction. Distinguishing those route bytes from ordinary mission commands was necessary to read the sequence correctly.

A smaller discovery was audible. Several demo paths toggle the PC-speaker port directly to make a short rising chirp. The later Skimma hit cue follows building or object hits without testing whether damage was dealt. The same family of loops appears elsewhere, including a repeating diagnostic-looking path. Whether a particular use was intended player feedback or a development leftover remains uncertain.

You can compare the packages in the city explorer. **Surface A** and **Surface B** are deliberately neutral labels: the demo worlds should not be assumed to have every identity or rule of their retail counterparts.

## What this reconstruction is—and what comes next

This site is a curated view of the investigation. It includes the most visually useful reconstructions and a readable account of how we reached them. It is not a playable port, and the city and model viewers are not substitutes for the original renderer.

The full analysis retains the material omitted here: source offsets, native execution probes, raw extraction metadata, mission and audio studies, uncertainties and reproducible tools. The separate release will be the place to examine a specific instruction path or challenge an interpretation.

The longer-term plan has two stages. First comes a faithful, readable implementation that preserves the original arithmetic, drawing logic and asset interpretation. A later re-engine can choose modern resources, browser delivery and adjustable presentation with a much clearer understanding of what it is changing.

> The most useful discoveries were often corrections: a texture that was a shade, a string that included an address, a script that was a route, or an unused model that was another object's damaged state.

### Evidence and credits

The investigation combines static decoding, original-code execution in isolated harnesses, DOSBox captures and hands-on playtesting. Direct observations, inferred explanations and modern presentation choices are kept distinct. Some original behaviours remain incompletely traced.

Darker and its original artwork are the work of their original creators and were published by Psygnosis. This is an independent reverse-engineering and preservation project. The web presentation and diagrams are newly authored; the displayed worlds and craft derive from the game's data. Credits are not a claim of affiliation or ownership of those original assets.
