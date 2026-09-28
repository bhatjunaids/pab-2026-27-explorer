import re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / 'pdfs'
WORK = ROOT / 'work'
DATA = ROOT / 'data'

# page ranges located by classifying every page (see README)
STATES = {
    'Haryana': dict(name='Haryana', abbr='HR', rec_pages=(36, 101), spill_pages=(15, 26), school_pages=None),
    'MP': dict(name='Madhya Pradesh', abbr='MP', rec_pages=(40, 91), spill_pages=(17, 29), school_pages=(94, 377)),
    'UP': dict(name='Uttar Pradesh', abbr='UP', rec_pages=(42, 94), spill_pages=(17, 31), school_pages=(97, 1893)),
    'KN': dict(name='Karnataka', abbr='KA', rec_pages=(39, 87), spill_pages=(19, 29), school_pages=(89, 226)),
    'MH': dict(name='Maharashtra', abbr='MH', rec_pages=(37, 96), spill_pages=(16, 27), school_pages=None),
    'TG': dict(name='Telangana', abbr='TG', rec_pages=(36, 84), spill_pages=(15, 26), school_pages=(86, 592)),
}


def clean(s):
    return re.sub(r'\s+', ' ', s.replace('\n', ' ')).strip() if s is not None else None


def num(s):
    """Parse a PRABANDH number. Cells sometimes wrap mid-number
    ('179.7973\\n4'), so whitespace inside the cell is removed first."""
    if s is None:
        return None
    t = re.sub(r'\s+', '', str(s)).replace(',', '')
    if t in ('', '-'):
        return None
    try:
        return float(t)
    except ValueError:
        return None

# Sub-component names differ between the item subtotals and the summary table.
# Verified by the totals reconciling exactly once aliased (validate.py).
SUB_ALIAS = {
    'introductionofskilleducationatsecondaryandhighersecondary':
        'introductionofvocationaleducationatsecondaryandhighersecondary',
    'openingofnewschool': 'openingofnewupgradedschools',
    # spill-over names DAJGUA / PM-JANMAN per stage; the summary table has one row each
    'dajguaelemenary': 'dajgua', 'dajguasecondary': 'dajgua',
    'pmjanmanelemenary': 'pmjanman', 'pmjanmansecondary': 'pmjanman',
}
