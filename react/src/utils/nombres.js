/** Nom visible: nickname si existeix, si no el nom curt del jugador. */
export function getNombre(jugador) {
  if (!jugador) return "";
  const nick = jugador.nickname?.trim();
  if (nick) return nick;
  return jugador.nombre ?? "";
}

/** Primera paraula del nom visible (per salutacions). */
export function getNombreSaludo(jugador) {
  const visible = getNombre(jugador);
  if (!visible) return "";
  return visible.split(/\s+/)[0] || visible;
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
