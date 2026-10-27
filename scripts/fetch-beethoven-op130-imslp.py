"""Beethoven String Quartet Op.130 — edición Gory (más descargas + set completo).

Parts #29072–75 + Score #22856 → Para acomodar.
CDN vía Special:IMSLPDisclaimerAccept/{id}/nee (no ImagefromIndex truncado).

Uso: python -u scripts/fetch-beethoven-op130-imslp.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(r"H:\Mi unidad\Archivo General OFRN\Para acomodar")
FOLDER = "Beethoven, L. - Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

CDN: dict[int, str] = {
    22856: "https://ks15.imslp.org/files/imglnks/usimg/b/b9/IMSLP22856-PMLP05119-Cuarteto_op_130.pdf",
    29072: "https://ks15.imslp.org/files/imglnks/usimg/5/50/IMSLP29072-PMLP05119-Cuarteto_13_-_Violin_1.pdf",
    29073: "https://s9.imslp.org/files/imglnks/usimg/a/ac/IMSLP29073-PMLP05119-Cuarteto_13_-_Violin_2.pdf",
    29074: "https://ks15.imslp.org/files/imglnks/usimg/b/bc/IMSLP29074-PMLP05119-Cuarteto_13_-_Viola.pdf",
    29075: "https://s9.imslp.org/files/imglnks/usimg/c/cf/IMSLP29075-PMLP05119-Cuarteto_13_-_Cello.pdf",
}
FILES: list[tuple[int, str]] = [
    (22856, "IMSLP22856-SCORE.pdf"),
    (29072, "IMSLP29072-Violin1.pdf"),
    (29073, "IMSLP29073-Violin2.pdf"),
    (29074, "IMSLP29074-Viola.pdf"),
    (29075, "IMSLP29075-Cello.pdf"),
]


def curl(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["curl.exe", "-sL", "--compressed", "--max-time", "300", "-A", UA, *args],
        check=False,
        capture_output=True,
    )


def download(folder: Path, imslp_id: int, name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / name
    if (
        dest.exists()
        and dest.stat().st_size > 100_000
        and dest.read_bytes()[:5] == b"%PDF-"
    ):
        print(f"  ya esta {name}", flush=True)
        return
    url = CDN[imslp_id]
    print(f"  #{imslp_id} -> {name}", flush=True)
    print(f"    {url}", flush=True)
    curl(["-e", "https://imslp.org/", "-o", str(dest), url])
    if (
        not dest.exists()
        or dest.read_bytes()[:5] != b"%PDF-"
        or dest.stat().st_size < 100_000
    ):
        alt = (
            url.replace("ks15.", "s9.")
            if "ks15." in url
            else url.replace("s9.", "ks15.")
        )
        print(f"  retry {alt}", flush=True)
        curl(["-e", "https://imslp.org/", "-o", str(dest), alt])
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        print(
            f"  FALLO {name} size={dest.stat().st_size if dest.exists() else 0}",
            flush=True,
        )
        sys.exit(1)
    print(f"  OK {name} ({dest.stat().st_size} bytes)", flush=True)


def main() -> None:
    folder = ROOT / FOLDER
    print(f"Destino: {folder}", flush=True)
    for imslp_id, name in FILES:
        download(folder, imslp_id, name)
    print("Listo.", flush=True)


if __name__ == "__main__":
    main()
