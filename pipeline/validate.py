"""Cross-check extracted line items against every independent total the PDFs print.

  1. every printed subtotal == sum of the items it closes (proposal and recommendation)
  2. items summed by major component == 'Major Component wise - State Plan' table
  3. items summed by sub component   == 'Sub Component wise - State Plan' table
  4. items summed by scheme          == 'State Plan VS Recommendation' table (+ FLN row)
  5. items split R / NR              == recurring / non-recurring columns of (2)
  6. qty x unit cost ~= amount on every item (flags, does not fail: PRABANDH
     prints unit cost rounded to 5 dp, and a few lines are lump sums)
Exits non-zero on any failure of 1-5.
"""
import json, re, sys
from collections import defaultdict
from common import STATES, WORK, SUB_ALIAS

items_all = json.loads((WORK / 'items_raw.json').read_text())
summ = json.loads((WORK / 'summary_raw.json').read_text())


def key(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def close(a, b, n=1):
    return abs((a or 0) - (b or 0)) <= 0.011 * max(n, 1) + 0.02


fails, notes = [], []
report = {}
for st in STATES:
    items = items_all[st]['items']
    subs = items_all[st]['subtotals']
    S = summ[st]
    rep = report[st] = dict(checks=0, failed=0)

    def check(label, got, want, n=1):
        rep['checks'] += 1
        if not close(got, want, n):
            rep['failed'] += 1
            fails.append(f'{st}: {label}: items {got:.2f} vs printed {want:.2f} (diff {got - want:+.2f})')

    # 1. subtotals
    for s in subs:
        if 'items' not in s:
            continue
        a, b = s['items']
        cov = items[a:b]
        for fld in ('p_amt', 'r_amt'):
            if s[fld] is None:
                continue
            got = sum(i[fld] or 0 for i in cov)
            check(f"subtotal[{s['level']}] '{s['name']}' p{s['page']} {fld}", got, s[fld], len(cov))

    # 2 & 5. major component
    agg = defaultdict(lambda: defaultdict(float))
    for i in items:
        m = key(i['major'])
        for fld in ('p_amt', 'r_amt'):
            agg[m][fld] += i[fld] or 0
            agg[m][fld + ('_nr' if i['rnr'] == 'NR' else '_r')] += i[fld] or 0
    seen = set()
    for row in S['major_2627']:
        if row['name'] == 'TOTAL':
            check('grand total proposed', sum(i['p_amt'] or 0 for i in items), row['p_total'], len(items))
            check('grand total recommended', sum(i['r_amt'] or 0 for i in items), row['r_total'], len(items))
            continue
        k = key(row['name']); seen.add(k)
        g = agg.get(k, {})
        check(f"major '{row['name']}' proposed", g.get('p_amt', 0), row['p_total'], 30)
        check(f"major '{row['name']}' recommended", g.get('r_amt', 0), row['r_total'], 30)
        check(f"major '{row['name']}' recommended recurring", g.get('r_amt_r', 0), row['r_r'], 30)
        check(f"major '{row['name']}' recommended non-recurring", g.get('r_amt_nr', 0), row['r_nr'], 30)
    for k in agg:
        if k not in seen:
            fails.append(f'{st}: major component {k} in items but not in summary table')

    # 3. sub component (names in item subtotals vary slightly: '-FS' vs '- FS')
    agg = defaultdict(lambda: defaultdict(float))
    for i in items:
        agg[key(i['sub'])]['p'] += i['p_amt'] or 0
        agg[key(i['sub'])]['r'] += i['r_amt'] or 0
    tbl = {key(r['name']): r for r in S['sub_2627'] if r['name'] != 'TOTAL'}
    # map item sub-component keys onto table keys
    alias = {}
    for k in agg:
        if k in tbl:
            alias[k] = k
        elif SUB_ALIAS.get(k) in tbl:
            alias[k] = SUB_ALIAS[k]
        else:
            cand = [t for t in tbl if t.startswith(k) or k.startswith(t)]
            if len(cand) == 1:
                alias[k] = cand[0]
            else:
                fails.append(f'{st}: sub component "{k}" not matched to summary table ({cand})')
    merged = defaultdict(lambda: defaultdict(float))
    for k, v in agg.items():
        if k in alias:
            for f, x in v.items():
                merged[alias[k]][f] += x
    for k, row in tbl.items():
        g = merged.get(k, {})
        check(f"sub '{row['name']}' proposed", g.get('p', 0), row['p_total'], 30)
        check(f"sub '{row['name']}' recommended", g.get('r', 0), row['r_total'], 30)
    rep['sub_alias'] = {k: v for k, v in alias.items() if k != v}

    # 4. scheme totals
    pv = {key(r['name']): r for r in S['plan_vs_rec']}
    sch = defaultdict(lambda: defaultdict(float))
    for i in items:
        sch[i['scheme']]['p'] += i['p_amt'] or 0
        sch[i['scheme']]['r'] += i['r_amt'] or 0
        if key(i['sub']).startswith('foundationalliteracyandnumeracy'):
            sch['FLN']['p'] += i['p_amt'] or 0
            sch['FLN']['r'] += i['r_amt'] or 0
    fln = pv['foundationalliteracyandnumeracy']
    check('FLN proposed', sch['FLN']['p'], fln['p_total'], 30)
    check('FLN recommended', sch['FLN']['r'], fln['r_total'], 30)
    for code, nm in (('E', 'elementaryeducation'), ('S', 'secondaryeducation'), ('T', 'teachereducation')):
        row = pv[nm]
        extra = fln if code == 'E' else None       # table lists FLN separately from Elementary
        want_p = row['p_total'] + (extra['p_total'] if extra else 0)
        want_r = row['r_total'] + (extra['r_total'] if extra else 0)
        check(f'scheme {code} proposed', sch[code]['p'], want_p, 100)
        check(f'scheme {code} recommended', sch[code]['r'], want_r, 100)

    # 6. arithmetic
    bad = []
    for i in items:
        for side in ('p', 'r'):
            q, u, a = i[f'{side}_qty'], i[f'{side}_uc'], i[f'{side}_amt']
            if q is None or u is None or a is None:
                continue
            calc = q * u
            if abs(calc - a) > max(0.05, 0.005 * abs(a)) + q * 0.000005:
                bad.append(dict(code=i['code'], name=i['subactivity'], side=side, qty=q, uc=u, amt=a, calc=round(calc, 2)))
    rep['arith_flags'] = bad
    rep['n_items'] = len(items)

for st, r in report.items():
    print(f"{st}: {r['n_items']} items, {r['checks']} checks, {r['failed']} failed, "
          f"{len(r['arith_flags'])} qty x unit-cost flags, sub aliases {r['sub_alias']}")
for f in fails:
    print('FAIL', f)
(WORK / 'validation.json').write_text(json.dumps(dict(report=report, fails=fails), indent=1))
sys.exit(1 if fails else 0)
