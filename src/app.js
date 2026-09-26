(() => {
'use strict';
const CFG = window.__CV__ || { mode: 'pwa' };
const L = Logic;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n || 0).toLocaleString('ko-KR');
const pad2 = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const PWA = CFG.mode === 'pwa';
const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
const today = () => L.dayNum();
const mmss = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + pad2(s % 60); };
const CIRC = ['①', '②', '③', '④', '⑤', '⑥'];

/* ---------- icons ---------- */
const sv = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const I = {
  home: sv('<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z"/>'),
  book: sv('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H20v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H20v-3"/><path d="M9 7.5h7"/>'),
  quiz: sv('<rect x="4.5" y="4" width="15" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="m8.8 13 2.2 2.2 4.4-4.4"/>'),
  chart: sv('<path d="M5 20v-6M11 20V9M17 20V4"/><path d="M3 20.5h18"/>'),
  gear: sv('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>'),
  speaker: sv('<path d="M4 9.5v5h3.4L12 18.4V5.6L7.4 9.5z"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.1 6.7a7.6 7.6 0 0 1 0 10.6"/>'),
  close: sv('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: sv('<path d="M15 5 8 12l7 7"/>'),
  chev: sv('<path d="m9 5 7 7-7 7"/>'),
  star: sv('<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>'),
  check: sv('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
  x: sv('<path d="M7 7l10 10M17 7 7 17"/>', 'stroke-width="3"'),
  play: sv('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>'),
  pause: sv('<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>'),
  prev: sv('<path d="M18 6 9 12l9 6z" fill="currentColor"/><path d="M6 6v12"/>'),
  next: sv('<path d="m6 6 9 6-9 6z" fill="currentColor"/><path d="M18 6v12"/>'),
  left: sv('<path d="M15 5 8 12l7 7"/>', 'stroke-width="2.6"'),
  right: sv('<path d="m9 5 7 7-7 7"/>', 'stroke-width="2.6"'),
  shuffle: sv('<path d="M16 4h4v4M4 20 20 4M20 16v4h-4M14.5 14.5 20 20M4 4l5 5"/>'),
  headphones: sv('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="7" rx="1.8"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.8"/>'),
  cards: sv('<rect x="3" y="7" width="13.5" height="13.5" rx="2.5"/><path d="M7.5 3.5h11a2 2 0 0 1 2 2v11"/>'),
  note: sv('<path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19M9.5 12h6M9.5 16h4"/>'),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'),
  retry: sv('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5v5h-5"/>'),
  save: sv('<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>'),
  upload: sv('<path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 20h14"/>'),
  target: sv('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 4.5 13.6h6.2L9.8 22l8.7-11.6h-6.2z" fill="var(--gold)"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 2.2c.6 3.2-1.9 4.9-3.4 7.2-1.2 1.8-1.5 3.1-1.1 4.6-1.3-.6-2-2-2-3.4C3.9 12.3 3 14.2 3 16a8.6 8.6 0 0 0 17.2.2c0-4.7-3.4-7.3-5-9.5.1 1.9-.4 3.3-1.5 4.1.4-3.8-.5-6.5-1.4-8.6z" fill="#ff7a1a"/><path d="M12.1 13.1c1.9 1.7 3.3 3.1 3.3 5a3.5 3.5 0 0 1-7 0c0-1.4.8-2.3 1.7-3.1.1.9.5 1.5 1.1 1.7-.2-1.3.2-2.5.9-3.6z" fill="#ffe08a"/></svg>',
  flameOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 2.2c.6 3.2-1.9 4.9-3.4 7.2-1.2 1.8-1.5 3.1-1.1 4.6-1.3-.6-2-2-2-3.4C3.9 12.3 3 14.2 3 16a8.6 8.6 0 0 0 17.2.2c0-4.7-3.4-7.3-5-9.5.1 1.9-.4 3.3-1.5 4.1.4-3.8-.5-6.5-1.4-8.6z" fill="var(--line-2)"/></svg>',
  trophy: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5.5h3v1.8a3.3 3.3 0 0 1-3.3 3.3M7 5.5H4v1.8a3.3 3.3 0 0 0 3.3 3.3"/>'),
  lock: sv('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  share: sv('<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  logo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="16" rx="3.6" fill="var(--green)"/><circle cx="7" cy="8.4" r="1.7" fill="var(--bg)"/><path d="M7.5 15.6h9M11 12.2h5.5" stroke="var(--accent-ink)" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
const ring = (size, stroke, parts, track = 'var(--surface-3)') => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  const arcs = parts.map(p => {
    const len = clamp(p.v, 0, 1) * c;
    const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.c}" stroke-width="${stroke}" stroke-linecap="${len > 0.5 && len < c - 1 ? 'round' : 'butt'}" stroke-dasharray="${len} ${c}" stroke-dashoffset="${-acc}"/>`;
    acc += len;
    return len > 0 ? s : '';
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>${arcs}</svg>`;
};

function mascot(mood = 'idle', cls = '') {   // 초록이: an original sprout character; CSS picks the face for data-mood
  return `<svg class="mascot ${cls}" data-mood="${mood}" viewBox="0 0 120 120" aria-hidden="true">
  <ellipse class="m-shadow" cx="60" cy="114" rx="30" ry="5"/>
  <g class="m-all">
    <g class="m-leaves"><path class="m-stem" d="M60 34V19"/><path class="m-leaf1" d="M59 22C47 9 29 11 25 20c9 10 25 11 34 2z"/><path class="m-leaf2" d="M61 20c11-14 30-13 34-4-8 11-25 13-34 4z"/></g>
    <path class="m-blob" d="M60 30c28 0 43 20 43 43 0 24-18 36-43 36S17 97 17 73c0-23 15-43 43-43z"/>
    <ellipse class="m-belly" cx="60" cy="83" rx="27" ry="19"/>
    <g class="m-open"><ellipse cx="45" cy="65" rx="8.5" ry="10.5" fill="#fff"/><ellipse cx="75" cy="65" rx="8.5" ry="10.5" fill="#fff"/><circle class="m-pupil" cx="46.5" cy="67" r="5.2"/><circle class="m-pupil" cx="76.5" cy="67" r="5.2"/><circle cx="48.6" cy="63.6" r="1.9" fill="#fff"/><circle cx="78.6" cy="63.6" r="1.9" fill="#fff"/></g>
    <g class="m-joy"><path class="m-line" d="M37 67q8-10 16 0M67 67q8-10 16 0"/></g>
    <g class="m-sad"><path class="m-line" d="M38 62l13-5M82 62l-13-5"/><circle class="m-pupil" cx="46" cy="70" r="4.4"/><circle class="m-pupil" cx="74" cy="70" r="4.4"/></g>
    <g class="m-sleep"><path class="m-line" d="M38 68h14M68 68h14"/></g>
    <ellipse class="m-cheek" cx="35" cy="81" rx="6.5" ry="4"/><ellipse class="m-cheek" cx="85" cy="81" rx="6.5" ry="4"/>
    <path class="m-smile m-line" d="M52 83q8 8 16 0"/>
    <g class="m-grin"><path class="m-fill" d="M48 81q12 18 24 0z"/><path class="m-tongue" d="M53.5 87.5q6.5 5.5 13 0q-6.5-3-13 0z"/></g>
    <path class="m-frown m-line" d="M52 91q8-7 16 0"/>
    <circle class="m-o m-fill" cx="60" cy="87" r="3.6"/>
  </g>
  <g class="m-spark"><path d="M14 34l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M104 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>
  <g class="m-zz"><text x="90" y="34">z</text><text x="100" y="22">z</text></g>
</svg>`;
}
function charBubble(inner, mood = 'idle') { return `<div class="qchar">${mascot(mood)}<div class="bubble">${inner}</div></div>`; }

/* ---------- words data ---------- */
let W = null;
const K_WORDS = 'cv2-words', K_KEY = 'cv2-key', K_STATE = 'cv2-state', K_AT = 'cv2-at';
function storedRows() {
  if (!PWA) return window.__CV_WORDS__ || null;
  try {
    const o = JSON.parse(localStorage.getItem(K_WORDS) || 'null');
    if (o && Array.isArray(o.words) && o.words.length) return o.words;
  } catch (e) {}
  return null;
}

/* ---------- crypto (phone build) ---------- */
const b64 = {
  enc: buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); },
  dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
};
const Crypto = {
  key: null,
  async derive(code) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64.dec(CFG.crypto.salt), iterations: CFG.crypto.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  },
  async stored() {
    if (this.key) return this.key;
    const raw = localStorage.getItem(K_KEY);
    if (!raw) throw new Error('no key');
    this.key = await crypto.subtle.importKey('raw', b64.dec(raw), { name: 'AES-GCM' }, true, ['decrypt']);
    return this.key;
  },
  async open(key, buf) {
    const u = new Uint8Array(buf);
    if (u.length < 17 || u[0] !== 67 || u[1] !== 86 || u[2] !== 69 || u[3] !== 49) throw new Error('bad file');
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(4, 16) }, key, u.slice(16));
  },
};

/* ---------- state & storage ---------- */
let state = null;
const Local = {
  read() {
    try {
      const raw = localStorage.getItem(K_STATE);
      if (raw) return JSON.parse(raw);
      const v1 = localStorage.getItem('chorok-voca-v1');
      if (v1) return L.fromV1(JSON.parse(v1));
    } catch (e) {}
    return null;
  },
  write(s) { try { localStorage.setItem(K_STATE, JSON.stringify(s)); localStorage.setItem(K_AT, String(s.at || 0)); return true; } catch (e) { return false; } },
  at() { try { return Number(localStorage.getItem(K_AT) || 0); } catch (e) { return 0; } },
};
const Cloud = {   // claude.ai build: the viewer's own private documents
  ready: false, refs: null, hasProg: false, pushed: {}, timer: 0, chain: Promise.resolve(), status: '',
  async connect() {
    const cl = window.claude;
    if (!cl || typeof cl.use !== 'function') return null;
    const [db, user] = await Promise.all([cl.use('db'), cl.use('user')]);
    const uid = db && user ? await user.id() : null;
    if (!uid) return null;
    const base = 'data/users/' + uid;
    this.refs = { prog: db.doc(base + '/prog2'), meta: db.doc(base + '/meta2'), p1: db.doc(base + '/progress'), m1: db.doc(base + '/meta') };
    const [p, m] = await Promise.all([this.refs.prog.get(), this.refs.meta.get()]);
    let cloud = null;
    if (m.exists) cloud = Object.assign({}, m.data(), { prog: p.exists ? Object.assign({}, (p.data() || {}).w || {}) : {} });
    else {
      const [p1, m1] = await Promise.all([this.refs.p1.get(), this.refs.m1.get()]);
      if (p1.exists || m1.exists) cloud = L.fromV1({ prog: p1.exists ? (p1.data() || {}).w : {}, meta: m1.exists ? m1.data() : {} });
    }
    this.hasProg = p.exists;
    this.pushed = p.exists ? JSON.parse(JSON.stringify((p.data() || {}).w || {})) : {};
    this.ready = true;
    return cloud;
  },
  push() { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 1500); },
  flush() {
    if (!this.ready) return this.chain;
    clearTimeout(this.timer);
    const w = {};
    for (const [id, v] of Object.entries(state.prog)) { const o = this.pushed[id]; if (!o || o.join() !== v.join()) w[id] = v; }
    for (const id of Object.keys(this.pushed)) if (!state.prog[id]) w[id] = null;
    const meta = JSON.parse(JSON.stringify(Object.assign({}, state, { prog: undefined })));
    const progAll = JSON.parse(JSON.stringify(state.prog));
    this.chain = this.chain.then(async () => {
      try {
        if (!this.hasProg) { await this.refs.prog.set({ w: progAll }); this.hasProg = true; }
        else if (Object.keys(w).length) await this.refs.prog.update({ w });
        await this.refs.meta.set(meta);
        this.pushed = progAll;
        this.status = 'ok';
      } catch (e) {
        this.status = 'err';
        if (!e || !['revoked', 'not_granted', 'invalid_argument'].includes(e.code)) this.timer = setTimeout(() => this.flush(), 5000);
      }
    });
    return this.chain;
  },
};
function mergeStates(a, b) {   // newer wins; word progress merged per word
  if (!a) return b;
  if (!b) return a;
  const newer = (b.at || 0) > (a.at || 0) ? b : a, older = newer === a ? b : a;
  const out = Object.assign({}, newer, { prog: Object.assign({}, older.prog || {}) });
  for (const [k, v] of Object.entries(newer.prog || {})) {
    const o = out.prog[k];
    out.prog[k] = !o || v[4] > o[4] || (v[4] === o[4] && v[2] + v[3] >= o[2] + o[3]) ? v : o;
  }
  out.days = Object.assign({}, older.days || {});
  for (const [k, d] of Object.entries(newer.days || {})) { const o = out.days[k]; out.days[k] = !o || (d.xp || 0) >= (o.xp || 0) ? d : o; }
  return out;
}
let saveTimer = 0;
function save() {
  state.at = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}
let syncedAt = 0;
function flush() {
  clearTimeout(saveTimer);
  if (!state) return;
  const other = Local.at();
  if (other > syncedAt && other > (state.at || 0)) { adoptStored(); return; }   // another tab saved something newer
  if (Local.write(state)) syncedAt = state.at || 0;
  if (Cloud.ready) Cloud.push();
}
function adoptStored() {
  const s = Local.read();
  if (!s || !W) return;
  state = L.sanitize(s, W);
  syncedAt = state.at || 0;
  if (['quiz', 'browse', 'auto', 'result'].includes(screen)) { Voice.stop(); Q = null; B = null; if (A) autoStop(); A = null; go('home'); toast('다른 창에서 한 학습 기록으로 새로 고쳤어요'); }
  else if (TABBED.includes(screen)) go(screen);
}
window.addEventListener('storage', ev => { if (ev.key === K_AT && state && W && Local.at() > (state.at || 0)) adoptStored(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { pauseTimers(); flush(); if (Cloud.ready) Cloud.flush(); }
  else { if (Q) Q.t0 = Date.now(); if (state && W && Local.at() > (state.at || 0)) adoptStored(); }
});
window.addEventListener('pagehide', () => { flush(); if (Cloud.ready) Cloud.flush(); });

/* ---------- sound ---------- */
const Sound = {
  _ctx: null, bus: null, vbus: null, primed: false,
  ctx() {
    if (this._ctx) return this._ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this._ctx = new AC();
    const master = this._ctx.createGain(); master.gain.value = 0.9; master.connect(this._ctx.destination);
    this.bus = this._ctx.createGain(); this.bus.gain.value = 0.6; this.bus.connect(master);
    this.vbus = this._ctx.createGain(); this.vbus.gain.value = 1; this.vbus.connect(master);
    return this._ctx;
  },
  session() {
    try { if (navigator.audioSession) navigator.audioSession.type = state && state.settings.silent ? 'playback' : 'auto'; } catch (e) {}
  },
  unlock() {
    this.session();
    const c = this.ctx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    if (!this.primed) {
      try { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); this.primed = true; } catch (e) {}
    }
  },
  note(f, t, d, o = {}) {
    const c = this._ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.g || 0.2, t + (o.a || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let n = osc;
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); n = fl; }
    n.connect(g); g.connect(this.bus);
    osc.start(t); osc.stop(t + d + 0.03);
  },
  noise(t, d, f, gain) {
    const c = this._ctx, len = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.8; g.gain.value = gain;
    s.connect(bp); bp.connect(g); g.connect(this.bus); s.start(t);
  },
  sfx(name) {
    if (!state || !state.settings.sfx) return;
    const c = this.ctx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t = c.currentTime + 0.015, N = (f, at, d, o) => this.note(f, t + at, d, o);
    try {
      if (name === 'right') { N(880, 0, 0.16, { g: 0.2, type: 'triangle' }); N(1318.5, 0.085, 0.3, { g: 0.2, type: 'triangle' }); N(2637, 0.085, 0.14, { g: 0.035 }); }
      else if (name === 'wrong') { N(246.9, 0, 0.13, { g: 0.2, type: 'square', lp: 900 }); N(196, 0.12, 0.24, { g: 0.2, type: 'square', lp: 700 }); }
      else if (name === 'tap') N(1500, 0, 0.035, { g: 0.05 });
      else if (name === 'flip') this.noise(t, 0.07, 1900, 0.09);
      else if (name === 'next') N(740, 0, 0.07, { g: 0.06, type: 'triangle' });
      else if (name === 'combo') [1046.5, 1318.5, 1568, 2093].forEach((f, i) => N(f, i * 0.06, 0.18, { g: 0.13, type: 'triangle' }));
      else if (name === 'start') { N(659.3, 0, 0.12, { g: 0.12, type: 'triangle' }); N(987.8, 0.08, 0.22, { g: 0.12, type: 'triangle' }); }
      else if (name === 'complete') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => N(f, i * 0.11, 0.32, { g: 0.17, type: 'triangle' }));
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(f => N(f, 0.5, 1.1, { g: 0.06, type: 'sine', a: 0.02 }));
      }
      else if (name === 'star') { N(1174.7, 0, 0.09, { g: 0.1, type: 'triangle' }); N(1568, 0.06, 0.16, { g: 0.1, type: 'triangle' }); }
    } catch (e) {}
  },
};

/* ---------- pronunciation ---------- */
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
if ('speechSynthesis' in window) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) {} }
function tts(text, lang) {
  return new Promise(res => {
    if (!('speechSynthesis' in window) || !text) return res();
    let done = false;
    const end = () => { if (!done) { done = true; res(); } };
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/~/g, ' '));
      u.lang = lang;
      u.rate = lang.startsWith('en') ? 0.9 : 1.05;
      const bad = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Fred|Good News|Jester|Junior|Organ|Superstar|Trinoids|Whisper|Zarvox|Ralph|Kathy|Grandpa|Grandma|Rocko|Eddy|Flo|Reed|Sandy|Shelley/i;
      const v = voices.filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)) && !bad.test(v.name));
      const best = v.find(v => /premium|enhanced|neural|natural/i.test(v.name)) || v.find(v => v.lang.replace('_', '-') === lang) || v[0];
      if (best) u.voice = best;
      u.onend = end; u.onerror = end;
      speechSynthesis.speak(u);
      setTimeout(end, 5000);
    } catch (e) { end(); }
  });
}
const Voice = {
  packs: new Map(), bufs: new Map(), order: [], cur: null, failed: false, tok: 0,
  available() { return !!(CFG.audio && (!CFG.audio.enc || localStorage.getItem(K_KEY))) && !this.failed; },
  url(d) { return CFG.audio.base + 'd' + pad2(d) + (CFG.audio.ext || '.bin') + (CFG.audio.enc && CFG.audio.v ? '?v=' + CFG.audio.v : ''); },
  pack(d) {
    if (!this.packs.has(d)) {
      this.packs.set(d, (async () => {
        let res = null;
        if (PWA && 'caches' in window) { try { res = await caches.match(new URL(this.url(d), location.href).href); } catch (e) { res = null; } }
        if (!res) res = await fetch(this.url(d));
        if (!res.ok) throw new Error('audio ' + res.status);
        let buf;
        if (CFG.audio.b64) {   // claude.ai serves the packs as base64 text
          const bin = atob((await res.text()).trim()), u = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          buf = u.buffer;
        } else buf = await res.arrayBuffer();
        if (CFG.audio.enc) buf = await Crypto.open(await Crypto.stored(), buf);
        const dv = new DataView(buf);
        if (dv.getUint32(0, true) !== 0x31415643) throw new Error('bad pack');
        const n = dv.getUint16(4, true), base = 6 + n * 10, index = new Map();
        for (let i = 0, p = 6; i < n; i++, p += 10) index.set(dv.getUint16(p, true), [base + dv.getUint32(p + 2, true), dv.getUint32(p + 6, true)]);
        return { buf, index };
      })().catch(e => { this.packs.delete(d); throw e; }));
    }
    return this.packs.get(d);
  },
  preload(ids) { const days = new Set(ids.map(id => W.byId.get(id)).filter(Boolean).map(e => e.d)); for (const d of days) this.pack(d).catch(() => {}); },
  async buffer(e) {
    if (this.bufs.has(e.id)) return this.bufs.get(e.id);
    const p = await this.pack(e.d), ent = p.index.get(e.n);
    if (!ent) throw new Error('no clip');
    const c = Sound.ctx(), slice = p.buf.slice(ent[0], ent[0] + ent[1]);
    const ab = await new Promise((res, rej) => { const r = c.decodeAudioData(slice, res, rej); if (r && r.then) r.then(res, rej); });
    this.bufs.set(e.id, ab); this.order.push(e.id);
    if (this.order.length > 90) this.bufs.delete(this.order.shift());
    return ab;
  },
  stop() { this.tok++; if (this.cur) { try { this.cur.stop(); } catch (e) {} this.cur = null; } try { speechSynthesis.cancel(); } catch (e) {} },
  async play(id) {
    const e = W.byId.get(id);
    if (!e) return;
    Sound.unlock();
    this.stop();
    const tok = this.tok;
    if (this.available() && Sound.ctx()) {
      try {
        const ab = await this.buffer(e), c = Sound.ctx();
        if (tok !== this.tok) return;
        if (c.state === 'suspended') await c.resume();
        if (tok !== this.tok) return;
        const src = c.createBufferSource();
        src.buffer = ab; src.connect(Sound.vbus); src.start();
        this.cur = src;
        await new Promise(res => { src.onended = res; setTimeout(res, ab.duration * 1000 + 400); });
        return;
      } catch (err) { if (tok !== this.tok) return; console.warn('[초록 보카] 발음 파일 재생 실패, 기기 음성으로 대신 읽어요', err); }
    }
    if (tok !== this.tok) return;
    await tts(e.w, 'en-US');
  },
};
function sayBtnFeedback(btn) { if (!btn) return; btn.classList.add('playing'); setTimeout(() => btn.classList.remove('playing'), 900); }

/* ---------- ui helpers ---------- */
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }
let sheetResolve = null;
function sheet(html) {
  $('sheetIn').innerHTML = html;
  $('sheet').hidden = false;
  return new Promise(res => { sheetResolve = res; });
}
function closeSheet(v) { $('sheet').hidden = true; if (sheetResolve) { const r = sheetResolve; sheetResolve = null; r(v); } }
$('sheet').addEventListener('click', ev => { if (ev.target === $('sheet')) closeSheet(null); });
function confirmSheet(title, body, yes, no, danger) {
  return sheet(`<h3>${esc(title)}</h3><p>${esc(body)}</p><button class="btn ${danger ? 'bad' : ''}" type="button" data-act="sheet" data-v="1">${esc(yes)}</button><button class="btn alt" type="button" data-act="sheet" data-v="0">${esc(no)}</button>`).then(v => v === '1');
}
function confetti() {
  if (reduced()) return;
  const cv = $('confetti'), dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  cv.hidden = false; cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#1b7a4b', '#3fb37b', '#e9a310', '#ff5a1f', '#2f6fd6', '#9fcfb2', '#ffb020'];
  const P = Array.from({ length: 150 }, () => ({ x: w / 2 + (Math.random() - 0.5) * 60, y: h * 0.32, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 5, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6.3, va: (Math.random() - 0.5) * 0.35, sq: Math.random() < 0.6 }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (const p of P) {
      p.vy += 0.3; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
      if (p.sq) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.3, 0, 6.3); ctx.fill(); }
      ctx.restore();
    }
    if (t - t0 < 2800) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, w, h); cv.hidden = true; }
  })(t0);
}
function countUp(el, to, ms = 700) {
  if (!el) return;
  if (reduced() || to <= 0) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  (function f(t) { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f); })(t0);
}
function applyTheme() {
  if (!PWA) return;
  const th = state.settings.theme;
  if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme;
}
function statusPill(id) {
  const s = L.statusOf(state, id);
  return s === 'new' ? '<span class="pill p-new">새 단어</span>' : s === 'master' ? '<span class="pill p-master">암기 완료</span>' : '<span class="pill p-learn">학습 중</span>';
}
function sensesHTML(e) {
  const multi = e.senses.length > 1;
  return '<ol class="senses">' + e.senses.map((s, i) => '<li>' + (multi ? `<span class="no">${i + 1}</span>` : '') + '<div>' +
    (s.ko ? `<p class="ko">${esc(s.ko)}</p>` : '') + (s.en ? `<p class="en" lang="en"><span class="syn">syn</span>${esc(s.en)}</p>` : '') + '</div></li>').join('') + '</ol>';
}
function extrasHTML(e) {
  return (e.note ? `<p class="note"><b>헷갈리는 단어</b>${esc(e.note)}</p>` : '') + (e.fix ? `<p class="fixnote">※ ${esc(e.fix)}</p>` : '');
}
function meaningLine(e) { return e.senses.map((s, i) => (e.senses.length > 1 ? CIRC[i] + ' ' : '') + (s.ko || s.en)).join('  '); }
function rowHTML(e, o = {}) {
  const multi = e.senses.length > 1, wrong = state.wrong[e.id];
  const senses = e.senses.map((s, i) => (s.ko ? `<span class="k">${multi ? CIRC[i] + ' ' : ''}${esc(s.ko)}</span>` : '') + (s.en ? `<span class="e" lang="en">${multi && !s.ko ? CIRC[i] + ' ' : ''}${esc(s.en)}</span>` : '')).join('');
  return `<li class="wrow"><span class="no">${o.showDay ? `<small>D${pad2(e.d)}</small>` : ''}${e.n}</span>` +
    `<span class="w" lang="en">${esc(e.w)}<button type="button" data-act="say" data-id="${e.id}" aria-label="${esc(e.w)} 발음 듣기">${I.speaker}</button></span>` +
    `<span class="side"><button class="star ${state.stars[e.id] ? 'on' : ''}" type="button" data-act="star" data-id="${e.id}" aria-label="즐겨찾기" aria-pressed="${!!state.stars[e.id]}">${I.star}</button></span>` +
    senses + `<span class="x">${statusPill(e.id)}${o.wrong && wrong ? ` <span class="pill p-wrong">${wrong[0]}번 틀림</span>` : ''}</span>` +
    (e.note ? `<span class="x">헷갈리는 단어 · ${esc(e.note)}</span>` : '') + (e.fix ? `<span class="x">※ ${esc(e.fix)}</span>` : '') + '</li>';
}

/* ---------- navigation ---------- */
let screen = 'boot', tab = 'home', prevScreen = 'home';
const TABBED = ['home', 'words', 'day', 'test', 'stats', 'settings'];
function show(name) {
  if (name !== screen) prevScreen = screen;
  screen = name;
  for (const s of document.querySelectorAll('#app > .screen')) s.hidden = s.id !== 's-' + name;
  $('tabs').hidden = !TABBED.includes(name);
  if (['home', 'words', 'test', 'stats'].includes(name)) tab = name;
  for (const b of document.querySelectorAll('.tab')) { if (b.dataset.tab === (name === 'day' ? 'words' : name === 'settings' ? '' : name)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  if (name !== 'quiz') { hideFb(); $('qbody').innerHTML = ''; $('qfoot').innerHTML = ''; }
  if (name !== 'browse') $('s-browse').innerHTML = '';
  if (name !== 'auto') $('s-auto').innerHTML = '';
  window.scrollTo(0, 0);
}
function go(name, arg) {
  if (name === 'home') renderHome();
  else if (name === 'words') renderWords();
  else if (name === 'day') renderDay(arg);
  else if (name === 'test') renderTest();
  else if (name === 'stats') renderStats();
  else if (name === 'settings') renderSettings();
  show(name);
}

/* ---------- home ---------- */
function sessionActive(s, T) { return s && s.T === T && s.i < s.steps.length; }
function settleSessions() {   // the last answer was saved but the result screen never showed
  let changed = false;
  if (state.lesson && state.lesson.i >= state.lesson.steps.length) { L.finishLesson(state, W, state.lesson); state.lesson = null; changed = true; }
  if (state.test && state.test.i >= state.test.steps.length) { L.finishTest(state, state.test); state.test = null; changed = true; }
  if (changed) save();
}
const UNITS = [['#2dbe60', '#127a3a'], ['#1cb0f6', '#0f6bab'], ['#a36cf2', '#7d4fd0'], ['#ff9a1f', '#c26a00'], ['#ff5f9e', '#c43d74'], ['#14b8a6', '#0d8276']];
const unitOf = d => UNITS[Math.floor((d - 1) / 5) % UNITS.length];
function dayCounts(d) {
  const ws = W.byDay.get(d);
  let m = 0, l = 0;
  for (const e of ws) { const p = state.prog[e.id]; if (p) { if (p[0] >= L.MASTER) m++; else l++; } }
  return { n: ws.length, m, l };
}
function renderHome() {
  if (!Q) settleSessions();
  const T = today(), s = state, st = s.settings;
  if (s.lesson && !sessionActive(s.lesson, T)) s.lesson = null;
  const plan = L.todayPlan(s, W, T), ds = s.days[L.dayKey(T)] || { xp: 0 };
  const xp = ds.xp || 0, goal = st.goal, met = L.dayMet(s, L.dayKey(T)), streak = L.streak(s, T);
  const dateLabel = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(T * 864e5));
  const lesson = s.lesson, left = plan.rev + plan.newLeft;
  let cta, say, mood = 'idle';
  if (lesson) {
    const u = L.lessonUnits(lesson);
    cta = `<button class="btn" type="button" data-act="lesson">${I.play}이어서 하기 · ${u.done}/${u.total}</button>`;
    say = `하던 학습이 있어요!<small>${u.done}/${u.total}까지 했어요. 그 문제부터 이어서 해요.</small>`;
  } else if (left > 0) {
    cta = `<button class="btn" type="button" data-act="lesson">${I.play}${ds.t ? '이어서 학습' : '학습 시작'}</button>`;
    const first = plan.newIds.length ? W.byId.get(plan.newIds[0]) : null;
    say = (streak ? `${streak}일 연속 학습 중! 오늘도 이어가요.` : plan.newLeft ? `오늘 새 단어 ${plan.newLeft}개, 같이 해봐요!` : `복습할 단어 ${plan.rev}개가 기다려요.`) +
      `<small>${first ? `새 단어 <span lang="en">${esc(first.w)}</span>${plan.newIds.length > 1 ? ` 외 ${plan.newIds.length - 1}개` : ''} · Day ${pad2(first.d)}` : '오늘은 복습만 남았어요'}${plan.rev && plan.newLeft ? ` · 복습 ${plan.rev}개` : ''}</small>`;
  } else {
    cta = `<button class="btn gold" type="button" data-act="lessonExtra">${I.bolt}새 단어 ${st.daily}개 더 하기</button>`;
    say = `오늘 학습 끝! 정말 잘했어요.<small>${xp >= goal ? '오늘 목표 XP도 채웠어요' : '더 하고 싶으면 새 단어를 추가해요'}</small>`;
    mood = 'happy';
  }
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  let week = '';
  for (let t = T - 6; t <= T; t++) {
    const k = L.dayKey(t), d = s.days[k], cls = L.dayMet(s, k) ? 'done' : d && d.xp ? 'part' : '';
    week += `<div class="wk ${cls}${t === T ? ' today' : ''}"><i>${I.flame}</i><span>${labels[new Date(t * 864e5).getUTCDay()]}</span></div>`;
  }
  const stars = Object.keys(s.stars).filter(id => W.byId.has(id)).length, wrong = Object.keys(s.wrong).filter(id => W.byId.has(id)).length;
  const curId = plan.newIds[0] || L.pickNew(s, W, 1)[0], cur = curId ? W.byId.get(curId).d : null;
  const offs = [0, 46, 70, 46, 0, -46, -70, -46];
  let path = '';
  W.days.forEach((d, i) => {
    const [uc, ud] = unitOf(d);
    if ((d - 1) % 5 === 0) {
      const group = W.days.filter(x => x >= d && x < d + 5);
      let n = 0, seen = 0;
      for (const x of group) { const c = dayCounts(x); n += c.n; seen += c.m + c.l; }
      path += `<div class="unit" style="background:${uc};--ud:${ud}"><div><b>유닛 ${Math.floor((d - 1) / 5) + 1}</b><strong>Day ${pad2(group[0])}–${pad2(group[group.length - 1])}</strong></div><span>${seen} / ${n}단어</span></div>`;
    }
    const c = dayCounts(d), full = c.m + c.l === c.n, isCur = d === cur && !full;
    const cls = full ? 'full' : isCur ? 'cur' : c.m + c.l ? 'on' : 'todo';
    path += `<div class="pnode ${cls}" style="--x:${offs[i % 8]}px;--uc:${uc};--ud:${ud}">
      ${isCur ? `<button class="startpop" type="button" data-act="lesson">${lesson ? '이어서' : '시작'}</button>` : ''}
      <button class="nb" type="button" data-act="day" data-day="${d}" aria-label="Day ${d}, ${c.n}단어 중 ${c.m + c.l}개 학습">${ring(96, 7, [{ v: c.m / c.n, c: 'var(--gold)' }, { v: c.l / c.n, c: uc }]).replace('<svg ', '<svg class="ring" ')}<i>${full ? I.check : pad2(d)}</i></button>
      <small>Day ${pad2(d)} · ${c.m + c.l}/${c.n}</small></div>`;
  });
  const install = PWA && !standalone && isIOS ? `<div class="banner">${I.share}<span><b>앱처럼 쓰려면</b> 공유 버튼 → ‘홈 화면에 추가’를 누르고 홈 화면 아이콘으로 여세요.</span></div>` : '';
  $('s-home').innerHTML = `<div class="wrap">
    <div class="topbar"><div class="brand">${mascot('idle')}<span>초록 보카</span></div>
      <div class="tstats"><span class="tchip flame ${met ? 'on' : ''}" title="연속 학습 ${streak}일">${streak ? I.flame : I.flameOff}${streak}</span><span class="tchip xp" title="오늘 XP">${I.bolt}${fmt(xp)}</span><button class="ibtn" type="button" data-act="settings" aria-label="설정">${I.gear}</button></div></div>
    ${install}
    <p class="eyebrow" style="margin:-6px 4px -4px">${esc(dateLabel)}</p>
    <div class="card hero">
      <div class="charrow">${mascot(mood, 'float')}<div class="bubble">${say}</div></div>
      <div class="goal"><div class="goal-top"><span>오늘의 목표</span><b>${I.bolt}${fmt(xp)} / ${goal} XP</b></div><div class="bar" role="progressbar" aria-label="오늘 목표" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${xp}"><i style="width:${Math.min(100, xp / goal * 100)}%"></i></div></div>
      <div class="counts"><div class="count rev"><b>${plan.rev}</b><span>복습할 단어</span></div><div class="count new"><b>${plan.newLeft}</b><span>새 단어</span></div></div>
      ${cta}
    </div>
    <div class="card week" aria-label="최근 7일">${week}</div>
    <div class="quick">
      <button class="qk" type="button" data-act="wrongList"><i class="i-red">${I.note}</i><span><b>오답노트</b><small>${wrong}단어</small></span></button>
      <button class="qk" type="button" data-act="starList"><i class="i-gold">${I.star}</i><span><b>즐겨찾기</b><small>${stars}단어</small></span></button>
      <button class="qk" type="button" data-act="autoToday"><i class="i-blue">${I.headphones}</i><span><b>듣기 모드</b><small>오늘 단어 자동 재생</small></span></button>
      <button class="qk" type="button" data-act="tab" data-tab="test"><i class="i-purple">${I.quiz}</i><span><b>테스트</b><small>범위 골라 시험</small></span></button>
    </div>
    <div class="sec"><h2>학습 경로</h2><span>총 ${fmt(W.words.length)}단어 · Day ${W.days.length}개</span></div>
    <div class="path">${path}</div>
    <div class="legend"><span><i style="background:var(--gold)"></i>암기 완료</span><span><i style="background:var(--green)"></i>학습 중</span><span><i style="background:var(--surface-3)"></i>아직</span></div>
  </div>`;
  if (!s.onboarded) setTimeout(onboard, 350);
}
async function onboard() {
  if (state.onboarded || screen !== 'home') return;
  const v = await sheet(`${mascot('happy', 'hop')}<h3>안녕하세요! 저는 초록이예요</h3><p>하루에 새 단어 몇 개씩 해볼까요? 복습할 단어는 제가 알아서 챙길게요. 나중에 설정에서 바꿀 수 있어요.</p>
    <div class="seg" id="obSeg">${[5, 10, 15, 20].map(n => `<button type="button" data-act="obPick" data-v="${n}" aria-pressed="${n === state.settings.daily}">${n}개</button>`).join('')}</div>
    <button class="btn" type="button" data-act="sheet" data-v="go">시작하기</button>`);
  state.onboarded = true;
  L.refreshPlan(state, W, today());
  save();
  renderHome();
  if (v === 'go') startLesson();
}

/* ---------- lesson & test runner ---------- */
let Q = null;
function startLesson(opts = {}) {
  const T = today();
  let s = state.lesson;
  if (opts.extra || opts.more || !sessionActive(s, T)) {
    s = L.buildLesson(state, W, T, { hasAudio: Voice.available(), extra: opts.extra || 0 });
    if (!s.steps.length) { save(); toast('오늘 할 카드가 없어요. 새 단어를 더 해볼까요?'); go('home'); return; }
    state.lesson = s;
    save();
  }
  Sound.unlock(); Sound.sfx('start');
  run(s);
}
function startTest(spec) {
  const X = L.buildTest(state, W, Object.assign({ hasAudio: Voice.available() }, spec), today());
  if (!X.steps.length) { toast('이 범위에는 단어가 없어요'); return; }
  state.test = X;
  save();
  Sound.unlock(); Sound.sfx('start');
  run(X);
}
function run(sess) {
  Q = { sess, t0: Date.now(), locked: false, autoT: 0, hint: 0 };
  Voice.preload(sess.steps.slice(sess.i, sess.i + 30).map(s => s.id));
  show('quiz');
  renderStep();
}
function pauseTimers() { if (Q) { Q.sess.stat.ms = (Q.sess.stat.ms || 0) + (Date.now() - Q.t0); Q.t0 = Date.now(); } }
function curStep() { return Q && Q.sess.steps[Q.sess.i]; }
function progress() {
  const s = Q.sess;
  let pct;
  if (s.kind === 'lesson') { const u = L.lessonUnits(s); pct = u.total ? u.done / u.total : 0; }
  else pct = s.steps.length ? s.i / s.steps.length : 0;
  $('qbarFill').style.width = Math.round(pct * 100) + '%';
  document.querySelector('.qbar').setAttribute('aria-valuenow', Math.round(pct * 100));
  const combo = s.stat.combo, el = $('combo');
  el.hidden = combo < 3;
  el.innerHTML = `${I.flame}${combo}`;
}
function tagHTML(st) {
  if (Q.sess.kind === 'test') return `<span class="qtag test">${esc(Q.sess.spec.label || '테스트')} · ${Q.sess.i + 1}/${Q.sess.steps.length}</span>`;
  if (st.r) return '<span class="qtag again">다시 풀기</span>';
  if (st.k === 'learn') return '<span class="qtag">새 단어</span>';
  if (st.nw) return '<span class="qtag">새 단어 확인</span>';
  return '<span class="qtag rev">복습</span>';
}
function wordHead(e) { return charBubble(`<div class="qword"><span class="w ${e.w.length > 13 ? 'long' : ''}" lang="en">${esc(e.w)}</span><button class="say" type="button" data-act="say" data-id="${e.id}" aria-label="발음 듣기">${I.speaker}</button></div>`); }
function renderStep() {
  const s = Q.sess;
  clearTimeout(Q.autoT);
  Q.locked = false; Q.hint = 0; Q.hinted = false;
  hideFb();
  if (s.i >= s.steps.length) { finish(); return; }
  const st = curStep();
  if (!W.byId.has(st.id)) { s.steps.splice(s.i, 1); save(); renderStep(); return; }
  if (st.k === 'q' && !st.q) { st.q = L.makeQuestion(W, st.id, st.qt, Voice.available()); save(); }
  progress();
  const e = W.byId.get(st.id), body = $('qbody'), foot = $('qfoot');
  const q = st.q, say = state.settings.say;
  if (st.k === 'learn') {
    body.innerHTML = `${tagHTML(st)}<div class="lcard"><div class="idx"><span class="hole"></span><span>DAY ${pad2(e.d)}</span><span>·</span><span>No. ${e.n}</span></div>
      <div class="lword"><span class="w" lang="en">${esc(e.w)}</span><button class="say" type="button" data-act="say" data-id="${e.id}" aria-label="발음 듣기">${I.speaker}</button></div>
      ${sensesHTML(e)}${extrasHTML(e)}</div>`;
    foot.innerHTML = `<button class="btn" type="button" data-act="next">알겠어요</button>`;
    if (say) Voice.play(e.id);
    return;
  }
  if (q.t === 'card') { renderCardStep(st, e); return; }
  const optsHTML = (en) => `<div class="opts" role="group">${q.opts.map((o, i) => `<button class="opt ${en ? 'en' : ''}" type="button" data-act="pick" data-i="${i}" ${en ? 'lang="en"' : ''}><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
  if (q.t === 'mcq-ko') {
    body.innerHTML = `${tagHTML(st)}<p class="qprompt">이 단어의 뜻은?</p>${wordHead(e)}${optsHTML(false)}`;
    if (say) Voice.play(e.id);
  } else if (q.t === 'mcq-en') {
    const sense = e.senses[q.si];
    body.innerHTML = `${tagHTML(st)}<p class="qprompt">이 뜻의 영어 단어는?</p>${charBubble(`<p class="qmean">${esc(sense.ko)}</p>`)}${optsHTML(true)}`;
  } else if (q.t === 'syn') {
    body.innerHTML = `${tagHTML(st)}<p class="qprompt">뜻이 가장 가까운 단어는?</p>${wordHead(e)}${optsHTML(true)}`;
    if (say) Voice.play(e.id);
  } else if (q.t === 'listen') {
    body.innerHTML = `${tagHTML(st)}<p class="qprompt">듣고 뜻을 고르세요</p>${charBubble(`<div style="display:flex;justify-content:center;padding:4px 0 6px"><button class="say big" type="button" data-act="say" data-id="${e.id}" aria-label="다시 듣기">${I.speaker}</button></div>`)}${optsHTML(false)}`;
    setTimeout(() => { if (curStep() === st) Voice.play(e.id); }, 250);
  } else if (q.t === 'spell') {
    const sense = e.senses[q.si], letters = e.w.replace(/[^a-zA-Z]/g, '').length;
    const slots = e.w.split('').map(c => /[a-z]/i.test(c) ? '_' : c === ' ' ? ' ' : c).join(' ');
    body.innerHTML = `${tagHTML(st)}<p class="qprompt">뜻을 보고 영어로 쓰세요</p>${charBubble(`<p class="qmean">${esc(sense.ko)}</p>`)}
      <div class="spell"><input id="spellIn" type="text" inputmode="latin" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" placeholder="${letters}글자" aria-label="영어 단어 입력"><p class="slots" id="slots" aria-hidden="true">${esc(slots)}</p><p class="qhint" id="spellHint" hidden></p></div>`;
    foot.innerHTML = `<div class="row"><button class="btn alt" type="button" data-act="hint" style="flex:0 0 38%">힌트</button><button class="btn" type="button" data-act="spellGo">확인</button></div>`;
    setTimeout(() => { const i = $('spellIn'); if (i) i.focus(); }, 60);
    return;
  }
  foot.innerHTML = '';
}
function pick(i) {
  if (Q.locked) return;
  const st = curStep(), q = st.q, ok = i === q.a;
  Q.locked = true;
  const btns = [...document.querySelectorAll('#qbody .opt')];
  btns.forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); else b.classList.add('dim'); });
  resolve(ok, st);
}
function spellGo() {
  if (Q.locked) return;
  const inp = $('spellIn'); if (!inp) return;
  if (!inp.value.trim()) { inp.focus(); return; }
  const st = curStep(), e = W.byId.get(st.id), spelled = L.checkSpell(e, inp.value), ok = spelled && Q.hint < 2;
  Q.hinted = spelled && !ok;
  Q.locked = true;
  inp.classList.add(ok ? 'right' : 'wrong');
  inp.readOnly = true;
  inp.blur();
  resolve(ok, st);
}
function hint() {
  const st = curStep(), e = W.byId.get(st.id), h = $('spellHint'), slots = $('slots');
  Q.hint++;
  if (Q.hint === 1) { h.hidden = false; h.textContent = '동의어: ' + (e.senses[st.q.si].en || e.senses[0].en); }
  else {
    let shown = 0;
    const need = Q.hint - 1;
    slots.textContent = e.w.split('').map(c => /[a-z]/i.test(c) ? (shown++ < need ? c : '_') : c === ' ' ? ' ' : c).join(' ');
  }
}
const PRAISE = ['정답이에요!', '좋아요!', '완벽해요!', '잘했어요!', '훌륭해요!'];
function resolve(ok, st) {
  const s = Q.sess;
  const res = s.kind === 'lesson' ? L.answerLesson(state, s, ok) : L.answerTest(state, s, ok);
  save();
  Sound.sfx(ok ? 'right' : 'wrong');
  vibrate(ok ? 12 : [35, 45, 35]);
  if (ok && res.combo >= 5 && res.combo % 5 === 0) { setTimeout(() => Sound.sfx('combo'), 260); const c = $('combo'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
  progress();
  const face = document.querySelector('#qbody .mascot');
  if (face) { face.dataset.mood = ok ? 'happy' : 'sad'; face.classList.remove('hop', 'shake'); void face.getBoundingClientRect(); face.classList.add(ok ? 'hop' : 'shake'); }
  showFb(ok, st, res);
}
function showFb(ok, st, res) {
  const e = W.byId.get(st.id), q = st.q;
  const combo = res.combo >= 3 && ok ? ` <span style="font-size:15px;font-weight:700">${res.combo}연속!</span>` : '';
  const head = `<div class="hd"><i>${ok ? I.check : I.x}</i><span>${ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : Q.hinted ? '맞았지만 힌트를 썼어요' : '아쉬워요'}${combo}</span>${res.xp ? `<span class="xp">${I.bolt}+${res.xp} XP</span>` : ''}</div>`;
  let ans = '';
  if (!ok || q.t === 'listen' || q.t === 'spell') {
    const right = q.t === 'mcq-ko' || q.t === 'listen' ? e.senses[q.si].ko : q.t === 'syn' ? q.opts[q.a] : e.w;
    ans = `<div class="ans">${!ok && q.t !== 'spell' && q.t !== 'card' ? `<div>정답: <b>${esc(right)}</b></div>` : ''}<div><span class="w" lang="en">${esc(e.w)}</span> <span class="m">${esc(meaningLine(e))}</span></div></div>`;
  }
  $('fbIn').innerHTML = head + ans + `<button class="btn ${ok ? '' : 'bad'}" type="button" data-act="cont">계속</button>`;
  const fb = $('fb');
  fb.classList.toggle('bad', !ok);
  fb.classList.add('show');
  $('qfoot').innerHTML = '';
  if ((!ok || q.t === 'listen' || q.t === 'spell' || q.t === 'mcq-en') && state.settings.say) Voice.play(e.id);
  if (ok) Q.autoT = setTimeout(cont, q.t === 'spell' || q.t === 'listen' || q.t === 'mcq-en' ? 1500 : 1000);
}
function hideFb() { const fb = $('fb'); if (fb) fb.classList.remove('show', 'bad'); }
function cont() { if (!Q) return; clearTimeout(Q.autoT); Sound.sfx('next'); renderStep(); }
function nextLearn() { const s = Q.sess; if (s.kind === 'lesson') L.answerLesson(state, s, true); else s.i++; save(); Sound.sfx('next'); renderStep(); }
async function quitRun() {
  if (!Q) { go('home'); return; }
  clearTimeout(Q.autoT);
  if (Q.sess.i >= Q.sess.steps.length) { finish(); return; }
  pauseTimers();
  const ok = (await sheet(`${mascot('sad')}<h3>벌써 그만할까요?</h3><p>지금까지 한 건 저장돼요. 다음에 그 문제부터 이어서 할 수 있어요.</p><button class="btn" type="button" data-act="sheet" data-v="0">계속하기</button><button class="btn alt" type="button" data-act="sheet" data-v="1" style="color:var(--red-ink)">그만하기</button>`)) === '1';
  if (!Q) return;
  if (!ok) { if ($('fb').classList.contains('show') && !$('fb').classList.contains('bad')) cont(); return; }
  Voice.stop();
  save(); flush();
  const kind = Q.sess.kind;
  Q = null;
  go(kind === 'test' ? 'test' : 'home');
}
function finish() {
  const s = Q.sess;
  pauseTimers();
  hideFb();
  if (s.kind === 'lesson') {
    const r = L.finishLesson(state, W, s);
    state.lesson = null;
    save(); flush();
    renderLessonResult(s, r);
  } else {
    const r = L.finishTest(state, s);
    state.test = null;
    save(); flush();
    renderTestResult(s, r);
  }
  Q = null;
  show('result');
  Sound.sfx('complete');
  setTimeout(confetti, 120);
}
function renderLessonResult(s, r) {
  const T = s.T, streak = L.streak(state, T), ds = state.days[L.dayKey(T)] || { xp: 0 };
  const acc = s.stat.firstN ? Math.round(s.stat.firstOk / s.stat.firstN * 100) : 100;
  const learned = s.newIds.filter(id => s.done[id]).length, failed = Object.keys(s.failed);
  const plan = r.plan, goal = state.settings.goal, met = L.dayMet(state, L.dayKey(T));
  $('s-result').innerHTML = `<div class="wrap result">
    ${mascot('happy', 'hop')}
    <h1>${plan.rev + plan.newLeft ? '학습 완료!' : '오늘의 학습 완료!'}</h1>
    <p class="muted">${learned ? `새 단어 ${learned}개를 익혔어요` : '복습을 마쳤어요'}${s.revIds.length ? ` · 복습 ${s.revIds.length}개` : ''}</p>
    <div class="rstats">
      <div class="rs gold"><small>획득 XP</small><b>${I.bolt}<span id="rxp">0</span></b></div>
      <div class="rs green"><small>정확도</small><b>${acc}%</b></div>
      <div class="rs blue"><small>시간</small><b>${mmss(s.stat.ms)}</b></div>
    </div>
    <div class="streakbig">${streak ? I.flame : I.flameOff}<span><b>${streak ? streak + '일 연속 학습!' : '오늘 목표까지 조금 남았어요'}</b><small>오늘 ${fmt(ds.xp)} / ${goal} XP${ds.xp >= goal ? ' · 목표 달성' : met ? ' · 오늘 카드 완료' : ''}</small></span></div>
    ${failed.length ? `<div class="sec" style="width:100%"><h2>다시 본 단어</h2><span>${failed.length}개</span></div><ul class="panel wlist">${failed.map(id => rowHTML(W.byId.get(id))).join('')}</ul>` : ''}
    <button class="btn" type="button" data-act="tab" data-tab="home">계속</button>
    ${plan.rev ? `<button class="btn alt" type="button" data-act="lessonMore">남은 복습 ${plan.rev}개 하기</button>` : ''}
    ${failed.length ? `<button class="btn alt" type="button" data-act="browseIds" data-ids="${failed.join(',')}" data-label="다시 본 단어">다시 본 단어 카드로 보기</button>` : ''}
    <button class="btn alt" type="button" data-act="lessonExtra">새 단어 ${state.settings.daily}개 더</button>
  </div>`;
  countUp($('rxp'), s.stat.xp);
}
function renderTestResult(X, r) {
  const n = X.stat.n, ok = X.stat.ok, pct = n ? Math.round(ok / n * 100) : 0;
  const title = pct >= 90 ? '훌륭해요!' : pct >= 70 ? '잘했어요!' : pct >= 50 ? '조금만 더!' : '다시 도전해 봐요';
  $('s-result').innerHTML = `<div class="wrap result">
    ${mascot(pct >= 70 ? 'happy' : pct >= 40 ? 'idle' : 'sad', pct >= 70 ? 'hop' : '')}
    <div class="score">${ring(150, 14, [{ v: pct / 100, c: pct >= 70 ? 'var(--green)' : 'var(--gold)' }])}<div class="v"><span><b>${pct}%</b><small>${ok} / ${n} 정답</small></span></div></div>
    <h1>${title}</h1>
    <p class="muted">${esc(X.spec.label || '테스트')}</p>
    <div class="rstats">
      <div class="rs gold"><small>획득 XP</small><b>${I.bolt}<span id="rxp">0</span></b></div>
      <div class="rs green"><small>최고 콤보</small><b>${X.stat.maxCombo}</b></div>
      <div class="rs blue"><small>시간</small><b>${mmss(X.stat.ms)}</b></div>
    </div>
    ${r.wrongIds.length ? `<div class="sec" style="width:100%"><h2>틀린 단어</h2><span>${r.wrongIds.length}개 · 오답노트에 담았어요${r.wrongIds.filter(id => state.prog[id]).length ? ' · 배운 단어는 내일 복습' : ''}</span></div><ul class="panel wlist">${r.wrongIds.map(id => rowHTML(W.byId.get(id))).join('')}</ul>
      <button class="btn" type="button" data-act="retryWrong" data-ids="${r.wrongIds.join(',')}">${I.retry}틀린 문제 다시 풀기</button>` : ''}
    <button class="btn ${r.wrongIds.length ? 'alt' : ''}" type="button" data-act="tab" data-tab="test">테스트 목록으로</button>
  </div>`;
  countUp($('rxp'), X.stat.xp);
}

/* ---------- self-graded cards (review mode "카드") ---------- */
let drag = null, flipped = false, busy = false;
function faceFront(e) {
  const idx = `<div class="idx"><span class="hole"></span><span>DAY ${pad2(e.d)}</span><span>·</span><span>No. ${e.n}</span></div>`;
  const say = `<button class="say" type="button" data-act="say" data-id="${e.id}" aria-label="발음 듣기">${I.speaker}</button>`;
  if (state.settings.front === 'ko') return idx + `<div class="fk">${e.senses.map((s, i) => `<p>${e.senses.length > 1 ? `<small class="mono" style="display:block;font-size:12px;color:var(--green)">${i + 1}</small>` : ''}${esc(s.ko || s.en)}</p>`).join('')}</div><p class="hint">탭해서 단어 보기</p>`;
  return idx + say + `<div class="fw ${e.w.length > 13 ? 'long' : ''}" lang="en">${esc(e.w)}</div><p class="hint">탭해서 뜻 보기</p>`;
}
function faceBack(e) {
  return `<div class="idx"><span class="hole"></span><span>DAY ${pad2(e.d)}</span><span>·</span><span>No. ${e.n}</span></div><button class="say" type="button" data-act="say" data-id="${e.id}" aria-label="발음 듣기">${I.speaker}</button>
    <div class="lword" style="padding-right:48px"><span class="w" lang="en">${esc(e.w)}</span></div>${sensesHTML(e)}${extrasHTML(e)}`;
}
function stageHTML(e, n) {
  return `<div class="stage" id="stage">${n > 1 ? '<div class="deck d2"></div>' : ''}${n > 0 ? '<div class="deck d1"></div>' : ''}
    <div class="drag" id="drag"><div class="card3d" id="card" tabindex="0" role="button" aria-label="카드 뒤집기"><div class="face front">${faceFront(e)}</div><div class="face back">${faceBack(e)}</div></div>
    <div class="stamp s-know" id="stampK">${Q ? '알아요' : '이전'}</div><div class="stamp s-dont" id="stampD">${Q ? '몰라요' : '다음'}</div></div></div>`;
}
function renderCardStep(st, e) {
  flipped = false;
  $('qbody').innerHTML = tagHTML(st) + stageHTML(e, Q.sess.steps.length - Q.sess.i - 1);
  $('qfoot').innerHTML = `<div class="row"><button class="btn bad" type="button" data-act="cardDont">몰라요</button><button class="btn" type="button" data-act="cardKnow">알아요</button></div>`;
  bindDrag((dir) => cardAnswer(dir > 0));
  if (state.settings.say && state.settings.front !== 'ko') Voice.play(e.id);
}
function cardAnswer(known) {
  if (Q.locked) return;
  Q.locked = true;
  const st = curStep();
  flyOut(known ? 1 : -1, () => resolve(known, st));
}
function flip() {
  const c = $('card'); if (!c || busy) return;
  flipped = !flipped;
  c.classList.toggle('flipped', flipped);
  Sound.sfx('flip');
  if (flipped && state.settings.front === 'ko' && state.settings.say) { const el = c.querySelector('[data-id]'); if (el) Voice.play(el.dataset.id); }
}
function flyOut(dir, done) {
  const d = $('drag');
  if (!d || reduced()) { done(); return; }
  busy = true;
  (dir > 0 ? $('stampK') : $('stampD')).style.opacity = 1;
  d.style.transition = 'transform .24s ease-in, opacity .24s ease-in';
  d.style.transform = `translateX(${dir * 125}%) rotate(${dir * 14}deg)`;
  d.style.opacity = '0';
  setTimeout(() => { busy = false; done(); }, 230);
}
function bindDrag(onSwipe) {
  const el = $('drag');
  if (!el) return;
  el.addEventListener('pointerdown', ev => {
    if (busy || (ev.button && ev.button > 0) || ev.target.closest('[data-act]')) return;
    drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, dx: 0, t: performance.now(), moved: false };
  });
  el.addEventListener('pointermove', ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      drag.moved = true;
      try { el.setPointerCapture(ev.pointerId); } catch (e) {}
    }
    drag.dx = dx;
    el.style.transition = 'none';
    el.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    $('stampK').style.opacity = clamp(dx / 90, 0, 1);
    $('stampD').style.opacity = clamp(-dx / 90, 0, 1);
  });
  const end = ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moved) { if (ev.type === 'pointerup') flip(); return; }
    const v = Math.abs(d.dx) / Math.max(1, performance.now() - d.t);
    if (Math.abs(d.dx) > 90 || (Math.abs(d.dx) > 40 && v > 0.55)) onSwipe(d.dx > 0 ? 1 : -1);
    else { el.style.transition = 'transform .2s'; el.style.transform = ''; $('stampK').style.opacity = 0; $('stampD').style.opacity = 0; }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

/* ---------- browse (flip through cards) ---------- */
let B = null;
function startBrowse(ids, label, key) {
  if (!ids.length) { toast('볼 단어가 없어요'); return; }
  const at = key && state.spots[key] ? clamp(state.spots[key], 0, ids.length - 1) : 0;
  B = { ids: ids.slice(), order: ids.slice(), i: at, label, key, shuffled: false, from: screen };
  Voice.preload(ids);
  show('browse');
  renderBrowse(0);
}
function renderBrowse(dir) {
  const id = B.ids[B.i], e = W.byId.get(id);
  flipped = false;
  $('s-browse').innerHTML = `<div class="wrap">
    <div class="topbar"><button class="ibtn" type="button" data-act="browseClose" aria-label="닫기">${I.close}</button>
      <div style="text-align:center"><b style="font-size:15px">${esc(B.label)}</b><div class="pos">${B.i + 1} / ${B.ids.length}</div></div>
      <button class="ibtn" type="button" data-act="browseShuffle" aria-label="섞기" aria-pressed="${B.shuffled}" style="${B.shuffled ? 'color:var(--green)' : ''}">${I.shuffle}</button></div>
    ${stageHTML(e, Math.min(2, B.ids.length - B.i - 1))}
    <div class="navrow">
      <button class="ibtn" type="button" data-act="browsePrev" aria-label="이전" ${B.i === 0 ? 'disabled style="opacity:.4"' : ''}>${I.left}</button>
      <button class="ibtn ${state.stars[id] ? 'on' : ''}" type="button" data-act="star" data-id="${id}" aria-label="즐겨찾기" aria-pressed="${!!state.stars[id]}">${I.star}</button>
      <button class="ibtn" type="button" data-act="say" data-id="${id}" aria-label="발음 듣기">${I.speaker}</button>
      <button class="ibtn" type="button" data-act="browseNext" aria-label="다음">${I.right}</button>
    </div>
    <input type="range" id="browseRange" min="1" max="${B.ids.length}" value="${B.i + 1}" aria-label="위치">
    <p class="hint">카드를 탭하면 뒤집히고, 옆으로 밀면 넘어가요</p>
  </div>`;
  const st = $('s-browse').querySelector('.star');
  if (st && state.stars[id]) st.classList.add('on');
  bindDrag(d => { if (d < 0) browseMove(1, true); else browseMove(-1, true); });
  $('browseRange').addEventListener('input', ev => { B.i = Number(ev.target.value) - 1; saveSpot(); renderBrowse(0); });
  if (dir && !reduced()) { const dg = $('drag'); dg.style.transition = 'none'; dg.style.transform = `translateX(${dir * 40}px)`; dg.style.opacity = '0'; void dg.offsetWidth; dg.style.transition = 'transform .22s ease-out, opacity .18s'; dg.style.transform = ''; dg.style.opacity = '1'; }
  if (state.settings.say && state.settings.front !== 'ko') Voice.play(id);
}
function saveSpot() { if (B.key && !B.shuffled) { state.spots[B.key] = B.i; save(); } }
function browseMove(step, swiped) {
  const ni = B.i + step;
  if (ni < 0) return;
  if (ni >= B.ids.length) { toast('마지막 카드예요'); if (swiped) renderBrowse(0); return; }
  const go2 = () => { B.i = ni; saveSpot(); renderBrowse(step > 0 ? 1 : -1); Sound.sfx('flip'); };
  if (swiped) flyOut(step > 0 ? -1 : 1, go2); else go2();
}

/* ---------- auto play (listen mode) ---------- */
let A = null, wake = null;
function startAuto(ids, label, key) {
  if (!ids.length) { toast('들을 단어가 없어요'); return; }
  const at = key && state.spots['a:' + key] ? clamp(state.spots['a:' + key], 0, ids.length - 1) : 0;
  A = { ids, i: at, label, key, playing: false, token: 0, reveal: false, from: screen };
  Voice.preload(ids);
  show('auto');
  renderAuto();
  autoPlay(true);
}
function renderAuto() {
  const e = W.byId.get(A.ids[A.i]), st = state.settings;
  $('s-auto').innerHTML = `<div class="wrap">
    <div class="topbar"><button class="ibtn" type="button" data-act="autoClose" aria-label="닫기">${I.close}</button>
      <div style="text-align:center"><b style="font-size:15px">듣기 · ${esc(A.label)}</b><div class="pos">${A.i + 1} / ${A.ids.length}</div></div><span style="width:42px"></span></div>
    <div class="lcard" style="min-height:44vh;justify-content:center;text-align:center;align-items:center;gap:18px">
      <div class="idx"><span class="hole"></span><span>DAY ${pad2(e.d)}</span><span>·</span><span>No. ${e.n}</span></div>
      <div class="w serif" lang="en" style="font-size:clamp(34px,10vw,50px);font-weight:600;line-height:1.1">${esc(e.w)}</div>
      <div id="autoMean" style="${A.reveal ? '' : 'visibility:hidden'}">${e.senses.map((s, i) => `<p class="ko" style="margin-bottom:4px">${e.senses.length > 1 ? CIRC[i] + ' ' : ''}${esc(s.ko || s.en)}</p>`).join('')}<p class="en" lang="en">${esc(e.senses.map(s => s.en).filter(Boolean).join(' / '))}</p></div>
    </div>
    <div class="navrow" style="justify-content:center;gap:18px">
      <button class="ibtn" type="button" data-act="autoPrev" aria-label="이전">${I.prev}</button>
      <button class="ibtn" type="button" data-act="autoToggle" aria-label="${A.playing ? '일시정지' : '재생'}" style="width:74px;height:74px;border-radius:24px;background:var(--green);color:var(--accent-ink);box-shadow:0 4px 0 var(--green-deep);border:0">${A.playing ? I.pause : I.play}</button>
      <button class="ibtn" type="button" data-act="autoNext" aria-label="다음">${I.next}</button>
    </div>
    <div class="panel set">
      <div class="sr"><div class="t"><b>반복</b><span class="d">단어를 몇 번 읽을지</span></div><div class="seg">${[1, 2, 3].map(n => `<button type="button" data-act="autoRepeat" data-v="${n}" aria-pressed="${st.repeat === n}">${n}번</button>`).join('')}</div></div>
      <div class="sr"><div class="t"><b>한국어 뜻 읽기</b><span class="d">기기 음성으로 뜻도 읽어요</span></div><label class="switch"><input type="checkbox" data-set="koSay" ${st.koSay ? 'checked' : ''} aria-label="한국어 뜻 읽기"><i></i></label></div>
    </div>
    <p class="hint">화면이 켜져 있는 동안 계속 재생돼요</p>
  </div>`;
}
async function autoPlay(start) {
  if (!A) return;
  if (start) { A.playing = true; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
  const tok = ++A.token;
  renderAuto();
  while (A && A.playing && tok === A.token) {
    const e = W.byId.get(A.ids[A.i]);
    A.reveal = false; renderAuto();
    for (let r = 0; r < state.settings.repeat; r++) { if (!A || tok !== A.token) return; await Voice.play(e.id); await sleep(450); }
    if (!A || tok !== A.token) return;
    A.reveal = true; const m = $('autoMean'); if (m) m.style.visibility = 'visible';
    if (state.settings.koSay) await tts(e.senses.map(s => s.ko).filter(Boolean).join(', '), 'ko-KR');
    await sleep(1300);
    if (!A || tok !== A.token) return;
    if (A.i >= A.ids.length - 1) { A.playing = false; renderAuto(); toast('끝까지 들었어요'); releaseWake(); return; }
    A.i++;
    if (A.key) { state.spots['a:' + A.key] = A.i; save(); }
  }
}
function autoStop() { if (A) { A.playing = false; A.token++; } Voice.stop(); releaseWake(); }
function releaseWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }

/* ---------- words tab ---------- */
let wq = '';
function renderWords() {
  const stars = W.words.filter(e => state.stars[e.id]).length, wrong = W.words.filter(e => state.wrong[e.id]).length;
  const dayRows = W.days.map(d => {
    const ws = W.byDay.get(d);
    let m = 0, l = 0;
    for (const e of ws) { const p = state.prog[e.id]; if (p) { if (p[0] >= L.MASTER) m++; else l++; } }
    return `<button class="li" type="button" data-act="day" data-day="${d}"><span class="dnum ${m + l === ws.length ? 'full' : m + l ? '' : 'todo'}" style="--uc:${unitOf(d)[0]};--ud:${unitOf(d)[1]}">${pad2(d)}</span><span class="t"><b>Day ${pad2(d)}</b><small>${ws.length}단어 · 학습 ${m + l} · 완료 ${m}</small></span><span class="mb"><i class="m" style="width:${m / ws.length * 100}%"></i><i class="l" style="width:${l / ws.length * 100}%"></i></span>${I.chev.replace('<svg', '<svg class="go"')}</button>`;
  }).join('');
  $('s-words').innerHTML = `<div class="wrap">
    <div class="topbar"><h1>단어장</h1><button class="ibtn" type="button" data-act="settings" aria-label="설정">${I.gear}</button></div>
    <label class="search">${I.search}<input type="search" id="wq" placeholder="단어나 뜻으로 검색" autocomplete="off" value="${esc(wq)}" aria-label="단어 검색"></label>
    <div id="wbody"></div>
  </div>`;
  const body = () => {
    if (wq) {
      const q = wq.toLowerCase();
      const hits = W.words.filter(e => e.key.includes(q) || e.senses.some(s => s.en.toLowerCase().includes(q) || s.ko.includes(wq))).slice(0, 200);
      $('wbody').innerHTML = hits.length ? `<p class="muted" style="font-size:13px;margin:0 4px 8px">검색 결과 ${hits.length}개</p><ul class="panel wlist">${hits.map(e => rowHTML(e, { showDay: true })).join('')}</ul>` : '<div class="empty">찾는 단어가 없어요</div>';
    } else {
      $('wbody').innerHTML = `<div class="panel list" style="margin-bottom:16px">
        <button class="li" type="button" data-act="starList"><span class="ic i-gold">${I.star}</span><span class="t"><b>즐겨찾기</b><small>${stars}단어</small></span>${I.chev.replace('<svg', '<svg class="go"')}</button>
        <button class="li" type="button" data-act="wrongList"><span class="ic i-red">${I.note}</span><span class="t"><b>오답노트</b><small>${wrong}단어 · 틀린 횟수 순</small></span>${I.chev.replace('<svg', '<svg class="go"')}</button>
      </div><div class="panel list">${dayRows}</div>`;
    }
  };
  body();
  let t = 0;
  $('wq').addEventListener('input', ev => { clearTimeout(t); t = setTimeout(() => { wq = ev.target.value.trim(); body(); }, 140); });
}
let dayView = null;
function listFor(v) {
  if (v.t === 'day') return W.byDay.get(v.d) || [];
  if (v.t === 'stars') return W.words.filter(e => state.stars[e.id]);
  if (v.t === 'wrong') return L.rangeIds(state, W, { t: 'wrong' }, today()).map(id => W.byId.get(id));
  return [];
}
function renderDay(v) {
  if (v) dayView = v;
  v = dayView;
  const list = listFor(v), title = v.t === 'day' ? 'Day ' + pad2(v.d) : v.t === 'stars' ? '즐겨찾기' : '오답노트';
  let m = 0, l = 0;
  for (const e of list) { const p = state.prog[e.id]; if (p) { if (p[0] >= L.MASTER) m++; else l++; } }
  $('s-day').innerHTML = `<div class="wrap">
    <div class="topbar"><button class="ibtn" type="button" data-act="back" aria-label="뒤로">${I.back}</button><h1 style="flex:1">${title}</h1></div>
    <p class="muted" style="margin:-8px 4px 0;font-size:13.5px">${list.length}단어 · 학습 ${m + l} · 암기 완료 ${m}</p>
    ${list.length ? `<div class="actions">
      <button class="act" type="button" data-act="listBrowse"><i class="i-green">${I.cards}</i>카드로 보기</button>
      <button class="act" type="button" data-act="listAuto"><i class="i-blue">${I.headphones}</i>듣기</button>
      <button class="act" type="button" data-act="listTest"><i class="i-gold">${I.quiz}</i>테스트</button>
    </div>
    <ul class="panel wlist">${list.map(e => rowHTML(e, { showDay: v.t !== 'day', wrong: v.t === 'wrong' })).join('')}</ul>` :
    `<div class="empty">${mascot('sleep', 'float')}${v.t === 'stars' ? '단어 옆 ☆를 누르면 여기에 모여요' : '틀린 단어가 여기에 모여요. 아직 하나도 없어요!'}</div>`}
  </div>`;
}
function listKey(v) { return v.t === 'day' ? 'd' + v.d : v.t; }

/* ---------- test tab ---------- */
let TB = null;
function tbDefaults() {
  const learnedDays = W.days.filter(d => W.byDay.get(d).some(e => state.prog[e.id]));
  return Object.assign({ range: 'days', days: learnedDays.length ? [learnedDays[learnedDays.length - 1]] : [W.days[0]], qt: 'mix', count: 20 }, state.tb || {});
}
function tbIds() {
  const r = TB.range === 'days' ? { t: 'days', days: TB.days } : { t: TB.range };
  return L.rangeIds(state, W, r, today());
}
const QT = [['mix', '섞어서'], ['mcq-ko', '뜻 고르기'], ['mcq-en', '단어 고르기'], ['syn', '동의어'], ['listen', '듣기'], ['spell', '스펠링']];
function renderTest() {
  if (!Q) settleSessions();
  TB = TB || tbDefaults();
  const ids = tbIds(), n = TB.count ? Math.min(TB.count, ids.length) : ids.length;
  const stars = W.words.filter(e => state.stars[e.id]).length, wrong = W.words.filter(e => state.wrong[e.id]).length, learned = Object.keys(state.prog).length;
  const X = state.test && state.test.i < state.test.steps.length ? state.test : null;
  const hist = state.tests.slice(0, 12).map((t, i) => {
    const pct = t.n ? Math.round(t.ok / t.n * 100) : 0;
    return `<div class="li"><span class="ic ${pct >= 70 ? 'i-green' : 'i-gold'}">${I.quiz}</span><span class="t"><b>${esc(t.label || '테스트')}</b><small>${new Date(t.at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · ${t.ok}/${t.n} · ${mmss(t.ms || 0)}</small></span><span class="sc">${pct}%</span></div>`;
  }).join('');
  $('s-test').innerHTML = `<div class="wrap">
    <div class="topbar"><h1>테스트</h1><button class="ibtn" type="button" data-act="settings" aria-label="설정">${I.gear}</button></div>
    ${X ? `<div class="banner green">${I.quiz}<span style="flex:1"><b>푸는 중인 시험이 있어요</b><br>${esc(X.spec.label || '테스트')} · ${X.i}/${X.steps.length}</span><button class="btn sm" type="button" data-act="testResume">이어서</button></div>` : ''}
    <div class="panel set">
      <div class="sr"><div class="t"><b>범위</b></div></div>
      <div style="padding:0 16px 14px" class="chips">
        <button class="chip" type="button" data-act="tbRange" data-v="days" aria-pressed="${TB.range === 'days'}">Day 고르기</button>
        <button class="chip" type="button" data-act="tbRange" data-v="stars" aria-pressed="${TB.range === 'stars'}">${I.star}즐겨찾기 ${stars}</button>
        <button class="chip" type="button" data-act="tbRange" data-v="wrong" aria-pressed="${TB.range === 'wrong'}">${I.note}오답노트 ${wrong}</button>
        <button class="chip" type="button" data-act="tbRange" data-v="learned" aria-pressed="${TB.range === 'learned'}">학습한 단어 ${learned}</button>
      </div>
      ${TB.range === 'days' ? `<div style="padding:0 16px 14px"><div class="chips">${W.days.map(d => `<button class="chip mono" type="button" data-act="tbDay" data-v="${d}" aria-pressed="${TB.days.includes(d)}">${pad2(d)}</button>`).join('')}</div>
        <div style="display:flex;gap:8px;margin-top:10px"><button class="chip" type="button" data-act="tbAll">전체 선택</button><button class="chip" type="button" data-act="tbNone">선택 해제</button></div></div>` : ''}
      <div class="sr"><div class="t"><b>문제 유형</b></div></div>
      <div style="padding:0 16px 14px;margin-top:-6px" class="chips">${QT.map(([v, t]) => `<button class="chip" type="button" data-act="tbQt" data-v="${v}" aria-pressed="${TB.qt === v}">${t}</button>`).join('')}</div>
      <div class="sr"><div class="t"><b>문항 수</b></div><div class="seg">${[10, 20, 30, 0].map(c => `<button type="button" data-act="tbCount" data-v="${c}" aria-pressed="${TB.count === c}">${c || '전체'}</button>`).join('')}</div></div>
    </div>
    <button class="btn" type="button" data-act="testStart" ${n ? '' : 'disabled'}>${I.play}시험 시작 · ${n}문제</button>
    <div class="sec"><h2>최근 시험</h2><span>${state.tests.length}회</span></div>
    ${hist ? `<div class="panel list tests">${hist}</div>` : '<div class="empty">아직 본 시험이 없어요</div>'}
  </div>`;
}
function tbLabel() {
  if (TB.range === 'days') { const ds = TB.days.slice().sort((a, b) => a - b); return ds.length === 1 ? 'Day ' + pad2(ds[0]) : ds.length <= 3 ? ds.map(d => 'Day ' + pad2(d)).join(', ') : `Day ${ds.length}개`; }
  return TB.range === 'stars' ? '즐겨찾기' : TB.range === 'wrong' ? '오답노트' : '학습한 단어';
}

/* ---------- stats ---------- */
function renderStats() {
  const T = today(), s = state, goal = s.settings.goal, streak = L.streak(s, T);
  const all = Object.values(s.prog), master = all.filter(p => p[0] >= L.MASTER).length;
  const todayXp = (s.days[L.dayKey(T)] || {}).xp || 0;
  const weeks = 12, startT = T - (T + 4) % 7 - (weeks - 1) * 7;
  let heat = '';
  for (let t = startT; t < startT + weeks * 7; t++) {
    const d = s.days[L.dayKey(t)], xp = d ? d.xp || 0 : 0;
    const lvl = t > T ? '' : xp >= goal ? 'l3' : xp >= goal / 2 ? 'l2' : xp > 0 ? 'l1' : '';
    heat += `<i class="${lvl}${t === T ? ' today' : ''}" title="${L.dayKey(t)} · ${xp} XP" style="${t > T ? 'opacity:.35' : ''}"></i>`;
  }
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  const last7 = []; for (let t = T - 6; t <= T; t++) last7.push([t, ((s.days[L.dayKey(t)] || {}).xp) || 0]);
  const maxXp = Math.max(goal, ...last7.map(x => x[1]));
  const bars = last7.map(([t, xp]) => `<div class="bar7"><b>${xp || ''}</b><i class="${xp ? '' : 'zero'}" style="height:${Math.max(3, xp / maxXp * 100)}%;${xp && xp < goal ? 'background:var(--gold-soft);box-shadow:inset 0 0 0 2px var(--gold)' : ''}"></i><small>${t === T ? '오늘' : labels[new Date(t * 864e5).getUTCDay()]}</small></div>`).join('');
  let ok = 0, tot = 0;
  for (let t = T - 29; t <= T; t++) { const d = s.days[L.dayKey(t)]; if (d) { ok += d.ok || 0; tot += d.t || 0; } }
  const dbars = W.days.map(d => {
    const ws = W.byDay.get(d); let m = 0, l = 0;
    for (const e of ws) { const p = s.prog[e.id]; if (p) { if (p[0] >= L.MASTER) m++; else l++; } }
    return `<div class="dbar"><span>D${pad2(d)}</span><span class="mb"><i class="m" style="width:${m / ws.length * 100}%;background:var(--green)"></i><i class="l" style="width:${l / ws.length * 100}%;background:var(--green-mid)"></i></span><em>${Math.round((m + l) / ws.length * 100)}%</em></div>`;
  }).join('');
  const hist = s.tests.slice(0, 8).map(t => { const pct = t.n ? Math.round(t.ok / t.n * 100) : 0; return `<div class="li"><span class="ic ${pct >= 70 ? 'i-green' : 'i-gold'}">${I.quiz}</span><span class="t"><b>${esc(t.label || '테스트')}</b><small>${new Date(t.at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · ${t.ok}/${t.n}</small></span><span class="sc">${pct}%</span></div>`; }).join('');
  $('s-stats').innerHTML = `<div class="wrap">
    <div class="topbar"><h1>기록</h1><button class="ibtn" type="button" data-act="settings" aria-label="설정">${I.gear}</button></div>
    <div class="kpis">
      <div class="panel kpi"><small>${I.flame}연속 학습</small><b>${streak}일</b><span>최고 ${Math.max(s.best || 0, streak)}일</span></div>
      <div class="panel kpi"><small>${I.bolt}총 XP</small><b>${fmt(s.xpTotal)}</b><span>오늘 ${fmt(todayXp)} XP</span></div>
      <div class="panel kpi"><small>${I.book}학습한 단어</small><b>${fmt(all.length)}</b><span>전체 ${fmt(W.words.length)}단어 중</span></div>
      <div class="panel kpi"><small>${I.check}암기 완료</small><b>${fmt(master)}</b><span>${Math.round(master / W.words.length * 100)}% · 35일 간격 도달</span></div>
    </div>
    <div class="panel chart"><h3>학습 달력 <span>최근 12주 · 진할수록 XP 많음</span></h3><div class="heat">${heat}</div></div>
    <div class="panel chart"><h3>최근 7일 XP <span>목표 ${goal} XP</span></h3><div class="bars">${bars}</div></div>
    <div class="panel chart"><h3>첫 시도 정답률 <span>최근 30일</span></h3><p><b class="serif" style="font-size:34px;font-weight:600">${tot ? Math.round(ok / tot * 100) : 0}%</b> <span class="muted">${fmt(ok)} / ${fmt(tot)}문제</span></p></div>
    <div class="panel chart"><h3>Day별 진도 <span>학습 · 암기 완료</span></h3><div class="dbars">${dbars}</div></div>
    <div class="sec"><h2>시험 기록</h2><span>${s.tests.length}회</span></div>
    ${hist ? `<div class="panel list tests">${hist}</div>` : '<div class="empty">아직 본 시험이 없어요</div>'}
  </div>`;
}

/* ---------- settings ---------- */
function segHTML(key, opts) { return `<div class="seg">${opts.map(([v, t]) => `<button type="button" data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${String(state.settings[key]) === String(v)}">${t}</button>`).join('')}</div>`; }
function swHTML(key, label) { return `<label class="switch"><input type="checkbox" data-set="${key}" ${state.settings[key] ? 'checked' : ''} aria-label="${esc(label)}"><i></i></label>`; }
function renderSettings() {
  const st = state.settings;
  const where = PWA ? '이 폰 안에만 저장돼요. 서버로 보내지 않아요. 홈 화면에서 앱을 지우거나 웹사이트 데이터를 지우면 사라질 수 있으니 가끔 백업해 두세요.' : Cloud.ready ? 'claude.ai 계정에 저장돼요. 폰이나 PC 어디서 열어도 이어서 할 수 있어요.' : '이 브라우저에 저장돼요.';
  $('s-settings').innerHTML = `<div class="wrap">
    <div class="topbar"><button class="ibtn" type="button" data-act="back" aria-label="뒤로">${I.back}</button><h1 style="flex:1">설정</h1></div>
    <p class="set-h">학습</p>
    <div class="panel set">
      <div class="sr"><div class="t"><b>하루 새 단어</b><span class="d">매일 새로 익힐 단어 수</span></div>${segHTML('daily', [[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30']])}</div>
      <div class="sr"><div class="t"><b>하루 목표 XP</b><span class="d">채우면 연속 학습일이 이어져요</span></div>${segHTML('goal', [[20, '20'], [50, '50'], [80, '80'], [120, '120']])}</div>
      <div class="sr"><div class="t"><b>복습 방식</b><span class="d">퀴즈로 풀기, 또는 카드로 알아요/몰라요</span></div>${segHTML('review', [['quiz', '퀴즈'], ['card', '카드']])}</div>
      <div class="sr"><div class="t"><b>스펠링 문제</b><span class="d">잘 아는 단어는 직접 쓰기로 복습</span></div>${swHTML('spell', '스펠링 문제')}</div>
      <div class="sr"><div class="t"><b>카드 앞면</b><span class="d">카드로 볼 때 먼저 보일 쪽</span></div>${segHTML('front', [['en', '영어'], ['ko', '한국어']])}</div>
      <div class="sr"><div class="t"><b>새 단어 시작 Day</b><span class="d">이미 아는 Day는 건너뛰기</span></div><select data-set="start" aria-label="새 단어 시작 Day">${W.days.map(d => `<option value="${d}" ${d === st.start ? 'selected' : ''}>Day ${pad2(d)}부터</option>`).join('')}</select></div>
    </div>
    <p class="set-h">소리</p>
    <div class="panel set">
      <div class="sr"><div class="t"><b>효과음</b><span class="d">정답·오답·완료 소리</span></div>${swHTML('sfx', '효과음')}</div>
      <div class="sr"><div class="t"><b>발음 자동 재생</b><span class="d">단어가 나오면 바로 읽어 주기</span></div>${swHTML('say', '발음 자동 재생')}</div>
      <div class="sr"><div class="t"><b>무음 모드에서도 소리</b><span class="d">아이폰 무음 스위치를 켜도 들려요. 끄면 다른 음악과 같이 들을 수 있어요.</span></div>${swHTML('silent', '무음 모드에서도 소리')}</div>
      ${PWA && !localStorage.getItem(K_KEY) ? `<div class="sr"><div class="t"><b>AI 발음 받기</b><span class="d">코드를 입력하면 자연스러운 발음 파일을 받아요</span></div><button class="btn sm" type="button" data-act="codeAgain">${I.lock}코드 입력</button></div>` : ''}
      <div class="sr"><div class="t"><b>소리 확인</b><span class="d">${Voice.available() ? 'AI 음성(Kokoro) 발음 파일' : '기기 음성으로 읽어요'}</span></div><button class="btn sm alt" type="button" data-act="soundTest">${I.speaker}들어보기</button></div>
    </div>
    ${PWA ? `<p class="set-h">화면</p><div class="panel set"><div class="sr"><div class="t"><b>테마</b></div>${segHTML('theme', [['system', '시스템'], ['light', '라이트'], ['dark', '다크']])}</div></div>` : ''}
    <p class="set-h">데이터</p>
    <div class="panel set">
      <div class="sr"><div class="t"><b>저장 위치</b><span class="d">${esc(where)}</span></div></div>
      <div class="sr"><div class="t"><b>기록 백업</b><span class="d">백업 파일을 만들어 iCloud Drive 등에 저장</span></div><button class="btn sm alt" type="button" data-act="backup">${I.save}백업</button></div>
      <div class="sr"><div class="t"><b>백업 불러오기</b><span class="d">백업 파일로 기록 되돌리기</span></div><button class="btn sm alt" type="button" data-act="restore">${I.upload}불러오기</button></div>
      <div class="sr"><div class="t"><b>학습 기록 초기화</b><span class="d">진도, 연속 기록, 시험 기록을 모두 지워요</span></div><button class="btn sm bad" type="button" data-act="reset">초기화</button></div>
    </div>
    <p class="about"><b>단어</b> · TOEFL 초록 단어책 Day 01–${pad2(W.days[W.days.length - 1])}, ${fmt(W.words.length)}단어. 캡처본을 OCR한 뒤 원본 이미지와 한 줄씩 대조해 정리했고, 원문 오타를 고쳤거나 확인이 필요한 단어에는 ※ 메모가 있어요.<br>
    <b>발음</b> · 오픈소스 음성 AI Kokoro-82M(Apache-2.0)으로 만든 미국식 발음이에요. 명사·동사에 따라 강세가 달라지는 단어는 뜻에 맞춰 골랐어요.<br>
    <b>복습 간격</b> · 맞힐 때마다 1 → 3 → 7 → 16 → 35 → 80 → 180일로 늘어나고, 틀리면 그 자리에서 다시 나온 뒤 다음 날 또 복습해요. 35일 간격에 도달하면 ‘암기 완료’예요. 하루는 새벽 4시에 바뀌어요.<br>
    <span class="mono" style="font-size:11.5px">v${esc(CFG.version || '2')}</span></p>
  </div>`;
}
async function backup() {
  const json = JSON.stringify({ app: 'chorok-voca-backup', v: 2, at: new Date().toISOString(), state });
  const name = 'chorok-voca-backup-' + L.dayKey(today()) + '.json';
  if (!PWA && window.claude && window.claude.use) {
    try { const dl = await window.claude.use('downloads'); if (dl) { await dl.save({ filename: name, data: json }); toast('백업 파일을 저장했어요'); return; } } catch (e) {}
  }
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '초록 보카 백업' }); toast('백업 파일을 만들었어요'); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast('백업 파일을 만들었어요');
}
let pickPurpose = '';
function pickFile(purpose) { pickPurpose = purpose; const f = $('filePick'); f.value = ''; f.click(); }
$('filePick').addEventListener('change', async ev => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  let o;
  try { o = JSON.parse(await f.text()); } catch (e) { toast('JSON 파일이 아니에요'); return; }
  if (pickPurpose === 'restore') {
    const src = o && o.app === 'chorok-voca-backup' ? (o.state || (o.prog ? L.fromV1({ prog: o.prog, meta: o.meta }) : null)) : null;
    if (!src) { toast('초록 보카 백업 파일이 아니에요'); return; }
    const okGo = await confirmSheet('백업으로 되돌릴까요?', '지금 기록은 백업 파일의 기록으로 바뀌어요.', '되돌리기', '취소');
    if (!okGo) return;
    state = L.sanitize(src, W); save(); flush(); applyTheme();
    toast('기록을 되돌렸어요'); go('home');
  } else if (pickPurpose === 'words') {
    const rows = o && o.app === 'chorok-voca' && Array.isArray(o.words) ? o.words : null;
    if (!rows) { unlockMsg('초록 보카 단어 파일이 아니에요', true); return; }
    localStorage.setItem(K_WORDS, JSON.stringify({ v: o.v || 1, words: rows }));
    startApp(rows);
  }
});

/* ---------- unlock (phone build) ---------- */
function renderUnlock() {
  $('s-unlock').innerHTML = `<div class="wrap unlock">
    ${mascot('happy', 'float')}
    <h1>초록 보카</h1>
    <p>처음 한 번만 받은 <b>8자리 코드</b>를 입력하세요.<br>단어와 발음을 이 폰에 내려받아요 (약 16MB).</p>
    ${!standalone && isIOS ? `<div class="banner">${I.share}<span><b>먼저 홈 화면에 추가하세요.</b> Chrome 주소창 오른쪽 공유 버튼 → ‘홈 화면에 추가’ 후, 홈 화면의 초록 보카 아이콘으로 열어서 코드를 넣어야 앱에 저장돼요.</span></div>` : ''}
    <input class="code" id="codeIn" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="XXXX-XXXX" aria-label="8자리 코드">
    <div class="prog" id="unlockProg" hidden><i></i></div>
    <p class="msg" id="unlockMsg" hidden></p>
    <button class="btn" type="button" data-act="unlock" id="unlockBtn">${I.lock}시작하기</button>
    <button class="link" type="button" data-act="wordsFile">코드 대신 단어 파일로 불러오기</button>
    ${W ? '<button class="link" type="button" data-act="settings">돌아가기</button>' : ''}
  </div>`;
  const inp = $('codeIn');
  inp.addEventListener('input', () => { let v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4); inp.value = v; });
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') unlock(); });
}
function unlockMsg(t, err) { const m = $('unlockMsg'); if (!m) return; m.hidden = !t; m.textContent = t || ''; m.className = 'msg' + (err ? ' err' : ''); }
function unlockProg(v) { const p = $('unlockProg'); if (!p) return; p.hidden = v == null; if (v != null) p.firstElementChild.style.width = Math.round(v * 100) + '%'; }
let unlocking = false;
async function unlock() {
  if (unlocking) return;
  const code = ($('codeIn').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 8) { unlockMsg('8자리 코드를 입력해 주세요', true); return; }
  if (!window.crypto || !crypto.subtle) { unlockMsg('이 브라우저에서는 코드를 풀 수 없어요. 최신 Safari나 Chrome으로 열어 주세요.', true); return; }
  unlocking = true; $('unlockBtn').disabled = true;
  try {
    unlockMsg('코드 확인 중…'); unlockProg(0.05);
    const key = await Crypto.derive(code);
    const res = await fetch(CFG.data.words, { cache: 'no-cache' });
    if (!res.ok) throw new Error('net');
    let plain;
    try { plain = await Crypto.open(key, await res.arrayBuffer()); } catch (e) { unlockMsg('코드가 맞지 않아요. 다시 확인해 주세요.', true); unlockProg(null); return; }
    const data = JSON.parse(new TextDecoder().decode(plain));
    localStorage.setItem(K_WORDS, JSON.stringify({ v: data.v || 2, rev: data.rev || '', words: data.words }));
    localStorage.setItem(K_KEY, b64.enc(await crypto.subtle.exportKey('raw', key)));
    Crypto.key = key;
    const days = CFG.audio ? CFG.audio.days : [];
    let done = 0;
    unlockMsg(`발음 받는 중… 0/${days.length}`); unlockProg(0.1);
    const queue = days.slice();
    const store = 'caches' in window ? await caches.open('cv-data').catch(() => null) : null;   // the service worker may not control the page yet on the first launch
    const worker = async () => {
      while (queue.length) {
        const d = queue.shift(), url = new URL(Voice.url(d), location.href).href;
        try { if (store) { if (!(await store.match(url))) await store.add(url); } else await (await fetch(url)).arrayBuffer(); } catch (e) {}
        done++; unlockMsg(`발음 받는 중… ${done}/${days.length}`); unlockProg(0.1 + 0.9 * done / days.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    unlockMsg(`${fmt(data.words.length)}단어 준비 완료!`);
    await sleep(500);
    if (state) flush();
    Voice.packs.clear(); Voice.bufs.clear(); Voice.order = [];
    startApp(data.words);
  } catch (e) {
    unlockMsg('내려받지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', true); unlockProg(null);
  } finally { unlocking = false; const b = $('unlockBtn'); if (b) b.disabled = false; }
}

/* ---------- actions ---------- */
function toggleStar(id, el) {
  if (state.stars[id]) delete state.stars[id]; else { state.stars[id] = 1; Sound.sfx('star'); }
  save();
  for (const b of document.querySelectorAll(`[data-act="star"][data-id="${id}"]`)) { b.classList.toggle('on', !!state.stars[id]); b.setAttribute('aria-pressed', String(!!state.stars[id])); }
}
const ACT = {
  tab: el => { if (screen === 'quiz') return; Voice.stop(); go(el.dataset.tab); },
  settings: () => go('settings'),
  back: () => go(screen === 'day' ? (dayView && dayView.from === 'home' ? 'home' : 'words') : ['home', 'words', 'test', 'stats'].includes(prevScreen) ? prevScreen : tab),
  day: el => go('day', { t: 'day', d: Number(el.dataset.day), from: screen }),
  starList: () => go('day', { t: 'stars', from: screen }),
  wrongList: () => go('day', { t: 'wrong', from: screen }),
  say: el => { sayBtnFeedback(el); Voice.play(el.dataset.id); },
  star: el => toggleStar(el.dataset.id, el),
  lesson: () => startLesson(),
  lessonExtra: () => startLesson({ extra: state.settings.daily }),
  lessonMore: () => startLesson({ more: true }),
  next: () => nextLearn(),
  pick: el => pick(Number(el.dataset.i)),
  cont: () => cont(),
  quit: () => quitRun(),
  hint: () => hint(),
  spellGo: () => spellGo(),
  cardKnow: () => cardAnswer(true),
  cardDont: () => cardAnswer(false),
  sheet: el => closeSheet(el.dataset.v),
  obPick: el => { state.settings.daily = Number(el.dataset.v); for (const b of document.querySelectorAll('#obSeg button')) b.setAttribute('aria-pressed', String(b === el)); },
  autoToday: () => { const p = L.todayPlan(state, W, today()); const ids = (state.nt && state.nt.d === today() ? state.nt.ids : p.planned); startAuto(ids, '오늘의 단어', null); },
  listBrowse: () => startBrowse(listFor(dayView).map(e => e.id), dayView.t === 'day' ? 'Day ' + pad2(dayView.d) : dayView.t === 'stars' ? '즐겨찾기' : '오답노트', listKey(dayView)),
  listAuto: () => startAuto(listFor(dayView).map(e => e.id), dayView.t === 'day' ? 'Day ' + pad2(dayView.d) : dayView.t === 'stars' ? '즐겨찾기' : '오답노트', listKey(dayView)),
  listTest: () => {
    const ids = listFor(dayView).map(e => e.id), label = dayView.t === 'day' ? 'Day ' + pad2(dayView.d) : dayView.t === 'stars' ? '즐겨찾기' : '오답노트';
    startTest({ range: { t: 'ids', ids: L.shuffle(ids.slice()) }, qt: 'mix', count: 20, label });
  },
  browseIds: el => startBrowse(el.dataset.ids.split(','), el.dataset.label || '카드', null),
  browseClose: () => { Voice.stop(); const from = B && B.from; B = null; go(from === 'day' ? 'day' : TABBED.includes(from) ? from : 'home'); },
  browsePrev: () => browseMove(-1, false),
  browseNext: () => browseMove(1, false),
  browseShuffle: () => { B.shuffled = !B.shuffled; const cur = B.ids[B.i]; B.ids = B.shuffled ? L.shuffle(B.order.slice()) : B.order.slice(); B.i = Math.max(0, B.ids.indexOf(cur)); renderBrowse(0); toast(B.shuffled ? '카드를 섞었어요' : '원래 순서로 돌아왔어요'); },
  autoClose: () => { autoStop(); const from = A && A.from; A = null; go(from === 'day' ? 'day' : TABBED.includes(from) ? from : 'home'); },
  autoToggle: () => { if (A.playing) { autoStop(); renderAuto(); } else autoPlay(true); },
  autoPrev: () => { const was = A.playing; autoStop(); A.i = Math.max(0, A.i - 1); A.reveal = false; if (was) autoPlay(true); else { renderAuto(); Voice.play(A.ids[A.i]); } },
  autoNext: () => { const was = A.playing; autoStop(); A.i = Math.min(A.ids.length - 1, A.i + 1); A.reveal = false; if (was) autoPlay(true); else { renderAuto(); Voice.play(A.ids[A.i]); } },
  autoRepeat: el => { state.settings.repeat = Number(el.dataset.v); save(); for (const b of document.querySelectorAll('[data-act="autoRepeat"]')) b.setAttribute('aria-pressed', String(b === el)); },
  tbRange: el => { TB.range = el.dataset.v; state.tb = TB; save(); renderTest(); },
  tbDay: el => { const d = Number(el.dataset.v); TB.days = TB.days.includes(d) ? TB.days.filter(x => x !== d) : TB.days.concat(d); state.tb = TB; save(); renderTest(); },
  tbAll: () => { TB.days = W.days.slice(); state.tb = TB; save(); renderTest(); },
  tbNone: () => { TB.days = []; state.tb = TB; save(); renderTest(); },
  tbQt: el => { TB.qt = el.dataset.v; state.tb = TB; save(); renderTest(); },
  tbCount: el => { TB.count = Number(el.dataset.v); state.tb = TB; save(); renderTest(); },
  testStart: () => { const r = TB.range === 'days' ? { t: 'days', days: TB.days } : { t: TB.range }; startTest({ range: r, qt: TB.qt, count: TB.count, label: tbLabel() }); },
  testResume: () => { if (state.test) run(state.test); },
  retryWrong: el => startTest({ range: { t: 'ids', ids: L.shuffle(el.dataset.ids.split(',')) }, qt: 'mix', count: 0, label: '틀린 문제 다시' }),
  set: el => {
    const k = el.dataset.k, raw = el.dataset.v, v = /^\d+$/.test(raw) ? Number(raw) : raw;
    state.settings[k] = v;
    if (k === 'daily') L.refreshPlan(state, W, today());
    if (k === 'goal') { const ds = state.days[L.dayKey(today())]; if (ds && ds.xp >= v) ds.met = true; }
    if (k === 'theme') applyTheme();
    save(); renderSettings();
  },
  soundTest: () => { Sound.unlock(); Sound.sfx('right'); setTimeout(() => Voice.play(W.words[0].id), 450); },
  backup: () => backup(),
  restore: () => pickFile('restore'),
  reset: async () => {
    const ok = await confirmSheet('정말 초기화할까요?', '진도, 연속 기록, 시험 기록, 즐겨찾기가 모두 지워지고 되돌릴 수 없어요.', '모두 지우기', '취소', true);
    if (!ok) return;
    const keep = Object.assign({}, state.settings);
    state = L.sanitize({ settings: keep, onboarded: true }, W);
    save(); flush(); toast('기록을 초기화했어요'); go('home');
  },
  unlock: () => unlock(),
  codeAgain: () => { renderUnlock(); show('unlock'); },
  wordsFile: () => pickFile('words'),
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'BUTTON') el.blur();
  fn(el, ev);
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (!el.dataset || !el.dataset.set) return;
  const k = el.dataset.set;
  state.settings[k] = el.type === 'checkbox' ? el.checked : /^\d+$/.test(el.value) ? Number(el.value) : el.value;
  if (k === 'start') L.refreshPlan(state, W, today());
  if (k === 'silent') Sound.session();
  save();
});
document.addEventListener('pointerdown', () => Sound.unlock(), { capture: true, passive: true });
document.addEventListener('keydown', ev => {
  if (!$('sheet').hidden) { if (ev.key === 'Escape') closeSheet(null); return; }
  const inField = ev.target.closest && ev.target.closest('input,select,textarea');
  if (screen === 'quiz' && Q) {
    if (ev.repeat && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); return; }
    const st = curStep(), fbOpen = $('fb').classList.contains('show');
    if (inField) { if (ev.key === 'Enter' && ev.target.id === 'spellIn') { ev.preventDefault(); fbOpen ? cont() : spellGo(); } return; }
    if (fbOpen) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); cont(); } return; }
    if (!st) return;
    if (st.k === 'learn') { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); nextLearn(); } }
    else if (st.q && st.q.t === 'card') {
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); flip(); }
      else if (ev.key === 'ArrowRight') cardAnswer(true);
      else if (ev.key === 'ArrowLeft') cardAnswer(false);
    } else if (st.q && st.q.opts && /^[1-4]$/.test(ev.key)) pick(Number(ev.key) - 1);
    if ((ev.key === 's' || ev.key === 'S') && st.q && st.q.t !== 'mcq-en' && st.q.t !== 'spell') Voice.play(st.id);
    if (ev.key === 'Escape') quitRun();
    return;
  }
  if (inField) return;
  if (screen === 'browse' && B) {
    if (ev.key === 'ArrowRight') browseMove(1, false);
    else if (ev.key === 'ArrowLeft') browseMove(-1, false);
    else if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); flip(); }
    else if (ev.key === 's' || ev.key === 'S') Voice.play(B.ids[B.i]);
    else if (ev.key === 'Escape') ACT.browseClose();
  } else if (screen === 'auto' && A) {
    if (ev.key === ' ') { ev.preventDefault(); ACT.autoToggle(); }
    else if (ev.key === 'ArrowRight') ACT.autoNext();
    else if (ev.key === 'ArrowLeft') ACT.autoPrev();
    else if (ev.key === 'Escape') ACT.autoClose();
  }
});

/* ---------- boot ---------- */
function paintTabs() {
  const t = [['home', I.home, '홈'], ['words', I.book, '단어장'], ['test', I.quiz, '테스트'], ['stats', I.chart, '기록']];
  for (const [k, ic, label] of t) $('tab-' + k).innerHTML = ic + `<span>${label}</span>`;
  document.querySelector('[data-act="quit"]').innerHTML = I.close;
}
async function refreshWords() {   // a newer word list was published: swap it in quietly
  try {
    const res = await fetch(CFG.data.words, { cache: 'no-cache' });
    if (!res.ok) return;
    const data = JSON.parse(new TextDecoder().decode(await Crypto.open(await Crypto.stored(), await res.arrayBuffer())));
    if (!Array.isArray(data.words) || !data.words.length || data.rev !== CFG.data.rev) return;   // an older cached copy: try again next launch
    localStorage.setItem(K_WORDS, JSON.stringify({ v: data.v || 2, rev: data.rev, words: data.words }));
    if (screen === 'quiz' || screen === 'browse' || screen === 'auto') return;   // takes effect on the next launch
    W = L.prepare(data.words);
    state = L.sanitize(state, W);
    if (screen === 'home') renderHome();
  } catch (e) {}
}
function storedRev() { try { return (JSON.parse(localStorage.getItem(K_WORDS) || '{}') || {}).rev || ''; } catch (e) { return ''; } }
function startApp(rows) {
  W = L.prepare(rows);
  state = L.sanitize(Local.read(), W);
  syncedAt = state.at || 0;
  settleSessions();
  if (state.lesson && !sessionActive(state.lesson, today())) state.lesson = null;
  applyTheme();
  go('home');
  if (PWA && CFG.data && CFG.data.rev && storedRev() !== CFG.data.rev && localStorage.getItem(K_KEY)) refreshWords();
  if (!PWA) {
    Cloud.connect().then(cloud => {
      if (!Cloud.ready) return;
      state = L.sanitize(mergeStates(state, cloud ? L.sanitize(cloud, W) : null), W);
      Local.write(state);
      Cloud.flush();
      if (screen === 'home') renderHome(); else if (screen === 'settings') renderSettings();
    }).catch(e => console.warn('[초록 보카] 계정 저장소 연결 실패, 이 브라우저에 저장해요', e));
  }
}
function boot() {
  paintTabs();
  if (PWA && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  }
  const rows = storedRows();
  if (rows) { startApp(rows); return; }
  if (!PWA) { $('s-boot').innerHTML = '<div class="wrap unlock"><p class="muted" style="text-align:center">단어 데이터를 찾지 못했어요.</p></div>'; return; }
  renderUnlock();
  show('unlock');
}
boot();
})();
