-- Villa-Lobos — Bachiana brasileira Nro. 9, W449 → obra 3654
-- Partes de cuerdas IMSLP #569700–#569705 (PMLP898487).
-- Viola y contrabajo: se excluyó la portada de título (página 1).
-- No crea otra obra. No toca repertorio_obras ni la obra 3254 (solo el preludio).
-- Generado: 2026-09-30

UPDATE obras
SET titulo = '<p>Bachiana brasileira Nro. 9, W449</p><div>&nbsp; I. Prelúdio (Vagaroso e Místico)</div><div>&nbsp; II. Fuga (Pouco apressado)</div>',
    link_drive = 'https://drive.google.com/open?id=13yY39hrqFNPyECR3J2oQ2y_twyhsK-pe',
    observaciones = 'Para acomodar. Partes de cuerdas IMSLP #569700–#569705 (PMLP898487). Viola y contrabajo sin portada de título.'
WHERE id = 3654;

DELETE FROM obras_particellas WHERE id_obra = 3654;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3654, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1DJ5Tz0bIhsi9FyhsDMZFAWDq5vkwCsH7/view?usp=drivesdk","description":"Contrabajo - W449. Bachiana brasileira Nro. 9 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3654, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1rYXAw3w8OSucjr4PYiShErazj1AvgiMS/view?usp=drivesdk","description":"SCORE - W449. Bachiana brasileira Nro. 9 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3654, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ASMK8W5xaq3vsXLm_LV4odxtgdkGTSf3/view?usp=drivesdk","description":"Viola - W449. Bachiana brasileira Nro. 9 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3654, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1d8w3mEsmjqdzaTwLnBAY7-h4tdYpD6Ff/view?usp=drivesdk","description":"Violín 1 - W449. Bachiana brasileira Nro. 9 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3654, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ylYM6CfVZUx7fCDIGOrO6DQRGHFM11lT/view?usp=drivesdk","description":"Violín 2 - W449. Bachiana brasileira Nro. 9 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3654, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1mNds_rGGmq0hkA1izoZ0XSG2DgNXmfyC/view?usp=drivesdk","description":"Violoncello - W449. Bachiana brasileira Nro. 9 - Villa-Lobos, H.pdf"}]', false);

-- El trigger obras_particellas_sync_instrumentacion recalcula obras.instrumentacion.
-- Esperado por calculateInstrumentation: Str
