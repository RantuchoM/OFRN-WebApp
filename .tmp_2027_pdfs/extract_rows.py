import json
import re
import sys
from pathlib import Path

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
t = src.read_text(encoding="utf-8-sig", errors="replace")
# Remove CLI version banners injected mid-stream
t = re.sub(
    r"A new version of Supabase CLI[\s\S]*?updating-the-supabase-cli\s*",
    "",
    t,
)
t = re.sub(r"^node\.exe[\s\S]*?NativeCommandError\s*", "", t, flags=re.M)
t = re.sub(r"^En línea:[\s\S]*?\+\s*", "", t, flags=re.M)
t = re.sub(r"^\s*\+ CategoryInfo[\s\S]*?FullyQualifiedErrorId.*$", "", t, flags=re.M)
m = re.search(r'"rows"\s*:\s*(\[)', t)
if not m:
    raise SystemExit(f"no rows in {src}")
start = m.start(1)
decoder = json.JSONDecoder()
rows, _ = decoder.raw_decode(t, start)
dst.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"{src.name} -> {dst.name}: {len(rows)} rows")
