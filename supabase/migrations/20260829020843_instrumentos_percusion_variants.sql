-- Variantes de Percusión (id base 13): Timbales, Marimba, Vibráfono, Bombo, Caja,
-- Platillos, Xilófono, Campanas tubulares. SVG OFRN-original (vista cenital, currentColor).
-- Idempotente: no pisa filas existentes.

INSERT INTO public.instrumentos (
  id,
  instrumento,
  familia,
  abreviatura,
  stage_plot_type,
  stage_plot_width_cm,
  stage_plot_height_cm,
  svg_icon
)
SELECT v.id, v.instrumento, v.familia, v.abreviatura, v.stage_plot_type,
       v.stage_plot_width_cm, v.stage_plot_height_cm, v.svg_icon
FROM (VALUES
  (
    '13a',
    'Timbales',
    'Percusión',
    'Timp',
    'timpani',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: timbal --><path fill="currentColor" d="M32 8c-14 0-26 8-26 20v4c0 2 1 3 3 3h46c2 0 3-1 3-3v-4c0-12-12-20-26-20zm0 6c9.5 0 18 5.2 18 12H14c0-6.8 8.5-12 18-12zM10 38h44v4c0 8-10 14-22 14S10 50 10 42v-4zm18 6h8v8h-8v-8z"/></svg>$svg$
  ),
  (
    '13b',
    'Marimba',
    'Percusión',
    'Mar',
    'marimba',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: marimba --><path fill="currentColor" d="M6 20h52v24H6V20zm4 4h3.5v16H10V24zm6.5 0h3.5v16h-3.5V24zm6.5 0h3.5v16H23V24zm6.5 0h3.5v16h-3.5V24zm6.5 0h3.5v16H36V24zm6.5 0h3.5v16h-3.5V24zm6.5 0h3.5v16H49V24z"/></svg>$svg$
  ),
  (
    '13c',
    'Vibráfono',
    'Percusión',
    'Vib',
    'vibraphone',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: vibráfono --><path fill="currentColor" d="M6 16h52v18H6V16zm4 3h3.5v12H10V19zm6.5 0h3.5v12h-3.5V19zm6.5 0h3.5v12H23V19zm6.5 0h3.5v12h-3.5V19zm6.5 0h3.5v12H36V19zm6.5 0h3.5v12h-3.5V19zm6.5 0h3.5v12H49V19zM12 40a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>$svg$
  ),
  (
    '13d',
    'Bombo',
    'Percusión',
    'Bom',
    'bass_drum',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: bombo --><path fill="currentColor" d="M32 6C17.6 6 6 17.6 6 32s11.6 26 26 26 26-11.6 26-26S46.4 6 32 6zm0 6c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20zm0 8c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12z"/></svg>$svg$
  ),
  (
    '13e',
    'Caja',
    'Percusión',
    'Caja',
    'snare',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: caja --><path fill="currentColor" d="M32 10c-12.2 0-22 9.8-22 22s9.8 22 22 22 22-9.8 22-22-9.8-22-22-22zm0 5c9.4 0 17 7.6 17 17s-7.6 17-17 17-17-7.6-17-17 7.6-17 17-17zM14 30h36v4H14v-4zm4-10 4 4-2.8 2.8-4-4L18 20zm24 0 2.8 2.8-4 4L38 28l4-4zM18 44l2.8-2.8 4 4L22 48l-4-4zm24 0 4 4-2.8 2.8-4-4L42 44z"/></svg>$svg$
  ),
  (
    '13f',
    'Platillos',
    'Percusión',
    'Plat',
    'cymbals',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: platillos --><path fill="currentColor" d="M22 12c-9.4 0-17 7.6-17 17s7.6 17 17 17c3.2 0 6.2-.9 8.8-2.4A17 17 0 0 0 42 52c9.4 0 17-7.6 17-17s-7.6-17-17-17c-3.2 0-6.2.9-8.8 2.4A17 17 0 0 0 22 12zm0 6c6.1 0 11 4.9 11 11s-4.9 11-11 11-11-4.9-11-11 4.9-11 11-11zm20 6c6.1 0 11 4.9 11 11s-4.9 11-11 11-11-4.9-11-11 4.9-11 11-11z"/></svg>$svg$
  ),
  (
    '13g',
    'Xilófono',
    'Percusión',
    'Xil',
    'xylophone',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: xilófono --><path fill="currentColor" d="M10 18h44l-4 28H14L10 18zm6 5h3v18h-3V23zm7 2h3v16h-3V25zm7 2h3v14h-3V27zm7 2h3v12h-3V29zm7 2h3v10h-3V31z"/></svg>$svg$
  ),
  (
    '13h',
    'Campanas tubulares',
    'Percusión',
    'Camp',
    'tubular_bells',
    50::numeric,
    50::numeric,
    $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: campanas tubulares --><path fill="currentColor" d="M12 8h40v6H12V8zm4 10h4v38h-4V18zm8 4h4v34h-4V22zm8 0h4v34h-4V22zm8-2h4v36h-4V20zm8 6h4v30h-4V26zM10 56h44v4H10v-4z"/></svg>$svg$
  )
) AS v(id, instrumento, familia, abreviatura, stage_plot_type, stage_plot_width_cm, stage_plot_height_cm, svg_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.instrumentos i WHERE i.id = v.id
);
