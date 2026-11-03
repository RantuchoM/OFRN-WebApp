"""Genera supabase/.temp/import_obras_repertorios_legacy_2022.sql desde obras_legacy_2022_matcheadas.csv.

Fechas/zona/tipo se infieren del nombre de la carpeta de cada gira (xlsx Giras 2022).
link_drive / drive_folder_id se toman de obras.link_drive en el propio SQL.
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

CSV_IN = Path(r"c:\Users\marti\Downloads\obras_legacy_2022_matcheadas.csv")
SQL_OUT = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\import_obras_repertorios_legacy_2022.sql")
FUENTE = "Giras 2022 Rep keyword-match"

SINF = "Cuerdas;Maderas;Bronces;Percusión"
# (substring en columna gira) -> metadata
GIRAS = [
    ("Alto Valle, Marzo 9-12", dict(nombre="Marzo 9-12 - Alto Valle - Ópera a la carta", d1="2022-03-09", d2="2022-03-12", tipo="Sinfónico", zona="Alto Valle", nom="Gira 1", mes="03a", ens=SINF)),
    ("Mayo 11-14", dict(nombre="Mayo 11-14 - Cipolletti - Cuerdas+Perc", d1="2022-05-11", d2="2022-05-14", tipo="Ensamble", zona="Alto Valle", nom="Gira 3", mes="05a", ens="Cuerdas;Percusión")),
    ("GIRA FIMBA 2022", dict(nombre="Gira FIMBA 2022", d1="2022-05-25", d2="2022-05-28", tipo="Ensamble", zona="Andina", nom="FIMBA 2022", mes="05b", ens="Cuerdas;Percusión")),
    ("Junio 15-18", dict(nombre="Junio 15-18 - Viedma - Solo cuerdas", d1="2022-06-15", d2="2022-06-18", tipo="Ensamble", zona="Atlántica", nom="Gira 4", mes="06", ens="Cuerdas")),
    ("Julio 6-9", dict(nombre="Julio 6-9 - Valle Medio - Vientos y Percusión", d1="2022-07-06", d2="2022-07-09", tipo="Ensamble", zona="Alto Valle", nom="Gira 5", mes="07", ens="Maderas;Bronces;Percusión")),
    ("Agosto 24-27", dict(nombre="Agosto 24-27 - Cipolletti - Completa", d1="2022-08-24", d2="2022-08-27", tipo="Sinfónico", zona="Alto Valle", nom="Gira 6", mes="08", ens=SINF)),
    ("Septiembre 14-17", dict(nombre="Septiembre 14-17 - Bariloche", d1="2022-09-14", d2="2022-09-17", tipo="Sinfónico", zona="Andina", nom="Gira 7", mes="09a", ens=SINF)),
    ("Septiembre 28-01", dict(nombre="Septiembre 28 - Octubre 1 - Cipolletti", d1="2022-09-28", d2="2022-10-01", tipo="Sinfónico", zona="Alto Valle", nom="Gira 7b", mes="09b", ens=SINF)),
    ("Octubre 13-16, CCK", dict(nombre="Octubre 13-16 - CCK Buenos Aires - Completa", d1="2022-10-13", d2="2022-10-16", tipo="Sinfónico", zona="Buenos Aires", nom="Gira 8", mes="10a", ens=SINF)),
    ("Viedma, Octubre 26-29", dict(nombre="Octubre 26-29 - Viedma - Completa", d1="2022-10-26", d2="2022-10-29", tipo="Sinfónico", zona="Atlántica", nom="Gira 8b", mes="10b", ens=SINF)),
    ("Noviembre 9-12", dict(nombre="Noviembre 9-12 - Cinco Saltos-Catriel-Regina - Vientos y Percusión", d1="2022-11-09", d2="2022-11-12", tipo="Ensamble", zona="Alto Valle", nom="Gira 9", mes="11a", ens="Maderas;Bronces;Percusión")),
    ("Noviembre 23-26", dict(nombre="Noviembre 23-26 - Cipolletti-Fernández Oro - Cuerdas", d1="2022-11-23", d2="2022-11-26", tipo="Ensamble", zona="Alto Valle", nom="Gira 9b", mes="11b", ens="Cuerdas")),
    ("Diciembre 7-10", dict(nombre="Diciembre 7-10 - Bariloche-El Bolsón", d1="2022-12-07", d2="2022-12-10", tipo="Sinfónico", zona="Andina", nom="Gira 10", mes="12", ens=SINF)),
    ("Abril 27-30", dict(nombre="Abril 27-30 - Viedma - Vientos y Percusión", d1="2022-04-27", d2="2022-04-30", tipo="Ensamble", zona="Atlántica", nom="Gira 2", mes="04", ens="Maderas;Bronces;Percusión")),
]


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def meta_for(gira: str) -> dict:
    for key, m in GIRAS:
        if key in gira:
            return m
    raise SystemExit(f"Gira sin metadata: {gira!r}")


def main():
    rows = list(csv.DictReader(CSV_IN.open(encoding="utf-8-sig")))
    seen = set()
    values = []
    for r in rows:
        m = meta_for(r["gira"])
        k = (int(r["id_obra"]), m["nombre"])
        if k in seen:
            continue
        seen.add(k)
        values.append(
            "  (%d, %s, %s::date, %s::date, %s, %s, %s, %s, %s)"
            % (int(r["id_obra"]), q(m["nombre"]), q(m["d1"]), q(m["d2"]), q(m["tipo"]), q(m["zona"]), q(m["nom"]), q(m["mes"]), q(m["ens"]))
        )
    sql = f"""-- Import legacy 2022 desde Giras 2022 (hojas Rep) con keyword-match contra obras
-- Fuente: {FUENTE}
-- Fechas/zona/tipo inferidos del nombre de carpeta de cada gira. Link Drive desde obras.link_drive.
-- Idempotente: evita duplicar (id_obra, nombre_gira, fecha_desde, fuente)
BEGIN;
INSERT INTO obras_repertorios_legacy
  (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente)
SELECT v.id_obra,
       substring(o.link_drive from '(?:id=|folders/)([A-Za-z0-9_-]+)'),
       NULLIF(o.link_drive, ''),
       v.nombre_gira, v.fecha_desde, v.fecha_hasta, v.tipo, v.zona, v.nomenclador, v.mes_letra, v.ensambles,
       {q(FUENTE)}
FROM (VALUES
{",\n".join(values)}
) AS v(id_obra, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles)
JOIN obras o ON o.id = v.id_obra
WHERE NOT EXISTS (
  SELECT 1 FROM obras_repertorios_legacy x
  WHERE x.id_obra = v.id_obra AND x.nombre_gira = v.nombre_gira
    AND x.fecha_desde IS NOT DISTINCT FROM v.fecha_desde AND x.fuente = {q(FUENTE)}
);
COMMIT;
"""
    SQL_OUT.write_text(sql, encoding="utf-8")
    print("rows csv", len(rows), "unique", len(values), "->", SQL_OUT)


main()
