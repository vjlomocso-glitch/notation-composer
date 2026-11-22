
/* Notation Composer — app (DOM). Depends on Core and katex. */
(() => {
  'use strict';
  const C = Core;
  const { SLOT, esc } = C;
  const STORE_KEY = 'notation-composer/v1';

  const $ = id => document.getElementById(id);
  const app = $('app'), ed = $('ed'), hl = $('hl'), prev = $('prev');
  const pagesEl = $('pages'), tabsEl = $('tabs'), dotsEl = $('dots'), toolsEl = $('tools'), menu = $('menu');
  const wideMQ = matchMedia('(min-width: 900px)');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const coarseMQ = matchMedia('(pointer: coarse)');

  const uid = p => p + '-' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- icons ---------- */
  const sv = (d, size = 22) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    menu: sv('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    keyboard: sv('<rect x="2.5" y="6" width="19" height="12" rx="2.2"/><path d="M6.5 10h.01M9.5 10h.01M12.5 10h.01M15.5 10h.01M18 10h.01M7.5 14h9"/>'),
    grid: sv('<rect x="3" y="5.5" width="5" height="5" rx="1.2"/><rect x="9.5" y="5.5" width="5" height="5" rx="1.2"/><rect x="16" y="5.5" width="5" height="5" rx="1.2"/><rect x="3" y="13.5" width="5" height="5" rx="1.2"/><rect x="9.5" y="13.5" width="5" height="5" rx="1.2"/><rect x="16" y="13.5" width="5" height="5" rx="1.2"/>'),
    left: sv('<path d="M14.5 6l-6 6 6 6"/>'),
    right: sv('<path d="M9.5 6l6 6-6 6"/>'),
    slot: sv('<rect x="2.5" y="7" width="10" height="10" rx="1.6" stroke-dasharray="2.6 2.2"/><path d="M15.5 12h6M19 9.5l2.5 2.5-2.5 2.5"/>'),
    math: '<span class="tool-txt" aria-hidden="true">$</span>',
    space: sv('<path d="M4 10v4h16v-4"/>'),
    enter: sv('<path d="M19 6v5a3 3 0 0 1-3 3H6"/><path d="M9 11l-3 3 3 3"/>'),
    del: sv('<path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>'),
    undo: sv('<path d="M9 5L4 10l5 5"/><path d="M4 10h10a5 5 0 0 1 0 10h-3"/>'),
    redo: sv('<path d="M15 5l5 5-5 5"/><path d="M20 10H10a5 5 0 0 0 0 10h3"/>'),
    back: sv('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    plus: sv('<path d="M12 5v14M5 12h14"/>'),
    plusSm: sv('<path d="M12 5v14M5 12h14"/>', 16),
    close: sv('<path d="M7 7l10 10M17 7L7 17"/>', 18),
    up: sv('<path d="M6 15l6-6 6 6"/>', 18),
    down: sv('<path d="M6 9l6 6 6-6"/>', 18),
    fxOut: sv('<path d="M4 5v14"/><path d="M19 12H9M12 8l-4 4 4 4"/>'),
    fxIn: sv('<path d="M4 5v14"/><path d="M8 12h11M15 8l4 4-4 4"/>'),
    fxDel: sv('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  };

  /* ---------- starter content ---------- */
  const K = (insert, label = '') => ({ id: uid('k'), insert, label });

  /* Built-in categories: standard first-order logic only. Notation for a particular language
     comes in as a notation pack (Keys & macros → Notation packs), so nothing here is tied to one project. */
  function folCategory(id) {
    return {
      id: id || uid('c'), name: 'FOL',
      macros: [
        { name: '\\Neg', def: '\\neg' },
        { name: '\\Conj', def: '\\land' },
        { name: '\\Disj', def: '\\lor' },
        { name: '\\Cond', def: '\\to' },
        { name: '\\Bicond', def: '\\leftrightarrow' },
      ],
      keys: [
        K('\\Neg #1'), K(' \\Conj '), K(' \\Disj '), K(' \\Cond '), K(' \\Bicond '),
        K('\\forall #2\\,(#1)'), K('\\exists #2\\,(#1)'), K(' = '), K(' \\neq '),
        K('\\top'), K('\\bot'), K(' \\vdash '), K(' \\models '),
        K('\\varphi'), K('\\psi'), K('\\chi'), K('\\Gamma'), K('\\Delta'),
      ],
    };
  }
  function termsCategory(id) {
    return {
      id: id || uid('c'), name: 'Terms', macros: [],
      keys: ['x', 'y', 'z', 'a', 'b', 'c', 'F', 'G', 'H', 'P', 'Q', 'R'].map(t => K(t)),
    };
  }
  function structCategory(id) {
    return {
      id: id || uid('c'), name: 'Structure', macros: [],
      keys: [
        K('(#1)'), K('\\{#1\\}'), K('^{#1}', 'a^{\u25CC}'), K('_{#1}', 'a_{\u25CC}'), K("'", "a'"),
        K('\\mathrm{#1}', '\\mathrm{Ab}'), K('\\text{#1}', '\\text{text}'), K(', '),
        K('\\,', '\\text{thin}'), K('\\quad', '\\text{quad}'),
        K('$#1$', '\\text{\\$ \\$}'), K('$$\n#1\n$$', '\\text{\\$\\$ \\$\\$}'),
        K('\\begin{aligned}\n#1\n\\end{aligned}', '\\text{aligned}'),
        K(' & ', '\\text{\\&}'),
        K('\\\\\n', '\\text{\\textbackslash\\textbackslash}'),
      ],
    };
  }
  // Rule names for Fitch justifications. The connectives use the FOL macros, so a change of
  // notation there changes the rule names too.
  function rulesCategory(id) {
    return {
      id: id || uid('c'), name: 'Fitch rules', rules: true, macros: [],
      keys: [
        K('\\mathrm{Premise}'), K('\\mathrm{Assume}'), K('\\mathrm{R}'),
        K('{\\Conj}\\mathrm{I}'), K('{\\Conj}\\mathrm{E}'), K('{\\Disj}\\mathrm{I}'), K('{\\Disj}\\mathrm{E}'),
        K('{\\Cond}\\mathrm{I}'), K('{\\Cond}\\mathrm{E}'), K('{\\Bicond}\\mathrm{I}'), K('{\\Bicond}\\mathrm{E}'),
        K('{\\Neg}\\mathrm{I}'), K('{\\Neg}\\mathrm{E}'), K('{\\bot}\\mathrm{E}'), K('\\mathrm{IP}'),
        K('\\forall\\mathrm{I}'), K('\\forall\\mathrm{E}'), K('\\exists\\mathrm{I}'), K('\\exists\\mathrm{E}'),
        K('{=}\\mathrm{I}'), K('{=}\\mathrm{E}'),
      ],
    };
  }
  const READY = [
    { id: 'fol', make: () => folCategory(), about: 'Connectives as macros (\\Neg, \\Conj, \\Disj, \\Cond, \\Bicond), quantifiers, identity, turnstiles' },
    { id: 'terms', make: () => termsCategory(), about: 'Variables, constants and predicate letters' },
    { id: 'struct', make: () => structCategory(), about: 'Brackets, sub- and superscripts, upright text, spacing, math delimiters, aligned blocks' },
    { id: 'rules', make: () => rulesCategory(), about: 'Rule names for Fitch justifications: Premise, ∧I, →E, ∀E and the rest' },
  ];

  /* Sample proofs, as proof items (see Core.parseProof). */
  const PL = (d, f, rule = '', cites = '', s = false) => ({ t: 'L', d, f, rule, cites, s });
  const PB = d => ({ t: 'B', d });
  function folProofItems() {
    return [
      PL(0, '\\forall x\\,(Fx \\to Gx)'), PL(0, '\\exists x\\,Fx'), PB(0),
      PL(1, 'Fa'), PB(1),
      PL(1, 'Fa \\to Ga', '\\forall\\mathrm{E}', '1'),
      PL(1, 'Ga', '{\\to}\\mathrm{E}', '4, 3'),
      PL(1, '\\exists x\\,Gx', '\\exists\\mathrm{I}', '5'),
      PL(0, '\\exists x\\,Gx', '\\exists\\mathrm{E}', '2, 3–6'),
    ];
  }
  const fence = items => '```fitch\n' + C.serializeProof(items) + '```';

  function defaults() {
    const categories = [folCategory('c-fol'), termsCategory('c-terms'), structCategory('c-struct'), rulesCategory('c-rules')];
    const welcome = String.raw`# Welcome

Prose and math share one page. Inline math sits between single dollars, $\forall x\,(Fx \Cond Gx)$, and display math between doubles:

$$\Neg\exists x\,(Fx \Conj \Neg Gx)$$

Keys insert templates. A dashed box is a slot still to fill, like the two in $\forall ◌\,(Fx \Cond ◌)$. The next-slot tool jumps between them. Select text before tapping a key and it lands in the key’s first slot.

The connective keys insert macros such as \Cond. Redefine \Cond in Keys & macros and every arrow in this project changes with it.

## Proofs

A proof is a block inside the document. Tap it here in Preview, or switch to **Fitch**, to build it line by line. Numbers and citations stay in step as you add or remove lines.

` + fence(folProofItems()) + String.raw`

## Your own notation

Keys and macros for a particular language come in as a notation pack: a small JSON file. Open Keys & macros, then Notation packs, and import one into a project. Importing a newer version of the same pack updates its categories in place.
`;
    const first = welcome.indexOf(SLOT);
    const now = Date.now();
    return {
      app: 'notation-composer', version: 1,
      settings: { rows: 'auto', mode: 'edit' },
      categories,
      projects: [
        { id: 'p-fol', name: 'Standard FOL', categoryIds: ['c-fol', 'c-terms', 'c-struct', 'c-rules'] },
      ],
      documents: [
        { id: 'd-welcome', projectId: 'p-fol', name: 'Welcome', text: welcome, updated: now, caret: [first, first + 1] },
      ],
      activeDocId: 'd-welcome',
      lastExport: null,
    };
  }

  /* ---------- state ---------- */
  let S;
  let storageOK = true;

  function normalize(d) {
    if (!d || typeof d !== 'object') throw new Error('not an object');
    const str = (v, f) => (typeof v === 'string' && v.trim() ? v : f);
    const categories = (Array.isArray(d.categories) ? d.categories : []).filter(c => c && c.id).map(c => ({
      id: String(c.id),
      name: str(c.name, 'Untitled category'),
      rules: !!c.rules,
      macros: (Array.isArray(c.macros) ? c.macros : []).filter(m => m && typeof m.name === 'string')
        .map(m => ({ name: m.name, def: String(m.def ?? '') })),
      keys: (Array.isArray(c.keys) ? c.keys : []).filter(k => k && typeof k.insert === 'string' && k.insert)
        .map(k => ({ id: String(k.id || uid('k')), insert: k.insert, label: typeof k.label === 'string' ? k.label : '' })),
    }));
    const catIds = new Set(categories.map(c => c.id));
    let projects = (Array.isArray(d.projects) ? d.projects : []).filter(p => p && p.id).map(p => ({
      id: String(p.id),
      name: str(p.name, 'Untitled project'),
      categoryIds: (Array.isArray(p.categoryIds) ? p.categoryIds : []).map(String)
        .filter((x, i, a) => catIds.has(x) && a.indexOf(x) === i),
    }));
    if (!projects.length) projects = [{ id: uid('p'), name: 'Untitled project', categoryIds: categories.map(c => c.id) }];
    const pids = new Set(projects.map(p => p.id));
    let documents = (Array.isArray(d.documents) ? d.documents : []).filter(x => x && x.id).map(x => ({
      id: String(x.id),
      projectId: pids.has(String(x.projectId)) ? String(x.projectId) : projects[0].id,
      name: str(x.name, 'Untitled'),
      text: typeof x.text === 'string' ? x.text : '',
      updated: +x.updated || Date.now(),
      caret: Array.isArray(x.caret) ? [Math.max(0, +x.caret[0] || 0), Math.max(0, +x.caret[1] || 0)] : [0, 0],
      ref: typeof x.ref === 'string' ? x.ref : '', // a pasted reply, shown in the reference pane
    }));
    if (!documents.length) {
      documents = [{ id: uid('d'), projectId: projects[0].id, name: 'Untitled', text: '', updated: Date.now(), caret: [0, 0], ref: '' }];
    }
    const st = d.settings || {};
    return {
      app: 'notation-composer', version: 1,
      settings: {
        rows: ['auto', '2', '3'].includes(String(st.rows)) ? String(st.rows) : 'auto',
        mode: ['edit', 'preview', 'split', 'fitch'].includes(st.mode) ? st.mode : 'edit',
        refOpen: !!st.refOpen,
        refFold: !!st.refFold,
      },
      categories, projects, documents,
      activeDocId: documents.some(x => x.id === d.activeDocId) ? String(d.activeDocId) : documents[0].id,
      lastExport: +d.lastExport || null,
    };
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function persistNow() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); storageOK = true; }
    catch (e) { storageOK = false; }
    $('storeWarn').hidden = storageOK;
  }
  const persist = debounce(persistNow, 400);

  const catById = id => S.categories.find(c => c.id === id);
  const projById = id => S.projects.find(p => p.id === id);
  const docById = id => S.documents.find(d => d.id === id);
  const curDoc = () => docById(S.activeDocId);
  const curProj = () => projById(curDoc().projectId);
  const docsOf = pid => S.documents.filter(d => d.projectId === pid).sort((a, b) => b.updated - a.updated);

  /* ---------- macros and rendering ---------- */
  let MAC = {};
  const faceCache = new Map();
  function macroTable(p) {
    const m = {};
    for (const cid of p.categoryIds) {
      const c = catById(cid);
      if (!c) continue;
      for (const x of c.macros) if (C.MACRO_NAME.test(x.name)) m[x.name] = x.def; // later categories win
    }
    return m;
  }
  function refreshMacros() { MAC = macroTable(curProj()); faceCache.clear(); }
  function macrosForCat(c) {
    const p = curProj();
    if (p.categoryIds.includes(c.id)) return macroTable(p);
    const own = {};
    for (const x of c.macros) if (C.MACRO_NAME.test(x.name)) own[x.name] = x.def;
    return Object.assign({}, macroTable(p), own);
  }

  const SLOT_TEX = '{\\htmlClass{slot}{\\phantom{x}}}';
  function texRaw(src, display, macros, htmlOnly, lenient) {
    return katex.renderToString(src.split(SLOT).join(SLOT_TEX), {
      displayMode: display, throwOnError: !lenient, errorColor: 'var(--danger)', strict: 'ignore', maxExpand: 1000,
      macros: Object.assign({}, macros),
      trust: t => t.command === '\\htmlClass',
      output: htmlOnly ? 'html' : 'htmlAndMathml',
    });
  }
  const errText = err => String((err && err.message) || err).replace(/^KaTeX parse error:\s*/, '');
  // Problems found while rendering the preview, grouped by explanation: Map(text -> {n, o}).
  let texProblems = null;
  function explainProblem(err) {
    const msg = errText(err);
    const und = /^Undefined control sequence: (\\[A-Za-z]+)/.exec(msg);
    if (und) {
      const name = und[1];
      const homes = S.categories.filter(c => c.macros.some(m => m.name === name)).map(c => c.name);
      return homes.length
        ? `${name} is defined in ${homes.join(', ')}, which isn’t in ${curProj().name}. Add it from the project’s page.`
        : `${name} isn’t defined. Add it as a macro in Keys & macros.`;
    }
    if (/Too many expansions/.test(msg)) return 'A macro refers to itself, directly or through another macro. Check its definition in Keys & macros.';
    return msg.replace(/ at position \d+[\s\S]*$/, '');
  }
  function noteProblem(err, o) {
    if (!texProblems) return;
    const k = explainProblem(err);
    const p = texProblems.get(k);
    if (p) p.n++; else texProblems.set(k, { n: 1, o });
  }
  function texDoc(src, display, o) {
    try { return texRaw(src, display, MAC, false); }
    catch (err) {
      noteProblem(err, o);
      // An unknown command shouldn't hide the rest of the formula: show it in red in place.
      if (/^Undefined control sequence/.test(errText(err))) {
        try { return texRaw(src, display, MAC, false, true); } catch (e2) { /* fall through */ }
      }
      return display
        ? `<span class="tex-err">${esc(src.trim())}</span><span class="err-msg">${esc(errText(err))}</span>`
        : `<span class="tex-err" title="${esc(errText(err))}">${esc(src)}</span>`;
    }
  }
  // A proof as a table: number, bars and formula, then rule and cited lines.
  // o: { pk: which proof in the document, base: offset of the block body, sel, cite, cited: Set }
  function proofHTML(items, an, o) {
    o = o || {};
    if (!an.lines.length) return `<div class="fp fp-none" data-pk="${o.pk}">An empty proof.</div>`;
    const base = o.base || 0;
    const warn = new Set(an.issues.filter(x => x.kind !== 'empty').map(x => x.line));
    const rows = an.lines.map((L, i) => {
      const it = L.item;
      let bars = '';
      for (let k = 0; k <= L.d; k++) {
        const s = an.subs[L.chain[k]];
        bars += `<i class="fb${s.from === i ? ' s' : ''}${s.to === i ? ' e' : ''}" style="--k:${k}"></i>`;
      }
      const at = base + (it.fOff || 0);
      const f = it.f ? texDoc(it.f, false, at) : '<span class="slot-box"></span>';
      const rule = it.rule ? texDoc(it.rule, false, at) : '';
      let cites = '';
      if (it.cites) {
        let last = 0;
        for (const tok of L.citeToks) {
          cites += esc(it.cites.slice(last, tok.s));
          const t = it.cites.slice(tok.s, tok.e).replace(/\s*[-–]\s*/, '–');
          cites += tok.bad ? `<span class="fc bad" title="${esc(tok.bad)}">${esc(t)}</span>` : esc(t);
          last = tok.e;
        }
        cites += esc(it.cites.slice(last));
      }
      const cls = ['fp-row'];
      if (warn.has(i)) cls.push('warn');
      if (o.sel === i) cls.push('sel');
      if (o.cited && o.cited.has(i)) cls.push('cited');
      if (o.cite && o.sel !== undefined && i > o.sel) cls.push('after');
      return `<tr class="${cls.join(' ')}" data-pk="${o.pk}" data-li="${i}"><td class="fp-n"><span>${i + 1}</span></td>` +
        `<td class="fp-b" style="--d:${L.d}">${bars}<span class="fp-f${L.under ? ' under' : ''}">${f}</span></td>` +
        `<td class="fp-j">${rule}${cites ? `<span class="fcs">${cites}</span>` : ''}</td></tr>`;
    }).join('');
    return `<div class="fp" data-pk="${o.pk}"><table class="fp-t"><tbody>${rows}</tbody></table></div>`;
  }

  const faceSrc = k => k.label.trim() || k.insert.replace(/##|#[1-9]/g, m => (m === '##' ? '#' : SLOT)).trim() || '\\square';
  function texFace(src, macros) {
    try { return texRaw(src, false, macros, true); }
    catch (e) { return `<span class="k-raw">${esc(src)}</span>`; }
  }
  function keyFace(k) {
    const src = faceSrc(k);
    if (!faceCache.has(src)) faceCache.set(src, texFace(src, MAC));
    return faceCache.get(src);
  }

  /* ---------- editor ---------- */
  function renderHL() {
    const v = ed.value;
    hl.innerHTML = C.runsHTML(v, C.runs(v, C.segment(v)), ed.selectionEnd) + '\n';
    hl.scrollTop = ed.scrollTop;
  }
  function revealCaret() {
    renderHL();
    const mk = $('cmk');
    if (!mk) return;
    const lh = parseFloat(getComputedStyle(ed).lineHeight) || 24;
    const top = mk.offsetTop, view = ed.clientHeight, st = ed.scrollTop;
    if (top < st + 6) ed.scrollTop = Math.max(0, top - lh);
    else if (top + lh > st + view - 6) ed.scrollTop = top + lh * 2 - view;
    hl.scrollTop = ed.scrollTop;
  }
  function focusEd() {
    if (document.activeElement === ed) return;
    try { ed.focus({ preventScroll: true }); } catch (e) { ed.focus(); }
  }

  let past = [], future = [], lastKind = null, lastT = 0;
  const snap = () => ({ v: ed.value, s: ed.selectionStart, e: ed.selectionEnd });
  function pushUndo(kind) {
    const now = Date.now();
    future = [];
    if ((kind === 'type' || kind === 'del') && kind === lastKind && now - lastT < 1200) { lastT = now; return; }
    past.push(snap());
    if (past.length > 300) past.shift();
    lastKind = kind; lastT = now;
  }
  function restoreSnap(st) {
    ed.value = st.v;
    ed.setSelectionRange(Math.min(st.s, st.v.length), Math.min(st.e, st.v.length));
    if (S.settings.mode === 'fitch') {
      textChanged();
      fxLoad(); fxFill(); fxRender();
      if (FX.k >= 0) fxFocus(FX.field);
      return;
    }
    focusEd();
    textChanged();
    revealCaret();
  }
  function undo() {
    if (!past.length) { toast('Nothing to undo'); return; }
    future.push(snap()); restoreSnap(past.pop()); lastKind = null;
  }
  function redo() {
    if (!future.length) { toast('Nothing to redo'); return; }
    past.push(snap()); restoreSnap(future.pop()); lastKind = null;
  }

  const previewSoon = debounce(() => renderPreview(), 160);
  function textChanged() {
    const d = curDoc();
    d.text = ed.value;
    d.updated = Date.now();
    renderHL();
    persist();
    if (S.settings.mode === 'split') previewSoon();
  }
  const saveCaretSoon = debounce(() => {
    const d = curDoc();
    if (d) { d.caret = [ed.selectionStart, ed.selectionEnd]; persist(); }
  }, 500);

  // What the palette and the tools edit: the document, or a field of the selected proof line.
  function target() {
    if (S.settings.mode !== 'fitch') return ed;
    return FX.k >= 0 ? FX_INPUT[FX.field] || fxF : null;
  }
  function focusEl(el) {
    if (el === ed) { focusEd(); return; }
    if (document.activeElement !== el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  }
  function replaceIn(el, s, e, text, a, b, kind) {
    pushUndo(kind || 'op');
    el.value = el.value.slice(0, s) + text + el.value.slice(e);
    focusEl(el);
    el.setSelectionRange(a, b);
    if (el === ed) { textChanged(); revealCaret(); saveCaretSoon(); }
    else fxFieldInput(el);
  }
  function replaceRange(s, e, text, a, b, kind) { replaceIn(ed, s, e, text, a, b, kind); }
  // Keys write LaTeX, so a key pressed in prose brings its own $…$ (or $$…$$ for an
  // environment), and a key pressed right beside a formula joins that formula.
  function insertTemplate(tpl) {
    if (S.settings.mode === 'preview') setMode('edit');
    if (S.settings.mode === 'fitch') { fxInsertTemplate(tpl); return; }
    const v = ed.value;
    let s = ed.selectionStart, e = ed.selectionEnd;
    let pre = '', post = '';
    if (!/\$|\\[([]/.test(tpl)) {
      const ctx = C.mathContext(v, s);
      if ((ctx.kind === 'after' || ctx.kind === 'before') && s === e) {
        s = e = ctx.at;
      } else if (ctx.kind === 'prose') {
        const display = /\\begin\{/.test(tpl);
        pre = display ? '$$\n' : '$';
        post = display ? '\n$$' : '$';
      }
    }
    const before = pre ? '' : v.slice(Math.max(0, s - 64), s);
    const after = post ? '$' : v.slice(e, e + 2);
    const r = C.fillTemplate(tpl, v.slice(s, e), before, after);
    replaceRange(s, e, pre + r.text + post, s + pre.length + r.a, s + pre.length + r.b, 'op');
  }
  // The $ tool: wrap a selection as math, start a formula, or step out of the current one.
  function mathTool() {
    if (S.settings.mode === 'preview') setMode('edit');
    const v = ed.value, s = ed.selectionStart, e = ed.selectionEnd;
    const ctx = C.mathContext(v, s);
    if (ctx.kind === 'in') {
      focusEd();
      ed.setSelectionRange(ctx.g.e, ctx.g.e);
      lastKind = null;
      revealCaret();
      saveCaretSoon();
      return;
    }
    if (ctx.kind === 'open') { typeText('$'); return; }
    if (s !== e) {
      const sel = v.slice(s, e);
      replaceRange(s, e, '$' + sel + '$', s + sel.length + 2, s + sel.length + 2, 'op');
      return;
    }
    replaceRange(s, e, '$' + SLOT + '$', s + 1, s + 2, 'op');
  }
  function typeText(t) {
    const el = target();
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    replaceIn(el, s, e, t, s + t.length, s + t.length, 'type');
  }
  function backspace() {
    const el = target();
    if (!el) return;
    const v = el.value, s = el.selectionStart, e = el.selectionEnd;
    if (s !== e) { replaceIn(el, s, e, '', s, s, 'del'); return; }
    const n = C.backspaceSpan(v.slice(Math.max(0, s - 64), s));
    if (n) replaceIn(el, s - n, s, '', s - n, s - n, 'del');
  }
  function moveCaret(d) {
    const el = target();
    if (!el) return;
    focusEl(el);
    const v = el.value;
    const s = el.selectionStart, e = el.selectionEnd;
    let p;
    if (s !== e) p = d < 0 ? s : e;
    else {
      p = Math.max(0, Math.min(v.length, s + d));
      const c = v.charCodeAt(p);
      if (c >= 0xdc00 && c <= 0xdfff) p += d < 0 ? -1 : 1;
    }
    el.setSelectionRange(p, p);
    lastKind = null;
    if (el === ed) { revealCaret(); saveCaretSoon(); }
  }
  function jumpSlot(dir) {
    if (S.settings.mode === 'fitch') { if (FX.k >= 0) fxJumpSlot(); return; }
    const v = ed.value;
    let i;
    if (dir > 0) {
      i = v.indexOf(SLOT, ed.selectionEnd);
      if (i < 0) i = v.indexOf(SLOT);
    } else {
      const from = ed.selectionStart - 1;
      i = from >= 0 ? v.lastIndexOf(SLOT, from) : -1;
      if (i < 0) i = v.lastIndexOf(SLOT);
    }
    if (i < 0) { toast('No slots left to fill'); return; }
    focusEd();
    ed.setSelectionRange(i, i + 1);
    lastKind = null;
    revealCaret();
    saveCaretSoon();
  }

  ed.addEventListener('beforeinput', e => {
    if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); return; }
    if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); return; }
    pushUndo(e.inputType && e.inputType.startsWith('delete') ? 'del' : 'type');
  });
  ed.addEventListener('input', textChanged);
  ed.addEventListener('keydown', e => {
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && !e.altKey && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && !e.altKey && k === 'y') { e.preventDefault(); redo(); return; }
    if (e.key === 'Tab' && !mod && !e.altKey && ed.value.includes(SLOT)) { e.preventDefault(); jumpSlot(e.shiftKey ? -1 : 1); }
  });
  ed.addEventListener('scroll', () => { hl.scrollTop = ed.scrollTop; });
  for (const ev of ['select', 'keyup', 'pointerup']) ed.addEventListener(ev, saveCaretSoon);
  document.addEventListener('selectionchange', () => { if (document.activeElement === ed) saveCaretSoon(); });

  /* ---------- pinned tools (per mode, so a later mode can bring its own) ---------- */
  const TOOLSETS = {
    edit: [['left', 'right', 'slot', 'math', 'space', 'enter', 'del', 'undo', 'redo']],
    fitch: [
      ['fxLine', 'fxSub', 'fxEnd', 'fxBar', 'fxOut', 'fxIn', 'fxCite', 'fxDel'],
      ['left', 'right', 'slot', 'space', 'del', 'undo', 'redo'],
    ],
  };
  const TOOLS = {
    fxLine: { t: 'New line below', label: '+Line', run: () => fxAction('fxLine') },
    fxSub: { t: 'New subproof. On an empty line, starts a subproof beside the one above it', label: '+Sub', run: () => fxAction('fxSub') },
    fxEnd: { t: 'End the subproof: a new line one level out', label: 'End', run: () => fxAction('fxEnd') },
    fxBar: { t: 'Fitch bar: make this line an assumption, or stop it being one', label: 'Bar', run: () => fxAction('fxBar') },
    fxOut: { t: 'Move the line out one level', run: () => fxAction('fxOut') },
    fxIn: { t: 'Move the line in one level', run: () => fxAction('fxIn') },
    fxCite: { t: 'Cite lines: tap them in the proof', label: 'Cite', toggle: true, run: () => fxAction('fxCite') },
    fxDel: { t: 'Delete the line', run: () => fxAction('fxDel') },
    left: { t: 'Move left', rep: true, run: () => moveCaret(-1) },
    right: { t: 'Move right', rep: true, run: () => moveCaret(1) },
    slot: { t: 'Next slot', run: () => jumpSlot(1) },
    math: { t: 'Math: wrap the selection, start a formula, or step out of one', run: mathTool },
    space: { t: 'Space', run: () => typeText(' ') },
    enter: { t: 'New line', run: () => typeText('\n') },
    del: { t: 'Delete', rep: true, run: backspace },
    undo: { t: 'Undo', run: undo },
    redo: { t: 'Redo', run: redo },
  };
  function buildTools() {
    const set = TOOLSETS[S.settings.mode === 'fitch' ? 'fitch' : 'edit'];
    toolsEl.innerHTML = set.map((row, ri) => `<div class="tools-row${set.length > 1 && ri === 0 ? ' fx-row' : ''}">${row.map(n => {
      const d = TOOLS[n];
      const face = d.label ? `<span class="tool-lbl">${d.label}</span>` : IC[n];
      return `<button type="button" class="tool" data-tool="${n}" aria-label="${esc(d.t)}" title="${esc(d.t)}"${d.toggle ? ' aria-pressed="false"' : ''}>${face}</button>`;
    }).join('')}</div>`).join('');
    if (S.settings.mode === 'fitch') fxSyncTools();
  }
  let repT = null, repI = null;
  const stopRepeat = () => {
    clearTimeout(repT); clearInterval(repI); repT = repI = null;
    for (const x of document.querySelectorAll('.tool.down, .key.down')) x.classList.remove('down');
  };
  toolsEl.addEventListener('pointerdown', e => {
    const b = e.target.closest('.tool');
    if (!b) return;
    e.preventDefault();
    b.classList.add('down');
    const d = TOOLS[b.dataset.tool];
    if (d.rep) {
      stopRepeat();
      b.classList.add('down');
      d.run();
      repT = setTimeout(() => { repI = setInterval(d.run, 55); }, 380);
    }
  });
  toolsEl.addEventListener('click', e => {
    const b = e.target.closest('.tool');
    if (!b) return;
    const d = TOOLS[b.dataset.tool];
    if (d.rep && e.detail !== 0) return; // pointer already ran it
    d.run();
  });
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, stopRepeat);
  toolsEl.addEventListener('pointerleave', stopRepeat);

  /* ---------- palette ---------- */
  let pages = [], pageIdx = 0, grid = { cols: 0, rows: 0 };
  function gridSize() {
    const w = pagesEl.clientWidth || Math.min(1000, app.clientWidth) - 32;
    const min = coarseMQ.matches ? 50 : 56, gap = 6;
    const cols = Math.max(4, Math.min(12, Math.floor((w + gap) / (min + gap))));
    const r = S.settings.rows;
    const max = r === 'auto' ? (app.clientHeight >= 700 ? 3 : 2) : +r;
    // Never more rows than the project's fullest category needs, so no row sits empty.
    let need = 1;
    for (const cid of curProj().categoryIds) {
      const c = catById(cid);
      if (c) need = Math.max(need, Math.ceil(c.keys.length / cols));
    }
    return { cols, rows: Math.min(max, need) };
  }
  function buildPalette(keepCat) {
    const p = curProj();
    const prevCat = keepCat || (pages[pageIdx] && pages[pageIdx].cat.id);
    grid = gridSize();
    const per = grid.cols * grid.rows;
    pages = [];
    for (const cid of p.categoryIds) {
      const c = catById(cid);
      if (!c || !c.keys.length) continue;
      const n = Math.ceil(c.keys.length / per);
      for (let i = 0; i < n; i++) pages.push({ cat: c, keys: c.keys.slice(i * per, (i + 1) * per), i, n });
    }
    pagesEl.style.setProperty('--cols', grid.cols);
    pagesEl.style.setProperty('--rows', grid.rows);
    if (!pages.length) {
      pagesEl.innerHTML = '<div class="page empty-page"><p>No keys in this project yet.</p><button type="button" class="btn" data-act="keys">Add keys</button></div>';
      tabsEl.innerHTML = '';
      dotsEl.innerHTML = '';
      return;
    }
    pagesEl.innerHTML = pages.map((pg, pi) =>
      `<div class="page" data-pi="${pi}">${pg.keys.map(k =>
        `<button type="button" class="key" data-cid="${pg.cat.id}" data-kid="${k.id}" aria-label="${esc(k.label || k.insert.trim() || 'key')}"><span class="kl">${keyFace(k)}</span></button>`).join('')}</div>`).join('');
    const cats = [];
    for (const pg of pages) if (!cats.includes(pg.cat)) cats.push(pg.cat);
    tabsEl.innerHTML = cats.map(c => `<button type="button" class="tab" role="tab" data-cid="${c.id}" aria-selected="false">${esc(c.name)}</button>`).join('');
    let target = 0;
    if (prevCat) { const t = pages.findIndex(pg => pg.cat.id === prevCat); if (t >= 0) target = t; }
    pageIdx = target;
    syncPageUI();
    requestAnimationFrame(() => {
      pagesEl.scrollLeft = pageIdx * pagesEl.clientWidth;
      fitKeys(pagesEl);
    });
  }
  function fitKeys(root) {
    for (const kl of root.querySelectorAll('.kl')) {
      kl.style.transform = '';
      const key = kl.parentElement;
      const aw = key.clientWidth - 12, ah = key.clientHeight - 6;
      const w = kl.offsetWidth, h = kl.offsetHeight;
      if (!w || aw <= 0) continue;
      const sc = Math.min(1, aw / w, ah / (h || 1));
      if (sc < 0.995) kl.style.transform = `scale(${Math.max(0.35, sc).toFixed(3)})`;
    }
  }
  function syncPageUI() {
    const pg = pages[pageIdx];
    if (!pg) return;
    for (const t of tabsEl.children) {
      const on = t.dataset.cid === pg.cat.id;
      t.setAttribute('aria-selected', String(on));
      if (on) {
        const L = t.offsetLeft, R = L + t.offsetWidth;
        if (L < tabsEl.scrollLeft) tabsEl.scrollLeft = L - 8;
        else if (R > tabsEl.scrollLeft + tabsEl.clientWidth) tabsEl.scrollLeft = R - tabsEl.clientWidth + 8;
      }
    }
    dotsEl.innerHTML = pg.n > 1
      ? Array.from({ length: pg.n }, (_, i) =>
        `<button type="button" class="dot${i === pg.i ? ' on' : ''}" data-go="${pageIdx - pg.i + i}" aria-label="Page ${i + 1} of ${pg.n}"></button>`).join('')
      : '';
  }
  function goPage(i) {
    if (!pages.length) return;
    const from = pageIdx;
    pageIdx = Math.max(0, Math.min(pages.length - 1, i));
    syncPageUI();
    // Slide to a neighbouring page; jump straight to a distant one.
    const near = Math.abs(pageIdx - from) <= 1;
    pagesEl.scrollTo({ left: pageIdx * pagesEl.clientWidth, behavior: near && !reduceMQ.matches ? 'smooth' : 'auto' });
  }
  pagesEl.addEventListener('scroll', () => {
    const w = pagesEl.clientWidth;
    if (!w) return;
    const i = Math.round(pagesEl.scrollLeft / w);
    if (i !== pageIdx && pages[i]) { pageIdx = i; syncPageUI(); }
  }, { passive: true });
  let wheelLock = 0;
  pagesEl.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    const now = Date.now();
    if (now < wheelLock) return;
    wheelLock = now + 320;
    goPage(pageIdx + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  // Keep the editor's focus and selection when palette buttons are pressed.
  $('pal').addEventListener('pointerdown', e => {
    const b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    if (b.classList.contains('key')) b.classList.add('down');
  });
  pagesEl.addEventListener('click', e => {
    const k = e.target.closest('.key');
    if (k) {
      const c = catById(k.dataset.cid);
      const key = c && c.keys.find(x => x.id === k.dataset.kid);
      if (key) insertTemplate(key.insert);
      return;
    }
    const a = e.target.closest('[data-act]');
    if (a) act(a.dataset.act);
  });
  tabsEl.addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) goPage(pages.findIndex(pg => pg.cat.id === t.dataset.cid));
  });
  dotsEl.addEventListener('click', e => {
    const d = e.target.closest('.dot');
    if (d) goPage(+d.dataset.go);
  });
  function layoutPalette() {
    if (app.dataset.mode === 'preview' || app.dataset.input === 'keys') return;
    const g = gridSize();
    if (g.cols !== grid.cols || g.rows !== grid.rows) buildPalette();
    else { pagesEl.scrollLeft = pageIdx * pagesEl.clientWidth; fitKeys(pagesEl); }
  }

  /* ---------- preview ---------- */
  function renderPreview() {
    const v = ed.value;
    const segs = C.segment(v);
    texProblems = new Map();
    const proofNotes = [];
    const proof = (g, k) => {
      const items = C.parseProof(v.slice(g.cs, g.ce));
      const an = C.analyzeProof(items);
      for (const x of an.issues) proofNotes.push({ t: `Proof ${k + 1}: ${x.msg}`, n: 0, pk: k, li: x.line });
      return proofHTML(items, an, { pk: k, base: g.cs });
    };
    const html = C.buildBlocks(v, segs, texDoc, proof);
    const notes = [...texProblems].map(([t, p]) => ({ t, n: p.n, o: p.o })).concat(proofNotes);
    texProblems = null;
    // LaTeX typed outside $…$ shows as plain text; point it out.
    let loose = 0, looseAt = -1;
    for (const g of segs) {
      if (g.k !== 't') continue;
      const re = /\\[A-Za-z]+\s*[{(_^\\]/g;
      const t = v.slice(g.s, g.e);
      let m;
      while ((m = re.exec(t))) { loose++; if (looseAt < 0) looseAt = g.s + m.index; }
    }
    if (loose) notes.unshift({ t: 'Some LaTeX is outside $…$, so it shows as plain text. Select it in the editor and tap the $ tool.', n: 0, o: looseAt });
    const box = notes.length
      ? `<aside class="pv-note" role="note"><ul>${notes.map(x =>
        `<li ${x.pk !== undefined ? `data-pk="${x.pk}" data-li="${x.li}"` : `data-o="${x.o}"`}>${esc(x.t)}${x.n > 1 ? ` <span class="pv-n">(${x.n} formulas)</span>` : ''}</li>`).join('')}</ul></aside>`
      : '';
    prev.innerHTML = box + (html || '<p class="empty">Nothing here yet.</p>');
  }
  prev.addEventListener('click', e => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const pr = e.target.closest('[data-pk][data-li]');
    if (pr) { fxOpen(+pr.dataset.pk, +pr.dataset.li); return; }
    const t = e.target.closest('[data-o]');
    if (!t) return;
    const o = Math.min(+t.dataset.o || 0, ed.value.length);
    if (S.settings.mode === 'preview') setMode('edit');
    focusEd();
    ed.setSelectionRange(o, o);
    revealCaret();
    saveCaretSoon();
  });

  /* ---------- reference pane: a pasted reply above the editor ---------- */
  // Each document keeps one reply, usually the one it answers. Tap a formula or a piece of code
  // in it to insert it at the cursor, so quoting needs no retyping.
  const refPane = document.createElement('div');
  refPane.className = 'ref';
  refPane.id = 'refPane';
  refPane.hidden = true;
  refPane.innerHTML = `<div class="ref-bar">
      <button type="button" class="ref-fold" id="refFold" aria-expanded="true" aria-controls="refBody">${IC.down}<span>Reference</span></button>
      <span class="grow"></span>
      <button type="button" class="ref-btn" data-ref="paste">Paste</button>
      <button type="button" class="ref-btn" data-ref="edit">Edit</button>
      <button type="button" class="ib sm" data-ref="hide" aria-label="Hide the reference pane" title="Hide the reference pane">${IC.close}</button>
    </div>
    <div class="ref-body paper" id="refBody" aria-label="Reference"></div>`;
  document.querySelector('.pane-edit').prepend(refPane);
  const refBody = refPane.querySelector('#refBody');
  let refBits = [];

  function refTex(body, display) {
    try { return texRaw(body, display, MAC, false); }
    catch (err) {
      try { return texRaw(body, display, MAC, false, true); }
      catch (e2) { return `<span class="tex-err" title="${esc(errText(err))}">${esc(body)}</span>`; }
    }
  }
  function renderRef() {
    const open = !!S.settings.refOpen;
    refPane.hidden = !open;
    if (!open) return;
    const fold = !!S.settings.refFold;
    const t = curDoc().ref || '';
    refPane.classList.toggle('folded', fold);
    $('refFold').setAttribute('aria-expanded', String(!fold));
    refPane.querySelector('[data-ref="edit"]').hidden = !t.trim();
    if (!t.trim()) {
      refBits = [];
      refBody.innerHTML = `<p class="ref-empty">Paste a reply from a chat to quote from it. Tap a formula, or a piece of code, to insert it at the cursor.</p>
        <div class="btn-row"><button type="button" class="btn primary" data-ref="paste">Paste a reply</button></div>`;
      return;
    }
    const r = C.refBlocks(t, refTex);
    refBits = r.bits;
    refBody.innerHTML = r.html;
  }
  function setRef(text, msg) {
    curDoc().ref = text;
    S.settings.refOpen = true;
    S.settings.refFold = false;
    persist();
    renderRef();
    refBody.scrollTop = 0;
    requestAnimationFrame(revealCaret);
    if (msg) toast(msg);
  }
  function setRefOpen(on) {
    S.settings.refOpen = on;
    if (on) S.settings.refFold = false;
    persist();
    if (on && (S.settings.mode === 'preview' || S.settings.mode === 'fitch')) setMode('edit');
    renderRef();
    requestAnimationFrame(() => { if (S.settings.mode !== 'fitch') revealCaret(); });
  }
  async function refPaste() {
    const had = !!curDoc().ref.trim();
    let t = '';
    try { if (navigator.clipboard && navigator.clipboard.readText) t = await navigator.clipboard.readText(); } catch (e) { t = ''; }
    if (t && t.trim()) setRef(t, had ? 'Reply replaced' : 'Reply pasted');
    else refSheet(true);
  }
  // The reply as text: to paste where the clipboard can't be read, or to fix what was pasted.
  function refSheet(forPaste) {
    const cur = curDoc().ref || '';
    const host = $('sheetHost');
    host.innerHTML = `<div class="sheet-wrap" data-scrim="1"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="refTitle">
      <div class="sheet-head"><h3 id="refTitle">Reference</h3></div>
      <p class="hint">${forPaste ? 'This view can’t read your clipboard. Paste the reply below.' : 'The reply as it was pasted. Edit it, or paste another over it.'}</p>
      <textarea class="fld-in mono" id="refText" rows="10" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Paste a reply here"${forPaste ? ' data-paste="1"' : ''}>${esc(forPaste ? '' : cur)}</textarea>
      <div class="btn-row">${cur.trim() ? '<button type="button" class="btn danger" data-act="refClear">Clear</button>' : ''}<span class="grow"></span>
        <button type="button" class="btn" data-act="sheetClose">Cancel</button><button type="button" class="btn primary" data-act="refUse">Use</button></div>
    </div></div>`;
    host.hidden = false;
    $('refText').focus();
  }
  // A formula goes in with its own delimiters when the cursor is in prose, and as a bare body
  // when the cursor is already inside a formula. Code goes in exactly as it was.
  function insertRef(i, el) {
    const b = refBits[i];
    if (!b) return;
    const v = ed.value, s = ed.selectionStart, e = ed.selectionEnd;
    let text;
    if (b.kind === 'code') text = b.src;
    else {
      const body = b.src.trim();
      const ctx = C.mathContext(v, s);
      if (ctx.kind === 'in' || ctx.kind === 'open') text = body;
      else if (b.d) {
        const bol = s === 0 || v[s - 1] === '\n', eol = e >= v.length || v[e] === '\n';
        text = (bol ? '' : '\n') + (body.includes('\n') ? '$$\n' + body + '\n$$' : '$$' + body + '$$') + (eol ? '' : '\n');
      } else {
        text = '$' + body + '$';
        if (s > 0 && !/[\s([{]/.test(v[s - 1])) text = ' ' + text;
        if (e < v.length && !/[\s.,;:!?)\]}]/.test(v[e])) text += ' ';
      }
    }
    replaceRange(s, e, text, s + text.length, s + text.length, 'op');
    if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 650); }
  }
  refPane.addEventListener('click', e => {
    const b = e.target.closest('[data-ref]');
    if (b) {
      const a = b.dataset.ref;
      if (a === 'paste') refPaste();
      else if (a === 'edit') refSheet(false);
      else if (a === 'hide') setRefOpen(false);
      return;
    }
    if (e.target.closest('#refFold')) {
      S.settings.refFold = !S.settings.refFold;
      persist();
      renderRef();
      requestAnimationFrame(revealCaret);
      return;
    }
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && refBody.contains(sel.anchorNode)) return;
    const hit = e.target.closest('[data-ri]');
    if (hit && refBody.contains(hit)) insertRef(+hit.dataset.ri, hit);
  });

  /* ---------- copy & new: the prompt loop ---------- */
  // Copy the document for a chat, then start a fresh one in the same project. The one just
  // copied keeps its place in the project's documents, named from its first line if it had no name.
  function nameFrom(text) {
    const line = text.split('\n').map(x => x.trim()).find(x => x && !/^```/.test(x)) || '';
    let n = '';
    for (const g of C.segment(line)) n += g.k === 't' ? line.slice(g.s, g.e) : ' … ';
    n = n.replace(/^#+\s*/, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').replace(/(\s*…\s*)+/g, ' … ').trim();
    if (!n || n === '…') n = 'Copied ' + new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return n.length > 48 ? n.slice(0, 47).trimEnd() + '…' : n;
  }
  function copyAndNew() {
    if (S.settings.mode === 'preview' || S.settings.mode === 'fitch') setMode('edit');
    const d = curDoc();
    if (!ed.value.trim()) { toast('Nothing to copy yet'); return; }
    copyDoc(false, 'Copied. This is a new document.');
    if (d.name === 'Untitled') d.name = nameFrom(ed.value);
    openDoc(newDoc(d.projectId).id);
  }

  /* ---------- modes ---------- */
  function setMode(m) {
    if (m === 'split' && !wideMQ.matches) m = 'edit';
    const was = app.dataset.mode;
    if (was === 'fitch' && m !== 'fitch') fxLeave();
    S.settings.mode = m;
    app.dataset.mode = m;
    $('modeEdit').setAttribute('aria-pressed', String(m === 'edit'));
    $('modePrev').setAttribute('aria-pressed', String(m === 'preview'));
    $('modeFitch').setAttribute('aria-pressed', String(m === 'fitch'));
    $('modeSplit').setAttribute('aria-pressed', String(m === 'split'));
    if (m === 'preview' && document.activeElement === ed) ed.blur();
    if (m === 'preview' || m === 'split') renderPreview();
    buildTools();
    if (m === 'fitch') fxEnter();
    else app.classList.remove('fx-none');
    persist();
    if (m !== 'preview') requestAnimationFrame(() => { layoutPalette(); if (m !== 'fitch') revealCaret(); });
  }
  $('modeEdit').addEventListener('click', () => setMode('edit'));
  $('modePrev').addEventListener('click', () => setMode('preview'));
  $('modeFitch').addEventListener('click', () => { if (S.settings.mode !== 'fitch') setMode('fitch'); });
  $('modeSplit').addEventListener('click', () => setMode('split'));
  wideMQ.addEventListener('change', () => { if (!wideMQ.matches && S.settings.mode === 'split') setMode('edit'); });

  function setInput(m, gesture) {
    app.dataset.input = m;
    const b = $('inputBtn');
    b.innerHTML = m === 'palette' ? IC.keyboard : IC.grid;
    const label = m === 'palette' ? 'Use system keyboard' : 'Use key palette';
    b.setAttribute('aria-label', label);
    b.title = label;
    for (const el of [ed, fxF, fxR, fxC]) el.setAttribute('inputmode', m === 'palette' ? 'none' : 'text');
    if (!gesture) return;
    if (S.settings.mode === 'preview') setMode('edit');
    const el = target() || ed;
    const s = el.selectionStart, e = el.selectionEnd;
    el.blur();
    if (m === 'keys') {
      focusEl(el);
      el.setSelectionRange(s, e);
    } else {
      setTimeout(() => {
        focusEl(el);
        el.setSelectionRange(s, e);
        layoutPalette();
        if (el === ed) revealCaret();
      }, 80);
    }
  }
  $('inputBtn').addEventListener('click', () => setInput(app.dataset.input === 'palette' ? 'keys' : 'palette', true));

  /* ---------- menu, copy, toast ---------- */
  function openMenu(open) {
    menu.hidden = !open;
    $('menuBtn').setAttribute('aria-expanded', String(open));
    if (open) $('backupAge').textContent = S.lastExport ? 'last ' + ago(S.lastExport) : 'never saved';
    if (open && $('refState')) $('refState').textContent = S.settings.refOpen ? 'shown' : 'hidden';
  }
  $('menuBtn').addEventListener('click', () => openMenu(menu.hidden));
  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    openMenu(false);
    act(b.dataset.act);
  });
  document.addEventListener('pointerdown', e => {
    if (!menu.hidden && !menu.contains(e.target) && !$('menuBtn').contains(e.target)) openMenu(false);
  });
  $('docBtn').addEventListener('click', () => openProjects(curProj().id));

  function act(a) {
    if (a === 'projects') openProjects(null);
    else if (a === 'keys') openKeys();
    else if (a === 'copy') copyDoc(false);
    else if (a === 'copyPre') copyDoc(true);
    else if (a === 'copyNew') copyAndNew();
    else if (a === 'ref') setRefOpen(!S.settings.refOpen);
    else if (a === 'backup') openBackup();
  }

  function copyDoc(withPreamble, okMsg) {
    const v = ed.value;
    let out;
    if (withPreamble) {
      const names = C.usedMacros(v, MAC);
      // Proof blocks become arrays that any LaTeX renders without a package.
      let body = '';
      for (const g of C.segment(v)) {
        body += g.k === 'p' ? '$$\n' + C.proofToArray(C.parseProof(v.slice(g.cs, g.ce))) + '\n$$' : v.slice(g.s, g.e);
      }
      out = names.length ? C.preamble(names, MAC) + '\n\n' + body : body;
    } else {
      out = C.dollarDelims(C.expandDoc(v, MAC));
    }
    const n = out.split(SLOT).length - 1;
    const note = n ? ` ${n} unfilled slot${n > 1 ? 's' : ''} left in it.` : '';
    copyText(out, (okMsg || (withPreamble ? 'Copied with preamble.' : 'Copied with macros expanded.')) + note);
  }
  function copyText(text, okMsg) {
    let p = null;
    try { p = navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) { p = null; }
    if (!p) { copySheet(text); return; }
    p.then(() => toast(okMsg), () => copySheet(text));
  }
  function copySheet(text) {
    const host = $('sheetHost');
    host.innerHTML = `<div class="sheet-wrap" data-scrim="1"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="cpTitle">
      <div class="sheet-head"><h3 id="cpTitle">Copy this text</h3></div>
      <p class="hint">This view can’t write to your clipboard. The text is selected below; copy it from here.</p>
      <textarea class="fld-in mono" id="cpText" rows="8" readonly>${esc(text)}</textarea>
      <div class="btn-row"><span class="grow"></span><button type="button" class="btn primary" data-act="sheetClose">Done</button></div>
    </div></div>`;
    host.hidden = false;
    const ta = $('cpText');
    ta.focus();
    ta.setSelectionRange(0, ta.value.length);
  }
  function closeSheet() { const host = $('sheetHost'); host.hidden = true; host.innerHTML = ''; sheetKey = null; }

  let toastT = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2400);
  }
  function ago(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    if (s < 86400 * 14) { const d = Math.round(s / 86400); return d + (d === 1 ? ' day ago' : ' days ago'); }
    return new Date(t).toLocaleDateString();
  }
  function armed(btn, label) {
    if (btn.dataset.armed === '1') return true;
    const old = btn.innerHTML;
    btn.dataset.armed = '1';
    btn.textContent = label;
    btn.classList.add('armed');
    setTimeout(() => {
      if (!btn.isConnected) return;
      btn.dataset.armed = '';
      btn.innerHTML = old;
      btn.classList.remove('armed');
    }, 3500);
    return false;
  }

  /* ---------- documents and projects ---------- */
  function updateTitle() {
    $('docName').textContent = curDoc().name;
    $('projName').textContent = curProj().name;
  }
  function openDoc(id) {
    const d = docById(id);
    if (!d) return;
    const prevDoc = curDoc();
    if (!prevDoc || prevDoc.projectId !== d.projectId) { pages = []; pageIdx = 0; } // new project: start at its first category
    S.activeDocId = id;
    ed.value = d.text;
    past = []; future = []; lastKind = null;
    const L = d.text.length;
    ed.setSelectionRange(Math.min(d.caret[0], L), Math.min(d.caret[1], L));
    ed.scrollTop = 0;
    refreshMacros();
    updateTitle();
    buildPalette();
    renderHL();
    if (S.settings.mode === 'preview' || S.settings.mode === 'split') renderPreview();
    renderRef();
    if (S.settings.mode === 'fitch') fxEnter();
    else requestAnimationFrame(revealCaret);
    persist();
  }
  function newDoc(pid) {
    const d = { id: uid('d'), projectId: pid, name: 'Untitled', text: '', updated: Date.now(), caret: [0, 0], ref: '' };
    S.documents.push(d);
    persist();
    return d;
  }
  function activateProject(pid) {
    const docs = docsOf(pid);
    openDoc((docs[0] || newDoc(pid)).id);
  }
  function deleteDoc(did) {
    const d = docById(did);
    if (!d) return;
    S.documents = S.documents.filter(x => x.id !== did);
    if (S.activeDocId === did) activateProject(d.projectId);
    persist();
  }
  function deleteProject(pid) {
    if (S.projects.length < 2) return;
    const wasActive = curProj().id === pid;
    S.projects = S.projects.filter(p => p.id !== pid);
    S.documents = S.documents.filter(d => d.projectId !== pid);
    if (wasActive) activateProject(S.projects[0].id);
    persist();
  }
  function structureChanged() {
    refreshMacros();
    buildPalette();
    renderHL();
    if (S.settings.mode === 'preview' || S.settings.mode === 'split') renderPreview();
    if (S.settings.mode === 'fitch') fxRender();
    renderRef();
    persist();
  }

  /* ---------- subscreens ---------- */
  function showScreen(el) {
    openMenu(false);
    for (const s of document.querySelectorAll('.screen')) s.hidden = s !== el;
    if (document.activeElement === ed) ed.blur();
    const body = el.querySelector('.scr-body');
    if (body) body.scrollTop = 0;
  }
  function closeScreens() {
    for (const s of document.querySelectorAll('.screen')) s.hidden = true;
    closeSheet();
    refreshMacros();
    updateTitle();
    buildPalette();
    renderHL();
    if (S.settings.mode === 'preview' || S.settings.mode === 'split') renderPreview();
    renderRef();
    if (S.settings.mode === 'fitch') { fxLoad(); fxFill(); fxRender(); }
  }
  const backBtn = (act, label) => `<button type="button" class="ib" data-act="${act}" aria-label="${label}">${IC.back}</button>`;

  /* Projects & documents */
  let projView = null;
  function openProjects(pid) {
    projView = pid;
    renderProjects();
    showScreen($('scrProjects'));
  }
  function renderProjects() {
    const el = $('scrProjects');
    const p = projView && projById(projView);
    if (!p) { projView = null; el.innerHTML = projectListHTML(); }
    else el.innerHTML = projectDetailHTML(p);
  }
  function projectListHTML() {
    const active = curProj().id;
    const cards = S.projects.map(p => {
      const n = docsOf(p.id).length;
      const cats = p.categoryIds.map(catById).filter(Boolean).map(c => c.name).join(', ') || 'No categories';
      const on = p.id === active;
      return `<li class="card${on ? ' active' : ''}">
        <button type="button" class="card-main" data-act="detail" data-pid="${p.id}">
          <span class="card-title"><span>${esc(p.name)}</span>${on ? '<span class="badge">Active</span>' : ''}</span>
          <span class="card-sub">${n} document${n === 1 ? '' : 's'} · ${esc(cats)}</span>
        </button>
        ${on ? '' : `<button type="button" class="btn" data-act="activate" data-pid="${p.id}">Open</button>`}
      </li>`;
    }).join('');
    return `<header class="scr-bar">${backBtn('close', 'Back to the editor')}<h2>Projects</h2>
      <button type="button" class="btn" data-act="newProject">${IC.plusSm}New project</button></header>
      <div class="scr-body"><div class="col">
        <p class="hint">A project is an ordered set of key categories. Its documents render with the macros those categories define. Tap a project to manage its documents and categories.</p>
        <ul class="cards">${cards}</ul>
      </div></div>`;
  }
  function projectDetailHTML(p) {
    const docs = docsOf(p.id);
    const docRows = docs.map(d => {
      const on = d.id === S.activeDocId;
      return `<li class="row${on ? ' current' : ''}">
        <div class="row-name">
          <input class="fld-in" type="text" id="dn-${d.id}" data-doc-name="${d.id}" value="${esc(d.name)}" aria-label="Document name">
          <div class="meta">${on ? 'Open now · ' : ''}Edited ${ago(d.updated)}</div>
        </div>
        <button type="button" class="btn" data-act="openDoc" data-did="${d.id}">Open</button>
        <button type="button" class="btn danger" data-act="delDoc" data-did="${d.id}" aria-label="Delete ${esc(d.name)}">Delete</button>
      </li>`;
    }).join('') || '<li class="row"><span class="hint">No documents yet.</span></li>';
    const inCats = p.categoryIds.map(catById).filter(Boolean);
    const catRows = inCats.map((c, i) => {
      const meta = `${c.keys.length} key${c.keys.length === 1 ? '' : 's'}${c.macros.length ? ` · ${c.macros.length} macro${c.macros.length === 1 ? '' : 's'}` : ''}`;
      return `<li class="row">
        <span class="cat-name">${esc(c.name)}</span><span class="cat-n">${meta}</span>
        <button type="button" class="ib sm" data-act="catMove" data-i="${i}" data-d="-1" aria-label="Move ${esc(c.name)} earlier"${i === 0 ? ' disabled' : ''}>${IC.up}</button>
        <button type="button" class="ib sm" data-act="catMove" data-i="${i}" data-d="1" aria-label="Move ${esc(c.name)} later"${i === inCats.length - 1 ? ' disabled' : ''}>${IC.down}</button>
        <button type="button" class="ib sm" data-act="catOut" data-i="${i}" aria-label="Remove ${esc(c.name)} from this project">${IC.close}</button>
      </li>`;
    }).join('') || '<li class="row"><span class="hint">No categories yet. Add one below.</span></li>';
    const outCats = S.categories.filter(c => !p.categoryIds.includes(c.id));
    const add = outCats.length
      ? `<div class="chips">${outCats.map(c => `<button type="button" class="chip add" data-act="catIn" data-cid="${c.id}">+ ${esc(c.name)}</button>`).join('')}</div>`
      : '';
    const only = S.projects.length < 2;
    return `<header class="scr-bar">${backBtn('list', 'All projects')}<h2 id="pTitle">${esc(p.name)}</h2></header>
      <div class="scr-body"><div class="col">
        <section><label class="lbl" for="pName">Project name</label>
          <input class="fld-in" type="text" id="pName" data-proj-name="${p.id}" value="${esc(p.name)}"></section>
        <section><h3>Documents</h3><ul class="rows">${docRows}</ul>
          <div class="btn-row"><button type="button" class="btn" data-act="newDoc">${IC.plusSm}New document</button></div></section>
        <section><h3>Categories, in palette order</h3>
          <p class="hint">Keys appear in this order. When two categories define the same macro, the later one wins.</p>
          <ul class="rows">${catRows}</ul>${add}</section>
        <section><h3>Delete</h3>
          <div class="btn-row"><button type="button" class="btn danger" data-act="delProject"${only ? ' disabled' : ''}>Delete project and its documents</button></div>
          ${only ? '<p class="hint">This is your only project, so it can’t be deleted.</p>' : ''}</section>
      </div></div>`;
  }
  $('scrProjects').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const p = projView && projById(projView);
    switch (b.dataset.act) {
      case 'close': closeScreens(); break;
      case 'list': projView = null; renderProjects(); break;
      case 'detail': projView = b.dataset.pid; renderProjects(); $('scrProjects').querySelector('.scr-body').scrollTop = 0; break;
      case 'activate': activateProject(b.dataset.pid); closeScreens(); toast('Opened ' + curProj().name); break;
      case 'newProject': {
        const np = { id: uid('p'), name: 'New project', categoryIds: curProj().categoryIds.slice() };
        S.projects.push(np);
        newDoc(np.id);
        projView = np.id;
        persist();
        renderProjects();
        const inp = $('pName');
        if (inp) { inp.focus(); inp.select(); }
        break;
      }
      case 'openDoc': openDoc(b.dataset.did); closeScreens(); break;
      case 'newDoc': { const d = newDoc(p.id); openDoc(d.id); closeScreens(); break; }
      case 'delDoc': if (!armed(b, 'Tap again')) return; deleteDoc(b.dataset.did); renderProjects(); break;
      case 'catMove': {
        const i = +b.dataset.i, j = i + (+b.dataset.d), ids = p.categoryIds;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        structureChanged(); renderProjects(); break;
      }
      case 'catOut': p.categoryIds.splice(+b.dataset.i, 1); structureChanged(); renderProjects(); break;
      case 'catIn': p.categoryIds.push(b.dataset.cid); structureChanged(); renderProjects(); break;
      case 'delProject': if (!armed(b, 'Tap again to delete')) return; deleteProject(p.id); projView = null; renderProjects(); break;
    }
  });
  $('scrProjects').addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.projName) {
      const p = projById(t.dataset.projName);
      if (!p) return;
      p.name = t.value.trim() || 'Untitled project';
      const h = $('pTitle');
      if (h) h.textContent = p.name;
      updateTitle(); persist();
    } else if (t.dataset.docName) {
      const d = docById(t.dataset.docName);
      if (!d) return;
      d.name = t.value.trim() || 'Untitled';
      updateTitle(); persist();
    }
  });

  /* Keys & macros */
  let keysCat = null;
  function openKeys() {
    if (!keysCat || !catById(keysCat)) keysCat = curProj().categoryIds[0] || (S.categories[0] && S.categories[0].id) || null;
    renderKeys();
    showScreen($('scrKeys'));
  }
  function overriddenBy(name, c) {
    const ids = curProj().categoryIds;
    const at = ids.indexOf(c.id);
    if (at < 0) return '';
    for (let j = ids.length - 1; j > at; j--) {
      const o = catById(ids[j]);
      if (o && o.macros.some(x => x.name === name)) return o.name;
    }
    return '';
  }
  function macroPrev(c, m) {
    if (!C.MACRO_NAME.test(m.name)) return '<span class="m-err">A name is a backslash followed by letters, like \\Rel.</span>';
    const n = C.argCount(m.def);
    const src = m.name + Array.from({ length: n }, () => `{${SLOT}}`).join('');
    let face;
    try { face = texRaw(src, false, Object.assign({}, macrosForCat(c), { [m.name]: m.def }), true); }
    catch (err) { return `<span class="m-err">${esc(errText(err))}</span>`; }
    const over = overriddenBy(m.name, c);
    return face + (over ? `<span class="m-over">Overridden by ${esc(over)} in ${esc(curProj().name)}</span>` : '');
  }
  function keyGridHTML(c) {
    const M = macrosForCat(c);
    return c.keys.map(k =>
      `<button type="button" class="key" data-act="editKey" data-kid="${k.id}" aria-label="Edit key ${esc(k.label || k.insert.trim())}"><span class="kl">${texFace(faceSrc(k), M)}</span></button>`).join('') +
      `<button type="button" class="key add" data-act="newKey" aria-label="Add a key">${IC.plus}</button>`;
  }
  /* adding several keys from a list */
  let bulk = { open: false, mode: 'node', text: '' };
  const BULK_HINT = {
    node: 'Each name becomes a macro, \\Red for \\mathrm{Red}, and a key that inserts it. Rename the macro later and your documents follow.',
    mathrm: 'Each name becomes a key that inserts \\mathrm{Red}.',
    raw: 'Each line becomes one key, inserted exactly as written. Use #1, #2 … for slots.',
  };
  function knownToKatex(cs) {
    try { katex.renderToString(cs, { throwOnError: true, strict: 'ignore' }); return true; }
    catch (e) { return !/Undefined control sequence/.test(String(e && e.message)); }
  }
  function planBulk(c, text, mode) {
    const plan = { keys: [], macros: [], notes: [] };
    const have = new Set(c.keys.map(k => k.insert.trim()));
    const dup = [];
    const addKey = (ins, shown) => {
      if (have.has(ins.trim())) { dup.push(shown); return; }
      have.add(ins.trim());
      plan.keys.push(ins);
    };
    if (mode === 'raw') {
      for (const line of text.split('\n').map(s => s.trim()).filter(Boolean)) addKey(line, line);
      if (dup.length) plan.notes.push(`Already in this category: ${dup.join(', ')}.`);
      return plan;
    }
    const own = new Map(c.macros.map(m => [m.name, m.def]));
    const proj = macroTable(curProj());
    const single = [], taken = [];
    for (const n of new Set(text.match(/[A-Za-z][A-Za-z0-9]*/g) || [])) {
      if (n.length === 1) { single.push(n); addKey(n, n); continue; }
      const cs = '\\' + n, node = `\\mathrm{${n}}`;
      if (mode !== 'node' || !/^[A-Za-z]+$/.test(n)) { addKey(node, n); continue; }
      if (own.has(cs)) { addKey(cs, n); continue; }
      if (Object.prototype.hasOwnProperty.call(proj, cs)) {
        if (proj[cs] === node) addKey(cs, n);
        else { taken.push(n); addKey(node, n); }
        continue;
      }
      if (knownToKatex(cs)) { taken.push(n); addKey(node, n); continue; }
      plan.macros.push({ name: cs, def: node });
      addKey(cs, n);
    }
    if (single.length) plan.notes.push(`Single letters stay italic: ${single.join(', ')}.`);
    if (taken.length) plan.notes.push(`Already a LaTeX command or another macro, so inserted as \\mathrm: ${taken.join(', ')}.`);
    if (dup.length) plan.notes.push(`Already in this category: ${dup.join(', ')}.`);
    return plan;
  }
  function bulkSummaryHTML(c) {
    if (!bulk.text.trim()) return '';
    const p = planBulk(c, bulk.text, bulk.mode);
    const k = p.keys.length, m = p.macros.length;
    const head = k
      ? `Adds ${k} key${k === 1 ? '' : 's'}${m ? ` and ${m} macro${m === 1 ? '' : 's'}` : ''}.`
      : 'Nothing new to add.';
    return `<strong>${head}</strong>${p.notes.map(n => ` <span class="skip">${esc(n)}</span>`).join('')}`;
  }
  function bulkHTML(c) {
    return `<details class="paste" id="bulk"${bulk.open ? ' open' : ''}><summary>Add several keys from a list</summary>
      <div class="bulk">
        <textarea class="fld-in mono" id="bkText" rows="3" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Names or lines to add" placeholder="${bulk.mode === 'raw' ? '\\varphi' : 'Warm > Red, Orange, Yellow'}">${esc(bulk.text)}</textarea>
        <div class="seg-inline" role="group" aria-label="What each item becomes">${[['node', 'Node macros'], ['mathrm', '\\mathrm keys'], ['raw', 'As written']].map(([v, t]) =>
          `<button type="button" data-act="bulkMode" data-v="${v}" aria-pressed="${bulk.mode === v}">${t}</button>`).join('')}</div>
        <p class="hint">${esc(BULK_HINT[bulk.mode])}</p>
        <p class="bulk-sum" id="bkSum" aria-live="polite">${bulkSummaryHTML(c)}</p>
        <div class="btn-row"><button type="button" class="btn primary" data-act="bulkAdd">Add to ${esc(c.name)}</button></div>
      </div></details>`;
  }

  /* renaming a macro everywhere it is used */
  function renameScope(c) {
    const pids = new Set(S.projects.filter(p => p.categoryIds.includes(c.id)).map(p => p.id));
    const cids = new Set([c.id]);
    for (const p of S.projects) if (pids.has(p.id)) for (const id of p.categoryIds) cids.add(id);
    return {
      docs: S.documents.filter(d => pids.has(d.projectId)),
      cats: [...cids].map(catById).filter(Boolean),
    };
  }
  function usesOf(sc, name) {
    const docs = sc.docs.filter(d => C.renameInMath(d.text, name, name).n);
    const keys = [];
    for (const x of sc.cats) for (const k of x.keys) {
      if (C.replaceCS(k.insert, name, name).n || C.replaceCS(k.label, name, name).n) keys.push(k);
    }
    return { docs, keys };
  }
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  function commitRename(input) {
    const c = catById(keysCat);
    const m = c && c.macros[+input.dataset.mi];
    if (!m) return;
    const from = input.dataset.orig || '', to = m.name;
    const row = input.closest('.mrow');
    const old = row.querySelector('.m-ren');
    if (old) old.remove();
    if (!C.MACRO_NAME.test(to)) return;
    if (from === to || !C.MACRO_NAME.test(from)) { input.dataset.orig = to; return; }
    input.dataset.orig = to;
    // A node macro displays its own name, so its definition follows the rename.
    if (m.def === `\\mathrm{${from.slice(1)}}`) {
      m.def = `\\mathrm{${to.slice(1)}}`;
      row.querySelector('.m-def').value = m.def;
    }
    MAC = macroTable(curProj());
    row.querySelector('.m-prev').innerHTML = macroPrev(c, m);
    const sc = renameScope(c);
    const u = usesOf(sc, from);
    if (!u.docs.length && !u.keys.length) { persist(); refreshKeyGrid(); return; }
    const clash = usesOf(sc, to);
    const otherDef = sc.cats.some(x => x.macros.some(y => y !== m && y.name === to));
    if (clash.docs.length || clash.keys.length || otherDef) {
      row.insertAdjacentHTML('beforeend', `<div class="m-ren">${esc(to)} is already in use, so ${esc(from)} was left as it is in ${plural(u.docs.length, 'document')} and ${plural(u.keys.length, 'key')}. Choose an unused name to rename them too.</div>`);
      persist();
      return;
    }
    for (const k of u.keys) {
      k.insert = C.replaceCS(k.insert, from, to).s;
      k.label = C.replaceCS(k.label, from, to).s;
    }
    const now = Date.now();
    for (const d of u.docs) {
      d.text = C.renameInMath(d.text, from, to).s;
      d.updated = now;
      if (d.id === S.activeDocId) {
        pushUndo('op');
        const s = ed.selectionStart, e = ed.selectionEnd;
        ed.value = d.text;
        ed.setSelectionRange(Math.min(s, d.text.length), Math.min(e, d.text.length));
        lastKind = null;
      }
    }
    faceCache.clear();
    persist();
    refreshKeyGrid();
    const parts = [];
    if (u.docs.length) parts.push(plural(u.docs.length, 'document'));
    if (u.keys.length) parts.push(plural(u.keys.length, 'key'));
    toast(`Renamed in ${parts.join(' and ')}`);
  }

  /* Notation packs: categories, keys and macros for one notation, kept as a small JSON file
     outside the app (in a project's repository, say) and imported into any project. */
  const PACK_FORMAT = 'notation-composer-pack/1';
  let pack = { text: '', open: false, pending: null, msg: '' };
  function parsePack(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { throw new Error('That isn’t valid JSON. Check that you copied all of it.'); }
    if (d && d.app === 'notation-composer') throw new Error('That is a full backup, not a pack. Restore it from Backup & restore.');
    if (!d || typeof d !== 'object' || !Array.isArray(d.categories)) throw new Error('That isn’t a notation pack: it has no list of categories.');
    const categories = d.categories.filter(c => c && typeof c.name === 'string' && c.name.trim()).map(c => {
      let macros = c.macros || [];
      if (!Array.isArray(macros) && typeof macros === 'object') macros = Object.entries(macros).map(([name, def]) => ({ name, def }));
      macros = (Array.isArray(macros) ? macros : []).filter(m => m && typeof m.name === 'string' && m.name.trim())
        .map(m => ({ name: m.name.trim(), def: String(m.def ?? '') }));
      const keys = (Array.isArray(c.keys) ? c.keys : []).map(k => (typeof k === 'string' ? { insert: k } : k))
        .filter(k => k && typeof k.insert === 'string' && k.insert)
        .map(k => ({ insert: k.insert, label: typeof k.label === 'string' ? k.label : '' }));
      return { name: c.name.trim(), rules: !!c.rules, macros, keys };
    });
    if (!categories.length) throw new Error('That pack has no named categories.');
    return {
      name: typeof d.name === 'string' && d.name.trim() ? d.name.trim() : 'Untitled pack',
      description: typeof d.description === 'string' ? d.description.trim() : '',
      updated: typeof d.updated === 'string' ? d.updated : '',
      categories,
      badMacros: categories.flatMap(c => c.macros).filter(m => !C.MACRO_NAME.test(m.name)).map(m => m.name),
    };
  }
  // A pack's category updates the category of the same name in this project, or else one of
  // that name elsewhere (which then joins this project), or else comes in as a new one.
  function planPack(pk) {
    const p = curProj();
    const here = p.categoryIds.map(catById).filter(Boolean);
    return pk.categories.map(c => ({ c, target: here.find(x => x.name === c.name) || S.categories.find(x => x.name === c.name) || null }));
  }
  function applyPack(pk) {
    const p = curProj();
    let added = 0, updated = 0;
    for (const { c, target } of planPack(pk)) {
      const macros = c.macros.map(m => ({ name: m.name, def: m.def }));
      const keys = c.keys.map(k => K(k.insert, k.label));
      if (target) {
        target.macros = macros; target.keys = keys; target.rules = c.rules;
        if (!p.categoryIds.includes(target.id)) p.categoryIds.push(target.id);
        updated++;
      } else {
        const nc = { id: uid('c'), name: c.name, rules: c.rules, macros, keys };
        S.categories.push(nc);
        p.categoryIds.push(nc.id);
        added++;
      }
    }
    refreshMacros();
    persist();
    return { added, updated };
  }
  function packFromProject(p) {
    return {
      format: PACK_FORMAT,
      name: p.name,
      description: '',
      updated: stamp(),
      categories: p.categoryIds.map(catById).filter(Boolean).map(c => Object.assign(
        { name: c.name }, c.rules ? { rules: true } : {}, {
          macros: c.macros.filter(m => C.MACRO_NAME.test(m.name)).map(m => ({ name: m.name, def: m.def })),
          keys: c.keys.map(k => (k.label ? { insert: k.insert, label: k.label } : k.insert)),
        })),
    };
  }
  const packText = p => JSON.stringify(packFromProject(p), null, 2) + '\n';
  const packFileName = p => (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'notation') + '.pack.json';
  function stagePack(text) {
    pack.pending = null; pack.msg = '';
    try { pack.pending = parsePack(text); } catch (e) { pack.msg = e.message; }
    renderKeys();
    const el = $('scrKeys').querySelector('.confirm, #pkSec .notice');
    if (el) el.scrollIntoView({ block: 'center', behavior: reduceMQ.matches ? 'auto' : 'smooth' });
  }
  function packSectionHTML() {
    const p = curProj();
    const pk = pack.pending;
    let confirm = '';
    if (pk) {
      const plan = planPack(pk);
      const add = plan.filter(x => !x.target).map(x => esc(x.c.name));
      const upd = plan.filter(x => x.target).map(x => esc(x.c.name));
      const nKeys = pk.categories.reduce((n, c) => n + c.keys.length, 0);
      const nMac = pk.categories.reduce((n, c) => n + c.macros.length, 0);
      confirm = `<div class="confirm calm" role="alert">
        <p><strong>Import “${esc(pk.name)}” into ${esc(p.name)}?</strong>${pk.updated ? ` <span class="meta">Updated ${esc(pk.updated)}</span>` : ''}</p>
        ${pk.description ? `<p>${esc(pk.description)}</p>` : ''}
        <p>It holds ${pk.categories.length === 1 ? '1 category' : pk.categories.length + ' categories'} with ${plural(nKeys, 'key')} and ${plural(nMac, 'macro')}.</p>
        ${add.length ? `<p>Adds ${add.join(', ')}.</p>` : ''}
        ${upd.length ? `<p>Updates ${upd.join(', ')}: the keys and macros there now are replaced by the pack’s.</p>` : ''}
        ${pk.badMacros.length ? `<p>These macro names won’t work, since a name is a backslash and letters only: ${pk.badMacros.map(esc).join(', ')}.</p>` : ''}
        <div class="btn-row"><button type="button" class="btn" data-act="pkCancel">Cancel</button><button type="button" class="btn primary" data-act="pkImport">Import</button></div>
      </div>`;
    }
    return `<section id="pkSec"><h3>Notation packs</h3>
      <p class="hint">A pack is a small JSON file with the categories, keys and macros of one notation. Importing adds its categories to ${esc(p.name)}; a category with the same name is updated in place, so importing a newer pack keeps you current.</p>
      <div class="btn-row"><label class="btn" for="pkFile">Choose pack file</label>
        <input id="pkFile" type="file" accept=".json,application/json,text/plain" hidden></div>
      <details class="paste" id="pkDet"${pack.open ? ' open' : ''}><summary>Paste pack text instead</summary>
        <textarea class="fld-in mono" id="pkPaste" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Pack text">${esc(pack.text)}</textarea>
        <div class="btn-row mt"><button type="button" class="btn" data-act="pkCheck">Check this text</button></div></details>
      ${pack.msg ? `<div class="notice">${esc(pack.msg)}</div>` : ''}${confirm}
      <p class="hint">Save the categories of ${esc(p.name)} as a pack, to keep with a project’s files or to share.</p>
      <div class="btn-row">${downloads || !inViewer ? '<button type="button" class="btn" data-act="pkSave">Save as pack file</button>' : ''}
        <button type="button" class="btn" data-act="pkCopy">Copy pack text</button></div></section>`;
  }

  function renderKeys() {
    const el = $('scrKeys');
    const prevBody = el.querySelector('.scr-body');
    const keepScroll = prevBody ? prevBody.scrollTop : 0;
    const bd = $('bulk');
    if (bd) bulk.open = bd.open;
    const pd = $('pkDet');
    if (pd) pack.open = pd.open;
    const c = keysCat && catById(keysCat);
    const chips = S.categories.map(x =>
      `<button type="button" class="chip" data-act="pickCat" data-cid="${x.id}" aria-pressed="${x.id === keysCat}">${esc(x.name)}</button>`).join('') +
      '<button type="button" class="chip add" data-act="newCat">+ New category</button>';
    let body = '';
    if (c) {
      const users = S.projects.filter(p => p.categoryIds.includes(c.id)).map(p => esc(p.name));
      const macros = c.macros.map((m, i) => `<li class="mrow${C.MACRO_NAME.test(m.name) ? '' : ' bad'}">
          <input class="fld-in mono m-name" type="text" value="${esc(m.name)}" data-m="name" data-mi="${i}" data-orig="${esc(m.name)}" aria-label="Macro name" spellcheck="false" autocapitalize="off" autocomplete="off">
          <input class="fld-in mono m-def" type="text" value="${esc(m.def)}" data-m="def" data-mi="${i}" aria-label="Definition" spellcheck="false" autocapitalize="off" autocomplete="off">
          <button type="button" class="ib sm" data-act="delMacro" data-mi="${i}" aria-label="Delete macro">${IC.close}</button>
          <div class="m-prev">${macroPrev(c, m)}</div>
        </li>`).join('');
      body = `<section><label class="lbl" for="cName">Category name</label>
          <input class="fld-in" type="text" id="cName" data-cat-name="${c.id}" value="${esc(c.name)}">
          <p class="hint">${users.length ? 'Used by ' + users.join(', ') + '.' : 'Not in any project yet. Add it from a project’s page.'}</p>
          <label class="chk"><input type="checkbox" id="cRules" data-cat-rules="${c.id}"${c.rules ? ' checked' : ''}><div>Rule names <span>In Fitch mode the palette opens on this category while you edit a rule.</span></div></label></section>
        <section><h3>Keys</h3><p class="hint">Tap a key to edit it.</p><div class="kgrid" id="kgrid">${keyGridHTML(c)}</div>${bulkHTML(c)}</section>
        <section><h3>Macros</h3>
          <p class="hint">Keys can insert these names. Change a definition and every document that uses it follows. Rename one and the documents and keys that use it are renamed too. Arguments are <code>#1</code>, <code>#2</code> …</p>
          ${macros ? `<ul class="mlist">${macros}</ul>` : ''}
          <div class="btn-row"><button type="button" class="btn" data-act="newMacro">${IC.plusSm}Add macro</button></div></section>
        <section><h3>Delete</h3><div class="btn-row"><button type="button" class="btn danger" data-act="delCat">Delete category and its keys</button></div></section>`;
    } else {
      body = '<section><p class="hint">No categories yet. Create one to start adding keys.</p></section>';
    }
    body += `<section><h3>Ready-made categories</h3>
      <p class="hint">Adds a copy to ${esc(curProj().name)}. Change anything in it afterwards.</p>
      <ul class="rows">${READY.map(r => {
        const sample = r.make();
        return `<li class="row"><div class="row-name"><div class="cat-name">${esc(sample.name)}</div><div class="meta flush">${esc(r.about)}</div></div>
          <button type="button" class="btn" data-act="ready" data-r="${r.id}">Add</button></li>`;
      }).join('')}</ul></section>`;
    body += packSectionHTML();
    const rows = S.settings.rows;
    body += `<section><h3>Palette rows</h3>
      <div class="seg-inline" role="group" aria-label="Palette rows">${['auto', '2', '3'].map(r =>
        `<button type="button" data-act="rows" data-r="${r}" aria-pressed="${rows === r}">${r === 'auto' ? 'Auto' : r}</button>`).join('')}</div>
      <p class="hint">Auto uses three rows on tall screens and two on short ones.</p></section>`;
    el.innerHTML = `<header class="scr-bar">${backBtn('close', 'Back to the editor')}<h2>Keys &amp; macros</h2></header>
      <div class="scr-body"><div class="col">
        <section><div class="chips" role="group" aria-label="Categories">${chips}</div></section>${body}
      </div></div>`;
    el.querySelector('.scr-body').scrollTop = keepScroll;
    requestAnimationFrame(() => fitKeys(el));
  }
  const refreshKeyGrid = debounce(() => {
    const g = $('kgrid'), c = catById(keysCat);
    if (g && c) { g.innerHTML = keyGridHTML(c); fitKeys(g); }
  }, 250);
  $('scrKeys').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const c = catById(keysCat);
    switch (b.dataset.act) {
      case 'close': closeScreens(); break;
      case 'pickCat': keysCat = b.dataset.cid; renderKeys(); break;
      case 'newCat': {
        const nc = { id: uid('c'), name: 'New category', macros: [], keys: [] };
        S.categories.push(nc);
        curProj().categoryIds.push(nc.id);
        keysCat = nc.id;
        persist();
        renderKeys();
        toast('Added to ' + curProj().name);
        const inp = $('cName');
        if (inp) { inp.focus(); inp.select(); }
        break;
      }
      case 'editKey': openKeySheet(c.id, b.dataset.kid); break;
      case 'newKey': openKeySheet(c.id, null); break;
      case 'newMacro': {
        c.macros.push({ name: '\\New', def: '' });
        persist();
        renderKeys();
        const rows = $('scrKeys').querySelectorAll('.m-name');
        const last = rows[rows.length - 1];
        if (last) { last.focus(); last.select(); }
        break;
      }
      case 'delMacro': c.macros.splice(+b.dataset.mi, 1); MAC = macroTable(curProj()); persist(); renderKeys(); break;
      case 'delCat': {
        if (!armed(b, 'Tap again to delete')) return;
        S.categories = S.categories.filter(x => x.id !== c.id);
        for (const p of S.projects) p.categoryIds = p.categoryIds.filter(id => id !== c.id);
        keysCat = S.categories[0] ? S.categories[0].id : null;
        MAC = macroTable(curProj());
        persist();
        renderKeys();
        break;
      }
      case 'rows': S.settings.rows = b.dataset.r; persist(); renderKeys(); break;
      case 'bulkMode': bulk.mode = b.dataset.v; renderKeys(); break;
      case 'bulkAdd': {
        const p = planBulk(c, bulk.text, bulk.mode);
        if (!p.keys.length) { toast('Nothing new to add'); return; }
        c.macros.push(...p.macros);
        c.keys.push(...p.keys.map(ins => K(ins)));
        bulk.text = '';
        MAC = macroTable(curProj());
        faceCache.clear();
        persist();
        renderKeys();
        toast(`Added ${plural(p.keys.length, 'key')}${p.macros.length ? ` and ${plural(p.macros.length, 'macro')}` : ''}`);
        break;
      }
      case 'pkCheck': stagePack(pack.text); break;
      case 'pkCancel': pack.pending = null; pack.msg = ''; renderKeys(); break;
      case 'pkImport': {
        if (!pack.pending) return;
        const name = pack.pending.name;
        const r = applyPack(pack.pending);
        pack = { text: '', open: false, pending: null, msg: '' };
        if ($('pkDet')) $('pkDet').open = false;
        renderKeys();
        const parts = [r.added && `added ${r.added === 1 ? '1 category' : r.added + ' categories'}`, r.updated && `updated ${r.updated}`].filter(Boolean);
        toast(`${name}: ${parts.join(', ')}`);
        break;
      }
      case 'pkSave': { const p = curProj(); saveTextFile(packFileName(p), packText(p), 'Pack saved'); break; }
      case 'pkCopy': copyText(packText(curProj()), 'Pack text copied'); break;
      case 'ready': {
        const r = READY.find(x => x.id === b.dataset.r);
        if (!r) return;
        const nc = r.make();
        const names = new Set(S.categories.map(x => x.name));
        if (names.has(nc.name)) { let n = 2; while (names.has(`${nc.name} (${n})`)) n++; nc.name = `${nc.name} (${n})`; }
        S.categories.push(nc);
        curProj().categoryIds.push(nc.id);
        keysCat = nc.id;
        MAC = macroTable(curProj());
        persist();
        renderKeys();
        $('scrKeys').querySelector('.scr-body').scrollTop = 0;
        toast(`Added ${nc.name} to ${curProj().name}`);
        break;
      }
    }
  });
  $('scrKeys').addEventListener('change', e => {
    if (e.target.id === 'pkFile') {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => stagePack(String(r.result));
      r.onerror = () => { pack.msg = 'That file couldn’t be read.'; renderKeys(); };
      r.readAsText(f);
      return;
    }
    if (e.target.dataset.m === 'name') commitRename(e.target);
    else if (e.target.dataset.catRules) {
      const c = catById(e.target.dataset.catRules);
      if (c) { c.rules = e.target.checked; persist(); }
    }
  });
  $('scrKeys').addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'pkPaste') { pack.text = t.value; return; }
    const c = catById(keysCat);
    if (!c) return;
    if (t.id === 'bkText') {
      bulk.text = t.value;
      $('bkSum').innerHTML = bulkSummaryHTML(c);
      return;
    }
    if (t.dataset.catName) {
      c.name = t.value.trim() || 'Untitled category';
      const chip = $('scrKeys').querySelector(`.chip[data-cid="${c.id}"]`);
      if (chip) chip.textContent = c.name;
      persist();
    } else if (t.dataset.m) {
      const m = c.macros[+t.dataset.mi];
      if (!m) return;
      if (t.dataset.m === 'name') m.name = t.value.trim(); else m.def = t.value;
      const row = t.closest('.mrow');
      row.classList.toggle('bad', !C.MACRO_NAME.test(m.name));
      MAC = macroTable(curProj());
      row.querySelector('.m-prev').innerHTML = macroPrev(c, m);
      refreshKeyGrid();
      persist();
    }
  });

  /* key editor sheet */
  let sheetKey = null;
  function openKeySheet(cid, kid) {
    const c = catById(cid);
    const k = kid ? c.keys.find(x => x.id === kid) : null;
    sheetKey = { cid, kid: k ? k.id : null };
    const host = $('sheetHost');
    host.innerHTML = `<div class="sheet-wrap" data-scrim="1"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ksTitle">
      <div class="sheet-head"><h3 id="ksTitle">${k ? 'Edit key' : 'New key'}</h3><div class="kcap big" aria-hidden="true"><span class="kl" id="ksFace"></span></div></div>
      <div><label class="lbl" for="ksIns">Insert</label>
        <textarea class="fld-in mono" id="ksIns" rows="2" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="\\forall #2\\,(#1)">${esc(k ? k.insert : '')}</textarea></div>
      <p class="hint"><code>#1</code>, <code>#2</code> … are slots, visited left to right. Selected text goes into <code>#1</code>. A leading or trailing space pads the symbol.</p>
      <div><label class="lbl" for="ksLab">Label <span>(optional LaTeX; blank shows the insert)</span></label>
        <input class="fld-in mono" id="ksLab" type="text" value="${esc(k ? k.label : '')}" spellcheck="false" autocapitalize="off" autocomplete="off"></div>
      <div><label class="lbl" for="ksCat">Category</label>
        <select class="fld-in" id="ksCat">${S.categories.map(x => `<option value="${x.id}"${x.id === cid ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      ${k ? `<div class="btn-row"><span class="hint" id="ksPos">Position ${c.keys.indexOf(k) + 1} of ${c.keys.length}</span><span class="grow"></span>
        <button type="button" class="btn" data-act="ksMove" data-d="-1">Earlier</button><button type="button" class="btn" data-act="ksMove" data-d="1">Later</button></div>` : ''}
      <div class="btn-row">${k ? '<button type="button" class="btn danger" data-act="ksDel">Delete</button>' : ''}<span class="grow"></span>
        <button type="button" class="btn" data-act="sheetClose">Cancel</button><button type="button" class="btn primary" data-act="ksSave">Save</button></div>
    </div></div>`;
    host.hidden = false;
    updateSheetFace();
    if (!k) $('ksIns').focus();
  }
  function updateSheetFace() {
    const face = $('ksFace');
    if (!face) return;
    const c = catById($('ksCat').value) || catById(sheetKey.cid);
    face.innerHTML = texFace(faceSrc({ insert: $('ksIns').value, label: $('ksLab').value }), macrosForCat(c));
    fitKeys(face.parentElement.parentElement);
  }
  $('sheetHost').addEventListener('input', e => { if (sheetKey && /^ks/.test(e.target.id)) updateSheetFace(); });
  $('sheetHost').addEventListener('change', e => { if (sheetKey && e.target.id === 'ksCat') updateSheetFace(); });
  $('sheetHost').addEventListener('click', e => {
    if (e.target.dataset && e.target.dataset.scrim) { closeSheet(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'sheetClose') { closeSheet(); return; }
    if (a === 'refUse') {
      const ta = $('refText'), t = ta.value;
      closeSheet();
      if (!t.trim() && ta.dataset.paste) return; // nothing pasted: keep what was there
      setRef(t, t.trim() ? 'Reply set' : 'Reference cleared');
      return;
    }
    if (a === 'refClear') { if (!armed(b, 'Tap again')) return; closeSheet(); setRef('', 'Reference cleared'); return; }
    if (!sheetKey) return;
    const c = catById(sheetKey.cid);
    const idx = sheetKey.kid ? c.keys.findIndex(x => x.id === sheetKey.kid) : -1;
    if (a === 'ksMove' && idx >= 0) {
      const j = idx + (+b.dataset.d);
      if (j < 0 || j >= c.keys.length) return;
      [c.keys[idx], c.keys[j]] = [c.keys[j], c.keys[idx]];
      $('ksPos').textContent = `Position ${j + 1} of ${c.keys.length}`;
      persist();
      refreshKeyGrid();
    } else if (a === 'ksDel' && idx >= 0) {
      if (!armed(b, 'Tap again')) return;
      c.keys.splice(idx, 1);
      persist(); closeSheet(); renderKeys();
    } else if (a === 'ksSave') {
      const insert = $('ksIns').value;
      if (!insert.trim()) { toast('Write what the key inserts first'); $('ksIns').focus(); return; }
      const label = $('ksLab').value.trim();
      const target = catById($('ksCat').value) || c;
      if (idx >= 0) {
        const k = c.keys[idx];
        k.insert = insert; k.label = label;
        if (target !== c) { c.keys.splice(idx, 1); target.keys.push(k); }
      } else {
        target.keys.push({ id: uid('k'), insert, label });
      }
      faceCache.clear();
      persist(); closeSheet(); renderKeys();
      toast(idx >= 0 ? 'Key saved' : 'Key added');
    }
  });

  /* Backup & restore */
  const inViewer = !!(window.claude && typeof window.claude.use === 'function');
  let downloads = null;
  if (inViewer) {
    try {
      window.claude.use('downloads').then(d => {
        downloads = d || null;
        if (!$('scrBackup').hidden) renderBackup();
      }, () => {});
    } catch (e) { /* no downloads here */ }
  }
  let pendingRestore = null;
  function openBackup() { pendingRestore = null; renderBackup(); showScreen($('scrBackup')); }
  function renderBackup(msg) {
    const canFile = !!downloads || !inViewer;
    const pr = pendingRestore;
    const confirm = pr ? `<div class="confirm" role="alert">
        <p><strong>Replace everything here with this backup?</strong></p>
        <p>It holds ${pr.projects.length} project${pr.projects.length === 1 ? '' : 's'}, ${pr.categories.length} categor${pr.categories.length === 1 ? 'y' : 'ies'} and ${pr.documents.length} document${pr.documents.length === 1 ? '' : 's'}. What you have now will be gone.</p>
        <div class="btn-row"><button type="button" class="btn" data-act="cancelRestore">Cancel</button><button type="button" class="btn armed" data-act="doRestore">Replace</button></div>
      </div>` : '';
    $('scrBackup').innerHTML = `<header class="scr-bar">${backBtn('close', 'Back to the editor')}<h2>Backup &amp; restore</h2></header>
      <div class="scr-body"><div class="col">
        ${storageOK ? '' : '<div class="notice">This browser isn’t keeping your work between visits. Save a backup now.</div>'}
        <section><h3>Back up</h3>
          <p class="hint">Your work is stored in this browser only. A backup holds every project, category, key, macro and document, and moves them between devices.</p>
          <p class="hint">Last backup: <strong>${S.lastExport ? ago(S.lastExport) : 'never'}</strong></p>
          <div class="btn-row">${canFile ? '<button type="button" class="btn primary" data-act="saveFile">Save backup file</button>' : ''}
            <button type="button" class="btn${canFile ? '' : ' primary'}" data-act="copyJSON">Copy backup text</button></div></section>
        <section><h3>Restore</h3>
          <p class="hint">Restoring replaces everything here with the backup’s contents.</p>
          <div class="btn-row"><label class="btn" for="bFile">Choose backup file</label>
            <input id="bFile" type="file" accept=".json,application/json,text/plain" hidden></div>
          <details class="paste"><summary>Paste backup text instead</summary>
            <textarea class="fld-in mono" id="bPaste" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Backup text"></textarea>
            <div class="btn-row mt"><button type="button" class="btn" data-act="checkPaste">Check this text</button></div></details>
          ${msg ? `<div class="notice">${esc(msg)}</div>` : ''}${confirm}
        </section>
      </div></div>`;
  }
  function backupText() { return JSON.stringify(Object.assign({}, S, { exported: new Date().toISOString() }), null, 2); }
  function markBackedUp() { S.lastExport = Date.now(); persistNow(); }
  function stamp() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  async function saveTextFile(name, text, okMsg, onSaved) {
    if (downloads) {
      try {
        await downloads.save({ filename: name, data: text });
        if (onSaved) onSaved();
        toast(okMsg);
      } catch (err) {
        const code = err && err.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') { toast('A save prompt is already open'); return; }
        toast('Saving isn’t available here. Copy the text instead.');
      }
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (onSaved) onSaved();
    toast(okMsg);
  }
  function saveFile() {
    saveTextFile(`notation-composer-backup-${stamp()}.json`, backupText(), 'Backup saved', () => { markBackedUp(); renderBackup(); });
  }
  function stageRestore(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { renderBackup('That isn’t valid backup text. Check that you copied all of it.'); return; }
    if (!data || data.app !== 'notation-composer') { renderBackup('That isn’t a Notation Composer backup.'); return; }
    try { pendingRestore = normalize(data); } catch (e) { renderBackup('That backup is damaged and can’t be read.'); return; }
    renderBackup();
  }
  $('scrBackup').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    switch (b.dataset.act) {
      case 'close': closeScreens(); break;
      case 'saveFile': saveFile(); break;
      case 'copyJSON': copyText(backupText(), 'Backup text copied'); markBackedUp(); renderBackup(); break;
      case 'checkPaste': stageRestore($('bPaste').value); break;
      case 'cancelRestore': pendingRestore = null; renderBackup(); break;
      case 'doRestore':
        if (!pendingRestore) return;
        S = pendingRestore; pendingRestore = null;
        persistNow();
        setMode(S.settings.mode);
        openDoc(S.activeDocId);
        closeScreens();
        toast('Backup restored');
        break;
    }
  });
  $('scrBackup').addEventListener('change', e => {
    if (e.target.id !== 'bFile') return;
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => stageRestore(String(r.result));
    r.onerror = () => renderBackup('That file couldn’t be read.');
    r.readAsText(f);
  });

  /* ---------- Fitch mode ---------- */
  // The document text stays the only record: Fitch mode reads the proof block at the cursor into
  // items, edits them, and writes the block back after every change.
  const fxView = $('fxView'), fxEdit = $('fxEdit'), fxF = $('fxF'), fxR = $('fxR'), fxC = $('fxC');
  const FX_INPUT = { f: fxF, rule: fxR, cites: fxC };
  const FX = { k: -1, sel: 0, field: 'f', cite: false, items: [], an: null, seq: 0, palBack: null };
  const fxLines = () => FX.items.filter(it => it.t === 'L');
  const fxSegs = () => C.segment(ed.value).filter(g => g.k === 'p');
  const fxSeg = () => (FX.k >= 0 ? fxSegs()[FX.k] || null : null);
  const fxNewLine = (d, s) => ({ t: 'L', id: ++FX.seq, d, f: '', rule: '', cites: '', s: !!s });
  function fxIdx(li) {
    let n = -1;
    for (let i = 0; i < FX.items.length; i++) if (FX.items[i].t === 'L' && ++n === li) return i;
    return -1;
  }
  // Where a new line goes below line li: after its Fitch bar if the bar closes it.
  function fxAfter(li) {
    const i = fxIdx(li), nx = FX.items[i + 1];
    return nx && nx.t === 'B' && nx.d === FX.items[i].d ? i + 2 : i + 1;
  }

  function fxLoad() {
    const g = fxSeg();
    if (!g) { FX.k = -1; FX.items = []; FX.an = null; return; }
    FX.items = C.parseProof(ed.value.slice(g.cs, g.ce));
    for (const it of FX.items) if (it.t === 'L') it.id = ++FX.seq;
    if (!fxLines().length) FX.items.push(fxNewLine(0));
    FX.an = C.analyzeProof(FX.items);
    FX.sel = Math.max(0, Math.min(FX.sel, FX.an.lines.length - 1));
  }
  function fxSave() {
    const g = fxSeg();
    if (!g) return;
    const v = ed.value;
    const body = C.serializeProof(FX.items) + (g.ce === g.e ? '```' : '');
    ed.value = v.slice(0, g.cs) + body + v.slice(g.ce);
    textChanged();
    FX.an = C.analyzeProof(FX.items);
  }
  function fxFill() {
    const L = fxLines()[FX.sel];
    fxF.value = L ? L.f : '';
    fxR.value = L ? L.rule : '';
    fxC.value = L ? L.cites : '';
  }

  // Open the proof at the document's cursor, on the line the cursor is in.
  function fxEnter() {
    const segs = fxSegs();
    const pos = ed.selectionStart;
    FX.k = segs.findIndex(g => pos >= g.s && pos <= g.e);
    FX.sel = 0;
    if (FX.k >= 0) {
      const g = segs[FX.k];
      let li = -1;
      for (const it of C.parseProof(ed.value.slice(g.cs, g.ce))) {
        if (it.t !== 'L') continue;
        if (g.cs + it.off <= pos) li++; else break;
      }
      FX.sel = Math.max(0, li);
    }
    FX.cite = false;
    FX.palBack = null;
    fxLoad(); fxFill(); fxRender();
    if (FX.k >= 0) fxFocus('f');
    else if (fxEdit.contains(document.activeElement)) document.activeElement.blur();
  }
  // Leave Fitch mode with the document's cursor on the selected line.
  function fxLeave() {
    FX.cite = false;
    const g = fxSeg();
    if (g) {
      const lines = C.parseProof(ed.value.slice(g.cs, g.ce)).filter(x => x.t === 'L');
      const L = lines[FX.sel];
      const p = L ? g.cs + L.fOff : g.cs;
      ed.setSelectionRange(p, p);
      saveCaretSoon();
    }
    if (fxEdit.contains(document.activeElement)) document.activeElement.blur();
  }
  function fxOpen(k, li) {
    const g = fxSegs()[k];
    if (!g) return;
    const lines = C.parseProof(ed.value.slice(g.cs, g.ce)).filter(x => x.t === 'L');
    const L = lines[Math.max(0, Math.min(li, lines.length - 1))];
    const p = L ? g.cs + L.off : g.cs;
    ed.setSelectionRange(p, p);
    if (S.settings.mode === 'fitch') fxEnter(); else setMode('fitch');
  }

  function fxRender() {
    if (S.settings.mode !== 'fitch') return;
    if (FX.k < 0) {
      fxView.classList.remove('citing');
      fxView.innerHTML = fxEmptyHTML();
      fxEdit.hidden = true;
      app.classList.add('fx-none');
      fxSyncTools();
      return;
    }
    fxEdit.hidden = false;
    app.classList.remove('fx-none');
    const an = FX.an || (FX.an = C.analyzeProof(FX.items));
    const L = an.lines[FX.sel];
    const cited = new Set();
    if (L) for (const t of L.citeToks) for (let x = t.a; x <= (t.b === null ? t.a : t.b); x++) cited.add(x - 1);
    const issues = an.issues.filter(x => x.kind !== 'empty');
    fxView.classList.toggle('citing', FX.cite);
    fxView.innerHTML = proofHTML(FX.items, an, { pk: FX.k, sel: FX.sel, cite: FX.cite, cited }) +
      (issues.length ? `<ul class="fx-issues">${issues.map(x => `<li data-issue="${x.line}">${esc(x.msg)}</li>`).join('')}</ul>` : '');
    fxHead();
    fxSyncTools();
    fxC.classList.toggle('citing-field', FX.cite);
    const row = fxView.querySelector('.fp-row.sel');
    if (row) {
      const vr = fxView.getBoundingClientRect(), rr = row.getBoundingClientRect();
      if (rr.top < vr.top + 4) fxView.scrollTop += rr.top - vr.top - 8;
      else if (rr.bottom > vr.bottom - 4) fxView.scrollTop += rr.bottom - vr.bottom + 8;
    }
  }
  const fxRenderSoon = debounce(fxRender, 80);
  function fxHead() {
    const an = FX.an, L = an && an.lines[FX.sel];
    const where = $('fxWhere'), msg = $('fxMsg');
    if (!L) { where.textContent = ''; msg.textContent = ''; return; }
    const parts = [`Line ${FX.sel + 1}`];
    if (L.d > 0) { const s = an.subs[L.sub]; parts.push(`subproof ${s.from + 1}–${s.to + 1}`); }
    if (L.a) parts.push(L.d === 0 ? 'premise' : 'assumption');
    where.textContent = parts.join(' · ');
    if (FX.cite) { msg.textContent = 'Tap lines above to cite them'; msg.className = 'fx-msg info'; return; }
    const iss = an.issues.find(x => x.line === FX.sel && x.kind !== 'empty');
    msg.textContent = iss ? iss.msg.replace(/^Line \d+ /, '') : '';
    msg.title = msg.textContent;
    msg.className = 'fx-msg';
  }
  function fxSyncTools() {
    const b = toolsEl.querySelector('[data-tool="fxCite"]');
    if (b) b.setAttribute('aria-pressed', String(FX.cite));
  }
  function fxEmptyHTML() {
    const segs = fxSegs();
    const list = segs.map((g, i) => {
      const lines = C.parseProof(ed.value.slice(g.cs, g.ce)).filter(x => x.t === 'L');
      const last = lines.length ? lines[lines.length - 1].f : '';
      return `<li><button type="button" class="fx-pick" data-fx="open" data-k="${i}"><span class="fx-pick-n">Proof ${i + 1} · ${plural(lines.length, 'line')}</span>${last ? `<span class="fx-pick-f">${texDoc(last, false)}</span>` : ''}</button></li>`;
    }).join('');
    return `<div class="fx-empty">
      <h2>No proof at the cursor</h2>
      <p>Start a proof where the cursor was in the document, or open one of its proofs.</p>
      <div class="btn-row"><button type="button" class="btn primary" data-fx="new">New proof here</button><button type="button" class="btn" data-fx="example">Insert an example</button></div>
      ${list ? `<h3>Proofs in this document</h3><ul class="fx-list">${list}</ul>` : ''}
    </div>`;
  }

  function fxFocus(field) {
    const el = FX_INPUT[field] || fxF;
    if (document.activeElement !== el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    else fxOnFocus(field);
    const n = el.value.length;
    el.setSelectionRange(n, n);
  }
  function fxOnFocus(field) {
    const was = FX.field;
    FX.field = field;
    const citing = field === 'cites';
    if (FX.cite !== citing) { FX.cite = citing; fxRender(); }
    // The palette follows the field: rule names while a rule is edited, formula keys otherwise.
    if (field === 'rule' && was !== 'rule') fxPalette(true);
    else if (field !== 'rule' && was === 'rule') fxPalette(false);
  }
  function fxPalette(rules) {
    if (!pages.length) return;
    if (rules) {
      if (pages[pageIdx] && pages[pageIdx].cat.rules) return;
      const r = pages.findIndex(pg => pg.cat.rules);
      if (r < 0) return;
      FX.palBack = pageIdx;
      goPage(r);
    } else if (FX.palBack !== null) {
      if (pages[pageIdx] && pages[pageIdx].cat.rules && pages[FX.palBack]) goPage(FX.palBack);
      FX.palBack = null;
    }
  }
  function fxSelect(li, field) {
    FX.sel = li;
    lastKind = null;
    fxFill();
    if (field !== 'cites') FX.cite = false;
    fxRender();
    fxFocus(field || 'f');
  }

  function fxFieldInput(el) {
    const L = fxLines()[FX.sel];
    if (!L) return;
    const key = el === fxF ? 'f' : el === fxR ? 'rule' : 'cites';
    // One line per proof line, and & separates the columns, so neither may appear raw.
    const v = el.value;
    const clean = v.replace(/[\r\n]+/g, ' ').replace(/(^|[^\\])&/g, '$1\\&');
    if (clean !== v) {
      const p = Math.max(0, el.selectionStart + clean.length - v.length);
      el.value = clean;
      el.setSelectionRange(p, p);
    }
    L[key] = el.value;
    fxSave();
    fxRenderSoon();
  }
  function fxInsertTemplate(tpl) {
    if (FX.k < 0) { toast('Start or open a proof first'); return; }
    if (FX.field === 'cites') { toast('Tap lines in the proof to cite them'); return; }
    const el = FX_INPUT[FX.field];
    const v = el.value, s = el.selectionStart, e = el.selectionEnd;
    const r = C.fillTemplate(tpl.replace(/\$/g, '').replace(/\s*\n\s*/g, ' '), v.slice(s, e), v.slice(Math.max(0, s - 64), s), v.slice(e, e + 2));
    replaceIn(el, s, e, r.text, s + r.a, s + r.b, 'op');
  }
  function fxJumpSlot() {
    const el = FX_INPUT[FX.field] || fxF;
    let i = el.value.indexOf(SLOT, el.selectionEnd);
    if (i >= 0) { focusEl(el); el.setSelectionRange(i, i + 1); return; }
    const lines = fxLines(), n = lines.length;
    for (let step = 1; step <= n; step++) {
      const li = (FX.sel + step) % n;
      for (const f of ['f', 'rule']) {
        const j = lines[li][f].indexOf(SLOT);
        if (j >= 0) { fxSelect(li, f); FX_INPUT[f].setSelectionRange(j, j + 1); return; }
      }
    }
    i = el.value.indexOf(SLOT);
    if (i >= 0) { focusEl(el); el.setSelectionRange(i, i + 1); return; }
    toast('No slots left to fill');
  }

  // Every structural change goes through here, so citations follow the lines they point at.
  function fxMutate(fn) {
    pushUndo('op');
    lastKind = null;
    const oldIds = fxLines().map(L => L.id);
    const oldAn = C.analyzeProof(FX.items);
    fn(FX.items);
    for (let i = FX.items.length - 1; i >= 0; i--) {
      const it = FX.items[i], pv = FX.items[i - 1];
      if (it.t === 'B' && (!pv || pv.t !== 'L' || pv.d !== it.d)) FX.items.splice(i, 1);
    }
    if (!fxLines().length) FX.items.push(fxNewLine(0));
    const rw = C.citeRewriter(oldIds, oldAn, fxLines().map(L => L.id), C.analyzeProof(FX.items));
    for (const L of fxLines()) L.cites = rw(L.cites);
    FX.sel = Math.max(0, Math.min(FX.sel, fxLines().length - 1));
    FX.cite = false;
    fxSave();
    fxFill();
    fxRender();
    fxFocus('f');
  }
  function fxToggleBar(items, sel) {
    const i = fxIdx(sel), L = items[i];
    const an = C.analyzeProof(items);
    if (an.lines[sel].a) {
      // Take away the bar that closes this run of assumptions; lines above it in the run keep one.
      let j = i + 1;
      while (j < items.length && items[j].t === 'L' && items[j].d === L.d && !items[j].s) j++;
      if (items[j] && items[j].t === 'B' && items[j].d === L.d) items.splice(j, 1);
      const pv = items[i - 1];
      if (!L.s && pv && pv.t === 'L' && pv.d === L.d) items.splice(i, 0, { t: 'B', d: L.d });
    } else {
      // Join the assumptions directly above, then put the bar under this line.
      let j = i - 1;
      if (!L.s) {
        while (j >= 0) {
          const it = items[j];
          if (it.t === 'B' && it.d === L.d) { items.splice(j, 1); j--; continue; }
          if (it.t === 'L' && it.d === L.d) { j--; if (it.s) break; continue; }
          break;
        }
      }
      const k = items.indexOf(L), nx = items[k + 1];
      if (!(nx && nx.t === 'B' && nx.d === L.d)) items.splice(k + 1, 0, { t: 'B', d: L.d });
    }
  }
  function fxAction(a) {
    if (FX.k < 0) { toast('Start or open a proof first'); return; }
    const sel = FX.sel, L = fxLines()[sel];
    if (!L) return;
    switch (a) {
      case 'fxLine':
        fxMutate(items => { items.splice(fxAfter(sel), 0, fxNewLine(L.d)); FX.sel = sel + 1; });
        break;
      case 'fxSub':
        if (!L.f && !L.rule && !L.cites && sel > 0) {
          // An empty line, such as one just made by End, becomes the first assumption of a
          // subproof beside the one above it.
          fxMutate(items => {
            const i = fxIdx(sel), nx = items[i + 1];
            if (nx && nx.t === 'B' && nx.d === L.d) items.splice(i + 1, 1);
            L.d = Math.min(12, L.d + 1);
            L.s = true;
            items.splice(i + 1, 0, { t: 'B', d: L.d });
          });
        } else {
          fxMutate(items => {
            const nl = fxNewLine(Math.min(12, L.d + 1), true);
            items.splice(fxAfter(sel), 0, nl, { t: 'B', d: nl.d });
            FX.sel = sel + 1;
          });
        }
        break;
      case 'fxEnd':
        if (L.d === 0) { toast('This line is already in the main proof'); return; }
        fxMutate(items => { items.splice(fxAfter(sel), 0, fxNewLine(L.d - 1)); FX.sel = sel + 1; });
        break;
      case 'fxBar':
        fxMutate(items => fxToggleBar(items, sel));
        break;
      case 'fxOut':
      case 'fxIn': {
        const nd = a === 'fxIn' ? Math.min(12, L.d + 1) : Math.max(0, L.d - 1);
        if (nd === L.d) { toast('This line is already in the main proof'); return; }
        fxMutate(items => {
          const i = fxIdx(sel), nx = items[i + 1];
          if (nx && nx.t === 'B' && nx.d === L.d) nx.d = nd;
          L.d = nd;
        });
        break;
      }
      case 'fxDel':
        fxMutate(items => {
          items.splice(fxIdx(sel), 1);
          FX.sel = Math.max(0, Math.min(sel, items.filter(x => x.t === 'L').length - 1));
        });
        break;
      case 'fxCite':
        if (FX.cite) fxFocus('f'); else fxFocus('cites');
        break;
    }
  }
  // Tap-to-cite: the line itself if the selected line may use it, otherwise the whole finished
  // subproof around it. A second tap removes the citation.
  function fxToggleCite(li) {
    const r = C.citeFor(FX.an, FX.sel, li);
    if (r.err) { toast(r.err); return; }
    const L = fxLines()[FX.sel];
    const norm = t => t.replace(/\s*[-–]\s*/g, '–').trim();
    const toks = (L.cites || '').split(',').map(norm).filter(Boolean);
    const at = toks.indexOf(r.tok);
    pushUndo('op');
    lastKind = null;
    if (at >= 0) toks.splice(at, 1); else toks.push(r.tok);
    L.cites = toks.join(', ');
    fxC.value = L.cites;
    fxSave();
    fxRender();
    fxFocus('cites');
  }
  function fxInsertProof(items) {
    const v = ed.value;
    let pos = Math.min(ed.selectionStart, v.length);
    for (const g of C.segment(v)) if (g.k !== 't' && pos > g.s && pos < g.e) pos = g.e;
    const eol = v.indexOf('\n', pos);
    pos = eol < 0 ? v.length : eol;
    const before = v.slice(0, pos), after = v.slice(pos);
    const pre = !before.trim() ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const post = !after.trim() ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    pushUndo('op');
    lastKind = null;
    const start = before.length + pre.length;
    ed.value = before + pre + fence(items) + post + after;
    ed.setSelectionRange(start, start);
    textChanged();
    FX.k = fxSegs().findIndex(g => g.s === start);
    FX.sel = 0;
    fxLoad(); fxFill(); fxRender();
    if (FX.k >= 0) fxFocus('f');
  }

  fxView.addEventListener('pointerdown', e => {
    // Keep the field's focus (and the cursor in it) while lines are tapped.
    if (e.target.closest('tr[data-li]') && fxEdit.contains(document.activeElement)) e.preventDefault();
  });
  fxView.addEventListener('click', e => {
    const b = e.target.closest('[data-fx]');
    if (b) {
      const a = b.dataset.fx;
      if (a === 'new') fxInsertProof([PL(0, ''), PB(0), PL(0, '')]);
      else if (a === 'example') {
        fxInsertProof(folProofItems());
      } else if (a === 'open') {
        FX.k = +b.dataset.k; FX.sel = 0; FX.cite = false;
        fxLoad(); fxFill(); fxRender(); fxFocus('f');
      }
      return;
    }
    const iss = e.target.closest('[data-issue]');
    if (iss) { fxSelect(+iss.dataset.issue, 'f'); return; }
    const row = e.target.closest('tr[data-li]');
    if (!row) return;
    const li = +row.dataset.li;
    if (FX.cite) fxToggleCite(li);
    else if (li !== FX.sel) fxSelect(li, 'f');
    else fxFocus(FX.field === 'cites' ? 'f' : FX.field);
  });
  for (const [field, el] of Object.entries(FX_INPUT)) {
    el.addEventListener('focus', () => fxOnFocus(field));
    el.addEventListener('beforeinput', e => {
      if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); return; }
      if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); return; }
      if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') { e.preventDefault(); return; }
      pushUndo(e.inputType && e.inputType.startsWith('delete') ? 'del' : 'type');
    });
    el.addEventListener('input', () => fxFieldInput(el));
    el.addEventListener('keydown', e => {
      const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
      if (mod && !e.altKey && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && !e.altKey && k === 'y') { e.preventDefault(); redo(); return; }
      if (e.key === 'Enter') { e.preventDefault(); fxAction(e.shiftKey ? 'fxSub' : 'fxLine'); return; }
      if (e.key === 'Escape' && FX.cite) { e.preventDefault(); e.stopPropagation(); fxFocus('f'); return; }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !mod && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const to = Math.max(0, Math.min(fxLines().length - 1, FX.sel + (e.key === 'ArrowUp' ? -1 : 1)));
        if (to !== FX.sel) fxSelect(to, field === 'cites' ? 'f' : field);
        return;
      }
      if (e.key === 'Tab' && !mod && !e.altKey && !e.shiftKey && el.value.includes(SLOT) && el.value.indexOf(SLOT, el.selectionEnd) >= 0) {
        e.preventDefault();
        fxJumpSlot();
      }
    });
  }

  /* ---------- viewport, resize, keys ---------- */
  const vv = window.visualViewport;
  function fitViewport() {
    if (!vv) return;
    const kb = vv.scale < 1.05 && window.innerHeight - vv.height > 120;
    app.classList.toggle('kb', kb);
    if (kb) { app.style.height = vv.height + 'px'; app.style.top = vv.offsetTop + 'px'; app.style.bottom = 'auto'; }
    else { app.style.height = ''; app.style.top = ''; app.style.bottom = ''; }
  }
  if (vv) { vv.addEventListener('resize', fitViewport); vv.addEventListener('scroll', fitViewport); }
  const relayout = debounce(layoutPalette, 60);
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(relayout); ro.observe(app); ro.observe(pagesEl); }
  else window.addEventListener('resize', relayout);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('sheetHost').hidden) { closeSheet(); return; }
    if (!menu.hidden) { openMenu(false); $('menuBtn').focus(); return; }
    if ([...document.querySelectorAll('.screen')].some(s => !s.hidden)) closeScreens();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistNow(); });
  window.addEventListener('pagehide', persistNow);

  /* ---------- start ---------- */
  function boot() {
    const stored = readStore();
    try { S = normalize(stored || defaults()); } catch (e) { S = normalize(defaults()); }
    try { localStorage.setItem(STORE_KEY + ':probe', '1'); localStorage.removeItem(STORE_KEY + ':probe'); }
    catch (e) { storageOK = false; }
    $('storeWarn').hidden = storageOK;
    $('menuBtn').innerHTML = IC.menu;
    buildTools();
    setInput('palette', false);
    const m = S.settings.mode === 'split' && !wideMQ.matches ? 'edit' : S.settings.mode;
    app.dataset.mode = m;
    openDoc(S.activeDocId);
    setMode(m);
    persistNow();
    // KaTeX's fonts arrive after the first layout; refit key faces once they do.
    if (document.fonts) {
      const refit = () => { fitKeys(pagesEl); for (const s of document.querySelectorAll('.screen:not([hidden]), #sheetHost:not([hidden])')) fitKeys(s); };
      document.fonts.ready.then(refit);
      document.fonts.addEventListener('loadingdone', refit);
    }
  }
  boot();
})();

