import { getNombreVisible } from "./nombres";
import { hoyLocalStr } from "./dates";

export function mapJugadorAdminRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: String(row.id),
    nombre: row.nombre ?? "",
    primer_apellido: row.primer_apellido ?? "",
    segundo_apellido: row.segundo_apellido ?? "",
    nickname: row.nickname?.trim() || "",
    nombre_completo: row.nombre_completo ?? row.nombre ?? "",
    email: row.email ?? "",
    numero_socio: row.numero_socio ?? "",
    id_app_antigua: row.id_app_antigua ?? "",
    es_coordinador: Boolean(row.es_coordinador),
    es_super_admin: Boolean(row.es_super_admin),
    es_tesorero: Boolean(row.es_tesorero),
    activo: row.activo !== false,
    sancionat: Boolean(row.sancionat),
    sancio_fins: row.sancio_fins ?? null,
    auth_id: row.auth_id ?? null
  };
}

/** actiu | inactiu | sancionat | pendent */
export function estadoJugador(j) {
  if (!j) return "inactiu";
  if (j.sancionat) return "sancionat";
  if (j.activo) return "actiu";
  if (!j.auth_id) return "pendent";
  return "inactiu";
}

export function nombreAdminJugador(j) {
  return getNombreVisible(j) || j.nombre_completo || j.nombre || "—";
}

export function periodoAnualActual(now = new Date()) {
  return String(now.getFullYear());
}

export function periodoTrimestralActual(now = new Date()) {
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-T${quarter}`;
}

export function cuotaPagada(cuotas, tipo, periodo) {
  return (cuotas ?? []).some((c) => c.tipo === tipo && c.periodo === periodo && c.pagada);
}

export function sancioVigent(j, hoy = hoyLocalStr()) {
  return Boolean(j?.sancionat && j?.sancio_fins && j.sancio_fins >= hoy);
}

export function filtrarJugadoresBusqueda(jugadores, query) {
  const q = query.trim().toLowerCase();
  if (!q) return jugadores;
  return jugadores.filter((j) => {
    const haystack = [
      j.nombre,
      j.primer_apellido,
      j.segundo_apellido,
      j.nickname,
      j.nombre_completo,
      j.email,
      j.numero_socio
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
