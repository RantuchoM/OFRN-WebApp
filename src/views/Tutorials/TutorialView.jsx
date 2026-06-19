import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "markdown-to-jsx";
import { IconLoader } from "../../components/ui/Icons";
import { loadTutorialHtmlFromMarkdown } from "../../utils/tutorialMarkdown";
import "./tutorialMarkdown.css";

function MarkdownImage({ src, alt, ...rest }) {
  return (
    <img
      src={src}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  );
}

const markdownOptions = {
  forceBlock: true,
  overrides: {
    img: { component: MarkdownImage },
    a: {
      component: ({ children, href, ...props }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      ),
    },
  },
};

export default function TutorialView() {
  const { appId, slug } = useParams();
  const [meta, setMeta] = useState(null);
  const [htmlSource, setHtmlSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tutorialId = useMemo(() => `${appId}/${slug}`, [appId, slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtmlSource("");
    setMeta(null);

    (async () => {
      try {
        const manifestRes = await fetch("/tutorials/manifest.json", { cache: "no-cache" });
        if (!manifestRes.ok) throw new Error("No se pudo cargar el índice de tutoriales");
        const manifest = await manifestRes.json();
        const entry = (manifest.tutorials || []).find((t) => t.id === tutorialId);
        if (!entry) throw new Error("Tutorial no encontrado");

        if (cancelled) return;
        setMeta(entry);

        const body = await loadTutorialHtmlFromMarkdown(
          entry.markdownUrl,
          entry.baseUrl,
          (normalized) => normalized,
        );
        if (!cancelled) setHtmlSource(body);
      } catch (e) {
        if (!cancelled) setError(e.message || "Error al cargar el tutorial");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tutorialId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <IconLoader size={32} className="animate-spin mb-3" />
        <p className="text-sm font-medium">Cargando tutorial…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm">
        {error}
        <div className="mt-4">
          <Link to="/tutorials" className="text-indigo-600 font-bold text-xs hover:underline">
            ← Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-10">
      {meta?.title && !htmlSource.trimStart().startsWith("#") ? (
        <h1 className="text-2xl font-black text-slate-800 mb-6 sr-only">{meta.title}</h1>
      ) : null}
      <div className="tutorial-markdown-body">
        <Markdown options={markdownOptions}>{htmlSource}</Markdown>
      </div>
    </article>
  );
}
