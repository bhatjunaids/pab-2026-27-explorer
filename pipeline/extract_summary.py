"""Extract the PRABANDH summary tables that open Annexure III:

  plan_vs_rec     State Plan vs Recommendation 2026-27 (FLN / Elem / Sec / TE)
  innov_mmmer     Innovation and MMMER share of the recommendation
  glance_2526     Summary at a Glance 2025-26 (approved / spent / balance)
  major_2526      Major-component approval & expenditure 2025-26
  sub_2526        Sub-component approval & expenditure 2025-26
  major_2627      Major-component proposal & recommendation 2026-27
  sub_2627        Sub-component proposal & recommendation 2026-27
"""
import json
import pdfplumber
from common import STATES, PDF, WORK, num, clean

SECTIONS = [
    ('State Plan VS Recommendation', 'plan_vs_rec'),
    ('Innovation and MMMER', 'innov_mmmer'),
    ('Summary at a Glance', 'glance_2526'),
    ('Major Component wise Approval', 'major_2526'),
    ('Sub Component wise Approval', 'sub_2526'),
    ('Major Component wise - State Plan', 'major_2627'),
    ('Sub Component wise - State Plan', 'sub_2627'),
]


def compact(r):
    return [clean(c) for c in r if c not in (None, '')]


def extract(state):
    a = STATES[state]['rec_pages'][0]
    out = {k: [] for _, k in SECTIONS}
    cur = None
    with pdfplumber.open(PDF / f'{state}.pdf') as pdf:
        for pno in range(a - 8, a):
            for t in pdf.pages[pno - 1].extract_tables():
                for r in t:
                    raw = [c for c in r if c not in (None, '')]
                    c = compact(r)
                    if not c:
                        continue
                    hit = next((k for s, k in SECTIONS if c[0].startswith(s)), None)
                    if hit:
                        cur = hit; continue
                    if cur is None:
                        continue
                    if cur == 'innov_mmmer':
                        vals = [num(x) for x in raw]
                        if all(v is not None for v in vals) and len(vals) == 7:
                            out[cur].append(dict(zip(['rec_r', 'rec_nr', 'rec_total', 'innovation', 'mmmer',
                                                      'pct_innovation', 'pct_mmmer'], vals)))
                        continue
                    if not c[0].isdigit():
                        continue
                    name = c[1]
                    vals = [num(x) for x in raw[2:]]
                    if cur == 'plan_vs_rec':
                        keys = ['p_r', 'p_nr', 'p_total', 'r_r', 'r_nr', 'r_total']
                    elif cur == 'glance_2526':
                        keys = ['appr_r', 'appr_nr', 'appr_total', 'exp_r', 'exp_nr', 'exp_total',
                                'surrender', 'bal_r', 'bal_nr', 'bal_total']
                    elif cur in ('major_2526', 'sub_2526'):
                        keys = ['appr_r', 'appr_nr', 'appr_total', 'appr_pct', 'exp_r', 'exp_nr', 'exp_total', 'exp_pct']
                    else:
                        keys = ['p_r', 'p_nr', 'p_total', 'p_pct', 'r_r', 'r_nr', 'r_total', 'r_pct']
                    if len(vals) != len(keys) or any(v is None for v in vals):
                        raise SystemExit(f'{state} p{pno} {cur}: cannot parse {r}')
                    out[cur].append(dict(name=name, **dict(zip(keys, vals))))
    return out


def main():
    res = {st: extract(st) for st in STATES}
    for st, d in res.items():
        print(st, {k: len(v) for k, v in d.items()})
    (WORK / 'summary_raw.json').write_text(json.dumps(res, indent=1))


if __name__ == '__main__':
    main()
