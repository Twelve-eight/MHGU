// export-item-table.mjs — regenerate the editor's MHGU_item(uni).txt from docs/data/mhgu.db.
//
// ItemsForm.cs reads that file at startup, in UTF-16, one "id,name" line per item, and stops at the first line of two
// characters or fewer. The file is not in the repository, so the editor's item view cannot open and the data README's
// promised cross-check against it cannot run. The database already holds the same 21,153 items, so the file is a
// derived artefact: build it instead of missing it.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const ROOT = "G:/omp works/MHGU";
const OUT = process.argv[2];
if (!OUT) { console.error("usage: node export-item-table.mjs <output path>   (the editor reads it from its working directory)"); process.exit(2); }
// The database carries name/de/fr/es/it/ja only. It has no Chinese column, and the editor build this table came from
// shipped Chinese names, so what this writes is a functional fallback with the Latin names, not the original asset.
const LANG = process.env.LANG_COL || "name";
const db = new DatabaseSync(ROOT + "/docs/data/mhgu.db", { readOnly: true });
const rows = db.prepare("SELECT _id, COALESCE(" + LANG + ", name) AS name FROM items ORDER BY _id").all();
db.close();

const kept = [];
let empty = 0;
for (const r of rows) {
  if (!Number.isInteger(r._id)) { console.error(); process.exit(1); }
  if (!r.name) { empty++; continue; }   // the chosen language column can be blank for many rows; the English one is not
  if (String(r.name).includes(",")) { console.error(); process.exit(1); }
  kept.push(r);
}
// UTF-16LE with a BOM, CRLF line ends: what StreamReader with Encoding.Unicode and ReadLine expect on Windows
const text = "\uFEFF" + kept.map((r) => `${r._id},${r.name}`).join("\r\n") + "\r\n";
fs.writeFileSync(OUT, Buffer.from(text, "utf16le"));
console.log(`wrote ${OUT}: ${kept.length} items (${empty} rows had no name in this column), ${fs.statSync(OUT).size} bytes`);
