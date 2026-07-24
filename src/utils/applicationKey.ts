const suffixes = [
  /\bm\/f\/d\b/gi,
  /\bm\/w\/d\b/gi,
  /\ball genders welcome\b/gi,
  /\ball genders\b/gi,
  /\bmale\/female\/diverse\b/gi,
];

export function normalizeApplicationText(value: string): string {
  return suffixes
    .reduce((text, pattern) => text.replace(pattern, " "), value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[()[\]{}.,:;|–—/\\_+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createApplicationKey(company: string, country: string, position: string): string {
  return [company, country, position].map(normalizeApplicationText).join("::");
}

export function waitingDays(date: string): number {
  const start = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
}
