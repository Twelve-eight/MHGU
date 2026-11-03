// sync-meter-table.mjs — rewrite the summary table in METER.md from the current report so the doc cannot drift from the
// artefact it describes. Rows are matched by their leading label; anything unmatched is left alone and reported.
import fs from "node:fs";

const METER = "G:/omp works/MHGU/docs/analysis/code/coverage/METER.md";
const REPORT = "G:/omp works/MHGU/docs/analysis/code/inventory/coverage-report.tsv";

const rows = new Map();
for (const line of fs.readFileSync(REPORT, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = line.split("\t");
  rows.set(c[0], { fn: c[1], ins: c[2], pIns: c[3], pFn: c[4] });
}
const get = (k) => rows.get(k) || { fn: "?", ins: "?", pIns: "?" };
const fmt = (x) => (x === "?" ? x : Number(x).toLocaleString("en-US"));

// A missing row used to become "?" and then NaN through parseFloat, and the script wrote the file unconditionally, so a
// report without `covered at >=85% precision` would have put "NaN%" into METER. Refuse instead of guessing.
const REQUIRED = [
  "partition: direct evidence", "partition: inferred only", "partition: signature only",
  "partition: spread validated labels", "partition: spread unvalidated", "partition: no label",
  "covered at >=90% precision", "covered at >=85% precision",
];
const missingRows = REQUIRED.filter((k) => !rows.has(k));
if (missingRows.length) {
  console.error(`refusing to write METER: coverage-report.tsv has no row(s): ${missingRows.join(", ")}`);
  console.error("the script's table shape predates the current report; update the row names before using it");
  process.exit(2);
}

const dir = get("partition: direct evidence");
const inf = get("partition: inferred only");
const sig = get("partition: signature only");
const spv = get("partition: spread validated labels");
const spu = get("partition: spread unvalidated");
const none = get("partition: no label");
const line90 = get("covered at >=90% precision");
const line85 = get("covered at >=85% precision");
const labelled = `${(parseFloat(line85.pIns)).toFixed(1)}%`;

const replace = [
  [/^\| \*\*A-direct（有证据行）\*\*.*$/m,
   `| **A-direct（有证据行）** | **${dir.pIns}**（${fmt(dir.fn)} 函数 / ${fmt(dir.ins)} 指令） | 该函数在 \`attr-*.tsv\` 里有一行 conf=A 的可引用依据 |`],
  [/^\| A-contextual（预测一致）.*$/m,
   `| A-inferred（单票级联 6 轮，逐轮 CP95 93.3–94.6%） | ${inf.pIns}（${fmt(inf.fn)} 函数） | 调用票或调用者票推断出的标签，\${\"V\"}$ 级，不属于证据 |`],
  [/^\| \*\*tier A 合计\*\*.*$/m,
   `| A-signature（32 位常量签名，整区 97.2%） | ${sig.pIns}（${fmt(sig.fn)} 函数） | 立即数签名通道，单信号规则，可靠性低于调用票 |`],
  [/^\| B（未验证）.*$/m, ``],
  [/^\| \*\*A-inferred.*$/m, ``],
  [/^\| \*\*A-signature.*$/m, ``],
  [/^\| \*\*有精度下限的覆盖（≥90%，95% 置信下界）\*\*.*$/m,
   `| **有精度下限的覆盖（≥90%，95% 置信下界）** | **${line90.pIns} 指令 / ${line90.pFn} 函数**（${fmt(line90.fn)} 个） | 直接证据 + 推断 + 签名 + 三个已验摊开标签 |`],
  [/^\| 摊开标签（A\+B）.*$/m,
   `| 摊开标签（未达 90% 但已实测） | ${(parseFloat(spv.pIns) + parseFloat(spu.pIns)).toFixed(1)}% 指令（${fmt(spv.fn)}+${fmt(spu.fn)} 函数） | 整区留出实测 **86.0%（CP95 85.5）**，属于"有标签但弱"，只计入 ≥85% 那一行 |`],
  [/^\| 有标签（A\+B）.*$/m,
   `| 有标签（≥85% 精度） | **${line85.pIns} 指令 / ${line85.pFn} 函数**（${fmt(line85.fn)} 个） | 可以引用；只有 A-direct 那 ${dir.pIns} 算"有证据" |`],
];
let text = fs.readFileSync(METER, "utf8");
let n = 0;
for (const [re, rep] of replace) {
  if (!re.test(text)) { console.log("no match: " + re); continue; }
  text = text.replace(re, rep);
  n++;
}
text = text.replace(/\n\n\n+/g, "\n\n");
fs.writeFileSync(METER, text);
console.log(`rewrote ${n} table rows from coverage-report.tsv`);
