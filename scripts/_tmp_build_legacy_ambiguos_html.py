"""Genera Downloads/legacy_match_ambiguos.html (+ .json hermano) con candidatos estructurados.

Fuentes de filas ambiguas:
  - Downloads/obras_legacy_sin_match.csv (motivo contiene 'ambiguo')
  - Downloads/obras_legacy_2024_sin_match.csv (si tuviera)
Candidatos: se recalculan con el matcher de _tmp_match_legacy_2022.py (hasta 10) y se
enriquecen con titulo / compositores / link_drive de la tabla obras.

Metadata de gira (fechas, zona, tipo...) sale de GIRAS en _tmp_sql_legacy_2022.py.
Uso: python scripts/_tmp_build_legacy_ambiguos_html.py
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import _tmp_match_legacy_2022 as M  # noqa: E402

DL = Path(r"c:\Users\marti\Downloads")
SOURCES = [DL / "obras_legacy_sin_match.csv", DL / "obras_legacy_2024_sin_match.csv"]
OUT_HTML = DL / "legacy_match_ambiguos.html"
OUT_JSON = DL / "legacy_match_ambiguos_data.json"
FUENTE = "Giras 2022 Rep keyword-match (ambiguos resueltos manualmente)"
MAX_CANDS = 10


def load_giras_meta():
    src = (HERE / "_tmp_sql_legacy_2022.py").read_text(encoding="utf-8")
    head = src.split("def q(")[0]
    ns: dict = {}
    exec(head, ns)  # define GIRAS (sin ejecutar main)
    return ns["GIRAS"]


def meta_for(gira: str, giras):
    for key, m in giras:
        if key in gira:
            return m
    return None


def main():
    giras = load_giras_meta()
    # Gira 2022 sin entrada en _tmp_sql_legacy_2022.py (no tenía matches claros)
    giras.append(
        (
            "Marzo 23-26",
            dict(nombre="Marzo 23-26 - Bariloche-Dina Huapi - Solo cuerdas", d1="2022-03-23", d2="2022-03-26",
                 tipo="Ensamble", zona="Andina", nom=None, mes="03b", ens="Cuerdas"),
        )
    )
    obras = M.parse_obras_catalog()
    by_id = {o["id"]: o for o in obras}

    rows = []
    for p in SOURCES:
        if not p.exists():
            continue
        for r in csv.DictReader(p.open(encoding="utf-8-sig")):
            if "ambig" in (r.get("motivo") or "").lower():
                rows.append(r)

    items = []
    for i, r in enumerate(rows):
        cands = M.best_matches(r["compositor"], r["titulo"], obras, limit=MAX_CANDS)
        meta = meta_for(r["gira"], giras) if str(r.get("anio")) == "2022" else None
        items.append(
            {
                "key": f"{r['anio']}|{r['gira']}|{r['compositor']}|{r['titulo']}",
                "anio": int(r["anio"]),
                "gira": r["gira"],
                "hoja": r.get("hoja", ""),
                "compositor": r["compositor"],
                "titulo": r["titulo"],
                "link_drive_fuente": r.get("link_drive", "") or "",
                "motivo": r.get("motivo", ""),
                "meta": (
                    {
                        "nombre_gira": meta["nombre"],
                        "fecha_desde": meta["d1"],
                        "fecha_hasta": meta["d2"],
                        "tipo": meta["tipo"],
                        "zona": meta["zona"],
                        "nomenclador": meta["nom"],
                        "mes_letra": meta["mes"],
                        "ensambles": meta["ens"],
                    }
                    if meta
                    else None
                ),
                "candidatos": [
                    {
                        "id": o["id"],
                        "titulo": re.sub(r"<[^>]+>", "", o["titulo"]).replace("\n", " / "),
                        "compositores": re.sub(r"<[^>]+>", "", o["compositores"]),
                        "score": round(sc, 2),
                        "link_drive": o["link_drive"],
                    }
                    for sc, o in cands
                ],
            }
        )

    data = {"fuente": FUENTE, "total": len(items), "items": items}
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    inline = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = (HERE / "_tmp_legacy_ambiguos_template.html").read_text(encoding="utf-8")
    OUT_HTML.write_text(html.replace("/*__DATA__*/null", inline), encoding="utf-8")
    print("items", len(items), "->", OUT_HTML)
    print("sin meta:", [x["gira"] for x in items if x["anio"] == 2022 and not x["meta"]])
    print("candidatos vacios:", sum(1 for x in items if not x["candidatos"]))


if __name__ == "__main__":
    main()
