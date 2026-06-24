# Workflow Maestro de Arreglos y Archivo - OFRN

## Matriz de Estados y Responsabilidades
| Estado | Actor | Acción Técnica |
|:--- |:--- |:--- |
| **Para arreglar** | Editor | Se asigna `id_integrante_arreglador` (integrante a notificar; default `4340365` si no hay otro). El mail de encargo **no** se envía al cambiar estado: el editor indica `fecha_esperada` y pulsa **«Enviar mail de asignación»** en `WorkForm`. En el mail: **Asignado por** = sesión que envía; **Solicitado por** = `id_usuario_carga` (sin fallback al remitente). |
| **Entregado** | Arreglador | Sube `link_drive`. Dispara `manage-drive` (clonación) y mail al Archivista. |
| **Oficial** | Archivista | Valida material en la carpeta destino. La obra entra al catálogo vivo. |

## Integración con Edge Functions
1. **Notificación de Encargo:** En `WorkForm`, botón **«Enviar mail de asignación»** invoca `mails_produccion` (`encargo_arreglo`). **Asignado por** = integrante de la sesión (`nombre` en el payload). **Solicitado por** = `detalle.solicitado_por` resuelto desde `obras.id_usuario_carga` (nunca el remitente por defecto).
2. **Procesamiento de Entrega:** Al pasar a `Entregado`, llamar a `manage-drive` para clonar el link de origen hacia la carpeta raíz del Archivo (`ID: 10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi`).

## Contactos Operativos
- **Archivo:** ofrn.archivo@gmail.com
- **Arreglador Principal:** martin.rantucho@gmail.com
