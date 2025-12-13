import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconLink, IconX, IconExternalLink, IconTrash, IconPlus } from "../../components/ui/Icons";

const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );
};

export default function LinksManagerModal({ isOpen, onClose, links, onSave, partName }) {
  const [localLinks, setLocalLinks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setLocalLinks(Array.isArray(links) ? links : []);
    }
  }, [isOpen, links]);

  const addLink = () => setLocalLinks([...localLinks, { description: "", url: "" }]);
  const removeLink = (idx) => setLocalLinks(localLinks.filter((_, i) => i !== idx));
  const updateLink = (idx, field, val) => {
    const newLinks = [...localLinks];
    newLinks[idx] = { ...newLinks[idx], [field]: val };
    setLocalLinks(newLinks);
  };

  const handleSave = () => {
    const validLinks = localLinks.filter((l) => l.url.trim() !== "");
    onSave(validLinks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <IconLink size={18} /> Enlaces: <span className="text-indigo-600">{partName}</span>
          </h3>
          <button onClick={onClose}><IconX size={20} className="text-slate-400" /></button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4">
          {localLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2 rounded border border-slate-200">
              <div className="flex-1 space-y-1">
                <input type="text" placeholder="Descripción (ej: En Si Bemol)" className="w-full text-xs p-1 border rounded" value={link.description} onChange={(e) => updateLink(idx, "description", e.target.value)} />
                <div className="flex items-center gap-1">
                  <IconExternalLink size={12} className="text-slate-400" />
                  <input type="text" placeholder="https://..." className="w-full text-xs p-1 border rounded text-blue-600" value={link.url} onChange={(e) => updateLink(idx, "url", e.target.value)} />
                </div>
              </div>
              <button onClick={() => removeLink(idx)} className="text-red-400 hover:text-red-600 p-1 mt-1"><IconTrash size={14} /></button>
            </div>
          ))}
          {localLinks.length === 0 && <p className="text-center text-xs text-slate-400 italic py-2">Sin enlaces configurados.</p>}
        </div>

        <div className="flex justify-between gap-2 pt-2 border-t">
          <button onClick={addLink} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded"><IconPlus size={12} /> Agregar otro</button>
          <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-indigo-700">Listo</button>
        </div>
      </div>
    </ModalPortal>
  );
}