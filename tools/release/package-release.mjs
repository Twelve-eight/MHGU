// package-release.mjs — build the two shippable zips and print their checksums.
//
// Why: the item-box patch and the save editor are the two pieces that are finished enough to hand to another person, and
// a release that is assembled by hand is a release whose contents nobody can reproduce. This script copies exactly the
// tracked files a user needs, writes the zip, and prints a sha256 next to each so the download page can carry it.
//
// Usage: node tools/release/package-release.mjs [--out dist]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outIdx = process.argv.indexOf("--out");
const OUT = path.resolve(ROOT, outIdx > 0 ? process.argv[outIdx + 1] : "dist");
fs.mkdirSync(OUT, { recursive: true });

// Minimal zip writer (store + deflate), no dependencies.
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const [name, data] of files) {
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = comp.length < data.length;
    const body = useDeflate ? comp : data;
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, body);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(useDeflate ? 8 : 0, 10);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28); cd.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cd, nameBuf]));
    offset += local.length + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([Buffer.concat(chunks), cdBuf, end]);
}

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel));

// --- package 1: the save editor -------------------------------------------------------------------------------
const editorFiles = [
  "editor/README.md",
  "editor/ui/index.html", "editor/ui/app.mjs", "editor/ui/style.css",
  "editor/core/container.mjs", "editor/core/header.mjs", "editor/core/items.mjs", "editor/core/progress.mjs",
  "editor/test/roundtrip.mjs",
  "LICENSE",
];
for (const f of editorFiles) if (!fs.existsSync(path.join(ROOT, f))) { console.error("missing", f); process.exit(2); }
const editorZip = zip(editorFiles.map((f) => [f.replace(/^editor\//, ""), read(f)]));
fs.writeFileSync(path.join(OUT, "mhgu-save-editor.zip"), editorZip);

// --- package 2: the item-box patch ---------------------------------------------------------------------------
const patchFiles = [
  "patch/INSTALL.md",
  "patch/1.4.0.pchtxt",
  "patch/experimental-v8/1.4.0.pchtxt",
  "docs/patches/item-box-v7-plugin-spec.md",
  "LICENSE",
];
for (const f of patchFiles) if (!fs.existsSync(path.join(ROOT, f))) { console.error("missing", f); process.exit(2); }
const patchZip = zip(patchFiles.map((f) => [f.replace(/^patch\//, ""), read(f)]));
fs.writeFileSync(path.join(OUT, "mhgu-item-box-v7.zip"), patchZip);

// --- checksum manifest -----------------------------------------------------------------------------------------
const manifest = [
  ["mhgu-save-editor.zip", editorZip],
  ["mhgu-item-box-v7.zip", patchZip],
].map(([n, b]) => `${sha(b)}  ${n}  (${b.length} bytes)`).join("\n") + "\n";
fs.writeFileSync(path.join(OUT, "SHA256SUMS.txt"), manifest);
console.log(manifest.trim());
console.log(`\nwritten to ${OUT}`);
