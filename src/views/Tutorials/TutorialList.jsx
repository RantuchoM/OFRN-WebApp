import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconBookOpen, IconLoader } from "../../components/ui/Icons";

export default function TutorialList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/tutorials/manifest.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`Manifest ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(data.tutorials || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Error al cargar tutoriales");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <IconLoader size={32} className="animate-spin mb-3" />
        <p className="text-sm font-medium">Cargando tutoriales…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm">
        {error}
        <p className="mt-2 text-xs text-red-600">
          Ejecutá <code className="bg-red-100 px-1 rounded">npm run tutorials:manifest</code> antes de
          desarrollar.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <IconBookOpen size={40} className="mx-auto mb-3 text-slate-300" />
        <p className="font-medium">No hay tutoriales publicados.</p>
        <p className="text-xs mt-2">
          Agregá archivos <code>.md</code> en{" "}
          <code className="text-slate-700">apps/&lt;app&gt;/tutorials/</code>
        </p>
      </div>
    );
  }

  const byApp = items.reduce((acc, t) => {
    if (!acc[t.appId]) acc[t.appId] = [];
    acc[t.appId].push(t);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-800 mb-2">Tutoriales</h1>
      <p className="text-sm text-slate-500 mb-8">
        Guías en Markdown con listas, imágenes y formato enriquecido.
      </p>

      {Object.entries(byApp).map(([appId, tutorials]) => (
        <section key={appId} className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{appId}</h2>
          <ul className="space-y-2">
            {tutorials.map((t) => (
              <li key={t.id}>
                <Link
                  to={t.routePath}
                  className="block rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <span className="font-bold text-slate-800">{t.title}</span>
                  {t.description ? (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
