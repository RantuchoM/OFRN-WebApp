# Sistema de registro de ingreso a ensayos de ensamble

**Documento explicativo para autoridades de control**

Orquesta Filarmónica de Río Negro (OFRN) — Plataforma de gestión institucional

---

## 1. Objeto y finalidad

La Orquesta Filarmónica de Río Negro (OFRN) dispone de un **sistema digital de registro de asistencia** a los **ensayos de ensamble**: actividades programadas en la agenda institucional como eventos de tipo «ensayo de ensamble».

El sistema permite documentar, de forma **objetiva y verificable**, la **hora de ingreso** de cada integrante convocado a un ensayo, complementando el control de presencia con **datos de geolocalización** cuando el dispositivo del músico lo permite. Los registros alimentan **reportes de gestión** exportables (Excel y PDF) destinados al seguimiento administrativo y al control de cumplimiento de la jornada de ensayo.

---

## 2. Marco operativo

| Elemento | Descripción |
|----------|-------------|
| **Actividad controlada** | Ensayos de ensamble (eventos tipo 13 en la agenda institucional) |
| **Usuarios** | Integrantes de la orquesta con credenciales personales en la plataforma web |
| **Momento habilitado** | Únicamente el **día calendario del ensayo**, según hora oficial de Argentina (`America/Argentina/Buenos_Aires`) en el servidor |
| **Registro único** | Un solo ingreso por persona y por ensayo; no admite duplicados |
| **Supervisión** | Módulo **Gestión → Asistencia a ensayos**, accesible a personal autorizado (roles administrador y editor) |

El registro se realiza desde la **Agenda personal** del integrante, en el evento correspondiente al ensayo del día.

---

## 3. Procedimiento de registro (integrante)

El músico autenticado accede a su agenda, identifica el ensayo del día y pulsa el control de **«Registrar hora de llegada»**. A partir de ese instante el sistema ejecuta el siguiente procedimiento:

1. **Solicita la ubicación del dispositivo** mediante la API estándar de geolocalización del navegador (GPS del teléfono o tablet).
2. **Transmite al servidor** las coordenadas obtenidas, la precisión estimada del GPS y metadatos técnicos del dispositivo.
3. El servidor **valida** que el evento exista, sea un ensayo de ensamble y corresponda al día en curso.
4. El servidor **graba el registro** con **marca de tiempo propia** (`registrado_at`), independiente del reloj del dispositivo del usuario.
5. El integrante recibe confirmación visual con la **hora de ingreso registrada**.

Si el GPS no está disponible (permiso denegado, falla técnica, dispositivo sin receptor), el sistema ofrece **alternativas documentadas** (sección 5), de modo que la imposibilidad técnica puntual no impida el registro, pero queda identificada en los reportes de gestión.

---

## 4. Funcionamiento de la geolocalización

### 4.1. Obtención de coordenadas

La aplicación utiliza el servicio de geolocalización del navegador móvil (`navigator.geolocation`), que en la práctica obtiene la posición a partir de:

- **Señal GPS** del dispositivo (principal fuente en exteriores e interiores con buena recepción).
- **Redes Wi‑Fi y torres celulares** (refuerzo cuando el GPS es débil).
- **Sensores del aparato** (acelerómetro, brújula), según el hardware.

La lectura se configura con **alta precisión** (`enableHighAccuracy: true`) y **sin reutilizar posiciones antiguas** (`maximumAge: 0`), de modo que cada registro corresponde a una medición en el momento del check-in y no a una ubicación cacheada.

### 4.2. Datos geográficos almacenados

Por cada ingreso con ubicación, el sistema conserva:

| Dato | Significado |
|------|-------------|
| **Latitud y longitud** | Coordenadas geográficas del dispositivo al momento del registro |
| **Precisión (`precision_m`)** | Radio de incertidumbre en metros reportado por el GPS (p. ej. ±15 m) |
| **Distancia a la sede (`distancia_sede_m`)** | Distancia calculada entre las coordenadas del registro y las coordenadas georreferenciadas del lugar del ensayo |

La distancia a la sede se calcula en el servidor mediante la **fórmula de Haversine** (estándar cartográfico para distancias sobre la superficie terrestre), comparando la posición del dispositivo con las coordenadas registradas de la locación del ensayo.

### 4.3. Uso de la distancia a la sede

La distancia calculada tiene **carácter de control y auditoría**: permite a la gestión verificar, en el reporte de asistencia, si el registro geográfico es **coherente con la presencia en el lugar del ensayo**. En la interfaz de gestión, cada registro con coordenadas puede visualizarse en **Google Maps** y muestra la distancia a la sede cuando está disponible.

**Importante para la evaluación del método:** la distancia **no bloquea** el registro automáticamente. Ello responde a limitaciones reales (edificios con señal GPS débil, ensayos en salas interiores, variabilidad del hardware). La verificación se realiza **ex post** por el personal de gestión, cruzando hora de ingreso, ubicación y programación del ensayo.

---

## 5. Modalidades de registro

El sistema contempla **dos modalidades**, todas trazables en la base de datos:

### 5.1. Registro directo con GPS (`modo: gps`)

Modalidad principal. El integrante registra su ingreso con sus propias coordenadas. Es la evidencia geográfica de mayor valor probatorio.

### 5.2. Registro asistido por compañero — pase QR (`modo: peer_pase`)

Para integrantes cuyo dispositivo no obtiene GPS (falla técnica, permiso bloqueado), un **compañero ya registrado con GPS** puede generar un **código QR efímero** (válido **20 segundos**, de **un solo uso**). El integrante lo escanea y queda registrado con:

- La **misma ubicación** del compañero que generó el pase.
- Identificación del **integrante prestador** del pase.
- Hora de ingreso en el servidor.

Este mecanismo exige **proximidad física** entre ambos (ventana de 20 segundos, escaneo presencial) y vincula el registro a una posición GPS verificada por un tercero presente en el ensayo.

---

## 6. Seguridad e integridad del registro

### 6.1. Autenticación personal

Cada integrante accede con **credenciales individuales** (correo institucional y clave de acceso) vinculadas a su ficha en el padrón de integrantes. El registro se asocia al **identificador único** de esa persona en la base institucional; no es posible registrar ingreso genérico o anónimo.

### 6.2. Validaciones en servidor

Las operaciones de check-in no se ejecutan solo en el dispositivo del usuario: pasan por **funciones almacenadas en el servidor** (base de datos PostgreSQL) que verifican:

- Que el evento sea un ensayo de ensamble válido y no eliminado.
- Que la fecha del ensayo coincida con el **día actual en Argentina** (para registros de integrantes).
- Que no exista un registro previo para esa persona en ese ensayo (registro **idempotente**: un segundo intento devuelve el registro existente, sin sobrescribir la hora original).
- Que los pases QR no estén vencidos, usados o falsificados.

La **marca de tiempo** (`registrado_at`) la fija el **servidor** con reloj de sistema, no el dispositivo del músico. Esto impide manipular la hora de ingreso alterando el reloj del teléfono.

### 6.3. Inmutabilidad del primer registro

La base de datos impone la restricción **única (evento + integrante)**: solo puede existir un registro de ingreso por persona y por ensayo. Una vez registrado, **no puede modificarse ni repetirse** desde la app.

### 6.4. Trazabilidad de metadatos

Además de hora y coordenadas, el sistema almacena:

- **Modo de registro** (GPS o pase QR).
- **Precisión del GPS** en metros.
- **Agente de usuario** del dispositivo (`user_agent`), útil para identificar el tipo de terminal empleado.
- En pases QR: **identidad del compañero prestador** y estado del token (generado, usado, expirado).

Estos metadatos permiten reconstruir el **contexto técnico** de cada registro en una auditoría.

### 6.5. Tokens QR efímeros

Los pases de ubicación se generan con identificadores aleatorios (`ENS-PASE-…`), expiran a los **20 segundos**, son de **un solo uso** y solo pueden emitirse por quien ya registró ingreso con GPS en ese mismo ensayo. Esto reduce el riesgo de uso remoto o reutilización fraudulenta del código.

---

## 7. Supervisión, reportes y control ex post

El módulo **Asistencia a ensayos** (Gestión) permite al personal autorizado:

- Filtrar por **rango de fechas** y **ensambles**.
- Visualizar una **matriz de asistencia** (integrantes × ensayos) con hora de ingreso en cada celda.
- Consultar una **vista detallada por persona**.
- **Exportar** reportes en Excel y PDF para archivo, RRHH o presentación ante organismos de control.
- Verificar en mapa la **coherencia geográfica** de cada registro (pin en Google Maps + distancia a la sede).

Los reportes exportados incluyen la **hora de ingreso** (`registrado_at`).

---

## 8. Por qué constituye un método de control suficiente

Desde la perspectiva del control de asistencia a actividades de ensamble, el sistema reúne las características que la práctica administrativa y la evidencia digital consideran adecuadas:

1. **Objetividad de la hora.** La hora de ingreso la determina el servidor institucional, no el declarante. Elimina la subjetividad de listas en papel o declaraciones verbales.

2. **Vinculación persona–actividad–momento.** Cada registro une un integrante identificado, un ensayo programado en la agenda oficial y un instante preciso. La programación previa del ensayo (fecha, horario, lugar, ensamble) actúa como marco de referencia independiente.

3. **Evidencia geográfica corroborable.** Cuando el GPS está disponible, el registro incluye coordenadas verificables en mapa y distancia a la sede. La gestión puede detectar registros geográficamente incoherentes. Cuando no hay GPS propio, el sistema documenta la modalidad alternativa (pase QR), sin ocultar la ausencia de coordenadas propias.

4. **Mecanismo de respaldo con control.** El pase QR exige presencia simultánea de dos integrantes y ancla el registro a una posición GPS de un tercero presente, lo que mantiene un vínculo con la realidad física del ensayo.

5. **Trazabilidad y no repudio operativo.** Un integrante no puede «re-registrarse» para cambiar su hora. Los metadatos (modo, precisión, user agent, prestador de pase) permiten auditoría posterior.

6. **Reportabilidad.** Los datos son exportables en formatos estándar (Excel/PDF) aptos para archivo, fiscalización y cruce con nómina o convenios.

7. **Equivalencia con prácticas reconocidas.** El modelo —registro digital con geolocalización, hora de servidor y supervisión centralizada— es análogo al empleado en empresas, aplicaciones de servicios públicos y plataformas de teletrabajo regulado, donde la combinación de **timestamp de servidor + geolocalización + auditoría ex post** se considera evidencia válida de cumplimiento horario y presencial.

---

## 9. Limitaciones reconocidas (transparencia)

Para una evaluación rigurosa, conviene explicitar también los límites del sistema:

| Limitación | Mitigación |
|------------|------------|
| GPS impreciso o ausente en interiores | Distancia a sede como control ex post; pase QR con compañero presente |
| Posibilidad teórica de suplantación de credenciales | Acceso individualizado; política institucional de custodia de claves; cruce con convocatoria y supervisión presencial en el ensayo |
| Registro sin coordenadas (fallback) | Queda identificado por modo y ausencia de pin en mapa; gestión puede requerir validación complementaria |
| Distancia no bloquea el ingreso automáticamente | Evita falsos negativos por fallas técnicas; la verificación es responsabilidad de gestión con herramientas de mapa y reportes |

Ningún sistema automatizado sustituye por completo la supervisión humana en el lugar del ensayo. Lo que este sistema aporta —y por lo que se considera **método suficiente de control**— es la **documentación sistemática, horaria y geográficamente respaldada** de la asistencia, con **trazabilidad auditable** y **capacidad de exportación** para organismos de control, en lugar de depender exclusivamente de planillas manuales o testimonios no verificables.

---

## 10. Resumen ejecutivo

El registro de ingreso a ensayos de ensamble de la OFRN funciona así:

1. El integrante **se identifica** en la plataforma institucional.
2. El **día del ensayo**, registra su llegada desde la agenda personal.
3. El dispositivo captura **GPS de alta precisión** y el servidor guarda **hora oficial**, **coordenadas**, **precisión** y **distancia a la sede**.
4. Si el GPS falla, puede usar un **QR efímero de un compañero presente**.
5. La gestión **supervisa, audita en mapa y exporta reportes** oficiales.
6. Cada registro es **único, con hora de servidor y trazabilidad**, apto para control de cumplimiento de la jornada de ensamble.

Este esquema combina **tecnología de geolocalización estándar**, **validación en servidor**, **alternativas presenciales documentadas** y **supervisión institucional**, en un procedimiento coherente con las exigencias de control de asistencia en organismos públicos de gestión cultural.

---

*Documento generado a partir del sistema implementado en la plataforma OFRN. Para consultas técnicas, referirse al módulo Gestión → Asistencia a ensayos.*
