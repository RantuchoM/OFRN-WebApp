import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconLoader,
  IconPlus,
  IconEdit,
  IconUsers,
  IconCopy,
  IconRefresh,
  IconLink,
  IconEye,
} from "../../components/ui/Icons";
import {
  FIMBA_USUARIO_ROLES,
  createFimbaUsuario,
  fimbaTokenUrl,
  getFimbaEdicionById,
  listFimbaUsuarios,
  regenerateFimbaEdicionTokenConsulta,
  updateFimbaUsuario,
} from "../../services/fimbaService";
import { generateFimbaTempPassword } from "../../utils/fimbaUserSession";
import { useFimbaAccess } from "../../hooks/useFimbaAccess";

const ROLE_LABEL = Object.fromEntries(
  FIMBA_USUARIO_ROLES.map((r) => [r.value, r.label]),
);

function emptyForm() {
  return {
    nombre: "",
    mail: "",
    rol_fimba: "consulta",
    clave_acceso: generateFimbaTempPassword(8),
    activo: true,
  };
}

/**
 * Staff: listado y alta/edición de `fimba_usuarios` de la edición.
 * Solo edición-scoped (no artista). Incluye enlace consulta general.
 */
export default function FimbaUsuariosPage() {
  const { edicionId } = useParams();
  const { canManageUsers, canSeeUsuarios } = useFimbaAccess();
  const [edicion, setEdicion] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', form, id? }
  const [saving, setSaving] = useState(false);
  const [tokenMsg, setTokenMsg] = useState(null);
  const [regenBusy, setRegenBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    const edRes = await getFimbaEdicionById(edicionId);
    if (edRes.error || !edRes.edicion) {
      setError(edRes.error?.message || "Edición no encontrada");
      setEdicion(null);
      setUsuarios([]);
      setLoading(false);
      return;
    }
    const uRes = await listFimbaUsuarios(edicionId);
    if (uRes.error) {
      setError(uRes.error.message || "Error al cargar usuarios");
    }
    setEdicion(edRes.edicion);
    setUsuarios(uRes.usuarios || []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId]);

  const consultaUrl = fimbaTokenUrl("consulta_edicion", edicion?.token_consulta);

  const copyConsulta = async () => {
    if (!consultaUrl) return;
    try {
      await navigator.clipboard.writeText(consultaUrl);
      setTokenMsg("Enlace de consulta copiado");
      setTimeout(() => setTokenMsg(null), 2000);
    } catch {
      setTokenMsg("No se pudo copiar");
    }
  };

  const regenConsulta = async () => {
    if (
      !window.confirm(
        "¿Regenerar el enlace de consulta general? El enlace anterior dejará de funcionar.",
      )
    ) {
      return;
    }
    setRegenBusy(true);
    setError(null);
    const { edicion: next, error: err } =
      await regenerateFimbaEdicionTokenConsulta(edicionId);
    setRegenBusy(false);
    if (err || !next) {
      setError(err?.message || "No se pudo regenerar el enlace");
      return;
    }
    setEdicion(next);
    setTokenMsg("Enlace regenerado");
    setTimeout(() => setTokenMsg(null), 2000);
  };

  const openCreate = () => {
    setModal({ mode: "create", form: emptyForm() });
  };

  const openEdit = (u) => {
    setModal({
      mode: "edit",
      id: u.id,
      form: {
        nombre: u.nombre || "",
        mail: u.mail || "",
        rol_fimba: u.rol_fimba || "consulta",
        clave_acceso: u.clave_acceso || "",
        activo: u.activo !== false,
      },
    });
  };

  const saveModal = async () => {
    if (!modal) return;
    const f = modal.form;
    const mail = String(f.mail || "").trim();
    if (!mail) {
      setError("El mail es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    if (modal.mode === "create") {
      const { error: err } = await createFimbaUsuario({
        id_edicion: edicionId,
        mail,
        nombre: f.nombre,
        rol_fimba: f.rol_fimba,
        clave_acceso: f.clave_acceso,
        activo: f.activo !== false,
      });
      setSaving(false);
      if (err) {
        setError(err.message || "No se pudo crear el usuario");
        return;
      }
    } else {
      const { error: err } = await updateFimbaUsuario(modal.id, {
        mail,
        nombre: f.nombre,
        rol_fimba: f.rol_fimba,
        clave_acceso: f.clave_acceso,
        activo: f.activo !== false,
      });
      setSaving(false);
      if (err) {
        setError(err.message || "No se pudo guardar");
        return;
      }
    }
    setModal(null);
    await reload();
  };

  if (loading) {
    return (
      <div
        className="fimba-card fimba-muted"
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <IconLoader size={18} className="animate-spin" /> Cargando usuarios…
      </div>
    );
  }

  if (!canSeeUsuarios || !canManageUsers) {
    return (
      <div>
        <div className="fimba-error">
          No tenés permiso para administrar usuarios de esta edición.
        </div>
        <Link
          to={`/fimba/edicion/${edicionId}`}
          className="fimba-btn fimba-btn-ghost"
          style={{ marginTop: 12, textDecoration: "none" }}
        >
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  if (!edicion) {
    return (
      <div>
        <div className="fimba-error">{error || "Edición no encontrada."}</div>
        <Link
          to="/fimba"
          className="fimba-btn fimba-btn-ghost"
          style={{ marginTop: 12, textDecoration: "none" }}
        >
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to={`/fimba/edicion/${edicionId}`}
        className="fimba-btn fimba-btn-ghost"
        style={{ textDecoration: "none", marginBottom: 12 }}
      >
        <IconArrowLeft size={14} /> {edicion.nombre}
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              color: "var(--fimba-deep)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconUsers size={22} aria-hidden /> Usuarios
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
            Acceso externo a la edición (no staff OFRN). Roles: editor general /
            consulta.
          </p>
        </div>
        <button
          type="button"
          className="fimba-btn fimba-btn-primary"
          onClick={openCreate}
        >
          <IconPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
        <h2
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1.05rem",
            color: "var(--fimba-deep)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconLink size={16} /> Enlace consulta general edición
        </h2>
        <p className="fimba-muted" style={{ margin: "0 0 0.85rem", fontSize: "0.85rem" }}>
          Solo lectura: Artistas, Agenda, Transportes y Hotelería. Sin Usuarios
          ni Contrataciones, sin crear/editar/eliminar. Cualquiera con el
          enlace (sin login).
        </p>
        <div
          className="fimba-label"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <IconEye size={14} /> URL de consulta
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="fimba-input"
            readOnly
            value={consultaUrl || "(generando…)"}
            style={{ fontSize: "0.8rem", flex: "1 1 240px" }}
          />
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={copyConsulta}
            title="Copiar"
            disabled={!consultaUrl}
          >
            <IconCopy size={14} />
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={regenConsulta}
            title="Regenerar"
            disabled={regenBusy || !edicion?.token_consulta}
          >
            {regenBusy ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconRefresh size={14} />
            )}
          </button>
        </div>
        {tokenMsg && (
          <p
            className="fimba-muted"
            style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", fontWeight: 600 }}
          >
            {tokenMsg}
          </p>
        )}
      </section>

      {usuarios.length === 0 ? (
        <div className="fimba-card fimba-muted">
          No hay usuarios FIMBA en esta edición. Creá uno con mail y clave
          temporal.
        </div>
      ) : (
        <div className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="fimba-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: "1rem" }}>Nombre</th>
                <th>Mail</th>
                <th>Rol</th>
                <th>Clave</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>
                    {u.nombre || "—"}
                  </td>
                  <td>{u.mail}</td>
                  <td>{ROLE_LABEL[u.rol_fimba] || u.rol_fimba}</td>
                  <td className="fimba-muted" style={{ fontFamily: "monospace" }}>
                    {u.clave_acceso || "—"}
                  </td>
                  <td>
                    {u.activo !== false ? (
                      <span style={{ color: "var(--fimba-deep)", fontWeight: 600 }}>
                        Activo
                      </span>
                    ) : (
                      <span className="fimba-muted">Inactivo</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      onClick={() => openEdit(u)}
                      aria-label={`Editar ${u.mail}`}
                    >
                      <IconEdit size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal &&
        createPortal(
          <div
            className="fimba-modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !saving) setModal(null);
            }}
          >
            <div
              className="fimba-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="fimba-usuario-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="fimba-usuario-modal-title"
                style={{ margin: "0 0 1rem", fontSize: "1.15rem" }}
              >
                {modal.mode === "create" ? "Nuevo usuario" : "Editar usuario"}
              </h2>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <label className="fimba-label" htmlFor="fu-nombre">
                    Nombre
                  </label>
                  <input
                    id="fu-nombre"
                    className="fimba-input"
                    value={modal.form.nombre}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        form: { ...m.form, nombre: e.target.value },
                      }))
                    }
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="fimba-label" htmlFor="fu-mail">
                    Mail *
                  </label>
                  <input
                    id="fu-mail"
                    className="fimba-input"
                    type="email"
                    value={modal.form.mail}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        form: { ...m.form, mail: e.target.value },
                      }))
                    }
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label className="fimba-label" htmlFor="fu-rol">
                    Rol
                  </label>
                  <select
                    id="fu-rol"
                    className="fimba-select"
                    value={modal.form.rol_fimba}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        form: { ...m.form, rol_fimba: e.target.value },
                      }))
                    }
                  >
                    {FIMBA_USUARIO_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="fimba-label" htmlFor="fu-clave">
                    Clave de acceso
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      id="fu-clave"
                      className="fimba-input"
                      value={modal.form.clave_acceso}
                      onChange={(e) =>
                        setModal((m) => ({
                          ...m,
                          form: { ...m.form, clave_acceso: e.target.value },
                        }))
                      }
                      autoComplete="off"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      onClick={() =>
                        setModal((m) => ({
                          ...m,
                          form: {
                            ...m.form,
                            clave_acceso: generateFimbaTempPassword(8),
                          },
                        }))
                      }
                    >
                      Generar
                    </button>
                  </div>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={modal.form.activo !== false}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        form: { ...m.form, activo: e.target.checked },
                      }))
                    }
                  />
                  Activo
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  disabled={saving}
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="fimba-btn fimba-btn-primary"
                  disabled={saving}
                  onClick={saveModal}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
