// If you pick N new words a day and clear every review: how many screens a day, with a full reset vs a softer drop on a miss?
// Standalone model of the Leitner ladder used by the app (same intervals), one review question per due word.
const INTERVAL = [0, 1, 3, 7, 16, 35, 80, 180];
function sim(N, acc, lapse, days = 240, seed = 7) {
  let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const words = []; let started = 0; const perDay = [];
  for (let T = 0; T < days; T++) {
    let reviews = 0, retries = 0;
    for (const w of words) {
      if (w.due > T) continue;
      reviews++;
      if (rnd() < acc) { w.box = Math.min(w.box + 1, 7); w.due = T + INTERVAL[w.box]; }
      else { retries++; w.box = lapse === 'reset' ? 1 : Math.max(1, w.box - 2); w.due = T + INTERVAL[w.box]; }
    }
    let fresh = 0;
    while (fresh < N && started < 1813) { words.push({ box: 1, due: T + 1 }); started++; fresh++; }
    perDay.push({ reviews, screens: reviews + retries + fresh * 2 + Math.ceil((fresh + reviews) / 10) });
  }
  const avg = (a, b) => Math.round(perDay.slice(a, b).reduce((s, x) => s + x.screens, 0) / (b - a));
  const peak = Math.max(...perDay.map(x => x.screens));
  return { bookDays: Math.ceil(1813 / N), d30: avg(20, 30), d90: avg(80, 90), d180: avg(170, 180), peak };
}
for (const acc of [0.8, 0.9]) for (const N of [5, 10, 15, 20]) {
  const a = sim(N, acc, 'reset'), b = sim(N, acc, 'soft');
  console.log(`acc ${acc} | ${String(N).padStart(2)} new/day → book ${a.bookDays} days | screens/day around day 30/90/180: reset ${a.d30}/${a.d90}/${a.d180} (peak ${a.peak}) · soft ${b.d30}/${b.d90}/${b.d180} (peak ${b.peak})`);
}
