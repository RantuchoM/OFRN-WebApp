-- Patch E lucevan + Nabucco particellas
-- 2026-06-13

DO $$
BEGIN
  UPDATE obras SET instrumentacion = '3.3.3.2 - 3.0.2.0 - Timp.+1 - Hp - Str' WHERE id = 3507;
  DELETE FROM obras_particellas WHERE id_obra = 3507;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1TK3CUL37FyaX34JfA_te6KFN4MZM-ytL/view?usp=drivesdk","description":"Arpa - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1Sig1obj9EkwSufZo8zFU0cGJiA0Wv1ym/view?usp=drivesdk","description":"Clarinete A 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1SeuQixlagBVnlysKvJBA2i_rXizTQlMM/view?usp=drivesdk","description":"Clarinete A 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1S_Qx2kdjl83xE_PMiML6Nk5AZXmbBw8G/view?usp=drivesdk","description":"Clarinete Bajo - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '08', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1SZQOTF4ndBl-bxaA-ab_p7qck75oP39n/view?usp=drivesdk","description":"Contrafagot - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1SV1UX19vAU9n2Fi68OI8dHY2WnPa-Yjl/view?usp=drivesdk","description":"Corno F 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1ST8I0p3ZO9CxcchK1FEJv55Vr6EZ0Mj8/view?usp=drivesdk","description":"Corno F 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1SQySf_EnyuDNjAYKF_tDOIVRUwGLmyYH/view?usp=drivesdk","description":"Corno F 3 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1SZYsORnXvevp4vHkMlvx-CH2szsn6X9R/view?usp=drivesdk","description":"Fagot 1-2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1T3ZteP7T7s7fqpEdB8tvixb9sxF4nsGw/view?usp=drivesdk","description":"Flauta 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1SvJrNREWATOur9sly-B9yXskFpBKAtwz/view?usp=drivesdk","description":"Flauta 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/1SsqR3u5Tx2ZcYLn_-i_JvPwnW2VOoyid/view?usp=drivesdk","description":"Flauta 3 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1SjTvMWeThAWkEkmcaTXUVfsjS7nP_8My/view?usp=drivesdk","description":"Ob EH - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1SmlvikkV5rq-PtwDB8gKYFpvmQySRk-K/view?usp=drivesdk","description":"Oboe - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1SkVVPnirwq-6yTktd0CNfweyShKshDzc/view?usp=drivesdk","description":"Oboe 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1TNyx8MkgtbmlDUVATR_KbvTiYpvpB1rK/view?usp=drivesdk","description":"Perc Bombo - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1TQKgB-Kf4rIa65vC2QVOi7Kg4MwFmTaq/view?usp=drivesdk","description":"Perc Timbal - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1T3cSGAo-JuwQ0RV8xeoBhY97gzjad0Si/view?usp=drivesdk","description":"SCORE - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1TZM45lFVb99mVYbvNWC-ETC2DbavW0x4/view?usp=drivesdk","description":"Trombón 1-2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1TXghPX_T4ZFfhy5rWdOyQ4C0cv1wzQmu/view?usp=drivesdk","description":"Trombón 3 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1TA1g1IN3NPBkezDMIJCd8taiZfuA_JJA/view?usp=drivesdk","description":"Viola - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1TDVvFiFQEC_RFaXQcSc23GBjvC4MNG76/view?usp=drivesdk","description":"Violín 1 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TD8urhGy1rIyXhHHvKWfuqg8hOfyJl_i/view?usp=drivesdk","description":"Violín 2 - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3507, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1T6MKi9ocG1DnmWoCmU6OP9q2FH3oH11C/view?usp=drivesdk","description":"Violoncello - 03. E lucevan le stelle (''Tosca'') - Puccini, G.pdf"}]', false);

  UPDATE obras SET instrumentacion = '0.1.1.1 - 2.1.1.1 - Timp - Str' WHERE id = 3514;
  DELETE FROM obras_particellas WHERE id_obra = 3514;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/1JVeTjqbjlQNjLA87_gpA7AJhpKYj6beI/view?usp=drivesdk","description":"Clarinete A 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Ja-qfw8t0yFN1JzdTp-3JXsygaY7qz0E/view?usp=drivesdk","description":"Contrabajo - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1JnX0x7SQAVfKkpEmCpECrOClqnisdOOa/view?usp=drivesdk","description":"Corno F 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1JW1ILDQNxqxIvSeScHTPpBO1RqOF6JQ_/view?usp=drivesdk","description":"Corno F 3-4 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1Jilv-mrGqssy4ykjReeCZTUIiQap8FJJ/view?usp=drivesdk","description":"Fagot 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1JZqXWSRyVqgjpk3liYi8fjn0EVYs6adA/view?usp=drivesdk","description":"Oboe 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1JMSp7EMc-TidWccEfR6wD8502idDxPdg/view?usp=drivesdk","description":"Perc Timbal - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1JqeXBs1bMQi9fFsW5wepqeqsHZZ6Gg0T/view?usp=drivesdk","description":"SCORE - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1JTLzqM1oQNx8zTfmBWV89vIVNGJi3C10/view?usp=drivesdk","description":"Trombón 1-3 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1JL7FpyuiWxttQyCJqfRkSZaqDMUUyj-h/view?usp=drivesdk","description":"Trompeta 1-2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1JUve6vCN4zzjQqtb35BREUdqUR2LI4VF/view?usp=drivesdk","description":"Tuba - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1JK33K39KibbrtrhNS6KZcIH35u0h3dUF/view?usp=drivesdk","description":"Viola - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1JE9EREgvbrHEQZOibHTNP2k3J0cDSF1M/view?usp=drivesdk","description":"Violín 1 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1JE5DT32A1BkGrh5pYKRi6y7r7l4wm393/view?usp=drivesdk","description":"Violín 2 - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3514, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1JFngpRkLlKKIpGHpsOY1k4Bivq57AJba/view?usp=drivesdk","description":"Violoncello - 15 BIS. Coro de los Esclavos (''Nabucco'') - Verdi, G.pdf"}]', false);

END $$;
