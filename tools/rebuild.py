"""Code-only rebuild of a deployed app repo (초록 보카 / 노랭이 보카): keeps its data/ (words, audio packs, sync) and page config,
re-assembles index.html and sw.js from src/. Run from anywhere: python3 tools/rebuild.py <repo dir> <app id> <version|--check> [src dir]
--check: the repo's own src must give back exactly the deployed index.html and sw.js."""
import hashlib, json, os, sys
APPS = {'chorok': {'old': {'prefixes': ['shell-'], 'names': ['fonts']}, 'spellDay': 0, 'spread': 0},   # v1 left shell-* and fonts; no typing at all
        'noraengi': {'old': {'prefixes': [], 'names': []}, 'spellDay': 2, 'spread': 30}}   # 2 reviews a day written out; word families 30 words apart
BODY, END = '</head>\n<body>', '</body>\n</html>\n'

def parts(repo):
    html = open(os.path.join(repo, 'index.html')).read()
    head = html[:html.index('\n<link rel="preconnect"')]
    a = html.index('window.__CV__ = ') + len('window.__CV__ = ')
    return html, head, json.loads(html[a:html.index(';</script>', a)])

def page(src, head, cfg):
    out = open(os.path.join(src, 'shell.html')).read()
    for k, v in [('<!--@HEAD@-->', head), ('/*@CSS@*/', open(os.path.join(src, 'style.css')).read()), ('<!--@BODY@-->', BODY),
                 ('/*@CONFIG@*/', json.dumps(cfg, ensure_ascii=False)), ('/*@WORDS@*/', ''),
                 ('/*@LOGIC@*/', open(os.path.join(src, 'logic.js')).read()), ('/*@APP@*/', open(os.path.join(src, 'app.js')).read()), ('<!--@END@-->', END)]:
        assert out.count(k) == 1, k
        out = out.replace(k, v)
    return out

def worker(src, repo, app, cfg, html):
    words_bin = open(os.path.join(repo, 'data', 'words.bin'), 'rb').read()
    digest = hashlib.sha256(html.encode() + words_bin).hexdigest()[:10]
    au = cfg['audio']
    keep = json.dumps([f'd{d:02d}.bin?v={au["vs"][str(d)]}' for d in au['days']] + [f'x{d:02d}.bin?v={au["xs"][str(d)]}' for d in au['days'] if str(d) in au.get('xs', {})])
    out = (open(os.path.join(src, 'sw.js')).read().replace('__VERSION__', cfg['version'] + '-' + digest).replace('__CACHE__', cfg['app']['cache'])
           .replace('__AUDIO_KEEP__', keep).replace('__OLD__', json.dumps(APPS[app]['old'])))
    assert not any(k in out for k in ('__VERSION__', '__CACHE__', '__AUDIO_KEEP__', '__OLD__')), 'unfilled service worker token'
    return out

if __name__ == '__main__':
    repo, app, ver = sys.argv[1], sys.argv[2], sys.argv[3]
    src = sys.argv[4] if len(sys.argv) > 4 else os.path.join(repo, 'src')
    html0, head, cfg = parts(repo)
    if ver == '--check':
        assert page(src, head, cfg) == html0, 'index.html differs'
        assert worker(src, repo, app, cfg, html0) == open(os.path.join(repo, 'sw.js')).read(), 'sw.js differs'
        print(app, cfg['version'], 'reproduces the deployed index.html and sw.js'); sys.exit()
    cfg['version'] = ver
    cfg['app']['spellDay'], cfg['app']['spread'] = APPS[app]['spellDay'], APPS[app]['spread']
    html = page(src, head, cfg)
    open(os.path.join(repo, 'index.html'), 'w').write(html)
    open(os.path.join(repo, 'sw.js'), 'w').write(worker(src, repo, app, cfg, html))
    print(app, 'built', ver)
