/**
 * Extrae coordenadas de URLs típicas de Google Maps.
 * @param {string | null | undefined} url
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseGoogleMapsCoords(url) {
  if (!url || typeof url !== "string") return null;
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

  // place URLs: ...!3d-40.123!4d-71.456
  const d3Match = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d3Match) {
    const lat = Number(d3Match[1]);
    const lng = Number(d3Match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

/**
 * Coordenadas de una locación: columnas lat/lng o extracción desde link_mapa largo.
 * Los links cortos (maps.app.goo.gl) no incluyen coords en el texto — hay que guardar lat/lng.
 * @param {{ latitud?: number | null, longitud?: number | null, link_mapa?: string | null } | null | undefined} loc
 * @returns {{ lat: number, lng: number } | null}
 */
export function resolveLocacionCoords(loc) {
  if (!loc) return null;
  const lat = Number(loc.latitud);
  const lng = Number(loc.longitud);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return parseGoogleMapsCoords(loc.link_mapa);
}

/** True si la locación tiene lat/lng guardadas en BD (no inferidas del link). */
export function locacionHasStoredCoords(loc) {
  if (!loc) return false;
  const lat = Number(loc.latitud);
  const lng = Number(loc.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return !(Math.abs(lat) < 1e-5 && Math.abs(lng) < 1e-5);
}

/** True si el link parece acortado (no parseable sin resolver redirect). */
export function isShortGoogleMapsLink(url) {
  if (!url || typeof url !== "string") return false;
  const s = url.trim().toLowerCase();
  return (
    s.includes("maps.app.goo.gl/") ||
    s.includes("goo.gl/maps/") ||
    s.includes("g.co/kgs/")
  );
}

/**
 * Resuelve coords desde un link de Google Maps.
 * En el navegador usa Edge Function (evita CORS de Google). En Node usa fetch directo.
 * @param {string | null | undefined} url
 * @param {{ fetchImpl?: typeof fetch, supabase?: import('@supabase/supabase-js').SupabaseClient } | typeof fetch} [optionsOrFetch]
 * @returns {Promise<{ lat: number, lng: number, resolvedFrom: string } | null>}
 */
export async function resolveGoogleMapsLinkCoords(url, optionsOrFetch) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const options =
    typeof optionsOrFetch === "function"
      ? { fetchImpl: optionsOrFetch }
      : optionsOrFetch || {};
  const fetchImpl =
    options.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);

  const direct = parseGoogleMapsCoords(trimmed);
  if (direct) {
    return { ...direct, resolvedFrom: trimmed };
  }

  if (options.supabase) {
    const { data, error } = await options.supabase.functions.invoke(
      "resolve-maps-coords",
      { body: { url: trimmed } },
    );
    if (error) {
      throw new Error(error.message || "No se pudieron obtener coordenadas");
    }
    if (data?.ok && data.lat != null && data.lng != null) {
      return {
        lat: Number(data.lat),
        lng: Number(data.lng),
        resolvedFrom: data.resolvedFrom || trimmed,
      };
    }
    return null;
  }

  if (!fetchImpl) return null;

  try {
    const res = await fetchImpl(trimmed, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng, resolvedFrom: finalUrl };
          }
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @returns {number} metros
 */
export function haversineMeters(a, b) {
  if (!a || !b) return NaN;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * URL para abrir un pin en Google Maps.
 * @param {number} lat
 * @param {number} lng
 * @returns {string | null}
 */
export function googleMapsUrlForCoords(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${la},${ln}`;
}
