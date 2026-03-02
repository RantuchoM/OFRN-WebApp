import React, { useMemo, useState, useEffect } from "react";
import { IconPlus } from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";
import QuickGuestModal from "../users/QuickGuestModal";

export default function PersonSelectWithCreate({
  supabase,
  value,
  onChange,
  isMulti = false,
  placeholder = "Buscar persona...",
}) {
  const [options, setOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const fetchPeople = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("integrantes")
      .select("id, apellido, nombre")
      .order("apellido", { ascending: true });
    if (error) {
      console.error("Error cargando integrantes:", error);
      return;
    }
    const mapped =
      data?.map((p) => ({
        id: p.id,
        label: `${p.apellido || ""}, ${p.nombre || ""}`.trim(),
      })) || [];
    setOptions(mapped);
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleCreated = (newPerson) => {
    const newOption = {
      id: newPerson.id,
      label: `${newPerson.apellido || ""}, ${newPerson.nombre || ""}`.trim(),
    };
    setOptions((prev) => [...prev, newOption]);
    const payload = { id: newOption.id, label: newOption.label };
    if (isMulti) {
      const current = Array.isArray(value) ? value : [];
      onChange([...current, payload]);
    } else {
      onChange(payload);
    }
  };

  const normalizedValue = useMemo(() => {
    if (isMulti) {
      return Array.isArray(value) ? value.map((v) => v.id) : [];
    }
    if (value && typeof value === "object") return value.id;
    return value;
  }, [value, isMulti]);

  const handleChangeId = (selectedIdOrIds) => {
    if (isMulti) {
      const idsArray = Array.isArray(selectedIdOrIds)
        ? selectedIdOrIds
        : [selectedIdOrIds];
      const payload = idsArray
        .map((id) => {
          const opt = options.find((o) => String(o.id) === String(id));
          return opt ? { id: opt.id, label: opt.label } : { id, label: "" };
        });
      onChange(payload);
    } else {
      const opt =
        options.find((o) => String(o.id) === String(selectedIdOrIds)) || null;
      if (!opt) {
        onChange(null);
      } else {
        onChange({ id: opt.id, label: opt.label });
      }
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={normalizedValue}
          onChange={handleChangeId}
          placeholder={placeholder}
          isMulti={isMulti}
          className="w-full"
        />
      </div>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 transition-colors"
        title="Crear invitado rápido"
      >
        <IconPlus size={16} />
      </button>
      <QuickGuestModal
        supabase={supabase}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

