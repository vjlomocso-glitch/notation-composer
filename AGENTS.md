# Working on the Notation Composer

For any AI assistant (Claude, Gemini or another) and any human contributor. `CLAUDE.md` and `GEMINI.md` point here.

## What this is, and what it is not

A generic composer for writing logic: prose plus LaTeX, typed with a key palette, with macros, Fitch proofs and notation packs. It is used mostly on a phone or tablet, often to write prompts for an AI and to check how a formula renders.

**It must stay generic.** Nothing specific to one project, theory or notation goes into the code or the defaults: no project's symbols, lexicon, sample documents or rule names. The built-in categories are standard first-order logic only. A particular notation belongs in a notation pack kept with that project (see [packs/README.md](packs/README.md)). If a feature is only useful for one notation, it is a pack, not a feature.

## Ground rules for changes

1. **No build step, no framework, no dependencies** beyond the vendored KaTeX. Plain HTML, CSS and JavaScript, served as files.
2. **Mobile first.** Every screen must work at 360 px wide with touch only. The system keyboard is optional; the palette is the main input.
3. **Offline first.** Nothing may need the network after the first load. Do not add analytics, fonts from a CDN, or remote calls.
4. **Keep stored data readable.** Work is kept in `localStorage` under `notation-composer/v1`, and backups have `"app": "notation-composer", "version": 1`. `normalize()` in `js/app.js` must keep accepting every older backup. If the shape has to change, bump the version and migrate; never drop a user's documents.
5. **Keep packs compatible.** A pack with format `notation-composer-pack/1` must keep importing. New pack fields must be optional.
6. **Release.** When files are added, removed or renamed, update the list in `sw.js` and bump its `VERSION`. When the vendored KaTeX changes, update the version in README.md.
7. **Say what changed** in the commit message. AI-written commits end with a co-author line naming the AI.

## Where things are

- `js/core.js`: pure functions (no DOM), exported as `Core`. Slots (`◌`), macro expansion, syntax highlighting, the Markdown subset, proof parsing and serialising, citation renumbering. Safe to test in Node: `const Core = require('./js/core.js')`.
- `js/app.js`: one IIFE. Sections, in order: icons; built-in categories (`folCategory`, `termsCategory`, `structCategory`, `rulesCategory`, `READY`); the sample proof and `defaults()`; state and storage; palette; editor; preview; screens (Projects & documents, Keys & macros with Notation packs, Backup & restore); Fitch mode; boot.
- `css/app.css`: one file. Colours are CSS variables at the top, with a dark scheme.

## Testing a change

Serve the folder (`python3 -m http.server`) and open it at a phone-sized viewport. At least check:

- a fresh load (empty storage) shows the Welcome document and only the FOL categories;
- Preview renders the Welcome document with no KaTeX errors;
- importing `packs/basic-modal-logic.pack.json` twice adds its categories once and then updates them;
- Fitch mode inserts the example proof and renumbers when a line is added;
- Backup → restore round-trips;
- with the network off, a reload still works (after one online visit).

`python3 tools/build_single.py` writes `dist/notation-composer.html`, the one-file version; check it loads too.

## Helping someone use it with an AI

- **Copy document** (menu) expands every macro, so the AI sees plain LaTeX it can read. Use it when pasting formulas into a chat.
- To give someone your notation, write or update a pack and have them import it; do not ask them to edit categories by hand.
