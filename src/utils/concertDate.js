export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getConcertDateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return getLocalDateKey(value);
  }

  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (!match) return null;

  const [, year, month, day, suffix] = match;
  if (suffix && !suffix.startsWith("T")) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  if (!suffix) return `${year}-${month}-${day}`;

  const timestamp = new Date(raw);
  return !Number.isNaN(timestamp.getTime()) ? getLocalDateKey(timestamp) : null;
}

export function isConcertPast(value, now = new Date()) {
  const concertDate = getConcertDateKey(value);
  return Boolean(concertDate && concertDate < getLocalDateKey(now));
}

export function canBookConcert(value, now = new Date()) {
  const concertDate = getConcertDateKey(value);
  return Boolean(concertDate && concertDate >= getLocalDateKey(now));
}

export function formatConcertDate(value) {
  const dateKey = getConcertDateKey(value);
  if (!dateKey) return "DATE TBA";

  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}
