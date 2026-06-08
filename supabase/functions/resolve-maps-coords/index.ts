const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const REGION_SUFFIX = "Rio Negro, Argentina";

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
    /"lat":\s*(-?\d+(?:\.\d+)?)[^}]*"lng":\s*(-?\d+(?:\.\d+)?)/,
    /center=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i,
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

function buildMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGeocodeAttempts(input: {
  nombre?: string;
  direccion?: string;
  localidad?: string;
  query?: string;
}) {
  const nombre = input.nombre?.trim() || "";
  const direccion = input.direccion?.trim() || "";
  const localidad = input.localidad?.trim() || "";
  const full = input.query?.trim() || "";

  const googleFirst: string[] = [];
  const nominatimFirst: string[] = [];

  if (nombre && direccion && localidad) {
    googleFirst.push(`${nombre}, ${direccion}, ${localidad}, ${REGION_SUFFIX}`);
  }
  if (direccion && localidad) {
    nominatimFirst.push(`${direccion}, ${localidad}, ${REGION_SUFFIX}`);
    googleFirst.push(`${direccion}, ${localidad}, ${REGION_SUFFIX}`);
  }
  if (nombre && localidad) {
    googleFirst.push(`${nombre}, ${localidad}, ${REGION_SUFFIX}`);
  }
  if (direccion) {
    nominatimFirst.push(`${direccion}, ${REGION_SUFFIX}`);
    googleFirst.push(`${direccion}, ${REGION_SUFFIX}`);
  }
  if (localidad) {
    nominatimFirst.push(`${localidad}, ${REGION_SUFFIX}`);
    googleFirst.push(`${localidad}, ${REGION_SUFFIX}`);
  }
  if (full) {
    googleFirst.push(full);
    nominatimFirst.push(full);
  }

  const dedupe = (list: string[]) => [...new Set(list.filter(Boolean))];

  return {
    google: dedupe(googleFirst),
    nominatim: dedupe(nominatimFirst),
  };
}

async function resolveCoordsFromUrl(url: string) {
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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/json",
      "Accept-Language": "es-AR,es;q=0.9",
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

async function geocodeWithGoogleMapsApi(query: string, apiKey: string) {
  const params = new URLSearchParams({
    address: query,
    key: apiKey,
    region: "ar",
    language: "es",
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    { headers: { Accept: "application/json" } },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (data?.status !== "OK" || !Array.isArray(data.results) || !data.results.length) {
    return null;
  }

  const loc = data.results[0]?.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const mapsUrl =
    data.results[0]?.url ||
    buildMapsSearchUrl(`${lat},${lng}`);

  return { lat, lng, resolvedFrom: mapsUrl };
}

async function geocodeWithNominatim(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "ar",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "OFRN-WebApp/1.0 (resolve-maps-coords)",
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) return null;

  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const lat = Number(results[0].lat);
  const lng = Number(results[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    resolvedFrom: buildMapsSearchUrl(`${lat},${lng}`),
  };
}

async function geocodeFromAddressData(input: {
  nombre?: string;
  direccion?: string;
  localidad?: string;
  query?: string;
}) {
  const { google, nominatim } = buildGeocodeAttempts(input);
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY")?.trim();

  if (apiKey) {
    for (const q of google) {
      const coords = await geocodeWithGoogleMapsApi(q, apiKey);
      if (coords) return coords;
    }
  }

  for (const q of google) {
    const coords = await resolveCoordsFromUrl(buildMapsSearchUrl(q));
    if (coords) return coords;
  }

  for (const q of nominatim) {
    const coords = await geocodeWithNominatim(q);
    if (coords) return coords;
  }

  return null;
}

function okResponse(coords: { lat: number; lng: number; resolvedFrom: string }) {
  return new Response(
    JSON.stringify({
      ok: true,
      lat: coords.lat,
      lng: coords.lng,
      resolvedFrom: coords.resolvedFrom,
    }),
    { headers: JSON_HEADERS },
  );
}

function failResponse(message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      url?: string;
      query?: string;
      nombre?: string;
      direccion?: string;
      localidad?: string;
    };

    const hasAddressData =
      body.query?.trim() ||
      body.nombre?.trim() ||
      body.direccion?.trim() ||
      body.localidad?.trim();

    if (hasAddressData && !body.url?.trim()) {
      const fromAddress = await geocodeFromAddressData(body);
      if (fromAddress) return okResponse(fromAddress);
      return failResponse(
        "No se encontraron coordenadas para esa dirección o localidad",
      );
    }

    const trimmed = (body.url || "").trim();
    if (!trimmed) {
      return new Response(JSON.stringify({ ok: false, error: "url o datos de dirección requeridos" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    if (!isAllowedMapsUrl(trimmed)) {
      return new Response(JSON.stringify({ ok: false, error: "URL de Maps no permitida" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const coords = await resolveCoordsFromUrl(trimmed);
    if (!coords) {
      return failResponse("No se pudieron obtener coordenadas de ese link");
    }

    return okResponse(coords);
  } catch (e) {
    console.error("resolve-maps-coords:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
