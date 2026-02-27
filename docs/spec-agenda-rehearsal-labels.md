## Spec: Etiquetas de programas en ensayos de ensamble (UnifiedAgenda)

### Objetivo

Mostrar, directamente en la agenda, **qué programas se ensayan** en los eventos de tipo 13 (Ensayo de Ensamble), usando etiquetas pequeñas con el **nomenclador** y el **título de la gira**, codificadas por color según el organismo.

### Datos necesarios

- Tabla base: `eventos` (agenda).
- Relación: `eventos_programas_asociados` → `programas`.
- Campos de `programas` requeridos:
  - `id`
  - `nomenclador`
  - `nombre_gira`
  - `tipo` (usado para color por organismo)

**Consulta en `useAgendaData` (`EVENT_SELECT`):**

```sql
eventos_programas_asociados (
  programas (
    id,
    nombre_gira,
    google_drive_folder_id,
    mes_letra,
    nomenclador,
    estado,
    tipo
  )
),
eventos_ensambles ( ensambles ( id, ensamble ) )
```

En la agenda, cada evento tendrá:

- `eventos_ensambles`: lista de ensambles involucrados.
- `eventos_programas_asociados`: lista de vínculos a programas con su objeto `programas`.

### Lógica de UI (UnifiedAgenda.jsx)

- Contexto: componente `UnifiedAgenda.jsx` en la lista persistente (vista escritorio y móvil).
- Para cada evento `evt`:
  - Si `evt.id_tipo_evento === 13`:
    - Mostrar **chips de ensamble** (ya existentes) usando `evt.eventos_ensambles`.
    - Debajo, mostrar **chips de programa** usando `evt.eventos_programas_asociados`.
- Cada chip de programa tiene formato:
  - Texto: `"[nomenclador] | Nombre del programa"`.
  - Truncado en el nombre para no romper el layout.
  - Tooltip (`title`) con `nombre_gira` completo.

Ejemplo de estructura:

```jsx
{evt.id_tipo_evento === 13 &&
  Array.isArray(evt.eventos_programas_asociados) &&
  evt.eventos_programas_asociados.length > 0 && (
    <div className="flex flex-wrap gap-1 mt-1">
      {evt.eventos_programas_asociados
        .map((ep) => ep.programas)
        .filter(Boolean)
        .map((prog) => {
          const badgeClasses = getProgramBadgeClasses(prog);
          return (
            <div
              key={prog.id}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${badgeClasses}`}
              title={prog.nombre_gira}
            >
              <span className="font-bold">[{prog.nomenclador || "Sin código"}]</span>
              <span className="opacity-70">|</span>
              <span className="truncate max-w-[150px] italic">
                {prog.nombre_gira}
              </span>
            </div>
          );
        })}
    </div>
  )}
```

La lógica se aplica **tanto en la tarjeta móvil (`md:hidden`) como en la de escritorio**, asegurando consistencia en todas las vistas de `UnifiedAgenda`.

### Codificación de colores

La lógica de colores se centraliza en `src/utils/giraUtils.js` mediante `getProgramBadgeClasses(program)`. Se basa en el campo `program.tipo` (o `tipo_organismo` si existiera en el futuro).

Reglas:

- **Sinfónica / Orquestas** (`tipo` contiene `"sinf"` o `"orquesta"`):
  - `bg-blue-50 text-blue-700 border-blue-200`
- **Camerata / Filarmónica** (`tipo` contiene `"camerata"` o `"filarm"`):
  - `bg-indigo-50 text-indigo-700 border-indigo-200`
- **Jazz Band** (`tipo` contiene `"jazz"`):
  - `bg-amber-50 text-amber-700 border-amber-200`
- **Ensambles** (`tipo` contiene `"ensamble"`):
  - `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Comisión / Otros** (`tipo` contiene `"comisión"` / `"comision"` o no matchea nada anterior):
  - `bg-slate-50 text-slate-700 border-slate-200`

Estas clases se combinan con el esqueleto común del badge:

```jsx
className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${badgeClasses}`}
```

### Diseño y UX

- **Tamaño**: `text-[10px]` para ser discreto.
- **Contexto inmediato**: se ubican justo debajo de la descripción del evento y de las etiquetas de ensamble, para que el músico vea de un vistazo:
  - Ensamble(s) involucrado(s).
  - Programa(s) que se ensayan (`[nomenclador] | título`).
- **Truncado**: `truncate max-w-[150px]` evita que nombres muy largos rompan el diseño en desktop y móvil.
- **Responsivo**:
  - Mismo patrón de etiquetas en la tarjeta móvil (`md:hidden`) y en la tarjeta de escritorio (`md:flex`).

### Estado

- Implementado en:
  - `src/hooks/useAgendaData.js` (SELECT extendido con `tipo` en `eventos_programas_asociados.programas`).
  - `src/utils/giraUtils.js` (`getProgramBadgeClasses`).
  - `src/components/agenda/UnifiedAgenda.jsx` (render de badges en móvil y escritorio).

