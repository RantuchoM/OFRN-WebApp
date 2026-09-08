# Spec: Banner de cambios de seating de último momento

## Objetivo
En **Seating**, cuando la gira está a **18 días o menos** de empezar (`programas.fecha_desde`), avisar si en **esta visita** a la pantalla se crean o modifican asignaciones de particella. El aviso sirve para notificar a los músicos (copiar mails / detalle).

## Qué cuenta como “cambio”
No es solo “se agregó una obra al programa”. El caso típico: la obra ya estaba y el músico **no sabía** que le asignaron o le cambiaron la parte.

- **Alta:** sin asignación → `Clarinete 2`
- **Modificación:** `Flauta 1` → `Flauta 2`
- **Otras diferencias** vs. el snapshot de apertura (agregar/quitar una segunda parte, desasignar)

Remociones de obra del programa no se listan por sí solas. Si al desasignar queda distinto al snapshot, sí aparece (`Clarinete 2` → `sin asignación`).

## Ventana
- Hoy (fecha local `yyyy-MM-dd`) ∈ [`fecha_desde` − 18 días, `fecha_desde`].
- Fuera de esa ventana el banner no se muestra aunque haya cambios de sesión.
- No se inventan columnas: se usa `fecha_desde` del programa.

## Ciclo de vida (solo esta visita)
- Snapshot in-memory al terminar la primera carga de Seating (asignaciones + ítems de contenedores de todas las configs).
- Se acumulan diferencias **mientras Seating está montado** (asignación individual, de contenedor de cuerdas, o músico que entra a un atril que ya tiene parte).
- Al **salir de la pestaña** (unmount de `ProgramSeating`: Repertorio, Personal, etc.) el acumulador se limpia. No hay `localStorage` ni persistencia en DB.
- Volver a Seating más tarde es una visita nueva: solo aparecen cambios nuevos de esa visita.

## Roster
- Músicos = integrantes numéricos del roster de seating (`useGiraRoster` + `isConfirmedConvocadoForSeatingReports`).
- Ausentes / no confirmados / roles de soporte excluidos **no** entran al aviso.
- Mails: campo `mail`; vacíos se omiten.

## UI (copy exacta)
Texto del banner:

> Tené en cuenta que a estos músicos se les agregaron obras a menos de dos semanas de la gira. Para notificarlos puedes copiar los mails

Botones del **banner**:
1. **Ver músicos (n) y cambios** — modal Portal a `document.body`, `z-[100]`, lista apellido + cambios por obra.
2. **Copiar mails** — mails separados por coma; toast `sonner`.

Dentro del **modal** (junto a la lista):
- **Copiar detalle** — texto:
  ```
  Apellido, Nombre
  - Obra 1: sin asignación → Clarinete 2
  - Obra 2: Flauta 1 → Flauta 2
  ```

Iconos solo de `src/components/ui/Icons.jsx`.

## Implementación
- `src/utils/seatingLateAssignmentChanges.js` — ventana, mapa efectivo M-/C-, diff, copy.
- `src/hooks/useSeatingLateAssignmentChanges.js` — estado de visita.
- `src/components/seating/SeatingLateAssignmentBanner.jsx` — banner + modal.
- Integrado en `ProgramSeating.jsx` (Disposición y Escenario).

## Estado
- [x] Detección sesión-local de altas/cambios de particella
- [x] Gate de 18 días vs `fecha_desde`
- [x] Banner (Ver músicos + Copiar mails) + modal con Copiar detalle
- [x] Limpieza al desmontar Seating
