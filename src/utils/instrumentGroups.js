// Definición de grupos preestablecidos para agilizar la carga
// Los IDs de instrumentos ('01', '02', etc.) deben coincidir con tu tabla 'instrumentos' en Supabase.

export const INSTRUMENT_GROUPS = [
  {
    id: "group_cuerdas_4",
    instrumento: "★ Cuerdas x4 (V1, V2, Va, Vc)", // El ★ ayuda a distinguirlo visualmente en la lista
    isGroup: true,
    definitions: [
      { id_instrumento: '01', nombre_archivo: 'Violín 1', instrumento_base: 'Violín' },
      { id_instrumento: '01', nombre_archivo: 'Violín 2', instrumento_base: 'Violín' },
      { id_instrumento: '02', nombre_archivo: 'Viola', instrumento_base: 'Viola' },
      { id_instrumento: '03', nombre_archivo: 'Violoncello', instrumento_base: 'Violoncello' }
    ]
  },
  {
    id: "group_cuerdas_5",
    instrumento: "★ Cuerdas x5 (+ Cb)",
    isGroup: true,
    definitions: [
      { id_instrumento: '01', nombre_archivo: 'Violín 1', instrumento_base: 'Violín' },
      { id_instrumento: '01', nombre_archivo: 'Violín 2', instrumento_base: 'Violín' },
      { id_instrumento: '02', nombre_archivo: 'Viola', instrumento_base: 'Viola' },
      { id_instrumento: '03', nombre_archivo: 'Violoncello', instrumento_base: 'Violoncello' },
      { id_instrumento: '04', nombre_archivo: 'Contrabajo', instrumento_base: 'Contrabajo' }
    ]
  }
];