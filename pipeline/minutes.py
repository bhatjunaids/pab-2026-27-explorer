"""Hand-transcribed content of Section I / II of the three PAB minutes.

Haryana's minutes have a text layer; MP's and UP's are scans whose OCR is
unreliable ('B' for 8, 'Z' for 2), so every MP/UP figure here was read off the
rendered page image. `page` is the PDF page number (not the printed folio).

Each indicator: id, group, label, unit, better ('high'/'low'/None), and per
state {'v': 2024-25 or current value, 'prev': 2023-24 value, 'page', 'note'}.
None means the minutes do not report it for that state.
"""
import json
from common import DATA

MEETING = {
    'Haryana': dict(date='2026-06-05', districts=22, aspirational=1, aspirational_names='Nuh', minutes_pages='5-13'),
    'MP': dict(date='2026-06-03', districts=55, aspirational=8,
               aspirational_names='Barwani, Chhatarpur, Damoh, Guna, Rajgarh, Singrauli, Vidisha West, Nimar (Khargone)',
               minutes_pages='5-13'),
    'UP': dict(date='2026-05-14', districts=75, aspirational=8, aspirational_names=None, minutes_pages='5-13'),
}

# Section II financial table, as printed (Rs lakh)
FIN = {
    'Haryana': dict(page=11,
        rows={'E': dict(spill=12213.44, rec=49362.54, nr=0.00, fresh=49362.54, total=61575.98),
              'S': dict(spill=55592.70, rec=42106.30, nr=0.00, fresh=42106.30, total=97699.00),
              'T': dict(spill=1382.11, rec=3244.75, nr=0.00, fresh=3244.75, total=4626.86)},
        total=dict(spill=69188.25, rec=94713.59, nr=0.00, fresh=94713.59, total=163901.84),
        fln=5302.37,
        para_i=dict(central=77282.95, state=51521.97, opening=35096.92),
        para_ii=dict(total=163901.84, opening=35096.92, central=77282.95, state=51521.97)),
    'MP': dict(page=12,
        rows={'E': dict(spill=67473.9700, rec=376390.9735, nr=32405.1380, fresh=408796.1115, total=476270.0815),
              'S': dict(spill=77261.3600, rec=97322.3501, nr=7974.4000, fresh=105296.7501, total=182558.1101),
              'T': dict(spill=15785.7200, rec=6464.8850, nr=0.0, fresh=6464.8850, total=22250.6050)},
        total=dict(spill=160521.0500, rec=480178.2086, nr=40379.5380, fresh=520557.7466, total=681078.7966),
        fln=26147.31450,
        para_i=dict(central=337496.00, state=224997.33, opening=118859.00),
        para_ii=dict(total=681078.0, opening=118859.0, central=337331.0, state=224887.0)),
    'UP': dict(page=12,
        rows={'E': dict(spill=104635.60, rec=726996.39, nr=162899.63, fresh=889896.02, total=994531.62),
              'S': dict(spill=34822.06, rec=119001.86, nr=32452.67, fresh=151454.53, total=186276.59),
              'T': dict(spill=11952.45, rec=17270.99, nr=422.48, fresh=17693.47, total=29645.92)},
        total=dict(spill=151410.11, rec=863269.24, nr=195774.78, fresh=1059044.02, total=1210454.13),
        fln=85487.14,
        para_i=dict(central=575850.00, state=383900.00, opening=419115.84),
        para_ii=dict(total=1210454.0, opening=419116.0, central=474803.0, state=316535.0)),
}

I = []


def ind(id, group, label, unit, better, **states):
    I.append(dict(id=id, group=group, label=label, unit=unit, better=better, values=states))


def v(val, prev=None, page=None, note=None):
    return dict(v=val, prev=prev, page=page, note=note)


# ---- State profile (UDISE+ 2024-25 as quoted) ---------------------------------
ind('schools', 'Profile', 'Total schools (all managements)', 'count', None,
    Haryana=v(23494, page=5), MP=v(122120, page=5), UP=v(262358, page=5))
ind('govt_school_pct', 'Profile', 'Government schools, % of all schools', '%', None,
    Haryana=v(61, page=5), MP=v(75.5, page=5, note='92,250 govt; 550 aided (0.5%); 28,212 unaided (23.1%)'),
    UP=v(52.3, page=5, note='3.1% aided, 39.8% unaided'))
ind('enrolment', 'Profile', 'Total enrolment, pre-primary to XII', 'count', None,
    Haryana=v(5769330, page=5), MP=v(15172607, page=5), UP=v(42789347, page=5))
ind('teachers', 'Profile', 'Total teachers', 'count', None,
    Haryana=v(263942, page=5), MP=v(717493, page=5), UP=v(1615427, page=5))
ind('govt_enrol_pct', 'Profile', 'Government schools’ share of enrolment', '%', 'high',
    Haryana=v(38, page=6, note='61% of schools are government but carry only 38% of enrolment'),
    MP=v(53.6, page=5), UP=v(39.1, page=5,
        note='Para 3 gives govt 39.1% / unaided 51.7% of enrolment; para 1 prints 52.3% for govt enrolment — the two paragraphs conflict'))

# ---- Access & participation ---------------------------------------------------
for stage, h, m, u in [
    ('Foundational (PP–II)', (45.4, 39.5), (39.5, 40.1), (31.6, 31.9)),
    ('Preparatory (III–V)', (96.5, 98.8), (81, 81.3), (90.6, 86.7)),
    ('Middle (VI–VIII)', (102.5, 100.9), (81.8, 82.4), (83.9, 78.8)),
    ('Secondary (IX–XII)', (81, 77), (56.7, 55.5), (60.9, 58.5)),
]:
    key = stage.split()[0].lower()
    ind(f'ger_{key}', 'Access', f'GER — {stage}', 'ratio', 'high',
        Haryana=v(h[0], h[1], 5), MP=v(m[0], m[1], 5), UP=v(u[0], u[1], 5))
for stage, h in [('Foundational', (41.2, 35.7)), ('Preparatory', (68.3, 67.0)), ('Middle', (71.3, 70.1)), ('Secondary', (62.3, 59.0))]:
    ind(f'ner_{stage.lower()}', 'Access', f'NER — {stage}', 'ratio', 'high',
        Haryana=v(h[0], h[1], 5), MP=None, UP=None)
for stage, h, m in [('Foundational', 100, 95), ('Preparatory', 100, 89), ('Middle', 97, 80), ('Secondary', 64, 32)]:
    ind(f'ret_{stage.lower()}', 'Access', f'Retention rate — {stage}', '%', 'high',
        Haryana=v(h, page=6), MP=v(m, page=5), UP=None)
ind('gar_primary', 'Access', 'Gross Access Ratio — Primary', '%', 'high',
    Haryana=v(99.31, page=7, note='63 habitations without primary access'),
    MP=v(99.67, page=7, note='310 habitations (0.33%) without primary access'), UP=v(94.35, page=7))
ind('gar_upper', 'Access', 'Gross Access Ratio — Upper Primary', '%', 'high',
    Haryana=v(98.78, page=7, note='112 habitations without upper-primary access'),
    MP=v(99.83, page=7, note='164 habitations (0.17%) without upper-primary access'), UP=v(96.83, page=7))
ind('gar_secondary', 'Access', 'Gross Access Ratio — Secondary', '%', 'high',
    Haryana=v(98.56, page=7, note='132 villages without secondary access'), MP=None, UP=v(95.31, page=7))
ind('gar_hsec', 'Access', 'Gross Access Ratio — Higher Secondary', '%', 'high',
    Haryana=v(97.65, page=7, note='215 villages without higher-secondary access'), MP=None, UP=v(99.75, page=7))
ind('dropout_sec', 'Access', 'Annual average dropout — Secondary', '%', 'low',
    Haryana=v(None, page=6, note='All levels below the national average'),
    MP=v(12.3, page=6, note='National average 8.2%'), UP=v(2.8, page=6, note='Middle stage 3%'))
ind('transition_ms', 'Access', 'Transition rate — Middle to Secondary', '%', 'high',
    Haryana=v(None, page=6, note='All stages above national values'),
    MP=v(77.8, page=7, note='Foundational→Preparatory 97.4%, Preparatory→Middle 91.9%; all below national'),
    UP=v(None, page=6, note='Improved across all stages vs 2023-24'))
ind('preprimary_cov', 'Access', '3–6 year olds enrolled in govt/aided Balvatika', '% of projected pop.', 'high',
    Haryana=v(4.45, page=8, note='8,705 of 8,731 govt & aided schools (99.7%) have ECCE'),
    MP=v(0.7, page=9), UP=v(0.03, page=8))
ind('oosc', 'Access', 'Out-of-school children mainstreamed (2025-26)', 'count', 'high',
    Haryana=v(17811, page=9, note='of 20,000 approved; PLFS 2025 puts OoSC aged 14–18 at 3,44,446; only 2,000 proposed for open schooling'),
    MP=v(None, page=9, note='Advised to refer to PLFS 2024-25'), UP=v(None, page=9, note='Advised to refer to PLFS 2024-25'))

# ---- Schools & teachers ------------------------------------------------------
ind('zero_enrol_ps', 'Schools & teachers', 'Govt primary schools with zero enrolment', 'count', 'low',
    Haryana=v(0, page=6, note='None at primary or upper primary'), MP=v(28, 30, 6), UP=v(42, 44, 6))
ind('small_ps', 'Schools & teachers', 'Govt primary schools with enrolment < 30', 'count', 'low',
    Haryana=v(None, page=6, note='<15 and <30 counts increased over previous year'),
    MP=v(27064, page=6, note='47% of govt primary schools'), UP=v(9859, page=6, note='~11% of govt primary schools'))
ind('single_teacher_ps', 'Schools & teachers', 'Single-teacher govt primary schools', 'count', 'low',
    Haryana=v(968, 696, 6, '11% of govt primary schools'), MP=v(6256, 9620, 6, '11% of govt primary schools'),
    UP=v(2329, 2586, 6, '~3% of govt primary schools'))
ind('single_teacher_ups', 'Schools & teachers', 'Single-teacher govt upper-primary schools', 'count', 'low',
    Haryana=None, MP=v(440, 2590, 6), UP=v(3288, 3109, 6, '~7% of govt upper primary schools'))
ind('adverse_ptr_ps', 'Schools & teachers', 'Govt primary schools with adverse PTR', '%', 'low',
    Haryana=v(22.1, 21.5, 6), MP=v(16.5, 26, 6), UP=None)
ind('adverse_ptr_ups', 'Schools & teachers', 'Govt upper-primary schools with adverse PTR', '%', 'low',
    Haryana=None, MP=v(13.2, 45.8, 6), UP=v(29, 22, 6))
ind('vac_elem', 'Schools & teachers', 'Elementary teacher posts vacant (Samagra-sanctioned)', '%', 'low',
    Haryana=v(14.0, page=8, note='8,449 of 60,396'), MP=v(15.3, page=8, note='27,273 of 1,78,828 — unchanged from 2025-26 minutes'),
    UP=v(30.9, page=8, note='77,400 of 2,50,488'))
ind('vac_sec', 'Schools & teachers', 'Secondary teacher posts vacant', '%', 'low',
    Haryana=v(12.2, page=8, note='2,413 of 19,792; senior secondary 5,573 of 21,311 (26%)'),
    MP=v(10.7, page=8, note='2,244 of 20,993'), UP=v(39.9, page=8, note='4,421 of 11,083'))
ind('vac_scert', 'Schools & teachers', 'SCERT academic posts vacant', '%', 'low',
    Haryana=v(33, 49, 7), MP=v(32, 31.91, 8), UP=v(25, 16.67, 7))
ind('vac_diet', 'Schools & teachers', 'DIET academic posts vacant', '%', 'low',
    Haryana=v(62, 59, 7, '21 functional DIETs'), MP=v(54, 57.95, 8), UP=v(45, 42.74, 7))

# ---- Infrastructure ----------------------------------------------------------
ind('no_elec', 'Infrastructure', 'Govt schools without electricity', 'count', 'low',
    Haryana=v(0, page=7, note='100% saturated'), MP=v(9586, page=7), UP=v(10362, page=7))
ind('no_water', 'Infrastructure', 'Govt schools needing drinking water', 'count', 'low',
    Haryana=v(0, page=7, note='100% saturated'), MP=v(439, page=7), UP=v(332, page=7))
ind('no_girls_toilet', 'Infrastructure', 'Govt schools without girls’ toilet', 'count', 'low',
    Haryana=v(None, page=7, note='99.8% have girls’ toilets'), MP=v(2284, page=7), UP=v(3668, page=7))
ind('no_boys_toilet', 'Infrastructure', 'Govt schools needing boys’ toilet', 'count', 'low',
    Haryana=v(None, page=7, note='99.9% have boys’ toilets'), MP=v(2396, page=7), UP=v(2991, page=7))
ind('ict_lab', 'Infrastructure', 'Govt schools with ICT labs', '%', 'high',
    Haryana=v(54.1, page=7), MP=v(8.1, page=7), UP=v(4.1, page=7))
ind('smart_class', 'Infrastructure', 'Govt schools with smart classrooms', '%', 'high',
    Haryana=v(74.7, page=7), MP=v(30.3, page=7), UP=v(37.1, page=7))
ind('physics_lab', 'Infrastructure', 'Govt Sr. Secondary schools with physics lab', '%', 'high',
    Haryana=v(61.9, page=7), MP=v(72.9, page=7), UP=v(62.1, page=7))
ind('chem_lab', 'Infrastructure', 'Govt Sr. Secondary schools with chemistry lab', '%', 'high',
    Haryana=v(63.3, page=7), MP=v(73.6, page=7), UP=v(62.4, page=7))
ind('bio_lab', 'Infrastructure', 'Govt Sr. Secondary schools with biology lab', '%', 'high',
    Haryana=v(55, page=7), MP=v(72.7, page=7), UP=v(59.1, page=7))
ind('works_pending_old', 'Infrastructure', 'Civil works from earlier years not yet started', 'count', 'low',
    Haryana=v(2746, page=7, note='Plus 67 of 71 works sanctioned in 2025-26 yet to start'),
    MP=v(533, page=7, note='Of 27,474 earlier works; 5,954 works of 2025-26 yet to be completed'),
    UP=v(1801, page=7, note='Plus 857 works of 2025-26 yet to start'))

# ---- Equity & inclusion ------------------------------------------------------
ind('kgbv_total', 'Equity', 'KGBVs sanctioned', 'count', None,
    Haryana=v(72, page=8, note='6 Type I, 30 Type III, 36 Type IV; 66 functional'),
    MP=v(408, page=8, note='100 Type I, 107 Type III, 201 Type IV; all functional'),
    UP=v(839, page=8, note='803 functional; 9 run by NGOs'))
ind('kgbv_vacant', 'Equity', 'Vacant KGBV seats', 'count', 'low',
    Haryana=v(1963, page=8, note='23% of 8,660 seats in functional KGBVs'),
    MP=v(256, page=8, note='0.4%; 57,954 girls enrolled'), UP=v(10335, page=8))
ind('cwsn_pct', 'Equity', 'CwSN share of total enrolment', '%', 'high',
    Haryana=v(0.37, page=8, note='21,625 CwSN; guideline ≥ 2%. 6% of teachers trained in inclusive education; 515 special educators cover 1,359 schools (5.8%)'),
    MP=v(1.01, page=9, note='1,53,821 CwSN; guideline ≥ 2%'),
    UP=v(0.78, page=8, note='3,33,862 CwSN; guideline ≥ 2%'))
ind('nscbav', 'Equity', 'Netaji Subhas Chandra Bose Awasiya Vidyalayas', 'text', None,
    Haryana=v(None, page=8, note='3 sanctioned, 2 functional, 53% seats vacant'),
    MP=v(None, page=8, note='390 sanctioned hostels, no vacant seats (appreciated)'),
    UP=v(None, page=8, note='4 hostels sanctioned in 2023-24 still to be completed'))
ind('janman', 'Equity', 'PM-JANMAN / DAJGUA hostels', 'text', None,
    Haryana=None,
    MP=v(None, page=8, note='PM-JANMAN: 106 sanctioned, 72 started, 0 complete. DAJGUA: 104 sanctioned, 50 started, 0 complete'),
    UP=v(None, page=8, note='PM-JANMAN: 2 hostels (2024-25); DAJGUA: 3 hostels (2024-25) to be expedited'))

# ---- Learning, digital & governance -----------------------------------------
ind('apaar', 'Governance', 'APAAR IDs generated', '%', 'high',
    Haryana=v(82, page=10), MP=v(68, page=10, note='~44.79 lakh IDs pending'),
    UP=v(61, page=9, note='Target of 60 lakh from 80 lakh students with Aadhaar'))
ind('ecoclub_govt', 'Governance', 'Govt schools with Eco-Club (Mission LiFE) notification uploaded', '%', 'high',
    Haryana=v(97, page=9, note='93% across all managements'), MP=v(63, page=9), UP=v(83, page=9, note='51% across all managements'))
ind('parakh', 'Learning', 'PARAKH Rashtriya Sarvekshan 2024', 'text', None,
    Haryana=v(None, page=9, note='Below or at par with national average across grades'),
    MP=v(None, page=9, note='Good overall: Gr 3 language above national; Gr 6 at par; maths above national in Gr 3 and 6'),
    UP=v(None, page=9, note='Advised a comprehensive review of learning-outcome gaps'))

GOV = [
    # (id, label, {state: (status, text, page)}) status: yes / partial / no
    ('sna', 'SNA-SPARSH account opened', {
        'Haryana': ('no', 'Under process with the Finance Department', 10),
        'MP': ('yes', 'Opened on 12.05.2026', 10),
        'UP': ('no', 'Yet to open; strongly advised — all 2026-27 funds flow only through SNA-SPARSH', 9)}),
    ('sssa', 'SSSA notified', {
        'Haryana': ('no', 'Not yet established; urged to establish', 10),
        'MP': ('yes', 'Established', 10),
        'UP': ('yes', 'Notified', 10)}),
    ('sqaaf', 'SQAAF adopted', {
        'Haryana': ('yes', 'Implemented', 10),
        'MP': ('partial', 'In process', 10),
        'UP': ('partial', 'Under process', 10)}),
    ('ncvet', 'Boards registered on NCVET', {
        'Haryana': ('partial', 'Registered; under NCVET review', 10),
        'MP': ('partial', 'Registered; agreement signing in process', 10),
        'UP': ('partial', 'Registered; agreement by end-June 2026', 10)}),
    ('bsnl', 'BSNL broadband MoU', {
        'Haryana': ('yes', 'MoU 17.10.2023 (via CRID), extended 28.04.2026 for 2 years', 10),
        'MP': ('partial', '64% HS/HSS have internet from other sources; MoU awaited for the rest', 10),
        'UP': ('partial', 'MoU signed 05.01.2023; dark areas still unconnected', 10)}),
    ('rte_rules', 'RTE 12(1)(c) admission rules per SC order', {
        'Haryana': ('partial', 'Rules notified 18.02.2021; method & manner of admission not yet specified', 10),
        'MP': ('partial', 'Rules of 26.03.2011; new rules to be notified by 30.06.2026', 10),
        'UP': ('partial', 'Rules of 09.11.2017; executive orders to be converted into formal rules', 10)}),
    ('no_detention', 'No detention in Class 5 / 8', {
        'Haryana': ('yes', 'Does not detain at Class 5 and 8', 10),
        'MP': ('no', 'Follows detention at Class 5 and 8 (gazette 02.03.2019)', 10),
        'UP': ('yes', 'Students in V and VIII are not detained', 10)}),
    ('audit', 'Audit of annual accounts 2024-25 submitted', {
        'Haryana': ('no', 'Annual report and audit not submitted; internal audit done', 11),
        'MP': ('yes', 'Submitted; internal audit completed', 11),
        'UP': ('yes', 'Submitted; internal audit completed', 11)}),
    ('utilisation', 'Spent 100% of approved budget in any year 2019-20 to 2025-26', {
        'Haryana': ('no', 'Below 100% every year', 10),
        'MP': ('no', 'Below 100% every year', 11),
        'UP': ('no', 'Below 100% every year', 10)}),
]

DIRECTIONS = {
    'Haryana': [
        ('Enrolment', 'Analyse the falling share of enrolment in government schools and submit a detailed report by July 2026.', 6),
        ('Spill-over', 'Spill-over of Rs 691.88 crore — no new non-recurring activity could be proposed; complete all spill-over works this year.', 11),
        ('Teacher education', 'Fill SCERT and DIET vacancies; Principal Secretary assured within 3 months.', 8),
        ('KGBV', 'Make the remaining KGBVs functional and fill 1,963 vacant seats.', 8),
        ('Retention', 'Secondary retention of 64% is alarming; act to retain students.', 6),
        ('CwSN', 'Raise CwSN identification toward the 2% guideline using PRASHAST; recruit special educators.', 9),
        ('Governance', 'Establish SSSA; onboard SNA-SPARSH quickly or 2026-27 releases will be delayed.', 10),
    ],
    'MP': [
        ('GER', 'Improve GER at all stages, especially foundational and secondary; analyse class-wise enrolment.', 5),
        ('Aided schools', 'Review the scope of aid to unaided schools (23.1% of schools, 45.6% of enrolment) and redirect toward government schools.', 6),
        ('Retention', 'Secondary retention of 32% needs sustained effort; expand government secondary schools.', 5),
        ('Dropout', 'Secondary dropout 12.3% vs 8.2% nationally — assess causes.', 6),
        ('Teachers', '27,273 elementary vacancies unchanged since last PAB; fill vacancies.', 8),
        ('Tribal hostels', 'Start the 34 PM-JANMAN and 54 DAJGUA hostels not yet begun; none completed so far.', 8),
        ('Infrastructure', 'Basic-facility gaps rose despite the 2025-26 assurance of 100%; complete this year.', 7),
    ],
    'UP': [
        ('Teachers', '77,400 elementary and 4,421 secondary vacancies — expedite recruitment.', 8),
        ('KGBV', 'Make all KGBVs functional, fill 10,335 vacant seats, take over the 9 NGO-run KGBVs.', 8),
        ('Adverse PTR', 'Upper-primary adverse PTR rose from 22% to 29%; review and correct.', 6),
        ('Teacher education', 'SCERT (25%) and DIET (45%) vacancies rising; DIET-of-Excellence funding depends on filling them.', 7),
        ('Pre-primary', 'Only 0.03% of 3–6 year olds are in government Balvatikas; map and co-locate Anganwadis.', 8),
        ('Governance', 'Open the SNA-SPARSH account — all 2026-27 funds flow only through it.', 9),
        ('RTE rules', 'Convert executive orders into formal 12(1)(c) rules as required by the Supreme Court.', 10),
    ],
}


def main():
    out = dict(meeting=MEETING, fin=FIN, indicators=I, governance=[
        dict(id=g[0], label=g[1], states={s: dict(status=x[0], text=x[1], page=x[2]) for s, x in g[2].items()})
        for g in GOV], directions={s: [dict(topic=t, text=x, page=p) for t, x, p in d] for s, d in DIRECTIONS.items()})
    # normalise states=None
    for i in out['indicators']:
        i['values'] = {s: x for s, x in i['values'].items() if x is not None}
    DATA.mkdir(exist_ok=True)
    return out


if __name__ == '__main__':
    print(json.dumps(main(), indent=1)[:800])
