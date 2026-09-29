-- Villa-Lobos — Cuarteto de Cuerdas Nro. 1, W099 → obra 3650
-- Partes IMSLP #608902–#608905 (Mvrasaki, CC BY 4.0).
-- SCORE Southern 1953 IMSLP #327723 (PD en esta jurisdicción; IMSLP lo marca Non-PD US/EU).
-- No crea otra obra. No toca repertorio_obras ni seating.
-- Generado: 2026-09-29

UPDATE obras
SET titulo = '<p>Cuarteto de Cuerdas Nro. 1, W099</p><div>&nbsp; I. Cantilena - Andante</div><div>&nbsp; II. Brincadeira - Allegretto Scherzando</div><div>&nbsp; III. Canto Lirico - Moderato</div><div>&nbsp; IV. Canconeta - Andantino quasi Allegretto</div><div>&nbsp; V. Melancolia - Lento</div><div>&nbsp; VI. Saltando como um Saci - Allegro</div>',
    link_drive = 'https://drive.google.com/open?id=1pUC6CMKciSljRmidPe1iGTMxLUNknvlT',
    observaciones = 'Para acomodar. Partes IMSLP #608902–#608905 (Mvrasaki, CC BY 4.0). SCORE Southern 1953 #327723.',
    anio_composicion = 1946,
    duracion_segundos = 1173,
    estado = 'Oficial'
WHERE id = 3650;

DELETE FROM obras_particellas WHERE id_obra = 3650;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3650, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1-nRV1dgOYBTjOLHG37hZc7oqFFXRpHD6/view?usp=drivesdk","description":"SCORE - W099. Cuarteto de Cuerdas Nro. 1 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3650, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ZAV0AYdcAVA6pko9aGX_xBOq-giIv3KS/view?usp=drivesdk","description":"Viola - W099. Cuarteto de Cuerdas Nro. 1 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3650, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1OXWfN9gVagmC77yFgEC0nPojozd2bhxW/view?usp=drivesdk","description":"Violín 1 - W099. Cuarteto de Cuerdas Nro. 1 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3650, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1tCnLj3RDHPPcjUa6-rn1ZjxITdlNAkEG/view?usp=drivesdk","description":"Violín 2 - W099. Cuarteto de Cuerdas Nro. 1 - Villa-Lobos, H.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3650, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1RVUcrv8VY7PvLM6aWcqXhmuNdWiB8cie/view?usp=drivesdk","description":"Violoncello - W099. Cuarteto de Cuerdas Nro. 1 - Villa-Lobos, H.pdf"}]', false);

-- El trigger obras_particellas_sync_instrumentacion recalcula obras.instrumentacion.
-- Esperado por calculateInstrumentation: Str
