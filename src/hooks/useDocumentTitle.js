import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_DOCUMENT_TITLE,
  resolveAppDocumentTitle,
} from "../utils/documentTitle";

export function useDocumentTitle({
  mode,
  searchParams,
  pathname,
  supabase,
  activeGiraId,
  enabled = true,
  staticTitle = null,
}) {
  const [giraName, setGiraName] = useState(null);
  const giraNameCache = useRef(new Map());

  const giraId =
    mode === "GIRAS"
      ? activeGiraId || searchParams?.get("giraId")
      : null;

  useEffect(() => {
    if (!enabled || !giraId || !supabase) {
      setGiraName(null);
      return;
    }

    const cached = giraNameCache.current.get(String(giraId));
    if (cached) {
      setGiraName(cached);
      return;
    }

    let cancelled = false;
    supabase
      .from("programas")
      .select("nombre_gira")
      .eq("id", giraId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const name = data?.nombre_gira?.trim() || null;
        if (name) giraNameCache.current.set(String(giraId), name);
        setGiraName(name);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, giraId, supabase]);

  const searchKey = searchParams?.toString() ?? "";

  useEffect(() => {
    if (!enabled) return;

    const title =
      staticTitle ||
      resolveAppDocumentTitle({
        mode,
        searchParams,
        pathname,
        giraName,
      });

    document.title = title;

    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [enabled, staticTitle, mode, searchKey, pathname, giraName, giraId]);
}
