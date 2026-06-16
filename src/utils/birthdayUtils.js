const DAY_MS = 24 * 60 * 60 * 1000;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseBirthdayParts(fechaNac) {
  if (!fechaNac) return null;
  const iso = String(fechaNac).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  return {
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function localMidnight(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isValidMonthDay(date, month, day) {
  return date.getMonth() + 1 === month && date.getDate() === day;
}

export function getNextBirthdayDate(fechaNac, today = new Date()) {
  const parts = parseBirthdayParts(fechaNac);
  if (!parts) return null;

  const base = localMidnight(today);
  let next = new Date(base.getFullYear(), parts.month - 1, parts.day);
  if (!isValidMonthDay(next, parts.month, parts.day)) return null;

  if (next < base) {
    next = new Date(base.getFullYear() + 1, parts.month - 1, parts.day);
    if (!isValidMonthDay(next, parts.month, parts.day)) return null;
  }

  return next;
}

export function getDaysUntilBirthday(fechaNac, today = new Date()) {
  const next = getNextBirthdayDate(fechaNac, today);
  if (!next) return null;

  const base = localMidnight(today);
  return Math.round((next.getTime() - base.getTime()) / DAY_MS);
}

export function isBirthdayToday(fechaNac, today = new Date()) {
  return getDaysUntilBirthday(fechaNac, today) === 0;
}

export function isBirthdayWithinDays(fechaNac, daysAhead = 30, today = new Date()) {
  const daysUntil = getDaysUntilBirthday(fechaNac, today);
  return daysUntil !== null && daysUntil >= 0 && daysUntil <= daysAhead;
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
