-- Rossini — El Barbero de Sevilla → obra 3258
-- Generado: 2026-09-21
-- UPDATE in-place. NO borra particellas ni seating.

DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/open?id=1bEAh_wFysB1DExeWP38CF2CimZiagNxk',
    observaciones = 'Para acomodar — Rossini, G. - El Barbero de Sevilla (arr. Bergler, quinteto de bronces).',
    instrumentacion = '0.0.0.0 - 1.2.1.1'
  WHERE id = 3258;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1q29thTNOAuRk2CaxIOX8l2vWone17iBs/view?usp=drivesdk","description":"Corno - El Barbero de Sevilla - Rossini, G.pdf"}]'
  WHERE id = 11097 AND id_obra = 3258;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1xQlU3XeFvMklPDoN-DJ_AxkocsAkvVEs/view?usp=drivesdk","description":"Trombón - El Barbero de Sevilla - Rossini, G.pdf"}]'
  WHERE id = 11098 AND id_obra = 3258;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1InayudFVDp8aLLUfxX2by5lxUHOD1hJ1/view?usp=drivesdk","description":"Trompeta 1 - El Barbero de Sevilla - Rossini, G.pdf"}]'
  WHERE id = 11099 AND id_obra = 3258;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1vbFBo2E0b4X3U4zM55uf7i72EujxJ2wV/view?usp=drivesdk","description":"Trompeta 2 - El Barbero de Sevilla - Rossini, G.pdf"}]'
  WHERE id = 11100 AND id_obra = 3258;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1Rjb8jwlUk8Frp2FCa42yvbB0lR9WrWA8/view?usp=drivesdk","description":"Tuba - El Barbero de Sevilla - Rossini, G.pdf"}]'
  WHERE id = 11101 AND id_obra = 3258;

END $$;
