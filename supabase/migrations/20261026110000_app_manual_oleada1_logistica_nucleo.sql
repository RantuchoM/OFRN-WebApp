-- Oleada 1a: Logística núcleo — hub, Reglas, Comidas, asistencia, reporte, chips, timeline

-- section: gira_LOGISTICS
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_LOGISTICS', 'Giras', p.id, 'Logística',
$html$<p><strong>Funcionamiento:</strong> Panel unificado de la gira por tramo (segmento entre cortes de fecha). Elegís el tramo activo y trabajás en pestañas: Reglas, Transporte, Rooming, Viáticos y el menú Comidas (Agenda/Menú, Asistencia, Reporte). Los datos se recalculan al cambiar de tramo o al pasar entre subpestañas de comidas.</p>
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
</ul>$html$,
  36
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_logistica_coverage
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_coverage', 'Giras', p.id, 'Reglas',
$html$<p><strong>Funcionamiento:</strong> Pantalla <strong>Reglas</strong> (URL <code>subTab=coverage</code>). Definís filas en <code>giras_logistica_reglas</code>: a quién aplica cada regla (persona, ensamble, categoría/rol/familia/grupo, localidad o catch-all) y los hitos de hotel (check-in/out), bus y ventana de comidas (inicio/fin por slot día+servicio). El preview muestra quién gana cada hito.</p>
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
</ul>$html$,
  41
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_logistica_meals
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_meals', 'Giras', p.id, 'Comidas (Agenda / Menú)',
$html$<p><strong>Funcionamiento:</strong> Matriz de eventos de comida/catering por fecha y servicio (D/A/M/C/Cat). Por fila definís hora, locación, <strong>Convocados</strong> (tags), <strong>Grupos</strong> de convocatoria, artistas FIMBA y menú. El badge <strong>Comensales</strong> abre el detalle de quién cuenta (y quién se restó). Vacantes grises = slots sin evento aún; «Crear todas» arma A/M/C del rango de reglas. Panel flotante: edición masiva, Fusionar, Eliminar.</p>
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
</ul>$html$,
  45
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_logistica_attendance
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_attendance', 'Giras', p.id, 'Asistencia a comidas',
$html$<p><strong>Funcionamiento:</strong> Planilla de presencia por persona y <strong>turno</strong> (<code>fecha|servicio</code>), no una columna por cada evento duplicado. La celda usa el evento resuelto post-deducción (prioriza comida de grupo/ensamble). Comparten filtros con Agenda (locación, artista, tipo, servicios).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Misma elegibilidad y deducción que Agenda/Menú.</li>
<li>Al guardar/limpiar asistencia se limpian residuales en eventos hermanos del turno.</li>
<li>Exportes respetan el set filtrado vigente.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Marqué asistencia y reapareció en otra columna» → eran dos eventos del mismo turno; el sistema consolida en el evento ganador.</li>
</ul>$html$,
  46
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_logistica_report
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_report', 'Giras', p.id, 'Reporte de comidas',
$html$<p><strong>Funcionamiento:</strong> Exportes PDF / texto de pedido / Excel (y variantes FIMBA por artista) a partir de la matriz filtrada. Desglosa tipos de alimentación (Estándar, s/Lact., s/TACC, etc.). Usa la ventana ganadora <code>comida_inicio</code>/<code>comida_fin</code> del roster.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Mismos filtros compartidos Logística → Manager → Asistencia → Reporte.</li>
<li>Paridad de comensales y deducción con Agenda.</li>
<li>Texto pedido no incluye cierre de hospedaje; PDF/Excel sí pueden llevar anexos de dietas/notas FIMBA.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«El PDF no coincide con la pantalla» → revisá filtros activos (locación/artista/servicio) y que las reglas se hayan refrescado.</li>
</ul>$html$,
  47
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: logistica_chips
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'logistica_chips', 'Ayudas', p.id, 'Chips de estado logístico',
$html$<p><strong>Funcionamiento:</strong> Chips/resúmenes en la cabecera o filas de Reglas que indican si hotel, bus o comida están cubiertos, parciales o en conflicto para el criterio preview.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Reflejan el resultado de <code>pickWinningLogisticsRule</code>, no un estado manual aparte.</li>
<li>Ámbar suele significar «hay regla pero otra de mayor fuerza la supera» — usá el <code>?</code> para ver cuál.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«El chip está mal pero la habitación está bien» → el chip mira la regla ganadora del hito; la asignación física de rooming puede haberse fijado aparte.</li>
</ul>$html$,
  91
FROM public.app_manual p WHERE p.section_key = 'cat_ayudas'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: logistica_linea_de_tiempo
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'logistica_linea_de_tiempo', 'Ayudas', p.id, 'Línea de tiempo logística',
$html$<p><strong>Funcionamiento:</strong> Vista temporal de tramos, cortes y hitos (check-in/out, ventanas de comida, buses) según las reglas del tramo activo. Sirve para validar que inicio/fin de comida y hotel no queden invertidos.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>No se persiste una regla si el check-in (o early) es posterior al check-out (o late), ni si la comida inicial es posterior a la final.</li>
<li>Slots de comida se eligen por chips D/A/M/C + día (meses libres; días de gira destacados).</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No puedo guardar la regla» → fechas/hitos invertidos o slot incompleto.</li>
</ul>$html$,
  92
FROM public.app_manual p WHERE p.section_key = 'cat_ayudas'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

