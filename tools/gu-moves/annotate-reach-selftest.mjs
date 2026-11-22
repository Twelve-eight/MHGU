#!/usr/bin/env node
// Main-session-only offline controls; no game images, regeneration or deployment.
//   node annotate-reach-selftest.mjs --scratch <parent-directory>
// Optional real inventory parity (716 rows), using a preserved pre-change CLI:
//   ... --real <moves.tsv> --binding <json> --legacy-cli <annotate-reach.before.mjs>
//       --legacy-forced <gu-forced-cells.before.tsv>
// Fixtures use runCli itself, not a duplicate classifier. Exactly two sequential
// children cover the executable CLI boundary; optional parity adds one old-CLI
// child. All fixture writes stay in one newly created scratch subdirectory,
// removed on success and retained on failure. Synthetic inputs prove only the
// consumption contract; --real compares actual old/new rows, not game semantics.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runCli } from "./annotate-reach.mjs";

const CLI = fileURLToPath(new URL("./annotate-reach.mjs", import.meta.url));
const SUBJECT = "em001_00";
const MOVES = "gu_variant\tnote\n0:255\ttree-overlap\n1:8\tforced\n99:99\toutside\n-\tunknown\n0:255|1:8\tmulti\n";
const CELLS = '["0:255"]\n';
const FORCED = "# state\tvariant\temitted_at\tvia\ttag\tsource_cell\tnote\tmonster\n"
  + "0\t255\tfixture\tfixture\tfixture\tfixture\ttree overlap\tem001_00\n"
  + "1\t8\tfixture\tfixture\tfixture\tfixture\tforced\tem001_00\n"
  + "1\t8\tfixture\tfixture\tfixture\tfixture\tduplicate site\tem001_00\n";
const EXPECTED = "gu_variant\tnote\tmonster\treach\n"
  + "0:255\ttree-overlap\tem001_00\ttree\n1:8\tforced\tem001_00\tforced\n99:99\toutside\tem001_00\toutside\n"
  + "-\tunknown\tem001_00\t?\n0:255|1:8\tmulti\tem001_00\t?\n";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function parseOptions(args) {
  const options = {};
  const allowed = new Set(["--scratch", "--real", "--binding", "--legacy-cli", "--legacy-forced"]);
  for (let i = 0; i < args.length; i++) {
    const name = args[i], value = args[++i];
    if (!allowed.has(name) || !value || value.startsWith("--") || options[name]) throw new Error(`invalid option/value ${name}`);
    options[name] = path.resolve(value);
  }
  if (!options["--scratch"]) throw new Error("usage: node annotate-reach-selftest.mjs --scratch <directory> [--real <moves.tsv> --binding <json> --legacy-cli <before.mjs> --legacy-forced <before.tsv>]");
  const realCount = ["--real", "--binding", "--legacy-cli", "--legacy-forced"].filter((name) => options[name]).length;
  if (realCount !== 0 && realCount !== 4) throw new Error("--real, --binding, --legacy-cli and --legacy-forced must be supplied together");
  return options;
}

function capture(args, cwd) {
  let stdout = "", stderr = "";
  const status = runCli(args, { cwd, stdout: (text) => { stdout += text; }, stderr: (text) => { stderr += text; } });
  return { status, stdout, stderr };
}

function child(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8", windowsHide: true, timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.signal, null, "CLI child was terminated");
  return result;
}

function controls(root) {
  let count = 0, fixtureCount = 0;
  const test = (name, fn) => {
    try { fn(); count++; }
    catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
  };
  const fixture = ({ moves = MOVES, cells = CELLS, forced = FORCED } = {}) => {
    const dir = path.join(root, `fixture-${++fixtureCount}`);
    fs.mkdirSync(dir);
    const paths = { dir, moves: path.join(dir, "moves.tsv"), cells: path.join(dir, "pairs.json"), forced: path.join(dir, "forced.tsv"), binding: path.join(dir, "binding.json") };
    const binding = { schema: "gu-reach-inputs/1", subject: SUBJECT, inputs: {}, evidence: ["Synthetic contract controls, not gameplay evidence."] };
    for (const [name, bytes] of Object.entries({ moves, cells, forced })) {
      fs.writeFileSync(paths[name], bytes);
      binding.inputs[name] = { path: path.basename(paths[name]), sha256: sha256(bytes) };
    }
    fs.writeFileSync(paths.binding, JSON.stringify(binding));
    return paths;
  };
  const mutateBinding = (f, mutate) => {
    const binding = JSON.parse(fs.readFileSync(f.binding, "utf8"));
    mutate(binding);
    fs.writeFileSync(f.binding, JSON.stringify(binding));
  };
  const args = (f) => [f.moves, "--binding", f.binding];
  const reject = (f, pattern, extra = []) => {
    const result = capture([...args(f), ...extra], root);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "", "rejected stdout must be empty");
    assert.match(result.stderr, pattern);
    const output = path.join(f.dir, "rejected.tsv");
    const withFile = capture([...args(f), ...extra, "--out", output], root);
    assert.equal(withFile.status, 2);
    assert.equal(withFile.stdout, "");
    assert.match(withFile.stderr, pattern);
    assert.equal(fs.existsSync(output), false, "rejected call created an output file");
  };

  test("legacy schema, tree priority, forced, outside and undecided", () => {
    const f = fixture(), result = capture(args(f), root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, EXPECTED);
    assert.match(result.stderr, /subject em001_00; binding /);
    assert.match(result.stderr, /rows 5: tree 1, forced 1, outside 1, undecided 2/);
    assert.match(result.stderr, /\(1 pairs\), forced .*\(2 cells\)/);
    const output = path.join(f.dir, "annotated.tsv");
    const written = capture([...args(f), "--out", output], root);
    assert.equal(written.status, 0, written.stderr);
    assert.equal(written.stdout, "");
    assert.equal(fs.readFileSync(output, "utf8"), EXPECTED);
  });
  test("state/variant schema preserves a single existing monster column", () => {
    const moves = "monster\tstate\tvariant\tnote\r\nem001_00\t 0 \t 255 \tspaces\r\nem001_00\t1\t8\tforced\r\nem001_00\t99\t99\toutside\r\nem001_00\t-\t-\tunknown\r\n";
    const f = fixture({ moves }), result = capture(args(f), root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "monster\tstate\tvariant\tnote\treach\nem001_00\t 0 \t 255 \tspaces\ttree\nem001_00\t1\t8\tforced\tforced\nem001_00\t99\t99\toutside\toutside\nem001_00\t-\t-\tunknown\t?\n");
  });
  test("gu_variant retains precedence when both schemas are present", () => {
    const f = fixture({ moves: "state\tvariant\tgu_variant\n1\t8\t0:255\n" });
    assert.equal(capture(args(f), root).stdout, "state\tvariant\tgu_variant\tmonster\treach\n1\t8\t0:255\tem001_00\ttree\n");
  });
  test("forced columns are looked up by header, not position", () => {
    const f = fixture({ forced: "# fixture-only preamble\n# note\tmonster\tvariant\tstate\nforced\tem001_00\t8\t1\noverlap\tem001_00\t255\t0\n" });
    const result = capture(args(f), root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, EXPECTED);
  });
  test("same-byte copies and misleading path names retain bound identity", () => {
    const f = fixture(), copies = path.join(f.dir, "em007_00");
    fs.mkdirSync(copies);
    for (const name of ["moves", "cells", "forced"]) fs.copyFileSync(f[name], path.join(copies, path.basename(f[name])));
    const result = capture(["em007_00/moves.tsv", "--binding", "binding.json", "--cells", "em007_00/pairs.json", "--forced", "em007_00/forced.tsv"], f.dir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, EXPECTED);
  });
  test("uppercase full hashes are equivalent", () => {
    const f = fixture();
    mutateBinding(f, (binding) => { for (const input of Object.values(binding.inputs)) input.sha256 = input.sha256.toUpperCase(); });
    assert.equal(capture(args(f), root).stdout, EXPECTED);
  });

  for (const monster of ["em007_00", "unknown", ""]) test(`moves monster ${JSON.stringify(monster)} rejected despite matching SHA`, () => {
    reject(fixture({ moves: `gu_variant\tmonster\n0:255\tem001_00\n1:8\t${monster}\n` }), /moves:3: monster .* does not match subject/);
  });
  test("forced mixed species rejected despite matching SHA", () => {
    reject(fixture({ forced: FORCED.replace("duplicate site\tem001_00", "duplicate site\tem007_00") }), /forced:4: monster .* does not match subject/);
  });
  test("forced missing monster header rejected", () => {
    reject(fixture({ forced: "# state\tvariant\n1\t8\n" }), /forced: header requires state, variant and monster/);
  });
  test("missing binding rejected", () => {
    const f = fixture();
    fs.unlinkSync(f.binding);
    reject(f, /ENOENT/);
  });
  test("malformed binding JSON rejected", () => {
    const f = fixture(); fs.writeFileSync(f.binding, "{"); reject(f, /binding: invalid JSON/);
  });
  for (const [name, mutate, pattern] of [
    ["schema", (binding) => { binding.schema = "gu-reach-inputs/2"; }, /expected schema/],
    ["subject missing", (binding) => { delete binding.subject; }, /invalid subject/],
    ["subject unknown", (binding) => { binding.subject = "unknown"; }, /invalid subject/],
    ["subject mismatches table", (binding) => { binding.subject = "em007_00"; }, /forced:.*does not match subject/],
    ["inputs missing", (binding) => { delete binding.inputs; }, /missing inputs/],
    ["evidence malformed", (binding) => { binding.evidence = {}; }, /evidence must be an array/],
  ]) test(`binding ${name} rejected`, () => {
    const f = fixture(); mutateBinding(f, mutate); reject(f, pattern);
  });
  for (const role of ["moves", "cells", "forced"]) {
    for (const field of ["path", "sha256"]) test(`binding ${role}.${field} missing rejected`, () => {
      const f = fixture(); mutateBinding(f, (binding) => { delete binding.inputs[role][field]; }); reject(f, /requires path and full sha256/);
    });
    test(`${role} bytes changed without rebinding rejected`, () => {
      const f = fixture(); fs.appendFileSync(f[role], "\n"); reject(f, new RegExp(`${role}: SHA-256 mismatch`));
    });
    test(`${role} abbreviated hash rejected`, () => {
      const f = fixture(); mutateBinding(f, (binding) => { binding.inputs[role].sha256 = binding.inputs[role].sha256.slice(0, 16); }); reject(f, /requires path and full sha256/);
    });
  }
  for (const role of ["cells", "forced"]) test(`explicit ${role} override with different bytes rejected`, () => {
    const f = fixture(), wrong = path.join(f.dir, `wrong-${role}`);
    fs.writeFileSync(wrong, fs.readFileSync(f[role], "utf8") + "\n");
    reject(f, new RegExp(`${role}: SHA-256 mismatch`), [`--${role}`, wrong]);
  });
  for (const cells of ["{", "{}", '["0:255",8]', '["0:255","unknown"]']) test(`bad cells ${cells} rejected`, () => {
    reject(fixture({ cells }), /cells: (invalid JSON|expected an array)/);
  });
  for (const [name, forced] of [
    ["short row", "state\tvariant\tmonster\n1\t8\n"],
    ["extra field", "state\tvariant\tmonster\n1\t8\tem001_00\textra\n"],
    ["nondecimal key", "state\tvariant\tmonster\n1\tbad\tem001_00\n"],
    ["duplicate header", "state\tvariant\tmonster\tmonster\n"],
    ["tab-only malformed row", "state\tvariant\tmonster\n\t\n"],
    ["blank fields row", "state\tvariant\tmonster\n\t\t\n"],
  ]) test(`forced ${name} rejected`, () => { reject(fixture({ forced }), /forced:/); });
  for (const [name, moves] of [
    ["empty", ""], ["header only", "gu_variant\tnote\n"],
    ["short row", "gu_variant\tnote\n0:255\n"], ["extra field", "gu_variant\tnote\n0:255\ta\tb\n"],
    ["no key", "note\na\n"], ["duplicate monster", "gu_variant\tmonster\tmonster\n0:255\tem001_00\tem001_00\n"],
    ["already annotated", "gu_variant\treach\n0:255\ttree\n"], ["tab-only malformed row", "gu_variant\tnote\n\t\t\n"],
    ["blank fields row", "gu_variant\tnote\n\t\n"],
    ["invalid UTF-8", Buffer.from([0xff])],
  ]) test(`moves ${name} rejected`, () => { reject(fixture({ moves }), /moves:/); });
  test("validation failure leaves a pre-existing output untouched", () => {
    const f = fixture({ moves: "gu_variant\tmonster\n1:8\tem007_00\n" }), output = path.join(f.dir, "sentinel.tsv");
    fs.writeFileSync(output, "preserve me\n");
    const result = capture([...args(f), "--out", output], root);
    assert.equal(result.status, 2); assert.equal(result.stdout, "");
    assert.match(result.stderr, /does not match subject/);
    assert.equal(fs.readFileSync(output, "utf8"), "preserve me\n");
  });
  test("all input paths and hardlink aliases are protected", () => {
    const f = fixture();
    const before = Object.fromEntries(["moves", "cells", "forced", "binding"].map((role) => [role, fs.readFileSync(f[role])]));
    for (const role of Object.keys(before)) {
      const result = capture([...args(f), "--out", f[role]], root);
      assert.equal(result.status, 2); assert.equal(result.stdout, ""); assert.match(result.stderr, /must not overwrite an input/);
    }
    const hardlink = path.join(f.dir, "moves-hardlink.tsv");
    fs.linkSync(f.moves, hardlink);
    const result = capture([...args(f), "--out", hardlink], root);
    assert.equal(result.status, 2); assert.equal(result.stdout, ""); assert.match(result.stderr, /must not overwrite an input alias/);
    for (const role of Object.keys(before)) assert.deepEqual(fs.readFileSync(f[role]), before[role], `${role} changed`);
  });
  test("directory symlink/junction output alias is protected", () => {
    const f = fixture(), alias = path.join(root, "input-directory-alias"), before = fs.readFileSync(f.moves);
    fs.symlinkSync(f.dir, alias, process.platform === "win32" ? "junction" : "dir");
    const result = capture([...args(f), "--out", path.join(alias, "moves.tsv")], root);
    assert.equal(result.status, 2); assert.equal(result.stdout, ""); assert.match(result.stderr, /must not overwrite an input alias/);
    assert.deepEqual(fs.readFileSync(f.moves), before);
  });
  test("declared sources remain protected while reading copies", () => {
    const f = fixture(), copy = path.join(f.dir, "moves-copy.tsv"), before = fs.readFileSync(f.moves);
    fs.copyFileSync(f.moves, copy);
    const result = capture([copy, "--binding", f.binding, "--out", f.moves], root);
    assert.equal(result.status, 2); assert.equal(result.stdout, ""); assert.match(result.stderr, /must not overwrite an input/);
    assert.deepEqual(fs.readFileSync(f.moves), before);
  });
  test("argument errors never emit output", () => {
    const f = fixture();
    for (const argv of [[], [f.moves, "--binding"], [...args(f), "--out"], [...args(f), "--em", SUBJECT], [...args(f), "--binding", f.binding], [...args(f), f.moves]]) {
      const result = capture(argv, root);
      assert.equal(result.status, 2); assert.equal(result.stdout, ""); assert.ok(result.stderr.length > 0);
    }
  });
  test("real executable CLI stdout and failing exit status", () => {
    const good = fixture(), bad = fixture({ moves: "gu_variant\tmonster\n1:8\tem007_00\n" });
    const positive = child([CLI, ...args(good)], root);
    assert.equal(positive.status, 0, positive.stderr); assert.equal(positive.stdout, EXPECTED);
    assert.match(positive.stderr, /subject em001_00/);
    const output = path.join(bad.dir, "must-not-exist.tsv");
    const negative = child([CLI, ...args(bad), "--out", output], root);
    assert.equal(negative.status, 2); assert.equal(negative.stdout, ""); assert.match(negative.stderr, /does not match subject/);
    assert.equal(fs.existsSync(output), false);
  });
  return count;
}

function realParity(options, root) {
  const moves = options["--real"], bindingPath = options["--binding"], legacy = options["--legacy-cli"], oldForced = options["--legacy-forced"];
  for (const filename of [moves, bindingPath, legacy, oldForced]) assert.ok(fs.statSync(filename).size <= 2 * 1024 * 1024, `oversize parity input: ${filename}`);
  const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
  const resolveInput = (role) => path.resolve(path.dirname(bindingPath), binding.inputs[role].path);
  for (const role of ["cells", "forced"]) assert.ok(fs.statSync(resolveInput(role)).size <= 2 * 1024 * 1024, `oversize parity ${role}`);
  const legacyForcedBytes = fs.readFileSync(oldForced), forcedBytes = fs.readFileSync(resolveInput("forced"));
  const oldForcedLines = legacyForcedBytes.toString("utf8").split(/\r?\n/);
  const forcedLines = forcedBytes.toString("utf8").split(/\r?\n/);
  assert.equal(forcedLines.length, oldForcedLines.length, "forced line count changed");
  for (let i = 0; i < oldForcedLines.length; i++) {
    const expected = oldForcedLines[i] ? `${oldForcedLines[i]}\t${i === 0 ? "monster" : binding.subject}` : "";
    assert.equal(forcedLines[i], expected, `forced line ${i + 1}: old seven columns changed`);
  }
  const output = path.join(root, "real-after.tsv");
  const after = capture([moves, "--binding", bindingPath, "--out", output], root);
  assert.equal(after.status, 0, after.stderr); assert.equal(after.stdout, "");
  const before = child([legacy, moves, "--cells", resolveInput("cells"), "--forced", oldForced], root);
  assert.equal(before.status, 0, before.stderr);
  const oldRows = before.stdout.trimEnd().split(/\r?\n/).map((line) => line.split("\t"));
  const newRows = fs.readFileSync(output, "utf8").trimEnd().split(/\r?\n/).map((line) => line.split("\t"));
  assert.equal(oldRows.length - 1, 716, "legacy inventory must have exactly 716 rows");
  assert.equal(newRows.length, oldRows.length);
  const monster = newRows[0].indexOf("monster"), reach = oldRows[0].indexOf("reach");
  assert.ok(monster >= 0); assert.ok(reach >= 0);
  const addedMonster = !oldRows[0].includes("monster");
  const tally = { tree: 0, forced: 0, outside: 0, "?": 0 };
  for (let i = 0; i < oldRows.length; i++) {
    const projected = newRows[i].filter((_, column) => !addedMonster || column !== monster);
    assert.deepEqual(projected, oldRows[i], `row ${i}: original fields/order/reach changed`);
    if (i === 0) continue;
    assert.equal(newRows[i][monster], binding.subject, `row ${i}: missing bound subject`);
    assert.ok(Object.hasOwn(tally, oldRows[i][reach]));
    tally[oldRows[i][reach]]++;
  }
  return { rows: 716, unchangedRowsAndReach: true, forcedOriginalColumnsUnchanged: true, tally,
    inputs: { movesSha256: sha256(fs.readFileSync(moves)), cellsSha256: sha256(fs.readFileSync(resolveInput("cells"))),
      bindingSha256: sha256(fs.readFileSync(bindingPath)), legacyCliSha256: sha256(fs.readFileSync(legacy)),
      legacyForcedSha256: sha256(legacyForcedBytes), forcedSha256: sha256(forcedBytes) } };
}

let root;
try {
  const options = parseOptions(process.argv.slice(2));
  fs.mkdirSync(options["--scratch"], { recursive: true });
  root = fs.mkdtempSync(path.join(options["--scratch"], "annotate-reach-"));
  const count = controls(root);
  const real = options["--real"] ? realParity(options, root) : null;
  fs.rmSync(root, { recursive: true });
  console.log(`PASS annotate-reach controls ${count}${real ? `; real parity ${JSON.stringify(real)}` : "; real parity not requested"}`);
} catch (error) {
  console.error(`FAIL annotate-reach selftest: ${error.message}${root ? `; retained scratch ${root}` : ""}`);
  process.exitCode = 1;
}
