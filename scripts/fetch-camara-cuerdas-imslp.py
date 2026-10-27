"""Baja PDFs IMSLP → Para acomodar (cámara + sinfónicas del lote).

Uso: python scripts/fetch-camara-cuerdas-imslp.py
     python scripts/fetch-camara-cuerdas-imslp.py Mozart Holst Mahler
"""
from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(r"H:\Mi unidad\Archivo General OFRN\Para acomodar")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
COOKIE = "redirectPassed=1; imslpdisclaimeraccepted=yes"

# folder → list of (imslp_id, preferred_local_name)
WORKS: dict[str, list[tuple[int, str]]] = {
    # --- lote cámara ---
    "Beethoven, L. - Quinteto de cuerdas en Do mayor, Op. 29": [
        (17197, "IMSLP17197-Violin1.pdf"),
        (17198, "IMSLP17198-Violin2.pdf"),
        (17199, "IMSLP17199-Viola1.pdf"),
        (17200, "IMSLP17200-Viola2.pdf"),
        (17201, "IMSLP17201-Cello.pdf"),
    ],
    "Beethoven, L. - Trio de cuerdas en Re mayor, Op. 9 Nro. 2": [
        (475813, "IMSLP475813-Violin.pdf"),
        (475814, "IMSLP475814-Viola.pdf"),
        (475815, "IMSLP475815-Cello.pdf"),
    ],
    "Beethoven, L. - Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2": [
        (112705, "IMSLP112705-Violin1.pdf"),
        (112706, "IMSLP112706-Violin2.pdf"),
        (112707, "IMSLP112707-Viola.pdf"),
        (112708, "IMSLP112708-Cello.pdf"),
    ],
    "Mozart, W.A. - Cuarteto de cuerdas en Do mayor, K. 157": [
        (1818, "IMSLP01818-Violin1.pdf"),
        (1819, "IMSLP01819-Violin2.pdf"),
        (1820, "IMSLP01820-Viola.pdf"),
        (1821, "IMSLP01821-Cello.pdf"),
    ],
    "Puccini, G. - Crisantemi, SC 65": [
        (1024327, "IMSLP1024327-SCORE.pdf"),
        (1024328, "IMSLP1024328-Violin1.pdf"),
        (1024329, "IMSLP1024329-Violin2.pdf"),
        (1024330, "IMSLP1024330-Viola.pdf"),
        (1024331, "IMSLP1024331-Cello.pdf"),
    ],
    "Onslow, G. - Quinteto Nro. 27 en Re mayor, Op. 68": [
        (81221, "IMSLP81221-CompleteParts.pdf"),
    ],
    "Beethoven-Khym - Sonata Op. 17, version para quinteto": [
        (607394, "IMSLP607394-SCORE.pdf"),
    ],
    "Grieg, E. - Suite Holberg, Op. 40 [cuerdas]": [
        (322046, "IMSLP322046-SCORE.pdf"),
        (17680, "IMSLP17680-Violin1.pdf"),
        (17681, "IMSLP17681-Violin2.pdf"),
        (17682, "IMSLP17682-Viola.pdf"),
        (17683, "IMSLP17683-Cello.pdf"),
        (17684, "IMSLP17684-Bass.pdf"),
    ],
    # --- lote sinfonico ---
    # Non-PD EU (Stravinsky d.1971). Life+50 (UY) ok desde 2022; life+70 no.
    "Stravinsky, I. - Sinfonia en Mib mayor, Op. 1": [
        (525027, "IMSLP525027-SCORE.pdf"),
        (525028, "IMSLP525028-Flute.pdf"),
        (525029, "IMSLP525029-Oboe.pdf"),
        (525030, "IMSLP525030-Clarinet.pdf"),
        (525031, "IMSLP525031-Bassoon.pdf"),
        (525032, "IMSLP525032-Horn.pdf"),
        (525033, "IMSLP525033-Trumpet.pdf"),
        (525034, "IMSLP525034-Trombone.pdf"),
        (525035, "IMSLP525035-Tuba.pdf"),
        (525036, "IMSLP525036-Timpani.pdf"),
        (525037, "IMSLP525037-Perc.pdf"),
        (525038, "IMSLP525038-Violin1.pdf"),
        (525039, "IMSLP525039-Violin2.pdf"),
        (525040, "IMSLP525040-Viola.pdf"),
        (525041, "IMSLP525041-Cello.pdf"),
        (525042, "IMSLP525042-Bass.pdf"),
    ],
    "Holst, G. - Beni Mora, Op. 29 Nro. 1": [
        (701095, "IMSLP701095-SCORE.pdf"),
        (701096, "IMSLP701096-Flute.pdf"),
        (701097, "IMSLP701097-OboeEH.pdf"),
        (701098, "IMSLP701098-Clarinet.pdf"),
        (701099, "IMSLP701099-Bassoon.pdf"),
        (701100, "IMSLP701100-Horn.pdf"),
        (701101, "IMSLP701101-Trumpet.pdf"),
        (701102, "IMSLP701102-TromboneTuba.pdf"),
        (701103, "IMSLP701103-Timpani.pdf"),
        (701104, "IMSLP701104-Perc.pdf"),
        (701105, "IMSLP701105-Harp.pdf"),
        (701106, "IMSLP701106-Violin1.pdf"),
        (701107, "IMSLP701107-Violin2.pdf"),
        (701108, "IMSLP701108-Viola.pdf"),
        (701109, "IMSLP701109-Cello.pdf"),
        (701110, "IMSLP701110-Bass.pdf"),
    ],
    # Version banda (Boosey 1956). Non-PD US; obra Holst PD. Orquesta: solo score EU.
    # Score #495694 (no #496677). EU-served: usar Special:IMSLPDisclaimerAccept/{id}/nee.
    "Holst, G. - Hammersmith, Op. 52 [banda]": [
        (495694, "IMSLP495694-SCORE.pdf"),
        (496678, "IMSLP496678-Flute.pdf"),
        (496679, "IMSLP496679-Oboe.pdf"),
        (496680, "IMSLP496680-Clarinet.pdf"),
        (496681, "IMSLP496681-Bassoon.pdf"),
        (496682, "IMSLP496682-Sax.pdf"),
        (496683, "IMSLP496683-Horn.pdf"),
        (496684, "IMSLP496684-CornetTrumpet.pdf"),
        (496685, "IMSLP496685-Trombone.pdf"),
        (496686, "IMSLP496686-Baritone.pdf"),
        (496687, "IMSLP496687-Tuba.pdf"),
        (496688, "IMSLP496688-Perc.pdf"),
    ],
    "Holst, G. - Hammersmith, Op. 52 [orquesta SCORE]": [
        (736961, "IMSLP736961-SCORE-orchestra.pdf"),
    ],
    # Solo score en IMSLP (sin partes)
    "Reger, M. - Suite romantica, Op. 125": [
        (214845, "IMSLP214845-SCORE.pdf"),
    ],
    "Mahler, G. - Sinfonia Nro. 4": [
        (70999, "IMSLP70999-SCORE.pdf"),
        (961510, "IMSLP961510-Flute1.pdf"),
        (961511, "IMSLP961511-Flute2.pdf"),
        (961512, "IMSLP961512-Flute3.pdf"),
        (961513, "IMSLP961513-Flute4.pdf"),
        (961514, "IMSLP961514-Oboe1.pdf"),
        (961515, "IMSLP961515-Oboe2.pdf"),
        (961516, "IMSLP961516-Oboe3EH.pdf"),
        (961517, "IMSLP961517-Clarinet1.pdf"),
        (961518, "IMSLP961518-Clarinet2.pdf"),
        (961519, "IMSLP961519-Clarinet3.pdf"),
        (961520, "IMSLP961520-Bassoon1.pdf"),
        (961521, "IMSLP961521-Bassoon2.pdf"),
        (961522, "IMSLP961522-Bassoon3.pdf"),
        (961523, "IMSLP961523-Horn1.pdf"),
        (961524, "IMSLP961524-Horn2.pdf"),
        (961525, "IMSLP961525-Horn3.pdf"),
        (961526, "IMSLP961526-Horn4.pdf"),
        (961527, "IMSLP961527-Trumpet1.pdf"),
        (961528, "IMSLP961528-Trumpet2.pdf"),
        (961529, "IMSLP961529-Trumpet3.pdf"),
        (961530, "IMSLP961530-Timpani.pdf"),
        (961531, "IMSLP961531-BassDrum.pdf"),
        (961532, "IMSLP961532-Cymbals.pdf"),
        (961533, "IMSLP961533-Triangle.pdf"),
        (961534, "IMSLP961534-TamTam.pdf"),
        (961535, "IMSLP961535-SleighBells.pdf"),
        (961536, "IMSLP961536-Glockenspiel.pdf"),
        (43523, "IMSLP43523-Harp.pdf"),
        (43524, "IMSLP43524-Violin1.pdf"),
        (43525, "IMSLP43525-Violin2.pdf"),
        (43526, "IMSLP43526-Viola.pdf"),
        (26425, "IMSLP26425-Cello.pdf"),
        (43527, "IMSLP43527-Bass.pdf"),
        # Vocal score mov. 4 (soprano + piano) UE 2946
        (37185, "IMSLP37185-Soprano-VocalScore-mvt4.pdf"),
    ],
}


def curl(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["curl.exe", "-sL", "--compressed", "--max-time", "90", "-A", UA, *args],
        check=False,
        capture_output=True,
    )


def resolve_cdn(imslp_id: int) -> str:
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
    raise RuntimeError(f"Sin CDN para #{imslp_id}\n{text[:500]}")


def download(folder: Path, imslp_id: int, name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / name
    if dest.exists() and dest.stat().st_size > 1000:
        if dest.read_bytes()[:5] == b"%PDF-":
            print(f"  ya esta {name}")
            return
    url = resolve_cdn(imslp_id)
    print(f"  #{imslp_id} -> {name}")
    print(f"    {url}")
    res = curl(["-e", "https://imslp.org/", "-D", "-", "-o", str(dest), url])
    headers = res.stdout.decode("utf-8", "replace")
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        page2 = f"https://imslp.org/wiki/Special:IMSLPDisclaimerAccept/{imslp_id}/nee"
        res2 = curl(
            [
                "-H",
                f"Cookie: {COOKIE}",
                "-e",
                "https://imslp.org/",
                "-L",
                "-D",
                "-",
                "-o",
                str(dest),
                page2,
            ]
        )
        headers = res2.stdout.decode("utf-8", "replace")
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        if dest.exists():
            dest.unlink()
        raise RuntimeError(f"No bajo PDF #{imslp_id}\n{headers[:600]}")
    print(f"    {dest.stat().st_size} bytes")


def main() -> None:
    # Unbuffered-ish progress on Windows consoles
    try:
        sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
    except Exception:
        pass
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    for folder_name, files in WORKS.items():
        if only and not any(o.lower() in folder_name.lower() for o in only):
            continue
        # Prefer existing accented folder if present
        dest_dir = ROOT / folder_name
        for existing in ROOT.iterdir() if ROOT.exists() else []:
            if not existing.is_dir():
                continue
            # Match by ascii-ish core (first 30 chars without accents)
            if existing.name.replace("í", "i").replace("ó", "o").replace("á", "a").replace("é", "e").replace("ú", "u") == folder_name.replace(
                "í", "i"
            ).replace("ó", "o").replace("á", "a").replace("é", "e").replace("ú", "u"):
                dest_dir = existing
                break
        print(f"\n== {dest_dir.name} ==")
        for imslp_id, name in files:
            try:
                download(dest_dir, imslp_id, name)
            except Exception as exc:
                print(f"  ERROR #{imslp_id}: {exc}")


if __name__ == "__main__":
    main()
