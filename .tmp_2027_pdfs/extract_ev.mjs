import fs from "node:fs";

const t = fs.readFileSync(
  new URL("./raw_ev_giras.txt", import.meta.url),
  "utf8",
);
const rows = [];
const re = /\{[^{}]*"fecha"[^{}]*\}/g;
let m;
while ((m = re.exec(t))) {
  try {
    rows.push(JSON.parse(m[0]));
  } catch {
    /* skip */
  }
}
console.log("rows", rows.length);
const by = {};
for (const e of rows) {
  const k = `${e.id_tipo_evento}:${e.tipo_evento}`;
  by[k] = (by[k] || 0) + 1;
}
console.log(by);
fs.writeFileSync(
  new URL("./eventos_giras2027.json", import.meta.url),
  JSON.stringify(rows, null, 2),
);
const fer = [
  "2027-04-02",
  "2027-07-09",
  "2027-12-08",
  "2027-03-25",
  "2027-06-20",
  "2027-06-21",
  "2027-09-19",
];
for (const d of fer) {
  const hit = rows.filter((r) => r.fecha === d);
  console.log(
    d,
    hit.map((h) => `${h.id_gira}:${h.tipo_evento}`).join(",") || "none",
  );
}
