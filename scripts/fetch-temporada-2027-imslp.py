# -*- coding: utf-8 -*-
"""Audita y descarga sets IMSLP (score + partes) para Solicitud temporada 2027.

Uso: python -u scripts/fetch-temporada-2027-imslp.py
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(r"H:\Mi unidad\Archivo General OFRN\Para acomodar")
REPORT = Path(r"c:\Users\marti\Downloads\programas-pdf-analisis\imslp_audit_2027.json")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
COOKIE = "redirectPassed=1; imslpdisclaimeraccepted=yes; disclaimer_bypass=OK"


@dataclass
class Work:
    obra_id: int
    folder: str
    wiki: str  # path after /wiki/
    notes: str = ""
    force_skip: bool = False  # known absent / incomplete


WORKS: list[Work] = [
    Work(3891, "Borodin, A. - Sinfonia Nro 2 en si menor", "Symphony_No.2_(Borodin,_Aleksandr)"),
    Work(3892, "Brotons, S. - Sinfonietta da camera Op.38", "", force_skip=True, notes="No en IMSLP"),
    Work(3893, "Kalinnikov, V. - Serenata para cuerdas en sol menor", "Serenade_for_Strings_(Kalinnikov,_Vasily)"),
    Work(3894, "Shostakovich-Barshai - Sinfonia de camara Op.110a", "", force_skip=True, notes="Arr. Barshai no está en IMSLP (solo cuarteto Op.110)"),
    Work(3895, "Kalinnikov, V. - Sinfonia Nro 2 en La mayor", "Symphony_No.2_in_A_major_(Kalinnikov,_Vasily)"),
    Work(3896, "Mozart, W.A. - Sinfonia Nro 40 K.550", "Symphony_No.40_in_G_minor,_K.550_(Mozart,_Wolfgang_Amadeus)"),
    Work(3897, "Debussy, C. - Preludio a la siesta de un fauno", "Pr%C3%A9lude_%C3%A0_l%27apr%C3%A8s-midi_d%27un_faune_(Debussy,_Claude)"),
    Work(3898, "Beethoven, L.v. - Triple Concierto Op.56", "Triple_Concerto,_Op.56_(Beethoven,_Ludwig_van)"),
    Work(3899, "Sibelius, J. - Pelleas et Melisande suite Op.46", "Pell%C3%A9as_et_M%C3%A9lisande,_suite,_Op.46_(Sibelius,_Jean)", notes="Non-PD EU · estudio"),
    Work(3900, "Paganini, N. - Concierto Violin Nro 1 Op.6", "Violin_Concerto_No.1,_Op.6_(Paganini,_Niccol%C3%B2)"),
    Work(3901, "Beethoven, L.v. - Sinfonia Nro 9 Op.125", "Symphony_No.9,_Op.125_(Beethoven,_Ludwig_van)"),
    Work(3902, "Schubert, F. - Rosamunda D.797 entreacto 3", "Rosamunde,_D.797_(Schubert,_Franz)"),
    Work(3903, "Haydn, F.J. - Concierto para Trompeta Hob.VIIe1", "Trumpet_Concerto_in_E-flat_major,_Hob.VIIe:1_(Haydn,_Joseph)"),
    Work(3904, "Handel, G.F. - And the Glory of the Lord", "Messiah,_HWV_56_(Handel,_George_Frideric)", notes="Movimiento dentro de Messiah"),
    Work(3905, "Mozart, W.A. - Magnificat K.193", "Magnificat_in_C_major,_K.193/186g_(Mozart,_Wolfgang_Amadeus)"),
    Work(3906, "Purcell, H. - Come ye sons of art", "Come_Ye_Sons_of_Art,_Z.323_(Purcell,_Henry)"),
    Work(3907, "Beethoven, L.v. - Elegischer Gesang Op.118", "Elegischer_Gesang,_Op.118_(Beethoven,_Ludwig_van)"),
    Work(3908, "Rutter, J. - For the Beauty of the Earth", "", force_skip=True, notes="Derechos · no IMSLP"),
    Work(3909, "Bach, J.S. - Nun danket alle Gott", "Nun_danket_alle_Gott,_BWV_192_(Bach,_Johann_Sebastian)"),
    Work(3910, "Falu, J. - Suites orquestales (por confirmar)", "", force_skip=True, notes="Compositor"),
    Work(3911, "Falu, J. - Estreno (por confirmar)", "", force_skip=True, notes="Compositor"),
    Work(3912, "Stravinsky, I. - Danses concertantes", "Danses_concertantes,_K063_(Stravinsky,_Igor)", notes="CA · estudio"),
    Work(3913, "Wagner, R. - Idilio de Sigfrido", "Siegfried_Idyll,_WWV_103_(Wagner,_Richard)"),
    Work(3914, "Coppola, G.A. - Imaginarios sonoros argentinos", "", force_skip=True, notes="Estreno"),
    Work(3915, "Ripper, J.G. - Matinas", "", force_skip=True, notes="Derechos"),
]


def curl_bytes(args: list[str]) -> bytes:
    res = subprocess.run(
        ["curl.exe", "-sL", "--compressed", "--max-time", "180", "-A", UA, *args],
        check=False,
        capture_output=True,
    )
    return res.stdout or b""


def curl_headers(url: str, extra: list[str] | None = None) -> str:
    args = ["-sI", "--compressed", "--max-time", "60", "-A", UA, "-H", f"Cookie: {COOKIE}"]
    if extra:
        args.extend(extra)
    args.append(url)
    res = subprocess.run(["curl.exe", *args], check=False, capture_output=True)
    return (res.stdout or b"").decode("utf-8", "replace")


def fetch_wiki(wiki: str) -> str:
    url = f"https://imslp.org/wiki/{wiki}"
    raw = curl_bytes(["-H", f"Cookie: {COOKIE}", url])
    return raw.decode("utf-8", "replace")


def parse_sections(html: str) -> dict[str, list[tuple[int, str]]]:
    """Return {'scores': [(id, label)], 'parts': [...]} from IMSLP work page HTML."""
    # Find file rows: Special:ImagefromIndex/ID or IMSLP12345-
    # Restrict to Sheet Music area when possible
    sheet = html
    m = re.search(r'id="Sheet_Music"|id="sheet_music"', html, re.I)
    if m:
        sheet = html[m.start() :]
        # cut before Arrangements if present after parts
    # Split scores vs parts by headings
    scores: list[tuple[int, str]] = []
    parts: list[tuple[int, str]] = []
    # crude: locate ### Scores / ### Parts / Full Scores / Parts headings in HTML
    # MediaWiki renders as <span class="mw-headline" id="Scores"> or id="Parts"
    for section_id, bucket in (("Scores", scores), ("Full_Scores", scores), ("Parts", parts)):
        # find all headlines
        pass

    # Better approach: get all ImagefromIndex links with nearby text
    # and classify by nearest preceding headline
    headlines = list(
        re.finditer(
            r'<span[^>]*class="mw-headline"[^>]*id="([^"]+)"[^>]*>([^<]*)</span>',
            sheet,
            re.I,
        )
    )
    file_links = list(
        re.finditer(
            r'Special:ImagefromIndex/(\d+)[^"]*"[^>]*>([^<]{0,80})',
            sheet,
            re.I,
        )
    )
    # also IMSLP####-PMLP pattern in href File:
    file_links2 = list(
        re.finditer(
            r'(?:IMSLP|File:)(\d{4,7})[^"<]{0,200}?(?:</a>|>)([^<]{0,60})',
            sheet,
            re.I,
        )
    )

    def section_for(pos: int) -> str:
        cur = ""
        for h in headlines:
            if h.start() <= pos:
                cur = h.group(1)
            else:
                break
        return cur.lower()

    seen: set[int] = set()
    for fl in file_links:
        fid = int(fl.group(1))
        if fid in seen:
            continue
        seen.add(fid)
        label = re.sub(r"\s+", " ", fl.group(2)).strip() or f"IMSLP{fid}"
        sec = section_for(fl.start())
        if "part" in sec and "arr" not in sec:
            parts.append((fid, label))
        elif "score" in sec or "full" in sec:
            # exclude arrangements sections
            if "arrangement" in sec or "transcription" in sec:
                continue
            scores.append((fid, label))
        elif "vocal" in sec:
            scores.append((fid, label))

    # If classification failed, fall back: any ImagefromIndex in sheet music
    if not scores and not parts:
        for fl in file_links:
            fid = int(fl.group(1))
            label = re.sub(r"\s+", " ", fl.group(2)).strip() or f"IMSLP{fid}"
            # heuristic: Complete Score / Full Score -> score; instrument names -> parts
            low = label.lower()
            if "score" in low or "partitura" in low:
                scores.append((fid, label))
            else:
                parts.append((fid, label))

    return {"scores": scores, "parts": parts}


def resolve_cdn(imslp_id: int) -> str:
    # Try ImagefromIndex Location
    headers = curl_headers(f"https://imslp.org/wiki/Special:ImagefromIndex/{imslp_id}")
    match = re.search(r"(?im)^location:\s*(.+)$", headers)
    if match:
        loc = match.group(1).strip()
        path_match = re.search(r"[?&]path=([^&\s]+)", loc)
        if path_match:
            path = unquote(path_match.group(1))
            if not path.startswith("/"):
                path = "/" + path
            if "euimg" in path or "imslp.eu" in loc:
                return f"https://imslp.eu/files{path}"
            return f"https://imslp.org/files{path}" if path.startswith("/imglnks") else loc
        if "imglnks" in loc or loc.endswith(".pdf"):
            return loc

    # Disclaimer accept
    page = f"https://imslp.org/wiki/Special:IMSLPDisclaimerAccept/{imslp_id}/nee"
    body = curl_bytes(["-H", f"Cookie: {COOKIE}", page]).decode("utf-8", "replace")
    m = re.search(r'https://s\d+\.imslp\.org/files/imglnks/[^"\s>]+\.pdf', body, re.I)
    if m:
        return m.group(0)
    m = re.search(r'https://imslp\.eu/files/[^"\s>]+\.pdf', body, re.I)
    if m:
        return m.group(0)
    # meta refresh
    m = re.search(r'url=(https?://[^"\s>]+\.pdf)', body, re.I)
    if m:
        return m.group(1)
    raise RuntimeError(f"Sin CDN #{imslp_id}")


def safe_name(imslp_id: int, label: str) -> str:
    clean = re.sub(r'[<>:"/\\|?*]', "_", label)
    clean = re.sub(r"\s+", "_", clean).strip("._")[:80]
    if not clean:
        clean = "file"
    return f"IMSLP{imslp_id}-{clean}.pdf"


def download_file(folder: Path, imslp_id: int, label: str) -> bool:
    folder.mkdir(parents=True, exist_ok=True)
    name = safe_name(imslp_id, label)
    dest = folder / name
    if dest.exists() and dest.stat().st_size > 1000 and dest.read_bytes()[:5] == b"%PDF-":
        print(f"    ya {name}", flush=True)
        return True
    try:
        url = resolve_cdn(imslp_id)
    except Exception as exc:
        print(f"    FAIL resolve #{imslp_id}: {exc}", flush=True)
        return False
    print(f"    #{imslp_id} {label[:40]}", flush=True)
    curl_bytes(["-H", f"Cookie: {COOKIE}", "-e", "https://imslp.org/", "-o", str(dest), url])
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        # try eu cookie
        if dest.exists():
            dest.unlink(missing_ok=True)
        curl_bytes(
            [
                "-H",
                "Cookie: disclaimer_bypass=OK",
                "-e",
                "https://imslp.eu/",
                "-o",
                str(dest),
                url,
            ]
        )
    if not dest.exists() or dest.read_bytes()[:5] != b"%PDF-":
        if dest.exists():
            dest.unlink(missing_ok=True)
        print(f"    FAIL download #{imslp_id}", flush=True)
        return False
    print(f"      {dest.stat().st_size} bytes", flush=True)
    time.sleep(0.4)
    return True


def main() -> None:
    try:
        sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
    except Exception:
        pass

    report: list[dict] = []
    for w in WORKS:
        print(f"\n== #{w.obra_id} {w.folder} ==", flush=True)
        entry = {
            "obra_id": w.obra_id,
            "folder": w.folder,
            "wiki": w.wiki,
            "notes": w.notes,
            "status": "",
            "n_scores": 0,
            "n_parts": 0,
            "downloaded": 0,
        }
        if w.force_skip or not w.wiki:
            entry["status"] = "solicitud_sin_imslp"
            print(f"  SKIP: {w.notes or 'sin wiki'}", flush=True)
            report.append(entry)
            continue

        html = fetch_wiki(w.wiki)
        if "There is currently no text in this page" in html or len(html) < 500:
            entry["status"] = "solicitud_sin_pagina"
            print("  SKIP: página no encontrada", flush=True)
            report.append(entry)
            continue

        sections = parse_sections(html)
        scores = sections["scores"]
        parts = sections["parts"]
        entry["n_scores"] = len(scores)
        entry["n_parts"] = len(parts)
        print(f"  scores={len(scores)} parts={len(parts)}", flush=True)

        if len(scores) == 0 or len(parts) == 0:
            entry["status"] = "solicitud_incompleto"
            entry["detail"] = "solo_score" if scores and not parts else ("solo_partes" if parts else "nada")
            print(f"  INCOMPLETO ({entry['detail']}) → queda Solicitud", flush=True)
            report.append(entry)
            continue

        # Prefer one complete score + all parts (cap scores to avoid piano reductions spam)
        # Take up to 3 score files (complete/full) and all parts
        score_pick = scores[:3]
        to_get = score_pick + parts
        dest = ROOT / w.folder
        ok = 0
        for fid, label in to_get:
            if download_file(dest, fid, label):
                ok += 1
        entry["downloaded"] = ok
        entry["status"] = "descargado" if ok >= 2 else "solicitud_fallo_descarga"
        print(f"  DONE {ok}/{len(to_get)} → {dest}", flush=True)
        report.append(entry)
        time.sleep(0.8)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nREPORT {REPORT}", flush=True)
    for e in report:
        print(f"  {e['obra_id']}: {e['status']} scores={e['n_scores']} parts={e['n_parts']} dl={e['downloaded']}", flush=True)


if __name__ == "__main__":
    main()
