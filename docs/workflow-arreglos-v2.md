# Workflow Maestro de Arreglos y Archivo - OFRN

## Matriz de Estados y Responsabilidades
| Estado | Actor | Acción Técnica |
|:--- |:--- |:--- |
| **Para arreglar** | Editor | Se asigna `id_integrante_arreglador` (integrante a notificar). Dispara `mails_produccion` al mail del integrante. |
| **Entregado** | Arreglador | Sube `link_drive`. Dispara `manage-drive` (clonación) y mail al Archivista. |
| **Oficial** | Archivista | Valida material en la carpeta destino. La obra entra al catálogo vivo. |

## Integración con Edge Functions
1. **Notificación de Encargo:** Al pasar a `Para arreglar`, llamar a `mails_produccion` con los datos del encargo.
2. **Procesamiento de Entrega:** Al pasar a `Entregado`, llamar a `manage-drive` para clonar el link de origen hacia la carpeta raíz del Archivo (`ID: 10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi`).

## Contactos Operativos
- **Archivo:** ofrn.archivo@gmail.com
- **Arreglador Principal:** martin.rantucho@gmail.com
