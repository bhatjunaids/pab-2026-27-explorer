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


# =============================================================================
# Karnataka (KN), Maharashtra (MH), Telangana (TG) — added 2026-09-28.
# KN and TG minutes have no text layer at all; MH's OCR is unreliable. Every
# figure below was read from the rendered page images. Pages are PDF pages.
# Percentages are recorded as the minutes quote them (e.g. KN elementary
# vacancy "16%"); values marked "computed" in the note are derived from counts
# the minutes give, because the minutes state no percentage.
# =============================================================================
MEETING.update({
    'KN': dict(date='2026-06-10', districts=35, aspirational=2, aspirational_names='Raichur, Yadgir', minutes_pages='5-16'),
    'MH': dict(date='2026-05-20', districts=36, aspirational=4,
               aspirational_names='Gadchiroli, Washim, Nandurbar, Dharashiv', minutes_pages='5-14'),
    'TG': dict(date='2026-06-10', districts=None, aspirational=None, aspirational_names=None, minutes_pages='5-12'),
})
FIN.update({
    'KN': dict(page=14,
        rows={'E': dict(spill=5495.33, rec=131417.243, nr=4507.6, fresh=135924.843, total=141420.17),
              'S': dict(spill=17937.94, rec=24828.88524, nr=30182.02, fresh=55010.90524, total=72948.845),
              'T': dict(spill=2835.77, rec=7176.0, nr=0.0, fresh=7176.0, total=10011.77)},
        total=dict(spill=26269.04, rec=163422.1282, nr=34689.62, fresh=198111.7482, total=224380.79),
        fln=21140.288,
        para_i=dict(central=96349.07, state=64232.72, opening=63799.00)),        # PDF p.15
    'MH': dict(page=12,
        rows={'E': dict(spill=16592.83, rec=157357.0778, nr=17107.77676, fresh=174464.8545, total=191057.6845),
              'S': dict(spill=24646.54, rec=22773.6542, nr=2564.73, fresh=25338.3842, total=49984.9242),
              'T': dict(spill=4655.44, rec=3719.2, nr=0.0, fresh=3719.2, total=8374.64)},
        total=dict(spill=45894.81, rec=183849.932, nr=19672.50676, fresh=203522.4387, total=249417.2487),
        fln=20714.46349,
        para_i=dict(central=123471.25, state=82314.17, opening=43677.05),
        para_ii=dict(total=249417.0, opening=43677.0, central=123444.0, state=82296.0)),
    'TG': dict(page=11,
        rows={'E': dict(spill=3284.15, rec=54309.86, nr=23700.65, fresh=78010.51, total=81294.66),
              'S': dict(spill=5494.82, rec=70236.86, nr=16951.9, fresh=87188.76, total=92683.58),
              'T': dict(spill=1084.96, rec=1307.51, nr=0.0, fresh=1307.51, total=2392.47)},
        total=dict(spill=9863.93, rec=125854.23, nr=40652.55, fresh=166506.78, total=176370.71),
        fln=4990.27,
        para_i=dict(central=96040.01, state=64026.68, opening=16304.02)),       # PDF p.10-11
})

_IDX = {i['id']: i for i in I}


def add(id, **states):
    _IDX[id]['values'].update(states)


def ind2(id, group, label, unit, better, **states):
    ind(id, group, label, unit, better, **states)
    _IDX[id] = I[-1]


add('schools', KN=v(74859, page=5), MH=v(108250, page=5), TG=v(43154, page=8))
add('govt_school_pct', KN=v(65, page=5, note='9% aided, 26% unaided; 1,010 fewer schools than 2023-24'),
    MH=v(59.9, page=5, note='22.5% aided, 17.3% unaided'), TG=v(69.7, page=5, note='30,057 govt; 12,474 unaided (28.9%)'))
add('enrolment', KN=v(11780251, page=5, note='Fell by 1,46,052 over 2023-24'), MH=v(21272611, page=5),
    TG=v(7458000, page=7, note='Quoted as 74.58 lakh'))
add('teachers', KN=v(452602, page=5), MH=v(747501, page=5), TG=v(358000, page=7, note='Quoted as 3.58 lakh; govt schools 1,54,956 (43.3%)'))
add('govt_enrol_pct', KN=v(None, page=5, note='Not stated. Govt-school enrolment fell by 2,51,301 and aided by 77,872 in 2024-25 while private unaided rose by 1,83,210'),
    MH=v(24, page=5, note='59.9% of schools are government but teach only 24% of students; 17.3% unaided schools teach 30.7%'),
    TG=v(35.3, page=5, note='26.29 lakh; private unaided 63.7% (47.52 lakh)'))
add('ger_foundational', KN=v(41.7, 42.2, 6), MH=v(40.8, page=5), TG=v(63.6, 56.8, 5))
add('ger_preparatory', KN=v(107.7, 109.3, 6), MH=v(105.3, page=5), TG=v(110.5, page=5))
add('ger_middle', KN=v(102.8, 104.2, 6), MH=v(96.5, page=5), TG=v(111.6, page=5))
add('ger_secondary', KN=v(81.3, 79.0, 6), MH=v(82.1, page=5), TG=v(83.6, page=5))
add('ner_foundational', KN=v(40.9, 40.8, 6), TG=v(59.0, 52.6, 5))
add('ner_preparatory', KN=v(90.3, 89.5, 6), TG=v(80.7, page=5))
add('ner_middle', KN=v(85.7, 86.1, 6), TG=v(79.6, page=5))
add('ner_secondary', KN=v(67.3, 64.7, 6), MH=v(66.2, page=5), TG=v(63.8, page=5))
add('ret_foundational', KN=v(100, page=6), TG=v(97, page=5))
add('ret_preparatory', KN=v(100, page=6), TG=v(100, page=5))
add('ret_middle', KN=v(94, page=6), TG=v(94, page=5))
add('ret_secondary', KN=v(52, page=6), TG=v(53, page=5))
add('gar_primary', KN=v(100, page=9, note='Norm 1 km'), TG=v(97.87, page=7))
add('gar_upper', KN=v(100, page=9, note='Norm 3 km'), TG=v(99.04, page=7))
add('gar_secondary', KN=v(99.38, page=9, note='379 villages (0.62%) without secondary access'),
    MH=v(None, page=6, note='4,323 villages (5.93%) without access to secondary schools'), TG=v(85.39, page=7))
add('gar_hsec', KN=v(99.62, page=9, note='235 villages (0.38%) without higher-secondary access'),
    MH=v(None, page=6, note='6,543 villages (8.90%) without access to higher secondary schools'), TG=v(65.73, page=7))
add('dropout_sec', KN=v(12.3, 18.7, 7, 'Preparatory 1.2%, middle 2.1%; national secondary average 8.2%'),
    TG=v(10.5, 8.0, 6, 'Zero at preparatory and middle stages; national average 8.2%'))
add('transition_ms', KN=v(96.7, 96.7, 7, 'Foundational→Preparatory 98.9%, Preparatory→Middle 97.9%'),
    TG=v(98.9, page=6, note='Foundational→Preparatory 100%, Preparatory→Middle 99.9%; all above national'))
add('preprimary_cov', KN=v(1.28, page=10, note='Computed: 42,236 in govt/aided Balvatikas of 32,94,895 projected 3–6 population; 48.44% enrolled in any ECCE'),
    MH=v(44.9, page=9, note='26,84,048 children'),
    TG=v(0.49, page=7, note='Computed: 9,038 in govt/aided Balvatikas of 18.45 lakh; 82.44% in ECCE provisions. Age 6+ for Class I not yet notified'))
add('oosc', KN=v(87, page=11, note='Of 550 proposed for special training; direct enrolment 5,099 of 5,573; PLFS 2025 OoSC aged 14–18: 6,05,942'),
    MH=v(1383, page=10, note='Of 2,069 approved; PLFS 2025 OoSC aged 14–18: 11,45,812; open schooling proposed for only 187'),
    TG=v(105, page=8, note='Of 717 identified; 696 dropouts willing for open schooling'))
add('zero_enrol_ps', KN=v(170, page=6, note='Plus 19 at upper primary'), TG=v(1997, 1809, 6, '10% of govt primary; upper primary 39→49'))
add('small_ps', KN=v(15087, page=6, note='75% of govt primary; 7,923 (39%) below 15'),
    MH=v(24384, 23747, 6, '~60% of primary schools; upper primary 1,719→1,920'),
    TG=v(11801, 11050, 6, '60% of govt primary; upper primary 596→782'))
add('single_teacher_ps', KN=v(5199, page=6, note='26% of govt primary'), TG=v(4739, 5720, 6, '24% of govt primary'))
add('single_teacher_ups', KN=v(1076, page=6, note='5%'),
    MH=v(7186, 7099, 6, 'Minutes cite 7,186 single-teacher schools, up from 7,099 at upper-primary level; stage split not given'),
    TG=v(93, 80, 6, '2.87%'))
add('adverse_ptr_ps', KN=v(32.1, 33.0, 6), MH=v(21.3, 23.1, 6), TG=v(35.6, 40.5, 6))
add('adverse_ptr_ups', KN=v(31.8, 36.1, 7), MH=v(13.8, 18.8, 6), TG=v(18.6, 14.8, 6))
add('vac_elem', KN=v(16, page=9, note='29,473 of 1,88,531'), TG=v(0, page=7, note='All 14,277 sanctioned posts filled'))
add('vac_sec', KN=v(8, page=9, note='3,714 of 49,070 (Class 9–10); senior secondary 5,862 of 14,132 (41%)'),
    MH=v(17, page=9, note='Senior secondary 25%'), TG=v(0, page=7, note='All 4,127 sanctioned posts in position'))
add('vac_scert', KN=v(11, page=9, note='Of 18 sanctioned posts'), MH=v(50, page=8, note='36 of 72'), TG=v(0, page=7, note='All 26 posts filled'))
add('vac_diet', KN=v(26, page=9, note='173 of 675 in 30 functional DIETs'), MH=v(34.43, page=8, note='125 of 363; to be filled by 31 July 2026'),
    TG=v(53, page=7, note='151 of 286 in 14 DIETs'))
add('no_girls_toilet', MH=v(663, page=6, note='Of 63,836 schools (State UDISE 2025-26)'),
    TG=v(630, page=9, note='Gap reported by the State; 630 girls’ toilets proposed in 2026-27'))
add('no_boys_toilet', MH=v(1638, page=6, note='Of 63,700 schools; 447 boys’ toilets proposed'))
add('ict_lab', KN=v(12.5, page=7, note='Schools with Grade VI and above'),
    MH=v(6.28, page=7, note='Computed: 21,009 of 22,416 upper-primary/secondary schools lack ICT labs'),
    TG=v(40.1, page=7, note='Schools with Grade VI and above'))
add('smart_class', KN=v(32.9, page=7, note='Grade VI and above'),
    MH=v(80.88, page=7, note='Computed: 4,286 (19.12%) of 22,416 upper-primary/secondary schools lack smart classrooms'),
    TG=v(67.9, page=7, note='Grade VI and above'))
add('physics_lab', KN=v(85.7, page=7), MH=v(75.66, page=8, note='Computed: 92 of 378 Sr. Secondary schools lack one'), TG=v(84.9, page=7))
add('chem_lab', KN=v(86.6, page=7), MH=v(76.19, page=8, note='Computed: 90 of 378 lack one'), TG=v(83.9, page=7))
add('bio_lab', KN=v(82.7, page=7), MH=v(75.66, page=8, note='Computed: 92 of 378 lack one'), TG=v(83.6, page=7))
add('kgbv_total', KN=v(146, page=9, note='145 functional (66 Type I, 8 Type III, 71 Type IV); capacity 16,550'),
    MH=v(86, page=9, note='43 Type II (all functional) + 43 Type IV (40 functional); Type II capacity raised 100→150'),
    TG=v(736, page=8, note='725 functional; 11 near completion'))
add('kgbv_vacant', KN=v(1530, page=9, note='15,020 girls enrolled against 16,550 seats; none NGO-run'),
    TG=v(0, page=8, note='Enrolment exceeds sanctioned capacity'))
add('cwsn_pct', KN=v(0.73, page=10, note='85,872 CwSN; 19.86% of teachers trained in IE; 1,540 special educators cover 14.68% of schools; ramps 76.4%, CwSN toilets 19.71%'),
    MH=v(1.0, page=10, note='Quoted as 1%; 10.17% of teachers trained in IE; 3,356 special educators; ramps 94%, CwSN toilets 62.51% (all managements)'),
    TG=v(0.97, page=7, note='72,672 CwSN; 47,733 teachers trained; 1,258 special educators; 1,011 of 1,523 required recruited'))
add('nscbav', KN=v(None, page=9, note='6 composite residential schools + hostels, capacity 600, 161 seats (26.83%) vacant'),
    MH=v(None, page=9, note='14 sanctioned, 9 functional; 3 schools and 2 hostels non-functional'),
    TG=v(None, page=8, note='38 sanctioned, 33 functional; 2,788 enrolled of 3,300 capacity, 512 vacant (15.5%)'))
add('janman', KN=v(None, page=9, note='PM-JANMAN: 7 sanctioned, 1 complete, 1 under construction. DAJGUA: 14 sanctioned (₹80.5 cr), work orders issued, zero physical progress'),
    MH=v(None, page=9, note='PM-JANMAN: 25 sanctioned, construction started in 19. DAJGUA: 22 sanctioned, 12 started'),
    TG=v(None, page=9, note='PM-JANMAN: 16 sanctioned, 1 complete, 15 in progress. DAJGUA: 10 sanctioned, construction under way at all'))
add('apaar', KN=v(65, page=11, note='80,28,927 IDs; secondary 59%, higher secondary 56%'), MH=v(89, page=10), TG=v(69, page=9, note='As on 11 May 2026'))
add('ecoclub_govt', KN=v(None, page=11, note='43% of all schools (31,878 of 74,776) vs national 65%; govt share not stated'),
    MH=v(None, page=10, note='No figure given; asked to issue a notification'), TG=v(78, page=9, note='70% across all managements'))
add('parakh', KN=v(None, page=11, note='Below national average in all grades (3, 6, 9) and all subjects'),
    MH=v(None, page=10, note='Advised to review and adopt remedial measures'),
    TG=v(None, page=8, note='Below national average in most subjects across stages'))

# indicators only these minutes report
ind2('pgi', 'Learning', 'Performance Grading Index 2.0 score (2024-25)', 'score', 'high',
     KN=v(558.1, page=10, note='Grade Akanshi-1; national average 587.0'),
     TG=v(552.2, 511.9, 8, 'Grade Akanshi-1; national average 587.0'))
ind2('elec_pct', 'Infrastructure', 'Govt schools with electricity', '%', 'high',
     Haryana=v(100, page=7), KN=v(98.9, page=7), TG=v(95.8, page=6))
ind2('water_pct', 'Infrastructure', 'Govt schools with drinking water', '%', 'high',
     Haryana=v(100, page=7), KN=v(99.9, page=7), MH=v(100, page=6, note='State UDISE 2025-26'), TG=v(99.4, page=6))
ind2('gtoilet_pct', 'Infrastructure', 'Govt schools with girls’ toilet', '%', 'high',
     Haryana=v(99.8, page=7), KN=v(98.8, page=7), MH=v(98.96, page=6, note='State UDISE 2025-26'))
ind2('btoilet_pct', 'Infrastructure', 'Govt schools with boys’ toilet', '%', 'high',
     Haryana=v(99.9, page=7), MH=v(97.43, page=6, note='State UDISE 2025-26'), TG=v(85.8, page=7))
ind2('ramp_pct', 'Infrastructure', 'Schools with ramps', '%', 'high',
     Haryana=v(75, page=9, note='All managements: 17,676 of 23,494'), KN=v(87.8, page=7, note='Govt schools'),
     MH=v(98.27, page=6, note='Computed: 1,118 of 64,477 schools without ramps'), TG=v(80.8, page=7, note='Govt schools'))
ind2('internet_pct', 'Infrastructure', 'Govt schools with internet', '%', 'high',
     TG=v(52.9, page=7, note='424 schools still unconnected despite BSNL MoUs'))
ind2('works_pending_inception', 'Infrastructure', 'Sanctioned civil works pending completion since inception', 'count', 'low',
     KN=v(686, page=8, note='Girls’ toilets 71/75, boys’ toilets 241/247, drinking water 64/67, solar 20/22, major repair 283/483, opening & upgrade 7/23'),
     MH=v(4968, page=7, note='CwSN toilets 534/534, electrification 985/985, boys’ toilets 1,875/3,036, girls’ toilets 1,239/2,757, labs and rooms 279/357, classrooms 56/193'))

for gid, extra in {
    'sna': {'KN': ('no', 'Proposal to move from PFMS sent 16.04.2026; with Finance Department', 11),
            'MH': ('yes', 'Onboarded', 10), 'TG': ('yes', 'Account opened', 9)},
    'sssa': {'KN': ('no', 'Not established; GO to be issued', 12), 'MH': ('yes', 'Established, with SCERT as its board', 11),
             'TG': ('no', 'Awaiting the State Education Policy committee', 9)},
    'sqaaf': {'KN': ('partial', 'Under process', 12), 'MH': ('yes', 'Adopted', 11), 'TG': ('no', 'Awaiting the committee report', 9)},
    'ncvet': {'KN': ('partial', 'KSEAB applied 26.08.2025; LoI and agreement pending', 12),
              'MH': ('partial', 'Registered 07.07.2025; LoI issued 24.03.2026', 11)},
    'bsnl': {'KN': ('partial', 'Agreement (not an MoU) of 26.06.2025; FTTH live in 411 schools', 12),
             'MH': ('yes', 'MoU signed', 11), 'TG': ('partial', 'MoUs of 26.08.2023 and 16.09.2025; 424 schools still unconnected', 9)},
    'rte_rules': {'KN': ('partial', 'Implementing 12(1)(c); rules must specify method & manner of admission', 12),
                  'MH': ('partial', 'Rules of 11.10.2011; executive orders to be converted into rules', 11),
                  'TG': ('no', 'Rules not notified; under consideration', 10)},
    'no_detention': {'KN': ('yes', 'Does not detain at Class 5 and 8', 13),
                     'MH': ('no', 'Revised rules; detains at Class 5 and 8', 11),
                     'TG': ('yes', 'Does not detain at Class V and VIII', 10)},
    'audit': {'KN': ('yes', 'Annual report and audit of accounts 2024-25 submitted', 13)},
    'utilisation': {'KN': ('no', '46.15% (2021-22), 49.85%, 96.46%, 67.87%, 70.15% (2025-26)', 13)},
}.items():
    next(g for g in GOV if g[0] == gid)[2].update(extra)
GOV.append(('social_audit', 'Social audit coverage found satisfactory', {
    'KN': ('no', 'Not satisfactory: 11,186 schools in 2024-25, 10,195 in 2025-26', 13),
    'MH': ('no', 'Not satisfactory; asked to cover 20% of schools this year', 11),
    'TG': ('no', '660 of 26,815 schools (2.46%) in 2023-24; none since', 10)}))
GOV.append(('age6', 'Minimum age 6 for Class I notified', {
    'KN': ('yes', '6+ age-of-admission policy implemented', 10),
    'TG': ('no', 'Not notified; committee drafting Telangana Education Policy', 10)}))

DIRECTIONS.update({
    'KN': [
        ('Enrolment', 'Government schools lost 2,51,301 students and aided 77,872 in one year while private unaided gained 1,83,210 — analyse the migration and revive public enrolment.', 5),
        ('Retention', 'Secondary retention of 52% signals heavy attrition; investigate and act.', 6),
        ('Teachers', '5,862 of 14,132 senior-secondary posts (41%) vacant; recruitment under way.', 9),
        ('Civil works', '94–98% of sanctioned toilets and drinking-water works pending since inception; complete in 2026-27 or surrender.', 8),
        ('DAJGUA', 'Zero physical progress on 14 hostels despite ₹12.08 cr released; start work immediately.', 10),
        ('Learning', 'PARAKH below national in every grade and subject; PGI 558.1 below the national 587 — submit an improvement roadmap.', 10),
        ('Governance', 'Onboard SNA-SPARSH (else no CSS funds) and establish SSSA.', 11),
    ],
    'MH': [
        ('Interim approval', 'Approvals are interim pending Samagra Shiksha 3.0; an additional PAB will supplement them.', 5),
        ('Enrolment', 'Govt + aided enrolment fell from 1.63 crore (2018-19) to 1.47 crore (2024-25); analyse, and study why aided schools perform better.', 5),
        ('Access', '4,323 villages lack secondary and 6,543 lack higher-secondary access; improve access or provide transport.', 6),
        ('Civil works', '4,968 sanctioned works pending since inception, including all 985 electrification works and 534 CwSN toilets.', 7),
        ('ICT', '93.7% of upper-primary and secondary schools lack ICT labs; saturate ICT and subject labs.', 7),
        ('Teacher education', 'Fill SCERT (50%) and DIET (34%) vacancies by 31 July 2026; DIET Centre-of-Excellence funds depend on it.', 8),
        ('KGBV', 'Run KGBVs under government, not NGOs; Type II capacity raised from 100 to 150.', 9),
    ],
    'TG': [
        ('Enrolment', 'Government schools are 69.7% of schools but hold only 35.3% of enrolment; do a root-cause analysis.', 5),
        ('Small schools', '1,997 zero-enrolment govt primary schools and ~60% below 30 students.', 6),
        ('Access', 'GAR only 85.39% at secondary and 65.73% at higher secondary.', 7),
        ('Dropout', 'Secondary dropout rose from 8.0% to 10.5%, above the national 8.2%.', 6),
        ('DIETs', '151 of 286 DIET posts (53%) vacant.', 7),
        ('Policy', 'Notify age 6 for Class I, SSSA/SQAAF and Section 12(1)(c) admission rules.', 10),
        ('Social audit', 'Only 2.46% of schools audited in 2023-24 and none since.', 10),
    ],
})


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
