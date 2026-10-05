// node sim_pace.js [words] [--json] — what the daily settings give over 90 days under the app's own plan (logic.js):
// N new words a day + at most revDay reviews in 3 parts (+ waiting reviews in the pairs rounds; the pair left last earns nothing),
// 80% right, stand-in words.
// The settings screen shows these numbers (build: CFG.app.pace[N][revDay] = [screens a day low, high, % of words at step 3+]).
const L = require(process.env.LOGIC || '../src/logic.js');
const BOOK = Number(process.argv[2]) || 1813, JSON_OUT = process.argv.includes('--json');
const rows = Array.from({ length: BOOK }, (_, i) => [Math.floor(i / 60) + 1, (i % 60) + 1, 'w' + i, [['s' + i, '뜻' + i]]]);
const W = L.prepare(rows);
function sim(N, cap, acc = 0.8, days = 90, seed = 7) {
  let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  L.seed(seed);
  const s = L.newState(); s.settings.daily = N; s.settings.revDay = cap;
  const T0 = 20000, screens = [];
  for (let d = 0; d < days; d++) {
    const T = T0 + d; let n = 0;
    for (let g = 0; g < 5 && !L.planStatus(s, W, T).finished; g++) {
      const les = L.buildLesson(s, W, T, { hasAudio: true });
      while (les.i < les.steps.length) { const st = les.steps[les.i]; if (st.k === 'match') { const last = st.ids[Math.floor(rnd() * st.ids.length)]; L.answerMatch(s, les, 0, (st.wr || []).filter(id => id !== last && rnd() < acc)); } else L.answerLesson(s, les, st.k === 'learn' || rnd() < acc); }
      n += les.steps.length;
      L.finishLesson(s, W, les);
    }
    screens.push(n);
  }
  const ps = Object.values(s.prog), late = screens.slice(30);
  return [Math.min(...late), Math.max(...late), Math.round(ps.filter(p => p[0] >= 3).length / Math.max(1, ps.length) * 100)];
}
const table = {};
for (const N of L.DAILY) { table[N] = {}; for (const cap of L.REV_OPTS) table[N][cap] = sim(N, cap); }
if (JSON_OUT) console.log(JSON.stringify(table));
else for (const N of L.DAILY) console.log(`${N} new/day (book ${Math.ceil(BOOK / N)} days): ` + L.REV_OPTS.map(c => `reviews ${c} → ${table[N][c][0]}-${table[N][c][1]} screens a day, ${table[N][c][2]}% at step 3+ on day 90`).join(' | '));
