"""Beethoven Op.43 Overture — Breitkopf Orch.B. 4482 (+ score Werke B.25) → Para acomodar.

Uso: python -u scripts/fetch-prometheus-ov-imslp.py
"""
from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(r"H:\Mi unidad\Archivo General OFRN\Para acomodar")
FOLDER = "Beethoven, L. - Obertura. Las Criaturas de Prometeo, Op. 43"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
COOKIE = "redirectPassed=1; imslpdisclaimeraccepted=yes"

# Score: Werke Serie 3 No.25 plate B.25 (#395333 mejor que #849)
# Parts: Orchester-Bibliothek Orch.B. 4482 (Kalmus reprint)
# Skip #23756 (clarinete duplicado) y #48664 (Vlns I+II juntos; preferir 20068/20069)
FILES: list[tuple[int, str]] = [
    (395333, "IMSLP395333-SCORE.pdf"),
    (48657, "IMSLP48657-Flute.pdf"),
    (48658, "IMSLP48658-Oboe.pdf"),
    (48659, "IMSLP48659-Clarinet.pdf"),
    (48660, "IMSLP48660-Bassoon.pdf"),
    (48661, "IMSLP48661-Horn.pdf"),
    (48662, "IMSLP48662-Trumpet.pdf"),
    (48663, "IMSLP48663-Timpani.pdf"),
    (20068, "IMSLP20068-Violin1.pdf"),
    (20069, "IMSLP20069-Violin2.pdf"),
    (48665, "IMSLP48665-Viola.pdf"),
    (26222, "IMSLP26222-CelloBass.pdf"),
]


def curl(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["curl.exe", "-sL", "--compressed", "--max-time", "90", "-A", UA, *args],
        check=False,
        capture_output=True,
    )


# CDN conocidos cuando ImagefromIndex no expone data-id (p. ej. #20069)
CDN_FALLBACK: dict[int, str] = {
    20069: (
        "https://s9.imslp.org/files/imglnks/usimg/f/fa/"
        "IMSLP20069-PMLP03070-Beethoven_Creatures_Overture_V2.pdf"
    ),
}


def resolve_cdn(imslp_id: int) -> str:
    if imslp_id in CDN_FALLBACK:
        return CDN_FALLBACK[imslp_id]
    page = f"https://imslp.org/wiki/Special:ImagefromIndex/{imslp_id}"
    res = curl(["-H", f"Cookie: {COOKIE}", page])
    text = res.stdout.decode("utf-8", "replace")
    match = re.search(r'data-id="([^"]+)"', text)
    if match:
        return html.unescape(match.group(1))
    raise RuntimeError(f"Sin CDN #{imslp_id}")


def download(folder: Path, imslp_id: int, name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / name
    if dest.exists() and dest.stat().st_size > 1000 and dest.read_bytes()[:5] == b"%PDF-":
        print(f"  ya esta {name}", flush=True)
        return
    try:
        url = resolve_cdn(imslp_id)
    except RuntimeError:
        url = f"https://imslp.org/wiki/Special:IMSLPDisclaimerAccept/{imslp_id}/nee"
        print(f"  #{imslp_id} -> {name} (disclaimer)", flush=True)
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
    else:
        print(f"  #{imslp_id} -> {name}", flush=True)
        print(f"    {url}", flush=True)
        curl(["-e", "https://imslp.org/", "-o", str(dest), url])
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
