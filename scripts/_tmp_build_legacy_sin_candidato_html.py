"""Genera Downloads/legacy_match_sin_candidato.html (+ _data.json hermano).

Filas: Downloads/obras_legacy_NO_matcheadas_actualizado.xlsx (fallback obras_legacy_NO_matcheadas.xlsx),
hoja "Todas", EXCLUYENDO las ya cubiertas por legacy_match_ambiguos_data.json / _decisiones.json
(mismo key: anio|gira|compositor|titulo). Ingreso manual de id_obra con buscador sobre catalogo
inlineado de obras (offline).

Metadata de gira (fechas/zona/tipo...):
  - 2022: GIRAS en _tmp_sql_legacy_2022.py (+ Marzo 23-26 BRC-Dina Huapi, definida a mano)
  - 2023: Gira FIMBA 2023 - Pennisi (definida a mano, ver gira_fimba_2023.csv)
  - 2024: supabase/.temp/legacy_gira_meta_2024.json (match por nombre de gira)

Uso: python scripts/_tmp_build_legacy_sin_candidato_html.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import openpyxl

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

import _tmp_match_legacy_2022 as M  # noqa: E402

DL = Path(r"c:\Users\marti\Downloads")
XLSX_CANDIDATES = [DL / "obras_legacy_NO_matcheadas_actualizado.xlsx", DL / "obras_legacy_NO_matcheadas.xlsx"]
AMB_DATA = DL / "legacy_match_ambiguos_data.json"
AMB_DEC = DL / "legacy_match_ambiguos_decisiones.json"
META_2024 = ROOT / "supabase" / ".temp" / "legacy_gira_meta_2024.json"
OUT_HTML = DL / "legacy_match_sin_candidato.html"
OUT_JSON = DL / "legacy_match_sin_candidato_data.json"
TEMPLATE = HERE / "_tmp_legacy_sin_candidato_template.html"

FUENTES = {
    2022: "Giras 2022 Rep keyword-match (sin candidato, manual)",
    2023: "SINCRONIZACIÓN Giras Rep 2023",
    2024: "Partituras 2024 Rep",
}


def load_giras_2022():
    src = (HERE / "_tmp_sql_legacy_2022.py").read_text(encoding="utf-8")
    ns: dict = {}
    exec(src.split("def q(")[0], ns)
    giras = list(ns["GIRAS"])
    giras.append(
        (
            "Marzo 23-26",
            dict(nombre="Marzo 23-26 - Bariloche-Dina Huapi - Solo cuerdas", d1="2022-03-23", d2="2022-03-26",
                 tipo="Ensamble", zona="Andina", nom=None, mes="03b", ens="Cuerdas"),
        )
    )
    return giras


def meta_2022(gira, giras):
    for key, m in giras:
        if key in gira:
            return {
                "nombre_gira": m["nombre"], "fecha_desde": m["d1"], "fecha_hasta": m["d2"], "tipo": m["tipo"],
                "zona": m["zona"], "nomenclador": m["nom"], "mes_letra": m["mes"], "ensambles": m["ens"],
            }
    return None


META_2023 = {
    "Gira FIMBA 2023 - Pennisi - OFRN": {
        "nombre_gira": "Gira FIMBA 2023 - Pennisi - OFRN", "fecha_desde": "2023-05-27", "fecha_hasta": "2023-05-27",
        "tipo": "Ensamble", "zona": "Bariloche", "nomenclador": "FIMBA Pennisi-OFRN", "mes_letra": "05",
        "ensambles": "ECAS",
    }
}


def main():
    xlsx = next((p for p in XLSX_CANDIDATES if p.exists()), None)
    if not xlsx:
        raise SystemExit("No se encontró el xlsx de NO matcheadas en Downloads")
    wb = openpyxl.load_workbook(xlsx)
    ws = wb["Todas"] if "Todas" in wb.sheetnames else wb.worksheets[0]
    hdr = [c.value for c in ws[1]]
    rows = [dict(zip(hdr, [c.value for c in r])) for r in ws.iter_rows(min_row=2)]
    rows = [r for r in rows if r.get("titulo")]
    print("xlsx:", xlsx.name, "filas:", len(rows))

    kf = lambda r: f"{r['anio']}|{r['gira']}|{r['compositor'] or ''}|{r['titulo']}"  # noqa: E731
    amb_keys = {i["key"] for i in json.loads(AMB_DATA.read_text(encoding="utf-8"))["items"]}
    dec = json.loads(AMB_DEC.read_text(encoding="utf-8-sig"))["decisiones"] if AMB_DEC.exists() else []
    dec_keys = {f"{d['anio']}|{d['gira']}|{d['compositor']}|{d['titulo']}" for d in dec}
    excluidas = [r for r in rows if kf(r) in amb_keys or kf(r) in dec_keys]
    rows = [r for r in rows if kf(r) not in amb_keys and kf(r) not in dec_keys]
    print("excluidas por ambiguos:", len(excluidas), "-> restantes:", len(rows))
    left_amb = [r for r in rows if "ambig" in (r.get("motivo") or "").lower()]
    for r in left_amb:
        print("  OJO motivo ambiguo no cubierto:", kf(r), "|", r["motivo"][:60])

    giras22 = load_giras_2022()
    meta24 = json.loads(META_2024.read_text(encoding="utf-8"))

    live = ROOT / "supabase" / ".temp" / "obras_catalog_raw.json"  # `supabase db query --linked -o json` (catalogo actual)
    if live.exists():
        catalogo = [
            [r["id"], r["t"].replace("\n", " / "), r["c"] or "", int(r["d"])]
            for r in json.loads(live.read_text(encoding="utf-8-sig"))["rows"]
        ]
        print("catalogo: BD linked", len(catalogo))
    else:
        obras = M.parse_obras_catalog()
        catalogo = [
            [o["id"], re.sub(r"<[^>]+>", "", o["titulo"]).replace("\n", " / "),
             re.sub(r"<[^>]+>", "", o["compositores"] or ""), 1 if o.get("link_drive") else 0]
            for o in obras
        ]
        print("catalogo: dump MCP viejo", len(catalogo))

    items, seen, sin_meta = [], {}, []
    for r in rows:
        anio = int(r["anio"])
        gira = r["gira"]
        if anio == 2022:
            meta = meta_2022(gira, giras22)
        elif anio == 2023:
            meta = META_2023.get(gira)
        else:
            m = meta24.get(gira)
            meta = (
                {"nombre_gira": gira, **{k: m.get(k) for k in ("fecha_desde", "fecha_hasta", "tipo", "zona", "nomenclador", "mes_letra", "ensambles")}}
                if m
                else None
            )
        if meta:
            meta = {**meta, "fuente": FUENTES[anio]}
        else:
            sin_meta.append(gira)
        base = kf(r)
        n = seen.get(base, 0)
        seen[base] = n + 1
        key = base if n == 0 else f"{base}|#{n + 1}"
        items.append(
            {
                "key": key,
                "anio": anio,
                "gira": gira,
                "hoja": r.get("hoja") or "",
                "compositor": r.get("compositor") or "",
                "titulo": r["titulo"],
                "link_drive_fuente": r.get("link_drive") or "",
                "motivo": r.get("motivo") or "",
                "meta": meta,
            }
        )

    data = {"fuente": "Legacy sin candidato (ingreso manual de id_obra)", "total": len(items), "items": items}
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    payload = {**data, "catalogo": catalogo}
    inline = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8")
    OUT_HTML.write_text(html.replace("/*__DATA__*/null", inline), encoding="utf-8")
    print("items", len(items), "catalogo", len(catalogo), "->", OUT_HTML)
    print("sin meta:", sorted(set(sin_meta)))


if __name__ == "__main__":
    main()
