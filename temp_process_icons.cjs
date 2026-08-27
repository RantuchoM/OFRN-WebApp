const fs = require("fs");
const path = require("path");

function processSvg(input, output) {
  const svg = fs.readFileSync(input, "utf8");
  const paths = [];
  const pathRe = /<path[^>]*>/gi;
  let m;
  while ((m = pathRe.exec(svg)) !== null) {
    const tag = m[0];
    if (/fill-opacity="0"|fill='0'|fill="none"|fill='none'|fill="url\(/i.test(tag)) continue;
    const dMatch = tag.match(/\sd="([^"]*)"/i) || tag.match(/\sd='([^']*)'/i);
    if (!dMatch) continue;
    paths.push(dMatch[1]);
  }
  const vbMatch = svg.match(/viewBox="([^"]*)"/i);
  const vb = vbMatch ? vbMatch[1].replace(/,/g, " ") : "0 0 512 512";
  const out =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">` +
    paths.map((d) => `<path fill="currentColor" d="${d}"/>`).join("") +
    `</svg>`;
  fs.writeFileSync(output, out);
  console.log(`${path.basename(output)}: ${paths.length} paths, ${out.length} bytes`);
}

const base = path.join(__dirname);
processSvg(path.join(base, "temp_ua_viola.svg"), path.join(base, "temp_proc_viola.svg"));
processSvg(path.join(base, "temp_ua_cello.svg"), path.join(base, "temp_proc_cello.svg"));
processSvg(path.join(base, "temp_ua_bass.svg"), path.join(base, "temp_proc_bass.svg"));
