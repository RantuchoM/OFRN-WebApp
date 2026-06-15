export function isBirthdayToday(fechaNac, today = new Date()) {
  if (!fechaNac) return false;
  const iso = String(fechaNac).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month === today.getMonth() + 1 && day === today.getDate();
}

export function formatMusicianName({ apellido, nombre }) {
  const n = (nombre || "").trim();
  const a = (apellido || "").trim();
  if (!n && !a) return "";
  if (!a) return n;
  const initial = a.charAt(0).toUpperCase();
  if (!n) return `${initial}.`;
  return `${n} ${initial}.`;
}

export function buildBirthdayMessage(musicians) {
  const names = musicians.map(formatMusicianName).filter(Boolean);
  if (names.length === 0) return "";

  const joined =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} y ${names[1]}`
        : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;

  const verb = names.length === 1 ? "cumple" : "cumplen";
  return `🎂 Hoy ${verb} años ${joined} 🥳`;
}
