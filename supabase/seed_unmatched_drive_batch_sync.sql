-- Lote legacy sin match con Drive (2024): obras + particellas
-- Generado: 2026-11-02
-- Idempotente: no inserta si ya existe obras.link_drive = carpeta original.

DO $$
DECLARE
  _id_obra bigint;
  _p_Airbag_ bigint;
  _p_Lagos_An_bal bigint;
  _p_Campos_Alex bigint;
  _p_Gardel_Carlos bigint;
  _p_P_rez_Micaela bigint;
  _p_Ram_rez_Ariel bigint;
  _p_Cattani_ bigint;
  _p_Mansilla_Benjamin bigint;
  _p_D_Antona_Esteban bigint;
  _p_Rold_n_Carlos bigint;
  _p_Leguizamon_Gustavo_Cuchi_ bigint;
  _p_Leb_n_David bigint;
  _p_Robledo_ bigint;
  _p_Ramos_Dino bigint;
  _p_Parton_Dolly bigint;
  _p_Napolitano_F_ bigint;
  _p_Cobi_n_Juan_Carlos bigint;
  _p_San_Carlos_David bigint;
  _p_Jesse_y_Joy_ bigint;
  _p_Garc_a_Kany bigint;
  _p_Cohen_Leonard bigint;
  _p_Maluma_ bigint;
  _p_Rozas_Pablo bigint;
  _p_Gonz_lez_D_ bigint;
  _p_Laufey_ bigint;
  _p_Vasconcellos_Jos_Adolfo bigint;
  _p_Yupanqui_Atahualpa bigint;
  _p_Poveda_Donato bigint;
  _p_Cerati_Gustavo bigint;
  _p_Verdi_Giuseppe bigint;
  _p_Kander_John bigint;
  _p_Mozart_Wolfgang_Amadeus bigint;
  _p_Cuervo_Iara bigint;
  _p__lvarez_Bel_n bigint;
  _p_Lema_Germ_n bigint;
  _p_Vel_zquez_Consuelito bigint;
  _p_Donjuan_Nubia_Jaime bigint;
  _p_Tyler_Steven bigint;
  _p_Perea_da_Silva_ bigint;
  _p_Gonz_lez_David_Ignacio bigint;
  _p_Carabajal_Demi bigint;
  _p_Caccini_Giulio bigint;
  _p_Impensa2_ bigint;
  _p_Gabriel_Juan bigint;
  _p_Aute_Luis_Eduardo bigint;
  _p_Gonz_lez_Luna_Morena bigint;
  _p_Monsieur_Perin_ bigint;
  _p_Baffa_Ernesto bigint;
  _p_Rol_n_Fernando bigint;
  _p_Valles_Oscar_Cacho_ bigint;
  _p_Fran_ois_Claude bigint;
  _p_Revaux_Jacques bigint;
  _p_Pappo_ bigint;
  _p_Puccini_Giacomo bigint;
  _p_Elgar_Edward bigint;
BEGIN
  SELECT id INTO _p_Airbag_ FROM compositores WHERE apellido = 'Airbag' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Airbag_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Airbag', NULL) RETURNING id INTO _p_Airbag_;
  END IF;
  SELECT id INTO _p_Lagos_An_bal FROM compositores WHERE apellido = 'Lagos' AND (nombre = 'Aníbal' OR (nombre IS NULL AND 'Aníbal' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Lagos_An_bal IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lagos', 'Aníbal') RETURNING id INTO _p_Lagos_An_bal;
  END IF;
  SELECT id INTO _p_Campos_Alex FROM compositores WHERE apellido = 'Campos' AND (nombre = 'Alex' OR (nombre IS NULL AND 'Alex' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Campos_Alex IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Campos', 'Alex') RETURNING id INTO _p_Campos_Alex;
  END IF;
  SELECT id INTO _p_Gardel_Carlos FROM compositores WHERE apellido = 'Gardel' AND (nombre = 'Carlos' OR (nombre IS NULL AND 'Carlos' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Gardel_Carlos IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gardel', 'Carlos') RETURNING id INTO _p_Gardel_Carlos;
  END IF;
  SELECT id INTO _p_P_rez_Micaela FROM compositores WHERE apellido = 'Pérez' AND (nombre = 'Micaela' OR (nombre IS NULL AND 'Micaela' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_P_rez_Micaela IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Pérez', 'Micaela') RETURNING id INTO _p_P_rez_Micaela;
  END IF;
  SELECT id INTO _p_Ram_rez_Ariel FROM compositores WHERE apellido = 'Ramírez' AND (nombre = 'Ariel' OR (nombre IS NULL AND 'Ariel' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Ram_rez_Ariel IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ramírez', 'Ariel') RETURNING id INTO _p_Ram_rez_Ariel;
  END IF;
  SELECT id INTO _p_Cattani_ FROM compositores WHERE apellido = 'Cattani' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Cattani_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cattani', NULL) RETURNING id INTO _p_Cattani_;
  END IF;
  SELECT id INTO _p_Mansilla_Benjamin FROM compositores WHERE apellido = 'Mansilla' AND (nombre = 'Benjamin' OR (nombre IS NULL AND 'Benjamin' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Mansilla_Benjamin IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mansilla', 'Benjamin') RETURNING id INTO _p_Mansilla_Benjamin;
  END IF;
  SELECT id INTO _p_D_Antona_Esteban FROM compositores WHERE apellido = 'D´Antona' AND (nombre = 'Esteban' OR (nombre IS NULL AND 'Esteban' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_D_Antona_Esteban IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('D´Antona', 'Esteban') RETURNING id INTO _p_D_Antona_Esteban;
  END IF;
  SELECT id INTO _p_Rold_n_Carlos FROM compositores WHERE apellido = 'Roldán' AND (nombre = 'Carlos' OR (nombre IS NULL AND 'Carlos' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Rold_n_Carlos IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Roldán', 'Carlos') RETURNING id INTO _p_Rold_n_Carlos;
  END IF;
  SELECT id INTO _p_Leguizamon_Gustavo_Cuchi_ FROM compositores WHERE apellido = 'Leguizamon' AND (nombre = 'Gustavo "Cuchi"' OR (nombre IS NULL AND 'Gustavo "Cuchi"' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Leguizamon_Gustavo_Cuchi_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Leguizamon', 'Gustavo "Cuchi"') RETURNING id INTO _p_Leguizamon_Gustavo_Cuchi_;
  END IF;
  SELECT id INTO _p_Leb_n_David FROM compositores WHERE apellido = 'Lebón' AND (nombre = 'David' OR (nombre IS NULL AND 'David' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Leb_n_David IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lebón', 'David') RETURNING id INTO _p_Leb_n_David;
  END IF;
  SELECT id INTO _p_Robledo_ FROM compositores WHERE apellido = 'Robledo' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Robledo_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Robledo', NULL) RETURNING id INTO _p_Robledo_;
  END IF;
  SELECT id INTO _p_Ramos_Dino FROM compositores WHERE apellido = 'Ramos' AND (nombre = 'Dino' OR (nombre IS NULL AND 'Dino' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Ramos_Dino IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ramos', 'Dino') RETURNING id INTO _p_Ramos_Dino;
  END IF;
  SELECT id INTO _p_Parton_Dolly FROM compositores WHERE apellido = 'Parton' AND (nombre = 'Dolly' OR (nombre IS NULL AND 'Dolly' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Parton_Dolly IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Parton', 'Dolly') RETURNING id INTO _p_Parton_Dolly;
  END IF;
  SELECT id INTO _p_Napolitano_F_ FROM compositores WHERE apellido = 'Napolitano' AND (nombre = 'F.' OR (nombre IS NULL AND 'F.' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Napolitano_F_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Napolitano', 'F.') RETURNING id INTO _p_Napolitano_F_;
  END IF;
  SELECT id INTO _p_Cobi_n_Juan_Carlos FROM compositores WHERE apellido = 'Cobián' AND (nombre = 'Juan Carlos' OR (nombre IS NULL AND 'Juan Carlos' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Cobi_n_Juan_Carlos IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cobián', 'Juan Carlos') RETURNING id INTO _p_Cobi_n_Juan_Carlos;
  END IF;
  SELECT id INTO _p_San_Carlos_David FROM compositores WHERE apellido = 'San Carlos' AND (nombre = 'David' OR (nombre IS NULL AND 'David' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_San_Carlos_David IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('San Carlos', 'David') RETURNING id INTO _p_San_Carlos_David;
  END IF;
  SELECT id INTO _p_Jesse_y_Joy_ FROM compositores WHERE apellido = 'Jesse y Joy' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Jesse_y_Joy_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Jesse y Joy', NULL) RETURNING id INTO _p_Jesse_y_Joy_;
  END IF;
  SELECT id INTO _p_Garc_a_Kany FROM compositores WHERE apellido = 'García' AND (nombre = 'Kany' OR (nombre IS NULL AND 'Kany' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Garc_a_Kany IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('García', 'Kany') RETURNING id INTO _p_Garc_a_Kany;
  END IF;
  SELECT id INTO _p_Cohen_Leonard FROM compositores WHERE apellido = 'Cohen' AND (nombre = 'Leonard' OR (nombre IS NULL AND 'Leonard' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Cohen_Leonard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cohen', 'Leonard') RETURNING id INTO _p_Cohen_Leonard;
  END IF;
  SELECT id INTO _p_Maluma_ FROM compositores WHERE apellido = 'Maluma' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Maluma_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Maluma', NULL) RETURNING id INTO _p_Maluma_;
  END IF;
  SELECT id INTO _p_Rozas_Pablo FROM compositores WHERE apellido = 'Rozas' AND (nombre = 'Pablo' OR (nombre IS NULL AND 'Pablo' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Rozas_Pablo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rozas', 'Pablo') RETURNING id INTO _p_Rozas_Pablo;
  END IF;
  SELECT id INTO _p_Gonz_lez_D_ FROM compositores WHERE apellido = 'González' AND (nombre = 'D.' OR (nombre IS NULL AND 'D.' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Gonz_lez_D_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('González', 'D.') RETURNING id INTO _p_Gonz_lez_D_;
  END IF;
  SELECT id INTO _p_Laufey_ FROM compositores WHERE apellido = 'Laufey' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Laufey_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Laufey', NULL) RETURNING id INTO _p_Laufey_;
  END IF;
  SELECT id INTO _p_Vasconcellos_Jos_Adolfo FROM compositores WHERE apellido = 'Vasconcellos' AND (nombre = 'José Adolfo' OR (nombre IS NULL AND 'José Adolfo' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Vasconcellos_Jos_Adolfo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Vasconcellos', 'José Adolfo') RETURNING id INTO _p_Vasconcellos_Jos_Adolfo;
  END IF;
  SELECT id INTO _p_Yupanqui_Atahualpa FROM compositores WHERE apellido = 'Yupanqui' AND (nombre = 'Atahualpa' OR (nombre IS NULL AND 'Atahualpa' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Yupanqui_Atahualpa IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Yupanqui', 'Atahualpa') RETURNING id INTO _p_Yupanqui_Atahualpa;
  END IF;
  SELECT id INTO _p_Poveda_Donato FROM compositores WHERE apellido = 'Poveda' AND (nombre = 'Donato' OR (nombre IS NULL AND 'Donato' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Poveda_Donato IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Poveda', 'Donato') RETURNING id INTO _p_Poveda_Donato;
  END IF;
  SELECT id INTO _p_Cerati_Gustavo FROM compositores WHERE apellido = 'Cerati' AND (nombre = 'Gustavo' OR (nombre IS NULL AND 'Gustavo' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Cerati_Gustavo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cerati', 'Gustavo') RETURNING id INTO _p_Cerati_Gustavo;
  END IF;
  SELECT id INTO _p_Verdi_Giuseppe FROM compositores WHERE apellido = 'Verdi' AND (nombre = 'Giuseppe' OR (nombre IS NULL AND 'Giuseppe' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Verdi_Giuseppe IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Verdi', 'Giuseppe') RETURNING id INTO _p_Verdi_Giuseppe;
  END IF;
  SELECT id INTO _p_Kander_John FROM compositores WHERE apellido = 'Kander' AND (nombre = 'John' OR (nombre IS NULL AND 'John' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Kander_John IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Kander', 'John') RETURNING id INTO _p_Kander_John;
  END IF;
  SELECT id INTO _p_Mozart_Wolfgang_Amadeus FROM compositores WHERE apellido = 'Mozart' AND (nombre = 'Wolfgang Amadeus' OR (nombre IS NULL AND 'Wolfgang Amadeus' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Mozart_Wolfgang_Amadeus IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mozart', 'Wolfgang Amadeus') RETURNING id INTO _p_Mozart_Wolfgang_Amadeus;
  END IF;
  SELECT id INTO _p_Cuervo_Iara FROM compositores WHERE apellido = 'Cuervo' AND (nombre = 'Iara' OR (nombre IS NULL AND 'Iara' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Cuervo_Iara IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cuervo', 'Iara') RETURNING id INTO _p_Cuervo_Iara;
  END IF;
  SELECT id INTO _p__lvarez_Bel_n FROM compositores WHERE apellido = 'Álvarez' AND (nombre = 'Belén' OR (nombre IS NULL AND 'Belén' IS NULL)) ORDER BY id LIMIT 1;
  IF _p__lvarez_Bel_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Álvarez', 'Belén') RETURNING id INTO _p__lvarez_Bel_n;
  END IF;
  SELECT id INTO _p_Lema_Germ_n FROM compositores WHERE apellido = 'Lema' AND (nombre = 'Germán' OR (nombre IS NULL AND 'Germán' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Lema_Germ_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lema', 'Germán') RETURNING id INTO _p_Lema_Germ_n;
  END IF;
  SELECT id INTO _p_Vel_zquez_Consuelito FROM compositores WHERE apellido = 'Velázquez' AND (nombre = 'Consuelito' OR (nombre IS NULL AND 'Consuelito' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Vel_zquez_Consuelito IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Velázquez', 'Consuelito') RETURNING id INTO _p_Vel_zquez_Consuelito;
  END IF;
  SELECT id INTO _p_Donjuan_Nubia_Jaime FROM compositores WHERE apellido = 'Donjuan' AND (nombre = 'Nubia Jaime' OR (nombre IS NULL AND 'Nubia Jaime' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Donjuan_Nubia_Jaime IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Donjuan', 'Nubia Jaime') RETURNING id INTO _p_Donjuan_Nubia_Jaime;
  END IF;
  SELECT id INTO _p_Tyler_Steven FROM compositores WHERE apellido = 'Tyler' AND (nombre = 'Steven' OR (nombre IS NULL AND 'Steven' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Tyler_Steven IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Tyler', 'Steven') RETURNING id INTO _p_Tyler_Steven;
  END IF;
  SELECT id INTO _p_Perea_da_Silva_ FROM compositores WHERE apellido = 'Perea da Silva' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Perea_da_Silva_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Perea da Silva', NULL) RETURNING id INTO _p_Perea_da_Silva_;
  END IF;
  SELECT id INTO _p_Gonz_lez_David_Ignacio FROM compositores WHERE apellido = 'González' AND (nombre = 'David Ignacio' OR (nombre IS NULL AND 'David Ignacio' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Gonz_lez_David_Ignacio IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('González', 'David Ignacio') RETURNING id INTO _p_Gonz_lez_David_Ignacio;
  END IF;
  SELECT id INTO _p_Carabajal_Demi FROM compositores WHERE apellido = 'Carabajal' AND (nombre = 'Demi' OR (nombre IS NULL AND 'Demi' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Carabajal_Demi IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Carabajal', 'Demi') RETURNING id INTO _p_Carabajal_Demi;
  END IF;
  SELECT id INTO _p_Caccini_Giulio FROM compositores WHERE apellido = 'Caccini' AND (nombre = 'Giulio' OR (nombre IS NULL AND 'Giulio' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Caccini_Giulio IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Caccini', 'Giulio') RETURNING id INTO _p_Caccini_Giulio;
  END IF;
  SELECT id INTO _p_Impensa2_ FROM compositores WHERE apellido = 'Impensa2' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Impensa2_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Impensa2', NULL) RETURNING id INTO _p_Impensa2_;
  END IF;
  SELECT id INTO _p_Gabriel_Juan FROM compositores WHERE apellido = 'Gabriel' AND (nombre = 'Juan' OR (nombre IS NULL AND 'Juan' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Gabriel_Juan IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gabriel', 'Juan') RETURNING id INTO _p_Gabriel_Juan;
  END IF;
  SELECT id INTO _p_Aute_Luis_Eduardo FROM compositores WHERE apellido = 'Aute' AND (nombre = 'Luis Eduardo' OR (nombre IS NULL AND 'Luis Eduardo' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Aute_Luis_Eduardo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Aute', 'Luis Eduardo') RETURNING id INTO _p_Aute_Luis_Eduardo;
  END IF;
  SELECT id INTO _p_Gonz_lez_Luna_Morena FROM compositores WHERE apellido = 'González' AND (nombre = 'Luna Morena' OR (nombre IS NULL AND 'Luna Morena' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Gonz_lez_Luna_Morena IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('González', 'Luna Morena') RETURNING id INTO _p_Gonz_lez_Luna_Morena;
  END IF;
  SELECT id INTO _p_Monsieur_Perin_ FROM compositores WHERE apellido = 'Monsieur Periné' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Monsieur_Perin_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Monsieur Periné', NULL) RETURNING id INTO _p_Monsieur_Perin_;
  END IF;
  SELECT id INTO _p_Baffa_Ernesto FROM compositores WHERE apellido = 'Baffa' AND (nombre = 'Ernesto' OR (nombre IS NULL AND 'Ernesto' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Baffa_Ernesto IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Baffa', 'Ernesto') RETURNING id INTO _p_Baffa_Ernesto;
  END IF;
  SELECT id INTO _p_Rol_n_Fernando FROM compositores WHERE apellido = 'Rolón' AND (nombre = 'Fernando' OR (nombre IS NULL AND 'Fernando' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Rol_n_Fernando IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rolón', 'Fernando') RETURNING id INTO _p_Rol_n_Fernando;
  END IF;
  SELECT id INTO _p_Valles_Oscar_Cacho_ FROM compositores WHERE apellido = 'Valles' AND (nombre = 'Oscar "Cacho"' OR (nombre IS NULL AND 'Oscar "Cacho"' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Valles_Oscar_Cacho_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Valles', 'Oscar "Cacho"') RETURNING id INTO _p_Valles_Oscar_Cacho_;
  END IF;
  SELECT id INTO _p_Fran_ois_Claude FROM compositores WHERE apellido = 'François' AND (nombre = 'Claude' OR (nombre IS NULL AND 'Claude' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Fran_ois_Claude IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('François', 'Claude') RETURNING id INTO _p_Fran_ois_Claude;
  END IF;
  SELECT id INTO _p_Revaux_Jacques FROM compositores WHERE apellido = 'Revaux' AND (nombre = 'Jacques' OR (nombre IS NULL AND 'Jacques' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Revaux_Jacques IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Revaux', 'Jacques') RETURNING id INTO _p_Revaux_Jacques;
  END IF;
  SELECT id INTO _p_Pappo_ FROM compositores WHERE apellido = 'Pappo' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Pappo_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Pappo', NULL) RETURNING id INTO _p_Pappo_;
  END IF;
  SELECT id INTO _p_Puccini_Giacomo FROM compositores WHERE apellido = 'Puccini' AND (nombre = 'Giacomo' OR (nombre IS NULL AND 'Giacomo' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Puccini_Giacomo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Puccini', 'Giacomo') RETURNING id INTO _p_Puccini_Giacomo;
  END IF;
  SELECT id INTO _p_Elgar_Edward FROM compositores WHERE apellido = 'Elgar' AND (nombre = 'Edward' OR (nombre IS NULL AND 'Edward' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Elgar_Edward IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Elgar', 'Edward') RETURNING id INTO _p_Elgar_Edward;
  END IF;

  -- Cae el sol
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=149AE5rNC4bIo_8y8fYtCuOjqT64p_3wA') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Cae el sol', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=149AE5rNC4bIo_8y8fYtCuOjqT64p_3wA')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Airbag_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/14w9k3L73_NcpcL_vO7arTcRFmc_obsCg/view?usp=drivesdk","description":"Contrabajo - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/154jOU4l0wvmCZPnoaUlVGH17tQ7gxtT6/view?usp=drivesdk","description":"Flauta - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/14UbJvqStfvWz-9FaDLZHae2pye6kcQSz/view?usp=drivesdk","description":"Guitarra - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/15K730xeY_CbaZockdKuPJV2EPL8heQLm/view?usp=drivesdk","description":"Oboe - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/15649sVLKXR8_BtkOOc3TkyVrHGba1Bye/view?usp=drivesdk","description":"Perc - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/14_8WXdSszM3GdpyXOQKex0LyV2q9_q2e/view?usp=drivesdk","description":"Piano - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/15QooGjytg_Ya5FibtQ3Vno4LgZs2gu45/view?usp=drivesdk","description":"SCORE - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/15CelcNnP0der4jBznGWwRTNwcb2WXTH_/view?usp=drivesdk","description":"Trombón - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/14O1nVI7HUI9BMnpatIBBUKZZ_YCQwywO/view?usp=drivesdk","description":"Trompeta Bb - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/15LDb_9vtEXLf-LKOJwz32NLdcaijdP6l/view?usp=drivesdk","description":"Viola - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/14SfiUMckvHnQ_zSUj-RQczkyAr1jEEjb/view?usp=drivesdk","description":"Violín 1 - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/14mJJJOkj6imo7H94yWOx2ntGH7pMNu1P/view?usp=drivesdk","description":"Violín 2 - Cae el sol - Airbag-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/153nPVe1mf0nU6zCKrquw9lSdbteUfUFq/view?usp=drivesdk","description":"Violoncello - Cae el sol - Airbag-Lagos.pdf"}]', false);
  END IF;

  -- Tu poeta
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=10k04HawajpEHTFXlt1qyWaTUWBFwPYSL') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Tu poeta', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=10k04HawajpEHTFXlt1qyWaTUWBFwPYSL')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Campos_Alex, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Batería', '[{"url":"https://drive.google.com/file/d/11inSFMU9J7ImcgOpsETIXDmZNnUCeQz1/view?usp=drivesdk","description":"Batería - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/11mxYCdtS7Fe7RQ-UeNj1smCjxCSIwKJg/view?usp=drivesdk","description":"Contrabajo - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/121ts0O6x7WqJbdVrjqc0eN_P-HDpNNrc/view?usp=drivesdk","description":"Flauta - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/128MD81v60QdQ5FWQVEWpfjxD6NgTPwvG/view?usp=drivesdk","description":"Guitarra - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/11I4ndVTRUxEriqbEl1L-GP7mPVPusiiG/view?usp=drivesdk","description":"Oboe - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/120OZGYvDT8BmL3SazO6P9K6lPNR4mLDn/view?usp=drivesdk","description":"Piano - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/12D_sYmF0BFLvTtbDLFK58293sUriIJmm/view?usp=drivesdk","description":"SCORE - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/122pag7gYwFcwDiiJekF14sh1OuXLENBs/view?usp=drivesdk","description":"Trombón - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/10ydJyjSv7Knl2sC-a2O9pBBO3RrLcfdG/view?usp=drivesdk","description":"Trompeta Bb - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/11cY0_C9cEzfZqYH7FBNgXExW3x-t9-dt/view?usp=drivesdk","description":"Viola - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/11ezza9JXL5Vv9FGTONXvR_1XORmABI2n/view?usp=drivesdk","description":"Violín I - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/11Zho_UmbRH6xzcwijrs55r-iwMP6RmZs/view?usp=drivesdk","description":"Violín II - Tu poeta - Campos-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/11SQhZzWi2vTk3rmYF3GBxgnS662_wrrc/view?usp=drivesdk","description":"Violoncello - Tu poeta - Campos-Lagos.pdf"}]', false);
  END IF;

  -- Sus ojos se cerraron, arr. Pérez
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1wbhoz4gubghXjvQXuPQBUWcgug5SLpVw') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Sus ojos se cerraron, arr. Pérez', _p_P_rez_Micaela, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1wbhoz4gubghXjvQXuPQBUWcgug5SLpVw')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gardel_Carlos, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_P_rez_Micaela, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1kb2q8xB8sO08hDvT-s06_wBoCLQOHUnI/view?usp=drivesdk","description":"Contrabajo - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1o2azXKZZvxRk7cMaAf8t14y5VPPcMThW/view?usp=drivesdk","description":"Flauta - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1JrfKfPWavMXh-o41aA8IFoy73UQgWPA5/view?usp=drivesdk","description":"Guitarra - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1VJvxIXpwm9W630rf2WXlb-9glOqFeegv/view?usp=drivesdk","description":"Oboe - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/15IlB17DVxopWImXGrJ1KrEqWmxqssMi5/view?usp=drivesdk","description":"Perc Batería - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1sDQLLuRO6V4EbmON-Q517PUtTayEQm-3/view?usp=drivesdk","description":"Piano - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1GTQVohne8MsVwNA8gzPyZiCCI-KZ7RTm/view?usp=drivesdk","description":"SCORE - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1__iluoFmfXjukremxLS5AoACQN9WyKFk/view?usp=drivesdk","description":"Trombón - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1V0gkSdiAHuOeIsBw4hsqj2hVdCvrer-r/view?usp=drivesdk","description":"Trompeta Bb - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/10LqjQ1bQPtoruNBC9PexiOPT3-19UzFp/view?usp=drivesdk","description":"Viola - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/17X8zuyOaqXGnpBKF69Ka4_OtuXUjq6j9/view?usp=drivesdk","description":"Violín 1 - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1-gHP-W-PoZisuaJJfR9W3gGZHzCebKQj/view?usp=drivesdk","description":"Violín 2 - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1tU5fkNFjJHTpYvezkbf9C2sLgWgRTM1Q/view?usp=drivesdk","description":"Violoncello - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1PN2BSnP2GUPpIXI6BjR2hYFhG93dc_RV/view?usp=drivesdk","description":"VOZ - Sus ojos se cerraron - Gardel-Pérez,M.pdf"}]', false);
  END IF;

  -- Alfonsina y el Mar, arr. Cattani
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1vIIJ_2Lm6rudwenLmuVVtZXt2h0EzI6W') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Alfonsina y el Mar, arr. Cattani', _p_Cattani_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1vIIJ_2Lm6rudwenLmuVVtZXt2h0EzI6W')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Ram_rez_Ariel, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cattani_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1d6s7EOg45nh5gzTQMfhswqsflYt1OL6f/view?usp=drivesdk","description":"Contrabajo - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1uAdQAs5hy12ju-gaSU_nCaKUhhLqzavw/view?usp=drivesdk","description":"Flauta - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1hDbb0APYDR-6t_IHu_kLlo0_HkQcAzjf/view?usp=drivesdk","description":"Guitarra - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1oKcLIO29OaTTOXFJ9GR9xLo1PxzPoAIG/view?usp=drivesdk","description":"Oboe - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1HR-AUpFfI09Q5OcFPb2jLxCLmY1oieJY/view?usp=drivesdk","description":"Perc Batería - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1fa_Tf8cNWpki6KdHGY-RA4SwXeNwBXrj/view?usp=drivesdk","description":"Piano - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VfdrPpHd3CoIxSr5POEGMJ_mpQJsUMLy/view?usp=drivesdk","description":"SCORE - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1mVT6b7PxIfOVTPnyXzF743NAP5F4p1Qe/view?usp=drivesdk","description":"Trombón - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/1kHezpggyI9hDoUnTb2fB_iQKS7-Imiru/view?usp=drivesdk","description":"Viola 1 - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 2', '[{"url":"https://drive.google.com/file/d/1YPqddnILnNLPjXFg5fsQkmWv_jv4zfw2/view?usp=drivesdk","description":"Viola 2 - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violines 1', '[{"url":"https://drive.google.com/file/d/1ShjtcUglXDJBgijIR318coXMhqA3AtCs/view?usp=drivesdk","description":"Violines 1 - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violines 2', '[{"url":"https://drive.google.com/file/d/1Vfs3B88gA4Zd0UI6B8bxzwk5YRwXAlUd/view?usp=drivesdk","description":"Violines 2 - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 1', '[{"url":"https://drive.google.com/file/d/1Cc6CK16k29Q-hzKsFOiJkmRFMraZodh8/view?usp=drivesdk","description":"Violoncello 1 - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 2', '[{"url":"https://drive.google.com/file/d/1-jkcrzPw_y1_wtexWxfwgB7DmKFh4NA2/view?usp=drivesdk","description":"Violoncello 2 - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1KDZMVqIDSH3FDZUhv6xYL5QPN1CkG9eH/view?usp=drivesdk","description":"Voz - Alfonsina y el Mar - Ramírez-Cattani.pdf"}]', false);
  END IF;

  -- Viaje Cantor
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1m7YxFb-Cu3aFDmJmsUmkJ2k9WrHXhhXA') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Viaje Cantor', _p_D_Antona_Esteban, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1m7YxFb-Cu3aFDmJmsUmkJ2k9WrHXhhXA')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Mansilla_Benjamin, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_D_Antona_Esteban, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1rV27KqiTu1fFXoJmKZ89h2Tck_2CDuNw/view?usp=drivesdk","description":"Contrabajo - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1rLU5gmq5dEupwrpceeFfedflW6rrr9M8/view?usp=drivesdk","description":"Flauta - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1rFdqSf5Df-4avLZSZnjMOLS6vnjX2r0z/view?usp=drivesdk","description":"Guitarra - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1rEXv59A9S1CFDqQC6m91dOr6V7999Osl/view?usp=drivesdk","description":"Oboe - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1rCELVNkGVG9_JuHMUEXY43q7-lrkr_QL/view?usp=drivesdk","description":"Perc Batería - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1r6sIHgxi4T49EpPorBt5E7BTN1p0neRV/view?usp=drivesdk","description":"Piano - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1r4XNBjJfo0EUr7iuwFi2Bq-dB0S9amK6/view?usp=drivesdk","description":"SCORE - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1r3Uu8bVRZo7EIZ50TuOnzjbv8U7aD-NF/view?usp=drivesdk","description":"Trombón - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1r1uy9LmfgHPeE6vXC_Ch7wbHb65M4S6r/view?usp=drivesdk","description":"Trompeta Bb - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1qs2G2-7sal2HTzgQPFu_tMlDVwkFMFP7/view?usp=drivesdk","description":"Viola - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1qjqzehmSX_WIOA2VCl9lil73uKsKRowk/view?usp=drivesdk","description":"Violín 1 - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1sVaBY-FSHt8n4dHiXAbkAWylbN0qOoag/view?usp=drivesdk","description":"Violín 2 - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1qmxaQ_9muk4msgwuZuvT2yzUA8-amPC2/view?usp=drivesdk","description":"Violoncello - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1sGlLIt8q7WPcpztZyd9RGCqv9pIef0x8/view?usp=drivesdk","description":"VOZ - Viaje Cantor - Mansilla A, B-D''Antona.pdf"}]', false);
  END IF;

  -- El arte del querer
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=15q2ezyrhSurUPNY14MQuI_uEx2bKktIR') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('El arte del querer', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=15q2ezyrhSurUPNY14MQuI_uEx2bKktIR')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Rold_n_Carlos, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/17CmG4NIjwxh2lVAjPbuj5su6CYmVo-lC/view?usp=drivesdk","description":"Contrabajo - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/179R2iwmUFsbqWrFnkeFjOHfwQzF7DCp2/view?usp=drivesdk","description":"Flauta - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/176ij-fxMlWWfQwuSafEIzITaeZ17_2LN/view?usp=drivesdk","description":"Guitarra - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/16t5Rm94JjuCKbwWgxMdnq5sBKgcp8fqR/view?usp=drivesdk","description":"Oboe - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/17CBx2HtmsDctm1IVNhosuiwdym2nk9Ak/view?usp=drivesdk","description":"Perc - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/16graz9TukCISZ8KaiAmb_PWygMaW7qni/view?usp=drivesdk","description":"Piano - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/16WrCTfhyXUv_y5vBnjLuROxyYLPKMVAb/view?usp=drivesdk","description":"SCORE - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/16RfThC4-xv2gdWoN9waTvwIVlN6_5cxx/view?usp=drivesdk","description":"Trombón - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/16PNc1UjDsZ8_LQM8LGXvvJNjo3iV9kJM/view?usp=drivesdk","description":"Trompeta Bb - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/16MWck7gFJ8X4LdVabo5pH3_xwznY_o44/view?usp=drivesdk","description":"Viola - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/16Hb_ld6M1QwSP5G_gNqaaRo-wxf3Un42/view?usp=drivesdk","description":"Violín 1 - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/166wrvjY62sTt0fRezGyjHO7ZN-lRsAQ1/view?usp=drivesdk","description":"Violín 2 - El arte del querer - Roldán-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/17CpPDX9GNauXzsnFuXK9Sb5p9CKrRv1I/view?usp=drivesdk","description":"Violoncello - El arte del querer - Roldán-Lagos.pdf"}]', false);
  END IF;

  -- La Pomeña, arr. Lagos
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1224FZeSm0s__bit1qlQItQdZZ63F825l') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('La Pomeña, arr. Lagos', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1224FZeSm0s__bit1qlQItQdZZ63F825l')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Leguizamon_Gustavo_Cuchi_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/12O_YKJDRbGjHJy5Pdk8ZrFya1Zh3LGuW/view?usp=drivesdk","description":"Contrabajo - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/12X88NiilIcpOyHDjuex7-L2dbiEWJZfd/view?usp=drivesdk","description":"Flauta - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/12dYYi77s2Xk0Mn2o8KviGkVG5kYvchbR/view?usp=drivesdk","description":"Guitarra - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/12d6BxRYQ2Cf9aIYxhLJ2oD2fuGwcLFEt/view?usp=drivesdk","description":"Oboe - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Drum Set', '[{"url":"https://drive.google.com/file/d/12edWe16olQnD4itMyvQf2hAQO46Zprbu/view?usp=drivesdk","description":"Perc Drum Set - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/12kdewj83auab6zgB3wQgDBOs2g1RLfVi/view?usp=drivesdk","description":"Piano - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/12afGbrKpt2NlQmkiXBby4dQ5C2fJyBhD/view?usp=drivesdk","description":"SCORE - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/12VBHAm2J1VRBbTabt4Narv8YwdgH0Krr/view?usp=drivesdk","description":"Trombón - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/130C_nfNsp9Se1gYcLHOJYGbxCKQngHRl/view?usp=drivesdk","description":"Trompeta Bb - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/12VEJajcjWYtudYqOYcsl5BLk6DBweK01/view?usp=drivesdk","description":"Viola - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/12FlDadzKaQ_-2L83t2LP9rEnlbyBx6Aq/view?usp=drivesdk","description":"Violín I - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/12uVmelMnaNadMRfyY3qwEsGnTQZymptI/view?usp=drivesdk","description":"Violín II - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/12QaEKEgLRDsmEoOMz0z9XmaBHwADS4aZ/view?usp=drivesdk","description":"Violoncello - La Pomeña - Leguizamón-Lagos.pdf"}]', false);
  END IF;

  -- El tiempo es veloz
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1xkPeKf5XYlKVdjxBLMjwpDupN-smtBCk') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('El tiempo es veloz', _p_Robledo_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1xkPeKf5XYlKVdjxBLMjwpDupN-smtBCk')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Leb_n_David, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Robledo_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1EFBXzbdpX9SwPB-2VVxiKJgT2ieJKsuv/view?usp=drivesdk","description":"Contrabajo - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1lRV38BCUwdvFy6gBshHbAxYviMiixAyv/view?usp=drivesdk","description":"Flauta - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/180bM0YWS_NXIglxE24DnG8VcHrbRbM-b/view?usp=drivesdk","description":"Guitarra - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1vhzeqYyAGdNRYvOaoYJKmImYEFoecORX/view?usp=drivesdk","description":"Oboe - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/1QUKc3LAGeXYe44NvcQwMgukbWqqyb4fQ/view?usp=drivesdk","description":"Perc - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1KHJP1mJBcMLxwke4tG4T7NYsLpr70FRI/view?usp=drivesdk","description":"SCORE - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1RT2UJu7azRwXkSNkR0S-o_EgBx-Zu7WD/view?usp=drivesdk","description":"Trombón - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1nxoO9VXQzSrIiI4TEOzn9IxIF0tUnkOw/view?usp=drivesdk","description":"Trompeta Bb - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1sytlEgzQ5Z34F_Id9TQedMrr0C4oTl1a/view?usp=drivesdk","description":"Viola - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ujVq-RPeLRz5ApXqV1iz9G5Mdu52G1VY/view?usp=drivesdk","description":"Violín 1 - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/19T_itoVNlUSzYMtKUwPxPOJ0cx61y1Jx/view?usp=drivesdk","description":"Violín 2 - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/10Jphdw9Odo4GTBMEFKWijf1SBmBNQTkW/view?usp=drivesdk","description":"Violoncello - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1MwyphwZaJ3A_4wgnXKDMykKQKQphFbyF/view?usp=drivesdk","description":"VOZ - El tiempo es veloz - Lebón-Robledo.pdf"}]', false);
  END IF;

  -- La nave del olvido
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1w_wt8CvFsjREg9viIewbVNHgielZHtgd') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('La nave del olvido', _p_P_rez_Micaela, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1w_wt8CvFsjREg9viIewbVNHgielZHtgd')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Ramos_Dino, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_P_rez_Micaela, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1xUtay2IriqVzMDcnzyysdgvMRbFPGUeL/view?usp=drivesdk","description":"Contrabajo - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1x4yPr1RU4uOx9jetyd91p0hVm3EvV7DR/view?usp=drivesdk","description":"Flauta - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1wvWDDv4HIScZtYsj-vaZe5rlS0M4fZGj/view?usp=drivesdk","description":"Guitarra - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1wvK1R7cSj7mvZMRHNo9Jwnw_e9qxrSDS/view?usp=drivesdk","description":"Oboe - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión', '[{"url":"https://drive.google.com/file/d/1wpQAEZLWBg9BCtxhgDjqZtlTI67glQKT/view?usp=drivesdk","description":"Percusión - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1wqXriLjme1vJh5umOPAdvyi3g9dnYpb9/view?usp=drivesdk","description":"Piano - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1xIgCOleApje17kWWvT-l7yT6O0k4i8Vl/view?usp=drivesdk","description":"SCORE - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1wlXmB7sAYwOaHzxXee51pN27NtrIM-fV/view?usp=drivesdk","description":"Trombón - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1wpPqocEliXlHCNCWzp1fol8GgSxtIUdY/view?usp=drivesdk","description":"Trompeta Bb - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1wkTQshdeXxRjyKg2WifFGSeIW-PX3EtI/view?usp=drivesdk","description":"Viola - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1wkQiP9yrCUpnBr1U4XDmUqvq9533S2Zl/view?usp=drivesdk","description":"Violín 1 - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1xQIhqlLwK2yqCP56MR-q5l4unhBBvTq3/view?usp=drivesdk","description":"Violín 2 - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1xZQ3r_SfOZYl824O3g86dz97UQtT1AH3/view?usp=drivesdk","description":"Violoncello - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1xMQR5gujKD72C0ejvu-98qwkSmFR9M7M/view?usp=drivesdk","description":"VOZ - La Nave del Olvido - Ramos-Pérez,M.pdf"}]', false);
  END IF;

  -- I will always love you
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1-rjMdDcZ0JCCGRabhhX3gaTQiPXuRV-0') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('I will always love you', _p_Napolitano_F_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.1 - 0.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1-rjMdDcZ0JCCGRabhhX3gaTQiPXuRV-0')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Parton_Dolly, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Napolitano_F_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/15RQ5rOoJ3E66T3u6KtIW7_Ig25Za9vZd/view?usp=drivesdk","description":"Contrabajo - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1r2L-V3rgieUGRGNJXGXy8gP3V413RV_j/view?usp=drivesdk","description":"Fagot - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1P_MnR21x-q3eHsubbkpUG4pQ_J_oJSZ1/view?usp=drivesdk","description":"Flauta - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1_hMW8QnxUG-sHHtiAlEbBEwwWzyX-fHM/view?usp=drivesdk","description":"Guitarra - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/106dt1dcZ3AITAvQ34pznEYxYSc-BnE5a/view?usp=drivesdk","description":"Oboe - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/1DF99A9PEBxQfd-FzT5kPE83vo8UDRhsq/view?usp=drivesdk","description":"Perc - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1EqNNewBkKiKy0ce5Xx1cVpwJZfvVBG14/view?usp=drivesdk","description":"Piano - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1m4DTOMe8NRc8ix5uwyPoZkbOXDZ4q1Lf/view?usp=drivesdk","description":"SCORE - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1070_z1tX6ljViZy5Dvq7DxXg94b46Q8p/view?usp=drivesdk","description":"Trombón - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1g2UX968ZujtQIoOqaYFcgouoJe6_sZtY/view?usp=drivesdk","description":"Trompeta Bb - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ySJa9va0v1-YLmNZZ0ZFomMRDES-Ks3f/view?usp=drivesdk","description":"Viola - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1XiTvikfyqyLwFZrVtVdRlgXkhSgJZjrn/view?usp=drivesdk","description":"Violín 1 - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Gb8nGF3ek2MW38g_oJqLDuTGcHKa9HCY/view?usp=drivesdk","description":"Violín 2 - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1J5jKoH4S7X72ei7x9tW75fum0YiLUXXz/view?usp=drivesdk","description":"Violoncello - I will always love you - Parton,D-Napolitano,F.pdf"}]', false);
  END IF;

  -- Nostalgias, arr. San Carlos
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1kCWTxQs0raV7Eh9zgSIiharv2uWOewhO') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Nostalgias, arr. San Carlos', _p_San_Carlos_David, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1kCWTxQs0raV7Eh9zgSIiharv2uWOewhO')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cobi_n_Juan_Carlos, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_San_Carlos_David, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/15TjYL_Vmy4vUaHoaMMIQ6vcD-CI6P6e_/view?usp=drivesdk","description":"Contrabajo - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1zaqrHXOPE13-KKHXtkE7zDvApEp50ZSn/view?usp=drivesdk","description":"Flauta - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1c5aETIn4jFiiNNsVq_TjyBe4rLTrh-Ag/view?usp=drivesdk","description":"Guitarra - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1YwqbpJcjYIT85VpqN1PgiVsDNlLbEmdB/view?usp=drivesdk","description":"Oboe - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1lc4W1u_mQJAu3WUm76RszKCcOivi0jfk/view?usp=drivesdk","description":"Piano - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11hXBAbk5AQjcJaaDV4T8RGak5cA3io2z/view?usp=drivesdk","description":"SCORE - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1sD6OM61WF245mJvR6GyIvv5CA0rpNu4O/view?usp=drivesdk","description":"Trombón - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1l_7W1Wcgr7WQE5q8QO8o1bXvQLl91TJ_/view?usp=drivesdk","description":"Trompeta Bb - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1yp-Ic0bBDslWAmTa5VU4nTB1HERAds0l/view?usp=drivesdk","description":"Viola - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1SP8Xy5gvEXpjKTA6FnX90Xru6euVFZjf/view?usp=drivesdk","description":"Violín 1 - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ESVkH0Pr8TOcmCpOyZtoLDKy62Opl3HE/view?usp=drivesdk","description":"Violín 2 - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1SVEG2TKZUPRAmElUX4HER71U9nUsEHY1/view?usp=drivesdk","description":"Violoncello - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1-ozM-qvC6WXM4fHLfBX3-GxXOlHs2BK4/view?usp=drivesdk","description":"VOZ - Nostalgias - Cobián-San Carlos,D.pdf"}]', false);
  END IF;

  -- La de la mala suerte
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=161_OQYaLMAYi39b97LaH1sLOghXEhbh3') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('La de la mala suerte', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=161_OQYaLMAYi39b97LaH1sLOghXEhbh3')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Jesse_y_Joy_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/188yKxaXjBgwPxlTEjW3fL0nB2LnbtDni/view?usp=drivesdk","description":"Contrabajo - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/17sIvdwDNq5kPFwagAOgd7PKZW44ZN9wc/view?usp=drivesdk","description":"Flauta - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/17jIxjoe7a2eRJPKksZdIxRZI68ZZp2KE/view?usp=drivesdk","description":"Guitarra - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/17dJIkMcFeHJhmlLPf9XWExabp5ue690w/view?usp=drivesdk","description":"Oboe - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/17zBpSw-HB3hU9ajdfqafQRZDOgbJawcH/view?usp=drivesdk","description":"Perc - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/17__D6S3RLgXTQMqmYbX_RvQbFivpM-OB/view?usp=drivesdk","description":"Piano - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/17_I7p1dI3ufa6PvfiNH5rSgOZKDI2wsI/view?usp=drivesdk","description":"SCORE - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/17XQ-xlzsxoB_-WME7tqE32sNiOYY4klv/view?usp=drivesdk","description":"Trombón - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/17UteezNOc28H_WwvXUVJm7_oUrg1XY_D/view?usp=drivesdk","description":"Trompeta Bb - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/17RxNU4fKDZck3UTu_ugL8ScolFmlH49J/view?usp=drivesdk","description":"Viola - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/17QVZ8OaY3FZ2XWoR3kIjQwgmv7yEGDTo/view?usp=drivesdk","description":"Violín 1 - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/17DACxwOqNAgpBfsNOR1Lq2KoDxqGyS_h/view?usp=drivesdk","description":"Violín 2 - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/18FZH-iX29SU2vE-cd8u-gp1_YEIAwE-d/view?usp=drivesdk","description":"Violoncello - La de la mala suerte - Jesse y Joy-Lagos.pdf"}]', false);
  END IF;

  -- Remamos
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1-kZOH0Fgu124JqfANrP2MwRX6VEsZp9q') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Remamos', _p_Robledo_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1-kZOH0Fgu124JqfANrP2MwRX6VEsZp9q')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Garc_a_Kany, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Robledo_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1M46IEY6j8aZ8NBva3bGqbD8W-B7IIyq9/view?usp=drivesdk","description":"Contrabajo - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1PHjv9IIam8nU_k6ZRnbVg4DWkzPxv70Z/view?usp=drivesdk","description":"Flauta - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra_acústica', '[{"url":"https://drive.google.com/file/d/1rz43O5vepcqX0u1gW98x68DeAGdYyCO8/view?usp=drivesdk","description":"Guitarra_acústica - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/13VhU_t8P6qqjmWfB25HQLRYeitV5iffj/view?usp=drivesdk","description":"Oboe - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/1B1X5ZNOG2BBfNSJC6ziWgktPtjvt_Cpj/view?usp=drivesdk","description":"Perc - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1J8NlxctK7YEn_238vr55tFfDmYX7Hlm_/view?usp=drivesdk","description":"Piano - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ASGrDin2OLgxvMeQp74mB18PPEu5pHK2/view?usp=drivesdk","description":"SCORE - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1D61RI9B1pVIDlI8TEavgGqvHq70lDU6N/view?usp=drivesdk","description":"Trombón - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1Q_CaxyTr8YV-aJPdsv3gO7vEOjDDEAZi/view?usp=drivesdk","description":"Trompeta Bb - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1gTUZa9AeL6JYT-_1TRw6NRZyG4m1hZKI/view?usp=drivesdk","description":"Viola - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1C6MqpmxMTJm8DNUKtJ-5Fkx_LPJcS0KS/view?usp=drivesdk","description":"Violín 1 - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_574eWu37zY11KjDnijHRL7FNw9ARXcu/view?usp=drivesdk","description":"Violín 2 - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Xbud1ykGsmgqsslGzFg-vrJEgiljEJVB/view?usp=drivesdk","description":"Violoncello - Remamos - García,K-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1nO3kmtpXHltK1UfHeg1i_VmgMWPowRzH/view?usp=drivesdk","description":"VOZ - Remamos - García,K-Robledo.pdf"}]', false);
  END IF;

  -- Hallelujah, arr. Lagos
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=13Wk9fZP_qyGaln1NYs7A4x1MvkljtDhr') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Hallelujah, arr. Lagos', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=13Wk9fZP_qyGaln1NYs7A4x1MvkljtDhr')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cohen_Leonard, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/14LBtT2EtxA_W3T2aWM9U5tA7UOLvpNu2/view?usp=drivesdk","description":"Contrabajo - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/13uZ6li9x6Xqljx_3kQ1XWYrJIe6f6vYS/view?usp=drivesdk","description":"Flauta - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/13qvCmgBr2TWNeXDN2J148kWLokQMO7nn/view?usp=drivesdk","description":"Guitarra - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/13kFL_Z1PAD9gsij4Hoxp0C6spfOt6NON/view?usp=drivesdk","description":"Oboe - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/148Y1dpud29U1weAoEOMag90w2Xy5mDEw/view?usp=drivesdk","description":"Perc - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/13_NjtP7Lf7_fy-DjvT4vjcnz4isLo2Rx/view?usp=drivesdk","description":"Piano - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/13XPbH7VproXOVGBFPvSFA8sqTLxL_2-z/view?usp=drivesdk","description":"SCORE - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/13wwDmRI0kj47nYQ8Zl9ac94LoonPgGS9/view?usp=drivesdk","description":"Trombón - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/13gUGLoZ6NE74YnmHNMq9v6JhtZlT9hek/view?usp=drivesdk","description":"Trompeta Bb - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13kK9PTmucsuU6M7OsU_pmidMek6-eop2/view?usp=drivesdk","description":"Viola - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/13fXwffSWrGd78l4s-vpynIS08xniRkEW/view?usp=drivesdk","description":"Violín 1 - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/13nysBBC4iCVZCj3iFVDzdkyPNalZa0Ru/view?usp=drivesdk","description":"Violín 2 - Hallelujah - Cohen-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/13kczgdOHd5Wy3faYKAbtiBGaEnktvbMN/view?usp=drivesdk","description":"Violoncello - Hallelujah - Cohen-Lagos.pdf"}]', false);
  END IF;

  -- La Reina
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1m7eHMStoyo4AkROJ_E3NqYKrOOwzQVcG') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('La Reina', _p_D_Antona_Esteban, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1m7eHMStoyo4AkROJ_E3NqYKrOOwzQVcG')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Maluma_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_D_Antona_Esteban, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1q_Eg5D7Hx_qcXHoMYI8nlvw-DwVyQTKV/view?usp=drivesdk","description":"Contrabajo - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1qZpGueChMHY3efHj5S-Qw072_RRbSon_/view?usp=drivesdk","description":"Flauta - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1qYunvxKcI6rlBkpQ_Owb9246XXo4Xg8b/view?usp=drivesdk","description":"Guitarra - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1qP6UuGLjF3CXS5b5KvxYtHcM82bK63JQ/view?usp=drivesdk","description":"Oboe - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1qP6SrefOJTxxvMxsS44cMoNi1ntF5z1V/view?usp=drivesdk","description":"Perc Batería - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1qKjNOcQUiVQ45KsJ2iEwLrtFfFYyLrVF/view?usp=drivesdk","description":"Piano - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1qKWbynkEZaKmX6a2w4KpaYpewQFn9uwY/view?usp=drivesdk","description":"SCORE - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1qDiz8mkyT1f6igKB7y0z-xiwlckRFMwO/view?usp=drivesdk","description":"Trombón - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1pxduqfu-9NDwc_W99qcFi5jDOxhg2KDj/view?usp=drivesdk","description":"Trompeta Bb - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1pxFZU09n93vwgCrYFk_fmAbBJ1zBi3uy/view?usp=drivesdk","description":"Viola - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1poL2cV7gRdYxVyJWzLbn955PkrKf414r/view?usp=drivesdk","description":"Violín 1 - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1p_DVnClfaYiz28zC6Fh-KLt7XnXafmIa/view?usp=drivesdk","description":"Violín 2 - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1pshGyB5G6fXA1wjeL9HxigEq-PgS2x68/view?usp=drivesdk","description":"Violoncello - La Reina - Maluma-D''Antona.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1rdda7RNZJOcpQqhzRikDAI5sA_9EXHYJ/view?usp=drivesdk","description":"VOZ - La Reina - Maluma-D''Antona.pdf"}]', false);
  END IF;

  -- Del mismo río
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=16G4q__ZMV5irG8Oe4xpLDlLNK6a_sfgd') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Del mismo río', _p_Gonz_lez_D_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=16G4q__ZMV5irG8Oe4xpLDlLNK6a_sfgd')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Rozas_Pablo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gonz_lez_D_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1UMCTxQDfZ0Uxv9Qx_UP77yRgubOJ2dsT/view?usp=drivesdk","description":"Contrabajo - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1w0qiQy1GmMi2_LC0r4QO28svTtPMO_RM/view?usp=drivesdk","description":"Flauta - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1EnWSIhT8FFZDdOB8slQtRa0gprR0RRHc/view?usp=drivesdk","description":"Guitarra - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1pWi0aOkAFWU0Ll-Gf4tnZBo4kTg4WQrq/view?usp=drivesdk","description":"Oboe - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/15Fgrb3JdMUjxYtIq7TafA3MC4rwA1xRl/view?usp=drivesdk","description":"Perc Batería - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1u2hHhnoWdagXPYNLPcWwfldaU53jvDv0/view?usp=drivesdk","description":"Piano - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UrlLNqvC_WlxXm544HwMQHhafdWHuJPQ/view?usp=drivesdk","description":"SCORE - Del Mismo Rio.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/192mEsr_HXCjoKFpY9kIzEsGcmbeGSPk3/view?usp=drivesdk","description":"Trombón - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1J8fm3xc1JI4echydPcTC5gh3ANrv4ZyG/view?usp=drivesdk","description":"Trompeta Bb - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13eYncJ50g7ilJfUIGBp_ehddY0Od9Rxm/view?usp=drivesdk","description":"Viola - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/17qdEs_YS0r-XL26ThiBMMzpsfwGxK7se/view?usp=drivesdk","description":"Violín 1 - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1A6U-Mxxf7cCyKOMZrGN1SXG9bwFAhR4S/view?usp=drivesdk","description":"Violín 2 - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/18Gbo8RVF66f2kRt_P5lg1mP-Wbjs7z85/view?usp=drivesdk","description":"Violoncello - Del mismo río - Rozas-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1adrLU9bOaEy2A3WMWdDQm0HsTygRXVXf/view?usp=drivesdk","description":"VOZ - Del mismo río - Rozas-González,D.pdf"}]', false);
  END IF;

  -- From the start
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1XfrgCFhUk-Jb_f_lFfUjp4qzTCphwK2a') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('From the start', _p_Napolitano_F_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.1 - 1.1.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1XfrgCFhUk-Jb_f_lFfUjp4qzTCphwK2a')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Laufey_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Napolitano_F_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Mf8nNo0Z1ljfGk-cyOADeFiHqq6iTsSP/view?usp=drivesdk","description":"Contrabajo - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1yAB5YOO64jXvYXI4F_z6Dy9X7DAwRqyF/view?usp=drivesdk","description":"Corno F - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1FuNjTMaiFfbiayeWas46r1ooefUoR4YI/view?usp=drivesdk","description":"Fagot - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1X4QQ1SC_3NDOvs2QGV8KO0I_IX2onZ1C/view?usp=drivesdk","description":"Flauta - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1JD8p-fLxDVkG0bfNNYlApdq9kwwhNGGO/view?usp=drivesdk","description":"Guitarra - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1094Fv1CFQ4UrybyFNMunIy5pmMh7DJtU/view?usp=drivesdk","description":"Oboe - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1uvw1JIZbnRTSKcs-U-BJ1qxeIj2lJYZ0/view?usp=drivesdk","description":"Perc Batería - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1E6uZQWeAiBS9--PhN7HP7kwqazKdf_Xd/view?usp=drivesdk","description":"Piano - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1q1THiKv577Jigl4H7zGWn1W9u2M2TP8E/view?usp=drivesdk","description":"SCORE - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/10FF5OIdGVJ7W8gtBH-iydMhjYGWRY9mY/view?usp=drivesdk","description":"Trombón - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1FM9CJOOXLw8Yv1XCumO6_vwIDSdWlgof/view?usp=drivesdk","description":"Trompeta Bb - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1DEMLO4R_0hgLHW9KxakxrYoUtKOwJEAu/view?usp=drivesdk","description":"Viola - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1hH1nImfMpSGo0Y8RZixrQOwbyr8j7PU5/view?usp=drivesdk","description":"Violín 1 - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1-qh2mWjSd1roNT2QpClDg7HTSWRw79ph/view?usp=drivesdk","description":"Violín 2 - From the start - Laufey-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1B6xsKOepsQQM5dwfcF1QQLZoMf3QHRjg/view?usp=drivesdk","description":"Violoncello - From the start - Laufey-Napolitano,F.pdf"}]', false);
  END IF;

  -- Mi estrella predilecta
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1mD_FOInv5Xbp2wn1lOpmOoTATySVUKKR') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Mi estrella predilecta', _p_Cattani_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.1.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1mD_FOInv5Xbp2wn1lOpmOoTATySVUKKR')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Vasconcellos_Jos_Adolfo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cattani_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1LfM0-hHl5-YVhahctZqoAI3S7wRQn9L0/view?usp=drivesdk","description":"Contrabajo - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1pFuxkSHnDosDyOSHKvNRnvMBpFFpaFv4/view?usp=drivesdk","description":"Flauta - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1vnbNzYyZbEF8x7zC3wyQqRueCDVvwbsU/view?usp=drivesdk","description":"Guitarra - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1kwRdMS70hWgRb_387VuufSnlPjexu3af/view?usp=drivesdk","description":"Oboe - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1bzL_kHGqawFq0Qv0G97mpHGiCWyJ08Lx/view?usp=drivesdk","description":"Perc Batería - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1kk1gYkT_eLB6TvABmeDi7mvHizSToDCA/view?usp=drivesdk","description":"Piano - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/16-JLTfpQ9Usw_Oq7wRYbN9h-jMdPlI-S/view?usp=drivesdk","description":"SCORE - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/17viYv2uiwgMoDCoXN7wKektZpKw49fWF/view?usp=drivesdk","description":"Trombón - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1yVFv261CtKpe8kgbHyYAqAI5Em1cjlWb/view?usp=drivesdk","description":"Trompeta Bb - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/1kT801SpoY90xZsmKbbkwTd-fM_v7jWE3/view?usp=drivesdk","description":"Viola 1 - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 2', '[{"url":"https://drive.google.com/file/d/1Nu-vzW-tgN7GkWFil7ws-_LbSd__sqQC/view?usp=drivesdk","description":"Viola 2 - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1PzkDFZz3r50iH5l8G57YFb6BgpC579PM/view?usp=drivesdk","description":"Violín 1 - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1EEw0XwU4IGOtqmbDaEiCVS56AKbs-Lvj/view?usp=drivesdk","description":"Violín 2 - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 1', '[{"url":"https://drive.google.com/file/d/1ZuiPd8HtEU7EdvR7dENfsc1d8slzWqTy/view?usp=drivesdk","description":"Violoncello 1 - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 2', '[{"url":"https://drive.google.com/file/d/11m7cN8b095hDy1zS1HfiqN4IwVydQZ8E/view?usp=drivesdk","description":"Violoncello 2 - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1_4IeZdMdOLUeEpb4nTjx9Qt2L5LSadYh/view?usp=drivesdk","description":"VOZ - Mi Estrella Predilecta - Vasconcellos-Cattani.pdf"}]', false);
  END IF;

  -- El alazán
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1nCsrkUHQrVx3Xl8Nrl_OylsjRt2J8RLh') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('El alazán', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1nCsrkUHQrVx3Xl8Nrl_OylsjRt2J8RLh')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Yupanqui_Atahualpa, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1opSe5oQf4CWUNZ7o3tZzXXmFum7yRwuL/view?usp=drivesdk","description":"Contrabajo - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1odY3prPTezsMFZmO3zEO2a4j83Czv-g9/view?usp=drivesdk","description":"Flauta - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1oWemeokmMjpHyRri0LncAt9sfyF0xpZy/view?usp=drivesdk","description":"Guitarra - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1oLnM3k_XxnlOcOdCCTXDs8fy7QkTbNUO/view?usp=drivesdk","description":"Oboe - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Drum Set', '[{"url":"https://drive.google.com/file/d/1oL3EeruS5HuLGwgAoHCDKi4KMHlskDI9/view?usp=drivesdk","description":"Perc Drum Set - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1oKj5sa9QejMQjnOtNPeTeAjgU855OtKt/view?usp=drivesdk","description":"Piano - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1oK5jarDo4chsV8yZqULF9Kl7DCrE0K3S/view?usp=drivesdk","description":"SCORE - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1oJ3PTFW-G4jiTPhhu-hZFHk03mdZMB9j/view?usp=drivesdk","description":"Trombón - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1nz1q-28nwvkU_E8ZoP2GDuwjZlbkeSIs/view?usp=drivesdk","description":"Viola - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1nweqT7cpnZMqckqPgXTnTH46zpErSGAL/view?usp=drivesdk","description":"Violín 1 - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1nt7LV-jlcQpIcIuF9nlFKSV9gD2y0LIC/view?usp=drivesdk","description":"Violín 2 - El alazán - Yupanqui-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1nyyfA_213aYlxJaM1H4FYdpCgoHTQJDw/view?usp=drivesdk","description":"Violoncello - El alazán - Yupanqui-Lagos.pdf"}]', false);
  END IF;

  -- Cuando tú no estás
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1-8FOq7e-NuL5rJQ2d3n-PCaluqV_kcp9') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Cuando tú no estás', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Key - Str', 'https://drive.google.com/open?id=1-8FOq7e-NuL5rJQ2d3n-PCaluqV_kcp9')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gardel_Carlos, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1-QlnynHfqoDkyUs0HgumsGg4uSgAuRxt/view?usp=drivesdk","description":"Contrabajo - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1-fc8lMCZi8KyKpbSoBANufNd9XIuj_Bk/view?usp=drivesdk","description":"Flauta - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1-h-PV3Uq_atK0f3nl-ltiB0mI1Iy9n2q/view?usp=drivesdk","description":"Oboe - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1-L02aJGGe3IyIxz--QsYyZ7P7qDVYoFq/view?usp=drivesdk","description":"Piano - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1-VPahS0itiXSXveQOUxWbQ2EqYEef4tM/view?usp=drivesdk","description":"SCORE - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1-Z8qodhX_CUXv9jysRLGfnrPNTxJnXLo/view?usp=drivesdk","description":"Trombón - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1-St1SlaMDkLB1q91io9zjq1xxosnMJsS/view?usp=drivesdk","description":"Viola - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1-LVU0Lqf0xVqtOWmLn8AEJucYruhL89Z/view?usp=drivesdk","description":"Violín 1 - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1-bGQfDuyAg2-aOWcPojKRa-XhyWUT2w-/view?usp=drivesdk","description":"Violín 2 - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1-K_j0WDzCU2rInosq1NvO-7TJIVYqmcm/view?usp=drivesdk","description":"Violoncello - Cuando tú no estás - Gardel-Lagos.pdf"}]', false);
  END IF;

  -- Estoy enamorado
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1m3cD0v9xKIqktxbDiIlYcfJHdYp472gs') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Estoy enamorado', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1m3cD0v9xKIqktxbDiIlYcfJHdYp472gs')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Poveda_Donato, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1sADgmCv9EFGnzJKSF_vhyG3RRk8ZOgfN/view?usp=drivesdk","description":"Contrabajo - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1s7TVD6YCPPDFJRtAkTKmcQcje_lxl55H/view?usp=drivesdk","description":"Flauta - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1s5eY2kULVegsMcCrluCPoljYIiLyUCqG/view?usp=drivesdk","description":"Guitarra - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1s4ixvJ6HqwKPTbiYdntH04f_R_x-VPWC/view?usp=drivesdk","description":"Oboe - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Drum Set', '[{"url":"https://drive.google.com/file/d/1s2wRhKuiW5_XVirkWGKq-hcXXQLlnWeJ/view?usp=drivesdk","description":"Perc Drum Set - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1s0d3EeeUryeBkbxQPwwNrzMqhFMObqPv/view?usp=drivesdk","description":"Piano - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1rs0SEytztXY6RNAq5v9ZHv5oDEgil0Vr/view?usp=drivesdk","description":"SCORE - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1rrb-PEM35r1oBbsaMNJkkgYvpkrQbAaD/view?usp=drivesdk","description":"Trombón - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1rqk3Q99Sc-fheguVSB4E1nNN4A3NAvmM/view?usp=drivesdk","description":"Viola - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1rj9O2mdPw31H1TkBi4OccvV0dOVQwmcE/view?usp=drivesdk","description":"Violín 1 - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1retoVPYmJzFlNaNyULXpeYEjWT-hOlJs/view?usp=drivesdk","description":"Violín 2 - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1rkgQFtzmCVPDBmA0e1Gl54ncmdg83gWx/view?usp=drivesdk","description":"Violoncello - Estoy enamorado - Poveda-Lagos.pdf"}]', false);
  END IF;

  -- Corazón Delator, arr. Lagos
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1jlQxswo5ljVNbpXbfD0pjX2dQdvKG0Mf') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Corazón Delator, arr. Lagos', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1jlQxswo5ljVNbpXbfD0pjX2dQdvKG0Mf')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cerati_Gustavo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1kaDbr97MsAiBNo6l2JtK7-GApQuyMBt-/view?usp=drivesdk","description":"Contrabajo - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1k_ZAGF1jQiviL3xJOm1EA2bIFXlSTx9z/view?usp=drivesdk","description":"Flauta - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1kJT6Krh0MbcPki6hp7DKvYJpqoBziCnS/view?usp=drivesdk","description":"Guitarra - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1kGX4QGzbrifxsDGnkzIVLQjRYtvYcWT9/view?usp=drivesdk","description":"Oboe - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Drum Set', '[{"url":"https://drive.google.com/file/d/1kFvZZ2XDky2PwSWlIx7piyYd24DwnjSS/view?usp=drivesdk","description":"Perc Drum Set - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1kEmxMcXhLDVAyuK-xyd9BdYGu7qbivQ5/view?usp=drivesdk","description":"Piano - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1kDe9Gy-MRvHcD3i-mcf4eNDgAvfYTsY_/view?usp=drivesdk","description":"SCORE - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1kB7AyrUVIcZdxrAAzFHYld3WvmhLbxZz/view?usp=drivesdk","description":"Trombón - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1kB312smIig4WszUa8_6xqgDT1-bo6N3e/view?usp=drivesdk","description":"Viola - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1jvNRMY6FIHwPAdo6uNj9SCSwjLCOLcLR/view?usp=drivesdk","description":"Violín 1 - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1jur3bLznmr8qkWyuE438ZaREIZ_zdcBC/view?usp=drivesdk","description":"Violín 2 - Corazón Delator - Cerati-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1k9CKDJAewG3hROi3q1rRNIovNvkQtae1/view?usp=drivesdk","description":"Violoncello - Corazón Delator - Cerati-Lagos.pdf"}]', false);
  END IF;

  -- E strano… ah forse lui… siempre libera. Recitativo y aria de La Traviata
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1yBAzmb5CaZSOVuGshUudeK_2OTm-UIaY') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('E strano… ah forse lui… siempre libera. Recitativo y aria de La Traviata', _p_P_rez_Micaela, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Key - Str + Voz x2', 'https://drive.google.com/open?id=1yBAzmb5CaZSOVuGshUudeK_2OTm-UIaY')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Verdi_Giuseppe, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_P_rez_Micaela, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1ioyjW_WwTxQrdeh96yUs6nHZH8iDQvjj/view?usp=drivesdk","description":"Contrabajo - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1_Lb00zFLiVIH4BNpPuakt5iapJ6D9klk/view?usp=drivesdk","description":"Flauta - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1ao2Bp_Xm2E8zF0a6E3fmfnIqxBkwBXBH/view?usp=drivesdk","description":"Oboe - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1A56Dr8gILCC-FAe68U7TV5nTbCbRod2Z/view?usp=drivesdk","description":"Piano - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1LbshjepIrxZLbgqRvXX96czF4wUcY3SN/view?usp=drivesdk","description":"SCORE - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/153co1SZCQwyVORbNUc9RhY7JP0wBLK5s/view?usp=drivesdk","description":"Trombón - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_zroF3DzJOxgTCFcalSSvSFaCXz5pIp7/view?usp=drivesdk","description":"Viola - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1pbc71WFQiR9u_CSRLxAT9dN3h_cEDsAE/view?usp=drivesdk","description":"Violín 1 - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1fTyCGYqjXT3154P2RlMq44A2pFDD8IR3/view?usp=drivesdk","description":"Violín 2 - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1gPDM2-U3XqEHd3O9P9ec_czBvbXPcneD/view?usp=drivesdk","description":"Violoncello - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ 1', '[{"url":"https://drive.google.com/file/d/1hnweahLfLQ8u57Jvw9BRiGx2dcOpIuyx/view?usp=drivesdk","description":"VOZ 1 - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ 2', '[{"url":"https://drive.google.com/file/d/1vFU9l0tbhoOcl7ZzYDpun1x0YJWDdo3Z/view?usp=drivesdk","description":"VOZ 2 - E Strano… ah forse lui… siempre libera - Verdi-Pérez,M.pdf"}]', false);
  END IF;

  -- Maybe This Time
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=10M0l8S3aXdPlObqZCudoDEy3IEvmJQ4C') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Maybe This Time', _p_Cattani_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=10M0l8S3aXdPlObqZCudoDEy3IEvmJQ4C')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Kander_John, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cattani_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1_1W09KhRXX3Ex6hpjC3V_ka05fcYYz7S/view?usp=drivesdk","description":"Contrabajo - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Wk1y39Yqey7TjHj3wBUbq6_5eFS1h-2Q/view?usp=drivesdk","description":"Flauta - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guit Eléct', '[{"url":"https://drive.google.com/file/d/1Qs_q5OWucTVEVnvnQaqbAupAACafe7oH/view?usp=drivesdk","description":"Guit Eléct - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/15_YNGw4VH-RcVb04NYIPr_xSPVS0jrrp/view?usp=drivesdk","description":"Oboe - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1upBOjXSt_2ktp1WfcSdPop8bVgsR5sTT/view?usp=drivesdk","description":"Perc Batería - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1eNC85s6rlB6vN-SL1qGCUDlAUskaHlel/view?usp=drivesdk","description":"Piano - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/10_K6XaOFl0m5g_4Ws0tpZR6VNqUdUK_l/view?usp=drivesdk","description":"SCORE - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1x7r_EN1f4Xhn3aWa_qK2gEbDFVTYUxus/view?usp=drivesdk","description":"Trombón - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/1jQfS1ExrBK-4sP6kDGzQYxTJ7CjeBvE1/view?usp=drivesdk","description":"Viola 1 - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 2', '[{"url":"https://drive.google.com/file/d/1boV8vfOO68c1fUZC-H_MLid0J_nOc_9D/view?usp=drivesdk","description":"Viola 2 - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1QaOVSpFwBKmuabbrkQ52S5IQRv1huYL9/view?usp=drivesdk","description":"Violín 1 - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1IXqOIAoFRD03nD8HJlKDuDShcYV1Vqkk/view?usp=drivesdk","description":"Violín 2 - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 1', '[{"url":"https://drive.google.com/file/d/13tw2qSS3wABgQCjIqQ1mj7kWXS7QLqNw/view?usp=drivesdk","description":"Violoncello 1 - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 2', '[{"url":"https://drive.google.com/file/d/1z-S_P3pRaHCJFhz87Svnt2pdvrO703Ja/view?usp=drivesdk","description":"Violoncello 2 - Maybe This Time - Kander-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1Vd4pmlC0UfxcpesN6KSUzfxBgMabvoMc/view?usp=drivesdk","description":"VOZ - Maybe This Time - Kander-Cattani.pdf"}]', false);
  END IF;

  -- Donne mie, la fate a tanti. Aria de Guglielmo de Così fan tutte
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1t8nEX4xSpem-mp45NW1AJOWtGGnd7QcT') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Donne mie, la fate a tanti. Aria de Guglielmo de Così fan tutte', _p_Cattani_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', 'Key - Str + Voz', 'https://drive.google.com/open?id=1t8nEX4xSpem-mp45NW1AJOWtGGnd7QcT')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Mozart_Wolfgang_Amadeus, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cattani_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1lip-Ugo-pP6g30RhTkg5y2cm5OhuppKt/view?usp=drivesdk","description":"Contrabajo - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/18ZpmBLRzi8qKx8MMAhPfJnIoQJ2kaq_d/view?usp=drivesdk","description":"Piano - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11qHC1AXOy1ozhWSRD6IhYvCC_ZGD86gJ/view?usp=drivesdk","description":"SCORE - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/14csahIHS3-zoXI0qa7QVBP9Io5fE8knh/view?usp=drivesdk","description":"Viola 1 - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 2', '[{"url":"https://drive.google.com/file/d/1M7g8ocLyhchOiru8_nVrI1HeMKc__0J7/view?usp=drivesdk","description":"Viola 2 - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/15YkwCOeZ5qQSoBdj-OxZqY40B1Fd4PxY/view?usp=drivesdk","description":"Violín 1 - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1byyE5CBNSiBDIsQCFfir5Q5D9EOeJ8ET/view?usp=drivesdk","description":"Violín 2 - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 1', '[{"url":"https://drive.google.com/file/d/1jfpUFbenpG5pn4AIHNwDbeGYJJzel5xp/view?usp=drivesdk","description":"Violoncello 1 - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 2', '[{"url":"https://drive.google.com/file/d/1hIU170yJQHETAhOBC6lwNFh5ahPn8bvr/view?usp=drivesdk","description":"Violoncello 2 - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1RQMMImgskO9xHTituPGx_9sBdbAHves4/view?usp=drivesdk","description":"VOZ - Donne Mie, La Fate a Tanti - Mozart-Cattani.pdf"}]', false);
  END IF;

  -- Azul
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1-iDYqYj_R1VIrEdcCxyTvtOMRTVqGOoN') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Azul', _p_P_rez_Micaela, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.1.0.0 - 0.0.1.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1-iDYqYj_R1VIrEdcCxyTvtOMRTVqGOoN')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cuervo_Iara, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_P_rez_Micaela, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1TF63verFlOCpcHRBn4rV8rmbahonCtTm/view?usp=drivesdk","description":"Contrabajo - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1VfPviH9bkNgOpQryeNQ6eiRm9Sl_bkja/view?usp=drivesdk","description":"Flauta - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1LEcJxTgBu7kShonr-GJixVjXjWr3iT6C/view?usp=drivesdk","description":"Guitarra - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1d4a3JRGzobGyLyWXCwwO2vbrUrlsaYjj/view?usp=drivesdk","description":"Oboe - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1_qwJVi68Uo9apMMffqa5el5KL961cSPm/view?usp=drivesdk","description":"Perc Batería - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1XM9owaM9uFwLVhWSaj_mWqWuhiG7Z0v5/view?usp=drivesdk","description":"Piano - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1TY1OhWM11fSr8OEhaBfo1iXJziUrfPBj/view?usp=drivesdk","description":"SCORE - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/13SktN7bXpN-tftifOMGxMpeZoo305nu5/view?usp=drivesdk","description":"Trombón - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1tXx_pDviVboxrgRlOz00FyOiOzrGGhxv/view?usp=drivesdk","description":"Viola - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín', '[{"url":"https://drive.google.com/file/d/1v2nxu98U3dahUp4iQ5LAmXY5x1EpT-Mb/view?usp=drivesdk","description":"Violín - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1MlQP7ua8t7JYbVbA8TKGsZfjaSJfKEi_/view?usp=drivesdk","description":"Violoncello - Azul - Cuervo-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1mE_732f-a8C7VFZ5LeFG_BON4UiXpbE5/view?usp=drivesdk","description":"VOZ - Azul - Cuervo-Pérez,M.pdf"}]', false);
  END IF;

  -- Ave
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1fLWBAeE1ylQQ8ph3F9bOI3S_f_8B-fNa') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Ave', _p_Lema_Germ_n, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', 'Perc - Str + Bandoneón', 'https://drive.google.com/open?id=1fLWBAeE1ylQQ8ph3F9bOI3S_f_8B-fNa')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p__lvarez_Bel_n, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lema_Germ_n, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '22b', 'Bandoneón', '[{"url":"https://drive.google.com/file/d/1gis5ir4GM78e6wKVUEE-DgDTrF0xZsiT/view?usp=drivesdk","description":"Bandoneón - Ave - Álvarez-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1h0pzeLZugrWJspDGQrj3DW9M2v-h21zb/view?usp=drivesdk","description":"Contrabajo - Ave - Álvarez-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión', '[{"url":"https://drive.google.com/file/d/1h0jIbfo_X88DWbQgTMSLCQTG9jRdG8Ig/view?usp=drivesdk","description":"Percusión - Ave - Álvarez-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1gppe-0FrhvvwQtsOSZ-01CRvKnvDN5Ut/view?usp=drivesdk","description":"SCORE - Ave - Álvarez-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1gkL_JiPrO5JSFbpenoSIizQit2-O20VV/view?usp=drivesdk","description":"Viola - Ave - Álvarez-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1gcDRV6TZV_HBSbjhTK1jcEZ0IiXiEEzd/view?usp=drivesdk","description":"Violín 1 - Ave - Álvarez-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1gaVHDHpVPn8kYRTRGKMV1DtQ6SB1Ncag/view?usp=drivesdk","description":"Violín 2 - Ave - Álvarez-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1h0wFXGmB_p3jJEVGZMoaqbNzUAWKdOkB/view?usp=drivesdk","description":"Violoncello - Ave - Álvarez-Lema.pdf"}]', false);
  END IF;

  -- Bésame mucho, arr. Cuerdas+Pn+Timb+Perc
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=10mySuKlnXPYPyQBZr01s8aB9GozAd_Dh') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Bésame mucho, arr. Cuerdas+Pn+Timb+Perc', NULL, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', 'Timp.+1 - Key - Str', 'https://drive.google.com/open?id=10mySuKlnXPYPyQBZr01s8aB9GozAd_Dh')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Vel_zquez_Consuelito, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/12tOH1qqRww6VtcRFZFrCRo7OJKRUwMEH/view?usp=drivesdk","description":"Contrabajo - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bat', '[{"url":"https://drive.google.com/file/d/124_7-MhpX94eygX7NwHxuysxHyBCDGJc/view?usp=drivesdk","description":"Perc Bat - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc - Velázquez, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/13D2m4lKaRWueOwb8bOU4wQUmrhqntJKN/view?usp=drivesdk","description":"Perc Timbales - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/13K67AjnhAcD_esh4Y9lwKay-zTgR0Z1S/view?usp=drivesdk","description":"Piano - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/12u9ps4zK8duDAOa2_3JvN4q_WcZNI0IB/view?usp=drivesdk","description":"SCORE - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/13GBg2cWXuPsgREahyHZwuEbjDlxWQdeN/view?usp=drivesdk","description":"Viola - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/148Eb7JIPlB1W-fthQVK2XeuGAhxk2Il4/view?usp=drivesdk","description":"Violín 1 - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/13GvUSg-Kgsusg4MwKgHrZGCYwaKwkcac/view?usp=drivesdk","description":"Violín 2 - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/13A0QzekvSlLVweYaYx-OTsQofJbqFcvz/view?usp=drivesdk","description":"Violoncello - Bésame mucho, arr. Cuerdas+Pn+Timb+Perc.pdf"}]', false);
  END IF;

  -- A su merced, Don José
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=10oaquFRqgSm3LCUS-Hr9FIs3NcLwk6FD') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('A su merced, Don José', NULL, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', 'Str', 'https://drive.google.com/open?id=10oaquFRqgSm3LCUS-Hr9FIs3NcLwk6FD')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Donjuan_Nubia_Jaime, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/12TL9N-RmsT_ZAXXiZMNxMZCA9XqO3xms/view?usp=drivesdk","description":"Contrabajo - A su merced, Don José - Donjuan, N.J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11s8Bg9iwP1YyipUsiHckX5AXb9KCVUDZ/view?usp=drivesdk","description":"SCORE - A su merced, Don José - Donjuan, N.J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/11UtUtJK1hJmtL16qkXB02M7MV7QmbNTm/view?usp=drivesdk","description":"Viola - A su merced, Don José - Donjuan, N.J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/110VyK38bTFfSaISjlDZ6AXs93FHVJ01N/view?usp=drivesdk","description":"Violín 1 - A su merced, Don José - Donjuan, N.J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/11aq0Uhz-XEtfOr1HbnC8JdfeV7N-q6AM/view?usp=drivesdk","description":"Violín 2 - A su merced, Don José - Donjuan, N.J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/11UzPssvXyevpGIk5odSMxK2tX6noBV73/view?usp=drivesdk","description":"Violoncello - A su merced, Don José - Donjuan, N.J.pdf"}]', false);
  END IF;

  -- Dream On, arr. Perea da Silva
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1n8TwUm1glcppnNpPHXRckZCbGNS9mW3c') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Dream On, arr. Perea da Silva', _p_Perea_da_Silva_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1n8TwUm1glcppnNpPHXRckZCbGNS9mW3c')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Tyler_Steven, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Perea_da_Silva_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1pYo1iNuwXooK6OKWeduB2nj6vY8FL5Wg/view?usp=drivesdk","description":"Contrabajo - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1pUfEPgbuqtmLfUsmunK9cedTxYkX7jLB/view?usp=drivesdk","description":"Corno F - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1pUeVl2AZNY8WMzYq4Sy6SwafjdSzm_SZ/view?usp=drivesdk","description":"Fagot - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1pTc6oMmt92cRIJud-t2JDAArTtfJ9Ahx/view?usp=drivesdk","description":"Flauta - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1pRZeK-3l1jMgNYSXWnfhebY9YrTO62gk/view?usp=drivesdk","description":"Guitarra - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Drum Set', '[{"url":"https://drive.google.com/file/d/1pPz7T3jzlKq5hVhn-j-2yAeYpW8_FW2v/view?usp=drivesdk","description":"Perc Drum Set - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1pNzJfXSXyfvOryzPwZPFl6GYN4YwhDkX/view?usp=drivesdk","description":"Piano - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1pIgu3T2Geqxvx5J4JsdqJFW3iWYkBLlk/view?usp=drivesdk","description":"SCORE - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1pAcOwW6f46wf66u5BXzuuxAzCgMZzC8P/view?usp=drivesdk","description":"Trompeta Bb - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1p6qx7iuHhqv-UgOmhE4FqjcV6TGn2KQ2/view?usp=drivesdk","description":"Viola - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ozcwGFD-_TFwIvuj90QYuxIHuJjc5RFX/view?usp=drivesdk","description":"Violín 1 - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1oyXK3zbRHhzDWhL3-54jagHFYXoqpkLN/view?usp=drivesdk","description":"Violín 2 - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1p6APr0Bw7esvDCFUNThUS5_EYROTSXS-/view?usp=drivesdk","description":"Violoncello - Dream On - Tyler,S-Perea da Silva.pdf"}]', false);
  END IF;

  -- Libertad
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1y9P3QjDv0Fx686TIQqReGCZtIZbmnDDw') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Libertad', _p_P_rez_Micaela, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1y9P3QjDv0Fx686TIQqReGCZtIZbmnDDw')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gonz_lez_David_Ignacio, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_P_rez_Micaela, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1K6SEBtDvAxh9bk7GZ9yWUzvE3MxVBg9b/view?usp=drivesdk","description":"Contrabajo - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1IwovyA_eQu9JsluRTnr0e4Ke3RXr78Ew/view?usp=drivesdk","description":"Corno F - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/17ZuEhyMcF-ihKiqRqlmwvDlFjMakOTNr/view?usp=drivesdk","description":"Fagot - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1EQRppYQOyDrhIZVkvRhFLFrKk_asQmED/view?usp=drivesdk","description":"Flauta - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/178PfeQAeyDd67mJYH-i81PXJ8nHjiXv4/view?usp=drivesdk","description":"Guitarra - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1agjF5y242Ewy4u-HJi2xCiGIz6d86X0P/view?usp=drivesdk","description":"Perc Batería - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1lFLy19cSH4dVE12gL9uNgY7jd24Xk4Sy/view?usp=drivesdk","description":"Piano - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1yoLGnikhZWrIFKVqmCie54PW_BTj_SRf/view?usp=drivesdk","description":"SCORE - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1wyZHB07rZ_8oBsJwuni5wYktVpwmY4rU/view?usp=drivesdk","description":"Trompeta Bb - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1nQOWszbqgAYb5bmIkytc7gt64qFkM6qK/view?usp=drivesdk","description":"Viola - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1WopViUxpzY6VlB8g2naUNasw851go7Tj/view?usp=drivesdk","description":"Violín 1 - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1EYpXe_GC4vltzEknWi-ZzjdUsoFrvmmo/view?usp=drivesdk","description":"Violín 2 - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1PLyKLGPtlaK7vy1ZXRuYYxNhVw1eFG_E/view?usp=drivesdk","description":"Violoncello - Libertad - González,DI-Pérez,M.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/15dYLVw1i0ZMkQb_DMaZLjrCK2rE4FTFQ/view?usp=drivesdk","description":"VOZ - Libertad - González,DI-Pérez,M.pdf"}]', false);
  END IF;

  -- Querencia de mi sentir
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1XKECoAiOqR5Ii6FP_pGLdiI59fitL2L2') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Querencia de mi sentir', _p_Napolitano_F_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1XKECoAiOqR5Ii6FP_pGLdiI59fitL2L2')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Carabajal_Demi, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Napolitano_F_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Zf43uuBhoP45wkRHKPyOe6LU8nLc-0De/view?usp=drivesdk","description":"Contrabajo - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1w7iHjY0Cd_k6A6fDfhusxOZWZBVoyuVe/view?usp=drivesdk","description":"Corno F - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1gW-aQiY6tNBUZkSKL089QOdc_fJnyDih/view?usp=drivesdk","description":"Fagot - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1eVUdmQAndsHSrr92XOygWh7uQDbl3eCR/view?usp=drivesdk","description":"Flauta - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1gINAy9Fw1x4OMJDnh-Ss_zxnKVDyOGay/view?usp=drivesdk","description":"Guitarra - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1kqp6FK6uUqGr0O0xGUkPmIoxerxo84R_/view?usp=drivesdk","description":"Perc Batería - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1UMVvItrGTMAr93cQZCxujJzg7FVeFNwP/view?usp=drivesdk","description":"Piano - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/18V4jLkP3-ragHmzwhythfAW8yyMT-cuj/view?usp=drivesdk","description":"SCORE - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/11FNIids3QFuVgenSihp47zxhFDO6Uulo/view?usp=drivesdk","description":"Trompeta Bb - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1u2xNlj6SM-sPH4rlzCb7rFGuHrrM7mw5/view?usp=drivesdk","description":"Viola - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/19GOpB1xm30dKTLI4p9IRD3tiBS2441Kb/view?usp=drivesdk","description":"Violín 1 - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ea8_-DwBUQa6xSjiS8AYpYHRx-NPwn6w/view?usp=drivesdk","description":"Violín 2 - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/13Q5aIhM2dRWNMzFCEC0MvjPCWF-siaWZ/view?usp=drivesdk","description":"Violoncello - Querencia de mi sentir - Carabajal,D-Napolitano,F.pdf"}]', false);
  END IF;

  -- Amarilli, mia bella
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1ZAvQpjYjPl_FMfEvxCaL39RZ9nxEhd8Y') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Amarilli, mia bella', _p_Cattani_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Key - Str + Voz', 'https://drive.google.com/open?id=1ZAvQpjYjPl_FMfEvxCaL39RZ9nxEhd8Y')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Caccini_Giulio, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cattani_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1GU7tOHCGRD2ajLr_fPY3OcaKw_cS3y2f/view?usp=drivesdk","description":"Contrabajo - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno Francés', '[{"url":"https://drive.google.com/file/d/1fRrdVES6M-7RFMCXevIppo62RGek77L8/view?usp=drivesdk","description":"Corno Francés - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1T7nG9SkXvUbhZzDZeU09_bNb49R9w30D/view?usp=drivesdk","description":"Fagot - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1SQ_3vRw4Lkv3dhuAlmzxYj9lJNs_vVps/view?usp=drivesdk","description":"Flauta - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1Cmp9pCzLD9DVC67zGHRjnhTqmraxWgTU/view?usp=drivesdk","description":"Piano - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/13z1ECcNHKeAc7PirI30Q31dkIHpLpdEG/view?usp=drivesdk","description":"SCORE - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1Q6eENtmqtSPYebH_6fLVdVvCAuGtroyp/view?usp=drivesdk","description":"Trompeta - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/1sNF9X6QPVTmIHB0-G4tSKDBKEYDVTYnx/view?usp=drivesdk","description":"Viola 1 - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 2', '[{"url":"https://drive.google.com/file/d/1h8ZCnunp7Piv_-wCMCQYIfOShbyx1lm5/view?usp=drivesdk","description":"Viola 2 - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1RryK4ZZFuUsuInoXnn4UJYzt5NX4s34A/view?usp=drivesdk","description":"Violín 1 - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1E1Jz95reLjG1D8dMo5PLStAH0EapKqvh/view?usp=drivesdk","description":"Violín 2 - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 1', '[{"url":"https://drive.google.com/file/d/1DXTMoIRHuukxgHd380MZseV51HHu3VPU/view?usp=drivesdk","description":"Violoncello 1 - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 2', '[{"url":"https://drive.google.com/file/d/1WPi-3pwnAi6uN3UI-g5yy-f8nWSkugj2/view?usp=drivesdk","description":"Violoncello 2 - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1EWGkId0jZi4Hb67z7jT25foVJxti27wm/view?usp=drivesdk","description":"VOZ - Amarilli, Mia Bella - Caccini-Cattani.pdf"}]', false);
  END IF;

  -- Corazón Delator, arr. Robledo
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1xaAEjHAcLoIrbttMWajLHUTqHDuQuNhz') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Corazón Delator, arr. Robledo', _p_Robledo_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1xaAEjHAcLoIrbttMWajLHUTqHDuQuNhz')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Cerati_Gustavo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Robledo_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1f9f-GxxRBYhLpKck8fbEb_BNHZUUY9WM/view?usp=drivesdk","description":"Contrabajo - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1oUbPu5vjBzdyRg-lNbiFMqa9Chww9dvh/view?usp=drivesdk","description":"Corno F - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1XueCsbRLgzDc0oBYWFzgDNCSWkYKIF5L/view?usp=drivesdk","description":"Fagot - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1FzUGEItNN3e_X3vYIoWMQcuTNSR6D2tO/view?usp=drivesdk","description":"Flauta - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1VUrbvg31PAberpXqY8yAeWmsQKpaZPix/view?usp=drivesdk","description":"Guitarra - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/1-hk6sxTXyo9OoX1Ro-Pa2ByHpOH3N44c/view?usp=drivesdk","description":"Perc - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1qdjg_8GNJ4hjiHi9caS7vX8Xk_3DcXcC/view?usp=drivesdk","description":"Piano - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1tJG6Jkoe0NwQY4Y5gPcOoG6Q7T5TgwMx/view?usp=drivesdk","description":"SCORE - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1v7gnDYGX9mtuppaGG-EB5004YCa4vzpY/view?usp=drivesdk","description":"Trompeta Bb - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/140JscSHt1NnbPkD7t9xFw9dspd0FqMGd/view?usp=drivesdk","description":"Viola - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1MtJw-m9-FB99YGOGSzZ22BJDm8UWvRQI/view?usp=drivesdk","description":"Violín 1 - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/17OYXYsp6wCAt9okylEYJkrFjYaCq7KUm/view?usp=drivesdk","description":"Violín 2 - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/18_M5o-tfMazQ94emCN4X2cypAju9D9ee/view?usp=drivesdk","description":"Violoncello - Corazón Delator - Cerati-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1aOMkbbG3bScitPH1h0opcsw1neFQ5hXV/view?usp=drivesdk","description":"VOZ - Corazón Delator - Cerati-Robledo.pdf"}]', false);
  END IF;

  -- Cuento de Hadas
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1xcbFeHcW-_vyawi5iFbH1YltoOnVYtgP') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Cuento de Hadas', _p_Robledo_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1xcbFeHcW-_vyawi5iFbH1YltoOnVYtgP')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Impensa2_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Robledo_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1tXEAvndV_BCEmQnDsOmNVVPymAHD0oXz/view?usp=drivesdk","description":"Contrabajo - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1zwwLFs38to9oZ2aEpaGq5TTf4TOjAwyx/view?usp=drivesdk","description":"Corno F - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1EN6Y8phlaHqSoIG9qEBQdSUKvcC24GuH/view?usp=drivesdk","description":"Fagot - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1NvTqtizQOboSOyp2zAwM8fpYbyg1FCh7/view?usp=drivesdk","description":"Flauta - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1kNIrL9jCxevLwgJkZGeckDEj51Gy1a6Q/view?usp=drivesdk","description":"Guitarra - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/1j7Ol1eq1EYCXyoejbzIQWRu5Bt3T8PPW/view?usp=drivesdk","description":"Perc - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1uzbUbatxQuTHbGYI-cyK5K19sR5aG6fG/view?usp=drivesdk","description":"Piano - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Lt79Ba0q22jiNIa1e5yxneC7-LL23P6r/view?usp=drivesdk","description":"SCORE - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1Z2dkee4PZL0FpLZMdyrpC_I5ZR1F6kP-/view?usp=drivesdk","description":"Trompeta Bb - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1icSpikOHqUnAue445LmJgTePdatic2Od/view?usp=drivesdk","description":"Viola - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/10C-wazVmL2ufEWXz_Di0_LtWcdipaVEn/view?usp=drivesdk","description":"Violín 1 - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1rHSQek08mzWsEK6yJFi2H-VOYBmlfk9x/view?usp=drivesdk","description":"Violín 2 - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1RAzPrpS2fKBfS-oQnsJtg8QJ8admStJO/view?usp=drivesdk","description":"Violoncello - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1KWjvxgFU1nr5rzjH4ZMI3DJc5yVTP3Li/view?usp=drivesdk","description":"VOZ - Cuento de Hadas - Impensa2-Robledo.pdf"}]', false);
  END IF;

  -- Llorar
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1zGuODGG5hhpf1_ou35EJH1S1ElP-ddAw') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Llorar', _p_Napolitano_F_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1zGuODGG5hhpf1_ou35EJH1S1ElP-ddAw')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Jesse_y_Joy_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Napolitano_F_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1AfF58spe16fmf7EL0Q2u89KD56w5id6-/view?usp=drivesdk","description":"Contrabajo - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1aU2ZuvHo04yQIEjD8iff5XWugvGo3TDu/view?usp=drivesdk","description":"Corno F - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1uPQ5GSoIFA7pynru8Zwnsn7Imc2tnHqC/view?usp=drivesdk","description":"Fagot - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1ieSXNKbemgFu7B4a57Tp9eS9IdkDLLAS/view?usp=drivesdk","description":"Flauta - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1_qzAz3i7AA7ot1sqxmkOdtg5zZpamId8/view?usp=drivesdk","description":"Guitarra - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1MY5Ll-ypP0MG4CnhNcfrQFVQHGn0X04l/view?usp=drivesdk","description":"Perc Batería - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1CSbMwJVT82UjDl9pEj4UM5joDU1zG03r/view?usp=drivesdk","description":"Piano - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/198JP4Grssv2r6aOWHCztfhOrD6TxgOtv/view?usp=drivesdk","description":"SCORE - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1zOjHmW4elSxvVDGHT87H8-1NOUF4AmpV/view?usp=drivesdk","description":"Trompeta Bb - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1kvgu05p5fpWv9PBMge0TPAj0Sr4nYIeQ/view?usp=drivesdk","description":"Viola - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1lGoOvCKbLEhi-mHjzepulwsGKObKGbk1/view?usp=drivesdk","description":"Violín 1 - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1VHHxOR2ldCUKcYUuW8JVQnyscnw7bJPI/view?usp=drivesdk","description":"Violín 2 - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/14m7cI0_Ueb3zRH_Up6OCR68aruM9dRTf/view?usp=drivesdk","description":"Violoncello - Llorar - Jesse y Joy-Napolitano,F.pdf"}]', false);
  END IF;

  -- Así fue, arr. Lagos
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1jjCuzs4Z8BQgH1lIXPboFRjk-kOpBpoO') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Así fue, arr. Lagos', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1jjCuzs4Z8BQgH1lIXPboFRjk-kOpBpoO')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gabriel_Juan, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1kwmX_L_H2Ota_M4uirC4mS4xLC1-KPJS/view?usp=drivesdk","description":"Contrabajo - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1n3TDRch9FiV9DMT0NnwA7QIpsY2coiDk/view?usp=drivesdk","description":"Corno F - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1n-HIRr38I7m_S5cBbI0GtiCuCUpZ8qIZ/view?usp=drivesdk","description":"Fagot - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1myVy2mwYa5ZcNpBdGUJHMpb7MMRLGteK/view?usp=drivesdk","description":"Flauta - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1mtJZ8SlOYCCP8zEfVgpz94ryr12JEXjt/view?usp=drivesdk","description":"Guitarra - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión', '[{"url":"https://drive.google.com/file/d/1mmHDxcoia8lGnfmlVjsHXvAwpXCuSSy0/view?usp=drivesdk","description":"Percusión - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1mi_SaR8x4Y0Y4tuXt62nCkIknNa6lOsf/view?usp=drivesdk","description":"Piano - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1mey191MGBucPVOW-pefrNwySWtNKOfvP/view?usp=drivesdk","description":"SCORE - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1mcaG1EKayiaIvJL1i7kDXF_h18bQiVaE/view?usp=drivesdk","description":"Trompeta Bb - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1mcIohy2GeyaDHjYjVDXyQV1Bd2zBGEMP/view?usp=drivesdk","description":"Viola - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1mF_MgCyY-BKGEE8EgFpcz0zZKLFPWZT8/view?usp=drivesdk","description":"Violín 1 - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1mDHM_YNyby4N_RwceLbwcQw-cSBDp76q/view?usp=drivesdk","description":"Violín 2 - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1mOIxUvNzmXuZIXnRwersFAm2IQI-sgaN/view?usp=drivesdk","description":"Violoncello - Así fue - Juan Gabriel-Lagos.pdf"}]', false);
  END IF;

  -- Sin tu latido
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1-TGw7pOCSzMf0t4Heg6CU_iHVpKsE4Un') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Sin tu latido', _p_Napolitano_F_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1-TGw7pOCSzMf0t4Heg6CU_iHVpKsE4Un')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Aute_Luis_Eduardo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Napolitano_F_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1pjneoN8yexyezEuew6LpZMX4Ld_zpiII/view?usp=drivesdk","description":"Contrabajo - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1QUndR9tVDGuFbDDD4bzYtn1DgGDj9CSt/view?usp=drivesdk","description":"Corno F - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1-PZH7jYnBwNnuf_Qak1DIRSHbyJzI5LK/view?usp=drivesdk","description":"Fagot - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1AWphCkzQ4Yi-vOeyZMSD0keUO08fuFA-/view?usp=drivesdk","description":"Flauta - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1ZEVWyO7ug-pwrURCrQkrXVE9XnEsuQpJ/view?usp=drivesdk","description":"Guitarra - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1djWh0WMUKLVrSvCAC0T-OFLX7oii-hTW/view?usp=drivesdk","description":"Perc Batería - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1BbkDPZozeqW5eW2_jYhlkujeAQdTcCq0/view?usp=drivesdk","description":"Piano - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1eoJspm1-qX-UCuBTqEoVnJRf_PYHCpzN/view?usp=drivesdk","description":"SCORE - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1Ig7OUlDklAQ08JlgPvIUDY5DOyZspvuX/view?usp=drivesdk","description":"Trompeta Bb - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1JoamSSo2XTxswGLbV9-pBB_DiN1baF-2/view?usp=drivesdk","description":"Viola - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1v-mPZO-4GDpE7YfSDGfX3UxlTF1pYC6t/view?usp=drivesdk","description":"Violín 1 - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/14_xKeGyZOPI5aao3r_qqt2RVZlI-AL7X/view?usp=drivesdk","description":"Violín 2 - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1MvchdYMqpl433gvv45ztF2nGnplhc3hc/view?usp=drivesdk","description":"Violoncello - Sin tu latido - Aute-Napolitano,F.pdf"}]', false);
  END IF;

  -- Corazón Malherido
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1-kJp3erPiqu6i_Rqfgy1dj2Oj34nVoUD') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Corazón Malherido', _p_Gonz_lez_D_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1-kJp3erPiqu6i_Rqfgy1dj2Oj34nVoUD')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gonz_lez_Luna_Morena, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gonz_lez_D_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1lUcWttNjb0HOoP6BFnycQLKQm_AnA34F/view?usp=drivesdk","description":"Contrabajo - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1PcuPigjzL2UuKasZr7h7Ea_kUstz4Mef/view?usp=drivesdk","description":"Corno F - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1qq_HLsiR5V79F3SZhYUUYHqHGA3U1cnr/view?usp=drivesdk","description":"Fagot - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/15HmXdy4QYpMYg_V31qlQUHfkQedysxvG/view?usp=drivesdk","description":"Flauta - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1khyfekY3el4OPcdUXlelXezT4g71hZQV/view?usp=drivesdk","description":"Guitarra - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1quHEq3Xb97In0vXyJN9yWG_3GMNVxqLU/view?usp=drivesdk","description":"Perc Batería - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1Fd4aoc-4hkwLAnztSPiGX9yIV_vPaqCr/view?usp=drivesdk","description":"Piano - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1cawrubLthjm0XrgoZXIhKcmChEGW12ew/view?usp=drivesdk","description":"Trompeta Bb - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Z6xagMMPvPDy6_dLa-kfo-zwjbI6wubt/view?usp=drivesdk","description":"Viola - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1W1LAxjDatsKQ49oPjd209YG4UeK6ckff/view?usp=drivesdk","description":"Violín 1 - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Y5HBidJuqOGaVEE2s_yCFHtDwKw-ohbl/view?usp=drivesdk","description":"Violín 2 - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1OsLEyqgnHJsHcHgA1NMOwN8ZwxQvm6lo/view?usp=drivesdk","description":"Violoncello - Corazón Malherido - González,LM-González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1xN7ImsKxYt9jP8pj-mZd6HxrNtPvNSd3/view?usp=drivesdk","description":"VOZ - Corazón Malherido - González,LM-González,D.pdf"}]', false);
  END IF;

  -- Nuestra canción
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1jkn6znyJ6_gZhmtZxik8pPVZekdc9eNd') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Nuestra canción', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1jkn6znyJ6_gZhmtZxik8pPVZekdc9eNd')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Monsieur_Perin_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1joASlgQEJa23u6bgPhWUl0mlUbGAhhia/view?usp=drivesdk","description":"Contrabajo - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1jn4cCMPsVIPLZU2EMGMMvAJr6GZ3oBK0/view?usp=drivesdk","description":"Corno F - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1lyUTuf-PjAcZvzOI8_BcNdc04RELDgmL/view?usp=drivesdk","description":"Fagot - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1lxEZenT1Nj-tkndDtBSqm-6cJzlOPH0Y/view?usp=drivesdk","description":"Flauta - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1lsDnCHjiFt4pprQ75PPLVQf7QmcZeFMb/view?usp=drivesdk","description":"Guitarra - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/1lV_tzdC1EoEMwW_HjBJlK2m61nfH7dle/view?usp=drivesdk","description":"Perc - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1lS4FSlMPVLprcNIje89iNgU9n4NjPA5m/view?usp=drivesdk","description":"Piano - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1lQp0bcj5oHy0R94vGokBGelD872wMNHj/view?usp=drivesdk","description":"SCORE - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1lJHDeG5fLs8y5eyjDTTizzHif98KMsj1/view?usp=drivesdk","description":"Trompeta Bb - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1lHKYqR2uJBnYjml-GhfI8eTXLmiJjniP/view?usp=drivesdk","description":"Viola - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1l3kT0ynlicj6uCZKvK3zbu4pA3UkGrkd/view?usp=drivesdk","description":"Violín 1 - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1l29TrAdIL6ct1TLCMYNRny-qtK_l6L7W/view?usp=drivesdk","description":"Violín 2 - Nuestra Canción - García, V-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1lExxA6QbQx0CYxqi3Uh6eAJRn65MSRhw/view?usp=drivesdk","description":"Violoncello - Nuestra Canción - García, V-Lagos.pdf"}]', false);
  END IF;

  -- El conventillo
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1Y16agUCiW87AtnwnlxUPEq_CM4-JSr_X') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('El conventillo', _p_Gonz_lez_D_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=1Y16agUCiW87AtnwnlxUPEq_CM4-JSr_X')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Baffa_Ernesto, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Rol_n_Fernando, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Gonz_lez_D_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Pae19aI6a4rwGmsesfRs-qu9TQSZte-Z/view?usp=drivesdk","description":"Contrabajo - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1XbC9ipes2dFXv_mVIftz0i8tfrCxC4be/view?usp=drivesdk","description":"Corno F - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1XDwRZ0Y8whrjXtgbJhtrYVkHsBfUvGqz/view?usp=drivesdk","description":"Fagot - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1-tHtsmLWGodsLaOnuRPpLYs_aPfri_A_/view?usp=drivesdk","description":"Flauta - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1_mre5rrHuwYwjX5oAK7og5e7P0SE7N0M/view?usp=drivesdk","description":"Guitarra - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1hr8XAonvrbJO_CSoPwcIHL1rGDhqD5BU/view?usp=drivesdk","description":"Perc Batería - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1VlW4Py-aU1SeRoXNwONnZ3QfWLqls0KF/view?usp=drivesdk","description":"Piano - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1l0e97RXAZ5-clR2gV3dQTLmJRHJLwfGg/view?usp=drivesdk","description":"SCORE - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1epXrcbJMsqLSWchpTAQbREx0YxVjX-tq/view?usp=drivesdk","description":"Trompeta Bb - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1-RayPSvhLFri7TxMqqEAbGO4w2V0DALB/view?usp=drivesdk","description":"Viola - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1pqIc2u61C6VR85fvM94aUnaSj3eVolN5/view?usp=drivesdk","description":"Violín 1 - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1CHi7Jkb7DK5YFe8lyvi-f1fER-pY2i1p/view?usp=drivesdk","description":"Violín 2 - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1p4ikimZGIaj4DcC5gPF4tSQNfWP9t9C8/view?usp=drivesdk","description":"Violoncello - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1Cx5jZA2bEwuJRu8AWr0JBexK_D7DDvhA/view?usp=drivesdk","description":"VOZ - El conventillo - Baffa-Rolón—González,D.pdf"}]', false);
  END IF;

  -- Dejame estar
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=19bsi7L09wyKQODVZtscw2NsbJqYLLLNB') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Dejame estar', _p_San_Carlos_David, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra, Voz', 'https://drive.google.com/open?id=19bsi7L09wyKQODVZtscw2NsbJqYLLLNB')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Valles_Oscar_Cacho_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_San_Carlos_David, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1WZ1MqceUcuimKT0Wm4os6SyhGeAjLk9g/view?usp=drivesdk","description":"Contrabajo - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1Ni3-JMqg0Z8CtiNHL22he66OhUk_aS2J/view?usp=drivesdk","description":"Corno F - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1N9B1DbxeotZv0gmvZXJYQ4OPW1nMG6QI/view?usp=drivesdk","description":"Fagot - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta Traversa', '[{"url":"https://drive.google.com/file/d/1MObaNaqzmbSKHD-iQSJHj1Qcn72Xgf4q/view?usp=drivesdk","description":"Flauta Traversa - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/175hPdR1nUPXnEKh19e60AeIr6GRKi8oC/view?usp=drivesdk","description":"Guitarra - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/13SKGPVowvv1TtqI8G1eSJK_RERxPoUtR/view?usp=drivesdk","description":"Perc - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1RowWh7-YTRFLpwlB6zsvd5j6JS_8NJiH/view?usp=drivesdk","description":"Piano - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ldRkVM5zAgDKG4j8cL1qg-s14d7RR0Hb/view?usp=drivesdk","description":"SCORE - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1XFDEzo3KyVy7Csl92i63mlmw2x1OkyMF/view?usp=drivesdk","description":"Trompeta Bb - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1f8pJsfUiB-OVNZ-TRDnaa05LLmY6wF9P/view?usp=drivesdk","description":"Viola - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1rf4Ur-kNhe2gmPcbbddFHGmkJrmUuCNT/view?usp=drivesdk","description":"Violín 1 - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1aT3Iotvjj_cEiR01SKqFFk3u8eVRdWMz/view?usp=drivesdk","description":"Violín 2 - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1IDb7EYXGZFT-VFXeWWR_zsmq202zzQfe/view?usp=drivesdk","description":"Violoncello - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1acWO45boQGxFqabGxuDmPnQn5IdhJvhv/view?usp=drivesdk","description":"VOZ - Dejame estar - Valles-San Carlos,D.pdf"}]', false);
  END IF;

  -- A mi manera
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1wcMsFXyHyQYmFOlY2_xTyDg5xYyqTdc_') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('A mi manera', _p_Robledo_, 'Oficial', 'Legacy sin match (Drive). My Way (Paul Anka / Frank Sinatra). Versión María Marta Serra Lima', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Voz', 'https://drive.google.com/open?id=1wcMsFXyHyQYmFOlY2_xTyDg5xYyqTdc_')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Fran_ois_Claude, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Revaux_Jacques, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Robledo_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1TTo9pbsSwB-adq1uBVTJlrJ_SmX-ummj/view?usp=drivesdk","description":"Contrabajo - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1T37HSYlueZNutlD-kg_oIyhiKipjTIcI/view?usp=drivesdk","description":"Corno F - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1f4JG6cKzTxjN8jFP3ZVdkNI-4kXl4J1h/view?usp=drivesdk","description":"Fagot - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1_lUpn2DW5kvaTnanoiJBfm1smb1_GHTq/view?usp=drivesdk","description":"Flauta - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Percusión', '[{"url":"https://drive.google.com/file/d/1zdsvNu89hl31tOqRQY4wAcNlk4rMSKoM/view?usp=drivesdk","description":"Percusión - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1Ci5eZUxiz1kBTZja8M_qMnRkBEt2X5K2/view?usp=drivesdk","description":"Piano - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1LYHRCzXcykj3lHdb_7EjzkDZQS5GLCoX/view?usp=drivesdk","description":"SCORE - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1NjRcfVRoMeMYgKWunFUUYx_cPQU4OHRI/view?usp=drivesdk","description":"Trompeta Bb - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1zBWbP2Vr8lNHPpId34MxGkWyQCVMxB5y/view?usp=drivesdk","description":"Viola - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/11diUjI_5kny8g--uwjOty6LWPTCTmgqd/view?usp=drivesdk","description":"Violín 1 - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1pjG9HxEFX2fq-GV3TGORYnoijCYCeDbY/view?usp=drivesdk","description":"Violín 2 - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1FEmDXvrm8EWyZdOPY1eyhBtGbUHaGMcG/view?usp=drivesdk","description":"Violoncello - A mi manera - François-Revaux-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1SuV1Zj2A2IZ_TPiGYChVUDJ4dMkKqTBP/view?usp=drivesdk","description":"VOZ - A mi manera - François-Revaux-Robledo.pdf"}]', false);
  END IF;

  -- Desconfío
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1yt2ABmqjyUNeEbYk8b4JKPRNxnd4VGk0') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Desconfío', _p_Lagos_An_bal, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.1 - 1.1.0.0 - Perc - Key - Str + Guitarra', 'https://drive.google.com/open?id=1yt2ABmqjyUNeEbYk8b4JKPRNxnd4VGk0')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Pappo_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Lagos_An_bal, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1p-kutzJuVnIsiHAumiruyByfTv678QQe/view?usp=drivesdk","description":"Contrabajo - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1zmFtgv_7FsL_jSPq2o5b7WPFbUPIqIpp/view?usp=drivesdk","description":"Corno F - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1zvaS_IEACGV42BTkwsGpAo9zDqtFIwYe/view?usp=drivesdk","description":"Fagot - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1_DCVoM3KB6wFRByPdpds64AZNvuGg2fV/view?usp=drivesdk","description":"Flauta - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1zqFx5B2YoiUmfolbtxl2AHBXdEQKItDT/view?usp=drivesdk","description":"Guitarra - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc', '[{"url":"https://drive.google.com/file/d/1zbJ37NT4NJ55kfEX77JNuD4lDDaEiFDn/view?usp=drivesdk","description":"Perc - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1zm-QfNiGL6mqRMidOq_BIaTgu02ATlMj/view?usp=drivesdk","description":"Piano - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1zQXhi8sP_lYoU-36mvtvOi0tyfHZuRXn/view?usp=drivesdk","description":"SCORE - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb', '[{"url":"https://drive.google.com/file/d/1zk9qOfoOegeYGGFJwfzot7iS_y96wRK2/view?usp=drivesdk","description":"Trompeta Bb - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1zgn9oqFX1illO2D9WQk2gR3H8NqGGRFa/view?usp=drivesdk","description":"Viola - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1zgwxvBQQk7BBMCR76x_gkoblnqi2WlhE/view?usp=drivesdk","description":"Violín 1 - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/11Si0hGSdDTZfEdS4ZTVrWoLMDAkQqRq3/view?usp=drivesdk","description":"Violín 2 - Desconfío - Pappo-Lagos.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1OJQVKSDvsA0qRq2FAeGEHMpBvO3eO3J8/view?usp=drivesdk","description":"Violoncello - Desconfío - Pappo-Lagos.pdf"}]', false);
  END IF;

  -- Vals de Musetta, arr. Robledo
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1yBuyibh_0UhHmdML2EDvgWBwYQ3Ukmkg') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Vals de Musetta, arr. Robledo', _p_Robledo_, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.0.0.0 - 0.0.0.0 - Key - Str + Voz', 'https://drive.google.com/open?id=1yBuyibh_0UhHmdML2EDvgWBwYQ3Ukmkg')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Puccini_Giacomo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Robledo_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1yezCBgczHxlyeOZlpPZ5pDZhUgu8Npb4/view?usp=drivesdk","description":"Contrabajo - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1yiyPo3AUEQeZqgyAZAF5WDl2abmRRq84/view?usp=drivesdk","description":"Flauta - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1yETGsKx2oc6vHDevu3-R4NLCCYIMmrHW/view?usp=drivesdk","description":"Piano - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1yXI9MuuvDLzORl_gZCbs4DSD-O3FZKi2/view?usp=drivesdk","description":"SCORE - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1yM48GArZJK4KCkP130YY6KSJXHFNlBu3/view?usp=drivesdk","description":"Viola - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ymMHm_m9r992acfTg7f2XwRZyvVp1sbX/view?usp=drivesdk","description":"Violín 1 - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1yf-yG6zlfU-fDWAC0Hi9gckWmDe286ht/view?usp=drivesdk","description":"Violín 2 - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1yMBBG3QIclJ-a7QUJs_8rItfjH8P1AJR/view?usp=drivesdk","description":"Violoncello - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'VOZ', '[{"url":"https://drive.google.com/file/d/1yI-6uavzX7QXzYna5EoE9SlDRyEjUkQP/view?usp=drivesdk","description":"VOZ - Vals de Musetta - Puccini-Robledo.pdf"}]', false);
  END IF;

  -- IX. Nimrod, Enigma Variations Op. 36
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1aI9mG_FbSXnKHvDZsKo081EoZInWasdl') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('IX. Nimrod, Enigma Variations Op. 36', NULL, 'Oficial', 'Legacy sin match (Drive) — carga automática lote 2024', '1.2.1.2 - 4.2.3.1 - Str', 'https://drive.google.com/open?id=1aI9mG_FbSXnKHvDZsKo081EoZInWasdl')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Elgar_Edward, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1 y 2 Bb', '[{"url":"https://drive.google.com/file/d/1aQApyRMK9mwxMo-gqN-xyR3pZ9WEPkDJ/view?usp=drivesdk","description":"Clarinete I y II Bb - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1av0Pe8ObC3xgZmXHZPkFK874Ga5nx19f/view?usp=drivesdk","description":"Contrabajo - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1aqwqAn4sPOHMD9G56yAvu91MWBxt2uht/view?usp=drivesdk","description":"Corno F I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1aqwqAn4sPOHMD9G56yAvu91MWBxt2uht/view?usp=drivesdk","description":"Corno F I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1mUxuyb9QMeT58UfgwHRt0HWiXCD-axC7/view?usp=drivesdk","description":"Corno F III y IV - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1mUxuyb9QMeT58UfgwHRt0HWiXCD-axC7/view?usp=drivesdk","description":"Corno F III y IV - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1al--bzs7SaGh_azuFFXenk_jk25XxjzU/view?usp=drivesdk","description":"Fagot I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1al--bzs7SaGh_azuFFXenk_jk25XxjzU/view?usp=drivesdk","description":"Fagot I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta y Pic.', '[{"url":"https://drive.google.com/file/d/1a_R7J8GZPJx3tPaHQ99yaiM2PL4Ar7Kc/view?usp=drivesdk","description":"Flauta y Pic.  - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1aWxWLhJywFk6wrDYBq4sI8T5JKmlm_PE/view?usp=drivesdk","description":"Oboe I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1aWxWLhJywFk6wrDYBq4sI8T5JKmlm_PE/view?usp=drivesdk","description":"Oboe I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1b2yb0nUBEhmJqHlt9FMY2iyK0EUIcrB5/view?usp=drivesdk","description":"SCORE - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1b-wt7ag3Qt_kto3qSP53Pwz7uBJy2Uzq/view?usp=drivesdk","description":"Trombón  I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1b-wt7ag3Qt_kto3qSP53Pwz7uBJy2Uzq/view?usp=drivesdk","description":"Trombón  I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1k0ZHk8Tt8Z9d2U6dtOwSsolqTUe5Dqik/view?usp=drivesdk","description":"Trombón Bajo  - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1bAYdcAMRguz2GdAxu1PT6uH9-jY3AjYt/view?usp=drivesdk","description":"Trompeta F I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1bAYdcAMRguz2GdAxu1PT6uH9-jY3AjYt/view?usp=drivesdk","description":"Trompeta F I y II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1k8VAbdOWz1OdNeelANpGgmgMjqJUTMoZ/view?usp=drivesdk","description":"Tuba  - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1b5uzQSxXC8kJCc4OVmZCgL6FChMpTEnf/view?usp=drivesdk","description":"Viola - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1bCcNrHsrjMZggbc_4Ui0Zxd2rU8Zc6oj/view?usp=drivesdk","description":"Violín I - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1bC3xyyD4J1MakV-XQ0v8Bd3wY4M67kEJ/view?usp=drivesdk","description":"Violín II - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1bE3E1kQxFlhusIzVo_L0YcS8VWzmMq-I/view?usp=drivesdk","description":"Violoncello - IX. NIMROD - Enigma Variations - Elgar, E. Op 36.pdf"}]', false);
  END IF;

END $$;
