const TERM_RE = /^(spring|summer|fall)\s+(\d{4})$/i;

export function normalizeTerm(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) {
    return {
      id: "unknown",
      season: "unknown",
      year: null,
      label: "Unspecified",
      sortKey: 0,
    };
  }

  const match = raw.match(TERM_RE);
  if (!match) {
    return {
      id: `unknown-${slugify(raw)}`,
      season: "unknown",
      year: null,
      label: titleCase(raw),
      sortKey: 0,
    };
  }

  const season = match[1].toLowerCase() as "spring" | "summer" | "fall";
  const year = Number(match[2]);
  const seasonOrder = season === "spring" ? 1 : season === "summer" ? 2 : 3;

  return {
    id: `${season}-${year}`,
    season,
    year,
    label: `${titleCase(season)} ${year}`,
    sortKey: year * 10 + seasonOrder,
  };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
