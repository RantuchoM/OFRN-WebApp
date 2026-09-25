import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function ConcertoModal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-3">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="concerto-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h3 id="concerto-modal-title" className="text-sm font-bold text-slate-800">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function ModalError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-rose-600">{message}</p>;
}

function PrimaryButton({ children, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function EdicionModal({ onClose, onSubmit, saving }) {
  const [nombre, setNombre] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const message = await onSubmit({ nombre, desde, hasta });
    if (message) setError(message);
  };

  return (
    <ConcertoModal title="Nueva edición" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs font-bold uppercase text-slate-500">
          Nombre
          <input
            className={`${fieldClass} mt-1 normal-case`}
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Visible desde
          <input
            type="datetime-local"
            className={`${fieldClass} mt-1`}
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Visible hasta
          <input
            type="datetime-local"
            className={`${fieldClass} mt-1`}
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            required
          />
        </label>
        <p className="text-xs text-slate-500">Horario de Argentina (UTC−3).</p>
        <ModalError message={error} />
        <PrimaryButton disabled={saving}>{saving ? "Creando…" : "Crear edición"}</PrimaryButton>
      </form>
    </ConcertoModal>
  );
}

export function InstanciaModal({ programas, onClose, onSubmit, saving }) {
  const [idGira, setIdGira] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const message = await onSubmit({ idGira, titulo });
    if (message) setError(message);
  };

  return (
    <ConcertoModal title="Nueva instancia" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-slate-500">Gira</p>
          <SearchableSelect
            options={programas}
            value={idGira}
            onChange={setIdGira}
            placeholder="Buscar gira…"
          />
        </div>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Título
          <input
            className={`${fieldClass} mt-1 normal-case`}
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            required
          />
        </label>
        <ModalError message={error} />
        <PrimaryButton disabled={saving}>{saving ? "Creando…" : "Crear instancia"}</PrimaryButton>
      </form>
    </ConcertoModal>
  );
}

export function ParticipanteModal({
  title,
  personas,
  initial,
  onClose,
  onSubmit,
  saving,
}) {
  const [idUno, setIdUno] = useState(initial?.idUno ?? null);
  const [idDos, setIdDos] = useState(initial?.idDos ?? null);
  const [observaciones, setObservaciones] = useState(initial?.observaciones || "");
  const [error, setError] = useState("");

  const optionsUno = personas.map((persona) => ({
    ...persona,
    disabled: idDos != null && String(persona.id) === String(idDos),
  }));
  const optionsDos = personas.map((persona) => ({
    ...persona,
    disabled: idUno != null && String(persona.id) === String(idUno),
  }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const message = await onSubmit({ idUno, idDos, observaciones });
    if (message) setError(message);
  };

  return (
    <ConcertoModal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-slate-500">Integrante</p>
          <SearchableSelect
            options={optionsUno}
            value={idUno}
            onChange={setIdUno}
            placeholder="Buscar por nombre o apellido…"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-slate-500">
            Segundo integrante (dúo, opcional)
          </p>
          <SearchableSelect
            options={optionsDos}
            value={idDos}
            onChange={setIdDos}
            placeholder="Buscar por nombre o apellido…"
          />
        </div>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Observaciones
          <input
            className={`${fieldClass} mt-1 normal-case`}
            value={observaciones}
            onChange={(event) => setObservaciones(event.target.value)}
          />
        </label>
        <ModalError message={error} />
        <PrimaryButton disabled={saving}>{saving ? "Guardando…" : "Guardar"}</PrimaryButton>
      </form>
    </ConcertoModal>
  );
}
