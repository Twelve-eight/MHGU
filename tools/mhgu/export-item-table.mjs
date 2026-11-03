// export-item-table.mjs — regenerate the editor's MHGU_item(uni).txt from docs/data/mhgu.db.
//
// ItemsForm.cs reads that file at startup, in UTF-16, one "id,name" line per item, and stops at the first line of two
// characters or fewer. The file is not in the repository, so the editor's item view cannot open and the data README's
// promised cross-check against it cannot run. The database already holds the same 21,153 items, so the file is a
// derived artefact: build it instead of missing it.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const ROOT = "G:/omp works/MHGU";
const OUT = process.argv[2] || ROOT + "/docs/data/MHGU_item(uni).txt";
const db = new DatabaseSync(ROOT + "/docs/data/mhgu.db", { readOnly: true });
const rows = db.prepare("SELECT _id, name FROM items ORDER BY _id").all();
db.close();

for (const r of rows) {
  if (!Number.isInteger(r._id) || !r.name) { console.error(`refusing: bad row ${JSON.stringify(r)}`); process.exit(1); }
  if (String(r.name).includes(",")) { console.error(`refusing: name contains a comma, the reader splits on it: ${r.name}`); process.exit(1); }
}
// UTF-16LE with a BOM, CRLF line ends: what StreamReader with Encoding.Unicode and ReadLine expect on Windows
const text = "\uFEFF" + rows.map((r) => `${r._id},${r.name}`).join("\r\n") + "\r\n";
fs.writeFileSync(OUT, Buffer.from(text, "utf16le"));
console.log(`wrote ${OUT}: ${rows.length} items, ${fs.statSync(OUT).size} bytes`);
