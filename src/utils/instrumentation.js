import { formatSecondsToTime } from "./time";

export const calculateInstrumentation = (parts) => {
  if (!parts || parts.length === 0) return "";

  const families = {
    fl: { count: 0, notes: [] },
    ob: { count: 0, notes: [] },
    cl: { count: 0, notes: [] },
    bn: { count: 0, notes: [] },
    hn: { count: 0, notes: [] },
    tpt: { count: 0, notes: [] },
    tbn: { count: 0, notes: [] },
    tba: { count: 0, notes: [] },
    timp: false,
    perc: { count: 0, notes: [] },
    str: false,
    key: { count: 0, notes: [] },
    harp: { count: 0, notes: [] },
  };

  // Mapa para contar instrumentos no estándar (ej: Saxo, Guitarra)
  const others = {}; 

  parts.forEach((p) => {
    const name = (p.nombre_archivo || "").toLowerCase();
    const rawBaseName = p.instrumento_nombre || p.instrumentos?.instrumento || "Desconocido";
    const baseName = rawBaseName.toLowerCase();
    const note = p.nota_organico ? p.nota_organico.trim() : null;

    const add = (famKey) => {
      families[famKey].count++;
      if (note) families[famKey].notes.push(note);
    };

    // Lógica de detección orquestal estándar
    if (name.includes("perc timb") || name.includes("perc timp") || name.includes("perc. timb") || baseName.includes("timbal")) {
      families.timp = true;
    } else if (name.startsWith("perc") || baseName.includes("perc") || baseName.includes("bombo") || baseName.includes("platillo") || baseName.includes("caja")) {
      add("perc");
    } else if (baseName.includes("flaut") || baseName.includes("picc")) add("fl");
    else if (baseName.includes("oboe") || baseName.includes("corno ing")) add("ob");
    else if (baseName.includes("clarin") || baseName.includes("requinto") || baseName.includes("basset")) add("cl");
    else if (baseName.includes("fagot") || baseName.includes("contraf")) add("bn");
    else if (baseName.includes("corno") || baseName.includes("trompa")) add("hn");
    else if (baseName.includes("trompet") || baseName.includes("fliscorno")) add("tpt");
    else if (baseName.includes("trombon")) add("tbn");
    else if (baseName.includes("tuba") || baseName.includes("bombard")) add("tba");
    else if (baseName.includes("arpa")) add("harp");
    else if (baseName.includes("piano") || baseName.includes("celesta") || baseName.includes("clavec") || baseName.includes("órgano")) add("key");
    else if (baseName.includes("viol") || baseName.includes("contrab")) families.str = true;
    else {
      // Si no es estándar, lo sumamos a "others" usando el nombre original capitalizado
      const cleanName = rawBaseName.charAt(0).toUpperCase() + rawBaseName.slice(1);
      if (!others[cleanName]) others[cleanName] = 0;
      others[cleanName]++;
    }
  });

  const fmt = (fam) => {
    if (fam.count === 0) return "0";
    let s = `${fam.count}`;
    if (fam.notes.length > 0) s += `(${fam.notes.join(", ")})`;
    return s;
  };

  // Construir string estándar (Maderas - Metales)
  let standardStr = `${fmt(families.fl)}.${fmt(families.ob)}.${fmt(families.cl)}.${fmt(families.bn)} - ${fmt(families.hn)}.${fmt(families.tpt)}.${fmt(families.tbn)}.${fmt(families.tba)}`;

  // Percusión
  let percStr = "";
  if (families.timp) {
    percStr = families.perc.count > 0 ? `Timp.+${families.perc.count}` : "Timp";
  } else {
    if (families.perc.count === 1) percStr = "Perc";
    else if (families.perc.count > 1) percStr = `Perc.x${families.perc.count}`;
  }
  if (families.perc.notes.length > 0 && percStr !== "") {
    percStr += `(${families.perc.notes.join(", ")})`;
  }
  if (percStr) standardStr += ` - ${percStr}`;

  // Otros estándar (Arpa, Teclados, Cuerdas)
  if (families.harp.count > 0)
    standardStr += ` - ${families.harp.count > 1 ? families.harp.count : ""}Hp`;
  if (families.key.count > 0)
    standardStr += ` - Key`;
  if (families.str) standardStr += " - Str";

  // Verificar si la parte estándar está vacía (todo ceros)
  const isStandardEmpty = standardStr.startsWith("0.0.0.0 - 0.0.0.0") && !families.timp && families.perc.count === 0 && !families.str && families.harp.count === 0 && families.key.count === 0;

  // Formatear "Otros"
  const otherKeys = Object.keys(others);
  let othersStr = "";
  if (otherKeys.length > 0) {
    othersStr = otherKeys.map(k => others[k] > 1 ? `${k} x${others[k]}` : k).join(", ");
  }

  // Lógica final de retorno
  if (isStandardEmpty) {
    // Si no hay orquesta estándar, devolvemos solo los otros (ej: "Saxo x4")
    // Esto evita que empiece con "0.0.0.0" y se oculte en la vista
    return othersStr; 
  }

  // Si hay mezcla, devolvemos estándar + otros
  let finalStr = standardStr.replace('0.0.0.0 - 0.0.0.0 - ', '').replace('0.0.0.0 - 0.0.0.0', '');
  if (othersStr) {
    finalStr += ` + ${othersStr}`;
  }

  return finalStr.replace(" + DIRECTOR") || ""; // Si todo está vacío, devuelve string vacío
};

export const calculateTotalDuration = (works) => {
  if (!works) return "00:00";
  const totalSeconds = works.reduce(
    (acc, item) => acc + (item.obras?.duracion_segundos || 0),
    0
  );
  return formatSecondsToTime(totalSeconds);
};