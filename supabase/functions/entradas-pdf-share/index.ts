/**
 * Compatibilidad: redirige al PDF de la webapp (mismo generador jsPDF).
 * GET /entradas-pdf-share?t=<token> → /entradas/pdf?t=<token>
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PUBLIC_BASE = (Deno.env.get("ENTRADAS_PUBLIC_URL") ?? "https://ofrn-web-app.vercel.app").replace(
  /\/$/,
  "",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const url = new URL(req.url);
  const token = String(url.searchParams.get("t") || url.searchParams.get("token") || "")
    .trim()
    .toLowerCase();
  const target = `${PUBLIC_BASE}/entradas/pdf?t=${encodeURIComponent(token)}`;
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: target,
    },
  });
});
