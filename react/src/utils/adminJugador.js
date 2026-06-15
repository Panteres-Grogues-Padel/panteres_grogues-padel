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

export function cuotaDelPeriodo(cuotas, tipo, periodo) {
  return (cuotas ?? []).find((c) => c.tipo === tipo && c.periodo === periodo) ?? null;
}

/** Calcula fecha_inicio / fecha_fin (YYYY-MM-DD) según tipo y periodo. */
export function fechasCuotaDesdePeriodo(tipo, periodo) {
  if (tipo === "anual") {
    const year = Number.parseInt(String(periodo).trim(), 10);
    if (!Number.isFinite(year)) return null;
    return {
      fecha_inicio: `${year}-01-01`,
      fecha_fin: `${year}-12-31`
    };
  }

  if (tipo === "trimestral") {
    const m = /^(\d{4})-T([1-4])$/.exec(String(periodo).trim());
    if (!m) return null;
    const year = Number.parseInt(m[1], 10);
    const trim = Number.parseInt(m[2], 10);
    const rangos = {
      1: { fecha_inicio: `${year}-01-01`, fecha_fin: `${year}-03-31` },
      2: { fecha_inicio: `${year}-04-01`, fecha_fin: `${year}-06-30` },
      3: { fecha_inicio: `${year}-07-01`, fecha_fin: `${year}-09-30` },
      4: { fecha_inicio: `${year}-10-01`, fecha_fin: `${year}-12-31` }
    };
    return rangos[trim] ?? null;
  }

  return null;
}

/** Fechas a mostrar: de la fila en BD o calculadas del período actual. */
export function fechasCuotaDisplay(cuotas, tipo, periodo) {
  const row = cuotaDelPeriodo(cuotas, tipo, periodo);
  if (row?.fecha_inicio && row?.fecha_fin) {
    return { fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin };
  }
  return fechasCuotaDesdePeriodo(tipo, periodo);
}

export function formatCuotaFecha(isoDate) {
  if (!isoDate) return "";
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return d.toLocaleDateString("ca-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatRangoCuota(fechas) {
  if (!fechas?.fecha_inicio || !fechas?.fecha_fin) return "";
  return `${formatCuotaFecha(fechas.fecha_inicio)} – ${formatCuotaFecha(fechas.fecha_fin)}`;
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
