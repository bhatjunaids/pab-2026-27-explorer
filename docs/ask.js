/* Ask — plain-English questions over the PAB data.

   The invariant: a language model may choose WHAT TO LOOK AT, never WHAT THE
   NUMBER IS. A question is translated into a FilterSpec (dataset, states,
   terms, conditions, grouping, measure). coerceSpec() validates it; execute()
   computes every figure from data.json. The spec that ran is always shown, so
   a misread question shows up as the wrong rows, visibly described — never as
   an invented figure.

   Two translators produce the same spec: a deterministic parser (no key, always
   available) and Claude via structured outputs using the reader's own API key. */
"use strict";

const ASK = (() => {
  const LS_KEY = "pab.ask.key", LS_MODEL = "pab.ask.model", LS_MODE = "pab.ask.mode";
  const MODELS = [
    {id: "claude-opus-5", label: "Claude Opus 5 — most capable"},
    {id: "claude-sonnet-5", label: "Claude Sonnet 5 — faster"},
    {id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — fastest"},
  ];
  const DATASETS = ["items", "spill", "utilisation", "works", "indicators"];
  const GROUPS = {
    items: ["none", "state", "scheme", "major", "sub", "activity", "item"],
    spill: ["none", "state", "scheme", "major", "sub", "item"],
    utilisation: ["state", "major", "sub"],
    works: ["state", "district", "work"],
    indicators: ["none"],
  };
  const MEASURES = {
    items: ["recommended", "proposed", "cut", "cut_pct", "quantity", "unit_cost", "count", "share_pct", "per_child"],
    spill: ["spillover", "approved", "completed", "cancelled", "count"],
    utilisation: ["spent_pct", "approved", "spent"],
    works: ["schools", "quantity"],
    indicators: ["value"],
  };
  const COND_FIELDS = {
    items: ["recommended", "proposed", "cut", "cut_pct", "quantity", "unit_cost"],
    spill: ["spillover", "approved", "completed", "cancelled"],
    utilisation: ["spent_pct", "approved", "spent"],
    works: [], indicators: [],
  };
  const OPS = [">", ">=", "<", "<=", "=", "!="];
  const ALLST = () => PAB.ALL;          // every state in the data
  const SHOWN = () => PAB.ST;           // states selected in the header picker

  /* ---------------- vocabulary ---------------- */
  const SYN = [
    [/\bkgbv|kasturba/, "kasturba|kgbv"],
    [/teachers?'? ?salar|teachers? pay|financial support for teachers|teacher honorari/, "financial support for teachers"],
    [/salar|honorari/, "salary|honorarium"],
    [/uniform/, "uniform"],
    [/text ?books?|free books/, "textbook|text book"],
    [/\bfln\b|nipun|foundational literacy/, "foundational literacy"],
    [/\bict\b|computer|digital/, "ict|digital|computer"],
    [/smart ?class/, "smart class"],
    [/cwsn|disab|special needs|inclusive/, "children with special needs|cwsn|inclusive"],
    [/vocation|skill/, "vocational|skill"],
    [/sport|physical education/, "sports"],
    [/librar/, "library"],
    [/toilet/, "toilet"],
    [/\blabs?\b|laborator/, "lab"],
    [/balvatika|pre-?primary|ecce|early childhood/, "pre-primary|ecce|balvatika|early childhood"],
    [/transport|escort/, "transport"],
    [/12 ?\(1\) ?\(c\)|25 ?%.*admission|rte reimburse|reimbursement/, "reimbursement"],
    [/\bdiets?\b/, "diet"],
    [/\bscert\b/, "scert"],
    [/training/, "training"],
    [/\bgirls?\b/, "girl|balika|kgbv|kasturba"],
    [/hostel/, "hostel"],
    [/programme management|program management|mmmer/, "program management"],
    [/innovation/, "innovation"],
    [/out[- ]of[- ]school|\boosc\b/, "out of school|oosc"],
    [/composite (school )?grant|school grant/, "composite school grant"],
    [/self[- ]defen|rani laxmibai/, "rani laxmibai"],
    [/netaji|nscbav/, "netaji"],
    [/\bbrc\b|\bcrc\b|block resource|cluster resource/, "brc|crc"],
    [/classroom/, "classroom"],
    [/boundary wall/, "boundary wall"],
    [/drinking water/, "drinking water"],
    [/electrif|solar/, "electrif|solar"],
    [/dilapidated/, "dilapidated"],
    [/major repair/, "major repair"],
    [/furniture/, "furniture"],
    [/assessment/, "assessment"],
    [/stipend/, "stipend"],
    [/dajgua/, "dajgua"],
    [/janman/, "janman"],
    [/tinkering|robotic|stem/, "tinkering|robotic|stem"],
    [/\bmis\b|vidya samiksha|monitoring/, "monitoring|vidya samiksha|mis"],
    [/community mobili/, "community mobilization"],
    [/open school/, "open school"],
    [/guidance|counsel/, "guidance|counsel"],
    [/band|kala utsav/, "band|kala utsav"],
    [/new school|upgrad/, "new school|upgraded"],
  ];
  const INDICATOR_WORDS = /\bger\b|gross enrol|\bner\b|net enrol|retention|dropout|drop-out|transition|\bgar\b|access ratio|vacanc|single[- ]teacher|\bptr\b|pupil.teacher|without electricity|electricity|drinking water facility|girls.? toilet|boys.? toilet|ict labs?|smart classrooms? (in|%)|physics lab|chemistry lab|biology lab|apaar|eco.?club|cwsn (share|enrol)|enrolment|zero enrol|small school|kgbv seats|vacant seat|parakh|indicator|udise/;
  const BUDGET_WORDS = /₹|\brs\.?\b|budget|approv|recommend|propos|cost|amount|crore|\bcr\b|lakh|allocat|fund|spend|spent|money|how much|cut|outlay|expenditure/;
  const STOP = new Set("a an the of for in on to and or by with vs versus what which how much many is are was were do does did show list give me all each per across state states total totals top largest biggest highest lowest smallest least most compare comparison between recommended recommend approved approval proposed proposal budget crore lakh rs amount amounts spend spending item items line cost costs unit rate cut cuts reduced reduction percent percentage share than more less over under above below from get where get tell find about within their its it that this those these has have been got under items? into be up haryana madhya pradesh uttar mp hr any only not rejected dropped zero get sanctioned allocated allocation funds fund money much for".split(/\s+/));

  // words that describe the question, not a component/item name
  const GENERIC = new Set("free fresh child children student students pupil pupils works work major minor civil room rooms amount government govt total plan year years items item class classes stage level highest upto provision support financial existing annual people number numbers value values name names type types kind show data compare comparison states state district districts school schools scheme schemes component components sub activity activities recurring nonrecurring elementary secondary teacher teachers education spill spillover over each largest much many biggest highest lowest smallest share percent fund funds funding approval approved recommendation recommended proposal proposed cost costs unit units rate rates cut cuts remark remarks reason reasons purview what which where when".split(" "));
  function vocab() {
    if (vocab.v) return vocab.v;
    const D = PAB.D, w = new Set();
    const add = s => String(s || "").toLowerCase().split(/[^a-z0-9]+/).forEach(x => x.length > 2 && w.add(x));
    D.items.forEach(i => { add(i.maj); add(i.sub); add(i.act); add(i.sa); });
    ALLST().forEach(s => D.spill[s].items.forEach(i => { add(i.sub); add(i.activity); add(i.subactivity); }));
    D.school_masters.forEach(m => { add(m.m); add(m.act); });
    return vocab.v = w;
  }

  /* ---------------- 1. deterministic parser ---------------- */
  function parse(q) {
    const raw = q, s = q.toLowerCase();
    const spec = {dataset: "items", states: [], schemes: [], terms: [], search_remarks: false, rnr: "any", conditions: [], condition_level: "row",
      group_by: "none", measure: "recommended", compare_states: false, sort: "desc", limit: 15, indicator_ids: []};
    let signals = 0;
    if (/haryana|\bHR\b/.test(raw) || /haryana/.test(s)) spec.states.push("Haryana");
    if (/madhya|\bMP\b/.test(raw) || /\bm\.p\.?\b/.test(s)) spec.states.push("MP");
    if (/uttar|\bUP\b/.test(raw) || /\bu\.p\.?\b/.test(s)) spec.states.push("UP");
    if (/karnata?ka|\b(KA|KN|KAR)\b/.test(raw) || /karnata?ka/.test(s)) spec.states.push("KN");
    if (/maha?rash?tra|\bMH\b/.test(raw) || /maha?rash?tra/.test(s)) spec.states.push("MH");
    if (/telangana|\b(TG|TS)\b/.test(raw) || /telangana/.test(s)) spec.states.push("TG");
    spec.states = spec.states.filter(x => ALLST().includes(x));
    if (spec.states.length) signals++;
    if (/elementary/.test(s)) spec.schemes.push("E");
    if (/\bsecondary\b/.test(s) && !/senior secondary|higher secondary|secondary schools? (have|with)/.test(s)) spec.schemes.push("S");
    if (/teacher education/.test(s)) spec.schemes.push("T");

    // dataset
    if (/spill/.test(s)) spec.dataset = "spill";
    else if (/2025-?26|utili[sz]|expenditure|spent|last year/.test(s)) spec.dataset = "utilisation";
    else if (/district|which schools|school list|udise code|how many schools (got|get|are getting|received)/.test(s)) spec.dataset = "works";
    else if (INDICATOR_WORDS.test(s) && !BUDGET_WORDS.test(s)) spec.dataset = "indicators";
    signals += spec.dataset !== "items" ? 1 : 0;

    if (spec.dataset === "indicators") {
      spec.measure = "value";
      const I = PAB.D.minutes.indicators;
      const words = s.split(/[^a-z0-9%]+/).filter(w => w.length > 2 && !STOP.has(w));
      const alias = {ger: "ger_", ner: "ner_", retention: "ret_", gar: "gar_", apaar: "apaar", dropout: "dropout", transition: "transition", vacanc: "vac_", ptr: "adverse_ptr", "single": "single_teacher", electricity: "no_elec", toilet: "toilet", ict: "ict_lab", smart: "smart_class", physics: "physics_lab", chemistry: "chem_lab", biology: "bio_lab", lab: "_lab", cwsn: "cwsn", kgbv: "kgbv", enrol: "enrol", eco: "ecoclub", parakh: "parakh", water: "no_water", zero: "zero_enrol", small: "small_ps", access: "gar_", oosc: "oosc", "out": "oosc", balvatika: "preprimary", "pre-primary": "preprimary", works: "works_pending", janman: "janman", netaji: "nscbav"};
      const ids = new Set();
      for (const [k, v] of Object.entries(alias)) if (s.includes(k)) I.filter(i => i.id.includes(v)).forEach(i => ids.add(i.id));
      if (!ids.size) I.filter(i => words.some(w => i.label.toLowerCase().includes(w))).forEach(i => ids.add(i.id));
      // narrow by stage words when present
      const stage = ["foundational", "preparatory", "middle", "secondary", "primary", "upper"].filter(w => s.includes(w));
      let arr = [...ids];
      if (stage.length) { const n = arr.filter(id => { const l = I.find(i => i.id === id).label.toLowerCase(); return stage.some(w => l.includes(w)); }); if (n.length) arr = n; }
      spec.indicator_ids = arr;
      return {spec, confident: arr.length > 0};
    }

    // measure
    if (/unit cost|unit rate|\brate\b|per unit|cost per/.test(s)) { spec.measure = "unit_cost"; spec.group_by = "item"; spec.compare_states = true; signals++; }
    else if (/not recommended|rejected|dropped|disallowed|zero/.test(s)) {
      spec.conditions.push({field: "recommended", op: "=", value: 0}, {field: "proposed", op: ">", value: 0});
      spec.measure = "proposed"; spec.group_by = "none"; signals++;
    }
    else if (/\bcut|reduc|trim|slash|pruned/.test(s)) { spec.measure = /%|percent|proportion|share/.test(s) ? "cut_pct" : "cut"; signals++; }
    else if (/propos|asked|demand/.test(s)) { spec.measure = "proposed"; signals++; }
    else if (/per (child|student|pupil)/.test(s)) { spec.measure = "per_child"; signals++; }
    else if (/share|% of|percent/.test(s) && spec.dataset === "items") { spec.measure = "share_pct"; signals++; }
    else if (/quantity|how many (units|posts|schools|teachers)|number of|physical/.test(s) && spec.dataset === "items") { spec.measure = "quantity"; signals++; }
    if (spec.dataset === "spill") spec.measure = /cancel/.test(s) ? "cancelled" : /complet/.test(s) ? "completed" : /approved|sanction/.test(s) ? "approved" : /how many|number of works/.test(s) ? "count" : "spillover";
    if (spec.dataset === "utilisation") { spec.measure = /how much|amount|₹|crore/.test(s) && !/%|percent|share|utili/.test(s) ? "spent" : "spent_pct"; spec.group_by = "major"; }
    if (spec.dataset === "works") { spec.measure = /quantity|units|metre|meter/.test(s) ? "quantity" : "schools"; spec.group_by = "district"; }

    // grouping
    const g = [[/by district|district[- ]wise|which districts?|per district/, "district"], [/by state|state[- ]wise|each state|per state/, "state"],
      [/sub[- ]?components?/, "sub"], [/major components?|by components?|component[- ]wise|by head/, "major"], [/activit/, "activity"],
      [/by scheme|scheme[- ]wise/, "scheme"], [/line items?|by items?|which items|what items|items/, "item"], [/type of work|kind of work|which works|by work/, "work"]];
    for (const [re, v] of g) if (re.test(s) && GROUPS[spec.dataset].includes(v)) { spec.group_by = v; signals++; break; }
    if (/compare|\bvs\.?\b|versus|across (the )?states|each state|all (three|six|states)|between/.test(s)) { spec.compare_states = true; signals++; }
    if (/lowest|least|smallest|bottom|minimum/.test(s)) spec.sort = "asc";
    const lim = s.match(/(?:top|first|bottom|largest|biggest|highest|lowest|smallest)\s+(\d{1,3})|(\d{1,3})\s+(?:largest|biggest|highest|lowest|smallest|top|items|districts)/);
    if (lim) spec.limit = Math.min(100, +(lim[1] || lim[2]));

    // amount / percent conditions
    const cm = s.match(/(above|over|more than|greater than|at least|exceeding|>|below|under|less than|<)\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(%|percent|crore|cr|lakh)?/);
    if (cm) {
      const op = /below|under|less than|</.test(cm[1]) ? "<" : /at least/.test(cm[1]) ? ">=" : ">";
      let v = +cm[2], u = cm[3] || "";
      if (/%|percent/.test(u)) spec.conditions.push({field: spec.dataset === "utilisation" ? "spent_pct" : "cut_pct", op, value: v});
      else {
        if (u === "lakh") v = v / 100;
        const f = spec.dataset === "spill" ? "spillover" : spec.dataset === "utilisation" ? "approved" : spec.measure === "proposed" ? "proposed" : spec.measure === "cut" ? "cut" : "recommended";
        spec.conditions.push({field: f, op, value: v});
      }
      signals++;
    }
    if (/non[- ]?recurring|civil work|\bnr\b|capital/.test(s)) spec.rnr = "NR";
    else if (/\brecurring\b/.test(s)) spec.rnr = "R";

    // terms
    const quoted = [...raw.matchAll(/["“']([^"”']{3,})["”']/g)].map(m => m[1].toLowerCase());
    if (quoted.length) { spec.terms.push(...quoted); if (/remark|reason|why|purview|norm/.test(s)) { spec.search_remarks = true; spec.group_by = "none"; if (spec.measure === "recommended") spec.measure = "proposed"; } }
    let rest = s.replace(/["“'][^"”']*["”']/g, " ");
    for (const [re, t] of SYN) if (re.test(rest)) { spec.terms.push(t); rest = rest.replace(new RegExp(`\\w*(?:${re.source})\\w*`, "g"), " "); }
    const V = vocab();
    rest.split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w) && !GENERIC.has(w) && !/^\d+$/.test(w) && V.has(w)).forEach(w => spec.terms.push(w));
    spec.terms = [...new Set(spec.terms)];
    if (spec.terms.length) signals++;

    // sensible defaults
    if (spec.dataset === "items" && spec.group_by === "none" && !spec.conditions.length && !spec.search_remarks) {
      if (/which|top|largest|biggest|highest|lowest|list/.test(s)) spec.group_by = "item";
      else if (spec.terms.length || spec.compare_states) spec.group_by = "state";
      else spec.group_by = "major";
    }
    if (spec.group_by === "item" && spec.dataset === "items" && !/which state|in each/.test(s) && spec.states.length !== 1 && spec.measure !== "unit_cost" && /compare|across|vs|versus|each/.test(s)) spec.compare_states = true;
    if (spec.dataset === "spill" && spec.group_by === "none" && !/which|top|largest|list|works/.test(s)) spec.group_by = spec.terms.length ? "state" : "major";
    if (spec.conditions.length && !["none", "item"].includes(spec.group_by) && !spec.conditions.some(c => c.field === "recommended" && c.op === "=" && c.value === 0)) spec.condition_level = "group";
    return {spec, confident: signals > 0};
  }

  /* ---------------- 2. JSON schema for Claude ---------------- */
  function jsonSchema() {
    const D = PAB.D;
    return {
      type: "object", additionalProperties: false,
      required: ["dataset", "states", "schemes", "terms", "search_remarks", "rnr", "conditions", "condition_level", "group_by", "measure", "compare_states", "sort", "limit", "indicator_ids"],
      properties: {
        dataset: {type: "string", enum: DATASETS},
        states: {type: "array", items: {type: "string", enum: ALLST()}},
        schemes: {type: "array", items: {type: "string", enum: ["E", "S", "T"]}},
        terms: {type: "array", items: {type: "string"}},
        search_remarks: {type: "boolean"},
        rnr: {type: "string", enum: ["any", "R", "NR"]},
        conditions: {type: "array", items: {type: "object", additionalProperties: false, required: ["field", "op", "value"], properties: {
          field: {type: "string", enum: [...new Set(Object.values(COND_FIELDS).flat())]}, op: {type: "string", enum: OPS}, value: {type: "number"}}}},
        condition_level: {type: "string", enum: ["row", "group"]},
        group_by: {type: "string", enum: [...new Set(Object.values(GROUPS).flat())]},
        measure: {type: "string", enum: [...new Set(Object.values(MEASURES).flat())]},
        compare_states: {type: "boolean"},
        sort: {type: "string", enum: ["desc", "asc"]},
        limit: {type: "integer"},
        indicator_ids: {type: "array", items: {type: "string", enum: D.minutes.indicators.map(i => i.id)}},
      },
    };
  }
  function systemPrompt() {
    const D = PAB.D;
    const majors = [...new Set(D.items.map(i => i.maj))];
    const subs = [...new Set(D.items.map(i => i.sub))];
    const works = [...new Set(D.school_masters.map(m => m.m))];
    return [
      `You translate questions about Samagra Shiksha Project Approval Board (PAB) approvals for 2026-27 into a filter spec. You never state numbers; a program computes every figure from the spec you return.`,
      `States (use these exact codes): ${ALLST().map(s => `${s} = ${PAB.sname(s)}`).join(", ")}. An empty states array means the states the reader has selected (${SHOWN().join(", ")}). Schemes: E Elementary (includes FLN), S Secondary, T Teacher Education. Empty arrays mean "all".`,
      `Datasets:`,
      `- items: ${D.items.length} line items of the fresh 2026-27 plan, each with state proposal and DoSEL recommendation. Hierarchy: major > sub > activity > item. measures: recommended, proposed, cut (proposed − recommended), cut_pct, quantity (recommended physical qty), unit_cost (recommended ₹ per unit), count, share_pct (share of the state's fresh approval), per_child (₹ per government-school child). group_by: none (list individual line items), state, scheme, major, sub, activity, item (national activity code — same item across states).`,
      `- spill: works sanctioned in earlier years still open (spill-over). measures: spillover, approved, completed, cancelled, count. group_by: none, state, scheme, major, sub, item.`,
      `- utilisation: 2025-26 approval vs expenditure by component. measures: spent_pct, approved, spent. group_by: state, major, sub.`,
      `- works: school-wise list of fresh non-recurring approvals (only ${ALLST().filter(s => PAB.D.checks.school_rows[s]).join(", ")} have school lists). measures: schools (count of school approvals), quantity. group_by: state, district, work (type of work). Work types: ${works.join("; ")}.`,
      `- indicators: educational indicators from the minutes; choose indicator_ids. Ids: ${D.minutes.indicators.map(i => `${i.id} = ${i.label}`).join("; ")}.`,
      `terms: phrases matched case-insensitively against component/activity/item names (every term must match; use "a|b" for alternatives within one term). Keep terms short and use the names' own words. Major components: ${majors.join("; ")}. Sub components: ${subs.join("; ")}. Common mappings: KGBV → "kasturba|kgbv"; teacher salaries → "financial support for teachers"; FLN → "foundational literacy"; ICT → "ict|digital"; CwSN → "children with special needs|cwsn". Set search_remarks true only when the question is about the appraisal remarks/reasons.`,
      `conditions: amounts (recommended, proposed, cut, spillover, approved, completed, cancelled, spent) are in ₹ crore; cut_pct and spent_pct are percentages 0–100; unit_cost is in rupees. "Not recommended / rejected" = recommended = 0 AND proposed > 0. condition_level "row" tests each line item/work before grouping; "group" tests each group's totals after grouping (e.g. "sub components cut by more than 30%" = group).`,
      `compare_states: true to show one column per state for each group (use for comparisons across states). rnr: R recurring, NR non-recurring (civil works, equipment). sort desc for largest/top, asc for lowest. limit 1–100 (default 15).`,
      `If the question is vague, choose the most useful reasonable reading rather than an empty filter. If it is outside this data, return your closest filter — the reader will see exactly what ran.`,
    ].join("\n");
  }

  async function claudeTranslate(question, apiKey, model) {
    const body = {
      model, max_tokens: 4000,
      system: [{type: "text", text: systemPrompt(), cache_control: {type: "ephemeral"}}],
      output_config: {format: {type: "json_schema", schema: jsonSchema()}},
      messages: [{role: "user", content: question}],
    };
    if (!/haiku/.test(model)) {
      /* Adaptive thinking stays on at low effort: turning one sentence into a small
         filter is not hard, and disabling thinking on current models can leak tags
         or plain-text output — exactly what this layer must not have. */
      body.thinking = {type: "adaptive"};
      body.output_config.effort = "low";
    }
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {"content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true"},
        body: JSON.stringify(body),
      });
    } catch (e) { throw new Error("Could not reach the Claude API. Check the network connection and try again."); }
    if (!res.ok) {
      let detail = ""; try { const j = await res.json(); detail = (j && j.error && j.error.message) || ""; } catch (_) {}
      if (res.status === 401) throw new Error("That API key was rejected. Check it and save it again.");
      if (res.status === 429) throw new Error("Rate limited by the API. Wait a moment and ask again.");
      if (res.status === 400 && /credit|balance/i.test(detail)) throw new Error("The API account has no credit available.");
      throw new Error(`The API returned ${res.status}. ${detail}`.trim());
    }
    const msg = await res.json();
    if (msg.stop_reason === "refusal") throw new Error("Claude declined this one. Try rephrasing the question.");
    if (msg.stop_reason === "max_tokens") throw new Error("The reply was cut short. Try a shorter question.");
    const text = (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    if (!text) throw new Error("Claude returned no filter. Try rephrasing.");
    try { return {raw: JSON.parse(text), model: msg.model || model}; }
    catch (_) { throw new Error("Claude's reply was not a readable filter. Try rephrasing."); }
  }

  /* ---------------- 3. trust boundary ---------------- */
  function coerceSpec(x) {
    const warn = [];
    const o = x && typeof x === "object" ? x : {};
    const known = ["dataset", "states", "schemes", "terms", "search_remarks", "rnr", "conditions", "condition_level", "group_by", "measure", "compare_states", "sort", "limit", "indicator_ids"];
    Object.keys(o).forEach(k => { if (!known.includes(k)) warn.push(`Ignored unknown key “${k}”.`); });
    const spec = {};
    spec.dataset = DATASETS.includes(o.dataset) ? o.dataset : (o.dataset && warn.push(`Unknown dataset “${o.dataset}”; used line items.`), "items");
    const arr = v => Array.isArray(v) ? v : [];
    spec.states = arr(o.states).filter(s => { const ok = ALLST().includes(s); if (!ok) warn.push(`Dropped unknown state “${s}”.`); return ok; });
    spec.schemes = arr(o.schemes).filter(s => ["E", "S", "T"].includes(s));
    spec.terms = arr(o.terms).filter(t => typeof t === "string" && t.trim()).map(t => t.trim().toLowerCase().slice(0, 80)).slice(0, 8);
    spec.search_remarks = !!o.search_remarks;
    spec.rnr = ["any", "R", "NR"].includes(o.rnr) ? o.rnr : "any";
    spec.conditions = arr(o.conditions).filter(c => {
      const ok = c && COND_FIELDS[spec.dataset].includes(c.field) && OPS.includes(c.op) && typeof c.value === "number" && isFinite(c.value);
      if (!ok) warn.push(`Dropped a condition that does not apply here (${c && c.field} ${c && c.op} ${c && c.value}).`);
      return ok;
    }).slice(0, 6);
    spec.group_by = GROUPS[spec.dataset].includes(o.group_by) ? o.group_by : GROUPS[spec.dataset][0];
    spec.condition_level = o.condition_level === "group" && !["none", "item"].includes(spec.group_by) ? "group" : "row";
    if (o.group_by && o.group_by !== spec.group_by) warn.push(`Grouping “${o.group_by}” is not available for this dataset; used “${spec.group_by}”.`);
    spec.measure = MEASURES[spec.dataset].includes(o.measure) ? o.measure : MEASURES[spec.dataset][0];
    if (o.measure && o.measure !== spec.measure) warn.push(`Measure “${o.measure}” is not available here; used “${spec.measure}”.`);
    spec.compare_states = !!o.compare_states;
    spec.sort = o.sort === "asc" ? "asc" : "desc";
    spec.limit = Number.isInteger(o.limit) ? Math.max(1, Math.min(100, o.limit)) : 15;
    const ids = PAB.D.minutes.indicators.map(i => i.id);
    spec.indicator_ids = arr(o.indicator_ids).filter(i => ids.includes(i));
    const noList = spec.states.filter(s => !PAB.D.checks.school_rows[s]);
    if (spec.dataset === "works" && noList.length) warn.push(`${noList.map(PAB.sname).join(", ")}: no school list in the PDF.`);
    return {spec, warn};
  }

  /* ---------------- 4. executor — every number is computed here ---------------- */
  const termMatch = (terms, hay) => terms.every(t => t.split("|").some(a => a.trim() && hay.includes(a.trim())));
  const cmp = (a, op, b) => op === ">" ? a > b : op === ">=" ? a >= b : op === "<" ? a < b : op === "<=" ? a <= b : op === "=" ? Math.abs(a - b) < 1e-9 : Math.abs(a - b) >= 1e-9;

  function execute(spec) {
    const {D, sum, groupBy, sname} = PAB;
    const states = spec.states.length ? spec.states : SHOWN();
    const out = {kind: "group", rows: [], states, measure: spec.measure, fmt: null, total: null};
    if (spec.dataset === "indicators") {
      const ids = spec.indicator_ids.length ? spec.indicator_ids : [];
      out.kind = "indicators";
      out.rows = D.minutes.indicators.filter(i => ids.includes(i.id));
      return out;
    }
    if (spec.dataset === "items" || spec.dataset === "spill") {
      let rows = spec.dataset === "items" ? D.items.slice()
        : ALLST().flatMap(s => D.spill[s].items.map(i => ({st: s, sch: i.scheme, maj: i.major, sub: i.sub, act: i.activity, sa: i.subactivity, code: i.code,
          approved: i.appr_amt, completed: i.done_amt, cancelled: i.cancelled, spillover: i.spillover, rem: "", pg: i.page})));
      rows = rows.filter(r => states.includes(r.st) && (!spec.schemes.length || spec.schemes.includes(r.sch)) && (spec.rnr === "any" || spec.dataset !== "items" || r.rnr === spec.rnr));
      if (spec.terms.length) rows = rows.filter(r => termMatch(spec.terms, `${r.maj}|${r.sub}|${r.act}|${r.sa}|${r.code}${spec.search_remarks ? "|" + r.rem : ""}`.toLowerCase()));
      const fv = (r, f) => spec.dataset === "items"
        ? ({recommended: r.ra / 100, proposed: r.pa / 100, cut: r.cut / 100, cut_pct: r.pa ? r.cut / r.pa * 100 : 0, quantity: r.rq, unit_cost: r.ru * 1e5})[f]
        : r[f] / 100;
      const rowConds = spec.condition_level === "row" ? spec.conditions : [];
      rowConds.forEach(c => { rows = rows.filter(r => cmp(fv(r, c.field), c.op, c.value)); });
      out.matched = rows;
      const agg = (a, st, m = spec.measure) => {
        if (!a.length) return null;
        if (spec.dataset === "spill") return m === "count" ? a.length : sum(a, x => x[m]);
        const ra = sum(a, x => x.ra), pa = sum(a, x => x.pa);
        switch (m) {
          case "recommended": return ra; case "proposed": return pa; case "cut": return pa - ra;
          case "cut_pct": return pa ? (pa - ra) / pa : null; case "quantity": return sum(a, x => x.rq);
          case "unit_cost": { const q = sum(a, x => x.rq); return q ? ra / q * 1e5 : null; }
          case "count": return a.length;
          case "share_pct": { const ss = st ? [st] : PAB.uniq(a.map(x => x.st)); return ra / sum(ss, s => D.fresh[s]); }
          case "per_child": { const ss = st ? [st] : PAB.uniq(a.map(x => x.st)); return ra * 1e5 / sum(ss, s => D.govtEnrol[s]); }
        }
      };
      const kf = {none: r => (spec.dataset === "items" ? r.id : r.st + r.code), state: r => r.st, scheme: r => r.sch, major: r => r.maj, sub: r => r.sub, activity: r => r.act, item: r => r.code}[spec.group_by];
      const lab = {none: a => `${a[0].st}: ${a[0].sa}`, state: a => sname(a[0].st), scheme: a => PAB.SCHEME[a[0].sch], major: a => a[0].maj, sub: a => a[0].sub, activity: a => a[0].act, item: a => `${a[0].sa} (${a[0].code})`}[spec.group_by];
      const groups = groupBy(rows, kf);
      const pivot = spec.compare_states && !["state", "none"].includes(spec.group_by);
      out.pivot = pivot;
      out.rows = Object.values(groups).map(a => {
        const r = {label: lab(a), n: a.length, items: a, st: spec.group_by === "none" || spec.group_by === "state" ? a[0].st : null};
        if (pivot) { states.forEach(s => r[s] = agg(a.filter(x => x.st === s), s)); r.v = sum(states, s => r[s] || 0); }
        else r.v = agg(a, spec.group_by === "state" || spec.group_by === "none" ? a[0].st : null);
        if (spec.group_by === "none" && spec.dataset === "items") { r.rem = a[0].rem; r.pg = a[0].pg; }
        return r;
      });
      if (spec.condition_level === "group" && spec.conditions.length) {
        // test each group's own totals, in the units conditions are written in
        const unit = f => ["cut_pct", "spent_pct"].includes(f) ? 100 : ["unit_cost", "quantity", "count"].includes(f) ? 1 : 0.01;
        const gv = (a, st, f) => { const v = agg(a, st, f); return v == null ? null : v * unit(f); };
        out.rows = out.rows.filter(r => spec.conditions.every(c => pivot
          ? states.some(s => { const v = gv(r.items.filter(x => x.st === s), s, c.field); return v != null && cmp(v, c.op, c.value); })
          : (v => v != null && cmp(v, c.op, c.value))(gv(r.items, spec.group_by === "state" ? r.items[0].st : null, c.field))));
      }
      out.total = pivot ? null : ["recommended", "proposed", "cut", "quantity", "count", "spillover", "approved", "completed", "cancelled"].includes(spec.measure) ? sum(out.rows, r => r.v) : agg(rows, states.length === 1 ? states[0] : null);
    }
    if (spec.dataset === "utilisation") {
      const src = spec.group_by === "sub" ? "sub_2526" : "major_2526";
      const val = (x) => !x ? null : spec.measure === "spent_pct" ? (x.appr_total ? x.exp_total / x.appr_total : null) : spec.measure === "approved" ? x.appr_total : x.exp_total;
      if (spec.group_by === "state") {
        out.rows = states.map(s => { const g = D.summary[s].glance.find(x => x.name === "Grand Total"); return {label: sname(s), st: s, v: val({appr_total: g.appr_total, exp_total: g.exp_total})}; });
      } else {
        const names = PAB.uniq(states.flatMap(s => D.summary[s][src].filter(r => r.name !== "TOTAL" && r.appr_total > 0).map(r => r.name)))
          .filter(n => !spec.terms.length || termMatch(spec.terms, n.toLowerCase()));
        out.pivot = true;
        out.rows = names.map(n => { const r = {label: n}; states.forEach(s => r[s] = val(D.summary[s][src].find(x => x.name === n))); r.v = sum(states, s => r[s] || 0); return r; });
        spec.conditions.forEach(c => { out.rows = out.rows.filter(r => states.some(s => r[s] != null && cmp(c.field === "spent_pct" ? r[s] * 100 : r[s] / 100, c.op, c.value))); });
      }
    }
    if (spec.dataset === "works") {
      const ws = states.filter(s => D.checks.school_rows[s]);
      let a = D.school_agg.filter(([m]) => ws.includes(D.school_masters[m].st));
      if (spec.terms.length) a = a.filter(([m]) => termMatch(spec.terms, `${D.school_masters[m].m}|${D.school_masters[m].act}|${D.school_masters[m].sub}`.toLowerCase()));
      out.matched = a;
      const kf = {state: x => D.school_masters[x[0]].st, district: x => x[1], work: x => D.school_masters[x[0]].m + "|" + D.school_masters[x[0]].act}[spec.group_by];
      const lab = {state: x => sname(D.school_masters[x[0]].st), district: x => `${D.school_districts[x[1]].d} (${D.school_districts[x[1]].st})`, work: x => `${D.school_masters[x[0]].m} — ${D.school_masters[x[0]].act}`}[spec.group_by];
      const g = groupBy(a, kf);
      const pivot = spec.compare_states && spec.group_by === "work";
      out.pivot = pivot; out.states = pivot ? ws : states;
      out.rows = Object.values(g).map(arr => {
        const r = {label: pivot ? D.school_masters[arr[0][0]].m : lab(arr[0]), st: spec.group_by === "state" || spec.group_by === "district" ? D.school_masters[arr[0][0]].st : null};
        const f = x => spec.measure === "quantity" ? x[3] : x[2];
        if (pivot) { ws.forEach(s => r[s] = sum(arr.filter(x => D.school_masters[x[0]].st === s), f) || null); r.v = sum(ws, s => r[s] || 0); }
        else r.v = sum(arr, f);
        return r;
      });
      if (pivot) { const m = {}; out.rows.forEach(r => { const k = r.label; if (m[k]) { ws.forEach(s => m[k][s] = (m[k][s] || 0) + (r[s] || 0) || null); m[k].v += r.v; } else m[k] = r; }); out.rows = Object.values(m); }
      out.total = pivot ? null : sum(out.rows, r => r.v);
    }
    out.rows.sort((a, b) => ((a.v == null) - (b.v == null)) || (spec.sort === "asc" ? a.v - b.v : b.v - a.v));
    out.allCount = out.rows.length;
    out.rows = out.rows.slice(0, spec.limit);
    return out;
  }

  /* ---------------- 5. rendering ---------------- */
  function fmtFor(spec) {
    const {cr, pct, rupees, inr} = PAB;
    return {recommended: v => cr(v), proposed: v => cr(v), cut: v => cr(v), cut_pct: v => pct(v), quantity: v => inr(v), unit_cost: v => rupees(v), count: v => inr(v),
      share_pct: v => pct(v, 2), per_child: v => rupees(v), spillover: v => cr(v), approved: v => cr(v), completed: v => cr(v), cancelled: v => cr(v),
      spent_pct: v => pct(v, 0), spent: v => cr(v), schools: v => inr(v)}[spec.measure] || (v => inr(v));
  }
  const MLAB = {recommended: "Recommended", proposed: "Proposed", cut: "Cut at appraisal", cut_pct: "Cut %", quantity: "Recommended quantity", unit_cost: "Unit cost (₹)", count: "Count",
    share_pct: "Share of fresh approval", per_child: "₹ per govt-school child", spillover: "Spill-over", approved: "Approved", completed: "Completed", cancelled: "Cancelled",
    spent_pct: "Spent (2025-26)", spent: "Spent (2025-26)", schools: "School approvals", value: "Value"};
  const GLAB = {none: "each row", state: "state", scheme: "scheme", major: "major component", sub: "sub component", activity: "activity", item: "line item", district: "district", work: "type of work"};
  const DLAB = {items: "2026-27 line items", spill: "spill-over works", utilisation: "2025-26 approval vs spend", works: "school-wise works", indicators: "minutes indicators"};

  function chips(spec) {
    const {esc, sname} = PAB;
    const c = [`<span class="chip">data <b>${DLAB[spec.dataset]}</b></span>`];
    c.push(`<span class="chip">states <b>${spec.states.length ? spec.states.map(sname).join(", ") : `all shown (${SHOWN().map(PAB.abbr).join(", ")})`}</b></span>`);
    if (spec.schemes.length) c.push(`<span class="chip">scheme <b>${spec.schemes.map(s => PAB.SCHEME[s]).join(", ")}</b></span>`);
    spec.terms.forEach(t => c.push(`<span class="chip">${spec.search_remarks ? "name or remark" : "name"} contains <b>${esc(t.split("|").join(" or "))}</b></span>`));
    if (spec.rnr !== "any") c.push(`<span class="chip"><b>${spec.rnr === "R" ? "recurring" : "non-recurring"}</b> only</span>`);
    spec.conditions.forEach(k => c.push(`<span class="chip">${spec.condition_level === "group" ? `each ${GLAB[spec.group_by]}'s ` : ""}${esc(k.field.replace("_", " "))} <b>${esc(k.op)} ${esc(k.value)}</b>${["cut_pct", "spent_pct"].includes(k.field) ? "%" : k.field === "unit_cost" ? " ₹" : k.field === "quantity" ? "" : " cr"}</span>`));
    if (spec.dataset !== "indicators") {
      c.push(`<span class="chip">measure <b>${MLAB[spec.measure]}</b></span>`);
      c.push(`<span class="chip">by <b>${GLAB[spec.group_by]}</b>${spec.compare_states && !["state", "none"].includes(spec.group_by) ? " · one column per state" : ""}</span>`);
      c.push(`<span class="chip"><b>${spec.sort === "asc" ? "lowest" : "highest"}</b> first · up to <b>${spec.limit}</b></span>`);
    } else c.push(`<span class="chip">indicators <b>${spec.indicator_ids.length}</b></span>`);
    return c.join("");
  }

  const plural = w => /y$/.test(w) ? w.slice(0, -1) + "ies" : w + "s";
  function answerText(spec, out) {
    const {esc, sname} = PAB, f = fmtFor(spec);
    if (out.kind === "indicators") {
      if (!out.rows.length) return "No indicator in the minutes matched that question.";
      const i = out.rows[0];
      return `${esc(i.label)}: ${out.states.filter(s => i.values[s]).map(s => `${esc(sname(s))} ${i.values[s].v != null ? esc(i.values[s].v) + (i.unit === "%" ? "%" : "") : "—"}`).join(" · ")}${out.rows.length > 1 ? ` (and ${out.rows.length - 1} related indicator${out.rows.length > 2 ? "s" : ""} below)` : ""}.`;
    }
    if (!out.rows.length) return "Nothing in the data matches this filter. Check the chips below — a term may be too narrow.";
    const mlab = MLAB[spec.measure].toLowerCase();
    if (out.pivot) {
      const r = out.rows[0];
      return `${out.allCount} ${out.allCount > 1 ? plural(GLAB[spec.group_by]) : GLAB[spec.group_by]} matched. ${spec.sort === "asc" ? "Lowest" : "Highest"} overall: <b>${esc(r.label)}</b> — ${out.states.map(s => `${esc(s)} ${r[s] == null ? "—" : f(r[s])}`).join(", ")}.`;
    }
    if (spec.group_by === "state" || spec.dataset === "utilisation" && spec.group_by === "state")
      return `${MLAB[spec.measure]}: ${out.rows.map(r => `${esc(r.label)} <b>${f(r.v)}</b>${r.n != null ? ` <span class="muted">(${r.n} ${r.n === 1 ? "item" : "items"})</span>` : ""}`).join(" · ")}.`;
    const top = out.rows[0];
    const tot = out.total != null && out.allCount > 1 ? ` In all, ${f(out.total)} across ${out.allCount} ${GLAB[spec.group_by] === "each row" ? (spec.dataset === "items" ? "line items" : "works") : plural(GLAB[spec.group_by])}.` : "";
    return `${spec.sort === "asc" ? "Lowest" : "Largest"} ${mlab}: <b>${esc(top.label)}</b> at <b>${f(top.v)}</b>.${tot}`;
  }

  function resultHTML(question, spec, out, meta) {
    const {esc, table, hbars, SCOL, pageRef, sw} = PAB, f = fmtFor(spec);
    let body = "";
    if (out.kind === "indicators") {
      body = `<div class="tw"><table><thead><tr><th>Indicator</th>${out.states.map(s => `<th>${sw(s)}${esc(PAB.sname(s))}</th>`).join("")}</tr></thead><tbody>${out.rows.map(i => `<tr><td>${esc(i.label)}</td>${out.states.map(s => { const x = i.values[s]; return `<td>${x ? `${x.prev != null ? `<span class="muted">${esc(x.prev)} →</span> ` : ""}<b>${x.v == null ? "" : esc(x.v) + (i.unit === "%" ? "%" : "")}</b>${x.note ? `<div class="sub">${esc(x.note)}</div>` : ""} ${pageRef(s, x.page)}` : '<span class="muted">not reported</span>'}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
    } else if (out.rows.length) {
      const cols = [{k: "label", l: GLAB[spec.group_by] === "each row" ? (spec.dataset === "items" ? "Line item" : "Work") : GLAB[spec.group_by][0].toUpperCase() + GLAB[spec.group_by].slice(1), f: r => `${r.st && !out.pivot ? sw(r.st) : ""}${esc(r.label)}${r.rem ? `<div class="sub">${esc(r.rem)} ${pageRef(r.st, r.pg)}</div>` : ""}`}];
      if (out.pivot) out.states.forEach(s => cols.push({k: s, l: PAB.sname(s), n: 1, f: r => r[s] == null ? "—" : f(r[s]), bar: SCOL[s]}));
      else {
        cols.push({k: "v", l: MLAB[spec.measure], n: 1, f: r => r.v == null ? "—" : f(r.v), bar: r => r.st ? SCOL[r.st] : "var(--accent)"});
        if (spec.dataset === "items") {
          const {cr, sum} = PAB;
          if (spec.measure !== "proposed") cols.push({k: "p_", l: "Proposed", n: 1, f: r => cr(sum(r.items, x => x.pa))});
          if (spec.measure !== "recommended") cols.push({k: "r_", l: "Recommended", n: 1, f: r => cr(sum(r.items, x => x.ra))});
          if (!["cut", "cut_pct"].includes(spec.measure)) cols.push({k: "c_", l: "Cut", n: 1, f: r => { const c = sum(r.items, x => x.pa - x.ra); return Math.abs(c) < 0.005 ? "—" : `<span class="${c > 0 ? "neg" : "pos"}">${c > 0 ? "−" : "+"}${cr(Math.abs(c))}</span>`; }});
        }
      }
      if (!out.pivot && out.rows[0].n != null && spec.group_by !== "none") cols.push({k: "n", l: spec.dataset === "spill" ? "Works" : "Items", n: 1});
      cols.forEach(c => c.nosort = 1);          // result is a snapshot; sorting belongs to the spec
      PAB.S["tbl_askres"] = {k: null, dir: -1};
      body = table("askres", cols, out.rows, {});
      if (out.pivot && out.rows.length <= 20) body = `<div class="two"><div>${body}</div><div class="card">${hbars(out.rows.map(r => ({label: r.label, vals: Object.fromEntries(out.states.map(s => [s, r[s]]))})), f, {states: out.states})}</div></div>`;
      if (out.allCount > out.rows.length) body += `<p class="sub">Showing ${out.rows.length} of ${out.allCount}. Ask for "top ${Math.min(100, out.allCount)}" to see more.</p>`;
    }
    const src = meta.source === "claude" ? `Filter written by ${esc(meta.model)}; every figure computed on this page.` : `Filter written by the built-in parser (no API key); every figure computed on this page.`;
    return `<div class="card" style="margin-top:14px">
      <div class="sub" style="margin-bottom:6px">You asked: “${esc(question)}”</div>
      ${meta.confident === false ? `<div class="warnbox">The built-in parser found little to go on, so this is a broad default. Rephrase with a component, item or indicator name — or switch to Claude for free-form questions.</div>` : ""}
      ${meta.warn && meta.warn.length ? `<div class="warnbox">${meta.warn.map(esc).join("<br>")}</div>` : ""}
      <div class="answer">${answerText(spec, out)}</div>
      <div style="margin:6px 0 10px">${chips(spec)}</div>
      ${body}
      <details style="margin-top:10px"><summary>${src} Show the filter that ran</summary><pre class="json">${esc(JSON.stringify(spec, null, 2))}</pre></details>
    </div>`;
  }

  /* ---------------- 6. UI ---------------- */
  const EX = [
    "How much was approved for KGBVs in each state?",
    "Compare unit cost of smart classrooms across states",
    "Top 10 line items cut in UP",
    "Which items were not recommended in MP?",
    "Teacher salaries per child by state",
    "Compare FLN recommended across states by activity",
    "Spill-over by major component",
    "Which districts in UP get the most smart classrooms?",
    "Compare KGBV recommended in Karnataka, Maharashtra and Telangana",
    "Which districts in Telangana get the most works?",
    "2025-26 utilisation by sub component",
    "GER at secondary stage",
    "Teacher vacancies",
    "Items with remark \"not under the purview\"",
    "Sub components with cut above 30%",
    "Share of ICT in fresh approval by state",
  ];
  const getLS = k => { try { return localStorage.getItem(k) || ""; } catch (_) { return ""; } };
  const setLS = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (_) {} };
  let last = null;

  function view() {
    const {esc} = PAB;
    const mode = getLS(LS_MODE) || "parser";
    const hasKey = !!getLS(LS_KEY);
    const model = getLS(LS_MODEL) || MODELS[0].id;
    return `<h1>Ask the PAB data</h1>
    <p class="lede"><b>Every number below is computed on this page, not written by a language model.</b> Your question becomes a small filter — which data, which states, which names, how to group — and the filter that ran is always shown, so you can see exactly what was counted.</p>
    <div class="card">
      <form id="askForm" class="ask-box" autocomplete="off"><input id="askQ" type="text" placeholder="e.g. How much did UP get for uniforms compared with MP?" value="${esc(last ? last.q : "")}" aria-label="Your question"><button class="btn" id="askGo" type="submit">Ask</button></form>
      <div class="examples" style="margin-top:10px">${EX.map(e => `<button type="button" data-ex="${esc(e)}">${esc(e)}</button>`).join("")}</div>
      <div class="controls" style="margin:12px 0 0">
        <span class="ctl-l">Translator</span>
        <span class="seg"><button type="button" data-mode="parser" class="${mode === "parser" ? "on" : ""}">Built-in parser</button><button type="button" data-mode="claude" class="${mode === "claude" ? "on" : ""}">Claude (your key)</button></span>
        ${mode === "claude" ? `<select id="askModel">${MODELS.map(m => `<option value="${m.id}" ${m.id === model ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select>
          ${hasKey ? `<span class="sub">API key saved in this browser.</span> <button type="button" class="btn ghost" id="askForget">Forget key</button>` :
          `<input id="askKey" type="password" placeholder="sk-ant-… (stored only in this browser)" style="min-width:260px"><button type="button" class="btn ghost" id="askSave">Save key</button>`}` : ""}
      </div>
      ${mode === "claude" ? `<p class="sub" style="margin:8px 0 0">Your key is kept in this browser's local storage and sent only to <code>api.anthropic.com</code>. It is never written into this page or its repository. Claude sees your question and the names of components and indicators — no figures.</p>` : `<p class="sub" style="margin:8px 0 0">The built-in parser understands states, schemes, component and item names, "cut", "not recommended", "unit cost", "per child", "spill-over", "2025-26", "district", indicator names, "top N" and amount thresholds. Switch to Claude for free-form phrasing.</p>`}
    </div>
    <div id="askOut">${last ? last.html : ""}</div>`;
  }

  async function run(q) {
    const outEl = document.getElementById("askOut");
    if (!q.trim()) return;
    const mode = getLS(LS_MODE) || "parser";
    let raw, meta = {source: "parser", confident: true};
    if (mode === "claude") {
      const k = getLS(LS_KEY);
      if (!k) { outEl.innerHTML = `<div class="warnbox" style="margin-top:14px">Save an Anthropic API key first, or switch to the built-in parser.</div>`; return; }
      const btn = document.getElementById("askGo"); btn.disabled = true; btn.textContent = "Thinking…";
      outEl.innerHTML = `<div class="loading">Claude is writing the filter…</div>`;
      try { const r = await claudeTranslate(q, k, getLS(LS_MODEL) || MODELS[0].id); raw = r.raw; meta = {source: "claude", model: r.model}; }
      catch (e) { outEl.innerHTML = `<div class="warnbox" style="margin-top:14px">${PAB.esc(e.message)}</div>`; btn.disabled = false; btn.textContent = "Ask"; return; }
      btn.disabled = false; btn.textContent = "Ask";
    } else {
      const p = parse(q); raw = p.spec; meta.confident = p.confident;
    }
    const {spec, warn} = coerceSpec(raw);
    meta.warn = warn;
    const out = execute(spec);
    const html = resultHTML(q, spec, out, meta);
    last = {q, html};
    outEl.innerHTML = html;
  }

  function bind() {
    const f = document.getElementById("askForm");
    if (!f) return;
    f.onsubmit = e => { e.preventDefault(); run(document.getElementById("askQ").value); };
    document.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { document.getElementById("askQ").value = b.dataset.ex; run(b.dataset.ex); });
    document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { setLS(LS_MODE, b.dataset.mode === "parser" ? "" : b.dataset.mode); PAB.render("ask"); });
    const m = document.getElementById("askModel"); if (m) m.onchange = () => setLS(LS_MODEL, m.value);
    const sv = document.getElementById("askSave"); if (sv) sv.onclick = () => { const v = document.getElementById("askKey").value.trim(); if (v) { setLS(LS_KEY, v); PAB.render("ask"); } };
    const fg = document.getElementById("askForget"); if (fg) fg.onclick = () => { setLS(LS_KEY, ""); PAB.render("ask"); };
  }
  return {view, bind, parse, coerceSpec, execute, answerText, run, jsonSchema, systemPrompt};
})();

R.ask = () => ASK.view();
R.ask_after = () => ASK.bind();
