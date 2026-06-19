"""Unit tests for scripts/tutorial_markdown.py"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from tutorial_markdown import (  # noqa: E402
    markdown_to_html,
    normalize_tutorial_markdown,
    render_tutorial_html_body,
    resolve_tutorial_image_path,
    rewrite_markdown_image_refs,
    walk_tutorial_markdown_files,
)


class TestTutorialMarkdownHtml(unittest.TestCase):
    def test_unordered_list_renders_ul(self) -> None:
        raw = "- alpha\n- beta\n- gamma"
        html = markdown_to_html(raw)
        self.assertIn("<ul>", html)
        self.assertIn("<li>alpha</li>", html)
        self.assertIn("<li>beta</li>", html)

    def test_ordered_list_renders_ol(self) -> None:
        raw = "1. first\n2. second\n3. third"
        html = markdown_to_html(raw)
        self.assertIn("<ol>", html)
        self.assertIn("<li>first</li>", html)
        self.assertIn("<li>second</li>", html)

    def test_mixed_document(self) -> None:
        raw = "# Title\n\nParagraph.\n\n- a\n- b\n\n1. one\n2. two"
        html = markdown_to_html(raw)
        self.assertIn("<h1>", html)
        self.assertIn("<ul>", html)
        self.assertIn("<ol>", html)

    def test_empty_string(self) -> None:
        self.assertEqual(markdown_to_html(""), "")


class TestTutorialMarkdownNormalization(unittest.TestCase):
    def test_list_normalization(self) -> None:
        raw = "- item one\n1. step"
        out = normalize_tutorial_markdown(raw)
        self.assertIn("- item", out)
        self.assertIn("1.  step", out)


class TestTutorialImageResolution(unittest.TestCase):
    def test_resolve_under_images(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "images").mkdir()
            img = root / "images" / "photo.png"
            img.write_bytes(b"x")
            self.assertEqual(
                resolve_tutorial_image_path(root, Path("images/photo.png")),
                img,
            )

    def test_traversal_rejected(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.assertIsNone(resolve_tutorial_image_path(root, Path("../x.png")))


class TestWalkAndRender(unittest.TestCase):
    def test_walk_finds_tutorials(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            md = root / "myapp" / "tutorials" / "01-a.md"
            md.parent.mkdir(parents=True)
            md.write_text("# Hi", encoding="utf-8")
            found = walk_tutorial_markdown_files(root)
            self.assertEqual(len(found), 1)

    def test_render_body(self) -> None:
        with TemporaryDirectory() as tmp:
            md = Path(tmp) / "t.md"
            md.write_text("# T\n\n- x", encoding="utf-8")
            html = render_tutorial_html_body(md)
            self.assertIn("<ul>", html)


if __name__ == "__main__":
    unittest.main()
