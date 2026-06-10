-- Actualización del manual de usuario OFRN (app_manual)
-- UPSERT por section_key; no borra filas ajenas. video_url y created_at no se modifican en conflicto.
-- Formato de cada artículo: párrafo "Funcionamiento" + lista breve de acciones/reglas.

-- =============================================================================
-- CATEGORÍAS RAÍZ
-- =============================================================================

-- section: cat_intro
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_intro',
  'Introducción',
  'Introducción',
  '<p><strong>Funcionamiento:</strong> Agrupa la bienvenida y conceptos generales de la app. Desde aquí se entiende cómo navegar, qué muestra cada rol y dónde encontrar la ayuda contextual del ícono de libro en la barra superior.</p>',
  10
)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

-- section: app_intro_general
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT
  'app_intro_general',
  'Introducción',
  p.id,
  'Bienvenida y roles',
  '<p><strong>Funcionamiento:</strong> Al iniciar sesión, la app carga el menú lateral según tu rol de sistema (músico, coordinador, editor, producción, admin, etc.). Cada rol ve solo los módulos que le corresponden; las acciones de edición y borrado se habilitan o bloquean en consecuencia.</p>
<ul>
<li><strong>Ayuda contextual:</strong> el botón de manual en el header abre el artículo de la pantalla actual.</li>
<li><strong>Ocultar ayudas:</strong> el interruptor junto al manual oculta los íconos ? en toda la app.</li>
<li><strong>Perfil:</strong> desde el avatar editás datos personales; el aviso naranja pide verificación anual.</li>
<li><strong>Calendario:</strong> el botón Sincronizar genera un enlace webcal para Google Calendar, iOS o copia HTTPS.</li>
<li><strong>Roles múltiples:</strong> si tenés más de un rol, elegís cuál filtrar desde el selector del header.</li>
</ul>',
  11
FROM public.app_manual p WHERE p.section_key = 'cat_intro'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

-- section: cat_navegacion
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_navegacion',
  'Navegación',
  'Navegación general',
  '<p><strong>Funcionamiento:</strong> Reúne pantallas de uso transversal que no dependen de una gira abierta: inicio, agenda global, avisos, comidas personales, manual y feedback.</p>',
  20
)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

-- section: dashboard
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'dashboard', 'Navegación', p.id, 'Inicio',
  '<p><strong>Funcionamiento:</strong> Muestra tarjetas de giras vigentes con progreso por sección (agenda, repertorio, logística, etc.) y contador de vacantes pendientes. Filtrás por tipo de programa, estado (vigente/pausada/borrador) y rango de fechas; al hacer clic en una tarjeta entrás directo a esa gira.</p>
<ul>
<li>Los chips de color en cada tarjeta reflejan el avance guardado en <code>giras_progreso</code>.</li>
<li>Las vacantes alertan sobre cupos sin cubrir en el roster.</li>
</ul>', 21
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: full_agenda
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'full_agenda', 'Navegación', p.id, 'Agenda general',
  '<p><strong>Funcionamiento:</strong> Presenta en un solo calendario todos los eventos de las giras a las que tenés acceso. Podés cambiar de vista (mes, semana, lista), filtrar por tipo de evento y abrir el detalle de un evento para editarlo o saltar a la gira correspondiente.</p>
<ul>
<li>Coordinadores ven y editan ensayos de ensamble de sus formaciones.</li>
<li>Los eventos sinfónicos o generales requieren rol editor/admin.</li>
</ul>', 22
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: comments
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'comments', 'Navegación', p.id, 'Avisos y pendientes',
  '<p><strong>Funcionamiento:</strong> Centraliza comentarios y tareas pendientes de todas las giras. El ícono de mensajes en el header muestra el total de avisos; las menciones @ llevan contador rojo aparte. Al abrir un ítem, navegás a la gira y sección donde se originó el comentario.</p>
<ul>
<li>Disponible para editores y roles de gestión.</li>
<li>Podés filtrar por gira, estado o menciones propias.</li>
</ul>', 23
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: my_meals
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'my_meals', 'Navegación', p.id, 'Mis comidas (global)',
  '<p><strong>Funcionamiento:</strong> Lista todas tus comidas asignadas en giras activas sin tener que entrar gira por gira. Para cada fecha y tipo de comida ves el menú previsto y podés confirmar o indicar si asistirás.</p>
<ul>
<li>Si no aparece ninguna comida, verificá que estés convocado en el roster y no marcado como ausente.</li>
<li>La misma vista existe dentro de cada gira en la pestaña Mis Comidas.</li>
</ul>', 24
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: manual_index
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'manual_index', 'Navegación', p.id, 'Manual de usuario',
  '<p><strong>Funcionamiento:</strong> Muestra el árbol completo del manual en un panel lateral. Buscás por palabra clave y el sistema resalta coincidencias en títulos y contenido; al seleccionar un ítem, el texto (y video si existe) se muestra a la derecha.</p>
<ul>
<li>La estructura jerárquica permite ir de lo general a lo específico.</li>
<li>Los artículos hijos también aparecen como tarjetas al final de cada sección en el modal contextual.</li>
</ul>', 25
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: feedback_admin
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'feedback_admin', 'Navegación', p.id, 'Feedback',
  '<p><strong>Funcionamiento:</strong> Permite enviar sugerencias o reportar problemas desde el widget flotante de cualquier pantalla; se guarda la ruta actual y opcionalmente una captura. En esta vista de administración se listan todos los envíos con estado (pendiente, en curso, resuelto), comentarios del equipo y fecha estimada.</p>
<ul>
<li>Cualquier usuario autenticado puede enviar feedback.</li>
<li>Producción/admin actualiza estado y responde desde aquí.</li>
</ul>', 26
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- =============================================================================
-- GIRAS
-- =============================================================================

-- section: cat_giras
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES ('cat_giras', 'Giras', 'Giras', '<p><strong>Funcionamiento:</strong> El módulo de giras es el núcleo operativo: cada programa agrupa agenda, repertorio, personal, logística, difusión y edición. Se accede desde el menú Giras; al abrir una gira, la barra lateral cambia a las sub-vistas del programa.</p>', 30)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: giras_listado
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'giras_listado', 'Giras', p.id, 'Listado de giras',
  '<p><strong>Funcionamiento:</strong> Muestra tarjetas de programas filtrables por fechas, tipo (sinfónico, ensamble, etc.), comisión y estado. Cada tarjeta resume fechas, nomenclador y repertorio opcional; al hacer clic abrís la gira en la última vista usada o en Agenda. Desde el menú de cada tarjeta podés duplicar, mover de año o eliminar (según permisos).</p>
<ul>
<li>Vistas alternativas: lista, calendario mensual, semanal o agenda completa embebida.</li>
<li>Los filtros de fecha por defecto muestran giras desde hoy hasta fin de año.</li>
</ul>', 31
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_resumen
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_resumen', 'Giras', p.id, 'Resumen de gira',
  '<p><strong>Funcionamiento:</strong> Pantalla intermedia al entrar a una gira sin pestaña <code>view</code> en la URL. Muestra la cabecera del programa y la barra de navegación lateral; elegí Agenda, Repertorio, Personal u otra sección para comenzar a trabajar.</p>
<ul>
<li>El estado de secciones (chips de progreso) se actualiza desde el control en la cabecera.</li>
</ul>', 32
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_AGENDA
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_AGENDA', 'Giras', p.id, 'Agenda de gira',
  '<p><strong>Funcionamiento:</strong> Cronograma de eventos de un solo programa. Creás eventos eligiendo tipo (ensayo, concierto, traslado, etc.), fecha, hora, lugar y participantes. La vista calendario permite arrastrar o editar; los cambios se guardan en la base y pueden disparar notificaciones a los integrantes afectados.</p>
<ul>
<li>Coordinadores editan ensayos de ensamble de sus formaciones.</li>
<li>Editores/admin gestionan eventos sinfónicos y generales.</li>
<li>Los comentarios por evento se gestionan desde el ícono de mensaje en cada fila.</li>
</ul>', 33
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_REPERTOIRE
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_REPERTOIRE', 'Giras', p.id, 'Repertorio de gira',
  '<p><strong>Funcionamiento:</strong> Administra el orden de concierto de la gira en bloques y obras. Agregás piezas desde el catálogo global, reordenás con drag-and-drop, marcás exclusiones por obra y accedés a sub-pestañas de seating y mis particellas. El seating solo muestra músicos del roster filtrado (sin ausentes ni ensambles excluidos).</p>
<ul>
<li><strong>Programa:</strong> bloques, obras, solistas y notas internas.</li>
<li><strong>Seating:</strong> atriles y asignación de particellas por obra.</li>
<li><strong>Mis particellas:</strong> descarga de partes propias según asignación.</li>
</ul>', 34
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_ROSTER
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_ROSTER', 'Giras', p.id, 'Personal / Nómina',
  '<p><strong>Funcionamiento:</strong> Define quién viaja en la gira. El sistema parte de fuentes automáticas (ensamble o familia de instrumento en <code>giras_fuentes</code>) y permite inclusiones o exclusiones manuales en <code>giras_integrantes</code>. Cada fila muestra estado, rol de gira e instrumento; los cambios impactan logística, seating y transporte.</p>
<ul>
<li><strong>Regla crítica:</strong> estado <code>ausente</code> elimina toda logística y grisa al músico en listas.</li>
<li>Exclusiones manuales y ausentes tienen prioridad sobre convocatoria por ensamble.</li>
<li>Condición estable vs refuerzo afecta reglas de match en transporte.</li>
</ul>', 35
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_LOGISTICS
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_LOGISTICS', 'Giras', p.id, 'Logística',
  '<p><strong>Funcionamiento:</strong> Panel unificado de hospedaje, transporte, viáticos, comidas y cobertura. La gira se divide en tramos (segmentos entre cortes de fecha); seleccionás el tramo activo y navegás por pestañas. Solo integrantes confirmados en el roster reciben asignaciones; los ausentes quedan fuera de todos los servicios.</p>
<ul>
<li>Pestañas: Cobertura, Transporte, Rooming, Viáticos, Comidas, Asistencia, Informes.</li>
<li>Los chips de estado resumen completitud por área; la línea de tiempo muestra tramos y cortes.</li>
<li>Editá cortes de tramo desde el botón de lápiz en la cabecera logística.</li>
</ul>', 36
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_DIFUSION
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_DIFUSION', 'Giras', p.id, 'Difusión de gira',
  '<p><strong>Funcionamiento:</strong> Formulario de datos de difusión del programa: fichas de conciertos, textos para prensa, enlaces y seguimiento de estado de publicación. El rol difusión trabaja principalmente aquí y en el módulo Difusión general del menú lateral.</p>
<ul>
<li>Los cambios se guardan por gira y alimentan reportes institucionales.</li>
<li>Complementa, no reemplaza, la gestión de eventos en Agenda.</li>
</ul>', 37
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_MEALS_PERSONAL
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_MEALS_PERSONAL', 'Giras', p.id, 'Mis comidas (en gira)',
  '<p><strong>Funcionamiento:</strong> Vista del músico con las comidas asignadas solo en esta gira. Por cada día y tipo (desayuno, almuerzo, cena, etc.) ves el menú y confirmás si asistirás. Producción usa la pestaña Comidas en Logística para armar las matrices; aquí solo consultás y confirmás tu asistencia.</p>
<ul>
<li>Si la lista está vacía, revisá tu estado en Personal (no debés figurar como ausente).</li>
</ul>', 38
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_EDICION
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_EDICION', 'Giras', p.id, 'Edición de gira',
  '<p><strong>Funcionamiento:</strong> Formulario de datos maestros del programa: nombre, fechas, tipo, nomenclador, mes-letra, ensambles convocados y configuración general. Guarda automáticamente mientras editás; un indicador muestra si hay cambios pendientes o guardados. Modificar fechas puede recalcular tramos, viáticos y eventos dependientes.</p>
<ul>
<li>Solo editores, admin y roles de producción con permiso acceden a esta pestaña.</li>
<li>Coordinadores y músicos no modifican la configuración base de la gira.</li>
</ul>', 39
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_SEATING
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_SEATING', 'Giras', p.id, 'Seating (vista directa)',
  '<p><strong>Funcionamiento:</strong> Abre la grilla de seating a pantalla completa sin pasar por Repertorio. Arrastrás músicos a atriles (cuerdas) o asignás particellas (vientos/percusión) por obra. El roster proviene de <code>useGiraRoster</code> filtrado: ausentes y ensambles excluidos no aparecen. Podés exportar PDF y usar sugerencias según instrumentación.</p>
<ul>
<li>Accesible desde enlaces directos o roles con permiso de edición de seating.</li>
</ul>', 40
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- =============================================================================
-- LOGÍSTICA DE GIRA (hijos)
-- =============================================================================

-- section: gira_logistica_coverage
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_coverage', 'Giras', p.id, 'Cobertura logística',
  '<p><strong>Funcionamiento:</strong> Tabla resumen que cruza cada integrante convocado con sus servicios por tramo: hospedaje, transporte y viáticos. Las celdas indican si tiene asignación completa, parcial o ninguna; sirve para detectar huecos antes de cerrar la gira.</p>
<ul>
<li>Los ausentes no deben aparecer en ninguna fila.</li>
<li>Hacé clic en un nombre para ir al sub-módulo donde falta completar datos.</li>
</ul>', 41
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_logistica_transporte
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_transporte', 'Giras', p.id, 'Transporte',
  '<p><strong>Funcionamiento:</strong> Configurás vehículos (buses, combis) con plazas, chofer y paradas por tramo. Asignás pasajeros manualmente o mediante reglas automáticas que matchean por ID personal, categoría/rol o localidad. El sistema respeta la jerarquía de fuerza: ID (5) &gt; rol (4) &gt; localidad/región/general (3-1, solo estables).</p>
<ul>
<li>Refuerzos (no estables) solo suben por regla de ID personal, nunca por regla general de localidad.</li>
<li>Validá plazas disponibles antes de confirmar; las paradas definen subida y bajada.</li>
</ul>', 42
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_logistica_rooming
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_rooming', 'Giras', p.id, 'Rooming / Hospedaje',
  '<p><strong>Funcionamiento:</strong> Asignás integrantes a habitaciones de cada hotel por tramo. Podés crear habitaciones manualmente, arrastrar personas entre cuartos o importar listados del hotel. Las exclusiones de hospedaje definidas en el roster impiden asignar habitación a quien no debe hospedarse.</p>
<ul>
<li>Cada hotel tiene scroll independiente en giras con muchas habitaciones.</li>
<li>Los cambios se guardan en <code>hospedaje_habitaciones</code> por tramo activo.</li>
</ul>', 43
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_logistica_viaticos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_viaticos', 'Giras', p.id, 'Viáticos',
  '<p><strong>Funcionamiento:</strong> Calcula anticipos por integrante según días en ruta, localidad, destaques y valor diario vigente. La tabla muestra subtotal automático, gastos adicionales y total; podés sobrescribir el anticipo con un valor manual. La fecha de rendición por defecto es el primer lunes posterior al fin de gira, o una fecha personalizada en configuración.</p>
<ul>
<li>Modo rendiciones: celda naranja = automático, azul = anticipo manual.</li>
<li>Icono refrescar restaura el cálculo automático eliminando el override.</li>
</ul>', 44
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_logistica_meals
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_meals', 'Giras', p.id, 'Comidas (administración)',
  '<p><strong>Funcionamiento:</strong> Armás la matriz de comidas de la gira: por fecha y tipo definís menú y asignás integrantes (manual o masivo). Los músicos ven el resultado en Mis Comidas y confirman asistencia. Podés duplicar configuraciones entre días similares.</p>
<ul>
<li>Solo convocados activos reciben asignación de comida.</li>
<li>Los informes de asistencia comparan lo asignado vs lo confirmado.</li>
</ul>', 45
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_logistica_attendance
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_attendance', 'Giras', p.id, 'Asistencia a comidas',
  '<p><strong>Funcionamiento:</strong> Registra quién asistió efectivamente a cada comida respecto de lo asignado. Producción marca presencia en el momento del servicio; la vista cruza confirmaciones previas de los músicos con el registro real para catering y cierre.</p>
<ul>
<li>Útil para ajustar costos y detectar desvíos entre lo planificado y lo ejecutado.</li>
</ul>', 46
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_logistica_report
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_report', 'Giras', p.id, 'Informes logísticos',
  '<p><strong>Funcionamiento:</strong> Genera reportes imprimibles o exportables de comidas, rooming y resúmenes logísticos de la gira. Seleccionás el tipo de informe y el tramo; el sistema arma el documento con los datos vigentes en base.</p>
<ul>
<li>Usá esta pestaña para entregar listados a hoteles, catering o transporte.</li>
</ul>', 47
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- =============================================================================
-- REPERTORIO DE GIRA (hijos)
-- =============================================================================

-- section: gira_repertorio_programa
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_repertorio_programa', 'Giras', p.id, 'Programa / Bloques',
  '<p><strong>Funcionamiento:</strong> Editás el orden de concierto agregando bloques (pausas, bis, etc.) y obras del catálogo global. Cada obra puede tener solistas, nota interna y flag de exclusión. El orden se guarda en <code>programas_repertorios</code> y alimenta seating, particellas y exportaciones.</p>
<ul>
<li>La validación de organicidad alerta si la instrumentación no cierra con el roster.</li>
<li>Podés buscar obras por título o compositor antes de agregar.</li>
</ul>', 48
FROM public.app_manual p WHERE p.section_key = 'gira_REPERTOIRE'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_repertorio_seating
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_repertorio_seating', 'Giras', p.id, 'Seating en repertorio',
  '<p><strong>Funcionamiento:</strong> Misma grilla de seating que la vista directa, integrada en la pestaña Repertorio. Configurás contenedores (atriles) para cuerdas y asignás particellas por obra para vientos. Solo aparecen integrantes del roster filtrado; cambios aquí impactan PDF de seating y mis particellas.</p>
<ul>
<li>Usá sugerencias inteligentes para posicionar según instrumentación de cada obra.</li>
</ul>', 49
FROM public.app_manual p WHERE p.section_key = 'gira_REPERTOIRE'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_repertorio_mis_partes
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_repertorio_mis_partes', 'Giras', p.id, 'Mis particellas',
  '<p><strong>Funcionamiento:</strong> Lista las particellas asignadas a tu instrumento/persona para las obras de esta gira. Desde cada fila descargás el PDF o abrís el enlace de Drive según la configuración de la obra. Si no ves una parte, verificá seating y que la obra no esté excluida para vos.</p>
<ul>
<li>Vista de solo lectura para músicos; la asignación la hace producción en Seating.</li>
</ul>', 50
FROM public.app_manual p WHERE p.section_key = 'gira_REPERTOIRE'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- =============================================================================
-- MÓDULOS GLOBALES
-- =============================================================================

-- section: cat_modulos
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES ('cat_modulos', 'Módulos', 'Módulos globales', '<p><strong>Funcionamiento:</strong> Catálogos y herramientas que alimentan todas las giras: obras, personas, ensambles, lugares, coordinación, comunicación y más. Los cambios aquí se reflejan al crear o editar programas.</p>', 60)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: repertoire
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'repertoire', 'Módulos', p.id, 'Repertorio global',
  '<p><strong>Funcionamiento:</strong> Catálogo maestro de obras con compositor, duración, etiquetas y enlaces (Drive, IMSLP). Buscás, creás o editás obras; gestionás compositores y etiquetas en sub-vistas. Las obras se incorporan a programas de gira desde el módulo Repertorio de cada gira, no se duplican por programa.</p>
<ul>
<li>El sistema alerta posibles duplicados al crear obras nuevas.</li>
<li>La duración se muestra en formato mm:ss; al ingresar un entero en campos de tiempo, se interpreta como minutos.</li>
</ul>', 61
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: arreglos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'arreglos', 'Módulos', p.id, 'Arreglos',
  '<p><strong>Funcionamiento:</strong> Tablero kanban de pedidos de arreglos orquestales. Cada tarjeta representa un trabajo con estado, plazo, arreglador asignado y vínculo opcional a una obra del repertorio. Los arregladores actualizan progreso; admin reasigna o cierra pedidos.</p>
<ul>
<li>Acceso para arregladores designados y administración.</li>
</ul>', 62
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: ensembles
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'ensembles', 'Módulos', p.id, 'Ensambles',
  '<p><strong>Funcionamiento:</strong> Define formaciones (de cámara, vientos, etc.) y su plantel por ciclo/año. Asignás coordinadores y miembros; esos ensambles alimentan convocatorias automáticas cuando en una gira se selecciona una fuente por ensamble.</p>
<ul>
<li>Los ciclos permiten rotar planteles entre temporadas.</li>
<li>Coordinadores vinculados aquí acceden a la vista Coordinación.</li>
</ul>', 63
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: musicians
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'musicians', 'Módulos', p.id, 'Personas',
  '<p><strong>Funcionamiento:</strong> Base de datos de integrantes (músicos y staff). Cada registro tiene datos personales, instrumento (<code>id_instr</code>), condición (estable/refuerzo), contacto y foto. La familia de instrumento se obtiene de la tabla <code>instrumentos</code>, no está duplicada en el integrante.</p>
<ul>
<li>Los IDs son numéricos; usarlos en logística y seating, nunca UUIDs.</li>
<li>La búsqueda y paginación facilitan mantener datos actualizados.</li>
</ul>', 64
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: users
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'users', 'Módulos', p.id, 'Usuarios del sistema',
  '<p><strong>Funcionamiento:</strong> Administra cuentas de acceso y roles de sistema (admin, editor, músico, etc.). Vinculás cada usuario a un integrante y definís qué módulos puede ver. Es distinto del módulo Personas, que guarda datos artísticos y personales.</p>
<ul>
<li>Solo administradores acceden a esta vista.</li>
</ul>', 65
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: data
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'data', 'Módulos', p.id, 'Datos',
  '<p><strong>Funcionamiento:</strong> Herramientas de importación, exportación y edición masiva sobre tablas del sistema. Permite cargar CSV, corregir registros en grilla universal y ejecutar operaciones de mantenimiento que afectan múltiples giras.</p>
<ul>
<li>Reservado a producción y administración; usá con precaución.</li>
<li>Revisá siempre una muestra antes de aplicar cambios masivos.</li>
</ul>', 66
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: locations
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'locations', 'Módulos', p.id, 'Lugares / Sedes',
  '<p><strong>Funcionamiento:</strong> Catálogo de sedes, salas y direcciones usadas al crear eventos en agenda. Cada lugar puede tener coordenadas y notas. Complementa el módulo Gestión → Espacios, que controla estado operativo de venues para conciertos.</p>
<ul>
<li>Al crear un evento, elegís lugar desde este catálogo o agregás uno nuevo si tenés permiso.</li>
</ul>', 67
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: coordinacion
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'coordinacion', 'Módulos', p.id, 'Coordinación de ensambles',
  '<p><strong>Funcionamiento:</strong> Vista del coordinador por ensamble: gestionás repertorio del ciclo, plantel, ensayos parciales y eventos de ensamble en agenda. Solo podés editar ensayos de los ensambles que coordinás; el coordinador general (<code>coord_general</code>) ve todos los ensambles pero no edita configuración de gira.</p>
<ul>
<li>Seleccioná ensamble en el selector superior para cambiar de contexto.</li>
<li>Los ciclos de año definen qué músicos pertenecen al plantel activo.</li>
</ul>', 68
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: curadoria
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'curadoria', 'Módulos', p.id, 'Curaduría',
  '<p><strong>Funcionamiento:</strong> Herramientas de curaduría de repertorio a nivel orquesta: revisión de programas propuestos, criterios de selección y seguimiento de obras en consideración. Acceso para curadores y administración.</p>
<ul>
<li>Trabaja sobre el catálogo global y propuestas vinculadas a temporadas.</li>
</ul>', 69
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: news_manager
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'news_manager', 'Módulos', p.id, 'Comunicación',
  '<p><strong>Funcionamiento:</strong> Creás y enviás novedades a integrantes: título, cuerpo enriquecido y video opcional. Al publicar, los usuarios ven el aviso en el modal de novedades del header. Podés programar o archivar comunicaciones anteriores.</p>
<ul>
<li>Gestión centralizada desde producción.</li>
</ul>', 70
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: difusion_general
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'difusion_general', 'Módulos', p.id, 'Difusión general',
  '<p><strong>Funcionamiento:</strong> Panel transversal de difusión de conciertos: consultás y editás fichas de todos los programas visibles para el rol difusión. Complementa la pestaña Difusión dentro de cada gira con una vista consolidada para planificación de prensa.</p>
<ul>
<li>El rol difusión accede principalmente a Giras y este módulo.</li>
</ul>', 71
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: music_translation
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'music_translation', 'Módulos', p.id, 'Traducción musical',
  '<p><strong>Funcionamiento:</strong> Importás un PDF con campos AcroForm; el sistema detecta segmentos de texto (versos, coros) y permite editar la traducción al español sobre el PDF o en vista estructura. Cada segmento guarda flujo (línea, párrafo, cesura), rimas A-F y repeticiones; los cambios persisten al instante en Supabase.</p>
<ul>
<li>Enter cicla el control de flujo; clic derecho abre menú de rima y repetición.</li>
<li>Acceso restringido a usuarios autorizados en la lista de permisos.</li>
</ul>', 72
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: manual_admin
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'manual_admin', 'Módulos', p.id, 'Editor del manual',
  '<p><strong>Funcionamiento:</strong> Editás el árbol del manual: creás secciones, definís <code>section_key</code>, escribís contenido HTML con el editor enriquecido y subís imágenes al bucket <code>manual-content</code>. Arrastrás ítems para reordenar o anidar (mover a la derecha = hacer hijo). Desde el modal de ayuda, los admins pueden abrir aquí una sección faltante con un clic.</p>
<ul>
<li>El <code>section_key</code> debe coincidir con el que usa el código para triggers contextuales.</li>
</ul>', 73
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- =============================================================================
-- GESTIÓN
-- =============================================================================

-- section: cat_gestion
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES ('cat_gestion', 'Gestión', 'Gestión', '<p><strong>Funcionamiento:</strong> Hub de herramientas administrativas para editores y admin. Cada tarjeta abre un sub-módulo en <code>/management/{sección}</code>; no reemplaza la edición dentro de giras sino que centraliza reportes y catálogos transversales.</p>', 80)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management', 'Gestión', p.id, 'Gestión (inicio)',
  '<p><strong>Funcionamiento:</strong> Pantalla de inicio con tarjetas para Espacios, Informes Seating, Instrumentación, Convocatorias, Ensayos, Asistencia, Conciertos y Audiencia. Hacé clic en una tarjeta para entrar; el botón atrás vuelve a este hub. Acceso desde menú lateral Gestión o ruta <code>/management</code>.</p>
<ul>
<li>Solo roles editor y admin ven este módulo.</li>
</ul>', 81
FROM public.app_manual p WHERE p.section_key = 'cat_gestion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_venues
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_venues', 'Gestión', p.id, 'Espacios / Venues',
  '<p><strong>Funcionamiento:</strong> Tabla de venues con estado operativo (confirmado, pendiente, cancelado, etc.), notas de seguimiento y filtros por estado. Permite a producción monitorear salas de concierto sin entrar gira por gira.</p>
<ul>
<li>Los cambios de estado son visibles para el equipo de gestión de conciertos.</li>
</ul>', 82
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_seating
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_seating', 'Gestión', p.id, 'Informes Seating',
  '<p><strong>Funcionamiento:</strong> Seleccionás uno o más programas que tengan seating guardado y exportás PDF individual por gira o Excel con grilla de cuerdas y particellas. Incluye histórico global de cuerdas para ver evolución de atriles entre programas.</p>
<ul>
<li>El selector muestra nomenclador, nombre y tipo de programa con color por tipo.</li>
</ul>', 83
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_instrumentation
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_instrumentation', 'Gestión', p.id, 'Auditoría de instrumentación',
  '<p><strong>Funcionamiento:</strong> Cruza plantilla de integrantes, repertorio de programas y partituras para detectar faltantes o sobrecarga de instrumentos. Filtrás por gira o período y exportás el informe para planificación de contrataciones.</p>
<ul>
<li>Útil antes de aprobar un programa con organicidad exigente.</li>
</ul>', 84
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_convocatorias
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_convocatorias', 'Gestión', p.id, 'Convocatorias',
  '<p><strong>Funcionamiento:</strong> Matrices y reportes de convocatoria cruzando múltiples programas: quién está convocado, ausente o pendiente en cada gira. Facilita planificar disponibilidad de músicos entre giras simultáneas o consecutivas.</p>
<ul>
<li>Exportable para reuniones de planificación de personal.</li>
</ul>', 85
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_ensayos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_ensayos', 'Gestión', p.id, 'Ensayos por programa',
  '<p><strong>Funcionamiento:</strong> Informe de horas y cantidad de ensayos agrupados por programa/gira. Consultás distribución por tipo de ensayo y comparás carga entre producciones del mismo período.</p>
<ul>
<li>Los datos provienen de eventos de agenda clasificados como ensayo.</li>
</ul>', 86
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_asistencia_ensayos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_asistencia_ensayos', 'Gestión', p.id, 'Asistencia a ensayos (check-in)',
  '<p><strong>Funcionamiento:</strong> Matriz de asistencia a ensayos de ensamble con datos del sistema de check-in. Cada fila es un músico, cada columna una fecha de ensayo; las celdas muestran presente, ausente o sin registro según lo cargado en el flujo de check-in.</p>
<ul>
<li>Coordinadores cargan asistencia; aquí se consolida para reportes globales.</li>
</ul>', 87
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_conciertos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_conciertos', 'Gestión', p.id, 'Conciertos',
  '<p><strong>Funcionamiento:</strong> Vista global de conciertos con estado operativo, fechas y venue. Permite filtrar y actualizar el seguimiento de cada función sin abrir la gira completa.</p>
<ul>
<li>Complementa la difusión por gira con foco en operación de sala.</li>
</ul>', 88
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_audiencia
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_audiencia', 'Gestión', p.id, 'Audiencia',
  '<p><strong>Funcionamiento:</strong> Registro y análisis de datos de audiencia por concierto: asistencia, entradas vendidas o métricas institucionales según configuración. Producción carga o importa cifras para reportes de gestión.</p>
<ul>
<li>Los datos alimentan informes para áreas institucionales.</li>
</ul>', 89
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- =============================================================================
-- AYUDAS CONTEXTUALES (inline ManualTrigger)
-- =============================================================================

-- section: cat_ayudas
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES ('cat_ayudas', 'Ayudas', 'Ayudas contextuales', '<p><strong>Funcionamiento:</strong> Artículos cortos vinculados a controles específicos de la interfaz (íconos ?). Se abren desde el mismo lugar donde aparece el botón, sin depender del manual del header.</p>', 90)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: logistica_chips
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'logistica_chips', 'Ayudas', p.id, 'Chips de estado logístico',
  '<p><strong>Funcionamiento:</strong> Fila de indicadores que resume si cada área logística (hospedaje, transporte, viáticos, comidas) está completa para el tramo activo. Verde = sin pendientes; ámbar o rojo = faltan asignaciones o hay conflictos. Un clic en el chip navega a la pestaña correspondiente.</p>
<ul>
<li>Se recalculan al cambiar de tramo o al guardar en un sub-módulo.</li>
</ul>', 91
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: logistica_linea_de_tiempo
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'logistica_linea_de_tiempo', 'Ayudas', p.id, 'Línea de tiempo logística',
  '<p><strong>Funcionamiento:</strong> Barra horizontal con los tramos de la gira delimitados por cortes de fecha. Seleccionás un tramo para que hospedaje, transporte y viáticos muestren solo ese segmento. Agregar o mover cortes redefine los tramos y recalcula cobertura y montos.</p>
<ul>
<li>Editá cortes con el botón de lápiz en la cabecera de logística.</li>
</ul>', 92
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: vi_ticos_intro_mkd1at12
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'vi_ticos_intro_mkd1at12', 'Ayudas', p.id, 'Viáticos (intro)',
  '<p><strong>Funcionamiento:</strong> Tabla editable de viáticos por persona: días, valor diario, destaques, gastos y total. Activá modo rendiciones para distinguir anticipos automáticos (naranja) de manuales (azul). El lápiz edita el anticipo; el refrescar elimina el override y vuelve al cálculo del sistema.</p>
<ul>
<li>Configuración global de la gira (fecha rendición, reglas) está en el panel superior.</li>
</ul>', 93
FROM public.app_manual p WHERE p.section_key = 'gira_logistica_viaticos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: mis_comidas
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'mis_comidas', 'Ayudas', p.id, 'Mis comidas (ayuda)',
  '<p><strong>Funcionamiento:</strong> En esta pestaña ves solo tus comidas en la gira actual. Por cada fila confirmás si asistirás; producción ve el consolidado en Logística → Comidas. Si no hay filas, revisá que estés en el roster y no como ausente.</p>
<ul>
<li>Los cambios de confirmación se guardan al instante.</li>
</ul>', 94
FROM public.app_manual p WHERE p.section_key = 'gira_MEALS_PERSONAL'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: section_status
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'section_status', 'Ayudas', p.id, 'Estado de secciones',
  '<p><strong>Funcionamiento:</strong> Control en la cabecera de la gira para marcar el avance de cada área (agenda, repertorio, personal, logística, etc.) como pendiente, en progreso o completa. El equipo ve el mismo estado en el dashboard de inicio y en las tarjetas del listado de giras.</p>
<ul>
<li>No bloquea edición; es indicador de seguimiento interno.</li>
</ul>', 95
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();
