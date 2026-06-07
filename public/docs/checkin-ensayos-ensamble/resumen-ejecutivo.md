# Registro de ingreso a ensayos de ensamble — Resumen ejecutivo

**Orquesta Filarmónica de Río Negro (OFRN)** · Documento de una página para autoridades de control

---

## Qué controla el sistema

Registra la **hora de ingreso** de cada integrante a los **ensayos de ensamble** programados en la agenda institucional. Cada músico se identifica con credenciales personales y registra su llegada **solo el día del ensayo**, desde su agenda en la plataforma web (teléfono o tablet).

---

## Cómo funciona el registro

1. El integrante pulsa **«Registrar hora de llegada»** en el ensayo del día.
2. El dispositivo obtiene su **ubicación GPS** (alta precisión, lectura en el momento).
3. El **servidor** valida el ensayo, fija la **hora oficial de ingreso** (independiente del reloj del teléfono) y guarda coordenadas, precisión del GPS y distancia a la sede del ensayo.
4. Si el GPS falla, puede **escanear un QR de un compañero presente** (válido 20 segundos, un solo uso).

**Dos modalidades trazables:** GPS directo · pase QR de compañero.

---

## Geolocalización

- Se usa el **GPS del dispositivo** (y redes auxiliares Wi‑Fi/celular cuando corresponde).
- Se almacenan **coordenadas**, **precisión en metros** y **distancia calculada a la sede** (fórmula cartográfica Haversine).
- La distancia sirve para **auditoría ex post** en mapa; no bloquea el registro automáticamente (evita falsos rechazos en interiores con señal débil).
- Gestión puede ver cada punto en **Google Maps** y exportar reportes.

---

## Seguridad del registro

| Garantía | Detalle |
|----------|---------|
| **Identidad** | Credenciales individuales; registro vinculado al integrante en el padrón |
| **Hora objetiva** | Marca de tiempo del servidor, no del dispositivo |
| **Un registro por persona y ensayo** | No se puede cambiar ni repetir la hora desde la app |
| **Validación en servidor** | Verifica tipo de evento, fecha del ensayo y validez de pases QR |
| **Trazabilidad** | Modo de registro, precisión GPS, dispositivo, prestador del pase (si aplica) |

---

## Supervisión institucional

Personal autorizado accede a **Gestión → Asistencia a ensayos**: matriz de asistencia, vista por persona, verificación geográfica y **exportación Excel/PDF** para archivo, RRHH y control externo.

---

## Por qué es un método de control suficiente

Combina **hora certificada por servidor**, **evidencia geográfica verificable**, **alternativas presenciales documentadas** (QR con compañero) y **supervisión centralizada con reportes exportables**. Es un procedimiento equivalente al usado en organismos y empresas para control de presencia digital: objetivo, auditable y apto para fiscalización, sin depender de planillas manuales o testimonios no verificables.

---

*Documento completo y diagrama de flujo disponibles en la misma carpeta.*
