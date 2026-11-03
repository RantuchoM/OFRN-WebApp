/**
 * Catálogo del lote «legacy sin match con Drive» (2024). Cada carpeta Drive ya viene
 * con PDFs en nombre canónico OFRN (Instrumento - Título - Compositor-Arreglador.pdf),
 * por lo que no se renombra ni se divide: solo se crea obra + particellas.
 *
 * `driveId` = carpeta original (link_drive). `titulo` = título corto de programa
 * (sin movimientos inventados). `comps` / `arr` = personas (se buscan por apellido+nombre
 * en `compositores`; si no existen se crean).
 */
const L = { apellido: "Lagos", nombre: "Aníbal" };
const CATTANI = { apellido: "Cattani", nombre: null };
const ROBLEDO = { apellido: "Robledo", nombre: null };
const NAPOLITANO = { apellido: "Napolitano", nombre: "F." };
const PEREZ_M = { apellido: "Pérez", nombre: "Micaela" };
const DANTONA = { apellido: "D´Antona", nombre: "Esteban" };
const GONZALEZ_D = { apellido: "González", nombre: "D." };
const SAN_CARLOS = { apellido: "San Carlos", nombre: "David" };
const LEMA = { apellido: "Lema", nombre: "Germán" };
const PEREA = { apellido: "Perea da Silva", nombre: null };

export const BATCH_WORKS = [
  { driveId: "149AE5rNC4bIo_8y8fYtCuOjqT64p_3wA", titulo: "Cae el sol", comps: [{ apellido: "Airbag", nombre: null }], arr: L },
  { driveId: "10k04HawajpEHTFXlt1qyWaTUWBFwPYSL", titulo: "Tu poeta", comps: [{ apellido: "Campos", nombre: "Alex" }], arr: L },
  { driveId: "1wbhoz4gubghXjvQXuPQBUWcgug5SLpVw", titulo: "Sus ojos se cerraron, arr. Pérez", comps: [{ apellido: "Gardel", nombre: "Carlos" }], arr: PEREZ_M },
  { driveId: "1vIIJ_2Lm6rudwenLmuVVtZXt2h0EzI6W", titulo: "Alfonsina y el Mar, arr. Cattani", comps: [{ apellido: "Ramírez", nombre: "Ariel" }], arr: CATTANI },
  { driveId: "1m7YxFb-Cu3aFDmJmsUmkJ2k9WrHXhhXA", titulo: "Viaje Cantor", comps: [{ apellido: "Mansilla", nombre: "Benjamin" }], arr: DANTONA },
  { driveId: "15q2ezyrhSurUPNY14MQuI_uEx2bKktIR", titulo: "El arte del querer", comps: [{ apellido: "Roldán", nombre: "Carlos" }], arr: L },
  { driveId: "1224FZeSm0s__bit1qlQItQdZZ63F825l", titulo: "La Pomeña, arr. Lagos", comps: [{ apellido: "Leguizamon", nombre: 'Gustavo "Cuchi"' }], arr: L },
  { driveId: "1xkPeKf5XYlKVdjxBLMjwpDupN-smtBCk", titulo: "El tiempo es veloz", comps: [{ apellido: "Lebón", nombre: "David" }], arr: ROBLEDO },
  { driveId: "1w_wt8CvFsjREg9viIewbVNHgielZHtgd", titulo: "La nave del olvido", comps: [{ apellido: "Ramos", nombre: "Dino" }], arr: PEREZ_M },
  { driveId: "1-rjMdDcZ0JCCGRabhhX3gaTQiPXuRV-0", titulo: "I will always love you", comps: [{ apellido: "Parton", nombre: "Dolly" }], arr: NAPOLITANO },
  { driveId: "1kCWTxQs0raV7Eh9zgSIiharv2uWOewhO", titulo: "Nostalgias, arr. San Carlos", comps: [{ apellido: "Cobián", nombre: "Juan Carlos" }], arr: SAN_CARLOS },
  { driveId: "161_OQYaLMAYi39b97LaH1sLOghXEhbh3", titulo: "La de la mala suerte", comps: [{ apellido: "Jesse y Joy", nombre: null }], arr: L },
  { driveId: "1-kZOH0Fgu124JqfANrP2MwRX6VEsZp9q", titulo: "Remamos", comps: [{ apellido: "García", nombre: "Kany" }], arr: ROBLEDO },
  { driveId: "13Wk9fZP_qyGaln1NYs7A4x1MvkljtDhr", titulo: "Hallelujah, arr. Lagos", comps: [{ apellido: "Cohen", nombre: "Leonard" }], arr: L },
  { driveId: "1m7eHMStoyo4AkROJ_E3NqYKrOOwzQVcG", titulo: "La Reina", comps: [{ apellido: "Maluma", nombre: null }], arr: DANTONA },
  { driveId: "16G4q__ZMV5irG8Oe4xpLDlLNK6a_sfgd", titulo: "Del mismo río", comps: [{ apellido: "Rozas", nombre: "Pablo" }], arr: GONZALEZ_D },
  { driveId: "1XfrgCFhUk-Jb_f_lFfUjp4qzTCphwK2a", titulo: "From the start", comps: [{ apellido: "Laufey", nombre: null }], arr: NAPOLITANO },
  { driveId: "1mD_FOInv5Xbp2wn1lOpmOoTATySVUKKR", titulo: "Mi estrella predilecta", comps: [{ apellido: "Vasconcellos", nombre: "José Adolfo" }], arr: CATTANI },
  { driveId: "1nCsrkUHQrVx3Xl8Nrl_OylsjRt2J8RLh", titulo: "El alazán", comps: [{ apellido: "Yupanqui", nombre: "Atahualpa" }], arr: L },
  { driveId: "1-8FOq7e-NuL5rJQ2d3n-PCaluqV_kcp9", titulo: "Cuando tú no estás", comps: [{ apellido: "Gardel", nombre: "Carlos" }], arr: L },
  { driveId: "1m3cD0v9xKIqktxbDiIlYcfJHdYp472gs", titulo: "Estoy enamorado", comps: [{ apellido: "Poveda", nombre: "Donato" }], arr: L },
  { driveId: "1jlQxswo5ljVNbpXbfD0pjX2dQdvKG0Mf", titulo: "Corazón Delator, arr. Lagos", comps: [{ apellido: "Cerati", nombre: "Gustavo" }], arr: L },
  { driveId: "1yBAzmb5CaZSOVuGshUudeK_2OTm-UIaY", titulo: "E strano… ah forse lui… siempre libera. Recitativo y aria de La Traviata", comps: [{ apellido: "Verdi", nombre: "Giuseppe" }], arr: PEREZ_M },
  { driveId: "10M0l8S3aXdPlObqZCudoDEy3IEvmJQ4C", titulo: "Maybe This Time", comps: [{ apellido: "Kander", nombre: "John" }], arr: CATTANI },
  { driveId: "1t8nEX4xSpem-mp45NW1AJOWtGGnd7QcT", titulo: "Donne mie, la fate a tanti. Aria de Guglielmo de Così fan tutte", comps: [{ apellido: "Mozart", nombre: "Wolfgang Amadeus" }], arr: CATTANI },
  { driveId: "1-iDYqYj_R1VIrEdcCxyTvtOMRTVqGOoN", titulo: "Azul", comps: [{ apellido: "Cuervo", nombre: "Iara" }], arr: PEREZ_M },
  { driveId: "1fLWBAeE1ylQQ8ph3F9bOI3S_f_8B-fNa", titulo: "Ave", comps: [{ apellido: "Álvarez", nombre: "Belén" }], arr: LEMA },
  { driveId: "10mySuKlnXPYPyQBZr01s8aB9GozAd_Dh", titulo: "Bésame mucho, arr. Cuerdas+Pn+Timb+Perc", comps: [{ apellido: "Velázquez", nombre: "Consuelito" }], arr: null },
  { driveId: "10oaquFRqgSm3LCUS-Hr9FIs3NcLwk6FD", titulo: "A su merced, Don José", comps: [{ apellido: "Donjuan", nombre: "Nubia Jaime" }], arr: null },
  { driveId: "1n8TwUm1glcppnNpPHXRckZCbGNS9mW3c", titulo: "Dream On, arr. Perea da Silva", comps: [{ apellido: "Tyler", nombre: "Steven" }], arr: PEREA },
  { driveId: "1y9P3QjDv0Fx686TIQqReGCZtIZbmnDDw", titulo: "Libertad", comps: [{ apellido: "González", nombre: "David Ignacio" }], arr: PEREZ_M },
  { driveId: "1XKECoAiOqR5Ii6FP_pGLdiI59fitL2L2", titulo: "Querencia de mi sentir", comps: [{ apellido: "Carabajal", nombre: "Demi" }], arr: NAPOLITANO },
  { driveId: "1ZAvQpjYjPl_FMfEvxCaL39RZ9nxEhd8Y", titulo: "Amarilli, mia bella", comps: [{ apellido: "Caccini", nombre: "Giulio" }], arr: CATTANI },
  { driveId: "1xaAEjHAcLoIrbttMWajLHUTqHDuQuNhz", titulo: "Corazón Delator, arr. Robledo", comps: [{ apellido: "Cerati", nombre: "Gustavo" }], arr: ROBLEDO },
  { driveId: "1xcbFeHcW-_vyawi5iFbH1YltoOnVYtgP", titulo: "Cuento de Hadas", comps: [{ apellido: "Impensa2", nombre: null }], arr: ROBLEDO },
  { driveId: "1zGuODGG5hhpf1_ou35EJH1S1ElP-ddAw", titulo: "Llorar", comps: [{ apellido: "Jesse y Joy", nombre: null }], arr: NAPOLITANO },
  { driveId: "1jjCuzs4Z8BQgH1lIXPboFRjk-kOpBpoO", titulo: "Así fue, arr. Lagos", comps: [{ apellido: "Gabriel", nombre: "Juan" }], arr: L },
  { driveId: "1-TGw7pOCSzMf0t4Heg6CU_iHVpKsE4Un", titulo: "Sin tu latido", comps: [{ apellido: "Aute", nombre: "Luis Eduardo" }], arr: NAPOLITANO },
  { driveId: "1-kJp3erPiqu6i_Rqfgy1dj2Oj34nVoUD", titulo: "Corazón Malherido", comps: [{ apellido: "González", nombre: "Luna Morena" }], arr: GONZALEZ_D },
  { driveId: "1jkn6znyJ6_gZhmtZxik8pPVZekdc9eNd", titulo: "Nuestra canción", comps: [{ apellido: "Monsieur Periné", nombre: null }], arr: L },
  {
    driveId: "1Y16agUCiW87AtnwnlxUPEq_CM4-JSr_X",
    titulo: "El conventillo",
    comps: [
      { apellido: "Baffa", nombre: "Ernesto" },
      { apellido: "Rolón", nombre: "Fernando" },
    ],
    arr: GONZALEZ_D,
  },
  { driveId: "19bsi7L09wyKQODVZtscw2NsbJqYLLLNB", titulo: "Dejame estar", comps: [{ apellido: "Valles", nombre: 'Oscar "Cacho"' }], arr: SAN_CARLOS },
  {
    driveId: "1wcMsFXyHyQYmFOlY2_xTyDg5xYyqTdc_",
    titulo: "A mi manera",
    comps: [
      { apellido: "François", nombre: "Claude" },
      { apellido: "Revaux", nombre: "Jacques" },
    ],
    arr: ROBLEDO,
    obs: "My Way (Paul Anka / Frank Sinatra). Versión María Marta Serra Lima",
  },
  { driveId: "1yt2ABmqjyUNeEbYk8b4JKPRNxnd4VGk0", titulo: "Desconfío", comps: [{ apellido: "Pappo", nombre: null }], arr: L },
  { driveId: "1yBuyibh_0UhHmdML2EDvgWBwYQ3Ukmkg", titulo: "Vals de Musetta, arr. Robledo", comps: [{ apellido: "Puccini", nombre: "Giacomo" }], arr: ROBLEDO },
  { driveId: "1aI9mG_FbSXnKHvDZsKo081EoZInWasdl", titulo: "IX. Nimrod, Enigma Variations Op. 36", comps: [{ apellido: "Elgar", nombre: "Edward" }], arr: null },
];

/** Filas del Excel que se asocian a una obra YA existente (sin crear obra). */
export const REMATCH_EXISTING = [
  // drive id del Excel -> id_obra existente (Claro de luna: misma obra de Gina Enríquez, otro link_drive)
  { driveId: "10jiIwa64E7BVAYCHsXUBpzhRMWIP9Qq4", idObra: 3142, nota: "Claro de luna (Enríquez), 6 particellas ya cargadas" },
];

/** Pre-Laborde: el link del Excel es la carpeta raíz de la gira (no de la obra). Match por compositor+título. */
export const PRE_LABORDE_REMATCH = [
  { titulo: "De aquella provincia soy (zamba)", idObra: 1508 },
  { titulo: "De Cuerpo y Alma ( huella)", idObra: 1509 },
  { titulo: "Triunfo Patria (triunfo)", idObra: 1510 },
  { titulo: 'Danzas del Ballet "Estancias" 4. Danza Final (Malambo)', idObra: 2905 },
];
