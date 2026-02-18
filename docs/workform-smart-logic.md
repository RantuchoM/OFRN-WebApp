# Spec: Lógica Inteligente y Feedback Visual en WorkForm

## 1. Feedback de Guardado (Field-Level)
Cada input debe manejar un estado local de "vuelto" (status):
- **Idle**: Color estándar.
- **Saving**: Animación sutil o borde azul.
- **Success**: Fondo verde esmeralda suave (`bg-emerald-50`) y borde verde por 2 segundos.
- **Error**: Fondo rojizo (`bg-red-50`) y borde rojo.

## 2. Bloqueo de Búsquedas (Políticas)
Para ahorrar tokens y evitar sobreescritura:
- **YouTube**: Si `formData.link_youtube` ya tiene un valor, se suspende la búsqueda de sugerencias de video.
- **Año**: Si `formData.anio` es válido (> 0), se suspende la búsqueda del año.
- **IMSLP/Drive**: Si existe `formData.link_drive`, se omite la búsqueda en IMSLP para no duplicar fuentes de partituras.

## 3. Integración IMSLP
- Si la IA encuentra un enlace a IMSLP, este debe concatenarse en el campo `observaciones` (formato WYSIWYG) como un link HTML: `<a href="...">Ver en IMSLP</a>`.