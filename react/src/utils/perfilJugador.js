import { normalizeJugadorUuid } from "./jugador";

export function mapPerfilFromRpc(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: normalizeJugadorUuid(row.id),
    nombre: row.nombre ?? "",
    nickname: row.nickname?.trim() || null,
    nombreCompleto: row.nombre_completo ?? row.nombre ?? "",
    telefono: row.telefono ?? "",
    instagram: row.instagram ?? "",
    foto_url: row.foto_url ?? null,
    mostrar_telefono: Boolean(row.mostrar_telefono),
    autoriza_instagram: Boolean(row.autoriza_instagram),
    pj: row.partidos_jugados ?? 0,
    pg: row.partidos_ganados ?? 0,
    jj: row.juegos_jugados ?? 0,
    jg: row.juegos_ganados ?? 0,
    eficacia: row.eficacia ?? 0,
    penalizacion: row.penalizacion ?? 0,
    score: row.score ?? 0
  };
}
