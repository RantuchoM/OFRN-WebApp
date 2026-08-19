-- Roles Boletos y Boletos+Recepc: valores de enum.
-- Deben quedar en transacción propia: Postgres no permite usar un valor
-- recién agregado (SQLSTATE 55P04) en el mismo bloque.

alter type public.entrada_rol add value if not exists 'boletos';
alter type public.entrada_rol add value if not exists 'boletos_recep';
