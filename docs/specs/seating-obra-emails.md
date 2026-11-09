# Spec: Copiar mails por instrumento (header de obra en Seating)

## Objetivo
Desde el header de cada obra en Seating (desktop y móvil), permitir elegir instrumentos y copiar los correos de los músicos **efectivamente asignados** a esa obra.

## UI
- **Desktop:** ícono `IconMail` junto a carpeta Drive y editar obra (solo `isEditor`).
- **Móvil:** ícono `IconMail` junto al botón de editar seating de la obra (solo `isEditor`).
- Modal portal a `document.body`, `z-[100]` (`SeatingObraEmailsModal`).
- Lista de instrumentos con checkbox (marcar/desmarcar todas).
- Contador de mails por instrumento y total seleccionado.
- Acción **Copiar correos** → `navigator.clipboard` con mails unidos por `", "` (toast éxito/error).

## Quién entra
Solo músicos del seating visible del bloque/grupo actual con asignación real en la obra (no el roster completo):
1. **Cuerdas**: ítem del contenedor si hay asignación individual `M-{id}-{obra}` **o** grupal `C-{contenedor}-{obra}`.
2. **Vientos / perc / solistas**: si tienen particella(s) en `musicianAssignments` para esa obra.
3. Excluir vacantes (`es_simulacion`).
4. Mail desde el roster filtrado (`filteredRoster`); se deduplican al copiar.

## Agrupación
Por `id_instr` del músico; etiqueta = `instrumentos.instrumento`.

## Estado
- [x] Modal `SeatingObraEmailsModal`
- [x] Botón en header desktop de obra
- [x] Botón en header móvil de obra (misma lógica: solo asignados)
- [x] Copia al portapapeles con toast
