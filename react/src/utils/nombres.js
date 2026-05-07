export function nombreCorto(nombreCompleto) {
  const parts = nombreCompleto.trim().split(/\s+/);
  const nombre = parts[0];
  const aps = [parts[1], parts[2]]
    .filter(Boolean)
    .map((ap) => ap[0].toUpperCase())
    .join("");
  return nombre + (aps ? ` ${aps}` : "");
}
