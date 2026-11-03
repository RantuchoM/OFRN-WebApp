import sys, json, re
from collections import defaultdict
sys.path.insert(0, ".")
import _tmp_build_legacy_2024 as b
import openpyxl
files = sorted(b.SRC.rglob("REP - *.xlsx"))
programs=[]
for f in files:
    wb = openpyxl.load_workbook(b.lp(f))
    fname = re.sub(r"^REP - ", "", f.stem).strip()
    for ws in wb.worksheets:
        if not b.SHEET_OK.match(ws.title.strip()) or ws.title.strip().lower().startswith("copy of"): continue
        p = b.parse_sheet(ws, fname)
        if p is None: continue
        p["file"]=f.name; p["sheet"]=ws.title; programs.append(p)
final=[p for p in sorted(programs,key=lambda p:(p["file"],p["sheet"].lower().startswith("copy"),p["sheet"])) if p["works"] and p["fecha_desde"]]
final.sort(key=lambda p:(p["fecha_desde"],p["nombre_gira"]))
mc=defaultdict(int)
meta={}
for p in final:
    k=p["fecha_desde"].month
    p["mes_letra"]=f"{k:02d}{chr(ord('a')+mc[k])}"; mc[k]+=1
    meta[p["nombre_gira"]]=dict(fecha_desde=p["fecha_desde"].isoformat(), fecha_hasta=p["fecha_hasta"].isoformat(), tipo=b.infer_tipo(p["nombre_gira"]), zona=" - ".join(p["zonas"]), nomenclador=b.nomenclador(p["nombre_gira"]), mes_letra=p["mes_letra"], ensambles=";".join(p["ensambles"]))
json.dump(meta,open(r"..\supabase\.temp\legacy_gira_meta_2024.json","w",encoding="utf8"),ensure_ascii=False,indent=1)
for k,v in meta.items():
    if re.search(r"CFMar 03|CFMon 03|CFMon 05|Pre-Laborde|CFVal 02|Sinf 09",k): print(k,v)
