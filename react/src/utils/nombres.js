/** Nombre visible: nickname si existe, si no el nombre corto de jugadores. */
export function getNombre(jugador) {
  if (!jugador) return "";
  const nick = jugador.nickname?.trim();
  if (nick) return nick;
  return jugador.nombre ?? "";
}

export function nombreCorto(nombreCompleto) {
  const s = (nombreCompleto ?? "").trim();
  if (!s) return "";
  const parts = s.split(/\s+/);
  const nombre = parts[0];
  const aps = [parts[1], parts[2]]
    .filter(Boolean)
    .map((ap) => ap[0].toUpperCase())
    .join("");
  return nombre + (aps ? ` ${aps}` : "");
}
