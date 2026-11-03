"""Genera PDFs de obras legacy matcheadas por anio en Descargas (helper temporal).

Uso:  python scripts/_tmp_legacy_pdfs.py [2025 2023 2022]

Credenciales SOLO por entorno (nunca hardcodear):
  SUPABASE_URL       (o VITE_SUPABASE_URL; default: proyecto OFRN)
  SUPABASE_ANON_KEY  (o VITE_SUPABASE_ANON_KEY / SB_ANON)
  LEGACY_PDF_OUT     (opcional; default ~/Downloads)

2022: si no hay filas en obras_repertorios_legacy, usa obras_legacy_2022_matcheadas.csv.
"""
import csv, json, os, re, sys, html, urllib.request
from collections import OrderedDict
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

URL = (os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
       or "https://muxrbuivopnawnxlcjxq.supabase.co")
KEY = (os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
       or os.environ.get("SB_ANON") or "")
OUT = os.environ.get("LEGACY_PDF_OUT", os.path.join(os.path.expanduser("~"), "Downloads"))
CSV_2022 = os.path.join(OUT, "obras_legacy_2022_matcheadas.csv")

pdfmetrics.registerFont(TTFont("UI", r"C:\Windows\Fonts\segoeui.ttf"))
pdfmetrics.registerFont(TTFont("UI-B", r"C:\Windows\Fonts\segoeuib.ttf"))
pdfmetrics.registerFont(TTFont("UI-I", r"C:\Windows\Fonts\segoeuii.ttf"))
pdfmetrics.registerFontFamily("UI", normal="UI", bold="UI-B", italic="UI-I", boldItalic="UI-B")


def get(path):
    if not KEY:
        sys.exit("Falta SUPABASE_ANON_KEY (o VITE_SUPABASE_ANON_KEY / SB_ANON) en el entorno.")
    rows, off = [], 0
    while True:
        req = urllib.request.Request(f"{URL}/rest/v1/{path}", headers={
            "apikey": KEY, "Authorization": f"Bearer {KEY}",
            "Range-Unit": "items", "Range": f"{off}-{off+999}"})
        with urllib.request.urlopen(req) as r:
            chunk = json.loads(r.read().decode("utf8"))
        rows += chunk
        if len(chunk) < 1000:
            return rows
        off += 1000


def clean(s):
    if not s:
        return []
    s = re.sub(r"<[^>]+>", "\n", s)
    s = html.unescape(s).replace("\xa0", " ")
    return [l.strip() for l in s.splitlines() if l.strip()]


def load_db():
    leg = get("obras_repertorios_legacy?select=*&id_obra=not.is.null&order=fecha_desde,nombre_gira")
    ids = sorted({r["id_obra"] for r in leg})
    obras = {}
    for i in range(0, len(ids), 100):
        part = ids[i:i+100]
        q = "obras?select=id,titulo,obras_compositores(compositores(apellido,nombre))&id=in.(" + ",".join(map(str, part)) + ")"
        for o in get(q):
            comps = []
            for oc in o.get("obras_compositores") or []:
                c = oc.get("compositores")
                if c:
                    n = ", ".join(x for x in [(c.get("apellido") or "").strip(), (c.get("nombre") or "").strip()] if x)
                    if n and n not in comps:
                        comps.append(n)
            obras[o["id"]] = (o["titulo"], comps)
    print("legacy rows", len(leg), "obras", len(obras), file=sys.stderr)
    return leg, obras


def load_csv_2022():
    """Fuente alternativa 2022: CSV de matcheo (aun no importado a la DB)."""
    rows, obras, seen = [], {}, set()
    with open(CSV_2022, encoding="utf-8-sig", newline="") as f:
        for n, r in enumerate(csv.DictReader(f)):
            oid = int(r["id_obra"])
            key = (r["gira"], oid)
            if key in seen:
                continue
            seen.add(key)
            comp = (r["compositores_obra"] or "").strip()
            obras[oid] = (r["titulo_obra"], [comp] if comp else [])
            rows.append({"id": n, "id_obra": oid, "fecha_desde": None, "fecha_hasta": None,
                         "nombre_gira": r["gira"],
                         "fuente": "obras_legacy_2022_matcheadas.csv (matcheo; sin importar a DB)",
                         "link_drive": None})
    return rows, obras


st = lambda n, **k: ParagraphStyle(n, fontName=k.pop("fontName", "UI"), **k)
S_TITLE = st("t", fontSize=26, leading=30, fontName="UI-B", textColor=colors.HexColor("#1e293b"))
S_SUB = st("s", fontSize=12, leading=16, textColor=colors.HexColor("#475569"))
S_H = st("h", fontSize=12.5, leading=15, fontName="UI-B", textColor=colors.white)
S_META = st("m", fontSize=8.5, leading=11, textColor=colors.HexColor("#334155"))
S_C = st("c", fontSize=8.5, leading=10.5)
S_CB = st("cb", fontSize=8.5, leading=10.5, fontName="UI-B")
S_CH = st("ch", fontSize=8, leading=10, fontName="UI-B", textColor=colors.HexColor("#334155"))
S_SM = st("sm", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#64748b"))
S_NOTE = st("n", fontSize=9, leading=12, textColor=colors.HexColor("#475569"))


def esc(s):
    return html.escape(s or "")


def fmt_d(a, b):
    f = lambda d: date.fromisoformat(d).strftime("%d/%m/%Y")
    if not a:
        return "-"
    return f(a) if not b or a == b else f"{f(a)} – {f(b)}"


def build(year, rows, srcnote, obras):
    path = os.path.join(OUT, f"legacy_obras_matcheadas_{year}.pdf")
    try:  # PDF abierto/bloqueado: escribir *_actualizado.pdf
        open(path, "ab").close()
    except PermissionError:
        path = path[:-4] + "_actualizado.pdf"
    groups = OrderedDict()
    for r in rows:
        groups.setdefault((r["fecha_desde"] or "", r["nombre_gira"] or "(sin gira)"), []).append(r)
    fuentes = sorted({r["fuente"] for r in rows if r.get("fuente")})
    n_obras = len({r["id_obra"] for r in rows})

    def footer(c, d):
        c.saveState()
        c.setFont("UI", 7.5)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(15*mm, 9*mm, f"OFRN · Obras legacy matcheadas {year}")
        c.drawRightString(A4[0]-15*mm, 9*mm, f"Página {d.page}")
        c.restoreState()

    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=16*mm, title=f"Obras legacy matcheadas {year}",
                            author="OFRN WebApp")
    W = A4[0] - 30*mm
    el = [Spacer(1, 40*mm), Paragraph(f"Repertorio legacy {year}", S_TITLE), Spacer(1, 4*mm),
          Paragraph("Obras matcheadas e importadas a <i>obras_repertorios_legacy</i>" if not srcnote
                    else "Obras matcheadas contra el catálogo <i>obras</i>", S_SUB), Spacer(1, 14*mm)]
    summ = [["Año", str(year)], ["Registros (obra en programa)", str(len(rows))],
            ["Obras distintas", str(n_obras)], ["Giras / programas", str(len(groups))],
            ["Fuente", Paragraph("<br/>".join(esc(f) for f in fuentes) or "-", S_C)],
            ["Generado", date.today().strftime("%d/%m/%Y")]]
    t = Table([[Paragraph(esc(a), S_CB), b if not isinstance(b, str) else Paragraph(esc(b), S_C)] for a, b in summ],
              colWidths=[55*mm, 100*mm])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), .4, colors.HexColor("#cbd5e1")),
                           ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    el += [t, Spacer(1, 10*mm)]
    if srcnote:
        el.append(Paragraph(esc(srcnote), S_NOTE))
    el.append(PageBreak())

    cw = [9*mm, 52*mm, 63*mm, 14*mm, W - 138*mm]
    for (fd, gira), rs in groups.items():
        first = rs[0]
        hdr = Table([[Paragraph(esc(gira), S_H)]], colWidths=[W])
        hdr.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1e3a5f")),
                                 ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
        meta = []
        if first.get("fecha_desde"):
            meta.append(f"<b>Fechas:</b> {fmt_d(first['fecha_desde'], first['fecha_hasta'])}")
        for lbl, k in (("Zona", "zona"), ("Nomenclador", "nomenclador"), ("Tipo", "tipo")):
            if first.get(k):
                meta.append(f"<b>{lbl}:</b> {esc(first[k])}")
        if first.get("ensambles"):
            meta.append(f"<b>Ensambles:</b> {esc(first['ensambles'].replace(';', ', '))}")
        meta.append(f"<b>Obras:</b> {len(rs)}")
        data = [[Paragraph(h, S_CH) for h in ("#", "Compositor", "Obra", "ID obra", "Nota")]]
        for i, r in enumerate(rs, 1):
            titulo, comps = obras.get(r["id_obra"], ("(sin título)", []))
            ls = clean(titulo)
            tp = f"<b>{esc(ls[0])}</b>" if ls else ""
            if len(ls) > 1:
                tp += "<br/>" + "<br/>".join(f"<font size=7 color='#64748b'>{esc(x)}</font>" for x in ls[1:])
            note = "Legacy" + (" · Drive" if r.get("link_drive") else "")
            data.append([Paragraph(str(i), S_C), Paragraph(esc(" / ".join(comps)) or "—", S_C),
                         Paragraph(tp, S_C), Paragraph(str(r["id_obra"]), S_C), Paragraph(note, S_SM)])
        tb = Table(data, colWidths=cw, repeatRows=1)
        tb.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                                ("LINEBELOW", (0, 0), (-1, -1), .3, colors.HexColor("#e2e8f0")),
                                ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                                ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3)]))
        head = [hdr, Spacer(1, 1.5*mm), Paragraph(" &nbsp;·&nbsp; ".join(meta), S_META), Spacer(1, 1.5*mm)]
        if len(rs) <= 14:
            el += [KeepTogether(head + [tb]), Spacer(1, 7*mm)]
        else:
            el += [KeepTogether(head), tb, Spacer(1, 7*mm)]
    doc.build(el, onFirstPage=lambda c, d: None, onLaterPages=footer)
    return path, len(rows), n_obras, len(groups)


if __name__ == "__main__":
    years = [int(y) for y in sys.argv[1:]] or [2022]
    db = None
    for year in years:
        note = None
        db_rows = []
        if KEY or year != 2022 or not os.path.exists(CSV_2022):
            db = db or load_db()
            db_rows = [r for r in db[0] if (r["fecha_desde"] or "").startswith(str(year)) or str(year) in (r.get("fuente") or "")]
        if year == 2022 and not db_rows and os.path.exists(CSV_2022):
            rows, obras = load_csv_2022()
            note = ("Fuente: CSV de matcheo 2022. Aún no hay filas 2022 en obras_repertorios_legacy; "
                    "no se muestran fechas.")
        else:
            rows, obras = db_rows, (db[1] if db else {})
            rows.sort(key=lambda r: (r["fecha_desde"] or "", r["nombre_gira"] or "", r["id"]))
        if not rows:
            print(year, "sin datos; PDF no generado", file=sys.stderr)
            continue
        print(year, build(year, rows, note, obras))
