-- Oleada 2: Roster, grupos, vacantes, seating

-- section: gira_ROSTER
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_ROSTER', 'Giras', p.id, 'Personal / Nómina',
$html$<p><strong>Funcionamiento:</strong> Define quién viaja. Fuentes automáticas (ensamble / familia en <code>giras_fuentes</code>) + inclusiones/exclusiones en <code>giras_integrantes</code>. Cada fila: estado, rol de gira (<code>rol</code> en DB → <code>rol_gira</code> en UI), instrumento (<code>id_instr</code>), tags de grupos. Botón <strong>Grupos de convocatoria</strong> para CRUD de grupos y miembros.</p>
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
</ul>$html$,
  35
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_SEATING
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_SEATING', 'Giras', p.id, 'Seating (vista directa)',
$html$<p><strong>Funcionamiento:</strong> Grilla de seating a pantalla completa: atriles (cuerdas) y particellas (vientos/percusión). Exportes PDF. Vacantes se marcan con borde ámbar.</p>
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
</ul>$html$,
  40
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_repertorio_programa
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_repertorio_programa', 'Giras', p.id, 'Programa / Bloques',
$html$<p><strong>Funcionamiento:</strong> Orden de concierto: bloques y obras del catálogo, drag-and-drop, solistas, notas, exclusiones, grupos por bloque. Alimenta seating y Mis Partes.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Bloque sin grupos = todos los confirmados; con grupos = solo esos miembros en seating/partes.</li>
<li>Cambios de orden impactan exportaciones y vistas de particellas.</li>
</ul>$html$,
  48
FROM public.app_manual p WHERE p.section_key = 'gira_REPERTOIRE'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_repertorio_seating
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_repertorio_seating', 'Giras', p.id, 'Seating en repertorio',
$html$<p><strong>Funcionamiento:</strong> Misma grilla que seating directo, integrada en Repertorio (subTab seating). Pills de config de cuerdas y filtro por bloque/grupos.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Idénticas a Seating directo: roster filtrado + grupos del bloque + dedupe por config.</li>
</ul>$html$,
  49
FROM public.app_manual p WHERE p.section_key = 'gira_REPERTOIRE'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_repertorio_mis_partes
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_repertorio_mis_partes', 'Giras', p.id, 'Mis particellas',
$html$<p><strong>Funcionamiento:</strong> Lista las particellas asignadas a tu instrumento/persona en las obras de la gira. Descarga PDF o enlace Drive según la obra.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Respeta seating y grupos del bloque. Ausente o obra excluida → no aparece la parte.</li>
<li>La config de cuerdas del bloque determina el contenedor resuelto.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No veo mi parte» → seating incompleto, bloque con otro grupo, o obra excluida.</li>
</ul>$html$,
  50
FROM public.app_manual p WHERE p.section_key = 'gira_REPERTOIRE'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

