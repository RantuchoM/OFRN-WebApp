// Definición de grupos preestablecidos para agilizar la carga
// Los IDs de instrumentos deben coincidir con tu tabla 'instrumentos' en Supabase.

export const INSTRUMENT_GROUPS = [
  // --- CUERDAS ---
  {
    id: "group_cuerdas_4",
    instrumento: "★ Cuerdas x4 (V1, V2, Va, Vc)",
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
  },

  // --- MADERAS (Orquestales) ---
  {
    id: "group_maderas_1",
    instrumento: "★ Maderas x1 (a1)",
    isGroup: true,
    definitions: [
      { id_instrumento: '05', nombre_archivo: 'Flauta', instrumento_base: 'Flauta' },
      { id_instrumento: '06', nombre_archivo: 'Oboe', instrumento_base: 'Oboe' },
      { id_instrumento: '07', nombre_archivo: 'Clarinete', instrumento_base: 'Clarinete' },
      { id_instrumento: '08', nombre_archivo: 'Fagot', instrumento_base: 'Fagot' },
    ]
  },
  {
    id: "group_maderas_2",
    instrumento: "★ Maderas x2 (a2)",
    isGroup: true,
    definitions: [
      { id_instrumento: '05', nombre_archivo: 'Flauta 1', instrumento_base: 'Flauta' },
      { id_instrumento: '05', nombre_archivo: 'Flauta 2', instrumento_base: 'Flauta' },
      { id_instrumento: '06', nombre_archivo: 'Oboe 1', instrumento_base: 'Oboe' },
      { id_instrumento: '06', nombre_archivo: 'Oboe 2', instrumento_base: 'Oboe' },
      { id_instrumento: '07', nombre_archivo: 'Clarinete 1', instrumento_base: 'Clarinete' },
      { id_instrumento: '07', nombre_archivo: 'Clarinete 2', instrumento_base: 'Clarinete' },
      { id_instrumento: '08', nombre_archivo: 'Fagot 1', instrumento_base: 'Fagot' },
      { id_instrumento: '08', nombre_archivo: 'Fagot 2', instrumento_base: 'Fagot' },
    ]
  },

  // --- QUINTETOS DE VIENTOS ---
  {
    id: "group_quinteto_vientos_1",
    instrumento: "★ Quinteto de Maderas x1 (Standard)",
    isGroup: true,
    definitions: [
      { id_instrumento: '05', nombre_archivo: 'Flauta', instrumento_base: 'Flauta' },
      { id_instrumento: '06', nombre_archivo: 'Oboe', instrumento_base: 'Oboe' },
      { id_instrumento: '07', nombre_archivo: 'Clarinete', instrumento_base: 'Clarinete' },
      { id_instrumento: '08', nombre_archivo: 'Fagot', instrumento_base: 'Fagot' },
      { id_instrumento: '09', nombre_archivo: 'Corno', instrumento_base: 'Corno' },
    ]
  },
  {
    id: "group_quinteto_vientos_2",
    instrumento: "★ Quinteto de Maderas x2 (Dobles)",
    isGroup: true,
    definitions: [
      { id_instrumento: '05', nombre_archivo: 'Flauta 1', instrumento_base: 'Flauta' },
      { id_instrumento: '05', nombre_archivo: 'Flauta 2', instrumento_base: 'Flauta' },
      { id_instrumento: '06', nombre_archivo: 'Oboe 1', instrumento_base: 'Oboe' },
      { id_instrumento: '06', nombre_archivo: 'Oboe 2', instrumento_base: 'Oboe' },
      { id_instrumento: '07', nombre_archivo: 'Clarinete 1', instrumento_base: 'Clarinete' },
      { id_instrumento: '07', nombre_archivo: 'Clarinete 2', instrumento_base: 'Clarinete' },
      { id_instrumento: '08', nombre_archivo: 'Fagot 1', instrumento_base: 'Fagot' },
      { id_instrumento: '08', nombre_archivo: 'Fagot 2', instrumento_base: 'Fagot' },
      { id_instrumento: '09', nombre_archivo: 'Corno 1', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 2', instrumento_base: 'Corno' },
    ]
  },
  {
    id: "group_bronces_4331",
    instrumento: "★ Bronces 4.3.3.1 (Full)",
    isGroup: true,
    definitions: [
      { id_instrumento: '09', nombre_archivo: 'Corno 1', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 2', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 3', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 4', instrumento_base: 'Corno' },
      { id_instrumento: '10', nombre_archivo: 'Trompeta 1', instrumento_base: 'Trompeta' },
      { id_instrumento: '10', nombre_archivo: 'Trompeta 2', instrumento_base: 'Trompeta' },
      { id_instrumento: '10', nombre_archivo: 'Trompeta 3', instrumento_base: 'Trompeta' },
      { id_instrumento: '11', nombre_archivo: 'Trombón 1', instrumento_base: 'Trombón' },
      { id_instrumento: '11', nombre_archivo: 'Trombón 2', instrumento_base: 'Trombón' },
      { id_instrumento: '11', nombre_archivo: 'Trombón 3', instrumento_base: 'Trombón' },
      { id_instrumento: '12', nombre_archivo: 'Tuba', instrumento_base: 'Tuba' },
    ]
  },
  {
    id: "group_bronces_4221",
    instrumento: "★ Bronces 4.2.2.1",
    isGroup: true,
    definitions: [
      { id_instrumento: '09', nombre_archivo: 'Corno 1', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 2', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 3', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 4', instrumento_base: 'Corno' },
      { id_instrumento: '10', nombre_archivo: 'Trompeta 1', instrumento_base: 'Trompeta' },
      { id_instrumento: '10', nombre_archivo: 'Trompeta 2', instrumento_base: 'Trompeta' },
      { id_instrumento: '11', nombre_archivo: 'Trombón 1', instrumento_base: 'Trombón' },
      { id_instrumento: '11', nombre_archivo: 'Trombón 2', instrumento_base: 'Trombón' },
      { id_instrumento: '12', nombre_archivo: 'Tuba', instrumento_base: 'Tuba' },
    ]
  },
  {
    id: "group_bronces_2220",
    instrumento: "★ Bronces 2.2.2.0 (Clásico)",
    isGroup: true,
    definitions: [
      { id_instrumento: '09', nombre_archivo: 'Corno 1', instrumento_base: 'Corno' },
      { id_instrumento: '09', nombre_archivo: 'Corno 2', instrumento_base: 'Corno' },
      { id_instrumento: '10', nombre_archivo: 'Trompeta 1', instrumento_base: 'Trompeta' },
      { id_instrumento: '10', nombre_archivo: 'Trompeta 2', instrumento_base: 'Trompeta' },
      { id_instrumento: '11', nombre_archivo: 'Trombón 1', instrumento_base: 'Trombón' },
      { id_instrumento: '11', nombre_archivo: 'Trombón 2', instrumento_base: 'Trombón' },
    ]
  }
];