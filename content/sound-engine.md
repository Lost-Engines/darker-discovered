## Five ways to hear the same game

Change the sound-card setting in Darker and a familiar piece can become surprisingly different. A bell loses its weight, a bass part comes forward, or a little percussion figure appears where another version leaves a gap. We started by extracting the music, then kept following the differences back through the drivers.

The game has six music selections and five arrangements of each. Its music resources contain programs for a sequencer: play this note, change that instrument, wait, repeat. The chosen driver turns those commands into register writes or MIDI messages, and the sound hardware turns them into audio. There is room for variation at every stage.

Here is the piece used under the quotations before the first mission. These are 48 kHz emulated renders from our reconstruction, using the original arrangements. Switch hardware during playback to hear the same point in the phrase.

<div class="engine-demo" data-music-comparison>
<p class="eyebrow">Listen: the opening quotations / group 6</p>
<div class="engine-demo-controls" hidden>
<label>Playback hardware<select data-music-mode><option value="soundblaster_awe32">Sound Blaster AWE32 · EMU8000</option><option value="soundblaster_fm">Sound Blaster FM · DBOPL</option><option value="gravis">Gravis UltraSound · 1 MiB</option><option value="roland-lapc">Roland LAPC-I · CM-32L</option><option value="roland-sc55">Roland SC-55 · SCC-1 arrangement</option></select></label>
</div>
<audio controls preload="none" aria-label="Group 6 on Sound Blaster AWE32" src="https://lostengines.com/darker/analysis/audio/native-loops/soundblaster_awe32/group-6-loop.flac"></audio>
<p data-music-status role="status">Sound Blaster AWE32. One complete loop, about 38.43 seconds.</p>
<p class="demo-note">The exports retain their relative levels. SC-55 uses a fixed −6.02 dB gain to leave room for its peaks. <a data-music-download href="https://lostengines.com/darker/analysis/audio/native-loops/soundblaster_awe32/group-6-loop.flac">Open this FLAC</a> · <a href="https://lostengines.com/darker/analysis/audio/native-loops/index.html">All hardware and pieces</a>.</p>
</div>

## Finding the score

The five music drivers occupy resources 33–37 in `DARKER.00`. Music starts immediately after them, with five resources for each selection. The loader's calculation is small enough to show in full:

```text
driver resource = 33 + hardware
music resource  = 38 + 5 × selection + hardware
```

Both inputs are zero-based. Selecting the second piece on the AWE32 therefore loads driver 37 and music resource 47. The loader appends the music to the driver and calls its song-selection entry. The driver includes the machinery needed to interpret that particular arrangement.

The headers identify **Sound Images Generation 2**. Darker's credits name **PC Music** for the music. The sequences give us notes, instruments and timing; they also preserve a considerable amount of the work involved in adapting a soundtrack to different cards.

| Driver | Arrangement | Where the sound comes from in our playback |
| --- | --- | --- |
| Sound Blaster | FM | OPL synthesis through DBOPL |
| Roland SCC-1 | General MIDI / Sound Canvas | SC-55 or SCC-1A firmware and sample ROMs |
| Roland LAPC-I | MT-32-family instruments | Munt with CM-32L ROMs and Darker's instrument upload |
| Gravis UltraSound | UltraMID | The original resident driver, patch files and an emulated GF1 |
| Sound Blaster AWE32 | EMU8000 | The original synthesis library and sample ROM, driving an emulated EMU8000 |

Our plain `midi` option supplies another useful listening reference: the SCC-1 arrangement played through FluidSynth and a SoundFont. The hardware-specific options let us examine the instrument sets and driver behaviour more closely. [Driver and arrangement inventory][hardware]

## A small interpreter keeps time

Each piece contains several independently advancing parts. A part has a position in its command stream, a waiting interval and musical state such as its selected instrument. An update reduces the wait and executes the next commands when they become due. Commands can emit notes, change volume or pitch, establish a loop point and jump back to it.

The music scheduler runs at a nominal interval of `23860 / 1193180` seconds, just under 20 milliseconds. A fixed-point tempo accumulator translates these updates into musical ticks. Fractions survive between calls, so a musical tick can fall on different scheduler calls as the remainder accumulates. A MIDI export with idealised timestamps can miss these little timing decisions.

To check the reconstruction, we ran the original sampled-music drivers for 16,384 scheduler updates per arrangement and compared their output with our C++ sequencer. For the MIDI-oriented drivers we captured the emitted bytes; for AWE32 we captured the corresponding note, controller and instrument calls. All 24 sampled-arrangement streams matched, including repeated loops.

The drivers have small semantic differences too. One command releases the previous note only on channels 0–11 in the SCC-1 driver, while the other sampled drivers release it on every sequence channel. GUS omits an initial set of channel-volume writes. Keeping these details in the interpreter preserves the arrangement as its driver actually plays it. [Sequencer checks][sequencer]

<figure>
<a href="../images/sound/playback.svg"><img src="../images/sound/playback.svg" width="880" height="410" alt="Music selection chooses a hardware-specific sequence. A timed interpreter produces events, which pass through the relevant instrument driver and emulated synthesiser to stereo audio." loading="lazy"></a>
<figcaption>The path from a resource in DARKER.00 to audio samples. Instruments can be defined in the game driver, device ROM or separately loaded patches.</figcaption>
</figure>

## Instruments made from operators and samples

The FM driver describes instruments using synthesiser parameters. On OPL, a small pair of oscillators can modulate one another; their waveforms, envelopes and modulation settings determine the resulting tone. A sharp attack and a changing modulation depth can produce a bell-like strike with very little stored data. The music uses OPL2-compatible features and produces mono output, which our audio device receives in both channels.

AWE32 takes a different route. Its EMU8000 plays samples through pitch, envelope and filtering controls, with stereo output. Darker's AWE32 resource contains a synthesis library as well as its sequencer. We run that original library in an isolated x86 environment: its port operations reach the emulated chip, which reads the AWE32 sample ROM. This retains the library's preset tables and voice handling.

That distinction helped explain why a first General MIDI rendering was only a starting point. A program number tells a synthesiser which instrument to select, but the sample, envelope and effects behind that number belong to the device. Loading the original library and ROM supplies those missing choices.

The arrangements differ as well. In group 2, the SCC-1 resource contains 521 note commands; LAPC-I, GUS and AWE32 each contain 609, and FM contains 374. Those are counts in the stored streams before looping. Changing the instrument bank alone cannot reproduce parts that were changed or omitted in the arrangement. [Arrangement comparison][hardware]

## Gravis: the instrument bank has to fit

The UltraSound stores its instrument samples in card RAM. Darker hands MIDI bytes to **UltraMID**, a resident DOS driver, and UltraMID handles instrument selection, voice allocation and envelopes.

In preload mode, UltraMID consults `ULTRAMID.INI` to choose a set of patches that will fit the detected RAM. The file has mappings for 256, 512, 768 and 1024 KiB. Even the 1 MiB mapping uses only 85 distinct patches: several General MIDI programs share a patch. Program zero, for example, uses the bright-piano patch in that mapping.

That makes RAM size audible. Reducing the card's memory changes the substitutions available to the whole soundtrack. The notes sent by Darker remain the same, but a phrase can acquire a quite different character because its instrument now shares another patch.

Our Gravis path runs UltraMID 1.12 with `-c`, its preload option, and passes the selected RAM size to the GF1 emulation. Darker itself forwards MIDI to the resident driver throughout playback. The [complete listening collection][loops] uses the 1 MiB configuration. [UltraMID integration and RAM mappings][gravis]

## Roland uploads six instruments

“Roland” in Darker's original setup selects the LAPC-I driver. Its initialisation emits 824 bytes of MIDI System Exclusive data: six custom timbres followed by six patch assignments.

A timbre here is a synthesis recipe. It contains oscillator, filter and envelope parameters for the instrument's *partials*, the components combined to make a voice. Five of Darker's instruments enable two partials; the sixth enables one. The driver places them in writable timbre memory and assigns them to zero-based programs 28–31, 66 and 67. It also sets their tuning, bend range and reverb choice.

Those assignments explain why feeding the arrangement to an ordinary GM bank sounds so different. The game expects those program numbers to have been replaced before the first note arrives. We reproduce the original upload byte for byte, then let Munt's CM-32L emulation play it.

The SCC-1 arrangement uses the Sound Canvas instrument family instead. Our SC-55 and SCC-1A modes receive that same event stream. Comparing their first thirty seconds across all six pieces gave very similar average levels and broad spectral balance: the largest level difference was about 0.3 dB. Their waveforms still differ, as modulation, voice timing and effects evolve during playback. [Custom instruments and hardware comparisons][hardware]

## Four percussion keys with nothing assigned

The LAPC-I arrangement also sends rhythm notes for keys **52, 55, 57 and 58**. In the CM-32L control ROM's factory rhythm map, all four entries select an OFF timbre with zero output level. They produce silence.

We initially suspected an incomplete instrument upload. Running the full original driver initialiser settled the question: its twelve SysEx messages define the six melodic timbres and their assignments. It sends no rhythm-map replacement. The silent notes are present in the game's event stream and reach the synthesiser successfully.

That led to a useful listening experiment. We applied percussion definitions from Roland's GM conversion bank while retaining Darker's melodic instruments. Several missing strikes then fitted comfortably into the arrangement. Loading the entire GM bank changed many more instruments and produced a much less convincing result.

The [percussion-bank recordings][percussion] preserve that experiment beside the unmodified playback. They let us hear what the otherwise silent rhythm events contribute. We suspect the LAPC-I adaptation was less thoroughly checked than another version of the soundtrack; the files contain no account of the composer's working setup.

## When the parts repeat at different lengths

Every part can hold its own loop pointer. Usually the parts agree on a loop length. Two arrangements make particularly good examples of what happens when they differ.

In FM group 2, one part loops every **768 musical ticks**, while the others loop every **4,608**. Six short repetitions fit exactly into the longer phrase. Once established, their relationship stays fixed.

The opening LAPC-I piece is stranger. Eleven parts loop over **9,168 ticks**, while part 10 loops over **8,784**. All reach their first backward jump at tick 12,672, but the shorter part returns to its loop boundary 384 ticks earlier on the next pass. That displacement grows with every repetition.

<figure>
<a href="../images/sound/loops.svg"><img src="../images/sound/loops.svg" width="880" height="370" alt="A timeline shows the common Roland loop and part 10 beginning their first repeat together. Later boundaries separate by 384 ticks per repetition because their lengths are 9168 and 8784 ticks." loading="lazy"></a>
<figcaption>The opening LAPC-I parts share their first loop jump, then drift apart. The shorter part uses the factory Syn Brass 1 and Fantasy patches during the piece.</figcaption>
</figure>

We checked the backward jumps by executing the original driver. It restores each saved stream pointer without inserting a compensating delay. The boundaries eventually coincide again after 183 long loops and 191 short ones, almost three hours after the first common jump.

Listening and moving the second part against the first suggested a more conventional alignment. Our [edited listening references][corrected] preserve that proposed arrangement. The [native stems][loops] retain the actual timing, including the leading silence of both parts. This is a useful case where extracting every note correctly still leaves a musical question to investigate.

## The chip has to keep running

The AWE32 and GUS drivers sometimes poll hardware registers while waiting for sample counters or voice ramps. Those waits exposed a mistake in our first emulation adapters. We advanced the chip to make the registers change, but threw away the audio produced during that advancement. Playback then joined the samples before the wait directly to those after it.

The result was a repeating click, including in offline renders. We were cutting tiny sections out of a continuous waveform. Keeping the samples generated during polling, in their proper order, fixed both paths. GUS also needed that elapsed time reflected in its emulated BIOS clock.

This was one of the places where listening supplied a better first clue than checking event streams. The notes and their timestamps already matched; the missing audio lay inside the hardware adapter. [Polling and audio continuity][gravis]

## Effects have their own synthesiser

Flight sounds use a separate FM path. The executable contains 39 ten-byte patch definitions, with timed and object-bound logic to start or alter them. Pitches can change during an effect: the Dual Launch follow-up's tone, for example, responds to its separation from the first capsule.

The original effects detector looks for Sound Blaster/OPL hardware independently of the music choice. A machine using a standalone Roland or GUS device could therefore have music while losing the FM effects. Our reconstruction supplies that effects path alongside the selected music backend.

AWE32 has a route for applying its effects processor to incoming FM audio, but Darker's library initialises the FM reverb and chorus sends to zero. Its sampled music can sound spacious without adding those effects to the radio chirp or the FM soundtrack. [Effects and hardware detection][effects]

## Putting the music back into the scenes

The presentation scripts select pieces explicitly. Startup and menus use group 1; the opening quotations use group 6, followed by group 2 for the welcome and briefing. Death and the final presentation also select group 6. Ordinary flight has no background music, leaving engine, weapon and warning sounds to carry the action.

Some records inherit the current music, and seamless mission transitions can bypass a briefing. Following the script calls gives a more useful map than assigning one song to every mission number. The [scene/music catalogue][scenes] follows those chains, while the [FLAC collection][loops] supplies complete introductions and loops for listening.

[hardware]: https://lostengines.com/darker/docs/music-hardware-variants.html
[sequencer]: https://lostengines.com/darker/docs/music-hardware-variants.html#runtime-sequencer-verification
[gravis]: https://lostengines.com/darker/docs/music-hardware-variants.html#native-awe32-and-gravis-playback
[effects]: https://lostengines.com/darker/docs/sound-effects.html
[loops]: https://lostengines.com/darker/analysis/audio/native-loops/index.html
[percussion]: https://lostengines.com/darker/analysis/audio/roland-gm-percussion-bank/README.html
[corrected]: https://lostengines.com/darker/analysis/audio/roland-gm-percussion-bank/group-1-corrected-loop.flac
[scenes]: https://lostengines.com/darker/analysis/presentations/music.html
