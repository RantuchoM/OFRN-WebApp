-- Completar particellas Un bel di vedremo (obra 3199)
BEGIN;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1ixm2Z4rnHve8uoXRFkFS439iFcX5MnYG/view?usp=drivesdk","description":"Clarinete 1 - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '07'
    AND nombre_archivo = 'Clarinete 1'
);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1dl46f9bquNOfc7SG4wolJknsbps0MieW/view?usp=drivesdk","description":"Clarinete Bajo - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '07b'
    AND nombre_archivo = 'Clarinete Bajo'
);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1IUxRyWxU63cBgYN5JXQ85gnwuolaBaLE/view?usp=drivesdk","description":"Fagot 1y2 - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '08'
    AND nombre_archivo = 'Fagot 1'
);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1IUxRyWxU63cBgYN5JXQ85gnwuolaBaLE/view?usp=drivesdk","description":"Fagot 1y2 - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '08'
    AND nombre_archivo = 'Fagot 2'
);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1Zp-R-6Drd-NvZNdIPB1vxfFh5oZbeBon/view?usp=drivesdk","description":"Trombón 1y2 - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '11'
    AND nombre_archivo = 'Trombón 1'
);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Zp-R-6Drd-NvZNdIPB1vxfFh5oZbeBon/view?usp=drivesdk","description":"Trombón 1y2 - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '11'
    AND nombre_archivo = 'Trombón 2'
);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1gPRKxH3RJ91uSJhz1jmb08pOySidY_xd/view?usp=drivesdk","description":"Trombón Bajo - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '11'
    AND nombre_archivo = 'Trombón Bajo'
);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3199, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1ol5cVznCzgxfEecY6_CRI6p7rPkv1mey/view?usp=drivesdk","description":"Trompeta 1 - Un bel di vedremo [aria] - Puccini, G..pdf"}]', false
WHERE NOT EXISTS (
  SELECT 1 FROM obras_particellas
  WHERE id_obra = 3199
    AND id_instrumento = '10'
    AND nombre_archivo = 'Trompeta 1'
);

UPDATE obras_particellas
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1_-RHOL-vcznEEXf-KmxSy8Y26rOtdPY3/view?usp=drivesdk","description":"Corno 2 - Un bel di vedremo [aria] - Puccini, G..pdf"}]'
WHERE id_obra = 3199 AND nombre_archivo = 'Corno 2';

-- instrumentacion se recalcula por trigger obras_particellas_sync_instrumentacion
COMMIT;

-- Verificacion esperada:
-- SELECT instrumentacion FROM obras WHERE id = 3199;
-- -- 2.3.3.2 - 4.2.4.0 - Timp.+1 - Hp - Str
