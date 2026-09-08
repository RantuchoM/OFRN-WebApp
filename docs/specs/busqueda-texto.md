# Búsqueda de texto (acentos, mayúsculas y palabras sueltas)

## Objetivo
Todas las búsquedas de texto de la app deben ser **indistintas a tildes/diacríticos y mayúsculas**, y tratar **cada palabra como un token independiente** (AND). El orden no importa: `López Juan` ≡ `Juan Lopez`.

## Fuente de verdad
`src/utils/sanitize.js`:

| Helper | Uso |
|--------|-----|
| `normalizeForSearch` | Minúsculas + NFD sin marcas combinantes (`Martín`/`Martin`/`Màrtin` → `martin`; `ñ` → `n`) |
| `splitSearchTokens` | Parte por espacios, `+` y comas |
| `matchesMultiTokenSearch(parts, query)` | Match cliente: todos los tokens aparecen en el haystack unido |
| `getSearchHighlightRanges` | Rangos para `<mark>` por token |
| `applyMultiTokenOrIlike` | PostgREST: cada token debe coincidir en alguno de los campos (`ilike`) |

## Comportamiento
- **Cliente** (listas ya cargadas, `SearchableSelect`, filtros de Personas, roster, agenda, repertorio, etc.): `matchesMultiTokenSearch`.
- **Resaltado**: cada palabra de la query se marca por separado (también en Agenda vía `getAccentInsensitiveHighlightRanges`).
- **Servidor** (`ilike`): tokens AND entre campos; no hay `unaccent` en Postgres. En **Usuarios** la búsqueda filtra en cliente sobre el padrón para respetar tildes.

## Completado
- [x] Helpers canónicos en `sanitize.js`
- [x] `SearchableSelect`, `FilterDropdown`, Command Palette (Ctrl+K)
- [x] Personas (`MusiciansView` + highlight), horas cátedra, roster, logística, comidas, ensambles
- [x] Agenda OFRN/FIMBA, repertorio, arreglos, datos, locaciones, entradas, FIMBA, SCRN
- [x] Selectores de gira/programa (`applyMultiTokenOrIlike` en FIMBA alta y assign repertorio)
