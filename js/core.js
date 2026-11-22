
/* Notation Composer — core text logic (no DOM). */
const Core = (() => {
  'use strict';

  const SLOT = '◌'; // ◌ dotted circle: an unfilled template slot
  const MACRO_NAME = /^\\[A-Za-z]+$/;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  /* ---------- splitting prose from math ---------- */

  // Find the closing delimiter starting at p. Backslash pairs are skipped so \$ never closes.
  // Inline math may not cross a blank line.
  function scanTo(src, p, close, inline) {
    const n = src.length;
    while (p < n) {
      const ch = src[p];
      if (ch === '\\') {
        if (close[0] === '\\' && src.startsWith(close, p)) return p;
        p += 2;
        continue;
      }
      if (ch === '$' && close[0] === '$') {
        if (close === '$$') {
          if (src[p + 1] === '$') return p;
          p++;
          continue;
        }
        return p;
      }
      if (inline && ch === '\n') {
        let q = p + 1;
        while (q < n && (src[q] === ' ' || src[q] === '\t')) q++;
        if (src[q] === '\n') return -1;
      }
      p++;
    }
    return -1;
  }

  // Proof blocks: a line ```fitch opens one and a line ``` closes it (or the document ends).
  // {k:'p', s, e, cs, ce}: s..e the whole block with its fences, cs..ce the lines between them.
  function fences(src) {
    const out = [];
    const open = /^```[ \t]*fitch\b[^\n]*$/gm;
    let m;
    while ((m = open.exec(src))) {
      const s = m.index;
      let cs = s + m[0].length;
      if (src[cs] === '\n') cs++;
      const close = /^```[ \t]*$/gm;
      close.lastIndex = cs;
      const c = close.exec(src);
      const ce = c ? c.index : src.length;
      const e = c ? c.index + c[0].length : src.length;
      out.push({ k: 'p', s, e, cs, ce });
      open.lastIndex = Math.max(e, s + 1);
    }
    return out;
  }

  // Segments: {k:'t', s, e} for prose; {k:'m', d, s, e, cs, ce} for math
  // (s..e whole segment with delimiters, cs..ce the math body, d = display);
  // {k:'p', …} for a proof block. Math never crosses a proof block.
  function segment(src) {
    const out = [];
    let prev = 0;
    const plain = (a, b) => {
      if (b <= a) return;
      for (const g of segmentInline(src.slice(a, b))) {
        const h = Object.assign({}, g);
        for (const key of ['s', 'e', 'cs', 'ce']) if (h[key] !== undefined) h[key] += a;
        out.push(h);
      }
    };
    for (const f of fences(src)) {
      plain(prev, f.s);
      out.push(f);
      prev = f.e;
    }
    plain(prev, src.length);
    return out;
  }

  function segmentInline(src) {
    const out = [];
    const n = src.length;
    let i = 0, t0 = 0;
    const text = e => { if (e > t0) out.push({ k: 't', s: t0, e }); };
    while (i < n) {
      const ch = src[i];
      if (ch === '\\') {
        const d = src[i + 1];
        if (d === '(' || d === '[') {
          const close = d === '(' ? '\\)' : '\\]';
          const j = scanTo(src, i + 2, close, d === '(');
          if (j >= 0) {
            text(i);
            out.push({ k: 'm', d: d === '[', s: i, e: j + 2, cs: i + 2, ce: j });
            i = j + 2; t0 = i;
            continue;
          }
        }
        i += 2;
        continue;
      }
      if (ch === '$') {
        if (src[i + 1] === '$') {
          const j = scanTo(src, i + 2, '$$', false);
          if (j >= 0) {
            text(i);
            out.push({ k: 'm', d: true, s: i, e: j + 2, cs: i + 2, ce: j });
            i = j + 2; t0 = i;
            continue;
          }
          i += 2;
          continue;
        }
        const j = scanTo(src, i + 1, '$', true);
        if (j > i + 1) {
          text(i);
          out.push({ k: 'm', d: false, s: i, e: j + 1, cs: i + 1, ce: j });
          i = j + 1; t0 = i;
          continue;
        }
        i++;
        continue;
      }
      i++;
    }
    text(n);
    return out;
  }

  /* ---------- source highlighting ---------- */

  // Non-overlapping runs [start, end, className] covering the whole source.
  function runs(src, segs) {
    const R = [];
    const add = (s, e, c) => {
      if (e <= s) return;
      const L = R[R.length - 1];
      if (L && L[1] === s && L[2] === c && c !== 'h-slot') L[1] = e;
      else R.push([s, e, c]);
    };
    for (const g of segs) {
      if (g.k === 't') {
        let p = g.s, i = g.s;
        while (i < g.e) {
          const ch = src[i];
          if (ch === SLOT) { add(p, i, ''); add(i, i + 1, 'h-slot'); i++; p = i; continue; }
          if (ch === '#' && (i === 0 || src[i - 1] === '\n')) {
            let j = i;
            while (j < g.e && src[j] === '#' && j - i < 3) j++;
            if (j < g.e && (src[j] === ' ' || src[j] === '\t')) {
              let k = src.indexOf('\n', j);
              if (k < 0 || k > g.e) k = g.e;
              add(p, i, '');
              add(i, j, 'h-mark');
              let q = j;
              for (let t = j; t < k; t++) {
                if (src[t] === SLOT) { add(q, t, 'h-head'); add(t, t + 1, 'h-slot'); q = t + 1; }
              }
              add(q, k, 'h-head');
              i = k; p = k;
              continue;
            }
          }
          i++;
        }
        add(p, g.e, '');
      } else if (g.k === 'p') {
        add(g.s, g.cs, 'h-delim');
        let i = g.cs;
        while (i < g.ce) {
          let nl = src.indexOf('\n', i);
          if (nl < 0 || nl >= g.ce) nl = g.ce;
          proofLineRuns(src, i, nl, add);
          if (nl < g.ce) add(nl, nl + 1, '');
          i = nl + 1;
        }
        add(g.ce, g.e, 'h-delim');
      } else {
        add(g.s, g.cs, 'h-delim');
        mathRuns(src, g.cs, g.ce, add);
        add(g.ce, g.e, 'h-delim');
      }
    }
    return R;
  }
  function mathRuns(src, a, b, add) {
    const body = src.slice(a, b);
    const re = /\\[A-Za-z]+|\\[^A-Za-z]|[{}]|◌/g;
    let m, p = a;
    while ((m = re.exec(body))) {
      const x = a + m.index, y = x + m[0].length;
      add(p, x, 'h-math');
      add(x, y, m[0] === SLOT ? 'h-slot' : (m[0].length === 1 ? 'h-brace' : 'h-cmd'));
      p = y;
    }
    add(p, b, 'h-math');
  }
  // One line of a proof block: number and bars muted, formula and rule as math, cited lines plain.
  function proofLineRuns(src, a, b, add) {
    const line = src.slice(a, b);
    const m = PROOF_LINE.exec(line);
    let p = a;
    if (m) {
      const lead = m[0].length - m[2].length - m[3].length;
      add(a, a + lead, 'h-delim');
      add(a + lead, a + lead + m[2].length, 'h-brace');
      p = a + lead + m[2].length;
    }
    if (/^-{3,}\s*$/.test(src.slice(p, b))) { add(p, b, 'h-brace'); return; }
    const cuts = splitAmp(src.slice(p, b)).map(x => p + x);
    let q = p, col = 0;
    for (const c of cuts.concat([b])) {
      if (col < 2) mathRuns(src, q, c, add); else add(q, c, '');
      if (c < b) add(c, c + 1, 'h-brace');
      q = c + 1;
      col++;
    }
  }

  // HTML for the highlight layer, with an empty marker span at the caret.
  function runsHTML(src, R, caret) {
    const mk = '<span id="cmk"></span>';
    const wrap = (t, c) => (t ? (c ? `<span class="${c}">${esc(t)}</span>` : esc(t)) : '');
    let h = '', placed = false;
    for (const [s, e, c] of R) {
      if (!placed && caret >= s && caret < e) {
        h += wrap(src.slice(s, caret), c) + mk + wrap(src.slice(caret, e), c);
        placed = true;
      } else {
        h += wrap(src.slice(s, e), c);
      }
    }
    if (!placed) h += mk;
    return h;
  }

  /* ---------- preview ---------- */

  function inlineMd(s) {
    let h = esc(s);
    h = h.replace(/\\\$/g, '$');
    h = h.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?![*\w])/g, '$1<em>$2</em>');
    h = h.split(SLOT).join('<span class="slot-box"></span>');
    return h;
  }

  // Blocks: paragraphs (single newlines kept as line breaks), # headings, display math, proofs.
  // Every block and math span carries data-o = source offset, so a tap can jump back to the source.
  // proof(g, k) returns the HTML for the k-th proof block.
  function buildBlocks(src, segs, tex, proof) {
    let pk = 0;
    const out = [];
    let cur = null;
    const close = () => {
      if (cur) {
        if (cur.h) out.push(`<${cur.tag} data-o="${cur.o}">${cur.h}</${cur.tag}>`);
        cur = null;
      }
    };
    const open = (tag, o) => { close(); cur = { tag, o, h: '', br: false }; };
    const put = (html, o) => {
      if (!cur) open('p', o);
      if (cur.br) { cur.h += '<br>'; cur.br = false; }
      cur.h += html;
    };
    for (const g of segs) {
      if (g.k === 'p') {
        close();
        if (proof) out.push(proof(g, pk));
        pk++;
        continue;
      }
      if (g.k === 'm') {
        const body = src.slice(g.cs, g.ce);
        if (g.d) {
          close();
          out.push(`<div class="disp" data-o="${g.cs}">${tex(body, true, g.cs)}</div>`);
        } else {
          put(`<span class="im" data-o="${g.cs}">${tex(body, false, g.cs)}</span>`, g.s);
        }
        continue;
      }
      let i = g.s;
      for (;;) {
        let nl = src.indexOf('\n', i);
        if (nl >= g.e) nl = -1;
        const end = nl < 0 ? g.e : nl;
        const line = src.slice(i, end);
        const bol = i === 0 || src[i - 1] === '\n';
        if (bol) {
          const hm = /^(#{1,3})[ \t]+/.exec(line);
          if (hm) {
            open('h' + hm[1].length, i);
            cur.h += inlineMd(line.slice(hm[0].length));
          } else if (/^[ \t]*$/.test(line)) {
            if (nl >= 0) close();
          } else {
            put(inlineMd(line), i);
          }
        } else if (line) {
          put(inlineMd(line), i);
        }
        if (nl < 0) break;
        if (cur) {
          if (cur.tag[0] === 'h') close();
          else cur.br = true;
        }
        i = nl + 1;
      }
    }
    close();
    return out.join('');
  }

  /* ---------- templates and editing ---------- */

  // #1, #2 … are slots; the selection fills #1; ## is a literal #.
  // Returns the text to insert and the selection to leave (relative offsets).
  function fillTemplate(tpl, sel, before, after) {
    let out = '', last = 0, m;
    const re = /##|#([1-9])/g;
    while ((m = re.exec(tpl))) {
      out += tpl.slice(last, m.index);
      if (m[0] === '##') out += '#';
      else out += (m[1] === '1' && sel) ? sel : SLOT;
      last = re.lastIndex;
    }
    out += tpl.slice(last);
    if (/^ /.test(out) && (before === '' || /[\s($]$/.test(before))) out = out.replace(/^ +/, '');
    if (/ $/.test(out) && /^\s/.test(after)) out = out.replace(/ +$/, '');
    if (/\\[A-Za-z]+$/.test(before) && /^[A-Za-z]/.test(out)) out = ' ' + out;
    const k = out.indexOf(SLOT);
    return k >= 0 ? { text: out, a: k, b: k + 1 } : { text: out, a: out.length, b: out.length };
  }

  // How many characters a palette backspace removes: a whole \command (and its trailing
  // space), a two-character control symbol like \, or one character.
  function backspaceSpan(before) {
    const m = /\\[A-Za-z]+ ?$/.exec(before);
    if (m) return m[0].length;
    if (/\\[^A-Za-z\s]$/.test(before)) return 2;
    const n = before.length;
    if (!n) return 0;
    const c = before.charCodeAt(n - 1);
    if (c >= 0xdc00 && c <= 0xdfff && n > 1) return 2;
    return 1;
  }

  /* ---------- macros ---------- */

  // Same rule KaTeX uses: arguments are #1, #2 … counted up from 1.
  function argCount(def) {
    const st = String(def).replace(/##/g, '');
    let n = 0;
    while (st.indexOf('#' + (n + 1)) !== -1) n++;
    return n;
  }

  function matchBrace(s, k) {
    let depth = 0;
    for (let i = k; i < s.length; i++) {
      const ch = s[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
  }

  // Textual expansion of user macros inside one math body.
  function expandMacros(s, M, depth) {
    depth = depth || 0;
    if (depth > 32) return s;
    let out = '', i = 0;
    const n = s.length;
    while (i < n) {
      const ch = s[i];
      if (ch !== '\\') { out += ch; i++; continue; }
      let j = i + 1;
      if (j < n && /[A-Za-z]/.test(s[j])) { while (j < n && /[A-Za-z]/.test(s[j])) j++; }
      else j = Math.min(n, j + 1);
      const name = s.slice(i, j);
      if (!own(M, name)) { out += name; i = j; continue; }
      const def = String(M[name]);
      const na = argCount(def);
      const args = [];
      let k = j;
      for (let a = 0; a < na; a++) {
        while (k < n && /\s/.test(s[k])) k++;
        if (k >= n) { args.push(''); continue; }
        if (s[k] === '{') {
          const e = matchBrace(s, k);
          if (e < 0) { args.push(s.slice(k + 1)); k = n; }
          else { args.push(s.slice(k + 1, e)); k = e + 1; }
        } else if (s[k] === '\\') {
          let e = k + 1;
          if (e < n && /[A-Za-z]/.test(s[e])) { while (e < n && /[A-Za-z]/.test(s[e])) e++; }
          else e++;
          args.push(s.slice(k, e)); k = e;
        } else {
          const L = s.codePointAt(k) > 0xffff ? 2 : 1;
          args.push(s.slice(k, k + L)); k += L;
        }
      }
      let rep = def.replace(/##|#([1-9])/g, (m0, d) => (m0 === '##' ? '#' : (args[+d - 1] ?? '')));
      rep = expandMacros(rep, M, depth + 1);
      if (/\\[A-Za-z]+$/.test(rep) && k < n && /[A-Za-z]/.test(s[k])) rep += ' ';
      out += rep;
      i = k;
    }
    return out;
  }

  function expandDoc(src, M) {
    let out = '';
    for (const g of segment(src)) {
      if (g.k === 't') out += src.slice(g.s, g.e);
      else out += src.slice(g.s, g.cs) + expandMacros(src.slice(g.cs, g.ce), M) + src.slice(g.ce, g.e);
    }
    return out;
  }

  // Macro names a document needs, including ones used inside other definitions.
  function usedMacros(src, M) {
    const used = new Set();
    const queue = [];
    const scan = s => {
      const re = /\\[A-Za-z]+/g;
      let m;
      while ((m = re.exec(s))) {
        if (own(M, m[0]) && !used.has(m[0])) { used.add(m[0]); queue.push(String(M[m[0]])); }
      }
    };
    for (const g of segment(src)) if (g.k !== 't') scan(src.slice(g.cs, g.ce));
    while (queue.length) scan(queue.pop());
    return Object.keys(M).filter(k => used.has(k));
  }

  function preamble(names, M) {
    return names.map(n => {
      const a = argCount(M[n]);
      return `\\newcommand{${n}}${a ? `[${a}]` : ''}{${M[n]}}`;
    }).join('\n');
  }

  /* ---------- where the caret is ---------- */

  // 'in' math (g = the segment), right 'after' or 'before' a formula (at = where its body
  // ends or starts), 'open' (an unclosed $ earlier in the paragraph), or 'prose'.
  function mathContext(src, pos) {
    const segs = segment(src);
    for (const g of segs) {
      if (g.k === 'p' && pos >= g.s && pos <= g.e) return { kind: 'in', g };
      if (g.k !== 'm') continue;
      if (pos >= g.cs && pos <= g.ce) return { kind: 'in', g };
      if (pos === g.e) return { kind: 'after', at: g.ce, g };
      if (pos === g.s) return { kind: 'before', at: g.cs, g };
    }
    for (const g of segs) {
      if (g.k !== 't' || pos < g.s || pos > g.e) continue;
      let from = g.s;
      const para = src.lastIndexOf('\n\n', pos - 1);
      if (para >= from) from = para + 2;
      const before = src.slice(from, pos);
      if (/(^|[^\\])(\\\\)*\$/.test(before) || /(^|[^\\])(\\\\)*\\\(/.test(before)) return { kind: 'open' };
    }
    return { kind: 'prose' };
  }

  /* ---------- Fitch proofs ---------- */
  // Inside a proof block, "3 | | Fa \to Ga & {\to}\mathrm{E} & 1, 2" is line 3, one subproof deep,
  // with its formula, rule and cited lines separated by &. "  | |---" is the Fitch bar under the
  // assumptions just above it. A line of bars alone, "  |", separates two subproofs that sit side
  // by side. Line numbers are written for readers and recomputed when the block is read back.
  const PROOF_LINE = /^\s*(\d+[.:]?[ \t]*)?((?:\|[ \t]*)+)(.*)$/;
  const CITES_TAIL = /(^|\s)((?:\d+(?:\s*[-–]\s*\d+)?)(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)\s*$/;
  const CITE_TOKEN = /(\d+)(?:\s*[-–]\s*(\d+))?/g;

  // Positions of the & that separate columns: not escaped, not inside braces.
  function splitAmp(s) {
    const cuts = [];
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') depth = Math.max(0, depth - 1);
      else if (ch === '&' && depth === 0) cuts.push(i);
    }
    return cuts;
  }

  // Items: {t:'L', d, f, rule, cites, s, off, fOff} for a line (s: starts a new subproof beside
  // the one before it), {t:'B', d, off} for a Fitch bar. off and fOff are offsets in the body.
  function parseProof(body) {
    const items = [];
    let off = 0, sep = -1;
    for (const raw of body.split('\n')) {
      const lineOff = off;
      off += raw.length + 1;
      if (!raw.trim()) continue;
      const m = PROOF_LINE.exec(raw);
      let d = 0, rest, restOff;
      if (m) {
        d = Math.min(12, (m[2].match(/\|/g) || []).length - 1);
        rest = m[3];
        restOff = lineOff + raw.length - m[3].length;
        if (!m[1] && !rest.trim()) { sep = d; continue; }
      } else {
        const lead = raw.length - raw.trimStart().length;
        rest = raw.slice(lead);
        restOff = lineOff + lead;
      }
      if (/^-{3,}\s*$/.test(rest)) { items.push({ t: 'B', d, off: lineOff }); sep = -1; continue; }
      const cuts = splitAmp(rest);
      const cols = [];
      let q = 0;
      for (const c of cuts) { cols.push(rest.slice(q, c)); q = c + 1; }
      cols.push(rest.slice(q));
      let rule = '', cites = '';
      if (cols.length >= 3) {
        rule = cols[1].trim();
        cites = cols.slice(2).join('&').trim();
      } else if (cols.length === 2) {
        const r = cols[1].trim();
        const t = CITES_TAIL.exec(r);
        if (t) { rule = r.slice(0, t.index).replace(/\\\s*$/, '').trim(); cites = t[2].trim(); }
        else rule = r;
      }
      const fLead = cols[0].length - cols[0].trimStart().length;
      items.push({ t: 'L', d, f: cols[0].trim(), rule, cites, s: sep >= 0 && d > sep, off: lineOff, fOff: restOff + fLead });
      sep = -1;
    }
    return items;
  }

  function serializeProof(items) {
    const lines = items.filter(x => x.t === 'L');
    const W = String(Math.max(1, lines.length)).length;
    const out = [];
    let no = 0, prevD = -1;
    for (const it of items) {
      const bars = '| '.repeat(it.d) + '|';
      if (it.t === 'B') { out.push(' '.repeat(W + 1) + bars + '---'); continue; }
      if (it.s && it.d > 0 && prevD >= it.d) out.push(' '.repeat(W + 1) + '| '.repeat(it.d - 1) + '|');
      no++;
      let s = String(no).padStart(W) + ' ' + bars;
      // A formula that starts with | or --- would read back as bars; an empty group keeps it a formula.
      if (it.f) s += ' ' + (/^(\||-{3,}\s*$)/.test(it.f) ? '{}' + it.f : it.f);
      if (it.rule || it.cites) s += (it.f ? ' & ' : '  & ') + it.rule + (it.cites ? ' & ' + it.cites : '');
      out.push(s.replace(/[ \t]+$/, ''));
      prevD = it.d;
    }
    return out.length ? out.join('\n') + '\n' : '';
  }

  function citeTokens(str) {
    const out = [];
    let m;
    CITE_TOKEN.lastIndex = 0;
    while ((m = CITE_TOKEN.exec(str || ''))) {
      out.push({ s: m.index, e: m.index + m[0].length, a: +m[1], b: m[2] !== undefined ? +m[2] : null });
    }
    return out;
  }

  function outermostClosed(subs, s, chain) {
    let t = s;
    while (subs[t].parent !== null && !chain.includes(subs[t].parent)) t = subs[t].parent;
    return subs[t];
  }

  // Structure only: which lines are assumptions, where subproofs start and end, which lines a
  // line may cite. It never judges whether a rule was applied correctly.
  function analyzeProof(items) {
    const lines = [];
    let run = null;
    for (const it of items) {
      if (it.t === 'L') {
        if (!run || run.d !== it.d || it.s) run = { d: it.d, idx: [] };
        lines.push({ item: it, d: it.d, a: false, under: false, first: run.idx.length === 0 });
        run.idx.push(lines.length - 1);
      } else {
        if (run && run.d === it.d) {
          for (const i of run.idx) lines[i].a = true;
          lines[run.idx[run.idx.length - 1]].under = true;
        }
        run = null;
      }
    }
    const n = lines.length;
    const subs = [{ id: 0, d: 0, from: 0, to: n - 1, parent: null }];
    const stack = [0];
    const issues = [];
    const issue = (line, msg, kind) => issues.push({ line, msg, kind: kind || 'structure' });
    for (let i = 0; i < n; i++) {
      const L = lines[i], d = L.d;
      L.no = i + 1;
      const newBlock = d >= 1 && (L.item.s || (L.a && L.first));
      let top = subs[stack[stack.length - 1]];
      while (stack.length > 1 && (top.d > d || (top.d === d && newBlock && top.from < i))) {
        top.to = i - 1;
        stack.pop();
        top = subs[stack[stack.length - 1]];
      }
      let opened = 0;
      while (top.d < d) {
        const s = { id: subs.length, d: top.d + 1, from: i, to: n - 1, parent: top.id };
        subs.push(s);
        stack.push(s.id);
        top = s;
        opened++;
      }
      L.sub = top.id;
      L.chain = stack.slice();
      if (opened > 1) issue(i, `Line ${i + 1} opens ${opened} subproofs at once. Subproofs open one level at a time.`);
      else if (d === 0 && L.a && L.first && i > 0) issue(i, `Line ${i + 1} is a premise below other lines. Premises go at the top of the proof.`);
      if (!L.item.f.trim()) issue(i, `Line ${i + 1} has no formula yet.`, 'empty');
    }
    for (const s of subs) {
      if (s.d >= 1 && s.from < n && !lines[s.from].a && !issues.some(x => x.line === s.from && x.kind === 'structure')) {
        issue(s.from, `Line ${s.from + 1} starts a subproof but isn’t an assumption. Add a Fitch bar under it.`);
      }
    }
    for (let j = 0; j < n; j++) {
      const L = lines[j];
      L.citeToks = citeTokens(L.item.cites);
      for (const tok of L.citeToks) {
        tok.bad = citeProblem(lines, subs, j, tok);
        if (tok.bad) issue(j, `Line ${j + 1} ${tok.bad}`, 'cite');
      }
    }
    issues.sort((x, y) => x.line - y.line);
    return { lines, subs, issues };
  }

  function citeProblem(lines, subs, j, tok) {
    const n = lines.length, chain = lines[j].chain;
    const { a, b } = tok;
    if (b === null) {
      if (a < 1 || a > n) return `cites line ${a}, which doesn’t exist.`;
      if (a === j + 1) return 'cites itself.';
      if (a > j + 1) return `cites line ${a}, which comes after it.`;
      const s = lines[a - 1].sub;
      if (chain.includes(s)) return '';
      const S = outermostClosed(subs, s, chain);
      return `cites line ${a}, which is inside the finished subproof ${S.from + 1}–${S.to + 1}. Cite the whole subproof instead.`;
    }
    if (b < a || a < 1 || b > n) return `cites ${a}–${b}, which isn’t a range of lines in this proof.`;
    const S = subs.find(s => s.d >= 1 && s.from === a - 1 && s.to === b - 1);
    if (!S) {
      const T = subs.find(s => s.d >= 1 && s.from === a - 1);
      return T
        ? `cites ${a}–${b}, but the subproof that starts at line ${a} runs to line ${T.to + 1}.`
        : `cites ${a}–${b}, which isn’t a subproof.`;
    }
    if (S.from >= j) return `cites ${a}–${b}, which comes after it.`;
    if (S.to >= j) return `cites ${a}–${b}, which hasn’t ended by this line.`;
    if (!chain.includes(S.parent)) {
      const P = outermostClosed(subs, S.parent, chain);
      return `cites ${a}–${b}, which is inside the finished subproof ${P.from + 1}–${P.to + 1}.`;
    }
    return '';
  }

  // The citation a line j gets when line li is tapped: the line itself if j can use it, otherwise
  // the whole finished subproof around it that j can use.
  function citeFor(an, j, li) {
    if (li === j) return { err: 'A line can’t cite itself.' };
    if (li > j) return { err: 'A line can only cite lines above it.' };
    const chain = an.lines[j].chain;
    const s = an.lines[li].sub;
    if (chain.includes(s)) return { tok: String(li + 1) };
    const S = outermostClosed(an.subs, s, chain);
    return { tok: `${S.from + 1}–${S.to + 1}` };
  }

  // After an edit, rewrite every citation so it points at the same lines and subproofs.
  // oldIds/newIds: the ids of the lines in order before and after.
  function citeRewriter(oldIds, oldAn, newIds, newAn) {
    const newNo = new Map(newIds.map((id, i) => [id, i + 1]));
    const GONE = '\u0000';
    const one = (m, A, B) => {
      const a = +A;
      if (B === undefined) {
        const id = oldIds[a - 1];
        if (id === undefined) return m;
        return newNo.has(id) ? String(newNo.get(id)) : GONE;
      }
      const b = +B;
      const S = oldAn.subs.find(s => s.d >= 1 && s.from === a - 1 && s.to === b - 1);
      if (S) {
        const ni = newIds.indexOf(oldIds[a - 1]);
        if (ni >= 0) {
          const T = newAn.subs.find(s => s.d === S.d && s.from === ni) || newAn.subs.find(s => s.d >= 1 && s.from === ni);
          if (T) return T.from === T.to ? String(T.from + 1) : `${T.from + 1}–${T.to + 1}`;
        }
      }
      let na = null, nb = null;
      for (let k = a; k <= b; k++) {
        const id = oldIds[k - 1];
        if (id !== undefined && newNo.has(id)) { if (na === null) na = newNo.get(id); nb = newNo.get(id); }
      }
      if (na === null) return oldIds[a - 1] === undefined ? m : GONE;
      return na === nb ? String(na) : `${na}–${nb}`;
    };
    return str => {
      if (!str) return str;
      const r = str.replace(/(\d+)(?:\s*[-–]\s*(\d+))?/g, one);
      if (r.indexOf(GONE) < 0) return r;
      return r.split(',').map(x => x.trim()).filter(x => x && x !== GONE).join(', ');
    };
  }

  // A proof as a LaTeX array that needs no package: bars from \big|, the Fitch bar from \underline.
  function proofToArray(items) {
    const an = analyzeProof(items);
    const rows = an.lines.map((L, i) => {
      const bars = '\\big|\\enspace'.repeat(L.d) + '\\big|';
      const f = L.item.f;
      const body = L.under ? `\\underline{\\;${f || '\\phantom{X}'}\\;}` : (f ? `\\;${f}` : '');
      let j = L.item.rule || '';
      if (L.item.cites) j += (j ? '\\ ' : '') + `\\text{${L.item.cites.replace(/\s*-\s*/g, '–')}}`;
      return `${i + 1} & ${bars}${body}` + (j ? ` & \\quad ${j}` : '');
    });
    return '\\begin{array}{rll}\n' + rows.join(' \\\\\n') + '\n\\end{array}';
  }

  /* ---------- renaming ---------- */

  // Replace one control sequence by another, token by token, so \\Old (a line break
  // followed by letters) is never mistaken for \Old. Returns the new string and the count.
  function replaceCS(s, from, to) {
    let out = '', i = 0, n = 0;
    const L = s.length;
    while (i < L) {
      if (s[i] !== '\\') { out += s[i++]; continue; }
      let j = i + 1;
      if (j < L && /[A-Za-z]/.test(s[j])) { while (j < L && /[A-Za-z]/.test(s[j])) j++; }
      else j = Math.min(L, j + 1);
      const cs = s.slice(i, j);
      if (cs === from) { out += to; n++; } else out += cs;
      i = j;
    }
    return { s: out, n };
  }

  // Same, but only inside math, so prose that mentions \Old is left alone.
  function renameInMath(src, from, to) {
    let out = '', n = 0;
    for (const g of segment(src)) {
      if (g.k === 't') { out += src.slice(g.s, g.e); continue; }
      const r = replaceCS(src.slice(g.cs, g.ce), from, to);
      n += r.n;
      out += src.slice(g.s, g.cs) + r.s + src.slice(g.ce, g.e);
    }
    return { s: out, n };
  }

  /* ---------- copying for a chat ---------- */

  // \( … \) becomes $…$ and \[ … \] becomes $$…$$, the delimiters chat apps render most
  // reliably. Inline bodies are trimmed, since many renderers ignore "$ x $". A body that
  // itself holds a dollar sign keeps its delimiters. Proof blocks and prose are untouched.
  function dollarDelims(src) {
    let out = '';
    for (const g of segment(src)) {
      const whole = src.slice(g.s, g.e);
      if (g.k !== 'm' || src[g.s] !== '\\') { out += whole; continue; }
      const body = src.slice(g.cs, g.ce);
      if (body.includes('$') || !body.trim()) { out += whole; continue; }
      out += g.d ? '$$' + body + '$$' : '$' + body.trim() + '$';
    }
    return out;
  }

  /* ---------- a pasted reply, for the reference pane ---------- */

  // A reply copied from a chat, set read-only. It takes the Markdown chat apps write: headings,
  // lists, quotes, tables, rules, code, bold and italic, with math in $…$, $$…$$, \(…\) or \[…\].
  // tex(body, display) returns the HTML for one formula. Returns { html, bits }: every formula,
  // code span and code block is one bit ({ kind: 'math' | 'code', src, d }), and its element
  // carries data-ri = its index, so a tap can insert it.
  // Code and math are swapped for placeholders before the Markdown is read, so a | or * inside
  // a formula never splits a table or starts a list.
  const PH = /(\d+)/g;
  function refBlocks(src, tex) {
    const bits = [], hold = [], blockPh = new Set();
    const ph = (html, block) => {
      hold.push(html);
      if (block) blockPh.add(hold.length - 1);
      return '' + (hold.length - 1) + '';
    };
    src = String(src || '').replace(/\r\n?/g, '\n').replace(/[]/g, '');

    // Fenced code blocks, line by line; an unclosed fence runs to the end.
    const lines = src.split('\n'), kept = [];
    for (let i = 0; i < lines.length; i++) {
      const m = /^[ \t]*(`{3,}|~{3,})[ \t]*([^\n`]*)$/.exec(lines[i]);
      if (!m) { kept.push(lines[i]); continue; }
      const closeRe = new RegExp('^[ \\t]*\\' + m[1][0] + '{' + m[1].length + ',}[ \\t]*$');
      const body = [];
      let j = i + 1;
      while (j < lines.length && !closeRe.test(lines[j])) body.push(lines[j++]);
      const code = body.join('\n');
      bits.push({ kind: 'code', src: code, lang: m[2].trim() });
      kept.push(ph(`<pre class="ref-code" data-ri="${bits.length - 1}">${esc(code)}</pre>`, true));
      i = j;
    }
    let text = kept.join('\n');

    // Code spans.
    text = text.replace(/(`+)([^`\n](?:[^\n]*?[^`\n])?)\1(?!`)/g, (all, ticks, body) => {
      const code = body.length > 2 && body[0] === ' ' && body[body.length - 1] === ' ' ? body.slice(1, -1) : body;
      bits.push({ kind: 'code', src: code });
      return ph(`<code data-ri="${bits.length - 1}">${esc(code)}</code>`);
    });

    // Math.
    let withMath = '';
    for (const g of segment(text)) {
      if (g.k !== 'm') { withMath += text.slice(g.s, g.e); continue; }
      const body = text.slice(g.cs, g.ce);
      bits.push({ kind: 'math', src: body, d: g.d });
      const i = bits.length - 1;
      // A displayed formula alone on its line is a block of its own; beside text it stays in the paragraph.
      withMath += ph(g.d
        ? `<span class="ref-disp" data-ri="${i}">${tex(body, true)}</span>`
        : `<span class="im" data-ri="${i}">${tex(body, false)}</span>`, g.d);
    }

    const out = [];
    refLines(withMath.split('\n'), out, blockPh);
    const html = out.join('').replace(PH, (m, i) => hold[+i]);
    return { html, bits };
  }

  function refInline(s) {
    let h = esc(s).replace(/\\([\\`*_{}[\]()#+\-.!|$~])/g, '$1');
    h = h.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>');
    h = h.replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?![*\w])/g, '$1<em>$2</em>');
    h = h.replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1<em>$2</em>');
    h = h.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
    h = h.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '<span class="ref-link" title="$2">$1</span>');
    return h;
  }

  const indentOf = s => { let n = 0; for (const ch of s) { if (ch === ' ') n++; else if (ch === '\t') n += 4; else break; } return n; };
  const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
  const cellsOf = line => line.trim().replace(/^\|/, '').replace(/(^|[^\\])\|$/, '$1').split(/(?<!\\)\|/).map(c => c.trim());

  // Markdown blocks, for refBlocks. Paragraph lines keep their line breaks.
  function refLines(lines, out, blockPh) {
    let para = null, lastBlank = false;
    const stack = []; // open lists: { ind, cind, tag }
    const flush = () => { if (para) { out.push(`<p>${para.join('<br>')}</p>`); para = null; } };
    const closeTop = () => { flush(); out.push(`</li></${stack.pop().tag}>`); };
    const closeAll = () => { while (stack.length) closeTop(); };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) { flush(); lastBlank = true; continue; }
      const ind = indentOf(line);
      const t = line.trim();
      const li = /^([ \t]*)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/.exec(line);
      const hr = /^([-*_])([ \t]*\1){2,}$/.test(t);
      if (li && !hr) {
        flush();
        const tag = /\d/.test(li[2]) ? 'ol' : 'ul';
        const cind = indentOf(li[1]) + li[2].length + 1;
        while (stack.length && ind < stack[stack.length - 1].ind) closeTop();
        const top = stack[stack.length - 1];
        if (top && ind < top.cind && top.tag === tag) out.push('</li><li>');
        else {
          if (top && ind < top.cind) closeTop();
          const start = tag === 'ol' && parseInt(li[2], 10) !== 1 ? ` start="${parseInt(li[2], 10)}"` : '';
          out.push(`<${tag}${start}><li>`);
          stack.push({ ind, cind, tag });
        }
        para = [refInline(li[3])];
        lastBlank = false;
        continue;
      }
      if (stack.length && lastBlank) while (stack.length && ind < stack[stack.length - 1].cind) closeTop();
      lastBlank = false;
      const hm = /^(#{1,6})[ \t]+(.*?)[ \t#]*$/.exec(t);
      if (hm) {
        flush(); closeAll();
        out.push(`<div class="ref-h ref-h${Math.min(hm[1].length, 4)}">${refInline(hm[2])}</div>`);
        continue;
      }
      if (hr) { flush(); closeAll(); out.push('<hr>'); continue; }
      const only = /^(\d+)$/.exec(t);
      if (only && blockPh.has(+only[1])) { flush(); out.push(t); continue; }
      if (/^>/.test(t)) {
        flush();
        const inner = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) inner.push(lines[i++].replace(/^\s*> ?/, ''));
        i--;
        const sub = [];
        refLines(inner, sub, blockPh);
        out.push(`<blockquote>${sub.join('')}</blockquote>`);
        continue;
      }
      if (t.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        flush();
        const head = cellsOf(line);
        let rows = '';
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
          rows += '<tr>' + cellsOf(lines[i]).map(c => `<td>${refInline(c)}</td>`).join('') + '</tr>';
          i++;
        }
        i--;
        out.push(`<table><thead><tr>${head.map(c => `<th>${refInline(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`);
        continue;
      }
      if (!para) para = [];
      para.push(refInline(t));
    }
    flush();
    closeAll();
  }

  return {
    refBlocks,
    SLOT, MACRO_NAME, esc, segment, runs, runsHTML, inlineMd, buildBlocks,
    fillTemplate, backspaceSpan, argCount, expandMacros, expandDoc, usedMacros, preamble,
    replaceCS, renameInMath, mathContext, dollarDelims,
    parseProof, serializeProof, analyzeProof, citeTokens, citeFor, citeRewriter, proofToArray,
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Core;

