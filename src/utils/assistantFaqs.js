/**
 * FAQs del asistente OFRN: respuestas locales (0 tokens OpenAI).
 * Cada entrada tiene `screen` (pantalla/vista primaria). Los chips muestran
 * las FAQs de la pantalla activa (mín. 3–4); el match de texto prioriza esa pantalla.
 */

/** @typedef {{ id: string, screen: string, question: string, answer: string, keywords: string[] }} AssistantFaq */

/** @type {AssistantFaq[]} */
export const ASSISTANT_FAQS = [
  // ─── Dashboard ───
  {
    id: "dash-abrir-gira",
    screen: "dashboard",
    question: "¿Cómo abro una gira desde el inicio?",
    answer:
      "En Inicio ves tarjetas de giras vigentes. Filtrá por tipo, estado o fechas y hacé clic en la tarjeta: entrá a la última vista usada o a Agenda.\n" +
      "Los chips de color son el avance en giras_progreso; el contador de vacantes avisa cupos sin cubrir.",
    keywords: ["abrir", "tarjeta", "inicio", "filtrar", "gira"],
  },
  {
    id: "dash-vacantes",
    screen: "dashboard",
    question: "¿Qué significa el aviso de vacantes?",
    answer:
      "Hay plazas de roster marcadas como vacante (integrante es_simulacion) sin titular. Entrá a la gira → Personal para generar, asignar o eliminar vacantes; eso impacta hotel, bus y comidas.",
    keywords: ["vacante", "vacantes", "cupo", "aviso"],
  },
  {
    id: "dash-progreso",
    screen: "dashboard",
    question: "¿Qué son los chips de color de cada gira?",
    answer:
      "Reflejan el estado de secciones (agenda, repertorio, logística, etc.) guardado en giras_progreso. Se actualizan con el control de estado de secciones dentro de la gira, no calculan solos «todo asignado».",
    keywords: ["chip", "progreso", "color", "estado", "seccion"],
  },
  {
    id: "dash-menu",
    screen: "dashboard",
    question: "¿Dónde está el menú de módulos?",
    answer:
      "El menú lateral muestra solo lo que tu rol permite (músico, editor, producción, admin…). El libro del header abre el manual de la pantalla actual; el interruptor oculta los ? contextuales.",
    keywords: ["menu", "menú", "rol", "lateral", "manual"],
  },

  // ─── Listado giras ───
  {
    id: "giras-crear",
    screen: "giras_list",
    question: "¿Cómo creo o duplico una gira?",
    answer:
      "Desde el listado (tab Giras) usá el alta de programa o el menú de cada tarjeta: duplicar, mover de año o eliminar (según permisos). Al abrir, la URL lleva giraId y view.",
    keywords: ["crear", "duplicar", "nueva", "programa", "eliminar"],
  },
  {
    id: "giras-filtros",
    screen: "giras_list",
    question: "¿Cómo filtro el listado de giras?",
    answer:
      "Filtrá por rango de fechas, tipo (sinfónico, ensamble…), comisión y estado (vigente/pausada/borrador). Cada tarjeta resume fechas, nomenclador y repertorio opcional.",
    keywords: ["filtro", "filtrar", "listado", "estado", "tipo"],
  },
  {
    id: "giras-entrar",
    screen: "giras_list",
    question: "¿Qué veo al entrar a una gira?",
    answer:
      "La barra pasa a sub-vistas: Agenda, Repertorio, Personal, Logística, Difusión, Edición, Mis comidas. El filtro de grupos (Tutti + grupos) queda en el header si la gira tiene grupos.",
    keywords: ["entrar", "vistas", "pestañas", "logistica", "agenda"],
  },
  {
    id: "giras-grupos-filtro",
    screen: "giras_list",
    question: "¿Para qué sirve el filtro de grupos?",
    answer:
      "Con la gira abierta, Tutti ∪ grupos tildados filtra Agenda, Comidas y Transportes (OR). Vacío = sin filtro. Los editores siguen viendo todos los eventos; los chips muestran el grupo.",
    keywords: ["grupos", "tutti", "filtro", "convocatoria"],
  },

  // ─── Agenda de gira ───
  {
    id: "agenda-crear",
    screen: "gira_agenda",
    question: "¿Cómo creo un evento en la agenda?",
    answer:
      "En Agenda de gira: nuevo evento → tipo (ensayo, concierto, traslado…), fecha, hora, lugar y grupos si aplica. Guardá; puede notificar a afectados según el tipo.",
    keywords: ["crear", "evento", "ensayo", "nuevo", "agenda"],
  },
  {
    id: "agenda-grupos",
    screen: "gira_agenda",
    question: "¿Por qué no veo un ensayo?",
    answer:
      "Puede estar filtrado por grupos (no estás en el grupo del evento), por categoría destildada, o marcado técnico/ojo cerrado. Eventos sin eventos_grupos = Tutti (generales).",
    keywords: ["no veo", "ensayo", "filtro", "grupo", "oculto", "tecnico"],
  },
  {
    id: "agenda-multi",
    screen: "gira_agenda",
    question: "¿Cómo etiqueto o borro varios eventos?",
    answer:
      "Editores: tilde bajo la hora → barra Eliminar / Ocultar / Etiqueta de grupo. Grupo en lote solo si todos son de la misma gira y esa gira tiene grupos. Esc o X limpia la selección.",
    keywords: ["lote", "multi", "borrar", "etiqueta", "seleccion"],
  },
  {
    id: "agenda-transporte",
    screen: "gira_agenda",
    question: "¿Por qué no veo mi bus en la agenda?",
    answer:
      "Si la categoría Transporte está destildada, se ocultan todas las paradas. «Solo mi transporte» oculta traslados 28/31 sin vehículo; INTERNO (35) sigue visible para activos. Con ojo cerrado seguís viendo paradas de tu bus.",
    keywords: ["bus", "transporte", "parada", "solo mi"],
  },

  // ─── Repertorio de gira ───
  {
    id: "rep-gira-obra",
    screen: "gira_repertoire",
    question: "¿Cómo agrego una obra al programa?",
    answer:
      "Repertorio de gira → bloques: agregá obras desde el catálogo global (no se duplican por programa). Reordená con drag-and-drop; podés poner solistas, nota interna y exclusión.",
    keywords: ["agregar", "obra", "programa", "bloque", "catalogo"],
  },
  {
    id: "rep-gira-orden",
    screen: "gira_repertoire",
    question: "¿El orden del repertorio afecta el seating?",
    answer:
      "El orden vive en programas_repertorios y alimenta seating y Mis Partes. Los grupos por bloque recortan quién toca ese bloque; sin grupos = roster confirmado completo.",
    keywords: ["orden", "seating", "bloque", "grupos"],
  },
  {
    id: "rep-gira-partes",
    screen: "gira_repertoire",
    question: "¿Dónde están Mis particellas?",
    answer:
      "Sub-pestaña Mis Partes (o vista equivalente): PDFs/enlaces según seating e instrumento. Si falta una parte: seating incompleto, bloque con otro grupo, o obra excluida.",
    keywords: ["particellas", "partes", "pdf", "descargar"],
  },
  {
    id: "rep-gira-excluir",
    screen: "gira_repertoire",
    question: "¿Cómo excluyo una obra para alguien?",
    answer:
      "En el bloque/obra marcá exclusión o ajustá grupos del bloque. El seating estricto no muestra ausentes ni ensambles excluidos del roster.",
    keywords: ["excluir", "exclusion", "obra", "ausente"],
  },

  // ─── Seating ───
  {
    id: "seating-asignar",
    screen: "gira_seating",
    question: "¿Cómo asigno atriles / particellas?",
    answer:
      "Arrastrá músicos a atriles (cuerdas) o asigná particellas (vientos/percusión). El roster viene filtrado: ausentes y ensambles excluidos no aparecen. Vacantes = borde ámbar.",
    keywords: ["atril", "asignar", "particella", "cuerdas", "arrastrar"],
  },
  {
    id: "seating-falta",
    screen: "gira_seating",
    question: "Falta un músico que está en el ensamble",
    answer:
      "Revisá Personal: ensamble excluido en fuentes, estado ausente, o bloque con grupos que no lo incluyen. El seating nunca usa la lista maestra sin filtrar.",
    keywords: ["falta", "no aparece", "ensamble", "excluido"],
  },
  {
    id: "seating-config",
    screen: "gira_seating",
    question: "¿Qué son las configs de cuerdas?",
    answer:
      "1 config aplica a todos los bloques. N configs = 1:1 bloque↔config. Dentro de una config cada músico aparece una sola vez en atriles (dedupe).",
    keywords: ["config", "cuerdas", "bloque", "duplicar"],
  },
  {
    id: "seating-pdf",
    screen: "gira_seating",
    question: "¿Cómo exporto el seating a PDF?",
    answer:
      "Usá el export de la vista Seating / Repertorio seating. También hay Informes Seating en Gestión para varios programas.",
    keywords: ["pdf", "export", "exportar", "informe"],
  },

  // ─── Roster ───
  {
    id: "roster-fuentes",
    screen: "gira_roster",
    question: "¿Cómo se arma el personal de la gira?",
    answer:
      "Fuentes automáticas (ensamble/familia en giras_fuentes) + inclusiones/exclusiones en giras_integrantes. Cada fila: estado, rol (rol → rol_gira), instrumento (id_instr).",
    keywords: ["fuente", "personal", "convocar", "incluir", "roster"],
  },
  {
    id: "roster-ausente",
    screen: "gira_roster",
    question: "¿Qué pasa si marco ausente?",
    answer:
      "Prioridad absoluta: sin hotel, bus, comidas ni seating, aunque el ensamble siga convocado. La membresía de grupo en DB se conserva pero no cuenta para eventos.",
    keywords: ["ausente", "marcar", "baja"],
  },
  {
    id: "roster-grupos",
    screen: "gira_roster",
    question: "¿Cómo gestiono grupos de convocatoria?",
    answer:
      "Botón Grupos: CRUD de grupos y miembros (solo confirmados). Shift+click marca rangos. Tags junto al nombre; editores pueden quitar del grupo con la × del chip.",
    keywords: ["grupos", "convocatoria", "miembros", "chip"],
  },
  {
    id: "roster-vacante",
    screen: "gira_roster",
    question: "¿Cómo creo o asigno una vacante?",
    answer:
      "Las vacantes son integrantes reales (es_simulacion). Al crear/asignar/eliminar coordiná roster, grupos, hotel, transporte y comidas. Al materializar titular: mismo género hereda cama; otro género sale de la habitación.",
    keywords: ["vacante", "titular", "reemplazo", "simulacion"],
  },

  // ─── Logística hub ───
  {
    id: "log-tabs",
    screen: "gira_logistics",
    question: "¿Qué pestañas tiene Logística?",
    answer:
      "Reglas, Transporte, Rooming, Viáticos y menú Comidas (Agenda/Menú, Asistencia, Reporte). Trabajás por tramo (segmento entre cortes). Ausentes no reciben servicios.",
    keywords: ["pestaña", "pestanas", "tramo", "logistica"],
  },
  {
    id: "log-tramos",
    screen: "gira_logistics",
    question: "¿Cómo edito los tramos?",
    answer:
      "Desde la cabecera logística (lápiz/cortes). Cambiar cortes redefine el alcance de reglas, hotel y bus por segmento. Validá después de mover fechas en Edición.",
    keywords: ["tramo", "tramos", "corte", "segmento", "fechas"],
  },
  {
    id: "log-refresh",
    screen: "gira_logistics",
    question: "Los números de comidas no se actualizan",
    answer:
      "Al entrar o pasar entre Agenda/Asistencia/Reporte (o al cambiar tramo) se releen las reglas. Salí y volvé a la subpestaña o cambiá de tramo para forzar recálculo.",
    keywords: ["actualizar", "refresh", "numeros", "stale"],
  },
  {
    id: "log-ausente",
    screen: "gira_logistics",
    question: "No veo a alguien en logística",
    answer:
      "Revisá Personal: ausente / no confirmado, o exclusión de hospedaje (solo rooming). El roster filtrado es la base de todos los servicios.",
    keywords: ["no veo", "falta", "ausente", "confirmado"],
  },

  // ─── Reglas ───
  {
    id: "reglas-que-es",
    screen: "gira_logistics_coverage",
    question: "¿Qué edito en Reglas?",
    answer:
      "Filas de giras_logistica_reglas: a quién aplica (persona, ensamble, categoría, localidad, catch-all) y hitos de hotel (CI/CO), bus y ventana de comidas (slot día+D/A/M/C). El preview muestra quién gana.",
    keywords: ["reglas", "cobertura", "editar", "hito"],
  },
  {
    id: "reglas-fuerza",
    screen: "gira_logistics_coverage",
    question: "¿Quién gana entre dos reglas?",
    answer:
      "5 Persona → 4 Ensamble → 3 Categoría/rol/familia/grupo → 2 Localidad (solo estables) → 1 Catch-all (LOCALES/NO_LOCALES/EXTERNOS).\n" +
      "Ej.: Viedma (2) gana a No Locales (1). El chip ? en ámbar nombra la regla que superó.",
    keywords: ["gana", "fuerza", "prioridad", "match"],
  },
  {
    id: "reglas-refuerzo",
    screen: "gira_logistics_coverage",
    question: "Un refuerzo no toma la regla de localidad",
    answer:
      "Localidad solo aplica a condicion = estable. Refuerzos necesitan regla por ID personal o ensamble/categoría. En bus vale lo mismo.",
    keywords: ["refuerzo", "localidad", "estable", "id"],
  },
  {
    id: "reglas-early",
    screen: "gira_logistics_coverage",
    question: "¿Cómo marco early check-in / late check-out?",
    answer:
      "En Reglas, tilde junto a Check-in / Check-out (tipos 40/41). También en EventForm. Sumán media noche en reportes de hotel. No se guarda si CI es posterior a CO o comida inicio > fin.",
    keywords: ["early", "late", "check-in", "check-out"],
  },

  // ─── Transporte ───
  {
    id: "bus-crear",
    screen: "gira_logistics_transporte",
    question: "¿Cómo creo un vehículo y paradas?",
    answer:
      "Logística → Transporte: alta de vehículo (capacidad, chofer, categoría PASAJEROS/LOGISTICO/INTERNO, oficial). Paradas tipadas 11/12/35 según categoría. Asigná pasajeros o dejá que las reglas de admisión los sumen.",
    keywords: ["crear", "vehiculo", "vehículo", "parada", "bus"],
  },
  {
    id: "bus-refuerzo",
    screen: "gira_logistics_transporte",
    question: "¿Por qué un refuerzo no aparece en el micro?",
    answer:
      "No estables solo suben por regla de ID personal (nunca por localidad general). Ausentes no viajan. Revisá Reglas del tramo.",
    keywords: ["refuerzo", "micro", "no aparece", "pasajero"],
  },
  {
    id: "bus-interno",
    screen: "gira_logistics_transporte",
    question: "El INTERNO muestra demasiadas butacas",
    answer:
      "INTERNO es visible para todos en agenda, pero el chip de ocupación y firmas solo cuentan quienes tienen ↑ y ↓ en ese viaje — no toda la orquesta.",
    keywords: ["interno", "butacas", "ocupacion", "charter"],
  },
  {
    id: "bus-borrar",
    screen: "gira_logistics_transporte",
    question: "¿Puedo borrar una parada de transporte?",
    answer:
      "Si es hito de subida/bajada en reglas (tipos 11/12), verás advertencia con personas/localidades/regiones (viáticos). Confirmá solo si vas a recrear el vínculo.",
    keywords: ["borrar", "eliminar", "parada", "subida", "bajada"],
  },

  // ─── Rooming ───
  {
    id: "hotel-asignar",
    screen: "gira_logistics_rooming",
    question: "¿Cómo asigno habitaciones?",
    answer:
      "Rooming por tramo: arrastrá desde Mujeres/Hombres a habitaciones, o usá import del hotel. Scroll independiente en columnas. Exportá por hotel cuando haga falta.",
    keywords: ["asignar", "habitacion", "habitación", "arrastrar", "rooming"],
  },
  {
    id: "hotel-no",
    screen: "gira_logistics_rooming",
    question: "¿Por qué no puedo meter a alguien al hotel?",
    answer:
      "Ausente, está en «No alojados» (exclusión), o ya tiene cama en otro hotel del mismo tramo (unicidad). Las exclusiones no lo sacan del roster.",
    keywords: ["no puedo", "hotel", "exclusion", "unicidad", "cama"],
  },
  {
    id: "hotel-fechas",
    screen: "gira_logistics_rooming",
    question: "Check-in / Mi Alojamiento con fechas raras",
    answer:
      "Gana una sola regla (fuerza 5…1); no se mezclan reglas débiles. Regla personal de hotel gana a región. Mi Alojamiento no muestra compañeros; los reportes de staff sí.",
    keywords: ["check-in", "fechas", "mi alojamiento", "early"],
  },
  {
    id: "hotel-vacante",
    screen: "gira_logistics_rooming",
    question: "Vacante en la cama al asignar titular",
    answer:
      "Mismo género → hereda cama. Otro género → sale de la habitación. Remapeá asignaciones_config; no dejes el ID simulado en la cama.",
    keywords: ["vacante", "titular", "genero", "género", "cama"],
  },

  // ─── Viáticos ───
  {
    id: "via-calculo",
    screen: "gira_logistics_viaticos",
    question: "¿Cómo se calcula el anticipo?",
    answer:
      "Días en ruta × valor diario (+ destaques/localidad según reglas). Persistencia en giras_viaticos_detalle. Celda naranja = automático; azul = anticipo_custom. Refrescar quita el override.",
    keywords: ["anticipo", "calculo", "cálculo", "viatico", "valor"],
  },
  {
    id: "via-manual",
    screen: "gira_logistics_viaticos",
    question: "¿Cómo pongo un anticipo manual?",
    answer:
      "Editá la celda (queda azul). El PDF debe usar el total de pantalla. Icono refrescar vuelve al cálculo automático.",
    keywords: ["manual", "custom", "override", "azul"],
  },
  {
    id: "via-rendicion",
    screen: "gira_logistics_viaticos",
    question: "¿Cuál es la fecha de rendición?",
    answer:
      "Por defecto el primer lunes estrictamente posterior a fecha_hasta del programa, salvo rendicion_fecha en config de la gira.",
    keywords: ["rendicion", "rendición", "fecha", "lunes"],
  },
  {
    id: "via-ausente",
    screen: "gira_logistics_viaticos",
    question: "Ausentes y vacantes en viáticos",
    answer:
      "Ausentes no generan anticipo operativo. Vacantes se tratan como integrantes del roster hasta el reemplazo.",
    keywords: ["ausente", "vacante", "anticipo"],
  },

  // ─── Comidas agenda ───
  {
    id: "meals-comensales",
    screen: "gira_logistics_meals",
    question: "¿Por qué da ese número de comensales?",
    answer:
      "Total = OFRN elegibles + FIMBA. OFRN pasa convocados∩grupos y cobertura de regla (salvo LOC: residencia). Comidas de grupo/ENS: del mismo turno restan del conteo amplio (−N). Abrí el badge Comensales.",
    keywords: ["comensales", "numero", "almuerzo", "conteo", "cuantos"],
  },
  {
    id: "meals-crear",
    screen: "gira_logistics_meals",
    question: "¿Cómo creo comidas del rango?",
    answer:
      "«Crear todas» arma vacantes A/M/C según fechas de reglas (defaults 12:30/17:30/21:30, Solo alojados). No crea desayunos ni pisa eventos existentes. Usá + para hermanas el mismo día.",
    keywords: ["crear", "todas", "vacante", "almuerzo", "merienda"],
  },
  {
    id: "meals-deduccion",
    screen: "gira_logistics_meals",
    question: "Bajó el conteo al crear comida de grupo",
    answer:
      "Deducción orquesta↔grupo/ensamble en el mismo fecha|servicio: quienes comen en la prioritaria salen del amplio. Ver −N y Descontados en el modal.",
    keywords: ["deduc", "grupo", "bajo", "resto"],
  },
  {
    id: "meals-fusionar",
    screen: "gira_logistics_meals",
    question: "¿Cómo fusiono dos comidas del mismo turno?",
    answer:
      "Seleccioná ≥2 filas reales misma fecha+servicio → Fusionar en el panel flotante. Une convocados/grupos/artistas; sobrevive la fila más completa. Confirmá antes.",
    keywords: ["fusionar", "unir", "duplicada", "turno"],
  },

  // ─── Asistencia comidas ───
  {
    id: "att-turno",
    screen: "gira_logistics_attendance",
    question: "¿Por qué hay una sola columna por almuerzo?",
    answer:
      "Asistencia colapsa por turno fecha|servicio, no por cada evento duplicado. La celda usa el evento ganador post-deducción (prioriza grupo/ensamble).",
    keywords: ["columna", "turno", "asistencia", "almuerzo"],
  },
  {
    id: "att-marcar",
    screen: "gira_logistics_attendance",
    question: "¿Cómo marco asistencia?",
    answer:
      "En la celda del turno marcá presencia. Al guardar se limpian residuales en eventos hermanos. Comparten filtros con Agenda (locación, artista, servicio).",
    keywords: ["marcar", "asistencia", "presencia", "guardar"],
  },
  {
    id: "att-filtro",
    screen: "gira_logistics_attendance",
    question: "No veo una comida en asistencia",
    answer:
      "Revisá filtros Locación / Artista / Todos|Comidas|Catering / servicios. Vacantes y pins de edición en Manager pueden diferir del set filtrado aquí.",
    keywords: ["filtro", "no veo", "catering", "artista"],
  },
  {
    id: "att-export",
    screen: "gira_logistics_attendance",
    question: "¿Los exportes respetan el filtro?",
    answer:
      "Sí: PDF / texto pedido / columnas usan el set filtrado vigente (paridad con Reporte).",
    keywords: ["export", "pdf", "filtro", "texto"],
  },

  // ─── Reporte comidas ───
  {
    id: "rep-comida-pdf",
    screen: "gira_logistics_report",
    question: "¿Cómo saco el pedido para catering?",
    answer:
      "Logística → Comidas → Reporte: PDF o texto de pedido con dietas (Estándar, s/Lact., s/TACC…). Usá los mismos filtros que Agenda. FIMBA tiene export por artista.",
    keywords: ["pedido", "catering", "pdf", "dieta", "reporte"],
  },
  {
    id: "rep-comida-mismatch",
    screen: "gira_logistics_report",
    question: "El PDF no coincide con la pantalla",
    answer:
      "Revisá filtros activos y que las reglas se hayan refrescado (entrar de nuevo o cambiar tramo). El reporte usa la ventana comida_inicio/fin ganadora.",
    keywords: ["pdf", "coincide", "filtro", "desfasado"],
  },
  {
    id: "rep-comida-fimba",
    screen: "gira_logistics_report",
    question: "¿Cómo exporto por artista FIMBA?",
    answer:
      "En modo FIMBA: export por artista (Excel multi-hoja / ZIP textos) y alertas de cobertura A/M/C. Notas de alimentación van al pie cuando hay nota_alimentacion.",
    keywords: ["fimba", "artista", "excel", "zip"],
  },
  {
    id: "rep-comida-dietas",
    screen: "gira_logistics_report",
    question: "¿Cómo se etiquetan las dietas?",
    answer:
      "dietShortLabel: vacío/General = Estándar; Sin Lactosa = s/Lact.; Sin Sal = s/sal; Sin TACC = s/TACC. FIMBA Regular no se mezcla con Estándar.",
    keywords: ["dieta", "tacc", "lactosa", "estandar"],
  },

  // ─── Difusión gira ───
  {
    id: "dif-gira-fichas",
    screen: "gira_difusion",
    question: "¿Qué edito en Difusión de gira?",
    answer:
      "Fichas de conciertos, textos de prensa, enlaces y estado de publicación del programa. Complementa Difusión general del menú; no reemplaza eventos de Agenda.",
    keywords: ["difusion", "prensa", "ficha", "concierto"],
  },
  {
    id: "dif-gira-estado",
    screen: "gira_difusion",
    question: "¿Cómo marco el estado de publicación?",
    answer:
      "En la ficha del concierto/programa actualizá el seguimiento de publicación. Los cambios alimentan reportes institucionales según configuración.",
    keywords: ["publicacion", "estado", "seguimiento"],
  },
  {
    id: "dif-gira-vs",
    screen: "gira_difusion",
    question: "¿Difusión de gira vs Difusión general?",
    answer:
      "Dentro de la gira trabajás ese programa. Difusión general (menú lateral) consolida varios programas visibles para el rol difusión.",
    keywords: ["general", "diferencia", "menu"],
  },
  {
    id: "dif-gira-agenda",
    screen: "gira_difusion",
    question: "¿Creo el concierto acá o en Agenda?",
    answer:
      "El evento operativo se crea en Agenda. Difusión completa datos de prensa/ficha sobre ese programa/concierto.",
    keywords: ["crear", "concierto", "agenda"],
  },

  // ─── Edición gira ───
  {
    id: "edit-fechas",
    screen: "gira_edicion",
    question: "¿Qué pasa si cambio las fechas de la gira?",
    answer:
      "Puede desplazar tramos, slots de comida en reglas y eventos (flujos move/duplicate). Revisá Logística después: hotel/bus/comida por segmento.",
    keywords: ["fechas", "cambiar", "mover", "tramo"],
  },
  {
    id: "edit-fuentes",
    screen: "gira_edicion",
    question: "¿Dónde defino ensambles convocados?",
    answer:
      "En Edición de gira (datos maestros): ensambles/fuentes, nomenclador, tipo, mes-letra. Eso alimenta el roster automático en Personal.",
    keywords: ["ensamble", "fuente", "convocado", "maestro"],
  },
  {
    id: "edit-guardar",
    screen: "gira_edicion",
    question: "¿Se guarda solo?",
    answer:
      "Sí: hay autoguardado con indicador de cambios pendientes/guardados. Solo roles con permiso de edición/producción/admin.",
    keywords: ["guardar", "autoguardado", "permiso"],
  },
  {
    id: "edit-nombre",
    screen: "gira_edicion",
    question: "¿Cómo cambio nombre o nomenclador?",
    answer:
      "Campos del formulario de Edición. El nomenclador/mes-letra impacta listados y exportaciones; el nombre se ve en tarjetas e informes.",
    keywords: ["nombre", "nomenclador", "subtitulo"],
  },

  // ─── Mis comidas (gira / global) ───
  {
    id: "mismeals-ver",
    screen: "gira_meals_personal",
    question: "¿Cómo veo mis comidas de esta gira?",
    answer:
      "Vista Mis comidas: días y servicios donde resultás elegible. Confirmá asistencia. La matriz la arma producción en Logística → Comidas.",
    keywords: ["mis comidas", "ver", "menu", "asistencia"],
  },
  {
    id: "mismeals-vacio",
    screen: "gira_meals_personal",
    question: "No tengo comidas listadas",
    answer:
      "Puede ser: estás ausente, fuera de convocados/cobertura, o producción aún no creó eventos. Revisá Personal y hablá con logística.",
    keywords: ["vacio", "vacío", "sin comidas", "no tengo"],
  },
  {
    id: "mismeals-confirmar",
    screen: "gira_meals_personal",
    question: "¿Cómo confirmo si asisto?",
    answer:
      "En cada comida usá el control de confirmación/asistencia personal. No edita convocados globales ni el número de comensales del evento.",
    keywords: ["confirmar", "asisto", "asistencia"],
  },
  {
    id: "mismeals-dieta",
    screen: "gira_meals_personal",
    question: "¿Dónde cambio mi dieta / preferencia?",
    answer:
      "En tu perfil / ficha de persona (alimentación). Eso alimenta los desgloses de dietas en reportes de comidas.",
    keywords: ["dieta", "preferencia", "alimentacion", "tacc"],
  },

  // ─── Repertorio global ───
  {
    id: "rep-obra-nueva",
    screen: "repertoire",
    question: "¿Cómo cargo una obra nueva?",
    answer:
      "Repertorio global → crear obra: título, compositor (catálogo), duración, etiquetas, instrumentación, enlaces Drive/IMSLP. Luego la incorporás a un programa desde Repertorio de la gira (no se duplica por gira).",
    keywords: ["cargar", "obra", "nueva", "crear", "alta"],
  },
  {
    id: "rep-compositor",
    screen: "repertoire",
    question: "¿Cómo agrego un compositor?",
    answer:
      "Desde la gestión de compositores del módulo Repertorio (o al crear la obra si permite alta). Usá el apellido/nombre canónicos; hay CSV de referencia en el proyecto para seeds.",
    keywords: ["compositor", "autor", "apellido"],
  },
  {
    id: "rep-imslp",
    screen: "repertoire",
    question: "¿Qué hace «Buscar sugerencias» en el título?",
    answer:
      "Llama a la Edge ask-ai (IMSLP + gpt-4o-mini) para sugerir título con movimientos / metadatos. Revisá siempre el resultado antes de guardar.",
    keywords: ["imslp", "sugerencia", "movimientos", "titulo"],
  },
  {
    id: "rep-tags",
    screen: "repertoire",
    question: "¿Para qué sirven las etiquetas?",
    answer:
      "Clasifican obras para búsqueda y curaduría. Se gestionan en el submódulo de tags del repertorio global.",
    keywords: ["etiqueta", "tag", "tags", "filtro"],
  },

  // ─── Arreglos ───
  {
    id: "arr-kanban",
    screen: "arreglos",
    question: "¿Cómo pido un arreglo?",
    answer:
      "Tablero kanban: nueva tarjeta con obra opcional, plazo y arreglador. Mové el estado según avance. Admin puede reasignar o cerrar.",
    keywords: ["arreglo", "pedido", "kanban", "tarjeta"],
  },
  {
    id: "arr-estado",
    screen: "arreglos",
    question: "¿Quién actualiza el estado?",
    answer:
      "El arreglador actualiza progreso; admin reasigna o cierra. No forma parte de la logística diaria de gira.",
    keywords: ["estado", "progreso", "arreglador"],
  },
  {
    id: "arr-obra",
    screen: "arreglos",
    question: "¿Puedo vincular a una obra del catálogo?",
    answer:
      "Sí: la tarjeta puede apuntar a una obra de Repertorio global para trazabilidad.",
    keywords: ["vincular", "obra", "catalogo"],
  },
  {
    id: "arr-plazo",
    screen: "arreglos",
    question: "¿Dónde veo plazos vencidos?",
    answer:
      "En el tablero, por columna de estado y fecha de plazo de cada tarjeta. Filtrá o revisá las columnas activas.",
    keywords: ["plazo", "vencido", "fecha"],
  },

  // ─── Ensambles ───
  {
    id: "ens-plantel",
    screen: "ensembles",
    question: "¿Cómo armo el plantel de un ensamble?",
    answer:
      "Ensambles → formación y miembros por ciclo/año. Eso alimenta fuentes de convocatoria en giras y tags ENS: en comidas/reglas.",
    keywords: ["plantel", "miembros", "ensamble", "ciclo"],
  },
  {
    id: "ens-coord",
    screen: "ensembles",
    question: "¿Cómo asigno coordinador?",
    answer:
      "En la ficha del ensamble asigná coordinadores. Ellos usan el módulo Coordinación para ensayos/repertorio del ciclo.",
    keywords: ["coordinador", "coord", "asignar"],
  },
  {
    id: "ens-gira",
    screen: "ensembles",
    question: "¿Cómo entra el ensamble a una gira?",
    answer:
      "En Edición/Personal de la gira como fuente ENSAMBLE. Excluir la fuente saca a sus miembros del roster/seating aunque la familia esté convocada.",
    keywords: ["gira", "fuente", "convocar", "excluir"],
  },
  {
    id: "ens-membresia",
    screen: "ensembles",
    question: "¿Importa la fecha de membresía?",
    answer:
      "Sí: para match ENS: y tarjetas de gira se usan membresías vigentes a fecha_desde del programa.",
    keywords: ["membresia", "vigente", "fecha"],
  },

  // ─── Músicos ───
  {
    id: "mus-alta",
    screen: "musicians",
    question: "¿Cómo doy de alta un músico?",
    answer:
      "Personas → nuevo integrante: datos personales, id_instr (instrumento), condición estable/refuerzo, contacto. La familia sale de la tabla instrumentos, no de una columna en integrantes.",
    keywords: ["alta", "nuevo", "musico", "músico", "crear"],
  },
  {
    id: "mus-condicion",
    screen: "musicians",
    question: "¿Estable vs refuerzo?",
    answer:
      "Condición estable puede ganar reglas de localidad (fuerza 2). Refuerzos no: para hotel/bus/comida por territorio necesitan ID personal u otras reglas.",
    keywords: ["estable", "refuerzo", "condicion"],
  },
  {
    id: "mus-dieta",
    screen: "musicians",
    question: "¿Dónde cargo la preferencia alimentaria?",
    answer:
      "En la ficha del integrante (alimentación). Alimenta reportes de comidas y columnas de dietas.",
    keywords: ["dieta", "alimentacion", "preferencia"],
  },
  {
    id: "mus-vacante",
    screen: "musicians",
    question: "¿Las vacantes están acá?",
    answer:
      "Sí: son filas de integrantes con es_simulacion. Se gestionan operativamente desde Personal de la gira (crear/asignar/eliminar).",
    keywords: ["vacante", "simulacion", "plaza"],
  },

  // ─── Usuarios ───
  {
    id: "usr-rol",
    screen: "users",
    question: "¿Cómo doy acceso a un usuario?",
    answer:
      "Usuarios del sistema: cuenta + roles + vínculo a integrante. Distinto de Personas (datos artísticos). El menú lateral refleja esos roles.",
    keywords: ["acceso", "usuario", "rol", "invitar"],
  },
  {
    id: "usr-vs-persona",
    screen: "users",
    question: "¿Usuario vs Persona?",
    answer:
      "Persona = músico/staff en catálogo. Usuario = login y permisos. Se vinculan para que el músico vea «su» logística y seating.",
    keywords: ["persona", "diferencia", "login", "perfil"],
  },
  {
    id: "usr-multirol",
    screen: "users",
    question: "¿Varios roles a la vez?",
    answer:
      "Sí. En el header hay selector para filtrar por rol activo cuando tenés más de uno.",
    keywords: ["roles", "multi", "selector", "header"],
  },
  {
    id: "usr-permisos",
    screen: "users",
    question: "No ve un módulo que debería",
    answer:
      "Revisá roles asignados y que el menú no esté limitado por el filtro de rol del header. Edición de gira/logística requiere roles de producción/editor/admin.",
    keywords: ["permiso", "no ve", "modulo", "módulo"],
  },

  // ─── Datos ───
  {
    id: "data-import",
    screen: "data",
    question: "¿Cómo importo un CSV?",
    answer:
      "Módulo Datos: herramientas de importación/exportación y grilla masiva. Operaciones pueden afectar muchas giras — usá con cuidado en producción.",
    keywords: ["csv", "importar", "exportar", "masivo"],
  },
  {
    id: "data-cuidado",
    screen: "data",
    question: "¿Puedo romper giras desde Datos?",
    answer:
      "Sí, si editás tablas maestras o masivas mal. Preferí flujos de gira (Personal, Logística) para cambios operativos del día.",
    keywords: ["romper", "cuidado", "produccion", "riesgo"],
  },
  {
    id: "data-export",
    screen: "data",
    question: "¿Cómo exporto una tabla?",
    answer:
      "Usá las acciones de exportación del módulo Datos según la entidad elegida. Para seating/comidas preferí los exportes de Logística/Gestión.",
    keywords: ["exportar", "tabla", "descargar"],
  },
  {
    id: "data-grilla",
    screen: "data",
    question: "¿Qué es la grilla universal?",
    answer:
      "Editor tabular para correcciones masivas sobre tablas del sistema. Validá IDs numéricos de integrantes (nunca UUIDs de logística).",
    keywords: ["grilla", "universal", "editar", "ids"],
  },

  // ─── Lugares ───
  {
    id: "loc-alta",
    screen: "locations",
    question: "¿Cómo doy de alta una sede?",
    answer:
      "Lugares/Sedes: nombre, dirección, coordenadas opcionales. Se usan al crear eventos en agenda y locaciones de comida.",
    keywords: ["sede", "lugar", "alta", "direccion"],
  },
  {
    id: "loc-vs-venue",
    screen: "locations",
    question: "¿Lugares vs Espacios (Gestión)?",
    answer:
      "Lugares = catálogo de sedes para agenda. Gestión → Espacios = estado operativo de venues de concierto (confirmado/pendiente…).",
    keywords: ["espacios", "venues", "diferencia", "gestion"],
  },
  {
    id: "loc-coords",
    screen: "locations",
    question: "¿Para qué sirven las coordenadas?",
    answer:
      "Mapas / resoluciones de ubicación (p. ej. edge resolve-maps). Opcionales pero útiles para logística y fichas.",
    keywords: ["coordenadas", "mapa", "gps"],
  },
  {
    id: "loc-comida",
    screen: "locations",
    question: "¿Las comidas usan estos lugares?",
    answer:
      "Sí: la columna Locación de la matriz de comidas elige sedes del catálogo (o vacío «Sin locación»).",
    keywords: ["comida", "locacion", "locación"],
  },

  // ─── Coordinación ───
  {
    id: "coord-que",
    screen: "coordinacion",
    question: "¿Qué puedo hacer en Coordinación?",
    answer:
      "Repertorio del ciclo, plantel y ensayos parciales de los ensambles que coordinás. coord_general ve todos pero no edita config de gira.",
    keywords: ["coordinacion", "ensayo", "ciclo"],
  },
  {
    id: "coord-ensayo",
    screen: "coordinacion",
    question: "¿Cómo cargo un ensayo de ensamble?",
    answer:
      "Desde Coordinación / agenda de ensamble según permisos. En la gira, los ensayos aparecen según grupos y filtros de agenda.",
    keywords: ["ensayo", "cargar", "parcial"],
  },
  {
    id: "coord-limites",
    screen: "coordinacion",
    question: "No puedo editar la gira",
    answer:
      "Esperado: coordinación no reemplaza Edición/Logística de gira. Pedí a producción/editor esos cambios.",
    keywords: ["no puedo", "editar", "gira", "permiso"],
  },
  {
    id: "coord-plantel",
    screen: "coordinacion",
    question: "¿El plantel se sincroniza con Ensambles?",
    answer:
      "Sí: el módulo Ensambles es la base; Coordinación opera sobre esa membresía/ciclo.",
    keywords: ["plantel", "sincroniza", "ensambles"],
  },

  // ─── Curaduría / News / Comments / Feedback / Manual ───
  {
    id: "cur-que",
    screen: "curadoria",
    question: "¿Para qué es Curaduría?",
    answer:
      "Revisión de programas/obras a nivel orquesta (propuestas, criterios). Acceso curadores/admin. No es logística de gira.",
    keywords: ["curaduria", "propuesta", "obra"],
  },
  {
    id: "cur-vs-rep",
    screen: "curadoria",
    question: "¿Curaduría vs Repertorio global?",
    answer:
      "Repertorio global = catálogo maestro. Curaduría = flujo de selección/seguimiento de obras en consideración.",
    keywords: ["repertorio", "diferencia", "catalogo"],
  },
  {
    id: "cur-acceso",
    screen: "curadoria",
    question: "No veo Curaduría en el menú",
    answer:
      "Tu rol no lo incluye. Pedí a admin el rol de curador o editor correspondiente.",
    keywords: ["menu", "rol", "acceso"],
  },
  {
    id: "cur-seguimiento",
    screen: "curadoria",
    question: "¿Cómo sigo una obra propuesta?",
    answer:
      "En el tablero/listado de curaduría actualizá estado y notas según el flujo del equipo.",
    keywords: ["seguimiento", "estado", "propuesta"],
  },

  {
    id: "news-crear",
    screen: "news_manager",
    question: "¿Cómo publico una novedad?",
    answer:
      "Comunicación: título, cuerpo, video opcional → publicar. Los usuarios la ven en el modal de novedades del header.",
    keywords: ["novedad", "publicar", "comunicacion"],
  },
  {
    id: "news-programar",
    screen: "news_manager",
    question: "¿Puedo programar o archivar?",
    answer:
      "Sí: según la UI podés programar o archivar comunicaciones anteriores.",
    keywords: ["programar", "archivar", "historial"],
  },
  {
    id: "news-video",
    screen: "news_manager",
    question: "¿Cómo adjunto video?",
    answer:
      "Campo de video en la novedad (URL). Se muestra en el modal al abrir la comunicación.",
    keywords: ["video", "adjunto", "url"],
  },
  {
    id: "news-audiencia",
    screen: "news_manager",
    question: "¿Quién la ve?",
    answer:
      "Integrantes con acceso a la app según la configuración de publicación; aparece en el header al haber novedades no leídas.",
    keywords: ["quien", "audiencia", "leen"],
  },

  {
    id: "avisos-que",
    screen: "comments",
    question: "¿Qué son los Avisos?",
    answer:
      "Comentarios y pendientes entre giras. El ícono de mensajes del header muestra totales; @menciones con contador. Al abrir saltás a la gira/sección.",
    keywords: ["aviso", "comentario", "mencion", "pendiente"],
  },
  {
    id: "avisos-crear",
    screen: "comments",
    question: "¿Cómo dejo un aviso en una gira?",
    answer:
      "Desde la sección de comentarios de la gira o el flujo que abre el ícono de mensajes. Incluí contexto de sección para que el salto sea útil.",
    keywords: ["dejar", "crear", "comentario"],
  },
  {
    id: "avisos-filtro",
    screen: "comments",
    question: "¿Cómo veo solo mis menciones?",
    answer:
      "El header distingue total de avisos vs menciones @ (contador rojo). Abrí el panel y filtrá/priorizá menciones.",
    keywords: ["mencion", "mías", "filtro", "rojo"],
  },
  {
    id: "avisos-resuelto",
    screen: "comments",
    question: "¿Cómo marco resuelto?",
    answer:
      "En el ítem de aviso/pendiente cambiá el estado según los controles de la UI (pendiente → resuelto).",
    keywords: ["resuelto", "cerrar", "estado"],
  },

  {
    id: "fb-enviar",
    screen: "feedback",
    question: "¿Cómo envío feedback?",
    answer:
      "Widget flotante abajo a la derecha en cualquier pantalla: mensaje + captura opcional + ruta actual. Admin lo ve en Feedback.",
    keywords: ["feedback", "enviar", "bug", "sugerencia"],
  },
  {
    id: "fb-estados",
    screen: "feedback",
    question: "¿Qué estados tiene un ticket?",
    answer:
      "Pendiente, en curso, resuelto — con comentarios del equipo y fecha estimada opcional.",
    keywords: ["estado", "pendiente", "resuelto"],
  },
  {
    id: "fb-ruta",
    screen: "feedback",
    question: "¿Para qué guarda la ruta?",
    answer:
      "Para reproducir el contexto (tab/gira/view) donde ocurrió el problema.",
    keywords: ["ruta", "url", "contexto"],
  },
  {
    id: "fb-vs-ayuda",
    screen: "feedback",
    question: "¿Feedback vs este asistente?",
    answer:
      "El asistente (FAQ/IA) responde dudas de uso. Feedback es para reportar bugs o pedir mejoras al equipo.",
    keywords: ["diferencia", "asistente", "ayuda"],
  },

  {
    id: "man-buscar",
    screen: "manual",
    question: "¿Cómo busco en el manual?",
    answer:
      "Tab Manual: árbol + búsqueda por palabra en títulos y contenido. El libro del header abre el artículo de la pantalla actual.",
    keywords: ["buscar", "manual", "arbol"],
  },
  {
    id: "man-logistica",
    screen: "manual",
    question: "¿Dónde está la ayuda de comidas/hotel?",
    answer:
      "En el árbol: Giras → Logística → Reglas / Comidas / Rooming / Transporte. También FAQs de este asistente según la pantalla abierta.",
    keywords: ["comidas", "hotel", "logistica", "reglas"],
  },
  {
    id: "man-editar",
    screen: "manual",
    question: "¿Quién edita el manual?",
    answer:
      "Admin en Manual Admin (?tab=manual_admin) o migraciones SQL UPSERT. Imágenes en bucket manual-content.",
    keywords: ["editar", "admin", "contenido"],
  },
  {
    id: "man-video",
    screen: "manual",
    question: "¿Hay videos?",
    answer:
      "Algunas secciones tienen video_url. Si falta, el artículo de texto sigue siendo la referencia.",
    keywords: ["video", "tutorial"],
  },

  // ─── Management ───
  {
    id: "mgmt-hub",
    screen: "management",
    question: "¿Qué hay en Gestión?",
    answer:
      "Hub /management: Espacios, Informes Seating, Instrumentación, Convocatorias, Ensayos, Asistencia, Conciertos, Audiencia. No reemplaza Logística de cada gira.",
    keywords: ["gestion", "hub", "management"],
  },
  {
    id: "mgmt-seating",
    screen: "management",
    question: "¿Cómo exporto seating de varias giras?",
    answer:
      "Gestión → Informes Seating: elegí programas con seating guardado → PDF/Excel o histórico de cuerdas.",
    keywords: ["seating", "export", "informe", "varias"],
  },
  {
    id: "mgmt-entradas",
    screen: "management",
    question: "¿Dónde está Entradas / viáticos-manual?",
    answer:
      "Son herramientas públicas fuera del manual interno: /entradas, /viaticos-manual, /transporte-scrn, /rendiciones-manual.",
    keywords: ["entradas", "viaticos-manual", "scrn", "publico"],
  },
  {
    id: "mgmt-venues",
    screen: "management",
    question: "¿Espacios vs Lugares?",
    answer:
      "Espacios (Gestión) = estado operativo de venues. Lugares (menú) = catálogo de sedes para agenda/comidas.",
    keywords: ["espacios", "venues", "lugares"],
  },

  // ─── Agenda general / Mis comidas global / Difusión general / Traducción ───
  {
    id: "fullag-ver",
    screen: "full_agenda",
    question: "¿Qué muestra la Agenda general?",
    answer:
      "Calendario unificado de eventos de las giras a las que tenés acceso. Cambiá vista mes/semana/lista y abrí el detalle o saltá a la gira.",
    keywords: ["agenda", "general", "calendario", "mes"],
  },
  {
    id: "fullag-filtro",
    screen: "full_agenda",
    question: "¿Cómo filtro por tipo de evento?",
    answer:
      "Usá los filtros de categoría/tipo de la agenda. Músicos ven según convocatoria/grupos de cada gira.",
    keywords: ["filtro", "tipo", "categoria"],
  },
  {
    id: "fullag-editar",
    screen: "full_agenda",
    question: "¿Puedo editar desde acá?",
    answer:
      "Sí, si tu rol lo permite: abrís el evento y editás como en la agenda de gira. Conviene validar el contexto de la gira correcta.",
    keywords: ["editar", "evento", "permiso"],
  },
  {
    id: "fullag-sync",
    screen: "full_agenda",
    question: "¿Cómo sincronizo con Google Calendar?",
    answer:
      "Botón Sincronizar del header: enlace webcal / HTTPS para Google, iOS, etc.",
    keywords: ["sincronizar", "google", "webcal", "calendar"],
  },

  {
    id: "mymeals-global",
    screen: "my_meals",
    question: "¿Qué es Mis comidas (global)?",
    answer:
      "Lista comidas de giras activas sin entrar gira por gira. Misma elegibilidad que Mis comidas dentro de la gira.",
    keywords: ["global", "mis comidas", "todas"],
  },
  {
    id: "mymeals-g-vacio",
    screen: "my_meals",
    question: "La lista está vacía",
    answer:
      "No hay eventos que te incluyan, estás ausente, o no hay giras activas con comidas cargadas.",
    keywords: ["vacia", "vacía", "sin"],
  },
  {
    id: "mymeals-g-conf",
    screen: "my_meals",
    question: "¿Confirmo asistencia acá?",
    answer:
      "Sí, por comida listada. Para el detalle de una sola gira también podés usar Mis comidas dentro de esa gira.",
    keywords: ["confirmar", "asistencia"],
  },
  {
    id: "mymeals-g-dieta",
    screen: "my_meals",
    question: "¿Dónde cambio mi dieta?",
    answer:
      "En el perfil / ficha de Persona (preferencia alimentaria), no en esta lista.",
    keywords: ["dieta", "perfil", "preferencia"],
  },

  {
    id: "difgen-que",
    screen: "difusion_general",
    question: "¿Qué es Difusión general?",
    answer:
      "Vista consolidada de fichas de difusión de varios programas para el rol difusión. Complementa la pestaña Difusión de cada gira.",
    keywords: ["difusion", "general", "consolida"],
  },
  {
    id: "difgen-editar",
    screen: "difusion_general",
    question: "¿Puedo editar fichas acá?",
    answer:
      "Sí, las visibles para tu rol. Los cambios impactan el seguimiento de publicación del programa.",
    keywords: ["editar", "ficha", "prensa"],
  },
  {
    id: "difgen-filtro",
    screen: "difusion_general",
    question: "¿Cómo encuentro un concierto?",
    answer:
      "Filtrá/buscá por programa o fecha en la vista consolidada.",
    keywords: ["buscar", "concierto", "filtro"],
  },
  {
    id: "difgen-vs",
    screen: "difusion_general",
    question: "¿Cuándo uso la pestaña de la gira?",
    answer:
      "Para trabajar un solo programa en profundidad. La general sirve para planificación transversal de prensa.",
    keywords: ["gira", "pestana", "cuando"],
  },

  {
    id: "tr-pdf",
    screen: "music_translation",
    question: "¿Cómo empiezo una traducción?",
    answer:
      "Importá un PDF AcroForm; el sistema detecta segmentos y editás la traducción al español (vista PDF o estructura). Guarda al instante.",
    keywords: ["pdf", "traduccion", "importar", "segmento"],
  },
  {
    id: "tr-rimas",
    screen: "music_translation",
    question: "¿Qué son rimas y flujo?",
    answer:
      "Cada segmento guarda flujo (línea, párrafo, cesura), rimas A–F y repeticiones para mantener estructura del original.",
    keywords: ["rima", "flujo", "cesura", "repeticion"],
  },
  {
    id: "tr-guardar",
    screen: "music_translation",
    question: "¿Hay que guardar a mano?",
    answer:
      "Los cambios persisten al instante en Supabase al editar segmentos.",
    keywords: ["guardar", "autosave", "persistir"],
  },
  {
    id: "tr-logistica",
    screen: "music_translation",
    question: "¿Afecta logística de gira?",
    answer:
      "No. Es un módulo artístico independiente de hotel/bus/comidas.",
    keywords: ["logistica", "gira", "independiente"],
  },
];

/**
 * Pantalla primaria según URL de la app.
 * @param {{ tab?: string, view?: string, subTab?: string, giraId?: string|null, pathname?: string }} ctx
 */
export function resolveFaqScreen(ctx = {}) {
  const tab = String(ctx.tab || "dashboard").toLowerCase();
  const view = String(ctx.view || "").toUpperCase();
  const subTab = String(ctx.subTab || "").toLowerCase();
  const giraId = ctx.giraId;
  const pathname = String(ctx.pathname || "");

  if (pathname.includes("/management") || tab === "management") return "management";

  if (tab === "giras" || giraId) {
    if (!giraId && tab === "giras") return "giras_list";
    if (view === "AGENDA") return "gira_agenda";
    if (view === "REPERTOIRE") {
      if (subTab === "seating") return "gira_seating";
      return "gira_repertoire";
    }
    if (view === "SEATING") return "gira_seating";
    if (view === "ROSTER") return "gira_roster";
    if (view === "DIFUSION") return "gira_difusion";
    if (view === "EDICION") return "gira_edicion";
    if (view === "MEALS_PERSONAL") return "gira_meals_personal";
    if (view === "LOGISTICS" || view === "VIATICOS") {
      if (subTab === "coverage" || !subTab) return "gira_logistics_coverage";
      if (subTab === "transporte") return "gira_logistics_transporte";
      if (subTab === "rooming") return "gira_logistics_rooming";
      if (subTab === "viaticos") return "gira_logistics_viaticos";
      if (subTab === "meals") return "gira_logistics_meals";
      if (subTab === "attendance") return "gira_logistics_attendance";
      if (subTab === "report") return "gira_logistics_report";
      return "gira_logistics";
    }
    if (giraId) return "gira_agenda";
    return "giras_list";
  }

  const tabMap = {
    dashboard: "dashboard",
    agenda: "full_agenda",
    repertorio: "repertoire",
    arreglos: "arreglos",
    ensambles: "ensembles",
    musicos: "musicians",
    usuarios: "users",
    datos: "data",
    locaciones: "locations",
    coordinacion: "coordinacion",
    curadoria: "curadoria",
    news_manager: "news_manager",
    avisos: "comments",
    comidas: "my_meals",
    feedback: "feedback",
    manual: "manual",
    manual_admin: "manual",
    difusion: "difusion_general",
    music_translation: "music_translation",
  };

  return tabMap[tab] || "dashboard";
}

/** @deprecated usar resolveFaqScreen; se mantiene por compat. */
export function resolveFaqScopes(virtualPath = "", subTab = "") {
  const screen = inferScreenFromPath(virtualPath, subTab);
  return [screen, "general"];
}

function inferScreenFromPath(virtualPath, subTab) {
  const p = String(virtualPath || "").toLowerCase();
  const s = String(subTab || "").toLowerCase();
  if (p.includes("/management")) return "management";
  if (p.includes("logistica") || p.includes("logistic")) {
    if (s === "transporte" || p.includes("transporte")) return "gira_logistics_transporte";
    if (s === "rooming" || p.includes("rooming")) return "gira_logistics_rooming";
    if (s === "viaticos" || p.includes("viatico")) return "gira_logistics_viaticos";
    if (s === "meals" || p.endsWith("/meals")) return "gira_logistics_meals";
    if (s === "attendance") return "gira_logistics_attendance";
    if (s === "report") return "gira_logistics_report";
    if (s === "coverage" || p.includes("coverage")) return "gira_logistics_coverage";
    return "gira_logistics";
  }
  if (p.includes("roster")) return "gira_roster";
  if (p.includes("seating")) return "gira_seating";
  if (p.includes("repertorio") && p.includes("gira")) return "gira_repertoire";
  if (p.includes("/repertorio") || p === "/repertorio") return "repertoire";
  if (p.includes("agenda") && p.includes("gira")) return "gira_agenda";
  if (p.includes("agenda")) return "full_agenda";
  return "dashboard";
}

function fold(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} query
 * @param {string} screen
 */
export function matchAssistantFaq(query, screen = "dashboard") {
  const q = fold(query);
  if (q.length < 3) return null;

  let best = null;
  for (const faq of ASSISTANT_FAQS) {
    let score = 0;
    const sameScreen = faq.screen === screen;
    if (sameScreen) score += 4;

    const fq = fold(faq.question);
    if (q === fq || fq.includes(q) || q.includes(fq.slice(0, 36))) score += 10;

    for (const kw of faq.keywords) {
      const k = fold(kw);
      if (!k) continue;
      if (q.includes(k)) score += k.length >= 5 ? 3 : 2;
    }

    // Permitir match cross-screen si es muy claro (keywords fuertes)
    const min = sameScreen ? 4 : 9;
    if (score >= min && (!best || score > best.score)) {
      best = { faq, score };
    }
  }
  return best;
}

/**
 * Chips de la pantalla activa (siempre las de ese screen; fallback general).
 * @param {string} screen
 * @param {number} [limit]
 */
export function listFaqChips(screen = "dashboard", limit = 4) {
  const primary = ASSISTANT_FAQS.filter((f) => f.screen === screen);
  if (primary.length > 0) return primary.slice(0, Math.max(limit, 4));
  return ASSISTANT_FAQS.filter((f) => f.screen === "dashboard").slice(0, 4);
}

/** Etiqueta legible para el header del chat */
export function faqScreenLabel(screen) {
  const labels = {
    dashboard: "Inicio",
    giras_list: "Listado de giras",
    gira_agenda: "Agenda de gira",
    gira_repertoire: "Repertorio de gira",
    gira_seating: "Seating",
    gira_roster: "Personal",
    gira_logistics: "Logística",
    gira_logistics_coverage: "Reglas",
    gira_logistics_transporte: "Transporte",
    gira_logistics_rooming: "Rooming",
    gira_logistics_viaticos: "Viáticos",
    gira_logistics_meals: "Comidas · Agenda",
    gira_logistics_attendance: "Comidas · Asistencia",
    gira_logistics_report: "Comidas · Reporte",
    gira_difusion: "Difusión de gira",
    gira_edicion: "Edición de gira",
    gira_meals_personal: "Mis comidas",
    repertoire: "Repertorio global",
    arreglos: "Arreglos",
    ensembles: "Ensambles",
    musicians: "Personas",
    users: "Usuarios",
    data: "Datos",
    locations: "Lugares",
    coordinacion: "Coordinación",
    curadoria: "Curaduría",
    news_manager: "Comunicación",
    comments: "Avisos",
    my_meals: "Mis comidas (global)",
    feedback: "Feedback",
    manual: "Manual",
    management: "Gestión",
    music_translation: "Traducción musical",
    difusion_general: "Difusión general",
    full_agenda: "Agenda general",
  };
  return labels[screen] || screen;
}
