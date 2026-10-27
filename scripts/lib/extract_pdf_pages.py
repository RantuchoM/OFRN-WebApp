"""Utilidades PDF para process-lote-orquestales-local.mjs.

  python extract_pdf_pages.py count  <pdf>
  python extract_pdf_pages.py extract <pdf> <salida.pdf> <p1,p2,...>   (paginas 1-based, orden dado)

`extract` cubre partes no contiguas (p.ej. Trompeta III/IV intercaladas en Liszt Tasso),
que split_and_rename_parts.py no soporta (solo rangos start-end).
"""
from __future__ import annotations

import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def main() -> None:
    cmd = sys.argv[1]
    if cmd == "count":
        print(len(PdfReader(sys.argv[2]).pages))
        return
    if cmd == "extract":
        src, dst, pages = sys.argv[2], sys.argv[3], sys.argv[4]
        reader = PdfReader(src)
        writer = PdfWriter()
        for p in (int(x) for x in pages.split(",")):
            writer.add_page(reader.pages[p - 1])
        with Path(dst).open("wb") as f:
            writer.write(f)
        return
    raise SystemExit(f"Comando desconocido: {cmd}")


if __name__ == "__main__":
    main()
