import { useEffect, useMemo, useRef, useState } from "react";
import { SLOTS_INICIALES } from "../utils/mockData";
import { isBajaWarning, isNextWeekSlotOpen, isSlotOpen, sameDiaSemanaSlot } from "../utils/slots";
import { supabase } from "../lib/supabase";
import { createActivityLog, createNotifications, notificacionDuplicada } from "../lib/engagement";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";
import { addDaysYmd, formatTimeMadrid } from "../utils/datetime";
import {
  fechaPartidoFromSlot,
  formatDiaPartidoLabel,
  getLunesSemanaActual,
  hoyLocalStr
} from "../utils/dates";

/** Extrae YYYY-MM-DD de cualquier valor que devuelva Supabase para columnas `date`. */
function normalizeSemana(v) {
  if (!v) return "";
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function formatTsStr(isoTs) {
  return formatTimeMadrid(isoTs);
}

function jugadorCoincide(insJugadorId, userId) {
  const a = normalizeJugadorUuid(insJugadorId);
  const b = normalizeJugadorUuid(userId);
  return isJugadorUuid(a) && isJugadorUuid(b) && a === b;
}

/** Enriquece las filas de inscripciones con el nombre del jugador. */
async function cargarNombres(rows) {
  const ids = [...new Set(rows.map((r) => normalizeJugadorUuid(r.jugador_id)).filter((id) => isJugadorUuid(id)))];
  const byId = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase.from("jugadores").select("id,nombre").in("id", ids.slice(i, i + 200));
    for (const j of data ?? []) byId[normalizeJugadorUuid(j.id)] = j.nombre ?? "";
  }
  return rows.map((row) => ({
    ...row,
    jugadores: { nombre: byId[normalizeJugadorUuid(row.jugador_id)] || row.jugador_id }
  }));
}

// --- Hook ---

function diffDiasHasta(fechaStr, hoyStr = hoyLocalStr()) {
  const t0 = new Date(`${hoyStr}T00:00:00`).getTime();
  const t1 = new Date(`${fechaStr}T00:00:00`).getTime();
  return Math.floor((t1 - t0) / (1000 * 60 * 60 * 24));
}

export function useSlots(currentUser, authEpoch = 0) {
  const [slots, setSlots] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slotsNotice, setSlotsNotice] = useState("");
  const recordatoriosInscRef = useRef(new Set());

  const userId = currentUser?.id ? normalizeJugadorUuid(currentUser.id) : "";

  useEffect(() => {
    const tieneId = isJugadorUuid(userId);

    if (!supabase || !tieneId) {
      setInscripciones([]);
      setSlots(SLOTS_INICIALES);
      setSlotsNotice("");
      setLoading(false);
      return;
    }

    // Limpiar inscripciones del usuario anterior antes de cualquier await
    setInscripciones([]);
    setLoading(true);

    let cancelled = false;

    (async () => {
      try {
        // Cargar definiciones de slots
        const { data: slotsData, error: slotsErr } = await supabase
          .from("slots")
          .select("id,label,club,dia_semana,pistas_default,pistas_activo,hora_cierre")
          .eq("activo", true)
          .order("dia_semana", { ascending: true })
          .order("id", { ascending: true });

        if (cancelled) return;

        if (slotsErr || !slotsData?.length) {
          setSlotsNotice(slotsErr?.message ?? "No hay slots activos. Se muestran slots de respaldo.");
          setSlots(SLOTS_INICIALES);
        } else {
          setSlotsNotice("");
          setSlots(
            slotsData.map((s) => ({
              id: s.id,
              label: s.label,
              club: s.club,
              diaSemana: s.dia_semana,
              horaCierre: s.hora_cierre ?? null,
              pistas: Number(s.pistas_activo ?? 0),
              pistasDefault: Number(s.pistas_default ?? 0),
              jugadores: []
            }))
          );
        }

        // Cargar inscripciones: rango de -2 a +4 semanas desde el lunes actual
        const lunes = getLunesSemanaActual();
        const desde = addDaysYmd(lunes, -14);
        const hasta = addDaysYmd(lunes, 28);

        const { data: inscData, error: inscErr } = await supabase.rpc("get_inscripciones", {
          p_desde: desde,
          p_hasta: hasta
        });

        if (cancelled) return;

        if (inscErr) {
          setSlotsNotice("Error al cargar inscripciones: " + inscErr.message);
        } else {
          const conNombres = await cargarNombres(inscData ?? []);
          if (!cancelled) setInscripciones(conNombres);
        }
      } catch (err) {
        if (!cancelled) setSlotsNotice("Error al cargar datos: " + (err?.message ?? String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, currentUser?.auth_id, authEpoch]);

  useEffect(() => {
    if (!supabase || !isJugadorUuid(userId)) return undefined;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED")) {
        return;
      }
      void reloadInscripciones();
    });

    return () => listener.subscription.unsubscribe();
  }, [userId, authEpoch]);

  useEffect(() => {
    if (!supabase || !isJugadorUuid(userId) || loading || !slots.length) return undefined;

    let cancelled = false;

    (async () => {
      const misInscripciones = inscripciones.filter((i) => jugadorCoincide(i.jugador_id, userId));

      for (const ins of misInscripciones) {
        if (cancelled) return;
        const slot = slots.find((s) => s.id === ins.slot_id);
        if (!slot) continue;

        const semana = normalizeSemana(ins.semana);
        const fechaPartido = fechaPartidoFromSlot(semana, slot.diaSemana);
        if (!fechaPartido || diffDiasHasta(fechaPartido) !== 2) continue;

        const dedupeKey = `${userId}:${ins.slot_id}:${semana}`;
        if (recordatoriosInscRef.current.has(dedupeKey)) continue;

        const diaLabel = formatDiaPartidoLabel(fechaPartido);
        const texto = `Tienes partido el ${diaLabel} en ${slot.club}. ¡Recuerda estar pendiente!`;
        const titulo = "Recordatorio de partido";

        const duplicada = await notificacionDuplicada({
          jugadorId: userId,
          tipo: "jugar",
          titulo,
          texto
        });
        if (duplicada) {
          recordatoriosInscRef.current.add(dedupeKey);
          continue;
        }

        const res = await createNotifications([
          { jugadorId: userId, tipo: "jugar", titulo, texto }
        ]);
        if (res.ok) recordatoriosInscRef.current.add(dedupeKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, slots, inscripciones, loading]);

  // --- Helpers compartidos entre memos ---

  function inscritosPorSlotSemana(slotId, semana) {
    return inscripciones
      .filter((i) => i.slot_id === slotId && normalizeSemana(i.semana) === semana)
      .map((i, idx) => ({
        jugadorId: normalizeJugadorUuid(i.jugador_id),
        nombre: i.jugadores?.nombre ?? i.jugador_id,
        socio: Boolean(i.es_socio),
        ts: i.inscrito_at ? new Date(i.inscrito_at).getTime() : idx + 1,
        tsStr: formatTsStr(i.inscrito_at)
      }))
      .sort((a, b) => a.ts - b.ts);
  }

  function estaApuntado(slotId, semana) {
    if (!currentUser) return false;
    return inscripciones.some(
      (i) =>
        i.slot_id === slotId &&
        normalizeSemana(i.semana) === semana &&
        jugadorCoincide(i.jugador_id, currentUser.id)
    );
  }

  // Una entrada por slot — para Partidos
  const slotsConEstado = useMemo(() => {
    const now = new Date();
    const lunesActual = getLunesSemanaActual(now);
    const lunesProximo = addDaysYmd(lunesActual, 7);

    return slots.map((slot) => {
      const esProxima = isNextWeekSlotOpen({ diaSemana: slot.diaSemana }, now);
      const semanaObjetivo = esProxima ? lunesProximo : lunesActual;
      const jugadores = inscritosPorSlotSemana(slot.id, semanaObjetivo);
      return {
        ...slot,
        abierto: isSlotOpen(slot, { semana: esProxima ? "proxima" : "actual", semanaObjetivo, now }),
        bajaWarning: isBajaWarning({ diaSemana: slot.diaSemana }),
        semanaObjetivo,
        jugadores,
        sociosCount: jugadores.filter((p) => p.socio).length,
        apuntado: estaApuntado(slot.id, semanaObjetivo)
      };
    });
  }, [slots, inscripciones, currentUser, userId]);

  // Dos entradas por slot (actual + próxima) — para Jugar
  const slotsJugar = useMemo(() => {
    const now = new Date();
    const lunesActual = getLunesSemanaActual(now);
    const lunesProximo = addDaysYmd(lunesActual, 7);
    const result = [];

    for (const slot of slots) {
      const jActual = inscritosPorSlotSemana(slot.id, lunesActual);
      result.push({
        ...slot,
        id: slot.id,
        baseId: slot.id,
        semana: "actual",
        semanaObjetivo: lunesActual,
        abierto: isSlotOpen(slot, { semana: "actual", semanaObjetivo: lunesActual, now }),
        bajaWarning: isBajaWarning({ diaSemana: slot.diaSemana }),
        jugadores: jActual,
        sociosCount: jActual.filter((p) => p.socio).length,
        apuntado: estaApuntado(slot.id, lunesActual)
      });

      const jProxima = inscritosPorSlotSemana(slot.id, lunesProximo);
      result.push({
        ...slot,
        id: slot.id + "-prox",
        baseId: slot.id,
        semana: "proxima",
        semanaObjetivo: lunesProximo,
        abierto: isSlotOpen(slot, { semana: "proxima", semanaObjetivo: lunesProximo, now }),
        bajaWarning: false,
        jugadores: jProxima,
        sociosCount: jProxima.filter((p) => p.socio).length,
        apuntado: estaApuntado(slot.id, lunesProximo)
      });
    }
    return result;
  }, [slots, inscripciones, currentUser, userId]);

  // --- Acciones ---

  async function reloadInscripciones() {
    if (!supabase || !isJugadorUuid(userId)) return;
    const lunes = getLunesSemanaActual();
    const desde = addDaysYmd(lunes, -14);
    const hasta = addDaysYmd(lunes, 28);
    const { data, error } = await supabase.rpc("get_inscripciones", {
      p_desde: desde,
      p_hasta: hasta
    });
    if (!error) {
      const conNombres = await cargarNombres(data ?? []);
      setInscripciones(conNombres);
    }
  }

  async function apuntarEnSlot(slotId, options = {}) {
    if (!currentUser || !supabase) return { ok: false, error: "No hay sesión activa." };

    const slot = slotsJugar.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: "Slot no encontrado." };
    if (!slot.abierto) return { ok: false, error: "La lista aún no está abierta." };

    const jugadorId = normalizeJugadorUuid(currentUser.id);
    if (!isJugadorUuid(jugadorId)) return { ok: false, error: "ID de jugador no válido." };

    const dbSlotId = slot.baseId ?? slot.id;
    const semana = slot.semanaObjetivo;

    const yaMismoDia = slotsJugar.find(
      (s) => s.id !== slotId && s.apuntado && s.semanaObjetivo === semana && sameDiaSemanaSlot(s, slot)
    );
    if (yaMismoDia) {
      return { ok: false, error: `Ya estás apuntado en ${yaMismoDia.label} — ${yaMismoDia.club}.` };
    }

    const { error } = await supabase.from("inscripciones").insert({
      jugador_id: jugadorId,
      slot_id: dbSlotId,
      semana,
      es_socio: Boolean(options.socio)
    });
    if (error) return { ok: false, error: error.message };

    const nowIso = new Date().toISOString();
    setInscripciones((prev) => {
      const ya = prev.some(
        (r) =>
          r.slot_id === dbSlotId &&
          jugadoresCoinciden(r.jugador_id, jugadorId) &&
          normalizeSemana(r.semana) === normalizeSemana(semana)
      );
      if (ya) return prev;
      return [
        ...prev,
        {
          id: `local-${Date.now()}`,
          jugador_id: jugadorId,
          slot_id: dbSlotId,
          semana,
          es_socio: Boolean(options.socio),
          inscrito_at: nowIso,
          jugadores: { nombre: currentUser.nombre }
        }
      ];
    });

    void createActivityLog({
      jugadorId: currentUser.id,
      tipo: "jugar",
      texto: `Se apunta a ${slot.label} · ${slot.club} (${semana})`
    });
    void createNotifications([
      {
        jugadorId,
        tipo: "jugar",
        titulo: "¡Apuntado!",
        texto: "Recuerda estar pendiente del horario."
      }
    ]);
    return { ok: true };
  }

  async function bajaEnSlot(slotId) {
    if (!currentUser || !supabase) return { ok: false, error: "No hay sesión activa." };

    const slot = slotsJugar.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: "Slot no encontrado." };

    const jugadorId = normalizeJugadorUuid(currentUser.id);
    if (!isJugadorUuid(jugadorId)) return { ok: false, error: "ID de jugador no válido." };

    const dbSlotId = slot.baseId ?? slot.id;
    const semana = normalizeSemana(slot.semanaObjetivo);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };

    const { error: rpcErr } = await supabase.rpc("borrar_inscripcion", {
      p_jugador_id: jugadorId,
      p_slot_id: dbSlotId,
      p_semana: semana,
    });

    if (rpcErr) return { ok: false, error: rpcErr.message };

    setInscripciones((prev) =>
      prev.filter(
        (i) =>
          !(
            i.slot_id === dbSlotId &&
            normalizeSemana(i.semana) === semana &&
            jugadoresCoinciden(i.jugador_id, jugadorId)
          )
      )
    );
    await reloadInscripciones();

    void createActivityLog({
      jugadorId,
      tipo: "jugar",
      texto: `Se da de baja de ${slot.label} · ${slot.club} (${slot.semanaObjetivo})`
    });
    void createNotifications([
      {
        jugadorId,
        tipo: "jugar",
        titulo: "Baja confirmada",
        texto: "¡Hasta la próxima!"
      }
    ]);

    if (slot.semana === "actual" && isBajaWarning({ diaSemana: slot.diaSemana })) {
      return { ok: true, warning: "Si te das de baja hoy, por favor busca un@ sustitut@." };
    }
    return { ok: true };
  }

  return { slots: slotsConEstado, slotsJugar, rawSlots: slots, slotsNotice, apuntarEnSlot, bajaEnSlot };
}
