import React, { useState, useEffect, useRef } from "react";
import {
  IconMoreVertical,
  IconMusic,
  IconLayers,
  IconFileText,
  IconCalendar,
  IconSettingsWheel,
  IconMap,
  IconHotel,
  IconCalculator,
  IconUtensils,
  IconUsers,
  IconMegaphone,
  IconEdit,
  IconMessageCircle,
  IconTrash,
  IconChevronDown,
  IconArrowRight,
  IconCopy,
} from "../../components/ui/Icons";

const GiraActionMenu = ({
  gira,
  onViewChange,
  isEditor,
  isPersonal,
  isDifusion = false,
  userRole,
  onEdit,
  onDelete,
  onGlobalComments,
  onMove,
  onDuplicate,
  isOpen,
  onToggle,
  onClose,
  onMyRooming,
}) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const menuRef = useRef(null);

  const normalizedRole = userRole?.toLowerCase().trim();
  // Solo difusión: tiene rol difusión y no es editor → en el menú solo ve la opción Difusión
  const isOnlyDifusion = isDifusion && !isEditor;
  const isGuest = normalizedRole === "invitado";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
        setExpandedCategory(null);
      }
    };
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setExpandedCategory(null);
  }, [isOpen]);

  const toggleCategory = (key) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  const SubMenuItem = ({ icon: Icon, label, onClick, className = "" }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClose();
        if (onClick) onClick();
      }}
      className={`w-full text-left px-4 py-3 md:py-2 text-sm md:text-xs hover:bg-slate-50 flex items-center gap-3 md:gap-2 text-slate-600 border-l-2 border-transparent hover:border-indigo-500 pl-6 ${className}`}
    >
      <Icon size={16} className="text-slate-400 shrink-0" />{" "}
      <span>{label}</span>
    </button>
  );

  const CategoryItem = ({ label, icon: Icon, categoryKey, children }) => {
    if (categoryKey === "logistica" && isGuest) return null;
    // Si el rol es difusión, ocultamos el resto de categorías excepto Difusión
    if (isOnlyDifusion && categoryKey !== "difusion") return null;

    const isExpanded = expandedCategory === categoryKey;
    return (
      <div className="border-b border-slate-50 last:border-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCategory(categoryKey);
          }}
          className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between gap-2 transition-colors ${
            isExpanded
              ? "bg-slate-50 text-indigo-700"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              size={16}
              className={isExpanded ? "text-indigo-600" : "text-slate-400"}
            />
            <span>{label}</span>
          </div>
          <IconChevronDown
            size={14}
            className={`text-slate-300 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        {isExpanded && (
          <div className="bg-slate-50/50 py-1 animate-in slide-in-from-top-1">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`p-3 md:p-2 rounded-lg transition-colors ${isOpen ? "bg-slate-100 text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
      >
        <IconMoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 md:w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-[1000] overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
          <div className="max-h-[60vh] overflow-y-auto">
            <CategoryItem
              label="Repertorio"
              icon={IconMusic}
              categoryKey="repertorio"
            >
              <SubMenuItem
                icon={IconMusic}
                label="Repertorio General"
                onClick={() => onViewChange("REPERTOIRE")}
              />
              <SubMenuItem
                icon={IconLayers}
                label="Seating / Disposición"
                onClick={() => onViewChange("REPERTOIRE", "seating")}
              />
              <SubMenuItem
                icon={IconFileText}
                label="Mis Partes"
                onClick={() => onViewChange("REPERTOIRE", "my_parts")}
              />
            </CategoryItem>

            <CategoryItem
              icon={IconCalendar}
              label="Agenda"
              categoryKey="agenda"
            >
              <SubMenuItem
                icon={IconCalendar}
                label="Agenda Detallada"
                onClick={() => onViewChange("AGENDA")}
              />
            </CategoryItem>

            {isEditor && (
              <CategoryItem
                label="Logística"
                icon={IconSettingsWheel}
                categoryKey="logistica"
              >
                <SubMenuItem
                  icon={IconSettingsWheel}
                  label="Reglas"
                  onClick={() => onViewChange("LOGISTICS", "coverage")}
                />
                <SubMenuItem
                  icon={IconMap}
                  label="Transporte"
                  onClick={() => onViewChange("LOGISTICS", "transporte")}
                />
                <SubMenuItem
                  icon={IconHotel}
                  label="Rooming"
                  onClick={() => onViewChange("LOGISTICS", "rooming")}
                />
                <SubMenuItem
                  icon={IconCalculator}
                  label="Viáticos"
                  onClick={() => onViewChange("LOGISTICS", "viaticos")}
                />
                <SubMenuItem
                  icon={IconUtensils}
                  label="Comidas"
                  onClick={() => onViewChange("LOGISTICS", "meals")}
                />
              </CategoryItem>
            )}

            {/* Difusión: visible para editor O para rol difusión (en tres puntos) */}
            {(isEditor || isDifusion) && (
              <CategoryItem
                label="Difusión"
                icon={IconMegaphone}
                categoryKey="difusion"
              >
                <SubMenuItem
                  icon={IconMegaphone}
                  label="Material de Prensa"
                  onClick={() => onViewChange("DIFUSION")}
                />
              </CategoryItem>
            )}

            {isEditor && (
              <>
                <CategoryItem
                  label="Personal"
                  icon={IconUsers}
                  categoryKey="personal"
                >
                  <SubMenuItem
                    icon={IconUsers}
                    label="Gestión de Roster"
                    onClick={() => onViewChange("ROSTER")}
                  />
                </CategoryItem>

                <CategoryItem
                  label="Edición"
                  icon={IconEdit}
                  categoryKey="edicion"
                >
                  <SubMenuItem
                    icon={IconMessageCircle}
                    label="Gestión de Pendientes"
                    onClick={onGlobalComments}
                  />
                  <SubMenuItem
                    icon={IconEdit}
                    label="Editar Programa"
                    onClick={onEdit}
                  />
                  <div className="my-1 border-t border-slate-100"></div>
                  <SubMenuItem
                    icon={IconArrowRight}
                    label="Trasladar Fechas"
                    onClick={onMove}
                    className="text-orange-600 hover:text-orange-700"
                  />
                  <SubMenuItem
                    icon={IconCopy}
                    label="Duplicar Gira"
                    onClick={onDuplicate}
                    className="text-indigo-600 hover:text-indigo-700"
                  />
                  <div className="my-1 border-t border-slate-100"></div>
                  <SubMenuItem
                    icon={IconTrash}
                    label="Eliminar Programa"
                    onClick={onDelete}
                    className="text-red-600 hover:text-red-700"
                  />
                </CategoryItem>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GiraActionMenu;
