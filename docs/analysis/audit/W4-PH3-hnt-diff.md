# W4-PH3 — what actually differs between the two `hunterA` snapshots

Status: **the three contested readings are falsified; the item stays `[U]`** because the observed
differences are structural fields, not the "8 markers" the history doc describes.

## Measured (2026-11-06, direct byte comparison)

Files, both exactly **1,177,760 B**:

- A = `MHGU-private/save-snapshots/20261022-v6-ready/hunterA_HR5.hnt`
- B = `MHGU-private/save-snapshots/20261022-clean-reference/hunterA_HR5_V7.hnt`

They differ in **5 byte runs, 32 bytes total**, and nowhere else:

| run | length | v6-ready | clean-reference |
|---|---:|---|---|
| `2057..2059` | 3 | `ea d7 02` | `00 00 00` |
| `2270..2275` | 6 | `40 fa b1 ce 4f 05` | `00 00 00 00 00 00` |
| `2292..2294` | 3 | `d0 6f 05` | `00 00 00` |
| `6332..6341` | 10 | all zero | `e0 27 0b bf 99 f8 d1 c6 af 06` |
| `7519..7528` | 10 | all zero | `40 7e bc f2 eb 99 9f ef fc 7e` |

The three short runs look like 3-byte values (≈186,346 and ≈356,304) and a 4-byte-plus-2 field; the two
ten-byte runs look like an 8-byte hash followed by 2 bytes. None of them reads as a list of 8 ids.

## The three contested readings, checked

| reading | claimed location | what the bytes say |
|---|---|---|
| history doc | `2400-2403` / `2900-2903` in v6-ready | **both regions are `00 00 00 00` in BOTH files** — no data there |
| audit | `2016-2019` / `2020-2023` in clean-reference | the 8 bytes `a0 76 02 af 13 b0 8a 80` are **identical in both files**, so they cannot be the difference the history doc describes |
| main session | 19-bit decode from char_off 632 | `632..648` is identical in both files; a 19-bit window starting there cannot produce a value only one snapshot has |

## What would settle it

Name the artefact the "8 markers" live in. The history doc says the *v6-ready file* carries them, but the
only per-character difference between the two snapshots is the 32 bytes above, so either

1. the markers are not ids but the 5 structural runs (then the doc's offsets are simply wrong and the
   widths are 3/6/3/8+2 bytes), or
2. the markers live in a different file (the `system` save, or a `.hnt` slot other than slot 0) and every
   reading so far has been looking in the wrong place.

Until one of those is chosen by whoever wrote the history entry, this stays `[U]` per the work order
("要先定 bitstream 起点或位宽，否则标 [U]").

## Reproduce

```
node -e "const fs=require('fs');const A=fs.readFileSync('G:/omp works/MHGU-private/save-snapshots/20261022-v6-ready/hunterA_HR5.hnt');const B=fs.readFileSync('G:/omp works/MHGU-private/save-snapshots/20261022-clean-reference/hunterA_HR5_V7.hnt');let r=[],s=-1;for(let i=0;i<A.length;i++){const d=A[i]!==B[i];if(d&&s<0)s=i;if(!d&&s>=0){r.push([s,i-1]);s=-1}}console.log(r.length, r.map(([a,b])=>a+'..'+b).join(' '))"
```

Expected output: `5 2057..2059 2270..2275 2292..2294 6332..6341 7519..7528`
