## Flying on borrowed light

Flying the Caero means learning where Delphi keeps its lights. Approach an energy beacon and the craft recharges, picks up speed and rises. Turn away and the support weakens. During a dogfight, the route back to a working beacon can matter as much as the position of the enemy behind you.

The manual describes the Caero as a civilian shuttle adapted to defend a city whose beacons already transmit power. The flight code takes that premise quite far: beacon input affects forward drive and upward support as well as charging the stores shown in the cockpit.

The Halon Skimma supplies its own drive and gains lift with speed. Underground, the Caero uses another controller that follows the tunnel network and receives power while connected to its route. Each system gives the same controls a different feel.

We will look at all three systems in the **1995 retail game**, starting with the state they share and then following how each one turns the pilot’s controls into movement. The equations and numerical examples come from the recovered code and our [Darker C++ reconstruction](https://github.com/Lost-Engines/darker-cpp).

<figure>
<img class="pixel-image" src="../images/flight/caero-flight.png" width="640" height="480" alt="The Caero seen from behind in flight over Delphi, with its two bright engine discs against the dark city.">
<figcaption>The Caero over Delphi in Darker C++, mission one.</figcaption>
</figure>

## Attitude and velocity

Three angles describe the craft’s **attitude**: heading around the horizon, pitch of the nose, and roll of the wings. Its movement is stored separately, as a horizontal velocity and a vertical velocity. A level-looking Caero can therefore still be climbing or sinking.

Each update projects the horizontal velocity along the current heading and uses the vertical velocity to change altitude. Turning the craft redirects its horizontal movement immediately. Acceleration and deceleration take time, because each velocity approaches a target over successive updates.

The code also calculates a combined speed by taking the integer square root of the two squared velocities. Several later decisions use that value, including low-speed assistance. A rapid descent can therefore affect a speed-dependent rule even when forward movement is slow.

<figure>
<a href="../images/flight/attitude.svg"><img src="../images/flight/attitude.svg" width="800" height="360" alt="Schematic views distinguishing pitch, roll and heading, followed by separate horizontal and vertical movement arrows." loading="lazy"></a>
<figcaption>The three attitude angles and the two velocity components used by the player craft.</figcaption>
</figure>

Much of the flight code is concerned with assembling those **target velocities**. For vertical motion, it adds the upward contribution from the craft’s lift system, the effect of pitching the drive upwards or downwards, and two downward terms. The current velocity moves part of the way towards the result. If the ship is descending rapidly, an upward target first slows the descent before it produces a climb.

[Shared movement code][motion] · [Craft state][caero-header]

## One update, three different controllers

The controls first become a bank demand and a pitch demand. Held keys retain a steering target; mouse movement adds to a target that decays over time. These demands drive damped angular rates, which then change the craft’s angles. There are two layers of response between an input and the resulting attitude, giving steering some persistence after the pilot releases a control.

In ordinary surface flight, bank is updated first. Intermediate bank and pitch angles then help determine the heading change and the lift projection. Horizontal movement happens before the final vertical update. The Caero samples beacon power at its **new horizontal position but its previous height**; both craft families measure their combined speed before updating vertical velocity.

Some results carry into the following update. The Caero saves a contribution from beacon power for its next forward target, while using the same input immediately for lift. Crossing a beacon boundary therefore affects vertical and forward demand at slightly different times.

<figure>
<a href="../images/flight/controllers.svg"><img src="../images/flight/controllers.svg" width="800" height="510" alt="Three paths share controls and movement: Caero uses beacon power and stored boost, Skimma uses a speed setting and speed-based lift, tunnels use route alignment and a connection reserve." loading="lazy"></a>
<figcaption>Three controllers build their movement targets from different inputs, then use shared helpers to update velocity and position.</figcaption>
</figure>

Elapsed time comes from a timer running at approximately **500.075 ticks per second**. Each frame consumes the ticks that have passed since the preceding update. Integer rounding happens during each update, making the exact sequence of step sizes relevant when comparing two flights. [Controls][controls] · [Caero update][caero] · [Skimma update][skimma] · [Timer consumption][clock]

## Which beacon is powering the Caero?

Delphi’s energy beacons occupy a regular 15-by-15 lattice: map coordinates 0, 9, 18 and so on, through 126, on each horizontal axis. The game uses a lookup table to select **one lattice cell** from the craft’s position. It checks that this cell contains a type-one energy beacon, then reads its current strength byte.

That one tower supplies the entire reading for its region, even if a brighter neighbour is visible. The calculation uses position and tower strength, so a building between the aircraft and the tower has no effect on reception.

Within the city, the lookup is equivalent to selecting `9 × floor((cell + 4) / 9)` on each axis. The calculation starts from the integer map cell. Tower centres lie half a cell into their tiles, and the selection boundary lies midway between adjacent centres.

<figure>
<a href="../images/flight/beacon-selection.svg"><img src="../images/flight/beacon-selection.svg" width="800" height="420" alt="Two adjacent nine-cell selection regions. The left tower is extinguished, but its entire region still selects it; the working right-hand tower supplies power only after crossing the boundary." loading="lazy"></a>
<figcaption>A dead beacon leaves a dead selection region. Power returns when the craft crosses into the working neighbour’s region.</figcaption>
</figure>

A single failed tower removes power across its whole region. As neighbouring towers go out, the surviving regions dictate increasingly narrow routes through the city. Crossing between towers of different strengths can produce a sharp change in the power received. [Beacon selection and attenuation][beacon] · [Original-code beacon probes][beacon-reference]

## The shape of the power field

Once a tower has been selected, the code calculates distance from the middle of its tile at height **2,400**, near the luminous head. Horizontal separation and height difference both count. The strongest reception is beside the light itself.

Power falls roughly as the reciprocal of squared distance plus a constant. Within half a cell of the source, the result reaches a plateau. A separate altitude test cuts it to zero at height **11,616** and above.

The resulting value, called `B` in the equations below, feeds the Caero’s drive, lift and charging calculations:

| Position relative to a full-strength beacon | Returned power |
| --- | ---: |
| At its centre, height 2,400 | 13,107 |
| Half a map cell away horizontally, same height | 13,107 |
| One cell away horizontally, same height | 8,191 |
| Two cells away horizontally, same height | 3,276 |
| Directly below it at height zero | 6,904 |
| Directly above it at height 11,615 | 771 |
| Height 11,616 | 0 |

<figure>
<a href="../images/flight/power-profile.svg"><img src="../images/flight/power-profile.svg" width="800" height="470" alt="Calculated beacon power between two towers, comparing heights zero, 2,400 and 6,000. Power is strongest near either tower and weakest midway between them." loading="lazy"></a>
<figcaption>Calculated power along the line between two fully powered beacons, nine cells apart. The flat tops at light height come from the minimum distance denominator.</figcaption>
</figure>

<details class="technical">
<summary>The distance equation, in native units</summary>

Let `X` and `Y` be the horizontal position words, `fx` and `fy` their fractional bytes, `h` the altitude, and `C` and `R` the selected beacon’s map coordinates. One horizontal map cell contains 256 position-word units. The source constructs:

```text
dx = 16 × (X − 256C) + (fx >> 4) − 2048
dy = 16 × (Y − 256R) + (fy >> 4) − 2048
dz = 2h − 4800

d = (dx² + dy² + dz²) >> 14
B = floor(strength × 65793 / (max(256, d) + 1024))
```

The components use signed 16-bit arithmetic, the sum wraps at 32 bits, and the denominator wraps at 16 bits. These widths become relevant near the limits of the coordinate range. The values in the table use ordinary city coordinates and positive heights.

For intuition, measure vertical displacement in units of 2,048 per horizontal cell, and let `r` be the resulting distance in cell widths. Ignoring integer truncation, a full-strength tower gives approximately:

```text
B ≈ 16383.75 / (1 + max(0.25, r²))
```

This form makes the plateau easier to see: every point within half a cell uses the same denominator, 1.25. Beyond it, the squared-distance term grows quickly.

</details>

### Try the selection boundary

Move the sample point between the two towers. Reduce the left beacon’s output, or raise the craft above the cutoff. The engine and brake controls show two different ways of changing the Caero’s response to the same field.

<div class="engine-demo flight-demo" data-beacon-lab>
<p class="eyebrow">Beacon field explorer</p>
<div class="engine-demo-controls" hidden>
<label>Distance from left tower (cells)<output data-offset-value>0</output><input data-offset aria-label="Distance from left tower in cells" type="range" min="0" max="9" step="0.03125" value="0"></label>
<label>Height (engine units)<output data-height-value>2400</output><input data-height aria-label="Height in engine units" type="range" min="0" max="12000" step="16" value="2400"></label>
<label>Left beacon strength<output data-strength-value>255</output><input data-strength aria-label="Left beacon strength" type="range" min="0" max="255" step="1" value="255"></label>
<div class="flight-switches"><label><input data-engine type="checkbox" checked>Caero engine on</label><label><input data-brake type="checkbox">Brake held</label></div>
</div>
<canvas width="800" height="320" hidden aria-label="Power between two towers, with the current sample position marked"></canvas>
<p data-beacon-result role="status">At the left tower’s centre and height 2,400: raw power 13,107; upright manual lift contribution +1,638. Holding the brake caps that contribution at +127.</p>
<p class="demo-note">The right beacon stays at full strength. The line runs from cell (54, 63) to (63, 63). Lift is calculated for level wings and zero pitch; the downward bias and altitude penalty are added in the vertical-motion section below.</p>
<noscript><p>The table and static profile above show the same rules without interactive controls.</p></noscript>
</div>

Mission scripts fade beacons through intermediate strengths, weakening the supply as the light declines. They can turn whole groups off and bring others back, changing the safe routes during a mission. The [blackout browser][blackouts] shows these scripted sequences. [Beacon arithmetic][beacon] · [Scripted fades][beacon-changes]

## One field, several uses for power

The Caero keeps four stores: a working supply, weapon charge, stored boost and the boost currently being spent. Incoming beacon power replenishes them through different paths, with different rates and limits.

<figure>
<a href="../images/flight/energy-flow.svg"><img src="../images/flight/energy-flow.svg" width="800" height="560" alt="Incoming beacon power feeds immediate lift and next-update forward bias, replenishes a working buffer, and charges stored boost. The buffer supplies ordinary drive and weapon charge; Enter spends a boost cell into active boost." loading="lazy"></a>
<figcaption>Beacon input feeds lift and forward drive directly, as well as replenishing stores for later use.</figcaption>
</figure>

| Quantity | What it does |
| --- | --- |
| Current beacon input | Supplies the incoming-power indication, immediate lift, and part of the next forward demand. |
| Working buffer | Feeds ordinary forward drive and transfers charge into the weapon reserve. |
| Weapon reserve | Powers the Caero’s weapon system. |
| Stored boost | Builds up the cells that Enter can spend. |
| Active boost | A temporary drive budget consumed by subsequent flight updates. |

Only a limited part of the incoming value replenishes the working buffer. Stronger input charges the boost store much more quickly. Weapon charge transfers from the buffer only when the incoming source is at least 256, and is also limited by the buffer’s contents and the remaining reserve capacity.

The stores give the pilot time to react to a blackout. Lift changes immediately with the sampled field, but the working buffer continues contributing drive and stored boost remains available to spend. The craft’s velocity then takes time to follow the reduced demand. Together these give it some chance of reaching another powered region.

Switching the engine off makes incoming power zero for charging and the direct beacon contributions. The existing stores and velocity remain. [Energy accounting][energy] · [Cockpit instruments][hud]

### Spending a boost cell

Pressing Enter spends **8,192 stored units**, one complete cell, and starts an active boost. Internally, it sets the active boost’s high byte to 56 while retaining the low byte. Following updates consume that budget and use it to increase the forward target.

With ordinary small timesteps, a fresh active boost supplies about **0.45 seconds** of additional drive. The velocity gained persists after the budget runs out. Pressing Enter again resets the active duration, so spending several cells in quick succession wastes some of the drive already paid for.

The hangar startup has its own charging phase. It builds the starting boost cells while the engine is enabled and pauses that accumulation when it is disabled. Activating a boost then switches the craft into its airborne callback and starts the launch. [Boost and startup code][caero]

## Why the Caero rises beside a beacon

After constructing forward demand, the flight code builds a vertical target from four contributions:

```text
vertical target = pitched drive + beacon lift
                  + craft vertical bias − altitude penalty
```

The pitched drive is approximately the forward demand multiplied by the sine of pitch. The Caero’s vertical bias is −90. The altitude penalty is the integer part of `|height − 256| / 32`, so moving away from that reference height increases a downward term.

Beacon lift depends on both the current incoming power and the craft’s orientation. For a level, upright craft in ordinary manual flight, it is approximately **one eighth of the beacon input**. At full power near the light head, that is a very large upward contribution compared with the downward bias.

At height 2,400, with zero pitch and roll, the integer terms are:

| Contribution | Ordinary flight | Brake held | No incoming power |
| --- | ---: | ---: | ---: |
| Pitched drive | 0 | 0 | 0 |
| Beacon lift | +1,638 | +127 | 0 |
| Craft bias | −90 | −90 | −90 |
| Altitude penalty | −67 | −67 | −67 |
| **Vertical target** | **+1,481** | **−30** | **−157** |

This is why the Caero can rise beside a tower while its nose remains level: beacon input drives the vertical velocity upwards directly. The controls still set attitude, so the pilot can counter the climb by pitching the forward drive downwards.

Height affects both sides of the balance. Climbing towards the light head improves reception, while continuing above it weakens reception again. At the same time, the altitude penalty grows with distance from height 256. [Caero vertical update][caero] · [Shared attitude projection][attitude]

<details class="technical">
<summary>Bank, pitch and the exact lift branches</summary>

The shared attitude helper multiplies two signed sine-table cosines. Let `Q` be the signed high word of `cos(bank) × cos(pitch)`, with each cosine in the original approximately ±32767 scale. A level upright craft gives `Q = 16382`.

For the Caero, first compute:

```text
L = high_signed_word(abs(Q) × incoming_power)
V = signed_word((forward_target × sin(pitch)) >> 15)
```

When `L` is nonnegative, the normal branches are:

```text
braking:                        L = min(L, 255)
otherwise, if V <= 0:
    altitude hold enabled:      L = min(L, 255)
    manual flight:              L = max(0, L + V)

vertical_target = V + vertical_bias + (L >> 1)
                  − (abs(height − 256) >> 5)
```

The final halving makes the brake’s maximum upward contribution 127. In manual flight, downward pitched drive also reduces `L`, helping a deliberate dive overcome beacon support. Altitude hold caps `L` while pitched drive is level or descending, and allows the full value while climbing.

</details>

## Banking, turning and low-speed flight

The turning helper combines bank angle, pitch cosine and the pilot’s pitch-steering change to alter heading. Pitch input is projected through the bank, splitting its effect between turning and raising the nose. Pulling back in a banked turn therefore tightens the turn as well as changing pitch.

The bank-and-pitch projection also reduces lift. At a 90-degree bank, its cosine is zero. A level Caero then loses its beacon lift contribution even beside a powerful tower.

Continue rolling and something unusual happens. The Caero takes the **absolute value** of the projection before multiplying it by beacon power. Past 90 degrees, upward support grows again; fully inverted, it has recovered its upright strength. The Skimma keeps the sign, so its corresponding lift points downwards when inverted.

<figure>
<a href="../images/flight/bank-lift.svg"><img src="../images/flight/bank-lift.svg" width="800" height="470" alt="Lift contribution versus bank: the Caero falls to zero at 90 degrees and rises again when inverted, while the Skimma's contribution becomes negative. Each is normalised to its own upright value." loading="lazy"></a>
<figcaption>Lift at zero pitch, with full beacon input for the Caero and horizontal velocity 600 for the Skimma. Each curve is scaled to its own upright value.</figcaption>
</figure>

At low speed the Caero adds a nose-down response. If its speed measure is at most **300** and the tentative pitch is above **−22.5 degrees**, a controller urges the pitch towards that angle. Its gain increases as speed falls, producing the increasingly insistent dive that the pilot feels when losing power.

The cockpit indication dims below 200, recovers at 410 or above, and retains its previous state in between. That gap—hysteresis—keeps it from flickering as speed hovers around a threshold.

A working beacon offers two ways out of the descent: its immediate lift opposes the sinking motion, and its forward-drive contribution helps restore speed, easing the nose-down response. [Turning and pitch projection][attitude] · [Low-speed Caero assistance][caero] · [Warning thresholds][instruments]

## Braking changes the balance of flight

Holding **Backspace** brakes the Caero by changing both its forward drive and its lift.

Normal flight adds approximately `incoming_power / 16` to a contribution saved for the next forward target. Holding the brake removes that addition. The smaller contribution from measured speed, the buffer-driven term and any active boost continue to feed forward demand.

Second, braking caps the beacon lift term, regardless of whether the pitched drive is rising or falling. The earlier example changes from an upward target of +1,481 to a slight downward target of −30. This makes braking useful for approaching a tower without being carried upwards so strongly, as well as for reducing pace.

**Charging continues while braking.** This makes the brake useful when collecting power: it suppresses the tower’s upward push while the stores recharge. In the example below, normal flight and braking produce the same weapon and boost charge over two updates, even as their motion separates.

| Two updates from the same Caero state | Horizontal velocity | Vertical velocity | Weapon charge gained | Boost charge gained |
| --- | ---: | ---: | ---: | ---: |
| Ordinary flight | 600 | +45 | 514 | 208 |
| Brake held | 588 | −2 | 514 | 208 |
| Beacon field extinguished | 588 | −6 | 0 | 0 |

For this comparison we started the Caero level at a beacon centre, height 2,400, with horizontal velocity 600, zero vertical velocity, a working buffer of 16,384 and no active boost. Each update advances eight timer ticks. The horizontal velocities remain identical through the first update; the second consumes the changed forward contribution saved by the first.

The other contexts implement braking differently:

| Flight context | What holding the brake changes |
| --- | --- |
| Surface Caero | Removes the beacon part of the next forward bias; caps beacon lift. |
| Surface Skimma or Supa | Substitutes drive setting **130**, then still adds one eighth of measured speed. |
| Underground Caero | Substitutes target speed **60**, before available-power scaling and route-resistance deductions. |

In the Skimma, slowing down also strengthens steering response and reduces speed-generated lift. In a tunnel, braking can bring the craft into its slow aiming regime. We will look at both shortly. [Caero brake branches][caero] · [Skimma drive][skimma] · [Tunnel drive][tunnel] · [Example data][figure-data]

## Holding an altitude

Pressing **A** toggles the Caero’s automatic altitude adjustment and records the current height. The controller compares that desired height with the actual height, adds an input-reference adjustment, limits the error and turns it into a desired pitch.

The resulting pitch is approached through the ordinary angular machinery. While assistance is active, the pilot’s pitch input adjusts the controller’s reference term. The craft takes time to turn, then time to change vertical velocity, so it can overshoot the requested height and correct back towards it.

In the ordinary range, the desired pitch is:

```text
height_error = desired_height + (pitch_reference >> 2) − actual_height
desired_pitch = clamp(height_error, −512, +512) × 8
```

The endpoints are ±4,096 angle units, or **±22.5 degrees**. The controller has that much pitch authority to recover its height, alongside the separate low-speed response. Its lift cap also restrains the upward surge beside a beacon when the pitched drive is level or descending.

Mission scripts can force this controller on and supply a target height. The retail Nightmare challenge sets it to **512**, far below the beacon light heads at 2,400. That explains the severe downward pull during part of the challenge: the automatic controller keeps trying to return the craft to street level. Near a working beacon, the pilot feels that demand competing with the upward support of the field.

[Altitude command and input reference][player] · [Caero pitch controller][caero] · [Scripted altitude control][script]

## The Halon craft

The Skimma and Skimma Supa use the same flight controller with different parameters. They supply their own drive and derive lift from horizontal velocity and orientation. Speed takes over the role that beacon power played in the Caero’s handling.

<figure>
<a href="../models/?bank=31&amp;model=special-26"><img src="../images/flight/skimma-model.png" width="940" height="700" alt="The angular, broad-winged Skimma model from the retail Halon bank, shown in the site's model viewer." loading="lazy"></a>
<figcaption>The Skimma, slot 26 in the Halon bank, shown in the model viewer. <a href="../models/?bank=31&amp;model=special-26">Rotate the model ↗</a></figcaption>
</figure>

Minus selects drive setting **248**, equals selects **500**, and Enter selects **640** on the upgraded Skimma Supa. The forward target adds one eighth of measured speed to that setting:

```text
forward_target = selected_setting + (measured_speed >> 3)
```

Braking replaces the selected setting with 130. Pitch projects the resulting target into horizontal motion, and the current velocity approaches it over time. Because measured speed feeds back into the target, the craft can settle above the selected drive value. Pad setup starts with its own value of 256, which the speed keys then replace.

For vertical motion the Skimma combines pitched drive, a craft-specific downward bias and the same altitude penalty used by the surface Caero. Its lift contribution is approximately:

```text
lift ≈ cos(bank) × cos(pitch) × (horizontal_velocity / 2 + 512) / 4
```

The integer implementation uses the shared signed projection `Q` and takes the high word of `Q × ((horizontal_velocity >> 1) + 512)`. The 512 provides some lift even at zero horizontal speed; the velocity term adds more as the craft accelerates. At zero pitch and roll, horizontal velocity 600 and height 2,400, the ordinary Skimma’s terms give `202 − 106 − 67 = +29` as the vertical target.

Its vertical integration uses **twice the timestep scale** of its horizontal integration. The Caero uses the same transformed step for both. Combined with the different target equations, this contributes to their different responses in climb and descent. [Skimma update][skimma] · [Player control policy][player]

### Why high speed changes the steering

The Skimma applies a speed-dependent gain before its usual angular response:

```text
deficit = max(0, 2047 − measured_speed)
gain = (deficit × deficit) >> 7
```

Bank drive, pitch drive and heading change use this gain at different scales. Roll also has a centring correction. As speed increases, the response shrinks rapidly: at roughly half the threshold speed, only a quarter of the zero-speed gain remains. At 2,047 it reaches zero.

<figure>
<a href="../images/flight/skimma-response.svg"><img src="../images/flight/skimma-response.svg" width="800" height="440" alt="The Skimma steering gain decreases quadratically from its maximum at zero speed to zero at speed measure 2,047." loading="lazy"></a>
<figcaption>Steering gain as a percentage of its zero-speed value. Craft-specific response constants scale this value before angular integration.</figcaption>
</figure>

The Skimma also has automatic pitch assistance. It nudges pitch towards −22.5 degrees when the craft is too slow or already pointing too far down. Above height 8,192, the speed threshold for that intervention rises with altitude. A separate upper-pitch threshold falls as height increases, making the controller increasingly willing to push the nose down during a climb.

| Surface parameter | Caero | Skimma | Skimma Supa |
| --- | ---: | ---: | ---: |
| Base angular response | 416 | 352 | 384 |
| Vertical bias | −90 | −106 | −110 |
| Source of upward support | Current beacon field | Horizontal-speed term | Horizontal-speed term |
| Inverted lift projection | Absolute value | Signed | Signed |
| Enter | Spend stored boost cell | No turbo action | Select 640 drive |
| E | Engine toggle | Shield toggle | Shield toggle |

The Supa’s higher base angular response makes it more responsive within the same controller. Its slightly stronger downward bias and additional drive setting complete the parameter changes. Both Skimmas use E to toggle shields, and both apply the speed-dependent gain above. [Craft definitions][definitions] · [Skimma callback][skimma]

## Underground: a different kind of flying

Entering a tunnel switches the Caero to a controller built around the map’s **route network**. It tracks the current connection, progress along the segment, a lookahead point and steering history. Guidance and manual input both contribute to movement.

<figure>
<img class="pixel-image" src="../images/graphics/tunnel.png" width="640" height="480" alt="A following-camera view of the Caero flying inside the illuminated tunnel." loading="lazy">
<figcaption>Following the Caero through mission 17 in Darker C++.</figcaption>
</figure>

Manual bank and pitch requests are smoothed and capped at a magnitude of 3,072. Increasing a request is approached twice as quickly as reducing it. Bank helps choose a preferred route direction; strong pitch input can affect the choice at particular junctions.

When the engine is enabled, the controller traces a target farther along the current route. If that connection fails, it can attempt to reacquire a suitable route from the current location and heading. With a valid path, it steers towards the lookahead target while blending in the pilot’s input.

Disagreement between requested steering and route alignment reduces response gain and increases a resistance measure. That resistance is deducted from target speed. Fighting the guidance therefore makes the craft both slower and less responsive, which helps explain why tunnel steering can feel so stubborn. The craft can still hit the walls while these corrections are trying to bring it back into line.

<figure>
<a href="../images/flight/tunnel-guidance.svg"><img src="../images/flight/tunnel-guidance.svg" width="800" height="440" alt="A schematic tunnel bend with the craft offset from its route centreline and aiming towards a lookahead point; manual demand and route error feed steering and resistance." loading="lazy"></a>
<figcaption>Following a bend: the route supplies a lookahead target, and the pilot’s demand modifies the approach. Disagreement adds resistance.</figcaption>
</figure>

### Where the underground power comes from

While the route state is connected, the callback replenishes the weapon reserve and a separate movement reserve. That movement reserve uses the same stored field as surface boost, but has a different cap and job underground. It is capped at **8,191**, replenished by eight units per tick, and drawn down by two units per tick during movement.

If the reserve cannot pay the current update’s cost, the target speed is scaled down according to what remains, then reduced again by route resistance. The power monitor displays `(3200 − resistance) >> 8`, falling to zero once resistance exceeds 3,200. Its falling reading warns of poor route alignment.

Losing the route connection stops replenishment. The controller switches steering calculations, applies an off-route vertical correction, starts a timer and tries to recover the connection. Meanwhile the movement reserve runs down. Straying from the route can therefore leave the craft short of power in a brightly lit tunnel.

### Braking, slow aiming and the return journey

Underground braking selects a target of 60 before power and resistance adjustments. At a speed measure of 180 or below, with a connected route and a forward setting of at least 256, the controller can enter a special aiming mode. It retains separate aiming offsets for heading and pitch, updates the underlying route-following motion, then applies those offsets to the final attitude. You can point away from the route without using precisely the same steering behaviour as fast travel.

The forward-setting condition gives the outgoing and return journeys different aiming behaviour. The portal supplies **96** at entry, **384** farther into the outgoing passage, **130** for the return and **96** for final capture. Only the outgoing value meets the 256 minimum for slow aiming; braking can then bring actual speed below the 180 threshold while that setting remains selected.

On the aligned return, the portal hands the craft to an automatic approach and settling routine. That routine flies it back up through the entrance, continuing the same world view throughout the transition. [Tunnel flight and power][tunnel] · [Portal settings and capture][portal] · [Automatic approach][hangar]

## Impacts, repair and landing

An impact can kick the craft’s angular rates, feeding a disturbance into the same state used for steering. The Caero repairs peripheral damage over time, including during flight outside beacon range. Skimmas accumulate shield charge over time too, with the E-key toggle controlling shield use.

A Caero returning to its hangar switches from manual flight to approach guidance. For a Skimma, landing means entering the inner part of a suitable supply pad while descending, with shields off and horizontal velocity below 320. Capture occurs in the height range 264–1,024. The pad controller aligns and centres the craft, then waits for sufficient output and a deliberate nose-up input to launch it again.

These transitions select the controller that will run on the next update: free flight, guided approach, landed service or a crash. [Damage and repair][damage] · [Player collisions][player] · [Pad approach and departure][supply]

## The integer machinery beneath the feeling

Darker’s compact implementation stores position words with fractional bytes and angles that wrap over 65,536 units per turn. The surface flight calculations use the original 1,024-sample sine table. The [graphics-engine article](../graphics/) explains the corresponding visual transforms; the same coordinate conventions also underpin motion.

For ordinary timesteps, the shared velocity approach can be written as:

```text
delta = arithmetic_shift_right((target − old_velocity) × timestep, 16)
new_velocity = old_velocity + delta + (delta == 0 ? 1 : 0)
midpoint = old_velocity + arithmetic_shift_right(new_velocity − old_velocity, 1)
```

Movement uses the midpoint between old and new velocity. If an update takes velocity from 100 to 120, for example, displacement is calculated with 110. This accounts for acceleration during the interval.

There is an odd detail in the extra increment. If target and old velocity are both 100, the scaled difference is zero and the next velocity becomes **101**. The same increment applies whenever truncation reduces a small change to zero. This comes directly from the original compare-and-add-with-carry sequence, and gives the integration a slight upward bias.

The Caero expands the timestep byte by a factor of 257 and halves it for its main movement and energy interval. A further halving produces its drive-accounting step. The Skimma uses that half-scaled interval horizontally but the full expanded interval vertically. Underground motion has its own use of those shared integrators.

To check the reconstruction, we ran the original instructions with known inputs and compared positions, velocities and stored controller state after each update. A one-unit discrepancy could then be traced to a particular operation, such as the zero-change increment above. The [flight trace browser][flight-traces] presents those comparisons. [Movement arithmetic][motion] · [Angular integration][angular]

[caero]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/caero_flight.cpp
[caero-header]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/caero_flight.h
[skimma]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/skimma_flight.cpp
[motion]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/flight_motion.cpp
[attitude]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/flight_attitude.cpp
[angular]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/angular_motion.cpp
[controls]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/flight_controls.cpp
[clock]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/game_clock.cpp
[beacon]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/beacon_light.cpp
[beacon-reference]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/tests/reference/beacon_energy_samples.h
[beacon-changes]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/beacon_changes.cpp
[energy]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/caero_energy.cpp
[player]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/player_flight.cpp
[script]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/mission_script.cpp
[definitions]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/object_definitions.h
[actor]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/actor_motion.cpp
[tunnel]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/tunnel_flight.cpp
[portal]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/tunnel_portal.cpp
[hangar]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/hangar.cpp
[supply]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/supply_pad.cpp
[damage]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/game/player_damage.cpp
[instruments]: https://github.com/Lost-Engines/darker-cpp/blob/7cece8ab1208ef3771516a71f44ff88064c815ad/src/graphics/flight_instruments.cpp
[hud]: https://lostengines.com/darker/docs/hud-and-formatted-text.md
[flight-traces]: https://lostengines.com/darker/analysis/flight-physics/index.html
[charging-notes]: https://lostengines.com/darker/docs/flight-physics-and-charging.md
[control-notes]: https://lostengines.com/darker/docs/flight-controls.md
[blackouts]: https://lostengines.com/darker/analysis/missions/blackouts.html
[figure-data]: ../data/flight-figures-data.json
