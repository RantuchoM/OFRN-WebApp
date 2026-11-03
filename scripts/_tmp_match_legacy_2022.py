"""Match obras 2022 (Rep sin Drive) + listar sin match 2022/2023/2025."""
from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

XLSX_DIR = Path(r"c:\Users\marti\Downloads\Giras_2022_xlsx")
OBRAS_MCP = Path(
    r"C:\Users\marti\.cursor\projects\c-Proyectos-OFRN-WebApp\agent-tools\d5930078-7d1d-4158-a8da-a20f8af349db.txt"
)
OUT_UNMATCHED = Path(r"c:\Users\marti\Downloads\obras_legacy_sin_match.csv")
OUT_MATCHED_2022 = Path(r"c:\Users\marti\Downloads\obras_legacy_2022_matcheadas.csv")
OUT_JSON = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\legacy_match_2022_report.json")

STOP = {
    "para",
    "por",
    "con",
    "del",
    "de",
    "la",
    "las",
    "el",
    "los",
    "un",
    "una",
    "uno",
    "y",
    "e",
    "o",
    "en",
    "al",
    "a",
    "the",
    "and",
    "of",
    "for",
    "from",
    "in",
    "on",
    "to",
    "op",
    "no",
    "nro",
    "nr",
    "act",
    "acto",
    "mov",
    "arr",
    "version",
    "versión",
    "solo",
    "solista",
    "bis",
    "http",
    "https",
    "www",
    "com",
    "youtube",
    "watch",
    "youtu",
}

# Genre / form words alone are too weak to accept a match.
WEAK_TITLE = {
    "suite",
    "zamba",
    "vals",
    "waltz",
    "tango",
    "milonga",
    "chacarera",
    "cueca",
    "gato",
    "sonata",
    "concierto",
    "concerto",
    "sinfonia",
    "symphony",
    "prelude",
    "preludio",
    "intermezzo",
    "fantasia",
    "rhapsody",
    "rapsodia",
    "marcha",
    "march",
    "danza",
    "dance",
    "obra",
    "pieza",
    "movimiento",
    "cuerdas",
    "vientos",
    "ensamble",
    "ensemble",
    "orquesta",
}


def strip_acc(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def norm(s: str) -> str:
    s = strip_acc(s).lower()
    s = s.replace("&nbsp;", " ")
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def tokens(s: str) -> list[str]:
    return [t for t in norm(s).split() if len(t) >= 4 and t not in STOP]


def surnames_from_composer(comp: str) -> set[str]:
    """Extract candidate surnames from free-text composer cell."""
    if not comp:
        return set()
    raw = comp.replace("/", ",").replace(";", ",").replace(" - ", ",")
    parts = [p.strip() for p in re.split(r"[,&+]", raw) if p.strip()]
    out = set()
    for p in parts:
        # drop role notes
        if re.search(r"soprano|tenor|guitarra|flauta|violon|cello|piano|solista", p, re.I):
            continue
        n = norm(p)
        words = [w for w in n.split() if w not in STOP and not re.fullmatch(r"\d+", w)]
        if not words:
            continue
        # "apellido, nombre" already split; here each part may be "nombre apellido"
        if len(words) == 1:
            out.add(words[0])
        else:
            # last token as surname + also first if looks like "dvorak antonin" rare
            out.add(words[-1])
            if words[0] not in {"juan", "jose", "jorge", "pedro", "louis", "richard"}:
                # also keep first token when "Last First" unlikely; keep both last two for "tejada gomez"
                out.add(words[-1])
                if len(words) >= 2:
                    out.add(words[-2])
    # special: "Antonin Dvorak" -> dvorak
    # "Pärt, Arvo" handled by comma split -> part
    return {s for s in out if len(s) >= 3}


def title_keywords(title: str) -> list[str]:
    # use first line / before movements or " / " movement notes
    first = (title or "").split("\n")[0]
    first = first.split(" / ")[0]
    first = re.split(r"\s+[IVXLC]+\.\s+", first)[0]
    # strip parenthetical arr notes for keywording
    first = re.sub(r"\([^)]*\)", " ", first)
    toks = tokens(first)
    # keep catalog-ish tokens (d167, op36) even if short digits were dropped
    for m in re.finditer(r"\b([dk]|op|bwv|hob)\s*[.\s]?\s*(\d{2,4})\b", norm(first), re.I):
        cat = f"{m.group(1)}{m.group(2)}"
        if cat not in toks:
            toks.append(cat)
    return toks


def parse_obras_catalog() -> list[dict]:
    raw = OBRAS_MCP.read_text(encoding="utf-8")
    obj = json.loads(raw)
    if isinstance(obj, list):
        arr = obj
    elif isinstance(obj, dict) and "result" in obj:
        res = obj["result"]
        if isinstance(res, list):
            arr = res
        else:
            m = re.search(
                r"<untrusted-data-[^>]+>\s*(\[.*\])\s*</untrusted-data-",
                str(res),
                re.S,
            )
            if not m:
                raise SystemExit("Could not parse obras MCP payload (no untrusted-data array)")
            arr = json.loads(m.group(1))
    else:
        raise SystemExit("Could not parse obras MCP payload (unexpected shape)")
    obras = []
    for row in arr:
        compositores = row.get("compositores") or ""
        comp_norm = norm(compositores)
        obras.append(
            {
                "id": row["id"],
                "titulo": row.get("titulo") or "",
                "titulo_norm": norm(row.get("titulo") or ""),
                "titulo_tokens": set(tokens(row.get("titulo") or "")),
                "compositores": compositores,
                "compositores_norm": comp_norm,
                "link_drive": row.get("link_drive") or "",
            }
        )
    return obras


def score_match(comp: str, title: str, obra: dict) -> float:
    surnames = surnames_from_composer(comp)
    if not surnames:
        return 0.0
    # composer must hit
    cn = obra["compositores_norm"]
    if not any(s in cn for s in surnames):
        # also try without comma list — surname alone in compositores
        return 0.0
    kws = title_keywords(title)
    if not kws:
        # composer-only is too weak unless unique surname+exact empty? skip
        return 0.0
    ot = obra["titulo_tokens"]
    on = obra["titulo_norm"]
    hits = [k for k in kws if k in ot or k in on]
    if not hits:
        return 0.0
    strong_hits = [k for k in hits if k not in WEAK_TITLE]
    # Require at least one non-genre keyword when the title has one
    strong_kws = [k for k in kws if k not in WEAK_TITLE]
    if strong_kws and not strong_hits:
        return 0.0
    # If multiple strong keywords, need majority of them
    if len(strong_kws) >= 2 and len(strong_hits) < max(1, (len(strong_kws) + 1) // 2):
        return 0.0
    # score: fraction of keywords + bonus for longer hits / early phrase
    score = len(hits) / max(len(kws), 1)
    # strong: first meaningful keyword is distinctive and hits
    lead = strong_kws[0] if strong_kws else (kws[0] if kws else "")
    if lead and lead in hits and len(lead) >= 5:
        score += 0.25
    # phrase chunk of strong keywords preferred
    phrase_src = strong_kws[:2] if strong_kws else kws[:2]
    phrase = " ".join(phrase_src)
    if len(phrase) >= 6 and phrase in on:
        score += 0.35
    # catalog / opus-ish tokens in title (d167, op36)
    cat = re.findall(r"\b(?:d|op|k|bwv|hob)?\s*\d{2,4}\b", norm(title))
    if cat and any(c.replace(" ", "") in on.replace(" ", "") for c in cat):
        score += 0.3
    return score


def best_matches(comp: str, title: str, obras: list[dict], limit=5) -> list[tuple[float, dict]]:
    scored = []
    for o in obras:
        sc = score_match(comp, title, o)
        if sc > 0:
            scored.append((sc, o))
    scored.sort(key=lambda x: (-x[0], x[1]["id"]))
    return scored[:limit]


def is_header_row(vals: list) -> bool:
    joined = " ".join(str(v or "") for v in vals).lower()
    return "compositor" in joined and (
        "nombre" in joined or "movimiento" in joined or "obra" in joined
    )


def looks_like_work(comp: str, title: str) -> bool:
    if not title and not comp:
        return False
    low = f"{comp} {title}".lower()
    if any(
        x in low
        for x in (
            "artista invitado",
            "fecha y hora",
            "modalidad",
            "observ.",
            "total",
            "hay que confirmar",
            "director:",
            "ensambles",
        )
    ):
        return False
    # QUERY / import formula leftovers in some sheets
    if title.lower().startswith("select col") or "where col" in title.lower():
        return False
    if re.match(r"^repertorio\b", comp.strip(), re.I):
        return False
    # solo solista lines without composer
    if not comp and re.search(r"guitarra|soprano|flauta|violon|solista|bandone", title, re.I):
        return False
    if not comp and re.fullmatch(r"[IVXLC]+\..*", title.strip()):
        return False
    return bool(comp) or (title and len(title) >= 4)


def extract_gira_name(path: Path) -> str:
    name = path.name
    name = re.sub(r"^Giras 2022__", "", name)
    name = re.sub(r"\.xlsx$", "", name, flags=re.I)
    name = name.replace("__", " / ")
    return name


def parse_rep_sheet(ws, gira: str, sheet_name: str) -> list[dict]:
    rows = list(ws.iter_rows(values_only=True))
    works = []
    # find header
    header_idx = None
    col_comp = 0
    col_title = 2
    for i, row in enumerate(rows):
        vals = list(row or [])
        if is_header_row(vals):
            header_idx = i
            # map columns — first short/real header wins (ignore QUERY formula cells)
            found_comp = False
            found_title = False
            for j, v in enumerate(vals):
                vs = str(v or "").strip().lower()
                if not vs or vs.startswith("select ") or len(vs) > 80:
                    continue
                if not found_comp and vs.startswith("compositor"):
                    col_comp = j
                    found_comp = True
                if not found_title and (
                    "nombre" in vs or vs in {"obra", "título", "titulo"}
                ):
                    col_title = j
                    found_title = True
            break
    if header_idx is None:
        return works

    for row in rows[header_idx + 1 :]:
        vals = list(row or [])
        if not vals:
            continue
        if is_header_row(vals):
            # another block in same sheet
            continue
        a0 = str(vals[0] or "").strip()
        # new program title rows like TITULO / empty composer blocks — skip non-works
        if a0.upper() in {"TITULO", "TÍTULO", "Título".upper()}:
            continue
        comp = str(vals[col_comp] or "").strip() if col_comp < len(vals) else ""
        title = str(vals[col_title] or "").strip() if col_title < len(vals) else ""
        # movement-only continuation: empty composer, title starts with I. II.
        if not comp and title and re.match(r"^[IVXLC]+\.", title.strip()):
            continue
        if not looks_like_work(comp, title):
            continue
        # skip pure blank title with only year-ish
        if not title and not comp:
            continue
        if not title:
            continue
        works.append(
            {
                "anio": 2022,
                "gira": gira,
                "hoja": sheet_name,
                "compositor": comp,
                "titulo": title.replace("\n", " / "),
            }
        )
    return works


def is_rep_sheet(sname: str) -> bool:
    sl = sname.lower().strip()
    if "aux" in sl:
        return False
    return (
        sl == "rep"
        or sl.startswith("rep ")
        or sl.startswith("rep")
        or sl == "repertorio"
        or sl.startswith("repertorio")
    )


def collect_2022_works() -> tuple[list[dict], dict]:
    all_works = []
    meta = {
        "files_total": 0,
        "files_with_rep": [],
        "files_without_rep": [],
        "sheets_parsed": [],
        "sheets_empty_or_no_header": [],
    }
    for path in sorted(XLSX_DIR.glob("*.xlsx")):
        meta["files_total"] += 1
        try:
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        except Exception as e:
            print("SKIP workbook", path.name, e)
            meta["files_without_rep"].append({"file": path.name, "reason": f"load error: {e}"})
            continue
        gira = extract_gira_name(path)
        rep_sheets = [s for s in wb.sheetnames if is_rep_sheet(s)]
        if not rep_sheets:
            meta["files_without_rep"].append(
                {"file": path.name, "sheets": list(wb.sheetnames)}
            )
            print(f"  NO REP: {path.name[:70]} sheets={wb.sheetnames}")
            wb.close()
            continue
        meta["files_with_rep"].append(path.name)
        for sname in rep_sheets:
            ws = wb[sname]
            works = parse_rep_sheet(ws, gira, sname)
            all_works.extend(works)
            info = {"file": path.name, "sheet": sname, "obras": len(works)}
            meta["sheets_parsed"].append(info)
            if len(works) == 0:
                meta["sheets_empty_or_no_header"].append(info)
            print(f"  {path.name[:55]} | {sname}: {len(works)} obras")
        wb.close()
    return all_works, meta


def main():
    print("Loading obras catalog...")
    obras = parse_obras_catalog()
    print("obras", len(obras))

    print("Parsing 2022 Rep sheets...")
    works_2022, parse_meta = collect_2022_works()
    print("works_2022", len(works_2022))
    print(
        "files with/without Rep:",
        len(parse_meta["files_with_rep"]),
        "/",
        len(parse_meta["files_without_rep"]),
    )

    # dedupe exact
    seen = set()
    uniq = []
    for w in works_2022:
        key = (w["gira"], norm(w["compositor"]), norm(w["titulo"]))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(w)
    works_2022 = uniq
    print("works_2022 unique", len(works_2022))

    matched_2022 = []
    unmatched_2022 = []
    ambiguous_2022 = []

    for w in works_2022:
        cands = best_matches(w["compositor"], w["titulo"], obras)
        if not cands:
            unmatched_2022.append({**w, "motivo": "sin candidato compositor+keyword"})
            continue
        top_score, top = cands[0]
        # Same-score catalog duplicates with identical normalized title => unique work
        tied = [o for sc, o in cands if abs(sc - top_score) < 1e-6]
        same_title_dupes = len(tied) >= 2 and len({o["titulo_norm"] for o in tied}) == 1
        second = cands[1][0] if len(cands) > 1 else 0
        clear = top_score >= 0.45 and (
            top_score - second >= 0.15 or second < 0.45 or same_title_dupes
        )
        if clear:
            if same_title_dupes:
                top = min(tied, key=lambda o: o["id"])
            matched_2022.append(
                {
                    **w,
                    "id_obra": top["id"],
                    "titulo_obra": top["titulo"].replace("\n", " / ")[:120],
                    "compositores_obra": top["compositores"],
                    "score": round(top_score, 3),
                }
            )
        elif top_score >= 0.45:
            ambiguous_2022.append(
                {
                    **w,
                    "motivo": "ambiguo",
                    "candidatos": "; ".join(
                        f"{o['id']}:{o['titulo'][:40]}({sc:.2f})" for sc, o in cands[:3]
                    ),
                }
            )
            unmatched_2022.append(
                {
                    **w,
                    "motivo": f"ambiguo: {'; '.join(f'{o['id']}({sc:.2f})' for sc,o in cands[:3])}",
                }
            )
        else:
            unmatched_2022.append(
                {
                    **w,
                    "motivo": f"score bajo ({top_score:.2f}): id {top['id']} {top['titulo'][:50]}",
                }
            )

    # --- 2025 / 2023 known unmatched, try keyword rematch ---
    extra_known = [
        {
            "anio": 2025,
            "gira": "20 - 21  Las Grutas TR RN",
            "hoja": "RepsGral",
            "compositor": "Cárdenas, Agustín",
            "titulo": "Tiempo Compartido [TR 2025]",
            "link_drive": "https://drive.google.com/drive/folders/1LqEMViKJuEOq7_gVEjbtVh_ur7Rred-W",
            "motivo_previo": "Drive id sin match en obras.link_drive",
        },
        {
            "anio": 2025,
            "gira": "Filarmónica de Navidad",
            "hoja": "RepsGral",
            "compositor": "Falú, Juan",
            "titulo": "Suite Argentina Folklórica (SOLO CUECA)",
            "link_drive": "https://drive.google.com/drive/folders/1-hvYAf2vsMa6-OC-y8FCwW3K9UHHmFJz",
            "motivo_previo": "Drive id sin match en obras.link_drive",
        },
        {
            "anio": 2023,
            "gira": "Gira FIMBA 2023 - Pennisi - OFRN",
            "hoja": "Rep",
            "compositor": "A. Stampone - H. Expósito",
            "titulo": "Afiches",
            "link_drive": "https://drive.google.com/open?id=19-lToScIw-wb8Hb5XyLnmnyoPO23Rt9c",
            "motivo_previo": "Drive file id sin match",
        },
        {
            "anio": 2023,
            "gira": "Gira FIMBA 2023 - Pennisi - OFRN",
            "hoja": "Rep",
            "compositor": "Atahualpa Yupanqui /Pablo del Cerro",
            "titulo": "Chacarera de las Piedras",
            "link_drive": "https://drive.google.com/open?id=1C2tVZiKaroUtO7jWS0wTZuhoIVpfEUpn",
            "motivo_previo": "Drive file id sin match",
        },
        {
            "anio": 2023,
            "gira": "Gira FIMBA 2023 - Pennisi - OFRN",
            "hoja": "Rep",
            "compositor": "Manuel José Castilla - Gustavo \"Cuchi\" Leguizamón",
            "titulo": "La Pomeña",
            "link_drive": "https://drive.google.com/open?id=18v_APOUux62hhl5icK8w0ytZVuEHzPD-",
            "motivo_previo": "Drive file id sin match",
        },
        {
            "anio": 2023,
            "gira": "Gira FIMBA 2023 - Pennisi - OFRN",
            "hoja": "Rep",
            "compositor": "Armando Tejada Gómez Gustavo \"Cuchi\" Leguizamón",
            "titulo": "Zamba del Laurel",
            "link_drive": "https://drive.google.com/open?id=18wl7USGlH9iG55cplH6XzkFNSyr4Fn6N",
            "motivo_previo": "Drive file id sin match",
        },
    ]

    unmatched_other = []
    rescued_other = []
    for w in extra_known:
        cands = best_matches(w["compositor"], w["titulo"], obras)
        if cands and cands[0][0] >= 0.5:
            sc, o = cands[0]
            rescued_other.append(
                {
                    **w,
                    "id_obra": o["id"],
                    "titulo_obra": o["titulo"][:120],
                    "score": round(sc, 3),
                }
            )
        else:
            detail = ""
            if cands:
                sc, o = cands[0]
                detail = f"mejor score {sc:.2f} -> {o['id']} {o['titulo'][:50]}"
            unmatched_other.append(
                {
                    **w,
                    "motivo": w.get("motivo_previo", "")
                    + ((" | " + detail) if detail else " | sin candidato keyword"),
                }
            )

    # Write unmatched listing (user request)
    fields = [
        "anio",
        "gira",
        "hoja",
        "compositor",
        "titulo",
        "link_drive",
        "motivo",
    ]
    with OUT_UNMATCHED.open("w", encoding="utf-8-sig", newline="") as f:
        wri = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        wri.writeheader()
        for row in unmatched_2022:
            wri.writerow({**row, "link_drive": ""})
        for row in unmatched_other:
            wri.writerow(row)

    mfields = [
        "anio",
        "gira",
        "hoja",
        "compositor",
        "titulo",
        "id_obra",
        "titulo_obra",
        "compositores_obra",
        "score",
    ]
    with OUT_MATCHED_2022.open("w", encoding="utf-8-sig", newline="") as f:
        wri = csv.DictWriter(f, fieldnames=mfields, extrasaction="ignore")
        wri.writeheader()
        for row in matched_2022:
            wri.writerow(row)

    report = {
        "obras_catalog": len(obras),
        "files_total": parse_meta["files_total"],
        "files_with_rep": len(parse_meta["files_with_rep"]),
        "files_without_rep": parse_meta["files_without_rep"],
        "sheets_parsed": parse_meta["sheets_parsed"],
        "sheets_empty_or_no_header": parse_meta["sheets_empty_or_no_header"],
        "works_2022_raw": sum(s["obras"] for s in parse_meta["sheets_parsed"]),
        "works_2022_unique": len(works_2022),
        "matched_2022": len(matched_2022),
        "unmatched_2022": len(unmatched_2022),
        "ambiguous_counted_in_unmatched": len(ambiguous_2022),
        "unmatched_2025_2023_still": len(unmatched_other),
        "rescued_2025_2023_by_keyword": rescued_other,
        "out_unmatched": str(OUT_UNMATCHED),
        "out_matched_2022": str(OUT_MATCHED_2022),
    }
    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("Sample unmatched 2022:")
    for r in unmatched_2022[:15]:
        print(" -", r["gira"][:40], "|", r["compositor"][:30], "|", r["titulo"][:50], "|", r["motivo"][:60])


if __name__ == "__main__":
    main()
