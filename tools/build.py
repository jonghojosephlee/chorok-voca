"""Build 초록 보카 v2.

dist/pwa/       phone web app for GitHub Pages: app code in the clear, words and audio AES-GCM encrypted
dist/artifact/  claude.ai artifact: page content with the words embedded, plain audio packs
Run with the tts venv python (needs `cryptography`)."""
import base64, hashlib, json, os, secrets, shutil, struct, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.path.dirname(HERE)
SRC = os.path.join(HERE, 'src')
DIST = os.path.join(HERE, 'dist')
VERSION = '2.0.' + os.environ.get('BUILD_N', '1')
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
rows = []
for d in range(1, 31):
    for e in json.load(open(os.path.join(S, 'final', f'day{d:02d}.json'))):
        senses = [[(s.get('en') or '').strip(), (s.get('ko') or '').strip()] + examples.get((d, e['n'], si), []) for si, s in enumerate(e['senses'])]
        row = [d, e['n'], e['word'].strip(), senses]
        note, fix = (e.get('note') or '').strip(), (e.get('fix') or '').strip()
        if note or fix: row.append(note)
        if fix: row.append(fix)
        rows.append(row)
assert len(rows) == 1813, len(rows)
os.makedirs(DIST, exist_ok=True)
json.dump({'words': rows}, open(os.path.join(DIST, 'rows.json'), 'w'), ensure_ascii=False)   # plain copy for the node tests; never published
days = sorted({r[0] for r in rows})

# ---- audio packs: 'CVA1' | count u16 | count x (n u16, offset u32, length u32) | clips ----
def pack_day(d):
    entries = [r for r in rows if r[0] == d]
    blobs, index, off = [], [], 0
    for r in entries:
        p = os.path.join(S, 'audio', 'm4a', f'{d}-{r[1]}.m4a')
        b = open(p, 'rb').read()
        index.append(struct.pack('<HII', r[1], off, len(b)))
        blobs.append(b)
        off += len(b)
    return b'CVA1' + struct.pack('<H', len(entries)) + b''.join(index) + b''.join(blobs)
packs = {d: pack_day(d) for d in days}
AUDIO_V = hashlib.sha256(b''.join(packs[d] for d in days)).hexdigest()[:10]   # changes only when the clips change

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
    for d, b in packs.items():
        open(os.path.join(out, 'data', 'audio', f'd{d:02d}.bin'), 'wb').write(seal(b))
    cfg = {'mode': 'pwa', 'version': VERSION, 'crypto': {'salt': sec['salt'], 'iter': ITER}, 'data': {'words': 'data/words.bin', 'rev': rev},
           'audio': {'base': 'data/audio/', 'enc': True, 'v': AUDIO_V, 'days': days}}
    html = page(PWA_HEAD, '</head>\n<body>', '</body>\n</html>\n', cfg, '')
    open(os.path.join(out, 'index.html'), 'w').write(html)
    digest = hashlib.sha256(html.encode() + words_bin).hexdigest()[:10]
    sw = open(os.path.join(SRC, 'sw.js')).read().replace('__VERSION__', VERSION + '-' + digest).replace('__AUDIO_V__', AUDIO_V)
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
    cfg = {'mode': 'artifact', 'version': VERSION, 'audio': {'base': 'audio/', 'enc': False, 'b64': True, 'ext': '.txt', 'days': days}}
    words_js = 'window.__CV_WORDS__ = ' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';'
    html = page('<title>초록 보카</title>', '', '', cfg, words_js, ARTIFACT_CSS)
    open(os.path.join(out, 'chorok-voca.html'), 'w').write(html)
    return out

if __name__ == '__main__':
    p = build_pwa(); a = build_artifact()
    tot = sum(len(b) for b in packs.values())
    print('built', VERSION, '| words', len(rows), '| examples', len(examples), '| audio packs', len(packs), f'{tot/1e6:.1f} MB', '| pwa', p, '| artifact', a)
    print('code', sec['code'][:4] + '-' + sec['code'][4:])
