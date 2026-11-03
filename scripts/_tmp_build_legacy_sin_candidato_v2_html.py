"""Genera Downloads/legacy_match_sin_candidato_v2.html (+ _data.json) con las filas que SIGUEN sin obra_id.

Fuente de filas : Downloads/legacy_match_sin_candidato_data.json (66 -> 64 items del xlsx original, que ya no esta en Downloads)
Se descartan    : las ya resueltas en Downloads/legacy_match_sin_candidato_decisiones.json (+ *_auto_v2_decisiones.json)
                  cuyo id_obra existe en el catalogo vivo.
Catalogo        : supabase/.temp/obras_catalog_live.json (`npx supabase db query --linked -o json -f supabase/.temp/obras_catalog_live.sql`)
Sugerencias     : top-3 (score >= 0.5) de _tmp_rematch_sin_candidato.score por fila.

Export del HTML -> legacy_match_sin_candidato_v2_decisiones.json; aplicar con:
  node scripts/_tmp_apply_legacy_sin_candidato.mjs <json> --sql-out=supabase/.temp/apply_sin_candidato_v3.sql
  npx supabase db query --linked -f supabase/.temp/apply_sin_candidato_v3.sql
(el .env actual no tiene SUPABASE_SERVICE_ROLE_KEY; por eso el modo --sql-out)
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import _tmp_rematch_sin_candidato as R  # noqa: E402

DL = R.DL
TEMPLATE = HERE / "_tmp_legacy_sin_candidato_template.html"
OUT_HTML = DL / "legacy_match_sin_candidato_v2.html"
OUT_JSON = DL / "legacy_match_sin_candidato_v2_data.json"

cat = R.load_catalog()
ids = {o["id"] for o in cat}
data = json.loads(R.DATA.read_text(encoding="utf-8"))
decided = set()
for p in [DL / "legacy_match_sin_candidato_decisiones.json", DL / "legacy_match_sin_candidato_auto_v2_decisiones.json"]:
    if not p.exists():
        continue
    for d in json.loads(p.read_text(encoding="utf-8-sig"))["decisiones"]:
        if d.get("accion") == "match" and int(d.get("id_obra_elegida") or 0) in ids:
            decided.add((d["anio"], d["gira"], d["compositor"], d["titulo"]))

items = []
for it in data["items"]:
    if (it["anio"], it["gira"], it["compositor"], it["titulo"]) in decided:
        continue
    sc = sorted(((R.score(it, o), o["id"]) for o in cat), reverse=True)[:3]
    it = {**it, "sugeridos": [[oid, round(s, 2)] for s, oid in sc if s >= 0.5]}
    items.append(it)

out = {"fuente": "Legacy sin candidato v2 (ingreso manual de id_obra)", "total": len(items), "items": items}
OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
catalogo = [[o["id"], o["t"].replace("\n", " / "), o["c"], int(o["d"])] for o in cat]
inline = json.dumps({**out, "catalogo": catalogo}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
OUT_HTML.write_text(TEMPLATE.read_text(encoding="utf-8").replace("/*__DATA__*/null", inline), encoding="utf-8")
print("restantes:", len(items), "| catalogo:", len(catalogo), "->", OUT_HTML)
print("sin meta:", [i["titulo"] for i in items if not i["meta"]])
