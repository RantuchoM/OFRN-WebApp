"""Genera Downloads/legacy_match_sin_candidato_auto_v2_decisiones.json con los rematch de alta confianza
(mismo esquema que el export del HTML) para aplicar con:
  node scripts/_tmp_apply_legacy_sin_candidato.mjs <json> --sql-out=supabase/.temp/apply_sin_candidato_v2.sql
  npx supabase db query --linked -f supabase/.temp/apply_sin_candidato_v2.sql
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
DL = Path(r"c:\Users\marti\Downloads")
items = json.loads((DL / "legacy_match_sin_candidato_data.json").read_text(encoding="utf-8"))["items"]

# (substring de titulo, substring de gira (opcional), compositor contiene (opcional)) -> id_obra
AUTO = [
    ("Edgar. Preludio", None, 3788),
    ("Lin-Calel", None, 3793),
    ("Manon. Toi", None, 3789),
    ("Tannhauser. Gepriesen", None, 3792),
    ("Werther. Pourquoi", None, 3791),
    ("Serenata para Cuerdas en Mi Mayor, Op. 22", "FIMBA", 3787),
    ("Serenata para cuerdas en Mi mayor, Op. 22", "Mayo 11-14", 3787),
    ("Tarde em Itapu", None, 1270),
    ("Momentos", "Viedma", 2877),
    ("Mamma M", "5saltos", 1308),
    ("Mamma mia", "5saltos", 1308),
    ("Sinfon\u00eda para Cuerdas, Op. 68", None, 2529),
    ("The Carnival of Venice", None, 2991),
]

out = []
for sub, gsub, oid in AUTO:
    hits = [i for i in items if sub.lower() in i["titulo"].lower() and (gsub is None or gsub in i["gira"])]
    if len(hits) != 1:
        print("OJO", sub, len(hits))
    for i in hits:
        m = i["meta"]
        out.append(
            {
                "anio": i["anio"], "gira": i["gira"], "hoja": i["hoja"], "compositor": i["compositor"], "titulo": i["titulo"],
                "link_drive_fuente": i["link_drive_fuente"], "id_obra_elegida": oid, "titulo_obra": "(auto-rematch v2)",
                "accion": "match", **{k: m.get(k) for k in ("nombre_gira", "fecha_desde", "fecha_hasta", "tipo", "zona", "nomenclador", "mes_letra", "ensambles", "fuente")},
            }
        )
p = DL / "legacy_match_sin_candidato_auto_v2_decisiones.json"
p.write_text(json.dumps({"fuente": "Legacy sin candidato - auto rematch v2", "decisiones": out}, ensure_ascii=False, indent=2), encoding="utf-8")
print(len(out), "->", p)
