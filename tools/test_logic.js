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

// 3) lesson simulation: short lessons of 5 new words (+ up to 5 reviews), or 10 reviews
function runLesson(state, T, pCorrect, opts = {}) {
  const lesson = L.buildLesson(state, W, T, Object.assign({ hasAudio: true }, opts));
  let guard = 0, retries = 0;
  while (lesson.i < lesson.steps.length) {
    const st = lesson.steps[lesson.i];
    const ok = st.k === 'learn' ? true : Math.random() < pCorrect;
    const r = L.answerLesson(state, lesson, ok);
    if (r.retry) retries++;
    assert.ok(++guard < 100, 'lesson terminates');
  }
  const u = L.lessonUnits(lesson);
  assert.strictEqual(u.done, u.total, 'progress bar full at the end');
  assert.ok(lesson.steps.length <= 2 * lesson.base, 'each question retried at most once');
  L.finishLesson(state, W, lesson);
  return { lesson, retries };
}
const s = L.newState();
const T0 = L.dayNum(Date.UTC(2026, 8, 26, 12));
const r1 = runLesson(s, T0, 0.7);
assert.strictEqual(r1.lesson.newIds.length, 5);
assert.strictEqual(r1.lesson.base, 10, '5 cards + 5 questions');
assert.strictEqual(L.streak(s, T0), 1, 'one lesson keeps the streak');
assert.ok(!s.days[L.dayKey(T0)].done);
assert.strictEqual(L.todayPlan(s, W, T0).newLeft, 5);
const r2 = runLesson(s, T0, 0.7);
const newIds = [...r1.lesson.newIds, ...r2.lesson.newIds];
assert.strictEqual(new Set(newIds).size, 10);
for (const id of newIds) { assert.deepStrictEqual(s.prog[id].slice(0, 2), [1, T0 + 1], 'new word scheduled for tomorrow ' + id); }
const d0 = s.days[L.dayKey(T0)];
assert.ok(d0.n <= 10 && d0.n >= 10 - Object.keys(s.wrong).filter(id => s.wrong[id][0] >= 2).length, 'a word missed twice is not counted as learned');
assert.strictEqual(d0.lessons, 2);
assert.ok(d0.done, 'day marked done');
console.log('day0 lessons', r1.lesson.steps.length + '+' + r2.lesson.steps.length, 'screens, retries', r1.retries + r2.retries, 'xp', d0.xp, 'first-try', d0.ok + '/' + d0.t, 'streak', L.streak(s, T0));

// the same day again: nothing left but extra words can be added, one lesson at a time
assert.strictEqual(L.todayPlan(s, W, T0).newLeft, 0);
const nBefore = s.days[L.dayKey(T0)].n;
const extra = runLesson(s, T0, 1, { extra: L.LESSON_NEW });
assert.strictEqual(extra.lesson.newIds.length, 5);
assert.strictEqual(s.days[L.dayKey(T0)].n, nBefore + 5);

// next days: all correct -> boxes climb along the interval ladder; every lesson stays short
let T = T0, maxRev = 0, maxBase = 0;
for (let day = 1; day <= 70; day++) {
  T = T0 + day;
  maxRev = Math.max(maxRev, L.todayPlan(s, W, T).rev);
  let rounds = 0;
  while (L.todayPlan(s, W, T).rev > 0 || L.todayPlan(s, W, T).newLeft > 0) {
    const { lesson } = runLesson(s, T, 1);
    maxBase = Math.max(maxBase, lesson.base);
    assert.ok(lesson.base <= 2 * L.LESSON_NEW + L.LESSON_REV && lesson.base <= Math.max(15, L.REVIEW_LESSON), 'short lesson');
    assert.ok(++rounds <= 20, 'the day finishes');
  }
}
const first15 = [...newIds, ...extra.lesson.newIds];
const boxes = first15.map(id => s.prog[id][0]);
console.log('max reviews in a day', maxRev, 'longest lesson', maxBase, 'screens');
console.log('after 70 perfect days, first 15 words boxes', boxes.join(','), 'streak', L.streak(s, T), 'best', s.best);
assert.ok(boxes.every(b => b >= L.MASTER), 'first words mastered');
assert.strictEqual(L.streak(s, T), 71);

// a wrong answer: back to box 1 and asked once more at the end of the lesson; a second miss waits for tomorrow
const s2 = L.newState();
runLesson(s2, T0, 1); runLesson(s2, T0, 1);
const lesson2 = L.buildLesson(s2, W, T0 + 1, { hasAudio: false });
const firstQ = lesson2.steps.findIndex(x => x.k === 'q' && !x.nw);
assert.ok(firstQ >= 0);
lesson2.i = firstQ;
const wid = lesson2.steps[firstQ].id;
const before = lesson2.steps.length;
L.answerLesson(s2, lesson2, false);
assert.strictEqual(lesson2.steps.length, before + 1);
assert.strictEqual(s2.prog[wid][0], 1);
assert.strictEqual(s2.prog[wid][1], T0 + 1, 'missed word stays due today until its retry');
assert.ok(s2.wrong[wid][0] === 1);
const retryAt = lesson2.steps.length - 1;
assert.ok(lesson2.steps[retryAt].id === wid && lesson2.steps[retryAt].r, 'retry placed at the end');
// resume: the lesson object survives JSON round trip
const copy = JSON.parse(JSON.stringify(lesson2));
assert.deepStrictEqual(copy.steps, lesson2.steps);
lesson2.i = retryAt;
const rr = L.answerLesson(s2, lesson2, false);
assert.ok(!rr.retry && lesson2.i === lesson2.steps.length, 'no third try');
assert.deepStrictEqual(s2.prog[wid].slice(0, 2), [1, T0 + 2], 'second miss comes back tomorrow');
assert.strictEqual(s2.wrong[wid][0], 2);

// every answer wrong: the lesson still ends after one retry per question
const s5 = L.newState();
const worst = runLesson(s5, T0, 0);
assert.strictEqual(worst.lesson.steps.length, worst.lesson.base + 5);
for (const id of worst.lesson.newIds) assert.deepStrictEqual(s5.prog[id].slice(0, 2), [1, T0 + 1]);

// a half-done lesson saved by the old version is dropped; a finished one is kept so it can be settled
assert.strictEqual(L.sanitize({ lesson: { kind: 'lesson', T: T0, steps: [{ k: 'learn', id: '1-1' }, { k: 'q', id: '1-1' }], i: 1 } }, W).lesson, null);
assert.ok(L.sanitize({ lesson: { kind: 'lesson', T: T0, steps: [{ k: 'learn', id: '1-1' }], i: 1 } }, W).lesson);

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
