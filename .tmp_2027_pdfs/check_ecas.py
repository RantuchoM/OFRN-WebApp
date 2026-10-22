import json
from pathlib import Path
g = json.loads(Path("giras2027.json").read_text(encoding="utf-8"))
e = [x for x in json.loads(Path("ensambles2027.json").read_text(encoding="utf-8")) if x["ensamble"] == "ECAS"][0]
print("ECAS home", e["id_localidad"], e["localidad"])
for p in g:
    locs = p.get("localias") or []
    ids = [l["id"] for l in locs]
    fuera = e["id_localidad"] not in ids if ids else None
    fuentes = p.get("fuentes") or []
    fam = any(f.get("tipo") == "FAMILIA" and f.get("valor_texto") == "Cuerdas" for f in fuentes)
    ens = any(f.get("tipo") == "ENSAMBLE" and f.get("valor_id") in (1, 226257) for f in fuentes)
    print(p["id"], p["nombre_gira"][:36], "ids", ids, "fuera?", fuera, "famCuerdas", fam, "ensECAS/CFMar", ens)
