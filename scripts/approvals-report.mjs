#!/usr/bin/env node
/**
 * What is standing between each work and being sellable, in plain French.
 *
 * Run it to plan a studio session: `npm run approvals`. Pass a series slug to
 * narrow it, e.g. `npm run approvals -- elastic`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { approvalBlockers } from '../src/lib/approvals.js';

const DIR = path.resolve('src/content/artworks');
const filter = process.argv[2]?.toLowerCase();

const works = fs
  .readdirSync(DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')))
  .filter((work) => !filter || work.seriesSlug?.toLowerCase() === filter)
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

if (works.length === 0) {
  console.log(filter ? `Aucune œuvre dans la série « ${filter} ».` : 'Aucune œuvre trouvée.');
  process.exit(0);
}

let ready = 0;
const tally = new Map();

for (const work of works) {
  const blockers = approvalBlockers(work);
  if (blockers.length === 0) {
    ready += 1;
    console.log(`\n✓ ${work.title} — prête à vendre`);
    continue;
  }
  console.log(`\n${work.title} (${work.series}) — ${blockers.length} point(s) à compléter`);
  for (const blocker of blockers) {
    console.log(`   · ${blocker}`);
    tally.set(blocker, (tally.get(blocker) ?? 0) + 1);
  }
}

console.log(`\n${'─'.repeat(64)}`);
console.log(`${ready} œuvre(s) prête(s) sur ${works.length}.`);
if (tally.size > 0) {
  console.log('\nLe plus fréquent :');
  for (const [blocker, count] of [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    console.log(`   ${String(count).padStart(3)} × ${blocker}`);
  }
}
