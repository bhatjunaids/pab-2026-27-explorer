"""Extract Annexure II — spill-over of non-recurring works sanctioned in earlier years.

Outputs per state: the dashboard summary, scheme table, major-component pivot,
and every sub-activity row (approved / completed / cancelled / balance). The
'Spill over' column in the minutes' financial table is the *Balance Remaining*
(before cancellations), not 'Actual Spillover' — both are kept.
Row totals are checked against the scheme table and the pivot.
"""
import json, re, sys
from collections import defaultdict
import pdfplumber
from common import STATES, PDF, WORK, num, clean, SUB_ALIAS

CODE_RE = re.compile(r'\(\s*(C\d+)\s*\)')
SUMM = json.loads((WORK / 'summary_raw.json').read_text())
key = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
SUBS = {key(r['name']) for st in SUMM.values() for r in st['sub_2526'] + st['sub_2627']} | set(SUB_ALIAS)
SCHEMES = {'Elementary Education': 'E', 'Secondary Education': 'S', 'Teacher Education': 'T'}


def extract(state):
    a, b = STATES[state]['spill_pages']
    out = dict(summary=None, schemes=[], pivot=[], items=[])
    section = None
    scheme = sub = act = None
    pend, pend_sub = [], []
    majors = {}
    with pdfplumber.open(PDF / f'{state}.pdf') as pdf:
        for pno in range(a, b + 1):
            for t in pdf.pages[pno - 1].extract_tables():
                for r in t:
                    c = [clean(x) for x in r if x not in (None, '')]
                    if not c:
                        continue
                    if c[0] in ('Dashboard Summary', 'Pivot Summary', 'Sub Activity Wise Data'):
                        section = c[0]; continue
                    if section == 'Dashboard Summary':
                        vals = [num(x) for x in c]
                        if len(c) == 6 and all(v is not None for v in vals):
                            out['summary'] = dict(zip(['approved', 'completed', 'surrender', 'balance', 'cancelled', 'spillover'], vals))
                        elif c[0] in SCHEMES and len(c) == 7:
                            out['schemes'].append(dict(scheme=SCHEMES[c[0]], **dict(zip(
                                ['approved', 'completed', 'surrender', 'balance', 'cancelled', 'spillover'], map(num, c[1:])))))
                    elif section == 'Pivot Summary':
                        if len(c) == 9 and c[1] in SCHEMES:
                            majors.setdefault(SCHEMES[c[1]], set()).add(c[0])
                            out['pivot'].append(dict(major=c[0], scheme=SCHEMES[c[1]], n_act=num(c[2]), **dict(zip(
                                ['approved', 'completed', 'surrender', 'balance', 'cancelled', 'spillover'], map(num, c[3:])))))
                    elif section == 'Sub Activity Wise Data':
                        if len(c) == 1 and c[0] in SCHEMES:
                            scheme = SCHEMES[c[0]]; pend.clear(); continue
                        if len(r) == 13:          # first page carries an empty merged column
                            r = [r[0]] + r[2:]
                        if len(r) != 12:
                            continue
                        cells = [clean(x) if x is not None else None for x in r]
                        cells = [cells[0], None] + cells[1:]
                        if cells[0] == 'Major Component' or cells[2] == 'Sub Component':
                            continue
                        blobby = lambda x: x and (CODE_RE.search(x) or re.search(r'\d+\.\d\d', x) or x in ('Sub Component', 'Activity'))
                        sa = cells[4] or ''
                        subs_here = [x for x in cells[:5] if x and x.startswith('Subtotal')]
                        # a merged blob can repeat the subtotal with its numbers inlined; prefer the clean cell
                        sub_m = next((x for x in subs_here if not re.search(r'\d+\.\d\d', x)), None)
                        if subs_here and not sub_m:
                            raise SystemExit(f'{state} p{pno}: only a blob subtotal: {subs_here}')
                        if sub_m:
                            nm = re.sub(r'^Subtotal\s*\((.*)\)$', r'\1', sub_m).strip()
                            # a subtotal naming a major component closes every open row
                            if key(nm) in SUBS or (sub and key(nm) == key(sub)):
                                for it in pend_sub:
                                    it['sub'] = nm
                                pend_sub.clear()
                            if nm in majors.get(scheme, ()):
                                for it in pend:
                                    it['major'] = nm
                                pend.clear()
                            continue
                        if cells[2] and not blobby(cells[2]): sub = cells[2]
                        if cells[3] and not blobby(cells[3]): act = cells[3]
                        code = CODE_RE.search(sa)
                        if not code:
                            continue
                        v = [num(x) for x in cells[5:13]]
                        it = dict(
                            state=state, page=pno, scheme=scheme, major=None, sub=sub, activity=act,
                            subactivity=clean(CODE_RE.sub('', sa)), code=code.group(1),
                            appr_qty=v[0], appr_amt=v[1], done_qty=v[2], done_amt=v[3],
                            surr_qty=v[4], surr_amt=v[5], cancelled=v[6], spillover=v[7])
                        out['items'].append(it)
                        pend.append(it)
                        pend_sub.append(it)
    return out


def main():
    res, fails = {}, []
    for st in STATES:
        d = res[st] = extract(st)
        agg = defaultdict(lambda: defaultdict(float))
        for i in d['items']:
            for f in ('appr_amt', 'done_amt', 'cancelled', 'spillover'):
                agg[i['scheme']][f] += i[f] or 0
                agg[(i['scheme'], i['major'])][f] += i[f] or 0
        n = 0
        for s in d['schemes']:
            for f, g in (('approved', 'appr_amt'), ('completed', 'done_amt'), ('cancelled', 'cancelled'), ('spillover', 'spillover')):
                n += 1
                got = agg[s['scheme']][g]
                if abs(got - s[f]) > 0.05 + 0.006 * len(d['items']):
                    fails.append(f"{st} spill scheme {s['scheme']} {f}: rows {got:.2f} vs printed {s[f]:.2f}")
        for p in d['pivot']:
            for f, g in (('approved', 'appr_amt'), ('completed', 'done_amt'), ('cancelled', 'cancelled'), ('spillover', 'spillover')):
                n += 1
                got = agg[(p['scheme'], p['major'])][g]
                if abs(got - p[f]) > 0.05 + 0.006 * 40:
                    fails.append(f"{st} spill pivot {p['scheme']}/{p['major']} {f}: rows {got:.2f} vs printed {p[f]:.2f}")
        tot = d['summary']
        n += 1
        if abs(sum(s['balance'] for s in d['schemes']) - tot['balance']) > 0.05:
            fails.append(f'{st} spill: scheme balances do not add to dashboard balance')
        un = [i for i in d['items'] if not i['major']]
        for i in d['items']:
            if key(i['sub']) not in SUBS:
                fails.append(f"{st}: spill row {i['subactivity']} has unknown sub component {i['sub']}")
        if un:
            fails.append(f'{st}: {len(un)} spill rows without a major component, e.g. {un[0]["subactivity"]} p{un[0]["page"]}')
        print(f"{st}: {len(d['items'])} spill rows, {n} checks; balance {tot['balance']:.2f} lakh, actual spillover {tot['spillover']:.2f}")
    for f in fails:
        print('FAIL', f)
    (WORK / 'spill_raw.json').write_text(json.dumps(res, indent=1))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
