#!/usr/bin/env python3
"""compare.py A.json B.json  -> per-tag comparison of two harness runs."""
import json, sys
a, b = (json.load(open(p)) for p in sys.argv[1:3])
ra = {r['tag']: r for r in a['requests'] if r.get('tag')}
rb = {r['tag']: r for r in b['requests'] if r.get('tag')}
print(f"A: {a['label']} code={a['code']} schema={a['schema_version']} db={a['db']} requests={len(a['requests'])}")
print(f"B: {b['label']} code={b['code']} schema={b['schema_version']} db={b['db']} requests={len(b['requests'])}")
IGNORE = {'extra_keys', 'keys'}  # new columns legitimately appear as extra JSON keys
same = diff = status_diff = 0
rows = []
for tag in sorted(set(ra) | set(rb)):
    x, y = ra.get(tag), rb.get(tag)
    if not x or not y:
        rows.append((tag, 'MISSING', x and x['status'], y and y['status'], '')); continue
    if x['status'] != y['status']:
        status_diff += 1; rows.append((tag, 'STATUS', x['status'], y['status'], f"{x.get('exception')} | {y.get('exception')}")); continue
    ex, ey = x.get('extract') or {}, y.get('extract') or {}
    ex = {k: v for k, v in ex.items() if k not in IGNORE}; ey = {k: v for k, v in ey.items() if k not in IGNORE}
    if ex != ey:
        diff += 1; rows.append((tag, 'CONTENT', x['status'], y['status'], json.dumps({k: (ex.get(k), ey.get(k)) for k in set(ex) | set(ey) if ex.get(k) != ey.get(k)})[:300]))
    else:
        same += 1
print(f"same={same} content_diff={diff} status_diff={status_diff}")
for r in rows: print(' | '.join(str(c) for c in r))
# non-200/302 in each
for name, run in (('A', a), ('B', b)):
    bad = [(r['status'], r['path'], r.get('exception') or r.get('error_title')) for r in run['requests'] if r['status'] not in (200, 302)]
    print(f"{name} non-200/302: {len(bad)}"); [print('   ', x) for x in bad[:40]]
# timing
for name, run in (('A', a), ('B', b)):
    tot = sum(r['ms'] for r in run['requests']); q = sum(r['queries'] for r in run['requests'])
    print(f"{name} total ms={tot} queries={q}")
