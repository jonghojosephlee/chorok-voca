"""Local test copy of a repo with friend sync taken out (nothing reaches voca-sync): python3 tools/mksite.py <repo dir> <out dir>"""
import json, os, shutil, subprocess, sys
src, dst = sys.argv[1], sys.argv[2]
shutil.rmtree(dst, ignore_errors=True)
subprocess.run(['rsync', '-a', '--exclude', '.git', src.rstrip('/') + '/', dst + '/'], check=True)
p = os.path.join(dst, 'index.html'); html = open(p).read()
a = html.index('window.__CV__ = ') + len('window.__CV__ = '); b = html.index(';</script>', a)
cfg = json.loads(html[a:b]); cfg.pop('sync', None)
open(p, 'w').write(html[:a] + json.dumps(cfg, ensure_ascii=False) + html[b:])
print(cfg['version'], 'test copy without sync at', dst)
