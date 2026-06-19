"""
Shared Markdown → HTML for OFRN tutorials (Python build + tests).

Mirrors src/utils/tutorialMarkdown.js for list normalization and image paths.
"""

from __future__ import annotations

import html
import re
from pathlib import Path
from typing import Iterator

try:
    import markdown as md_lib
except ImportError:  # pragma: no cover
    md_lib = None


def normalize_tutorial_markdown(raw: str) -> str:
    """Normalize list markers so CommonMark parsers produce <ul>/<ol>."""
    if not raw or not isinstance(raw, str):
        return ""

    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    out: list[str] = []

    for line in lines:
        if re.match(r"^(\s*)-\s+(\S)", line):
            out.append(re.sub(r"^(\s*)-\s+", r"\1- ", line, count=1))
            continue
        if re.match(r"^(\s*)(\d+)\.\s+(\S)", line):
            out.append(re.sub(r"^(\s*)(\d+)\.\s+", r"\1\2.  ", line, count=1))
            continue
        out.append(line)

    return "\n".join(out)


def markdown_to_html(raw: str) -> str:
    if md_lib is None:
        raise RuntimeError("Install markdown: pip install markdown")
    normalized = normalize_tutorial_markdown(raw)
    return md_lib.markdown(
        normalized,
        extensions=["extra", "sane_lists", "nl2br"],
        output_format="html5",
    )


def resolve_tutorial_image_path(md_dir: Path, ref: Path | str) -> Path | None:
    """Resolve image ref relative to tutorial folder; reject path traversal."""
    md_dir = md_dir.resolve()
    ref_path = Path(ref)
    if ref_path.is_absolute():
        return None

    parts = ref_path.parts
    if parts and parts[0].lower() == "images":
        candidate = (md_dir / ref_path).resolve()
    else:
        candidate = (md_dir / "images" / ref_path.name).resolve()

    try:
        candidate.relative_to(md_dir)
    except ValueError:
        return None

    if candidate.is_file():
        return candidate
    fallback = (md_dir / ref_path).resolve()
    try:
        fallback.relative_to(md_dir)
    except ValueError:
        return None
    return fallback if fallback.is_file() else None


def walk_tutorial_markdown_files(apps_root: Path) -> list[Path]:
    apps_root = apps_root.resolve()
    if not apps_root.is_dir():
        return []

    found: list[Path] = []
    for path in sorted(apps_root.rglob("*.md")):
        try:
            rel = path.relative_to(apps_root)
        except ValueError:
            continue
        if "tutorials" not in rel.parts:
            continue
        found.append(path)
    return found


def tutorial_image_src_for_output(
    md_path: Path,
    image_ref: str,
    *,
    output_html_path: Path | None = None,
    site_base: str = "",
) -> str | None:
    md_dir = md_path.parent.resolve()
    resolved = resolve_tutorial_image_path(md_dir, image_ref)
    if resolved is None:
        return None

    if output_html_path is not None:
        out_dir = output_html_path.parent.resolve()
        try:
            rel = resolved.relative_to(out_dir)
            return rel.as_posix()
        except ValueError:
            pass

    base = site_base.rstrip("/")
    try:
        rel_md = md_dir.relative_to(md_dir.parents[2])
    except (ValueError, IndexError):
        rel_md = Path("tutorials")
    prefix = f"{base}/" if base else "/"
    return f"{prefix}{rel_md.as_posix()}/images/{resolved.name}"


_IMG_MD_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def rewrite_markdown_image_refs(
    raw: str,
    md_path: Path,
    *,
    output_html_path: Path | None = None,
    site_base: str = "",
) -> str:
    def repl(match: re.Match[str]) -> str:
        alt, target = match.group(1), match.group(2).strip()
        if target.startswith(("http://", "https://", "data:")):
            return match.group(0)
        src = tutorial_image_src_for_output(
            md_path,
            target,
            output_html_path=output_html_path,
            site_base=site_base,
        )
        if not src:
            return match.group(0)
        return f"![{alt}]({src})"

    return _IMG_MD_RE.sub(repl, raw)


def render_tutorial_html_body(
    md_path: Path,
    *,
    output_html_path: Path | None = None,
    site_base: str = "",
) -> str:
    raw = md_path.read_text(encoding="utf-8")
    raw = rewrite_markdown_image_refs(
        raw,
        md_path,
        output_html_path=output_html_path,
        site_base=site_base,
    )
    return markdown_to_html(raw)


def iter_tutorial_build_jobs(apps_root: Path, dist_tutorials: Path) -> Iterator[tuple[Path, Path]]:
    for md_path in walk_tutorial_markdown_files(apps_root):
        rel = md_path.relative_to(apps_root)
        out_html = dist_tutorials / rel.with_suffix(".html")
        yield md_path, out_html
