/** Misma lógica que en `DetalleSlot.jsx` (lista de inscritos). */
const AVATAR_CLASSES = ["av-teal", "av-purple", "av-coral", "av-blue", "av-amber", "av-pink", "av-green", "av-gray"];

export function initialsFromNombre(nombre = "") {
  return nombre
    .split(/[\s_]/)
    .map((w) => w?.[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function avatarClassFromNombre(nombre = "") {
  return AVATAR_CLASSES[(nombre.charCodeAt(0) || 0) % AVATAR_CLASSES.length];
}
