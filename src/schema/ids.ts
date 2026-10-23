export function createId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${rand}${time.slice(-3)}`;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function titleCase(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'piece'}-${suffix}`;
}
