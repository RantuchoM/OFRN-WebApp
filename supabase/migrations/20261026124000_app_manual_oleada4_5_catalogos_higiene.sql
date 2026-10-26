-- Oleada 4–5: listado, intro, catálogos, management, higiene

-- section: giras_listado
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'giras_listado', 'Giras', p.id, 'Listado de giras',
$html$<p><strong>Funcionamiento:</strong> Tarjetas/tabla de programas filtrables por fechas, tipo, comisión y estado. Abrís la gira en la última vista o en Agenda. Menú por tarjeta: duplicar, mover año, eliminar (según permisos).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Indicadores de progreso y vacantes salen de datos de la gira (incl. comidas/convocatoria alineados al matcher).</li>
</ul>$html$,
  31
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_resumen
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_resumen', 'Giras', p.id, 'Resumen de gira',
$html$<p><strong>Funcionamiento:</strong> Pantalla intermedia al entrar sin <code>view</code> en la URL: cabecera del programa y navegación a Agenda, Repertorio, Personal, Logística, etc.</p>$html$,
  32
FROM public.app_manual p WHERE p.section_key = 'cat_giras'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: section_status
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'section_status', 'Ayudas', p.id, 'Estado de secciones',
$html$<p><strong>Funcionamiento:</strong> Control de avance por sección de la gira (agenda, repertorio, logística…). Los chips de color en el listado reflejan <code>giras_progreso</code>.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Es estado de gestión humana, no un cálculo automático de «todo asignado».</li>
</ul>$html$,
  95
FROM public.app_manual p WHERE p.section_key = 'cat_ayudas'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: ensembles
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'ensembles', 'Módulos', p.id, 'Ensambles',
$html$<p><strong>Funcionamiento:</strong> Formaciones y plantel por ciclo/año. Alimentan fuentes de convocatoria en giras y tags ENS: en comidas/reglas.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Membresía vigente a la fecha del programa importa para match ENS: y GiraCard.</li>
<li>Excluir un ensamble en la gira saca a sus miembros del roster/seating aunque la familia esté convocada.</li>
</ul>$html$,
  63
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: musicians
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'musicians', 'Módulos', p.id, 'Personas',
$html$<p><strong>Funcionamiento:</strong> Base de integrantes: datos personales, <code>id_instr</code>, condición (estable/refuerzo), contacto, preferencia alimentaria. Familia vía tabla <code>instrumentos</code>.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>IDs numéricos. Vacantes también viven aquí con <code>es_simulacion</code>.</li>
<li>Condición estable vs refuerzo cambia quién puede ganar reglas de localidad.</li>
</ul>$html$,
  64
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: locations
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'locations', 'Módulos', p.id, 'Lugares / Sedes',
$html$<p><strong>Funcionamiento:</strong> Catálogo de sedes/salas para agenda y locaciones de comida. Complementa Gestión → Espacios (estado operativo de venues).</p>$html$,
  67
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: repertoire
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'repertoire', 'Módulos', p.id, 'Repertorio global',
$html$<p><strong>Funcionamiento:</strong> Catálogo de obras (compositor, duración, etiquetas, Drive/IMSLP). Las giras referencian estas obras; no se duplican por programa.</p>$html$,
  61
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: management
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management', 'Gestión', p.id, 'Gestión (inicio)',
$html$<p><strong>Funcionamiento:</strong> Hub <code>/management</code>: Espacios, Informes Seating, Instrumentación, Convocatorias, Ensayos, Asistencia, Conciertos, Audiencia. No reemplaza la edición dentro de cada gira.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Herramientas públicas (<code>/entradas</code>, <code>/viaticos-manual</code>, <code>/transporte-scrn</code>, <code>/rendiciones-manual</code>) <strong>no</strong> están documentadas en este manual interno.</li>
</ul>$html$,
  81
FROM public.app_manual p WHERE p.section_key = 'cat_gestion'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: management_seating
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_seating', 'Gestión', p.id, 'Informes Seating',
$html$<p><strong>Funcionamiento:</strong> Exportá PDF/Excel de seating de uno o más programas con seating guardado; histórico de cuerdas entre programas.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Respeta el seating ya filtrado por roster de cada gira.</li>
</ul>$html$,
  83
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: management_convocatorias
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_convocatorias', 'Gestión', p.id, 'Convocatorias',
$html$<p><strong>Funcionamiento:</strong> Vista transversal de convocatorias/ensambles por programa. Complementa Personal dentro de la gira.</p>$html$,
  85
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: management_ensayos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_ensayos', 'Gestión', p.id, 'Ensayos por programa',
$html$<p><strong>Funcionamiento:</strong> Listado/reporte de ensayos asociados a programas. La creación diaria sigue en Agenda de gira.</p>$html$,
  86
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: dashboard
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'dashboard', 'Navegación', p.id, 'Inicio',
$html$<p><strong>Funcionamiento:</strong> Tarjetas de giras vigentes con progreso por sección y vacantes. Filtros por tipo, estado y fechas; clic abre la gira.</p>$html$,
  21
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: app_intro_general
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'app_intro_general', 'Introducción', p.id, 'Bienvenida y roles',
$html$<p><strong>Funcionamiento:</strong> Al iniciar sesión, el menú lateral refleja tu rol (músico, coordinador, editor, producción, admin, etc.). El ícono de libro abre el artículo del manual de la pantalla actual; el interruptor oculta los <code>?</code> contextuales.</p>
<ul>
<li>Perfil desde el avatar; calendario webcal desde Sincronizar.</li>
<li>Para dudas técnicas de una gira en curso, abrí Logística o Personal y usá el manual de esa sección (Reglas, Comidas, Roster).</li>
<li>Fuera de este manual: herramientas públicas Entradas, viáticos-manual, transporte SCRN, rendiciones-manual.</li>
</ul>$html$,
  11
FROM public.app_manual p WHERE p.section_key = 'cat_intro'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: cat_giras
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_giras',
  'Giras',
  'Giras',
  $html$<p><strong>Funcionamiento:</strong> Núcleo operativo: cada programa agrupa agenda, repertorio, personal, logística, difusión y edición. Priorizá las secciones de Logística (Reglas y Comidas) y Personal para resolver dudas del día a día de una gira.</p>$html$,
  30
)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

