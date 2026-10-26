/**
 * Genera migraciones UPSERT de app_manual (oleadas 2026-10-26).
 * Uso: node scripts/generate-app-manual-20261026.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(__dirname, "..", "supabase", "migrations");

function upsert(sectionKey, parentKey, title, content, sortOrder, category = "Giras") {
  const parentClause = parentKey
    ? `FROM public.app_manual p WHERE p.section_key = '${parentKey}'`
    : "";
  const parentCol = parentKey ? ", parent_id" : "";
  const parentVal = parentKey ? ", p.id" : "";
  const parentUpd = parentKey ? ", parent_id = EXCLUDED.parent_id" : "";
  return `
-- section: ${sectionKey}
INSERT INTO public.app_manual (section_key, category${parentCol}, title, content, sort_order)
SELECT '${sectionKey}', '${category}'${parentVal}, '${title.replace(/'/g, "''")}',
$html$${content}$html$,
  ${sortOrder}
${parentClause}
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category${parentUpd},
  sort_order = EXCLUDED.sort_order,
  last_updated = now();
`;
}

function upsertRoot(sectionKey, title, content, sortOrder, category) {
  return `
-- section: ${sectionKey}
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  '${sectionKey}',
  '${category}',
  '${title.replace(/'/g, "''")}',
  $html$${content}$html$,
  ${sortOrder}
)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();
`;
}

const cleanup = `-- app_manual: eliminar stubs históricos (ene-2026) sin uso por ManualTrigger
-- Hijos primero por FK parent_id.

DELETE FROM public.app_manual WHERE section_key = 'sub_mkdiz90p';
DELETE FROM public.app_manual WHERE section_key IN ('sub_mkdiyeu7', 'sub_mkdiyo99');
DELETE FROM public.app_manual WHERE section_key IN (
  'gira_LOGISTICS_coverage',
  'gira_LOGISTICS_rooming',
  'gira_LOGISTICS_transporte',
  'gira_LOGISTICS_viaticos',
  'gira_LOGISTICS_meals',
  'agenda_general',
  'dashboard_general',
  'musicos_general',
  'ensambles_general',
  'gira_contexto_general',
  'artistico_root'
);
`;

const oleada1a = `-- Oleada 1a: Logística núcleo — hub, Reglas, Comidas, asistencia, reporte, chips, timeline
${upsert(
  "gira_LOGISTICS",
  "cat_giras",
  "Logística",
  `<p><strong>Funcionamiento:</strong> Panel unificado de la gira por tramo (segmento entre cortes de fecha). Elegís el tramo activo y trabajás en pestañas: Reglas, Transporte, Rooming, Viáticos y el menú Comidas (Agenda/Menú, Asistencia, Reporte). Los datos se recalculan al cambiar de tramo o al pasar entre subpestañas de comidas.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Solo integrantes <strong>confirmados</strong> del roster reciben servicios. Si <code>giras_integrantes.estado = ausente</code>, quedan fuera de hotel, bus, comidas y viáticos.</li>
<li>Las vacantes (<code>es_simulacion</code>) son integrantes reales: al crear/asignar/eliminar hay que coordinar roster, grupos, hotel, transporte y comidas.</li>
<li>Los cortes de tramo se editan desde la cabecera logística; cambian el alcance de reglas y asignaciones por segmento.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No veo a alguien en logística» → revisar Personal (ausente / no confirmado) o exclusiones de hospedaje.</li>
<li>«Los números de comidas no cambian» → entrar de nuevo a Agenda/Asistencia/Reporte o cambiar tramo para forzar relectura de reglas.</li>
</ul>`,
  36,
)}
${upsert(
  "gira_logistica_coverage",
  "gira_LOGISTICS",
  "Reglas",
  `<p><strong>Funcionamiento:</strong> Pantalla <strong>Reglas</strong> (URL <code>subTab=coverage</code>). Definís filas en <code>giras_logistica_reglas</code>: a quién aplica cada regla (persona, ensamble, categoría/rol/familia/grupo, localidad o catch-all) y los hitos de hotel (check-in/out), bus y ventana de comidas (inicio/fin por slot día+servicio). El preview muestra quién gana cada hito.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Un solo motor de fuerza: <code>getMatchStrength</code> / <code>pickWinningLogisticsRule</code> en <code>giraUtils.js</code>. No hay un segundo criterio en hotel, bus o comidas.</li>
<li>Jerarquía (mayor gana): <strong>5</strong> Persona (ID) · <strong>4</strong> Ensamble (<code>target_ensambles</code> / tag ENS:) · <strong>3</strong> Categoría/rol/familia/grupo específica (no cubos LOCALES/NO_LOCALES) · <strong>2</strong> Localidad (solo <code>condicion = estable</code>) · <strong>1</strong> Catch-all (región, general, LOCALES, NO_LOCALES; EXTERNOS es catch-all de no estables no locales).</li>
<li>A igual fuerza: desempate por tipicidad de chip de rol; en catch-all gana la última regla del listado.</li>
<li>Comida inicio/fin = <strong>slot</strong> (fecha + Desayuno/Almuerzo/Merienda/Cena), no un <code>eventos.id</code>. Check-in/out sí apuntan a eventos (incl. early/late).</li>
<li>Localía en reglas LOCALES/NO_LOCALES para <strong>comida</strong> usa el tramo 0 (sede del viaje); check-in/bus usan el instante del hito.</li>
</ul>
<p><strong>Cómo se calcula:</strong></p>
<ul>
<li>Para cada persona e hito se evalúan las reglas que matchean; gana la de mayor fuerza (y desempate).</li>
<li>El chip <code>?</code> en preview ámbar explica qué regla la superó (tipo + alcance), nunca un «regla #12».</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«¿Por qué gana Viedma a No Locales?» → Localidad estable = fuerza 2; NO_LOCALES = 1.</li>
<li>«¿Por qué un refuerzo no toma la regla de localidad?» → localidad solo aplica a estables; refuerzos necesitan ID personal o ensamble/categoría que los cubra.</li>
<li>«Cambié la regla y el almuerzo sigue igual» → la matriz de comidas relee reglas al entrar/cambiar subTab o tramo.</li>
</ul>`,
  41,
)}
${upsert(
  "gira_logistica_meals",
  "gira_LOGISTICS",
  "Comidas (Agenda / Menú)",
  `<p><strong>Funcionamiento:</strong> Matriz de eventos de comida/catering por fecha y servicio (D/A/M/C/Cat). Por fila definís hora, locación, <strong>Convocados</strong> (tags), <strong>Grupos</strong> de convocatoria, artistas FIMBA y menú. El badge <strong>Comensales</strong> abre el detalle de quién cuenta (y quién se restó). Vacantes grises = slots sin evento aún; «Crear todas» arma A/M/C del rango de reglas. Panel flotante: edición masiva, Fusionar, Eliminar.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Elegibilidad OFRN: confirmado, no cuna, pasa convocados (si hay), pasa grupos del evento (si hay), y queda dentro de la ventana <code>comida_inicio</code>..<code>comida_fin</code> de su regla ganadora — salvo entrada por tag <code>LOC:</code> de residencia (vianda de regreso, etc.).</li>
<li>Convocados ∩ grupos (AND). Ejes vacíos no filtran. <code>GRP:NONE</code> («Nadie») sin grupos → 0 OFRN. Si hay grupos, <code>GRP:NONE</code> se ignora y cuentan los del grupo.</li>
<li>Artistas FIMBA son <strong>aditivos</strong> (tags en la fila); no restan OFRN.</li>
<li>Deducción orquesta↔grupo/ensamble: comida <em>amplia</em> (sin grupos y sin ENS:) resta a quienes ya comen en una comida prioritaria del <strong>mismo turno</strong> <code>fecha|servicio</code> (aunque la locación difiera).</li>
<li>Sobre-inclusión: misma persona OFRN o mismo artista en ≥2 comidas del turno (post-deducción) → banner/aviso.</li>
<li>Ausentes no comen. Vacantes siguen el mismo motor si están confirmadas en roster.</li>
</ul>
<p><strong>Cómo se calcula:</strong> (pregunta tipo «¿por qué tengo 12 para almorzar el martes?»)</p>
<ul>
<li>Localizá la(s) fila(s) de ese martes + Almuerzo.</li>
<li><strong>OFRN</strong> = cantidad de personas que pasan <code>isPersonEligibleForMealSlot</code> con los convocados/grupos de la fila, menos los descontados por comidas de grupo/ENS: del mismo turno.</li>
<li><strong>FIMBA</strong> = pax de artistas tagueados en la fila.</li>
<li><strong>Total comensales</strong> = OFRN + FIMBA. El modal lista nombres, dietas y el bloque «Descontados» (−N).</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«El número bajó al crear una cena de grupo» → deducción: esos músicos salen del conteo de la cena amplia.</li>
<li>«Puse Solo alojados y sale 0» → sin cobertura de comida en reglas, o todos ausentes, o GRP:NONE sin grupos.</li>
<li>«Hay dos almuerzos el mismo día» → válido (convocatorias distintas); usá Fusionar solo si querés unificar audiencia del mismo turno.</li>
</ul>`,
  45,
)}
${upsert(
  "gira_logistica_attendance",
  "gira_LOGISTICS",
  "Asistencia a comidas",
  `<p><strong>Funcionamiento:</strong> Planilla de presencia por persona y <strong>turno</strong> (<code>fecha|servicio</code>), no una columna por cada evento duplicado. La celda usa el evento resuelto post-deducción (prioriza comida de grupo/ensamble). Comparten filtros con Agenda (locación, artista, tipo, servicios).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Misma elegibilidad y deducción que Agenda/Menú.</li>
<li>Al guardar/limpiar asistencia se limpian residuales en eventos hermanos del turno.</li>
<li>Exportes respetan el set filtrado vigente.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Marqué asistencia y reapareció en otra columna» → eran dos eventos del mismo turno; el sistema consolida en el evento ganador.</li>
</ul>`,
  46,
)}
${upsert(
  "gira_logistica_report",
  "gira_LOGISTICS",
  "Reporte de comidas",
  `<p><strong>Funcionamiento:</strong> Exportes PDF / texto de pedido / Excel (y variantes FIMBA por artista) a partir de la matriz filtrada. Desglosa tipos de alimentación (Estándar, s/Lact., s/TACC, etc.). Usa la ventana ganadora <code>comida_inicio</code>/<code>comida_fin</code> del roster.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Mismos filtros compartidos Logística → Manager → Asistencia → Reporte.</li>
<li>Paridad de comensales y deducción con Agenda.</li>
<li>Texto pedido no incluye cierre de hospedaje; PDF/Excel sí pueden llevar anexos de dietas/notas FIMBA.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«El PDF no coincide con la pantalla» → revisá filtros activos (locación/artista/servicio) y que las reglas se hayan refrescado.</li>
</ul>`,
  47,
)}
${upsert(
  "logistica_chips",
  "cat_ayudas",
  "Chips de estado logístico",
  `<p><strong>Funcionamiento:</strong> Chips/resúmenes en la cabecera o filas de Reglas que indican si hotel, bus o comida están cubiertos, parciales o en conflicto para el criterio preview.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Reflejan el resultado de <code>pickWinningLogisticsRule</code>, no un estado manual aparte.</li>
<li>Ámbar suele significar «hay regla pero otra de mayor fuerza la supera» — usá el <code>?</code> para ver cuál.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«El chip está mal pero la habitación está bien» → el chip mira la regla ganadora del hito; la asignación física de rooming puede haberse fijado aparte.</li>
</ul>`,
  91,
  "Ayudas",
)}
${upsert(
  "logistica_linea_de_tiempo",
  "cat_ayudas",
  "Línea de tiempo logística",
  `<p><strong>Funcionamiento:</strong> Vista temporal de tramos, cortes y hitos (check-in/out, ventanas de comida, buses) según las reglas del tramo activo. Sirve para validar que inicio/fin de comida y hotel no queden invertidos.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>No se persiste una regla si el check-in (o early) es posterior al check-out (o late), ni si la comida inicial es posterior a la final.</li>
<li>Slots de comida se eligen por chips D/A/M/C + día (meses libres; días de gira destacados).</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No puedo guardar la regla» → fechas/hitos invertidos o slot incompleto.</li>
</ul>`,
  92,
  "Ayudas",
)}
`;

const oleada1b = `-- Oleada 1b: Transporte, Rooming, Viáticos
${upsert(
  "gira_logistica_transporte",
  "gira_LOGISTICS",
  "Transporte",
  `<p><strong>Funcionamiento:</strong> Vehículos del tramo (plazas, chofer, oficial/no), paradas y asignación de pasajeros. Las reglas de admisión al bus usan el mismo motor de fuerza que Reglas. Grupos de convocatoria pueden asociarse al vehículo (<code>giras_transportes_grupos</code>).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Jerarquía de match idéntica a Reglas (5…1). Refuerzos (no estables) <strong>solo</strong> suben por regla de ID personal, nunca por localidad general.</li>
<li><code>NO_LOCALES</code> puede incluir EXTERNOS (catch-all).</li>
<li>Ausentes no viajan. Vacantes ocupan asiento como integrante simulado hasta materializar titular.</li>
<li>Validar plazas y eliminar transporte con comprobaciones de pasajeros asignados.</li>
</ul>
<p><strong>Cómo se calcula:</strong></p>
<ul>
<li>Por tramo/parada se listan quienes matchean la regla ganadora de bus y no están excluidos.</li>
<li>Butacas = personas + plazas extra de instrumento cuando aplica.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Un refuerzo no aparece en el bus» → falta regla por ID (o ensamble/categoría que lo cubra sin depender de localidad).</li>
<li>«Está en el roster pero no en el micro» → ausente, otra regla de mayor fuerza, o fuera del tramo/parada.</li>
</ul>`,
  42,
)}
${upsert(
  "gira_logistica_rooming",
  "gira_LOGISTICS",
  "Rooming / Hospedaje",
  `<p><strong>Funcionamiento:</strong> Hoteles y habitaciones por tramo. Creación manual, drag-and-drop, importación de estructura/asignación del hotel, exportes por hotel. Exclusiones de hospedaje del roster impiden asignar cama.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Check-in/out de cobertura vienen de la regla ganadora (mismo motor de fuerza). Early/late check-in/out son tipos de evento ligados.</li>
<li>Unicidad: un integrante no debe quedar en dos hoteles del mismo tramo.</li>
<li>Vacantes: al asignar titular, hereda cama si mismo género; si otro género, sale de la habitación. Sincronizar <code>asignaciones_config</code>.</li>
<li>Ausentes: cero habitaciones.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No puedo meterlo al hotel» → exclusión de hospedaje, ausente, o ya asignado en otro cuarto/hotel del tramo.</li>
<li>«La vacante quedó en la cama» → al materializar titular hay que remapear IDs; no dejar el ID simulado.</li>
</ul>`,
  43,
)}
${upsert(
  "gira_logistica_viaticos",
  "gira_LOGISTICS",
  "Viáticos",
  `<p><strong>Funcionamiento:</strong> Anticipos por integrante según días en ruta, localidad, destaques y valor diario vigente (<code>giras_viaticos_detalle</code>). Se puede fijar <code>anticipo_custom</code> y una <code>rendicion_fecha</code> en config. PDF/exportes usan el total de pantalla.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Ausentes y casos sin cobertura no generan anticipo operativo.</li>
<li>Vacantes se tratan como integrantes del roster hasta reemplazo.</li>
<li>Fecha de rendición por defecto = primer lunes estrictamente posterior a <code>fecha_hasta</code> del programa, salvo override.</li>
<li>Celda naranja = cálculo automático; azul = anticipo manual. Refrescar restaura el automático.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«El PDF no coincide» → el PDF debe usar el total ya calculado en UI, no re-sumar pasajes/movilidad a ciegas.</li>
<li>«Cambié fechas de gira y los días no cuadran» → revisar tramos/destaques y reglas de cobertura.</li>
</ul>`,
  44,
)}
${upsert(
  "vi_ticos_intro_mkd1at12",
  "cat_ayudas",
  "Viáticos (intro)",
  `<p><strong>Funcionamiento:</strong> Ayuda contextual del gestor de viáticos de gira: cómo se arma el anticipo, cuándo usar override y dónde se define la fecha de rendición.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Persistencia real en <code>giras_viaticos_detalle</code> (no solo tablas legacy).</li>
<li>Misma lógica de ausentes/vacantes que el resto de logística.</li>
</ul>`,
  93,
  "Ayudas",
)}
`;

const oleada2 = `-- Oleada 2: Roster, grupos, vacantes, seating
${upsert(
  "gira_ROSTER",
  "cat_giras",
  "Personal / Nómina",
  `<p><strong>Funcionamiento:</strong> Define quién viaja. Fuentes automáticas (ensamble / familia en <code>giras_fuentes</code>) + inclusiones/exclusiones en <code>giras_integrantes</code>. Cada fila: estado, rol de gira (<code>rol</code> en DB → <code>rol_gira</code> en UI), instrumento (<code>id_instr</code>), tags de grupos. Botón <strong>Grupos de convocatoria</strong> para CRUD de grupos y miembros.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Estado <strong>ausente</strong>: prioridad absoluta; sin logística ni seating (aunque el ensamble esté convocado).</li>
<li>Exclusiones manuales y ausente ganan a filtros de ensamble/familia.</li>
<li>Vacantes = <code>integrantes</code> con <code>es_simulacion</code> (IDs numéricos). Crear/asignar/eliminar debe tocar roster, grupos, hotel, transporte y comidas.</li>
<li>Una persona puede estar en varios grupos; ausentes conservan membresía en DB pero no muestran tag ni cuentan para eventos.</li>
<li>Instrumento/familia salen de <code>instrumentos</code> vía <code>id_instr</code>, no de una columna familia en integrantes.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Está en el ensamble pero no en la gira» → fuente excluida o no incluida; o exclusión manual.</li>
<li>«Sigue apareciendo en comidas» → no está ausente/confirmación mal guardada; forzá refresh de logística.</li>
</ul>`,
  35,
)}
${upsert(
  "gira_SEATING",
  "cat_giras",
  "Seating (vista directa)",
  `<p><strong>Funcionamiento:</strong> Grilla de seating a pantalla completa: atriles (cuerdas) y particellas (vientos/percusión). Exportes PDF. Vacantes se marcan con borde ámbar.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Seating consume el roster filtrado de <code>useGiraRoster</code>: ausentes y ensambles excluidos <strong>no</strong> aparecen aunque su familia esté convocada.</li>
<li>Si el bloque tiene grupos (<code>programas_repertorios_grupos</code>), el seating se recorta a la unión de esos grupos; sin grupos = roster confirmado completo.</li>
<li>Configs de cuerdas: 1 config aplica a todos los bloques; N configs = asociación 1:1 bloque↔config.</li>
<li>Dentro de una config, cada músico aparece una sola vez en atriles (dedupe).</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Falta un músico del ensamble X» → ensamble excluido en fuentes o ausente en Personal.</li>
<li>«No veo al grupo B en este bloque» → el bloque tiene otros grupos asignados.</li>
</ul>`,
  40,
)}
${upsert(
  "gira_repertorio_programa",
  "gira_REPERTOIRE",
  "Programa / Bloques",
  `<p><strong>Funcionamiento:</strong> Orden de concierto: bloques y obras del catálogo, drag-and-drop, solistas, notas, exclusiones, grupos por bloque. Alimenta seating y Mis Partes.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Bloque sin grupos = todos los confirmados; con grupos = solo esos miembros en seating/partes.</li>
<li>Cambios de orden impactan exportaciones y vistas de particellas.</li>
</ul>`,
  48,
)}
${upsert(
  "gira_repertorio_seating",
  "gira_REPERTOIRE",
  "Seating en repertorio",
  `<p><strong>Funcionamiento:</strong> Misma grilla que seating directo, integrada en Repertorio (subTab seating). Pills de config de cuerdas y filtro por bloque/grupos.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Idénticas a Seating directo: roster filtrado + grupos del bloque + dedupe por config.</li>
</ul>`,
  49,
)}
${upsert(
  "gira_repertorio_mis_partes",
  "gira_REPERTOIRE",
  "Mis particellas",
  `<p><strong>Funcionamiento:</strong> Lista las particellas asignadas a tu instrumento/persona en las obras de la gira. Descarga PDF o enlace Drive según la obra.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Respeta seating y grupos del bloque. Ausente o obra excluida → no aparece la parte.</li>
<li>La config de cuerdas del bloque determina el contenedor resuelto.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No veo mi parte» → seating incompleto, bloque con otro grupo, o obra excluida.</li>
</ul>`,
  50,
)}
`;

const oleada3 = `-- Oleada 3: Agenda, repertorio hub, edición, difusión, mis comidas
${upsert(
  "gira_AGENDA",
  "cat_giras",
  "Agenda de gira",
  `<p><strong>Funcionamiento:</strong> Cronograma de eventos del programa (ensayos, conciertos, traslados, etc.). Creación/edición con tipo, fecha, hora, lugar y grupos. Multi-selección de editores: eliminar, ocultar técnico, etiquetar grupos. Filtro global de grupos (Tutti ∪ grupos) en el shell de gira.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Eventos sin <code>eventos_grupos</code> = generales (Tutti). Con grupos: el músico solo los ve si pertenece a alguno (editores ven todos).</li>
<li>Ausentes no figuran como convocados visibles.</li>
<li>Artistas FIMBA tagueados pueden mostrarse como chips bajo el evento.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No veo el ensayo» → filtro de grupos/categorías, o el evento es técnico/oculto.</li>
</ul>`,
  33,
)}
${upsert(
  "gira_REPERTOIRE",
  "cat_giras",
  "Repertorio de gira",
  `<p><strong>Funcionamiento:</strong> Hub del programa artístico: bloques/obras, seating y mis particellas. El orden se guarda en <code>programas_repertorios</code> y alimenta logística artística (no hotel/bus).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Seating siempre sobre roster filtrado (ver secciones hijas).</li>
<li>Grupos por bloque limitan quién toca ese bloque.</li>
</ul>`,
  34,
)}
${upsert(
  "gira_EDICION",
  "cat_giras",
  "Edición de gira",
  `<p><strong>Funcionamiento:</strong> Datos maestros del programa: nombre, fechas, tipo, nomenclador, ensambles/fuentes, cortes de tramo. Guardado con indicador de estado. Cambiar fechas desplaza tramos, slots de comida en reglas y eventos dependientes (vía flujos de move/duplicate).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Solo roles con permiso de edición/producción/admin.</li>
<li>Tramos mal cortados rompen hotel/bus/comida por segmento: validar después de editar fechas.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Se desfasaron las comidas» → reglas usan slots por fecha; al mover la gira deben desplazarse igual que el resto.</li>
</ul>`,
  39,
)}
${upsert(
  "gira_DIFUSION",
  "cat_giras",
  "Difusión de gira",
  `<p><strong>Funcionamiento:</strong> Fichas de conciertos, textos de prensa, enlaces y estado de publicación del programa. Complementa Difusión general del menú lateral.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>No reemplaza la creación de eventos en Agenda.</li>
<li>Los cambios alimentan reportes institucionales / hojas vinculadas según configuración.</li>
</ul>`,
  37,
)}
${upsert(
  "gira_MEALS_PERSONAL",
  "cat_giras",
  "Mis comidas (en gira)",
  `<p><strong>Funcionamiento:</strong> Vista del músico: comidas de esta gira donde resulta elegible. Consulta menú y confirma asistencia. La matriz la arma producción en Logística → Comidas.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Si estás ausente o fuera de convocados/cobertura, la lista estará vacía.</li>
<li>No edita convocados ni comensales globales.</li>
</ul>`,
  38,
)}
${upsert(
  "mis_comidas",
  "cat_ayudas",
  "Mis comidas (ayuda)",
  `<p><strong>Funcionamiento:</strong> Ayuda del botón contextual en Mis comidas: cómo leer el día/servicio y confirmar asistencia.</p>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No tengo comidas» → Personal (ausente), o producción aún no creó eventos / no estás en convocados.</li>
</ul>`,
  94,
  "Ayudas",
)}
${upsert(
  "my_meals",
  "cat_navegacion",
  "Mis comidas (global)",
  `<p><strong>Funcionamiento:</strong> Lista comidas de giras activas sin entrar gira por gira. Misma lógica de elegibilidad que Mis comidas en gira.</p>`,
  24,
  "Navegación",
)}
`;

const oleada4 = `-- Oleada 4–5: listado, intro, catálogos, management, higiene
${upsert(
  "giras_listado",
  "cat_giras",
  "Listado de giras",
  `<p><strong>Funcionamiento:</strong> Tarjetas/tabla de programas filtrables por fechas, tipo, comisión y estado. Abrís la gira en la última vista o en Agenda. Menú por tarjeta: duplicar, mover año, eliminar (según permisos).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Indicadores de progreso y vacantes salen de datos de la gira (incl. comidas/convocatoria alineados al matcher).</li>
</ul>`,
  31,
)}
${upsert(
  "gira_resumen",
  "cat_giras",
  "Resumen de gira",
  `<p><strong>Funcionamiento:</strong> Pantalla intermedia al entrar sin <code>view</code> en la URL: cabecera del programa y navegación a Agenda, Repertorio, Personal, Logística, etc.</p>`,
  32,
)}
${upsert(
  "section_status",
  "cat_ayudas",
  "Estado de secciones",
  `<p><strong>Funcionamiento:</strong> Control de avance por sección de la gira (agenda, repertorio, logística…). Los chips de color en el listado reflejan <code>giras_progreso</code>.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Es estado de gestión humana, no un cálculo automático de «todo asignado».</li>
</ul>`,
  95,
  "Ayudas",
)}
${upsert(
  "ensembles",
  "cat_modulos",
  "Ensambles",
  `<p><strong>Funcionamiento:</strong> Formaciones y plantel por ciclo/año. Alimentan fuentes de convocatoria en giras y tags ENS: en comidas/reglas.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Membresía vigente a la fecha del programa importa para match ENS: y GiraCard.</li>
<li>Excluir un ensamble en la gira saca a sus miembros del roster/seating aunque la familia esté convocada.</li>
</ul>`,
  63,
  "Módulos",
)}
${upsert(
  "musicians",
  "cat_modulos",
  "Personas",
  `<p><strong>Funcionamiento:</strong> Base de integrantes: datos personales, <code>id_instr</code>, condición (estable/refuerzo), contacto, preferencia alimentaria. Familia vía tabla <code>instrumentos</code>.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>IDs numéricos. Vacantes también viven aquí con <code>es_simulacion</code>.</li>
<li>Condición estable vs refuerzo cambia quién puede ganar reglas de localidad.</li>
</ul>`,
  64,
  "Módulos",
)}
${upsert(
  "locations",
  "cat_modulos",
  "Lugares / Sedes",
  `<p><strong>Funcionamiento:</strong> Catálogo de sedes/salas para agenda y locaciones de comida. Complementa Gestión → Espacios (estado operativo de venues).</p>`,
  67,
  "Módulos",
)}
${upsert(
  "repertoire",
  "cat_modulos",
  "Repertorio global",
  `<p><strong>Funcionamiento:</strong> Catálogo de obras (compositor, duración, etiquetas, Drive/IMSLP). Las giras referencian estas obras; no se duplican por programa.</p>`,
  61,
  "Módulos",
)}
${upsert(
  "management",
  "cat_gestion",
  "Gestión (inicio)",
  `<p><strong>Funcionamiento:</strong> Hub <code>/management</code>: Espacios, Informes Seating, Instrumentación, Convocatorias, Ensayos, Asistencia, Conciertos, Audiencia. No reemplaza la edición dentro de cada gira.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Herramientas públicas (<code>/entradas</code>, <code>/viaticos-manual</code>, <code>/transporte-scrn</code>, <code>/rendiciones-manual</code>) <strong>no</strong> están documentadas en este manual interno.</li>
</ul>`,
  81,
  "Gestión",
)}
${upsert(
  "management_seating",
  "management",
  "Informes Seating",
  `<p><strong>Funcionamiento:</strong> Exportá PDF/Excel de seating de uno o más programas con seating guardado; histórico de cuerdas entre programas.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Respeta el seating ya filtrado por roster de cada gira.</li>
</ul>`,
  83,
  "Gestión",
)}
${upsert(
  "management_convocatorias",
  "management",
  "Convocatorias",
  `<p><strong>Funcionamiento:</strong> Vista transversal de convocatorias/ensambles por programa. Complementa Personal dentro de la gira.</p>`,
  85,
  "Gestión",
)}
${upsert(
  "management_ensayos",
  "management",
  "Ensayos por programa",
  `<p><strong>Funcionamiento:</strong> Listado/reporte de ensayos asociados a programas. La creación diaria sigue en Agenda de gira.</p>`,
  86,
  "Gestión",
)}
${upsert(
  "dashboard",
  "cat_navegacion",
  "Inicio",
  `<p><strong>Funcionamiento:</strong> Tarjetas de giras vigentes con progreso por sección y vacantes. Filtros por tipo, estado y fechas; clic abre la gira.</p>`,
  21,
  "Navegación",
)}
${upsert(
  "app_intro_general",
  "cat_intro",
  "Bienvenida y roles",
  `<p><strong>Funcionamiento:</strong> Al iniciar sesión, el menú lateral refleja tu rol (músico, coordinador, editor, producción, admin, etc.). El ícono de libro abre el artículo del manual de la pantalla actual; el interruptor oculta los <code>?</code> contextuales.</p>
<ul>
<li>Perfil desde el avatar; calendario webcal desde Sincronizar.</li>
<li>Para dudas técnicas de una gira en curso, abrí Logística o Personal y usá el manual de esa sección (Reglas, Comidas, Roster).</li>
<li>Fuera de este manual: herramientas públicas Entradas, viáticos-manual, transporte SCRN, rendiciones-manual.</li>
</ul>`,
  11,
  "Introducción",
)}
${upsertRoot(
  "cat_giras",
  "Giras",
  `<p><strong>Funcionamiento:</strong> Núcleo operativo: cada programa agrupa agenda, repertorio, personal, logística, difusión y edición. Priorizá las secciones de Logística (Reglas y Comidas) y Personal para resolver dudas del día a día de una gira.</p>`,
  30,
  "Giras",
)}
`;

fs.writeFileSync(path.join(migDir, "20261026100000_app_manual_cleanup_orphans.sql"), cleanup);
fs.writeFileSync(path.join(migDir, "20261026110000_app_manual_oleada1_logistica_nucleo.sql"), oleada1a);
fs.writeFileSync(path.join(migDir, "20261026120000_app_manual_oleada1_transporte_rooming_viaticos.sql"), oleada1b);
fs.writeFileSync(path.join(migDir, "20261026130000_app_manual_oleada2_roster_seating.sql"), oleada2);
fs.writeFileSync(path.join(migDir, "20261026140000_app_manual_oleada3_agenda_edicion.sql"), oleada3);
fs.writeFileSync(path.join(migDir, "20261026150000_app_manual_oleada4_5_catalogos_higiene.sql"), oleada4);

console.log("Wrote 6 migration files to", migDir);
