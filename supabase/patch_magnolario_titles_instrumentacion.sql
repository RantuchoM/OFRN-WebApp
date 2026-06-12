-- Parche títulos [Magnolario] + instrumentación calculada
BEGIN;

UPDATE obras SET titulo = 'A Fuego Lento [Magnolario]', instrumentacion = 'Str' WHERE id = 3426;
UPDATE obras SET titulo = 'Barrio Sur [Magnolario]', instrumentacion = 'Str' WHERE id = 3427;
UPDATE obras SET titulo = 'Chacarera Vidalera [Magnolario]', instrumentacion = 'Str' WHERE id = 3428;
UPDATE obras SET titulo = 'Chayera [Magnolario]', instrumentacion = 'Str' WHERE id = 3429;
UPDATE obras SET titulo = 'Comienzo [Magnolario]', instrumentacion = 'Str' WHERE id = 3430;
UPDATE obras SET titulo = 'Como el aire [Magnolario]', instrumentacion = 'Str' WHERE id = 3431;
UPDATE obras SET titulo = 'Coyita mía [Magnolario]', instrumentacion = 'Str' WHERE id = 3432;
UPDATE obras SET titulo = 'El Misquishitu [Magnolario]', instrumentacion = 'Str' WHERE id = 3433;
UPDATE obras SET titulo = 'Gallo Ciego [Magnolario]', instrumentacion = 'Str' WHERE id = 3434;
UPDATE obras SET titulo = 'Huella de los Labriegos [Magnolario]', instrumentacion = 'Str' WHERE id = 3435;
UPDATE obras SET titulo = 'Los Pinta [Magnolario]', instrumentacion = 'Str' WHERE id = 3436;
UPDATE obras SET titulo = 'Mi pueblo, mi casa, la soledad [Magnolario]', instrumentacion = 'Vc - Str' WHERE id = 3437;
UPDATE obras SET titulo = 'Milonga para el Rata [Magnolario]', instrumentacion = 'Str' WHERE id = 3438;
UPDATE obras SET titulo = 'Nacida en agua de guerra [Magnolario]', instrumentacion = 'Str' WHERE id = 3439;
UPDATE obras SET titulo = 'P''al Turco Deb [Magnolario]', instrumentacion = 'Str' WHERE id = 3440;
UPDATE obras SET titulo = 'Se acaba la mufa [Magnolario]', instrumentacion = 'Str' WHERE id = 3441;
UPDATE obras SET titulo = 'Serenatero de Bombos [Magnolario]', instrumentacion = 'Str' WHERE id = 3442;
UPDATE obras SET titulo = 'Viaje a Argüello [Magnolario]', instrumentacion = 'Str' WHERE id = 3443;

COMMIT;
