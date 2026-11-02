## A city made of coloured pixels

Fly low over Delphi and the buildings emerge from purple darkness. A streetlight is a tiny white circle. A warehouse roof catches a soft gradient. The fountain in Kismet Square seems to reflect its lamps in rippling water. Bank the aircraft and the whole picture rolls, including the horizon.

Darker produces this scene with a software renderer: the CPU works out where objects appear and which colour to write into each pixel. The VGA hardware displays those colours. There is no graphics accelerator drawing the buildings, and no image texture needs to be stretched across a warehouse wall to make it convincing.

This article follows the **1995 retail renderer**, from its map cells to its final display. The explanation starts with ordinary geometry, then follows the particular shortcuts and surprises we recovered from the executable. The illustrated rendering experiments use [Darker C++](https://github.com/Lost-Engines/darker-cpp), our reconstruction of that renderer. They do not use Redux’s extended view distance, higher resolution or revised fog.

<figure><img class="pixel-image" src="../images/graphics/delphi-cockpit.png" alt="A Caero cockpit looking over Delphi, with bright streetlights, a dark skyline and bands of purple sky" width="640" height="480"><figcaption>A flight capture from the faithful native reconstruction, at twice the original pixel dimensions. Polygon scenery, bitmap instruments and procedural HUD lines share one indexed image. This is not a DOS capture.</figcaption></figure>

### The minimum vocabulary

A **vertex** is a point in three dimensions. Connect vertices into a **polygon** and you have a flat surface: a wall, a wing or one piece of a roof. A **model** groups those surfaces into an object. To draw it, the engine transforms its points into the camera’s coordinate system, projects them onto the screen, and fills the resulting two-dimensional polygons. That last operation is **rasterisation**.

Darker also draws lines, small circular **discs**, and **sprites**: little bitmap pictures used for smoke, fire and instruments. A beacon’s glowing top can be a disc while its supporting tower is made of polygons. A smooth-looking cylinder can be a small number of polygons with different brightness values across them.

The normal display is **320 × 240 pixels**, or 76,800 colour indices. Each pixel stores one byte, selecting one of 256 palette entries. A palette entry supplies the red, green and blue values displayed for that index. Drawing a wall therefore means writing a lot of small integers, not calculating a separate RGB colour for every pixel.

The distinction between a colour **index** and a colour is central to everything that follows. Darker arranges its palette into colour ramps, then does much of its shading by changing the index within a ramp.

<aside class="aside"><strong>What we recovered.</strong> The original source and authoring tools have not been recovered. Names such as <code>city_renderer</code> are ours. Addresses such as <code>2A1A</code> identify routines in the analysed retail executable, not names supplied by its authors. The executable, original assets and controlled execution of its instructions are the evidence; the C++ implementation makes that evidence easier to read.</aside>

## Follow one frame

The renderer does not ask every polygon in the city whether it covers each pixel. It progressively reduces the problem: choose nearby map cells, reject models outside the view, put the survivors in drawing order, and only then execute their drawing commands.

<figure><a href="../images/graphics/pipeline.svg" aria-label="Open full-size diagram"><img src="../images/graphics/pipeline.svg" alt="Frame pipeline: camera and world state; sky and ground; candidate cells; model selection and placement; ordered draw records; model bytecode and projection; clipping and rasterisation; cockpit and HUD; indexed display" width="800" height="680" loading="lazy"></a><figcaption>The major dependencies of a world frame. This is a conceptual overview, not the executable’s exact instruction schedule. Effects and moving craft join the same ordered world drawing.</figcaption></figure>

The important boundaries are:

1. **World state:** where the camera and moving objects are, which map is active, which buildings are damaged, and how much power the beacons have.
2. **Visibility and placement:** which model instances might be visible, which version of each model to use, and where its origin lies relative to the camera.
3. **Drawing:** execute each model’s program, generate points, clip its primitives and write palette indices.
4. **Composition:** combine that view with the cockpit, instruments, radar, targeting marks and messages; present it through the active palette.

The world has three main geometry banks: Delphi, Halon, and the underground sections. A bank supplies a directory of city types, a directory of moving-object models, and shared model data. The renderer changes some rules for underground scenes, but it does not turn into an unrelated rendering engine.

[Source: scene assembly and drawing](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/city_scene.cpp).

## From map cells to model instances

A city map is a **128 × 128 grid**. Its stored type bytes identify what occupies each cell. Runtime setup expands those into cells containing a type and a mutable state byte. An empty cell needs no building model; an occupied cell refers to the bank’s type directory.

The grid is an arrangement system, not a collection of flat wall columns. A cell can select a fully three-dimensional hangar, tower or tunnel segment, with its own height and fractional placement. Moving craft have independent positions and orientations. The camera can pitch and roll, and roofs and undersides really are geometry.

<figure><a href="../images/graphics/city-map.svg" aria-label="Open full-size diagram"><img src="../images/graphics/city-map.svg" alt="Actual Delphi map occupancy, with the fountain marked and a 15-cell-radius neighbourhood shown; an inset explains the type and state references that select a model" width="800" height="520" loading="lazy"></a><figcaption>The occupied cells are taken from retail map 68. The circle marks the scale of the original surface search radius, not an exact list of cells accepted by a particular camera. Each coloured map square can expand into many polygons.</figcaption></figure>

A city-type record supplies a model reference, fractional offsets within its tile, placement/collision information, and a variant limit. The selected model header supplies its height, extent and distance thresholds. Its first two words can also link to an alternate definition and a damaged definition. The renderer selects a definition before it starts drawing.

This is why destroying a building can produce a convincingly different silhouette without breaking its polygons apart. The cell changes state and the next frame follows a link to a replacement model. Some replacements are shared; some are not exposed as separate entries in the type directory at all. A count of directory entries is therefore not a count of unique meshes.

The state byte is deliberately economical. Its meaning depends on the object: it can encode damage, an alternate form, an animation parameter offset or a beacon’s light level. Treating it as one universal “health” field would misread the format.

Collision is another separate representation. The visible doorway and the volume that accepts a missile hit need not have the same boundary. That explains why inspecting the polygon mesh alone cannot establish where a building can be damaged. The [full model inspector](https://lostengines.com/darker/analysis/models/index.html) can show both.

[Sources: bank decoding](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/resources/geometry_bank.cpp), [linked model states](https://lostengines.com/darker/docs/model-animation-and-states.html).

## The models are little programs

A conventional mesh file might provide a list of complete vertices followed by a list of faces. Darker’s models contain **drawing bytecode**. An instruction can change one coordinate, negate another, emit a point, draw a polygon, test a viewing direction, call a subroutine, or jump somewhere else in the model pool.

The interpreter keeps three coordinate components, called A, B and C in our analysis. It can reuse components from the preceding point. This makes symmetry unusually cheap. Here is an illustrative rectangle, rather than a transcription of one particular building:

```text
set C = 0, A = −64, B = −64; emit vertex 0
negate A;                   emit vertex 1
negate B;                   emit vertex 2
negate A;                   emit vertex 3
draw quad using vertices 0, 1, 2, 3
```

The first coordinate instruction takes one opcode and three 16-bit operands. Each subsequent negate-and-emit instruction takes **one byte**. Those four vertices need ten bytes of coordinate commands, compared with 24 bytes for four explicit triples. The polygon still needs its own colour and index operands; this example isolates the coordinate saving.

<figure><a href="../images/graphics/bytecode.svg" aria-label="Open full-size diagram"><img src="../images/graphics/bytecode.svg" alt="Four corners of a rectangle generated by one full coordinate command followed by three sign changes, alongside the corresponding vertex sequence" width="800" height="370" loading="lazy"></a><figcaption>Reuse the current point, change just what is different, and emit again. A simple compression idea also becomes an execution optimisation.</figcaption></figure>

The interpreter does not merely save file space. It **caches the transformed contribution of each component**. Changing A does not require recalculating the products for B and C. Negating A can negate its cached contribution, retaining the rounding already performed. File representation and runtime mathematics support one another.

Relative calls let different models share drawing routines. Vertex-cursor commands let a program reuse working storage. Conditional commands can skip several faces together according to the view. The order of instructions is part of how a model looks: flattening everything into an ordinary mesh loses information.

<details class="technical"><summary>Some of the retail drawing instructions</summary>

| Opcode | Operation |
| --- | --- |
| `8E` | Set C, A and B; emit a vertex. |
| `91` | Set A and B, retain C; emit. |
| `73 / 76 / 79` | Negate C / A / B; emit. |
| `02 / 03` | Flat triangle / quadrilateral. |
| `0E / 0F / 11` | Gouraud triangle / quadrilateral / counted polygon. |
| `16` | Test projected facing and conditionally skip commands. |
| `1A` | Test distance and conditionally skip commands. |
| `1E / 22` | Draw a line / screen-space disc. |
| `32 / 35 / 38` | Set interpolation, save an anchor, emit an interpolated point. |
| `3B` | Set C from an animation parameter. |
| `3E / 4D / 0D` | Relative call / jump / return. |

The executable dispatches these through its FCxx and FExx paths. Some opcodes enter shared instruction sequences partway through. This is a compact, purpose-built drawing language, not a general-purpose virtual machine.

</details>

[Sources: model interpreter](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/model_renderer.cpp), [coordinate encoding](https://lostengines.com/darker/docs/model-bytecode.html).

## Moving the world into the camera

Imagine the camera as the origin of a new set of axes: right, down, and forward. Subtract the camera’s position from a point in the world, then rotate that relative position by the camera’s attitude. The result tells us how far sideways, vertically and forward the point lies in the view.

In conventional mathematical notation:

```text
camera_point = camera_rotation × (world_point − camera_position)
```

An independently rotating aircraft also needs its local-to-world rotation. Darker composes that with the camera basis. The static city has no need for a fresh object rotation at every cell.

Perspective then makes distant objects smaller. For a camera-space point `(X, Y, Z)`, the familiar idealised projection is:

```text
screen_x = centre_x + focal_length × X / Z
screen_y = centre_y + focal_length × Y / Z
```

Darker’s focal length is **256 pixels**. Its actual implementation divides retained fixed-point numerators by the whole depth word, with signed integer truncation. The equation explains the geometry; it does not describe every rounding step.

<figure><a href="../images/graphics/projection.svg" aria-label="Open full-size diagram"><img src="../images/graphics/projection.svg" alt="Side view of perspective projection: rays from two equally tall objects cross an image plane, with the more distant object producing a smaller projected image; a near clipping plane excludes points too close to the eye" width="800" height="400" loading="lazy"></a><figcaption>Divide by forward depth, and the same object occupies fewer pixels as it moves away. The drawing is schematic; the camera’s image plane is shown in front of the eye for clarity.</figcaption></figure>

At 320 × 240, that focal length corresponds to approximately **64.0° horizontal** and **50.2° vertical** field of view for the full screen. The cockpit uses a shorter window into the world, so it shows less vertically: the normal Caero view is 168 rows, placed eight rows below the top; the Skimma view is 180 rows. A 320 × 200 source artwork sheet is not the display resolution.

### Fractions without floating point

Fixed point means storing fractions with an agreed scale. A world position word has 256 units per map cell, and movement retains an additional fractional byte. The camera setup converts horizontal positions to 1/1024-cell units, preserving two bits from that extra byte. Other stages use their own scales; there is no single universal fixed-point type covering the entire engine.

Angles wrap around a 16-bit turn: 65,536 units bring you back to the same direction. The renderer looks up sine and cosine in a **1,024-entry signed table**, so its effective angular step is about 0.352°. Camera setup adds a small bias of 15 before discarding six low bits; that is the original rule, not ordinary rounding to the nearest table sample. These quantised angles become much easier to notice when a later renderer draws at high resolution.

Intermediate widths matter. Signed products, low-byte discards, fractional carries and word wrap are part of the image. The sine table also has a small asymmetry: its positive peak is 32766, while its negative peak is −32767. A mathematically cleaner implementation need not put exactly the same pixels on screen.

<details class="technical"><summary>An unusually revealing shared byte</summary>

The coordinate interpreter’s A and B vertical contributions share a fractional byte at `FCD3`. Updating either component replaces that byte; the whole-word contributions remain separate. This has been checked against both the unpacked executable and captured DOS memory. A fresh matrix multiply of the final vertex coordinates does not necessarily reproduce the same result, because the command history can matter.

Gate interpolation contains another accident: one direct-path read includes an adjacent `BA` instruction byte, adding 186/256 of a camera-coordinate unit to the vertical accumulator. The faithful implementation preserves it. These quirks belong to the reconstruction notes, rather than to the ideal perspective equation above.

</details>

[Sources: camera placement](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/camera.cpp), [cached projection](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/model_projection.cpp), [native projection comparisons](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/docs/model_rendering.md).

## Choosing what is worth drawing

The surface renderer searches a neighbourhood with an original radius of **15 map cells**. An integer circle stepper generates row spans. Heading normally selects a half-map scan; steep upward or downward views use the full circle. The centre row is treated specially and remains complete. This is a coarse candidate search, not an exact view-frustum test.

Each candidate then undergoes placement and an extent-based camera-space rejection. The model’s extent allows it to survive when its origin is outside the view but part of its geometry might still be visible. The same classification chooses the cheaper direct projection path or the more careful near-clipping path.

Moving aircraft, vehicles, projectiles and effect emitters have a separate coordinate-window admission test before joining the scene. A moving model can later become a single distant point. Its header also supplies a threshold beyond which Gouraud commands use their flat fallback. These are authored model parameters, not one universal switch at a fixed number of metres.

There is a practical reason to stop nearby. Placement doubles signed horizontal offsets into another 16-bit word. At roughly sixteen cells along an axis, those values can wrap. Raising the search radius alone can therefore make distant scenery appear in the wrong place, rather than simply draw more of it. View distance, coordinate precision and distance shading were designed together.

### Underground uses a different search

A tunnel is still assembled from model-bearing map cells, but the engine does not use the ordinary surface circle scan. It seeds the containing cell, proceeds along cardinal directions up to eight cells, then performs a prescribed series of diagonal and outward passes. Acceptance of one model feeds a visibility bit used by neighbouring cells. Empty cardinal cells stop their ray; some visibility state persists between frames.

This should not be described as a generic portal renderer or a flood fill. It is a particular grid traversal whose visit order and retained bits affect what gets drawn. Once it has admitted the models, the familiar placement, ordering and polygon machinery takes over.

<figure><img class="pixel-image" src="../images/graphics/tunnel.png" alt="A native-rendered tunnel with a close polygon ceiling, sloping side walls, floor markings and a Wrecker ahead" width="640" height="480" loading="lazy"><figcaption>Mission 17 in Darker C++. The underground traversal changes which pieces reach the renderer; the walls and floor still use the model interpreter and polygon fillers.</figcaption></figure>

[Sources: surface traversal](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/city_visibility.cpp), [underground traversal and ordering](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/docs/underground_visibility.md).

## Paint the far objects first

If a distant building is drawn first and a nearer building is drawn over it, the overlap looks right. This is the **painter’s algorithm**. A depth buffer instead stores a depth alongside every pixel and decides visibility pixel by pixel. Darker’s world renderer uses ordered drawing, without such a buffer.

It has two useful levels of order. Between models, ordinary records are visited from farther to nearer. Inside a model, its drawing program determines which primitives are issued first. Facing tests skip hidden groups of geometry, and the polygon fillers also reject back-facing winding.

The global sorting key is an inexpensive distance estimate based on the magnitudes of horizontal offsets and camera altitude, with a model-extent adjustment. It is not an exact Euclidean distance or the depth of every polygon. The original builds a binary tree of draw records; background-marked city types use a separate last-in-first-out list and draw before ordinary models.

<figure><a href="../images/graphics/painter.svg" aria-label="Open full-size diagram"><img src="../images/graphics/painter.svg" alt="Three drawing steps show a far silhouette, a middle building and a near structure overwriting earlier pixels; an intersecting-shapes example explains why one order cannot always be correct" width="800" height="390" loading="lazy"></a><figcaption>Ordered opaque drawing is inexpensive and often sufficient. It cannot solve every interpenetrating or cyclic overlap with one ordering of whole objects.</figcaption></figure>

This makes asset authoring important. If two large models cross one another, choosing which whole model comes first may be insufficient. Conditional command groups can help with a model’s own visible faces, but they are not a general solution to intersections between independently moving objects.

There is even a mode-specific adjustment: moving objects **add** their extent to the sorting key on the surface and **subtract** it underground. Missing that change allowed floor markings and sloping tunnel faces to paint over the Wrecker in our reconstruction. It was a sorting problem, not a missing roller polygon.

The same lack of a depth buffer also enables one of the game’s prettiest illusions. We will return to it at the fountain.

[Sources: scene ordering](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/city_scene.cpp), [view-dependent model rules](https://lostengines.com/darker/docs/model-colours.html#view-dependent-drawing-rules).

## Clip before dividing, then fill the spans

Perspective division becomes troublesome when a point approaches zero forward depth. A polygon crossing the camera must not be projected as if all its vertices were safely in front. Darker therefore has two model paths.

For a model sufficiently far from the camera, the **direct path** projects emitted vertices immediately. For a nearby model, the **near path** retains signed 24-bit camera coordinates and clips against a plane at depth **32** before completing projection. A polygon cut by that plane gains intersection vertices; a fully hidden one disappears.

An ideal line-plane intersection could be written using a single interpolation ratio. The original coordinate routine instead finds the crossing through ordered arithmetic halvings, with its own rounding and saturation. Gouraud colour at the new vertex is calculated using a ratio of whole depths. Merging the two calculations into one elegant floating-point formula changes the result.

Projected polygons are then clipped to the rectangular viewport, in **bottom, top, right, left** order. At this point the renderer has a convex screen polygon small enough to draw safely. Clipping may add vertices, so the working polygon is not necessarily still a triangle or quad.

### Two edges and a horizontal run

The flat filler finds the top and bottom of the polygon and walks its two sides. On each scanline it obtains a left and right X coordinate, then fills the horizontal span between them. Incremental arithmetic advances the edges for the next row. It does not need a point-in-polygon test for every pixel.

<figure><a href="../images/graphics/scanlines.svg" aria-label="Open full-size diagram"><img src="../images/graphics/scanlines.svg" alt="A convex polygon on a pixel grid, with left and right edge walkers and highlighted horizontal spans; top and left coverage are shown with the bottom and right endpoints excluded" width="800" height="410" loading="lazy"></a><figcaption>Scan conversion turns a polygon into rows of coloured pixels. This enlarged explanatory grid illustrates half-open spans; it is not a capture of the original edge routine.</figcaption></figure>

The exact coverage rule is more particular than this diagram. The original starts edge fractions at 128, advances before the first scanline, rounds negative slopes differently on the two sides, and starts the right walker one unit beyond its vertex. Horizontal spans include their left end and exclude their right end; the top row is included and the bottom excluded. Those details determine whether adjoining faces meet cleanly.

A GPU triangle rasteriser has its own coverage conventions. Feeding it the same vertices and colours is not enough to guarantee identical pixels.

### Gouraud means interpolated shades, not textures

Flat polygons have one colour. A Gouraud polygon supplies a shade for each vertex and interpolates the shade down its edges and across its spans. The stored values describe the artwork’s intended gradient. They are not texture coordinates, and the renderer does not derive a fresh surface-normal lighting equation for every face.

<figure class="comparison" data-comparison>
<div class="comparison-controls" hidden role="group" aria-label="Fountain shading comparison"><button type="button" data-image="../images/graphics/fountain-gouraud.png" data-caption="Gouraud shading" aria-pressed="true">Gouraud</button><button type="button" data-image="../images/graphics/fountain-flat.png" data-caption="Flat fallback" aria-pressed="false">Flat / F9</button></div>
<img class="pixel-image" src="../images/graphics/fountain-gouraud.png" alt="Controlled native-renderer fountain view with Gouraud shading" width="320" height="240" loading="lazy">
<figcaption><strong data-comparison-caption>Gouraud shading</strong> — identical camera, model data, palette and animation clock. Compare the central water and the round lamp pedestals. These are controlled Darker C++ renderer views, not a captured mission. <a href="../images/graphics/fountain-flat.png">Open the flat view separately</a>.</figcaption>
</figure>

The interpolation runs in **palette-index space**. It generates bands of discrete colours from the selected ramp, rather than blending arbitrary RGB values. Narrow spans may advance by more than one shade per pixel; wide spans repeat a shade across several pixels, distributing the remainder with integer error tracking.

Pressing F9 selects the flat fallback for shaded commands. The model’s flat-distance threshold can make the same choice at range, which explains the original’s visible switch to smoother shading as a building approaches.

[Sources: flat filler](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/flat_polygon.cpp), [Gouraud filler](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/gouraud_polygon.cpp), [near clipping](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/near_clip.cpp).

## The palette is part of the lighting engine

A polygon’s colour byte splits into two fields:

```text
ramp  = colour & 0xE0       // upper three bits: one of eight ramps
shade = colour & 0x1F       // lower five bits: position within that ramp
```

For ordinary shade codes 0–27, the renderer looks up a replacement shade, then combines it with the original ramp. Codes 28–31 take a special dynamic-colour path instead. The eight groups therefore cannot all be treated as 32 interchangeable brightness samples: their final four entries have other uses, including sky colours.

<figure><a href="../images/graphics/palettes.svg" aria-label="Open full-size diagram"><img src="../images/graphics/palettes.svg" alt="The first four colour ramps from Delphi and Halon, showing that reducing a shade index tends towards darkness in Delphi but can tend towards coloured haze in Halon" width="800" height="400" loading="lazy"></a><figcaption>Recovered source RGB values for ordinary shade codes 0–27 in four ramps. Palette design changes the meaning of the same index arithmetic. Runtime fades and VGA DAC quantisation are separate.</figcaption></figure>

### Distance chooses a table

At setup, the game builds **60 rows of 28 shade replacements** for surface scenes, or 28 rows underground. Each shade moves towards shade one as the row number increases. The stepping uses signed integer division and an initial half-shade fraction, rather than a floating-point blend.

One row is selected for an entire model, using the forward depth of its **origin**. All its ordinary face and vertex shades go through that row. A large building does not receive a separate fog calculation at every pixel or even at every corner.

This explains several visible characteristics. Buildings change brightness in steps. Their gradients become compressed at range. A building can change shade as the camera turns, because forward depth changes even if its radial distance barely moves. More screen pixels do not create more palette shades.

For an ordinary surface model, the relevant calculation can be expressed as:

```text
adjusted_depth = uint16(origin_depth + 16 × (255 − beacon_strength))
row            = min(adjusted_depth >> 8, 59)
output_index   = ramp + shade_table[row][shade]
```

The near-clipped path first clamps a negative origin depth to zero. The 16-bit wrap is intentional in this description of the original. Underground uses its shorter table and its own scene setup.

<div class="engine-demo" data-lighting-demo>
<p class="eyebrow">Try the actual shade-table arithmetic</p>
<div class="engine-demo-controls" hidden><label>Palette<select data-palette><option value="delphi">Delphi</option><option value="halon">Halon</option></select></label><label>Colour ramp<select data-ramp><option value="0">0 · neutral / light</option><option value="1">1 · rose / brown</option><option value="2">2 · stone / green</option><option value="3" selected>3 · warm stone</option></select></label><label>Authored shade <output data-shade-value>24</output><input data-shade type="range" min="0" max="27" value="24"></label><label>Origin depth <output data-depth-value>4096</output><input data-depth type="range" min="0" max="15104" step="64" value="4096"></label><label>Delphi beacon strength <output data-light-value>255</output><input data-light type="range" min="0" max="255" value="255"></label></div>
<canvas hidden width="720" height="192" aria-label="Palette shade progression through all 60 distance rows, with the selected row and colour indicated"></canvas>
<p data-light-result role="status">At depth 4096 and full light, row 16 maps authored shade 24 to shade 18. Enable JavaScript to explore the calculation.</p>
<p class="demo-note">A colour-table demonstration, not a miniature scene renderer. It uses recovered source palette values and the integer table formula. Halon supplies strength 255; changing a Delphi beacon does not change Halon lighting. Each row represents 256 camera-depth units.</p>
</div>

### Why Halon’s haze feels different

In Delphi, ordinary ramps mostly converge towards dark colours. Distant buildings become silhouettes against the purple horizon. Halon’s palettes include ramps whose low entries are already grey or coloured haze, so the same process can make buildings blend towards their surroundings instead of simply becoming black. There is no need to invent a separate RGB fog shader to explain that difference.

The palette is doing artistic work as well as saving memory. Geometry, shade indices and the background colours were authored to cooperate. Replacing that relationship with a generic fog colour changes the atmosphere even when the silhouettes are identical.

[Sources: exact shade-table construction and selection](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/model_lighting.cpp), [palette resources and colour commands](https://lostengines.com/darker/docs/model-colours.html), [palette atlas](https://lostengines.com/darker/analysis/media/palettes.html).

## Beacons and the horizon

Delphi’s lighting strength comes from the state of a beacon on its nine-cell lattice. Each horizontal coordinate selects:

```text
beacon_coordinate = 9 × floor((cell_coordinate + 4) / 9)
```

Applying this independently to the column and row gives an effectively **9 × 9-cell lighting region**. This is a grid lookup, not the summed contribution of nearby point lights. Intermediate beacon strengths change the region as a beacon fades.

The strength affects the model’s distance-table selection and its special dynamic colours. Thus nearby buildings and streetlights change appearance when a beacon goes out. There is no separate per-streetlight power switch needed for that effect. Nor does “unpowered” universally mean “draw no disc”: the original palette path can leave a dim lamp visible.

<figure class="comparison" data-comparison>
<div class="comparison-controls" hidden role="group" aria-label="Beacon lighting comparison"><button type="button" data-image="../images/graphics/fountain-gouraud.png" data-caption="Beacons at full strength" aria-pressed="true">Powered</button><button type="button" data-image="../images/graphics/fountain-unpowered.png" data-caption="Beacons at zero strength" aria-pressed="false">Unpowered</button></div>
<img class="pixel-image" src="../images/graphics/fountain-gouraud.png" alt="Controlled fountain view with beacons at full strength" width="320" height="240" loading="lazy">
<figcaption><strong data-comparison-caption>Beacons at full strength</strong> — this controlled comparison sets every type-one beacon to the selected endpoint and leaves the camera, animation clock and the rest of the city unchanged. It demonstrates the original visual response, not a specific mission event. <a href="../images/graphics/fountain-unpowered.png">Open the unpowered view separately</a>.</figcaption>
</figure>

This connects scenery and flight mechanics unusually closely: the lights that organise the city visually also matter to the Caero’s energy supply. The charging calculation itself is different, including distance/height attenuation and a check that the sampled cell really is a beacon. Visual dimming alone does not establish radar coverage or how much energy the player receives.

### An infinite ground beneath a small city neighbourhood

Before the objects, the renderer draws a background of **17 palette-coloured bands**. Their boundaries are placed from a short table of sixteen offsets, clustered tightly around the horizon. Pitch moves the horizon and roll tilts it. Integer sine, cosine and slope calculations turn those boundaries into spans.

At steep enough pitch the original can use one solid outer colour. That shortcut is appropriate to its narrow view; simply increasing field of view later can expose the assumption and leave sky or ground missing.

The lowest background is an infinite ground colour, not a gigantic terrain mesh. Roads, floor markings, cliffs and other terrain details are geometry drawn over it. The combination of a continuous background, a limited local neighbourhood and distance-darkened silhouettes makes the city appear to continue beyond the geometry currently being processed.

[Sources: background bands](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/sky_ground.cpp), [beacon lookup and scene lighting](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/city_scene.cpp), [charging is separate](https://lostengines.com/darker/docs/flight-physics-and-charging.html).

## The fountain trick

Kismet Square’s fountain is assembled from **twelve placed components**: two each of types 101–104 around the pool and one each of types 120–123 in its centre. The apparently rounded lights are screen-space discs. The pedestals, pool rim and moving central surfaces are polygons.

Look below the lights and you can see their reflections. It is tempting to infer translucent water or a reflection camera. Neither is needed.

The upper disc of type 101 sits at height 608 in the exported model coordinates. Its counterpart sits at 160. The water is at 384: each disc is exactly 224 units from the water plane. Pedestal faces have similarly mirrored counterparts, with different colours. **The reflected geometry is stored in the model.**

<figure><a href="../images/graphics/fountain-reflection.svg" aria-label="Open full-size diagram"><img src="../images/graphics/fountain-reflection.svg" alt="Fountain side section with a light at height 608, opaque water at 384 and its tinted copy at 160; three panels show water drawn first, reflected geometry second and upper structure afterwards" width="800" height="470" loading="lazy"></a><figcaption>The arithmetic of a reflection, implemented as authored vertices and paint order. The cross-section is explanatory, not a literal slice through every fountain component.</figcaption></figure>

The water’s opaque polygons are issued first. Tinted reflected geometry is issued afterwards, followed by the remaining structure. With no depth buffer rejecting the below-water pixels, the reflection appears on top of the already drawn water. The upper and lower discs even use the same radius numerator; their different palette colours provide the tint.

A modern viewer that sorts all faces by depth, or enables ordinary depth testing, can hide the reflection behind the water and make a correct asset look broken. For this model, retaining the original command order is more faithful than adding physically sensible visibility.

### Animated water without a fluid simulation

The central pieces read six height parameters. A routine updates those parameters from the game clock, the original sine table and six amplitudes. The disturbance progresses between adjacent bands, producing a travelling ripple. The model command replaces a coordinate component with a parameter; it does not simulate water, particles or a general deformable surface.

Its cycle is 2,048 source timer ticks, approximately **4.095 seconds** at the measured timer rate. Reusing the original clock and arithmetic preserves the relationship between all four central pieces.

[Explore the assembled animated fountain](https://lostengines.com/darker/analysis/models/fountain.html) in the detailed inspector. That browser view is useful for examining the construction, but uses its own projection and rasterisation.

### Other light effects are geometry too

Streetlights, landing approaches and the satellite building’s doorway use authored patches to suggest light falling onto the ground. These are coloured surfaces, not lights casting illumination onto arbitrary nearby objects. In some conditions a darker part of a patch can even paint over brighter ground. That is a visible consequence of drawing the artwork opaquely.

The disc instruction is equally economical. It takes the most recently emitted point as its centre and divides a stored radius numerator by projected depth. The rasteriser writes a small circle in screen space, including characteristic asymmetry at tiny radii. It looks round from every angle without a sphere mesh, texture or alpha-blended halo.

[Sources: exact fountain construction and command order](https://lostengines.com/darker/docs/model-components-and-aliases.html#fountain-reflections-authored-geometry-not-transparent-water), [animation parameters](https://lostengines.com/darker/docs/model-animation-and-states.html), [disc rasteriser](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/screen_primitives.cpp).

## Smoke, fire and moving objects

Not everything is a polygon model. Combat effects combine recipes of timed emitters with small pieces of original bitmap artwork. A recipe can give emitters different delays, lifetimes, radial motion and height changes; sound layers accompany some recipes.

The original has separate pools for **25 moving recipe emitters** and **20 trail sprites**. An emitter may produce several visible samples, so 25 emitters does not mean a limit of 25 illuminated pixels or 25 sprite draws. When the corresponding pool fills, the oldest active record can be reused.

Effect drawing joins the world’s ordered records. A ring-shaped recipe is projected as a sequence of samples, with its own arc traversal. Depth selects sprite artwork at sizes **16, 12, 8, 6 or 4 pixels**, eventually reducing the effect to a single point. This is selection among stored sizes, not continuous texture filtering. Masks specify the pixels to copy.

Buildings can obscure these effects through the ordinary draw order. They are not all pasted onto the finished frame as a screen-wide overlay. Conversely, sorting a whole emitter does not provide per-pixel depth against every piece of scenery.

Moving aircraft use the shared model interpreter with their own orientation. Their eventual single-point representation is another saving, separate from an effect’s sprite size. The original distant-point path even reuses shading state left by the preceding mesh, one of the small implementation dependencies that disappears if the system is redesigned too freely.

[Sources: effect recipes and native comparisons](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/docs/particle_effects.md), [particle projection and drawing](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/particles.cpp).

## Putting the cockpit around the world

The cockpit is not a three-dimensional model attached to the camera. It is assembled from bitmap artwork, then updated with instruments and overlays. The world is clipped to the appropriate viewing rectangle, and the cockpit’s irregular edges are composed around it.

One of the easy mistakes in reconstruction is to display the whole source sheet as a finished cockpit. The **320 × 200 sheet is an atlas**: it includes instrument states and other artwork that are copied elsewhere. Initial cockpit assembly copies rows 0–135 into the upper part of a 320 × 240 cache, then copies rows 96–199 into destination rows 136–239. The overlap is deliberate.

<figure><a href="../images/graphics/cockpit-layout.svg" aria-label="Open full-size diagram"><img src="../images/graphics/cockpit-layout.svg" alt="A 320 by 200 source atlas supplies overlapping row ranges to a 320 by 240 cockpit cache; separate arrows show the world viewport and masked instrument updates" width="800" height="430" loading="lazy"></a><figcaption>Artwork dimensions, cockpit-cache dimensions and the world viewport are three different things. The coloured rectangles show the transfers, not the final visible cockpit silhouette.</figcaption></figure>

Instrument changes copy narrow masked strips from this cache or from their lit states. Decreasing a gauge restores the appropriate background strips. Some masks overlap, so the update history can affect a few pixels: reconstructing every instrument from zero is not always equivalent to the original incremental update.

Transparency here means **do not write this pixel**. It is determined by a mask, not universally by palette index zero. A mask can copy a black pixel just as deliberately as a bright one. HUD lines, crosshairs and target outlines add procedural drawing; text uses packed glyph masks and palette colours.

### The last stage is VGA, not a modern shader

The retail startup enters BIOS mode 13h and then reprograms VGA timing for 320 × 240. The drawing code works with VGA plane masks and specialised span/blit routines. Pixel alignment matters enough that some sprite and glyph data has separate forms for different horizontal alignments.

Conceptually, the finished picture is still an indexed image. The palette’s RGB values go through the game’s brightness/fade handling and VGA DAC conversion. Changing a palette can recolour pixels without repainting their indices.

Darker C++ keeps an ordinary linear indexed buffer, then expands it to RGBA for the host display. That substitutes portable memory writes for VGA transactions. Matching indexed pixels validates the drawing arithmetic; it does not, by itself, emulate VGA latch behaviour, monitor response, scanout timing or every historical display mode.

[Sources: cockpit transfers and masks](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/docs/cockpit_rendering.md), [VGA startup observation](https://lostengines.com/darker/docs/executable-unpacking.html), [palette decoding and fades](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/palette_bitmap.cpp).

## What makes this engine distinctive?

Darker’s achievement is the coherence of its choices. Compact drawing programs describe reusable geometry. Cached coordinate contributions make those programs economical to execute. The map grid bounds the search. Painter ordering avoids a per-pixel depth buffer. Authored shades, palette ramps and the horizon create an atmosphere in which limited visibility feels appropriate. Beacons make that atmosphere part of the flight rules.

The fountain is a particularly good expression of the design. Its effect depends on geometry, animation, palette choices and painter order acting together. Separating “art” from “engine” too sharply misses why it works.

These choices also reveal the costs the engine was trying to avoid:

| Cost | Darker’s response | Visible trade-off |
| --- | --- | --- |
| Large vertex streams and repeated transforms | Reuse coordinates, negate cached contributions, call shared routines | Stateful interpretation and rounding quirks matter. |
| Considering the whole city | Local grid traversal and extent rejection | Limited view distance; edge cases at admission boundaries. |
| Solving visibility at every pixel | Background list, ordered model records and authored face order | Some overlaps cannot be resolved correctly. |
| Many finely shaded distant faces | Per-model flat fallback and eventual object points | Detail can change abruptly with distance. |
| General dynamic lighting and fog | Authored shades plus small palette lookup tables | Quantised brightness and model-wide changes. |
| Arbitrarily scaled particle artwork | A few sprite sizes, masks and distant points | Size transitions are discrete. |

### Distinctive does not automatically mean first

Gouraud shading was published in **1971**, long before Darker. Fixed-point transforms, polygon flight scenes, painter sorting and indexed colour were established techniques. We have no evidence that Darker invented them, or that its particular combination was an industry first. [Henri Gouraud’s 1971 paper](https://doi.org/10.1109/t-c.1971.223313) provides the historical starting point for smooth polygon shading.

It is nevertheless an interesting alternative to the world structures familiar from contemporary first-person shooters. Doom’s released renderer traverses a precomputed BSP of its world; Darker selects local cells that instantiate three-dimensional drawing programs. That difference is about the world each engine was built to show, not a ranking of which was “more 3D”. [Doom’s own BSP traversal source](https://github.com/id-Software/DOOM/blob/master/linuxdoom-1.10/r_bsp.c) is a useful comparison.

The recovered core strongly suggests substantial handwritten 16-bit x86 assembly: carefully shared instruction sequences, specialised register conventions and state stored in instruction operands. That remains an inference about the implementation, not proof of a particular assembler or that every component used the same language. The original authoring process is still unknown.

What can be credited confidently is the result: a rolling, pitching flight view over a recognisable city, with destructible scenery, changing regional light, animated geometry and an unusually unified visual style. The original credits name **Jas.C.Brooke** for writing, **Lyndon Brooke** for artwork, and **PC Music** for music; the game is a **Day 1** production published by **Psygnosis**. Those credits do not allocate individual renderer algorithms or model-authoring tools to particular people.

## Evidence, illustrations and further reading

This account describes the retail engine, using the unpacked executable, decoded assets and the faithful reconstruction at revision [`7cece8ab1208ef3771516a71f44ff88064c815ad`](https://github.com/Lost-Engines/darker-cpp/tree/7cece8ab1208ef3771516a71f44ff88064c815ad). Redux’s changes are deliberately outside its technical baseline. The diagrams are new explanatory drawings; they are not recovered design documents.

The reconstruction checks individual algorithms by executing the original x86 instructions with controlled inputs. Among the relevant fixtures are 504 flat-polygon cases, 256 Gouraud polygons, 512 near-plane intersections, 600 background images, and 384 underground visibility scans. Actual model and composed scene comparisons add coverage beyond synthetic polygons. These tests establish specific results under their tested inputs; they are not proof that every possible frame or hardware configuration is identical.

The small matched fountain views are generated through the faithful C++ scene renderer, with original 320 × 240 projection and a fixed clock. They use decoded source RGB values rather than a photographed CRT or a complete VGA DAC/scanout simulation. The cockpit and tunnel illustrations are existing native gameplay captures made with debug mission entry. Their capture/build provenance and the figure-generation instructions are recorded in the [illustration manifest](../data/graphics-figures.json).

The original game artwork, models and palettes remain the work of their creators. The article, demonstrations and explanatory diagrams are our research presentation.

For further exploration:

- [Browse the city layouts](../cities/) and [turn the models around](../models/) in this site’s modern inspection renderer.
- [Inspect the assembled fountain](https://lostengines.com/darker/analysis/models/fountain.html), including its authored draw order.
- [Read the detailed model-rendering reconstruction](https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/docs/model_rendering.md). Some paragraphs record earlier milestones; the source links in this article point to the implementation used here.
- [See how we unpacked and investigated the game](../story/).
- [Read Fabien Sanglard’s Build-engine analysis](https://fabiensanglard.net/duke3d/build_engine_internals.php), an inspiration for explaining a renderer through its data, diagrams and successive drawing steps. It describes a different engine; its algorithms are not evidence for Darker’s.
