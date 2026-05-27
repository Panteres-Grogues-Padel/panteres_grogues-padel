import { avatarUrl, avatarUrlBase } from "./avatarUrl";
import { normalizeJugadorUuid } from "./jugador";

export function mapPerfilFromRpc(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: normalizeJugadorUuid(row.id),
    nombre: row.nombre ?? "",
    nickname: row.nickname?.trim() || null,
    nombreCompleto: row.nombre_completo ?? row.nombre ?? "",
    telefono: row.telefono ?? "",
    instagram: (row.instagram ?? "").replace(/^@/, "").trim(),
    foto_url: avatarUrlBase(row.foto_url) ?? null,
    ocultar_telefon: Boolean(
      row.ocultar_telefon ?? (row.mostrar_telefono != null ? !row.mostrar_telefono : false)
    ),
    mostrar_telefono: Boolean(row.mostrar_telefono),
    autoriza_instagram: Boolean(row.autoriza_instagram),
    es_coordinador: Boolean(row.es_coordinador),
    auth_id: row.auth_id ?? null,
    email: row.email ?? null,
    activo: row.activo ?? true,
    sancionat: Boolean(row.sancionat),
    sancio_fins: row.sancio_fins ?? null,
    pj: row.partidos_jugados ?? 0,
    pg: row.partidos_ganados ?? 0,
    jj: row.juegos_jugados ?? 0,
    jg: row.juegos_ganados ?? 0,
    eficacia: row.eficacia ?? 0,
    penalizacion: row.penalizacion ?? 0,
    score: row.score ?? 0
  };
}

/** Fusiona dades de perfil sense perdre foto_url vàlida. */
export function mergePerfilView(prev, mapped) {
  if (!mapped) return prev;
  if (!prev) return mapped;
  const fotoBase = mapped.foto_url || prev.foto_url || null;
  return { ...prev, ...mapped, foto_url: fotoBase };
}

export async function fetchPerfilJugadorRpc(client, jugadorId) {
  if (!client || !jugadorId) return { ok: false, perfil: null };
  const { data, error } = await client.rpc("get_perfil_jugador", { p_jugador_id: jugadorId });
  if (error) return { ok: false, error: error.message, perfil: null };
  return { ok: true, perfil: mapPerfilFromRpc(data) };
}

export async function fetchMiPerfilJugadorRpc(client) {
  if (!client) return { ok: false, perfil: null };
  const { data, error } = await client.rpc("get_mi_perfil_jugador", {});
  if (error) return { ok: false, error: error.message, perfil: null };
  return { ok: true, perfil: mapPerfilFromRpc(data) };
}

export async function actualizarPerfilJugadorRpc(
  client,
  jugadorId,
  { nickname, telefono, instagram, ocultar_telefon }
) {
  if (!client || !jugadorId) return { ok: false, perfil: null };
  const { data, error } = await client.rpc("actualizar_perfil_jugador", {
    p_jugador_id: jugadorId,
    p_telefon: telefono ?? "",
    p_instagram: instagram ?? "",
    p_ocultar_telefon: Boolean(ocultar_telefon),
    p_nickname: nickname ?? ""
  });
  if (error) return { ok: false, error: error.message, perfil: null };
  return { ok: true, perfil: mapPerfilFromRpc(data) };
}
