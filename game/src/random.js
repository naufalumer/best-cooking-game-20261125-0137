// Dapur Sore — seeded randomness.
// One file, one job: every die roll in the kitchen comes from here, so the
// same seed always deals the same tickets and the same shift.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one entry from a weighted table with the seeded roll.
export function weightedPick(rng, table) {
  let total = 0;
  for (const entry of table) total += entry.weight;
  let roll = rng() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return table[table.length - 1].value;
}
