import { useEffect, useMemo, useRef, useState } from "react";
import { SLOTS_INICIALES } from "../utils/mockData";
import {
  esAperturaListaProximaHoy,
  isBajaWarning,
  isNextWeekSlotOpen,
  isSlotOpen,
  sameDiaSemanaSlot
} from "../utils/slots";
import { supabase } from "../lib/supabase";
import { createActivityLog, createNotifications, notificacionDuplicada } from "../lib/engagement";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";
import { getNombreVisible } from "../utils/nombres";
import {
  DATE_LOCALE,
  fechaPartidoFromSlot,
  formatDiaPartidoLabel,
  formatFechaLocal,
  hoyLocalStr
} from "../utils/dates";
import { t } from "../i18n";

// --- Utilidades de fecha UTC ---

function getMondayUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d;
}

function formatDateUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDaysUtc(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function formatSancioDate(value) {
  if (!value) return "";
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(DATE_LOCALE);
}

function startOfLocalDay(d) {
  const x = d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

/** Extrae YYYY-MM-DD de cualquier valor que devuelva Supabase para columnas `date`. */
function normalizeSemana(v) {
  if (!v) return "";
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function formatTsStr(isoTs) {
  if (!isoTs) return "";
  return new Date(isoTs).toLocaleTimeString(DATE_LOCALE, { hour: "2-digit", minute: "2-digit" });
}

function jugadorCoincide(insJugadorId, userId) {
  const a = normalizeJugadorUuid(insJugadorId);
  const b = normalizeJugadorUuid(userId);
  return isJugadorUuid(a) && isJugadorUuid(b) && a === b;
}

function rowsFromRpcJugadores(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

/** Enriquece inscripciones con datos de jugador vía RPC get_jugadores. */
async function cargarNombres(rows) {
  const { data, error } = await supabase.rpc("get_jugadores", {});
  if (error) {
    console.warn("[cargarNombres]", error.message);
    return rows;
  }
  const byId = {};
  for (const j of rowsFromRpcJugadores(data)) {
    byId[normalizeJugadorUuid(j.id)] = {
      nombre: j.nombre ?? "",
      nickname: j.nickname?.trim() || null
    };
  }
  return rows.map((row) => ({
    ...row,
    jugadores: byId[normalizeJugadorUuid(row.jugador_id)] ?? { nombre: String(row.jugador_id ?? "") }
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
  const [tick, setTick] = useState(0);
  const recordatoriosInscRef = useRef(new Set());
  const aperturaListaNotifRef = useRef(new Set());

  const userId = currentUser?.id ? normalizeJugadorUuid(currentUser.id) : "";

  useEffect(() => {
    const now = new Date();
    const target = new Date();
    target.setHours(19, 0, 0, 0);

    let timeout;
    if (now < target) {
      const ms = target.getTime() - now.getTime();
      timeout = setTimeout(() => setTick((t) => t + 1), ms);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

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
          setSlotsNotice(slotsErr?.message ?? t("hooks.slots.noActiveSlots"));
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
        const lunes = getMondayUtc(new Date());
        const desde = formatDateUTC(addDaysUtc(lunes, -14));
        const hasta = formatDateUTC(addDaysUtc(lunes, 28));

        const { data: inscData, error: inscErr } = await supabase.rpc("get_inscripciones", {
          p_desde: desde,
          p_hasta: hasta
        });

        if (cancelled) return;

        if (inscErr) {
          setSlotsNotice(t("hooks.slots.loadInscriptionsError", { error: inscErr.message }));
        } else {
          const conNombres = await cargarNombres(inscData ?? []);
          if (!cancelled) setInscripciones(conNombres);
        }
      } catch (err) {
        if (!cancelled) setSlotsNotice(t("hooks.slots.loadDataError", { error: err?.message ?? String(err) }));
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
        const texto = t("hooks.slots.notifications.matchReminderText", { day: diaLabel, club: slot.club });
        const titulo = t("hooks.slots.notifications.matchReminderTitle");

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

  useEffect(() => {
    if (!supabase || !isJugadorUuid(userId) || loading || !slots.length) return undefined;

    let cancelled = false;

    void (async () => {
      const now = new Date();
      const lunes = getMondayUtc(now);
      const lunesProximo = formatDateUTC(addDaysUtc(lunes, 7));
      const titulo = t("hooks.slots.notifications.listOpenTitle");

      for (const slot of slots) {
        if (cancelled) return;
        if (!esAperturaListaProximaHoy(slot, now)) continue;

        const semanaObjetivo = lunesProximo;
        const abierto = isSlotOpen(slot, { semana: "proxima", semanaObjetivo, now });
        if (!abierto) continue;

        const diaLabel =
          formatDiaPartidoLabel(fechaPartidoFromSlot(semanaObjetivo, slot.diaSemana)) ||
          slot.label ||
          t("hooks.slots.notifications.yourDay");
        const texto = t("hooks.slots.notifications.listOpenText", { day: diaLabel, club: slot.club });

        const dedupeKey = `${userId}:apertura:${slot.id}:${semanaObjetivo}`;
        if (aperturaListaNotifRef.current.has(dedupeKey)) continue;

        const duplicada = await notificacionDuplicada({
          jugadorId: userId,
          tipo: "slot_obert",
          titulo,
          texto
        });
        if (duplicada) {
          aperturaListaNotifRef.current.add(dedupeKey);
          continue;
        }

        const res = await createNotifications([
          {
            jugadorId: userId,
            tipo: "slot_obert",
            titulo,
            texto
          }
        ]);
        if (res.ok) aperturaListaNotifRef.current.add(dedupeKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, slots, loading, authEpoch]);

  // --- Helpers compartidos entre memos ---

  function inscritosPorSlotSemana(slotId, semana) {
    return inscripciones
      .filter((i) => i.slot_id === slotId && normalizeSemana(i.semana) === semana)
      .map((i, idx) => ({
        jugadorId: normalizeJugadorUuid(i.jugador_id),
        nombre: getNombreVisible(i.jugadores) || i.jugador_id,
        nickname: i.jugadores?.nickname ?? null,
        socio: Boolean(i.es_socio),
        inscrito_at: i.inscrito_at ?? null,
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
    const lunes = getMondayUtc(now);
    const lunesActual = formatDateUTC(lunes);
    const lunesProximo = formatDateUTC(addDaysUtc(lunes, 7));

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
  }, [slots, inscripciones, currentUser, userId, tick]);

  // Dos entradas por slot (actual + próxima) — para Jugar
  const slotsJugar = useMemo(() => {
    const now = new Date();
    const lunes = getMondayUtc(now);
    const lunesActual = formatDateUTC(lunes);
    const lunesProximo = formatDateUTC(addDaysUtc(lunes, 7));
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
  }, [slots, inscripciones, currentUser, userId, tick]);

  // --- Acciones ---

  async function reloadInscripciones() {
    if (!supabase || !isJugadorUuid(userId)) return;
    const lunes = getMondayUtc(new Date());
    const desde = formatDateUTC(addDaysUtc(lunes, -14));
    const hasta = formatDateUTC(addDaysUtc(lunes, 28));
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
    if (!currentUser || !supabase) return { ok: false, error: t("hooks.slots.noSession") };

    const slot = slotsJugar.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: t("hooks.slots.slotNotFound") };
    if (!slot.abierto) return { ok: false, error: t("hooks.slots.listNotOpen") };

    const fechaSlot = fechaPartidoFromSlot(slot.semanaObjetivo, slot.diaSemana);
    const fechaSlotStr = fechaSlot ? formatFechaLocal(startOfLocalDay(fechaSlot)) : null;
    if (currentUser.sancionat && currentUser.sancio_fins && fechaSlotStr && fechaSlotStr <= currentUser.sancio_fins) {
      return {
        ok: false,
        error: t("hooks.slots.sanctionedUntil", {
          date: formatSancioDate(currentUser.sancio_fins)
        })
      };
    }

    const jugadorId = normalizeJugadorUuid(currentUser.id);
    if (!isJugadorUuid(jugadorId)) return { ok: false, error: t("hooks.slots.invalidPlayerId") };

    const dbSlotId = slot.baseId ?? slot.id;
    const semana = slot.semanaObjetivo;

    const yaMismoDia = slotsJugar.find(
      (s) => s.id !== slotId && s.apuntado && s.semanaObjetivo === semana && sameDiaSemanaSlot(s, slot)
    );
    if (yaMismoDia) {
      return {
        ok: false,
        error: t("hooks.slots.alreadyEnrolled", { label: yaMismoDia.label, club: yaMismoDia.club })
      };
    }

    const { data: esCoordDia } = await supabase.rpc("es_coordinador_dia", {
      p_slot_id: dbSlotId
    });

    const inscritoAt =
      esCoordDia === true ? "1970-01-01T00:00:00Z" : undefined;

    const { error } = await supabase.from("inscripciones").insert({
      jugador_id: jugadorId,
      slot_id: dbSlotId,
      semana,
      es_socio: Boolean(options.socio),
      ...(inscritoAt ? { inscrito_at: inscritoAt } : {})
    });
    if (error) return { ok: false, error: error.message };

    const nowIso = new Date().toISOString();
    const inscritoAtLocal = inscritoAt ?? nowIso;
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
          inscrito_at: inscritoAtLocal,
          jugadores: {
            nombre: currentUser.nombre,
            nickname: currentUser.nickname?.trim() || null
          }
        }
      ];
    });

    await reloadInscripciones();

    void createActivityLog({
      jugadorId: currentUser.id,
      tipo: "jugar",
      texto: t("hooks.slots.activity.signUp", { label: slot.label, club: slot.club, week: semana })
    });
    return { ok: true };
  }

  async function bajaEnSlot(slotId) {
    if (!currentUser || !supabase) return { ok: false, error: t("hooks.slots.noSession") };

    const slot = slotsJugar.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: t("hooks.slots.slotNotFound") };

    const jugadorId = normalizeJugadorUuid(currentUser.id);
    if (!isJugadorUuid(jugadorId)) return { ok: false, error: t("hooks.slots.invalidPlayerId") };

    const dbSlotId = slot.baseId ?? slot.id;
    const semana = normalizeSemana(slot.semanaObjetivo);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: t("hooks.slots.sessionExpired") };

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
      texto: t("hooks.slots.activity.unregister", {
        label: slot.label,
        club: slot.club,
        week: slot.semanaObjetivo
      })
    });

    if (slot.semana === "actual" && isBajaWarning({ diaSemana: slot.diaSemana })) {
      return { ok: true, warning: t("hooks.slots.bajaWarningShort") };
    }
    return { ok: true };
  }

  return { slots: slotsConEstado, slotsJugar, rawSlots: slots, slotsNotice, apuntarEnSlot, bajaEnSlot };
}
