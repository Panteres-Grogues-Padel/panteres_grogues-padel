/**
 * UUID canónico en minúsculas y con guiones (8-4-4-4-12), para comparar con jugador_id / auth.
 * Acepta también el formato compacto de 32 hex que a veces devuelve el cliente.
 */
export function normalizeJugadorUuid(id) {
  if (id == null) return "";
  const s = String(id).trim().toLowerCase();
  const compact = s.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/.test(compact)) {
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) {
    return s;
  }
  return s;
}

/** jugadores.id en Supabase es uuid; otros valores no deben enviarse a columnas uuid. */
export function isJugadorUuid(id) {
  const n = normalizeJugadorUuid(id);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(n);
}

/** Comparación estable entre jugador_id (inscripción) y currentUser.id (perfil). */
export function jugadoresCoinciden(a, b) {
  if (a == null || b == null) return false;
  const x = normalizeJugadorUuid(a);
  const y = normalizeJugadorUuid(b);
  return x !== "" && x === y;
}
