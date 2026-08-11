import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate } from "react-router-dom";
import { IconPlus, IconArrowRight, IconLoader } from "../../components/ui/Icons";
import {
  createFimbaEdicion,
  listFimbaEdiciones,
  searchProgramasForFimba,
} from "../../services/fimbaService";
import { useAuth } from "../../context/AuthContext";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";

export default function FimbaHome() {
  const { isManagement } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const isOfrnStaff = Boolean(isManagement);
  const [ediciones, setEdiciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    const { ediciones: rows, error: err } = await listFimbaEdiciones();
    if (err) setError(err.message || "Error al cargar ediciones");
    setEdiciones(rows || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isOfrnStaff && fimbaUser?.id_edicion) return;
    reload();
  }, [isOfrnStaff, fimbaUser?.id_edicion]);

  // Usuario FIMBA externo: ir directo a su edición (no listado multi-año).
  if (!isOfrnStaff && fimbaUser?.id_edicion) {
    return <Navigate to={`/fimba/edicion/${fimbaUser.id_edicion}`} replace />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", color: "var(--fimba-deep)" }}>
            Ediciones FIMBA
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.95rem" }}>
            Cada edición se vincula a un programa/gira OFRN (1:1).
          </p>
        </div>
        {isOfrnStaff && (
          <button type="button" className="fimba-btn fimba-btn-primary" onClick={() => setModalOpen(true)}>
            <IconPlus size={16} /> Nueva edición
          </button>
        )}
      </div>

      {error && <div className="fimba-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {loading ? (
        <div className="fimba-card fimba-muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconLoader size={18} className="animate-spin" /> Cargando...
        </div>
      ) : ediciones.length === 0 ? (
        <div className="fimba-card fimba-muted">
          No hay ediciones todavía. Creá la primera vinculando un programa OFRN.
        </div>
      ) : (
        <div className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="fimba-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: "1rem" }}>Edición</th>
                <th>Año</th>
                <th>Programa OFRN</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ediciones.map((e) => {
                const prog = e.programas;
                const progLabel =
                  prog?.nomenclador ||
                  prog?.nombre_gira ||
                  (e.id_gira ? `Gira #${e.id_gira}` : "—");
                return (
                  <tr key={e.id}>
                    <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{e.nombre}</td>
                    <td>{e.anio}</td>
                    <td className="fimba-muted">{progLabel}</td>
                    <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                      <Link
                        to={`/fimba/edicion/${e.id}`}
                        className="fimba-btn fimba-btn-ghost"
                        style={{ textDecoration: "none" }}
                      >
                        Abrir <IconArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen &&
        createPortal(
          <NuevaEdicionModal
            onClose={() => setModalOpen(false)}
            onCreated={() => {
              setModalOpen(false);
              reload();
            }}
          />,
          document.body,
        )}
    </div>
  );
}

function NuevaEdicionModal({ onClose, onCreated }) {
  const year = new Date().getFullYear();
  const [nombre, setNombre] = useState(`FIMBA ${year}`);
  const [anio, setAnio] = useState(year);
  const [query, setQuery] = useState("");
  const [programas, setProgramas] = useState([]);
  const [idGira, setIdGira] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const { programas: rows, error: err } = await searchProgramasForFimba(query);
      if (cancelled) return;
      if (err) {
        setError(err.message || "No se pudieron cargar las giras OFRN");
        setProgramas([]);
        return;
      }
      setError(null);
      setProgramas(rows || []);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const submit = async (ev) => {
    ev.preventDefault();
    if (!idGira) {
      setError("Elegí un programa OFRN.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await createFimbaEdicion({
      nombre,
      anio: Number(anio),
      id_gira: idGira,
    });
    setSaving(false);
    if (err) {
      setError(err.message || "No se pudo crear la edición");
      return;
    }
    onCreated?.();
  };

  return (
    <div className="fimba-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Nueva edición FIMBA</h2>
        <form onSubmit={submit}>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-ed-nombre">Nombre</label>
            <input
              id="fimba-ed-nombre"
              className="fimba-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-ed-anio">Año</label>
            <input
              id="fimba-ed-anio"
              className="fimba-input"
              type="number"
              min={2000}
              max={2100}
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              required
            />
          </div>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-ed-search">Programa / gira OFRN</label>
            <input
              id="fimba-ed-search"
              className="fimba-input"
              placeholder="Buscar por nomenclador o nombre..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="fimba-select"
              style={{ marginTop: 8 }}
              value={idGira}
              onChange={(e) => setIdGira(e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {programas.map((p) => {
                const label = [
                  p.nomenclador || p.mes_letra,
                  p.nombre_gira,
                  p.estado,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <option key={p.id} value={p.id}>
                    #{p.id}{label ? ` · ${label}` : " · Sin nombre"}
                  </option>
                );
              })}
            </select>
          </div>
          {error && <div className="fimba-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="fimba-btn fimba-btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
