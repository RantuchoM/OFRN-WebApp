import { supabase } from "./supabase";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { sortSegmentsByPdfVisualOrder } from "../utils/segmentVisualOrder";

const BUCKET = "translations";

/**
 * @param {number | string} userId
 * @param {File} file
 * @returns {Promise<{ path: string; publicUrl: string }>}
 */
export async function uploadTranslationPdf(userId, file) {
  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_");
  const path = `${userId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function listPartituras() {
  const { data, error } = await supabase
    .from("traduccion_partituras")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPartitura(id) {
  const { data, error } = await supabase
    .from("traduccion_partituras")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSegmentsForPartitura(partituraId) {
  const { data, error } = await supabase
    .from("traduccion_segments")
    .select("*")
    .eq("partitura_id", partituraId);
  if (error) throw error;
  return sortSegmentsByPdfVisualOrder(data || []);
}

/**
 * @param {object} partitura
 * @param {number | string} partitura.created_by
 * @param {string} partitura.titulo_en
 * @param {string} [partitura.titulo_es]
 * @param {string} [partitura.fecha_limite]
 * @param {string} partitura.pdf_url
 * @param {object[]} segments — filas listas para insert (sin id)
 */
export async function createPartituraWithSegments(partitura, segments) {
  const { data: row, error: e1 } = await supabase
    .from("traduccion_partituras")
    .insert({
      titulo_en: partitura.titulo_en,
      titulo_es: partitura.titulo_es ?? null,
      fecha_limite: partitura.fecha_limite ?? null,
      pdf_url: partitura.pdf_url,
      created_by: partitura.created_by,
    })
    .select("id")
    .single();
  if (e1) throw e1;

  const partituraId = row.id;
  if (!segments.length) return partituraId;

  const payload = segments.map((s) => ({
    partitura_id: partituraId,
    segment_name: s.segment_name,
    segment_english: s.segment_english ?? null,
    segment_spanish: s.segment_spanish ?? null,
    rect_x: s.rect_x,
    rect_y: s.rect_y,
    rect_w: s.rect_w,
    rect_h: s.rect_h,
    page_number: s.page_number ?? 1,
    verse_group: s.verse_group ?? null,
    orden_secuencia: s.orden_secuencia ?? null,
    control_flujo: s.control_flujo ?? "none",
    rima: s.rima ?? null,
    repeticion: s.repeticion ?? null,
  }));

  const { error: e2 } = await supabase.from("traduccion_segments").insert(payload);
  if (e2) throw e2;
  return partituraId;
}

export async function updatePartitura(id, patch) {
  const { error } = await supabase
    .from("traduccion_partituras")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function updateSegmentSpanish(segmentId, segment_spanish) {
  return updateSegment(segmentId, { segment_spanish });
}

/**
 * @param {number|string} segmentId
 * @param {{ segment_spanish?: string | null, segment_english?: string | null, control_flujo?: string | null, rima?: string | null, repeticion?: string | null }} patch
 */
export async function updateSegment(segmentId, patch) {
  const row = {};
  if ("segment_spanish" in patch) row.segment_spanish = patch.segment_spanish;
  if ("segment_english" in patch) row.segment_english = patch.segment_english;
  if ("control_flujo" in patch) row.control_flujo = patch.control_flujo;
  if ("rima" in patch) row.rima = patch.rima;
  if ("repeticion" in patch) row.repeticion = patch.repeticion;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase
    .from("traduccion_segments")
    .update(row)
    .eq("id", segmentId);
  if (error) throw error;
}

/**
 * Genera un PDF con los campos de texto rellenados con la traducción.
 * @param {string} pdfUrl — URL pública del PDF original
 * @param {{ segment_name: string; segment_spanish: string | null; segment_english: string | null }[]} segments
 * @returns {Promise<Uint8Array>}
 */
export async function buildTranslatedPdfBytes(pdfUrl, segments) {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`No se pudo descargar el PDF (${res.status})`);
  const buf = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  for (const seg of segments) {
    const text = seg.segment_spanish ?? seg.segment_english ?? "";
    try {
      form.getTextField(seg.segment_name).setText(text);
    } catch {
      try {
        const f = form.getField(seg.segment_name);
        if (f instanceof PDFTextField) f.setText(text);
      } catch {
        /* sin campo de texto con ese nombre */
      }
    }
  }

  return pdfDoc.save();
}
