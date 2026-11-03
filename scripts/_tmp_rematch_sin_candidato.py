"""Rematch de las filas 'sin candidato' restantes contra el catalogo vivo de obras.

Entrada : Downloads/legacy_match_sin_candidato_data.json (items) menos las ya decididas en
          Downloads/legacy_match_sin_candidato_decisiones*.json (con id real) y las ya presentes en BD.
Catalogo: supabase/.temp/obras_catalog_live.json (ver obras_catalog_live.sql, `supabase db query --linked -o json -f`).
Salida  : supabase/.temp/rematch_sin_candidato_report.json (auto + candidatos por item)

Uso: python scripts/_tmp_rematch_sin_candidato.py [--top 3]
"""
from __future__ import annotations

import difflib
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
DL = Path(r"c:\Users\marti\Downloads")
DATA = DL / "legacy_match_sin_candidato_data.json"
CAT = ROOT / "supabase" / ".temp" / "obras_catalog_live.json"
OUT = ROOT / "supabase" / ".temp" / "rematch_sin_candidato_report.json"


def norm(s: str) -> str:
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_catalog():
    raw = CAT.read_text(encoding="utf-8-sig")
    rows = json.loads(raw[raw.index("{") : raw.rindex("}") + 1])["rows"]
    return [
        {"id": r["id"], "t": re.sub(r"<[^>]+>", " ", html.unescape(r["t"])).strip(), "c": r["c"], "d": r["d"],
         "nt": norm(r["t"]), "nc": norm(r["c"])}
        for r in rows
    ]


def score(item, o):
    t = norm(item["titulo"])
    c = norm(item["compositor"])
    if not t:
        return 0.0
    tw = set(t.split())
    ow = set(o["nt"].split())
    jac = len(tw & ow) / max(1, len(tw | ow))
    cont = 1.0 if (len(t) >= 6 and (t in o["nt"] or o["nt"][:60] in t)) else 0.0
    seq = difflib.SequenceMatcher(None, t, o["nt"][: len(t) + 30]).ratio()
    base = max(jac, cont * 0.9, seq * 0.85)
    comp = 0.0
    if c:
        cw = [w for w in c.split() if len(w) > 3]
        if cw and any(w in o["nc"] for w in cw):
            comp = 0.15
    return min(1.0, base + comp)


def main():
    top = 3
    if "--top" in sys.argv:
        top = int(sys.argv[sys.argv.index("--top") + 1])
    cat = load_catalog()
    items = json.loads(DATA.read_text(encoding="utf-8"))["items"]
    decided = set()
    for p in DL.glob("legacy_match_sin_candidato_decisiones*.json"):
        for d in json.loads(p.read_text(encoding="utf-8-sig"))["decisiones"]:
            if d.get("accion") == "match" and int(d.get("id_obra_elegida") or 0) in {x["id"] for x in cat}:
                decided.add((d["anio"], d["gira"], d["compositor"], d["titulo"]))
    out = []
    for it in items:
        if (it["anio"], it["gira"], it["compositor"], it["titulo"]) in decided:
            continue
        cands = sorted(((score(it, o), o) for o in cat), key=lambda x: -x[0])[:top]
        out.append(
            {"key": it["key"], "anio": it["anio"], "gira": it["gira"][:50], "compositor": it["compositor"], "titulo": it["titulo"],
             "cands": [{"s": round(s, 2), "id": o["id"], "t": o["t"][:80].replace("\n", " "), "c": o["c"][:40]} for s, o in cands]}
        )
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in out:
        print(f"[{r['anio']}] {r['compositor'][:25]} | {r['titulo'][:55]}")
        for c in r["cands"]:
            if c["s"] >= 0.45:
                print(f"     {c['s']:.2f} #{c['id']} {c['t']} ({c['c']})")


if __name__ == "__main__":
    main()
