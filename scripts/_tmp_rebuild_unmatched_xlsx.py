"""Reconstruye obras_legacy_NO_matcheadas.xlsx excluyendo lo ya resuelto por el lote Drive.

Uso: python scripts/_tmp_rebuild_unmatched_xlsx.py
Entradas: ~/Downloads/obras_legacy_NO_matcheadas.xlsx, supabase/.temp/unmatched_drive_rows.json,
          supabase/.temp/unmatched_drive_batch_report.json. Sin credenciales.
"""
import json, os, re, sys, unicodedata, shutil, collections
import openpyxl

DL = os.path.join(os.path.expanduser("~"), "Downloads")
SRC = os.path.join(DL, "obras_legacy_NO_matcheadas.xlsx")
TMP = os.path.join("supabase", ".temp")
rows58 = json.load(open(os.path.join(TMP, "unmatched_drive_rows.json"), encoding="utf8"))
rep = json.load(open(os.path.join(TMP, "unmatched_drive_batch_report.json"), encoding="utf8"))


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def drive_id(link):
    m = re.search(r"[?&]id=([\w-]+)|/d/([\w-]+)|/folders/([\w-]+)", link or "")
    return next((g for g in m.groups() if g), None) if m else None


fail_titles = {norm(f["titulo"]) for f in rep["legacy"]["fail"]}
# filas del lote ya resueltas = las 58 menos las fallidas
resolved = set()
for r in rows58:
    if norm(r["titulo"]) in fail_titles:
        continue
    resolved.add((r["anio"], norm(r["titulo"]), r["id"]))

wb = openpyxl.load_workbook(SRC)
ws = wb["Todas"]
header = [c.value for c in ws[1]]
all_rows = [list(r) for r in ws.iter_rows(min_row=2, values_only=True)]
ix = {h: i for i, h in enumerate(header)}

keep, dropped = [], []
for r in all_rows:
    key = (r[ix["anio"]], norm(r[ix["titulo"]]), drive_id(r[ix["link_drive"]]))
    (dropped if key in resolved else keep).append(r)

# actualizar motivo de los que quedan por fallo del lote
fail_motivo = {(norm(f["titulo"])): f["motivo"] for f in rep["legacy"]["fail"]}
for r in keep:
    m = fail_motivo.get(norm(r[ix["titulo"]]))
    if m and r[ix["link_drive"]]:
        r[ix["motivo"]] = "Lote Drive 2026-11-02: " + m

keep.sort(key=lambda r: (r[ix["anio"]], r[ix["gira"]] or "", r[ix["titulo"]] or ""))
out = wb.__class__()
out.remove(out.active)
widths = {k: d.width for k, d in ws.column_dimensions.items() if d.width}
by_year = collections.OrderedDict([("Todas", keep)])
for y in sorted({r[ix["anio"]] for r in keep}):
    by_year[str(y)] = [r for r in keep if r[ix["anio"]] == y]
for name, rs in by_year.items():
    s = out.create_sheet(name)
    s.append(header)
    for r in rs:
        s.append(r)
    for col, w in widths.items():
        s.column_dimensions[col].width = w
    s.freeze_panes = "A2"
    s.auto_filter.ref = s.dimensions
    for c in s[1]:
        src = ws[1][c.column - 1]
        from copy import copy
        c.font, c.fill, c.alignment = copy(src.font), copy(src.fill), copy(src.alignment)

dst = SRC
try:
    open(SRC, "ab").close()
except PermissionError:
    dst = SRC[:-5] + "_actualizado.xlsx"
out.save(dst)
print("origen", len(all_rows), "quitadas", len(dropped), "quedan", len(keep), "->", dst)
for name, rs in by_year.items():
    print(name, len(rs))
print("con link drive:", sum(1 for r in keep if r[ix["link_drive"]]))
print("motivos:", collections.Counter((r[ix["anio"]], (r[ix["motivo"]] or "")[:45]) for r in keep).most_common(12))
