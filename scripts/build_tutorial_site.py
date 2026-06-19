#!/usr/bin/env python3
"""
Build static HTML pages from apps/*/tutorials/*.md into dist/tutorials/.
"""

from __future__ import annotations

import argparse
import html
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from tutorial_markdown import iter_tutorial_build_jobs, render_tutorial_html_body  # noqa: E402

PAGE_SHELL = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <link rel="stylesheet" href="{css_href}" />
</head>
<body class="tutorial-static-body">
  <main class="tutorial-markdown-body">
{body}
  </main>
</body>
</html>
"""


def _title_from_md(md_path: Path) -> str:
    for line in md_path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s.startswith("# "):
            return s[2:].strip()
    return md_path.stem.replace("-", " ").title()


def _css_href(html_path: Path, dist_root: Path) -> str:
    tutorials_root = dist_root / "tutorials"
    try:
        depth = len(html_path.parent.relative_to(tutorials_root).parts)
    except ValueError:
        depth = 0
    return "../" * (depth + 1) + "assets/tutorial-markdown.css"


def copy_images(md_path: Path, out_html: Path) -> None:
    images_src = md_path.parent / "images"
    if not images_src.is_dir():
        return
    images_dst = out_html.parent / "images"
    images_dst.mkdir(parents=True, exist_ok=True)
    for img in images_src.iterdir():
        if img.is_file():
            shutil.copy2(img, images_dst / img.name)


def build(*, apps_root: Path, dist_root: Path, site_base: str = "") -> int:
    dist_tutorials = dist_root / "tutorials"
    assets_dst = dist_root / "assets"
    css_src = ROOT / "src" / "views" / "Tutorials" / "tutorialMarkdown.css"
    assets_dst.mkdir(parents=True, exist_ok=True)
    if css_src.is_file():
        shutil.copy2(css_src, assets_dst / "tutorial-markdown.css")

    jobs = list(iter_tutorial_build_jobs(apps_root, dist_tutorials))
    if not jobs:
        print(f"No tutorial .md files under {apps_root}")
        return 0

    for md_path, out_html in jobs:
        out_html.parent.mkdir(parents=True, exist_ok=True)
        copy_images(md_path, out_html)
        body = render_tutorial_html_body(
            md_path,
            output_html_path=out_html,
            site_base=site_base,
        )
        title = _title_from_md(md_path)
        css_href = _css_href(out_html, dist_root)
        page = PAGE_SHELL.format(title=html.escape(title), css_href=css_href, body=body)
        out_html.write_text(page, encoding="utf-8")
        print(f"  {md_path.relative_to(ROOT)} -> {out_html.relative_to(dist_root)}")

    print(f"Built {len(jobs)} tutorial page(s).")
    return len(jobs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build tutorial HTML from Markdown")
    parser.add_argument("--apps-root", type=Path, default=ROOT / "apps")
    parser.add_argument("--dist", type=Path, default=ROOT / "dist")
    parser.add_argument("--site-base", default="")
    args = parser.parse_args()
    build(
        apps_root=args.apps_root.resolve(),
        dist_root=args.dist.resolve(),
        site_base=args.site_base,
    )


if __name__ == "__main__":
    main()
