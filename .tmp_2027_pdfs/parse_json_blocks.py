import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
t = root.joinpath("out_giras2027.txt").read_text(encoding="utf-8-sig", errors="replace")
# Strip powershell noise: keep from first {
blocks = []
for m in re.finditer(r"\{\s*\"boundary\":\s*\"[^\"]+\",\s*\"rows\":\s*\[.*?\]\s*(?:,\s*\"warning\":.*?)?\s*\}", t, re.S):
    raw = m.group(0)
    # drop warning field if present for simpler parse
    try:
        obj = json.loads(raw)
        blocks.append(obj["rows"])
    except json.JSONDecodeError:
        # try without warning
        raw2 = re.sub(r",\s*\"warning\":.*?(?=\}$)", "", raw, flags=re.S)
        obj = json.loads(raw2)
        blocks.append(obj["rows"])

print("blocks", len(blocks), [len(b) for b in blocks])
names = ["giras2027.json", "ensambles2027.json", "ensambles_cf.json"]
for name, rows in zip(names, blocks):
    root.joinpath(name).write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", name, len(rows))

# ensayos proxima semana
t2 = root.joinpath("out_ensayos_prox.txt").read_text(encoding="utf-8-sig", errors="replace")
ensayo_blocks = []
for m in re.finditer(r"\{\s*\"boundary\":\s*\"[^\"]+\",\s*\"rows\":\s*\[.*?\]\s*(?:,\s*\"warning\":.*?)?\s*\}", t2, re.S):
    raw = m.group(0)
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        raw2 = re.sub(r",\s*\"warning\":.*?(?=\}$)", "", raw, flags=re.S)
        obj = json.loads(raw2)
    ensayo_blocks.append(obj["rows"])
# second block is ensayos (first may be lun/dom)
ensayos = ensayo_blocks[-1] if ensayo_blocks else []
root.joinpath("ensayos_prox.json").write_text(json.dumps(ensayos, ensure_ascii=False, indent=2), encoding="utf-8")
print("ensayos", len(ensayos))
