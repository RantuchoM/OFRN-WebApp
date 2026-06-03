const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
  const s = url.trim();

  const atMatch = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const qMatch = s.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    const lat = Number(qMatch[1]);
    const lng = Number(qMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const llMatch = s.match(/[?&]ll=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (llMatch) {
    const lat = Number(llMatch[1]);
    const lng = Number(llMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const d3Match = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d3Match) {
    const lat = Number(d3Match[1]);
    const lng = Number(d3Match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

function isAllowedMapsUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    const h = u.hostname.toLowerCase();
    return (
      h === "maps.app.goo.gl" ||
      h === "goo.gl" ||
      h === "g.co" ||
      h.endsWith(".google.com") ||
      h === "google.com"
    );
  } catch {
    return false;
  }
}

function parseCoordsFromHtml(html: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

async function resolveCoords(url: string) {
  const trimmed = url.trim();
  const direct = parseGoogleMapsCoords(trimmed);
  if (direct) {
    return { ...direct, resolvedFrom: trimmed };
  }

  const res = await fetch(trimmed, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; OFRN-ResolveMapsCoords/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const finalUrl = res.url || trimmed;
  const fromFinal = parseGoogleMapsCoords(finalUrl);
  if (fromFinal) {
    return { ...fromFinal, resolvedFrom: finalUrl };
  }

  if (res.ok) {
    const html = await res.text();
    const fromHtml = parseCoordsFromHtml(html);
    if (fromHtml) {
      return { ...fromHtml, resolvedFrom: finalUrl };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = (await req.json()) as { url?: string };
    const trimmed = (url || "").trim();
    if (!trimmed) {
      return new Response(JSON.stringify({ error: "url requerida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isAllowedMapsUrl(trimmed)) {
      return new Response(JSON.stringify({ error: "URL de Maps no permitida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const coords = await resolveCoords(trimmed);
    if (!coords) {
      return new Response(JSON.stringify({ error: "No se pudieron obtener coordenadas" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, lat: coords.lat, lng: coords.lng, resolvedFrom: coords.resolvedFrom }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("resolve-maps-coords:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
