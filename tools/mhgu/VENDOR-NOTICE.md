# VENDOR-NOTICE — third-party runtime packages used by tools/mhgu

`tools/mhgu/vendor/` holds third-party npm packages unpacked locally so the audio tools can decode Opus without a
network install. The tree is **not** tracked by git and must never be pushed (AGENTS §7b: the public repo carries our
own work only); `tools/mhgu/vendor/` is in `.gitignore` and the 101 files that were briefly tracked were removed from
the index on 2026-11-03.

| package | version | licence | upstream |
|---|---|---|---|
| `opus-decoder` | 0.7.12 | MIT | https://github.com/eshaz/wasm-audio-decoders |
| `@wasm-audio-decoders/common` | 9.0.7 | MIT | https://github.com/eshaz/wasm-audio-decoders |
| `ogg-opus-decoder`, `codec-parser`, `simple-yenc`, `@eshaz/*` (transitive) | as installed | MIT | same project / npm |

Redistribution terms: MIT, so a copy is permitted with the licence text and copyright notice retained; the packages ship
their own `LICENSE`/`package.json` in place. We keep them out of the repository anyway, because the repository is for our
own work and the packages are reproducible with `npm i opus-decoder ogg-opus-decoder`.

Reprovision (only when an audio tool reports a missing module):

```
cd tools/mhgu
npm i --no-save opus-decoder ogg-opus-decoder
```

**History note.** Commits `f16e75f`…`HEAD` (26 unpushed commits as of 2026-11-03) still contain the vendor blobs in
their trees. Nothing has been pushed since they were added, so no public exposure happened. Before the first
`git push`, either rewrite those commits (`git filter-repo --path tools/mhgu/vendor --invert-paths`) or rebuild the
branch on top of `origin/master` without the vendor paths.
