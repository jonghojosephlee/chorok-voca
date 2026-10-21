"""Before a push: the public repo holds no plain word data, no token, no local test files.
python3 tools/check_repo.py <repo dir> <rows.json from unseal.mjs>"""
import json, os, re, subprocess, sys
repo, rows_p = sys.argv[1], sys.argv[2]
needles = set()
for r in json.load(open(rows_p))['words']:
    for s in r[3]:
        if len(s) > 2 and isinstance(s[2], str) and len(s[2]) >= 30: needles.add(s[2])   # example sentences
        if len(s) > 3 and isinstance(s[3], str) and len(s[3]) >= 12: needles.add(s[3])   # their Korean
        if isinstance(s[1], str) and len(s[1]) >= 10: needles.add(s[1])                  # longer meanings
files = subprocess.run(['git', 'ls-files', '--others', '--cached', '--exclude-standard'], cwd=repo, capture_output=True, text=True, check=True).stdout.split()
bad = []
for f in files:
    if f.startswith(('data/', 'icons/')): continue
    if re.search(r'(^|/)(test\.html|rows\.json|state_[a-z]+\.json|secret\.json|sync_token\.json|vapid\.json)$', f): bad.append(('local file', f)); continue
    t = open(os.path.join(repo, f), encoding='utf-8', errors='ignore').read()
    if re.search(r'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}', t): bad.append(('token', f))
    hits = [n for n in needles if n in t]
    if hits: bad.append(('word data', f, len(hits)))
print('files checked', len(files), '| problems', bad or 'none')
sys.exit(1 if bad else 0)
