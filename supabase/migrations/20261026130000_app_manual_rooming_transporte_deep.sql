-- Pasada profunda: Rooming / Hotelería + Transporte (app_manual)

-- section: gira_logistica_rooming
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_rooming', 'Giras', p.id, 'Rooming / Hospedaje',
$html$<p><strong>Funcionamiento:</strong> Por tramo asignás hoteles, habitaciones y camas. Columnas Mujeres/Hombres (scroll propio), zona de hoteles con auto-scroll al arrastrar, importación de estructura/asignación del hotel y exportes por hotel. La zona «No alojados» guarda exclusiones en <code>giras_hospedajes_excluidos</code> sin sacar a la persona del roster.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li><strong>Ausente</strong> (<code>giras_integrantes.estado = ausente</code>): cero habitaciones. No aparece en pools ni en Mi Alojamiento.</li>
<li><strong>Exclusión hotelera</strong>: no sale en Mujeres/Hombres; se puede revertir desde «No alojados (N)».</li>
<li><strong>Unicidad</strong>: misma persona no puede estar dos veces en el <em>mismo hotel del mismo tramo</em>. En otro tramo sí puede repetir hotel. Al asignar, se limpia de todas las habitaciones del tramo visible antes de ubicarla.</li>
<li><strong>Check-in / check-out</strong>: una sola regla ganadora (<code>pickWinningLogisticsRule</code>, fuerza 5→1). No se mezclan fechas de reglas más débiles. Early (tipo 40) y Late (tipo 41) suman media noche en reportes; tilde junto a CI/CO en Reglas y EventForm.</li>
<li><strong>Vacantes</strong> (<code>es_simulacion</code>): al materializar titular, hereda cama si mismo género; si otro género, sale de la habitación. Remapear <code>asignaciones_config</code>; nunca dejar el ID simulado en la cama.</li>
<li><strong>Mi Alojamiento</strong> (músico): hotel, tramo y CI/CO; <strong>no</strong> muestra compañeros de habitación. Staff/reportes sí listan ocupantes.</li>
</ul>
<p><strong>Cómo se calcula:</strong></p>
<ul>
<li>Estadía mostrada = regla ganadora de hotel + habitación asignada en el tramo + <code>getOccupancyStayDates</code> (booking explícito / noches de tramo, conservando llegada anticipada).</li>
<li>Noches de reporte: calendario entre CI y CO; Early/Late aportan +0,5 cada uno cuando están activos.</li>
<li>Pool sin habitación = confirmados del tramo no excluidos, no ausentes, no ya alojados en ese tramo.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No puedo meterlo al hotel» → exclusión, ausente, o ya tiene cama en otro hotel del mismo tramo.</li>
<li>«Mi Alojamiento muestra mal las fechas» → hay una regla personal (fuerza 5) que gana a la de región/categoría; revisá Reglas.</li>
<li>«La vacante quedó en la cama» → al asignar titular hay que sincronizar habitación y <code>asignaciones_config</code>.</li>
<li>«Importé el Excel y se duplicó gente» → el import sanitiza unicidad por hotel; si ves duplicados, recargá el tramo (enforce en carga).</li>
</ul>$html$,
  43
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category,
  parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: gira_logistica_transporte
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_transporte', 'Giras', p.id, 'Transporte',
$html$<p><strong>Funcionamiento:</strong> Vehículos del tramo (capacidad, chofer, flag oficial), categorías <code>PASAJEROS</code> / <code>LOGISTICO</code> / <code>INTERNO</code>, paradas (subida/bajada) y admisión por reglas del mismo motor de fuerza que Reglas. Grupos default por vehículo en <code>giras_transportes_grupos</code>. En agenda: filtro «Solo mi transporte» y chips de ocupación.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li><strong>Match</strong>: fuerza 5 Persona → 4 Ensamble → 3 categoría/rol/familia/grupo → 2 Localidad (solo estables) → 1 catch-all (LOCALES/NO_LOCALES/EXTERNOS). Refuerzos (no estables) <strong>solo</strong> suben por regla de ID personal, nunca por localidad general.</li>
<li><strong>Categorías</strong>: PASAJEROS (paradas tipo 11), LOGISTICO (tipo 12), INTERNO (tipo 35). INTERNO es visible para todos los activos en agenda (<code>isMyTransport</code> automático), pero la <strong>ocupación</strong> (chip butacas y firmas) solo cuenta quienes tienen ↑ y ↓ en ese viaje.</li>
<li><strong>Ausentes</strong>: no viajan. Vacantes cuentan butaca si tienen boarding.</li>
<li><strong>Borrar parada 11/12</strong>: si está en <code>giras_logistica_reglas_transportes</code> (subida/bajada), el sistema advierte qué personas/localidades/regiones se afectan (viáticos).</li>
<li><strong>Agenda</strong>: con categoría Transporte destildada se ocultan todas las paradas (incluso del bus asignado). Con ojo cerrado, el músico sigue viendo paradas de <em>su</em> bus. Traslados solista (28) / interno de catálogo (31) sin vehículo no pasan el filtro «Solo mi transporte».</li>
</ul>
<p><strong>Cómo se calcula:</strong></p>
<ul>
<li>Admisión al vehículo = regla ganadora de bus para esa persona + no vetado.</li>
<li>Butacas = personas admitidas (+ plaza_extra de instrumento). En INTERNO: solo riders con subida y bajada (ride logístico o reglas ↑/↓ del vehículo).</li>
<li>Paradas del bus asignado no se ocultan por <code>eventos_grupos</code> de otro grupo de convocatoria.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Un refuerzo no aparece en el micro» → falta regla por ID (o ensamble/categoría que no dependa de localidad).</li>
<li>«El chip dice 84 butacas en un charter chico» → categoría INTERNO mal leída: debe contar solo ↑+↓, no toda la orquesta.</li>
<li>«No veo mi bus en agenda» → filtro de categoría Transporte destildado, o «Solo mi transporte» con traslado 28/31 sin vínculo al vehículo.</li>
<li>«Borré una parada y se rompieron viáticos» → esa parada era hito de subida/bajada en reglas; recreá el evento y revinculá.</li>
</ul>$html$,
  42
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category,
  parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();
