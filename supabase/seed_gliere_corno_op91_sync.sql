-- Glière corno Op. 91: particellas manuscritas de la obra 3649.
-- Mitteldorf/Maximov queda en «Versión alternativa» y no entra a obras_particellas.
-- No crea otra obra. No toca concerto_participantes, votos ni ventanas.
-- Generado: 2026-09-25

UPDATE obras
SET link_drive = 'https://drive.google.com/open?id=12BFnGYyChrYaLv7UEk3736mP4Nt9JUD8',
    observaciones = 'Edición manuscrita IMSLP #903959-#903985. Mitteldorf/Maximov quedó en la subcarpeta Versión alternativa, sin filas en obras_particellas.'
WHERE id = 3649;

DELETE FROM obras_particellas WHERE id_obra = 3649;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1v5H4wE67aM20GmcbCkVUGOtv1LW6fId3/view?usp=drivesdk","description":"Arpa - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/18X9u5nWwy46Iwwl6TzZDyjMuHHultRrI/view?usp=drivesdk","description":"Clarinete Bb 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1sJp2tk0VkPPzGMSTsZlD6TBB_tPaQxwa/view?usp=drivesdk","description":"Clarinete Bb 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1POlxp9bck2_QPBRqerng9k21Mv1VmOWQ/view?usp=drivesdk","description":"Contrabajo - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1viltXYO_oQHc5u5H6MsvG1r6lqiF8phP/view?usp=drivesdk","description":"Corno F 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1LLRzwck7uH0dG_6sSzu3F_MWKJ8IP4ko/view?usp=drivesdk","description":"Corno F 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1cJw2ZrfCv5YzyPHs0TtfYadvUnlaAtGg/view?usp=drivesdk","description":"Corno F 3 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1vzgUbGY-2VhXmm4X64nDRX9F9e5CWhMr/view?usp=drivesdk","description":"Fagot 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1iq0QcxkIFnAZfxCn32hBwacTuRvNcawO/view?usp=drivesdk","description":"Fagot 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1wAqBzyFS-cVXzTuTqUCB5uHDOu4PNCXB/view?usp=drivesdk","description":"Flauta 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1rTmadyAefYK_4CuJkdaWlT4s-bJvmxWW/view?usp=drivesdk","description":"Flauta 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/1Egv7e7leQuBhXnlncqlVVpBs6Hr_SNaE/view?usp=drivesdk","description":"Flauta 3 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1udz1Iv7GywRhHPNuWaA1Im2_QSpPq6Fi/view?usp=drivesdk","description":"Oboe 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1GIZLe9QxtJD25_zXPvA5fw5Bb49ta16N/view?usp=drivesdk","description":"Oboe 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '13', 'Perc Platillos', '[{"url":"https://drive.google.com/file/d/1AajZdjsMtpszbPeSqJnLfgkoAJqxkI0Q/view?usp=drivesdk","description":"Perc Platillos y Bombo - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1AajZdjsMtpszbPeSqJnLfgkoAJqxkI0Q/view?usp=drivesdk","description":"Perc Platillos y Bombo - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1bN9uzqjQx0w5AxQVhFCFXexiD7-JHLyz/view?usp=drivesdk","description":"Perc Timbal - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/12ToigC4lq7Di_aJzRvBe8gZ_ly2nnnqA/view?usp=drivesdk","description":"Perc Triángulo y Tambor - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/12ToigC4lq7Di_aJzRvBe8gZ_ly2nnnqA/view?usp=drivesdk","description":"Perc Triángulo y Tambor - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1m9tbU9XW-S8Lf-aByGQ6c_rMR_SrR4y8/view?usp=drivesdk","description":"Trombón 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Eu7Zzoqgajs1VTZ8uETu8Edm9NOA_wvR/view?usp=drivesdk","description":"Trombón 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1TaWG-wCxJVu1Jh3-mDOZBYwFquNyeQCu/view?usp=drivesdk","description":"Trombón 3 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1KN_m63taNjy5_ipdKU8KcKm7TYFk7Cl9/view?usp=drivesdk","description":"Trompeta Bb 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/19wyDA78485Cv-VAtvdypghPilssiRQZg/view?usp=drivesdk","description":"Trompeta Bb 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/14RBJP4euZ-wfWyu_zujJDeFArD_XMvZk/view?usp=drivesdk","description":"Tuba - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/118coQH53Ko7nDn0IE9jVYdSmtBe_QjW5/view?usp=drivesdk","description":"Viola - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1PjFp-hT8j9n8Lcfjnr-ocHVLvUEYl9mi/view?usp=drivesdk","description":"Violín 1 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1z2La4oTa6HOouis_bthawc6hcLnvlIx4/view?usp=drivesdk","description":"Violín 2 - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3649, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1VPAfNNr7xFKsZrZgTMFIFoLpUteQiZAs/view?usp=drivesdk","description":"Violoncello - op.91. Concierto para Corno en Si bemol mayor - Glière, R.pdf"}]', false);

-- El trigger obras_particellas_sync_instrumentacion recalcula obras.instrumentacion.
-- Esperado por calculateInstrumentation: 3.2.2.2 - 3.2.3.1 - Timp.+4 - Hp - Str
