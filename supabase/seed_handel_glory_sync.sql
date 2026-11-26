-- Händel, And the Glory of the Lord → obra 3904
-- Recorte del coro [3] desde Messiah cuerdas y órgano. Vc y Cb, mismo PDF.

UPDATE obras SET
  titulo = '<p>And the Glory of the Lord (Messiah)</p>',
  anio_composicion = 1741,
  duracion_segundos = 177,
  link_drive = 'https://drive.google.com/open?id=1PXj50RBWF1Wezl1yO7MbipYRfxVuCOzR',
  observaciones = 'Temporada 2027 P17 · Recorte del coro (en la parte, [3] Chorus) desde Händel, G.F. - Messiah, cuerdas y órgano (obra 3643). La página de cuerdas incluye el final del aria anterior. Sin partes de coro en ese set.'
WHERE id = 3904;

DELETE FROM obras_particellas WHERE id_obra = 3904;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3904, '15', 'Órgano', '[{"url":"https://drive.google.com/file/d/1eEWY3Yyxmz4PObCx2PaUpq5vhb050c1b/view?usp=drivesdk","description":"Órgano - And the Glory of the Lord - HWV 56 - Händel, G.F.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3904, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1tj0Zk7K2jDRamQV2RN0I-LUaLQrk1fji/view?usp=drivesdk","description":"Viola - And the Glory of the Lord - HWV 56 - Händel, G.F.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3904, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1yWvLKWW5-V7t9-OseDMTuiG1P79iXjKw/view?usp=drivesdk","description":"Violín 1 - And the Glory of the Lord - HWV 56 - Händel, G.F.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3904, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1XxxOh9S_0awxaDF-ruBGJUawrB0_Jd-q/view?usp=drivesdk","description":"Violín 2 - And the Glory of the Lord - HWV 56 - Händel, G.F.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3904, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/11HlcQFb0mO5fJS2F9utbXKFmzX2-g-y0/view?usp=drivesdk","description":"Violoncello y Contrabajo - And the Glory of the Lord - HWV 56 - Händel, G.F.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3904, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/11HlcQFb0mO5fJS2F9utbXKFmzX2-g-y0/view?usp=drivesdk","description":"Violoncello y Contrabajo - And the Glory of the Lord - HWV 56 - Händel, G.F.pdf"}]', false);
