# Convocatorias en la ficha del integrante

Pestaña **Convocatorias** de `MusicianForm` (`MusicianTourManager`). El id interno de la pestaña sigue siendo `giras`.

## Listado

- Por defecto **Solo convocadas** está activo: solo programas con el integrante presente (`computedStatus === "CONVOCADO"`). Ausentes y no convocados quedan afuera hasta desactivar el filtro o buscar.
- Rango de fechas arriba. Default: **hoy → 31/12 del año en curso**. Un programa entra si su intervalo pisa el rango (`fecha_desde` ≤ hasta y `fecha_hasta` o, si falta, `fecha_desde` ≥ desde).
- **Todo este año**: 1/1–31/12 del año en curso. **Año que viene**: 1/1–31/12 del año siguiente.
- Buscador de programas (nomenclador, `mes_letra`, título `nombre_gira`, subtítulo). Con texto, la búsqueda incluye convocados y no convocados dentro del rango y no aplica el filtro de estado. El filtro de tipo sigue vigente.
- Filas no convocadas: fondo `slate-50` y texto `slate-600`, sin opacidad ni escala de grises.
- La ficha ya guardada no tiene pie. **Sincronizado** está en el encabezado, junto a la X. **Cerrar** no está: cierra la X. **Crear ficha** queda en una barra fija debajo del scroll, solo mientras no hay `id`.

## Rol y función

- Convocado o ausente: chips de rol (color de `roles`) y de función (Reemplazo, Refuerzo, Pasante, Indiv), iguales a la nómina (`RosterRolFuncionTags`).
- El chip abre `RosterRolModal` (desplegable de rol centrado y tags de función editables). Persiste `giras_integrantes.rol`, `funcion` e `id_cubre_a`.
- No convocado: el texto **No convocado/a** y **Sumar Adicional** abren el mismo modal en modo Convocar (rol + función, y ausente a cubrir si es reemplazo) antes de dar el alta.
- La función solo se elige si la persona no es Estable y el rol es músico (`canChooseFuncionGira`).
