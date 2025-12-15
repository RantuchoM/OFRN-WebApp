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

  parts.forEach((p) => {
    // Aceptamos tanto objetos de DB (nombre_archivo) como objetos calculados
    const name = (p.nombre_archivo || "").toLowerCase();
    const baseName = (p.instrumento_nombre || p.instrumentos?.instrumento || "").toLowerCase();
    const note = p.nota_organico ? p.nota_organico.trim() : null;

    const add = (famKey) => {
      families[famKey].count++;
      if (note) families[famKey].notes.push(note);
    };

    // Lógica de detección
    if (name.includes("perc timb") ||name.includes("perc timp") || name.includes("perc. timb") || name.includes("perc. timb") || baseName.includes("timbal")) {
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
    else if (baseName.includes("piano") || baseName.includes("celesta") || baseName.includes("clavec")) add("key");
    else if (baseName.includes("viol") || baseName.includes("contrab")) families.str = true;
  });

  const fmt = (fam) => {
    if (fam.count === 0) return "0";
    let s = `${fam.count}`;
    if (fam.notes.length > 0) s += `(${fam.notes.join(", ")})`;
    return s;
  };

  const fmtPerc = () => {
    let s = "";
    if (families.timp) {
      s = families.perc.count > 0 ? `Timp.+${families.perc.count}` : "Timp";
    } else {
      if (families.perc.count === 1) s = "Perc";
      else if (families.perc.count > 1) s = `Perc.x${families.perc.count}`;
    }
    if (families.perc.notes.length > 0 && s !== "") {
      s += `(${families.perc.notes.join(", ")})`;
    }
    return s;
  };

  let str = `${fmt(families.fl)}.${fmt(families.ob)}.${fmt(families.cl)}.${fmt(families.bn)} - ${fmt(families.hn)}.${fmt(families.tpt)}.${fmt(families.tbn)}.${fmt(families.tba)}`;

  const percStr = fmtPerc();
  if (percStr) str += ` - ${percStr}`;

  if (families.harp.count > 0)
    str += ` - ${families.harp.count > 1 ? families.harp.count : ""}Hp${
      families.harp.notes.length ? `(${families.harp.notes.join(", ")})` : ""
    }`;
  if (families.key.count > 0)
    str += ` - Key${
      families.key.notes.length ? `(${families.key.notes.join(", ")})` : ""
    }`;
  if (families.str) str += " - Str";

  return str.replace('0.0.0.0 - 0.0.0.0 - ','');
};

export const calculateTotalDuration = (works) => {
  if (!works) return "00:00";
  const totalSeconds = works.reduce(
    (acc, item) => acc + (item.obras?.duracion_segundos || 0),
    0
  );
  return formatSecondsToTime(totalSeconds);
};