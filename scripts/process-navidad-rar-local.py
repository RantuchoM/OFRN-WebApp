"""
Navidad (RAR Downloads) -> Para acomodar, nombres canonicos.

  1. Oh, Dulce Navidad (White Christmas) - Berlin, I. / arr. Celso Torres Mora
  2. El Burrito Sabanero - Blanco, H. / arr. Yimi Giraldo (Orquesta EAFIT)

Uso:
  python scripts/process-navidad-rar-local.py [--dry-run]

Requiere los RAR ya extraidos en C:\\Proyectos\\_tmp_rar\\{dulce,burrito}
(tar -xf archivo.rar -C carpeta). Escribe en PARA_ACOMODAR_ROOT.
"""
import os
import shutil
import sys

import fitz  # PyMuPDF

DRY = "--dry-run" in sys.argv
ROOT = os.environ.get(
    "PARA_ACOMODAR_ROOT", r"H:\Mi unidad\Archivo General OFRN\Para acomodar"
)
TMP = os.environ.get("NAVIDAD_TMP", r"C:\Proyectos\_tmp_rar")

DULCE = {
    "folder": "Berlin, I. - Oh, Dulce Navidad (White Christmas)",
    "title": "Oh, Dulce Navidad (White Christmas)",
    "composer": "Berlin, I.",
    "src": os.path.join(TMP, "dulce"),
    # (archivo origen, instrumento canonico) -- 1 archivo = 1 parte, pagina completa
    "files": [
        ("Dulce navidad con chorus.pdf", "SCORE"),
        ("Dulce Navidad - Fl. 1.pdf", "Flauta 1"),
        ("Dulce Navidad - Ob. 1.pdf", "Oboe 1"),
        ("Dulce Navidad - Ob. 2.pdf", "Oboe 2"),
        ("Dulce navidad  - Fgt. 1.pdf", "Fagot 1"),
        ("Dulce Navidad -  Fgt. 2.pdf", "Fagot 2"),
        ("Dulce navidad con chorus - Horn 1.pdf", "Corno 1"),
        ("Dulce navidad con chorus - Horn 2.pdf", "Corno 2"),
        ("Dulce navidad con chorus - Horn 3.pdf", "Corno 3"),
        ("Dulce navidad con chorus - Horn 4.pdf", "Corno 4"),
        ("Dulce navidad con chorus - Trumpet in C 1.pdf", "Trompeta 1"),
        ("Dulce navidad con chorus - Trumpet in C 2.pdf", "Trompeta 2"),
        ("Dulce navidad con chorus - Trombone 1.pdf", "Trombón 1"),
        ("Dulce navidad con chorus - Trombone 2.pdf", "Trombón 2"),
        ("Dulce navidad con chorus - Trombone 3.pdf", "Trombón 3"),
        ("Dulce navidad con chorus - Tuba.pdf", "Tuba"),
        ("Dulce navidad con chorus - Timpani.pdf", "Timbales"),
        ("Dulce navidad con chorus - Triangle.pdf", "Perc Triángulo"),
        ("Dulce navidad con chorus - Harp.pdf", "Arpa"),
        ("Dulce navidad con chorus - Violin I.pdf", "Violín 1"),
        ("Dulce navidad con chorus - Violin II.pdf", "Violín 2"),
        ("Dulce navidad con chorus - Viola.pdf", "Viola"),
        ("Dulce navidad con chorus - Violoncello.pdf", "Violoncello"),
        ("Dulce navidad con chorus - Contrabass.pdf", "Contrabajo"),
    ],
    "splits": [],
}

BURRITO = {
    "folder": "Blanco, H. - El Burrito Sabanero",
    "title": "El Burrito Sabanero",
    "composer": "Blanco, H.",
    "src": os.path.join(TMP, "burrito"),
    "files": [
        ("El burrito sabanero-Full score.pdf", "SCORE"),
        ("El burrito sabanero-Full vocal.pdf", "Coro"),
    ],
    # Partes.pdf (39 pag.): una parte nueva cuando aparece el titulo grande + nombre
    "splits": [
        ("El burrito sabanero-Partes.pdf", [
            ("Flauta 1", 1, 1), ("Flauta 2", 2, 2),
            ("Oboe 1", 3, 3), ("Oboe 2", 4, 4),
            ("Clarinete 1", 5, 6), ("Clarinete 2", 7, 7),
            ("Fagot 1", 8, 9), ("Fagot 2", 10, 11),
            ("Corno 1", 12, 13), ("Corno 2", 14, 15),
            ("Corno 3", 16, 17), ("Corno 4", 18, 19),
            ("Trompeta 1", 20, 20), ("Trompeta 2", 21, 21),
            ("Trombón 1", 22, 23), ("Trombón 2", 24, 25), ("Trombón 3", 26, 27),
            ("Tuba", 28, 29),
            ("Timbales", 30, 30),
            ("Perc Batería", 31, 33),
            ("Violín 1", 34, 34), ("Violín 2", 35, 35), ("Viola", 36, 36),
            ("Violoncello", 37, 38), ("Contrabajo", 39, 39),
        ]),
    ],
}


def canon(instr, work):
    return f"{instr} - {work['title']} - {work['composer']}".rstrip(".") + ".pdf"


def process(work):
    dest = os.path.join(ROOT, work["folder"])
    print(f"\n== {work['folder']}")
    if not DRY:
        os.makedirs(dest, exist_ok=True)
    n = 0
    for src_name, instr in work["files"]:
        src = os.path.join(work["src"], src_name)
        out = os.path.join(dest, canon(instr, work))
        print(f"  {src_name} -> {os.path.basename(out)}")
        if not DRY:
            shutil.copyfile(src, out)
        n += 1
    for src_name, parts in work["splits"]:
        doc = fitz.open(os.path.join(work["src"], src_name))
        for instr, a, b in parts:
            out = os.path.join(dest, canon(instr, work))
            print(f"  {src_name}[{a}-{b}] -> {os.path.basename(out)}")
            if not DRY:
                new = fitz.open()
                new.insert_pdf(doc, from_page=a - 1, to_page=b - 1)
                new.save(out)
                new.close()
            n += 1
    print(f"  total {n} PDFs")


if __name__ == "__main__":
    process(DULCE)
    process(BURRITO)

