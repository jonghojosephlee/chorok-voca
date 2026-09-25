/* 초록 보카 core logic: words, spaced repetition, question generation, lessons and tests.
   No DOM access, so the same file runs in the page and in the node tests. */
const Logic = (() => {
  'use strict';

  const INTERVAL = [0, 1, 3, 7, 16, 35, 80, 180];  // box -> days until the next review
  const MAXBOX = INTERVAL.length - 1;
  const MASTER = 5;                                 // box at which a word counts as mastered
  const DAYMS = 864e5, SHIFT = 4 * 36e5;            // a study day rolls over at 4am local time
  const REVIEW_CAP = 60, BATCH = 5, RETRY_GAP = 3;
  const MIX_TYPES = ['mcq-ko', 'mcq-en', 'syn', 'listen', 'spell'];

  const dayNum = (t = Date.now()) => { const d = new Date(t - SHIFT); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / DAYMS); };
  const dayKey = n => new Date(n * DAYMS).toISOString().slice(0, 10);

  let rand = Math.random;
  function seed(s) {
    rand = function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pick = a => a[Math.floor(rand() * a.length)];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const chunk = (a, n) => { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };

  /* ---------- words ---------- */
  const KO_END = /(적으로|스럽게|스러운|시키다|시키는|하다|하게|하는|되다|되는|적인|로운|롭게|된|한|인|의|는|은|게|히|다)$/;
  const KO_STOP = new Set(['않은', '않는', '않게', '있는', '없는', '하는', '되는', '하다', '되다', '이다', '같은', '매우', '아주', '가장', '많은', '것', '등']);
  function stems(ko) {
    const out = new Set();
    for (let t of String(ko).replace(/\([^)]*\)/g, ' ').split(/[\s,;·/~]+/)) {
      t = t.trim();
      if (t.length < 2 || KO_STOP.has(t)) continue;
      const s = t.replace(KO_END, '');
      out.add(s.length >= 2 ? s : t);
    }
    return out;
  }
  function posOf(ko) {
    const first = String(ko).replace(/\([^)]*\)/g, '').split(/[,;]/)[0].trim().replace(/^~\s*/, '');
    if (/다$/.test(first)) return 'v';
    if (/(한|인|는|은|운|의|된|진|난|른|던|있는|없는)$/.test(first)) return 'a';
    if (/(게|히|로|서|도|이|에|여|며|곧|즉시|단지|가끔|모두|자주)$/.test(first)) return 'r';
    return 'n';
  }
  function synonymsOf(senses) {
    const out = [];
    for (const s of senses) {
      for (let x of s.en.replace(/\([^)]*\)/g, ' ').split(/[,;]/)) {
        x = x.replace(/[가-힣]+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (x && !out.includes(x)) out.push(x);
      }
    }
    return out;
  }
  function prepare(rows) {
    const words = rows.map((r, i) => {
      const senses = r[3].map(s => ({ en: s[0] || '', ko: s[1] || '' }));
      const e = { id: r[0] + '-' + r[1], d: r[0], n: r[1], w: r[2], senses, note: r[4] || '', fix: r[5] || '', i };
      e.key = e.w.toLowerCase();
      e.pos = posOf(senses[0].ko || '');
      e.stems = stems(senses.map(s => s.ko).join(','));
      e.syn = synonymsOf(senses);
      e.synSet = new Set(e.syn);
      return e;
    });
    const byId = new Map(words.map(e => [e.id, e]));
    const days = [...new Set(words.map(e => e.d))].sort((a, b) => a - b);
    const byDay = new Map(days.map(d => [d, words.filter(e => e.d === d)]));
    const byPos = { v: [], a: [], r: [], n: [] };
    for (const e of words) byPos[e.pos].push(e);
    return { words, byId, days, byDay, byPos };
  }

  /* ---------- questions ---------- */
  const overlap = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };
  const related = (a, b) => a.key === b.key || overlap(a.stems, b.stems) || overlap(a.synSet, b.synSet) || a.synSet.has(b.key) || b.synSet.has(a.key);
  const shortOpt = s => s.split(' ').length <= 3 && s.length <= 26;
  function tiers(W, target, ok) {
    const near = e => Math.abs(e.d - target.d) <= 3;
    const same = W.byPos[target.pos];
    return [same.filter(e => near(e) && ok(e)), same.filter(ok), W.words.filter(ok)];
  }
  function draw(tierList, n, optionOf, taken) {
    const out = [];
    for (const tier of tierList) {
      for (const e of shuffle(tier.slice())) {
        if (out.length >= n) return out;
        const o = optionOf(e);
        if (o == null || taken.has(o)) continue;
        taken.add(o);
        out.push(o);
      }
    }
    return out;
  }
  function senseIndex(e) {
    const withKo = e.senses.map((s, i) => (s.ko ? i : -1)).filter(i => i >= 0);
    return withKo.length ? pick(withKo) : 0;
  }
  const firstKo = e => { const s = e.senses.find(s => s.ko); return s ? s.ko : null; };
  function finish(q, correct, opts) {
    if (opts.length < 4) return null;
    shuffle(opts);
    q.opts = opts;
    q.a = opts.indexOf(correct);
    return q;
  }
  function qMeaning(W, e, t) {
    const si = senseIndex(e), correct = e.senses[si].ko;
    if (!correct) return null;
    const ds = draw(tiers(W, e, c => !related(c, e)), 3, firstKo, new Set([correct]));
    return finish({ t, id: e.id, si }, correct, [correct, ...ds]);
  }
  function qWord(W, e) {
    const si = senseIndex(e);
    if (!e.senses[si].ko) return null;
    const ds = draw(tiers(W, e, c => !related(c, e)), 3, c => c.w, new Set([e.w]));
    return finish({ t: 'mcq-en', id: e.id, si }, e.w, [e.w, ...ds]);
  }
  function qSynonym(W, e) {
    const pool = e.syn.filter(s => s !== e.key && shortOpt(s));
    if (!pool.length) return null;
    const correct = pick(pool.slice(0, 4));
    const taken = new Set([e.key, ...e.syn]);
    const ds = draw(tiers(W, e, c => !related(c, e)), 3, c => {
      const cand = c.syn.filter(s => !taken.has(s) && s !== c.key && shortOpt(s));
      return cand.length ? pick(cand) : null;
    }, taken);
    return finish({ t: 'syn', id: e.id }, correct, [correct, ...ds]);
  }
  function makeQuestion(W, id, type, hasAudio) {
    const e = W.byId.get(id);
    if (!e) return null;
    if (type === 'listen' && !hasAudio) type = 'mcq-ko';
    const order = { 'mcq-ko': ['mcq-ko'], listen: ['listen', 'mcq-ko'], 'mcq-en': ['mcq-en', 'mcq-ko'], syn: ['syn', 'mcq-en', 'mcq-ko'], spell: ['spell'], card: ['card'] }[type] || ['mcq-ko'];
    for (const t of order) {
      let q = null;
      if (t === 'mcq-ko' || t === 'listen') q = qMeaning(W, e, t);
      else if (t === 'mcq-en') q = qWord(W, e);
      else if (t === 'syn') q = qSynonym(W, e);
      else if (t === 'spell') q = { t: 'spell', id, si: senseIndex(e) };
      else if (t === 'card') q = { t: 'card', id };
      if (q) return q;
    }
    return { t: 'card', id };
  }
  const normSpell = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
  const checkSpell = (e, input) => normSpell(input).length > 0 && normSpell(input) === normSpell(e.w);

  /* ---------- state ---------- */
  function defaultSettings() {
    return { daily: 10, goal: 50, start: 1, review: 'quiz', spell: true, sfx: true, say: true, silent: true, koSay: false, repeat: 2, front: 'en', theme: 'system' };
  }
  function newState() {
    return { v: 2, prog: {}, stars: {}, wrong: {}, days: {}, tests: [], nt: null, best: 0, xpTotal: 0, settings: defaultSettings(), session: null, spots: {} };
  }
  function sanitize(s, W) {
    const out = Object.assign(newState(), s || {});
    out.settings = Object.assign(defaultSettings(), (s && s.settings) || {});
    const prog = {};
    for (const [k, v] of Object.entries(out.prog || {})) {
      if (Array.isArray(v) && v.length >= 5 && (!W || W.byId.has(k))) prog[k] = v.slice(0, 5).map(Number);
    }
    out.prog = prog;
    for (const key of ['stars', 'wrong', 'days', 'spots']) if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
    if (!Array.isArray(out.tests)) out.tests = [];
    return out;
  }
  function fromV1(v1) {   // the first version stored {prog, meta:{daily, front, tts, start, nt, days}}
    const s = newState();
    if (!v1) return s;
    s.prog = v1.prog || {};
    const m = v1.meta || {};
    if (m.daily) s.settings.daily = m.daily;
    if (m.start) s.settings.start = m.start;
    if (m.front) s.settings.front = m.front;
    if (m.nt) s.nt = m.nt;
    for (const [k, d] of Object.entries(m.days || {})) s.days[k] = { xp: 0, n: d.n || 0, r: d.r || 0, ok: d.ok || 0, t: d.t || 0, done: !!d.done, miss: d.miss || [] };
    return s;
  }
  function dayStats(state, T) {
    const k = dayKey(T);
    return state.days[k] || (state.days[k] = { xp: 0, n: 0, r: 0, ok: 0, t: 0, done: false, miss: [] });
  }
  function dayMet(state, k) { const d = state.days[k]; return !!d && !!(d.done || d.met); }
  function addXp(state, ds, xp) {
    ds.xp += xp;
    state.xpTotal = (state.xpTotal || 0) + xp;
    if (ds.xp >= state.settings.goal) ds.met = true;
  }
  function streak(state, T) {
    let t = dayMet(state, dayKey(T)) ? T : T - 1, n = 0;
    while (dayMet(state, dayKey(t))) { n++; t--; }
    return n;
  }
  function touchBest(state, T) { state.best = Math.max(state.best || 0, streak(state, T)); }

  function pickNew(state, W, k, exclude = new Set()) {
    const out = [], start = state.settings.start || 1;
    const order = W.words.filter(e => e.d >= start).concat(W.words.filter(e => e.d < start));
    for (const e of order) {
      if (out.length >= k) break;
      if (!state.prog[e.id] && !exclude.has(e.id)) out.push(e.id);
    }
    return out;
  }
  function ensurePlan(state, W, T) {
    if (!state.nt || state.nt.d !== T) state.nt = { d: T, ids: pickNew(state, W, state.settings.daily) };
    state.nt.ids = state.nt.ids.filter(id => W.byId.has(id));
    return state.nt;
  }
  function refreshPlan(state, W, T) {   // after the daily count or start Day changes
    if (!state.nt || state.nt.d !== T) return;
    const started = state.nt.ids.filter(id => state.prog[id]);
    state.nt.ids = started.concat(pickNew(state, W, Math.max(0, state.settings.daily - started.length), new Set(started)));
  }
  function todayPlan(state, W, T) {
    const planned = state.nt && state.nt.d === T ? state.nt.ids.filter(id => W.byId.has(id)) : pickNew(state, W, state.settings.daily);
    const ntSet = new Set(planned);
    let rev = 0;
    for (const e of W.words) { const p = state.prog[e.id]; if (p && p[1] <= T && !ntSet.has(e.id)) rev++; }
    const newLeft = planned.filter(id => !state.prog[id] || state.prog[id][1] <= T);
    return { T, planned, rev, newLeft: newLeft.length, newIds: newLeft };
  }
  function statusOf(state, id) {
    const p = state.prog[id];
    return !p ? 'new' : p[0] >= MASTER ? 'master' : 'learn';
  }

  /* ---------- lessons ---------- */
  function reviewType(box, settings, hasAudio) {
    if (settings.review === 'card') return 'card';
    const r = rand();
    if (box <= 1) return hasAudio && r < 0.3 ? 'listen' : 'mcq-ko';
    if (box === 2) return r < 0.5 ? 'mcq-en' : 'syn';
    if (box <= 4) return r < 0.4 ? 'syn' : r < 0.7 ? 'mcq-en' : (hasAudio ? 'listen' : 'mcq-ko');
    return settings.spell ? (r < 0.6 ? 'spell' : 'syn') : (r < 0.5 ? 'syn' : 'mcq-en');
  }
  function retryType(t) { return t === 'spell' ? 'spell' : t === 'card' ? 'card' : t === 'listen' ? 'mcq-ko' : t; }
  function buildLesson(state, W, T, opts = {}) {
    const s = state.settings, hasAudio = !!opts.hasAudio;
    ensurePlan(state, W, T);
    if (opts.extra) state.nt.ids = state.nt.ids.concat(pickNew(state, W, opts.extra, new Set(state.nt.ids)));
    const ntSet = new Set(state.nt.ids);
    const fresh = state.nt.ids.filter(id => !state.prog[id]);
    const pendingNew = state.nt.ids.filter(id => state.prog[id] && state.prog[id][1] <= T);
    const dueAll = W.words.filter(e => { const p = state.prog[e.id]; return p && p[1] <= T && !ntSet.has(e.id); })
      .sort((a, b) => state.prog[a.id][1] - state.prog[b.id][1] || state.prog[a.id][0] - state.prog[b.id][0] || a.i - b.i);
    const rev = shuffle(dueAll.slice(0, REVIEW_CAP).map(e => e.id));
    const revSteps = rev.map(id => ({ k: 'q', id, qt: reviewType(state.prog[id][0], s, hasAudio) }))
      .concat(pendingNew.map(id => ({ k: 'q', id, qt: 'mcq-ko', nw: 1 })));
    const steps = [];
    const revChunks = chunk(revSteps, 5);
    let ri = 0;
    for (const b of chunk(fresh, BATCH)) {
      if (ri < revChunks.length) steps.push(...revChunks[ri++]);
      for (const id of b) steps.push({ k: 'learn', id });
      for (const id of shuffle(b.slice())) steps.push({ k: 'q', id, qt: 'mcq-ko', nw: 1 });
    }
    while (ri < revChunks.length) steps.push(...revChunks[ri++]);
    return {
      kind: 'lesson', T, created: Date.now(), steps, i: 0,
      newIds: fresh.concat(pendingNew), revIds: rev, revMore: dueAll.length - rev.length,
      seen: {}, failed: {}, done: {},
      stat: { firstOk: 0, firstN: 0, xp: 0, combo: 0, maxCombo: 0, ms: 0 },
    };
  }
  function lessonUnits(L) {   // words to finish, for the progress bar
    const ids = new Set(L.steps.filter(s => s.k === 'q').map(s => s.id));
    return { total: ids.size, done: Object.keys(L.done).length };
  }
  function answerLesson(state, L, correct) {
    const st = L.steps[L.i];
    const res = { xp: 0, first: false, combo: L.stat.combo, retry: false, done: false };
    if (!st) return res;
    if (st.k === 'learn') { L.i++; return res; }
    const id = st.id, T = L.T;
    const first = !L.seen[id];
    L.seen[id] = (L.seen[id] || 0) + 1;
    res.first = first;
    const isNew = !!st.nw;
    if (first) { L.stat.firstN++; if (correct) L.stat.firstOk++; }
    if (correct) { L.stat.combo++; L.stat.maxCombo = Math.max(L.stat.maxCombo, L.stat.combo); } else L.stat.combo = 0;
    const p = state.prog[id];
    let [box, due, reps, lapses] = p ? p.slice(0, 4) : [0, T, 0, 0];
    if (correct) {
      box = L.failed[id] || isNew || !p ? 1 : Math.min(box + 1, MAXBOX);
      due = T + INTERVAL[box];
      reps++;
      L.done[id] = 1;
      res.done = true;
      res.xp = first ? (isNew ? 3 : 2) : 1;
      if (L.stat.combo >= 5 && L.stat.combo % 5 === 0) res.xp += 2;
    } else {
      if (p && !isNew && first) lapses++;
      box = 1; due = T;
      L.failed[id] = 1;
      state.wrong[id] = [((state.wrong[id] || [0])[0] || 0) + 1, T];
      const again = { k: 'q', id, qt: retryType(st.qt), r: 1 };
      if (st.nw) again.nw = 1;
      L.steps.splice(Math.min(L.i + 1 + RETRY_GAP, L.steps.length), 0, again);
      res.retry = true;
    }
    state.prog[id] = [box, due, reps, lapses, T];
    const ds = dayStats(state, T);
    addXp(state, ds, res.xp);
    if (first) { ds.t++; if (correct) ds.ok++; }
    if (correct) { if (isNew) ds.n++; else ds.r++; }
    if (!correct && !ds.miss.includes(id)) ds.miss.push(id);
    L.stat.xp += res.xp;
    res.combo = L.stat.combo;
    L.i++;
    return res;
  }
  function finishLesson(state, W, L) {
    const T = L.T, ds = dayStats(state, T), bonus = 10;
    addXp(state, ds, bonus); L.stat.xp += bonus;
    ds.lessons = (ds.lessons || 0) + 1;
    const plan = todayPlan(state, W, T);
    if (!plan.rev && !plan.newLeft) ds.done = true;
    touchBest(state, T);
    return { bonus, plan };
  }

  /* ---------- tests ---------- */
  function rangeIds(state, W, range, T) {
    if (!range) return [];
    if (range.t === 'days') { const set = new Set(range.days || []); return W.words.filter(e => set.has(e.d)).map(e => e.id); }
    if (range.t === 'stars') return W.words.filter(e => state.stars[e.id]).map(e => e.id);
    if (range.t === 'wrong') return W.words.filter(e => state.wrong[e.id]).sort((a, b) => state.wrong[b.id][0] - state.wrong[a.id][0] || a.i - b.i).map(e => e.id);
    if (range.t === 'learned') return W.words.filter(e => state.prog[e.id]).map(e => e.id);
    if (range.t === 'ids') return (range.ids || []).filter(id => W.byId.has(id));
    return [];
  }
  function buildTest(state, W, spec, T) {
    let ids = rangeIds(state, W, spec.range, T);
    ids = spec.range.t === 'ids' ? ids.slice() : shuffle(ids.slice());
    if (spec.count && spec.count < ids.length) ids = ids.slice(0, spec.count);
    const steps = ids.map(id => ({ k: 'q', id, qt: spec.qt === 'mix' ? pick(spec.hasAudio ? MIX_TYPES : MIX_TYPES.filter(t => t !== 'listen')) : spec.qt }));
    return { kind: 'test', T, created: Date.now(), spec, steps, i: 0, answers: [], stat: { ok: 0, n: 0, xp: 0, combo: 0, maxCombo: 0, ms: 0 } };
  }
  function answerTest(state, X, correct) {
    const st = X.steps[X.i];
    const res = { xp: 0, combo: 0 };
    if (!st) return res;
    X.answers.push([st.id, correct ? 1 : 0]);
    X.stat.n++;
    const ds = dayStats(state, X.T);
    if (correct) {
      X.stat.ok++; X.stat.combo++; X.stat.maxCombo = Math.max(X.stat.maxCombo, X.stat.combo);
      res.xp = 1;
    } else {
      X.stat.combo = 0;
      state.wrong[st.id] = [((state.wrong[st.id] || [0])[0] || 0) + 1, X.T];
      const p = state.prog[st.id];
      if (p) state.prog[st.id] = [1, X.T + 1, p[2], p[3] + 1, X.T];
      if (!ds.miss.includes(st.id)) ds.miss.push(st.id);
    }
    X.stat.xp += res.xp; addXp(state, ds, res.xp);
    res.combo = X.stat.combo;
    X.i++;
    return res;
  }
  function finishTest(state, X) {
    const bonus = X.stat.n ? 5 : 0, ds = dayStats(state, X.T);
    X.stat.xp += bonus; addXp(state, ds, bonus);
    ds.tests = (ds.tests || 0) + 1;
    const wrongIds = X.answers.filter(a => !a[1]).map(a => a[0]);
    state.tests.unshift({ at: Date.now(), T: X.T, label: X.spec.label || '', qt: X.spec.qt, n: X.stat.n, ok: X.stat.ok, ms: X.stat.ms, wrong: wrongIds });
    state.tests = state.tests.slice(0, 60);
    touchBest(state, X.T);
    return { bonus, wrongIds };
  }
  function clearWrong(state, id) { delete state.wrong[id]; }

  return {
    INTERVAL, MAXBOX, MASTER, MIX_TYPES, REVIEW_CAP, dayNum, dayKey, seed, shuffle, pick,
    stems, posOf, synonymsOf, prepare, related, makeQuestion, checkSpell, normSpell,
    defaultSettings, newState, sanitize, fromV1, dayStats, dayMet, addXp, streak, touchBest,
    pickNew, ensurePlan, refreshPlan, todayPlan, statusOf,
    buildLesson, lessonUnits, answerLesson, finishLesson,
    rangeIds, buildTest, answerTest, finishTest, clearWrong,
  };
})();
if (typeof module !== 'undefined') module.exports = Logic;
