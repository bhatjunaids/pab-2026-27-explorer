"""Extract item-wise PAB recommendations (Annexure III detail tables).

Every sub-activity row becomes one record carrying its full hierarchy
(scheme > major component > sub component > activity > sub activity), the
state proposal and the DoSEL recommendation (physical qty, unit cost, amount),
and the coordinator's remark. Subtotal rows are kept too, so validate.py can
re-add the children and compare against every printed subtotal.

Hierarchy is recovered from the table's own structure:
  * the column a "Subtotal of X:" lands in says which level X closes
    (col 3 = activity, col 2 = sub component, col 1 = major component);
  * every item since the previous subtotal of the same-or-higher level
    belongs to X. This survives the merged-cell "blob" pdfplumber produces
    for the first row of some groups, where the header names are unusable.
"""
import json, re
import pdfplumber
from common import STATES, PDF, WORK, num, clean

HEADER = ['Scheme', 'Major\nComponent', 'Sub\nComponent', 'Activity', 'Sub Activity']
CODE_RE = re.compile(r'\(\s*(C\d+)\s*\)')
NUMPFX = re.compile(r'^[\d.]+\s*-\s*')          # UP prefixes names: "3.1.4 - ", "1 - "
LEVEL_OF_COL = {1: 'major', 2: 'sub', 3: 'activity'}
RANK = {'activity': 1, 'sub': 2, 'major': 3}


def strip_num(s):
    return NUMPFX.sub('', s).strip() if s else s


def band_text(page, x0, x1, top, bottom):
    ws = [w for w in page.extract_words(keep_blank_chars=False, use_text_flow=False)
          if w['x0'] >= x0 - 1 and w['x1'] <= x1 + 1 and w['top'] >= top - 1 and w['bottom'] <= bottom + 1]
    return ws


def crop(page, bbox):
    return page.within_bbox(bbox).extract_text() if bbox else None


def rows_for_state(state):
    """Yield (page, row) where row = dict(left_words, cells[4..12] text).
    Row bands come from the per-row cells (cols 4-12); the left four columns are
    read by x-range inside that band so a page-sized merged cell cannot swallow them."""
    a, b = STATES[state]['rec_pages']
    with pdfplumber.open(PDF / f'{state}.pdf') as pdf:
        for pno in range(a, b + 1):
            page = pdf.pages[pno - 1]
            words = page.extract_words()
            for t in page.find_tables():
                data = t.extract()
                if not data or data[0][:5] != HEADER:
                    continue
                hdr = t.rows[0].cells
                # two PRABANDH templates: v1 (13 cols: R/NR column, State Proposal /
                # Recommended by DoSEL over a second header row) and v2 (12 cols, one
                # header row, no R/NR column — Maharashtra 2026-27)
                v2 = len(data[0]) == 12
                NUM0 = 5 if v2 else 6
                x_num = hdr[5][0] if v2 else t.rows[1].cells[6][0]   # start of numeric block
                xs = [c[0] for c in hdr[:5]] + [x_num if v2 else hdr[5][0]]
                for row in t.rows[1 if v2 else 2:]:
                    cells = row.cells
                    per_row = [c for c in cells[4:] if c]
                    if not per_row:
                        continue
                    top = min(c[1] for c in per_row); bot = max(c[3] for c in per_row)
                    left = [w for w in words if w['x1'] <= x_num + 1 and w['top'] >= top - 1 and w['bottom'] <= bot + 1]
                    txt = {i: (crop(page, cells[i]) if cells[i] and cells[i][0] >= x_num - 1 else None) for i in range(NUM0, NUM0 + 7)}
                    # col 4/5 cells can be the tail of a subtotal cell spanning cols c..5
                    c4 = cells[4] if cells[4] and cells[4][0] >= xs[4] - 1 and cells[4][2] <= x_num + 1 else None
                    c5 = None if v2 else (cells[5] if cells[5] and cells[5][0] >= xs[5] - 1 else None)
                    yield pno, dict(xs=xs, left=left, c4=crop(page, c4), c5=crop(page, c5) if c5 else None,
                                    nums=[txt[i] for i in range(NUM0, NUM0 + 6)], remark=clean(txt[NUM0 + 6]),
                                    top=top, v2=v2)


def col_of(x, xs):
    return max(i for i, s in enumerate(xs) if x >= s - 2)


def parse(state):
    events = []            # ('item', rec) | ('sub', rec) in document order
    scheme = None
    for pno, r in rows_for_state(state):
        nums, left, xs = r['nums'], r['left'], r['xs']
        left_sorted = sorted(left, key=lambda w: (round(w['top']), w['x0']))
        first_sub = next((w for w in left_sorted if w['text'] == 'Subtotal'), None)
        if first_sub is not None:
            col = col_of(first_sub['x0'], xs)
            ws = [w for w in left if w['x0'] >= first_sub['x0'] - 1]
            ws.sort(key=lambda w: (round(w['top']), w['x0']))
            name = clean(' '.join(w['text'] for w in ws))
            name = re.sub(r'^Subtotal of\s*', '', name).rstrip(':').strip()
            vals = [num(x) for x in nums]
            nonnull = [v for v in vals if v is not None]
            if len(nonnull) == 2 and vals[2] is None and vals[5] is None:
                p_amt, r_amt = nonnull          # PM / salary rows print amounts only
            else:
                p_amt, r_amt = vals[2], vals[5]
            level = LEVEL_OF_COL.get(col, 'activity' if col == 4 else 'scheme')
            events.append(('sub', dict(state=state, page=pno, col=col, level=level, name=name,
                                       scheme=scheme, p_amt=p_amt, r_amt=r_amt,
                                       p_qty=vals[0], r_qty=vals[3], raw=nums)))
            continue
        for w in left:
            if col_of(w['x0'], xs) == 0 and w['text'] in ('E', 'S', 'T'):
                scheme = w['text']
        c4 = clean(r['c4'])
        vals = [num(x) for x in nums]
        if not c4 and all(v is None for v in vals):
            continue
        if not c4:
            # a row with numbers but no name and no "Subtotal": a grand/scheme total
            events.append(('sub', dict(state=state, page=pno, col=-1, level='total', name='(unnamed total)',
                                       scheme=scheme, p_amt=vals[2], r_amt=vals[5],
                                       p_qty=vals[0], r_qty=vals[3], raw=nums,
                                       left=clean(' '.join(w['text'] for w in left_sorted)))))
            continue
        code = CODE_RE.search(c4)
        rec = dict(
            state=state, page=pno, scheme=scheme,
            subactivity=strip_num(CODE_RE.sub('', c4).strip()),
            code=code.group(1) if code else None, rnr=clean(r['c5']),
            p_qty=vals[0], p_uc=vals[1], p_amt=vals[2],
            r_qty=vals[3], r_uc=vals[4], r_amt=vals[5],
            remark=r['remark'] or '', raw=nums,
        )
        events.append(('item', rec))
    return events


def assign(events):
    """Close groups at each subtotal; fill major/sub/activity names."""
    items = [e for k, e in events if k == 'item']
    subs = []
    open_since = {'activity': 0, 'sub': 0, 'major': 0}   # index into items
    n = 0
    for kind, e in events:
        if kind == 'item':
            n += 1
            continue
        lvl = e['level']
        if lvl not in RANK:
            subs.append(e); continue
        start = open_since[lvl]
        covered = items[start:n]
        for it in covered:
            it.setdefault(lvl, e['name'])
        e['items'] = [start, n]
        subs.append(e)
        # closing a level closes all lower levels too
        for l, rk in RANK.items():
            if rk <= RANK[lvl]:
                open_since[l] = n
    return items, subs


NR_HINT = re.compile(r'\bNR\b|non[- ]?recurring|\(NR\)|- NR|civil|construction|furniture|equipment|repair|toilet|classroom|boundary|lab\b|hardware|smart class|bedding|utensil|almirah|kit\b', re.I)


def infer_rnr(out):
    """v2 sheets (Maharashtra) print no R/NR column. PRABANDH activity codes are a
    national master, so take the flag the same code carries in the v1 states; for
    codes seen nowhere else fall back to the activity/sub-activity wording.
    validate.py then checks the split against the state's own R/NR summary."""
    known = {}
    for st, d in out.items():
        for i in d['items']:
            if i['rnr'] in ('R', 'NR'):
                known.setdefault(i['code'], i['rnr'])
    for st, d in out.items():
        n_code = n_hint = 0
        for i in d['items']:
            if i['rnr'] in ('R', 'NR'):
                continue
            if i['code'] in known:
                i['rnr'] = known[i['code']]; i['rnr_src'] = 'code'; n_code += 1
            else:
                i['rnr'] = 'NR' if NR_HINT.search(f"{i['activity']} {i['subactivity']}") else 'R'
                i['rnr_src'] = 'wording'; n_hint += 1
        if n_code or n_hint:
            print(f'{st}: R/NR inferred for {n_code} items by code, {n_hint} by wording')


def main():
    out = {}
    for st in STATES:
        items, subs = assign(parse(st))
        out[st] = dict(items=items, subtotals=subs)
        miss = {l: sum(1 for i in items if l not in i) for l in ('activity', 'sub', 'major')}
        print(f'{st}: {len(items)} items, {len(subs)} subtotals, '
              f'no-code {sum(1 for i in items if not i["code"])}, unassigned {miss}, '
              f'no-scheme {sum(1 for i in items if not i["scheme"])}')
    infer_rnr(out)
    (WORK / 'items_raw.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main()
