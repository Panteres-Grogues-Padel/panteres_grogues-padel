/** Carné visible derivado del id (no hay columna `numero_socio` en el esquema actual). */
export function numeroSocioPanteres(id) {
  if (id == null || id === "") return "—";
  const s = String(id).replace(/-/g, "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  const n = 100000 + (h % 900000);
  return `PG-${n}`;
}
