"""Build 초록 보카 v2.

dist/pwa/       phone web app for GitHub Pages: app code in the clear, words and audio AES-GCM encrypted
dist/artifact/  claude.ai artifact: page content with the words embedded, plain audio packs
The app code is shared with 노랭이 보카 (scratchpad/shared/src); CFG.app below says which app this is.
Run with the build venv python (needs `cryptography`)."""
import base64, hashlib, json, os, secrets, shutil, struct, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.path.dirname(HERE)
SRC = os.path.join(S, 'shared', 'src')
sys.path.insert(0, os.path.join(S, 'friend'))
import pron   # misaki phonemes -> IPA, shared with 노랭이 보카
DIST = os.path.join(HERE, 'dist')
VERSION = '2.1.' + os.environ.get('BUILD_N', '0')
SYNC_ON = False
ITER = 600_000

# ---- words ----
# example sentences (sent/dayNN.json: {n, si, en, ko}) ride along with each sense: [synonyms, meaning, example, its Korean]
# D16#4 prevailing: the book prints rudimentary's meanings under it (marked unsure), so any example would pair the word with a wrong meaning
NO_EXAMPLE = {(16, 4)}
examples = {}
for d in range(1, 31):
    sp = os.path.join(S, 'sent', f'day{d:02d}.json')
    if os.path.exists(sp):
        for r in json.load(open(sp)):
            if (r.get('en') or '').strip() and (d, r['n']) not in NO_EXAMPLE:
                examples[(d, r['n'], r['si'])] = [r['en'].strip(), (r.get('ko') or '').strip()]
# 풀이 for each example (howto/out/dayNN.json: {n, si, chunks: [english, korean], tip}) -> sense [.., example, its Korean, chunks, tip]
howto = {}
for d in range(1, 31):
    hp = os.path.join(S, 'howto', 'out', f'day{d:02d}.json')
    if os.path.exists(hp) and os.environ.get('HOWTO', '1') == '1':
        for r in json.load(open(hp)): howto[(d, r['n'], r['si'])] = [r['chunks'], r.get('tip') or '']
EX_AUDIO = os.environ.get('EX_AUDIO', '1') == '1'
ex_ts_p = os.path.join(S, 'audio', 'ex_ts.json')
ex_ts = json.load(open(ex_ts_p)) if os.path.exists(ex_ts_p) else {}   # word timestamps of the example clips (tts_ex_ts.py)
# IPA from the exact phonemes each word clip says (audio/log.json "used", written when the clips were made)
clip_ps = {i: v['used'] for v in json.load(open(os.path.join(S, 'audio', 'log.json'))).values() for i in v['ids']}
rows = []
for d in range(1, 31):
    for e in json.load(open(os.path.join(S, 'final', f'day{d:02d}.json'))):
        senses = []
        for si, s in enumerate(e['senses']):
            sense = [(s.get('en') or '').strip(), (s.get('ko') or '').strip()] + examples.get((d, e['n'], si), [])
            if len(sense) == 4 and (d, e['n'], si) in howto:
                chunks, tip = howto[(d, e['n'], si)]
                spans = pron.chunk_spans(chunks[0], ex_ts.get(f"{d}-{e['n']}s{si}")) if EX_AUDIO else None   # where each chunk is in the clip
                counts = pron.en_counts(chunks[0], sense[2])   # stored as word counts over the example (smaller)
                sense += [[counts or chunks[0], chunks[1]], tip, spans]
            senses.append(sense)
        row = [d, e['n'], e['word'].strip(), senses]
        note, fix = (e.get('note') or '').strip(), (e.get('fix') or '').strip()
        row += [note, fix, {'ipa': pron.ipa(clip_ps[f"{d}-{e['n']}"])}]
        rows.append(row)
assert len(rows) == 1813, len(rows)
os.makedirs(DIST, exist_ok=True)
json.dump({'words': rows}, open(os.path.join(DIST, 'rows.json'), 'w'), ensure_ascii=False)   # plain copy for the node tests; never published
days = sorted({r[0] for r in rows})

# ---- audio packs: 'CVA1' | count u16 | count x (n u16, offset u32, length u32) | clips ----
# word clip under key n, the example of sense si under n + 10000 * (si + 1)
def pack(clips):
    blobs, index, off = [], [], 0
    for key, p in clips:
        if not os.path.exists(p): continue
        b = open(p, 'rb').read()
        index.append(struct.pack('<HII', key, off, len(b))); blobs.append(b); off += len(b)
    return b'CVA1' + struct.pack('<H', len(index)) + b''.join(index) + b''.join(blobs)
# dNN: the Day's word clips (downloaded with the app); xNN: its example clips (fetched when that Day is studied)
packs = {d: pack([(r[1], os.path.join(S, 'audio', 'm4a', f'{d}-{r[1]}.m4a')) for r in rows if r[0] == d]) for d in days}
xpacks = {d: pack([(r[1] + 10000 * (si + 1), os.path.join(S, 'audio', 'm4a_ex', f'{d}-{r[1]}s{si}.m4a')) for r in rows if r[0] == d for si in range(len(r[3]))]) for d in days} if EX_AUDIO else {}
AUDIO_V = hashlib.sha256(b''.join(packs[d] for d in days)).hexdigest()[:10]   # changes only when the clips change
AUDIO_VS = {str(d): hashlib.sha256(packs[d]).hexdigest()[:10] for d in days}   # each Day's own version: an update refetches only the Days that changed
AUDIO_XS = {str(d): hashlib.sha256(xpacks[d]).hexdigest()[:10] for d in xpacks}
n_ex = sum(1 for r in rows for si in range(len(r[3])) if EX_AUDIO and os.path.exists(os.path.join(S, 'audio', 'm4a_ex', f'{r[0]}-{r[1]}s{si}.m4a')))
APP = {'id': 'chorok', 'name': '초록 보카', 'pet': '초록이', 'keys': 'cv2', 'cache': 'cv', 'backup': 'chorok-voca-backup', 'wordsFile': 'chorok-voca', 'v1': 'chorok-voca-v1',
       'koSay': False, 'paceScope': '책 끝까지',
       'pace': {'5': '약 1년 · 하루 40~100문제', '10': '약 6개월 · 하루 80~170문제', '15': '약 4개월 · 하루 130~220문제', '20': '약 3개월 · 하루 180~270문제', '30': '약 2개월 · 하루 250~330문제'},
       'intro': "하루에 새 단어 몇 개씩 할까요? 매일 정한 만큼 새 단어가 나오고, 그날 복습할 단어는 제가 챙겨서 '오늘의 학습'에 넣어 드려요.",
       'about': 'TOEFL 초록 단어책 Day 01–{last}, {count}단어. 캡처본을 OCR한 뒤 원본 이미지와 한 줄씩 대조해 정리했고, 원문 오타를 고쳤거나 확인이 필요한 단어에는 ※ 메모가 있어요. 예문·해석·풀이는 Claude가 새로 쓰고 따로 한 번 더 검토했어요.'}

# ---- secret (stable across rebuilds) ----
sec_path = os.path.join(HERE, 'secret.json')
if os.path.exists(sec_path):
    sec = json.load(open(sec_path))
else:
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    sec = {'code': ''.join(secrets.choice(alphabet) for _ in range(8)), 'salt': base64.b64encode(secrets.token_bytes(16)).decode()}
    json.dump(sec, open(sec_path, 'w'))
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=base64.b64decode(sec['salt']), iterations=ITER).derive(sec['code'].encode())
aes = AESGCM(key)
def seal(data):
    iv = secrets.token_bytes(12)
    return b'CVE1' + iv + aes.encrypt(iv, data, None)
def unseal(b):
    assert b[:4] == b'CVE1'
    return aes.decrypt(b[4:16], b[16:], None)
sys.path.insert(0, os.path.join(S, 'shared'))
import sync_build   # friend progress + study reminders (voca-sync)

# ---- page assembly ----
shell = open(os.path.join(SRC, 'shell.html')).read()
css = open(os.path.join(SRC, 'style.css')).read()
logic = open(os.path.join(SRC, 'logic.js')).read()
app = open(os.path.join(SRC, 'app.js')).read()
def page(head, body_open, end, config, words_js, extra_css=''):
    out = shell
    for k, v in [('<!--@HEAD@-->', head), ('/*@CSS@*/', css + extra_css), ('<!--@BODY@-->', body_open), ('/*@CONFIG@*/', json.dumps(config, ensure_ascii=False)),
                 ('/*@WORDS@*/', words_js), ('/*@LOGIC@*/', logic), ('/*@APP@*/', app), ('<!--@END@-->', end)]:
        assert out.count(k) == 1, k
        out = out.replace(k, v)
    return out

PWA_HEAD = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>초록 보카</title>
<meta name="description" content="TOEFL 초록 단어책을 하루 10개씩 카드와 퀴즈로 외우는 간격 반복 단어장">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="초록 보카">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#f1f4ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1411" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">'''

def build_pwa():
    out = os.path.join(DIST, 'pwa')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(os.path.join(out, 'data', 'audio'))
    shutil.copytree(os.path.join(S, 'pwa', 'icons'), os.path.join(out, 'icons'))
    for f in ('manifest.json', 'README.md', '.nojekyll'):
        shutil.copy(os.path.join(S, 'pwa', f), os.path.join(out, f))
    rev = hashlib.sha256(json.dumps(rows, ensure_ascii=False).encode()).hexdigest()[:12]
    words_bin = seal(json.dumps({'v': 2, 'rev': rev, 'words': rows}, ensure_ascii=False, separators=(',', ':')).encode())
    open(os.path.join(out, 'data', 'words.bin'), 'wb').write(words_bin)
    tot = xtot = 0
    for d, b in packs.items():
        sealed = seal(b); tot += len(sealed)
        open(os.path.join(out, 'data', 'audio', f'd{d:02d}.bin'), 'wb').write(sealed)
    for d, b in xpacks.items():
        sealed = seal(b); xtot += len(sealed)
        open(os.path.join(out, 'data', 'audio', f'x{d:02d}.bin'), 'wb').write(sealed)
    audio = {'base': 'data/audio/', 'enc': True, 'v': AUDIO_V, 'vs': AUDIO_VS, 'days': days, 'mb': max(1, round(tot / 1e6))}
    if xpacks: audio.update(xs=AUDIO_XS, xmb=max(1, round(xtot / 1e6)))
    cfg = {'mode': 'pwa', 'version': VERSION, 'app': APP, 'crypto': {'salt': sec['salt'], 'iter': ITER}, 'data': {'words': 'data/words.bin', 'rev': rev}, 'audio': audio}
    global SYNC_ON
    SYNC_ON = bool(sync_build.add(cfg, 'chorok', out, os.path.join(S, 'pwa'), seal, unseal))
    html = page(PWA_HEAD, '</head>\n<body>', '</body>\n</html>\n', cfg, '')
    open(os.path.join(out, 'index.html'), 'w').write(html)
    digest = hashlib.sha256(html.encode() + words_bin).hexdigest()[:10]
    keep = json.dumps([f'd{d:02d}.bin?v={AUDIO_VS[str(d)]}' for d in days] + [f'x{d:02d}.bin?v={AUDIO_XS[str(d)]}' for d in xpacks])
    sw = (open(os.path.join(SRC, 'sw.js')).read().replace('__VERSION__', VERSION + '-' + digest).replace('__CACHE__', APP['cache'])
          .replace('__AUDIO_KEEP__', keep).replace('__OLD__', json.dumps({'prefixes': ['shell-'], 'names': ['fonts']})))   # v1 left shell-* and fonts
    assert not any(k in sw for k in ('__VERSION__', '__CACHE__', '__AUDIO_KEEP__', '__OLD__')), "unfilled service worker token"
    open(os.path.join(out, 'sw.js'), 'w').write(sw)
    return out

ARTIFACT_CSS = '''
/* the claude.ai viewer already pads the page by the safe areas */
.screen{padding-top:8px;padding-bottom:28px}
.screen.tabbed{padding-bottom:calc(var(--tabs-h) + env(safe-area-inset-bottom,0px) + 28px)}
'''
def build_artifact():
    out = os.path.join(DIST, 'artifact')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(os.path.join(out, 'audio'))
    for d, b in packs.items():
        open(os.path.join(out, 'audio', f'd{d:02d}.txt'), 'w').write(base64.b64encode(b).decode())
    audio = {'base': 'audio/', 'enc': False, 'b64': True, 'ext': '.txt', 'days': days}   # no example packs here (too big to publish): examples use the device voice
    cfg = {'mode': 'artifact', 'version': VERSION, 'app': APP, 'audio': audio}
    words_js = 'window.__CV_WORDS__ = ' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';'
    html = page('<title>초록 보카</title>', '', '', cfg, words_js, ARTIFACT_CSS)
    open(os.path.join(out, 'chorok-voca.html'), 'w').write(html)
    return out

if __name__ == '__main__':
    p = build_pwa(); a = build_artifact()
    tot = sum(len(b) for b in packs.values()); xt = sum(len(b) for b in xpacks.values())
    print('built', VERSION, '| words', len(rows), '| examples', len(examples), '| 풀이', len(howto), '| example clips', n_ex, '| word packs', len(packs), f'{tot/1e6:.1f} MB', '| example packs', len(xpacks), f'{xt/1e6:.1f} MB', '| pwa', p, '| artifact', a)
    print('code', sec['code'][:4] + '-' + sec['code'][4:], '| friend sync', 'on' if SYNC_ON else 'off (no token)')
