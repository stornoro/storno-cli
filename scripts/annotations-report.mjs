// Prints every tool with its annotations and fails when a hint is not an explicit boolean.
import { allTools } from '../dist/server.js';
import { annotationsFor } from '../dist/annotations.js';

const rows = allTools.map((t) => ({ name: t.name, ...annotationsFor(t.name, t.annotations) }));
let bad = 0;
const counts = { read: 0, write: 0, destructive: 0, openWorld: 0, idempotent: 0 };
for (const r of rows) {
  for (const k of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) {
    if (typeof r[k] !== 'boolean') { bad++; console.error('NOT BOOLEAN', r.name, k); }
  }
  if (typeof r.title !== 'string' || !r.title) { bad++; console.error('NO TITLE', r.name); }
  if (r.readOnlyHint && r.destructiveHint) { bad++; console.error('READ-ONLY AND DESTRUCTIVE', r.name); }
  if (r.readOnlyHint) counts.read++; else if (r.destructiveHint) counts.destructive++; else counts.write++;
  if (r.openWorldHint) counts.openWorld++;
  if (r.idempotentHint) counts.idempotent++;
}
if (process.argv.includes('--table')) {
  const flag = (b) => (b ? 'x' : '.');
  console.log('name'.padEnd(44), 'RO', 'DE', 'ID', 'OW', ' title');
  for (const r of rows) console.log(r.name.padEnd(44), flag(r.readOnlyHint), ' ', flag(r.destructiveHint), ' ', flag(r.idempotentHint), ' ', flag(r.openWorldHint), ' ', r.title);
}
console.log(`${rows.length} tools — read-only ${counts.read}, writes ${counts.write}, destructive ${counts.destructive}; open-world ${counts.openWorld}, idempotent ${counts.idempotent}; problems ${bad}`);
process.exit(bad ? 1 : 0);
