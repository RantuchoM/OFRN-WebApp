from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

matched = {
    "1_-oJnGe5S0Jd7QBdm7-yKkH5shOkVpF_": 2047,
    "11hQ_Lj6s8os2xPsDVG6jCVMrejvvTZeS": 2608,
    "12r2TQy1B_o1DlTwfmurmbrTiolhJl293": 2988,
    "17J4Zu_x-c9v3pNdD_mJqAtz24JrbG22S": 2327,
    "1Bc_fyQvgSz1Bhz94Zf82FfkKCbYQWum6": 2697,
    "1Bi2TmbjvWw8c1YtAIuRCE4wybq_r6GwM": 2320,
    "1C1GzWLp1hNSI6eLxNmR3Yg7z-CPGXan3": 2612,
    "1EOTVbw20moKHXxQn-84qi8t2NKDnF-xh": 2812,
    "1F98OqWAJIDOfBdlTCueVPwXlba1r0O4v": 2232,
    "1HDFU3xz_oojBg98FsX3fs_SVNzogoK3l": 1218,
    "1HGNJLCbMoaCSBeQeAhwip7QrAhtGrsb-": 1213,
    "1HJ-UyDGEaTbRVFAJbE0oLELCvm75xL7x": 1215,
    "1HJKswZXYA4OClYIt-o-yVlyqOpKrgp1E": 1217,
    "1HKSfUm1Hkv3LeLEDE_6naibUBmdNxe7v": 1216,
    "1HRsl-ySix_4XOdumlhVhTVWMxvL9mg6d": 1214,
    "1IkjCFrlNqnh7PgSkLBZMmqDKe_C5b3pC": 3096,
    "1IoFfZu2VFmW4zlzQpZXf_oxWPUDshniD": 3033,
    "1K6pg_Zn0vg9khLbBSeW3pUSS3tktU0s9": 2424,
    "1mf2_UL5v9ysC4pRM3kngijO5BdkDV-z-": 2830,
    "1od6l5gWlHik91rPvE9OBDmLsYvf6iZ7z": 2300,
    "1omB4VeiArwTrPohnHN31tp51wR_NQOSQ": 2461,
    "1ovim6jnnBguebfy9TxV153HU5h_cAW2i": 2331,
    "1rTeTq0_QhbTkLACyQp8TLr-M6dvc_E5D": 2269,
    "1SKTU4D1YZFlgmFxoqPgYIoKdQjnEEAsi": 2733,
    "1TZafuCOzKHL3NghVOD0XMPuEP4pswzFB": 1993,
    "1UlM1a_FnLmvv8ErBI7RL_RVigdgvlz4q": 2904,
    "1WXntdrQe4E4RJhKNkKPXQXt9oZouMYDw": 2716,
    "1x3triQhqhCljRol5zrD36-kVN77-MBXu": 2829,
    "1XJTQwVCz3HpU34otlFqHI_woRW_3oChT": 2620,
    "1XY4zURUaI2RHFOPlOC0fdDtzpanMt8FX": 2442,
    "1yxPt-D5lcgQRUsi8UcV72X75h6IdFZna": 2297,
    "1Z61cC1YHiijU06UL60wcEsL_usjttVEx": 2048,
    "1Zfg0fhrM9QS8a8sO4C0wMSd0o_hFlR1I": 2046,
    "1ZRNI_k3yzblEB1YujAg2xpikj_SlQTnx": 2045,
}


def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def to_iso(dmy):
    dmy = (dmy or "").strip()
    if not dmy:
        return None
    d, m, y = dmy.split("/")
    return f"{y}-{m.zfill(2)}-{d.zfill(2)}"


rows = list(
    csv.DictReader(
        Path(r"c:\Users\marti\Downloads\giras_orquesta_limpio_2023.csv").open(
            encoding="utf-8-sig"
        )
    )
)
ready = []
unmatched = []
for r in rows:
    m = re.search(r"[-\w]{25,}", r["link_drive"] or "")
    did = m.group(0) if m else None
    oid = matched.get(did)
    if not oid:
        unmatched.append(r)
        continue
    ready.append(
        {
            **r,
            "drive_folder_id": did,
            "id_obra": oid,
            "fecha_desde_iso": to_iso(r["fecha_desde"]),
            "fecha_hasta_iso": to_iso(r["fecha_hasta"]),
        }
    )

seen = set()
deduped = []
for r in ready:
    key = (r["id_obra"], r["nombre_gira"], r["fecha_desde_iso"])
    if key in seen:
        continue
    seen.add(key)
    deduped.append(r)

sql_lines = [
    "-- Import legacy 2023 from GIRAS-SINCRONIZACIÓN columna Rep",
    "-- Fuente: hojas Rep 2023 (Gira 1..12 + FIMBA)",
    "-- Idempotente: evita duplicar mismo (id_obra, nombre_gira, fecha_desde, fuente)",
    "BEGIN;",
]

for r in deduped:
    zona_sql = esc(r["zona"]) if r.get("zona") else "NULL"
    ens_sql = esc(r["ensambles"]) if r.get("ensambles") else "NULL"
    sql_lines.append(
        "INSERT INTO obras_repertorios_legacy "
        "(id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, "
        "tipo, zona, nomenclador, mes_letra, ensambles, fuente) "
        "SELECT "
        f"{r['id_obra']}, {esc(r['drive_folder_id'])}, {esc(r['link_drive'])}, "
        f"{esc(r['nombre_gira'])}, {esc(r['fecha_desde_iso'])}::date, "
        f"{esc(r['fecha_hasta_iso'])}::date, {esc(r['tipo'])}, {zona_sql}, "
        f"{esc(r['nomenclador'])}, {esc(r['mes_letra'])}, {ens_sql}, {esc(r['fuente'])} "
        "WHERE NOT EXISTS ("
        "SELECT 1 FROM obras_repertorios_legacy x WHERE "
        f"x.id_obra = {r['id_obra']} AND x.nombre_gira = {esc(r['nombre_gira'])} AND "
        f"x.fecha_desde IS NOT DISTINCT FROM {esc(r['fecha_desde_iso'])}::date AND "
        f"x.fuente = {esc(r['fuente'])}"
        ");"
    )

sql_lines.append("COMMIT;")
out = Path(
    r"c:\Proyectos\OFRN-WebApp\supabase\.temp\import_obras_repertorios_legacy_2023.sql"
)
out.write_text("\n".join(sql_lines) + "\n", encoding="utf-8")

meta = {
    "csv_rows": len(rows),
    "matched_rows": len(ready),
    "deduped_inserts": len(deduped),
    "unmatched": [
        {
            "nombre_gira": u["nombre_gira"],
            "compositor": u.get("compositor"),
            "titulo": u.get("titulo"),
            "link_drive": u["link_drive"],
        }
        for u in unmatched
    ],
    "programs": sorted({r["nombre_gira"] for r in deduped}),
}
Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\legacy_import_rows_2023.json").write_text(
    json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(meta, ensure_ascii=False, indent=2))
print("SQL", out, "bytes", out.stat().st_size)
