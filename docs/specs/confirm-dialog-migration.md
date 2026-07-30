# Spec: ConfirmDialog unificado (reemplazo de `window.confirm`)

## Objetivo

Eliminar las confirmaciones nativas del navegador (`confirm` / `window.confirm`) en la app OFRN y reemplazarlas por el design system (`ConfirmDialog` → `ConfirmModal` vía portal).

## Solución

### Hook `useConfirmDialog` (`src/hooks/useConfirmDialog.js`)

API async tipo `window.confirm`:

```js
const { confirm, dialog } = useConfirmDialog();

if (!(await confirm({
  title: "Eliminar",
  message: "¿Seguro?",
  destructive: true, // botón rose
  confirmText: "Eliminar", // opcional
}))) return;

// En el JSX:
return <>{dialog}…</>;
```

También acepta string: `await confirm("¿Seguro?")`.

### Convención

| Tipo de acción | `destructive` | Título típico |
|----------------|---------------|---------------|
| Eliminar / borrar / anular / vaciar / desvincular | `true` | Eliminar, Borrar, Anular… |
| Descartar cambios sin guardar / cerrar | `true` o neutro | Cerrar sin guardar, Descartar cambios |
| Aplicar / generar / duplicar / enviar | `false` (default indigo) | Aplicar, Generar, Duplicar… |

## Estado

- [x] Hook `useConfirmDialog` creado
- [x] Migradas todas las llamadas `confirm()` / `window.confirm()` en `src/`
- [x] `useViaticosIndividuales` expone `confirmDialog` y `ViaticosManager` lo renderiza
- [x] Verificado: cero `window.confirm(` restantes en `src/`

## Fuera de alcance

- Los `alert()` informativos / de error **no** se migran en esta tarea (siguen siendo nativos o toast según el archivo).
- Confirmaciones que ya usaban `ConfirmDialog` / `ConfirmModal` con estado propio se mantienen.
