# Notation packs

A notation pack carries the keys and macros of one notation, so the Composer itself can stay generic. A pack is a JSON file, usually named `<name>.pack.json`, and it can live anywhere: in a project's own repository, on a phone, pasted into a chat.

Import one in the Composer: **Keys & macros → Notation packs**, then choose the file or paste its text. Its categories are added to the current project. A category with the same name is **updated in place**: its keys and macros are replaced by the pack's. So when a notation changes, import the newer pack and the palette catches up. Keys you added by hand to an imported category are replaced too, so keep personal additions in a category of your own.

Export works the other way: **Save as pack file** or **Copy pack text** writes every category of the current project as a pack.

## Format

```json
{
  "format": "notation-composer-pack/1",
  "name": "Basic modal logic",
  "description": "One line on what the pack is for.",
  "updated": "2026-11-16",
  "categories": [
    {
      "name": "Modal",
      "macros": [
        { "name": "\\Nec", "def": "\\Box" }
      ],
      "keys": [
        { "insert": "\\Nec #1", "label": "\\Nec\\,◌" },
        "p",
        " \\vdash "
      ]
    },
    {
      "name": "Modal rules",
      "rules": true,
      "keys": ["\\mathrm{K}", "\\mathrm{Nec}"]
    }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `format` | no | `notation-composer-pack/1`. Readers ignore packs only if they cannot find `categories`. |
| `name` | no | Shown when importing. Also the default name of an exported file. |
| `description`, `updated` | no | Shown when importing, so the reader can tell which version they hold. |
| `categories` | yes | A list. Each needs a `name`; the name is what an import matches on. |
| `categories[].macros` | no | A list of `{ "name": "\\Foo", "def": "..." }`, or an object `{ "\\Foo": "..." }`. A name is a backslash and letters only. Arguments are `#1`, `#2` … |
| `categories[].keys` | no | A list. A key is either a string (what it inserts) or `{ "insert": "...", "label": "..." }` when the face should differ from the insertion. |
| `categories[].rules` | no | `true` if the category holds rule names for Fitch justifications. |

In what a key inserts, `#1`, `#2` … are slots, filled left to right, and selected text goes into `#1`. `##` is a literal `#`. A leading or trailing space pads the symbol. In a label, `◌` (U+25CC) draws an empty slot.

JSON needs every backslash doubled: `"\\land"` inserts `\land`.

## Writing a pack for a project

- Keep the project's pack in the project's own repository, next to the text that defines the notation, and update the two together.
- Put the macros a project's documents rely on in the pack, so that a formula copied out with **Copy document** expands the same way for every reader.
- Prefer a few categories with clear names ("Brackets", "Rules") over one long one: names are what updates match on.
