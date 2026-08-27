SELECT id, stage_plot_type,
  (svg_icon ~* 'currentColor') AS has_cc,
  (svg_icon ~* '#[0-9A-Fa-f]{3,8}') AS has_hex,
  char_length(svg_icon) AS len
FROM public.instrumentos
WHERE id IN ('01','02','03','04','05','06','21')
ORDER BY id;
