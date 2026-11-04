# Spec: Gestión → Contrataciones, Expedientes, Fondos y Pagos

## Objetivo

Área nueva en **Gestión** (`/management/contrataciones`) para administrar fondos, productores, expedientes, contrataciones de artistas invitados y **pagos / gastos**. Independiente de FIMBA (`fimba_contrataciones`).

## Alcance temporal (piloto)

- No aplica a giras con fecha de inicio **anterior al 2026-11-05**.
- Feature **habilitada** para piloto con últimas giras 2026; arranque formal posible 2027-01-01.
- Constante: `GESTION_CONTRATACIONES_GIRA_MIN_DATE` en `src/constants/gestionContrataciones.js`.

## Permisos

Mismos que Gestión: `isAdmin` / `isEditor` / management.

## Modelo de datos

Tablas (`gestion_*`):

| Tabla | Rol |
|-------|-----|
| `gestion_fondos` | Catálogo: **modalidades** (`factura`, `aporte_690`) + **caja** (`reemplazos`, `orquesta`) |
| `gestion_cuentas_reemplazo` | Cuentas del fondo reemplazos (Leo, Carla; ampliables). Saldo puede ser negativo |
| `gestion_movimientos_reemplazo` | Movimientos (R, ajustes, redondeos). Monto ≥ 0 permitido incluido 0. Estados: pendiente / efectuado. Varios movimientos = parcial |
| `gestion_fondo_asignaciones` | Asignaciones periódicas al fondo **orquesta** (caja) |
| `gestion_productores` | Catálogo reutilizable; alta también desde modal de expediente |
| `gestion_expedientes` | Contenedor **sin tipo obligatorio**. Mezcla artistas (contrataciones), pagos y gastos. Tildes = **date**. Montos bruto/comisión/misceláneo + destino misceláneo |
| `gestion_contrataciones` | Cachet USD + tasa → ARS; FK `giras_integrantes`; expediente opcional; aéreo + `aereo_detalle` |
| `gestion_pagos` | Concepto + monto + fondo + expediente; **`clase`**: `pago` \| `gasto`; si fondo = reemplazos → **`id_cuenta_reemplazo`** (UI muestra saldo) |

### Modalidad vs caja

| Código | Naturaleza | Efecto al “pagar” |
|--------|------------|-------------------|
| `factura` | Modalidad externa | **No** gasta caja. Seguimiento: **nos deben** (exp. sin `fecha_pago_efectuado`) vs **pagado** |
| `aporte_690` | Modalidad externa | Igual que factura |
| `orquesta` | Fondo de caja | Pagos/gastos restan saldo |
| `reemplazos` | Fondo de caja (en cuentas) | Pagos/gastos restan saldo de la cuenta elegida |

Constantes: `FONDOS_MODALIDAD_EXTERNA`, `FONDOS_CAJA`, `isFondoModalidadExterna`, `isFondoCaja`.

### Reglas

- Contratación anclada a `giras_integrantes` (no `integrantes`).
- Expediente agrupa 0..N contrataciones + 0..N pagos + 0..N gastos. Un aéreo de Juan puede vivir en el mismo expediente que el cachet de Pedro: el aéreo es un **gasto**.
- **Pago** = liquidación/desembolso del expediente. **Gasto** = costo operativo (aéreo, extras).
- Si el fondo del pago/gasto es **reemplazos**, hay que elegir la **cuenta** (Leo/Carla/…); el selector muestra el **saldo actual**. Ese monto resta del saldo de la cuenta.
- Si el expediente/pago usa **factura** o **690**, no se genera deuda de caja: solo cambia el estado pendiente → pagado al cargar `fecha_pago_efectuado`.
- Bruto sugerido: `bruto_base = neto_ars / 0.85`; comisión sugerida = 10% de `bruto_base`; bruto factura = `bruto_base + miscelaneo`. Comisión editable; alerta si &lt; 10% del bruto.
- Misceláneo asignable a fondo/cuenta de **caja** → suma al saldo.
- Aéreos (director/solista no estable): `orquesta` \| `en_cachet` \| `no_aplica`. Si `orquesta`: vuelos + costo; **Registrar como gasto del expediente** (requiere contratación ya asociada a un expediente) → fila `gestion_pagos.clase='gasto'`.
- Cuentas: saldo = movimientos efectuados + misceláneos a cuenta − pagos/gastos con esa cuenta.
- Mail lunes facturas: `filarmonica.scrn@gmail.com` (fase posterior).

## UI

- Tabs (barra subrayada, no chips): Fondos / cobros \| Cuentas \| Expedientes \| Contrataciones \| **Pagos / Gastos** \| Productores.
- Pestaña Fondos: bloque **Liquidación externa** (nos deben / pagado) y bloque **Fondos de caja** (saldo).
- Expedientes: sin columna tipo; columnas Pagos y Gastos; modal con clase en cada movimiento; productor creable in-situ.
- Pagos/gastos con fondo reemplazos: selector de cuenta con saldo.
- Selectores de fondo etiquetan `(modalidad)` vs `(caja)`.
- Contrataciones: aéreo → gasto del expediente (no expediente “transporte”).
- GiraRoster: ícono gris+alerta sin fila; ámbar sin aéreo; violeta OK.

## Archivos

| Área | Path |
|------|------|
| Constante | `src/constants/gestionContrataciones.js` |
| Servicio | `src/services/gestionContratacionesService.js` |
| Vista hub | `src/views/Management/ContratacionesHub.jsx` |
| Migraciones | … `20261104101143_gestion_fondos_modalidad_vs_caja.sql` |

## Checklist

- [x] Spec viva
- [x] Migración tablas + seeds + deploy linked
- [x] Hub + palette + roster
- [x] Aéreo detalle + gasto en expediente (no tipo transporte)
- [x] Vista tabular + modal; calculadora bruto; comisión; misceláneo
- [x] Diferenciar pago vs gasto (`clase`)
- [x] Expediente sin tipo obligatorio
- [x] Pago con fondo reemplazos → elegir cuenta + saldo
- [x] Factura/690 = modalidad (nos deben / pagado), no deuda de caja
- [ ] Hook automático movimiento al marcar R
- [ ] Cron mail lunes facturas
- [ ] Plazos por paso del ciclo (futuro)

## Fuera de alcance

- FIMBA contrataciones / Sheet sync.
- Viáticos / prestaciones.
