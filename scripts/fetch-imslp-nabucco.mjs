const ids = [
  902434, 902435, 902436, 902437, 902438, 902439, 902440, 902441, 902442,
  902443, 902444, 902445, 902446, 902447, 902448,
];

const r = await fetch(
  "https://imslp.org/api.php?action=parse&page=Nabucco_(Verdi,_Giuseppe)&prop=text&format=json",
  { headers: { "User-Agent": "OFRN-WebApp/1.0" } },
);
const html = (await r.json()).parse.text["*"];
const start = html.indexOf("Oboe 1, 2 • Clarinet 1, 2 (A)");
const section = html.slice(start - 5000, start + 40000);

const positions = ids
  .map((id) => ({ id, pos: section.indexOf(String(id)) }))
  .filter((x) => x.pos >= 0)
  .sort((a, b) => a.pos - b.pos);
console.log("By HTML position:");
positions.forEach((x) => console.log(x.id, x.pos));

const parts = [
  "SCORE",
  "Oboe 1-2",
  "Clarinete A 1-2",
  "Fagot 1-2",
  "Corno F 1-4",
  "Trompeta 1-2",
  "Trombón 1-3",
  "Tuba",
  "Perc Timbal",
  "Violín 1",
  "Violín 2",
  "Viola",
  "Violoncello",
  "Contrabajo",
];
console.log("\nMapping by position:");
positions.forEach((x, i) => console.log(`${x.id}\t${parts[i] || "?"}`));
