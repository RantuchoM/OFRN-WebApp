import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IMSLP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const SOLFEGE: Record<string, string> = {
  C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si',
};

const INSTRUMENT_WORDS: { id: string; re: RegExp; label: string }[] = [
  { id: 'cello', re: /\b(violonchelos?|violoncellos?|cellos?)\b/i, label: 'Violoncello' },
  { id: 'violin', re: /\b(violines|violín|violin|violins)\b/i, label: 'Violín' },
  { id: 'viola', re: /\b(viola|violas)\b/i, label: 'Viola' },
  { id: 'bass', re: /\b(contrabajos?|double bass(?:es)?)\b/i, label: 'Contrabajo' },
  { id: 'horn', re: /\b(trompas?|cornos?|french horns?|horns?)\b/i, label: 'Corno' },
  { id: 'bassoon', re: /\b(fagot(?:e?s)?|bassoons?)\b/i, label: 'Fagot' },
  { id: 'flute', re: /\b(flautas?|flutes?)\b/i, label: 'Flauta' },
  { id: 'oboe', re: /\b(oboes?)\b/i, label: 'Oboe' },
  { id: 'clarinet', re: /\b(clarinetes?|clarinets?)\b/i, label: 'Clarinete' },
  { id: 'trumpet', re: /\b(trompetas?|trumpets?)\b/i, label: 'Trompeta' },
  { id: 'trombone', re: /\b(tromb[oó]n(?:es)?|trombones?)\b/i, label: 'Trombón' },
  { id: 'tuba', re: /\b(tubas?)\b/i, label: 'Tuba' },
  { id: 'piano', re: /\b(pianos?)\b/i, label: 'Piano' },
  { id: 'harp', re: /\b(arpas?|harps?)\b/i, label: 'Arpa' },
];

function foldText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ')
    .replace(/&#x266d;|&#9837;/gi, 'b')
    .replace(/&#x266f;|&#9839;/gi, '#')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#');
}

function htmlText(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function imslpRows(html: string): { th: string; tdHtml: string; td: string }[] {
  const rows: { th: string; tdHtml: string; td: string }[] = [];
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const row = match[1];
    const th = row.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i);
    const td = row.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i);
    if (!th || !td) continue;
    rows.push({ th: htmlText(th[1]), tdHtml: td[1], td: htmlText(td[1]) });
  }
  return rows;
}

function formatKey(raw: string): string | null {
  const normalized = decodeEntities(raw)
    .replace(/\b([A-G])b\b/gi, '$1-flat')
    .replace(/\b([A-G])\s+b\b/gi, '$1-flat')
    .replace(/\b([A-G])#/gi, '$1-sharp')
    .replace(/\b([A-G])\s+#/gi, '$1-sharp');
  const match = normalized.match(/\b([A-G])(?:-(flat|sharp))?\s+(major|minor)\b/i);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = (match[2] || '').toLowerCase();
  const mode = match[3].toLowerCase();
  let name = SOLFEGE[letter] || letter;
  if (accidental === 'flat') name += 'b';
  if (accidental === 'sharp') name += '#';
  if (mode === 'major') return `${name} mayor`;
  return `${name.toLowerCase()} menor`;
}

function formatCatalog(raw: string): string | null {
  const text = decodeEntities(raw);
  const opus = text.match(/\bOp\.?\s*(\d+[a-z]?)/i);
  if (opus) return `Op. ${opus[1]}`;
  const koechel = text.match(/\b(?:KV|K)\.?\s*(\d+[a-z]?)/i);
  if (koechel) return `K. ${koechel[1]}`;
  const bwv = text.match(/\bBWV\s*\.?\s*(\d+[a-z]?)/i);
  if (bwv) return `BWV ${bwv[1]}`;
  const deutsch = text.match(/\bD\.?\s*(\d+[a-z]?)/);
  if (deutsch) return `D. ${deutsch[1]}`;
  return null;
}

function cleanMovement(raw: string): string {
  const text = decodeEntities(raw)
    .replace(/\(\s*=\s*\d+\s*\)/g, ' ')
    .replace(/\([^)]*\b(?:major|minor|bars?|compases?)\b[^)]*\)/gi, ' ')
    .replace(/\s+\./g, '.')
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseMovements(tdHtml: string): string[] {
  const items = [...tdHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((item) => cleanMovement(htmlText(item[1])))
    .filter((item) => item.length > 0 && !/^\d*\s*movements?$/i.test(item));
  return items;
}

function toRoman(num: number): string {
  const pairs: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let n = num;
  let out = '';
  for (const [value, glyph] of pairs) {
    while (n >= value) {
      out += glyph;
      n -= value;
    }
  }
  return out;
}

function instrumentsIn(text: string): Set<string> {
  const found = new Set<string>();
  for (const instrument of INSTRUMENT_WORDS) {
    if (instrument.re.test(text)) found.add(instrument.id);
  }
  return found;
}

function applyInstrumentNames(text: string): string {
  let out = text;
  for (const instrument of INSTRUMENT_WORDS) {
    out = out.replace(instrument.re, instrument.label);
  }
  return out;
}

function composerPhrases(apellido: string, nombre: string, composerCell: string): string[] {
  const phrases = new Set<string>();
  const add = (value: string) => {
    const text = value.replace(/\s+/g, ' ').trim();
    if (text.length >= 3) phrases.add(text);
  };
  add(apellido);
  add(nombre);
  add(`${nombre} ${apellido}`);
  add(`${apellido}, ${nombre}`);
  const cell = composerCell.replace(/\s+/g, ' ').trim();
  if (cell.includes(',')) {
    const [surname, given] = cell.split(',').map((part) => part.trim());
    add(surname);
    add(given);
    add(`${given} ${surname}`);
  } else {
    add(cell);
  }
  return [...phrases].sort((a, b) => b.length - a.length);
}

function stripComposerMentions(head: string, phrases: string[]): string {
  let out = head;
  for (const phrase of phrases) {
    const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
    out = out.replace(new RegExp(`(?:\\b(?:de|del|di|by)\\s+)?\\b${body}\\b`, 'gi'), ' ');
  }
  return out
    .replace(/\bde\s+(?=en\b)/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function programHead(
  spanishName: string | null,
  englishTitle: string,
  phrases: string[] = [],
): string {
  let head = (spanishName || '').trim();
  if (!head) {
    const title = englishTitle.replace(/\s*\([^)]*\)\s*$/, '');
    const symphony = title.match(/symphony\s+no\.?\s*(\d+)/i);
    if (symphony) head = `Sinfonía Nro. ${symphony[1]}`;
    else if (/symphony/i.test(title)) head = 'Sinfonía';
    else if (/concerto/i.test(title)) {
      const prefixed = title.match(/^([^,]+?)\s+concerto/i);
      const prefixedFor = title.match(/concerto\s+for\s+([^,]+)/i);
      const instrument = applyInstrumentNames((prefixedFor?.[1] || prefixed?.[1] || '').trim());
      const number = title.match(/\bno\.?\s*(\d+)/i);
      head = instrument ? `Concierto para ${instrument}` : 'Concierto';
      if (number) head += ` Nro. ${number[1]}`;
    } else if (/overture/i.test(title)) head = 'Obertura';
    else if (/suite/i.test(title)) head = 'Suite';
    else head = title.replace(/,?\s*\bOp\.?\s*\d+.*/i, '').trim();
  }
  head = head
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+y\s+orquesta\b/gi, '')
    .replace(/,?\s*\b(?:Op|KV|K|BWV|D)\.?\s*\d+.*/i, '')
    .replace(/\ben\s+\S+(?:\s+\S+){0,2}\s+(?:mayor|menor)\b/gi, '')
    .replace(/\b(?:n\.?\s*º|nº|no\.|nro\.?|núm\.?)\s*(\d+)/gi, 'Nro. $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, '');
  head = stripComposerMentions(head, phrases);
  head = applyInstrumentNames(head);
  if (!head) return '';
  return head.charAt(0).toUpperCase() + head.slice(1);
}

function shortenComposerParen(title: string): string | null {
  const match = title.match(/^(.*)\(([^)]+)\)\s*$/);
  if (!match || !match[2].includes('-')) return null;
  const [surRaw, ...rest] = match[2].split(',');
  const sur = (surRaw || '').trim().split('-')[0].trim();
  if (!sur) return null;
  const ascii = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '');
  const given = rest.join(',').trim();
  const inner = given ? `${ascii(sur)}, ${ascii(given)}` : ascii(sur);
  return `${match[1].replace(/\s+$/, '')} (${inner})`;
}

function pageTitleVariants(title: string): string[] {
  const stripped = title
    .replace(/,?\s+in\s+[A-G](?:-|\s)?(?:flat|sharp)?\s+(?:major|minor)\b/gi, '')
    .replace(/\s+,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  const compactCatalog = stripped.replace(/\b(Op|No|KV|K|BWV|D)\.\s+(\d+)/gi, '$1.$2');
  const bases = [compactCatalog, stripped, title].filter((item, index, all) => item && all.indexOf(item) === index);
  const shortened = bases.map(shortenComposerParen).filter((item): item is string => Boolean(item));
  return [...shortened, ...bases].filter((item, index, all) => item && all.indexOf(item) === index);
}

function surnameMatches(composer: string, apellido: string): boolean {
  const folded = foldText(apellido);
  if (folded.length >= 2 && composer.includes(folded)) return true;
  const tokens = folded.split(/[^a-z0-9]+/).filter((token) => token.length >= 4);
  return tokens.some((token) => composer.includes(token));
}

function composerSuffixes(apellido: string, nombre: string): string[] {
  const surToken = apellido.split(/[-\s]+/).find((token) => foldText(token).length >= 4) || apellido.trim();
  const givenToken = (nombre.trim().split(/\s+/)[0] || '').trim();
  const ascii = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '');
  const suffixes = [
    givenToken ? `${surToken}, ${givenToken}` : surToken,
    givenToken ? `${ascii(surToken)}, ${ascii(givenToken)}` : ascii(surToken),
  ];
  return suffixes.filter((item, index, all) => item && all.indexOf(item) === index);
}

function catalogIdentity(title: string): string {
  const opus = title.match(/\bOp\.?\s*(\d+)/i);
  if (opus) return `op:${opus[1]}`;
  const number = title.match(/\bNo\.?\s*(\d+)/i);
  if (number) return `no:${number[1]}`;
  return pageTitleVariants(title)[0].toLowerCase();
}

function cleanImslpPageTitle(value: string): string {
  let title = value.trim().replace(/^["']|["']$/g, '');
  const fromUrl = title.match(/imslp\.org\/wiki\/([^#?\s]+)/i);
  if (fromUrl) title = decodeURIComponent(fromUrl[1]).replace(/_/g, ' ');
  return title.trim();
}

async function searchImslpWikiTitles(query: string): Promise<string[]> {
  const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(`site:imslp.org ${query}`);
  const response = await fetch(url, {
    headers: { 'User-Agent': IMSLP_UA, 'Accept': 'text/html' },
    redirect: 'follow',
  });
  if (!response.ok) return [];
  const html = await response.text();
  const titles: string[] = [];
  const re = /uddg=([^&"]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && titles.length < 5) {
    let decoded = match[1];
    try { decoded = decodeURIComponent(decoded); } catch { /* keep raw */ }
    const wiki = decoded.match(/imslp\.org\/wiki\/([^?#]+)/i);
    if (!wiki) continue;
    let title = wiki[1];
    try { title = decodeURIComponent(title); } catch { /* keep raw */ }
    title = title.replace(/_/g, ' ').trim();
    if (/^(Category|Special|User|File|Talk):/i.test(title)) continue;
    if (!titles.includes(title)) titles.push(title);
  }
  return titles;
}

async function fetchImslpHtml(pageTitle: string): Promise<string | null> {
  const slug = pageTitle.trim().replace(/ /g, '_');
  if (!slug) return null;
  const response = await fetch('https://imslp.org/wiki/' + encodeURI(slug), {
    headers: {
      'User-Agent': IMSLP_UA,
      'Accept': 'text/html',
      'Accept-Language': 'en',
    },
    redirect: 'follow',
  });
  if (!response.ok) return null;
  const html = await response.text();
  if (/friendlytest/i.test(html.slice(0, 1500))) return null;
  if (!/Opus\/Catalogue|Movements\/Sections|Name Translations/i.test(html)) return null;
  return html;
}

function readImslpWork(
  html: string,
  composer: { apellido: string; nombre: string } = { apellido: '', nombre: '' },
): { head: string; key: string | null; catalog: string | null; movements: string[] } | null {
  const rows = imslpRows(html);
  const keyRow = rows.find((row) => /^key$/i.test(row.th) && formatKey(row.td));
  const catalogRow = rows.find((row) => /opus|catalogue/i.test(row.th) && formatCatalog(row.td));
  const nameRow = rows.find((row) => /name translations/i.test(row.th));
  const spanish = nameRow?.tdHtml.match(/<span[^>]*\btitle="es"[^>]*>([\s\S]*?)<\/span>/i);
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const englishTitle = (titleMatch?.[1] || '').replace(/\s*-\s*IMSLP\s*$/i, '').trim();
  const composerCell = rows.find((row) => /^composer$/i.test(row.th))?.td || '';
  const head = programHead(
    spanish ? htmlText(spanish[1]) : null,
    englishTitle,
    composerPhrases(composer.apellido, composer.nombre, composerCell),
  );
  let movements: string[] = [];
  for (const row of rows) {
    if (!/movement/i.test(row.th)) continue;
    const parsed = parseMovements(row.tdHtml);
    if (parsed.length > movements.length) movements = parsed;
  }
  if (!head) return null;
  return {
    head,
    key: keyRow ? formatKey(keyRow.td) : null,
    catalog: catalogRow ? formatCatalog(catalogRow.td) : null,
    movements,
  };
}

function workMatchesQuery(
  html: string,
  query: { apellido: string; nombre: string; titulo: string },
): boolean {
  const rows = imslpRows(html);
  const composer = foldText(rows.find((row) => /^composer$/i.test(row.th))?.td || html);
  const surname = foldText(query.apellido);
  if (!surnameMatches(composer, query.apellido) && surname.length >= 2 && !composer.includes(surname)) return false;
  const given = foldText(query.nombre);
  if (given.length >= 3 && !composer.includes(given)) {
    const first = given.split(/\s+/)[0] || '';
    if (first.length < 3 || !composer.includes(first)) return false;
  }
  const askedOpus = query.titulo.match(/\bop\.?\s*(\d+)/i)?.[1];
  if (askedOpus) {
    const catalog = rows.find((row) => /opus|catalogue/i.test(row.th))?.td || '';
    if (!new RegExp(`\\b${askedOpus}\\b`).test(catalog)) return false;
  }
  const asked = instrumentsIn(query.titulo);
  if (asked.size) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const blob = [
      titleMatch?.[1] || '',
      rows.find((row) => /name translations/i.test(row.th))?.td || '',
    ].join(' ');
    const pageInstruments = instrumentsIn(blob);
    for (const id of asked) {
      if (!pageInstruments.has(id)) return false;
    }
  }
  return true;
}

function formatProgramTitle(work: { head: string; key: string | null; catalog: string | null; movements: string[] }): string {
  let line = work.head;
  if (work.key) line += ` en ${work.key}`;
  if (work.catalog) line += `, ${work.catalog}`;
  const movements = work.movements.slice(0, 24).map((movement, index) => `  ${toRoman(index + 1)}. ${movement}`);
  return [line, ...movements].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();

    // --- MODO: FIND_WORK_METADATA (año de composición + IMSLP) ---
    if (body?.type === 'FIND_WORK_METADATA') {
      const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
      const wantsIMSLP = !!body.linkDriveEmpty;
      if (!openaiKey) {
        return new Response(JSON.stringify({ year: null, imslpUrl: null, error: 'OPENAI_API_KEY no configurada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const openai = new OpenAI({ apiKey: openaiKey });
      const titulo = (body.titulo || '').trim();
      const compositorApellido = (body.compositorApellido || '').trim();
      const compositorNombre = (body.compositorNombre || '').trim();
      // Debe haber al menos título y algún dato de compositor (nombre o apellido)
      if (!titulo || (!compositorApellido && !compositorNombre)) {
        return new Response(JSON.stringify({ year: null, imslpUrl: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const compositorLabel = compositorNombre && compositorApellido
        ? `${compositorNombre} ${compositorApellido}`
        : (compositorApellido || compositorNombre);
      const systemContent = wantsIMSLP
        ? 'Eres un experto en música clásica. Debes identificar la obra EXACTA usando el nombre y apellido del compositor y el título completo (incluyendo movimientos y/o año si aparecen). NO INVENTES INFORMACIÓN. Usa solo fuentes confiables (catálogos oficiales, IMSLP, etc.). Si no puedes estar al menos en un 90% seguro de la obra y del año de composición, o hay varias obras posibles o las fuentes se contradicen, responde con {"year": null, "imslpUrl": null}. Si encuentras una única obra clara, responde ÚNICAMENTE con un objeto JSON válido, por ejemplo: {"year": 1896, "imslpUrl": "https://imslp.org/wiki/..."}. El campo "year" debe ser un número entero entre 1000 y 2100 o null. El campo "imslpUrl" debe ser la URL EXACTA de IMSLP para esa obra o null si no existe o no estás seguro. No incluyas texto adicional.'
        : 'Eres un experto en música clásica. Debes identificar la obra EXACTA usando el nombre y apellido del compositor y el título completo (incluyendo movimientos y/o año si aparecen). NO INVENTES INFORMACIÓN. Si no puedes estar al menos en un 90% seguro del año de composición o las fuentes se contradicen, responde {"year": null}. Responde ÚNICAMENTE con un objeto JSON válido: {"year": número} donde "year" es un entero entre 1000 y 2100 o null. No incluyas texto adicional.';
      let rawContent = '{}';
      try {
        const comp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemContent },
            {
              role: 'user',
              content: wantsIMSLP
                ? `Obra EXACTA "${titulo}" de ${compositorLabel}. Usa SOLO información que puedas verificar en fuentes confiables. Si no estás seguro, "year" e "imslpUrl" deben ser null. Respuesta JSON.`
                : `¿En qué año se compuso la obra EXACTA "${titulo}" de ${compositorLabel}? Si no estás seguro del año exacto, devuelve "year": null. Responde solo el JSON.`,
            },
          ],
          response_format: { type: 'json_object' },
        });
        rawContent = comp.choices[0]?.message?.content || '{}';
      } catch (openaiErr) {
        console.error('FIND_WORK_METADATA OpenAI:', openaiErr);
        return new Response(JSON.stringify({ year: null, imslpUrl: null, error: 'Error al llamar a OpenAI' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      let year: number | null = null;
      let imslpUrl: string | null = null;
      try {
        const parsed = JSON.parse(content);
        const rawYear = parsed?.year;
        const y = typeof rawYear === 'number'
          ? Math.floor(rawYear)
          : (typeof rawYear === 'string' ? parseInt(rawYear, 10) : null);
        if (!Number.isNaN(y) && y >= 1000 && y <= 2100) year = y;
        const urlRaw = parsed?.imslpUrl ?? parsed?.imslp_url;
        if (wantsIMSLP && typeof urlRaw === 'string') {
          const u = urlRaw.trim();
          if (u.startsWith('http://') || u.startsWith('https://')) imslpUrl = u;
        }
      } catch (e) {
        console.error('FIND_WORK_METADATA parse:', e);
      }
      return new Response(JSON.stringify({ year, imslpUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- MODO: FIND_TITLE_WITH_MOVEMENTS (sugerencia de título con movimientos) ---
    if (body?.type === 'FIND_TITLE_WITH_MOVEMENTS') {
      const titulo = (body.titulo || '').trim();
      const compositorApellido = (body.compositorApellido || '').trim();
      const compositorNombre = (body.compositorNombre || '').trim();
      const imslpUrl = String(body.imslpUrl || '').trim();

      if (imslpUrl) {
        if (!/imslp\.org\/wiki\//i.test(imslpUrl)) {
          return new Response(
            JSON.stringify({
              titleWithMovements: null,
              error: 'El link tiene que ser una página de obra de IMSLP (imslp.org/wiki/…).',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        try {
          const html = await fetchImslpHtml(cleanImslpPageTitle(imslpUrl));
          if (!html) {
            return new Response(
              JSON.stringify({
                titleWithMovements: null,
                error: 'No pude abrir esa página de IMSLP.',
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
          const work = readImslpWork(html, { apellido: compositorApellido, nombre: compositorNombre });
          if (!work) {
            return new Response(
              JSON.stringify({
                titleWithMovements: null,
                error: 'Esa página de IMSLP no tiene la ficha de la obra.',
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify({ titleWithMovements: formatProgramTitle(work) }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } catch (e) {
          console.error('FIND_TITLE_WITH_MOVEMENTS página IMSLP:', e);
          return new Response(
            JSON.stringify({
              titleWithMovements: null,
              error: 'No pude consultar esa página de IMSLP.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
      if (!openaiKey) {
        return new Response(
          JSON.stringify({ titleWithMovements: null, error: 'OPENAI_API_KEY no configurada' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const openai = new OpenAI({ apiKey: openaiKey });
      if (!titulo || (!compositorApellido && !compositorNombre)) {
        return new Response(
          JSON.stringify({
            titleWithMovements: null,
            error: 'Debe indicar título y al menos un compositor para buscar sugerencias.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const compositorLabel = compositorNombre && compositorApellido
        ? `${compositorNombre} ${compositorApellido}`
        : (compositorApellido || compositorNombre);

      if (/arreglo|recorte/i.test(titulo)) {
        return new Response(
          JSON.stringify({
            titleWithMovements: null,
            error: 'Este título parece un arreglo o un recorte. No lo reemplazo por la obra completa de IMSLP.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const systemContent =
        'Localizás artículos de IMSLP. Traducí el título del usuario al inglés de catálogo, sin el compositor, y devolvés hasta 3 títulos EXACTOS de página, del más probable al menos.\n' +
        'Formato: "Horn Concerto, Op.91 (Glière, Reinhold)". En el paréntesis usá el apellido corto de IMSLP (Mendelssohn, Felix, no Mendelssohn-Bartholdy).\n' +
        'No devuelvas movimientos ni tonalidad. Si el título no alcanza para elegir una sola obra (por ejemplo "Sinfonía" de Beethoven, sin número ni opus), englishTitle igual y pages vacío.\n' +
        'JSON válido: {"englishTitle": string, "pages": string[]}.';

      let pages: string[] = [];
      let englishTitle = '';
      try {
        const comp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemContent },
            {
              role: 'user',
              content:
                `Título aproximado: "${titulo}".\n` +
                `Apellido: ${compositorApellido || compositorLabel}.\n` +
                `Nombre: ${compositorNombre || ''}.\n` +
                'Devolvé los títulos de página IMSLP.',
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
        });
        const rawContent = (comp.choices[0]?.message?.content || '{}')
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(rawContent);
        englishTitle = typeof parsed?.englishTitle === 'string' ? parsed.englishTitle.trim() : '';
        const rawPages = Array.isArray(parsed?.pages) ? parsed.pages : [];
        pages = rawPages
          .filter((page: unknown): page is string => typeof page === 'string')
          .map((page) => cleanImslpPageTitle(page))
          .filter((page) => page.length > 0)
          .slice(0, 3);
      } catch (e) {
        console.error('FIND_TITLE_WITH_MOVEMENTS OpenAI:', e);
        return new Response(
          JSON.stringify({
            titleWithMovements: null,
            error: 'Error al llamar a OpenAI para sugerir el título.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const searchQuery = [compositorApellido, compositorNombre, englishTitle || titulo]
        .filter(Boolean)
        .join(' ')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      try {
        const found = await searchImslpWikiTitles(searchQuery);
        const extra = englishTitle && foldText(englishTitle) !== foldText(titulo)
          ? await searchImslpWikiTitles([compositorApellido, compositorNombre, titulo].filter(Boolean).join(' '))
          : [];
        pages = [...found, ...extra, ...pages].filter((page, index, all) => all.indexOf(page) === index).slice(0, 5);
      } catch (e) {
        console.error('FIND_TITLE_WITH_MOVEMENTS búsqueda IMSLP:', e);
      }

      if (!pages.length) {
        return new Response(
          JSON.stringify({
            titleWithMovements: null,
            error: 'Hay varias obras posibles. Indicá número u opus.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!/\d/.test(titulo)) {
        const identities = new Set(pages.map((page) => catalogIdentity(page)));
        if (identities.size > 1) {
          return new Response(
            JSON.stringify({
              titleWithMovements: null,
              error: 'Hay varias obras posibles. Indicá número u opus.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      let titleWithMovements: string | null = null;
      try {
        for (const page of pages) {
          const head = pageTitleVariants(page)[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
          const withComposer = composerSuffixes(compositorApellido, compositorNombre)
            .map((suffix) => `${head} (${suffix})`);
          const variants = [...pageTitleVariants(page), ...withComposer]
            .filter((item, index, all) => item && all.indexOf(item) === index);
          for (const variant of variants) {
            const html = await fetchImslpHtml(variant);
            if (!html) continue;
            if (!workMatchesQuery(html, { apellido: compositorApellido, nombre: compositorNombre, titulo })) continue;
            const work = readImslpWork(html, { apellido: compositorApellido, nombre: compositorNombre });
            if (!work) continue;
            titleWithMovements = formatProgramTitle(work);
            break;
          }
          if (titleWithMovements) break;
        }
      } catch (e) {
        console.error('FIND_TITLE_WITH_MOVEMENTS IMSLP:', e);
        return new Response(
          JSON.stringify({
            titleWithMovements: null,
            error: 'No pude consultar IMSLP.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!titleWithMovements) {
        console.error('FIND_TITLE_WITH_MOVEMENTS sin ficha:', pages);
      }

      return new Response(
        JSON.stringify(
          titleWithMovements
            ? { titleWithMovements }
            : { titleWithMovements: null, error: 'IMSLP no confirmó esa obra. Revisá compositor y título.' },
        ),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { messages, userId, currentPath } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''; 
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // --- FASE 1: HIDRATACIÓN DE IDENTIDAD ---
    let userProfile = "Usuario Invitado";
    let userInstrument = "No especificado";
    let integranteId = null; // ID numérico de la tabla 'integrantes'

    if (userId) {
      // 1. Buscar en 'perfiles' para obtener el 'id_integrante'
      // (Asumiendo que userId es el UUID de Supabase Auth)
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id_integrante, nombre_completo, rol')
        .eq('id', userId) // El ID de la tabla perfiles suele ser el UUID del usuario
        .single();

      if (perfil && perfil.id_integrante) {
         integranteId = perfil.id_integrante;
         
         // 2. Buscar detalles en 'integrantes'
         const { data: integrante } = await supabase
            .from('integrantes')
            .select('nombre, apellido, id_instr')
            .eq('id', integranteId)
            .single();

         if (integrante) {
             userProfile = `${integrante.nombre} ${integrante.apellido}`;
             userInstrument = integrante.id_instr || "Staff"; // id_instr parece ser el instrumento
         }
      } else {
         // Fallback si no hay perfil vinculado
         userProfile = perfil?.nombre_completo || "Usuario Staff";
      }
    }

    // --- FASE 2: CONTEXTO "DÓNDE ESTOY" ---
    let contextDetail = "";
    
    // Si la URL es tipo /giras/15, buscamos en 'programas'
    if (currentPath.includes('/giras/')) {
        const parts = currentPath.split('/');
        const giraId = parts[parts.length - 1]; 
        
        if (!isNaN(Number(giraId))) {
            const { data: prog } = await supabase
                .from('programas')
                .select('nombre_gira, fecha_desde, subtitulo')
                .eq('id', giraId)
                .single();
            
            if (prog) {
                contextDetail = `GIRA ACTUAL: "${prog.nombre_gira}" (${prog.subtitulo || ''}). Fecha inicio: ${prog.fecha_desde}.`;
            }
        }
    } 
    // Si es /repertorio/88, buscamos en 'obras'
    else if (currentPath.includes('/repertorio/')) {
        const parts = currentPath.split('/');
        const obraId = parts[parts.length - 1];
        if (!isNaN(Number(obraId))) {
             const { data: obra } = await supabase
                .from('obras')
                .select('titulo, compositores(apellido)')
                .eq('id', obraId)
                .single();
             
             if (obra) {
                 // Nota: compositores es un objeto porque es una relación
                 const compositor = obra.compositores ? obra.compositores.apellido : 'Desconocido';
                 contextDetail = `OBRA ACTUAL: "${obra.titulo}" de ${compositor}`;
             }
        }
    }

    // --- FASE 3: MANUAL ---
    const routeKey = currentPath.split('/')[1] ? `/${currentPath.split('/')[1]}` : '/';
    const { data: manualData } = await supabase
      .from('app_docs')
      .select('content')
      .in('route', ['/general', routeKey]);

    const docsContext = manualData?.map(d => d.content).join('\n') || "";

    // --- FASE 4: SYSTEM PROMPT ---
    const systemPrompt = `
      Eres el Asistente de la Orquesta Filarmónica (OFRN).
      
      PERFIL DEL USUARIO:
      - Nombre: ${userProfile}
      - Instrumento: ${userInstrument}
      - ID Interno: ${integranteId || "N/A"}
      
      SITUACIÓN:
      - Ruta: "${currentPath}"
      - Contexto: ${contextDetail || "Navegación general"}
      
      MANUAL:
      ${docsContext}

      INSTRUCCIONES:
      1. Si preguntan "¿Qué toco?", usa 'get_my_assignments'.
      2. Si preguntan por obras generales, usa 'search_works'.
      3. Responde cortésmente: "Hola ${userProfile.split(' ')[0]}..."
    `;

    // 5. Herramientas
    const tools = [
      {
        type: "function",
        function: {
          name: "get_my_assignments",
          description: "Busca qué obras tiene asignadas este músico específico.",
          parameters: { type: "object", properties: {} }, 
        },
      },
      {
        type: "function",
        function: {
          name: "search_works",
          description: "Busca obras en el archivo general.",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
      },
    ];

    // 6. Ejecución OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: tools,
      tool_choice: "auto",
    });

    const msg = completion.choices[0].message;

    if (msg.tool_calls) {
      const toolCall = msg.tool_calls[0];
      let toolResult = "";

      if (toolCall.function.name === "get_my_assignments") {
        if (!integranteId) {
            toolResult = "Error: No se pudo identificar tu ID de músico en el sistema. Contacta a RRHH.";
        } else {
            // Buscamos en 'seating_asignaciones' donde el array 'id_musicos_asignados' contenga al integrante
            const { data: seating } = await supabase
              .from('seating_asignaciones')
              .select(`
                id_obra,
                programas_repertorios (
                    nombre, 
                    programas (nombre_gira, fecha_desde)
                )
              `)
              .contains('id_musicos_asignados', [integranteId])
              .limit(10);
              
            toolResult = JSON.stringify(seating || "No tienes asignaciones registradas.");
        }
      }
      
      else if (toolCall.function.name === "search_works") {
        const args = JSON.parse(toolCall.function.arguments);
        const { data } = await supabase
            .from('obras')
            .select('titulo, compositores(apellido), instrumentacion')
            .ilike('titulo', `%${args.query}%`)
            .limit(5);
        toolResult = JSON.stringify(data || []);
      }

      // Segunda llamada
      const finalRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          msg,
          { role: "tool", tool_call_id: toolCall.id, content: toolResult }
        ]
      });

      return new Response(JSON.stringify(finalRes.choices[0].message), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify(msg), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
