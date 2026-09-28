"""Assemble site/data.json (+ site/schools.json) from the extracted annexures
and the transcribed minutes, and reconcile the minutes' Section II financial
table against the annexures. Fails loudly if any reconciliation breaks,
except for the known discrepancies inside the minutes themselves, which are
recorded and surfaced on the dashboard's Data & checks tab.
"""
import json, re, sys, datetime
from collections import defaultdict, Counter
from common import STATES, WORK, ROOT, SUB_ALIAS
import minutes

SITE = ROOT / 'docs'
key = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
items_raw = json.loads((WORK / 'items_raw.json').read_text())
summ = json.loads((WORK / 'summary_raw.json').read_text())
spill = json.loads((WORK / 'spill_raw.json').read_text())
schools = json.loads((WORK / 'schools_raw.json').read_text())
valid = json.loads((WORK / 'validation.json').read_text())
M = minutes.main()

fails, findings = [], []


def near(a, b, tol=0.6):
    return abs((a or 0) - (b or 0)) <= tol


# ---------- canonical component names (summary-table spelling) ----------------
canon_sub, canon_major = {}, {}
for st in STATES:
    for r in summ[st]['sub_2627'] + summ[st]['sub_2526']:
        if r['name'] != 'TOTAL':
            canon_sub.setdefault(key(r['name']), r['name'])
    for r in summ[st]['major_2627'] + summ[st]['major_2526']:
        if r['name'] != 'TOTAL':
            canon_major.setdefault(key(r['name']), r['name'])


def csub(name):
    k = key(name)
    k = SUB_ALIAS.get(k, k)
    if k in canon_sub:
        return canon_sub[k]
    cand = [c for c in canon_sub if c.startswith(k) or k.startswith(c)]
    if len(cand) == 1:
        return canon_sub[cand[0]]
    fails.append(f'no canonical sub component for {name!r}')
    return name


def cmajor(name):
    return canon_major.get(key(name)) or fails.append(f'no canonical major for {name!r}') or name


# ---------- line items ------------------------------------------------------------
ITEMS = []
for st in STATES:
    for n, i in enumerate(items_raw[st]['items']):
        ITEMS.append(dict(
            st=st, sch=i['scheme'], maj=cmajor(i['major']), sub=csub(i['sub']), act=i['activity'],
            sa=i['subactivity'], code=i['code'], rnr=i['rnr'],
            pq=i['p_qty'], pu=i['p_uc'], pa=round(i['p_amt'], 2),
            rq=i['r_qty'], ru=i['r_uc'], ra=round(i['r_amt'], 2),
            rem=i['remark'], pg=i['page']))

# ---------- minutes vs annexure reconciliation -----------------------------------
recon = []


def rc(st, label, printed, derived, source, tol=0.6, known=None):
    ok = near(printed, derived, tol)
    recon.append(dict(st=st, label=label, printed=printed, derived=round(derived, 2), ok=ok,
                      source=source, note=known))
    if not ok and not known:
        fails.append(f'{st}: minutes {label}: printed {printed} vs annexure {derived:.2f}')


spill_basis = {}
for st in STATES:
    F = M['fin'][st]
    its = [i for i in ITEMS if i['st'] == st]
    sp = {s['scheme']: s for s in spill[st]['schemes']}
    # States print either Annexure II's Balance Remaining (before cancellations)
    # or its Actual Spillover (after). Detect which, per state, from the total.
    basis = 'balance' if near(F['total']['spill'], spill[st]['summary']['balance']) else 'spillover'
    spill_basis[st] = basis
    blabel = 'Annexure II balance remaining' if basis == 'balance' else 'Annexure II actual spill-over (net of cancellations)'
    for sch in 'EST':
        row = F['rows'][sch]
        r = sum(i['ra'] for i in its if i['sch'] == sch and i['rnr'] == 'R')
        nr = sum(i['ra'] for i in its if i['sch'] == sch and i['rnr'] == 'NR')
        rc(st, f'{sch} recurring (fresh)', row['rec'], r, 'Annexure III line items')
        rc(st, f'{sch} non-recurring (fresh)', row['nr'], nr, 'Annexure III line items')
        rc(st, f'{sch} spill-over', row['spill'], sp[sch][basis], blabel)
        rc(st, f'{sch} grand total', row['total'], r + nr + sp[sch][basis], 'Annexures II + III')
    fln = sum(i['ra'] for i in its if i['sub'].startswith('Foundational Literacy'))
    rc(st, 'FLN approved', F['fln'], fln, 'Annexure III FLN sub component')
    tot = F['total']
    rc(st, 'Total fresh approval', tot['fresh'], sum(i['ra'] for i in its), 'Annexure III line items')
    # funding identity: opening balance + central + state = grand total
    for which in [w for w in ('para_i', 'para_ii') if w in F]:
        p = F[which]
        s_ = p['opening'] + p['central'] + p['state']
        known = None
        if which == 'para_i' and 'para_ii' in F and not near(s_, tot['total'], 2):
            known = (f'Para (i) of Section II gives central {p["central"]:,.2f} + state {p["state"]:,.2f} '
                     f'+ opening balance {p["opening"]:,.2f} = {s_:,.2f} lakh, which does not equal the '
                     f'approved total of {tot["total"]:,.2f} lakh. Para (ii) of the same section '
                     f'(central {F["para_ii"]["central"]:,.0f}, state {F["para_ii"]["state"]:,.0f} lakh) does add up.')
            findings.append(dict(st=st, severity='discrepancy', page=F['page'], text=known))
        rc(st, f'Funding identity, {which.replace("_", " ")} (opening + central + state = total)',
           tot['total'], s_, 'Minutes Section II', tol=2.0, known=known)
    p = F.get('para_ii', F['para_i'])
    share = p['central'] / (p['central'] + p['state'])
    rc(st, 'Central share of new releases (%)', 60.0, share * 100, 'Minutes para (ii)', tol=0.05)

findings.append(dict(st='UP', severity='discrepancy', page=5,
    text='Para 1 of the UP minutes says government institutions hold 52.3% of enrolment and 39.1% of teachers; '
         'para 3 says government schools hold 39.1% of enrolment and unaided schools 51.7%. '
         'The dashboard uses para 3 (39.1%), which is internally consistent with the unaided share.'))
_bal = [STATES[s]['name'] for s in STATES if spill_basis[s] == 'balance']
_net = [STATES[s]['name'] for s in STATES if spill_basis[s] == 'spillover']
findings.append(dict(st='All', severity='definition', page=None,
    text='The minutes do not define "spill over" the same way. ' + ', '.join(_bal) + ' print Annexure II’s Balance Remaining '
         '(approved − completed − surrendered, before cancellations); ' + ', '.join(_net) + ' print its Actual Spillover, net of the '
         'cancelled 2018-19 to 2020-21 works. Each state’s total is reconciled on its own basis; the Spill-over tab shows both measures.'))
if 'MH' in STATES:
    findings.append(dict(st='MH', severity='definition', page=5,
        text='The Maharashtra PAB approvals are interim: the Secretary stated that Samagra Shiksha 3.0 is pending approval and an '
             'additional PAB will supplement these approvals.'))
    findings.append(dict(st='MH', severity='definition', page=None,
        text='Maharashtra’s recommendation sheet uses a newer PRABANDH template with no Recurring / Non-recurring column. Each line '
             'item’s flag is taken from the same national activity code in the other states (or, for codes seen nowhere else, '
             'from its wording), and the resulting split reconciles exactly with Maharashtra’s own recurring and non-recurring '
             'totals for every major component.'))
    findings.append(dict(st='MH', severity='definition', page=4,
        text='The Maharashtra minutes’ index lists an Annexure IV school list, but the PDF supplied ends at Annexure III, so '
             'Maharashtra has no school-wise works on the Works & schools tab.'))
findings.append(dict(st='All', severity='definition', page=None,
    text='PRABANDH names the vocational sub component "Introduction of Skill Education at Secondary and higher Secondary" '
         'in line items and "Introduction of Vocational Education…" in its summary table. They are the same '
         'money (totals match to the paisa) and are shown under the summary-table name.'))
if 'UP' in STATES:
    findings.append(dict(st='UP', severity='definition', page=None,
        text='UP’s "Opening of New School" line items are rolled into "Opening of New / Upgraded Schools" '
             'in the PRABANDH summary table; the dashboard follows the summary table.'))

# ---------- school lists ------------------------------------------------------------
school_rows, sch_masters, sch_districts = [], [], []
mi, di = {}, {}
check_sch = []
for st, rows in schools.items():
    agg = defaultdict(float)
    for r in rows:
        mk = (st, r['scheme'], r['activity'], r['master'])
        if mk not in mi:
            mi[mk] = len(sch_masters)
            sch_masters.append(dict(st=st, sch={'Elementary Education': 'E', 'Secondary Education': 'S', 'Teacher Education': 'T'}.get(r['scheme']),
                                    maj=r['major'], sub=r['sub'], act=r['activity'], m=r['master']))
        if r['udise'] is None:          # 'N/A' — approved without a school list
            continue
        agg[(r['scheme'][0], key(r['activity']), key(r['master']))] += r['qty'] or 0
        dk = (st, r['district'] or '(state level)')
        if dk not in di:
            di[dk] = len(sch_districts)
            sch_districts.append(dict(st=st, d=dk[1]))
        school_rows.append([mi[mk], di[dk], r['udise'], r['school'], r['qty']])
    # list quantity vs recommended physical quantity, by scheme + activity + sub-activity
    for i in ITEMS:
        if i['st'] != st or i['rnr'] != 'NR' or not i['rq']:
            continue
        got = agg.get((i['sch'], key(i['act']), key(i['sa'])))
        check_sch.append(dict(st=st, code=i['code'], sa=i['sa'], act=i['act'], rq=i['rq'], listed=got,
                              ok=(got is None) or near(got, i['rq'], 0.01)))
bad = [c for c in check_sch if c['listed'] is not None and not c['ok']]
for b in bad:
    fails.append(f"{b['st']} school list {b['sa']} ({b['act']}): listed {b['listed']} vs recommended {b['rq']}")

# ---------- assemble ------------------------------------------------------------------
enrol = {i['id']: i for i in M['indicators']}['enrolment']['values']
schools_n = {i['id']: i for i in M['indicators']}['schools']['values']
state_meta = {st: dict(name=STATES[st]['name'], short=st, abbr=STATES[st]['abbr'], **M['meeting'][st],
                       enrolment=enrol[st]['v'], schools=schools_n[st]['v']) for st in STATES}

checks = dict(
    item_checks={st: dict(n_items=valid['report'][st]['n_items'], checks=valid['report'][st]['checks'],
                          failed=valid['report'][st]['failed'],
                          arith_flags=len(valid['report'][st]['arith_flags'])) for st in STATES},
    spill_rows={st: len(spill[st]['items']) for st in STATES},
    school_rows={st: len(v) for st, v in schools.items()},
    school_list_matches=sum(1 for c in check_sch if c['listed'] is not None and c['ok']),
    school_list_nolist=[dict(st=c['st'], sa=c['sa'], rq=c['rq']) for c in check_sch if c['listed'] is None],
    recon=recon, findings=findings,
)

data = dict(
    generated=datetime.date.today().isoformat(),
    states=state_meta,
    items=ITEMS,
    summary={st: dict(plan_vs_rec=summ[st]['plan_vs_rec'], innov=(summ[st]['innov_mmmer'] or [None])[0],
                      glance=summ[st]['glance_2526'], major_2526=summ[st]['major_2526'],
                      sub_2526=summ[st]['sub_2526'], major_2627=summ[st]['major_2627'],
                      sub_2627=summ[st]['sub_2627']) for st in STATES},
    spill={st: dict(summary=spill[st]['summary'], schemes=spill[st]['schemes'], pivot=spill[st]['pivot'],
                    items=[{k: v for k, v in i.items() if k not in ('state',)} for i in spill[st]['items']])
           for st in STATES},
    school_masters=sch_masters,
    school_districts=sch_districts,
    school_agg=None,
    minutes=dict(indicators=M['indicators'], governance=M['governance'], directions=M['directions'], fin=M['fin']),
    checks=checks,
)
# district x master aggregate (small) goes in data.json; the per-school list in schools.json
agg = defaultdict(lambda: [0, 0.0])
for m, d, u, n, q in school_rows:
    a = agg[(m, d)]; a[0] += 1; a[1] += q or 0
data['school_agg'] = [[m, d, c, q] for (m, d), (c, q) in agg.items()]

if fails:
    for f in fails:
        print('FAIL', f)
    sys.exit(1)

SITE.mkdir(exist_ok=True)
(SITE / 'data.json').write_text(json.dumps(data, separators=(',', ':'), ensure_ascii=False))
(SITE / 'schools.json').write_text(json.dumps(school_rows, separators=(',', ':'), ensure_ascii=False))
print(f"items {len(ITEMS)}, recon {len(recon)} ({sum(not r['ok'] for r in recon)} known discrepancies), "
      f"school list matches {checks['school_list_matches']}, findings {len(findings)}")
print('data.json', (SITE / 'data.json').stat().st_size // 1024, 'KB; schools.json',
      (SITE / 'schools.json').stat().st_size // 1024, 'KB')
