-- Patch Drive URLs lote Archivo-para-organizar
-- Generado: 2026-10-31
-- Carpetas vistas: 146; obras a parchear: 34; aún sin carpeta: 0

BEGIN;
-- queen-ribero

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1Pmu9K4wdN41jUHdJd5fhzAwPTZjppaq7'
WHERE observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND titulo = '<p>Compilado Queen</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MxV1klNXc8HmR8ficXdFLOnOgxfts-jT/view?usp=drivesdk","description":"Arpa - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10RkZ7czEQakawkU5DnZY3kFKS7XeQfUD/view?usp=drivesdk","description":"Clarinete Bb 1 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Pp1pLBHFC5o_SkDX1sGQyqGcJuY_0QcR/view?usp=drivesdk","description":"Clarinete Bb 2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1aClLxNoP9eOW9Dzt73ANDSkMofnHj6aj/view?usp=drivesdk","description":"Contrabajo - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SImpr5W8UYTYmHAPpMrCtvx1T1xs59Ff/view?usp=drivesdk","description":"Corno F 1y2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SImpr5W8UYTYmHAPpMrCtvx1T1xs59Ff/view?usp=drivesdk","description":"Corno F 1y2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rENE5l9C7U9OCxLUMt8imSLQ1wc35W2n/view?usp=drivesdk","description":"Corno F 3y4 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rENE5l9C7U9OCxLUMt8imSLQ1wc35W2n/view?usp=drivesdk","description":"Corno F 3y4 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1VKYilkxK-cSfe0upSHhaACmETW5E3hnt/view?usp=drivesdk","description":"Fagot 1 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/143GvchYD_OTyLuXsMheEY2LCZ8LEeW60/view?usp=drivesdk","description":"Fagot 2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1xNiAV9d5ctMUkomeqMdW4bM2DDyHKY6h/view?usp=drivesdk","description":"Fl Piccolo - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iCtYWpkEzuv-o8bY1KE4S361jR6OybR1/view?usp=drivesdk","description":"Flauta 1 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TaG3EUrSjXaSzLUGXwclTufgTkL1qcMj/view?usp=drivesdk","description":"Flauta 2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KD0o99HXpHmAEREBMKzlL7jgkb64wh9N/view?usp=drivesdk","description":"Oboe 1 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ehOr45ZggkRUEGqeLTOrNgQXkA-JT3qW/view?usp=drivesdk","description":"Oboe 2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yyY1KrniCWpNgk6YEdLvvRlyb2dubp7Q/view?usp=drivesdk","description":"Perc Percusión - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/182z8LlY6cy21l9duVG1zQrv0cqTtVC6Q/view?usp=drivesdk","description":"Perc Timbal - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1tTubuYNaAc3ulfpuQiukP4P4KApf5YPd/view?usp=drivesdk","description":"Trombón 1y2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1tTubuYNaAc3ulfpuQiukP4P4KApf5YPd/view?usp=drivesdk","description":"Trombón 1y2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-q4LAl4XLgH5FaV4utOsG-H69eZqMz8c/view?usp=drivesdk","description":"Trombón 3 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17JMxAXW31v2ByQ1fdeeeEt7VNKAeeY3K/view?usp=drivesdk","description":"Trompeta 1 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oGwkHpy-JIwLhy3_FjyPtFMKJFV4ZjyB/view?usp=drivesdk","description":"Trompeta 2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MLfWwY4bS2KxLPQ8y9M8VpYr4GKSdtvN/view?usp=drivesdk","description":"Tuba - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13e1wRleibBlW05gWqqptDqrQWW7zwGnM/view?usp=drivesdk","description":"Viola - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZvfrLIRJacAK40yB7aAUZ_cOvbWAitSo/view?usp=drivesdk","description":"Violín 1 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lMhhrNWnNIzZyNt5ExsVGroW35gVbTHA/view?usp=drivesdk","description":"Violín 2 - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iVYFWcdZqTH7ZA3blYpjtG2Keb4yyCNX/view?usp=drivesdk","description":"Violoncello - Compilado Queen - Ribero, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.'
  AND o.titulo = '<p>Compilado Queen</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- hook-neverland

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1Gazje2GcjQpvd9qos-jfX4ajDswbX1IM'
WHERE observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND titulo = '<p>Hook — The Flight to Neverland</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1xSPLFY2Iuy_ELUMsaIWC1vFa7SyDTqye/view?usp=drivesdk","description":"Arpa - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KkP688OA4kWRG6sKQSWf1WyDbdwHcGRb/view?usp=drivesdk","description":"Clarinete Bajo - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/14MexHgCUWlTQEZeYGqZwDOtUMX7Szgp9/view?usp=drivesdk","description":"Clarinete Bb - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Clarinete Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zkE6VpN6oBFSyRLIdb9NoGAWgrxlMjVE/view?usp=drivesdk","description":"Clarinete Bb 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1i3W1WktopZjYrWQctuBFtxRiS3ijTLFr/view?usp=drivesdk","description":"Clarinete Bb 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1c4V1ki8ctXxrjIYTkdGgDdBrXxV5RIqy/view?usp=drivesdk","description":"Contrabajo - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NbFt6O_l0RmXWh2RORGJT_m0L6KRGAbv/view?usp=drivesdk","description":"Contrafagot - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12KTAYjmLYBiypG4vbLOuL_E6pZN3k6v4/view?usp=drivesdk","description":"Corno F 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12Ilb03KhxG04VEWYyheqA1GiLbwvHfgt/view?usp=drivesdk","description":"Corno F 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DTRm2AKSnPccXNmGGhZhg9RcjiSw1Inm/view?usp=drivesdk","description":"Corno F 3 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e30PDO8F4QVRA-GiMYTdYpmnOgoqrYEx/view?usp=drivesdk","description":"Corno F 4 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ejstrOS1L2mFtKXhmypFUxuOBsGmyZZe/view?usp=drivesdk","description":"Fagot 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12f3A1H9ygmS1WPYT9-txKXeTbAhAWffp/view?usp=drivesdk","description":"Fagot 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e9c5dCh4RFQa5fCjeINtod48oc1KBaqX/view?usp=drivesdk","description":"Flauta 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1H6OMxHUrMGJm_ikp_7ZXRr7M11rFf30K/view?usp=drivesdk","description":"Oboe - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bJRE-GLwT9Ph2NTfPAaARauoiY3QJC6d/view?usp=drivesdk","description":"Oboe 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1N4bcfoa0YrXZEc8MFyZsE2KE1HHoxIYJ/view?usp=drivesdk","description":"Oboe 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1i7cj0X_IuDYlCr1f9AZhuNSgHQ1g8g9P/view?usp=drivesdk","description":"Perc Percusión - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WlqvwtNFy997F_xSysTU6fZmIARZBbcm/view?usp=drivesdk","description":"Perc Percusión 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1okbYIWgV1UZd2pxzHwYNn5TVTj9WJRZU/view?usp=drivesdk","description":"Perc Percusión 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Yn41RJaQEMViPHvggRX-F4B1eB2sBCnB/view?usp=drivesdk","description":"Perc Timbal - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/198kCni52nJDnhJ7kzoTpcwVmWLhyegBe/view?usp=drivesdk","description":"Piano - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CD-O8ZY91gMKHdca6y6TSf-ssMvVxfiw/view?usp=drivesdk","description":"SCORE - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12JpinTUAdqGmmxSMljOmoHS13w6lkSS7/view?usp=drivesdk","description":"Trombón 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-PPxKifssI0i_ctBXh0yqDh6vwUFxR7Z/view?usp=drivesdk","description":"Trombón 3 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1I2lU_eIU04VtTUVYaBNnty9TYX-4udKy/view?usp=drivesdk","description":"Trompeta Bb 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Trompeta Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Ni4XQ0v-h28jhc6AriYoJrppHklOBXs5/view?usp=drivesdk","description":"Trompeta Bb 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Trompeta Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1E2AzOxQqCfStw7_A8Y9Dwrzs08QuRViC/view?usp=drivesdk","description":"Trompeta Bb 3 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Trompeta Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TnTIuoMzgYQn4zJRosuZLBQEIrkEzzQN/view?usp=drivesdk","description":"Tuba - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BPmceGN4EjSY_cduwAaxRUrYcTAmEhsy/view?usp=drivesdk","description":"Viola - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rAfEDIzZGZRCY1wnfv5tXPgzfyZyMEsl/view?usp=drivesdk","description":"Violín 1 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1W2aSuoiQsJQpMpwf-1VCETjfvexrn6BS/view?usp=drivesdk","description":"Violín 2 - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ELXcROw7pwvk6qDX8p0Tnnq8UMQYlypC/view?usp=drivesdk","description":"Violoncello - Hook, The Flight to Neverland - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).'
  AND o.titulo = '<p>Hook — The Flight to Neverland</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- jurassic-mundo-perdido

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=14LcIw4zf1H-CU0Qccw5jRXbr5ssVlYsi'
WHERE observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CyUR1-D_u565a1KllSqEdtqYeVyU3_gV/view?usp=drivesdk","description":"Arpa - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BphjStxA9iGaToGMfQJdO_mirIFCAtyI/view?usp=drivesdk","description":"Clarinete Bajo - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dpsFENGGfx31GTbqdOAmqqakeGqeYnD5/view?usp=drivesdk","description":"Clarinete Bb 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yvVXfJEBSkhA_yGS-TyroyJKc3aIV_4V/view?usp=drivesdk","description":"Clarinete Bb 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yPeT9hothcSRj_4PioSnZ99hDCsnyGGX/view?usp=drivesdk","description":"Contrabajo - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16CApS1NO-L7Qnl1rFavl5CvrFRsnnzz_/view?usp=drivesdk","description":"Contrafagot - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IqKEeAZ7dI1R4S2W0sdX9_B3Fp0rn2xj/view?usp=drivesdk","description":"Corno F 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10IeT1Wk7XhQDjSmshm-fpps-WN81Pb6P/view?usp=drivesdk","description":"Corno F 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1krIhTjFpZrEM-kx3O9wAiGKup5E6dhiw/view?usp=drivesdk","description":"Corno F 3 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1R0tw0HY4LPtmvgU9VCKCoulgp4PXI_uw/view?usp=drivesdk","description":"Corno F 4 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NxV0HZ_4RHHB8oS980mUtcCZ3Y3O3rBy/view?usp=drivesdk","description":"Fagot 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1YLjD85gEFRc466voAwiv6J5MXfTr5LKV/view?usp=drivesdk","description":"Fagot 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1T-HKIMrxICkZJChUXR1qCADC75OdfFcV/view?usp=drivesdk","description":"Fl Picc - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Fl Picc'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1FzKT8pnQTR3Z40xgnJbfdwdjw063Vhr4/view?usp=drivesdk","description":"Flauta 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1FOwXkojkTcOdr7vOkZFfNLqUU4axKsoR/view?usp=drivesdk","description":"Flauta 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rSHzx2JDkoi1KPqZNEX8Oj4RaALIwniH/view?usp=drivesdk","description":"Oboe - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15UPEyT7je6gWqqcd6XxKqtflBkQVfCz2/view?usp=drivesdk","description":"Oboe 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WHk_p4C4wen9_4-oRgBpCd8IRun3F2Qp/view?usp=drivesdk","description":"Oboe 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1y-3sqkt_tQmjVt9Bg6RNR-9s4pGbxYrg/view?usp=drivesdk","description":"Perc Percusión - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ShTtHg2AKfi5yawT8Ylr21nyoAYWHxpC/view?usp=drivesdk","description":"Perc Percusión 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mPozd0nyx6LJWpTrRnARaIpvsLKo2-ev/view?usp=drivesdk","description":"Perc Percusión 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_bp58hsyQCK0gyBjkkfA99nSymR9gOe2/view?usp=drivesdk","description":"Perc Timbal - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15fYhytFPiw693ytiVSmKDolY-OKPeBf1/view?usp=drivesdk","description":"Piano - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17_-AXW6Hgccr70ou_A6TGgns6VmcoN9Q/view?usp=drivesdk","description":"Trombón 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WPgJf2cupQbwN7tHpNVnBPrXE0E4meNv/view?usp=drivesdk","description":"Trombón 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1feUDdHfvg3XgJtHLvygwuPLC6F5zVflw/view?usp=drivesdk","description":"Trombón 3 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19M7H8m62zxlHRiT_C5VdsMEcSaNzcjeP/view?usp=drivesdk","description":"Trompeta Bb 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Trompeta Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1n0nbPb1vwT21-DgxeSfWdJzavkRR7YYr/view?usp=drivesdk","description":"Trompeta Bb 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Trompeta Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JeJWT7xlolcTpIDTj8Gqu9Z1urynQaWx/view?usp=drivesdk","description":"Trompeta Bb 3 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Trompeta Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11vOsoMEntWeB0BrhoyOnmQLODz0nWgE4/view?usp=drivesdk","description":"Trompeta Bb 4 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Trompeta Bb 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wYXVTAI-c1Ppd5Dp6EcdhO_mxsm7iX6l/view?usp=drivesdk","description":"Tuba - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Sqanyq-Zr21qUGZEqIdAmvy44FgG5jmd/view?usp=drivesdk","description":"Viola - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1czSwoXa23YLgwzF5yWOAs5LTyBTv0Tqv/view?usp=drivesdk","description":"Violín 1 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ErT5s2Tf4iB2F6YpyKKwi18KUaeTfgTD/view?usp=drivesdk","description":"Violín 2 - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GU_7WwycoRLkpnUl_w9CvFtRwEZaEg3c/view?usp=drivesdk","description":"Violoncello - Jurassic Park, El Mundo Perdido - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.'
  AND o.titulo = '<p>Jurassic Park — El Mundo Perdido</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- jurassic-highlights

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1gkUdfooVOHNqn-irdk7Z8NF5rgjZdeiB'
WHERE observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND titulo = '<p>Jurassic Park, Highlights</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OWcjoD3VRLRXlYxEI_Yb1Fgbu--mpINf/view?usp=drivesdk","description":"Clarinete Bajo - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DswiFmwwwwZZaxfu6beYL_9CUFlroXLa/view?usp=drivesdk","description":"Clarinete Bb 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1P_A_RTmvZ_iTLPOWlLR9RLCZcJsh2xDN/view?usp=drivesdk","description":"Clarinete Bb 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-4my7M8N9NbWp3097ZBSxf_evo0s61Dk/view?usp=drivesdk","description":"Contrabajo - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oEEe2oah-1v_ODI6JpDyOkRDlhyhi5q_/view?usp=drivesdk","description":"Corno F 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1EnAih9CfvYhPBOcsgTSlp1ZOy5BCACBF/view?usp=drivesdk","description":"Corno F 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1N_q5P9hZ6xE_jXw_tmJyB-4bcKZRteHT/view?usp=drivesdk","description":"Corno F 3 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iQUyF4rBEIwy-h06X72LZhvfdfWpuViH/view?usp=drivesdk","description":"Corno F 4 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hGPgAgHdamDT5m2ODI5bQVzijDvfM6Xa/view?usp=drivesdk","description":"Fagot 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1QaHFah8Po30rY0nbRHAgLQrUwSkWWUDN/view?usp=drivesdk","description":"Fagot 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1F5TYKTnVWwVE31W2luM_AqRONf7Z6r38/view?usp=drivesdk","description":"Fl Piccolo - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pk73G8ZEBku6eDrm2mqBhoL44_OZTOdZ/view?usp=drivesdk","description":"Flauta 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mGC2ZJTJLl58EuaZFphe4y3KCQKAqyjr/view?usp=drivesdk","description":"Flauta 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1457zqu0gHZVQD38wUtYf2X2T3SL9kHVx/view?usp=drivesdk","description":"Oboe 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1E0czXKyLzNnyZ_sP4W07Q3bchyLV4fA1/view?usp=drivesdk","description":"Oboe 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mu8VhPaV7sNNPsW78lUmEZsnmetabF3N/view?usp=drivesdk","description":"Perc Percusión - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1p_KqHLVuCNS4tBk_msMxlXBl8iEgyIWt/view?usp=drivesdk","description":"Perc Percusión 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wNPR6cQq22h0w7a676n5Hp4jaychjr4m/view?usp=drivesdk","description":"Perc Percusión 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Yu68lynCYLxT0xXN5KPZhxZrf6akSyVs/view?usp=drivesdk","description":"Perc Timbal - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eZyrbCmi4tjzIH2Aco0R25uY8an028Hu/view?usp=drivesdk","description":"Piano - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Byc2gJDfzA5NAeAYOnEAuuPqw_7ML0pF/view?usp=drivesdk","description":"SCORE - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1n8DvPYCT7YFEw9bh-9M1AxtM2HV9vBrk/view?usp=drivesdk","description":"Trombón 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iLh0xIZRWY1ptszVQNih6UP7jBfbNeIO/view?usp=drivesdk","description":"Trombón 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Awl4zyYv5KvL3D0o5M8AS1Kuamwqmo9R/view?usp=drivesdk","description":"Trombón 3 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18YneJHZqfKhGvHSQVmGhb7pb-Wqmw6-m/view?usp=drivesdk","description":"Trompeta Bb 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Trompeta Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ubnzsb5cmmsUQ-knc9b8Y6b9bTetAQT5/view?usp=drivesdk","description":"Trompeta Bb 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Trompeta Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15palFJoMYUHggJwkoO1qTdJY2ucP5o8v/view?usp=drivesdk","description":"Trompeta Bb 3 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Trompeta Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1QmFm-26gS0L40xTU5rgnyn4bBO8GRP_o/view?usp=drivesdk","description":"Tuba - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10KRVyNgBwApTkb7xrsZCZAvG3LYsnlR7/view?usp=drivesdk","description":"Viola - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TM9vLn6jU9PWrVv-T652FEHpZGq668FR/view?usp=drivesdk","description":"Violín 1 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pTTPZzijN4a1-XsrMORpDYW1Mm8YqyxB/view?usp=drivesdk","description":"Violín 2 - Jurassic Park, Highlights - Williams-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Falta Violoncello en el set original.'
  AND o.titulo = '<p>Jurassic Park, Highlights</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- mision-imposible-custer

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1pVbSTphGgMCzxolVzlG8paAuC9lXk22P'
WHERE observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND titulo = '<p>Misión Imposible</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1VdySx4PCiewDUSlI4iQLGykvDUVv9hSy/view?usp=drivesdk","description":"Clarinete Bajo - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17rQAhZjn2fz3JtQieyDh1jY87oa_Jv3g/view?usp=drivesdk","description":"Clarinete Bb 1 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TKp1ZHdBes4TITiBYPvWR5nGiGj4cyS6/view?usp=drivesdk","description":"Clarinete Bb 2 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1jpi8nzaqTthTejg9-uCzFyxETZqr5iE5/view?usp=drivesdk","description":"Contrabajo - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-WlGyQpcb74MApwJbTuqjQbPI40F0RTB/view?usp=drivesdk","description":"Corno F 1 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Ny4va_i7XyhzrVLe0ZpbGEfz7dUX7EDu/view?usp=drivesdk","description":"Corno F 2 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1w6XXsqwdnmJYm6cPVnlxjQl4mRBqtIDw/view?usp=drivesdk","description":"Corno F 3 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yTw9T-PSk-zje9GUQBJ60_dJFhGNqDHJ/view?usp=drivesdk","description":"Corno F 4 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1l8WSj5zto1FiIadKCM9l-w9ScBAmNuad/view?usp=drivesdk","description":"Fagot - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Fagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1tWAaDQHm28pefRLmAwFWWTtCOZexy830/view?usp=drivesdk","description":"Flauta 1 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hvePRbYwt97ykqZhUxi4CH7tGSDBAkg-/view?usp=drivesdk","description":"Flauta 2 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iclsTV6wFXT5bplVlvYbFyQP0Y_COmx9/view?usp=drivesdk","description":"Oboe - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kPiOFm3hYMo4KUZkNuV3u4oAJ72EWqbF/view?usp=drivesdk","description":"Perc Percusión 1 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yBh0PkhXLpkECAo_ymZQkV2rdTtX_EPW/view?usp=drivesdk","description":"Perc Percusión 2 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lG4rGsrdjNzZngesNOof1PYeADFqfRhQ/view?usp=drivesdk","description":"Perc Timbal - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1InLtae0YIugp1S3HCmPR3gm32Kt5ZQko/view?usp=drivesdk","description":"Piano - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IJ3qCjoS4uNRXz1ojiEmR6ZKV3158Cdz/view?usp=drivesdk","description":"Trombón 1 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LQy390n7nro7MlmipZ8GHPMyxQbaD9Di/view?usp=drivesdk","description":"Trombón 2 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1xXIv5aP18RTmTjwEKmP7UY-NAy7lg50e/view?usp=drivesdk","description":"Trombón 3 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vLRTiTnppC0EQq7es3gl2cFNa5PmWs8w/view?usp=drivesdk","description":"Trompeta 1 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1V4rkL3hPmxBcFvi6K5-BoyAkhZYyK4ob/view?usp=drivesdk","description":"Trompeta 2 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IgGhmQKxhEmlQDNvdyP8YgtanQhDWqIx/view?usp=drivesdk","description":"Tuba - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11UazGvjfjXmxz2IaKKACyU-81fJt3QvW/view?usp=drivesdk","description":"Viola - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1V8r5Bcttv95eb2JmTYRQyt5idy1kggly/view?usp=drivesdk","description":"Violín 1 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZqLTFCzA_wTPcu2ZQ6-T7t2zodCS-yX6/view?usp=drivesdk","description":"Violín 2 - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10AmY06btwHSLwZOSPz2Fwt_1K_nDUZip/view?usp=drivesdk","description":"Violoncello - Misión Imposible - Schifrin-Custer.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.'
  AND o.titulo = '<p>Misión Imposible</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- macondo

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1GdmewIyv_OTi6zoev09PNjAvYLv7j2ou'
WHERE observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sLli1SFCWTXN626mMVJht8SpEIac_J4X/view?usp=drivesdk","description":"Clarinete Bajo - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-DCNG4fKpUbkSqrZvzB3nYH3OvIk6a_k/view?usp=drivesdk","description":"Clarinete Bb 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RxQxvwjRAmgKEkjYXFggIAEjlmJffaDy/view?usp=drivesdk","description":"Clarinete Bb 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NPFnMT1riH1_ZfYJmoB4XoVJDjA6p-Gw/view?usp=drivesdk","description":"Clarinete Bb 3 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-06MqMQ1_oFyrTmHAL-xpOmoWRwjy10-/view?usp=drivesdk","description":"Contrabajo - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19c4gkZ4dHueGdGE4LJVzMKqEXcQQWPFF/view?usp=drivesdk","description":"Corno F 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IfgCB1mgb5oPM4ZlMlXhBpO-MaZ04Zar/view?usp=drivesdk","description":"Corno F 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18hWXkRvV8yq7u6p0EKYO723mrNwqWJdF/view?usp=drivesdk","description":"Corno F 3 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vZB9l0Wmy_2kQeHFu8_FySXVzcevfwex/view?usp=drivesdk","description":"Fagot - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ISIPs4xCKHqiMUEMI1CuXWTyZMslP6zD/view?usp=drivesdk","description":"Fl Piccolo - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PJ2bOEhi0VqXqU5-x-VLaqYhERaGlSMw/view?usp=drivesdk","description":"Flauta 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nd9NqBFhHjLCTtzgEfh01XI5ezm3NT0G/view?usp=drivesdk","description":"Flauta 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Y0x6iHNscLpRfhsSvCRX9CBeu9oMxsk1/view?usp=drivesdk","description":"Oboe 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GQxWyCP1pTXo0qhVW1H1waiSm7EL6MeN/view?usp=drivesdk","description":"Oboe 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18Y0bhIO8r1li6qvFDrtXnedBCxJknAlE/view?usp=drivesdk","description":"Perc Percusión 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11--8lZL9mMx5MS00OhmakRs3FySBOF_Y/view?usp=drivesdk","description":"Perc Percusión 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1klZJonsX6Hc6j_z69olBXwwbCLfPq0cB/view?usp=drivesdk","description":"Perc Percusión 3 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zETmte-rXk16RD5akZaGnzispCgHhkZr/view?usp=drivesdk","description":"Perc Percusión 4 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OPBNNCA_x3ZAE6GHwjApCwmSpCoeKtcp/view?usp=drivesdk","description":"Perc Percusión 5 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 5'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1EZQiIAiPmgumXN9XfxVUT8OsF0mO9d4D/view?usp=drivesdk","description":"Perc Percusión 6 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 6'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zwbrN5SSaxjXej8xQ3_v36dxLu2qJZBB/view?usp=drivesdk","description":"Perc Percusión 7 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 7'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18n4TzCXxxi4c65QuHmHm1OlxV4HVTUYh/view?usp=drivesdk","description":"Perc Percusión 8 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 8'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AlDmL1x35K6-kQPZ2ZbTHqfivn-Qb_-M/view?usp=drivesdk","description":"Perc Percusión 9 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión 9'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OONPxOn3DqOdTB0nD5v6HWbSqTPhKTGh/view?usp=drivesdk","description":"Saxo Alto 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qzfgApWFDG__VMrArw6kH_AEY2km7NaX/view?usp=drivesdk","description":"Saxo Alto 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JP23Yo1Zm3tq6wSGU_LIYg2ssRX0zj4Q/view?usp=drivesdk","description":"Saxo Tenor - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Tenor'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dEFGnH5axDtcp-1mIKpZdmHc5GsGbjX_/view?usp=drivesdk","description":"Saxofón - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxofón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1InhY3ti0gXC7XMc9_cBbKNOUo-pEqt0v/view?usp=drivesdk","description":"SCORE - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1QY5TPeNp29V7fgku5uUZT-FUUqjZKGsi/view?usp=drivesdk","description":"Trombón 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bRtHNB4Kz48w9EmHdN_Eq9aBn2giat2S/view?usp=drivesdk","description":"Trombón 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rPFMKkaTlr2mSfzArTaDPPjnSWpd6S-L/view?usp=drivesdk","description":"Trombón 3 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wElIqfekYs4Ez4rmMgVcmVxx5XShVUnL/view?usp=drivesdk","description":"Trompeta Bb 1 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1G91bmp3i2-JirAYpnltf9i6tni7p4jyM/view?usp=drivesdk","description":"Trompeta Bb 2 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1K-8weZI0cjNac_qcz86oOzmExfvsxddE/view?usp=drivesdk","description":"Trompeta Bb 3 - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u0VyjWoc5OpvBnYTDQ_gZM1S3XwXTSse/view?usp=drivesdk","description":"Tuba - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZHEKKi6UrPzBr-a-HA_njKLOxKf_7X8K/view?usp=drivesdk","description":"Violoncello - Macondo [banda] - Trad.-Gerez.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).'
  AND o.titulo = '<p>Macondo</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- leon-bambuco

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1oSrPX5LVG_V64WuR0tQuAReryulta2GK'
WHERE observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cBig_kmWuOrWnaNiUlGu6ZqQGZX0s5jS/view?usp=drivesdk","description":"Barítono - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Barítono'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17ZZZv_WzT3ChnOmnlo0WfUtDoH5bbCO2/view?usp=drivesdk","description":"Clarinete Bajo - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uOfwkpfrvuO3o96y1SvbCL7FwgmfQiVj/view?usp=drivesdk","description":"Clarinete Bb - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1syG03c9DrRYPuL3lHCoENt1lhnsmZc4A/view?usp=drivesdk","description":"Clarinete Bb 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1INArCao-9v7zuX7lIzKdTf7Um36USila/view?usp=drivesdk","description":"Clarinete Bb 2 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1f_W-VthrSq0pQCNflEYEZgjje5DlNkha/view?usp=drivesdk","description":"Clarinete Bb 3 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1gGw_af1D6SFfjB5qkB6C82jKMd_7KUY2/view?usp=drivesdk","description":"Contrabajo - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16EMpO7Oa13oCFOYB2Do3XqEvyAfZev89/view?usp=drivesdk","description":"Corno F 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Qx_5YiK6n19JlLO0YHFQslyA7QInHg73/view?usp=drivesdk","description":"Corno F 2 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DprSBQkq8DAwwp1vjuRjgix-3CtcW_BW/view?usp=drivesdk","description":"Corno F 3 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IR9tdIFTpuFrZ7AaTsBCFLGR72ik-Ht-/view?usp=drivesdk","description":"Corno F 4 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KCowZD9R4Ezmn8mUQW35jIRQsys5b56o/view?usp=drivesdk","description":"Fl Piccolo - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nG1SguZn2lI8q1k55p6JGoSqwYmwiBZM/view?usp=drivesdk","description":"Flauta 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11dmEWegUSfr6pRujQi6Th-YVgtUSpXBz/view?usp=drivesdk","description":"Flauta 2 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MehXF9x7xyp4FzTF5UVJK2uTaCLmNyTk/view?usp=drivesdk","description":"Oboe 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1js2nb1h_rAyNhBilmfdiNDAxG5fNHAIx/view?usp=drivesdk","description":"Oboe 2 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Xi07PUxyd2L--LWOfjIAE55MfiZDx3Uv/view?usp=drivesdk","description":"Perc Bombo - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1s54ardufEPDcbJ8fdRRUtgoUsbnYFM2q/view?usp=drivesdk","description":"Perc Percusión - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HHb-NUYP-TcSPZgx8hjYazZSKF4VmcjN/view?usp=drivesdk","description":"Perc Tambor - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Tambor'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pVIHZhd9Ra7KuHVkD7PNdBWfTpt5Pwv3/view?usp=drivesdk","description":"Perc Timbal - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1YdfKqU7WgZA7ZN0VUcXhJhCixu7KpXwX/view?usp=drivesdk","description":"Saxo Alto 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PlSin9CUSp3E9AJzhJOxz8lIK78V5uGx/view?usp=drivesdk","description":"Saxo Alto 2 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1akgLphraa3qEh0fDHT5dbS0JiRhr6nVd/view?usp=drivesdk","description":"Saxo Barítono - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Barítono'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13gfu03neCoHa_o8V4eHm5-kUppga-0KX/view?usp=drivesdk","description":"Saxo Soprano - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Soprano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lwfEe3NzgeJOILagYl_wB-nydUaw5_AB/view?usp=drivesdk","description":"Saxo Tenor 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Tenor 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1xtLyQ0o4-fjsQikWibxump4iv9_wejJq/view?usp=drivesdk","description":"SCORE - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TJT2Ik7r_oGkSI1y2UBYsMJ_meOEg-fU/view?usp=drivesdk","description":"Trombón - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HStokuSyArYSbPjtJw9rQDq3Ke8FtOU6/view?usp=drivesdk","description":"Trombón 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bUK0KjcXLTzMfClIMxlYK6dtxYMC9EuO/view?usp=drivesdk","description":"Trombón 2 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kcs6kMQMsno_EISJ3coASVr684uegmgA/view?usp=drivesdk","description":"Trombón 3 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u494YBlvdL586cLPTY70uxSIWi2j8RH0/view?usp=drivesdk","description":"Trompeta - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ydTYufzshataLXVXvmCfKjc49z38YtxT/view?usp=drivesdk","description":"Trompeta 1 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iMHXRdiSS-rB8GfCOx9m8JGfsQhs7Hz3/view?usp=drivesdk","description":"Trompeta 2 - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1puojs76ej9INGdEwmaQRcrwB6NAQYTuQ/view?usp=drivesdk","description":"Tuba - Bambuco [banda] - Leon.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.'
  AND o.titulo = '<p>Bambuco</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- rozo-obertura

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1hFboPscJXOjPoeIcZ3SJf9NZMjoeSrZo'
WHERE observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wqvBPzCrSLhoc66jch0eUpLWJh5wGSwX/view?usp=drivesdk","description":"Barítono - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Barítono'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1H2WzpUZQpDxKrJFphugaHIqFh6lnarYB/view?usp=drivesdk","description":"Clarinete bajo - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13DGJ4mQroFlZCnFLShmx6Qh1rQ4rfxsO/view?usp=drivesdk","description":"Clarinete Bb 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1VljyO0QfyAp3X2Qtebbv01vjqW7FdO0u/view?usp=drivesdk","description":"Clarinete Bb 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1gj0asY2Jgu-wOx6kV6WWe9A3PALqWY9e/view?usp=drivesdk","description":"Clarinete Bb 3A - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 3A'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1a81swre5SKj-LtMOLihmT5w_if_t06Ip/view?usp=drivesdk","description":"Clarinete Bb 3B - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 3B'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1YfnB-rPaPOGygpJI2MVmxE8v2g11hZnU/view?usp=drivesdk","description":"Clarinete Eb 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Eb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1UyfrI3dakjBRbYxvxvUy8NY4C2PkAcHd/view?usp=drivesdk","description":"Clarinete Eb 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Eb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ztQhT0qtZ_NT1-nLut_YsJe0tyTxk5Rk/view?usp=drivesdk","description":"Contrabajo - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1xIhw9Y6FLf_ObmFCLFjRiyr0XH6NVEvv/view?usp=drivesdk","description":"Corno F - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_2cRjgs_3vJTQWoLXE26k6rSIUkOYpGi/view?usp=drivesdk","description":"Corno F 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dhFeWLaV97oK3lSfWYF584eqH91h6bod/view?usp=drivesdk","description":"Corno F 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_MlA-DmuWhnVlKsXNgVaymghs-jy4Fs3/view?usp=drivesdk","description":"Fagot 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LpsaqjuS6BOYq2h3axK_1VgnRoEqNMxX/view?usp=drivesdk","description":"Fagot 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_bN3_P1ToepgC9GiOE8_t1BDbmClMHci/view?usp=drivesdk","description":"Fl Piccolo - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ejP2D9GNGd-LRZYRf_B_nZCk39Oqsp-g/view?usp=drivesdk","description":"Flauta 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13auTAThPmUI1v3-TnRAHDkkvcwgE2Qo0/view?usp=drivesdk","description":"Flauta 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/14xhdegPMGldppKAzJvLU1zbqbPFDVQ7j/view?usp=drivesdk","description":"Oboe 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AbRf-qUg3FgeFzyugIIFazoy2kGrW891/view?usp=drivesdk","description":"Oboe 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Xuv57WcponvZF9MT8aNeY89dCUb9wheG/view?usp=drivesdk","description":"Perc Bombo - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1xQOHdtjNvl2WknG8mecrfQih53v0yZiD/view?usp=drivesdk","description":"Perc Glockenspiel - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Glockenspiel'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iVrtg0WvJNCI-WLKEoC7aGOjRprQqXxp/view?usp=drivesdk","description":"Perc Percusión - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1QeJzl0PHr42Lng30UQ-Klng1apto7ZEW/view?usp=drivesdk","description":"Perc Timbal - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-hDoXJUumVBZ7oVI2yTJCd7p2UUbeM_A/view?usp=drivesdk","description":"Perc Triángulo - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Triángulo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10YyQMT6J7O1eK_c0EljMCDt0RP2bC-4f/view?usp=drivesdk","description":"Saxo Alto 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Eo-8xcpsxFG-nCa1MAsmCQ9ihx3lptEQ/view?usp=drivesdk","description":"Saxo Alto 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rhLR0u2nfq36gVYPGEG691uLdWBbpnWp/view?usp=drivesdk","description":"Saxo Barítono - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Barítono'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yKRoljzYSx5DZ4lVqOMgEYz-yEiBjFar/view?usp=drivesdk","description":"Saxo Soprano - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Soprano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qJHg1v0A6PimsDXjNw1TOxWKMhfBOrP2/view?usp=drivesdk","description":"Saxo Tenor 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Tenor 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1D3MSSHCk_XCH8alnFKgHmpNP2lia8J5B/view?usp=drivesdk","description":"SCORE - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uKQ69OYb-VFlZ_pxFh46LuobJCIrCvYt/view?usp=drivesdk","description":"Trombón 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DIex-pMo1nw-a9Ox2Od4T106olmo2x0M/view?usp=drivesdk","description":"Trombón 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GxFWpa3sOgPDixIYWO_SjtZeq1gKr8l7/view?usp=drivesdk","description":"Trombón Bajo - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AHUdX1q5Lbznl0aV2X7QRtuVOEseJr5h/view?usp=drivesdk","description":"Trompeta Bb 1 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RQDI7j4AysEBOmK7PViB6SvlDtqAIC26/view?usp=drivesdk","description":"Trompeta Bb 2 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1h_CwdY0m6Qqpr4cFNe3cbJAwsjr02qK3/view?usp=drivesdk","description":"Trompeta Bb 3 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NXewW3J_FXSMPwKJmxfkp5_r-psg7jrR/view?usp=drivesdk","description":"Trompeta Bb 4 - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1p1RF9pNLJkWhwEEon1Tov-EvRG0hYIs_/view?usp=drivesdk","description":"Tuba - Suite Sinfónica Colombiana — Obertura [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- rozo-intermezzo

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1xwL_-WfSkR35_i7kejWmp174TKhMM21B'
WHERE observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Ao9rEcd7TiL3-JNIuVNnPeRKRrqNRA-o/view?usp=drivesdk","description":"Barítono - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Barítono'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MHrWcywol1_BC0KCIJxZSqNpBiI36TFP/view?usp=drivesdk","description":"Clarinete bajo - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1V4D-zkVy67GuCAr8CPnqgqYN3ZjZ9wKx/view?usp=drivesdk","description":"Clarinete en Bb 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete en Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17Dbbj5jYsBxzTH338O3ODD8ThxYvRRaw/view?usp=drivesdk","description":"Clarinete en Bb 2A - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete en Bb 2A'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12j77lhv0Bwq8WDcSsc6IOhM7veEBhVFG/view?usp=drivesdk","description":"Clarinete en Bb 2B - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete en Bb 2B'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vcP8ib99RvOg6Vipo3sJikma_9JvWlAA/view?usp=drivesdk","description":"Clarinete en Bb 3 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete en Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KaVUnCX-SwulXqLO8HBtt0Hyb5PDdPes/view?usp=drivesdk","description":"Clarinete piccolo en Eb 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete piccolo en Eb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1R_aqk2_b2becqAEdpoD77LnFPCX8KHKm/view?usp=drivesdk","description":"Clarinete piccolo en Eb 2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete piccolo en Eb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hfH1NQlElYZIXCH2L-RwGE4xX5RIC4ap/view?usp=drivesdk","description":"Contrabajo - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Pm_EKYqslAh-yoF8vMbFw7cJFKy10I8O/view?usp=drivesdk","description":"Corno F - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10g95TVSqbfRGNOGN7NSNx4zuS_pIYHWB/view?usp=drivesdk","description":"Corno F 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dFypJN-CEuKV-GGzEppkPcdKpAeIQHaN/view?usp=drivesdk","description":"Corno F 2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e0C3QRyzizKz63CFqVKai7Sw_WID7PaL/view?usp=drivesdk","description":"Fagot 1y2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e0C3QRyzizKz63CFqVKai7Sw_WID7PaL/view?usp=drivesdk","description":"Fagot 1y2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GWghGwrE-UZJ630qiX3XC2ko53HWA57U/view?usp=drivesdk","description":"Fl Piccolo - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eug5hyA3bu5by62cmE5-UTPZh_iZsezJ/view?usp=drivesdk","description":"Flauta 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nCNu0XXf3d3vK7JQuvswQPEebEsJQ-no/view?usp=drivesdk","description":"Flauta 2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HNsMZSZ8cEskxscR2l3oIFcCMSDC2A82/view?usp=drivesdk","description":"Oboe 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11Y1bv3-0KiKN5SlvfrvZuhTUHS5lbHEh/view?usp=drivesdk","description":"Oboe 2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1UyyQ3rQ_vl5Z5yYQZIq00ghQndhQEPpw/view?usp=drivesdk","description":"Perc Bombo - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12D2NAdEmFYY1kpQ1FFZf2KR8sI22fGTt/view?usp=drivesdk","description":"Perc Glockenspiel - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Glockenspiel'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1d5WcWa87OPKo7mZHIfyEHcnSrVkxhs8Y/view?usp=drivesdk","description":"Perc Gong - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Gong'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XgJGfIjgKSHmK8_yiQMuo0IrUotxEPoj/view?usp=drivesdk","description":"Perc Timbal - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1orrCSClPc7Avzfb7D6HgwXpdWjaZg3J6/view?usp=drivesdk","description":"Saxo Alto 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1I3MFWzWQ4TV6-S1XF61csnlD6baZccti/view?usp=drivesdk","description":"Saxo Alto 2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-PxD4A93q3BoKnf6KEHbRwDwtV-vSylP/view?usp=drivesdk","description":"Saxo Barítono - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Barítono'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kU4gVnwI1satY_WUPu2XedjqrDB1AVli/view?usp=drivesdk","description":"Saxo Soprano - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Soprano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bK8ablB6w6pXwNtPq9mLvIDDSc8tVzxo/view?usp=drivesdk","description":"Saxo Tenor - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Tenor'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19MIEPKBvzXrqx_ZwVMekIasDWY6b-7Wv/view?usp=drivesdk","description":"SCORE - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1h8m0DV-1OsWUdjMfNsNOHG5g3xvzZ4bZ/view?usp=drivesdk","description":"Trombón 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cIvAauE4mH1cudW8xxkGs1yaT2S-I4RZ/view?usp=drivesdk","description":"Trombón 2 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mLqKW5NddHlYV3UHfBj0EC4QF7Erbd2a/view?usp=drivesdk","description":"Trombón Bajo - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1V0Lp6a9Row5rzcuqMhO8OakUh8_c_eVk/view?usp=drivesdk","description":"Trompetas 1 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompetas 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GpgLlLFATNNo9708Ah0AUvvnBpXhT6C-/view?usp=drivesdk","description":"Trompetas 3 - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompetas 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Z0XfVL9yPOB9TdbHH8dLzfvH9ztvsF2G/view?usp=drivesdk","description":"Tuba - Suite Sinfónica Colombiana — Intermezzo [banda] - Rozo Contreras, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.'
  AND o.titulo = '<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- maculele

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1OljNhEaQY45i-xaf2Ak1Oh29FZK3RWoG'
WHERE observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mCFjgzRwzU6OZZWjrwAMbe20InwcqnUb/view?usp=drivesdk","description":"Bombardino Bb - Maculele - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Bombardino Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13XnlnY3vqE7IWB36QQ7oQfcfewVXcZAk/view?usp=drivesdk","description":"Bombardino C - Maculele - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Bombardino C'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e5KYZXhvOuYqvsJPe4k-puPGPctk0XQr/view?usp=drivesdk","description":"Cl Requinto Eb - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Cl Requinto Eb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mEjMxBSQ74GKBG_iGoGvtV3pFGIHY1Rg/view?usp=drivesdk","description":"Clarinete Bb 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13xu59unpCwC0WbarfzBgSwG5sExr0rt4/view?usp=drivesdk","description":"Clarinete Bb 2 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1gsA99nbNe0WAIMl5izmHzWMtsMCnVtSY/view?usp=drivesdk","description":"Clarinete Bb 3 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IxEdVgOcI1Nt9GO9KmjzHz9ZPcu3trCb/view?usp=drivesdk","description":"Corno F - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Bbm7oosd_bt6wK_BTCcoZIVMAievk4DL/view?usp=drivesdk","description":"Flauta - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1S-QQeRB3Z_mxHQOxphaUpJjmKY7cz7CJ/view?usp=drivesdk","description":"Perc Batería - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Batería'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1a69-xq0SU3W-0zFLy3cd-IV6kFZO6m-T/view?usp=drivesdk","description":"Perc Percusión - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19sAv5Km2Sw4MgtamXOYVW2fCFGUuz09X/view?usp=drivesdk","description":"Perc Triángulo - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Triángulo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-5Dg4vAMJ3A7hNwiOuW_vvBC1gwRHTlh/view?usp=drivesdk","description":"Saxo Alto - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zTGYd4456SoFYEZoqCMkEzxcI2PpZkeN/view?usp=drivesdk","description":"Saxo Alto 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Alto 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HpWc0Rm1oKzcnAYwPYocv3137Crkqq5v/view?usp=drivesdk","description":"Saxo Soprano - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Soprano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1od-xVemJ1lsEmvpFpOQOo07mZ7ZTr6j0/view?usp=drivesdk","description":"Saxo Tenor - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxo Tenor'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1A9ICFPzriq-roD5QC0dWY4514oYrQd_E/view?usp=drivesdk","description":"Saxofón - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Saxofón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rg_fzJ8_KyuaxhqhAYkFqVpiYWJL97sW/view?usp=drivesdk","description":"SCORE - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Tmg0WPLsSKaiVQ5Gr5S_LpeBd3jiOFJw/view?usp=drivesdk","description":"Trombón 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1FdSpuj8fgASMBQd8Pk-enslDyBMcSQZm/view?usp=drivesdk","description":"Trombón 2 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WiA7vEVUZJcDee5CyNvd1OXGIfLp5L6I/view?usp=drivesdk","description":"Trombón 3 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kmz6UtDNs2KEXGse9FiRhVjzsgEHc3rR/view?usp=drivesdk","description":"Trompeta Bb 1 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1O6xifgqhjHhvP1CRcEmtqbrcIbAc11CN/view?usp=drivesdk","description":"Trompeta Bb 2 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/122pl-LfN_n9Lxf1usjcSgxMC_5PyOUEr/view?usp=drivesdk","description":"Trompeta Bb 3 - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lPfujlW_4TAhqStXuLr9k_NEaXv8DwFH/view?usp=drivesdk","description":"Tuba - Maculelê [banda] - Fortaleza-Rodriguez-Ferreira.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Arr. Ferreira.'
  AND o.titulo = '<p>Maculelê</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- pollera

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1_gLizyOBGNHnUP6TUqgo_AKrvnCRB83b'
WHERE observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18XzPMEtmtc-nI7Z-2NGT18ZHChw1SLC6/view?usp=drivesdk","description":"Clarinete Bb - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Clarinete Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TDqQCEhHRtz7-bGLJxBmGyX5lzMuZGgO/view?usp=drivesdk","description":"Conga Drums - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Conga Drums'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12vVMm5ZhMqWQjqiRWhCv79QSH2TLABtJ/view?usp=drivesdk","description":"Contrabajo - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cZq5vWxlXX49JvPRc58U694hJmQCN3IW/view?usp=drivesdk","description":"Corno F - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11M--xRvIt18Euj_2QAFW02FELpcNORc-/view?usp=drivesdk","description":"Flauta - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18MyWdYHJAcpuXS0tKKCAAC-A81IaSmrb/view?usp=drivesdk","description":"Flauta 2 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SIpzbho_4KvDpbh2iCd0Yk3XIJSEiA8h/view?usp=drivesdk","description":"La-pollera-colora-Ganza - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'La'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Na8pdVnYwUK0DG2TztOzp3vclkHQBbd_/view?usp=drivesdk","description":"Oboe - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IgoCz-iuoL9J9GRUmKsiQytl5Mg674Q_/view?usp=drivesdk","description":"Oboe 2 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1X8Oe1UGqmnslBHNDS_v5yJWiUNADOoBQ/view?usp=drivesdk","description":"Perc Bombo - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kLbDcEFuxz0-Q5qe5YCqfN6jOtD7e4gB/view?usp=drivesdk","description":"Sax - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Sax'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iRR9F6d7V-1ue9WoXuMyxdvhSl5Ya6FY/view?usp=drivesdk","description":"Sax 1 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Sax 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KHwursl8FUropeDLaH8OXPelCv0j8M24/view?usp=drivesdk","description":"Sax 2 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Sax 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zpPgDwQnUK2ri8xYPeEDao7PQQUvZHB9/view?usp=drivesdk","description":"SCORE - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11wcTzEi5O--9GwplhyXRNrmpNS47ti2t/view?usp=drivesdk","description":"Trombón 1 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1D0t2RN9ueH911TIDe252N197AB-46x4J/view?usp=drivesdk","description":"Trombón 2 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sYy5NpUCL3PD84wJCZiLgxlTF60ob5uY/view?usp=drivesdk","description":"Trompeta - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Lu2Gg5A4LPy2kX9_yAcbtvf15WVc9Ie6/view?usp=drivesdk","description":"Tuba - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/14Qm3jMkeRRHwxGYfSyWXO0ZfmpbZIgNJ/view?usp=drivesdk","description":"Viola - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1UDwk_iKrUmmkwZhRBXH1npl_Ndon-3Ar/view?usp=drivesdk","description":"Violín 1 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15O2UQhn0UPPOFLUhdZVAndd3h_IQEOF4/view?usp=drivesdk","description":"Violín 2 - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GgI5PRc3xwmaRR82C17xHyeGVotu7_zX/view?usp=drivesdk","description":"Violoncello - La Pollera Colora [banda] - Trad.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.'
  AND o.titulo = '<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- vieuxtemps-m1

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1vlASfIHrvRlhAJh8_W_O1cZz81n1wAJt'
WHERE observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OgCuwlTxp-QUtenZKgBeFugPgCMRVpCi/view?usp=drivesdk","description":"Arpa - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SH20CFlXeYKUUv4Ge-Z5x8pSgBYAlK2_/view?usp=drivesdk","description":"Clarinete Bb 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16yKuIOTEmG5Q2Ol38p4j_Np4W7ggkhR1/view?usp=drivesdk","description":"Concierto para Violin Nro - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Concierto para Violin Nro'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1t3APWURLQKNGiFK75IDBYNdJLL07fCQo/view?usp=drivesdk","description":"Contrabajo - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pborWa2yokg-Z87Q36BSq-vjaocG_bje/view?usp=drivesdk","description":"Corno F - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11PGNl3BjnR24I5ZmmXmpkeF5bPP26fEG/view?usp=drivesdk","description":"Corno F 1 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CIeBKvLA9FC2I5zD97g9fBH2oEashkNg/view?usp=drivesdk","description":"Corno F 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CCbsmGaDaF9IotLXO8I1QsfIxDb1x6we/view?usp=drivesdk","description":"Fagot 1 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uhRRdcmYGTZMyZg1MTytlhhKus1izdYi/view?usp=drivesdk","description":"Fagot 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17HJNS_L4RzXRiJMdk2ubzafc0HQopbP8/view?usp=drivesdk","description":"Flauta 1 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dVKN7auCmxSbA_btMnRqpYcAR5C0qLli/view?usp=drivesdk","description":"Flauta 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1EIjux_STz3UPvqkhV3t9GZkL8jYSiTrX/view?usp=drivesdk","description":"Oboe 1 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1aUPOt76Q4Qt2Eq-3iseNp_4J2bU7emZ-/view?usp=drivesdk","description":"Oboe 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17_FgzLsVbqDWhEQos5ij7xIVqt83Lm2W/view?usp=drivesdk","description":"Perc Timbal - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HjmcvvnKpUabGQ4_OxySOCaoN2tuFlN9/view?usp=drivesdk","description":"SCORE - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19T6RXDliWmEeQqvxdQKl-uUSeRUUkH70/view?usp=drivesdk","description":"SOLO Violin - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'SOLO Violin'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-Ex8kSOPJVoNDAfg7S6uzQjWtMMk-w1Y/view?usp=drivesdk","description":"Trombón 1 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WwfQDvzsfKnh9pwE-FYxyNUMTNkM2dVV/view?usp=drivesdk","description":"Trombón 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DnjmawnNLIhz6_Xxl_a_D0LJf6x--gyq/view?usp=drivesdk","description":"Trombón 3 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Z5dj7OtNrRPAxN96bwzqhDqioVyRJvQY/view?usp=drivesdk","description":"Trompeta Bb 1 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Trompeta Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/134MTAjNF1EEANk3N4Z4L6VrORJT1GEs4/view?usp=drivesdk","description":"Trompeta Bb 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Trompeta Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17LCpFbCmmUT7fn2DQb9V9BmY7OG7BeRv/view?usp=drivesdk","description":"Viola - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XG9n3xdlHrAcNm__Ei7ZDqi-7w5FNF3M/view?usp=drivesdk","description":"Violín 1 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LdUkalHu--njtHaefl39AdlWU7aEXJFa/view?usp=drivesdk","description":"Violín 2 - op.37. Concierto para Violín Nro. 5 (I) - Vieuxtemps, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 1er movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- saint-saens-m23

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=12ltqgsyGi7RTa3oh2N_S0bnA8HoOxSmf'
WHERE observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1i_OHRjPrvSesd9t3ciqBEPUs3jwhU40M/view?usp=drivesdk","description":"Concierto para Violin Nro - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Concierto para Violin Nro'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vN94XSiAnAKZ0_qrgiA336LNiTh4iV3W/view?usp=drivesdk","description":"Contrabajo - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iKwtBa2ekRAoMvjo4RHwE7-aDq3wXOIu/view?usp=drivesdk","description":"Corno F 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iKwtBa2ekRAoMvjo4RHwE7-aDq3wXOIu/view?usp=drivesdk","description":"Corno F 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Jy5NIzuzedCCVYuinZWOgCGZf-LI1V51/view?usp=drivesdk","description":"Fagot 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Jy5NIzuzedCCVYuinZWOgCGZf-LI1V51/view?usp=drivesdk","description":"Fagot 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ErwPyXNpX4JmDY3vCRJmvEpmPTcO8bU4/view?usp=drivesdk","description":"Flauta 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ErwPyXNpX4JmDY3vCRJmvEpmPTcO8bU4/view?usp=drivesdk","description":"Flauta 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u31PayKhZX675d_1hII0vJk0ZPGzVmkH/view?usp=drivesdk","description":"Oboe 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u31PayKhZX675d_1hII0vJk0ZPGzVmkH/view?usp=drivesdk","description":"Oboe 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10QVASqYkMRrhI2wbLc9YmzB3FyRCD7Lu/view?usp=drivesdk","description":"Perc Timbal - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1gz6QF8_F_jigE2ks36OEqUWH8rDR5Kde/view?usp=drivesdk","description":"SCORE - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-k4CuEw-XtzRcrb5XtSVVIQSjtyZfziS/view?usp=drivesdk","description":"Trombón 1 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TCTFom2vjmCKgdeATobJPCabFD75A_M_/view?usp=drivesdk","description":"Trombón 2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lE5RdGjZA1sPB-phAgUtCXJyDe5LzDTU/view?usp=drivesdk","description":"Trombón 3 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HWUfM90TxSKt-xJHPnQHrO64MxZDjsW3/view?usp=drivesdk","description":"Trompeta 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HWUfM90TxSKt-xJHPnQHrO64MxZDjsW3/view?usp=drivesdk","description":"Trompeta 1y2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JwzzRwldZv-RtQOKmg-e9o-wSihKk_4Y/view?usp=drivesdk","description":"Viola - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1O1s6FidP0n9RmsuFbqZqr39OLtml-8CP/view?usp=drivesdk","description":"Violín 1 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uIRTyVePtTTxGqz4eZEF1T3vQi69n2-V/view?usp=drivesdk","description":"Violín 2 - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qSKVdo83tRVjBrNicIG9bvDBkdrrZgDt/view?usp=drivesdk","description":"Violoncello - op.61. Concierto para Violín Nro. 3 (II-III) - Saint-Saëns, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).'
  AND o.titulo = '<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- phantom-menace

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1LFDwXJgjhBOVqLRWsz_a0HdCN55OVGKh'
WHERE observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND titulo = '<p>The Phantom Menace (Suite)</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Qt9YswE3_JsCRUIDH2pmRLyxW8iqzS-n/view?usp=drivesdk","description":"Arpa - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AjNdoo4IjKjgVsG_s2aqMXC71Q-AfSGj/view?usp=drivesdk","description":"Clarinete Bajo - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ozVbEcH4PIGpUoFVK3bnGVbZIz0iO5uC/view?usp=drivesdk","description":"Clarinete Bb - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Clarinete Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1k_9VPOOLn4Ax3qgzWnk5w3vdsopspe9o/view?usp=drivesdk","description":"Clarinete Bb 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1x996JR3dXfipNzVivqQ1HXm1O677E7Py/view?usp=drivesdk","description":"Clarinete Eb - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Clarinete Eb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SDd7NkAaBLxTO9gTv4GOLzunmi-DfqHP/view?usp=drivesdk","description":"Contrabajo - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kq_l5iKWBOSkBl6Y2_ks7hhVPxkc3Jlf/view?usp=drivesdk","description":"Contrafagot - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GI_U9YPck5TI9i1-T1q28oroZry8ZziC/view?usp=drivesdk","description":"Corno F 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RffxKZcbKe9HJTTt-KyTU5GxVafK3Tbc/view?usp=drivesdk","description":"Corno F 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uuvvZf6jwPRG06Xr0JrbgydJ57Bxk6bn/view?usp=drivesdk","description":"Corno F 3 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wpvKdoUnbAL7N4E_NPx8H32E9yLrr-Qt/view?usp=drivesdk","description":"Corno F 4 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1io6axbefHUCSGn-wlIK8MLTaO2MAzi3a/view?usp=drivesdk","description":"Coro - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Coro'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_o1yOQPfVvmfuaaaj_0uq6gBRGhMdGk7/view?usp=drivesdk","description":"Fagot 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-7OechIj90HKZFJmyWly7PH25mlnRyaY/view?usp=drivesdk","description":"Fagot 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qdbQDTnmWTfhV8zMym-cd5XCiNkoGymP/view?usp=drivesdk","description":"Fl Piccolo - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZJJbS00AWv-QagCPrd1jEdg9O6WyXh-1/view?usp=drivesdk","description":"Flauta 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yqfO_jYkFUtnXqKfI_ubIgRslzbYxhQx/view?usp=drivesdk","description":"Flauta 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11o-xSy6ATT08Zd7WgN72_Ffi6m8S6Agy/view?usp=drivesdk","description":"Ob EH - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19eXkbuoADjzDCF8cgTCKl55NNuVTRi-C/view?usp=drivesdk","description":"Oboe 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OlAWSORrkgqbV8CmPOjHEltTjJChCi_R/view?usp=drivesdk","description":"Oboe 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pgQqPG0QAKbwI12td-Zo7S3UeJ5rteUT/view?usp=drivesdk","description":"Perc Percusión - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ItkTwSWOzfv6UMs2E9keb7Xtrd7FS8Jy/view?usp=drivesdk","description":"Perc Percusión 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OB7hplhUrgzPFCnb1A5ajHNh8GszNIxh/view?usp=drivesdk","description":"Perc Percusión 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dH_0Hbxee3mt6VF8-Gldh9hHHNlmXRnk/view?usp=drivesdk","description":"Perc Timbal - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1msSTPxK3N_3i_PEh8EWclF8DhejrwpP1/view?usp=drivesdk","description":"Piano - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1g8gRCwZwEs_rPyt8QmjNfYXxF_d3gfvV/view?usp=drivesdk","description":"SCORE - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XxkfTXn7G0uBhLVOuJCE8f9G5How_rqv/view?usp=drivesdk","description":"Trombón 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AeAeULv_V7h5LNYdoIdqSEwtKLylZINK/view?usp=drivesdk","description":"Trombón 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HR3cpPExm-b7Wr9BS8GSoukIaVd8rzvW/view?usp=drivesdk","description":"Trombón 3 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GGFmHOuLHLcA2jiu_-IR7-Boy61Pa9x-/view?usp=drivesdk","description":"Trombón Bajo - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1t0ecFyktEQBZNp8nJo-QTzMuVDdBM-DT/view?usp=drivesdk","description":"Trompeta - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KqzZ6jbcXOtL-MqBUh_V3sCTX5YuZwJL/view?usp=drivesdk","description":"Trompeta 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nGSkZ1EV4tZBRimt9Sn7Xn6L5XzoN8vE/view?usp=drivesdk","description":"Tuba - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WbhhJkYvG-8OHmXo2CsDljayiq88JrP8/view?usp=drivesdk","description":"Viola - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GL4XROIBz36536An4-K8zu82pZonO7or/view?usp=drivesdk","description":"Violín 1 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DlylqFW5-r0IB0T0_J2n9VcmFA5Q76Nk/view?usp=drivesdk","description":"Violín 2 - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bQwZv45G-36WFknU7KlR4GWe62pblRRY/view?usp=drivesdk","description":"Violoncello - The Phantom Menace - Williams, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Phanton Menace.'
  AND o.titulo = '<p>The Phantom Menace (Suite)</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- hirdaith

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1Tk-lzmbkT618tOlarlyzfHmGWN_hFRjm'
WHERE observaciones = 'Para acomodar — Archivo viejo.'
  AND titulo = '<p>Hirdaith</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PwfF4uHgZIMuriTF_zRheT3TiN1f8NqK/view?usp=drivesdk","description":"Arpa - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1us44LyuqeDit9MdnZWtow_s50qSvWT7G/view?usp=drivesdk","description":"Clarinete Bajo - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dCOgzdB9gEZWfubm9nFRTxq6J1khVZM7/view?usp=drivesdk","description":"Clarinete Bb - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Clarinete Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cUthNHQ-DW8g8omkhK91lsxg01BElkCy/view?usp=drivesdk","description":"Contrabajo - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hanIHDgHCnCIuTSQS3Dwm3amMN-cInoi/view?usp=drivesdk","description":"Contrafagot - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Fpe7mPJM1QxyUzBWExEx79ML0BkhpUax/view?usp=drivesdk","description":"Corno F 1y2 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Fpe7mPJM1QxyUzBWExEx79ML0BkhpUax/view?usp=drivesdk","description":"Corno F 1y2 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MNTXrXTnM7x7p-ixStW1YVEShCwiXEZo/view?usp=drivesdk","description":"Corno F 3y4 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MNTXrXTnM7x7p-ixStW1YVEShCwiXEZo/view?usp=drivesdk","description":"Corno F 3y4 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HstrG5TslpSeHCyzgF4tiFvp4FOeg_MB/view?usp=drivesdk","description":"Fagot - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Fagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IAdlCm1MY4RTCjk9_2dezX8eOs1c8ogr/view?usp=drivesdk","description":"Fagot 1 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/174njafo60IX5HDr9YOV6X8oDwvvOEg9B/view?usp=drivesdk","description":"Fagot 2 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1q_ZypPvJElFo6-nDgw2p-o7GhEVh9nH9/view?usp=drivesdk","description":"Fl Piccolo - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LbqWJHtJOymo4F0hs0mTsWOJgYqW8Ezs/view?usp=drivesdk","description":"Flauta - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Flauta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vzhMVGlV-5r4ftqQntKyHhaQF7cd_rA0/view?usp=drivesdk","description":"Ob EH - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WAOs0fQusttdA7AKtnA-erjtycQ3KZ_C/view?usp=drivesdk","description":"Oboe - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17A3kWn1_hD1G6mKv7K0BWmuPTM2a2kGf/view?usp=drivesdk","description":"Perc Percusión 1 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LDbctUe6YM25_rXjqN0BgFJVv-ePonX4/view?usp=drivesdk","description":"Perc Percusión 10 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 10'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JWI6I6iiWyd8flTn_JuF7sgJiY3vHKn6/view?usp=drivesdk","description":"Perc Percusión 11 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 11'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13H6cMuWdP4pY1IZIp8govoyHIOgGnHzj/view?usp=drivesdk","description":"Perc Percusión 12 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 12'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GZLj4NdEHTRj-6VafVIMxfd7c-rXktEf/view?usp=drivesdk","description":"Perc Percusión 13 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 13'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JGuApK4TLLw-aJ1pwyK9yxoLfp7z_xm4/view?usp=drivesdk","description":"Perc Percusión 14 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 14'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SxIouy0JaOoFKUBQzozOcgXj1VR4eGvV/view?usp=drivesdk","description":"Perc Percusión 15 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 15'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hj_fNAqIYhAsSz4ZWjvvGu64QCPDR66_/view?usp=drivesdk","description":"Perc Percusión 16 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 16'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11CDh24Y0QPtIi7G-trqat3hYFKywv37I/view?usp=drivesdk","description":"Perc Percusión 2 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IMYv4MfHa_JQ6OgH3J9QIi4r2NZqYfHV/view?usp=drivesdk","description":"Perc Percusión 3 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1fc570jBcX8xPbPuG3P9qDEjqH9wyMB2_/view?usp=drivesdk","description":"Perc Percusión 4 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oq7EX2OY-KbdygvWkfA5XMOCGiUWskny/view?usp=drivesdk","description":"Perc Percusión 5 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 5'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1I4J09F8dUQdichC5kt9qLPFJJ6MJBUB2/view?usp=drivesdk","description":"Perc Percusión 6 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 6'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XEOFAMURXZkkiCOu-a51Wc4sJFP_UTr4/view?usp=drivesdk","description":"Perc Percusión 7 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 7'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16_h3sdVZg-GlmfwmmHMQJwbVDByuTSCJ/view?usp=drivesdk","description":"Perc Percusión 8 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 8'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1fTizKaWEtDyKWwsIWOKst77ssx9ZmHip/view?usp=drivesdk","description":"Perc Percusión 9 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Percusión 9'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17BH0hw4Xb4rQ-gGZwcAXQvP5CcCKBLRZ/view?usp=drivesdk","description":"Perc Timbal - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BRtFVQNvO1-VHwr-MNWLk68fneSFr0cq/view?usp=drivesdk","description":"SCORE - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pS3yXDdlz_VbHEtl3wr7SlZ2ctEr6Sr_/view?usp=drivesdk","description":"Trombón - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1VDKHo-fbU3fpPHtQV3SaS0yXHQSZF8Dz/view?usp=drivesdk","description":"Trompeta - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hjN3-VfZTVfxtj9ZQdhSHc67rgy00xJx/view?usp=drivesdk","description":"Tuba - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10BB9LgNRLltPMp7cndV0etYYUlkVtHUu/view?usp=drivesdk","description":"Viola - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12as3KE_XrE_pht3UfLdm2OOgvDoiAApw/view?usp=drivesdk","description":"Violín 1 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1botMWXxIQRa5LhFn4vZrt80uT1LIss2W/view?usp=drivesdk","description":"Violín 2 - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zT0l2Ndifc3ZWqM8qcLCXBqqzMZhg_-G/view?usp=drivesdk","description":"Violín Solo - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Violín Solo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mqZ7l5rotAgsWIBk3-nveqHLA8w_nfMf/view?usp=drivesdk","description":"Violoncello - Hirdaith - Macdonald, H.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Hirdaith</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- strauss-don-juan

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1Cw-BXk3Zrvu4JBEvCxxphREwwaQYw2os'
WHERE observaciones = 'Para acomodar — Archivo viejo.'
  AND titulo = '<p>Don Juan, Op. 20</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Hc8fSP9hB2SNJk64QVjj_uCak8VDRSFS/view?usp=drivesdk","description":"Arpa 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Arpa 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nPXn6jfqpIT8J_peAqRlh0XK6CdfyybW/view?usp=drivesdk","description":"Clarinete Bb 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HjRqzWd-5Ois-P6t4xE4I8lbOKcn8bVB/view?usp=drivesdk","description":"Clarinete Bb 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1iY2MF5K3piGCBtJhyZKxmB-9qsbbktYl/view?usp=drivesdk","description":"Contrabajo - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1a18lHwsPrIPwkmd5M1-j7lPqKBkIlzwS/view?usp=drivesdk","description":"Contrafagot - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1fleLZKPGCkkiLDJpuNAajqQ6s-OPkajE/view?usp=drivesdk","description":"Corno F 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NrAaDOWbxrtrTUMCe-kAi_oNUEtWZd9C/view?usp=drivesdk","description":"Corno F 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18kKyhYdHJ9BSsYnZ7I7swSTsO7VIGvZW/view?usp=drivesdk","description":"Corno F 3 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dbJGyUQY7gvuL4ou-aLSHsfj_stxx4Qy/view?usp=drivesdk","description":"Corno F 4 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eisyXxs5HphTq3XxbsTn1TESdh0FNYam/view?usp=drivesdk","description":"Fagot 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yEMuECTUTpXZSCSTC8zO3Gl7vSNqxR1B/view?usp=drivesdk","description":"Fagot 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e9LiMwQg0yymjBfgeEL36S1KfEFEfNrN/view?usp=drivesdk","description":"Fl Piccolo - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Uh0QYt6albAo_EkVcr3h9TvOCw9_u4L7/view?usp=drivesdk","description":"Flauta 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dAVkQmJEhREWLiQDHl1Dy-SfD46ivtPg/view?usp=drivesdk","description":"Flauta 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lWnQfRv72YRHdqOodGSnqZ_EnfQ_cpNN/view?usp=drivesdk","description":"Ob EH - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_OFSwU_9zrBGrlczJiFtJ7hpe6zfOOM_/view?usp=drivesdk","description":"Oboe 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15mQwyAHCJ2rnmyL_iRdYObmKPIAXQRqV/view?usp=drivesdk","description":"Oboe 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dIxeZf8H0UGZst4dHVgKMAUx2d22UXgX/view?usp=drivesdk","description":"Perc Percusión - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11DmIU_yrtuhIkCUpVaqhud5fGF8Kxw_Z/view?usp=drivesdk","description":"SCORE - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oGRwY0Az3o0Fdq8t_XP8NERrSJA7mE3k/view?usp=drivesdk","description":"Trombón 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wxaCiugwPdkR2CT1UcTrscLepaAAkCAJ/view?usp=drivesdk","description":"Trombón 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GafoyvVbwe15f6GZzMGHVNfiHHnyKKP-/view?usp=drivesdk","description":"Trombón 3 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Trombón 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eRGlHHUI6rDUwnpu7BMLIB3r22S9J1TK/view?usp=drivesdk","description":"Trompeta - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PL2cdPEZreHySl7yqgAcGp33cun7V2YN/view?usp=drivesdk","description":"Trompeta 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kUw_D_EZ5mH-lMiXWAwd0m3iDYFcjpaI/view?usp=drivesdk","description":"Trompeta 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eDlPQdOH3aJJVlRaG-JwCXyxnYYApK8b/view?usp=drivesdk","description":"Tuba - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ASTZs0lcWPw5QbRdpkPa-4Si1Rtl58Ry/view?usp=drivesdk","description":"Viola - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13JSGg_2uEFDKYXVFBivpmEC70MbBo1uE/view?usp=drivesdk","description":"Violín 1 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IGlrguPnkHJDlcm8_4-1eeMS74DsT7Fl/view?usp=drivesdk","description":"Violín 2 - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dP0PomRjgH_nME6LpckCJmZv37k_-bWG/view?usp=drivesdk","description":"Violoncello - op.20. Don Juan - Strauss, R.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Don Juan, Op. 20</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- carmina-fortuna

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1LqO2sdfMN_r2veryhjTPo_eNlXvM57bZ'
WHERE observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10OXEEz-zBQA_kKk8V6jK8zHiNAXJ-K4i/view?usp=drivesdk","description":"Clarinete Bb 1 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1q4kqBLpXFiUzVWqXUpShJ7qEmHxdCNXG/view?usp=drivesdk","description":"Contrabajo - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HFHoDEQD9S_qdU1xix_ssSidsD7KUrJ2/view?usp=drivesdk","description":"Contrafagot - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Zk6WN9jWThq7rd3RDG5o5CbDuJRMJbBZ/view?usp=drivesdk","description":"Corno F 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Zk6WN9jWThq7rd3RDG5o5CbDuJRMJbBZ/view?usp=drivesdk","description":"Corno F 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yE78zdMs43gfHsmXWIM2DEEUnXrC0lxI/view?usp=drivesdk","description":"Corno F 3y4 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yE78zdMs43gfHsmXWIM2DEEUnXrC0lxI/view?usp=drivesdk","description":"Corno F 3y4 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19Qo5g5iNLMjlICpPa774XKndb_l2Rx72/view?usp=drivesdk","description":"Fagot 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19Qo5g5iNLMjlICpPa774XKndb_l2Rx72/view?usp=drivesdk","description":"Fagot 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ikIX_ZvJRVOXbSmw4VLLpP33CyPda5WF/view?usp=drivesdk","description":"Flauta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ikIX_ZvJRVOXbSmw4VLLpP33CyPda5WF/view?usp=drivesdk","description":"Flauta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1okg73sZ1wkeaVeH9Cr5-PRX7HiPAqNc4/view?usp=drivesdk","description":"Oboe 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1okg73sZ1wkeaVeH9Cr5-PRX7HiPAqNc4/view?usp=drivesdk","description":"Oboe 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rYGQ6iQvWAieIwhUgjEdfIcOinOLpTIp/view?usp=drivesdk","description":"Perc Percusión 1 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10ud10gWW0nrNCYdHH46rlruu_33SsZ-3/view?usp=drivesdk","description":"Perc Percusión 2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_dUx0uOMvLpJqU4Cz9wsBqRMSZgCj-oo/view?usp=drivesdk","description":"Perc Timbal - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BxdfWxQ7LBkv4lgAlakmzMRc5bF-rCmX/view?usp=drivesdk","description":"Piano - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kvJfQGxfNyy9eRJ5peroQmdl8fuUoxp3/view?usp=drivesdk","description":"SCORE - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uxnipThRrMYJHghL_axE7AJj4VhOtPn-/view?usp=drivesdk","description":"Trombón 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uxnipThRrMYJHghL_axE7AJj4VhOtPn-/view?usp=drivesdk","description":"Trombón 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GGRCjOEagVBta6r7VSPxGLR0ODeBPM6P/view?usp=drivesdk","description":"Trompeta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GGRCjOEagVBta6r7VSPxGLR0ODeBPM6P/view?usp=drivesdk","description":"Trompeta 1y2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KPDeGbP1ZMFtH4ZK_IVRxwg4SiAqlUvb/view?usp=drivesdk","description":"Tuba - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Emqp6a8DhwqFRtBkhp8m3AY6Xrd72HQl/view?usp=drivesdk","description":"Viola - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wKFZDTKM8ftl_zNowCAOMbdKDF6oiabf/view?usp=drivesdk","description":"Violín 1 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Ud_FFtlrGyrNPeklIPFlYJBqNx27XACd/view?usp=drivesdk","description":"Violín 2 - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NwpFvL_p3Lu40OR0kwBgv9iNJ9K2w7sw/view?usp=drivesdk","description":"Violoncello - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Mugy0qjpXZexGUO3HsHifuJ8kjHw3TB2/view?usp=drivesdk","description":"Voz - O Fortuna (Carmina Burana) - Orff, C.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (solo O Fortuna).'
  AND o.titulo = '<p>O Fortuna (Carmina Burana)</p>'
  AND op.nombre_archivo = 'Voz'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- espel-otra-latitud

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1sWCysyyewiYSsegu6W6YZNH0Qq_ppHSG'
WHERE observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND titulo = '<p>Otra Latitud</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1gkSy22zs9-DCpcUtaCqTuo0aNSJTU5RK/view?usp=drivesdk","description":"Clarinete Bb 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Dv6chFL3vhazB-ROsbuFocsuSyg_qIpK/view?usp=drivesdk","description":"Clarinete Bb 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u2rtPA2vOWHpsxgbrEhBLCmyzd-5jxug/view?usp=drivesdk","description":"Contrabajo - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/148nmExxP46PAdMdJ9jblQiE5AJrDahYw/view?usp=drivesdk","description":"Corno F 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1YU2tyPs2GFpVr_7gtPBy22uk5gj4q_Vz/view?usp=drivesdk","description":"Corno F 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19zn6fMMocUwhmgvfHPbQsKaEKa4c3IhU/view?usp=drivesdk","description":"Corno F 3 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GS62GFDveg1mRiEbCORbhRlw4cjqwLMO/view?usp=drivesdk","description":"Corno F 4 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10C3DGpuzIw0iPWDIjUo2OpWw_735idj6/view?usp=drivesdk","description":"Fagot 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1QGoQMC25AacVwevCX0Plbee7Snm7sZls/view?usp=drivesdk","description":"Fagot 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1X4YG-y7rCcSdj_SC3hvdg6B1RDdVSvx1/view?usp=drivesdk","description":"Fl Piccolo - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GahiFqwGp_QW3S4BE3ktiUwisi-UDnaf/view?usp=drivesdk","description":"Flauta 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1klvdgD5KjPYfZ6SkiL6Sm5jE7rf_nsOz/view?usp=drivesdk","description":"Flauta 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12SycCGvCIWzA8tiPhURYUGmx_L_YP6ga/view?usp=drivesdk","description":"Oboe 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ioIY5Se0B3FL0wXbSZuWrquHXSPvoGwj/view?usp=drivesdk","description":"Oboe 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vB03DMQjO1SXoJ-ELwGilMJeUCxj5Qqv/view?usp=drivesdk","description":"Perc Percusión 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16QkSD4eDS5MSxUtZzevXW50gDg4fK4hF/view?usp=drivesdk","description":"Perc Percusión 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16SGazDon2187f1qAW-dTF7tAetYLs_j3/view?usp=drivesdk","description":"Perc Timbal - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12o3UkVs2aMja8-vtJ9PmiDbWJQxOvS_c/view?usp=drivesdk","description":"SCORE - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hzuxtxS7Pxc2zmPNJxsGEnK6dhpJlxvV/view?usp=drivesdk","description":"Trombón 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MJGPNtuucNT-XneEcvo9unOA3MvhFKph/view?usp=drivesdk","description":"Trombón 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1plyHbKkMykyRUgE9acB7H7X8R-YDftqM/view?usp=drivesdk","description":"Trompeta 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qOOEy6A16DrUAvwWXUr3aLm4Oh8vqf9r/view?usp=drivesdk","description":"Trompeta 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1a4MvjwcRRQxKdhaC2ztkSPPlMyK4VTx7/view?usp=drivesdk","description":"Tuba - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DN7TK-O_jnWYeL3-t0dbJXlmVrKcHypO/view?usp=drivesdk","description":"Viola - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1UCiMO0f-V9AsTTPNOLpB_Nh5ABz_t6ym/view?usp=drivesdk","description":"Violín 1 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19cJqJrpTgOKPS5a4szVPszIcJncq1PqU/view?usp=drivesdk","description":"Violín 2 - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NCU03yGZSeaXl6PTE5wLzubZE7mgqJqa/view?usp=drivesdk","description":"Violoncello - Otra Latitud - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Otra Latitud</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- espel-vidala

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1iyH7mPZa49Pd5znhSHiLDB0XqkKxOpho'
WHERE observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND titulo = '<p>Vidala del Martirio</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nTqkYPI-A4Iu_z3hqZHQ6xdZwDb8YcHU/view?usp=drivesdk","description":"Clarinete Bb 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wb_nhTWeBE3SVosdVwM5k8wneCYOGD1C/view?usp=drivesdk","description":"Clarinete Bb 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1EeFDfy-Ke47gKYCZv9WvHM7G2n2QyEx-/view?usp=drivesdk","description":"Contrabajo - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Mlc3O0YfeQQnAiuqXkpgRxD1a7BsQF37/view?usp=drivesdk","description":"Corno F 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WqQhRuCviZE5VtLb63-Pyy2g4VfuVkXv/view?usp=drivesdk","description":"Corno F 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vIKp_kotZ8VRWtANeWD78QNCmsmaAiwm/view?usp=drivesdk","description":"Fagot 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-yajNe2jg1EY1QliuN_C9dP_XCWmnLbF/view?usp=drivesdk","description":"Fagot 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/198-gta2dcce1Wzj7fVdUCeRvaF3LotKB/view?usp=drivesdk","description":"Flauta 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Cz67bBj_IGf-8ddpUAnfU1UwOGdPyqbb/view?usp=drivesdk","description":"Flauta 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pEJJ06BZO333-Qzs0fp-CydlMxJ15cRl/view?usp=drivesdk","description":"Oboe 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1npnBvcfE2-PJlVjuQrWjYgt2eYcH8ayA/view?usp=drivesdk","description":"Oboe 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pdJ-XBVUUPnwi_SDIKzosCekXQBeuGWn/view?usp=drivesdk","description":"Perc Percusión 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1J0APKKmA3RuACoFjNGnjbCzfDcKnJ3-N/view?usp=drivesdk","description":"Perc Percusión 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1jEtZyubHS0I9N9fZIfyHYOEY7bdt3_xA/view?usp=drivesdk","description":"Perc Timbal - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uzRFodV-Cq9uwFo8dA6b5N8x-3q2o8MY/view?usp=drivesdk","description":"SCORE - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XTqPHC6uBg0syUTMYFgojRMK4Y5Kxb0H/view?usp=drivesdk","description":"Trombón 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e3wjPC70rhYFXZ28dmPowb_r8UcB9MVl/view?usp=drivesdk","description":"Trombón 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12INx7EYP1KcXr8JLLax4VfVDoSYj0TNZ/view?usp=drivesdk","description":"Trompeta 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15wJj2UDyPNmZiov-hP_Q6Oiiu8tEz08A/view?usp=drivesdk","description":"Trompeta 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dcIVtLO_HW53bLPHI2-x4d1ZNPNzxv9M/view?usp=drivesdk","description":"Tuba - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nF99VoGeeC6Wvk8yhklDs27DhoSlCbhw/view?usp=drivesdk","description":"Viola - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DLzChAGDIB-X8viBmXh9y0cKTwbT5mEb/view?usp=drivesdk","description":"Violín 1 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SmelPx1uAMwkljgSRQhKFJeJ2bgN5fgx/view?usp=drivesdk","description":"Violín 2 - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17PAZosblvzYIvzFk0qPcwkc2FLuqW529/view?usp=drivesdk","description":"Violoncello - Vidala del Martirio - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Vidala del Martirio</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- espel-salir

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1s9vkj1AmUtd-xGu2oQ_1QPj3ExklWCAN'
WHERE observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND titulo = '<p>Salir al Ruedo</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/104DpLVfPHZKe2TC2izQRrpOogRnW_-XC/view?usp=drivesdk","description":"Clarinete Bb 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wWgpAe4M1aW2_zB-PXYHuA48ovIwrpJf/view?usp=drivesdk","description":"Clarinete Bb 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Md6ROXVBZITUhNIfcK-OK1e7t_7ZjQoX/view?usp=drivesdk","description":"Contrabajo - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17nNW2gPFup6a2T4yEsMulHD-jwQA9tRm/view?usp=drivesdk","description":"Corno F 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1h3wIhNKFvpiBpkqu8Fi9PiHY8dQsS7yF/view?usp=drivesdk","description":"Corno F 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1V-24BqYwu2GwRcIdrBYx97NwL2GEDcWu/view?usp=drivesdk","description":"Corno F 3 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1batH0F2ui6PGeNEU6BADm4umZiAksEIb/view?usp=drivesdk","description":"Corno F 4 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NkNgr1SdqzgXi7OAXSLoLJENcI4LC7re/view?usp=drivesdk","description":"Fagot 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/14Rp62LdN3vi_grnshtHtZACMm7Jp3qaM/view?usp=drivesdk","description":"Fagot 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1K3XF4C3UfMUqfmbI0cdV_NdG6Vr3KavK/view?usp=drivesdk","description":"Fl Piccolo - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DFfszJUvdKXOUpYsg9OV_Mrk_vpMgs23/view?usp=drivesdk","description":"Flauta 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ip2kIGjvy5RiNM0akbzvQ8MQZV1Lo7Kz/view?usp=drivesdk","description":"Flauta 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1o5KxxqpGWdYAydn92F0RfQm8-wPK_kzd/view?usp=drivesdk","description":"Oboe 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18pKPrTgxRKdSg0TQcYuafZ67OYZ4jNLW/view?usp=drivesdk","description":"Oboe 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11cq2DKAg1vMM6kwiflwUCjNe-IApWi0r/view?usp=drivesdk","description":"SCORE - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DGI2UVmBcj7eZ2hferdxBAisG502hO_A/view?usp=drivesdk","description":"Trombón 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_vHG7KGzgopQ5lT3MV5gYpMN1M1OPGle/view?usp=drivesdk","description":"Trombón 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1O8hnCCxfosQJbdTwfJAvT5POefnVMOLm/view?usp=drivesdk","description":"Trompeta 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1x95jyY9Z1TdfwBXRK3ESJ_6aJwN386re/view?usp=drivesdk","description":"Trompeta 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1t-nc06dadUvPCjqj01jtgxCW_25mX_kV/view?usp=drivesdk","description":"Tuba - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vMr8iHHLPqejmlV4IATA6P6D_K2vicfk/view?usp=drivesdk","description":"Viola - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-NJdMrKZJFKNfe3ipuPjM1BwbLVu_tFG/view?usp=drivesdk","description":"Violín 1 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wOBTm_ZpAB6P27bwcHnnQUfSUyAuqs9-/view?usp=drivesdk","description":"Violín 2 - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hSuR0HfCkQPLviRKbTkeZQ_uAp0ph4dp/view?usp=drivesdk","description":"Violoncello - Salir al Ruedo - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Salir al Ruedo</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- espel-fabi

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=10LhQhmH7D78YWSb5LqlHntetFvNum7uK'
WHERE observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND titulo = '<p>Fabi</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uH5eUR7y7Qb5M28jgUD9MGgEN9Z1MOHz/view?usp=drivesdk","description":"Clarinete Bb 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-v_K3oK0X-cGYmlzb52_QCGqGp2CNa1w/view?usp=drivesdk","description":"Clarinete Bb 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1n4Rp2eTTjXxrgIThEHU50PFzx2yDpuj0/view?usp=drivesdk","description":"Contrabajo - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MkuolCSJpw_kpbC7IzbYgnkUgk77DLLU/view?usp=drivesdk","description":"Corno F 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hWgbQmdByX1HGXX6zZiIbXbh97V8udMj/view?usp=drivesdk","description":"Corno F 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ae7ePdZstrXPOD0HbzecC2qtQLBHm0RY/view?usp=drivesdk","description":"Corno F 3y4 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ae7ePdZstrXPOD0HbzecC2qtQLBHm0RY/view?usp=drivesdk","description":"Corno F 3y4 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DcamshkAa0dMCL2CT5YzDiMqMhEAawFk/view?usp=drivesdk","description":"Fagot 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rLKz_21PCxhObO4t1DVh7ZBeyR_xpNwW/view?usp=drivesdk","description":"Fagot 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pEKtLOAmxVPTVE7J3uQRPPoWEVGAWfNe/view?usp=drivesdk","description":"Flauta 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PyEnqkNa1GC4hEU78Xz4GxOY5qKLFiHb/view?usp=drivesdk","description":"Flauta 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ztrnzHlNrpBfNAiOiTGrgY4AVU_UJqna/view?usp=drivesdk","description":"Oboe 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1a_-BlZTZgJzpu0fTTH3vVU2Yna2Smqz6/view?usp=drivesdk","description":"Oboe 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qbBwillpTfDF8nXyIK22yDae0Xmky9NP/view?usp=drivesdk","description":"SCORE - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZH7viC5TGrg8uHQzeGnE6qdH8Gr-fStr/view?usp=drivesdk","description":"Trombón 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uQ7zJOc0Yvtrow_YVY1Kos2Gve2-cXbL/view?usp=drivesdk","description":"Trombón 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1w9yCvRl9ZFUzCVWXyUt5FjQhaNN5UpTF/view?usp=drivesdk","description":"Trompeta 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Z3m9g0hpg6j4CghsEZsDnpDHaj-mM0vK/view?usp=drivesdk","description":"Trompeta 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vC6V2dC8N_xmVqdtViLTpm8bl55fI7Qs/view?usp=drivesdk","description":"Viola - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JOettFYTGbuBhXLuAfLSv8ljAX1OGxYR/view?usp=drivesdk","description":"Violín 1 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1a1lMNkxFdrE8NKKE1zRX_IUK5Vqc2qMD/view?usp=drivesdk","description":"Violín 2 - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1tjfBgOP_yfAplN3fdxb_urF91Lk7Y9fl/view?usp=drivesdk","description":"Violoncello - Fabi - Espel, G.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Guillo Espel.'
  AND o.titulo = '<p>Fabi</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- retamosa-anos

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=18WXpBpT4srxDXqiLQf_qpe-NV2-ph2hF'
WHERE observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND titulo = '<p>Años de Soledad</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Vju1J1xVy8H2nR31rKHtv6oyEZoQFdI5/view?usp=drivesdk","description":"Clarinete Bajo - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rGBjhLCNFxl6D6gfApqYc-eIYNl8_R2v/view?usp=drivesdk","description":"Clarinete Bb 1 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pxUN6dVvsEVA0-w4Lcb5r_g4B1aUoOfh/view?usp=drivesdk","description":"Clarinete Bb 2 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rYFoWaP0Or_0oEew2d5QVGs05a-qRxzu/view?usp=drivesdk","description":"Contrabajo - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17ipDs-vVg_73agurlSV5nv3EBbgei4wF/view?usp=drivesdk","description":"Corno F 1y2 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17ipDs-vVg_73agurlSV5nv3EBbgei4wF/view?usp=drivesdk","description":"Corno F 1y2 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MhzdXFy2QMseuhQ98cBma0j76Q0UHnEA/view?usp=drivesdk","description":"Corno F 3y4 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MhzdXFy2QMseuhQ98cBma0j76Q0UHnEA/view?usp=drivesdk","description":"Corno F 3y4 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1m_FRNSrzR8FbcqHbPhnYEuT6W-VDrf6Z/view?usp=drivesdk","description":"Fagot 1 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IhwdefmG_pHCIi9sNOGMI-_lghQgE6wP/view?usp=drivesdk","description":"Fagot 2 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1aoceS0X3NePokCEBYAiRST9TUMlbyIML/view?usp=drivesdk","description":"Flauta 1 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1FYau37IDCGUF2sXtxYscVlhjXxnDlTce/view?usp=drivesdk","description":"Flauta 2 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1YTha2Hv4ABkig0sl7mbTCpX8h1XibfD4/view?usp=drivesdk","description":"Glockenspield Anos de Soledad - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Glockenspield Anos de Soledad'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TSmBreb2T3Qj5hadQRUECy7qIH3SbgAi/view?usp=drivesdk","description":"Oboe 1 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OInRjSTkLYdrQsvHxiVorIO3dQ5jzUdq/view?usp=drivesdk","description":"Oboe 2 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qbPN98Py5lN_rLOnX2z42CKIeh1haDBy/view?usp=drivesdk","description":"Perc Bombo - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oaz6_uvpWNs7uDx6kmzIg8mF5hxIRxAz/view?usp=drivesdk","description":"Perc Tambor - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Perc Tambor'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oO_6EHoIwY4ZLoMOW10tlHdFDppgnTgG/view?usp=drivesdk","description":"Perc Timbal - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1arikUCbVSS1wgaN_GfEMPFNPlkxm_yFk/view?usp=drivesdk","description":"SCORE - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1aHTcU9YEDtYW61WBLz_rBUZIWNmY4zd_/view?usp=drivesdk","description":"Trombón - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GNBrhcrekcmyPkhlsvEGLd4S1lcPyHTZ/view?usp=drivesdk","description":"Trombón 1 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11dAFcmfQ9OVKH0vAiSRpvm6Zhj2-S034/view?usp=drivesdk","description":"Trompeta - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e_An-ZKkrrLyDP-7EnGIqMP2aEJbMHdW/view?usp=drivesdk","description":"Trompeta 1 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18Neqhe-FpaEPLaLkCLdWZYUue6K6vHHq/view?usp=drivesdk","description":"Tuba - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1otA6avs3G96jEoifX_77V8WUr0sDvqqw/view?usp=drivesdk","description":"Viola - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15LTfw5J78sa3qRaZoTNi_7-DAz4qO4G7/view?usp=drivesdk","description":"Violín 1 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qoFPsoB19YA5DPVWAOlxOk5eeUmofpqq/view?usp=drivesdk","description":"Violín 2 - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-8DZ3zBIIUqstHzHyKEXqUBSWcCQjQOA/view?usp=drivesdk","description":"Violoncello - Años de Soledad - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — distinto de Piazzolla Años de Soledad (#2140).'
  AND o.titulo = '<p>Años de Soledad</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- retamosa-dia

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1n5SAErBZKcf5c8i4jtEV-AB2gJ8ga383'
WHERE observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND titulo = '<p>El día que me quieras</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yTtCEDDYcqVNrunu1hz2qOi5F78Ma99I/view?usp=drivesdk","description":"Clarinete Bb 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kMP5kLfytGGjNfkO3INc9ks72v-MPJs3/view?usp=drivesdk","description":"Clarinete Bb 2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wY7ZtDXcLV1TzDTS9TKogPM1jBLxx4ID/view?usp=drivesdk","description":"Contrabajo - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1FgfJfMHAg7HTssJY1dzE67CHTBMwkcYT/view?usp=drivesdk","description":"Corno F 1y2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1FgfJfMHAg7HTssJY1dzE67CHTBMwkcYT/view?usp=drivesdk","description":"Corno F 1y2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oWmJHbpBGSQUrmeum11LceKVVEYVJkHl/view?usp=drivesdk","description":"Corno F 3y4 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1oWmJHbpBGSQUrmeum11LceKVVEYVJkHl/view?usp=drivesdk","description":"Corno F 3y4 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uHSdLqrLiQkIo-TjpNwiV1vsvUb3Odc1/view?usp=drivesdk","description":"Fagot 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1y_KSt_9GBGSQrGUaDuJtHorCSigdf5bz/view?usp=drivesdk","description":"Fagot 2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JT50RTzipK4YTZlX_cj4nkO-09DevO0M/view?usp=drivesdk","description":"Flauta 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZRQ--VwLRM-EGanMvP97Rj06Y2C1BAFb/view?usp=drivesdk","description":"Flauta 2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KVpKrwPUmoO4eQObHx1mAYunevLvuPPU/view?usp=drivesdk","description":"Oboe 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hQn5eRXF3PEL1Q5qdTTeg99lf4_uA5Cu/view?usp=drivesdk","description":"Oboe 2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nAPDSi-s3EVBqLB7dIl2Yosv4W4LQIWh/view?usp=drivesdk","description":"Perc Percusión 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_2LJVyV3FtFzR28Oeczl0QKgxaIVZrkO/view?usp=drivesdk","description":"Perc Percusión 2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19bNncWUBrM37w1gio-G6dWqiWIke7RLE/view?usp=drivesdk","description":"Perc Timbal - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1g_CVAvBXiIMeLkHaW8ldPx3_209XMviN/view?usp=drivesdk","description":"SCORE - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TLi33HCrN1db1nIeCEKCIlUpjQl9PcVQ/view?usp=drivesdk","description":"Trombón - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KkTPN2pkFdH8GNGFnTn4v1pEEH0Xb3Ni/view?usp=drivesdk","description":"Trombón 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eFUB8JWPEk5v6NHUJKUPIT_3HRPqTDVY/view?usp=drivesdk","description":"Trompeta - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LNuw7azn-M4j5m-mlPy-gnWPWrYoG-G1/view?usp=drivesdk","description":"Trompeta 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11HBOiX5o_wOJzatetvcpWFNoRxtyWkK8/view?usp=drivesdk","description":"Tuba - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kjyyQWIPUFiDui9KQFNSmJ0Qjyj0-3xo/view?usp=drivesdk","description":"Viola - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Fh4b__NSPkxrJQprHPkdcNw5UXf8u12y/view?usp=drivesdk","description":"Violín 1 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1P7Wiziz8v56DXvWCghUYDxECDYwg3jDK/view?usp=drivesdk","description":"Violín 2 - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11aL0pVL87MTUvIcCmwzKHUR6eBdghqYK/view?usp=drivesdk","description":"Violoncello - El día que me quieras - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).'
  AND o.titulo = '<p>El día que me quieras</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- retamosa-reminiscencia

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1hd-POLJ_JuMdqPz_-W57cCIWcSpOzez8'
WHERE observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND titulo = '<p>Reminiscencia</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1A7kRkdLByPxwv48iONzhmVo9V9jW4M6y/view?usp=drivesdk","description":"Clarinete Bajo - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1j6e8PRhF3TpEOHHzvq_NKaZsmsEWdvnM/view?usp=drivesdk","description":"Clarinete Bb 1 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qDnTvzJ359tEGFRBLHX8g9kP3yDEnN0e/view?usp=drivesdk","description":"Contrabajo - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1skRThZow78aavtwse61s2un_3gbz5_U-/view?usp=drivesdk","description":"Corno F 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1skRThZow78aavtwse61s2un_3gbz5_U-/view?usp=drivesdk","description":"Corno F 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nFE7L4zitgfSup7zN3Q6RtSTQw-1a132/view?usp=drivesdk","description":"Corno F 3y4 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nFE7L4zitgfSup7zN3Q6RtSTQw-1a132/view?usp=drivesdk","description":"Corno F 3y4 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XeqAimlxu8oxvM2sDDUt40Jx0lcVE7Dq/view?usp=drivesdk","description":"Fagot 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XeqAimlxu8oxvM2sDDUt40Jx0lcVE7Dq/view?usp=drivesdk","description":"Fagot 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TFmrZa-Qyj2hyHtdPI77S0TfRmkzzu6g/view?usp=drivesdk","description":"Flauta 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TFmrZa-Qyj2hyHtdPI77S0TfRmkzzu6g/view?usp=drivesdk","description":"Flauta 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uCW29G9qf3fvACs1zC9glbXCqSaQ2seY/view?usp=drivesdk","description":"Oboe 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uCW29G9qf3fvACs1zC9glbXCqSaQ2seY/view?usp=drivesdk","description":"Oboe 1y2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1z8qxYTXu_ma0EDJ0i8S9kFHOV5_E2fjY/view?usp=drivesdk","description":"Perc Batería - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Perc Batería'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1O-wkzZ9YazyyK4uxZcL-cdcq8KURObrN/view?usp=drivesdk","description":"Perc Bombo - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LHnQKxZoYZbfElabeIgms9ii645zkLH7/view?usp=drivesdk","description":"Perc Glockenspiel - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Perc Glockenspiel'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MfJ0GiNehHXG040bnofkrYx1UQFan8FH/view?usp=drivesdk","description":"Perc Timbal - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AhoCqnqrTenxcmtRARy2mwRlgUnzhJCH/view?usp=drivesdk","description":"SCORE - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1UDd5MFbrBh5XQMSGTnIEv7IBHHGX6gkh/view?usp=drivesdk","description":"Trombón - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KhWBNGQds_2R0-6x37y-A_9C1Ci-Q8cN/view?usp=drivesdk","description":"Trombón 1 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15oEde1GTx1JARVuNhw69d-n8zmuZA1CT/view?usp=drivesdk","description":"Trompeta 1 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nC8RH5f4X3zb3GTuEVIfG-8_JRhe89F5/view?usp=drivesdk","description":"Trompeta 2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Dm4lVXdspT4IgQTNXTokzltdZfLlfduS/view?usp=drivesdk","description":"Tuba - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eX2gXvSlQduT3bpXZguvBYKk_rbk5tVJ/view?usp=drivesdk","description":"Viola - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17l1SsgsVOXOleaGLa0kdgG-3rkZDfo0X/view?usp=drivesdk","description":"Violín 1 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dm80pIfKqHOv5cC0UVk0NqKqP1kFyJHN/view?usp=drivesdk","description":"Violín 2 - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pVH7dPLtOkR2I5jLIbLsL0iS0BaXuTnL/view?usp=drivesdk","description":"Violoncello - Reminiscencia - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Reminiscencia</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- retamosa-toda

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1_Yl9FOFcxYdU3D0XMyJd9Q920wMFFByg'
WHERE observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND titulo = '<p>Toda Mi Vida</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_YKiu68LZHa1hLrCz6j9zYeISuFd8cJt/view?usp=drivesdk","description":"Clarinete 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Clarinete 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_YKiu68LZHa1hLrCz6j9zYeISuFd8cJt/view?usp=drivesdk","description":"Clarinete 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Clarinete 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1v4UQUFf5drXVxzEP6mTsWHw9P9nRPydU/view?usp=drivesdk","description":"Contrabajo - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1px1PWw_ih1dxQK55lzMclse5sy4FShPf/view?usp=drivesdk","description":"Corno F - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17KWnanELfTYfNBEsyIP1zZqUX61Xc0zA/view?usp=drivesdk","description":"Fagot 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17KWnanELfTYfNBEsyIP1zZqUX61Xc0zA/view?usp=drivesdk","description":"Fagot 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1fVEp16SkEC3-0WQPy17mwvA8u6ERKh5X/view?usp=drivesdk","description":"Fl Piccolo - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bu1pyu8fCUlNp3x6dJOQJlkMdeS4elhE/view?usp=drivesdk","description":"Flauta 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bu1pyu8fCUlNp3x6dJOQJlkMdeS4elhE/view?usp=drivesdk","description":"Flauta 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15rz70MJuQegCkrh1IzdR7BkmJret4Pue/view?usp=drivesdk","description":"Oboe 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15rz70MJuQegCkrh1IzdR7BkmJret4Pue/view?usp=drivesdk","description":"Oboe 1y2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GRZ96hM5YfkrqFMJXZ_5pnW1SZIr_yh7/view?usp=drivesdk","description":"Perc Batería - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Perc Batería'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vMAroSUw_mYebk3HLrMBmQnO2VJCcawQ/view?usp=drivesdk","description":"Perc Glockenspiel - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Perc Glockenspiel'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1UWqyf-lOaCSbwK66x0X4-0uYxZmP6IZj/view?usp=drivesdk","description":"Perc Percusión - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KN0jVKJqCKcYEdujTPeeFtz4cU2xrk9j/view?usp=drivesdk","description":"Perc Timbal - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IThOqqLtrF51xRtdvOXDMg-Eyaq4dyKF/view?usp=drivesdk","description":"SCORE - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IHJlNyVWH3RfMtM1CcXJo97-vVzVOaQS/view?usp=drivesdk","description":"Trombón - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/187Y1hEBm1peGvhTJjWsxd35A03umXh92/view?usp=drivesdk","description":"Trombón 1 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1VfX6bxxCUao-c-r7UtSlfptFyshrdzuB/view?usp=drivesdk","description":"Trompeta - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sUnz9764o1Ev9N_yQNcd8qkQhUV7JQ0y/view?usp=drivesdk","description":"Trompeta 1 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Qvz7YpbIOv47X8wbINUE0TwUNad63QTu/view?usp=drivesdk","description":"Tuba - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lI8i3lcanUBwGPPbRn1_TfD4_d6u3KQY/view?usp=drivesdk","description":"Viola - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1m-piS6zbXv9kItFqF-roazYlPf1AMRlg/view?usp=drivesdk","description":"Violín 1 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yl1hXa_3aMGgWzE9w8ZzUXUQ6q-LeSSl/view?usp=drivesdk","description":"Violín 2 - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eyR1tKTW5DKTD_LVNDrtqIP6gCSeyg6Y/view?usp=drivesdk","description":"Violoncello - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1po-EiYYkA7LHPd3QN1CAJuU_32p_C-f0/view?usp=drivesdk","description":"Voz Toda Mi Vida - Toda Mi Vida - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Retamosa.'
  AND o.titulo = '<p>Toda Mi Vida</p>'
  AND op.nombre_archivo = 'Voz Toda Mi Vida'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- retamosa-concertango-1

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1Nm0D5ALi1xI8Cmz55OV-2z0TV0Oyem3v'
WHERE observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GNp2xTyP5YsYUZInXzMpLlxtZU0_lEJx/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Clarinete 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GNp2xTyP5YsYUZInXzMpLlxtZU0_lEJx/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Clarinete 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11QMcvWqAJZON9dSsZq8nTouQ4bcbgZeA/view?usp=drivesdk","description":"Clarinete Bajo - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1gj2bv0cxhHjyFROtwp57YnUxpPjUKokt/view?usp=drivesdk","description":"Contrabajo - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1893_aq-644dhKBrop4owJYYE-sAUmxON/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1893_aq-644dhKBrop4owJYYE-sAUmxON/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1P9nz6T98yrz2TR6gT5LFyH7osCJzF1GH/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1P9nz6T98yrz2TR6gT5LFyH7osCJzF1GH/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15M1Ll4yFy65v5Q8Czmam-XgXdtT7vqC8/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15M1Ll4yFy65v5Q8Czmam-XgXdtT7vqC8/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/15idqjlo1sJiojShddcN9nsVspEERZ0cf/view?usp=drivesdk","description":"Fl Piccolo - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RCL6BJDtHr3Ju8V1HjrTWjG7p0MqsaWa/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RCL6BJDtHr3Ju8V1HjrTWjG7p0MqsaWa/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hlyaaIYiaPBdIfbRGas36_oqS6D0rVGF/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hlyaaIYiaPBdIfbRGas36_oqS6D0rVGF/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BT4SGihRPbedZs7jCT9iHW4OCmuAfDhe/view?usp=drivesdk","description":"Perc Percusión 1 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JE7--sp-nJ7iDACIYdvbIo9p23dZwib0/view?usp=drivesdk","description":"Perc Percusión 2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PvFGQY6Hxn1n02DPh1q45RmJA0ssalQJ/view?usp=drivesdk","description":"Perc Platillo - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Perc Platillo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-unJSwgzz1wmjl0lA84_Gx6QPkJxFF-9/view?usp=drivesdk","description":"Perc Timbal - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LCI0ZiHAbvruRJmImaAySZ3UyIWVDXwB/view?usp=drivesdk","description":"SCORE - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Q87IjbmWyuroOwBdZuhtzCWvZiQRzSwM/view?usp=drivesdk","description":"Trombón - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vh1lYr620NKYKo4fFqx5A5MiKX2Bop6U/view?usp=drivesdk","description":"Trombón Bajo - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HnRuLhGlVdrHNihH_CKO7DP_EB0VjBaV/view?usp=drivesdk","description":"Trompeta 1 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Xx9RRYxR_1fbmMn44na59S43r4IUP75L/view?usp=drivesdk","description":"Trompeta 2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XZakziwXvso17jbqe2IVtIJbIgAGPTde/view?usp=drivesdk","description":"Tuba - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RLIMJhzqy7J-HdHdgHNxB3INgfGMPVU5/view?usp=drivesdk","description":"Viola - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lI04BhBjWrcbUOCyrKpOCp8uR9Cii6tv/view?usp=drivesdk","description":"Violín 1 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qnUJRLdWnXI9X2IkYOTz0xZ--P00i1Fk/view?usp=drivesdk","description":"Violín 2 - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1a6pqelK_Mw--yRJmmiKXzkUfsHMor9WK/view?usp=drivesdk","description":"Violoncello - Concertango (I) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 1er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; I</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- retamosa-concertango-3

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1SdSifq-IEXxh0xhTu0sfi48nhOc578tu'
WHERE observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1k-5pGmIVSDraOAVO3q6w5ooQx7cA8eH1/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Clarinete 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1k-5pGmIVSDraOAVO3q6w5ooQx7cA8eH1/view?usp=drivesdk","description":"Clarinete 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Clarinete 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TnqZ8Uz9CR6XZHEnGhKAI0DA3ALNN3k-/view?usp=drivesdk","description":"Clarinete Bajo - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rJCfjcOqub41sU9fbAssC59szMx0F2QR/view?usp=drivesdk","description":"Contrabajo - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10kRT-yS7B5IzhpFi0EDL95KjOvYJ3vZG/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10kRT-yS7B5IzhpFi0EDL95KjOvYJ3vZG/view?usp=drivesdk","description":"Corno F 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11GeawV7iOlUbY1uO6bSKer2xGwGyM65n/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11GeawV7iOlUbY1uO6bSKer2xGwGyM65n/view?usp=drivesdk","description":"Corno F 3y4 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LGqJccArvzD5uYgrexsMydDgEGGxJ7WP/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LGqJccArvzD5uYgrexsMydDgEGGxJ7WP/view?usp=drivesdk","description":"Fagot 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eATy6ZAEAV_iqIhJGytWII83ql-uEAQV/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eATy6ZAEAV_iqIhJGytWII83ql-uEAQV/view?usp=drivesdk","description":"Flauta 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SDxZcglXeVn5c_fMGMSg30e7jy36NcGU/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SDxZcglXeVn5c_fMGMSg30e7jy36NcGU/view?usp=drivesdk","description":"Oboe 1y2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dVM-Gib-Ev8ZRSFRhIVH54VJpwxRkjyc/view?usp=drivesdk","description":"Perc Percusión 1 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1njf19qt_KWMqdaUd6M-big55QBCbYiC2/view?usp=drivesdk","description":"Perc Percusión 2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ihOrJCIos_dHkhQs7MiAxAvk1twVyDx-/view?usp=drivesdk","description":"Perc Platillo - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Perc Platillo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1x0FUzEj00z4j5W7hqgetEXGdF-mVapJW/view?usp=drivesdk","description":"Perc Timbal - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rC3EM51NHKcTzZbsfPpsCu858TGgOMqu/view?usp=drivesdk","description":"SCORE - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1fDckqW5vl2Xh8MtSBC5IJQ9qarYcvfMc/view?usp=drivesdk","description":"Trombón - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_OTq-haNS_naUq8p38hyzl9EWpOrIhw0/view?usp=drivesdk","description":"Trombón Bajo - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qZXaDCK9l1SsNKbovVVqV-1KWbhT3OLh/view?usp=drivesdk","description":"Trompeta 1 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1v0mwcacB_fPqUfOa0rIWYYlUF0gXvdAW/view?usp=drivesdk","description":"Trompeta 2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WrZrm_dAiFsQBpnx30DrF38DFvTn-DWX/view?usp=drivesdk","description":"Tuba - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hnhBt807ECOvTNsDy1tBG8j--lwF_vxK/view?usp=drivesdk","description":"Viola - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sEKERIRS071IU39Z6mqKWTI9_hp8cGCU/view?usp=drivesdk","description":"Violín 1 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_kALQSxiOCX68_REUZZGRdvp-xfF3r3M/view?usp=drivesdk","description":"Violín 2 - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/17X3GuF1M1BIiS04xPpxn4uCdvmAiF1bi/view?usp=drivesdk","description":"Violoncello - Concertango (III) - Retamosa, J.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Concertango 3er movimiento.'
  AND o.titulo = '<p>Concertango</p><div>&nbsp; III</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- nicoletti-qhapaq

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1hZyjA_FVB80zoLl7RAA-nQwPzKjW1vCA'
WHERE observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND titulo = '<p>Qhapaqkunap</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1x0rwNs1ExcMCf5PoHwAEJ2SO0-1st4jj/view?usp=drivesdk","description":"Clarinete Bb 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1w7XK2nca0r26F4pgWE-yXkAnRZff91Gy/view?usp=drivesdk","description":"Clarinete Bb 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1yS_kOPPnCW1nw1eGX5ruDAUR8DVR6UUw/view?usp=drivesdk","description":"Clarinete Bb 3 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Clarinete Bb 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nPbNnPW1qIVWr9WJAXULWWUyn8xqKyrD/view?usp=drivesdk","description":"Contrabajo - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dOXmMIlsGMueP1I36Gf2txF0rubvAj-q/view?usp=drivesdk","description":"Contrafagot - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hzlwg48oT0sx7yb-3pIutgyz7a74rdt_/view?usp=drivesdk","description":"Corno F 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1w3m8iDpHX_ExcAkmkMSRPvQ_yY8Xx9T9/view?usp=drivesdk","description":"Corno F 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1akCGL-l2JemCQzHrTD56vtFHteggnfj5/view?usp=drivesdk","description":"Corno F 3 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cXCuUqkMQ6KDPVOmU-P8ToECGjIEx7Xx/view?usp=drivesdk","description":"Corno F 4 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LG3CDFBw1rzzIT5xTwiIA8OAQp_gsbhp/view?usp=drivesdk","description":"Fagot 1y2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1LG3CDFBw1rzzIT5xTwiIA8OAQp_gsbhp/view?usp=drivesdk","description":"Fagot 1y2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AZKmuzdh9F2y3mdzZxKc42rltnuGblA2/view?usp=drivesdk","description":"Flauta - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Flauta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-Vo_fNSXK8lU2nu9d8ILVnkM6yXfeSoL/view?usp=drivesdk","description":"Flauta 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1icxgD-WsjZr_VACq_uSqQuqBrw9eG2Hu/view?usp=drivesdk","description":"Flauta 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PydZ_rd9yQiQ_1i4ig5C47BGEYLWmPds/view?usp=drivesdk","description":"Ob EH - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1N8SMlIUUg3YPHjnXAVKDqUN1ZzD_GyYo/view?usp=drivesdk","description":"Oboe - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1G6x2wfrUhkz02xgfeYTy_YhCVU6yFi52/view?usp=drivesdk","description":"Oboe 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1QHw6zP7KES-1_bMQmDEUNK6P7OFUmlwU/view?usp=drivesdk","description":"Oboe 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CDw5uR-3nvoaFOGY4fvhmDiZRI6YXyQC/view?usp=drivesdk","description":"Perc Percusión - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AHMhXVUAvkqAY37I7oLry3nyKt9oDWSJ/view?usp=drivesdk","description":"Perc Percusión 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ucW1ikEvDmdzxRR7IHyOkMRjEf3_SBCE/view?usp=drivesdk","description":"Perc Percusión 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12YHywqzN1OsQVLkYL2Wf3zPel-5ewXt0/view?usp=drivesdk","description":"Piano - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SyXZHopdTMnHwlhC3VMp70ywMqoC7XZ9/view?usp=drivesdk","description":"SCORE - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1fqYtjqrl5fgtyC2U6r67Qzo536fsoxDs/view?usp=drivesdk","description":"Trombón 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Tj4JcPpeO_8k59xvWWThQRy9gaeaeQkl/view?usp=drivesdk","description":"Trombón 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sxLIZIcXoo6SycV07DjYN4OfJCRUSM-N/view?usp=drivesdk","description":"Trombón Bajo - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13rj_XI_mdPhk2ZFPBgNQv0jzY21ZVsqM/view?usp=drivesdk","description":"Trompeta - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1w59AvU0rP-wlOg5iV9u8t_narc91fk8L/view?usp=drivesdk","description":"Trompeta 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bGCQ1BVOZe4BaI5t7mVBxdkwGFo7VkMM/view?usp=drivesdk","description":"Trompeta 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sFt34taslGZs13i_IIYyeHEULtEIxSY9/view?usp=drivesdk","description":"Tuba - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1y5pUq7bRkGiyS8LQ5Swkb450xo3qbYPg/view?usp=drivesdk","description":"Viola - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1aPdyaZztuWjGFhHGkLz0pP_65vCsLsCc/view?usp=drivesdk","description":"Viola 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Viola 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1G-ShG1FPzh3TlpGi0wVtDEyyUBh3vXIr/view?usp=drivesdk","description":"Violín 1 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zzgxRwFdyGIvdvhbTYGC4uVqHe1Dq4gi/view?usp=drivesdk","description":"Violín 2 - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10QxuUuNGcr9mNqxlYHW6OTvocEqKoeAi/view?usp=drivesdk","description":"Violoncello - Qhapaqkunap - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).'
  AND o.titulo = '<p>Qhapaqkunap</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- nicoletti-bishmaia

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1bI1DVDBmJ2Zs3BxYFRd0-7ES35knpHqR'
WHERE observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lDWRNGBG228oNr7Fe_ZPxWjblBghIVvI/view?usp=drivesdk","description":"Clarinete Bb - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Clarinete Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GGlwEJQfRCOOQ8MtNJ_fhkJjoPzGfHNB/view?usp=drivesdk","description":"Contrabajo - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XDSPOGA76TB1_X6fZbWoQtdZdZfY_ABq/view?usp=drivesdk","description":"Contrafagot - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DEaP9upKTKhHysUteKlxW_qOxyDnWeeg/view?usp=drivesdk","description":"Corno F 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Corno 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DEaP9upKTKhHysUteKlxW_qOxyDnWeeg/view?usp=drivesdk","description":"Corno F 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Corno 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u7T_YQ2mmA_AceBdKrHfQR1tXz5Szcv1/view?usp=drivesdk","description":"Corno F 3y4 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Corno 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u7T_YQ2mmA_AceBdKrHfQR1tXz5Szcv1/view?usp=drivesdk","description":"Corno F 3y4 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Corno 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pfE7eXOkv8-HaS1aiWYb5eNqFnIOnp9_/view?usp=drivesdk","description":"Fagot - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Fagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PpVVtJ66U24T0Fve9MDin02w9zrDFZ3R/view?usp=drivesdk","description":"Flauta - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Flauta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kR8hMXfjZguKzfgvNYk5LAtmxjLLK6jt/view?usp=drivesdk","description":"Flauta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kR8hMXfjZguKzfgvNYk5LAtmxjLLK6jt/view?usp=drivesdk","description":"Flauta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zsPvjT-Z2zDemlabNENZzLDDFlzz6LDU/view?usp=drivesdk","description":"Ob EH - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mlScACTnnHvAmztIn8_cXDBVx7yQCBwK/view?usp=drivesdk","description":"Oboe - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZifistsLd7SoRqs7aVBF5cOLtb4QG29p/view?usp=drivesdk","description":"Perc Bombo - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1tqsUlBygWBb1JqX1nKppNku6Pu6kCyRP/view?usp=drivesdk","description":"Perc Campanas - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Perc Campanas'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18HTqce6TPvcY9Ne76nVQmOrdAi-BOEEH/view?usp=drivesdk","description":"Perc Gong - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Perc Gong'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16jWrLBE8CG2V7W07qwrmpEmHvFPHEsyr/view?usp=drivesdk","description":"Perc Timbal - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IhI2gFCwBBgp7epHIXnFfVsBufob3VNU/view?usp=drivesdk","description":"SCORE - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vuJ-nnOxRT5NuN-zQHEPB2OfxLKl6IyW/view?usp=drivesdk","description":"Trombón - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AyCQ5ZGcZ8o612LoN8XDGH5w8DIt2Uh7/view?usp=drivesdk","description":"Trombón Bajo - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OxaQ59lT0xKnDTfPw1biAfbrDbt3MQHW/view?usp=drivesdk","description":"Trompeta - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1biLqz265x_GLsBJB_XBO1K7tnq6yu_Lv/view?usp=drivesdk","description":"Trompeta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1biLqz265x_GLsBJB_XBO1K7tnq6yu_Lv/view?usp=drivesdk","description":"Trompeta 1y2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1P5ts7BR1r8X-IBNRh615HtHjhCByhwYX/view?usp=drivesdk","description":"Tuba - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1nsHHALO2dOT-7-Lw3T3EMvdZRGIUQFZo/view?usp=drivesdk","description":"Viola - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1VlN0qfdfS_OdJH2Ps2fhiRBnbwUeD4Za/view?usp=drivesdk","description":"Violín 1 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16e4F2_OpbFq8dFcgOmLFtH9q2n90Ivp2/view?usp=drivesdk","description":"Violín 2 - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1avn8YuoBcPEfztBRrFKivMSQpNKvWv-x/view?usp=drivesdk","description":"Violoncello - Bishmaia Hanacpachapi - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Bishmaia Hanacpachapi</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- nicoletti-lonquen

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=13L64wpHsFCfdkH-QEKE-PMXZ-uDnvHJp'
WHERE observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND titulo = '<p>Lonquen</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1T7OXqKFWANg8N2HZyq4daDHz8cnmt-vP/view?usp=drivesdk","description":"Clarinetes Lonquen - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Clarinetes Lonquen'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1eFJvw6P2Z2M2Zq7XV_dqjsilh9aKuJmj/view?usp=drivesdk","description":"Contrabajo - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PFMHXhavRmouptCatQ1xAZk_7_soNGgF/view?usp=drivesdk","description":"Corno F - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CwmDjhVKzxq2LpYsiFdXpFYPo5_TuSfM/view?usp=drivesdk","description":"Fagotes Lonquen - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Fagotes Lonquen'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Dhxsa-hg_0wdgrFiAHxzFGn2ffeTSJvf/view?usp=drivesdk","description":"Flauta - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Flauta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1M39KbzvR0soONRn0hXgc_c05nk3rv5UK/view?usp=drivesdk","description":"Flauta 1 - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kHWD9Zy_GKoDQNglIF5nWfiiZqSyXfhE/view?usp=drivesdk","description":"Oboe - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Oboe'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zVOVTBvSXGKR3mskKKjWb9cvVkL5JT34/view?usp=drivesdk","description":"Perc Percusión - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16TMhOWpFCU5qzKoNIxexPOoVxarBpmWx/view?usp=drivesdk","description":"Perc Percusión 1 - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Perc Percusión 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1G8KcUg5ABI-FWJUbOsaJs4eFD1wTROWU/view?usp=drivesdk","description":"Perc Percusión 2 - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Perc Percusión 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1EJZ8YR_O22xnENMd7bzJ2plOH-WiCblu/view?usp=drivesdk","description":"SCORE - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1JkEMk2h0P5KNzLbUeymoLLQVn5dmHAbD/view?usp=drivesdk","description":"Trombón - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Trombón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1q6INdO85gHaVUOuu0f0lteYAcBmkRpLe/view?usp=drivesdk","description":"Trombón 1 - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1IIVPhtEqDL4insATRAVx27AZjnrBmDte/view?usp=drivesdk","description":"Trompetas Lonquen - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Trompetas Lonquen'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1P6g2uw6cnn7N2BBlig2S46uQ_jSc0x0s/view?usp=drivesdk","description":"Tuba - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Sht6mvRUoOBQRnlcF8q0qPM0IJZo9lNG/view?usp=drivesdk","description":"Viola - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cxOFNhisJ3bZL7BPqyRJkNXzQmovtFG8/view?usp=drivesdk","description":"Violín 1 - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1kIuJ6AwLoAFrQfGdFKQrYIFEfMrApQye/view?usp=drivesdk","description":"Violín 2 - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1n8Jv32KrNe2RevKAONC4PACiHuN-X3QG/view?usp=drivesdk","description":"Violoncello - Lonquen - Nicoletti, J.P.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/Nicoletti.'
  AND o.titulo = '<p>Lonquen</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- secreto-cancha

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1qxuN7xj1qod6c3NPr6czc2G5IAFKSMtW'
WHERE observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AHqWoND2I3uaCs15YXSigBgKG2zHnNkr/view?usp=drivesdk","description":"Arpa - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ERNvPryXIaJ0B8IGoB6w3MX7QxqZdp6j/view?usp=drivesdk","description":"Clarinete Bajo - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hFXT-gDYEX5ahfn_VQU9tugs6N-LjNOV/view?usp=drivesdk","description":"Clarinete Bb 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16dZPXL_mtdNqVyA1xBPYIVO9ZGf_3FS1/view?usp=drivesdk","description":"Clarinete Bb 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WERlTktlvxoXTYsHKjzZtoftG09oGkai/view?usp=drivesdk","description":"Contrabajo - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RVORy69K9ra_B8uc7LKTJbR--qAbu-11/view?usp=drivesdk","description":"Contrafagot - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HLnfmKFDqkRPC1OZHXotHmI4yq4SV49r/view?usp=drivesdk","description":"Corno F 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Q90oCefPOn42dfzIFKBeMvDd8yc1hb9l/view?usp=drivesdk","description":"Corno F 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Tud6qdTi3i5ImffTzXfMyzRGOWR3h_fo/view?usp=drivesdk","description":"Corno F 3 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mFW-fCGb9T90eKQuYdSoc453tZ8nXl3q/view?usp=drivesdk","description":"Corno F 4 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10Jas8_bj--42B_bkhlH3rkz3f-in3mZ-/view?usp=drivesdk","description":"Fagot 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rkVr2OPsWyQ9uBG8mUOttwqNkUGKvg_S/view?usp=drivesdk","description":"Fagot 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ECH_9T3e5WplFTNoD9KmcPPEGVSSaYZy/view?usp=drivesdk","description":"Fl Piccolo - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1s0e54gcSfSi71ETKlWKBsiRJagC6N6sd/view?usp=drivesdk","description":"Flauta 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TwSJKthJa3CnbqtahtHNHuJTSeSpo7hs/view?usp=drivesdk","description":"Flauta 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1E-pXih3iv8RoBCj54BTf4u5XdA200xUh/view?usp=drivesdk","description":"Ob EH - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/12dukxhZP9bibscQ3beODKtOjukhVWNve/view?usp=drivesdk","description":"Oboe 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/11w20y8Nr8aYOsEvgoyEqrBAMpq1vZBVM/view?usp=drivesdk","description":"Oboe 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CsfEKtPGPe0Rtg1_N8yzlSaGg565Flgu/view?usp=drivesdk","description":"Perc Bombo - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ly5d4Z0tWmtf9mK49wpns20IbVA5Yr77/view?usp=drivesdk","description":"Perc Percusión - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1tqHMyp_ZA09BF_5RGlyntOEyGQxVK24X/view?usp=drivesdk","description":"Perc Platillo - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Platillo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sOgSk_AqAWiYOoZ61O70RU64j3Fscs6z/view?usp=drivesdk","description":"Perc Timbal - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1v56fxZelZ8zwmTuY4IWyqnArogtw7evH/view?usp=drivesdk","description":"Piano - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1PV9F3NPZ8RpkxmEaAh_hIL2Y-oL590c9/view?usp=drivesdk","description":"SCORE - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1I01zmnTYYUPE42fjDUyDYwnuahghRMr7/view?usp=drivesdk","description":"Trombón 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BG82kM1CcN-BqYl1UPi3gZa52v8czYZD/view?usp=drivesdk","description":"Trombón 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1wmE1IFa07RL-3npTBY6CX_veb4zx_-QL/view?usp=drivesdk","description":"Trombón Bajo - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1m1Mbi_6e_YjT8B50ZqYEw9lk4EgNKezA/view?usp=drivesdk","description":"Trompeta - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NguhpXJyXyGOf32_eFU-YLOQjusJ1RKm/view?usp=drivesdk","description":"Trompeta 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Z7EF8LLafNWAeWc7W7kzzG2Kk_OSG32k/view?usp=drivesdk","description":"Trompeta 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1YiHxsKwwbtuLlz1DYhMLtgtD8kowFBct/view?usp=drivesdk","description":"Tuba - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cDYRB0j1nfxTnmkqsxzb0fduHoA7Ecas/view?usp=drivesdk","description":"Viola - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1MhQtLOpu6XLPTVB_8A5Vz9RtmCVYi8hI/view?usp=drivesdk","description":"Violín 1 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/14ysWiFSeFA76NP1-CrASlS6RdCKdMfPZ/view?usp=drivesdk","description":"Violín 2 - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1U0dboXX882Ygv_H89k8T44T6iMuWLS30/view?usp=drivesdk","description":"Violoncello - La Cancha - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Cancha</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- secreto-duda

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1IczuwdCoDIbLxNC_uwS3bbEICrYoPC5p'
WHERE observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SziWHUY1WM5ils7aDWJF0rLS7yTxfZhW/view?usp=drivesdk","description":"Arpa - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/10pF2sjk5B9F65lGXYvZQIJ8FXZuDo27Y/view?usp=drivesdk","description":"Clarinete Bajo - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Jg_a3O3zx3_BB3LI_dZx_XExqzUmDnrh/view?usp=drivesdk","description":"Clarinete Bb 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1e8q2KcD0Gz4CmMiHouZGpS5Ne3AHe3dT/view?usp=drivesdk","description":"Clarinete Bb 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zrKXztMGqGXR_CRAAR3r6WwdE3MvPnMQ/view?usp=drivesdk","description":"Contrabajo - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1XuYxY12I98RshAg3xkKdT4IIN0IiiujU/view?usp=drivesdk","description":"Contrafagot - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1quBZ2Xs4E1zhEIThDKhCeqft5T6191wB/view?usp=drivesdk","description":"Corno F 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/14buxd7djQJ5zpL6ypGaIRk5fK9ow1tl1/view?usp=drivesdk","description":"Corno F 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mt_K6LFK7RzFu0LmUVZBP9Ez7jxL_y-H/view?usp=drivesdk","description":"Corno F 3 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mRF3bCO0fSyAccWlPo_-FCVor-TwIu9Z/view?usp=drivesdk","description":"Corno F 4 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ALf-LNFpGu8UI4mMn9aJhJNsBY0kYpMv/view?usp=drivesdk","description":"Fagot 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OC03f28DTDWAoWjhWgrEO7TXvvmDloX3/view?usp=drivesdk","description":"Fagot 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SRCOnnjHx9h5v8W88P8YjVSmxa4LEW4F/view?usp=drivesdk","description":"Fl Piccolo - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mfHsdU4Y6vGx4xIeBAjKzApM5bLOiYKH/view?usp=drivesdk","description":"Flauta 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1dy7xzKJXqPCWZluW_joh6lcRDUgnLK_y/view?usp=drivesdk","description":"Flauta 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hPReOJondeYBg5NB2BjuH7_X9Q4DCeSw/view?usp=drivesdk","description":"Ob EH - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1mVib2F-B4Wnjp9SEHJ3WR0YJD65PYcH_/view?usp=drivesdk","description":"Oboe 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1R8c5VZiHP9TyJnLNVEsst6VKQXsW7TYH/view?usp=drivesdk","description":"Oboe 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BsII-3pcyOwNb9sOZpAgQO6SNnxilbRV/view?usp=drivesdk","description":"Perc Percusión - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Percusión'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RI-dksyTrg2IzuCYXAI8u7u1DXFbZoqd/view?usp=drivesdk","description":"Perc Timbal - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1rE5XiTYAcfbuAhUFdty7qISXKEE0hRh5/view?usp=drivesdk","description":"Piano - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hcz67Ytybc_uMW4OMwpM4l3DCZYH92e-/view?usp=drivesdk","description":"SCORE - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HXFKzjob25mTXkjluwHrjDet908OUq7m/view?usp=drivesdk","description":"Trombón 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BqqY9YomrXJhn0tRXxi2Dv86BlcBi9Wo/view?usp=drivesdk","description":"Trombón 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bo4e13btav5HVjfMBmkvMHGu4Ukge9Y2/view?usp=drivesdk","description":"Trombón Bajo - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1OI-vd7ilC_AI2es70ooGBB1pBEGMkbdJ/view?usp=drivesdk","description":"Trompeta - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Dfhbpqy7jYURIpX_th7Bjrjv9OpVZFbI/view?usp=drivesdk","description":"Trompeta 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1P9uoPQH10Bsn2UJdM7-DLvjDHYBgt6Ls/view?usp=drivesdk","description":"Trompeta 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1R4AtOawn5zP2bZKq5k9X4ECo1cn-BBCe/view?usp=drivesdk","description":"Tuba - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1c_LJVHy8a_qs17KiudCWZMHyxzfbHUj5/view?usp=drivesdk","description":"Viola - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1TdS1qk6-v9KEsvY91rLqkUtW501qiWc0/view?usp=drivesdk","description":"Violín 1 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zdXXyTBC1pkdhTJkoSAkmdhTVnY48LYg/view?usp=drivesdk","description":"Violín 2 - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ZTQtAwF0ZGPOZBlLz8gjTwOt39zaC-Cn/view?usp=drivesdk","description":"Violoncello - La Duda - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>La Duda</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- secreto-retiro

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1-gbxy0h3oijlbQk1DQZhswv_ken089zN'
WHERE observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1zxHMlaB3YpX2p58gjuyXjuFTexJs7R_p/view?usp=drivesdk","description":"Arpa - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Arpa'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1u65aCUCAMa_D4rDmz7aP0seDXI8WNuWN/view?usp=drivesdk","description":"Clarinete Bajo - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1O350edYeeY_60eNwB0VSqGL9blEJB5zF/view?usp=drivesdk","description":"Clarinete Bb 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bb 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1t7W7SDqq6o8IVEPydd_mABSC-y-M785N/view?usp=drivesdk","description":"Clarinete Bb 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Clarinete Bb 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1DLHkfqNBU9YfwRJbvuqSRosXD-u7fxqJ/view?usp=drivesdk","description":"Contrabajo - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Contrabajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GVUMYS1gUXmaYytRtC_hB_XBNQXWIibE/view?usp=drivesdk","description":"Contrafagot - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Contrafagot'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1xBBXdlHI9iNYEg3p8QfYiyjkHV04Qp1H/view?usp=drivesdk","description":"Corno F 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qfKfjca7d9fZoX95eF0cNO5BOTLz-nbY/view?usp=drivesdk","description":"Corno F 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1pBYFws4TFQeLpEIjY5RO8iai6yicEIUw/view?usp=drivesdk","description":"Corno F 3 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 3'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1fwZ9WKmjU80XyMMcZXXXCNSIBiVvGX4l/view?usp=drivesdk","description":"Corno F 4 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Corno F 4'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NCErvLKITxl2bo90R7TMmAl08hbpZBXm/view?usp=drivesdk","description":"Fagot 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1KDCM5yqkO7uTMhUpDBNVI694LfXgMVXI/view?usp=drivesdk","description":"Fagot 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/13s1KIqUHmmkVrF8NaMqJZTQ1Qp8lgNe_/view?usp=drivesdk","description":"Flauta - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Flauta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ouKN9PfjmBRNHud9taI7xIGtBwA-kLrk/view?usp=drivesdk","description":"Flauta 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1o_JpOzCqDrNeGnbYvA1MIS4wsrj8Mu7D/view?usp=drivesdk","description":"Flauta 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_RIURGETVGG3NQuGTw588b38VCKUwWA2/view?usp=drivesdk","description":"Ob EH - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1CxpFlk2aEkA8BwDwEZdBTOHNFYZuX_G8/view?usp=drivesdk","description":"Oboe 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1NX6s4dRGR-3NuYn8-terJ2t_mTO4Yj1j/view?usp=drivesdk","description":"Oboe 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1lWiTX_GIMQd-jjfQm4C8MqVg5N-LmZcb/view?usp=drivesdk","description":"Perc Platillo - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Platillo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1HeGl-kmIUAqNa8_lRd4zmTvac5infpGU/view?usp=drivesdk","description":"Perc Timbal - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Sky4aIMsE7g43fV9K-mVgqmbtJDPI_Wz/view?usp=drivesdk","description":"Piano - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1O2Izk9qkPVS65Tlhv7EZsq4AwHbteh8R/view?usp=drivesdk","description":"SCORE - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WUEkMqOK38yNcLF3SZyP2GfiMfjqVtro/view?usp=drivesdk","description":"Trombón 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/191lF4EsV4VM6l9CSyL5LNEviIbOZcwUw/view?usp=drivesdk","description":"Trombón 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1sKm5bLeKtQ0jxhLjhnPrrIXPbyahMHNP/view?usp=drivesdk","description":"Trombón Bajo - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hocMxCNvq16qfQZCsvBEh5S_9YHVdVh4/view?usp=drivesdk","description":"Trompeta - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1RyBbiQuTSFkFQVdRaBLehcRgYJiU0eJG/view?usp=drivesdk","description":"Trompeta 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1bO6IT74u5GYkLLNKWFioS9RPhC7Wwcsg/view?usp=drivesdk","description":"Trompeta 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Trompeta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GmyrVLx7jkkPfDMO21oFLQARcCFb_7hE/view?usp=drivesdk","description":"Tuba - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/18q1DsYOpmWAqL6V7qVJsW4EJb1fNhfgj/view?usp=drivesdk","description":"Viola - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ehzhmqW8U0XyjEWAb3s2Hs3V1Cs2uZ01/view?usp=drivesdk","description":"Violín 1 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1uVUMKKcGsI5ztfKupI8hxgo52A55oPX7/view?usp=drivesdk","description":"Violín 2 - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/101z7H1VugIiSKC6KStBexo-A90Ko032T/view?usp=drivesdk","description":"Violoncello - Retiro Obelisco - El Secreto.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo/El Secreto.'
  AND o.titulo = '<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

-- vientosdeagua

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=1igacdR8Y-GmvsKv_3uGynjGtwnfKuzhN'
WHERE observaciones = 'Para acomodar — Archivo viejo.'
  AND titulo = '<p>Vientos de Agua</p>'
  AND (link_drive IS NULL OR link_drive LIKE '%10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI%');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1VTgwvBGjTm8Apxv5jtscsatL3AH4DEQ5/view?usp=drivesdk","description":"Arpa 2 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Arpa 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1AklbHd6Grv04J4P57wTDj3_ywjSAK7dc/view?usp=drivesdk","description":"Bandoneón - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Bandoneón'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ebB2W8pQ55VkXpo10yu_XtzBXrLelTRo/view?usp=drivesdk","description":"Clarinete Bajo - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Clarinete Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cpDap7_-D9G-RkV16PMFnVoAf55ggy6u/view?usp=drivesdk","description":"Clarinete Bb - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Clarinete Bb'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1WJl-6yCr-ithhdgo9JppA19LNMKII1k2/view?usp=drivesdk","description":"Corno F - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Corno F'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1-hGNLSRNCtYDCyhOjLonqU_25-INhJoH/view?usp=drivesdk","description":"Fagot 1 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Fagot 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1hMYvoyhOaXizr1aNhTrq0juLowgBHShk/view?usp=drivesdk","description":"Fagot 2 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Fagot 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1BY-KtfIe6HrWUqIjym51kviat2_HC6S5/view?usp=drivesdk","description":"Fl Piccolo - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Fl Piccolo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GTamFIjzszoOMqaZ0pmBDIvpSaT6Xmns/view?usp=drivesdk","description":"Flauta 1 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Flauta 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1GaRz8hjFRFK49LydZc2-HZbD7IIcNWDk/view?usp=drivesdk","description":"Flauta 2 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Flauta 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1G6DY9YZwj2zl3PMQXcbiJi5MjP-wzvqh/view?usp=drivesdk","description":"Guitarra - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Guitarra'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/16jbWQGNJCtKf48oCmxj8b2yYUoIwZ9VZ/view?usp=drivesdk","description":"Ob EH - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Ob EH'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1SBAH8phUePSJ84R__tacj_TiScTSiQs6/view?usp=drivesdk","description":"Oboe 1 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Oboe 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qHD83EoXXMs8QiM05GImiItj6IyuLzxZ/view?usp=drivesdk","description":"Oboe 2 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Oboe 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1y1ulzqksw2ByggBexR-4kFxEOH4eEMBR/view?usp=drivesdk","description":"Perc Bombo - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Perc Bombo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1cxS-Q-Nd4Vcc5qrjJWYIM5Cuy-nAQIw9/view?usp=drivesdk","description":"Perc Tambor - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Perc Tambor'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1vI74vH3a4cd3P8mrXQepFS0xcmoEgOL3/view?usp=drivesdk","description":"Perc Timbal - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Perc Timbal'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ICdreSil4X56S02hfjo_FcTBMpBXuXjH/view?usp=drivesdk","description":"Piano - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Piano'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Vx3cc2USiZ7KuMBPkl0JWuikxNjikhtN/view?usp=drivesdk","description":"SCORE - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'SCORE'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1FHK7-tWvnrYqLKRm3nb2F93dVpz8V6Kq/view?usp=drivesdk","description":"Trombón 1 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Trombón 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1Io4EReep3l-R9l-4oiIJdGnAgjpTcvCL/view?usp=drivesdk","description":"Trombón 2 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Trombón 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/19yUsLpMYUcZphCg_6O5WFvnBM0QWRe8S/view?usp=drivesdk","description":"Trombón Bajo - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Trombón Bajo'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1et90lrhBC2whZ4S_B2F79NIjtZjiEHxC/view?usp=drivesdk","description":"Trompeta - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Trompeta'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1EdCKHZglwaGjTBU_5HMzleT9e2aThPcF/view?usp=drivesdk","description":"Tuba - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Tuba'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1ITI9pBxjI3X_B-yY6wqMaGNJNmn7Nu_X/view?usp=drivesdk","description":"Viola - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Viola'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1YQ1a_RUS67T3VNTrEIN02W6-jUv-ERKA/view?usp=drivesdk","description":"Violín 1 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Violín 1'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1F0sv4g_1B8ZYKiFAcjYLjOmlDtURcRMJ/view?usp=drivesdk","description":"Violín 2 - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Violín 2'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');

UPDATE obras_particellas op
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qHcBo1jevvcegNGGl-VBJiPs4tgC8Ywb/view?usp=drivesdk","description":"Violoncello - Vientos de Agua - Vientos de Agua.pdf"}]'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = 'Para acomodar — Archivo viejo.'
  AND o.titulo = '<p>Vientos de Agua</p>'
  AND op.nombre_archivo = 'Violoncello'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');
COMMIT;
