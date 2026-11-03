"""Parsea hojas Rep de 'Partituras 2024' (xlsx extraídos), matchea contra obras.link_drive y arma CSV + SQL legacy 2024."""
from __future__ import annotations

import csv
import datetime as dt
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

SRC = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\legacy_zip_2024")
ALL_JSON = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\obras_all_2024.json")
OBRAS_JSON = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\obras_drive_2024.json")
OUT_CSV = Path(r"c:\Users\marti\Downloads\giras_orquesta_limpio_2024.csv")
OUT_UNMATCHED = Path(r"c:\Users\marti\Downloads\obras_legacy_2024_sin_match.csv")
OUT_SQL = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\import_obras_repertorios_legacy_2024.sql")
OUT_REPORT = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\legacy_import_rows_2024.json")
FUENTE = "Partituras 2024 Rep"

DRIVE_ID_RE = re.compile(r"(?:folders/|open\?id=|[?&]id=|file/d/)([-\w]{20,})")


def lp(p) -> str:
    return "\\\\?\\" + os.path.abspath(str(p))


def strip_acc(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c))


def norm(s) -> str:
    return re.sub(r"[^a-z0-9]+", " ", strip_acc(str(s or "")).lower()).strip()


def drive_id(url) -> str | None:
    if not url:
        return None
    m = DRIVE_ID_RE.search(str(url))
    return m.group(1) if m else None


def cell_link(c) -> str:
    if c is None:
        return ""
    if c.hyperlink and c.hyperlink.target:
        return str(c.hyperlink.target)
    return str(c.value or "")


def to_date(v) -> dt.date | None:
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    s = str(v or "").strip()
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return dt.date(int(m[3]), int(m[2]), int(m[1]))
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", s[:10])
    if m:
        return dt.date(int(m[1]), int(m[2]), int(m[3]))
    return None


def txt(v) -> str:
    return re.sub(r"\s+", " ", str(v if v is not None else "")).strip()


SHEET_OK = re.compile(r"^(copy of )?(rep|repertorio)(\s*\d+)?$", re.I)


def parse_sheet(ws, file_name: str):
    rows = list(ws.iter_rows())
    # header row: A == Compositor
    hdr_idx = None
    for i, r in enumerate(rows):
        names = {txt(c.value).lower() for c in r[:4]}
        if "compositor" in names and "obra" in names:
            hdr_idx = i
            break
    if hdr_idx is None:
        return None
    hdr = {}
    for c in rows[hdr_idx]:
        k = txt(c.value).lower()
        if k and k not in hdr:
            hdr[k] = c.column - 1
    col_comp = hdr.get("compositor", 0)
    col_obra = hdr.get("obra", 1)
    col_link = hdr.get("link")
    col_yt = hdr.get("link youtube")

    nombre = txt(rows[0][0].value) or file_name
    fechas, zonas, ensambles = [], [], []
    fecha_desde = None
    for r in rows[:hdr_idx]:
        a = txt(r[0].value).lower()
        for c in r:
            if txt(c.value).lower().rstrip(":") == "ciudad/zona":
                nxt = r[c.column] if c.column < len(r) else None
                z = txt(nxt.value) if nxt is not None else ""
                if z and z not in zonas:
                    zonas.append(z)
        if a.startswith("fecha:"):
            d = to_date(r[1].value)
            if d:
                fechas.append(d)
        elif a.startswith("(fecha desde)"):
            fecha_desde = to_date(r[1].value)
        elif a == "ensambles":
            ensambles = [
                txt(c.value)
                for c in r[1:9]
                if txt(c.value) and txt(c.value).upper() not in ("REVISAR", "CONFIRMADO")
            ]
    if fecha_desde is None and fechas:
        fecha_desde = min(fechas)
    fecha_hasta = max(fechas) if fechas else fecha_desde

    works = []
    for r in rows[hdr_idx + 1 :]:
        comp = txt(r[col_comp].value)
        obra = txt(r[col_obra].value) if col_obra < len(r) else ""
        if comp.lower() == "total" or any(txt(c.value).lower() == "total" for c in r[:7]):
            continue
        if not obra or obra.lower().startswith("http"):
            continue  # sección (Sabado, Bises...), playlist o fila vacía
        if not comp and re.match(r"^\d{1,2}\s+de\s+\w+", obra, re.I):
            continue
        if comp.lower().startswith("http"):
            continue  # fila de sección con playlist (p. ej. '16 de agosto General Roca')
        link = ""
        if col_link is not None and col_link < len(r):
            link = cell_link(r[col_link])
        did = drive_id(link)
        works.append(
            {
                "compositor": comp,
                "titulo": obra,
                "drive_id": did,
                "link": link if did else "",
            }
        )
    return {
        "nombre_gira": nombre,
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta,
        "zonas": zonas,
        "ensambles": ensambles,
        "works": works,
    }


def infer_tipo(nombre: str) -> str:
    low = nombre.lower()
    if low.startswith("cf") or "camerata" in low:
        return "Camerata Filarmónica"
    return "Sinfónico"


def nomenclador(nombre: str) -> str:
    m = re.match(r"^\s*Sinf\s*(\d+)", nombre, re.I)
    if m:
        return f"Sinf {int(m[1]):02d}"
    m = re.match(r"^\s*CF\s*(Mar|Mon|Val)", nombre, re.I)
    if m:
        return f"CF {m[1].capitalize()}"
    return nombre[:40]


def fmt(d):
    return d.strftime("%d/%m/%Y") if d else ""


def iso(d):
    return d.isoformat() if d else None


def esc(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def title_key(t: str) -> str:
    t = re.sub(r"\(.*?\)", " ", t or "")
    t = re.sub(r"\b(arr|arreglo|op|no|nro|n)\b\.?", " ", strip_acc(t).lower())
    return norm(t)


def build_title_index():
    allo = json.loads(ALL_JSON.read_text(encoding="utf-8-sig"))["rows"]
    return [(o["id"], title_key(o["titulo"]), norm(o["comps"]).split()) for o in allo]


def title_match(idx, comp: str, titulo: str):
    tk = title_key(titulo)
    ck = set(norm(comp).split())
    if len(tk) < 6 or not ck:
        return None
    exact, loose = [], []
    for oid, ot, ocomp in idx:
        if not ot or not any(len(x) >= 3 and x in ck for x in ocomp):
            continue
        if ot == tk:
            exact.append(oid)
        elif len(ot) >= 8 and (ot in tk or tk in ot):
            loose.append(oid)
    if len(exact) == 1:
        return exact[0]
    if not exact and len(loose) == 1:
        return loose[0]
    return None


def main():
    tidx = build_title_index()
    # obras por drive id
    obras = json.loads(OBRAS_JSON.read_text(encoding="utf-16"))["rows"]
    by_drive = {}
    for o in obras:
        did = drive_id(o["link_drive"])
        if did:
            by_drive.setdefault(did, o["id"])

    files = sorted(SRC.rglob("REP - *.xlsx"))
    sheets_info = []
    programs = []
    for f in files:
        wb = openpyxl.load_workbook(lp(f))
        fname = re.sub(r"^REP - ", "", f.stem).strip()
        for ws in wb.worksheets:
            if not SHEET_OK.match(ws.title.strip()):
                continue
            if ws.title.strip().lower().startswith("copy of"):
                sheets_info.append({"file": f.name, "sheet": ws.title, "skip": "borrador Copy of Rep"})
                continue
            prog = parse_sheet(ws, fname)
            info = {"file": f.name, "sheet": ws.title}
            if prog is None:
                info["skip"] = "sin header Compositor"
                sheets_info.append(info)
                continue
            prog["file"] = f.name
            prog["sheet"] = ws.title
            prog["file_name_gira"] = fname
            programs.append(prog)
            info.update(
                nombre=prog["nombre_gira"],
                desde=fmt(prog["fecha_desde"]),
                hasta=fmt(prog["fecha_hasta"]),
                works=len(prog["works"]),
                with_drive=sum(1 for w in prog["works"] if w["drive_id"]),
            )
            sheets_info.append(info)

    # dedupe copies: skip 'Copy of' sheets when same (nombre, fecha_desde) as main, o sin obras
    final = []
    seen_prog = {}
    for p in sorted(programs, key=lambda p: (p["file"], p["sheet"].lower().startswith("copy"), p["sheet"])):
        if not p["works"] or p["fecha_desde"] is None:
            continue
        final.append(p)

    # mes_letra por orden cronológico dentro del mes
    final.sort(key=lambda p: (p["fecha_desde"], p["nombre_gira"]))
    month_count = defaultdict(int)
    for p in final:
        key = p["fecha_desde"].month
        p["mes_letra"] = f"{key:02d}{chr(ord('a') + month_count[key])}"
        month_count[key] += 1

    out_rows = []
    for p in final:
        zona = " - ".join(p["zonas"])
        tipo = infer_tipo(p["nombre_gira"])
        nom = nomenclador(p["nombre_gira"])
        ens = ";".join(p["ensambles"])
        for w in p["works"]:
            out_rows.append(
                {
                    "link_drive": f"https://drive.google.com/open?id={w['drive_id']}" if w["drive_id"] else "",
                    "nombre_gira": p["nombre_gira"],
                    "fecha_desde": fmt(p["fecha_desde"]),
                    "fecha_hasta": fmt(p["fecha_hasta"]),
                    "tipo": tipo,
                    "zona": zona,
                    "nomenclador": nom,
                    "mes_letra": p["mes_letra"],
                    "ensambles": ens,
                    "compositor": w["compositor"],
                    "titulo": w["titulo"],
                    "fuente": FUENTE,
                    "_drive_id": w["drive_id"],
                    "_fd": iso(p["fecha_desde"]),
                    "_fh": iso(p["fecha_hasta"]),
                    "_sheet": p["sheet"],
                    "_file": p["file"],
                }
            )

    fields = [
        "link_drive", "nombre_gira", "fecha_desde", "fecha_hasta", "tipo", "zona",
        "nomenclador", "mes_letra", "ensambles", "compositor", "titulo", "fuente",
    ]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(out_rows)

    # match
    ready, unmatched = [], []
    for r in out_rows:
        oid = by_drive.get(r["_drive_id"]) if r["_drive_id"] else None
        via = "drive"
        if not oid:
            oid = title_match(tidx, r["compositor"], r["titulo"])
            via = "titulo+compositor"
        if oid:
            ready.append({**r, "id_obra": oid, "via": via})
        else:
            motivo = "sin link Drive en columna Link" if not r["_drive_id"] else "drive id sin obra en obras.link_drive"
            unmatched.append({**r, "motivo": motivo})

    seen, deduped = set(), []
    for r in ready:
        k = (r["id_obra"], r["nombre_gira"], r["_fd"], FUENTE)
        if k in seen:
            continue
        seen.add(k)
        deduped.append(r)

    with OUT_UNMATCHED.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["anio", "gira", "hoja", "compositor", "titulo", "link_drive", "motivo"])
        for u in unmatched:
            w.writerow([2024, u["nombre_gira"], u["_sheet"], u["compositor"], u["titulo"], u["link_drive"], u["motivo"]])

    sql = [
        "-- Import legacy 2024 desde 'Partituras 2024' (hojas REP de cada gira)",
        f"-- Fuente: {FUENTE}",
        "-- Idempotente: evita duplicar (id_obra, nombre_gira, fecha_desde, fuente)",
        "BEGIN;",
    ]
    for r in deduped:
        sql.append(
            "INSERT INTO obras_repertorios_legacy "
            "(id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, "
            "tipo, zona, nomenclador, mes_letra, ensambles, fuente) SELECT "
            f"{r['id_obra']}, {esc(r['_drive_id'] if r['via'] == 'drive' else None)}, "
            f"{esc(r['link_drive'] if r['via'] == 'drive' else None)}, {esc(r['nombre_gira'])}, "
            f"{esc(r['_fd'])}::date, {esc(r['_fh'])}::date, {esc(r['tipo'])}, {esc(r['zona'])}, "
            f"{esc(r['nomenclador'])}, {esc(r['mes_letra'])}, {esc(r['ensambles'])}, {esc(FUENTE)} "
            "WHERE NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE "
            f"x.id_obra = {r['id_obra']} AND x.nombre_gira = {esc(r['nombre_gira'])} AND "
            f"x.fecha_desde IS NOT DISTINCT FROM {esc(r['_fd'])}::date AND x.fuente = {esc(FUENTE)});"
        )
    sql.append("COMMIT;")
    OUT_SQL.write_text("\n".join(sql) + "\n", encoding="utf-8")

    report = {
        "files_scanned": len(files),
        "sheets": sheets_info,
        "programs_with_works": len(final),
        "works_total": len(out_rows),
        "with_drive_link": sum(1 for r in out_rows if r["_drive_id"]),
        "matched_rows": len(ready),
        "matched_via_drive": sum(1 for r in ready if r["via"] == "drive"),
        "matched_via_titulo": sum(1 for r in ready if r["via"] != "drive"),
        "deduped_inserts": len(deduped),
        "unmatched": len(unmatched),
    }
    OUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    for s in sheets_info:
        print(s)
    print({k: v for k, v in report.items() if k != "sheets"})
    print("--- unmatched")
    for r in ready:
        if r["via"] != "drive":
            print("TITLE-MATCH", r["id_obra"], r["compositor"], "|", r["titulo"][:50])
    for u in unmatched:
        print(u["nombre_gira"][:35], "|", u["compositor"], "|", u["titulo"][:50], "|", u["motivo"])


if __name__ == "__main__":
    main()
