# -*- coding: utf-8 -*-
"""Informe PDF: material de archivo por gira 2027 (estado + link o dónde conseguirlo)."""
from __future__ import annotations

import html
import json
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co"
SB_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg"
)
OUT = Path(r"c:\Users\marti\Downloads\Informe_Material_Giras_2027.pdf")

# Fuente sugerida cuando falta material
FUENTE = {
    3891: "IMSLP — Symphony No.2 (Borodin): score + partes (Lancec / Geniusboy). Pipeline para-acomodar.",
    3892: "Editorial / compositor (Brotons). Sin set completo en IMSLP. Contactar alquiler.",
    3894: "Alquiler Boosey/Sikorski (Shostakóvich/Barshai op.110a). No hay arr. Barshai libre en IMSLP.",
    3896: "IMSLP — Symphony No.40 K.550 (versión con clarinetes). Score + partes PD.",
    3897: "IMSLP — Prélude à l'après-midi d'un faune (orquesta completa; no usar arr. 11 instr. #2056).",
    3898: "IMSLP — Triple Concerto Op.56 (Beethoven). Score + partes.",
    3899: "Alquiler (Sibelius †1957 Non-PD EU). Estudio IMSLP posible; concierto = editorial.",
    3900: "IMSLP — Violin Concerto No.1 Op.6 (Paganini). Confirmar edición orquestal.",
    3901: "IMSLP — Symphony No.9 Op.125 + partes corales/solistas. Volumen grande.",
    3902: "IMSLP — Rosamunde D.797 (Entre'acte No.3). Score + partes.",
    3903: "Supersedida: usar obra archivo #3592 (Concierto para Trompeta en Mib mayor).",
    3592: "EN ARCHIVO — Concierto para Trompeta (Haydn).",
    3904: "IMSLP — Messiah (Händel) «And the Glory…». Confirmar arr. coral+orq. del programa.",
    3905: "IMSLP — Magnificat K.193 (Mozart).",
    3906: "IMSLP / edición Purcell «Come ye sons of art». Confirmar selección y arr.",
    3908: "Editorial Oxford / Rutter. Derechos; sin partes públicas completas.",
    3909: "IMSLP — confirmar BWV/arr. de «Nun danket alle Gott».",
    3910: "Material del compositor (Juan Falú).",
    3911: "Estreno — material del compositor.",
    3912: "Alquiler Boosey (Stravinsky Danses concertantes). Derechos.",
    3914: "Estreno Coppola — material del compositor.",
    3915: "Material del compositor (Ripper). Derechos.",
}


def rest(path: str) -> list | dict:
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{path}",
        headers={
            "apikey": SB_KEY,
            "Authorization": f"Bearer {SB_KEY}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def rpc_sql_via_edge_unavailable():
    """Fallback: armar datos con REST anidado."""
    programas = rest(
        "programas?select=id,nombre_gira,nomenclador,subtitulo,fecha_desde,fecha_hasta,tipo"
        "&nomenclador=like.Sinf%20%/27"
        "&order=fecha_desde.asc"
    )
    # Cámara ciclos (solo cabeceras; sin obras hoy)
    camara = rest(
        "programas?select=id,nombre_gira,subtitulo,fecha_desde,fecha_hasta"
        "&nombre_gira=like.Ciclo%20de%20Cámara%"
        "&order=fecha_desde.asc,nombre_gira.asc"
        "&limit=200"
    )
    return programas, camara


def strip_html(s: str | None) -> str:
    if not s:
        return ""
    t = re.sub(r"<[^>]+>", " ", s)
    t = html.unescape(t).replace("\xa0", " ").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", t).strip()


def classify(obra: dict) -> tuple[str, str, str]:
    """Returns (badge, detalle, link_or_fuente)."""
    oid = obra.get("obra_id")
    estado = obra.get("estado") or ""
    link = obra.get("link_drive") or ""
    n = obra.get("n_part") or 0
    has_urls = obra.get("has_urls")
    obs = obra.get("obs") or ""

    if not oid:
        return ("SIN REPERTORIO", "Programa sin obras cargadas en BD.", "Definir programa en planilla / WorkForm")

    if link and n > 0 and has_urls:
        return ("EN ARCHIVO", f"BD #{oid} · {n} particellas con URLs.", link)
    if link and n > 0:
        return (
            "EN ARCHIVO (sin URL fila)",
            f"BD #{oid} · {n} particellas · carpeta Drive ok; faltan links en url_archivo.",
            link,
        )
    if link and n == 0:
        return ("CARPETA SIN PARTES", f"BD #{oid} · link_drive sin particellas en BD.", link)
    if estado == "Solicitud" or n == 0:
        fuente = FUENTE.get(oid) or obs or "Buscar IMSLP / editorial / compositor."
        return ("FALTA", f"BD #{oid} · estado {estado or '—'}.", fuente)
    return ("REVISAR", f"BD #{oid} · {n} partes · estado {estado}.", obs or "—")


def fetch_rows() -> list[dict]:
    # PostgREST no hace bien el aggregate anidado; usar SQL vía función ask no disponible.
    # Cargar programas + repertorio con embeds.
    programas = rest(
        "programas?select=id,nombre_gira,nomenclador,subtitulo,fecha_desde,fecha_hasta,tipo,"
        "programas_repertorios(id,nombre,orden,repertorio_obras(orden,excluir,obras(id,titulo,estado,link_drive,observaciones,"
        "obras_particellas(id,url_archivo),"
        "obras_compositores(compositores(apellido,nombre)))))"
        "&nomenclador=like.Sinf*%2F27"
        "&order=fecha_desde.asc"
    )
    # Fix filter: PostgREST like needs encoded pattern
    # If empty, try ilike
    if not programas:
        programas = rest(
            "programas?select=id,nombre_gira,nomenclador,subtitulo,fecha_desde,fecha_hasta,tipo,"
            "programas_repertorios(id,nombre,orden,repertorio_obras(orden,excluir,obras(id,titulo,estado,link_drive,observaciones,"
            "obras_particellas(id,url_archivo),"
            "obras_compositores(compositores(apellido,nombre)))))"
            "&nomenclador=ilike.Sinf%25/27"
            "&order=fecha_desde.asc"
        )
    rows = []
    for p in programas:
        obras_flat = []
        for pr in sorted(p.get("programas_repertorios") or [], key=lambda x: x.get("orden") or 0):
            for ro in sorted(pr.get("repertorio_obras") or [], key=lambda x: x.get("orden") or 0):
                if ro.get("excluir"):
                    continue
                o = ro.get("obras") or {}
                parts = o.get("obras_particellas") or []
                comps = []
                for oc in o.get("obras_compositores") or []:
                    c = oc.get("compositores") or {}
                    if c.get("apellido"):
                        comps.append(c["apellido"])
                has_urls = any(
                    (x.get("url_archivo") or "") not in ("", "[]", "null") for x in parts
                )
                obras_flat.append(
                    {
                        "orden": ro.get("orden"),
                        "obra_id": o.get("id"),
                        "titulo": strip_html(o.get("titulo")),
                        "estado": o.get("estado"),
                        "link_drive": o.get("link_drive"),
                        "obs": o.get("observaciones") or "",
                        "n_part": len(parts),
                        "has_urls": has_urls,
                        "comps": "/".join(comps),
                    }
                )
        rows.append(
            {
                "prog_id": p["id"],
                "label": p.get("nomenclador") or "",
                "nombre": p.get("nombre_gira") or "",
                "fechas": f"{p.get('fecha_desde') or '?'} → {p.get('fecha_hasta') or '?'}",
                "subtitulo": p.get("subtitulo") or "",
                "tipo": str(p.get("tipo") or ""),
                "obras": obras_flat,
            }
        )
    return rows


def badge_color(badge: str):
    if badge.startswith("EN ARCHIVO"):
        return colors.Color(0.15, 0.45, 0.25)
    if badge == "FALTA":
        return colors.Color(0.65, 0.15, 0.12)
    if badge == "SIN REPERTORIO":
        return colors.Color(0.35, 0.35, 0.38)
    if badge.startswith("CARPETA"):
        return colors.Color(0.55, 0.4, 0.1)
    return colors.Color(0.4, 0.35, 0.1)


def build_pdf(rows: list[dict], camara_note: str) -> None:
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "T",
        parent=styles["Heading1"],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=6,
        textColor=colors.HexColor("#1a1a1a"),
    )
    sub = ParagraphStyle(
        "S",
        parent=styles["Normal"],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#555555"),
        spaceAfter=12,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.HexColor("#111111"),
    )
    body = ParagraphStyle("B", parent=styles["Normal"], fontSize=8, leading=11)
    small = ParagraphStyle("Sm", parent=styles["Normal"], fontSize=7.5, leading=10, textColor=colors.HexColor("#333"))
    link_s = ParagraphStyle("L", parent=styles["Normal"], fontSize=7, leading=9, textColor=colors.HexColor("#0b57d0"))

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=1.4 * cm,
        rightMargin=1.4 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
    )
    story = []
    story.append(Paragraph("Informe de material — Giras temporada 2027", title))
    story.append(
        Paragraph(
            f"Generado {date.today().isoformat()} · Fuente: BD OFRN (programas + obras_particellas + link_drive)",
            sub,
        )
    )
    story.append(
        Paragraph(
            "<b>Leyenda:</b> "
            "<font color='#25733f'><b>EN ARCHIVO</b></font> = particellas + link Drive · "
            "<font color='#a6281f'><b>FALTA</b></font> = Solicitud / sin partes · "
            "columna derecha = link Drive o dónde conseguirlo.",
            small,
        )
    )
    story.append(Spacer(1, 6))

    # Resumen
    tot = ok = falta = vacio = 0
    for g in rows:
        if not g["obras"]:
            vacio += 1
            continue
        for o in g["obras"]:
            tot += 1
            b, _, _ = classify(o)
            if b.startswith("EN ARCHIVO"):
                ok += 1
            elif b == "FALTA":
                falta += 1
    story.append(
        Paragraph(
            f"<b>Sinfónico / Camerata:</b> {len(rows)} programas · "
            f"{tot} obras · <font color='#25733f'>{ok} en archivo</font> · "
            f"<font color='#a6281f'>{falta} faltan</font> · {vacio} programas sin repertorio.",
            body,
        )
    )
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc")))

    for g in rows:
        head = f"{g['label']} — {html.escape(g['nombre'])}"
        meta = f"{html.escape(g['fechas'])} · {html.escape(g['tipo'])}"
        if g["subtitulo"]:
            meta += f"<br/>{html.escape(g['subtitulo'])}"
        block = [Paragraph(head, h2), Paragraph(meta, small), Spacer(1, 3)]

        if not g["obras"]:
            block.append(
                Paragraph(
                    "<font color='#666666'><i>Sin obras en repertorio.</i> "
                    "Definir programa o reposición (P3/P4/P16).</font>",
                    body,
                )
            )
            story.append(KeepTogether(block))
            continue

        data = [
            [
                Paragraph("<b>#</b>", small),
                Paragraph("<b>Obra</b>", small),
                Paragraph("<b>Estado</b>", small),
                Paragraph("<b>Link / Fuente</b>", small),
            ]
        ]
        for o in g["obras"]:
            badge, detalle, ref = classify(o)
            titulo = html.escape(o.get("titulo") or "—")
            comps = html.escape(o.get("comps") or "")
            obra_txt = f"<b>{comps}</b> — {titulo}" if comps else titulo
            obra_txt += f"<br/><font size='6.5' color='#666'>{html.escape(detalle)}</font>"
            if ref.startswith("http"):
                ref_p = Paragraph(
                    f'<link href="{html.escape(ref)}"><u>Abrir carpeta Drive</u></link><br/>'
                    f'<font size="6">{html.escape(ref[:70])}…</font>',
                    link_s,
                )
            else:
                ref_p = Paragraph(html.escape(ref), small)
            data.append(
                [
                    Paragraph(str(o.get("orden") or ""), small),
                    Paragraph(obra_txt, small),
                    Paragraph(
                        f"<font color='#{badge_color(badge).hexval()[2:]}'><b>{badge}</b></font>",
                        small,
                    ),
                    ref_p,
                ]
            )

        tbl = Table(data, colWidths=[0.7 * cm, 8.2 * cm, 3.2 * cm, 5.5 * cm])
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#dddddd")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
                ]
            )
        )
        block.append(tbl)
        story.append(KeepTogether(block))

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#999999")))
    story.append(Paragraph("Ciclos de cámara 2027", h2))
    story.append(Paragraph(camara_note, body))

    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "<i>Notas:</i> «EN ARCHIVO (sin URL fila)» tiene carpeta Drive pero hay que regenerar "
            "url_archivo en particellas. Obras FALTA con IMSLP deben pasar por "
            "<b>/para-acomodar-particellas</b> (no dump crudo). Derechos = alquiler editorial.",
            small,
        )
    )

    doc.build(story)
    print(f"OK → {OUT}")


def main() -> None:
    rows = fetch_rows()
    # Cámara
    camara_q = urllib.parse.urlencode(
        {
            "select": "id,nombre_gira,fecha_desde,fecha_hasta,subtitulo",
            "nombre_gira": "ilike.Ciclo de Cámara%",
            "order": "fecha_desde.asc",
        }
    )
    camara = rest(f"programas?{camara_q}")
    ciclos = defaultdict(list)
    for p in camara:
        m = re.search(r"Ciclo de Cámara (I{1,3}|IV)", p.get("nombre_gira") or "")
        key = m.group(0) if m else "Otro"
        ciclos[key].append(p)
    lines = [
        "Los 48 programas de ensamble (Ciclos I–IV × ABRON/BRAT/… ) <b>no tienen obras "
        "cargadas en repertorio</b> hoy (bloques vacíos). Fechas vigentes:"
    ]
    for k in sorted(ciclos.keys()):
        ps = ciclos[k]
        d0 = min(x.get("fecha_desde") or "" for x in ps)
        d1 = max(x.get("fecha_hasta") or "" for x in ps)
        lines.append(f"· <b>{k}</b>: {d0} → {d1} · {len(ps)} ensambles · repertorio pendiente.")
    lines.append(
        "Fuente posible: planilla «Programas Sinfónicos y de Cámara 2027» (lotes viento/cuerdas) "
        "+ archivos ya en Para acomodar / CUERDAS cuando existan."
    )
    build_pdf(rows, "<br/>".join(lines))


if __name__ == "__main__":
    main()
