# Notation Composer

A small LaTeX and prose composer for logic, built for phones and tablets first. Type with a palette of keys instead of the system keyboard, keep notation as macros you can redefine in one place, build Fitch-style proofs line by line, and copy the result out with the macros expanded, ready to paste into a chat with an AI or into a LaTeX document.

**Use it:** https://vjlomocso-glitch.github.io/notation-composer/.

## What it does

- **Keys and categories.** Each key inserts a template; `#1`, `#2` … are slots the next-slot key jumps between. Keys are grouped into categories, and a project shows the categories it uses as palette tabs.
- **Macros.** Keys can insert macros such as `\Cond`. Redefine one and every document in the project follows. Rename one and the documents and keys that use it are renamed too.
- **Preview** renders prose and math together with KaTeX: `$…$` inline, `$$…$$` displayed.
- **Fitch mode** builds a proof block line by line; line numbers and citations renumber themselves.
- **Copy out** with macros expanded and math between dollar signs, ready for a chat, or with a LaTeX preamble of `\newcommand`s. **Copy & new** copies the document and opens a fresh one in the same project, for writing one prompt after another; the copied document is named from its first line.
- **Reference pane** (menu → Reference pane): paste a reply from a chat above the editor, rendered with its Markdown and math. Tap a formula to insert it at the cursor, between dollar signs in prose or bare inside a formula; tap code to insert it as it is. Each document keeps its own reply.
- **Notation packs** bring in the keys and macros of a particular notation from a small JSON file, and update them when the notation changes. See [packs/](packs/README.md).
- **Backup and restore** of everything as one JSON file.

Out of the box it knows only standard first-order logic: connectives, quantifiers, identity, a few letters, structure keys and the usual Fitch rule names. Anything more specific comes in as a pack.

## Where your work is kept

In the browser you use it in, and nowhere else. Nothing is sent anywhere. Each browser, and each web address the Composer is served from, keeps its own copy, so use **Backup & restore** to move work between devices or from one copy of the Composer to another.

After the first visit it also works offline, and it can be added to a phone's home screen.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | the page |
| `css/app.css` | all styles |
| `js/core.js` | text logic with no DOM: slots, macros, highlighting, proofs |
| `js/app.js` | the app: palette, screens, storage, Fitch mode, packs, backup |
| `vendor/katex/` | KaTeX 0.16.47 (MIT licence), with its woff2 fonts only |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline support and home-screen install |
| `packs/` | the pack format, and an example pack |
| `tools/build_single.py` | builds everything into one HTML file, for hosts that take a single page (such as a claude.ai artifact) |

There is no build step for the site itself: the files are served as they are.

## Hosting on GitHub Pages

The repository must be public on a free GitHub plan. In **Settings → Pages**, set *Source* to *Deploy from a branch*, branch `main`, folder `/ (root)`. The site appears at `https://<owner>.github.io/notation-composer/` a minute or two later, and every push to `main` updates it.

## Licence

The Composer's own code and text are released into the public domain under [The Unlicense](UNLICENSE). The bundled KaTeX in `vendor/katex/` keeps its own MIT licence ([vendor/katex/LICENSE](vendor/katex/LICENSE)).

## For AI assistants and other contributors

Read [AGENTS.md](AGENTS.md).
