-- Carpetas de ensambles en Drive + accesos directos a programas Ensamble

ALTER TABLE public.ensambles
  ADD COLUMN IF NOT EXISTS google_drive_folder_id text;

COMMENT ON COLUMN public.ensambles.google_drive_folder_id IS
  'ID de carpeta Google Drive del ensamble bajo ENSAMBLES (Partituras).';

CREATE TABLE IF NOT EXISTS public.programas_ensamble_drive_shortcuts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_programa bigint NOT NULL,
  id_ensamble bigint NOT NULL,
  google_drive_shortcut_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT programas_ensamble_drive_shortcuts_pkey PRIMARY KEY (id),
  CONSTRAINT programas_ensamble_drive_shortcuts_programa_fkey
    FOREIGN KEY (id_programa) REFERENCES public.programas(id) ON DELETE CASCADE,
  CONSTRAINT programas_ensamble_drive_shortcuts_ensamble_fkey
    FOREIGN KEY (id_ensamble) REFERENCES public.ensambles(id) ON DELETE CASCADE,
  CONSTRAINT programas_ensamble_drive_shortcuts_unique UNIQUE (id_programa, id_ensamble)
);

COMMENT ON TABLE public.programas_ensamble_drive_shortcuts IS
  'Accesos directos en la carpeta de cada ensamble hacia la carpeta del programa.';

CREATE INDEX IF NOT EXISTS idx_programas_ensamble_drive_shortcuts_programa
  ON public.programas_ensamble_drive_shortcuts (id_programa);

CREATE INDEX IF NOT EXISTS idx_programas_ensamble_drive_shortcuts_ensamble
  ON public.programas_ensamble_drive_shortcuts (id_ensamble);

-- Carpeta modelo VS (https://drive.google.com/drive/folders/1gWshPbGts6utk0Fjz9nkXoKtRB2i8cs6)
UPDATE public.ensambles
SET google_drive_folder_id = '1gWshPbGts6utk0Fjz9nkXoKtRB2i8cs6'
WHERE trim(ensamble) = 'VS'
  AND (google_drive_folder_id IS NULL OR google_drive_folder_id = '');
