/**
 * Genera Excel con ofertas LinkedIn (últimos 7 días), score y CV adaptado.
 * Fuentes: páginas públicas de listados LinkedIn scrapeadas + ofertas verificadas.
 */
import ExcelJS from "exceljs";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "output", "LinkedIn_Ofertas_Martin_Rantucho.xlsx");
const AGENT_TOOLS = join(
  process.env.USERPROFILE || "",
  ".cursor",
  "projects",
  "c-Proyectos-OFRN-WebApp",
  "agent-tools"
);

const PROFILE = {
  name: "Martín Rantucho",
  email: "martin.rantucho@gmail.com",
  location: "Viedma, Argentina (UTC−3)",
  stacks: [
    "react",
    "javascript",
    "vite",
    "supabase",
    "postgresql",
    "tanstack",
    "pwa",
    "pdf",
    "openai",
    "git",
    "tailwind",
    "typescript",
    "node",
    "next.js",
    "nextjs",
  ],
  translation: [
    "translation",
    "translator",
    "localization",
    "localisation",
    "proofread",
    "bilingual",
    "english",
    "spanish",
    "en-es",
    "editorial",
    "linguist",
  ],
  exclude: [
    "interpreter",
    "interpreters",
    "court interpreter",
    "tagalog",
    "sinhalese",
    "mam ",
    "filipino",
    "over-the-phone",
    "simultaneous interpretation",
  ],
};

// Ofertas adicionales verificadas manualmente (descripciones públicas LinkedIn)
const MANUAL_JOBS = [
  {
    title: "Remote Full-Stack JS/TS Developer - 20414",
    company: "Turing",
    url: "https://www.linkedin.com/jobs/view/remote-full-stack-js-ts-developer-20414-at-turing-4253231369",
    posted: "3 days ago",
    remote: true,
    keywords: ["javascript", "typescript", "react", "full stack", "remote"],
  },
  {
    title: "Full Stack Developer (Next.js | Supabase)",
    company: "Interlix Staffing",
    url: "https://www.linkedin.com/jobs/view/full-stack-developer-next-js-supabase-at-interlix-staffing-4305202148",
    posted: "within 7 days",
    remote: true,
    keywords: ["next.js", "react", "supabase", "typescript", "postgresql", "openai", "latin america"],
  },
  {
    title: "Junior / Mid-Level Full-Stack Developer (Remote)",
    company: "Contract (Australia client)",
    url: "https://lk.linkedin.com/jobs/view/junior-mid-level-full-stack-developer-remote-at-contract-4337805747",
    posted: "within 7 days",
    remote: true,
    keywords: ["react", "supabase", "next.js", "postgresql", "remote", "cursor"],
  },
  {
    title: "Freelance Translators – All Languages | CCI Group",
    company: "CCI Group",
    url: "https://www.linkedin.com/jobs/view/freelance-translators-–-all-languages-cci-group-at-cci-group-interpretation-translation-4215172176",
    posted: "1 day ago",
    remote: true,
    keywords: ["freelance", "translator", "translation"],
  },
  {
    title: "Language Specialist (English and Spanish)",
    company: "Innodata",
    url: "https://www.linkedin.com/jobs/view/language-specialist-english-and-spanish-at-innodata-lanka-4200520470",
    posted: "within 7 days",
    remote: false,
    keywords: ["english", "spanish", "language specialist", "localization"],
  },
  {
    title: "Project Manager (Localization) W2 637 - Remote",
    company: "Braintrust",
    url: "https://www.linkedin.com/jobs/view/project-manager-localization-w2-637-remote-at-braintrust-4211161143",
    posted: "within 7 days",
    remote: true,
    keywords: ["localization", "project manager", "remote"],
  },
];

function parsePostedDays(text) {
  if (!text) return 999;
  const t = text.toLowerCase();
  const h = t.match(/(\d+)\s*hours?\s*ago/);
  if (h) return 0;
  const d = t.match(/(\d+)\s*days?\s*ago/);
  if (d) return parseInt(d[1], 10);
  if (t.includes("1 day ago") || t.includes("1 days ago")) return 1;
  if (t.includes("within 7 days")) return 3;
  if (t.includes("1 week ago") || t.includes("7 days ago")) return 7;
  if (t.includes("2 weeks")) return 14;
  const w = t.match(/(\d+)\s*weeks?\s*ago/);
  if (w) return parseInt(w[1], 10) * 7;
  const mo = t.match(/(\d+)\s*months?\s*ago/);
  if (mo) return parseInt(mo[1], 10) * 30;
  if (t.includes("1 year")) return 365;
  return 999;
}

function cleanUrl(url) {
  return url
    .replace(/&amp;/g, "&")
    .split("?")[0]
    .replace("https://in.linkedin.com", "https://www.linkedin.com")
    .replace("https://lk.linkedin.com", "https://www.linkedin.com")
    .replace("https://ph.linkedin.com", "https://www.linkedin.com");
}

function cleanCompany(raw) {
  if (!raw) return "";
  return raw
    .replace(/\(https?:\/\/[^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
}

function parseJobsFromText(content) {
  const jobs = [];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const urlMatch = line.match(
      /https:\/\/(?:www\.|in\.|lk\.|ph\.)linkedin\.com\/jobs\/view\/[^\s?]+/
    );
    if (urlMatch) {
      const url = cleanUrl(urlMatch[0]);
      let title = "";
      let company = "";
      let posted = "";
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        const l = lines[j].trim();
        if (l.startsWith("### ") && !title) title = l.replace(/^###\s+/, "");
        else if (l.startsWith("#### ") && !company)
          company = l.replace(/^####\s+/, "").replace(/\[|\]/g, "");
        else if (
          /\d+\s+(hours?|days?|weeks?|months?)\s+ago/i.test(l) ||
          l === "1 week ago" ||
          l.endsWith("1 week ago")
        ) {
          const pm = l.match(
            /(\d+\s+(?:hours?|days?|weeks?|months?)\s+ago|1 week ago)/i
          );
          posted = pm ? pm[1] : l;
        }
      }
      if (title && !title.includes("Jobs in")) {
        jobs.push({
          title,
          company: cleanCompany(company),
          url,
          posted,
        });
      }
    }
    i++;
  }
  return jobs;
}

function loadScrapedJobs() {
  const all = [];
  try {
    const files = readdirSync(AGENT_TOOLS).filter((f) => f.endsWith(".txt"));
    for (const f of files) {
      const content = readFileSync(join(AGENT_TOOLS, f), "utf8");
      all.push(...parseJobsFromText(content));
    }
  } catch {
    /* agent-tools optional */
  }
  for (const j of MANUAL_JOBS) {
    all.push({
      title: j.title,
      company: j.company,
      url: cleanUrl(j.url),
      posted: j.posted,
      _keywords: j.keywords,
      _remote: j.remote,
    });
  }
  const seen = new Set();
  return all.filter((j) => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
}

function isRelevant(job) {
  const blob = `${job.title} ${job.company}`.toLowerCase();
  for (const ex of PROFILE.exclude) {
    if (blob.includes(ex)) return false;
  }
  const dev = PROFILE.stacks.some((k) => blob.includes(k.replace(".", "")));
  const trans = PROFILE.translation.some((k) => blob.includes(k));
  const roleWords =
    /full.?stack|front.?end|front end|web developer|software engineer|react|supabase|localization|translator|translation|technical writer|saas developer|language specialist|proofread/i;
  return (dev || trans) && roleWords.test(blob);
}

function scoreJob(job) {
  const blob = `${job.title} ${job.company} ${(job._keywords || []).join(" ")}`.toLowerCase();
  let score = 40;
  const boosts = [
    [/supabase/, 18],
    [/react/, 12],
    [/full.?stack|full stack/, 10],
    [/remote/, 8],
    [/javascript|typescript/, 8],
    [/postgresql|sql/, 6],
    [/localization|translator|translation|bilingual/, 14],
    [/english.*spanish|spanish.*english|en-es/, 10],
    [/latin america|latam|argentina/, 8],
    [/openai|ai/, 5],
    [/pwa|vite/, 4],
    [/junior|entry/, -8],
    [/senior|staff/, -12],
    [/\.net|ruby on rails|vue\.?js|flutter|angular/i, -10],
    [/html.?css\)/i, -5],
    [/node\.?js|next\.?js/, 6],
    [/religious|editorial|content/, 5],
    [/\$85|\$80|\$70|hr/, 3],
  ];
  for (const [re, pts] of boosts) {
    if (re.test(blob)) score += pts;
  }
  if (parsePostedDays(job.posted) <= 3) score += 5;
  if (job._remote === true || /remote/i.test(blob)) score += 5;
  // OFRN alignment
  if (/supabase|react|postgresql|pdf|pwa/i.test(blob)) score += 8;
  if (/localization|translator/i.test(blob) && /rws|religious|editorial|language/i.test(blob))
    score += 6;
  return Math.min(98, Math.max(35, Math.round(score)));
}

function buildCV(job, score) {
  const t = job.title.toLowerCase();
  const isTrans =
    /translat|localiz|linguist|proofread|bilingual|language specialist/i.test(t);
  const isFrontend = /front.?end|frontend/i.test(t) && !/full/i.test(t);
  const isSupabase = /supabase|next\.?js/i.test(t);

  let headline = "Full-Stack Developer (React · Supabase · PostgreSQL) — Remote";
  if (isTrans) headline = "EN→ES Translator & Localization Specialist — Remote";
  else if (isFrontend) headline = "Frontend Developer (React) — Remote";
  else if (isSupabase) headline = "Full-Stack Developer (React · Supabase) — Remote";

  const profile = isTrans
    ? `Professional EN→ES translator (RWS, LDS Sacred Materials) with technical fluency in React-based bilingual content tooling. Cambridge FCE; daily English in client workflows. Detail-oriented, remote-first, terminology-driven.`
    : isSupabase
      ? `Full-stack developer with 4+ years shipping a production orchestra-operations platform on React, Supabase, and PostgreSQL. Built auth, RLS, 20+ Edge Functions, PWA, and PDF automation. Async remote worker; spec-driven delivery.`
      : `Full-stack developer with 4+ years building production web apps (React, Vite, Supabase, PostgreSQL). Combines shipped product ownership with enterprise EN→ES translation experience. Remote, documentation-driven, impact-focused.`;

  const bullets = isTrans
    ? [
        `• Delivered publication-ready EN→ES translations for LDS Church materials via RWS, maintaining on-time delivery and terminology consistency, by applying style guides and supervisor QA loops.`,
        `• Contributed to Sacred Materials (Hymns for Home and Church), reducing revision cycles on assigned batches, by aligning liturgical terminology early with international editors.`,
        `• Built bilingual PDF/music-content tooling in a React production app, enabling segment-level EN/ES editorial control, by parsing AcroForm fields and storing structured translation segments in PostgreSQL.`,
      ]
    : [
        `• Built the organization's end-to-end operations web app for tours, roster, logistics, seating, and sheet-music distribution, by shipping 270+ React components and 20+ Supabase Edge Functions over 4 years as sole developer.`,
        `• Cut manual sheet-music prep effort, by automating PDF merge, seating-based copy counts, bulk export, and Google Drive upload pipelines.`,
        `• Improved maintainability across a large codebase, by completing 6 spec-driven refactoring phases (shared hooks, UI primitives, PostgreSQL RLS patterns).`,
      ];

  const tailor = [];
  if (/react/i.test(t)) tailor.push("Lead with React production experience (OFRN, 270+ components).");
  if (/supabase/i.test(t))
    tailor.push("Emphasize Supabase Auth, PostgreSQL, RLS, Edge Functions (manage-drive, ask-ai).");
  if (/typescript/i.test(t))
    tailor.push("Note TypeScript-ready stack; BYU-Idaho Web Development coursework.");
  if (/next\.?js/i.test(t))
    tailor.push("Frame Vite/React skills as transferable to Next.js; highlight SSR-ready patterns if asked.");
  if (/openai|ai/i.test(t))
    tailor.push("Mention OpenAI integration in OFRN (ask-ai Edge Function).");
  if (/remote|latin/i.test(t))
    tailor.push("Highlight UTC−3 overlap with US time zones; fully remote since 2021.");
  if (isTrans) tailor.push("Lead with RWS + Sacred Materials; mention religious/editorial domain expertise.");

  return `MARTÍN RANTUCHO
${headline}
${PROFILE.location} · ${PROFILE.email}

PROFILE
${profile}

CORE SKILLS
${isTrans ? "Translation · Localization · EN-ES · Proofreading · Terminology · Style guides · React · PostgreSQL · Remote collaboration" : "React · JavaScript · Vite · TanStack Query · Supabase · PostgreSQL · REST APIs · Edge Functions · Git · PWA · Tailwind CSS · PDF automation · Remote collaboration"}

EXPERIENCE (XYZ)
${bullets.join("\n")}

${!isTrans ? `FREELANCE TRANSLATOR · RWS · Remote · 2024–Present
• Delivered EN→ES translations on deadline for institutional clients, by applying terminology consistency and editorial QA.

` : ""}EDUCATION
Associate, Web Development — BYU-Idaho (Online, expected 2025)
Licentiate, Music Therapy — UBA, 2015

LANGUAGES
English — Professional working proficiency (Cambridge FCE; daily use)
Spanish — Native

── TAILORED FOR: ${job.title} @ ${job.company} ──
Match score: ${score}/100
${tailor.map((x) => `• ${x}`).join("\n")}`;
}

async function main() {
  const raw = loadScrapedJobs();
  const filtered = raw
    .filter((j) => parsePostedDays(j.posted) <= 7)
    .filter(isRelevant)
    .map((j) => ({
      ...j,
      company: cleanCompany(j.company),
      score: scoreJob(j),
      days: parsePostedDays(j.posted),
    }))
    .filter((j) => j.title.length > 3)
    .sort((a, b) => b.score - a.score);

  const wb = new ExcelJS.Workbook();
  wb.creator = "OFRN-WebApp generator";
  const ws = wb.addWorksheet("Ofertas LinkedIn", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "#", key: "n", width: 5 },
    { header: "Puesto", key: "title", width: 42 },
    { header: "Empresa", key: "company", width: 22 },
    { header: "Publicado", key: "posted", width: 14 },
    { header: "Remoto", key: "remote", width: 10 },
    { header: "Coincidencia", key: "score", width: 14 },
    { header: "Enlace LinkedIn", key: "url", width: 55 },
    { header: "CV personalizado", key: "cv", width: 80 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  filtered.forEach((job, idx) => {
    const cv = buildCV(job, job.score);
    const row = ws.addRow({
      n: idx + 1,
      title: job.title,
      company: job.company,
      posted: job.posted || `${job.days}d`,
      remote: /remote/i.test(`${job.title} ${job.posted}`) || job._remote ? "Sí" : "Ver oferta",
      score: `${job.score}/100`,
      url: job.url,
      cv,
    });
    row.getCell("url").value = { text: job.url, hyperlink: job.url };
    row.getCell("url").font = { color: { argb: "FF0563C1" }, underline: true };
    row.getCell("cv").alignment = { wrapText: true, vertical: "top" };
    row.height = Math.min(400, 60 + cv.split("\n").length * 12);
  });

  const meta = wb.addWorksheet("Notas");
  meta.addRow(["Generado", new Date().toISOString()]);
  meta.addRow(["Filtro", "Últimos 7 días · roles dev React/Full Stack/Supabase + traducción/localización"]);
  meta.addRow(["Total ofertas", filtered.length]);
  meta.addRow([
    "Limitación",
    "LinkedIn requiere login para búsquedas exhaustivas; datos de listados públicos + ofertas verificadas manualmente.",
  ]);
  meta.addRow([
    "Cómo actualizar",
    "Volver a ejecutar: node scripts/generate-linkedin-jobs-excel.mjs",
  ]);

  await wb.xlsx.writeFile(OUT);
  console.log(`Excel generado: ${OUT}`);
  console.log(`Ofertas incluidas: ${filtered.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
