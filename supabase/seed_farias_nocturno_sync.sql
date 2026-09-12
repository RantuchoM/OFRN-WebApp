-- Farías — Nocturno → obra 3344
-- Generado: 2026-09-12
-- UPDATE in-place de url_archivo. NO borra particellas ni cambia seating.
-- NO inserta SCORE / Perc Percusión 1–2. NO elimina Trombón 3.

DO $$
BEGIN
  UPDATE obras SET
    link_drive = 'https://drive.google.com/open?id=1hOAb6DNAuGMMr9XkuTP-6QvR9n536DRj',
    observaciones = 'Para acomodar — Farías, M. - Nocturno. Pendiente decisión de orgánico: ZIP tiene Perc 1/2 + SCORE y no tiene Trombón 3 (placeholder ocupado).'
  WHERE id = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1QyqlLObuf268xukTWVswb3RImbuCd42j/view?usp=drivesdk","description":"Flauta 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14981 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1wwmgZEXNf-4vP0-5nt4Ecu5ebkW6LXV1/view?usp=drivesdk","description":"Flauta 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14982 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1vzQRxO5kZ2n-SpN34Zkrhy2Gd6ao5s7N/view?usp=drivesdk","description":"Oboe 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14983 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1GxIlWevAFHEcmr5sHx_j572DtDfPpDo2/view?usp=drivesdk","description":"Oboe 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14984 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1I6mQbHqEDy7nzhq40XlzvvlsZ8BrMXKQ/view?usp=drivesdk","description":"Clarinete Bb 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14985 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1pQ6APagSQ4ThTPmXAjejPqVF5arBRNH3/view?usp=drivesdk","description":"Clarinete Bb 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14986 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1qAFgikxja0-5-1wkkJvmYRGyPiQmSHeK/view?usp=drivesdk","description":"Fagot 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14987 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1vQJgSwH-zMLO4DW3FUJln31H4vY1JYGm/view?usp=drivesdk","description":"Fagot 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14988 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1EtUleayth7k5-h0x5UUuw4S2dcWiN1l2/view?usp=drivesdk","description":"Contrabajo - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14993 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1qXeaILLKwcCPOR790_EhKz4dQq1BQkko/view?usp=drivesdk","description":"Violín 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14989 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1yL3NaL-xBjL3rYmPl9X4QtX32o2RlvZn/view?usp=drivesdk","description":"Violín 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14990 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1aM2EtOxtu0feiFO2FnDVHY2ko0erhQWi/view?usp=drivesdk","description":"Viola - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14991 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1NpAc42EgyfAcbVw8NwzYRGSRfd-HQiia/view?usp=drivesdk","description":"Violoncello - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14992 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1T6soU1NEJQiJRsgW5F_RDhTuD_ZG5lmo/view?usp=drivesdk","description":"Corno F 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14995 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1SFg4tW3YCtgu01hV07nCcNmvNVdxkv_k/view?usp=drivesdk","description":"Perc Timp - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14994 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1vCxzStitWYRAHzDbJolg24_h8uoLyyi3/view?usp=drivesdk","description":"Trombón 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 15003 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1i0Fdm1hLje7I8k2TC41wcZPe2X3KIwSD/view?usp=drivesdk","description":"Corno F 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14996 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1WZSPCIJ8VxzN2Okwdn9vQ4FYcaq4C8dK/view?usp=drivesdk","description":"Corno F 3 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14997 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/17MPwDI8FFjE1pYdT7mtj2yQeu_v59NmG/view?usp=drivesdk","description":"Corno F 4 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14998 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1M5TrY2ZnCJ0gYYrWLQMiBAE0IVQhGUcS/view?usp=drivesdk","description":"Trompeta 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 14999 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1uLcXK8iUlnejV8FIPIh-JGhrC9jB8eUE/view?usp=drivesdk","description":"Trompeta 2 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 15000 AND id_obra = 3344;

  UPDATE obras_particellas SET
    url_archivo = '[{"url":"https://drive.google.com/file/d/1wMyeE-5DR60txu3cZ7kn-FM_E8FAQAhL/view?usp=drivesdk","description":"Trombón 1 - Nocturno - Farías, M.pdf"}]'
  WHERE id = 15002 AND id_obra = 3344;

END $$;
