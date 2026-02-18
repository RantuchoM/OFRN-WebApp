| table_name                         | column_name                        | data_type                |
| ---------------------------------- | ---------------------------------- | ------------------------ |
| categorias_tipos_eventos           | id                                 | bigint                   |
| programas_repertorios              | id_programa                        | bigint                   |
| vista_vacantes_pendientes          | id_gira                            | bigint                   |
| vista_vacantes_pendientes          | id_placeholder                     | bigint                   |
| vista_vacantes_pendientes          | genero                             | USER-DEFINED             |
| vista_vacantes_pendientes          | id_localidad                       | bigint                   |
| giras_progreso                     | id                                 | bigint                   |
| giras_progreso                     | id_gira                            | bigint                   |
| giras_progreso                     | completado                         | boolean                  |
| giras_progreso                     | updated_at                         | timestamp with time zone |
| giras_progreso                     | updated_by                         | bigint                   |
| eventos_asistencia                 | id                                 | bigint                   |
| eventos_asistencia                 | id_evento                          | bigint                   |
| eventos_asistencia                 | id_integrante                      | bigint                   |
| eventos_asistencia                 | updated_at                         | timestamp with time zone |
| giras_transportes                  | id                                 | bigint                   |
| giras_transportes                  | id_gira                            | bigint                   |
| giras_transportes                  | id_transporte                      | bigint                   |
| giras_transportes                  | costo                              | numeric                  |
| giras_transportes                  | created_at                         | timestamp with time zone |
| giras_transportes                  | capacidad_maxima                   | integer                  |
| giras_transportes                  | es_tipo_alternativo                | boolean                  |
| seating_contenedores               | id                                 | bigint                   |
| seating_contenedores               | id_programa                        | bigint                   |
| seating_contenedores               | orden                              | integer                  |
| seating_contenedores               | created_at                         | timestamp with time zone |
| seating_contenedores               | capacidad                          | integer                  |
| seating_contenedores_items         | id                                 | bigint                   |
| seating_contenedores_items         | id_contenedor                      | bigint                   |
| seating_contenedores_items         | id_musico                          | bigint                   |
| seating_contenedores_items         | orden                              | integer                  |
| seating_contenedores_items         | created_at                         | timestamp with time zone |
| giras_logistica_reglas_transportes | id                                 | bigint                   |
| giras_logistica_reglas_transportes | id_gira_transporte                 | bigint                   |
| giras_logistica_reglas_transportes | id_evento_subida                   | bigint                   |
| giras_logistica_reglas_transportes | id_evento_bajada                   | bigint                   |
| giras_logistica_reglas_transportes | orden                              | integer                  |
| giras_logistica_reglas_transportes | created_at                         | timestamp with time zone |
| giras_logistica_reglas_transportes | id_integrante                      | bigint                   |
| giras_logistica_reglas_transportes | id_region                          | bigint                   |
| giras_logistica_reglas_transportes | id_localidad                       | bigint                   |
| giras_logistica_reglas_transportes | es_exclusion                       | boolean                  |
| giras_logistica_reglas_transportes | solo_logistica                     | boolean                  |
| transportes                        | id                                 | bigint                   |
| transportes                        | created_at                         | timestamp with time zone |
| gira_difusion                      | id_difusion                        | uuid                     |
| gira_difusion                      | id_gira                            | bigint                   |
| gira_difusion                      | timestamp_link_foto_home           | timestamp with time zone |
| gira_difusion                      | editor_link_foto_home              | bigint                   |
| gira_difusion                      | timestamp_link_foto_banner         | timestamp with time zone |
| gira_difusion                      | editor_link_foto_banner            | bigint                   |
| gira_difusion                      | timestamp_link_logo_1              | timestamp with time zone |
| gira_difusion                      | editor_link_logo_1                 | bigint                   |
| gira_difusion                      | timestamp_link_logo_2              | timestamp with time zone |
| gira_difusion                      | editor_link_logo_2                 | bigint                   |
| gira_difusion                      | timestamp_otros_comentarios        | timestamp with time zone |
| gira_difusion                      | editor_otros_comentarios           | bigint                   |
| gira_difusion                      | created_at                         | timestamp with time zone |
| giras_destaques_config             | id                                 | bigint                   |
| giras_destaques_config             | id_gira                            | bigint                   |
| giras_destaques_config             | id_localidad                       | bigint                   |
| giras_destaques_config             | fecha_llegada                      | date                     |
| giras_destaques_config             | hora_llegada                       | time without time zone   |
| giras_destaques_config             | fecha_salida                       | date                     |
| giras_destaques_config             | hora_salida                        | time without time zone   |
| giras_destaques_config             | dias_computables                   | numeric                  |
| giras_destaques_config             | porcentaje_liquidacion             | numeric                  |
| giras_destaques_config             | created_at                         | timestamp with time zone |
| giras_destaques_config             | backup_fecha_salida                | date                     |
| giras_destaques_config             | backup_hora_salida                 | time without time zone   |
| giras_destaques_config             | backup_fecha_llegada               | date                     |
| giras_destaques_config             | backup_hora_llegada                | time without time zone   |
| giras_destaques_config             | backup_dias_computables            | numeric                  |
| giras_destaques_config             | fecha_ultima_exportacion           | timestamp with time zone |
| giras_destaques_config             | habilitar_gestion_viaticos         | boolean                  |
| giras_destaques_config             | gasto_alojamiento                  | numeric                  |
| giras_destaques_config             | gasto_combustible                  | numeric                  |
| giras_destaques_config             | gasto_otros                        | numeric                  |
| giras_destaques_config             | gastos_movilidad                   | numeric                  |
| giras_destaques_config             | gastos_movil_otros                 | numeric                  |
| giras_destaques_config             | gastos_capacit                     | numeric                  |
| giras_destaques_config             | rendicion_gasto_alojamiento        | numeric                  |
| giras_destaques_config             | rendicion_gasto_combustible        | numeric                  |
| giras_destaques_config             | rendicion_gasto_otros              | numeric                  |
| giras_destaques_config             | rendicion_gastos_movil_otros       | numeric                  |
| giras_destaques_config             | rendicion_gastos_capacit           | numeric                  |
| giras_destaques_config             | rendicion_transporte_otros         | numeric                  |
| giras_destaques_config             | ids_exportados_viatico             | ARRAY                    |
| giras_destaques_config             | ids_exportados_rendicion           | ARRAY                    |
| giras_destaques_config             | fecha_ultima_exportacion_viatico   | timestamp with time zone |
| giras_destaques_config             | fecha_ultima_exportacion_rendicion | timestamp with time zone |
| giras_destaques_config             | rendicion_viatico_monto            | numeric                  |
| giras_destaques_config             | check_aereo                        | boolean                  |
| giras_destaques_config             | check_terrestre                    | boolean                  |
| giras_destaques_config             | check_patente_oficial              | boolean                  |
| giras_destaques_config             | check_patente_particular           | boolean                  |
| giras_destaques_config             | check_otros                        | boolean                  |
| obras                              | id                                 | bigint                   |
| obras                              | id_arreglador                      | bigint                   |
| obras                              | anio_composicion                   | integer                  |