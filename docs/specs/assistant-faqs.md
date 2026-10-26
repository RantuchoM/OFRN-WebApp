# Spec: FAQs del asistente (sin tokens)

## Objetivo

Responder dudas frecuentes **por pantalla/vista** sin llamar a OpenAI. Cada pantalla tiene ≥4 FAQs. El lenguaje natural libre solo se usa si no hay match.

## Flujo

```
URL (tab / giraId / view / subTab)
  → resolveFaqScreen
  → listFaqChips(screen)  // 4 de esa pantalla
Usuario → chip o texto
  → matchAssistantFaq(texto, screen)  // prioriza misma pantalla
  → hit: FAQ local
  → miss: ask-ai
```

Al cambiar de pantalla se limpia el hilo del chat para mostrar las FAQ nuevas.

## Archivos

| Archivo | Rol |
|---------|-----|
| `src/utils/assistantFaqs.js` | Catálogo `screen` + match + chips |
| `src/components/ui/AIAssistant.jsx` | UI; FAQ first; label de pantalla |
| `App.jsx` | Montaje (bottom-left) |

## Pantallas (`screen`)

Incluye: `dashboard`, `giras_list`, `gira_agenda`, `gira_repertoire`, `gira_seating`, `gira_roster`, `gira_logistics_*` (coverage/transporte/rooming/viaticos/meals/attendance/report), `gira_difusion`, `gira_edicion`, `gira_meals_personal`, `repertoire`, `arreglos`, `ensembles`, `musicians`, `users`, `data`, `locations`, `coordinacion`, `curadoria`, `news_manager`, `comments`, `my_meals`, `feedback`, `manual`, `management`, `music_translation`, `difusion_general`, `full_agenda`.

Logística: `view=LOGISTICS` + `subTab` (coverage por defecto = Reglas).

## Ampliar

Agregar a `ASSISTANT_FAQS`: `{ id, screen, question, answer, keywords[] }`. Mantener ≥4 por `screen`.

## Disponibilidad (2026-10)

Por defecto el FAB **no se muestra**. Atajo secreto de prueba:

- **Ctrl + Alt + Shift + A** — activa/desactiva el botón (queda en `sessionStorage` hasta cerrar la pestaña).

## Checklist

- [x] ≥4 FAQs por pantalla/vista principal
- [x] Chips solo de la pantalla activa + etiqueta «FAQ de: …»
- [x] Match prioriza misma pantalla
- [x] Chat oculto + atajo secreto
- [ ] Opcional: espejo server-side en `ask-ai`
