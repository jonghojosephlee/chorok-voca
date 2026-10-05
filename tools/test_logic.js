// node test_logic.js — checks question generation over every word and simulates lessons, days and tests.
// One file for both apps (초록 보카, 노랭이 보카): the word list it finds decides which app's rules apply.
const assert = require('assert');
const path = require('path');
const L = require('./src/logic.js');
const fs = require('fs');
const rowsPath = fs.existsSync(path.join(__dirname, 'dist/rows.json')) ? path.join(__dirname, 'dist/rows.json') : path.join(__dirname, '../pwa-data/chorok-voca-data.json');
const rows = require(rowsPath).words;
const CHOROK = rows.length === 1813;
L.configure({ spellDay: CHOROK ? 0 : 2, spread: CHOROK ? 0 : 30 });   // as each app's build sets it: typed questions a day, family spacing
L.seed(12345);
const W = L.prepare(rows);
if (CHOROK) assert.strictEqual(W.words.length, 1813); else assert.ok(W.words.length > 1000, 'friend word list loaded');
const posCount = { v: 0, a: 0, r: 0, n: 0 };
for (const e of W.words) posCount[e.pos]++;
console.log(CHOROK ? '초록 보카' : '노랭이 보카', 'words', W.words.length, 'pos', posCount);

// 0) new-word order: 초록 보카 keeps the book order; 노랭이 보카 keeps a word's family (apply, application, applicant ...) 30 words apart
assert.strictEqual(W.order.length, W.words.length);
assert.strictEqual(new Set(W.order).size, W.words.length, 'every word once');
if (CHOROK) assert.ok(W.order.every((e, i) => e === W.words[i]), 'book order');
else {
  const near = list => { let n = 0; for (let i = 0; i < list.length; i++) for (let j = Math.max(0, i - 29); j < i; j++) if (L.famLink(list[i], list[j])) n++; return n; };
  const nb = near(W.words), no = near(W.order);
  assert.ok(nb > 300 && no <= 5, `family pairs within 30 words: book ${nb}, new order ${no}`);
  const f = w => ({ w });   // plain dictionary words, not the book's list
  for (const [a, b] of [['apply', 'application'], ['qualify', 'qualification'], ['employ', 'unemployment'], ['eligible', 'ineligible'], ['happy', 'happily'], ['teach', 'be a teacher of']]) assert.ok(L.famLink(f(a), f(b)), `${a} ~ ${b}`);
  for (const [a, b] of [['apple', 'orange'], ['hire', 'training'], ['interview', 'international']]) assert.ok(!L.famLink(f(a), f(b)), `${a} !~ ${b}`);
  const s0 = L.newState(), first = L.pickNew(s0, W, 30);
  assert.deepStrictEqual(first, W.order.slice(0, 30).map(e => e.id), 'new words follow the spaced order');
  console.log('family pairs within 30 words: book', nb, '→ new order', no);
}

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
// 초록 보카 asks nothing typed and nobody is asked to write a meaning: those formats turn into choice formats
for (const t of ['spell', 'spell1', 'dict', 'clozet', 'kotype', 'write']) {
  const q = L.makeQuestion(W, W.words[0].id, t, true);
  if (CHOROK || t === 'kotype' || t === 'write') assert.ok(q.opts && q.opts.length === 4 && !L.TYPED.includes(q.t) && q.t !== 'kotype', `${t} becomes a choice format, got ${q.t}`);
}
assert.ok(!L.typeOK('kotype') && !L.typeOK('write') && L.typeOK('mix') && L.typeOK('cloze') && L.typeOK('spell') === !CHOROK);

// 1b) example-sentence formats: the blank and the highlight sit on the headword; options are clean
let withEx = 0, cz = 0, cx = 0;
for (const e of W.words) {
  for (let si = 0; si < e.senses.length; si++) {
    if (!e.senses[si].ex) continue;
    withEx++;
    const parts = L.splitEx(e, si);
    assert.ok(parts, `${e.id} s${si} example contains the headword`);
    assert.strictEqual(parts.join(''), e.senses[si].ex);
    assert.strictEqual(parts[1].toLowerCase(), (e.hit || e.w).toLowerCase());
  }
  if (!e.senses.some(s => s.ex)) continue;
  for (let rep = 0; rep < 2; rep++) {
    const c = L.makeQuestion(W, e.id, 'cloze', true);
    if (c.t === 'cloze') {
      cz++;
      const low = e.senses[c.si].ex.toLowerCase();
      assert.strictEqual(c.opts[c.a], e.w);
      assert.strictEqual(new Set(c.opts).size, 4);
      for (const o of c.opts) if (o !== e.w) { const d = W.words.find(x => x.w === o); assert.ok(!L.related(d, e) && !low.includes(d.key), `${e.id} cloze distractor ${o}`); }
    }
    const x = L.makeQuestion(W, e.id, 'ctx', true);
    if (x.t === 'ctx') {
      cx++;
      const low = e.senses[x.si].ex.toLowerCase();
      assert.ok(L.synonymsOf([e.senses[x.si]]).includes(x.opts[x.a]), `${e.id} ctx answer is a synonym of that sense`);
      assert.strictEqual(new Set(x.opts).size, 4);
      for (const o of x.opts) { assert.ok(!low.includes(o), `${e.id} ctx option inside the sentence: ${o}`); if (o !== x.opts[x.a]) assert.ok(!e.synSet.has(o), `${e.id} ctx distractor is a synonym`); }
    }
    if (!CHOROK) {   // 노랭이 보카 still types (a couple a day); patterns never
      const t1 = L.makeQuestion(W, e.id, 'clozet', true);
      assert.ok(e.pat ? t1.t !== 'clozet' : t1.t === 'clozet' && t1.parts[1].toLowerCase() === e.key);
    }
  }
}
if (!CHOROK) {
  const dq = L.makeQuestion(W, W.words[0].id, 'dict', true), dq0 = L.makeQuestion(W, W.words[0].id, 'dict', false), s1q = L.makeQuestion(W, W.words[0].id, 'spell1', true);
  assert.ok(W.words[0].pat || (dq.t === 'dict' && dq0.t === 'spell' && s1q.t === 'spell' && s1q.lead === 1));
}
console.log('senses with examples', withEx, 'cloze made', cz, 'context made', cx);

// 1c) options come from words already met: sentence formats only ever show those, choice formats fill in from the rest
{ const seen = new Set(W.words.slice(0, 80).map(e => e.id));
  const met = o => W.words.some(c => c.w === o && seen.has(c.id));
  let czs = 0, cxs = 0, mcs = 0;
  for (const e of W.words.slice(0, 80)) for (let rep = 0; rep < 3; rep++) {
    const c = L.makeQuestion(W, e.id, 'cloze', true, seen);
    if (c.t === 'cloze') { czs++; for (const o of c.opts) assert.ok(met(o), 'cloze option already met: ' + o); }
    const x = L.makeQuestion(W, e.id, 'ctx', true, seen);
    if (x.t === 'ctx') { cxs++; for (const o of x.opts) if (o !== x.opts[x.a]) assert.ok(W.words.some(c2 => seen.has(c2.id) && c2.syn.includes(o)), 'ctx option from a met word: ' + o); }
    const m = L.makeQuestion(W, e.id, 'mcq-en', true, seen);
    if (m.t === 'mcq-en') { mcs++; for (const o of m.opts) assert.ok(met(o), 'word option already met: ' + o); }
  }
  assert.ok(czs > 20 && mcs > 100, `met-word questions made: cloze ${czs}, word ${mcs}`);
  const few = new Set(W.words.slice(0, 3).map(e => e.id));   // too few words met: the sentence question steps aside
  for (const e of W.words.slice(0, 3)) { const c3 = L.makeQuestion(W, e.id, 'cloze', true, few); assert.ok(c3.t !== 'cloze' && c3.opts && c3.opts.length === 4, 'fallback with four options'); }
  console.log('met-word options: cloze', czs, 'context', cxs, 'word', mcs); }

// 1d) a sense row can carry its example's 풀이: [similar words, meaning, example, its Korean, chunks, tip]
{ const W2 = L.prepare([[1, 1, 'test', [['try', '시험', 'We test it daily.', '우리는 매일 그것을 시험한다.', ['We / test it / daily.', '우리는 / 그것을 시험한다 / 매일'], '팁'], ['exam', '검사']]]]);
  const s0 = W2.words[0].senses[0], s1 = W2.words[0].senses[1];
  assert.ok(s0.ch && s0.ch.length === 2 && s0.tip === '팁' && s1.ch === null && s1.tip === ''); }

// 2) spelling check
const phrase = W.words.find(e => !e.pat && e.w.includes(' '));
assert.ok(L.checkSpell(phrase, phrase.w.toUpperCase()) && L.checkSpell(phrase, ' ' + phrase.w.replace(/ /g, '  ') + ' ') && !L.checkSpell(phrase, phrase.w.split(' ')[0]));
assert.ok(!L.checkSpell(phrase, ''));
const pat = W.words.find(e => e.pat);
if (pat) for (const t of ['spell', 'spell1', 'dict', 'clozet', 'cloze']) assert.ok(!['spell', 'dict', 'clozet', 'cloze'].includes(L.makeQuestion(W, pat.id, t, true).t), 'pattern not typed: ' + pat.w);

// 2c) pick every meaning: the word's own meanings (2-4) among 6 options, the others from unrelated words
let multiN = 0;
for (const e of W.words) {
  const q = L.makeQuestion(W, e.id, 'multi', true), own = new Set(L.meaningItems(e));
  if (!L.multiOK(e)) { assert.notStrictEqual(q.t, 'multi', 'one meaning only: ' + e.w); continue; }
  if (q.t !== 'multi') continue;
  multiN++;
  assert.strictEqual(q.opts.length, 6, 'six options ' + e.w);
  assert.strictEqual(new Set(q.opts).size, 6, 'unique options ' + e.w);
  assert.ok(q.ans.length >= 2 && q.ans.length <= 4, 'two to four answers ' + e.w);
  q.opts.forEach((o, i) => assert.strictEqual(q.ans.includes(i), own.has(o), `answer marks ${e.w}: ${o}`));
}
assert.ok(multiN > 50, 'multi questions made ' + multiN);
{ const W3 = L.prepare([[1, 1, 'test', [['try', '시험', 'We test it.', '우리는 그것을 시험한다.', ['We / test it.', '우리는 / 그것을 시험한다'], '', [[0.1, 0.4], [0.4, 1.0]]]]]]);
  assert.deepStrictEqual(W3.words[0].senses[0].ct, [[0.1, 0.4], [0.4, 1.0]], 'chunk timing read from the row'); }
console.log('pick-every-meaning questions', multiN);

// 3) today's plan: the day's new words and at most 10 reviews, mixed evenly over 3 parts, one lesson each
function runLesson(state, T, pCorrect, opts = {}) {
  const lesson = L.buildLesson(state, W, T, Object.assign({ hasAudio: true }, opts));
  let guard = 0, retries = 0;
  while (lesson.i < lesson.steps.length) {
    const st = lesson.steps[lesson.i];
    if (st.k === 'match') { L.answerMatch(state, lesson, 0, (st.wr || []).filter(() => Math.random() < pCorrect)); continue; }   // waiting words matched
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
const typedIn = lesson => lesson.steps.filter(x => x.k === 'q' && !x.r && L.TYPED.includes(x.qt)).length;
function runDay(state, T, pCorrect) {   // the plan's parts, one after another, each taking its even share
  const shapes = [], screens = [];
  let typed = 0;
  for (let guard = 0; ; guard++) {
    const ps = L.planStatus(state, W, T);
    if (ps.finished) return { ps, shapes, screens, typed };
    assert.ok(guard < 3, 'three parts at most');
    const nx = ps.next, { lesson } = runLesson(state, T, pCorrect);
    assert.strictEqual(lesson.part, nx.part, 'the lesson is the next part');
    assert.strictEqual(lesson.newIds.length, nx.nNew, 'part takes its share of new words');
    assert.strictEqual(lesson.revIds.length, nx.nRev, 'part takes its share of reviews');
    shapes.push(nx.nNew + '+' + nx.nRev); screens.push(lesson.steps.length); typed += typedIn(lesson);
    assert.strictEqual(L.planStatus(state, W, T).done, Math.min(ps.total, nx.part), 'one more segment filled');
  }
}
const s = L.newState();
const T0 = L.dayNum(Date.UTC(2026, 8, 26, 12));
const p0 = L.planStatus(s, W, T0);
assert.ok(p0.total === 3 && p0.done === 0 && p0.next.part === 1);
const day0 = runDay(s, T0, 1);
assert.deepStrictEqual(day0.shapes, ['4+0', '3+0', '3+0'], 'first day: 10 new words over 3 parts');
assert.strictEqual(day0.typed, 0, 'nothing typed on the first day');
for (const id of s.nt.ids) assert.deepStrictEqual(s.prog[id].slice(0, 2), [1, T0 + 1], 'new word scheduled for tomorrow ' + id);
const d0 = s.days[L.dayKey(T0)];
assert.ok(d0.done && d0.lessons === 3 && L.streak(s, T0) === 1, 'day done after three parts');
console.log('day0 parts', day0.shapes.join(' / '), 'screens', day0.screens.join('+'), 'xp', d0.xp);
// after the parts: extra lessons of 5 new words or 5 waiting reviews leave the ring alone
const nBefore = d0.n;
const extra = runLesson(s, T0, 1, { extra: true });
assert.ok(extra.lesson.newIds.length === 5 && !extra.lesson.part && extra.lesson.bonus);
assert.strictEqual(s.days[L.dayKey(T0)].n, nBefore + 5);
const pe = L.planStatus(s, W, T0);
assert.ok(pe.finished && pe.done === 3, 'ring stays full');

// next days: all correct; the review list of a day never passes 10 and every lesson stays short
let T = T0, maxBase = 0, typedDays = [];
for (let day = 1; day <= 70; day++) {
  T = T0 + day;
  const ps = L.planStatus(s, W, T);
  assert.ok(s.today.rev.length <= L.REV_DAY, 'at most 10 reviews a day');
  assert.ok(ps.total === 3, 'three parts');
  const r = runDay(s, T, 1);
  maxBase = Math.max(maxBase, ...r.screens);
  typedDays.push(r.typed);
  assert.ok(r.typed === (CHOROK ? 0 : Math.min(2, s.today.rev.filter(id => !W.byId.get(id).pat).length)), `typed questions on day ${day}: ${r.typed}`);
}
const first15 = s.nt && Object.keys(s.prog).slice(0, 15);
console.log('longest lesson', maxBase, 'screens | typed a day', [...new Set(typedDays)].join('/'), '| after 70 perfect days, first 15 words boxes', first15.map(id => s.prog[id][0]).join(','), 'streak', L.streak(s, T));
assert.ok(maxBase <= 2 * 4 + 4 + 1, 'short lessons: at most 4 new words (card + question) + 4 reviews + pairs');
assert.strictEqual(L.streak(s, T), 71);

// reviews: when more are due than a day takes, the most overdue for their step go first
{ const s7 = L.newState(); let k7 = 0;
  for (const e of W.words) { if (k7 >= 60) break; s7.prog[e.id] = k7 < 55 ? [4, T0, 3, 0, T0 - 16] : [1, T0 - 2, 1, 0, T0 - 3]; k7++; }
  const p7 = L.planStatus(s7, W, T0);
  assert.strictEqual(s7.today.rev.length, 10, '10 of 60 due');
  assert.ok(Object.keys(s7.prog).filter(id => s7.prog[id][0] === 1).every(id => s7.today.rev.includes(id)), 'the five 2 days late at step 1 are in');
  assert.deepStrictEqual([p7.next.nNew, p7.next.nRev], [4, 4]);
  // the day's list is chosen once: reviews done elsewhere today are not replaced by others
  const list = s7.today.rev.slice();
  for (const id of list.slice(0, 3)) s7.prog[id][1] = T0 + 3;
  assert.strictEqual(L.planStatus(s7, W, T0).rev.length, 7);
  assert.deepStrictEqual(s7.today.rev, list);
  // 5 more of the waiting ones after the day, most overdue first
  const more = L.buildLesson(s7, W, T0, { more: true });
  assert.ok(more.revIds.length === 5 && !more.part && more.newIds.length === 0);
  // the daily review count changed mid-day: 20 adds the next most overdue, 10 again drops only what is not done yet
  s7.settings.revDay = 20; L.setReviewCap(s7, W, T0);
  assert.ok(s7.today.rev.length === 20 && list.every(id => s7.today.rev.includes(id)), 'grows to 20, keeping the first 10');
  s7.settings.revDay = 10; L.setReviewCap(s7, W, T0);
  assert.ok(s7.today.rev.length === 10 && list.slice(0, 3).every(id => s7.today.rev.includes(id)), 'back to 10, the 3 done stay');
  assert.strictEqual(L.sanitize({ settings: { revDay: 15 } }, W).settings.revDay, 10, 'only 10, 20 or 30'); }

// the pairs round takes learned words waiting past the day's reviews; matched on the first try, that is their review
{ const s11 = L.newState(); let k11 = 0; s11.settings.daily = 5;   // 2 new words in the first part: 3 places for waiting words
  for (const e of W.words) { if (k11 >= 40) break; s11.prog[e.id] = [2, T0 - 1, 2, 0, T0 - 4]; k11++; }   // 40 due: 10 for today, 30 waiting
  const les = L.buildLesson(s11, W, T0);
  const m = les.steps[les.steps.length - 1];
  assert.ok(m.k === 'match' && m.wr.length === 3 && m.wr.length === 5 - les.newIds.length && m.wr.every(id => !s11.today.rev.includes(id) && m.ids.includes(id)), 'waiting words fill the pairs round');
  les.i = les.steps.length - 1;
  const [a, b] = m.wr, res = L.answerMatch(s11, les, 1, [a, m.ids.find(id => !m.wr.includes(id))]);
  assert.ok(res.reviewed === 1 && s11.prog[a][0] === 3 && s11.prog[a][1] === T0 + 7, 'credited: one step up');
  assert.ok(s11.prog[b][0] === 2 && s11.prog[b][1] === T0 - 1, 'not credited: still waiting'); }

// a wrong answer: down two steps and asked once more at the end of the lesson; a second miss waits for tomorrow
const s2 = L.newState();
runDay(s2, T0, 1);
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
const retryAt = lesson2.steps.findIndex((x, i) => i > firstQ && x.id === wid && x.r);
assert.ok(retryAt === lesson2.steps.length - 2 && lesson2.steps[retryAt + 1].k === 'match', 'retry placed at the end, before the pairs round');
const copy = JSON.parse(JSON.stringify(lesson2));   // resume: the lesson object survives a JSON round trip
assert.deepStrictEqual(copy.steps, lesson2.steps);
lesson2.i = retryAt;
const rr = L.answerLesson(s2, lesson2, false);
assert.ok(!rr.retry && lesson2.i === lesson2.steps.length - 1, 'no third try');
const pairsN = lesson2.steps[lesson2.i].ids.length;
assert.ok(L.answerMatch(s2, lesson2, 2).xp === Math.max(1, pairsN - 2) && lesson2.i === lesson2.steps.length, 'pairs round with 2 misses');
assert.deepStrictEqual(s2.prog[wid].slice(0, 2), [1, T0 + 2], 'second miss comes back tomorrow');
assert.strictEqual(s2.wrong[wid][0], 2);

// soft drop: a step-4 word missed and then right on the retry comes back in 3 days (step 2), not tomorrow
{ const s9 = L.newState(); let k9 = 0;
  for (const e of W.words) { if (k9 >= 12) break; s9.prog[e.id] = [4, T0, 3, 0, T0 - 16]; k9++; }
  const les = L.buildLesson(s9, W, T0);
  const q = les.steps.findIndex(x => x.k === 'q' && !x.nw); les.i = q; const id = les.steps[q].id;
  L.answerLesson(s9, les, false);
  assert.deepStrictEqual(s9.prog[id].slice(0, 2), [2, T0]);
  les.i = les.steps.findIndex((x, j) => j > q && x.id === id && x.r);
  L.answerLesson(s9, les, true);
  assert.deepStrictEqual(s9.prog[id].slice(0, 2), [2, T0 + 3]); }

// every answer wrong: the lesson still ends after one retry per question
const s5 = L.newState();
const worst = runLesson(s5, T0, 0);
assert.strictEqual(worst.lesson.steps.length, worst.lesson.base + worst.lesson.newIds.length);
assert.strictEqual(worst.lesson.steps[worst.lesson.steps.length - 1].k, 'match');
for (const id of worst.lesson.newIds) assert.deepStrictEqual(s5.prog[id].slice(0, 2), [1, T0 + 1]);

// today's plan survives a reload, and so does how many parts are done
{ const s8 = L.newState(); let k8 = 0;
  for (const e of W.words) { if (k8 >= 30) break; s8.prog[e.id] = [3, T0, 2, 0, T0 - 7]; k8++; }
  runLesson(s8, T0, 1);
  const view = st => { const p = L.planStatus(st, W, T0); return [p.total, p.done, p.next && p.next.nNew, p.next && p.next.nRev].join(','); };
  assert.strictEqual(view(L.sanitize(JSON.parse(JSON.stringify(s8)), W)), view(s8), 'plan kept across reload');
  assert.strictEqual(L.planStatus(s8, W, T0).done, 1); }
// the plan saved by the version before (v2) is planned again; lessons finished today count as parts
{ const s10 = L.newState(); s10.today = { v: 2, d: T0, rev0: 12 }; s10.days[L.dayKey(T0)] = { xp: 30, n: 5, r: 0, ok: 5, t: 5, done: false, miss: [], lessons: 2 };
  const m10 = L.sanitize(s10, W);
  assert.strictEqual(m10.today, null);
  const p10 = L.planStatus(m10, W, T0);
  assert.ok(p10.total === 3 && p10.done === 2 && m10.today.v === 3); }
// upgrade day: a 30-a-day list made earlier today shrinks to 10 (words already started stay); old written formats become choices
{ const ids = W.words.slice(0, 30).map(e => e.id), s12 = { settings: { daily: 30 }, nt: { d: T0, ids }, prog: { [ids[25]]: [1, T0 + 1, 1, 0, T0] },
    lesson: { kind: 'lesson', v: 3, T: T0, i: 0, steps: [{ k: 'q', id: ids[1], qt: 'spell1', q: { t: 'spell', id: ids[1], si: 0, lead: 1 } }, { k: 'q', id: ids[2], qt: 'kotype' }, { k: 'q', id: ids[3], qt: 'dict', r: 1 }, { k: 'q', id: ids[4], qt: 'cloze' }] },
    test: { kind: 'test', T: T0, i: 0, spec: { qt: 'write', range: { t: 'ids', ids } }, steps: [{ k: 'q', id: ids[5], qt: 'spell1' }, { k: 'q', id: ids[6], qt: 'dict' }, { k: 'q', id: ids[7], qt: 'kotype' }], answers: [], stat: {} } };
  const m12 = L.sanitize(s12, W);
  assert.strictEqual(m12.settings.daily, 10);
  assert.ok(m12.nt.ids.length === 10 && m12.nt.ids[0] === ids[25] && m12.nt.ids.slice(1).every((id, i) => id === ids[i]), 'started word kept, then the first 9');
  assert.deepStrictEqual(m12.lesson.steps.map(x => x.qt), ['mcq-en', 'mcq-ko', 'listen', 'cloze']);
  assert.ok(!m12.lesson.steps[0].q && m12.lesson.steps[2].r === 1, 'the saved question is made again; a retry stays a retry');
  assert.deepStrictEqual(m12.test.steps.map(x => x.qt), ['mcq-en', 'listen', 'mcq-ko']); }
// the day's parts all done: a bigger review count or daily count waits for tomorrow
{ const s13 = L.newState(); let k13 = 0;
  for (const e of W.words) { if (k13 >= 40) break; s13.prog[e.id] = [2, T0 - 1, 2, 0, T0 - 4]; k13++; }
  runDay(s13, T0, 1);
  const rev = s13.today.rev.slice(), nt = s13.nt.ids.slice();
  s13.settings.revDay = 30; s13.settings.daily = 5;
  assert.ok(!L.setReviewCap(s13, W, T0) && !L.refreshPlan(s13, W, T0), 'nothing changes today');
  assert.deepStrictEqual([s13.today.rev, s13.nt.ids], [rev, nt]);
  assert.ok(L.planStatus(s13, W, T0).finished);
  L.planStatus(s13, W, T0 + 1);
  assert.ok(s13.today.rev.length > 10 && s13.nt.ids.length === 5, 'tomorrow takes the new counts'); }
// a half-done lesson saved by an old version is dropped; a finished one is kept so it can be settled
assert.strictEqual(L.sanitize({ lesson: { kind: 'lesson', T: T0, steps: [{ k: 'learn', id: W.words[0].id }, { k: 'q', id: W.words[0].id }], i: 1 } }, W).lesson, null);
assert.ok(L.sanitize({ lesson: { kind: 'lesson', T: T0, steps: [{ k: 'learn', id: W.words[0].id }], i: 1 } }, W).lesson);
assert.ok(L.sanitize({ lesson: { kind: 'lesson', v: 3, T: T0, steps: [{ k: 'learn', id: W.words[0].id }, { k: 'q', id: W.words[0].id }], i: 1 } }, W).lesson, 'a v3 lesson in progress is kept');

// 3b) 60 days at 80% right: 10 new words every day, never more than 10 reviews; what waits grows
{ const s6 = L.newState(); const notes = [];
  for (let day = 0; day <= 60; day++) {
    const T = T0 + day, before = Object.keys(s6.prog).length;
    L.planStatus(s6, W, T);
    assert.ok(s6.today.rev.length <= L.REV_DAY);
    runDay(s6, T, 0.8);
    assert.strictEqual(Object.keys(s6.prog).length - before, 10, 'ten new words every day');
    if ([10, 30, 60].includes(day)) notes.push(`day ${day}: ${Object.keys(s6.prog).length} words, ${L.dueIds(s6, W, T + 1).length} reviews waiting`);
  }
  console.log('plan (10 new + up to 10 reviews a day + waiting words in the pairs rounds, 80% right):', notes.join(' | ')); }

// 4) tests
const s3 = L.newState();
runLesson(s3, T0, 1);
const test = L.buildTest(s3, W, { range: { t: 'days', days: [W.days[0]] }, qt: 'mix', count: 20, hasAudio: true, label: 'Day 01' }, T0);
assert.strictEqual(test.steps.length, 20);
assert.ok(test.steps.every(x => L.MIX_TYPES.includes(x.qt) && !L.TYPED.includes(x.qt)), 'the mix has no typing');
let wrongN = 0;
while (test.i < test.steps.length) { const ok = Math.random() < 0.6; if (!ok) wrongN++; L.answerTest(s3, test, ok); }
const fin = L.finishTest(s3, test);
assert.strictEqual(fin.wrongIds.length, wrongN);
assert.strictEqual(s3.tests.length, 1);
for (const id of fin.wrongIds) if (s3.prog[id]) assert.deepStrictEqual(s3.prog[id].slice(0, 2), [1, T0 + 1]);
const wrongRange = L.rangeIds(s3, W, { t: 'wrong' }, T0);
assert.ok(wrongRange.length >= wrongN);
for (const qt of ['write', 'kotype']) assert.ok(L.buildTest(s3, W, { range: { t: 'days', days: [W.days[0]] }, qt, count: 5, hasAudio: true }, T0).steps.every(x => L.MIX_TYPES.includes(x.qt)), qt + ' test becomes the mix');
console.log('test ok', test.stat.ok + '/' + test.stat.n, 'wrong list', wrongRange.length);

// 5) migration from the first version; a daily count above 10 becomes 10
const v1 = { prog: { [W.words[0].id]: [1, T0, 0, 0, T0], 'bogus': [1, 1, 1, 1, 1] }, meta: { daily: 15, start: 3, front: 'ko', nt: { d: T0, ids: [W.words[0].id] }, days: { '2026-09-25': { n: 3, r: 0, ok: 2, t: 3, done: false, miss: [W.words[0].id] } } } };
const m = L.sanitize(L.fromV1(v1), W);
assert.strictEqual(m.settings.daily, 10);
assert.strictEqual(m.settings.start, 3);
assert.ok(m.prog[W.words[0].id] && !m.prog['bogus']);
assert.strictEqual(m.days['2026-09-25'].n, 3);
for (const [d, want] of [[5, 5], [7, 7], [10, 10], [20, 10], [30, 10], [6, 5], [8, 7]]) assert.strictEqual(L.sanitize({ settings: { daily: d } }, W).settings.daily, want, 'daily ' + d);

// 6) start Day and plan refresh
const s4 = L.newState();
const lastDay = W.days[W.days.length - 1]; s4.settings.start = lastDay;
const planLast = L.todayPlan(s4, W, T0).planned;
assert.ok(planLast.every(id => id.startsWith(lastDay + '-')));
L.ensurePlan(s4, W, T0);
s4.settings.daily = 5; L.refreshPlan(s4, W, T0);
assert.strictEqual(s4.nt.ids.length, 5);
assert.deepStrictEqual([L.planStatus(s4, W, T0).next.nNew], [2], '5 new words over 3 parts: 2, 2, 1');

console.log('ALL LOGIC TESTS PASSED');
