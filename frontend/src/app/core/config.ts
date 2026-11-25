// Address of the Node.js backend. Change these if your backend uses another port.
export const API = 'http://localhost:3000/api';
export const FILES = 'http://localhost:3000';

// Photo links saved by the upload feature start with /uploads; point them at the backend.
export const img = (u?: string | null): string => (!u ? '' : u.startsWith('/uploads') ? FILES + u : u);

// Order reference shown to staff, e.g. #MHK-1048
export const ref = (id: number): string => '#MHK-' + (1000 + id);

// "Donmark Glenn Atienza" -> "Donmark Glenn A."
export const shortName = (full?: string | null): string => {
  const p = (full ?? '').trim().split(/\s+/).filter(Boolean);
  return p.length < 2 ? p[0] ?? '' : `${p.slice(0, -1).join(' ')} ${p[p.length - 1][0].toUpperCase()}.`;
};
export const stars = (n: number): string => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
