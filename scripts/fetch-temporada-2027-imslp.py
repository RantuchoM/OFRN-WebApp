"""Baja PDFs de IMSLP (dominio público) para el lote 2027.

Uso: python scripts/fetch-temporada-2027-imslp.py
"""
from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

OUT = Path(r"C:\Users\marti\Downloads\temporada-2027")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
COOKIE = "redirectPassed=1; imslpdisclaimeraccepted=yes"

FILES = {
    "beethoven-op103": [
        "PMLP27872-Beethoven_-_Octet_-_Oboe_I.pdf",
        "PMLP27872-Beethoven_-_Octet_-_Oboe_II.pdf",
        "PMLP27872-Beethoven_-_Octet_-_Clarinet_I_in_B.pdf",
        "PMLP27872-Beethoven_-_Octet_-_Clarinet_II_in_B.pdf",
        "PMLP27872-Beethoven_-_Octet_-_Bassoon_I.pdf",
        "PMLP27872-Beethoven_-_Octet_-_Bassoon_II.pdf",
        "PMLP27872-Beethoven_-_Octet_-_Horn_I.pdf",
        "PMLP27872-Beethoven_-_Octet_-_Horn_II.pdf",
        "Beethoven_Octet_Op._103.pdf",
    ],
    "weill-op12": [
        "PMLP659197-Weill_-_Violinkonzert_Op._12.pdf",
        "PMLP659197-Kurt_Weill_-_Violin_Concerto_-_(Violin_Part).pdf",
        "PMLP659197-Flutes.pdf",
        "PMLP659197-Oboe.pdf",
        "PMLP659197-Clarinets.pdf",
        "PMLP659197-Bassoons.pdf",
        "PMLP659197-Horns.pdf",
        "PMLP659197-Trumpet.pdf",
        "PMLP659197-Percussion.pdf",
        "PMLP659197-Bass.pdf",
    ],
}


def curl(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["curl.exe", "-sL", "--compressed", "-A", UA, *args],
        check=False,
        capture_output=True,
    )


def cdn_url(filename: str) -> tuple[str, str | None]:
    quoted = filename.replace("(", "%28").replace(")", "%29")
    page = f"https://imslp.org/wiki/Special:IMSLPImageHandler/{quoted}"
    res = curl(["-H", f"Cookie: {COOKIE}", page])
    text = res.stdout.decode("utf-8", "replace")
    match = re.search(r'data-id="([^"]+)"', text)
    if match:
        return html.unescape(match.group(1)), None
    eu = re.search(r'href="(/files/imglnks/euimg/[^"]+)"', text)
    if eu:
        return "https://imslp.eu" + html.unescape(eu.group(1)), "disclaimer_bypass=OK"
    raise RuntimeError(f"Sin enlace para {filename}\n{text[:400]}")


def download(folder: str, filename: str) -> None:
    dest_dir = OUT / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    if dest.exists() and dest.stat().st_size > 1000:
        head = dest.read_bytes()[:5]
        if head == b"%PDF-":
            print(f"  ya está {filename}")
            return
    url, extra_cookie = cdn_url(filename)
    print(f"  {filename}\n    {url}")
    extra = ["-H", f"Cookie: {extra_cookie}"] if extra_cookie else []
    res = curl([*extra, "-D", "-", "-o", str(dest), url])
    headers = res.stdout.decode("utf-8", "replace")
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        raise RuntimeError(f"No bajó PDF {filename}\n{headers[:500]}")
    print(f"    {dest.stat().st_size} bytes")


def main() -> None:
    only = set(sys.argv[1:])
    for folder, names in FILES.items():
        if only and folder not in only:
            continue
        print(f"\n== {folder} ==")
        for name in names:
            download(folder, name)


if __name__ == "__main__":
    main()
