-- Oleada 5: resto de módulos / navegación / management (refresco + nota de alcance)

-- section: cat_intro
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_intro',
  'Introducción',
  'Introducción',
  $html$<p><strong>Funcionamiento:</strong> Agrupa la bienvenida y conceptos generales. Desde aquí se entiende la navegación, roles y el manual contextual (ícono de libro). Para dudas técnicas de una gira en curso, saltá a Logística → Reglas / Comidas o a Personal.</p>$html$,
  10
)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: cat_navegacion
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_navegacion',
  'Navegación',
  'Navegación general',
  $html$<p><strong>Funcionamiento:</strong> Pantallas transversales que no dependen de una gira abierta: inicio, agenda global, avisos, mis comidas, manual y feedback.</p>$html$,
  20
)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: cat_modulos
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_modulos',
  'Módulos',
  'Módulos globales',
  $html$<p><strong>Funcionamiento:</strong> Catálogos que alimentan las giras: obras, personas, ensambles, lugares, coordinación y comunicación. Los cambios aquí impactan convocatorias y datos maestros de programas futuros.</p>$html$,
  60
)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: cat_gestion
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_gestion',
  'Gestión',
  'Gestión',
  $html$<p><strong>Funcionamiento:</strong> Hub administrativo (<code>/management</code>) para reportes y catálogos transversales. No reemplaza Logística ni Personal dentro de cada gira. Herramientas públicas (Entradas, viáticos-manual, SCRN, rendiciones-manual) están fuera de este manual.</p>$html$,
  80
)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: cat_ayudas
INSERT INTO public.app_manual (section_key, category, title, content, sort_order)
VALUES (
  'cat_ayudas',
  'Ayudas',
  'Ayudas contextuales',
  $html$<p><strong>Funcionamiento:</strong> Artículos cortos abiertos por triggers inline (chips logísticos, línea de tiempo, viáticos, mis comidas, estado de secciones).</p>$html$,
  90
)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: full_agenda
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'full_agenda', 'Navegación', p.id, 'Agenda general',
$html$<p><strong>Funcionamiento:</strong> Calendario unificado de eventos de las giras a las que tenés acceso. Vistas mes/semana/lista, filtros por tipo y salto a la gira del evento.</p>
<ul>
<li>Editores ven más detalle; músicos ven según grupos/convocatoria de cada gira.</li>
</ul>$html$,
  22
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: comments
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'comments', 'Navegación', p.id, 'Avisos y pendientes',
$html$<p><strong>Funcionamiento:</strong> Comentarios y tareas pendientes entre giras. El ícono de mensajes del header muestra totales; menciones @ con contador. Al abrir un ítem saltás a la gira/sección de origen.</p>$html$,
  23
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: manual_index
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'manual_index', 'Navegación', p.id, 'Manual de usuario',
$html$<p><strong>Funcionamiento:</strong> Árbol completo del manual con búsqueda. Priorizá las entradas de Logística (Reglas, Comidas) y Personal para dudas técnicas de una gira en curso.</p>$html$,
  25
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: feedback_admin
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'feedback_admin', 'Navegación', p.id, 'Feedback',
$html$<p><strong>Funcionamiento:</strong> Cola de sugerencias/bugs enviados desde el widget flotante (ruta + captura opcional). Estados: pendiente, en curso, resuelto.</p>$html$,
  26
FROM public.app_manual p WHERE p.section_key = 'cat_navegacion'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: arreglos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'arreglos', 'Módulos', p.id, 'Arreglos',
$html$<p><strong>Funcionamiento:</strong> Tablero kanban de pedidos de arreglo orquestal (estado, plazo, arreglador, vínculo opcional a obra). No forma parte de la logística diaria de gira.</p>$html$,
  62
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: users
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'users', 'Módulos', p.id, 'Usuarios del sistema',
$html$<p><strong>Funcionamiento:</strong> Cuentas de acceso y roles de sistema, vinculados a integrantes. Distinto de Personas (datos artísticos). Define qué módulos ve cada usuario.</p>$html$,
  65
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: data
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'data', 'Módulos', p.id, 'Datos',
$html$<p><strong>Funcionamiento:</strong> Importación/exportación y edición masiva. Operaciones aquí pueden afectar múltiples giras: usá con cuidado en producción.</p>$html$,
  66
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: coordinacion
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'coordinacion', 'Módulos', p.id, 'Coordinación de ensambles',
$html$<p><strong>Funcionamiento:</strong> Vista del coordinador: repertorio del ciclo, plantel, ensayos parciales. Solo editás ensambles que coordinás; <code>coord_general</code> ve todos pero no la config de gira.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Los ensayos de ensamble aparecen en agenda según grupos/convocatoria de la gira.</li>
</ul>$html$,
  68
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: curadoria
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'curadoria', 'Módulos', p.id, 'Curaduría',
$html$<p><strong>Funcionamiento:</strong> Herramientas de curaduría de repertorio a nivel orquesta (propuestas, criterios). Acceso curadores/admin.</p>$html$,
  69
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: news_manager
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'news_manager', 'Módulos', p.id, 'Comunicación',
$html$<p><strong>Funcionamiento:</strong> Novedades a integrantes (título, cuerpo, video). Al publicar aparecen en el modal del header.</p>$html$,
  70
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: difusion_general
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'difusion_general', 'Módulos', p.id, 'Difusión general',
$html$<p><strong>Funcionamiento:</strong> Vista consolidada de fichas de difusión de varios programas. Complementa la pestaña Difusión dentro de cada gira.</p>$html$,
  71
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: music_translation
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'music_translation', 'Módulos', p.id, 'Traducción musical',
$html$<p><strong>Funcionamiento:</strong> Importás PDF AcroForm, editás traducción al español por segmentos (flujo, rimas, repeticiones). Persistencia inmediata. Independiente de logística de gira.</p>$html$,
  72
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: manual_admin
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'manual_admin', 'Módulos', p.id, 'Editor del manual',
$html$<p><strong>Funcionamiento:</strong> Editás el árbol: <code>section_key</code>, HTML (Quill), imágenes en bucket <code>manual-content</code>, orden/anidación. Para cambios masivos preferí migraciones SQL UPSERT (ver spec <code>app-manual-content</code>).</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Secciones técnicas de gira deben incluir Funcionamiento + Reglas + Cómo se calcula + Errores frecuentes cuando aplique.</li>
</ul>$html$,
  73
FROM public.app_manual p WHERE p.section_key = 'cat_modulos'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_venues
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_venues', 'Gestión', p.id, 'Espacios / Venues',
$html$<p><strong>Funcionamiento:</strong> Estado operativo de salas (confirmado/pendiente/cancelado) y notas. Complementa el catálogo Lugares usado en agenda.</p>$html$,
  82
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_instrumentation
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_instrumentation', 'Gestión', p.id, 'Auditoría de instrumentación',
$html$<p><strong>Funcionamiento:</strong> Revisión de instrumentación de obras/programas vs organico convocado. Útil antes de cerrar seating.</p>$html$,
  84
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_asistencia_ensayos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_asistencia_ensayos', 'Gestión', p.id, 'Asistencia a ensayos (check-in)',
$html$<p><strong>Funcionamiento:</strong> Check-in de asistencia a ensayos a nivel gestión. Distinto de Asistencia a comidas en Logística de gira.</p>$html$,
  87
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_conciertos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_conciertos', 'Gestión', p.id, 'Conciertos',
$html$<p><strong>Funcionamiento:</strong> Seguimiento transversal de conciertos/programas. La agenda operativa del día sigue en Agenda de gira.</p>$html$,
  88
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();

-- section: management_audiencia
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'management_audiencia', 'Gestión', p.id, 'Audiencia',
$html$<p><strong>Funcionamiento:</strong> Métricas/seguimiento de audiencia. Entradas al público se gestionan en la app <code>/entradas</code> (fuera de este manual).</p>$html$,
  89
FROM public.app_manual p WHERE p.section_key = 'management'
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, last_updated = now();
