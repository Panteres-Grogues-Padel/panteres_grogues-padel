import es from './locales/es.json';
import ca from './locales/ca.json';

const locales = { es, ca };
const LOCALE = 'ca';

export function t(path, params = {}) {
  const keys = path.split('.');
  let v = locales[LOCALE];
  for (const k of keys) {
    if (v == null) return path;
    v = v[k];
  }
  if (typeof v !== 'string') return path;
  return v.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

export function pluralSuffix(count) {
  return count === 1 ? '' : 's';
}
