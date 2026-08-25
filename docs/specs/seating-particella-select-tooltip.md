# Spec: Tooltip y truncado head/tail en desplegable de particellas

## Problema

En ProgramSeating, los desplegables de particellas (`ParticellaSelect`) viven en columnas angostas. El nombre se cortaba solo al inicio (`Clarinete Bb…`) y no había forma rápida de ver el nombre completo al pasar el mouse.

## Solución

1. **Truncado inicio + fin**: si el nombre no entra, se conserva el último identificador de parte (número, romano, sufijo). Ejemplos:
   - `Clarinete 2` → `Clari… 2`
   - `Clarinete Bb 2` → `Clarin… 2`
2. **Tooltip al hover**: portal a `document.body` con `z-[110]`, mostrando el nombre completo de la parte (sin extensión `.pdf`).
2. **Tooltip al hover**: portal a `document.body` con `z-[110]`, mostrando el nombre completo de la parte (sin extensión `.pdf`).
3. Aplica al valor cerrado del desplegable, al estado deshabilitado y a cada opción de la lista.

## Estado

- [x] Utilidad `splitPartNameForTruncation` / `getPartDisplayName`
- [x] `PartNameLabel` + tooltip en portal
- [x] `ParticellaSelect` usa truncado head/tail y tooltip
- [x] Chips de sugerencia y celdas de lectura en ProgramSeating
