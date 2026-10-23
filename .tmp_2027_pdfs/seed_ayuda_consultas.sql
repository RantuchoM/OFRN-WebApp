insert into public.entrada_ayuda_consulta
  (nombre, email, telefono, cantidad, concierto_id, funcion_label, comentarios, estado, created_at)
values
  ('Claudia Tejeda', 'tejedaclaudian@gmail.com', '2920404095', 2, 21,
   'Brillo y Tempestad — SÁBADO, 24 de octubre de 2026 · 10:30 a. m. · 49% disponible',
   'No llega el código al correo', 'pendiente', '2026-10-22 19:35:00-03'),
  ('Alicia Eguia', 'alijo92.eguia@gmail.com', '2920470753', 3, 21,
   'Brillo y Tempestad — SÁBADO, 24 de octubre de 2026 · 10:30 a. m. · 48% disponible',
   null, 'pendiente', '2026-10-22 20:04:00-03'),
  ('Mariele Peralta', 'marieleperalta@gmail.com', '2920605836', 1, 20,
   'Brillo y Tempestad — VIERNES, 23 de octubre de 2026 · 08:00 p.m. · llena',
   'No puedo ir el sábado', 'pendiente', '2026-10-22 20:21:00-03'),
  ('Patricia Guerrisi', 'epguerrisi@gmail.com', '1141626315', 2, 21,
   'Brillo y Tempestad — SÁBADO, 24 de octubre de 2026 · 10:30 a. m. · 45% disponible',
   'No aparecen números de código', 'pendiente', '2026-10-22 20:25:00-03'),
  ('Ana Graciela Seijas', 'agseijas@live.com', '542920564113', 1, 21,
   'Brillo y Tempestad — SÁBADO, 24 de octubre de 2026 · 10:30 a. m. · 44% disponible',
   'Intento por la web y no me envía el código', 'pendiente', '2026-10-22 20:31:00-03'),
  ('Elisabet Berrojalbiz', 'berroeli@gmail.com', '2920445840', 1, 21,
   'Brillo y Tempestad — SÁBADO, 24 de octubre de 2026 · 10:30 a. m. · 44% disponible',
   'Quiero una entrada. Gracias.', 'pendiente', '2026-10-22 21:01:00-03'),
  ('Patricia Guerrisi', 'epguerrisi@gmail.com', '1141626315', 2, 21,
   'Brillo y Tempestad — SÁBADO, 24 de octubre de 2026 · 10:30 a. m. · 43% disponible',
   'Me da código inválido el número 90176678', 'pendiente', '2026-10-22 21:09:00-03');

select id, nombre, email, cantidad, concierto_id, left(comentarios, 40) as comentarios
from public.entrada_ayuda_consulta
where estado = 'pendiente'
order by created_at;
