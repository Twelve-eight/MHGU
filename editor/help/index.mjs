// Loads editor/help/<domain>.json and indexes entries by `field` for the UI.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const CONF = new Set(['A', 'B', 'U']);

export function loadHelp(dir = DIR) {
  const byField = new Map();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const entries = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const e of entries) {
      if (!e.field || !e.title || !e.summary || !CONF.has(e.conf) || !/^docs\/.+\.md:\d+(-\d+)?$/.test(e.source ?? '')) {
        throw new Error(`${f}: invalid help entry ${JSON.stringify(e.field)}`);
      }
      if (byField.has(e.field)) throw new Error(`${f}: duplicate field ${e.field}`);
      byField.set(e.field, { ...e, domain: f.slice(0, -5) });
    }
  }
  return byField;
}

export function helpFor(help, field) {
  return help.get(field) ?? help.get(field.split('#')[0]) ?? null;
}
