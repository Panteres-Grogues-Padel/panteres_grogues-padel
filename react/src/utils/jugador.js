/** jugadores.id en Supabase es uuid; ids demo u otros valores no deben enviarse a columnas uuid. */
export function isJugadorUuid(id) {
  if (id == null) return false;
  const s = typeof id === "string" ? id.trim() : String(id).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
