"""Mozart Requiem K.626 — score #758680 + partes Philipp Maier.

Carpeta Drive: https://drive.google.com/drive/folders/1qjOq3vvKh247-8wJt8keS1pPfB2zo1y1
(local: ORQUESTA/.../Mozart, W.A. - Requiem, K 626/Requiem, K. 626 (Philipp Maier))

Uso: python -u scripts/fetch-mozart-requiem-maier-imslp.py
"""
from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

PARENT = Path(
    r"H:\Mi unidad\Archivo General OFRN\ORQUESTA\Mozart, Wolfgang Amadeus"
    r"\Mozart, W.A. - Requiem, K 626"
)
DEST = PARENT / "Requiem, K. 626 (Philipp Maier)"
DRIVE_FOLDER_ID = "1qjOq3vvKh247-8wJt8keS1pPfB2zo1y1"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
COOKIE = "redirectPassed=1; imslpdisclaimeraccepted=yes"

# Score Sallen112/archive.org + partes typeset Philipp Maier (2009).
# K. 626 va en el título; tag de editor en el segmento de obra.
TITLE = "Requiem, K. 626 [ed. Philipp Maier]"
COMPOSER = "Mozart, W.A"


def canon(instrument: str) -> str:
    return f"{instrument} - {TITLE} - {COMPOSER}.pdf"


FILES: list[tuple[int, str]] = [
    (758680, canon("SCORE")),
    (47705, canon("Clarinete 1")),
    (47706, canon("Clarinete 2")),
    (47710, canon("Trompeta 1")),
    (47711, canon("Trompeta 2")),
    (47707, canon("Trombón 1")),
    (47708, canon("Trombón 2")),
    (47709, canon("Trombón 3")),
    (47700, canon("Violín 1")),
    (47701, canon("Violín 2")),
    (47702, canon("Viola")),
    (47703, canon("Violoncello")),
    (47704, canon("Contrabajo")),
]

CDN_FALLBACK: dict[int, str] = {
    758680: (
        "https://s9.imslp.org/files/imglnks/usimg/7/79/"
        "IMSLP758680-PMLP2751-Mozart_Requiem,_K.626_-_Full_Score.pdf"
    ),
}


def curl(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["curl.exe", "-sL", "--compressed", "--max-time", "180", "-A", UA, *args],
        check=False,
        capture_output=True,
    )


def resolve_cdn(imslp_id: int) -> str:
    if imslp_id in CDN_FALLBACK:
        return CDN_FALLBACK[imslp_id]
    page = f"https://imslp.org/wiki/Special:ImagefromIndex/{imslp_id}"
    res = curl(["-H", f"Cookie: {COOKIE}", page])
    text = res.stdout.decode("utf-8", "replace")
    match = re.search(r'data-id="([^"]+)"', text)
    if match:
        return html.unescape(match.group(1))
    page2 = f"https://imslp.org/wiki/Special:IMSLPDisclaimerAccept/{imslp_id}/nee"
    res2 = curl(["-H", f"Cookie: {COOKIE}", "-D", "-", page2])
    headers = res2.stdout.decode("utf-8", "replace")
    loc = re.search(r"(?im)^location:\s*(\S+)", headers)
    if loc:
        return loc.group(1).strip()
    raise RuntimeError(f"Sin CDN #{imslp_id}\n{text[:400]}")


def download(imslp_id: int, name: str) -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    dest = DEST / name
    if dest.exists() and dest.stat().st_size > 1000 and dest.read_bytes()[:5] == b"%PDF-":
        print(f"  ya esta {name}", flush=True)
        return
    try:
        url = resolve_cdn(imslp_id)
        print(f"  #{imslp_id} -> {name}", flush=True)
        print(f"    {url}", flush=True)
        curl(["-e", "https://imslp.org/", "-o", str(dest), url])
    except Exception as exc:
        print(f"  resolve fail #{imslp_id}: {exc}", flush=True)
        url = f"https://imslp.org/wiki/Special:IMSLPDisclaimerAccept/{imslp_id}/nee"
        curl(
            [
                "-H",
                f"Cookie: {COOKIE}",
                "-e",
                "https://imslp.org/",
                "-L",
                "-o",
                str(dest),
                url,
            ]
        )
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        page2 = f"https://imslp.org/wiki/Special:IMSLPDisclaimerAccept/{imslp_id}/nee"
        curl(
            [
                "-H",
                f"Cookie: {COOKIE}",
                "-e",
                "https://imslp.org/",
                "-L",
                "-o",
                str(dest),
                page2,
            ]
        )
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        head = dest.read_bytes()[:80] if dest.exists() else b""
        if dest.exists():
            dest.unlink()
        raise RuntimeError(f"No bajo #{imslp_id}: {head!r}")
    print(f"    {dest.stat().st_size} bytes", flush=True)


# Nombres IMSLP antiguos → canónicos (si quedó un fetch previo).
LEGACY_RENAMES: dict[str, str] = {
    "IMSLP758680-SCORE.pdf": canon("SCORE"),
    "IMSLP47705-Clarinet1.pdf": canon("Clarinete 1"),
    "IMSLP47706-Clarinet2.pdf": canon("Clarinete 2"),
    "IMSLP47710-Trumpet1.pdf": canon("Trompeta 1"),
    "IMSLP47711-Trumpet2.pdf": canon("Trompeta 2"),
    "IMSLP47707-Trombone1.pdf": canon("Trombón 1"),
    "IMSLP47708-Trombone2.pdf": canon("Trombón 2"),
    "IMSLP47709-Trombone3.pdf": canon("Trombón 3"),
    "IMSLP47700-Violin1.pdf": canon("Violín 1"),
    "IMSLP47701-Violin2.pdf": canon("Violín 2"),
    "IMSLP47702-Viola.pdf": canon("Viola"),
    "IMSLP47703-Cello.pdf": canon("Violoncello"),
    "IMSLP47704-Bass.pdf": canon("Contrabajo"),
}


def rename_legacy() -> int:
    if not DEST.is_dir():
        return 0
    n = 0
    for old, new in LEGACY_RENAMES.items():
        src = DEST / old
        dst = DEST / new
        if not src.exists():
            continue
        if dst.exists() and dst.resolve() != src.resolve():
            print(f"  skip rename (destino existe): {new}", flush=True)
            continue
        src.rename(dst)
        print(f"  rename {old} -> {new}", flush=True)
        n += 1
    return n


def main() -> None:
    try:
        sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
    except Exception:
        pass
    if not PARENT.is_dir():
        raise SystemExit(f"No existe carpeta padre: {PARENT}")
    print(f"== {DEST} ==", flush=True)
    renamed = rename_legacy()
    if renamed:
        print(f"  renombrados legacy: {renamed}", flush=True)
    ok = 0
    for imslp_id, name in FILES:
        try:
            download(imslp_id, name)
            ok += 1
        except Exception as exc:
            print(f"  ERROR #{imslp_id}: {exc}", flush=True)
    print(f"DONE {ok}/{len(FILES)}", flush=True)


if __name__ == "__main__":
    main()
