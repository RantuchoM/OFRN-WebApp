"""Lote 2 sinfonico/camara: Liszt Tasso → Dvorak Carnival → Para acomodar.

Uso: python -u scripts/fetch-lote-sinf-2-imslp.py
     python -u scripts/fetch-lote-sinf-2-imslp.py Liszt Scheherazade
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

WORKS: dict[str, list[tuple[int, str]]] = {
    "Liszt, F. - Tasso. Lamento e Trionfo, S. 96": [
        (112758, "IMSLP112758-SCORE.pdf"),
        (707752, "IMSLP707752-Flute.pdf"),
        (707753, "IMSLP707753-Oboe.pdf"),
        (707754, "IMSLP707754-Clarinet.pdf"),
        (707755, "IMSLP707755-Bassoon.pdf"),
        (707756, "IMSLP707756-Horn.pdf"),
        (707757, "IMSLP707757-Trumpet.pdf"),
        (707758, "IMSLP707758-TromboneTuba.pdf"),
        (707759, "IMSLP707759-Timpani.pdf"),
        (707760, "IMSLP707760-Perc.pdf"),
        (707761, "IMSLP707761-Harp.pdf"),
        (707762, "IMSLP707762-Violin1.pdf"),
        (707763, "IMSLP707763-Violin2.pdf"),
        (707764, "IMSLP707764-Viola.pdf"),
        (707765, "IMSLP707765-Cello.pdf"),
        (707766, "IMSLP707766-Bass.pdf"),
    ],
    "Rimsky-Korsakov, N. - Sherezade, Op. 35": [
        # Belaieff/Kalmus Orchestra Parts Project (sin Bb-transpuestas duplicadas)
        (40967, "IMSLP40967-Piccolo.pdf"),
        (40968, "IMSLP40968-Flute.pdf"),
        (40969, "IMSLP40969-OboeEH.pdf"),
        (20092, "IMSLP20092-Clarinet.pdf"),
        (40971, "IMSLP40971-Bassoon.pdf"),
        (40972, "IMSLP40972-Horn12.pdf"),
        (40973, "IMSLP40973-Horn34.pdf"),
        (40974, "IMSLP40974-Trumpet.pdf"),
        (40976, "IMSLP40976-Trombone12.pdf"),
        (40977, "IMSLP40977-TromboneTuba.pdf"),
        (40978, "IMSLP40978-Timpani.pdf"),
        (19963, "IMSLP19963-Perc.pdf"),
        (40979, "IMSLP40979-Harp.pdf"),
        (40980, "IMSLP40980-Violin1.pdf"),
        (40981, "IMSLP40981-Violin2.pdf"),
        (40982, "IMSLP40982-Viola.pdf"),
        (27339, "IMSLP27339-Cello.pdf"),
        (40983, "IMSLP40983-Bass.pdf"),
    ],
    "Schoenberg, A. - Noche transfigurada, Op. 4 [cuerdas]": [
        # Arr. compositor 1917 UE
        (892440, "IMSLP892440-SCORE.pdf"),
        (48749, "IMSLP48749-Violin1.pdf"),
        (48750, "IMSLP48750-Violin2.pdf"),
        (48751, "IMSLP48751-Viola1.pdf"),
        (48752, "IMSLP48752-Viola2.pdf"),
        (27835, "IMSLP27835-Cello.pdf"),
        (48753, "IMSLP48753-Bass.pdf"),
    ],
    "Schoenberg, A. - Variaciones para orquesta, Op. 31": [
        # Solo SCORE en IMSLP (sin partes)
        (118325, "IMSLP118325-SCORE.pdf"),
    ],
    "Chausson, E. - Sinfonia en Sib, Op. 20": [
        (82933, "IMSLP82933-SCORE.pdf"),
        (37754, "IMSLP37754-Flute.pdf"),
        (37755, "IMSLP37755-OboeEH.pdf"),
        (37756, "IMSLP37756-Clarinet.pdf"),
        (37757, "IMSLP37757-Bassoon.pdf"),
        (37758, "IMSLP37758-Horn.pdf"),
        (37759, "IMSLP37759-Trumpet.pdf"),
        (37760, "IMSLP37760-TromboneTuba.pdf"),
        (37761, "IMSLP37761-Timpani.pdf"),
        (37762, "IMSLP37762-Harp.pdf"),
        (37763, "IMSLP37763-Violin1.pdf"),
        (37764, "IMSLP37764-Violin2.pdf"),
        (37765, "IMSLP37765-Viola.pdf"),
        (26551, "IMSLP26551-Cello.pdf"),
        (37766, "IMSLP37766-Bass.pdf"),
    ],
    "Honegger, A. - Sinfonia Nro. 1, H. 75": [
        # Solo SCORE (Senart/Salabert). Sin partes en IMSLP.
        (601166, "IMSLP601166-SCORE.pdf"),
    ],
    "Williams, A. - Obertura de Concierto Nro. 1 en La menor, Op. 15": [
        # Typeset Ezequiel Diz 2022 (CC BY-SA 4.0): SCORE + 26 partes.
        # https://imslp.org/wiki/Obertura_de_Concierto_No.1,_Op.15_(Williams,_Alberto)
        (826107, "IMSLP826107-SCORE.pdf"),
        (826108, "IMSLP826108-Piccolo.pdf"),
        (826109, "IMSLP826109-Flute1.pdf"),
        (826110, "IMSLP826110-Flute2.pdf"),
        (826111, "IMSLP826111-Oboe1.pdf"),
        (826112, "IMSLP826112-Oboe2.pdf"),
        (826113, "IMSLP826113-Clarinet1.pdf"),
        (826114, "IMSLP826114-Clarinet2.pdf"),
        (826115, "IMSLP826115-Bassoon1.pdf"),
        (826116, "IMSLP826116-Bassoon2.pdf"),
        (826117, "IMSLP826117-Horn1.pdf"),
        (826118, "IMSLP826118-Horn2.pdf"),
        (826119, "IMSLP826119-Horn3.pdf"),
        (826120, "IMSLP826120-Horn4.pdf"),
        (826121, "IMSLP826121-Trumpet1.pdf"),
        (826122, "IMSLP826122-Trumpet2.pdf"),
        (826123, "IMSLP826123-Trombone1.pdf"),
        (826124, "IMSLP826124-Trombone2.pdf"),
        (826125, "IMSLP826125-Trombone3.pdf"),
        (826126, "IMSLP826126-Tuba.pdf"),
        (826128, "IMSLP826128-Timpani.pdf"),
        (826127, "IMSLP826127-Cymbals.pdf"),
        (826129, "IMSLP826129-Violin1.pdf"),
        (826130, "IMSLP826130-Violin2.pdf"),
        (826131, "IMSLP826131-Viola.pdf"),
        (826132, "IMSLP826132-Cello.pdf"),
        (826133, "IMSLP826133-Bass.pdf"),
    ],
    "Dvorak, A. - Obertura Carnival, Op. 92": [
        (40991, "IMSLP40991-Flute.pdf"),
        (40992, "IMSLP40992-OboeEH.pdf"),
        (20040, "IMSLP20040-Clarinet.pdf"),
        (40993, "IMSLP40993-Bassoon.pdf"),
        (40994, "IMSLP40994-Horn.pdf"),
        (40995, "IMSLP40995-Trumpet.pdf"),
        (40996, "IMSLP40996-TromboneTuba.pdf"),
        (19953, "IMSLP19953-Perc.pdf"),
        (40997, "IMSLP40997-Harp.pdf"),
        (40998, "IMSLP40998-Violin1.pdf"),
        (40999, "IMSLP40999-Violin2.pdf"),
        (41000, "IMSLP41000-Viola.pdf"),
        (26991, "IMSLP26991-Cello.pdf"),
        (41001, "IMSLP41001-Bass.pdf"),
    ],
    "Borodin, A. - Danzas Polovtsianas (Principe Igor)": [
        # Orchestra Parts Project, Prince Igor Nos. 8 y 17 (Danzas polovtsianas)
        (40897, "IMSLP40897-Piccolo.pdf"),
        (40898, "IMSLP40898-Flute.pdf"),
        (526694, "IMSLP526694-Oboe12.pdf"),
        (526695, "IMSLP526695-EnglishHorn.pdf"),
        (20006, "IMSLP20006-Clarinet.pdf"),
        (40900, "IMSLP40900-Bassoon.pdf"),
        (40901, "IMSLP40901-Horn.pdf"),
        (40902, "IMSLP40902-Trumpet.pdf"),
        (526696, "IMSLP526696-Trombones.pdf"),
        (526697, "IMSLP526697-Tuba.pdf"),
        (40904, "IMSLP40904-Timpani.pdf"),
        (19916, "IMSLP19916-Perc.pdf"),
        (40905, "IMSLP40905-Harp.pdf"),
        (40906, "IMSLP40906-Violin1.pdf"),
        (40907, "IMSLP40907-Violin2.pdf"),
        (40908, "IMSLP40908-Viola.pdf"),
        (26974, "IMSLP26974-CelloBass.pdf"),
    ],
}

# Borodin: lista explicita arriba (discover_borodin queda como legado)
BORODIN_PLACEHOLDER = "Borodin, A. - Danzas Polovtsianas (Principe Igor)"


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


def discover_borodin() -> list[tuple[int, str]]:
    """Extrae IDs de Polovtsian Dances desde la pagina Prince Igor."""
    r = curl(
        [
            "-H",
            f"Cookie: {COOKIE}",
            "https://imslp.org/wiki/Prince_Igor_(Borodin,_Aleksandr)",
        ]
    )
    text = r.stdout.decode("utf-8", "replace")
    # Buscar seccion Polovtsian / #40897 mentioned in Merton list
    # Fallback known Orchestra Parts Project start ~40897
    ids = []
    # Prefer explicit known set from Merton list: Yes 40897
    # Scrape ImagefromIndex near "Polovtsian"
    idx = text.lower().find("polovtsian dance")
    if idx < 0:
        idx = text.lower().find("polovetsian")
    chunk = text[max(0, idx) : idx + 25000] if idx >= 0 else text
    found = [int(x) for x in re.findall(r"ImagefromIndex/(\d+)", chunk)]
    # Also *#NNNN pattern in markdown mirrors
    found += [int(x) for x in re.findall(r"\*#(\d+)", chunk)]
    found = sorted(set(found))
    print(f"Borodin scrape ids near Polovtsian: {found[:40]}", flush=True)
    # Heuristic: Orchestra Parts Project Polovtsian often 40897+
    if 40897 in found or any(40890 <= i <= 40920 for i in found):
        base = [i for i in found if 40890 <= i <= 40930]
        labels = [
            "SCORE_or_part",
        ]
        return [(i, f"IMSLP{i}.pdf") for i in base]
    # Try dedicated extract page
    return [(40897 + i, f"IMSLP{40897 + i}.pdf") for i in range(20)]


def main() -> None:
    try:
        sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
    except Exception:
        pass
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    works = dict(WORKS)
    for folder_name, files in works.items():
        if only and not any(o.lower() in folder_name.lower() for o in only):
            continue
        dest_dir = ROOT / folder_name
        print(f"\n== {folder_name} ==", flush=True)
        ok = 0
        for imslp_id, name in files:
            try:
                download(dest_dir, imslp_id, name)
                ok += 1
            except Exception as exc:
                print(f"  ERROR #{imslp_id}: {exc}", flush=True)
        print(f"  DONE {ok}/{len(files)}", flush=True)


if __name__ == "__main__":
    main()
