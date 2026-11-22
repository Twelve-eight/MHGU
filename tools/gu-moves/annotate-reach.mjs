// annotate-reach — add subject identity and reachability to gu-moves' moves.tsv.
//
//   node annotate-reach.mjs <moves.tsv> [--binding <json>] [--cells <pairs.json>]
//                          [--forced <tsv>] [--out <file>]
//
// The default binding is MHGU/docs/data/gu-reach-inputs-em001_00.json, resolved
// from this module. Schema gu-reach-inputs/1 binds a subject to the exact bytes
// of inputs.moves/cells/forced, each {path, sha256}. Binding-relative paths are
// relative to that JSON; explicit CLI paths are relative to the working directory.
// Copies at different paths are accepted only with the same SHA-256. No directory,
// motion name or --em argument can supply a missing identity. The binding records
// existing evidence; it does not re-establish the old reachability semantics.
//
// Both moves schemas remain supported: gu_variant, or separate state + variant.
// The existing monster column must agree with the binding, or one is appended.
// The final reach column preserves the old membership order:
//   ?        not a single decimal state:variant (multi-valued or dashes)
//   tree     in the bound decision-tree pairs
//   forced   in the bound forced-transition table, but not the tree
//   outside  in neither bound set
// No input (including the binding) may be overwritten. All validation precedes
// output; stdout is TSV only, with identity and counts on stderr.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_BINDING = fileURLToPath(new URL("../../docs/data/gu-reach-inputs-em001_00.json", import.meta.url));
const USAGE = "usage: node annotate-reach.mjs <moves.tsv> [--binding <json>] [--cells <pairs.json>] [--forced <tsv>] [--out <file>]";
const PAIR = /^\d+:\d+$/;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function parseArgs(args, cwd) {
  const options = {};
  const flags = new Set(["--binding", "--cells", "--forced", "--out"]);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (!flags.has(arg)) throw new Error(`unknown option ${arg}; ${USAGE}`);
      const key = arg.slice(2);
      if (options[key]) throw new Error(`duplicate option ${arg}`);
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      options[key] = path.resolve(cwd, value);
    } else {
      if (options.moves) throw new Error(`expected exactly one moves.tsv; ${USAGE}`);
      options.moves = path.resolve(cwd, arg);
    }
  }
  if (!options.moves) throw new Error(USAGE);
  options.binding ??= DEFAULT_BINDING;
  return options;
}

function decode(bytes, label) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\0")) throw new Error("NUL byte");
    return text;
  } catch (error) {
    throw new Error(`${label}: invalid text (${error.message})`);
  }
}

function parseJson(bytes, label) {
  try { return JSON.parse(decode(bytes, label)); }
  catch (error) { throw new Error(`${label}: invalid JSON (${error.message})`); }
}

function loadBinding(filename) {
  const binding = parseJson(fs.readFileSync(filename), "binding");
  if (!isObject(binding) || binding.schema !== "gu-reach-inputs/1") {
    throw new Error("binding: expected schema gu-reach-inputs/1");
  }
  if (typeof binding.subject !== "string" || !/^ems?\d{3}_\d{2}$/.test(binding.subject)) {
    throw new Error("binding: missing or invalid subject");
  }
  if (!isObject(binding.inputs)) throw new Error("binding: missing inputs");
  if (binding.evidence !== undefined && !Array.isArray(binding.evidence)) {
    throw new Error("binding: evidence must be an array when supplied");
  }
  const inputs = {};
  for (const name of ["moves", "cells", "forced"]) {
    const input = binding.inputs[name];
    if (!isObject(input) || typeof input.path !== "string" || !input.path.trim() || /[\0\r\n]/.test(input.path)
        || typeof input.sha256 !== "string" || !/^[\da-f]{64}$/i.test(input.sha256)) {
      throw new Error(`binding: inputs.${name} requires path and full sha256`);
    }
    inputs[name] = { path: path.resolve(path.dirname(filename), input.path), sha256: input.sha256.toLowerCase() };
  }
  return { subject: binding.subject, inputs };
}

function readBound(filename, expected, label) {
  const bytes = fs.readFileSync(filename);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`${label}: SHA-256 mismatch for ${filename} (expected ${expected}, got ${actual})`);
  return bytes;
}

function checkHeader(head, label) {
  if (head.some((name) => !name || name.trim() !== name || /\r/.test(name)) || new Set(head).size !== head.length) {
    throw new Error(`${label}: empty, duplicate or malformed column name`);
  }
}

function splitRow(line, head, label, number) {
  const fields = line.split("\t");
  if (!line.trim() || fields.length !== head.length || line.includes("\r")) {
    throw new Error(`${label}:${number}: malformed row (expected ${head.length} columns, got ${fields.length})`);
  }
  return fields;
}

function checkMonster(fields, index, subject, label, number) {
  if (fields[index] !== subject) throw new Error(`${label}:${number}: monster ${JSON.stringify(fields[index])} does not match subject ${subject}`);
}

function loadForced(bytes, subject) {
  let head, state, variant, monster;
  const forced = new Set();
  const lines = decode(bytes, "forced").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && !line.includes("\t")) continue;
    if (!head) {
      const names = line.replace(/^#\s*/, "").split("\t");
      if (line.startsWith("#") && !names.some((name) => ["state", "variant", "monster"].includes(name))) continue;
      checkHeader(names, "forced");
      state = names.indexOf("state"); variant = names.indexOf("variant"); monster = names.indexOf("monster");
      if (state < 0 || variant < 0 || monster < 0) throw new Error("forced: header requires state, variant and monster");
      head = names;
      continue;
    }
    if (line.startsWith("#")) continue;
    const fields = splitRow(line, head, "forced", i + 1);
    checkMonster(fields, monster, subject, "forced", i + 1);
    if (!/^\d+$/.test(fields[state]) || !/^\d+$/.test(fields[variant])) throw new Error(`forced:${i + 1}: invalid state or variant`);
    forced.add(`${fields[state]}:${fields[variant]}`);
  }
  if (!head) throw new Error("forced: missing header");
  return forced;
}

function annotateMoves(bytes, subject, cells, forced) {
  const lines = decode(bytes, "moves").split(/\r?\n/);
  const head = lines[0].split("\t");
  checkHeader(head, "moves");
  const iv = head.indexOf("gu_variant");
  const state = head.indexOf("state"), variant = head.indexOf("variant"), monster = head.indexOf("monster");
  if (iv < 0 && (state < 0 || variant < 0)) throw new Error("moves: no gu_variant column and no state+variant pair");
  if (head.includes("reach")) throw new Error("moves: reach column already exists; supply the unannotated inventory");
  const out = [[...head, ...(monster < 0 ? ["monster"] : []), "reach"].join("\t")];
  const tally = { tree: 0, forced: 0, outside: 0, "?": 0 };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && !line.includes("\t")) continue;
    const fields = splitRow(line, head, "moves", i + 1);
    if (monster >= 0) checkMonster(fields, monster, subject, "moves", i + 1);
    const value = iv >= 0 ? fields[iv].trim() : `${fields[state].trim()}:${fields[variant].trim()}`;
    const tag = !PAIR.test(value) ? "?" : cells.has(value) ? "tree" : forced.has(value) ? "forced" : "outside";
    tally[tag]++;
    out.push([...fields, ...(monster < 0 ? [subject] : []), tag].join("\t"));
  }
  if (out.length === 1) throw new Error("moves: empty inventory");
  return { text: out.join("\n") + "\n", rows: out.length - 1, tally };
}

function rejectInputOutput(outPath, inputPaths) {
  const key = (filename) => process.platform === "win32" ? path.resolve(filename).toLowerCase() : path.resolve(filename);
  const outExists = fs.existsSync(outPath);
  const outReal = outExists ? key(fs.realpathSync(outPath)) : key(outPath);
  const outStat = outExists ? fs.statSync(outPath, { bigint: true }) : null;
  for (const input of new Set(inputPaths)) {
    if (key(outPath) === key(input)) throw new Error(`--out must not overwrite an input: ${input}`);
    if (!outExists || !fs.existsSync(input)) continue;
    const stat = fs.statSync(input, { bigint: true });
    if (outReal === key(fs.realpathSync(input)) || (outStat.ino !== 0n && outStat.dev === stat.dev && outStat.ino === stat.ino)) {
      throw new Error(`--out must not overwrite an input alias: ${input}`);
    }
  }
}

// Kept import-safe so offline controls exercise the actual CLI parsing, byte
// binding and output path without spawning a process for every fixture.
export function runCli(args, { cwd = process.cwd(), stdout = (text) => process.stdout.write(text), stderr = (text) => process.stderr.write(text) } = {}) {
  try {
    const options = parseArgs(args, cwd);
    const binding = loadBinding(options.binding);
    const cellsPath = options.cells ?? binding.inputs.cells.path;
    const forcedPath = options.forced ?? binding.inputs.forced.path;
    if (options.out) rejectInputOutput(options.out, [options.binding, options.moves, cellsPath, forcedPath, ...Object.values(binding.inputs).map((input) => input.path)]);
    const movesBytes = readBound(options.moves, binding.inputs.moves.sha256, "moves");
    const pairs = parseJson(readBound(cellsPath, binding.inputs.cells.sha256, "cells"), "cells");
    if (!Array.isArray(pairs) || pairs.some((pair) => typeof pair !== "string" || !PAIR.test(pair))) {
      throw new Error("cells: expected an array of decimal state:variant strings");
    }
    const cells = new Set(pairs);
    const forced = loadForced(readBound(forcedPath, binding.inputs.forced.sha256, "forced"), binding.subject);
    const result = annotateMoves(movesBytes, binding.subject, cells, forced);
    if (options.out) fs.writeFileSync(options.out, result.text); else stdout(result.text);
    const { tally } = result;
    stderr(`subject ${binding.subject}; binding ${options.binding}\n`);
    stderr(`rows ${result.rows}: tree ${tally.tree}, forced ${tally.forced}, outside ${tally.outside}, undecided ${tally["?"]}\n`);
    stderr(`  cells ${cellsPath} (${cells.size} pairs), forced ${forcedPath} (${forced.size} cells)\n`);
    return 0;
  } catch (error) {
    stderr(`annotate-reach: ${error.message}\n`);
    return 2;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = runCli(process.argv.slice(2));
}
