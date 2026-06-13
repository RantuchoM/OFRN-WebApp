const r = await fetch(
  "https://imslp.org/api.php?action=parse&page=File:IMSLP902435.pdf&prop=wikitext&format=json",
  { headers: { "User-Agent": "OFRN-WebApp/1.0" } },
);
const wt = (await r.json()).parse?.wikitext?.["*"] || "";
console.log(wt.slice(0, 2000));
