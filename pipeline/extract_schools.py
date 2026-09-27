"""Extract Annexure IV — the school-wise list behind each approved non-recurring
work (UDISE code, school, district, quantity), grouped under scheme / major /
sub component / activity / activity-master (sub-activity) headers.

Haryana has no Annexure IV (no fresh non-recurring approvals in 2026-27).
validate_schools() in build_data.py compares list quantities with the
recommended physical quantity of the matching NR line item.
"""
import json, os, re, sys
from multiprocessing import Pool
import pdfplumber
from common import STATES, PDF, WORK, clean


def pages(args):
    state, a, b = args
    out = []
    with pdfplumber.open(PDF / f'{state}.pdf') as pdf:
        for pno in range(a, b + 1):
            for t in pdf.pages[pno - 1].extract_tables():
                for r in t:
                    c = [clean(x) if x is not None else None for x in r]
                    out.append((pno, c))
    return out


def parse(state):
    a, b = STATES[state]['school_pages']
    chunks = [(state, s, min(s + 39, b)) for s in range(a, b + 1, 40)]
    with Pool(min(8, os.cpu_count() or 4)) as pool:
        rows = [x for part in pool.map(pages, chunks) for x in part]
    recs, ctx, master, bad = [], {}, None, []
    for pno, c in rows:
        nn = [x for x in c if x is not None]
        if not nn:
            continue
        if nn[0] == 'Scheme :':
            d = dict(zip(nn[0::2], nn[1::2]))
            new = dict(scheme=d.get('Scheme :'), major=d.get('Major :'),
                       sub=d.get('Sub Component :'), activity=d.get('Activity :'))
            # every header opens a new master group; its name can sit on the
            # next page (vertically centred merged cell), so rows seen before
            # the name are back-filled when it appears
            master = None
            ctx = new
            continue
        if nn[0] == 'Activity Master Details Name':
            continue
        # data row: [master?] udise school district qty
        if len(nn) == 2 and nn[1] == 'N/A':
            # activity approved without a school list (e.g. state-level items)
            recs.append(dict(page=pno, **ctx, master=nn[0], udise=None, school=None, district=None, qty=None))
            master = nn[0]
            continue
        if len(nn) == 5:
            m, udise, school, dist, qty = nn
        elif len(nn) == 4 and re.match(r'^[0-9A-Z]{8,}$', nn[0]) and any(ch.isdigit() for ch in nn[0]):
            m, (udise, school, dist, qty) = '', nn
        elif ctx and len(c) == 12 and not any(c[4:6]):
            # the group header wrapped onto the next page: append the tails
            if c[7]: ctx['sub'] += ' ' + c[7]
            if c[10]: ctx['activity'] += ' ' + c[10]
            continue
        else:
            bad.append((pno, c)); continue
        if m:
            master = m
            for prev in reversed(recs):
                if prev['master'] is not None or prev['activity'] != ctx['activity']:
                    break
                prev['master'] = m
        # TEI rows carry institution ids (SCERT000109, DIET codes) instead of UDISE
        if udise in ('N/A', ''):
            udise = None
        recs.append(dict(page=pno, **ctx, master=master, udise=udise, school=school,
                         district=dist, qty=float(qty) if qty else None))
    for b_ in bad[:15]:
        print('  unparsed', state, b_)
    print(f'  {state}: {len(bad)} unparsed rows')
    return recs


def main():
    res = {}
    for st, cfg in STATES.items():
        if not cfg['school_pages']:
            continue
        res[st] = parse(st)
        dists = {r['district'] for r in res[st]}
        print(f'{st}: {len(res[st])} school rows, {len(dists)} districts, '
              f'{len({(r["activity"], r["master"]) for r in res[st]})} activity-masters')
    (WORK / 'schools_raw.json').write_text(json.dumps(res))


if __name__ == '__main__':
    main()
