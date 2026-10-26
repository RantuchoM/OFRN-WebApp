-- Oleada 1b: Transporte, Rooming, Viáticos

-- section: gira_logistica_transporte
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_transporte', 'Giras', p.id, 'Transporte',
$html$<p><strong>Funcionamiento:</strong> Vehículos del tramo (plazas, chofer, oficial/no), paradas y asignación de pasajeros. Las reglas de admisión al bus usan el mismo motor de fuerza que Reglas. Grupos de convocatoria pueden asociarse al vehículo (<code>giras_transportes_grupos</code>).</p>
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
</ul>$html$,
  42
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_logistica_rooming
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_rooming', 'Giras', p.id, 'Rooming / Hospedaje',
$html$<p><strong>Funcionamiento:</strong> Hoteles y habitaciones por tramo. Creación manual, drag-and-drop, importación de estructura/asignación del hotel, exportes por hotel. Exclusiones de hospedaje del roster impiden asignar cama.</p>
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
</ul>$html$,
  43
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: gira_logistica_viaticos
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'gira_logistica_viaticos', 'Giras', p.id, 'Viáticos',
$html$<p><strong>Funcionamiento:</strong> Anticipos por integrante según días en ruta, localidad, destaques y valor diario vigente (<code>giras_viaticos_detalle</code>). Se puede fijar <code>anticipo_custom</code> y una <code>rendicion_fecha</code> en config. PDF/exportes usan el total de pantalla.</p>
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
</ul>$html$,
  44
FROM public.app_manual p WHERE p.section_key = 'gira_LOGISTICS'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();


-- section: vi_ticos_intro_mkd1at12
INSERT INTO public.app_manual (section_key, category, parent_id, title, content, sort_order)
SELECT 'vi_ticos_intro_mkd1at12', 'Ayudas', p.id, 'Viáticos (intro)',
$html$<p><strong>Funcionamiento:</strong> Ayuda contextual del gestor de viáticos de gira: cómo se arma el anticipo, cuándo usar override y dónde se define la fecha de rendición.</p>
<p><strong>Reglas de negocio:</strong></p>
<ul>
<li>Persistencia real en <code>giras_viaticos_detalle</code> (no solo tablas legacy).</li>
<li>Misma lógica de ausentes/vacantes que el resto de logística.</li>
</ul>$html$,
  93
FROM public.app_manual p WHERE p.section_key = 'cat_ayudas'
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  last_updated = now();

