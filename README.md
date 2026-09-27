# Samagra Shiksha PAB 2026-27 Explorer — Haryana, MP, UP

An interactive dashboard over the Project Approval Board (PAB) minutes for the
2026-27 AWP&B of **Haryana**, **Madhya Pradesh** and **Uttar Pradesh**.

**Live:** https://bhatjunaids.github.io/pab-2026-27-explorer/

## What's in it

| Tab | What it answers |
|---|---|
| Overview | Total approval, fresh vs spill-over, proposal vs recommendation, central/state share, per-child figures, computed headline findings |
| Budget mix | Every state's fresh approval by major component → sub component → activity → line item (drillable), as ₹, % of state, ₹ per govt child, cut %, unit cost |
| Compare line items | The same national activity code side by side across states — quantity, unit cost, amount, remark |
| Appraisal cuts | What DoSEL cut, dropped or raised, with the coordinator's remark for each line; remark search |
| 2025-26 spend | Approval vs expenditure by scheme, major and sub component |
| Spill-over | Earlier non-recurring works still open: approved, completed, cancelled, carried over |
| Works & schools | School-wise list of fresh non-recurring approvals (MP, UP), by district and type of work; school search |
| State context | Section I indicators (GER, retention, vacancies, infrastructure, KGBV, CwSN, APAAR…), compliance checklist, PAB directions — each cell cites its PDF page |
| Ask | Plain-English questions → a validated filter → figures computed on the page |
| Data & checks | Reconciliation of every printed figure, findings, CSV downloads |

## Data and checks

`pipeline/` rebuilds everything from the three PDFs (kept out of git in `pdfs/`):

```
cd pipeline
python3 extract_items.py     # Annexure III line items (geometry-based table read)
python3 extract_summary.py   # PRABANDH summary tables in Annexure III
python3 validate.py          # 1,158 reconciliation checks; exits non-zero on any failure
python3 extract_spill.py     # Annexure II spill-over + its own checks
python3 extract_schools.py   # Annexure IV school lists (parallel; ~10 s)
python3 build_data.py        # minutes-vs-annexure reconciliation, writes docs/data.json + docs/schools.json
```

or simply `./build.sh`.

* **737 line items** reconcile with every printed subtotal, every sub-component and major-component row, the scheme totals and the FLN row, on both the proposal and recommendation side; qty × unit cost = amount on all 1,474 sides.
* **333 spill-over works** reconcile with the Annexure II scheme table and major-component pivot.
* **59,719 school-list rows** — for 47 works the listed quantity equals the recommended physical quantity exactly.
* **Minutes Section II** (the financial table) is recomputed from the annexures: every row matches to within rounding.
* Section I (indicators) is transcribed in `pipeline/minutes.py`. Haryana has a text layer; **MP and UP are scans whose OCR is unreliable, so their figures were read from the rendered page images.** Every figure carries its PDF page.

### Findings from the cross-check

1. **MP** (PDF p.12) and **UP** (PDF p.12): para (i) of Section II states central and state shares that do not add up to the approved total with the opening balance; para (ii) of the same section does. The dashboard uses para (ii).
2. **UP** (PDF p.5): para 1 gives government enrolment share as 52.3%, para 3 as 39.1%; 39.1% is consistent with the unaided share and is used.
3. The minutes' "spill-over" is Annexure II's *Balance Remaining* (before cancellations), not its *Actual Spillover*.
4. PRABANDH names the vocational sub component differently in line items and summary; UP's "Opening of New School" is rolled into "Opening of New / Upgraded Schools". Both are aliased (`SUB_ALIAS` in `pipeline/common.py`) only after the totals were shown to match.

## Ask — how it stays honest

A model may choose *what to look at*, never *what the number is*. A question becomes a
FilterSpec (dataset, states, name terms, conditions, grouping, measure). `coerceSpec()`
drops anything invalid and says so; `execute()` computes every figure from `data.json`;
the spec that ran is always shown. Two translators produce the same spec:

* a **built-in parser** (no key, always available), and
* **Claude** via structured outputs, using the reader's own API key stored only in their
  browser's local storage and sent only to `api.anthropic.com` (Opus 5 default; Sonnet 5 / Haiku 4.5 selectable).

## Units

The PDFs report ₹ lakh; the site shows ₹ crore (1 crore = 100 lakh) and unit costs in rupees.
"Per govt child" uses the government-school enrolment share quoted in each minutes
(Haryana 38%, MP 53.6%, UP 39.1%) and is approximate.

Source: PAB minutes for AWP&B 2026-27 — Haryana (05.06.2026), Madhya Pradesh (03.06.2026),
Uttar Pradesh (14.05.2026), Department of School Education & Literacy, Ministry of Education.
