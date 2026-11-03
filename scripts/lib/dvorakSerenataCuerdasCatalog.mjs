/**
 * Dvořák — Serenata para Cuerdas en Mi mayor, Op. 22 (IMSLP).
 * Drive: https://drive.google.com/drive/folders/1Uv4vvVa0b0qMMWbgM8MjD2E0dxeML9Ve
 * Local: Archivo General OFRN\CUERDAS\Dvorak, A. - Serenata para Cuerdas en Mi Mayor Op. 22
 */
export const DVORAK_SERENATA_DRIVE_FOLDER =
  "https://drive.google.com/open?id=1Uv4vvVa0b0qMMWbgM8MjD2E0dxeML9Ve";

export const DVORAK_SERENATA_WORK = {
  targetFolder: "Dvorak, A. - Serenata para Cuerdas en Mi Mayor Op. 22",
  titulo:
    "<p>Serenata para Cuerdas en Mi mayor, Op. 22</p>" +
    "<div>&nbsp; I. Moderato</div>" +
    "<div>&nbsp; II. Tempo di Valse</div>" +
    "<div>&nbsp; III. Scherzo. Vivace</div>" +
    "<div>&nbsp; IV. Larghetto</div>" +
    "<div>&nbsp; V. Finale. Allegro vivace</div>",
  workNumber: "Op. 22",
  composerTag: "Dvorak, A",
  /** Reutiliza compositor existente (id 95 en BD). */
  compositor: { apellido: "Dvorak", nombre: "Antonin" },
  action: "insert",
  driveFolderId: "1Uv4vvVa0b0qMMWbgM8MjD2E0dxeML9Ve",
  anio: 1875,
  /** Único cambio de nombre aplicado (2026-11-02). */
  renames: [
    {
      from: "Violín II - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf",
      to: "Violín 2 - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf",
    },
  ],
};
