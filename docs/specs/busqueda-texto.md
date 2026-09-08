# Búsqueda de texto (acentos, mayúsculas y palabras sueltas)

## Objetivo
Todas las búsquedas de texto de la app deben ser **indistintas a tildes/diacríticos y mayúsculas**, y tratar **cada palabra como un token independiente** (AND). El orden no importa para el *match*: `López Juan` ≡ `Juan Lopez`. Cuando hay varios resultados, el **ranking** prioriza coincidencias más fuertes primero.

## Fuente de verdad
`src/utils/sanitize.js`:

| Helper | Uso |
|--------|-----|
| `normalizeForSearch` | Minúsculas + NFD sin marcas combinantes (`Martín`/`Martin`/`Màrtin` → `martin`; `ñ` → `n`) |
| `splitSearchTokens` | Parte por espacios, `+` y comas |
| `matchesMultiTokenSearch(parts, query)` | Match cliente: todos los tokens aparecen (vía score ≥ 0) |
| `scoreMultiTokenSearch(parts, query)` | Relevancia numérica (mayor = mejor; `-1` = no match) |
| `compareMultiTokenSearch(partsA, partsB, query)` | Comparador para `sort` (mejor primero) |
| `filterAndRankMultiTokenSearch(items, getParts, query)` | Filtra + ordena por score |
| `getSearchHighlightRanges` | Rangos para `<mark>` por token |
| `applyMultiTokenOrIlike` | PostgREST: cada token debe coincidir en alguno de los campos (`ilike`) |

FIMBA artistas/nómina: `src/utils/fimbaArtistaSearch.js` (`matchesFimbaArtistaPersonSearch` / `scoreFimbaArtistaPersonSearch`).

## Ranking (cliente)
Score sobre cada fragmento y sobre el haystack unido; se queda el **máximo**. Prioridad:

1. **Exacto completo** — haystack (o sus palabras) ≡ query normalizada (`+1_000_000`)
2. **Todas las palabras exactas** — cada token = una palabra del nombre (`+500_000`)
3. **Todos prefijos** — cada token es prefijo de una palabra (`+200_000`); ej. `José G` → `José` + `Gómez…`
4. **Orden / Apellido–Nombre** — tokens encajan en secuencia (o invertida) como prefijo/exacto (`+50_000`)
5. **Por token** — palabra exacta `1000` > prefijo `400` > substring a mitad `50`
6. Desempate: match más temprano y haystack más corto

Ejemplo: query `José G` → `Gómez, José` (prefijo de apellido + orden) antes que un match donde `G` solo aparece a mitad de otra palabra.

## Comportamiento
- **Cliente** (listas ya cargadas, `SearchableSelect`, filtros de Personas, roster, agenda, repertorio, etc.): `matchesMultiTokenSearch` / `filterAndRankMultiTokenSearch`.
- **Resaltado**: cada palabra de la query se marca por separado (también en Agenda vía `getAccentInsensitiveHighlightRanges`).
- **Servidor** (`ilike`): tokens AND entre campos; no hay `unaccent` en Postgres ni ranking remoto. En **Usuarios** la búsqueda filtra en cliente sobre el padrón para respetar tildes.

## Completado
- [x] Helpers canónicos en `sanitize.js`
- [x] Ranking por score (`scoreMultiTokenSearch` / `filterAndRankMultiTokenSearch`)
- [x] `SearchableSelect`, `FilterDropdown`, Command Palette (Ctrl+K)
- [x] Personas (`MusiciansView` + highlight), horas cátedra, roster, logística, comidas, ensambles
- [x] Agenda OFRN/FIMBA, repertorio, arreglos, datos, locaciones, entradas, FIMBA, SCRN
- [x] Selectores de gira/programa (`applyMultiTokenOrIlike` en FIMBA alta y assign repertorio)
- [x] Person/artist pickers con rank: FIMBA Artistas/Hotelería/Rider, seating, chofer, convocatoria sandbox, bulk novedad, repertorio músico
