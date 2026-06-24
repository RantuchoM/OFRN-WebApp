# Workflow Maestro de Arreglos y Archivo - OFRN

## Matriz de Estados y Responsabilidades
| Estado | Actor | Acción Técnica |
|:--- |:--- |:--- |
| **Para arreglar** | Editor | Se asigna `id_integrante_arreglador` (integrante a notificar; default `4340365` si no hay otro). El mail de encargo **no** se envía al cambiar estado: el editor indica `fecha_esperada` y pulsa **«Enviar mail de asignación»** en `WorkForm`. |
| **Entregado** | Arreglador | Sube `link_drive`. Dispara `manage-drive` (clonación) y mail al Archivista. |
| **Oficial** | Archivista | Valida material en la carpeta destino. La obra entra al catálogo vivo. |

## Integración con Edge Functions
1. **Notificación de Encargo:** En `WorkForm`, botón **«Enviar mail de asignación»** (junto a la fecha estimada) invoca `mails_produccion` (`encargo_arreglo`) con arreglador, fecha, metadatos de la obra y **Solicitado por** (`id_usuario_carga` → nombre del integrante). Requiere obra guardada, arreglador asignado y fecha completada.
2. **Procesamiento de Entrega:** Al pasar a `Entregado`, llamar a `manage-drive` para clonar el link de origen hacia la carpeta raíz del Archivo (`ID: 10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi`).

## Contactos Operativos
- **Archivo:** ofrn.archivo@gmail.com
- **Arreglador Principal:** martin.rantucho@gmail.com
