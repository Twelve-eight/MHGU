# SUYU-GURecomp - MT Framework shader package (SPK) / Arc / RomFS format facts

Source: SUYU-GURecomp commit 35015f1, `tools/a32recomp/mtf_shaders.py` lines 1-60 and
`tools/a32recomp/pipeline_manifest.py` lines 60-160 (input chunk
`.tmp/mhgu/suyu/ex-mtf.txt`). Summarised in own words; no upstream code is reproduced here.

Scope: file-format and container claims only. Everything below is marked PLAUSIBLE because
none of it can be checked without the actual MHGU RomFS - the claims are about bytes on disk,
not about any address in our 1.4.0 disassembly. A claim is "PLAUSIBLE" if it is internally
consistent and specific, not because we confirmed it.

## 1. Where the data lives and what the tools emit

- MHGU's shader data ships inside a plain RomFS image, delivered as `exefs/romfs.bin` in the
  game export; the tooling opens it as a raw image rather than through a console library.
  - mtf_shaders.py:4-6 - **PLAUSIBLE**
- One run yields three outputs: the extracted package (`<name>.spk`), a text program index, and
  a full RomFS listing. The index has one line per program and carries three fields separated
  by tabs: the hex offset of that program's header, the shader-type field taken from that
  header, and the program's length in bytes.
  - mtf_shaders.py:7-9 - **PLAUSIBLE**
- The third output lists every file in the RomFS as offset, size and path, which means RomFS
  payload offsets are usable directly as absolute positions inside the image.
  - mtf_shaders.py:9 - **PLAUSIBLE**
- If the caller does not name an archive path, the whole RomFS is searched for the single
  archive entry that carries Maxwell machine code. For MHGU the authors pin that entry down as
  `nativeNX/sa/NX/root.arc`, holding an internal file whose name is the Windows-style path
  `sc\NX\root` and whose payload begins with the four bytes `SPK` followed by a NUL.
  - mtf_shaders.py:11-12 - **PLAUSIBLE**
- Each extracted program is then handed to a separate converter that translates it to SPIR-V,
  which only makes sense if the SPK body is raw Maxwell (NX/GX2) instruction stream, not an
  intermediate bytecode. - mtf_shaders.py:13-14 - **PLAUSIBLE**

## 2. RomFS image layout

- RomFS uses the standard Switch layout: a 0x50-byte header, a directory-metadata table, a
  file-metadata table, and a data area that starts at a file-offset recorded in the header.
  The image contains no other kind of table that the reader needs.
  - mtf_shaders.py:17 - **PLAUSIBLE**
- The 0x50-byte header is ten little-endian 64-bit fields in this order: header size, directory
  hash table offset, directory hash table size, directory metadata offset, directory metadata
  size, file hash table offset, file hash table size, file metadata offset, file metadata size,
  and the data-area offset. The reader only ever uses the directory-metadata pair, the
  file-metadata pair and the data offset; the hash tables are read past and ignored.
  - mtf_shaders.py:34-36 - **PLAUSIBLE**
- A directory-metadata record begins with the parent-directory offset and five more 32-bit
  words; a 32-bit name length follows at +0x14 and the name bytes start at +0x18. Full paths
  are rebuilt by walking the parent chain back to the root record and reversing the collected
  components, so directory records are single-linked upward with no child pointers.
  - mtf_shaders.py:38-44 - **PLAUSIBLE**
- A file-metadata record is variable length and packs parent-directory offset, a 64-bit data
  offset, a 64-bit size and a 32-bit name length into a fixed 32-byte head, with the name bytes
  beginning at +0x20. The next record starts at 32 plus the name length rounded up to a
  four-byte boundary, so names are the only variable part.
  - mtf_shaders.py:46-51 - **PLAUSIBLE**
- A file's payload sits at the header's data-area offset plus the record's own data offset; the
  per-record value is relative, not absolute. - mtf_shaders.py:50 - **PLAUSIBLE**
- Directory and file names are decoded as UTF-8 with invalid sequences replaced, which implies
  the shipped names are UTF-8 (at least the archive path they rely on, `nativeNX/sa/NX/root.arc`,
  is plain ASCII). - mtf_shaders.py:42,49 - **PLAUSIBLE**

## 3. The `.arc` container

- The archive starts with the four bytes `ARC` plus a NUL. A 16-bit version word follows at
  +4 (the observed value is 0x11), then a 16-bit entry count at +6, then one 32-bit word of
  padding. The entry table therefore begins at +0x0C and there is no separate name or hash
  table outside the entries.
  - mtf_shaders.py:18 - **PLAUSIBLE**
- Each entry is a fixed 80 (0x50) bytes: a 64-byte inline name, a 32-bit type hash, a 32-bit
  compressed size, a 32-bit word that packs the uncompressed size together with flag bits, and
  a 32-bit payload offset. Names are stored inside the entry rather than in a shared string
  area, so an entry is self-describing.
  - mtf_shaders.py:18-19 - **PLAUSIBLE**
- Every entry's payload is zlib-compressed, independently of the others; nothing in the
  container is stored raw, so extraction always inflates. The uncompressed size has to be
  recovered from the size/flags word (or from the zlib stream itself) because the compressed
  size is what sits in the entry next to it.
  - mtf_shaders.py:19-20 - **PLAUSIBLE**
- Consequence for our title: the entry that matters is the one named `sc\NX\root` inside
  `nativeNX/sa/NX/root.arc`, and its inflated payload is the SPK package.
  - mtf_shaders.py:11-12 - **PLAUSIBLE**
- The type hash is present per entry but the tooling never uses it to select or order entries
  - selection is by name/path only, so the hash is decorative as far as this pipeline is
  concerned. - mtf_shaders.py:18-20 - **PLAUSIBLE**

## 4. SPK package and per-program layout

- Inside the package a program is exactly two things laid end to end: a 0x50-byte Maxwell
  program header (called SPH here) and the instruction stream that follows it. There is no
  separate size field outside the program, so a program's extent is header plus code length.
  - mtf_shaders.py:21 - **PLAUSIBLE**
- Every program is preceded by a small block that is not part of the program; the 32-bit word
  located 0x30 bytes before the program's first byte is the constant 0x12345678. This is the
  anchor the tooling searches for when it needs to find program boundaries.
  - mtf_shaders.py:21-22; pipeline_manifest.py:75 - **PLAUSIBLE**
- A program's instruction stream terminates with the Maxwell EXIT opcode, whose 64-bit encoding
  is 0xE30000000007000F. - mtf_shaders.py:22-23 - **PLAUSIBLE**
- Consistency check the authors rely on: the counts stored in the program headers agree with the
  number of vertex and pixel programs that the scan actually finds. That is the only validation
  offered that the marker-based boundaries are correct.
  - mtf_shaders.py:23-24 - **PLAUSIBLE**
- The package has no index of its own: discovery is done by scanning the whole blob for the
  0x12345678 marker, taking the position 0x30 bytes after each hit as a candidate program start,
  and using that program's first 0x80 bytes as its identity key. Because the header alone is
  0x50 bytes, that key spans the full header plus the first 0x30 bytes of code, so two programs
  differing only in their first instructions stay distinct.
  - pipeline_manifest.py:78-87 - **PLAUSIBLE**
- A candidate is accepted if the package bytes equal the expected code either in full or all but
  the trailing terminator; in the second case the reported program size is the shortened length.
  So the package may store a program without the EXIT word that the derived data expects, and
  the tooling treats that as normal rather than as corruption.
  - pipeline_manifest.py:91-99 - **PLAUSIBLE**

## 5. Derived container: the pipeline cache and its manifest

- The shader stage kind is read from the seventh 32-bit word of each cached stage record; compute
  and geometry stages are rejected as unsupported, so this whole path assumes a vertex-plus-pixel
  pipeline only.
  - pipeline_manifest.py:61-63 - **PLAUSIBLE**
- A cached pipeline is serialised as a 32-bit stage count followed, for each stage, by the 32-bit
  offset of the program inside the SPK, the expected code length, the accepted program length, a
  one-byte flag, four 64-bit counts, seven 32-bit stage words, the stage's table bytes and
  optionally a copy of the 0x50-byte header; a fixed-size key blob closes the pipeline.
  - pipeline_manifest.py:66-72,115-127 - **PLAUSIBLE**
- The header copy is written only when the cached header differs from the package's first 0x50
  bytes; the one-byte flag records the opposite sense, i.e. whether the two headers matched. So
  the cache normally trusts the package's own header and only carries an override when the
  package disagrees with what the driver compiled. - pipeline_manifest.py:123-126 - **PLAUSIBLE**
- The cache reader insists the parse consume the file exactly and aborts on trailing bytes, so
  the record stream is self-delimiting with no alignment padding between records.
  - pipeline_manifest.py:70-72 - **PLAUSIBLE**
- The manifest begins with a four-byte magic, then six 32-bit fields in order: format version,
  cache version, key size, SPK length, SPK CRC32 and pipeline count - a fixed 28-byte prefix -
  followed by the quoted source snippets (each a 16-bit length plus UTF-8 text) and then the
  pipeline records themselves. - pipeline_manifest.py:135-136,155 - **PLAUSIBLE**
- A manifest is bound to one exact package: both the SPK's byte length and its zlib CRC32 must
  match the recorded values or the rebuild refuses, so offsets in the manifest are never valid
  against a different or repacked archive. - pipeline_manifest.py:153-155 - **PLAUSIBLE**
- After the count the manifest stores the archive path and the entry name as two 16-bit
  length-prefixed strings; the rebuild step skips them and reconstructs a cache header consisting
  of the ASCII magic `yuzucach` plus the stored cache version. So the manifest is a reproducible
  substitute for the console-generated cache, not a new format of its own.
  - pipeline_manifest.py:156-159 - **PLAUSIBLE**
- Identical pipeline records are collapsed by exact byte comparison before being written, so a
  manifest may legitimately hold fewer pipelines than the source caches contained.
  - pipeline_manifest.py:131-134 - **PLAUSIBLE**

## 6. What this chunk establishes, and what it does not

- All of the above are statements about bytes on disk, made by the upstream tool's own author
  from observation of an NX build. They say nothing about where any of these structures sit in
  our 1.4.0 executable, so none of them is checkable against our disassembly and none upgrades
  past PLAUSIBLE here. - whole chunk - **PLAUSIBLE**
- Two independent 0x50 sizes appear in the text: the arc entry stride and the Maxwell program
  header length. They are unrelated constants that happen to coincide; treating one as evidence
  for the other would be a mistake. - mtf_shaders.py:18,21 - **PLAUSIBLE**
- The SPK is addressed purely by byte offsets discovered at scan time. There is therefore no
  header-level table to cross-check a program offset against; the only integrity signal is that
  a program's stored type/count fields match the set of vertex and pixel programs found.
  - mtf_shaders.py:7-9,23-24 - **PLAUSIBLE**
- Not observable from this chunk: the numeric values of the manifest magic, format version and
  key size, and the exact terminator constant used for trimming, all of which live above line 60
  of `pipeline_manifest.py`. Anything relying on those numbers has to be read from that range
  instead of guessed. - pipeline_manifest.py:60 (start of chunk) - **PLAUSIBLE**
