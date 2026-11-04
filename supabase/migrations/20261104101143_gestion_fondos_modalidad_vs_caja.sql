-- Factura y aporte 690 son modalidades de liquidación externa (no caja).
-- Orquesta y reemplazos sí son fondos de caja.

COMMENT ON TABLE public.gestion_fondos IS
  'Catálogo: modalidades externas (factura, aporte_690) y fondos de caja (reemplazos, orquesta). Factura/690 no generan saldo ni deuda al pagar.';

UPDATE public.gestion_fondos
SET
  nombre = CASE codigo
    WHEN 'factura' THEN 'Con factura'
    WHEN 'aporte_690' THEN 'Aporte 690'
    ELSE nombre
  END,
  descripcion = CASE codigo
    WHEN 'factura' THEN
      'Modalidad: el expediente se liquida con factura. No gasta caja propia. Seguimiento: nos deben (pendiente) vs pagado. Rec. < 4.000.000; máx. 35.000.000 (nov 2026).'
    WHEN 'aporte_690' THEN
      'Modalidad: expediente sin factura (aporte 690). No gasta caja propia. Seguimiento: nos deben vs pagado. Máximo 3.000.000.'
    WHEN 'reemplazos' THEN
      'Fondo de caja en cuentas (Leo, Carla, …). Los pagos/gastos con este fondo restan del saldo de la cuenta.'
    WHEN 'orquesta' THEN
      'Fondo de caja de la orquesta (asignaciones). Los pagos/gastos con este fondo restan del saldo.'
    ELSE descripcion
  END
WHERE codigo IN ('factura', 'aporte_690', 'reemplazos', 'orquesta');
