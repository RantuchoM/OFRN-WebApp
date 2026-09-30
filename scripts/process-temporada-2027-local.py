"""Parte y renombra Beethoven op.103 y Weill op.12 en Para acomodar.

  python scripts/process-temporada-2027-local.py
"""
from __future__ import annotations

import shutil
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter

SRC = Path(r"C:\Users\marti\Downloads\temporada-2027")
ROOT = Path(r"H:\Mi unidad\Archivo General OFRN\Para acomodar")

BEETH_DIR = ROOT / "Beethoven, L. - Octeto, Op. 103"
WEILL_DIR = ROOT / "Weill, K. - Concierto para Violín, Op. 12"


def ink_ratio(pdf_path: Path, page_index: int) -> float:
    doc = pdfium.PdfDocument(str(pdf_path))
    page = doc[page_index]
    img = page.render(scale=0.35).to_pil().convert("L")
    page.close()
    doc.close()
    data = img.get_flattened_data() if hasattr(img, "get_flattened_data") else img.getdata()
    pixels = list(data)
    return sum(1 for v in pixels if v < 200) / len(pixels)


def write_pages(src: Path, dest: Path, pages: list[int]) -> None:
    reader = PdfReader(str(src))
    writer = PdfWriter()
    for n in pages:
        writer.add_page(reader.pages[n - 1])
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as f:
        writer.write(f)


def music_pages(src: Path, start: int, end: int, min_ink: float = 0.012) -> list[int]:
    kept = []
    for n in range(start, end + 1):
        ratio = ink_ratio(src, n - 1)
        if ratio >= min_ink:
            kept.append(n)
    return kept


def first_dense_page(src: Path, min_ink: float = 0.08) -> int:
    reader = PdfReader(str(src))
    for i in range(len(reader.pages)):
        if ink_ratio(src, i) >= min_ink:
            return i + 1
    return 1


def canonical(instrument: str, opus: str, title: str, composer: str) -> str:
    return f"{instrument} - {opus}. {title} - {composer}.pdf"


def place(src: Path, dest_dir: Path, filename: str, start: int, end: int, min_ink: float) -> int:
    pages = music_pages(src, start, end, min_ink)
    if not pages:
        raise RuntimeError(f"Sin páginas de música: {src.name} {start}-{end}")
    dest = dest_dir / filename
    write_pages(src, dest, pages)
    print(f"  {filename}  págs {pages[0]}-{pages[-1]} ({len(pages)} pp, omitidas {end - start + 1 - len(pages)})")
    return len(pages)


def process_beethoven() -> None:
    print(f"\n== {BEETH_DIR.name} ==")
    if BEETH_DIR.exists():
        shutil.rmtree(BEETH_DIR)
    BEETH_DIR.mkdir(parents=True)
    src_dir = SRC / "beethoven-op103"
    parts = [
        ("PMLP27872-Beethoven_-_Octet_-_Oboe_I.pdf", "Oboe 1"),
        ("PMLP27872-Beethoven_-_Octet_-_Oboe_II.pdf", "Oboe 2"),
        ("PMLP27872-Beethoven_-_Octet_-_Clarinet_I_in_B.pdf", "Clarinete 1"),
        ("PMLP27872-Beethoven_-_Octet_-_Clarinet_II_in_B.pdf", "Clarinete 2"),
        ("PMLP27872-Beethoven_-_Octet_-_Bassoon_I.pdf", "Fagot 1"),
        ("PMLP27872-Beethoven_-_Octet_-_Bassoon_II.pdf", "Fagot 2"),
        ("PMLP27872-Beethoven_-_Octet_-_Horn_I.pdf", "Corno 1"),
        ("PMLP27872-Beethoven_-_Octet_-_Horn_II.pdf", "Corno 2"),
    ]
    for pdf_name, instrument in parts:
        src = src_dir / pdf_name
        n = len(PdfReader(str(src)).pages)
        start = first_dense_page(src)
        place(
            src,
            BEETH_DIR,
            canonical(instrument, "op.103", "Octeto en Mib mayor", "Beethoven, L"),
            start,
            n,
            0.012,
        )
    score = src_dir / "Beethoven_Octet_Op._103.pdf"
    n = len(PdfReader(str(score)).pages)
    place(
        score,
        BEETH_DIR,
        canonical("SCORE", "op.103", "Octeto en Mib mayor", "Beethoven, L"),
        1,
        n,
        0.012,
    )


def process_weill() -> None:
    print(f"\n== {WEILL_DIR.name} ==")
    if WEILL_DIR.exists():
        shutil.rmtree(WEILL_DIR)
    WEILL_DIR.mkdir(parents=True)
    src_dir = SRC / "weill-op12"
    name = lambda inst: canonical(inst, "op.12", "Concierto para Violín", "Weill, K")
    jobs = [
        ("PMLP659197-Weill_-_Violinkonzert_Op._12.pdf", "SCORE", 1, 155),
        ("PMLP659197-Kurt_Weill_-_Violin_Concerto_-_(Violin_Part).pdf", "Violín Solo", 1, 14),
        ("PMLP659197-Flutes.pdf", "Flauta 1", 1, 18),
        ("PMLP659197-Flutes.pdf", "Flauta 2", 19, 33),
        ("PMLP659197-Oboe.pdf", "Oboe", 1, 16),
        ("PMLP659197-Clarinets.pdf", "Clarinete 1", 1, 18),
        ("PMLP659197-Clarinets.pdf", "Clarinete 2", 19, 35),
        ("PMLP659197-Bassoons.pdf", "Fagot 1", 1, 18),
        ("PMLP659197-Bassoons.pdf", "Fagot 2", 19, 35),
        ("PMLP659197-Horns.pdf", "Corno 1", 1, 16),
        ("PMLP659197-Horns.pdf", "Corno 2", 17, 31),
        ("PMLP659197-Trumpet.pdf", "Trompeta", 1, 12),
        ("PMLP659197-Percussion.pdf", "Perc Timbal", 1, 6),
        ("PMLP659197-Percussion.pdf", "Perc Batería", 7, 12),
        ("PMLP659197-Bass.pdf", "Contrabajo", 1, 19),
    ]
    for pdf_name, instrument, start, end in jobs:
        place(src_dir / pdf_name, WEILL_DIR, name(instrument), start, end, 0.012)


if __name__ == "__main__":
    process_beethoven()
    process_weill()
    print("\nListo.")
