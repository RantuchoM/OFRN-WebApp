"""Arma CSV de import legacy 2023 desde CSVs de hojas Rep (columna E)."""
from __future__ import annotations

import csv
import re
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

SRC = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\legacy_reps_2023")
OUT_CSV = Path(r"c:\Users\marti\Downloads\giras_orquesta_limpio_2023.csv")
OUT_JSON = Path(r"c:\Proyectos\OFRN-WebApp\supabase\.temp\legacy_import_rows_2023.json")

MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}
MES_LETRA = {
    1: "01",
    2: "02",
    3: "03",
    4: "04",
    5: "05",
    6: "06",
    7: "07",
    8: "08",
    9: "09",
    10: "10",
    11: "11",
    12: "12",
}


def parse_csv(text: str) -> list[list[str]]:
    return list(csv.reader(text.splitlines()))


def extract_drive_id(url: str | None) -> str | None:
    if not url:
        return None
    raw = str(url).strip()
    if not raw:
        return None
    m = re.search(
        r"(?:folders/|open\?id=|id=|file/d/)([-\w]{25,})",
        raw,
    )
    if m:
        return m.group(1)
    if re.fullmatch(r"[-\w]{25,}", raw):
        return raw
    return None


def parse_date(raw: str) -> datetime | None:
    s = (raw or "").strip()
    if not s:
        return None
    # dd/mm/yyyy
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        d, mo, y = map(int, m.groups())
        return datetime(y, mo, d)
    # d-Month-yy / dd-Month-yyyy
    m = re.fullmatch(r"(\d{1,2})-([A-Za-z]+)-(\d{2,4})", s)
    if m:
        d = int(m.group(1))
        mo = MONTHS.get(m.group(2).lower())
        y = int(m.group(3))
        if y < 100:
            y += 2000
        if mo:
            return datetime(y, mo, d)
    return None


def fmt_date(dt: datetime | None) -> str:
    if not dt:
        return ""
    return dt.strftime("%d/%m/%Y")


def infer_tipo(ensambles: list[str], nombre: str) -> str:
    joined = " ".join(ensambles).lower()
    low = nombre.lower()
    if any(x in joined for x in ("piltri", "trepun", "ecas", "brat", "cfcuer", "es")):
        if "cuerdas" in joined and "bronces" in joined:
            return "Sinfónico"
        if any(x in joined for x in ("piltri", "trepun", "ecas", "brat", "es", "cfcuer")):
            return "Ensamble"
    if "bronces" in joined and "cuerdas" not in joined:
        return "Ensamble"
    if "atlántica" in low or "atlantica" in low or "andina" in low or "alto valle" in low:
        if "cuerdas" in joined or not ensambles:
            return "Sinfónico"
    return "Sinfónico"


def infer_zona(nombre: str, zonas: list[str]) -> str:
    low = nombre.lower()
    if "andina" in low:
        return "Andina"
    if "atlánt" in low or "atlant" in low:
        return "Atlántica"
    if "alto valle" in low:
        return "Alto Valle"
    if "fimba" in low:
        return "Bariloche"
    # fallback unique non-empty zonas
    uniq = []
    for z in zonas:
        z = z.strip()
        if z and z not in uniq:
            uniq.append(z)
    return " - ".join(uniq[:3])


def nomenclador_from(nombre: str) -> str:
    m = re.search(r"Gira\s+(\d+)", nombre, re.I)
    if m:
        return f"Gira {m.group(1)}"
    if "fimba" in nombre.lower():
        # keep distinctive suffix
        rest = re.sub(r"^.*?fimba\s*2023\s*-\s*", "", nombre, flags=re.I).strip()
        return f"FIMBA {rest}" if rest else "FIMBA"
    return nombre[:40]


def collect_ensambles(row: list[str], start_idx: int) -> list[str]:
    out = []
    for cell in row[start_idx:]:
        c = (cell or "").strip()
        if not c:
            continue
        if c.lower() in {"director:", "ensambles/orgánico:", "ensambles/organico:"}:
            continue
        # stop-ish if looks like URL
        if c.startswith("http"):
            break
        out.append(c)
    return out


def split_programs(rows: list[list[str]]) -> list[list[list[str]]]:
    """Split a Rep sheet into program blocks by Identificador / Título headers."""
    starts = []
    for i, row in enumerate(rows):
        a0 = (row[0] if row else "").strip()
        # first row always starts a program
        if i == 0:
            starts.append(0)
            continue
        # new program marker
        if a0 in {"Título:", "Titulo:"} or a0.endswith(" Título:") or a0.endswith(" Titulo:"):
            starts.append(i)
            continue
        # also Identificador on col H with Título-like on A empty? handled above
    starts.append(len(rows))
    blocks = []
    for a, b in zip(starts, starts[1:]):
        if b > a:
            blocks.append(rows[a:b])
    return blocks


def parse_program_block(block: list[list[str]], fallback_nombre: str) -> dict:
    nombre = fallback_nombre
    fecha_desde = None
    fechas_concierto: list[datetime] = []
    zonas: list[str] = []
    ensambles: list[str] = []
    works: list[dict] = []
    in_works = False
    link_col = 8  # default

    for row in block:
        if not row:
            continue
        a0 = (row[0] if len(row) > 0 else "").strip()
        # pad
        while len(row) < 10:
            row.append("")

        # Identificador in col H (index 7) with label, value in 8
        for i, cell in enumerate(row):
            if str(cell).strip() in {"Identificador:", "Identificador"}:
                val = (row[i + 1] if i + 1 < len(row) else "").strip()
                if val:
                    nombre = val

        if a0.endswith(" Título:") or a0.endswith(" Titulo:") or a0 in {"Título:", "Titulo:"}:
            # keep fallback / already set identificador
            pass

        if a0 == "Fecha:":
            dt = parse_date(row[1])
            if dt:
                fechas_concierto.append(dt)
            zona = ""
            for i, cell in enumerate(row):
                if str(cell).strip() in {"Ciudad/Zona:", "Ciudad/Zona"}:
                    zona = (row[i + 1] if i + 1 < len(row) else "").strip()
            if zona:
                zonas.append(zona)

        if a0 == "(fecha desde)":
            fecha_desde = parse_date(row[1])
            # ensambles after label
            for i, cell in enumerate(row):
                if "Ensamble" in str(cell):
                    ensambles = collect_ensambles(row, i + 1)
                    break
            # Gira 12 style: ensambles without label in cols 5+
            if not ensambles:
                ensambles = [
                    c.strip()
                    for c in row[5:]
                    if c and c.strip() and not c.strip().startswith("http")
                ]

        if a0 == "Compositor":
            in_works = True
            # find Link column
            for i, cell in enumerate(row):
                if str(cell).strip().lower() == "link":
                    link_col = i
            continue

        if in_works:
            # end markers
            if a0 in {"Título:", "Titulo:"} or a0.endswith(" Título:"):
                in_works = False
                continue
            if a0 == "" and not any((c or "").strip() for c in row[1:3]):
                # total row or empty
                joined = " ".join((c or "").strip() for c in row).lower()
                if "total" in joined:
                    continue
            compositor = a0
            obra = (row[1] or "").strip()
            if not compositor and not obra:
                continue
            if compositor.upper().startswith("HAY QUE CONFIRMAR"):
                continue
            if obra.upper().startswith("HAY QUE CONFIRMAR"):
                continue

            # drive link: prefer Link col, else any drive URL in row
            link = (row[link_col] if link_col < len(row) else "") or ""
            drive_id = extract_drive_id(link)
            if not drive_id:
                for cell in row:
                    drive_id = extract_drive_id(cell)
                    if drive_id:
                        link = cell
                        break
            if not drive_id:
                continue  # only import matchable works
            # skip pure youtube
            if "youtube" in (link or "").lower() and "drive.google" not in (link or "").lower():
                # try other cells
                drive_id = None
                for cell in row:
                    if "drive.google" in (cell or "").lower():
                        drive_id = extract_drive_id(cell)
                        link = cell
                        if drive_id:
                            break
                if not drive_id:
                    continue

            works.append(
                {
                    "compositor": compositor,
                    "titulo": obra,
                    "link_drive": f"https://drive.google.com/open?id={drive_id}",
                    "drive_id": drive_id,
                }
            )

    if fecha_desde is None and fechas_concierto:
        fecha_desde = min(fechas_concierto)
    fecha_hasta = max(fechas_concierto) if fechas_concierto else fecha_desde

    return {
        "nombre_gira": nombre.strip(),
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta,
        "zonas": zonas,
        "ensambles": ensambles,
        "works": works,
    }


def main():
    files = sorted(SRC.glob("*.csv"))
    programs = []
    for path in files:
        rows = parse_csv(path.read_text(encoding="utf-8"))
        fallback = path.stem
        for block in split_programs(rows):
            prog = parse_program_block(block, fallback)
            prog["source_file"] = path.name
            programs.append(prog)

    out_rows = []
    for prog in programs:
        if not prog["works"]:
            continue
        nombre = prog["nombre_gira"]
        zona = infer_zona(nombre, prog["zonas"])
        tipo = infer_tipo(prog["ensambles"], nombre)
        nom = nomenclador_from(nombre)
        mes = ""
        if prog["fecha_desde"]:
            mes = MES_LETRA[prog["fecha_desde"].month]
        ens = ";".join(prog["ensambles"])
        for w in prog["works"]:
            out_rows.append(
                {
                    "link_drive": w["link_drive"],
                    "nombre_gira": nombre,
                    "fecha_desde": fmt_date(prog["fecha_desde"]),
                    "fecha_hasta": fmt_date(prog["fecha_hasta"]),
                    "tipo": tipo,
                    "zona": zona,
                    "nomenclador": nom,
                    "mes_letra": mes,
                    "ensambles": ens,
                    "compositor": w["compositor"],
                    "titulo": w["titulo"],
                    "fuente": "SINCRONIZACIÓN Giras Rep 2023",
                }
            )

    # write CSV (import columns + optional compositor/titulo)
    fields = [
        "link_drive",
        "nombre_gira",
        "fecha_desde",
        "fecha_hasta",
        "tipo",
        "zona",
        "nomenclador",
        "mes_letra",
        "ensambles",
        "compositor",
        "titulo",
        "fuente",
    ]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(out_rows)

    import json

    OUT_JSON.write_text(
        json.dumps(
            {
                "programs": [
                    {
                        **{k: v for k, v in p.items() if k != "works"},
                        "fecha_desde": fmt_date(p["fecha_desde"]),
                        "fecha_hasta": fmt_date(p["fecha_hasta"]),
                        "works_count": len(p["works"]),
                    }
                    for p in programs
                ],
                "rows": len(out_rows),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"programs: {len(programs)}")
    for p in programs:
        print(
            f"  - {p['nombre_gira']!r} works={len(p['works'])} "
            f"desde={fmt_date(p['fecha_desde'])} hasta={fmt_date(p['fecha_hasta'])} "
            f"ens={p['ensambles']} file={p['source_file']}"
        )
    print(f"rows: {len(out_rows)}")
    print(f"csv: {OUT_CSV}")
    print(f"json: {OUT_JSON}")


if __name__ == "__main__":
    main()
