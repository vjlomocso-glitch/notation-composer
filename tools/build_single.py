#!/usr/bin/env python3
"""Build the Composer as one self-contained HTML file.

For hosts that take a single page and nothing else, such as a claude.ai artifact: styles,
scripts and KaTeX's fonts are all inlined. The service worker and the web-app manifest are left
out, since such hosts serve the page themselves.

    python3 tools/build_single.py            # writes dist/notation-composer.html
    python3 tools/build_single.py out.html   # or anywhere else
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def inline_fonts(css):
    def font(m):
        data = (ROOT / "vendor/katex" / m.group(1)).read_bytes()
        return 'url(data:font/woff2;base64,' + base64.b64encode(data).decode("ascii") + ')'
    return re.sub(r"url\((fonts/[^)]+\.woff2)\)", font, css)


def main():
    index = read("index.html")
    app = index[index.index('<div id="app"'):index.index('<script src="vendor/katex/katex.min.js">')].rstrip()
    desc = re.search(r'<meta name="description" content="([^"]*)">', index).group(1)
    # A closing tag inside inlined code would end the element early.
    def safe(text, tag):
        return text.replace("</" + tag, "<\\/" + tag)
    page = "\n".join([
        "<!DOCTYPE html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
        "<title>Notation Composer</title>",
        '<meta name="claude:viewport-fit-sides" content="cover">',
        f'<meta name="description" content="{desc}">',
        "<style>\n" + safe(read("css/app.css"), "style") + "\n</style>",
        "<style>" + inline_fonts(read("vendor/katex/katex.min.css")) + "</style>",
        "</head>",
        "<body>",
        app,
        "<script>" + safe(read("vendor/katex/katex.min.js"), "script") + "</script>",
        "<script>\n" + safe(read("js/core.js"), "script") + "\n</script>",
        "<script>\n" + safe(read("js/app.js"), "script") + "\n</script>",
        "</body>",
        "</html>",
        "",
    ])
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "notation-composer.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"{out} ({len(page.encode('utf-8')) // 1024} KB)")


if __name__ == "__main__":
    main()
