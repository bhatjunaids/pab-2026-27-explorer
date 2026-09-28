/* PAB 2026-27 Explorer — Haryana, Madhya Pradesh, Uttar Pradesh.
   All figures come from data.json, built by pipeline/ from the state PAB minutes.
   Amounts in data are Rs lakh; the page shows Rs crore unless a column says otherwise. */
"use strict";

let ALL = [];          // every state in data.json, in its fixed colour order
let ST = [];           // states currently shown (header picker)
const SCOL = {};       // colour follows the state, never its position in the selection
const SCHEME = {E: "Elementary", S: "Secondary", T: "Teacher Education"};
let D = null;
const S = {};   // per-tab UI state

/* ---------------- formatting ---------------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const inr = (n, d = 0) => n == null || isNaN(n) ? "—" : Number(n).toLocaleString("en-IN", {minimumFractionDigits: d, maximumFractionDigits: d});
const cr = (lakh, d) => {
  if (lakh == null || isNaN(lakh)) return "—";
  const c = lakh / 100, a = Math.abs(c);
  const dd = d != null ? d : a >= 1000 ? 0 : a >= 10 ? 1 : 2;
  return "₹" + inr(c, dd) + " cr";
};
const crn = (lakh, d) => lakh == null ? "—" : inr(lakh / 100, d != null ? d : Math.abs(lakh / 100) >= 1000 ? 0 : Math.abs(lakh / 100) >= 10 ? 1 : 2);
const pct = (x, d = 1) => x == null || !isFinite(x) ? "—" : (x * 100).toFixed(d) + "%";
const rupees = x => x == null || !isFinite(x) ? "—" : "₹" + inr(x, 0);
const sum = (a, f) => a.reduce((s, x) => s + (f ? (f(x) || 0) : (x || 0)), 0);
const groupBy = (a, f) => a.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});
const uniq = a => [...new Set(a)];
const sname = st => D.states[st].name;
const abbr = st => D.states[st].abbr || st;
const key = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const sw = st => `<i class="sw" style="background:${SCOL[st]}"></i>`;
const pageRef = (st, p) => p ? `<span class="pg" title="Page ${p} of the ${esc(sname(st))} PAB minutes PDF">p.${p}</span>` : "";

/* ---------------- derived ---------------- */
function derive() {
  D.items.forEach((it, i) => {
    it.id = i;
    it.cut = (it.pa || 0) - (it.ra || 0);
    it.cutPct = it.pa ? it.cut / it.pa : null;
  });
  D.byState = groupBy(D.items, i => i.st);
  D.fresh = {}; D.proposed = {};
  for (const st of ALL) {
    const pv = D.summary[st].plan_vs_rec.find(r => r.name === "TOTAL");
    D.fresh[st] = pv.r_total; D.proposed[st] = pv.p_total;
  }
  // government-school enrolment share as quoted in the minutes (approximate)
  const gshare = D.minutes.indicators.find(i => i.id === "govt_enrol_pct").values;
  D.govtEnrol = {};
  for (const st of ALL) D.govtEnrol[st] = gshare[st] && gshare[st].v != null ? D.states[st].enrolment * gshare[st].v / 100 : null;
  // national activity master: code -> name + where
  D.codes = {};
  for (const it of D.items) {
    const c = D.codes[it.code] = D.codes[it.code] || {code: it.code, sa: it.sa, act: it.act, sub: it.sub, maj: it.maj, sch: it.sch, st: {}};
    c.st[it.st] = it;
  }
}

/* ---------------- tooltip ---------------- */
const tip = document.getElementById("tip");
document.addEventListener("mousemove", e => {
  const t = e.target.closest && e.target.closest("[data-tip]");
  if (!t) { tip.classList.remove("on"); return; }
  tip.innerHTML = t.getAttribute("data-tip");
  tip.classList.add("on");
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y + h > innerHeight - 8) y = e.clientY - h - 14;
  tip.style.left = x + "px"; tip.style.top = y + "px";
});
document.addEventListener("scroll", () => tip.classList.remove("on"), true);

/* ---------------- theme ---------------- */
(function theme() {
  const root = document.documentElement, btn = document.getElementById("themeBtn");
  let t = null; try { t = localStorage.getItem("pab.theme"); } catch (_) {}
  if (t) root.setAttribute("data-theme", t);
  const label = () => {
    const dark = root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    btn.textContent = dark ? "☀ Light" : "☾ Dark";
  };
  label();
  btn.onclick = () => {
    const dark = root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const nt = dark ? "light" : "dark";
    root.setAttribute("data-theme", nt);
    try { localStorage.setItem("pab.theme", nt); } catch (_) {}
    label();
  };
})();

/* ---------------- reusable pieces ---------------- */
function seg(name, opts, cur) {
  return `<span class="seg" role="group">${opts.map(([v, l]) =>
    `<button type="button" data-seg="${name}" data-v="${esc(v)}" class="${String(v) === String(cur) ? "on" : ""}">${esc(l)}</button>`).join("")}</span>`;
}

/* grouped horizontal bars: rows [{label, tip?, vals:{st: number}}], fmt(v) */
function hbars(rows, fmt, opts = {}) {
  const states = opts.states || ST;
  const max = Math.max(1e-9, ...rows.flatMap(r => states.map(s => Math.abs(r.vals[s] || 0))));
  return `<div class="hb">${rows.map((r, i) => `
    ${i ? '<div class="sep"></div>' : ""}
    <div class="lab" title="${esc(r.label)}">${esc(r.label)}</div>
    <div class="rows">${states.map(s => {
      const v = r.vals[s];
      const w = v == null ? 0 : Math.abs(v) / max * 100;
      const t = `<b>${esc(sname(s))}</b><br>${esc(r.label)}<br>${fmt(v)}${r.tips && r.tips[s] ? "<br>" + r.tips[s] : ""}`;
      return `<div class="r" data-tip="${esc(t)}"><b class="tr"><i style="width:${w.toFixed(2)}%;background:${SCOL[s]}"></i></b><span><em>${esc(abbr(s))}</em>${v == null ? "—" : fmt(v)}</span></div>`;
    }).join("")}</div>`).join("")}</div>`;
}

/* sortable table. cols [{k, l, n (numeric), f (format fn(row)), bar (color fn or st)}] */
function table(id, cols, rows, opts = {}) {
  const st = S["tbl_" + id] = S["tbl_" + id] || {k: opts.sortKey || null, dir: opts.sortDir || -1};
  let rs = rows.slice();
  if (st.k) {
    const c = cols.find(c => c.k === st.k);
    const g = c && c.sv ? c.sv : (r => r[st.k]);
    rs.sort((a, b) => {
      const x = g(a), y = g(b);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * st.dir;
    });
  }
  const limit = opts.limit && !S["more_" + id] ? opts.limit : Infinity;
  const shown = rs.slice(0, limit);
  const maxes = {};
  cols.forEach(c => { if (c.bar) maxes[c.k] = Math.max(1e-9, ...rs.map(r => Math.abs((c.sv || (x => x[c.k]))(r) || 0))); });
  const head = cols.map(c => `<th class="${c.n ? "n " : ""}${c.nosort ? "" : "sortable"}" ${c.nosort ? "" : `data-sort="${id}"`} data-k="${c.k}" ${c.title ? `title="${esc(c.title)}"` : ""}>${esc(c.l)}${st.k === c.k ? (st.dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("");
  const body = shown.map(r => `<tr ${opts.rowAttr ? opts.rowAttr(r) : ""}>${cols.map(c => {
    const raw = (c.sv || (x => x[c.k]))(r);
    const txt = c.f ? c.f(r) : esc(raw == null ? "—" : raw);
    if (c.bar && raw != null) {
      const col = typeof c.bar === "function" ? c.bar(r) : c.bar;
      return `<td class="n cellbar" style="--c:${col}"><i style="width:calc((100% - 20px) * ${(Math.abs(raw) / maxes[c.k]).toFixed(4)})"></i><span>${txt}</span></td>`;
    }
    return `<td class="${c.n ? "n" : ""} ${c.cls || ""}">${txt}</td>`;
  }).join("")}</tr>`).join("");
  const foot = opts.total ? `<tr class="total">${cols.map((c, i) => `<td class="${c.n ? "n" : ""}">${opts.total(c, i, rs) ?? ""}</td>`).join("")}</tr>` : "";
  const more = rs.length > limit ? `<div style="padding:8px 10px"><button class="btn ghost" data-more="${id}">Show all ${inr(rs.length)} rows</button></div>` : "";
  return `<div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" class="empty">Nothing matches.</td></tr>`}${foot}</tbody></table>${more}</div>`;
}

/* ---------------- tabs ---------------- */
const TABS = [
  ["overview", "Overview"], ["mix", "Budget mix"], ["compare", "Compare line items"], ["appraisal", "Appraisal cuts"],
  ["utilisation", "2025-26 spend"], ["spill", "Spill-over"], ["works", "Works & schools"], ["context", "State context"],
  ["ask", "Ask"], ["checks", "Data & checks"],
];
const R = {};
function route() {
  const t = (location.hash || "#overview").slice(1).split("/")[0];
  const cur = TABS.find(x => x[0] === t) ? t : "overview";
  document.getElementById("tabs").innerHTML = TABS.map(([k, l]) => `<a href="#${k}" class="${k === cur ? "on" : ""}">${l}</a>`).join("");
  render(cur);
}
function render(t) {
  t = t || (location.hash || "#overview").slice(1).split("/")[0] || "overview";
  const m = document.getElementById("main");
  m.innerHTML = (R[t] || R.overview)();
  if (R[t + "_after"]) R[t + "_after"]();
}
addEventListener("hashchange", () => { route(); scrollTo(0, 0); });

document.addEventListener("click", e => {
  const b = e.target.closest("[data-seg]");
  if (b) { S[b.dataset.seg] = b.dataset.v; if (S.onSeg) S.onSeg(b.dataset.seg); render(); return; }
  const th = e.target.closest("[data-sort]");
  if (th) {
    const st = S["tbl_" + th.dataset.sort] = S["tbl_" + th.dataset.sort] || {};
    if (st.k === th.dataset.k) st.dir = -(st.dir || -1); else { st.k = th.dataset.k; st.dir = -1; }
    render(); return;
  }
  const mo = e.target.closest("[data-more]");
  if (mo) { S["more_" + mo.dataset.more] = 1; render(); return; }
  const dr = e.target.closest("[data-drill]");
  if (dr) { const p = JSON.parse(dr.dataset.drill); S.mixPath = p; render(); return; }
  const go = e.target.closest("[data-go]");
  if (go) { const [tab, k, v] = go.dataset.go.split("|"); if (k) S[k] = v; location.hash = tab; if ((location.hash || "").slice(1) === tab) render(); return; }
});

/* =====================================================================
   OVERVIEW
   ===================================================================== */
R.overview = () => {
  const F = D.minutes.fin;
  const cards = ST.map(st => {
    const f = F[st], s = D.states[st], sp = D.spill[st].summary;
    const tot = f.total.total, fresh = D.fresh[st], prop = D.proposed[st];
    const nr = D.summary[st].plan_vs_rec.find(r => r.name === "TOTAL").r_nr;
    const inn = D.summary[st].innov;
    const segs = [["Spill-over (earlier NR works)", f.total.spill, "var(--prop)"], ["Fresh recurring", fresh - nr, SCOL[st]], ["Fresh non-recurring", nr, `color-mix(in srgb, ${SCOL[st]} 55%, var(--surface))`]];
    return `<div class="card statecard" style="--c:${SCOL[st]}">
      <div class="hd"><b>${esc(s.name)}</b><span>PAB held ${new Date(s.date).toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric"})}</span></div>
      <div class="hero">${cr(tot, 0)}</div>
      <div class="sub">Total approval for 2026-27, including ${cr(f.total.spill, 0)} spill-over ${pageRef(st, f.page)}</div>
      <div class="stack" aria-hidden="true">${segs.map(([l, v, c]) => `<i style="width:${(v / tot * 100).toFixed(2)}%;background:${c}" data-tip="${esc(`<b>${l}</b><br>${cr(v)} · ${pct(v / tot)}`)}"></i>`).join("")}</div>
      <div class="kv">
        <span>Fresh approval (recommended)</span><b>${cr(fresh)}</b>
        <span>State proposed</span><b>${cr(prop)}</b>
        <span>Cut at appraisal</span><b class="neg">−${cr(prop - fresh)} (${pct((prop - fresh) / prop)})</b>
        <span>Fresh non-recurring</span><b>${cr(nr)}</b>
        <span>FLN within fresh</span><b>${cr(f.fln)}</b>
        <span>Fresh per enrolled child¹</span><b>${rupees(fresh * 1e5 / s.enrolment)}</b>
        <span>Fresh per govt-school child²</span><b>${D.govtEnrol[st] ? rupees(fresh * 1e5 / D.govtEnrol[st]) : '<span class="muted" title="The minutes do not state the government-school share of enrolment">not stated</span>'}</b>
        <span>Innovation / MMMER share</span><b>${inn ? `${inn.pct_innovation}% / ${inn.pct_mmmer}%` : '<span class="muted" title="This state\'s PRABANDH sheet has no Innovation/MMMER block">not in sheet</span>'}</b>
        <span>Opening balance 1 Apr 2026</span><b>${cr((f.para_ii || f.para_i).opening)}</b>
        <span>Central share to be released</span><b>${cr((f.para_ii || f.para_i).central)}</b>
        <span>State share to be released</span><b>${cr((f.para_ii || f.para_i).state)}</b>
      </div></div>`;
  }).join("");

  // insights — every sentence is computed from the data
  const ins = [];
  const big = ST.map(st => [st, D.minutes.fin[st].total.total]).sort((a, b) => b[1] - a[1]);
  const lastB = big[big.length - 1];
  if (big.length > 1) ins.push(`Largest total approval: ${sname(big[0][0])} (${cr(big[0][1], 0)}), ${(big[0][1] / lastB[1]).toFixed(1)}× the smallest, ${sname(lastB[0])} (${cr(lastB[1], 0)}). Combined for the ${big.length} states: ${cr(sum(big, x => x[1]), 0)}.`);
  const cuts = ST.map(st => [st, (D.proposed[st] - D.fresh[st]) / D.proposed[st]]).sort((a, b) => b[1] - a[1]);
  if (cuts.length > 1) ins.push(`DoSEL trimmed ${sname(cuts[0][0])}'s proposal the hardest (−${pct(cuts[0][1])}) and ${sname(cuts[cuts.length - 1][0])}'s the least (−${pct(cuts[cuts.length - 1][1])}).`);
  const spillSh = ST.map(st => [st, D.minutes.fin[st].total.spill / D.minutes.fin[st].total.total]).sort((a, b) => b[1] - a[1]);
  const noNR = spillSh[0][0] && D.summary[spillSh[0][0]].plan_vs_rec.find(r => r.name === "TOTAL").r_nr === 0;
  ins.push(`Spill-over is ${pct(spillSh[0][1], 0)} of ${sname(spillSh[0][0])}'s total approval — ${noNR ? "so large that no fresh non-recurring (civil works, ICT) activity was approved at all" : "the largest share among the states shown"}; it is lowest in ${sname(spillSh[spillSh.length - 1][0])} (${pct(spillSh[spillSh.length - 1][1], 0)}).`);
  const sal = ST.map(st => { const r = D.summary[st].major_2627.find(x => x.name === "Financial Support for Teachers"); return [st, r ? r.r_total / D.fresh[st] : 0]; });
  ins.push(`Teacher salaries (Financial Support for Teachers) take ${sal.map(([s, v]) => `${pct(v, 0)} in ${s}`).join(", ")} of fresh approval.`);
  const ps = ST.filter(st => D.govtEnrol[st]).map(st => [st, D.fresh[st] * 1e5 / D.govtEnrol[st]]).sort((a, b) => b[1] - a[1]);
  if (ps.length > 1) ins.push(`Per government-school child², fresh approval is highest in ${sname(ps[0][0])} (${rupees(ps[0][1])}) and lowest in ${sname(ps[ps.length - 1][0])} (${rupees(ps[ps.length - 1][1])}).`);
  const util = ST.map(st => { const g = D.summary[st].glance.find(x => x.name === "Grand Total"); return [st, g.exp_total / g.appr_total]; });
  ins.push(`2025-26 spend against approval (incl. spill-over): ${util.map(([s, v]) => `${s} ${pct(v, 0)}`).join(", ")}.`);
  const notRec = ST.map(st => [st, D.byState[st].filter(i => i.pa > 0 && i.ra === 0)]);
  ins.push(`Line items proposed but not recommended at all: ${notRec.map(([s, a]) => `${s} ${a.length} (${cr(sum(a, x => x.pa))})`).join(", ")}.`);
  const fds = D.checks.findings.filter(f => f.severity === "discrepancy");
  ins.push(`The cross-check found ${fds.length} internal inconsistencies in the minutes themselves — see <a href="#checks">Data &amp; checks</a>.`);
  if (ST.includes("MH")) ins.push(`Maharashtra's approval is interim: Samagra Shiksha 3.0 is pending, and a supplementary PAB will follow.`);

  // major component comparison
  const majors = uniq(ST.flatMap(st => D.summary[st].major_2627.filter(r => r.name !== "TOTAL").map(r => r.name)));
  const mv = S.ovMetric || "share";
  const rows = majors.map(m => {
    const vals = {}, tips = {};
    for (const st of ST) {
      const r = D.summary[st].major_2627.find(x => x.name === m);
      const v = r ? r.r_total : 0;
      vals[st] = mv === "share" ? v / D.fresh[st] : mv === "pc" ? (D.govtEnrol[st] ? v * 1e5 / D.govtEnrol[st] : null) : v;
      tips[st] = `${cr(v)} recommended · ${pct(v / D.fresh[st])} of fresh`;
    }
    return {label: m, vals, tips, s: sum(ST.map(s => vals[s] || 0))};
  }).sort((a, b) => b.s - a.s);
  const fmt = mv === "share" ? (v => pct(v)) : mv === "pc" ? rupees : (v => cr(v));
  const shares = ALL.map(st => { const g = D.minutes.indicators.find(i => i.id === "govt_enrol_pct").values[st]; return `${st === "Haryana" ? "Haryana" : abbr(st)} ${g && g.v != null ? g.v + "%" : "not stated"}`; }).join(", ");

  return `<h1>What the Project Approval Board approved for 2026-27</h1>
  <p class="lede">Samagra Shiksha AWP&amp;B approvals from the PAB minutes of ${ALL.length} states — ${ALL.map(sname).join(", ")}: ${inr(D.items.length)} line items, ${inr(sum(ALL.map(s => D.spill[s].items.length)))} spill-over works and ${inr(sum(Object.values(D.checks.school_rows)))} school-level approvals, each reconciled against the totals the PDFs print. Use the state buttons at the top to choose which states to compare.</p>
  <div class="grid gs">${cards}</div>
  <p class="sub" style="margin-top:8px">¹ Total enrolment pre-primary to XII, all managements (UDISE+ 2024-25 as quoted in the minutes). ² Using the government-school share of enrolment quoted in the minutes (${shares}) — approximate.</p>
  <div class="two" style="margin-top:18px">
    <div class="card"><h3>What stands out</h3><ul class="insights">${ins.map(x => `<li>${x}</li>`).join("")}</ul></div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px"><h3 style="margin:0">Fresh approval by major component</h3>
      ${seg("ovMetric", [["share", "% of state"], ["amt", "₹ crore"], ["pc", "₹ per govt child"]], mv)}</div>
      ${hbars(rows, fmt)}
      <p class="sub" style="margin:10px 0 0">Click through to <a href="#mix">Budget mix</a> to drill into sub components, activities and line items.</p></div>
  </div>`;
};

/* =====================================================================
   BUDGET MIX (drillable)
   ===================================================================== */
const LEVELS = [["maj", "Major component"], ["sub", "Sub component"], ["act", "Activity"], ["code", "Line item"]];
R.mix = () => {
  const path = S.mixPath || [];
  const metric = S.mixMetric || "ra";
  const scheme = S.mixScheme || "all";
  const lvl = LEVELS[Math.min(path.length, 3)];
  let its = D.items.filter(i => scheme === "all" || i.sch === scheme);
  path.forEach((p, i) => { its = its.filter(x => x[LEVELS[i][0]] === p); });
  const groups = groupBy(its, i => i[lvl[0]]);
  const totals = {}; ST.forEach(st => totals[st] = sum(D.byState[st].filter(i => scheme === "all" || i.sch === scheme), x => x.ra));
  const val = (arr, st) => {
    const a = arr.filter(x => x.st === st);
    if (!a.length) return null;
    const ra = sum(a, x => x.ra), pa = sum(a, x => x.pa);
    switch (metric) {
      case "ra": return ra;
      case "pa": return pa;
      case "share": return ra / totals[st];
      case "pc": return ra * 1e5 / D.govtEnrol[st];
      case "cut": return pa ? (pa - ra) / pa : null;
      case "uc": { const q = sum(a, x => x.rq); return q ? ra / q * 1e5 : null; }
    }
  };
  const fmt = {ra: v => cr(v), pa: v => cr(v), share: v => pct(v, 2), pc: v => rupees(v), cut: v => pct(v), uc: v => rupees(v)}[metric];
  const rows = Object.entries(groups).map(([k, arr]) => {
    const r = {k, label: lvl[0] === "code" ? `${arr[0].sa} (${k})` : k, arr};
    ST.forEach(st => r[st] = val(arr, st));
    r.tot = sum(arr, x => x.ra);
    return r;
  }).sort((a, b) => b.tot - a.tot);

  const crumbs = [`<a data-drill='[]'>All components</a>`].concat(path.map((p, i) =>
    `<a data-drill='${esc(JSON.stringify(path.slice(0, i + 1)))}'>${esc(i === 3 ? p : p)}</a>`)).join(" › ");
  const cols = [{k: "label", l: lvl[1], f: r => `${esc(r.label)}${lvl[0] !== "code" ? ` <span class="muted">(${r.arr.length})</span>` : ""}`}]
    .concat(ST.map(st => ({k: st, l: D.states[st].name, n: 1, f: r => fmt(r[st]), bar: SCOL[st]})));
  const canDrill = path.length < 3;
  const chartRows = rows.slice(0, 14).map(r => ({label: r.label, vals: Object.fromEntries(ST.map(s => [s, r[s]]))}));
  let detail = "";
  if (lvl[0] === "code") {
    detail = `<h2>Line items at this level</h2>` + itemTable("mixitems", its);
  }
  return `<h1>Budget mix</h1>
  <p class="lede">How each state's fresh 2026-27 approval divides across Samagra Shiksha's components. Click a row to drill down: major component → sub component → activity → line item.</p>
  <div class="controls">
    <span class="ctl-l">Show</span>${seg("mixMetric", [["ra", "Recommended ₹"], ["pa", "Proposed ₹"], ["share", "% of state total"], ["pc", "₹ per govt child"], ["cut", "Cut %"], ["uc", "Avg unit cost"]], metric)}
    <span class="ctl-l">Scheme</span>${seg("mixScheme", [["all", "All"], ["E", "Elementary"], ["S", "Secondary"], ["T", "Teacher Ed."]], scheme)}
  </div>
  <div class="crumbs">${crumbs}</div>
  ${metric === "uc" ? `<div class="note">Average unit cost = recommended amount ÷ recommended physical quantity, in rupees. It is only meaningful where the rows share a unit (e.g. one line item); at component level it mixes units.</div>` : ""}
  <div class="two">
    <div>${table("mix" + path.length, cols, rows, {rowAttr: r => canDrill ? `class="click" data-drill='${esc(JSON.stringify(path.concat([r.k])))}'` : "", sortKey: null})}</div>
    <div class="card"><h3>${esc(lvl[1])}s ${rows.length > 14 ? "(top 14)" : ""}</h3>${hbars(chartRows, fmt)}</div>
  </div>${detail}`;
};

function itemTable(id, its, opts = {}) {
  const cols = [
    {k: "st", l: "State", f: r => `${sw(r.st)}${esc(r.st)}`},
    {k: "sa", l: "Line item", f: r => `${esc(r.sa)} <span class="muted">${esc(r.code)} · ${r.rnr}</span><div class="sub">${esc(r.act)}</div>`},
    {k: "pq", l: "Prop. qty", n: 1, f: r => inr(r.pq)},
    {k: "pu", l: "Prop. unit ₹", n: 1, f: r => rupees(r.pu * 1e5), sv: r => r.pu},
    {k: "pa", l: "Proposed", n: 1, f: r => cr(r.pa)},
    {k: "rq", l: "Rec. qty", n: 1, f: r => inr(r.rq)},
    {k: "ru", l: "Rec. unit ₹", n: 1, f: r => rupees(r.ru * 1e5), sv: r => r.ru},
    {k: "ra", l: "Recommended", n: 1, f: r => cr(r.ra), bar: r => SCOL[r.st]},
    {k: "cut", l: "Cut", n: 1, f: r => r.cut ? `<span class="${r.cut > 0 ? "neg" : "pos"}">${r.cut > 0 ? "−" : "+"}${cr(Math.abs(r.cut))}</span>` : "—"},
    {k: "rem", l: "Coordinator remark", f: r => `<span class="sub">${esc(r.rem)}</span> ${pageRef(r.st, r.pg)}`, nosort: 1},
  ];
  return table(id, cols, its, {sortKey: "ra", limit: opts.limit || 60});
}

/* =====================================================================
   COMPARE LINE ITEMS
   ===================================================================== */
R.compare = () => {
  const q = S.cmpQ || "";
  const codes = Object.values(D.codes);
  const pick = S.cmpCode && D.codes[S.cmpCode] ? D.codes[S.cmpCode] : null;
  const only = S.cmpOnly || "2";
  const mode = S.cmpMode || "uc";
  const nIn = c => ST.filter(s => c.st[s]).length;
  let list = codes.filter(c => nIn(c) >= Math.min(+only, ST.length));
  if (q) { const t = q.toLowerCase().split(/\s+/).filter(Boolean); list = list.filter(c => t.every(w => `${c.sa} ${c.act} ${c.sub} ${c.maj} ${c.code}`.toLowerCase().includes(w))); }
  const rows = list.map(c => {
    const r = {code: c.code, sa: c.sa, act: c.act, sub: c.sub, n: nIn(c)};
    ST.forEach(st => {
      const it = c.st[st];
      r[st] = it ? (mode === "uc" ? it.ru * 1e5 : mode === "ra" ? it.ra : mode === "rq" ? it.rq : it.pa ? it.cut / it.pa : null) : null;
      if (mode === "uc" && it && !it.rq) r[st] = null;
    });
    const v = ST.map(st => r[st]).filter(x => x != null && x > 0);
    r.spread = v.length >= 2 ? Math.max(...v) / Math.min(...v) : null;
    r.tot = sum(ST.map(st => c.st[st] ? c.st[st].ra : 0));
    return r;
  });
  const fmt = {uc: rupees, ra: v => cr(v), rq: v => inr(v), cut: v => pct(v)}[mode];
  const cols = [
    {k: "sa", l: "Line item", f: r => `<a href="javascript:void 0" data-go="compare|cmpCode|${esc(r.code)}">${esc(r.sa)}</a> <span class="muted">${esc(r.code)}</span><div class="sub">${esc(r.sub)} › ${esc(r.act)}</div>`},
    ...ST.map(st => ({k: st, l: D.states[st].name, n: 1, f: r => fmt(r[st]), bar: SCOL[st]})),
  ];
  if (mode === "uc") cols.push({k: "spread", l: "Max ÷ min", n: 1, f: r => r.spread ? r.spread.toFixed(2) + "×" : "—", title: "Highest recommended unit cost divided by the lowest, across states that have the item"});
  let detail = "";
  if (pick) {
    const its = ST.map(st => pick.st[st]).filter(Boolean);
    const rowsD = [["Proposed quantity", i => inr(i.pq)], ["Proposed unit cost", i => rupees(i.pu * 1e5)], ["Proposed amount", i => cr(i.pa)],
      ["Recommended quantity", i => inr(i.rq)], ["Recommended unit cost", i => rupees(i.ru * 1e5)], ["Recommended amount", i => `<b>${cr(i.ra)}</b>`],
      ["Cut at appraisal", i => i.cut ? `<span class="${i.cut > 0 ? "neg" : "pos"}">${i.cut > 0 ? "−" : "+"}${cr(Math.abs(i.cut))} (${pct(i.cutPct)})</span>` : "none"],
      ["Recurring / NR", i => i.rnr], ["Share of state's fresh approval", i => pct(i.ra / D.fresh[i.st], 2)],
      ["Per govt-school child", i => rupees(i.ra * 1e5 / D.govtEnrol[i.st])],
      ["Coordinator remark", i => `<span class="sub">${esc(i.rem)}</span> ${pageRef(i.st, i.pg)}`]];
    detail = `<div class="card" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div>
      <h2 style="margin:0">${esc(pick.sa)} <span class="muted" style="font-weight:400">${esc(pick.code)}</span></h2>
      <div class="sub">${esc(SCHEME[pick.sch])} › ${esc(pick.maj)} › ${esc(pick.sub)} › ${esc(pick.act)}</div></div>
      <button class="btn ghost" data-go="compare|cmpCode|">Close</button></div>
      <div class="tw" style="margin-top:10px"><table><thead><tr><th></th>${ST.map(st => `<th>${sw(st)}${esc(D.states[st].name)}</th>`).join("")}</tr></thead>
      <tbody>${rowsD.map(([l, f]) => `<tr><td class="muted">${l}</td>${ST.map(st => `<td class="${l.includes("remark") ? "" : "n"}">${pick.st[st] ? f(pick.st[st]) : `<span class="muted">not in ${esc(abbr(st))}'s plan</span>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
  }
  const nAll = codes.filter(c => nIn(c) === ST.length).length, n2 = codes.filter(c => nIn(c) >= 2).length, nAny = codes.filter(c => nIn(c) >= 1).length;
  return `<h1>Compare line items across states</h1>
  <p class="lede">PRABANDH uses one national activity master, so the same code means the same activity in every state (${inr(nAny)} distinct codes across the ${ST.length} states shown: ${nAll} appear in all ${ST.length} plans, ${n2} in at least two). Pick any item to see quantity, unit cost, amount and the appraisal remark side by side.</p>
  ${detail}
  <div class="controls">
    <input type="search" id="cmpQ" placeholder="Search e.g. smart classroom, KGBV warden, uniform" value="${esc(q)}">
    <span class="ctl-l">Compare</span>${seg("cmpMode", [["uc", "Unit cost"], ["ra", "Recommended ₹"], ["rq", "Quantity"], ["cut", "Cut %"]], mode)}
    <span class="ctl-l">Items in</span>${seg("cmpOnly", [["1", "any state"], ["2", "≥ 2 states"], ...(ST.length > 3 ? [[String(Math.ceil(ST.length / 2) + (ST.length % 2 ? 0 : 1)), `≥ ${Math.ceil(ST.length / 2) + (ST.length % 2 ? 0 : 1)}`]] : []), [String(ST.length), `all ${ST.length}`]], only)}
  </div>
  ${mode === "uc" ? `<div class="note">Unit costs are the DoSEL-recommended rates. A large max ÷ min usually means the unit differs (e.g. per school vs per child) or a state-specific norm — read the remark before concluding one state is overpaying.</div>` : ""}
  ${table("cmp", cols, rows, {sortKey: mode === "uc" ? "spread" : ST[0], limit: 80})}`;
};
R.compare_after = () => {
  const i = document.getElementById("cmpQ");
  if (i) { i.oninput = () => { S.cmpQ = i.value; const p = i.selectionStart; render(); const j = document.getElementById("cmpQ"); j.focus(); j.setSelectionRange(p, p); }; }
};

/* =====================================================================
   APPRAISAL CUTS
   ===================================================================== */
R.appraisal = () => {
  const st = ST.includes(S.apSt) ? S.apSt : "all";
  const q = (S.apQ || "").toLowerCase();
  const its = D.items.filter(i => (st === "all" ? ST.includes(i.st) : i.st === st) && (!q || `${i.sa} ${i.act} ${i.sub} ${i.rem} ${i.code}`.toLowerCase().includes(q)));
  const rows = uniq(ST.flatMap(s => D.summary[s].major_2627.filter(r => r.name !== "TOTAL").map(r => r.name))).map(m => {
    const vals = {}, tips = {};
    ST.forEach(s => {
      const r = D.summary[s].major_2627.find(x => x.name === m);
      vals[s] = r && r.p_total ? (r.p_total - r.r_total) / r.p_total : null;
      tips[s] = r ? `Proposed ${cr(r.p_total)} → recommended ${cr(r.r_total)}` : "";
    });
    return {label: m, vals, tips, s: sum(ST.map(s => vals[s] || 0))};
  }).sort((a, b) => b.s - a.s);
  const cutItems = its.filter(i => i.cut > 0.005);
  const zero = its.filter(i => i.pa > 0 && i.ra === 0);
  const up = its.filter(i => i.cut < -0.005);
  const tiles = ST.map(s => {
    const a = D.byState[s];
    return `<div class="card tile statecard" style="--c:${SCOL[s]}"><div class="l">${esc(sname(s))}</div>
      <div class="v">−${cr(D.proposed[s] - D.fresh[s])}</div>
      <div class="sub">${pct((D.proposed[s] - D.fresh[s]) / D.proposed[s])} of ${cr(D.proposed[s])} proposed · ${a.filter(i => i.cut > 0.005).length} of ${a.length} items cut · ${a.filter(i => i.pa > 0 && i.ra === 0).length} dropped entirely</div></div>`;
  }).join("");
  return `<h1>Where DoSEL cut the state proposals</h1>
  <p class="lede">The PAB recommendation is the state's proposal after appraisal against Samagra Shiksha norms. Every line item carries the coordinator's remark explaining the decision — search them below.</p>
  <div class="grid gs">${tiles}</div>
  <div class="two" style="margin-top:16px">
    <div class="card"><h3>Share of the proposal cut, by major component</h3>${hbars(rows, v => pct(v))}</div>
    <div class="card"><h3>Biggest individual cuts</h3>${
      hbars(cutItems.slice().sort((a, b) => b.cut - a.cut).slice(0, 12).map(i => ({label: `${i.st}: ${i.sa}`, vals: {[i.st]: i.cut}, tips: {[i.st]: `Proposed ${cr(i.pa)} → ${cr(i.ra)}<br>${esc(i.rem)}`}})), v => cr(v), {states: ST}).replace(/<div class="r"[^>]*><b class="tr"><i style="width:0\.00%[^<]*<\/i><\/b><span><em>[^<]*<\/em>—<\/span><\/div>/g, "")
    }</div>
  </div>
  <div class="controls" style="margin-top:18px">
    <span class="ctl-l">State</span>${seg("apSt", [["all", "All shown"], ...ST.map(s => [s, abbr(s)])], st)}
    <input type="search" id="apQ" placeholder="Search item names and remarks, e.g. 'not under the purview', 'as per norm'" value="${esc(S.apQ || "")}" style="min-width:340px">
  </div>
  <h2>Cut items <span class="muted" style="font-weight:400">${cutItems.length} items, ${cr(sum(cutItems, x => x.cut))} removed</span></h2>
  ${itemTable("apcut", cutItems, {limit: 40})}
  <h2>Proposed but not recommended at all <span class="muted" style="font-weight:400">${zero.length} items, ${cr(sum(zero, x => x.pa))}</span></h2>
  ${itemTable("apzero", zero, {limit: 40})}
  ${up.length ? `<h2>Recommended above the proposal <span class="muted" style="font-weight:400">${up.length} items</span></h2>${itemTable("apup", up, {limit: 40})}` : ""}`;
};
R.appraisal_after = () => {
  const i = document.getElementById("apQ");
  if (i) i.oninput = () => { S.apQ = i.value; const p = i.selectionStart; render(); const j = document.getElementById("apQ"); j.focus(); j.setSelectionRange(p, p); };
};

/* =====================================================================
   2025-26 UTILISATION
   ===================================================================== */
R.utilisation = () => {
  const lvl = S.utLvl || "major";
  const tiles = ST.map(st => {
    const g = D.summary[st].glance;
    const G = g.find(x => x.name === "Grand Total");
    return `<div class="card statecard" style="--c:${SCOL[st]}"><div class="hd"><b>${esc(sname(st))}</b><span>2025-26, incl. spill-over</span></div>
      <div class="hero">${pct(G.exp_total / G.appr_total, 0)}<small>spent</small></div>
      <div class="sub">${cr(G.exp_total)} of ${cr(G.appr_total)} approved; balance ${cr(G.bal_total)}</div>
      <div class="kv">${g.filter(x => x.name !== "Grand Total").map(x => `<span>${esc(x.name)}</span><b>${pct(x.exp_total / x.appr_total, 0)} <span class="muted" style="font-weight:400">of ${cr(x.appr_total, 0)}</span></b>`).join("")}
      <span>Recurring</span><b>${pct(G.exp_r / G.appr_r, 0)}</b><span>Non-recurring</span><b>${pct(G.exp_nr / G.appr_nr, 0)}</b></div></div>`;
  }).join("");
  const src = lvl === "major" ? "major_2526" : "sub_2526";
  const names = uniq(ST.flatMap(st => D.summary[st][src].filter(r => r.name !== "TOTAL").map(r => r.name)));
  const rows = names.map(n => {
    const r = {name: n};
    ST.forEach(st => {
      const x = D.summary[st][src].find(y => y.name === n);
      r[st] = x && x.appr_total ? x.exp_total / x.appr_total : null;
      r[st + "_a"] = x ? x.appr_total : null;
      r[st + "_e"] = x ? x.exp_total : null;
    });
    r.tot = sum(ST.map(st => r[st + "_a"] || 0));
    return r;
  }).filter(r => r.tot > 0).sort((a, b) => b.tot - a.tot);
  const cols = [{k: "name", l: lvl === "major" ? "Major component" : "Sub component"}];
  ST.forEach(st => {
    cols.push({k: st + "_a", l: `${st} approved`, n: 1, f: r => cr(r[st + "_a"])});
    cols.push({k: st, l: `${st} spent`, n: 1, f: r => r[st] == null ? "—" : `<span data-tip="${esc(`${cr(r[st + "_e"])} spent of ${cr(r[st + "_a"])}`)}">${pct(r[st], 0)}</span>`, bar: SCOL[st]});
  });
  return `<h1>How much of 2025-26 was actually spent</h1>
  <p class="lede">The PRABANDH summary in each state's Annexure III reports 2025-26 approvals (fresh + spill-over) against expenditure booked "till date" when the sheet was generated (May–June 2026). Low non-recurring spend is what becomes next year's spill-over.</p>
  <div class="grid gs">${tiles}</div>
  <div class="controls" style="margin-top:18px"><span class="ctl-l">Level</span>${seg("utLvl", [["major", "Major component"], ["sub", "Sub component"]], lvl)}</div>
  ${table("ut" + lvl, cols, rows, {sortKey: null})}`;
};

/* =====================================================================
   SPILL-OVER
   ===================================================================== */
R.spill = () => {
  const st = ST.includes(S.spSt) ? S.spSt : "all";
  const q = (S.spQ || "").toLowerCase();
  const tiles = ST.map(s => {
    const x = D.spill[s].summary;
    const segs = [["Completed", x.completed, SCOL[s]], ["Cancelled", x.cancelled, "var(--bad)"], ["Actual spill-over", x.spillover, "var(--prop)"]];
    return `<div class="card statecard" style="--c:${SCOL[s]}"><div class="hd"><b>${esc(sname(s))}</b><span>${inr(D.spill[s].items.length)} works</span></div>
      <div class="hero">${cr(x.balance, 0)}</div><div class="sub">balance of earlier non-recurring approvals carried into 2026-27</div>
      <div class="stack">${segs.map(([l, v, c]) => `<i style="width:${(v / x.approved * 100).toFixed(2)}%;background:${c}" data-tip="${esc(`<b>${l}</b><br>${cr(v)} · ${pct(v / x.approved)} of approved`)}"></i>`).join("")}</div>
      <div class="kv"><span>Originally approved</span><b>${cr(x.approved)}</b><span>Financially completed</span><b>${cr(x.completed)} (${pct(x.completed / x.approved, 0)})</b>
      <span>Cancelled</span><b>${cr(x.cancelled)}</b><span>Actual spill-over (after cancellation)</span><b>${cr(x.spillover)}</b>
      <span>Spill-over ÷ fresh 2026-27</span><b>${pct(x.balance / D.fresh[s], 0)}</b></div></div>`;
  }).join("");
  const majors = uniq(ST.flatMap(s => D.spill[s].pivot.map(p => p.major)));
  const prow = majors.map(m => ({label: m, vals: Object.fromEntries(ST.map(s => [s, sum(D.spill[s].pivot.filter(p => p.major === m), p => p.spillover)])), })).sort((a, b) => sum(ST.map(s => b.vals[s])) - sum(ST.map(s => a.vals[s])));
  const its = ST.flatMap(s => D.spill[s].items.map(i => ({...i, st: s, pc: i.appr_amt ? i.done_amt / i.appr_amt : null})))
    .filter(i => (st === "all" ? ST.includes(i.st) : i.st === st) && (!q || `${i.subactivity} ${i.activity} ${i.sub} ${i.code}`.toLowerCase().includes(q)));
  const cols = [
    {k: "st", l: "State", f: r => `${sw(r.st)}${esc(r.st)}`},
    {k: "subactivity", l: "Work", f: r => `${esc(r.subactivity)} <span class="muted">${esc(r.code)}</span><div class="sub">${esc(r.sub)} › ${esc(r.activity)}</div>`},
    {k: "appr_qty", l: "Units approved", n: 1, f: r => inr(r.appr_qty)},
    {k: "done_qty", l: "Units completed", n: 1, f: r => inr(r.done_qty)},
    {k: "appr_amt", l: "Approved", n: 1, f: r => cr(r.appr_amt)},
    {k: "pc", l: "Fin. completed", n: 1, f: r => pct(r.pc, 0)},
    {k: "cancelled", l: "Cancelled", n: 1, f: r => cr(r.cancelled)},
    {k: "spillover", l: "Spill-over", n: 1, f: r => `${cr(r.spillover)} ${pageRef(r.st, r.page)}`, bar: r => SCOL[r.st]},
  ];
  return `<h1>Spill-over: earlier works still open</h1>
  <p class="lede">Annexure II lists every non-recurring work sanctioned in earlier years that is not yet financially complete. The minutes' "spill-over" column is the balance before cancellations; the Ministry's D.O. of 10 April 2026 asks states to cancel unstarted 2018-19 to 2020-21 works, which is what the cancelled column records.</p>
  <div class="grid gs">${tiles}</div>
  <div class="card" style="margin-top:16px"><h3>Actual spill-over by major component</h3>${hbars(prow, v => cr(v))}</div>
  <div class="controls" style="margin-top:18px"><span class="ctl-l">State</span>${seg("spSt", [["all", "All shown"], ...ST.map(s => [s, abbr(s)])], st)}
    <input type="search" id="spQ" placeholder="Search works, e.g. additional classroom, KGBV, lab" value="${esc(S.spQ || "")}"></div>
  ${table("sp", cols, its, {sortKey: "spillover", limit: 50})}`;
};
R.spill_after = () => {
  const i = document.getElementById("spQ");
  if (i) i.oninput = () => { S.spQ = i.value; const p = i.selectionStart; render(); const j = document.getElementById("spQ"); j.focus(); j.setSelectionRange(p, p); };
};

/* =====================================================================
   WORKS & SCHOOLS (Annexure IV)
   ===================================================================== */
let SCHOOLS = null, schoolsLoading = false;
function loadSchools() {
  if (SCHOOLS || schoolsLoading) return;
  schoolsLoading = true;
  fetch("schools.json").then(r => r.json()).then(j => { SCHOOLS = j; schoolsLoading = false; if ((location.hash || "").startsWith("#works")) render(); })
    .catch(() => { schoolsLoading = false; });
}
R.works = () => {
  const withList = ST.filter(s => D.checks.school_rows[s]);
  const without = ST.filter(s => !D.checks.school_rows[s]);
  const REASON = {Haryana: "its spill-over was large enough that no fresh non-recurring work was approved", MH: "the PDF supplied ends at Annexure III although its index lists an Annexure IV"};
  if (!withList.length) return `<h1>Where the approved works go</h1><div class="note">None of the states shown has an Annexure IV school list. ${without.map(s => `${esc(sname(s))}: ${esc(REASON[s] || "no Annexure IV in the PDF")}.`).join(" ")}</div>`;
  const st = withList.includes(S.wkSt) ? S.wkSt : withList.includes("UP") ? "UP" : withList[0];
  const masters = D.school_masters.map((m, i) => ({...m, i})).filter(m => m.st === st);
  const agg = D.school_agg.filter(([m]) => D.school_masters[m].st === st);
  const byM = groupBy(agg, a => a[0]);
  masters.forEach(m => { const a = byM[m.i] || []; m.n = sum(a, x => x[2]); m.q = sum(a, x => x[3]); });
  masters.sort((a, b) => b.n - a.n);
  const mi = S.wkM != null && masters.find(m => m.i === +S.wkM) ? +S.wkM : "all";
  const sel = agg.filter(a => mi === "all" || a[0] === mi);
  const byD = groupBy(sel, a => a[1]);
  const drows = Object.entries(byD).map(([d, a]) => ({d: +d, name: D.school_districts[+d].d, n: sum(a, x => x[2]), q: sum(a, x => x[3]), acts: a.length}))
    .sort((a, b) => b.n - a.n);
  const nD = uniq(D.school_districts.filter(x => x.st === st && x.d !== "(state level)").map(x => x.d)).length;
  const q = (S.wkQ || "").trim().toLowerCase();
  const dsel = S.wkD != null ? +S.wkD : null;
  let schoolList = "";
  if (q.length >= 3 || dsel != null) {
    if (!SCHOOLS) { loadSchools(); schoolList = `<div class="loading">Loading the school list (≈2.8 MB)…</div>`; }
    else {
      const rows = SCHOOLS.filter(r => D.school_masters[r[0]].st === st && (mi === "all" || r[0] === mi) && (dsel == null || r[1] === dsel) &&
        (!q || String(r[2]).toLowerCase().includes(q) || String(r[3]).toLowerCase().includes(q)))
        .map(r => ({udise: r[2], school: r[3], district: D.school_districts[r[1]].d, work: D.school_masters[r[0]].m, act: D.school_masters[r[0]].act, qty: r[4]}));
      schoolList = `<h2>${dsel != null ? esc(D.school_districts[dsel].d) + " — " : ""}${inr(rows.length)} approvals${q ? ` matching “${esc(q)}”` : ""} ${dsel != null ? `<button class="btn ghost" data-go="works|wkD|">clear district</button>` : ""}</h2>` +
        table("wkschools", [{k: "udise", l: "UDISE / ID"}, {k: "school", l: "School"}, {k: "district", l: "District"}, {k: "work", l: "Work", f: r => `${esc(r.work)}<div class="sub">${esc(r.act)}</div>`}, {k: "qty", l: "Qty", n: 1, f: r => inr(r.qty)}], rows, {limit: 100, sortKey: null});
    }
  }
  return `<h1>Where the approved works go</h1>
  <p class="lede">Annexure IV lists the school behind every fresh non-recurring approval (civil works, ICT, labs, KGBV works).${without.length ? " No school list for " + without.map(s => `${esc(sname(s))} (${esc(REASON[s] || "no Annexure IV in the PDF")})`).join("; ") + "." : ""}</p>
  <div class="controls"><span class="ctl-l">State</span>${seg("wkSt", withList.map(s => [s, sname(s)]), st)}
    <select id="wkM"><option value="all">All works (${inr(sum(masters, m => m.n))} school approvals)</option>${masters.map(m => `<option value="${m.i}" ${m.i === mi ? "selected" : ""}>${esc(m.m)} — ${esc(m.act)} (${inr(m.n)})</option>`).join("")}</select>
    <input type="search" id="wkQ" placeholder="Find a school by name or UDISE code" value="${esc(S.wkQ || "")}"></div>
  <div class="grid g4">
    <div class="card tile"><div class="l">School-level approvals</div><div class="v">${inr(sum(sel, a => a[2]))}</div></div>
    <div class="card tile"><div class="l">Physical quantity</div><div class="v">${inr(sum(sel, a => a[3]))}</div></div>
    <div class="card tile"><div class="l">Districts covered</div><div class="v">${drows.filter(r => r.name !== "(state level)").length} <span class="sub">of ${nD} in the lists</span></div></div>
    <div class="card tile"><div class="l">Top-5 districts' share</div><div class="v">${pct(sum(drows.slice(0, 5), x => x.n) / Math.max(1, sum(drows, x => x.n)), 0)}</div></div>
  </div>
  <div class="two" style="margin-top:14px">
    <div>${table("wkd", [{k: "name", l: "District"}, {k: "n", l: "Schools/approvals", n: 1, f: r => inr(r.n), bar: SCOL[st]}, {k: "q", l: "Quantity", n: 1, f: r => inr(r.q)}, {k: "acts", l: "Types of work", n: 1}],
      drows, {rowAttr: r => `class="click" data-go="works|wkD|${r.d}"`, sortKey: "n", limit: 25})}</div>
    <div class="card"><h3>Types of work ${mi === "all" ? "" : "(selected)"}</h3>${
      hbars(masters.filter(m => mi === "all" || m.i === mi).slice(0, 16).map(m => ({label: `${m.m}`, vals: {[st]: m.n}, tips: {[st]: `${esc(m.act)}<br>quantity ${inr(m.q)}`}})), v => inr(v), {states: [st]})}</div>
  </div>${schoolList}
  <p class="sub">Quantities in the lists reconcile with the recommended physical quantity of the matching line item for ${D.checks.school_list_matches} works (see Data &amp; checks).</p>`;
};
R.works_after = () => {
  const m = document.getElementById("wkM"); if (m) m.onchange = () => { S.wkM = m.value === "all" ? null : m.value; S.wkD = null; render(); };
  const i = document.getElementById("wkQ");
  if (i) i.oninput = () => { S.wkQ = i.value; const p = i.selectionStart; render(); const j = document.getElementById("wkQ"); j.focus(); j.setSelectionRange(p, p); };
};
S.onSeg = n => { if (n === "wkSt") { S.wkM = null; S.wkD = null; } if (n === "mixScheme") S.mixPath = []; };

/* =====================================================================
   STATE CONTEXT (minutes Section I)
   ===================================================================== */
R.context = () => {
  const I = D.minutes.indicators;
  const groups = groupBy(I, i => i.group);
  const fmtV = (ind, x) => {
    if (!x) return `<span class="muted">not reported</span>`;
    const u = ind.unit;
    const f = v => v == null ? null : u === "%" ? v + "%" : u === "count" ? inr(v) : String(v);
    let s = x.v == null ? "" : `<b>${f(x.v)}</b>`;
    if (x.prev != null && x.v != null) {
      const up = x.v > x.prev, good = ind.better ? (ind.better === "high" ? up : !up) : null;
      s = `<span class="muted">${f(x.prev)} →</span> ${s} <span class="${good == null ? "muted" : good ? "pos" : "neg"}">${up ? "▲" : x.v < x.prev ? "▼" : "="}</span>`;
    }
    const note = x.note ? `<div class="sub">${esc(x.note)}</div>` : "";
    return `${s}${note}`;
  };
  const best = ind => {
    if (!ind.better) return null;
    const v = ST.map(s => [s, ind.values[s] && ind.values[s].v]).filter(x => x[1] != null);
    if (v.length < 2) return null;
    if (ind.unit === "count" && !/zero|small|single|works/.test(ind.id)) return null;   // raw counts scale with state size
    v.sort((a, b) => ind.better === "high" ? b[1] - a[1] : a[1] - b[1]);
    return v[0][1] === v[1][1] ? null : v[0][0];
  };
  const sec = Object.entries(groups).map(([g, arr]) => `<h2>${esc(g)}</h2><div class="tw"><table><thead><tr><th style="width:26%">Indicator</th>${ST.map(s => `<th>${sw(s)}${esc(sname(s))}</th>`).join("")}</tr></thead><tbody>
    ${arr.map(ind => { const b = best(ind); return `<tr><td>${esc(ind.label)}${ind.unit && ind.unit !== "text" && ind.unit !== "count" && ind.unit !== "%" ? ` <span class="muted">(${esc(ind.unit)})</span>` : ""}</td>${ST.map(s => `<td>${fmtV(ind, ind.values[s])}${b === s ? '<span class="bestmark" title="Best among the states shown on this indicator">BEST</span>' : ""} ${ind.values[s] ? pageRef(s, ind.values[s].page) : ""}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>`).join("");
  const gov = `<h2>Scheme compliance checklist</h2><div class="tw"><table><thead><tr><th style="width:26%">Item</th>${ST.map(s => `<th>${sw(s)}${esc(sname(s))}</th>`).join("")}</tr></thead><tbody>
    ${D.minutes.governance.map(g => `<tr><td>${esc(g.label)}</td>${ST.map(s => { const x = g.states[s]; if (!x) return '<td><span class="muted">not discussed</span></td>'; return `<td><span class="pill ${x.status}">${x.status === "yes" ? "✓ Yes" : x.status === "no" ? "✕ No" : "◐ Partial"}</span><div class="sub">${esc(x.text)} ${pageRef(s, x.page)}</div></td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
  const dirs = `<h2>What the PAB asked each state to do</h2><div class="grid gs">${ST.map(s => `<div class="card statecard" style="--c:${SCOL[s]}"><div class="hd"><b>${esc(sname(s))}</b></div><ul class="insights">${(D.minutes.directions[s] || []).map(d => `<li><b>${esc(d.topic)}:</b> ${esc(d.text)} ${pageRef(s, d.page)}</li>`).join("")}</ul></div>`).join("")}</div>`;
  const meta = `<div class="grid gs">${ST.map(s => { const m = D.states[s]; return `<div class="card tile statecard" style="--c:${SCOL[s]}"><div class="l">${esc(m.name)}</div><div class="v">${m.districts != null ? m.districts + " districts" : "—"}</div><div class="sub">${m.aspirational != null ? m.aspirational + " aspirational" : "districts not stated"}${m.aspirational_names ? ": " + esc(m.aspirational_names) : ""} · ${inr(m.schools)} schools · ${inr(m.enrolment)} students</div></div>`; }).join("")}</div>`;
  return `<h1>State context from the minutes</h1>
  <p class="lede">Section I of each minutes records the educational indicators the PAB discussed (mostly UDISE+ 2024-25, compared with 2023-24) and the governance items it followed up. Only Haryana's minutes have a usable text layer; the other states' minutes are scans, so their figures were read off the page images. Every cell links to its PDF page. Counts that simply scale with state size are never marked "best". Arrows compare with the previous year; green means the change is in the desirable direction.</p>
  ${meta}${dirs}${sec}${gov}`;
};

/* =====================================================================
   DATA & CHECKS
   ===================================================================== */
R.checks = () => {
  const C = D.checks;
  const ic = ALL.map(s => C.item_checks[s]);
  const totalChecks = sum(ic, x => x.checks), failed = sum(ic, x => x.failed);
  const recon = C.recon;
  const rows = recon.map(r => ({...r, diff: r.derived - r.printed}));
  const cols = [
    {k: "st", l: "State", f: r => `${sw(r.st)}${esc(r.st)}`},
    {k: "label", l: "Figure in the minutes"},
    {k: "printed", l: "Printed", n: 1, f: r => inr(r.printed, 2)},
    {k: "derived", l: "Recomputed", n: 1, f: r => inr(r.derived, 2)},
    {k: "diff", l: "Difference", n: 1, f: r => inr(r.diff, 2)},
    {k: "ok", l: "Result", f: r => r.ok ? `<span class="pill yes">✓ matches</span>` : `<span class="pill no">✕ does not add up</span>`, sv: r => r.ok ? 1 : 0},
    {k: "source", l: "Recomputed from", f: r => `<span class="sub">${esc(r.source)}</span>`},
  ];
  const csvBtn = (id, label) => `<button class="btn ghost" data-csv="${id}">${label}</button>`;
  return `<h1>Data &amp; checks</h1>
  <p class="lede">Every number on this site is extracted from the ${ALL.length} PAB minutes PDFs and then re-added against every independent total the PDFs print. Nothing is typed in by hand except the narrative of the minutes (indicators, governance, the financial table), which most states publish only as scans.</p>
  <div class="grid g4">
    <div class="card tile"><div class="l">Line items extracted</div><div class="v">${inr(D.items.length)}</div><div class="sub">${ALL.map(s => `${abbr(s)} ${C.item_checks[s].n_items}`).join(" · ")}</div></div>
    <div class="card tile"><div class="l">Line-item reconciliation checks</div><div class="v">${inr(totalChecks)}</div><div class="sub">${failed} failed · every subtotal, component, scheme and grand total</div></div>
    <div class="card tile"><div class="l">qty × unit cost = amount</div><div class="v">${inr(D.items.length * 2)}</div><div class="sub">${sum(ic, x => x.arith_flags)} rows off (proposal &amp; recommendation sides)</div></div>
    <div class="card tile"><div class="l">School-list quantities matched</div><div class="v">${C.school_list_matches}</div><div class="sub">works whose Annexure IV total equals the recommended quantity</div></div>
  </div>
  <h2>Findings</h2>
  ${C.findings.map(f => `<div class="${f.severity === "discrepancy" ? "warnbox" : "note"}"><b>${f.severity === "discrepancy" ? "⚠ Discrepancy in the minutes" : "ℹ Definition"} — ${esc(f.st === "All" ? "all states" : sname(f.st))}${f.page ? ` (PDF page ${f.page})` : ""}:</b> ${esc(f.text)}</div>`).join("")}
  <h2>Minutes Section II vs the annexures</h2>
  <p class="sub">Each printed figure in the financial table is recomputed from the extracted annexures.</p>
  ${table("recon", cols, rows, {sortKey: "ok", sortDir: 1})}
  <h2>How the data was built</h2>
  <div class="card"><ol class="insights">
    <li><b>Annexure III (item-wise recommendation)</b> — every table cell is read by its geometry from the PRABANDH grid (pdfplumber). Hierarchy comes from the column a "Subtotal of …" row lands in, so merged header cells cannot misfile a row. Each state's items reconcile to the rupee with all ${inr(sum(ALL.map(s => D.summary[s].sub_2627.length)))} sub-component rows and the major-component, scheme and FLN totals in the same annexure.</li>
    <li><b>Annexure II (spill-over)</b> — ${inr(sum(ALL.map(s => C.spill_rows[s])))} works, checked against the scheme table and the major-component pivot (approved, completed, cancelled, spill-over).</li>
    <li><b>Annexure IV (school lists)</b> — ${Object.entries(C.school_rows).map(([s, n]) => `${inr(n)} ${esc(abbr(s))}`).join(", ")} rows; group names that break across pages are back-filled. Works approved without a school list: ${C.school_list_nolist.map(x => `${esc(x.st)} ${esc(x.sa)}`).join("; ")}.</li>
    <li><b>Minutes narrative</b> — Haryana from its text layer. MP, UP and Maharashtra have unreliable OCR ("B" for 8, "Z" for 2) and Karnataka and Telangana have no text layer at all, so these were read from rendered page images.</li>
    <li><b>Two PRABANDH templates</b> — Maharashtra's sheet is a newer layout without a Recurring/Non-recurring column; its flags are inferred from the national activity codes and reconciled against its own R/NR totals.</li>
    <li>Amounts are in ₹ lakh in the PDFs and shown here in ₹ crore (1 crore = 100 lakh). Unit costs are shown in rupees.</li>
  </ol></div>
  <h2>Download</h2>
  <div class="controls">${csvBtn("items", "All line items (CSV)")}${csvBtn("spill", "Spill-over works (CSV)")}${csvBtn("components", "Component summary (CSV)")}${csvBtn("indicators", "Indicators (CSV)")}</div>
  <p class="sub">Source: PAB minutes for AWP&amp;B 2026-27 (${ALL.map(s => `${esc(sname(s))} ${new Date(D.states[s].date).toLocaleDateString("en-IN")}`).join(", ")}), Department of School Education &amp; Literacy, Ministry of Education. Data built ${esc(D.generated)}.</p>`;
};
function csv(rows, cols) {
  const q = v => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [cols.join(",")].concat(rows.map(r => cols.map(c => q(r[c])).join(","))).join("\n");
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-csv]"); if (!b) return;
  let text, name;
  if (b.dataset.csv === "items") { name = "pab_2026-27_line_items.csv"; text = csv(D.items.map(i => ({state: sname(i.st), scheme: SCHEME[i.sch], major_component: i.maj, sub_component: i.sub, activity: i.act, line_item: i.sa, code: i.code, recurring: i.rnr, proposed_qty: i.pq, proposed_unit_cost_lakh: i.pu, proposed_lakh: i.pa, recommended_qty: i.rq, recommended_unit_cost_lakh: i.ru, recommended_lakh: i.ra, remark: i.rem, pdf_page: i.pg})), ["state", "scheme", "major_component", "sub_component", "activity", "line_item", "code", "recurring", "proposed_qty", "proposed_unit_cost_lakh", "proposed_lakh", "recommended_qty", "recommended_unit_cost_lakh", "recommended_lakh", "remark", "pdf_page"]); }
  if (b.dataset.csv === "spill") { name = "pab_2026-27_spillover.csv"; const r = ALL.flatMap(s => D.spill[s].items.map(i => ({state: sname(s), ...i}))); text = csv(r, ["state", "scheme", "major", "sub", "activity", "subactivity", "code", "appr_qty", "appr_amt", "done_qty", "done_amt", "cancelled", "spillover", "page"]); }
  if (b.dataset.csv === "components") { name = "pab_2026-27_components.csv"; const r = ALL.flatMap(s => D.summary[s].sub_2627.map(x => ({state: sname(s), level: "sub component 2026-27", ...x})).concat(D.summary[s].major_2627.map(x => ({state: sname(s), level: "major component 2026-27", ...x})))); text = csv(r, ["state", "level", "name", "p_r", "p_nr", "p_total", "r_r", "r_nr", "r_total"]); }
  if (b.dataset.csv === "indicators") { name = "pab_2026-27_indicators.csv"; const r = D.minutes.indicators.flatMap(i => ALL.filter(s => i.values[s]).map(s => ({state: sname(s), group: i.group, indicator: i.label, unit: i.unit, value: i.values[s].v, previous: i.values[s].prev, note: i.values[s].note, pdf_page: i.values[s].page}))); text = csv(r, ["state", "group", "indicator", "unit", "value", "previous", "note", "pdf_page"]); }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type: "text/csv"})); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

/* ---------------- state picker ---------------- */
function drawPicker() {
  document.getElementById("stateLegend").innerHTML = ALL.map(s =>
    `<button type="button" class="stpick ${ST.includes(s) ? "" : "off"}" data-pick="${s}" aria-pressed="${ST.includes(s)}" title="${esc(sname(s))} — click to ${ST.includes(s) ? "hide" : "show"}">${sw(s)}<b>${esc(abbr(s))}</b></button>`).join("") +
    `<button type="button" class="stpick" data-pick="*" title="Show all states">All</button>`;
  document.getElementById("brandSub").textContent = `${ST.map(sname).join(" · ")} — approvals, appraisal cuts and spill-over, every line item`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-pick]"); if (!b) return;
  const s = b.dataset.pick;
  if (s === "*") ST = ALL.slice();
  else if (ST.includes(s)) { if (ST.length > 1) ST = ST.filter(x => x !== s); }
  else ST = ALL.filter(x => ST.includes(x) || x === s);
  try { localStorage.setItem("pab.states", JSON.stringify(ST)); } catch (_) {}
  drawPicker(); render();
});

/* ---------------- boot ---------------- */
fetch("data.json").then(r => r.json()).then(j => {
  D = j;
  ALL = Object.keys(D.states);
  ALL.forEach((s, i) => SCOL[s] = `var(--s${i + 1})`);
  let saved = null; try { saved = JSON.parse(localStorage.getItem("pab.states") || "null"); } catch (_) {}
  ST = Array.isArray(saved) && saved.filter(s => ALL.includes(s)).length ? ALL.filter(s => saved.includes(s)) : ALL.slice();
  derive();
  drawPicker();
  window.PAB = {D, S, get ST() { return ST; }, get ALL() { return ALL; }, SCOL, SCHEME, esc, inr, cr, pct, rupees, sum, groupBy, uniq, sname, abbr, table, hbars, seg, render, sw, pageRef, key};
  route();
}).catch(err => {
  document.getElementById("main").innerHTML = `<div class="warnbox">Could not load data.json (${esc(err.message)}). If you opened this file directly from disk, serve the folder over HTTP instead.</div>`;
});
