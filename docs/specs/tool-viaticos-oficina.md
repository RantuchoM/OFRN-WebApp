# Spec: Herramienta de Viáticos Manual para Oficina Externa

## Objetivo
Proveer una interfaz de carga única y manual de viáticos que permita exportar el PDF oficial sin requerir inicio de sesión ni conexión con la base de datos de integrantes de la OFRN.

## Requisitos Técnicos
1. **Acceso Público**: La ruta `/viaticos-manual` no debe estar protegida por el `AuthContext`.
2. **Sin Firma Digital**: El campo de firma en el PDF se exportará vacío para firma ológrafa posterior.
3. **Cálculos Locales**:
   - Días computables automáticos mediante `calculateDaysDiff`.
   - Subtotal = Días * (Valor Base * Factor Temporada * % Viático).
4. **Campos del Formulario**:
   - Personales: Apellido, Nombre, DNI, Cargo, Jornada, Ciudad Origen.
   - Comisión: Motivo, Lugar, Fecha/Hora Salida, Fecha/Hora Llegada.
   - Financieros: Valor Diario Base (editable), Switch Temporada (30%), % Viático (default 100%).
   - Gastos: Alojamiento, Pasajes, Combustible, Otros.

## Mapeo de Exportación
Se utilizará `exportViaticosToPDFForm` enviando un objeto que cumpla con la interfaz esperada por el helper, extrayendo los valores directamente del estado del formulario.

## Estado
- **Ruta pública lista**: `/viaticos-manual` renderiza la vista sin pasar por `ProtectedRoute`/`AppContent` (sin login).
