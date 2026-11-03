## The first instructions were the problem

Darker ran under DOSBox, but opening `X.EXE` in a disassembler gave us an unhelpful beginning. Control flow jumped into apparent operands, code changed underneath itself, and ordinary-looking returns led somewhere unexpected. Before following the renderer or mission code, we had to work out how the executable reached them.

The loader uses the processor's single-step interrupt to alternate between two instruction streams. Once that mechanism is understood, the transformations underneath it are quite manageable: decode the loader, recover a decompressor, expand the game image and apply its relocations.

The most revealing part is just five bytes long.

## What DOS loads

A DOS MZ executable begins with a header describing its initial code and stack positions, memory requirements and relocation entries. DOS loads the image into an available memory segment, applies the listed relocations and transfers control to its entry point.

For Darker, that first image is a loader followed by compressed data. The MZ header advertises no relocations. The game code we eventually want is still encoded inside the file, and the loader has its own relocation table to apply later.

Real-mode addresses are expressed as a segment and an offset. The physical address is `16 × segment + offset`. Moving a program to another load segment therefore changes the segment values needed by far pointers and other segment references. Relocation is the process of adding that load segment at the appropriate places.

We use image-relative offsets below, so an address identifies the same byte regardless of where DOS happened to load the program. [Original unpacking notes][notes]

## Borrowing the debugger's interrupt

The x86 **Trap Flag**, TF, asks the processor to raise interrupt 1 after an instruction. A debugger can use that to regain control after each step.

On entry to an interrupt handler, the stack contains a return address and saved flags. In real mode, the words at the top are the return IP, CS and FLAGS. `IRET` restores them. A handler can change where execution resumes by replacing the saved IP.

Darker installs this handler at packed-image offset `0x69`:

```asm
pop  bp         ; take the interrupted stream's next IP
push si         ; put the other stream's next IP in its place
xchg bp, si     ; save the interrupted IP in SI
iret            ; resume the other stream
```

The bytes are `5D 56 87 F5 CF`. The saved code segment stays the same. Only the return offset is exchanged, so both streams live in the same segment.

Suppose stream A has just finished an instruction. Its next address, A1, is on the interrupt stack, and SI holds B0. The handler returns to B0 and leaves A1 in SI. After stream B executes one instruction, its next address B1 is exchanged with A1. Execution returns to A1, with B1 ready for the next swap.

<figure>
<a href="../images/loader/interleave.svg"><img src="../images/loader/interleave.svg" width="880" height="410" alt="Instruction stream A and instruction stream B alternate after each interrupt. The handler exchanges the stacked return IP with SI, preserving the next address of the stream being left." loading="lazy"></a>
<figcaption>The interrupt handler acts as the switch between two instruction streams. A0, A1 and B0 are explanatory labels for their instruction boundaries.</figcaption>
</figure>

The processor clears TF while entering the interrupt handler; `IRET` restores the saved flags. That lets these four instructions perform the exchange before single-stepping resumes in the selected stream.

## Why a linear disassembly gets lost

x86 instructions have variable lengths. Decoding from one byte boundary can give a different instruction stream from decoding a byte later. A branch into the middle of an instruction as currently displayed simply asks the CPU to decode afresh at that destination.

The Trap Flag adds another source of control flow: the next executed instruction can come from the address in SI after an interrupt. The two streams also share registers, and the handler itself changes BP and SI, so they have to be followed together.

Our first Unicorn experiment stopped at interrupt 1 without delivering the installed handler. At that point we were no longer running the program's control flow. Letting DOSBox run an uninterrupted trace showed the exchange continuing into the depacker.

This gave us a much better question to ask of the listing: which bytes and registers does this instruction leave for the *other* stream? A strange branch or self-write could then be interpreted in its actual execution order. The loader eventually clears TF and restores the previous interrupt vector before entering the game.

## Turning the loader into a series of edits

Tracing every instruction was useful for discovery. To make a repeatable extractor, we reduced the necessary changes to five deterministic transformations:

1. Increment byte `0x9D`, changing `FF` to `00`.
2. Rotate each little-endian word at `0x5D, 0x5F, …, 0x6B` left by one bit. This reveals the interrupt-vector setup and handler.
3. XOR bytes `0x1A–0x53` with `FF`.
4. Visit source positions from `0x28D` down to `0xA7`, XORing the byte fourteen positions ahead with the current source byte.
5. Reverse the word order of `0x13C–0x29B` to recover the depacker in the order in which it executes.

The fourth operation is deliberately descending. Its source and destination ranges overlap, so reversing the traversal would change which version of a byte gets read.

The fifth has a neat explanation in the original instructions. A `LODSW` loop reads words forwards, while `PUSH AX` writes them downwards into another stack segment. The resulting block has its word order reversed. The loader uses that high-memory area to hold the depacker while it writes out the game image below.

These offsets are relative to the packed load image; add `0x20` for offsets in this particular EXE file. Our static unpacker, `tools/unpack_exe.py`, performs the transformations directly and checks the known input hash before using them.

## Expanding the game

The compressed stream begins at file offset `0x2BC`, occupies 52,236 bytes and runs exactly to the end of the file. Its decoder combines LZ-style back-references with encoded literal data.

A back-reference says “copy bytes that have already been produced”. This works well for repeated instructions, tables and strings. Literals supply new bytes that cannot usefully be represented by a previous sequence.

The decoder emits three forms:

| Token | Operation |
| --- | --- |
| Byte literal | Decrement a 16-bit key; XOR the input byte with its low byte; emit it. |
| Literal-word run | Decode a four-bit count; emit `2n + 6` words, XORing each with the current key and making the result the next key. |
| Back-reference | Copy from the previously emitted output, at a distance of the encoded value plus one. |

Control bits are read from little-endian 16-bit words, most-significant bit first, interleaved with the bytes used by the tokens. The original reader uses a sentinel bit and enters the literal path before its first bit test. Matching that starting state is important: a decoder that assumes an ordinary empty bit buffer starts reading the stream in the wrong place.

Back-reference overlap is intentional. Imagine the output currently ends in `AB`, followed by a command to copy six bytes from distance two:

```text
already emitted:  A B
copy 1:          A B A
copy 2:          A B A B
copy 3:          A B A B A
...
after six bytes: A B A B A B A B
```

The later copies read bytes just written by earlier copies. A forward byte-by-byte copy implements this naturally. Taking a snapshot of the initial source range would lose the expanding repetition.

<figure>
<a href="../images/loader/output.svg"><img src="../images/loader/output.svg" width="880" height="220" alt="The recovered 65536-byte image is made from 18669 byte literals, 17556 bytes in literal-word runs and 29311 bytes copied by back-references." loading="lazy"></a>
<figcaption>Contributions to the decoded image. Back-references produce about 45% of its bytes.</figcaption>
</figure>

The original stream contains 18,669 byte literals, 838 word runs and 7,460 back-references. Together they produce **65,536 bytes**. The end marker consumes the remaining input exactly. [Token counts and recovered files][manifest]

## The relocations hidden inside

The depacker applies fourteen relocations of its own. Its table groups offsets by segment and ends with information for the original stack. After expansion, each selected word receives the load segment, turning stored relative segment values into usable runtime addresses.

The recovered entry is at `load_segment:44F4`; the stack begins at `(load_segment + 2AA0):FFFE`. The initialized image occupies 64 KiB, with extra memory allocated for the stack, working state and loaded resources.

We used the recovered entries to write a new MZ header around the decoded image. DOS can then perform those relocations directly, allowing the unpacked game to start without repeating the outer loader.

An independent DOSBox memory capture gave us a byte-for-byte match for the unrelocated image. That comparison was especially useful because the static extractor and running loader reached the result by quite different routes. It gave us a stable file from which to name routines, decode tables and build the later tools.

## The game keeps modifying its code

At `44F4`, the startup routine searches the DOS environment for the program's pathname. It then returns to offset zero, where that pathname is copied over the startup routine's own storage. Those instructions have already done their job, so their space becomes data.

Elsewhere, values are kept directly in instruction operands. A routine can patch an immediate value and let the next invocation read it as part of executing the instruction. The mission scheduler's cached clock and several weapon parameters use this style. Following writes into the code segment is therefore part of understanding normal game state.

With the loader out of the way, the image became a usable map: input handlers, archive loading, sine tables, the model interpreter and the script dispatcher could all be studied in their running form. The next pieces of the investigation followed those connections into the [graphics engine](../graphics/) and the [mission system](../missions/).

[notes]: https://lostengines.com/darker/docs/executable-unpacking.html
[manifest]: https://lostengines.com/darker/analysis/unpacked/manifest.json
