# EMC: enemy command table (`enemy\cmd_tbl\emNNN_00_cmdtbl`)

MHGU 1.4.0. Class `rEnemyCmd` (class-inventory.tsv:1756, size 192). Type hash `0x3aabba02` = crc32-noxor('rEnemyCmd') `0xbaabba02` with bit 31 cleared [C]. Decoder: `MHGU/tools/mhgu/emc.mjs`. All vaddrs are main 1.4.0 (vaddr = flat - 0x100).

Some arcs ship another monster's table (em002_00.arc holds em001_00_cmdtbl) [C].

## 1. Header (0x10 B)
| off | type | value |
|---|---|---|
| 0x0 | char[4] | `EMC\0` (loader checks 0x43,0x4d45 at 0x52138) [C] |
| 0x4 | u32 | version `0x20120804` (checked at 0x52150) [C] |
| 0x8 | u32 | section count, 21 in every file; loader loops `cmp r10,#21` (0x52348) [C] |
| 0xC | u32 | 0 |

## 2. Sections
`nsec` x 16 B descriptors at 0x10: `{u32 count, u32 offset, 0, 0}`. Each section is `count` x 16 B entries `{u32 length, u32 offset, 0, 0}`; offsets are from file start. Loader `0x520a0` allocates a pointer array per section at `obj+0x68+4*s` and stores `base+offset` per entry [C]. The section meaning (which AI state uses which section) is not mapped [U].

Runtime: the enemy keeps its rEnemyCmd at `em+0x2588` (stored at 0x68828 after the resource request at 0x6881c, DTI 0x18399bc) [C]. Accessor `0x51d70(cmd, i)` returns `[cmd+0x78][i]` if `i < [cmd+0x6c]` [C].

## 3. Script grammar
Each entry is a byte script of `length` bytes, run by interpreter `0x82f80` (called from 0x82f54). The loop at 0x83770 calls `0x50ce0(ip)` for the instruction length; 255 means end (branch 0x83d80); otherwise `op = *ip++` and a 256-way jump table at 0x837ac selects the handler; after the handler `ip += length` (0x855ac) [C].

Instruction length (`0x50ce0`, same rule with explicit sub in `0x50c64`), table `LEN[167]` at 0x1732c8c (pointer 0x1839998) [C]:
- `op > 0xa6`: end of script. Every script ends with exactly one `0xff` [C: 13514/13514 entries].
- `LEN[op]` bit 7 clear: leaf command, `LEN[op]` operand bytes follow.
- bit 7 set: block op, next byte is `sub`:
  - `sub 0` begin: `(LEN+1)&15` bytes including sub (operands of the block).
  - `sub 1` case: 2 bytes (`sub`, 1 operand), 3/4/5 bytes when `LEN&0xf0` is 0x90/0xa0/0xb0.
  - any other sub: 1 byte. Seen: 2 = default, 0xff = end of block, and 3 for op 0x31 only (41 times) [C].

Block semantics: the handler of a block op computes a value and calls matcher `0x8e144(ctx, ip, op, mode, value)`; the matcher walks `op.case` items of the same op (recursive skip of nested blocks via `0x8e044`) and returns the byte distance to the selected branch [C]. Nesting is balanced in all files (begin/endblock 46467/46467, 0 nesting errors) [C].

## 4. Opcodes
`LEN` shows the raw table byte. 101 opcodes share the no-op handler 0x8470c (`mov r0,#0; b 0x85a1c`); 143 distinct opcodes occur in the 111 files [C].

| op | LEN | evidence | meaning |
|---|---|---|---|
| 0x00 | 02 | handler 0x84628 [C] | leaf, 2 operands; operands `0,0xff` call 0x76008 (state reset path) [I] |
| 0x02, 0x07..0x0a, 0x0c | 80 | handlers pass op id + a byte from the enemy (0x07: `[sp+188]`, 0x08: `[sub+0x5cdc]`, 0x09: `[sub+0x5cdd]`, 0x0a: `[sub+0x2c0]`, 0x0c: `[sub+0x1ba]`) to 0x8e144 mode 0 [C] | switch on an enemy state byte; case operand = exact value [I] |
| 0x0b | 81 | mode 4 when begin operand is 0 (`movweq r3,#4`, 0x84780) [C] | switch on distance to target point (see 5) |
| 0x17 | 80 | mode 6 (0x83fc4) [C] | switch on 3-D distance `[sub+0x30..0x38]` vs `[sub+0x40..0x48]` (0x8e394) [C] |
| 0x23, 0x29, 0x63 | 80 | mode 0 with `[sub+0x5cb7]`, `[sub+0x5cb6]`, `[sub+0x5cba]` [C] | switch on enemy byte [I] |
| 0x31 | 82 | sub 3 seen 41 times [C] | block with a third branch marker [U] |
| 0x57 | 81 | mode 14 (0x84d54) [C] | like 0x0b, other target slot set [I] |
| 0x5c | 80 | mode 16 (0x84da4) [C] | switch on XZ distance `[sub+0x30/0x38]` - `[sub+0x40/0x48]` (0x8e434) [C] |
| 0x7c | 80 | mode 24 (0x8456c) [C] | switch on min of six floats `[sub+0x2e8..0x304]` (0x8e55c) [C] |
| others with LEN bit7 | 80..90 | MATCH list in `.tmp/scratch-t3/modes2.txt` | switch, mode 0 (exact value) [I] |
| leaf ops calling `0x86xxx`..`0x8cxxx` then 0x76008 | 00..06 | `.tmp/scratch-t3/modes2.txt` | action / parameter commands, not named [U] |
`sub` = `[ctx+0x1428]`, `ctx` = first argument of 0x82f80 (r8) [C]. Which entity `sub+0x30` and `sub+0x40` belong to (enemy vs hunter) is not proven [U]; the pattern fits target position and own position [I].

## 5. Distance operands
Matcher compare loop 0x8e74c: per `case` it builds a threshold `s20` by mode (jump table 0x8e770, index `mode-1`) and tests `vcmpe s20, s16; blt next-case` (0x8e86c), so a case matches when `distance <= threshold` and cases are checked in order [C: code; I: in-game effect].
- Modes 5,6,7,15,16,19,20,23,24,25: threshold = `case operand * 100` (0x8e7d4: `mov r3,#100` then int->float) [C]. Example 0x17 cases: 8, 10, 15 -> 800, 1000, 1500 units [C].
- Modes 4, 14, 21, 22: threshold = `table[case operand]`, 4-byte floats from `0x71164(ctx, slot)` = `[[ctx+0x75ec]+0x7c] + 16*slot` (bounded by `[..+0xfa]`) [C]. The distance itself is to a point offset from the enemy and rotated by heading u16 `[sub+0x54]` x `0x38c90fdb` (2*pi/65536) (0x8e2dc..0x8e354, 0x8ea30..) [C]. These thresholds live in another file, not in the cmd table [I].
- Modes 11 and 18: case operand is u16 `(b2<<8)|b3` (0x8e898), tested as a bitmask `value & mask == mask` (mode 11 also at 0x8eb3c) [C].
- Modes 0, 2, 3, 9, 10, 13, 17: raw case byte (0x8e8cc; mode 0 reaches it through `bhi` since `mode-1` wraps) [C]; mode 8: byte + 64 (0x8e8d8); mode 1: accumulates the byte (0x8e8c4) [C]; how each mode then compares (equality vs `<=`) is decided in the second table at 0x8e804 and is only read for the `blt` case 0x8e86c [I].

## 6. Open items
- Section index -> AI state mapping [U].
- Names for the ~95 leaf commands (handlers 0x86xxx..0x8cxxx) [U].
- Sight/hearing/view-angle/notice timers: no opcode found that reads them; the geometric switch ops above test distance only, no angle-cone or hunter crouch flag was seen in the matcher (modes 4..25 read positions and `[sub+0x2e8..0x304]` only) [U].
