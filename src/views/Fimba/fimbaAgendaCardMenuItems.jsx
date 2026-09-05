import {
  IconCopy,
  IconEdit,
  IconFileText,
  IconLayers,
  IconPlus,
  IconTrash,
} from "../../components/ui/Icons";

/** Helpers de ítems de menú frecuentes (staff / consulta editable). */
export function buildAgendaCardMenuItems({
  onEdit,
  onDuplicate,
  onDelete,
  onInsertIntermediate,
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
