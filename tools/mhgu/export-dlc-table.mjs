// export-dlc-table.mjs — rebuild the editor's MHGU_DLC.txt.
//
// What the editor actually uses (editor-src/MHGU存档修改/DLCForm.cs):
//   * the DLC block is a fixed array of 200 slots x 7168 bytes at save offset 63,641 (0xF899) = 1,433,600 bytes;
//   * slot i starts at 63,641 + i*7168 and its first three bytes are the identifier, little endian, shown as d7;
//   * column 2 (id_Address) is parsed but the list prints its own computed address, and column 3 (id_checked) is parsed
//     into DLCStr.id_checked and never read anywhere else in the editor -- both are vestigial;
//   * the only thing the file is consulted for is `identifier -> name` (dic_DLCName).
//
// Names come from docs/data/mhgu.db: every quest with _id >= 1,000,000 is a DLC quest (166 rows, all type 0), and the 165
// identifiers found in a real save all resolve there. The address column is filled with the slot address when the save
// places that identifier in a slot, else 0.
//
// Usage:
//   node tools/mhgu/export-dlc-table.mjs [out.txt] [save-file]
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const OUT = process.argv[2] || "MHGU_DLC.txt";
const SAVE = process.argv[3];
const DB = "G:/omp works/MHGU/docs/data/mhgu.db";
const SLOT_BASE = 63641;   // 0xF899
const SLOT_SIZE = 7168;    // 0x1C00
const SLOTS = 200;
const DLC_ID_MIN = 1000000;

const db = new DatabaseSync(DB, { readOnly: true });
const quests = db.prepare(`select _id, name from quests where _id >= ${DLC_ID_MIN} order by _id`).all();
if (!quests.length) { console.error("no DLC quests in the database"); process.exit(2); }

// slot address per identifier, when a save is given
const slotOf = new Map();
if (SAVE) {
  const buf = fs.readFileSync(SAVE);
  if (buf.length < SLOT_BASE + SLOT_SIZE * SLOTS) {
    console.error(`${SAVE} is ${buf.length} bytes; the DLC array needs ${SLOT_BASE + SLOT_SIZE * SLOTS}`);
    process.exit(2);
  }
  for (let i = 0; i < SLOTS; i++) {
    const p = SLOT_BASE + i * SLOT_SIZE;
    const id = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16);
    if (id) slotOf.set(id, p);
  }
}

const rows = [];
let withSlot = 0;
for (const q of quests) {
  const addr = slotOf.get(q._id) ?? 0;
  if (addr) withSlot++;
  const name = String(q.name ?? "").replace(/,/g, "，"); // the editor splits on commas
  rows.push(`${q._id},${addr.toString(16).toUpperCase()},0,${name}`);
}
fs.writeFileSync(OUT, "\uFEFF" + rows.join("\r\n") + "\r\n", "utf16le");
console.log(`wrote ${OUT}: ${rows.length} rows from the database (${withSlot} placed in a save slot of ${SAVE || "no save given"})`);
