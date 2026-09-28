import React, { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import "../../utils/imageUtils";

function LazyPdfPage({ pdf, pageNumber, displayWidth, aspect, rootRef }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const root = rootRef.current;
    if (!wrap || !root || !pdf || !displayWidth) return undefined;

    let cancelled = false;
    let renderTask = null;

    const paint = async () => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.dataset.ready === "1") return;
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        (displayWidth * Math.min(window.devicePixelRatio || 1, 2)) /
          unscaled.width,
      );
      const viewport = page.getViewport({ scale });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
      if (!cancelled) canvas.dataset.ready = "1";
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          paint().catch(() => {});
        }
      },
      { root, rootMargin: "900px 0px" },
    );
    obs.observe(wrap);
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
      if (canvasRef.current) delete canvasRef.current.dataset.ready;
      obs.disconnect();
    };
  }, [pdf, pageNumber, displayWidth, rootRef]);

  const height = displayWidth ? Math.round(displayWidth / aspect) : undefined;

  return (
    <div
      ref={wrapRef}
      data-page={pageNumber}
      className="relative mx-auto w-full max-w-3xl bg-white shadow-sm"
      style={
        displayWidth
          ? { width: displayWidth, height }
          : { aspectRatio: String(aspect) }
      }
    >
      <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {pageNumber}
      </span>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

/**
 * Visor con scroll. Avisa qué página ocupa la parte de arriba del recuadro.
 */
export default function ParticellaPdfScroll({ url, onCurrentPage }) {
  const scrollerRef = useRef(null);
  const onPageRef = useRef(onCurrentPage);
  onPageRef.current = onCurrentPage;
  const pageEls = useRef([]);
  const lastPageRef = useRef(0);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return undefined;
    const measure = () => {
      setWidth(Math.max(0, root.clientWidth - 24));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(root);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded = null;
    setError(null);
    setPages([]);
    setPdfDoc(null);
    lastPageRef.current = 0;
    onPageRef.current?.(0);
    let task = null;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo leer el PDF");
        return res.arrayBuffer();
      })
      .then((data) => {
        if (cancelled) return null;
        task = pdfjs.getDocument({ data });
        return task.promise;
      })
      .then(async (pdf) => {
        if (!pdf) return;
        loaded = pdf;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        const meta = [];
        for (let i = 1; i <= pdf.numPages; i += 1) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          meta.push({
            number: i,
            aspect: vp.width / vp.height || 0.77,
          });
          if (cancelled) {
            pdf.destroy();
            return;
          }
        }
        setPdfDoc(pdf);
        setPages(meta);
        lastPageRef.current = 1;
        onPageRef.current?.(1);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "No se pudo mostrar el PDF");
      });
    return () => {
      cancelled = true;
      loaded?.destroy?.();
      task?.destroy?.();
    };
  }, [url]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !pages.length) return undefined;

    const update = () => {
      const rootRect = root.getBoundingClientRect();
      let best = 1;
      let bestDist = Infinity;
      pageEls.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < rootRect.top + 8 || rect.top > rootRect.bottom - 8) {
          return;
        }
        const dist = Math.abs(rect.top - rootRect.top);
        if (dist < bestDist) {
          bestDist = dist;
          best = idx + 1;
        }
      });
      if (best !== lastPageRef.current) {
        lastPageRef.current = best;
        onPageRef.current?.(best);
      }
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pages]);

  return (
    <div ref={scrollerRef} className="h-full overflow-y-auto bg-slate-200">
      {error && (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-600">
          {error}
        </div>
      )}
      {!error && !pages.length && (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Armando páginas…
        </div>
      )}
      {pdfDoc && pages.length > 0 && (
        <div className="flex flex-col items-center gap-3 px-3 py-3">
          {pages.map((page, idx) => (
            <div
              key={page.number}
              ref={(el) => {
                pageEls.current[idx] = el;
              }}
              className="w-full"
            >
              <LazyPdfPage
                pdf={pdfDoc}
                pageNumber={page.number}
                displayWidth={width ? Math.min(width, 896) : 0}
                aspect={page.aspect}
                rootRef={scrollerRef}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
