## What happens when a missile hits?

An impact flash tells us that a projectile reached something. What happens next depends on the target. An aircraft compares the weapon's strength with its resistance, accumulates damage and gradually recovers. A building checks the collision volume that was struck, its permission bits and whether its model has a damaged form to move to.

That separation explains several experiences familiar from playing Darker: an Assassin shrugging off the Pinner, an office surviving repeated hits until a missile enters the doorway, or a warehouse requiring an elaborate two-stage weapon. The following rules are from the retail game; they also underpin the faithful C++ reconstruction.

## Finding an impact

Movement supplies old and new positions for a collision sweep. Testing the segment between them lets the engine find an obstacle crossed during the update, even when the projectile's endpoint lies beyond it.

Buildings carry collision definitions alongside their drawing programs. These definitions describe volumes and assign a response category to each primitive. The visible walls tell the player where a structure is; the collision stream decides which part was hit and how the game should respond.

The collision result then goes to the handler for that kind of object or projectile. Terrain, buildings and moving objects take different paths. This is why a weapon's numerical strength alone tells us very little about what it will do to the city. [Collision geometry and dispatch][collisions]

## Aircraft damage is measured against resistance

An ordinary enemy aircraft has a resistance byte, which we will call `R`. A hit supplies a strength byte, `S`. The object also holds a 16-bit damage accumulator, initially zero. Fatal damage occurs when an addition overflows 65,535.

The first comparison divides hits into three regions:

| Impact strength | Result |
| --- | --- |
| `S ≤ R` | Add one damage unit |
| `R < S < 2R` | Add an amount that rises steeply with strength |
| `S ≥ 2R` | Fatal hit |

In the middle region, the integer calculation is:

```text
damage = 257 × floor((256 × (S − R) + R) / R) + 1
```

The resistance is effectively the point at which a weapon begins to matter. At or below it, a hit adds one unit out of more than sixty-five thousand. Just above it, the formula begins producing much larger increments. At twice the resistance, the engine takes the fatal branch directly.

Pinner Direct has strength 52 on the surface. Against a Skimma Supa's resistance of 40, it adds **19,790** damage. Against an Assassin's resistance of 75, it adds **one**. Both hits can produce an impact effect, which makes the latter easy to mistake for slow progress.

<figure>
<a href="../images/combat/resistance.svg"><img src="../images/combat/resistance.svg" width="880" height="400" alt="Damage against a Skimma Supa remains at one unit through strength 40, rises towards fatal damage between strength 41 and 79, and becomes immediately fatal at strength 80." loading="lazy"></a>
<figcaption>Damage from one hit against a Supa. The Pinner Direct's surface strength of 52 falls partway up the useful range.</figcaption>
</figure>

## Damage also drains away

During the normal aircraft update, the engine subtracts `elapsed_ticks << recovery_shift` from accumulated damage, stopping at zero. A tougher craft can therefore have both greater resistance and a faster recovery rate.

| Aircraft | Resistance | Recovery shift | Approximate recovery per second |
| --- | ---: | ---: | ---: |
| Skimma Supa | 40 | 0 | 500 |
| Oppressor | 45 | 1 | 1,000 |
| Assassin | 75 | 2 | 2,000 |
| Stalker | 60 | 1 | 1,000 |
| Terrablitz | 78 | 1 | 1,000 |

A one-unit hit disappears on the next ordinary update. More substantial damage lasts long enough to accumulate across several shots, but a long chase gives the victim time to recover. An Assassin can remove almost a full accumulator in about 33 seconds while its normal callback continues running.

Once a fatal hit installs the falling-aircraft callback, ordinary recovery stops. The accumulating-damage calculation decides when the craft is mortally damaged; the subsequent falling and expiry logic controls its final moments.

Try changing strength and shot spacing below. The calculation repeats identical successful hits against one undamaged aircraft, with recovery between them.

<div class="engine-demo" data-damage-lab>
<p class="eyebrow">Aircraft damage calculator</p>
<div class="engine-demo-controls" hidden>
<label>Aircraft<select data-enemy><option value="0">Skimma Supa</option><option value="1">Oppressor</option><option value="2">Assassin</option><option value="3">Stalker</option><option value="4">Terrablitz</option></select></label>
<label>Strength<output data-strength-value>52</output><input data-strength aria-label="Weapon strength" type="range" min="1" max="255" value="52"></label>
<label>Seconds between hits<output data-gap-value>1.0</output><input data-gap aria-label="Seconds between hits" type="range" min="0" max="20" step="0.1" value="1"></label>
</div>
<p data-damage-result role="status">Pinner Direct (strength 52) adds 19,790 damage to a Supa. Four hits one second apart are enough to destroy it.</p>
<p class="demo-note">The spacing is converted to whole game ticks at 1,193,180 / 2,386 ticks per second. Recovery runs between hits. The formula applies to ordinary enemy aircraft.</p>
</div>

[Native damage and recovery routines][damage]

## Comparing the weapons

These are the minimum hit counts with no recovery between impacts. The maximum-effect rows assume a central blast, full charge with negligible travel time, or maximum beacon input as appropriate.

| Weapon or effect | Strength | Supa | Oppressor | Assassin | Stalker | Terrablitz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Pinner Direct, surface | 52 | 4 | 7 | — | — | — |
| Pinner Direct, underground | 59 | 3 | 4 | — | — | — |
| Pinner Mimic | 56 | 3 | 5 | — | — | — |
| Brent Hunter | 59 | 3 | 4 | — | — | — |
| Skimma gun | 50 | 4 | 9 | — | — | — |
| Skimma air missile 1 | 90 | 1 | 1 | 5 | 2 | 7 |
| Supa air missile 3 | 140 | 1 | 1 | 2 | 1 | 2 |
| Dual Launch, maximum paired blast | 152 | 1 | 1 | 1 | 1 | 2 |
| Caero Weapon, maximum beacon input | 249 | 1 | 1 | 1 | 1 | 1 |
| Chargeable, maximum | 127 | 1 | 1 | 2 | 1 | 2 |

The dashes mark the one-unit branch, which normal recovery wipes out between shots. The Dual Launch row counts paired explosions; the capsules' separate direct impacts are additional events.

Notice the Terrablitz at the end. Its one-hit threshold is 156, just beyond the Dual Launch blast's maximum of 152. An Assassin's threshold is 150, so that same central blast kills it outright. Small differences in the definition bytes make quite large differences to the useful weapon choices.

## A weapon can change strength during flight

The **Chargeable** transfers energy into an accumulator while the trigger is held. Below full charge it can transfer up to `64 × frame_step`; once full, maintaining the charge costs `2 × frame_step`.

On release, the accumulated charge is shifted right by four and becomes the projectile's lifetime. Full charge gives 4,095 ticks, about 8.19 seconds. At impact, the remaining lifetime determines strength: the high byte of `remaining_ticks × 8` feeds the aircraft-damage calculation. That gives a maximum of 127 immediately after launch, declining by roughly 15.6 strength units per second. In the last 255 ticks, this object-impact branch applies no damage.

Holding the trigger longer builds a stronger shot, but sending it on a long pursuit spends that advantage. Charge, range and resistance all meet in the same impact calculation.

The **Caero Weapon** uses a more unusual source of strength. At impact, it calls the beacon-power calculation with the projectile's position and height. Its strength is a baseline of 45 plus a contribution from that local power reading. At maximum reception it reaches 249; with no reception it remains at 45.

That makes the city's power field part of the battle itself. Chasing an enemy towards a lit tower can change the effectiveness of the eventual hit. The [flight article](../flight/#the-shape-of-the-power-field) describes the same power field as used for lift and charging. [Chargeable and Caero Weapon routines][weapons]

## Steering a projectile, or intercepting your own capsule

Pinner Direct follows its initial flight direction. Pinner Mimic instead reads the player's pitch and roll on each update, using them to steer the projectile. After firing, the pilot is still part of the guidance loop. Brent Hunter supplies ordinary object-target homing; Brent Ground follows a map-cell target.

Dual Launch makes the relationship between projectiles explicit. Firing the primary capsule switches the selected weapon to its follow-up. That follow-up takes the first capsule as its target, approaches it and triggers the paired area effect when close enough. The blast strength falls with distance from the explosion centre. Its tone also changes with the separation between the two units.

The follow-up handler checks for the expected primary definition in the projectile list. This is a deliberately linked attack with a specific first unit. It explains why the second shot behaves differently from an ordinary enemy-seeking missile, even when its geometry looks familiar. [Guidance and paired detonation][weapons]

## Buildings have vulnerable volumes

An ordinary ground-weapon impact must find a damage link in the building's current model. The collision primitive then supplies one of four categories:

| Category | Response in the ordinary Caero building-hit path |
| --- | --- |
| 0 | Damage allowed when the building is marked as a ground target |
| 1 | Reject building damage |
| 2 | Damage allowed without target marking; used by Delphi streetlights |
| 3 | Handled by the Diffuser sequence |

An accepted hit advances the cell state by `0x20`, allowing model selection to follow the damage link. A building can therefore change in one accepted hit while surviving any number of hits against a protected volume.

The offices, Delphi types **86–89**, are good examples. Each has five category-1 volumes around its solid structure and a thin category-0 volume recessed inside the entrance. The four types rotate the arrangement. A missile striking the outer walls is rejected; one travelling through the doorway can reach the vulnerable region.

<figure>
<a href="../images/combat/doorway.svg"><img src="../images/combat/doorway.svg" width="880" height="390" alt="Schematic top and side views of an office entrance. An external missile path meets a protected wall, while a path through the entrance reaches the recessed vulnerable volume." loading="lazy"></a>
<figcaption>Schematic of the office rule. The vulnerable volume sits behind the entrance; the full authored volumes can be inspected in the model browser.</figcaption>
</figure>

Hangar entrances 17 and 21 also mix protected and vulnerable volumes. Damaging an occupied launch entrance disables that reinforcement site. The warehouse's special rule uses category 3 across the whole vulnerable type-76 block, including both its collision boxes. Approaching an assembled warehouse, the surrounding invulnerable blocks can make this feel like a skylight-only test.

Open a model in the [collision-volume viewer][models] to inspect these regions. The rendering and collision streams were authored separately, giving the designer control over both the silhouette and the places a shot could matter. [Building collision categories][building-rules]

## Timing the Diffuser

The Forbes Diffuser records a building cell and an expiry time when its gas capsule hits an eligible category-3 target. Its trigger must hit that same cell during the permitted part of the smoke sequence.

The expiry is set 10,240 ticks after the gas hit. Detonation is accepted from elapsed tick **6,144 through 10,239**: about **12.29–20.48 seconds**. Before that window, a trigger impact produces its effect without destroying the building.

<figure>
<a href="../images/combat/diffuser.svg"><img src="../images/combat/diffuser.svg" width="880" height="230" alt="Diffuser timeline: gas hits at zero, smoke develops for about 12.29 seconds, and the trigger can destroy the building until about 20.48 seconds." loading="lazy"></a>
<figcaption>The retail Diffuser's useful trigger window occupies the last eight seconds of its recorded gas interval.</figcaption>
</figure>

The retail implementation keeps one shared cell and deadline. Another qualifying gas hit overwrites both, including a hit on the same building. That restarts the wait, which accounts for the frustrating cycle of missing a trigger, firing another gas capsule and having to wait again. Redux changes this behaviour; the timing above describes the original weapon.

## Permission and damage survive separately

Delphi stores the target-permission bit separately from the damage bit. Destruction can leave permission set, so a damaged building can still display the original targeting ring. It may already have reached the end of its model's damage links.

Streetlights use the category-2 exception. Several impact paths can break them without any mission assigning them as targets, including a player collision. Flying into a light can thus damage the light and crash the aircraft in the same response. Flying into an ordinary house crashes the aircraft while leaving the house intact.

The player's damage and shield routines are separate again, as are special scripted targets such as the Wrecker. The useful way to read a collision is to follow its handler: the same geometric hit can become accumulated aircraft damage, a model-state change, a timed weapon interaction or a crash. The [mission article](../missions/#what-the-city-remembers) follows those building states into the save file.

[collisions]: https://lostengines.com/darker/docs/player-collision-and-damage.html
[damage]: https://lostengines.com/darker/docs/weapon-behaviour.html#enemy-resistance-damage-and-recovery
[weapons]: https://lostengines.com/darker/docs/weapon-behaviour.html
[building-rules]: https://lostengines.com/darker/docs/weapon-behaviour.html#brent-ground-vulnerable-building-regions
[models]: https://lostengines.com/darker/analysis/models/index.html
