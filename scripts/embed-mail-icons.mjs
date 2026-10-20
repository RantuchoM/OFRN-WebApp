import fs from "fs";

const icons = ["icon-agenda", "icon-repertorio", "icon-comidas", "giras-tabs"];
let out =
  "// Auto-generated PNG icons for convocatoria mail (CID attachments)\n";
out += "export const MAIL_ICON_PNGS: Record<string, string> = {\n";
for (const name of icons) {
  const b64 = fs.readFileSync(`public/mail/${name}.png`).toString("base64");
  out += `  "${name}": "${b64}",\n`;
}
out += "};\n";
fs.writeFileSync("supabase/functions/mails_produccion/mailIcons.ts", out);
console.log("wrote", out.length, "chars");
