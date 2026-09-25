// node test_logic.js — checks question generation over every word and simulates lessons and tests.
const assert = require('assert');
const path = require('path');
const L = require('./src/logic.js');
const rows = require(path.join(__dirname, '../pwa-data/chorok-voca-data.json')).words;
L.seed(12345);
const W = L.prepare(rows);
assert.strictEqual(W.words.length, 1813);
const posCount = { v: 0, a: 0, r: 0, n: 0 };
for (const e of W.words) posCount[e.pos]++;
console.log('words', W.words.length, 'pos', posCount);

// 1) question generation invariants for every word and every type
const types = ['mcq-ko', 'mcq-en', 'syn', 'listen', 'spell'];
const fallback = {};
let made = 0;
for (const e of W.words) {
  for (const t of types) {
    for (let rep = 0; rep < 3; rep++) {
      const q = L.makeQuestion(W, e.id, t, true);
      made++;
      assert.ok(q && q.id === e.id, 'question for ' + e.id);
      if (q.t !== t) fallback[t + '->' + q.t] = (fallback[t + '->' + q.t] || 0) + 1;
      if (q.t === 'spell' || q.t === 'card') continue;
      assert.strictEqual(q.opts.length, 4, `${e.id} ${q.t} options`);
      assert.strictEqual(new Set(q.opts).size, 4, `${e.id} ${q.t} unique`);
      assert.ok(q.a >= 0 && q.a < 4, `${e.id} ${q.t} answer index`);
      const correct = q.opts[q.a];
      const others = q.opts.filter((_, i) => i !== q.a);
      if (q.t === 'mcq-ko' || q.t === 'listen') {
        assert.strictEqual(correct, e.senses[q.si].ko);
        for (const o of others) assert.ok(!e.senses.some(s => s.ko === o), `${e.id} distractor equals a meaning`);
        for (const o of others) assert.ok(W.words.some(c => c.senses.some(s => s.ko) && c.senses.find(s => s.ko).ko === o && !L.related(c, e)), `${e.id} related distractor ${o}`);
      } else if (q.t === 'mcq-en') {
        assert.strictEqual(correct, e.w);
        for (const o of others) assert.ok(W.words.some(c => c.w === o && !L.related(c, e)), `${e.id} related word ${o}`);
      } else if (q.t === 'syn') {
        assert.ok(e.synSet.has(correct), `${e.id} synonym answer`);
        for (const o of others) assert.ok(!e.synSet.has(o) && o !== e.key, `${e.id} synonym distractor ${o}`);
      }
    }
  }
}
console.log('questions made', made, 'fallbacks', fallback);

// 2) spelling check
const acc = W.byId.get('1-2');
assert.ok(L.checkSpell(acc, 'Account for') && L.checkSpell(acc, ' account  for ') && !L.checkSpell(acc, 'account'));
const wtd = W.words.find(e => e.w === 'well-to-do');
assert.ok(L.checkSpell(wtd, 'well to do') && L.checkSpell(wtd, 'welltodo'));
assert.ok(!L.checkSpell(acc, ''));

// 3) lesson simulation
function runLesson(state, T, pCorrect, opts = {}) {
  const lesson = L.buildLesson(state, W, T, Object.assign({ hasAudio: true }, opts));
  let guard = 0, retries = 0;
  while (lesson.i < lesson.steps.length) {
    const st = lesson.steps[lesson.i];
    const ok = st.k === 'learn' ? true : Math.random() < pCorrect;
    const r = L.answerLesson(state, lesson, ok);
    if (r.retry) retries++;
    assert.ok(++guard < 5000, 'lesson terminates');
  }
  L.finishLesson(state, W, lesson);
  return { lesson, retries };
}
const s = L.newState();
const T0 = L.dayNum(Date.UTC(2026, 8, 26, 12));
const r1 = runLesson(s, T0, 0.7);
const newIds = r1.lesson.newIds;
assert.strictEqual(newIds.length, 10);
for (const id of newIds) { assert.deepStrictEqual(s.prog[id].slice(0, 2), [1, T0 + 1], 'new word scheduled for tomorrow ' + id); }
const d0 = s.days[L.dayKey(T0)];
assert.strictEqual(d0.n, 10);
assert.ok(d0.done, 'day marked done');
assert.ok(r1.retries >= 0);
console.log('day0 lesson steps', r1.lesson.steps.length, 'retries', r1.retries, 'xp', d0.xp, 'first-try', d0.ok + '/' + d0.t, 'streak', L.streak(s, T0));

// the same day again: nothing left but extra words can be added
assert.strictEqual(L.todayPlan(s, W, T0).newLeft, 0);
const extra = runLesson(s, T0, 1, { extra: 10 });
assert.strictEqual(extra.lesson.newIds.length, 10);
assert.strictEqual(s.days[L.dayKey(T0)].n, 20);

// next days: all correct -> boxes climb along the interval ladder
let T = T0, maxRev = 0;
for (let day = 1; day <= 70; day++) {
  T = T0 + day;
  const plan = L.todayPlan(s, W, T);
  maxRev = Math.max(maxRev, plan.rev);
  let rounds = 0;
  do {
    const { lesson } = runLesson(s, T, 1);
    assert.ok(lesson.revIds.length <= L.REVIEW_CAP, 'review cap');
    assert.ok(++rounds <= 4, 'reviews finish in a few rounds');
  } while (L.todayPlan(s, W, T).rev > 0);
}
const first20 = [...newIds, ...extra.lesson.newIds];
const boxes = first20.map(id => s.prog[id][0]);
console.log('max reviews in a day', maxRev);
console.log('after 70 perfect days, first 20 words boxes', boxes.join(','), 'streak', L.streak(s, T), 'best', s.best);
assert.ok(boxes.every(b => b >= L.MASTER), 'first words mastered');
assert.strictEqual(L.streak(s, T), 71);

// a wrong answer on a review sends the word back to box 1 and asks it again in the same lesson
const s2 = L.newState();
runLesson(s2, T0, 1);
const lesson2 = L.buildLesson(s2, W, T0 + 1, { hasAudio: false });
const firstQ = lesson2.steps.findIndex(x => x.k === 'q' && !x.nw);
assert.ok(firstQ >= 0);
lesson2.i = firstQ;
const wid = lesson2.steps[firstQ].id;
const before = lesson2.steps.length;
L.answerLesson(s2, lesson2, false);
assert.strictEqual(lesson2.steps.length, before + 1);
assert.strictEqual(s2.prog[wid][0], 1);
assert.strictEqual(s2.prog[wid][1], T0 + 1, 'failed word stays due today');
assert.ok(s2.wrong[wid][0] === 1);
const retryAt = lesson2.steps.findIndex((x, i) => i > firstQ && x.id === wid && x.r);
assert.ok(retryAt === firstQ + 1 + 3 || retryAt === lesson2.steps.length - 1, 'retry placed 3 steps later');
// resume: the lesson object survives JSON round trip
const copy = JSON.parse(JSON.stringify(lesson2));
assert.deepStrictEqual(copy.steps, lesson2.steps);

// 4) tests
const s3 = L.newState();
runLesson(s3, T0, 1);
const test = L.buildTest(s3, W, { range: { t: 'days', days: [1] }, qt: 'mix', count: 20, hasAudio: true, label: 'Day 01' }, T0);
assert.strictEqual(test.steps.length, 20);
let wrongN = 0;
while (test.i < test.steps.length) { const ok = Math.random() < 0.6; if (!ok) wrongN++; L.answerTest(s3, test, ok); }
const fin = L.finishTest(s3, test);
assert.strictEqual(fin.wrongIds.length, wrongN);
assert.strictEqual(s3.tests.length, 1);
for (const id of fin.wrongIds) if (s3.prog[id]) assert.deepStrictEqual(s3.prog[id].slice(0, 2), [1, T0 + 1]);
const wrongRange = L.rangeIds(s3, W, { t: 'wrong' }, T0);
assert.ok(wrongRange.length >= wrongN);
console.log('test ok', test.stat.ok + '/' + test.stat.n, 'wrong list', wrongRange.length);

// 5) migration from the first version
const v1 = { prog: { '1-1': [1, T0, 0, 0, T0], 'bogus': [1, 1, 1, 1, 1] }, meta: { daily: 15, start: 3, front: 'ko', nt: { d: T0, ids: ['1-1'] }, days: { '2026-09-25': { n: 3, r: 0, ok: 2, t: 3, done: false, miss: ['1-1'] } } } };
const m = L.sanitize(L.fromV1(v1), W);
assert.strictEqual(m.settings.daily, 15);
assert.strictEqual(m.settings.start, 3);
assert.ok(m.prog['1-1'] && !m.prog['bogus']);
assert.strictEqual(m.days['2026-09-25'].n, 3);

// 6) start Day and plan refresh
const s4 = L.newState();
s4.settings.start = 30;
const plan30 = L.todayPlan(s4, W, T0).planned;
assert.ok(plan30.every(id => id.startsWith('30-')));
L.ensurePlan(s4, W, T0);
s4.settings.daily = 5; L.refreshPlan(s4, W, T0);
assert.strictEqual(s4.nt.ids.length, 5);

console.log('ALL LOGIC TESTS PASSED');
