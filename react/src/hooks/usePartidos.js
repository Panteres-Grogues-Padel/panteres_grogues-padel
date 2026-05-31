import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PARTIDOS_INICIALES } from "../utils/mockData";
import { supabase } from "../lib/supabase";
import { createActivityLog, createNotifications, notificacionDuplicada } from "../lib/engagement";
import {
  fechaPartidoFromSlot,
  formatDiaPartidoLabel,
  formatHoraInput,
  getDiaSemanaLocal,
  getFechasVentanaPartidos,
  getLunesDeSemanaLocal,
  getLunesSemanaActual,
  normalizeSemanaDate
} from "../utils/dates";
import { expandFranjasToPistas, shufflePistasPlan, validarFranjas } from "../utils/franjasPartidos";
import { t } from "../i18n";
import { isJugadorUuid } from "../utils/jugador";
import { getNombreVisible } from "../utils/nombres";

function strId(id) {
  return id == null ? id : String(id);
}

function partidoPistaKey(p) {
  return String(p.pistaId ?? p.id);
}

/** Una fila por pista; evita duplicados por cargas concurrentes o merges repetidos. */
function dedupePartidos(items) {
  const byPista = new Map();
  for (const p of items ?? []) {
    byPista.set(partidoPistaKey(p), p);
  }
  return [...byPista.values()];
}

function mergePartidosSlot(prev, slotId, semana, incoming) {
  const semanaNorm = normalizeSemanaDate(semana);
  const sid = String(slotId);
  const rest = prev.filter(
    (p) => !(String(p.slotId) === sid && normalizeSemanaDate(p.semana) === semanaNorm)
  );
  return dedupePartidos([...incoming, ...rest]);
}

function flattenPartidos(data) {
  const items = [];
  (data ?? []).forEach((pg) => {
    (pg.pistas_partido ?? []).forEach((pista) => {
      const jugadoresOrdenados = [...(pista.jugadores_pista ?? [])]
        .sort((a, b) => a.posicion - b.posicion)
        .map((jp) => ({
          id: jp.id,
          jugadorId: jp.jugador_id,
          nombre: getNombreVisible(jp.jugadores) || t("common.player"),
          nickname: jp.jugadores?.nickname?.trim() || null,
          nombreCompleto: jp.jugadores?.nombre_completo ?? jp.jugadores?.nombre ?? t("common.player"),
          posicion: jp.posicion,
          confirmado: Boolean(jp.confirmado)
        }));

      items.push({
        id: pista.id,
        pistaId: pista.id,
        numeroPista: pista.numero_pista,
        partidoGeneradoId: pg.id,
        slotId: pg.slot_id,
        slotLabel: pg.slots?.label ?? pg.slot_id,
        club: pg.slots?.club ?? "",
        diaSemana: pg.slots?.dia_semana ?? null,
        semana: normalizeSemanaDate(pg.semana),
        fechaPartido: fechaPartidoFromSlot(pg.semana, pg.slots?.dia_semana),
        numPistasGenerado: Number(pg.num_pistas ?? 0),
        numIndoorGenerado: Number(pg.num_indoor ?? 0),
        indoor: Boolean(pista.es_indoor),
        hora: formatHoraInput(pista.hora),
        jugadores: jugadoresOrdenados
      });
    });
  });
  return items;
}

function getFechaPartido(semana, diaSemana) {
  if (!semana || diaSemana === null || diaSemana === undefined) return "";
  const d = new Date(`${semana}T00:00:00`);
  d.setDate(d.getDate() + Number(diaSemana));
  return d.toISOString().slice(0, 10);
}

function groupsOf4(jugadoresOrdenados) {
  const groups = [];
  for (let i = 0; i + 3 < jugadoresOrdenados.length; i += 4) {
    groups.push(jugadoresOrdenados.slice(i, i + 4));
  }
  return groups;
}

async function borrarPartidosGeneradosSlotSemana(slotId, semanaNorm) {
  const { data, error: fetchErr } = await rpcGetPartidosSlot(slotId, semanaNorm);
  if (fetchErr) return { ok: false, error: fetchErr.message };

  const partidosSlot = flattenPartidos(rowsFromRpcPartidos(data));
  if (!partidosSlot.length) return { ok: true, deleted: false };

  const pistaIds = partidosSlot.map((p) => p.pistaId ?? p.id).filter(Boolean);
  const partidoGeneradoIds = [
    ...new Set(partidosSlot.map((p) => p.partidoGeneradoId).filter(Boolean))
  ];

  if (pistaIds.length) {
    const { error: resErr } = await supabase.from("resultados").delete().in("pista_id", pistaIds);
    if (resErr) return { ok: false, error: resErr.message };

    const { error: jpErr } = await supabase.from("jugadores_pista").delete().in("pista_id", pistaIds);
    if (jpErr) return { ok: false, error: jpErr.message };
  }

  const { error: ppErr } = await supabase
    .from("pistas_partido")
    .delete()
    .in("partido_generado_id", partidoGeneradoIds);
  if (ppErr) return { ok: false, error: ppErr.message };

  const { error: pgErr } = await supabase
    .from("partidos_generados")
    .delete()
    .eq("slot_id", slotId)
    .eq("semana", semanaNorm);
  if (pgErr) return { ok: false, error: pgErr.message };

  return { ok: true, deleted: true };
}

async function reindexPista(pistaId) {
  const { data, error } = await supabase
    .from("jugadores_pista")
    .select("id,posicion")
    .eq("pista_id", pistaId)
    .order("posicion", { ascending: true });
  if (error || !data) return;

  await Promise.all(
    data.map((row, idx) =>
      supabase.from("jugadores_pista").update({ posicion: idx + 1 }).eq("id", row.id)
    )
  );
}

function rowsFromRpcPartidos(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

async function rpcGetPartidosSlot(slotId, semanaNorm) {
  return supabase.rpc("get_partidos_slot", {
    p_slot_id: slotId,
    p_semana: semanaNorm
  });
}

async function rpcGetPartidosGeneradosAll() {
  return supabase.rpc("get_partidos_generados", {
    p_slot_id: null,
    p_semana: null
  });
}

export function usePartidos(currentUser) {
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);
  const pistaCompletaSentRef = useRef(new Set());
  const slotLoadGenRef = useRef(0);

  const loadPartidos = useCallback(async () => {
    if (useFallback) return { ok: false, skipped: true };
    setLoading(true);
    setError("");
    const { data: slotsData, error: slotsErr } = await supabase
      .from("slots")
      .select("id,dia_semana")
      .eq("activo", true);

    if (slotsErr) {
      setLoading(false);
      setError(slotsErr.message);
      console.warn("[loadPartidos] error slots", slotsErr.message);
      return { ok: false, error: slotsErr.message };
    }

    const slotsCatalog = (slotsData ?? []).map((s) => ({
      id: s.id,
      diaSemana: Number(s.dia_semana)
    }));
    const fechasVentana = getFechasVentanaPartidos(slotsCatalog);
    const cargas = new Map();

    for (const fecha of fechasVentana) {
      const ds = getDiaSemanaLocal(fecha);
      const semanaObjetivo = getLunesDeSemanaLocal(fecha);
      for (const s of slotsCatalog) {
        if (s.diaSemana !== ds) continue;
        cargas.set(`${s.id}:${semanaObjetivo}`, { slotId: s.id, semanaObjetivo });
      }
    }

    let flat = [];

    for (const { slotId, semanaObjetivo } of cargas.values()) {
      const { data, error: rpcErr } = await rpcGetPartidosSlot(slotId, semanaObjetivo);
      if (rpcErr) {
        setLoading(false);
        setError(rpcErr.message);
        console.warn("[loadPartidos] error", rpcErr.message);
        return { ok: false, error: rpcErr.message };
      }
      flat.push(...flattenPartidos(rowsFromRpcPartidos(data)));
    }

    const { data: historico, error: histErr } = await rpcGetPartidosGeneradosAll();
    if (histErr) {
      setLoading(false);
      setError(histErr.message);
      console.warn("[loadPartidos] error historico", histErr.message);
      return { ok: false, error: histErr.message };
    }
    flat.push(...flattenPartidos(rowsFromRpcPartidos(historico)));

    flat = dedupePartidos(flat);
    setLoading(false);
    setPartidos((prev) => {
      if (flat.length > 0) return flat;
      if (prev.length > 0) {
        console.warn(
          "[loadPartidos] La query devolvió 0 pistas; se mantiene el último estado local para evitar vaciar Resultados durante una recarga."
        );
        return prev;
      }
      return flat;
    });
    return { ok: true, count: flat.length };
  }, [useFallback]);

  const loadPartidosForSlot = useCallback(
    async (slotId, semana) => {
      if (useFallback || !slotId) return { ok: false, skipped: true };
      const semanaNorm = normalizeSemanaDate(semana);
      const gen = ++slotLoadGenRef.current;
      setLoading(true);
      setError("");
      const { data, error } = await rpcGetPartidosSlot(slotId, semanaNorm);

      if (gen !== slotLoadGenRef.current) {
        return { ok: false, skipped: true };
      }

      setLoading(false);
      if (error) {
        setError(error.message);
        return { ok: false, error: error.message };
      }

      const flat = dedupePartidos(flattenPartidos(rowsFromRpcPartidos(data)));
      setPartidos((prev) => mergePartidosSlot(prev, slotId, semanaNorm, flat));
      return { ok: true, count: flat.length };
    },
    [useFallback]
  );

  useEffect(() => {
    if (useFallback) {
      setPartidos(PARTIDOS_INICIALES);
      setLoading(false);
      setError("");
      return;
    }
    void loadPartidos();
  }, [loadPartidos, useFallback]);

  useEffect(() => {
    if (useFallback) return undefined;
    const channel = supabase
      .channel("partidos_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "partidos_generados" }, loadPartidos)
      .on("postgres_changes", { event: "*", schema: "public", table: "pistas_partido" }, loadPartidos)
      .on("postgres_changes", { event: "*", schema: "public", table: "jugadores_pista" }, loadPartidos)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPartidos, useFallback]);

  const partidosAgrupados = useMemo(() => {
    const map = {};
    partidos.forEach((p) => {
      if (!map[p.fecha]) map[p.fecha] = [];
      map[p.fecha].push(p);
    });
    return map;
  }, [partidos]);

  async function generarPartidos({
    jugadoresRanking,
    slotId,
    semana,
    currentUserId,
    franjas,
    slotMeta
  }) {
    const val = validarFranjas(franjas);
    if (!val.ok) return val;

    const pistasPlan = shufflePistasPlan(expandFranjasToPistas(franjas));

    console.log("Generando partidos...");
    if (useFallback) {
      const maxTit = pistasPlan.length * 4;
      const titulares = maxTit > 0 ? jugadoresRanking.slice(0, maxTit) : jugadoresRanking;
      const generados = groupsOf4(titulares).map((g, idx) => {
        const slot = pistasPlan[idx] ?? { hora: "", esIndoor: false };
        return {
          id: `${Date.now()}-${idx}`,
          pistaId: `${Date.now()}-${idx}`,
          numeroPista: idx + 1,
          partidoGeneradoId: `pg-${Date.now()}`,
          slotId,
          slotLabel: slotId,
          club: "",
          semana,
          indoor: slot.esIndoor,
          hora: slot.hora,
          jugadores: g.map((j, i) => ({
            jugadorId: j.id,
            nombre: j.nombre,
            nombreCompleto: j.nombreCompleto,
            posicion: i + 1,
            confirmado: false
          }))
        };
      });
      setPartidos((prev) => [...generados, ...prev]);
      return { ok: true, cantidad: generados.length };
    }

    // Misma clave que useSlots (lunes UTC de la semana actual), no la fecha del día del slot.
    const semanaNorm = getLunesSemanaActual();

    if (!isJugadorUuid(currentUserId)) {
      return { ok: false, error: t("hooks.partidos.invalidPlayerId") };
    }

    const { data: inscripciones, error: insError } = await supabase
      .from("inscripciones")
      .select("jugador_id, inscrito_at, jugadores(id, nombre, nombre_completo)")
      .eq("slot_id", slotId)
      .eq("semana", semanaNorm);
    if (insError) return { ok: false, error: insError.message };

    const rankIndexById = new Map();
    (jugadoresRanking ?? []).forEach((j, idx) => {
      rankIndexById.set(strId(j.id), idx);
    });

    const filas = (inscripciones ?? []).map((ins) => {
      const jid = strId(ins.jugador_id);
      const j = ins.jugadores;
      return {
        id: jid,
        nombre: j?.nombre ?? t("common.player"),
        nombreCompleto: j?.nombre_completo ?? j?.nombre ?? t("common.player"),
        rankIdx: rankIndexById.has(jid) ? rankIndexById.get(jid) : Number.MAX_SAFE_INTEGER,
        inscritoTs: ins.inscrito_at ? new Date(ins.inscrito_at).getTime() : 0
      };
    });
    filas.sort((a, b) => {
      if (a.rankIdx !== b.rankIdx) return a.rankIdx - b.rankIdx;
      return a.inscritoTs - b.inscritoTs;
    });
    const candidatos = filas.map(({ id, nombre, nombreCompleto }) => ({ id, nombre, nombreCompleto }));

    console.log("[generarPartidos] inscritos y candidatos", {
      slotId,
      semanaParam: semana,
      semanaQuery: semanaNorm,
      filasInscripciones: inscripciones?.length ?? 0,
      candidatos: candidatos.length,
      enRankingDe: (jugadoresRanking ?? []).length,
      conFilaRanking: filas.filter((f) => f.rankIdx < Number.MAX_SAFE_INTEGER).length,
      muestraNombres: candidatos.slice(0, 12).map((c) => c.nombre)
    });

    const maxTit = pistasPlan.length * 4;
    const titulares = maxTit > 0 ? candidatos.slice(0, maxTit) : candidatos;
    const grupos = groupsOf4(titulares);
    if (!grupos.length) {
      return { ok: false, error: t("hooks.partidos.notEnoughPlayers") };
    }
    if (grupos.length > pistasPlan.length) {
      return {
        ok: false,
        error: t("hooks.partidos.notEnoughCourts", { groups: grupos.length, courts: pistasPlan.length })
      };
    }

    const delRes = await borrarPartidosGeneradosSlotSemana(slotId, semanaNorm);
    if (!delRes.ok) return { ok: false, error: delRes.error };

    const numIndoorCreadas = pistasPlan.slice(0, grupos.length).filter((s) => s.esIndoor).length;

    const { data: inserted, error: pgError } = await supabase
      .from("partidos_generados")
      .insert({
        slot_id: slotId,
        semana: semanaNorm,
        num_pistas: grupos.length,
        num_indoor: numIndoorCreadas,
        generado_por: currentUserId
      })
      .select("id")
      .single();
    if (pgError) return { ok: false, error: pgError.message };

    const partidoGeneradoId = inserted.id;
    const pistasCreadas = [];

    for (let i = 0; i < grupos.length; i += 1) {
      const plan = pistasPlan[i];
      const { data: pista, error: pistaError } = await supabase
        .from("pistas_partido")
        .insert({
          partido_generado_id: partidoGeneradoId,
          numero_pista: i + 1,
          es_indoor: plan.esIndoor,
          hora: plan.hora || null
        })
        .select("id")
        .single();
      if (pistaError) return { ok: false, error: pistaError.message };

      const jugadoresPista = grupos[i].map((j, idx) => ({
        pista_id: pista.id,
        jugador_id: j.id,
        posicion: idx + 1,
        confirmado: false
      }));
      const { error: jpError } = await supabase.from("jugadores_pista").insert(jugadoresPista);
      if (jpError) return { ok: false, error: jpError.message };

      pistasCreadas.push({
        pistaId: pista.id,
        numeroPista: i + 1,
        esIndoor: plan.esIndoor,
        hora: plan.hora,
        grupo: grupos[i]
      });
    }

    const optItems = pistasCreadas.map((pc) => ({
      id: pc.pistaId,
      pistaId: pc.pistaId,
      numeroPista: pc.numeroPista,
      partidoGeneradoId,
      slotId,
      slotLabel: slotMeta?.label ?? slotId,
      club: slotMeta?.club ?? "",
      diaSemana: slotMeta?.diaSemana ?? null,
      semana: semanaNorm,
      numPistasGenerado: grupos.length,
      numIndoorGenerado: numIndoorCreadas,
      indoor: pc.esIndoor,
      hora: pc.hora,
      jugadores: pc.grupo.map((j, idx) => ({
        id: `${pc.pistaId}-jp-${idx}`,
        jugadorId: j.id,
        nombre: j.nombre,
        nombreCompleto: j.nombreCompleto ?? j.nombre,
        posicion: idx + 1,
        confirmado: false
      }))
    }));

    setPartidos((prev) => mergePartidosSlot(prev, slotId, semanaNorm, optItems));

    const loadRes = await loadPartidosForSlot(slotId, semanaNorm);
    if (loadRes && loadRes.ok === false && loadRes.error) {
      console.warn("[generarPartidos] loadPartidosForSlot falló tras insertar; UI usa filas optimistas.", loadRes.error);
    }
    const activityText = delRes.deleted
      ? t("hooks.partidos.activity.regenerate")
      : t("hooks.partidos.activity.generate", {
          slot: slotId,
          week: semanaNorm,
          courts: grupos.length
        });
    await createActivityLog({
      jugadorId: currentUserId,
      tipo: "partidos",
      texto: activityText
    });
    const club = slotMeta?.club ?? "";
    const diaLabel =
      formatDiaPartidoLabel(fechaPartidoFromSlot(semanaNorm, slotMeta?.diaSemana)) ||
      slotMeta?.label ||
      t("hooks.partidos.notifications.slotDay");
    const notifTitulo = delRes.deleted
      ? t("hooks.partidos.notifications.regeneratedTitle")
      : t("hooks.partidos.notifications.generatedTitle");
    const notifTexto = t("hooks.partidos.notifications.generatedText", { day: diaLabel, club });
    const notifications = grupos
      .flatMap((g) => g)
      .map((j) => ({
        jugadorId: j.id,
        tipo: "partidos_generats",
        titulo: notifTitulo,
        texto: notifTexto,
        data: {
          fecha: fechaPartidoFromSlot(semanaNorm, slotMeta?.diaSemana),
          slot_id: slotId
        }
      }));
    await createNotifications(notifications);
    return { ok: true, cantidad: grupos.length };
  }

  async function asignarHora(partidoId, hora) {
    if (useFallback) {
      setPartidos((prev) => prev.map((p) => (p.id === partidoId ? { ...p, hora } : p)));
      return { ok: true };
    }
    const { error: updateError } = await supabase.rpc("asignar_hora_partido", {
      p_pista_id: partidoId,
      p_hora: hora ?? ""
    });
    if (updateError) return { ok: false, error: updateError.message };
    const partido = partidos.find((p) => p.id === partidoId);
    if (partido?.slotId && partido?.semana) {
      await loadPartidosForSlot(partido.slotId, partido.semana);
    } else {
      await loadPartidos();
    }
    return { ok: true };
  }

  async function toggleIndoor(partidoId) {
    if (useFallback) {
      setPartidos((prev) => prev.map((p) => (p.id === partidoId ? { ...p, indoor: !p.indoor } : p)));
      return { ok: true };
    }
    const partido = partidos.find((p) => p.id === partidoId);
    if (!partido) return { ok: false, error: t("hooks.partidos.matchNotFound") };
    const { error: updateError } = await supabase
      .from("pistas_partido")
      .update({ es_indoor: !partido.indoor })
      .eq("id", partidoId);
    if (updateError) return { ok: false, error: updateError.message };
    if (partido?.slotId && partido?.semana) {
      await loadPartidosForSlot(partido.slotId, partido.semana);
    } else {
      await loadPartidos();
    }
    return { ok: true };
  }

  async function moverJugador(partidoIdOrigen, partidoIdDestino, jugadorId) {
    const origen = partidos.find((p) => p.id === partidoIdOrigen);
    const destino = partidos.find((p) => p.id === partidoIdDestino);
    if (!origen || !destino) return false;
    const jugador = origen.jugadores.find((j) => j.jugadorId === jugadorId);
    if (!jugador) return false;
    if (destino.jugadores.length >= 4) return false;

    if (useFallback) {
      setPartidos((prev) =>
        prev.map((p) => {
          if (p.id === partidoIdOrigen) {
            return { ...p, jugadores: p.jugadores.filter((j) => j.jugadorId !== jugadorId) };
          }
          if (p.id === partidoIdDestino) {
            return {
              ...p,
              jugadores: [...p.jugadores, { ...jugador, posicion: p.jugadores.length + 1 }]
            };
          }
          return p;
        })
      );
      return true;
    }

    const registro = origen.jugadores.find((j) => j.jugadorId === jugadorId);
    const { data: row } = await supabase
      .from("jugadores_pista")
      .select("id")
      .eq("pista_id", partidoIdOrigen)
      .eq("jugador_id", jugadorId)
      .single();
    if (!row) return false;

    const { error: moveError } = await supabase
      .from("jugadores_pista")
      .update({ pista_id: partidoIdDestino, posicion: destino.jugadores.length + 1 })
      .eq("id", row.id);
    if (moveError) return false;

    await reindexPista(partidoIdOrigen);
    await reindexPista(partidoIdDestino);
    if (registro?.confirmado) {
      await supabase
        .from("jugadores_pista")
        .update({ confirmado: false, confirmado_at: null })
        .eq("id", row.id);
    }
    if (origen?.slotId && origen?.semana) {
      await loadPartidosForSlot(origen.slotId, origen.semana);
    } else {
      await loadPartidos();
    }
    return true;
  }

  async function notificarPistaCompleta(partido) {
    if (!partido?.jugadores?.length || partido.jugadores.length !== 4) return;
    if (pistaCompletaSentRef.current.has(partido.id)) return;

    const diaLabel = formatDiaPartidoLabel(partido.fechaPartido);
    const titulo = t("hooks.partidos.notifications.courtCompleteTitle");
    const texto = t("hooks.partidos.notifications.courtCompleteText", {
      day: diaLabel,
      club: partido.club
    });

    const pending = [];
    for (const j of partido.jugadores) {
      if (!isJugadorUuid(j.jugadorId)) continue;
      const duplicada = await notificacionDuplicada({
        jugadorId: j.jugadorId,
        tipo: "partidos",
        titulo,
        texto
      });
      if (!duplicada) {
        pending.push({ jugadorId: j.jugadorId, tipo: "partidos", titulo, texto });
      }
    }
    if (pending.length) await createNotifications(pending);
    pistaCompletaSentRef.current.add(partido.id);
  }

  async function confirmarAsistencia(partidoId, jugadorId, confirmado) {
    const partido = partidos.find((p) => p.id === partidoId);
    const seraPistaCompleta =
      Boolean(confirmado) &&
      partido?.jugadores?.length === 4 &&
      partido.jugadores.every((j) => (j.jugadorId === jugadorId ? true : j.confirmado));

    if (useFallback) {
      setPartidos((prev) =>
        prev.map((p) =>
          p.id === partidoId
            ? {
                ...p,
                jugadores: p.jugadores.map((j) =>
                  j.jugadorId === jugadorId ? { ...j, confirmado } : j
                )
              }
            : p
        )
      );
      if (seraPistaCompleta && partido) {
        const actualizado = {
          ...partido,
          jugadores: partido.jugadores.map((j) =>
            j.jugadorId === jugadorId ? { ...j, confirmado: true } : j
          )
        };
        await notificarPistaCompleta(actualizado);
      }
      return { ok: true };
    }
    const { error: updateError } = await supabase
      .from("jugadores_pista")
      .update({
        confirmado,
        confirmado_at: confirmado ? new Date().toISOString() : null
      })
      .eq("pista_id", partidoId)
      .eq("jugador_id", jugadorId);
    if (updateError) return { ok: false, error: updateError.message };

    if (seraPistaCompleta && partido) {
      const actualizado = {
        ...partido,
        jugadores: partido.jugadores.map((j) =>
          j.jugadorId === jugadorId ? { ...j, confirmado: true } : j
        )
      };
      await notificarPistaCompleta(actualizado);
    }

    if (partido?.slotId && partido?.semana) {
      await loadPartidosForSlot(partido.slotId, partido.semana);
    } else {
      await loadPartidos();
    }
    return { ok: true };
  }

  return {
    partidos,
    setPartidos,
    partidosAgrupados,
    loading,
    error,
    generarPartidos,
    loadPartidosForSlot,
    asignarHora,
    toggleIndoor,
    moverJugador,
    confirmarAsistencia
  };
}
