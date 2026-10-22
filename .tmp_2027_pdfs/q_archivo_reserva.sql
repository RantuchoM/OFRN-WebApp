select u.id as user_id, u.email, u.rol,
       r.id as reserva_id, r.codigo_reserva, r.estado, r.cantidad_solicitada,
       r.qr_reserva_token, c.nombre as concierto, c.slug_publico
from entrada_usuario u
left join lateral (
  select *
  from entrada_reserva r0
  where r0.usuario_id = u.id and r0.estado = 'activa'
  order by r0.created_at desc
  limit 1
) r on true
left join entrada_concierto c on c.id = r.concierto_id
where lower(u.email) = 'ofrn.archivo@gmail.com';
