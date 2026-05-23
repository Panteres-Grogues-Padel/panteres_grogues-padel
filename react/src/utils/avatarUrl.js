/** URL pública d'avatar sense paràmetres de query. */
export function avatarUrlBase(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.split("?")[0];
}

/** Versió estable derivada de la URL (per avatars d'altres jugadors). */
export function avatarUrlVersion(url) {
  const base = avatarUrlBase(url);
  if (!base) return 0;
  let h = 0;
  for (let i = 0; i < base.length; i += 1) {
    h = (h * 31 + base.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Afegeix cache-busting per evitar imatges en caché del navegador. */
export function avatarUrl(url, version) {
  const base = avatarUrlBase(url);
  if (!base) return null;
  const v = version != null ? version : avatarUrlVersion(base);
  return `${base}?v=${v}`;
}
