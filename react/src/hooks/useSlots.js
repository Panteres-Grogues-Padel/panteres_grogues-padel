import { useEffect, useMemo, useState } from "react";
import { SLOTS_INICIALES } from "../utils/mockData";
import { isBajaWarning, isNextWeekSlotOpen, isSlotOpen, sameDiaSemanaSlot } from "../utils/slots";
import { supabase } from "../lib/supabase";
import { createActivityLog } from "../lib/engagement";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";

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

/** Extrae YYYY-MM-DD de cualquier valor que devuelva Supabase para columnas `date`. */
function normalizeSemana(v) {
  if (!v) return "";
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function formatTsStr(isoTs) {
  if (!isoTs) return "";
  return new Date(isoTs).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
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

export function useSlots(currentUser) {
  const [slots, setSlots] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slotsNotice, setSlotsNotice] = useState("");

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
          .select("id,label,club,dia_semana,pistas_default,pistas_activo")
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

        const { data: inscData, error: inscErr } = await supabase
          .from("inscripciones")
          .select("id,jugador_id,slot_id,semana,es_socio,inscrito_at")
          .gte("semana", desde)
          .lte("semana", hasta)
          .order("inscrito_at", { ascending: true, nullsFirst: true })
          .order("id", { ascending: true });

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
  }, [userId]);

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
    const lunes = getMondayUtc(now);
    const lunesActual = formatDateUTC(lunes);
    const lunesProximo = formatDateUTC(addDaysUtc(lunes, 7));

    return slots.map((slot) => {
      const semanaObjetivo = isNextWeekSlotOpen({ diaSemana: slot.diaSemana }, now)
        ? lunesProximo
        : lunesActual;
      const jugadores = inscritosPorSlotSemana(slot.id, semanaObjetivo);
      return {
        ...slot,
        abierto: isSlotOpen({ diaSemana: slot.diaSemana }),
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
        abierto: true,
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
        abierto: isNextWeekSlotOpen({ diaSemana: slot.diaSemana }, now),
        bajaWarning: false,
        jugadores: jProxima,
        sociosCount: jProxima.filter((p) => p.socio).length,
        apuntado: estaApuntado(slot.id, lunesProximo)
      });
    }
    return result;
  }, [slots, inscripciones, currentUser, userId]);

  // --- Acciones ---

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

    const { data: filas, error: selErr } = await supabase
      .from("inscripciones")
      .select("id")
      .eq("jugador_id", jugadorId)
      .eq("slot_id", dbSlotId)
      .eq("semana", semana);

    if (selErr) return { ok: false, error: selErr.message };
    if (!filas?.length) return { ok: false, error: "No hay inscripción en este slot." };

    const ids = filas.map((r) => r.id);
    const { error: delErr } = await supabase.from("inscripciones").delete().in("id", ids);
    if (delErr) return { ok: false, error: delErr.message };

    // Remove by identity (slot+jugador+semana) so optimistic "local-*" entries are also removed
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

    void createActivityLog({
      jugadorId,
      tipo: "jugar",
      texto: `Se da de baja de ${slot.label} · ${slot.club} (${slot.semanaObjetivo})`
    });

    if (slot.semana === "actual" && isBajaWarning({ diaSemana: slot.diaSemana })) {
      return { ok: true, warning: "Si te das de baja hoy, por favor busca un@ sustitut@." };
    }
    return { ok: true };
  }

  return { slots: slotsConEstado, slotsJugar, rawSlots: slots, slotsNotice, apuntarEnSlot, bajaEnSlot };
}
