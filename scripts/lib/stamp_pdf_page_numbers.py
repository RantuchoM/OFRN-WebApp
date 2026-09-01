#!/usr/bin/env python3
"""Stamp 'n/m' page numbers on every page of PDFs in a folder."""
from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas


def make_overlay(
    width: float,
    height: float,
    label: str,
    *,
    cover_bottom: bool = False,
) -> PdfReader:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(width, height))
    if cover_bottom:
        # Tapa un stamp previo abajo-derecha (Helvetica 9)
        c.setFillColorRGB(1, 1, 1)
        c.rect(width - 70, 4, 66, 22, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    # Arriba a la derecha
    c.drawRightString(width - 16, height - 20, label)
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def stamp_pdf(
    path: Path,
    dry_run: bool = False,
    *,
    cover_bottom: bool = False,
) -> tuple[int, Path]:
    reader = PdfReader(str(path))
    total = len(reader.pages)
    if total == 0:
        return 0, path
    if dry_run:
        return total, path

    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        box = page.mediabox
        w = float(box.width)
        h = float(box.height)
        overlay = make_overlay(
            w, h, f"{i + 1}/{total}", cover_bottom=cover_bottom
        )
        page.merge_page(overlay.pages[0])
        writer.add_page(page)

    tmp = path.with_suffix(".pdf.__numbered__")
    with tmp.open("wb") as f:
        writer.write(f)
    tmp.replace(path)
    return total, path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dir",
        required=True,
        help="Carpeta con PDFs a numerar (n/m en cada página)",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--cover-bottom",
        action="store_true",
        help="Tapa un stamp previo abajo-derecha al reaplicar",
    )
    args = parser.parse_args()

    folder = Path(args.dir)
    if not folder.is_dir():
        raise SystemExit(f"No existe: {folder}")

    pdfs = sorted(folder.glob("*.pdf"), key=lambda p: p.name.lower())
    pdfs = [p for p in pdfs if not p.name.endswith(".__numbered__")]
    if not pdfs:
        raise SystemExit("Sin PDFs")

    print(f"{'DRY RUN — ' if args.dry_run else ''}Numerando {len(pdfs)} PDFs en {folder}")
    for pdf in pdfs:
        n, _ = stamp_pdf(
            pdf, dry_run=args.dry_run, cover_bottom=args.cover_bottom
        )
        print(f"  {pdf.name}: {n} páginas")
    print("Listo.")


if __name__ == "__main__":
    main()
