-- Oleada 3: Agenda, repertorio hub, edición, difusión, mis comidas

-- section: gira_AGENDA
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_AGENDA', 'Giras', p.id, 'Agenda de gira',
$html$<p><strong>Funcionamiento:</strong> Cronograma de eventos del programa (ensayos, conciertos, traslados, etc.). Creación/edición con tipo, fecha, hora, lugar y grupos. Multi-selección de editores: eliminar, ocultar técnico, etiquetar grupos. Filtro global de grupos (Tutti ∪ grupos) en el shell de gira.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Eventos sin <code>eventos_grupos</code> = generales (Tutti). Con grupos: el músico solo los ve si pertenece a alguno (editores ven todos).</li>
<li>Ausentes no figuran como convocados visibles.</li>
<li>Artistas FIMBA tagueados pueden mostrarse como chips bajo el evento.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No veo el ensayo» → filtro de grupos/categorías, o el evento es técnico/oculto.</li>
</ul>$html$,
  33
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_REPERTOIRE
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_REPERTOIRE', 'Giras', p.id, 'Repertorio de gira',
$html$<p><strong>Funcionamiento:</strong> Hub del programa artístico: bloques/obras, seating y mis particellas. El orden se guarda en <code>programas_repertorios</code> y alimenta logística artística (no hotel/bus).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Seating siempre sobre roster filtrado (ver secciones hijas).</li>
<li>Grupos por bloque limitan quién toca ese bloque.</li>
</ul>$html$,
  34
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_EDICION
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_EDICION', 'Giras', p.id, 'Edición de gira',
$html$<p><strong>Funcionamiento:</strong> Datos maestros del programa: nombre, fechas, tipo, nomenclador, ensambles/fuentes, cortes de tramo. Guardado con indicador de estado. Cambiar fechas desplaza tramos, slots de comida en reglas y eventos dependientes (vía flujos de move/duplicate).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Solo roles con permiso de edición/producción/admin.</li>
<li>Tramos mal cortados rompen hotel/bus/comida por segmento: validar después de editar fechas.</li>
</ul>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«Se desfasaron las comidas» → reglas usan slots por fecha; al mover la gira deben desplazarse igual que el resto.</li>
</ul>$html$,
  39
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_DIFUSION
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_DIFUSION', 'Giras', p.id, 'Difusión de gira',
$html$<p><strong>Funcionamiento:</strong> Fichas de conciertos, textos de prensa, enlaces y estado de publicación del programa. Complementa Difusión general del menú lateral.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>No reemplaza la creación de eventos en Agenda.</li>
<li>Los cambios alimentan reportes institucionales / hojas vinculadas según configuración.</li>
</ul>$html$,
  37
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_MEALS_PERSONAL
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_MEALS_PERSONAL', 'Giras', p.id, 'Mis comidas (en gira)',
$html$<p><strong>Funcionamiento:</strong> Vista del músico: comidas de esta gira donde resulta elegible. Consulta menú y confirma asistencia. La matriz la arma producción en Logística → Comidas.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Si estás ausente o fuera de convocados/cobertura, la lista estará vacía.</li>
<li>No edita convocados ni comensales globales.</li>
</ul>$html$,
  38
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: mis_comidas
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'mis_comidas', 'Ayudas', p.id, 'Mis comidas (ayuda)',
$html$<p><strong>Funcionamiento:</strong> Ayuda del botón contextual en Mis comidas: cómo leer el día/servicio y confirmar asistencia.</p>
<p><strong>Errores frecuentes:</strong></p>
<ul>
<li>«No tengo comidas» → Personal (ausente), o producción aún no creó eventos / no estás en convocados.</li>
</ul>$html$,
  94
FROM public.app_manual p WHERE p.section_key = 'cat_ayudas'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: my_meals
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'my_meals', 'Navegación', p.id, 'Mis comidas (global)',
$html$<p><strong>Funcionamiento:</strong> Lista comidas de giras activas sin entrar gira por gira. Misma lógica de elegibilidad que Mis comidas en gira.</p>$html$,
  24
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

