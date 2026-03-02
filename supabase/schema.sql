-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_docs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  route text NOT NULL UNIQUE,
  content text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT app_docs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.app_feedback (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  tipo text NOT NULL,
  mensaje text NOT NULL,
  ruta_pantalla text,
  screenshot_path text,
  user_email text,
  estado text DEFAULT 'Pendiente'::text,
  admin_comments text,
  estimated_date date,
  titulo text,
  CONSTRAINT app_feedback_pkey PRIMARY KEY (id)
);
CREATE TABLE public.app_manual (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  section_key text NOT NULL UNIQUE,
  category text NOT NULL,
  parent_id uuid,
  sort_order integer DEFAULT 0,
  title text NOT NULL,
  content text,
  video_url text,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT app_manual_pkey PRIMARY KEY (id),
  CONSTRAINT app_manual_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.app_manual(id)
);
CREATE TABLE public.categorias_tipos_eventos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT categorias_tipos_eventos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.comentarios_lecturas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  entidad_tipo text NOT NULL,
  entidad_id text NOT NULL,
  last_read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comentarios_lecturas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.compositores (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  apellido text NOT NULL,
  nombre text,
  id_pais bigint,
  fecha_nacimiento date,
  fecha_defuncion date,
  biografia text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT compositores_pkey PRIMARY KEY (id),
  CONSTRAINT compositores_id_pais_fkey FOREIGN KEY (id_pais) REFERENCES public.paises(id)
);
CREATE TABLE public.ensambles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ensamble text,
  descripcion text,
  id_familia text,
  id_ensamble_cf bigint,
  CONSTRAINT ensambles_pkey PRIMARY KEY (id),
  CONSTRAINT ensambles_id_familia_fkey FOREIGN KEY (id_familia) REFERENCES public.familia(familia),
  CONSTRAINT ensambles_id_ensamble_cf_fkey FOREIGN KEY (id_ensamble_cf) REFERENCES public.ensambles(id)
);
CREATE TABLE public.ensambles_coordinadores (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_ensamble bigint,
  id_integrante bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ensambles_coordinadores_pkey PRIMARY KEY (id),
  CONSTRAINT ensambles_coordinadores_id_ensamble_fkey FOREIGN KEY (id_ensamble) REFERENCES public.ensambles(id),
  CONSTRAINT ensambles_coordinadores_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.eventos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint,
  id_tipo_evento bigint,
  id_locacion bigint,
  fecha date NOT NULL,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  descripcion text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  google_event_id text,
  convocados ARRAY DEFAULT '{}'::text[],
  visible_agenda boolean DEFAULT true,
  id_gira_transporte bigint,
  tecnica boolean DEFAULT false,
  last_modified_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  is_deleted boolean DEFAULT false,
  id_estado_venue integer,
  CONSTRAINT eventos_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT eventos_id_tipo_evento_fkey FOREIGN KEY (id_tipo_evento) REFERENCES public.tipos_evento(id),
  CONSTRAINT eventos_id_locacion_fkey FOREIGN KEY (id_locacion) REFERENCES public.locaciones(id),
  CONSTRAINT eventos_id_gira_transporte_fkey FOREIGN KEY (id_gira_transporte) REFERENCES public.giras_transportes(id),
  CONSTRAINT eventos_id_estado_venue_fkey FOREIGN KEY (id_estado_venue) REFERENCES public.venue_status_types(id)
);
CREATE TABLE public.eventos_asistencia (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_evento bigint,
  id_integrante bigint,
  estado text CHECK (estado = ANY (ARRAY['P'::text, 'A'::text])),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT eventos_asistencia_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_asistencia_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id),
  CONSTRAINT eventos_asistencia_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.eventos_asistencia_custom (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_evento bigint,
  id_integrante bigint,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['adicional'::text, 'ausente'::text, 'invitado'::text])),
  nota text,
  CONSTRAINT eventos_asistencia_custom_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_asistencia_custom_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id),
  CONSTRAINT eventos_asistencia_custom_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.eventos_ensambles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_evento bigint,
  id_ensamble bigint,
  CONSTRAINT eventos_ensambles_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_ensambles_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id),
  CONSTRAINT eventos_ensambles_id_ensamble_fkey FOREIGN KEY (id_ensamble) REFERENCES public.ensambles(id)
);
CREATE TABLE public.eventos_giras_asociadas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_evento bigint,
  id_gira bigint,
  CONSTRAINT eventos_giras_asociadas_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_giras_asociadas_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id),
  CONSTRAINT eventos_giras_asociadas_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id)
);
CREATE TABLE public.eventos_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_evento bigint,
  campo text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT eventos_logs_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_logs_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id)
);
CREATE TABLE public.eventos_programas_asociados (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_evento bigint,
  id_programa bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT eventos_programas_asociados_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_programas_asociados_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id),
  CONSTRAINT eventos_programas_asociados_id_programa_fkey FOREIGN KEY (id_programa) REFERENCES public.programas(id)
);
CREATE TABLE public.eventos_venue_log (
  id integer NOT NULL DEFAULT nextval('eventos_venue_log_id_seq'::regclass),
  id_evento integer,
  id_estado_venue integer,
  nota text,
  id_integrante integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT eventos_venue_log_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_venue_log_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id),
  CONSTRAINT eventos_venue_log_id_estado_venue_fkey FOREIGN KEY (id_estado_venue) REFERENCES public.venue_status_types(id),
  CONSTRAINT eventos_venue_log_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.familia (
  familia text NOT NULL UNIQUE,
  CONSTRAINT familia_pkey PRIMARY KEY (familia)
);
CREATE TABLE public.feriados (
  fecha date NOT NULL,
  detalle text NOT NULL,
  es_feriado boolean DEFAULT true,
  CONSTRAINT feriados_pkey PRIMARY KEY (fecha)
);
CREATE TABLE public.gira_difusion (
  id_difusion uuid NOT NULL DEFAULT gen_random_uuid(),
  id_gira bigint NOT NULL,
  link_foto_home text,
  timestamp_link_foto_home timestamp with time zone,
  editor_link_foto_home bigint,
  link_foto_banner text,
  timestamp_link_foto_banner timestamp with time zone,
  editor_link_foto_banner bigint,
  link_logo_1 text,
  timestamp_link_logo_1 timestamp with time zone,
  editor_link_logo_1 bigint,
  link_logo_2 text,
  timestamp_link_logo_2 timestamp with time zone,
  editor_link_logo_2 bigint,
  otros_comentarios text,
  timestamp_otros_comentarios timestamp with time zone,
  editor_otros_comentarios bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gira_difusion_pkey PRIMARY KEY (id_difusion),
  CONSTRAINT gira_difusion_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT gira_difusion_editor_link_foto_home_fkey FOREIGN KEY (editor_link_foto_home) REFERENCES public.integrantes(id),
  CONSTRAINT gira_difusion_editor_link_foto_banner_fkey FOREIGN KEY (editor_link_foto_banner) REFERENCES public.integrantes(id),
  CONSTRAINT gira_difusion_editor_link_logo_1_fkey FOREIGN KEY (editor_link_logo_1) REFERENCES public.integrantes(id),
  CONSTRAINT gira_difusion_editor_link_logo_2_fkey FOREIGN KEY (editor_link_logo_2) REFERENCES public.integrantes(id),
  CONSTRAINT gira_difusion_editor_otros_comentarios_fkey FOREIGN KEY (editor_otros_comentarios) REFERENCES public.integrantes(id)
);
CREATE TABLE public.giras_accesos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint NOT NULL,
  id_integrante bigint NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT giras_accesos_pkey PRIMARY KEY (id),
  CONSTRAINT giras_accesos_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_accesos_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.giras_comidas_rsvp (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_comida bigint,
  id_integrante bigint,
  estado text DEFAULT 'PENDIENTE'::text,
  comentario text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT giras_comidas_rsvp_pkey PRIMARY KEY (id),
  CONSTRAINT giras_comidas_rsvp_id_comida_fkey FOREIGN KEY (id_comida) REFERENCES public.programas_agenda_comidas(id),
  CONSTRAINT giras_comidas_rsvp_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.giras_destaques_config (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint,
  id_localidad bigint,
  fecha_llegada date,
  hora_llegada time without time zone,
  fecha_salida date,
  hora_salida time without time zone,
  dias_computables numeric DEFAULT 0,
  porcentaje_liquidacion numeric DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  backup_fecha_salida date,
  backup_hora_salida time without time zone,
  backup_fecha_llegada date,
  backup_hora_llegada time without time zone,
  backup_dias_computables numeric,
  fecha_ultima_exportacion timestamp with time zone,
  habilitar_gestion_viaticos boolean DEFAULT false,
  gasto_alojamiento numeric DEFAULT 0,
  gasto_combustible numeric DEFAULT 0,
  gasto_otros numeric DEFAULT 0,
  gastos_movilidad numeric DEFAULT 0,
  gastos_movil_otros numeric DEFAULT 0,
  gastos_capacit numeric DEFAULT 0,
  transporte_otros text,
  rendicion_gasto_alojamiento numeric DEFAULT 0,
  rendicion_gasto_combustible numeric DEFAULT 0,
  rendicion_gasto_otros numeric DEFAULT 0,
  rendicion_gastos_movil_otros numeric DEFAULT 0,
  rendicion_gastos_capacit numeric DEFAULT 0,
  rendicion_transporte_otros numeric DEFAULT 0,
  ids_exportados_viatico ARRAY DEFAULT '{}'::bigint[],
  ids_exportados_rendicion ARRAY DEFAULT '{}'::bigint[],
  fecha_ultima_exportacion_viatico timestamp with time zone,
  fecha_ultima_exportacion_rendicion timestamp with time zone,
  rendicion_viatico_monto numeric DEFAULT 0,
  check_aereo boolean DEFAULT false,
  check_terrestre boolean DEFAULT false,
  check_patente_oficial boolean DEFAULT false,
  patente_oficial text,
  check_patente_particular boolean DEFAULT false,
  patente_particular text,
  check_otros boolean DEFAULT false,
  CONSTRAINT giras_destaques_config_pkey PRIMARY KEY (id),
  CONSTRAINT giras_destaques_config_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_destaques_config_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id)
);
CREATE TABLE public.giras_fuentes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint,
  tipo text NOT NULL,
  valor_id bigint,
  valor_texto text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT giras_fuentes_pkey PRIMARY KEY (id),
  CONSTRAINT giras_fuentes_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id)
);
CREATE TABLE public.giras_integrantes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint,
  id_integrante bigint,
  estado text DEFAULT 'confirmado'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  rol text DEFAULT 'musico'::text,
  token_publico uuid DEFAULT gen_random_uuid() UNIQUE,
  CONSTRAINT giras_integrantes_pkey PRIMARY KEY (id),
  CONSTRAINT giras_integrantes_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_integrantes_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.giras_localidades (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint,
  id_localidad bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT giras_localidades_pkey PRIMARY KEY (id),
  CONSTRAINT giras_localidades_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_localidades_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id)
);
CREATE TABLE public.giras_logistica_admision (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id_gira bigint NOT NULL,
  id_transporte_fisico bigint,
  alcance text NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['INCLUSION'::text, 'EXCLUSION'::text])),
  id_integrante bigint,
  id_region bigint,
  id_localidad bigint,
  instrumento_familia text,
  target_ids ARRAY,
  prioridad integer DEFAULT 1,
  CONSTRAINT giras_logistica_admision_pkey PRIMARY KEY (id),
  CONSTRAINT giras_logistica_admision_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_logistica_admision_id_transporte_fisico_fkey FOREIGN KEY (id_transporte_fisico) REFERENCES public.giras_transportes(id),
  CONSTRAINT giras_logistica_admision_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id),
  CONSTRAINT giras_logistica_admision_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regiones(id),
  CONSTRAINT giras_logistica_admision_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id)
);
CREATE TABLE public.giras_logistica_reglas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id_gira bigint,
  alcance text DEFAULT 'Combinado'::text,
  prioridad integer DEFAULT 0,
  target_ids ARRAY DEFAULT '{}'::bigint[],
  target_regions ARRAY DEFAULT '{}'::bigint[],
  target_localities ARRAY DEFAULT '{}'::bigint[],
  target_categories ARRAY DEFAULT '{}'::text[],
  hora_checkin time without time zone,
  hora_checkout time without time zone,
  comida_inicio_servicio text,
  comida_fin_servicio text,
  prov_desayuno text,
  prov_almuerzo text,
  prov_merienda text,
  prov_cena text,
  id_evento_checkin integer,
  id_evento_checkout integer,
  id_evento_comida_inicio integer,
  id_evento_comida_fin integer,
  CONSTRAINT giras_logistica_reglas_pkey PRIMARY KEY (id),
  CONSTRAINT giras_logistica_reglas_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_logistica_reglas_id_evento_checkin_fkey FOREIGN KEY (id_evento_checkin) REFERENCES public.eventos(id),
  CONSTRAINT giras_logistica_reglas_id_evento_checkout_fkey FOREIGN KEY (id_evento_checkout) REFERENCES public.eventos(id),
  CONSTRAINT giras_logistica_reglas_id_evento_comida_inicio_fkey FOREIGN KEY (id_evento_comida_inicio) REFERENCES public.eventos(id),
  CONSTRAINT giras_logistica_reglas_id_evento_comida_fin_fkey FOREIGN KEY (id_evento_comida_fin) REFERENCES public.eventos(id)
);
CREATE TABLE public.giras_logistica_reglas_backup_2026_01_21 (
  id bigint,
  created_at timestamp with time zone,
  id_gira bigint,
  alcance text,
  prioridad integer,
  id_integrante bigint,
  id_localidad bigint,
  id_region bigint,
  instrumento_familia text,
  fecha_checkin date,
  hora_checkin time without time zone,
  fecha_checkout date,
  hora_checkout time without time zone,
  comida_inicio_fecha date,
  comida_inicio_servicio text,
  comida_fin_fecha date,
  comida_fin_servicio text,
  prov_desayuno text,
  prov_almuerzo text,
  prov_merienda text,
  prov_cena text,
  target_ids jsonb
);
CREATE TABLE public.giras_logistica_reglas_transportes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira_transporte bigint NOT NULL,
  id_evento_subida bigint,
  id_evento_bajada bigint,
  detalle text,
  orden integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  alcance text,
  id_integrante bigint,
  id_region bigint,
  id_localidad bigint,
  instrumento_familia text,
  target_ids ARRAY DEFAULT '{}'::text[],
  es_exclusion boolean DEFAULT false,
  solo_logistica boolean DEFAULT false,
  CONSTRAINT giras_logistica_reglas_transportes_pkey PRIMARY KEY (id),
  CONSTRAINT giras_logistica_reglas_transportes_id_gira_transporte_fkey FOREIGN KEY (id_gira_transporte) REFERENCES public.giras_transportes(id),
  CONSTRAINT giras_logistica_reglas_transportes_id_evento_subida_fkey FOREIGN KEY (id_evento_subida) REFERENCES public.eventos(id),
  CONSTRAINT giras_logistica_reglas_transportes_id_evento_bajada_fkey FOREIGN KEY (id_evento_bajada) REFERENCES public.eventos(id),
  CONSTRAINT giras_logistica_reglas_transportes_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id),
  CONSTRAINT giras_logistica_reglas_transportes_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regiones(id),
  CONSTRAINT giras_logistica_reglas_transportes_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id)
);
CREATE TABLE public.giras_logistica_rutas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  id_gira bigint NOT NULL,
  id_transporte_fisico bigint,
  alcance text NOT NULL,
  id_integrante bigint,
  id_region bigint,
  id_localidad bigint,
  instrumento_familia text,
  target_ids ARRAY,
  id_evento_subida bigint,
  id_evento_bajada bigint,
  prioridad integer DEFAULT 1,
  CONSTRAINT giras_logistica_rutas_pkey PRIMARY KEY (id),
  CONSTRAINT giras_logistica_rutas_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_logistica_rutas_id_transporte_fisico_fkey FOREIGN KEY (id_transporte_fisico) REFERENCES public.giras_transportes(id),
  CONSTRAINT giras_logistica_rutas_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id),
  CONSTRAINT giras_logistica_rutas_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regiones(id),
  CONSTRAINT giras_logistica_rutas_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id),
  CONSTRAINT giras_logistica_rutas_id_evento_subida_fkey FOREIGN KEY (id_evento_subida) REFERENCES public.eventos(id),
  CONSTRAINT giras_logistica_rutas_id_evento_bajada_fkey FOREIGN KEY (id_evento_bajada) REFERENCES public.eventos(id)
);
CREATE TABLE public.giras_notificaciones_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_gira integer,
  tipo_notificacion text,
  enviado_at timestamp with time zone DEFAULT now(),
  video_url text,
  CONSTRAINT giras_notificaciones_logs_pkey PRIMARY KEY (id),
  CONSTRAINT giras_notificaciones_logs_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id)
);
CREATE TABLE public.giras_progreso (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint,
  seccion_clave text NOT NULL,
  completado boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_by bigint,
  observaciones text,
  estado text DEFAULT 'PENDING'::text,
  CONSTRAINT giras_progreso_pkey PRIMARY KEY (id),
  CONSTRAINT giras_progreso_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.integrantes(id),
  CONSTRAINT giras_progreso_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id)
);
CREATE TABLE public.giras_progreso_historial (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_progreso bigint,
  estado_anterior text,
  estado_nuevo text,
  modificado_por bigint,
  fecha_modificacion timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT giras_progreso_historial_pkey PRIMARY KEY (id),
  CONSTRAINT giras_progreso_historial_id_progreso_fkey FOREIGN KEY (id_progreso) REFERENCES public.giras_progreso(id),
  CONSTRAINT giras_progreso_historial_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES public.integrantes(id)
);
CREATE TABLE public.giras_transportes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint NOT NULL,
  id_transporte bigint NOT NULL,
  detalle text,
  costo numeric,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  capacidad_maxima integer,
  patente text,
  es_tipo_alternativo boolean DEFAULT false,
  CONSTRAINT giras_transportes_pkey PRIMARY KEY (id),
  CONSTRAINT giras_transportes_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_transportes_id_transporte_fkey FOREIGN KEY (id_transporte) REFERENCES public.transportes(id)
);
CREATE TABLE public.giras_viaticos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint NOT NULL,
  id_integrante bigint NOT NULL,
  dias_viatico numeric DEFAULT 0,
  monto_viatico numeric DEFAULT 0,
  total_viatico numeric DEFAULT 0,
  dias_destaque numeric DEFAULT 0,
  monto_destaque numeric DEFAULT 0,
  total_destaque numeric DEFAULT 0,
  total_percibir numeric DEFAULT 0,
  estado text DEFAULT 'borrador'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT giras_viaticos_pkey PRIMARY KEY (id),
  CONSTRAINT giras_viaticos_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_viaticos_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.giras_viaticos_config (
  id_gira bigint NOT NULL,
  valor_diario_base numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  factor_temporada numeric DEFAULT 0.3,
  motivo text,
  lugar_comision text,
  link_drive text,
  motivo_destaques_exportacion text,
  CONSTRAINT giras_viaticos_config_pkey PRIMARY KEY (id_gira),
  CONSTRAINT giras_viaticos_config_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id)
);
CREATE TABLE public.giras_viaticos_detalle (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint NOT NULL,
  id_integrante bigint NOT NULL,
  dias_computables numeric DEFAULT 0,
  porcentaje numeric DEFAULT 100,
  patente_oficial text,
  tipo_movilidad text,
  gasto_combustible numeric DEFAULT 0,
  gasto_otros numeric DEFAULT 0,
  gasto_alojamiento numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gastos_movilidad numeric,
  gastos_movil_otros numeric,
  gastos_capacit numeric,
  patente_particular text,
  check_aereo boolean,
  check_terrestre boolean,
  check_patente_oficial boolean,
  check_patente_particular boolean,
  check_otros boolean,
  transporte_otros text,
  cargo text,
  jornada_laboral text,
  rendicion_viaticos numeric DEFAULT 0,
  rendicion_gasto_alojamiento numeric DEFAULT 0,
  rendicion_gasto_otros numeric DEFAULT 0,
  rendicion_gasto_combustible numeric DEFAULT 0,
  rendicion_gastos_movil_otros numeric DEFAULT 0,
  rendicion_gastos_capacit numeric DEFAULT 0,
  rendicion_transporte_otros numeric DEFAULT 0,
  backup_fecha_salida date,
  backup_hora_salida time without time zone,
  backup_fecha_llegada date,
  backup_hora_llegada time without time zone,
  backup_dias_computables numeric,
  fecha_ultima_exportacion timestamp with time zone,
  motivo text,
  CONSTRAINT giras_viaticos_detalle_pkey PRIMARY KEY (id),
  CONSTRAINT giras_viaticos_detalle_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT giras_viaticos_detalle_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.horas_catedra (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_integrante bigint NOT NULL,
  origen text NOT NULL CHECK (origen = ANY (ARRAY['CULTURA'::text, 'EDUCACION'::text])),
  mes_inicio smallint NOT NULL CHECK (mes_inicio >= 1 AND mes_inicio <= 12),
  anio_inicio smallint NOT NULL,
  mes_fin smallint CHECK (mes_fin >= 1 AND mes_fin <= 12),
  anio_fin smallint,
  h_basico smallint DEFAULT 0,
  h_ensayos smallint DEFAULT 0,
  h_ensamble smallint DEFAULT 0,
  h_categoria smallint DEFAULT 0,
  h_coordinacion smallint DEFAULT 0,
  h_desarraigo smallint DEFAULT 0,
  h_otros smallint DEFAULT 0,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  CONSTRAINT horas_catedra_pkey PRIMARY KEY (id),
  CONSTRAINT horas_catedra_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.hospedaje_habitaciones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_hospedaje bigint NOT NULL,
  tipo USER-DEFINED DEFAULT 'Común'::tipo_habitacion_enum,
  configuracion USER-DEFINED DEFAULT 'Simple'::configuracion_cama_enum,
  con_cuna boolean DEFAULT false,
  id_integrantes_asignados ARRAY DEFAULT ARRAY[]::bigint[],
  notas_internas text,
  created_at timestamp with time zone DEFAULT now(),
  es_matrimonial boolean DEFAULT false,
  orden integer DEFAULT 1000,
  CONSTRAINT hospedaje_habitaciones_pkey PRIMARY KEY (id),
  CONSTRAINT hospedaje_habitaciones_id_hospedaje_fkey FOREIGN KEY (id_hospedaje) REFERENCES public.programas_hospedajes(id)
);
CREATE TABLE public.hoteles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  direccion text,
  id_localidad bigint,
  telefono text,
  email text,
  notas text,
  id_locacion bigint,
  CONSTRAINT hoteles_pkey PRIMARY KEY (id),
  CONSTRAINT hoteles_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id),
  CONSTRAINT hoteles_id_locacion_fkey FOREIGN KEY (id_locacion) REFERENCES public.locaciones(id)
);
CREATE TABLE public.instrumentos (
  instrumento text NOT NULL,
  familia text,
  id text NOT NULL,
  plaza_extra boolean,
  abreviatura text,
  CONSTRAINT instrumentos_pkey PRIMARY KEY (id),
  CONSTRAINT Instrumentos_Familia_fkey FOREIGN KEY (familia) REFERENCES public.familia(familia)
);
CREATE TABLE public.integrantes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  apellido text,
  nombre text,
  id_instr text,
  genero USER-DEFINED,
  telefono text,
  dni text,
  mail text,
  alimentacion text,
  nacionalidad text,
  cuil text,
  fecha_nac date,
  email_google text,
  fecha_alta date,
  fecha_baja date,
  id_localidad bigint,
  condicion USER-DEFINED DEFAULT 'Estable'::condicion_integrante,
  email_acceso text,
  rol_sistema text DEFAULT 'personal'::text,
  clave_acceso text,
  link_bio text,
  link_foto_popup text,
  documentacion text,
  docred text,
  firma text,
  id_loc_viaticos bigint,
  es_simulacion boolean DEFAULT false,
  domicilio text,
  avatar_url text,
  last_modified_at timestamp with time zone,
  avatar_color text DEFAULT '#64748b'::text,
  link_carpeta text,
  link_dni_img text,
  link_cbu_img text,
  link_declaracion text,
  link_cuil text,
  last_verified_at timestamp with time zone,
  nota_interna text,
  cargo text,
  jornada text,
  motivo text,
  id_domicilio_laboral bigint,
  CONSTRAINT integrantes_pkey PRIMARY KEY (id),
  CONSTRAINT integrantes_id_instr_fkey FOREIGN KEY (id_instr) REFERENCES public.instrumentos(id),
  CONSTRAINT integrantes_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id),
  CONSTRAINT integrantes_id_loc_viaticos_fkey FOREIGN KEY (id_loc_viaticos) REFERENCES public.localidades(id),
  CONSTRAINT integrantes_id_domicilio_laboral_fkey FOREIGN KEY (id_domicilio_laboral) REFERENCES public.locaciones(id)
);
CREATE TABLE public.integrantes_ensambles (
  id_ensamble bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_integrante bigint NOT NULL,
  CONSTRAINT integrantes_ensambles_pkey PRIMARY KEY (id_ensamble, id_integrante),
  CONSTRAINT integrantes_ensambles_id_ensamble_fkey FOREIGN KEY (id_ensamble) REFERENCES public.ensambles(id),
  CONSTRAINT integrantes_ensambles_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.locaciones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  direccion text,
  id_localidad bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  capacidad bigint,
  link_mapa text,
  telefono bigint,
  mail text,
  CONSTRAINT locaciones_pkey PRIMARY KEY (id),
  CONSTRAINT locaciones_id_localidad_fkey FOREIGN KEY (id_localidad) REFERENCES public.localidades(id)
);
CREATE TABLE public.localidades (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  localidad text NOT NULL UNIQUE,
  id_region bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  id_provincia integer,
  cp text,
  CONSTRAINT localidades_pkey PRIMARY KEY (id),
  CONSTRAINT localidades_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.regiones(id),
  CONSTRAINT localidades_id_provincia_fkey FOREIGN KEY (id_provincia) REFERENCES public.provincias(id)
);
CREATE TABLE public.logos_generales (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  nombre text NOT NULL,
  url text NOT NULL,
  CONSTRAINT logos_generales_pkey PRIMARY KEY (id)
);
CREATE TABLE public.obras (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo text NOT NULL,
  id_arreglador bigint,
  anio_composicion integer,
  duracion_segundos integer,
  link_drive text,
  link_youtube text,
  observaciones text,
  dificultad text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  instrumentacion text,
  estado USER-DEFINED DEFAULT 'Oficial'::estado_obra,
  datos_provisorios jsonb,
  solicitado_por uuid,
  comentarios text,
  fecha_esperada date,
  id_folder_arcos text,
  id_usuario_carga bigint,
  CONSTRAINT obras_pkey PRIMARY KEY (id),
  CONSTRAINT obras_id_arreglador_fkey FOREIGN KEY (id_arreglador) REFERENCES public.compositores(id),
  CONSTRAINT obras_solicitado_por_fkey FOREIGN KEY (solicitado_por) REFERENCES auth.users(id),
  CONSTRAINT obras_id_usuario_carga_fkey FOREIGN KEY (id_usuario_carga) REFERENCES public.integrantes(id)
);
CREATE TABLE public.obras_arcos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_obra bigint NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  id_drive_folder text,
  CONSTRAINT obras_arcos_pkey PRIMARY KEY (id),
  CONSTRAINT obras_arcos_id_obra_fkey FOREIGN KEY (id_obra) REFERENCES public.obras(id)
);
CREATE TABLE public.obras_compositores (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_obra bigint,
  id_compositor bigint,
  rol text DEFAULT 'compositor'::text,
  CONSTRAINT obras_compositores_pkey PRIMARY KEY (id),
  CONSTRAINT obras_compositores_id_obra_fkey FOREIGN KEY (id_obra) REFERENCES public.obras(id),
  CONSTRAINT obras_compositores_id_compositor_fkey FOREIGN KEY (id_compositor) REFERENCES public.compositores(id)
);
CREATE TABLE public.obras_palabras_clave (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_obra bigint,
  id_palabra_clave bigint,
  CONSTRAINT obras_palabras_clave_pkey PRIMARY KEY (id),
  CONSTRAINT obras_palabras_clave_id_obra_fkey FOREIGN KEY (id_obra) REFERENCES public.obras(id),
  CONSTRAINT obras_palabras_clave_id_palabra_clave_fkey FOREIGN KEY (id_palabra_clave) REFERENCES public.palabras_clave(id)
);
CREATE TABLE public.obras_particellas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_obra bigint,
  id_instrumento text,
  nombre_archivo text,
  url_archivo text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  nota_organico text,
  es_solista boolean DEFAULT false,
  CONSTRAINT obras_particellas_pkey PRIMARY KEY (id),
  CONSTRAINT obras_particellas_id_obra_fkey FOREIGN KEY (id_obra) REFERENCES public.obras(id),
  CONSTRAINT obras_particellas_id_instrumento_fkey FOREIGN KEY (id_instrumento) REFERENCES public.instrumentos(id)
);
CREATE TABLE public.paises (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT paises_pkey PRIMARY KEY (id)
);
CREATE TABLE public.palabras_clave (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  tag text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT palabras_clave_pkey PRIMARY KEY (id)
);
CREATE TABLE public.perfiles (
  id uuid NOT NULL,
  rol USER-DEFINED DEFAULT 'personal'::app_rol,
  id_integrante bigint,
  nombre_completo text,
  updated_at timestamp with time zone DEFAULT now(),
  email text,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT perfiles_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id)
);
CREATE TABLE public.plantillas_recorridos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  nombre text NOT NULL,
  descripcion text,
  CONSTRAINT plantillas_recorridos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.plantillas_recorridos_tramos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_plantilla bigint NOT NULL,
  orden integer NOT NULL,
  id_locacion_origen bigint NOT NULL,
  id_locacion_destino bigint NOT NULL,
  duracion_minutos integer NOT NULL DEFAULT 60,
  nota text,
  ids_localidades_suben ARRAY DEFAULT '{}'::bigint[],
  ids_localidades_bajan ARRAY DEFAULT '{}'::bigint[],
  id_tipo_evento bigint DEFAULT 11,
  ids_integrantes_suben ARRAY DEFAULT '{}'::bigint[],
  ids_integrantes_bajan ARRAY DEFAULT '{}'::bigint[],
  CONSTRAINT plantillas_recorridos_tramos_pkey PRIMARY KEY (id),
  CONSTRAINT plantillas_recorridos_tramos_id_plantilla_fkey FOREIGN KEY (id_plantilla) REFERENCES public.plantillas_recorridos(id),
  CONSTRAINT plantillas_recorridos_tramos_id_locacion_origen_fkey FOREIGN KEY (id_locacion_origen) REFERENCES public.locaciones(id),
  CONSTRAINT plantillas_recorridos_tramos_id_locacion_destino_fkey FOREIGN KEY (id_locacion_destino) REFERENCES public.locaciones(id)
);
CREATE TABLE public.programas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nombre_gira text UNIQUE,
  fecha_desde date NOT NULL,
  fecha_hasta date,
  tipo USER-DEFINED DEFAULT 'Sinfónico'::tipo_programa,
  google_drive_folder_id text,
  zona text,
  nomenclador text,
  fecha_confirmacion_limite timestamp with time zone,
  subtitulo text,
  mes_letra text,
  token_publico uuid UNIQUE,
  estado USER-DEFINED DEFAULT 'Borrador'::estado_gira,
  id_folder_arcos text,
  id_shortcut_arcos_drive text,
  notificacion_inicial_enviada boolean DEFAULT false,
  notificaciones_habilitadas boolean DEFAULT true,
  CONSTRAINT programas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.programas_agenda_comidas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint,
  fecha date NOT NULL,
  servicio text NOT NULL,
  convocados ARRAY NOT NULL DEFAULT '{}'::text[],
  hora time without time zone,
  visible_agenda boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  descripcion text,
  id_locacion bigint,
  CONSTRAINT programas_agenda_comidas_pkey PRIMARY KEY (id),
  CONSTRAINT giras_agenda_comidas_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id),
  CONSTRAINT programas_agenda_comidas_id_locacion_fkey FOREIGN KEY (id_locacion) REFERENCES public.locaciones(id)
);
CREATE TABLE public.programas_hospedajes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_programa bigint NOT NULL,
  id_hotel bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT programas_hospedajes_pkey PRIMARY KEY (id),
  CONSTRAINT programas_hospedajes_id_programa_fkey FOREIGN KEY (id_programa) REFERENCES public.programas(id),
  CONSTRAINT programas_hospedajes_id_hotel_fkey FOREIGN KEY (id_hotel) REFERENCES public.hoteles(id)
);
CREATE TABLE public.programas_repertorios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_programa bigint NOT NULL,
  nombre text NOT NULL DEFAULT 'Repertorio Principal'::text,
  orden integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  google_drive_folder_id text,
  CONSTRAINT programas_repertorios_pkey PRIMARY KEY (id),
  CONSTRAINT programas_repertorios_id_programa_fkey FOREIGN KEY (id_programa) REFERENCES public.programas(id)
);
CREATE TABLE public.provincias (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nombre text NOT NULL,
  CONSTRAINT provincias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.regiones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  region text NOT NULL,
  CONSTRAINT regiones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.repertorio_obras (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_repertorio bigint NOT NULL,
  id_obra bigint NOT NULL,
  orden integer DEFAULT 1,
  notas_especificas text,
  google_drive_shortcut_id text,
  usar_seating_provisorio boolean DEFAULT false,
  seating_provisorio jsonb DEFAULT '{}'::jsonb,
  excluir boolean DEFAULT false,
  id_arco_seleccionado bigint,
  ids_solistas ARRAY DEFAULT '{}'::bigint[],
  CONSTRAINT repertorio_obras_pkey PRIMARY KEY (id),
  CONSTRAINT repertorio_obras_id_repertorio_fkey FOREIGN KEY (id_repertorio) REFERENCES public.programas_repertorios(id),
  CONSTRAINT repertorio_obras_id_obra_fkey FOREIGN KEY (id_obra) REFERENCES public.obras(id),
  CONSTRAINT repertorio_obras_id_arco_seleccionado_fkey FOREIGN KEY (id_arco_seleccionado) REFERENCES public.obras_arcos(id)
);
CREATE TABLE public.roles (
  id text NOT NULL,
  color text NOT NULL,
  orden smallint,
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.seating_asignaciones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  id_programa bigint NOT NULL,
  id_particella bigint NOT NULL,
  id_obra bigint,
  id_musicos_asignados ARRAY DEFAULT '{}'::bigint[],
  id_contenedor bigint,
  CONSTRAINT seating_asignaciones_pkey PRIMARY KEY (id),
  CONSTRAINT seating_asignaciones_id_programa_fkey FOREIGN KEY (id_programa) REFERENCES public.programas(id),
  CONSTRAINT seating_asignaciones_id_particella_fkey FOREIGN KEY (id_particella) REFERENCES public.obras_particellas(id),
  CONSTRAINT seating_asignaciones_id_obra_fkey FOREIGN KEY (id_obra) REFERENCES public.obras(id),
  CONSTRAINT seating_asignaciones_id_contenedor_fkey FOREIGN KEY (id_contenedor) REFERENCES public.seating_contenedores(id)
);
CREATE TABLE public.seating_contenedores (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_programa bigint NOT NULL,
  nombre text NOT NULL,
  orden integer DEFAULT 0,
  id_instrumento text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  capacidad integer,
  CONSTRAINT seating_contenedores_pkey PRIMARY KEY (id),
  CONSTRAINT seating_contenedores_id_programa_fkey FOREIGN KEY (id_programa) REFERENCES public.programas(id)
);
CREATE TABLE public.seating_contenedores_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_contenedor bigint NOT NULL,
  id_musico bigint NOT NULL,
  orden integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT seating_contenedores_items_pkey PRIMARY KEY (id),
  CONSTRAINT seating_contenedores_items_id_contenedor_fkey FOREIGN KEY (id_contenedor) REFERENCES public.seating_contenedores(id),
  CONSTRAINT seating_contenedores_items_id_musico_fkey FOREIGN KEY (id_musico) REFERENCES public.integrantes(id)
);
CREATE TABLE public.sistema_comentarios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  contenido text NOT NULL,
  entidad_tipo text NOT NULL,
  entidad_id text NOT NULL,
  id_autor bigint,
  resuelto boolean DEFAULT false,
  etiquetados jsonb DEFAULT '[]'::jsonb,
  fecha_resolucion timestamp with time zone,
  fecha_limite timestamp with time zone,
  deleted boolean DEFAULT false,
  parent_id bigint,
  CONSTRAINT sistema_comentarios_pkey PRIMARY KEY (id),
  CONSTRAINT sistema_comentarios_id_autor_fkey FOREIGN KEY (id_autor) REFERENCES public.integrantes(id),
  CONSTRAINT sistema_comentarios_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sistema_comentarios(id)
);
CREATE TABLE public.sistema_novedades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  titulo text NOT NULL,
  contenido text,
  modulo text,
  importancia text DEFAULT 'normal'::text,
  visibilidad text DEFAULT 'todos'::text,
  creado_por bigint,
  CONSTRAINT sistema_novedades_pkey PRIMARY KEY (id),
  CONSTRAINT sistema_novedades_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.integrantes(id)
);
CREATE TABLE public.sistema_novedades_lecturas (
  id_novedad uuid NOT NULL,
  id_usuario bigint NOT NULL,
  leido_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sistema_novedades_lecturas_pkey PRIMARY KEY (id_novedad, id_usuario),
  CONSTRAINT sistema_novedades_lecturas_id_novedad_fkey FOREIGN KEY (id_novedad) REFERENCES public.sistema_novedades(id),
  CONSTRAINT sistema_novedades_lecturas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.integrantes(id)
);
CREATE TABLE public.temp_duraciones (
  link text,
  duracion text
);
CREATE TABLE public.temp_vinculacion_arregladores (
  link_drive text,
  nombre_arreglador text
);
CREATE TABLE public.tipos_evento (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  color text DEFAULT '#6366f1'::text,
  id_categoria bigint,
  CONSTRAINT tipos_evento_pkey PRIMARY KEY (id),
  CONSTRAINT tipos_evento_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias_tipos_eventos(id)
);
CREATE TABLE public.transportes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  color text DEFAULT '#6366f1'::text,
  patente text,
  CONSTRAINT transportes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_ui_settings (
  user_id bigint NOT NULL,
  hide_manual_triggers boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_ui_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_ui_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.integrantes(id)
);
CREATE TABLE public.venue_status_types (
  id integer NOT NULL DEFAULT nextval('venue_status_types_id_seq'::regclass),
  nombre text NOT NULL,
  color text NOT NULL,
  slug text NOT NULL UNIQUE,
  
  CONSTRAINT venue_status_types_pkey PRIMARY KEY (id)
);