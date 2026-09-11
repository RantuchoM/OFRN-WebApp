import {
  IconCalendarPlus,
  IconCopy,
  IconEdit,
  IconFileText,
  IconLayers,
  IconPlus,
  IconTrash,
} from "../../components/ui/Icons";

/**
 * Ítems de menú ⋮ Agenda (planilla + cards).
 * Mutaciones solo si `canEdit`. Ver Backline / Ver Rider son RO: se muestran
 * cuando hay callback (el caller aplica `canSeeRider` / contenido del evento).
 * Consulta (`canEdit=false`) puede quedar con kebab solo de vista.
 */
export function buildAgendaCardMenuItems({
  onEdit,
  onDuplicate,
  onDelete,
  onInsertIntermediate,
  onProgramarTransporte,
  onBackline,
  onRider,
  canEdit = false,
}) {
  const items = [];
  if (canEdit && onEdit) {
    items.push({
      key: "edit",
      label: "Editar",
      icon: <IconEdit size={14} className="shrink-0" />,
      onClick: onEdit,
    });
  }
  if (canEdit && onInsertIntermediate) {
    items.push({
      key: "insert",
      label: "Insertar intermedio",
      icon: <IconPlus size={14} className="shrink-0" />,
      onClick: onInsertIntermediate,
    });
  }
  if (canEdit && onProgramarTransporte) {
    items.push({
      key: "programar",
      label: "Programar transporte",
      icon: <IconCalendarPlus size={14} className="shrink-0" />,
      onClick: onProgramarTransporte,
    });
  }
  if (canEdit && onDuplicate) {
    items.push({
      key: "dup",
      label: "Duplicar",
      icon: <IconCopy size={14} className="shrink-0" />,
      onClick: onDuplicate,
    });
  }
  if (onBackline) {
    items.push({
      key: "backline",
      label: "Ver Backline",
      icon: <IconLayers size={14} className="shrink-0" />,
      onClick: onBackline,
    });
  }
  if (onRider) {
    items.push({
      key: "rider",
      label: "Ver Rider",
      icon: <IconFileText size={14} className="shrink-0" />,
      onClick: onRider,
    });
  }
  if (canEdit && onDelete) {
    items.push({
      key: "del",
      label: "Eliminar",
      icon: <IconTrash size={14} className="shrink-0" />,
      onClick: onDelete,
      danger: true,
    });
  }
  return items;
}
