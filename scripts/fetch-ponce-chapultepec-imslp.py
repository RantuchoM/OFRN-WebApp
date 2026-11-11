"""Ponce — Chapultepec → Para acomodar (edición Borzone en IMSLP-EU).

Uso: python -u scripts/fetch-ponce-chapultepec-imslp.py
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(r"H:\Mi unidad\Archivo General OFRN\Para acomodar")
FOLDER = "Ponce, M. - Chapultepec"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
COOKIE_ORG = "redirectPassed=1; imslpdisclaimeraccepted=yes"
COOKIE_EU = "disclaimer_bypass=OK"

# imslp_id → nombre local canónico de descarga
FILES: list[tuple[int, str]] = [
    (651143, "IMSLP651143-Partitura.pdf"),
    (651128, "IMSLP651128-Flauta_I-II_Piccolo.pdf"),
    (651129, "IMSLP651129-Oboe_I-II.pdf"),
    (651130, "IMSLP651130-Clarinete_Sib_I-II_ClBajo.pdf"),
    (651131, "IMSLP651131-Fagot_I-II.pdf"),
    (651132, "IMSLP651132-Corno_Fa_I-IV.pdf"),
    (651133, "IMSLP651133-Trompeta_Do_I-III.pdf"),
    (651134, "IMSLP651134-Trombon_I-III_Tuba.pdf"),
    (651135, "IMSLP651135-Timbales.pdf"),
    (651136, "IMSLP651136-Percusion.pdf"),
    (651137, "IMSLP651137-Celesta.pdf"),
    (651138, "IMSLP651138-Violin_I.pdf"),
    (651139, "IMSLP651139-Violin_II.pdf"),
    (651140, "IMSLP651140-Viola.pdf"),
    (651141, "IMSLP651141-Violonchelo.pdf"),
    (651142, "IMSLP651142-Contrabajo.pdf"),
]


def curl(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["curl.exe", "-sL", "--compressed", "--max-time", "120", "-A", UA, *args],
        check=False,
        capture_output=True,
    )


def resolve_eu_cdn(imslp_id: int) -> str:
    """ImagefromIndex redirige a imslp.eu/linkhandler.php?path=/imglnks/euimg/..."""
    page = f"https://imslp.org/wiki/Special:ImagefromIndex/{imslp_id}"
    res = subprocess.run(
        [
            "curl.exe",
            "-sI",
            "--compressed",
            "--max-time",
            "60",
            "-A",
            UA,
            "-H",
            f"Cookie: {COOKIE_ORG}",
            page,
        ],
        check=False,
        capture_output=True,
    )
    headers = res.stdout.decode("utf-8", "replace")
    match = re.search(r"(?im)^location:\s*(.+)$", headers)
    if not match:
        raise RuntimeError(f"Sin Location #{imslp_id}")
    loc = match.group(1).strip()
    path_match = re.search(r"[?&]path=([^&\s]+)", loc)
    if path_match:
        path = unquote(path_match.group(1))
        if not path.startswith("/"):
            path = "/" + path
        return f"https://imslp.eu/files{path}"
    if "/files/imglnks/" in loc:
        return loc
    raise RuntimeError(f"Location sin path #{imslp_id}: {loc}")


def download(folder: Path, imslp_id: int, name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / name
    if dest.exists() and dest.stat().st_size > 1000 and dest.read_bytes()[:5] == b"%PDF-":
        print(f"  ya esta {name}", flush=True)
        return
    url = resolve_eu_cdn(imslp_id)
    print(f"  #{imslp_id} -> {name}", flush=True)
    print(f"    {url}", flush=True)
    curl(
        [
            "-H",
            f"Cookie: {COOKIE_EU}",
            "-e",
            "https://imslp.eu/",
            "-o",
            str(dest),
            url,
        ]
    )
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        if dest.exists():
            dest.unlink()
        raise RuntimeError(f"No bajo #{imslp_id}")
    print(f"    {dest.stat().st_size} bytes", flush=True)


def main() -> None:
    try:
        sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
    except Exception:
        pass
    dest_dir = ROOT / FOLDER
    print(f"== {FOLDER} ==", flush=True)
    ok = 0
    for imslp_id, name in FILES:
        try:
            download(dest_dir, imslp_id, name)
            ok += 1
        except Exception as exc:
            print(f"  ERROR #{imslp_id}: {exc}", flush=True)
    print(f"DONE {ok}/{len(FILES)}", flush=True)


if __name__ == "__main__":
    main()
