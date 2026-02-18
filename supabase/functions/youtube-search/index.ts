// Requiere en Supabase: Settings → Edge Functions → Secrets → YOUTUBE_API_KEY
// (API key de Google Cloud Console, YouTube Data API v3 habilitada)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchItem {
  id: string;
  title: string;
  link: string;
  thumbnailUrl: string | null;
  duration: string | null;
  durationSeconds: number | null;
}

function parseISO8601ToSeconds(iso: string): number | null {
  const m = iso.toUpperCase().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const h = parseInt(m[1] || "0", 10);
  const min = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + min * 60 + s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "YOUTUBE_API_KEY not configured", results: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { query } = (await req.json()) as { query?: string };
    const q = (query || "").trim();
    if (!q) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q)}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error("YouTube search error:", searchRes.status, err);
      return new Response(
        JSON.stringify({ error: "YouTube search failed", results: [] }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const searchData = await searchRes.json();
    const items = searchData.items || [];
    const videoIds = items
      .map((i: { id?: { videoId?: string } }) => i.id?.videoId)
      .filter(Boolean);
    if (videoIds.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(",")}&key=${apiKey}`;
    const videosRes = await fetch(videosUrl);
    const videosData = videosRes.ok ? await videosRes.json() : { items: [] };
    const durationById: Record<string, string> = {};
    for (const v of videosData.items || []) {
      if (v.id && v.contentDetails?.duration) {
        durationById[v.id] = v.contentDetails.duration;
      }
    }

    const results: SearchItem[] = items.slice(0, 3).map((i: {
      id?: { videoId?: string };
      snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
    }) => {
      const id = i.id?.videoId || "";
      const title = i.snippet?.title || "";
      const thumb = i.snippet?.thumbnails?.default?.url ?? null;
      const durationIso = durationById[id] ?? null;
      const durationSeconds = durationIso ? parseISO8601ToSeconds(durationIso) : null;
      return {
        id,
        title,
        link: id ? `https://www.youtube.com/watch?v=${id}` : "",
        thumbnailUrl: thumb,
        duration: durationIso,
        durationSeconds,
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-search:", e);
    return new Response(
      JSON.stringify({ error: String(e), results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
