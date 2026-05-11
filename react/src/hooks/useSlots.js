import { useEffect, useMemo, useRef, useState } from "react";
// Fallback offline: todos los slots del prototipo (index.html) en `utils/mockData.js` → SLOTS_INICIALES
import { SLOTS_INICIALES } from "../utils/mockData";
import { isBajaWarning, isNextWeekSlotOpen, isSlotOpen, sameDiaSemanaSlot } from "../utils/slots";
import { supabase } from "../lib/supabase";
import { createActivityLog } from "../lib/engagement";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";

/** Lunes ISO de la semana del calendario UTC (alineado con `CURRENT_DATE` y semana ISO en Postgres/Supabase). */
function getMondayUtc(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const day = date.getUTCDate();
  const d = new Date(Date.UTC(y, m, day));
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function formatDateUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Normaliza columna `date` / JSON de Supabase a YYYY-MM-DD (sin cortar mal ISO con Z). */
function normalizeSemanaValue(v) {
  if (v == null) return "";
  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return formatDateUTC(v);
  }
  const s = String(v);
  const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function addDaysUtc(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function formatTsStr(isoTs) {
  if (!isoTs) return "";
  return new Date(isoTs).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function normalizePlayerEntry(entry, idx = 0) {
  if (!entry) return null;
  if (typeof entry === "string") {
    return { nombre: entry, socio: false, ts: idx + 1, tsStr: "" };
  }
  return {
    nombre: entry.nombre ?? "",
    socio: Boolean(entry.socio),
    ts: entry.ts ?? idx + 1,
    tsStr: entry.tsStr ?? ""
  };
}

/** Semana de alta en BD: lunes ISO en **UTC** (como `CURRENT_DATE` en Supabase) + regla de lista abierta (hora local). */
function getSemanaObjetivo(slot, now = new Date()) {
  const monday = getMondayUtc(now);
  if (isNextWeekSlotOpen({ diaSemana: slot.diaSemana }, now)) {
    monday.setUTCDate(monday.getUTCDate() + 7);
  }
  return formatDateUTC(monday);
}

/**
 * Semanas para filtrar inscripciones en UI: lunes ISO actual, el siguiente (p. ej. datos con semana 2026-05-11 un sábado)
 * y el lunes de alta (getSemanaObjetivo).
 */
function semanasRelevantesParaSlot(slot, now = new Date()) {
  const m0 = getMondayUtc(now);
  const lunesEsta = formatDateUTC(m0);
  const lunesProx = formatDateUTC(addDaysUtc(m0, 7));
  const objetivo = getSemanaObjetivo(slot, now);
  return [...new Set([lunesEsta, lunesProx, objetivo])];
}

function inscripcionEnSemanasRelevantes(ins, slot, now = new Date()) {
  const s = normalizeSemanaValue(ins.semana);
  return semanasRelevantesParaSlot(slot, now).includes(s);
}

function jugadorIdCoincide(insJugadorId, currentUserId) {
  const insId = normalizeJugadorUuid(insJugadorId);
  const userId = normalizeJugadorUuid(currentUserId);
  return isJugadorUuid(insId) && isJugadorUuid(userId) && insId === userId;
}

/** ¿Ya hay inscripción del jugador en otro slot el mismo día de semana y misma semana calendario? */
function inscripcionExclusividadDia(slotTarget, semanaNorm, jugadorId, rows, slotDefs) {
  for (const ins of rows) {
    if (ins.slot_id === slotTarget.id) continue;
    if (!jugadoresCoinciden(ins.jugador_id, jugadorId)) continue;
    if (normalizeSemanaValue(ins.semana) !== semanaNorm) continue;
    const def = slotDefs.find((x) => x.id === ins.slot_id);
    if (def && sameDiaSemanaSlot(def, slotTarget)) return def;
  }
  return null;
}

async function leerInscripcionesJugadorSemana(client, jugadorId, semanaNorm) {
  const { data, error } = await client
    .from("inscripciones")
    .select("id,jugador_id,slot_id,semana")
    .eq("jugador_id", jugadorId)
    .eq("semana", semanaNorm);

  if (error) return { ok: false, error: error.message, rows: [] };
  return { ok: true, rows: data ?? [] };
}

/** Nombres aparte: el select embebido `jugadores(...)` puede reducir filas con RLS en `jugadores`. */
async function enrichInscripcionesJugadoresNombres(client, rows) {
  const ids = [
    ...new Set(
      rows
        .map((r) => normalizeJugadorUuid(r.jugador_id))
        .filter((id) => isJugadorUuid(id))
    )
  ];
  const byId = {};
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await client.from("jugadores").select("id,nombre").in("id", chunk);
    if (error) {
      console.warn("[enrichInscripcionesJugadoresNombres]", error.message);
      break;
    }
    for (const j of data ?? []) {
      byId[normalizeJugadorUuid(j.id)] = j.nombre ?? "";
    }
  }
  return rows.map((row) => {
    const jid = normalizeJugadorUuid(row.jugador_id);
    const nombre = isJugadorUuid(jid) ? byId[jid] : undefined;
    return {
      ...row,
      jugadores: {
        nombre: nombre != null && nombre !== "" ? nombre : row.jugador_id
      }
    };
  });
}

export function useSlots(currentUser) {
  const [slots, setSlots] = useState(SLOTS_INICIALES);
  const [inscripciones, setInscripciones] = useState([]);
  const [inscripcionesLoadedForUserId, setInscripcionesLoadedForUserId] = useState("");
  const [inscripcionesLoading, setInscripcionesLoading] = useState(false);
  const [slotsNotice, setSlotsNotice] = useState("");
  /** Invalida `loadInscripcionesSupabase` en vuelo al cambiar usuario o al desmontar. */
  const inscripcionesReloadGenRef = useRef(0);
  const currentUserId = currentUser?.id ? normalizeJugadorUuid(currentUser.id) : "";

  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);

  async function loadSlotsSupabase() {
    // Sin filtros extra: solo activo = true. Paginación por si PostgREST/Supabase limita filas por petición.
    const selectCols = "id,label,club,dia_semana,pistas_default,pistas_activo,activo";
    const pageSize = 200;
    const allRows = [];
    let from = 0;

    for (;;) {
      const { data, error } = await supabase
        .from("slots")
        .select(selectCols)
        .eq("activo", true)
        .order("dia_semana", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        setSlotsNotice(
          `Error al leer slots (tabla slots, campo activo): ${error.message}. Se muestran slots de respaldo.`
        );
        setSlots(SLOTS_INICIALES);
        return;
      }
      if (!data?.length) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    if (allRows.length) {
      setSlotsNotice("");
      setSlots(
        allRows.map((s) => ({
          id: s.id,
          label: s.label,
          club: s.club,
          diaSemana: s.dia_semana,
          pistasDefault: Number(s.pistas_default ?? 0),
          pistas: Number(s.pistas_activo ?? 0),
          jugadores: []
        }))
      );
      return;
    }
    setSlotsNotice(
      "No hay filas en slots con activo = true (revisa el seed). Se muestran slots de respaldo."
    );
    setSlots(SLOTS_INICIALES);
  }

  async function loadInscripcionesSupabase(extraSemanasRaw = [], reloadToken, userIdForLoad = currentUserId) {
    if (!userIdForLoad) {
      setInscripciones([]);
      setInscripcionesLoadedForUserId("");
      return;
    }
    const now = new Date();
    const monday = getMondayUtc(now);
    let semanaDesde = formatDateUTC(addDaysUtc(monday, -14));
    let semanaHasta = formatDateUTC(addDaysUtc(monday, 28));
    for (const raw of extraSemanasRaw ?? []) {
      const n = normalizeSemanaValue(raw);
      if (!n) continue;
      if (n < semanaDesde) semanaDesde = n;
      if (n > semanaHasta) semanaHasta = n;
    }
    // Sin embed: solo columnas de `inscripciones` (rango semana). Los nombres se unen después;
    // `jugadores(nombre)` en el mismo select puede hacer que no lleguen todas las filas según RLS del join.
    const selectCols = "id,jugador_id,slot_id,semana,es_socio,inscrito_at";
    const pageSize = 500;
    const allRows = [];
    let from = 0;
    let inscError = null;

    for (;;) {
      const { data, error } = await supabase
        .from("inscripciones")
        .select(selectCols)
        .gte("semana", semanaDesde)
        .lte("semana", semanaHasta)
        .order("slot_id", { ascending: true })
        .order("inscrito_at", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        inscError = error;
        break;
      }
      if (!data?.length) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    if (inscError) {
      console.warn("[loadInscripcionesSupabase]", inscError.message);
      if (reloadToken !== undefined && reloadToken !== inscripcionesReloadGenRef.current) {
        return;
      }
      setInscripciones([]);
      setInscripcionesLoadedForUserId(userIdForLoad);
      return;
    }

    if (reloadToken !== undefined && reloadToken !== inscripcionesReloadGenRef.current) {
      return;
    }
    const withNombres = await enrichInscripcionesJugadoresNombres(supabase, allRows);
    if (reloadToken !== undefined && reloadToken !== inscripcionesReloadGenRef.current) {
      return;
    }
    setInscripciones(withNombres);
    setInscripcionesLoadedForUserId(userIdForLoad);
  }

  useEffect(() => {
    if (useFallback) {
      setInscripciones([]);
      setInscripcionesLoadedForUserId(currentUserId);
      setInscripcionesLoading(false);
      setSlots(SLOTS_INICIALES);
      setSlotsNotice("");
      return undefined;
    }

    const reloadToken = ++inscripcionesReloadGenRef.current;
    setInscripciones([]);
    setInscripcionesLoadedForUserId("");
    setInscripcionesLoading(true);
    setSlots([]);
    setSlotsNotice("");

    let cancelled = false;
    (async () => {
      await loadSlotsSupabase();
      if (cancelled) return;
      await loadInscripcionesSupabase([], reloadToken, currentUserId);
      if (!cancelled && reloadToken === inscripcionesReloadGenRef.current) {
        setInscripcionesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      inscripcionesReloadGenRef.current += 1;
    };
  }, [useFallback, currentUserId]);

  const slotsConEstado = useMemo(() => {
    const now = new Date();
    const inscripcionesListas = !inscripcionesLoading && currentUserId !== "" && inscripcionesLoadedForUserId === currentUserId;
    const inscripcionesVisibles = (useFallback || inscripcionesListas) ? inscripciones : [];
    return slots.map((slot) => ({
      ...slot,
      abierto: isSlotOpen({ diaSemana: slot.diaSemana }),
      bajaWarning: isBajaWarning({ diaSemana: slot.diaSemana }),
      semanaObjetivo: getSemanaObjetivo(slot, now),
      jugadores: (
        useFallback
          ? slot.jugadores.map((j, idx) => normalizePlayerEntry(j, idx)).filter(Boolean)
          : inscripcionesVisibles
              .filter((ins) => ins.slot_id === slot.id && inscripcionEnSemanasRelevantes(ins, slot, now))
              .map((ins, idx) => ({
                jugadorId: normalizeJugadorUuid(ins.jugador_id),
                nombre: ins.jugadores?.nombre ?? ins.jugador_id,
                socio: Boolean(ins.es_socio),
                ts: ins.inscrito_at ? new Date(ins.inscrito_at).getTime() : idx + 1,
                tsStr: formatTsStr(ins.inscrito_at)
              }))
      ).sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0)),
      sociosCount: (
        useFallback
          ? slot.jugadores.map((j, idx) => normalizePlayerEntry(j, idx)).filter(Boolean)
          : inscripcionesVisibles
              .filter((ins) => ins.slot_id === slot.id && inscripcionEnSemanasRelevantes(ins, slot, now))
              .map((ins) => ({ socio: Boolean(ins.es_socio) }))
      ).filter((p) => p.socio).length,
      apuntado: useFallback
        ? Boolean(
            currentUser &&
              slot.jugadores
                .map((j, idx) => normalizePlayerEntry(j, idx))
                .filter(Boolean)
                .find((p) => p.nombre === currentUser.nombre)
          )
        : Boolean(
            currentUser &&
              inscripcionesVisibles.find(
                (ins) =>
                  ins.slot_id === slot.id &&
                  jugadorIdCoincide(ins.jugador_id, currentUser.id) &&
                  inscripcionEnSemanasRelevantes(ins, slot, now)
              )
          )
    }));
  }, [slots, currentUser, currentUserId, inscripciones, inscripcionesLoadedForUserId, inscripcionesLoading, useFallback]);

  /** Dos entradas por slot (semana actual + próxima) con abierto correcto. Solo para la vista Jugar. */
  const slotsJugarConEstado = useMemo(() => {
    const now = new Date();
    const inscripcionesListas = !inscripcionesLoading && currentUserId !== "" && inscripcionesLoadedForUserId === currentUserId;
    const inscripcionesVisibles = (useFallback || inscripcionesListas) ? inscripciones : [];

    const monday = getMondayUtc(now);
    const lunesActual = formatDateUTC(monday);
    const lunesProximo = formatDateUTC(addDaysUtc(monday, 7));

    function jugadoresParaSemana(slot, semanaTarget) {
      if (useFallback) {
        return semanaTarget === lunesActual
          ? slot.jugadores.map((j, idx) => normalizePlayerEntry(j, idx)).filter(Boolean)
          : [];
      }
      return inscripcionesVisibles
        .filter((ins) => ins.slot_id === slot.id && normalizeSemanaValue(ins.semana) === semanaTarget)
        .map((ins, idx) => ({
          jugadorId: normalizeJugadorUuid(ins.jugador_id),
          nombre: ins.jugadores?.nombre ?? ins.jugador_id,
          socio: Boolean(ins.es_socio),
          ts: ins.inscrito_at ? new Date(ins.inscrito_at).getTime() : idx + 1,
          tsStr: formatTsStr(ins.inscrito_at)
        }))
        .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    }

    function apuntadoParaSemana(slot, semanaTarget) {
      if (!currentUser) return false;
      if (useFallback) {
        return semanaTarget === lunesActual && Boolean(
          slot.jugadores
            .map((j, idx) => normalizePlayerEntry(j, idx))
            .filter(Boolean)
            .find((p) => p.nombre === currentUser.nombre)
        );
      }
      return Boolean(
        inscripcionesVisibles.find(
          (ins) =>
            ins.slot_id === slot.id &&
            jugadorIdCoincide(ins.jugador_id, currentUser.id) &&
            normalizeSemanaValue(ins.semana) === semanaTarget
        )
      );
    }

    const result = [];
    for (const slot of slots) {
      const jActual = jugadoresParaSemana(slot, lunesActual);
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
        apuntado: apuntadoParaSemana(slot, lunesActual)
      });

      const jProxima = jugadoresParaSemana(slot, lunesProximo);
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
        apuntado: apuntadoParaSemana(slot, lunesProximo)
      });
    }
    return result;
  }, [slots, currentUser, currentUserId, inscripciones, inscripcionesLoadedForUserId, inscripcionesLoading, useFallback]);

  function getSlot(slotId) {
    return slots.find((s) => s.id === slotId);
  }

  async function apuntarEnSlot(slotId, options = {}) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const slot = slotsJugarConEstado.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: "Slot no encontrado." };
    if (!slot.abierto) return { ok: false, error: "La lista aun no esta abierta." };

    const slotMismoDia = slotsJugarConEstado.find(
      (s) =>
        s.id !== slot.id &&
        s.apuntado &&
        s.semanaObjetivo === slot.semanaObjetivo &&
        sameDiaSemanaSlot(s, slot)
    );
    if (slotMismoDia) {
      return { ok: false, error: `Ya estas apuntado en ${slotMismoDia.label} ${slotMismoDia.club}.` };
    }

    const dbSlotId = slot.baseId ?? slot.id;

    if (useFallback) {
      const ts = Date.now();
      setSlots((prev) =>
        prev.map((s) =>
          s.id === dbSlotId &&
          !s.jugadores
            .map((j, idx) => normalizePlayerEntry(j, idx))
            .filter(Boolean)
            .find((p) => p.nombre === currentUser.nombre)
            ? {
                ...s,
                jugadores: [
                  ...s.jugadores,
                  {
                    nombre: currentUser.nombre,
                    socio: Boolean(options.socio),
                    ts,
                    tsStr: new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                  }
                ]
              }
            : s
        )
      );
      return { ok: true };
    }

    const jugadorId = normalizeJugadorUuid(currentUser.id);
    if (!isJugadorUuid(jugadorId)) {
      return { ok: false, error: "Tu perfil no tiene un id de jugador válido para Supabase." };
    }
    const semana = slot.semanaObjetivo;
    const semanaNorm = normalizeSemanaValue(semana);

    const inscripcionesJugador = await leerInscripcionesJugadorSemana(supabase, jugadorId, semanaNorm);
    if (!inscripcionesJugador.ok) return { ok: false, error: inscripcionesJugador.error };

    const conflicto = inscripcionExclusividadDia(
      { id: dbSlotId, diaSemana: slot.diaSemana },
      semanaNorm,
      jugadorId,
      inscripcionesJugador.rows,
      slots
    );
    if (conflicto) {
      return {
        ok: false,
        error: `Ya tienes lista ese día: ${conflicto.label} — ${conflicto.club}. Date de baja ahí primero.`
      };
    }

    const { error } = await supabase.from("inscripciones").insert({
      jugador_id: jugadorId,
      slot_id: dbSlotId,
      semana: semanaNorm,
      es_socio: Boolean(options.socio)
    });
    if (error) {
      return { ok: false, error: error.message };
    }

    const nowIso = new Date().toISOString();
    const filaInsertada = {
      id: `local-${Date.now()}`,
      jugador_id: jugadorId,
      slot_id: dbSlotId,
      semana: semanaNorm,
      es_socio: Boolean(options.socio),
      inscrito_at: nowIso,
      jugadores: { nombre: currentUser.nombre }
    };
    setInscripciones((prev) => {
      const ya = prev.some(
        (r) =>
          r.slot_id === dbSlotId &&
          jugadoresCoinciden(r.jugador_id, jugadorId) &&
          normalizeSemanaValue(r.semana) === semanaNorm
      );
      if (ya) return prev;
      return [...prev, filaInsertada];
    });

    void createActivityLog({
      jugadorId: currentUser.id,
      tipo: "jugar",
      texto: `Se apunta a ${slot.label} · ${slot.club} (${slot.semanaObjetivo})`
    });
    return { ok: true };
  }

  async function bajaEnSlot(slotId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const slot = slotsJugarConEstado.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: "Slot no encontrado." };

    const dbSlotId = slot.baseId ?? slot.id;

    if (useFallback) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === dbSlotId
            ? {
                ...s,
                jugadores: s.jugadores.filter((p, idx) => normalizePlayerEntry(p, idx)?.nombre !== currentUser.nombre)
              }
            : s
        )
      );
    } else {
      const jugadorUuid = normalizeJugadorUuid(currentUser.id);
      if (!isJugadorUuid(jugadorUuid)) {
        return { ok: false, error: "Tu perfil no tiene un id de jugador válido para Supabase." };
      }

      const semanaNorm = normalizeSemanaValue(slot.semanaObjetivo);

      const { data: filasInsc, error: selErr } = await supabase
        .from("inscripciones")
        .select("id")
        .eq("jugador_id", jugadorUuid)
        .eq("slot_id", dbSlotId)
        .eq("semana", semanaNorm);

      if (selErr) return { ok: false, error: selErr.message };
      if (!filasInsc?.length) {
        return { ok: false, error: "No hay inscripción en este slot para tu usuario." };
      }

      const { data: deleted, error: delErr } = await supabase
        .from("inscripciones")
        .delete()
        .eq("jugador_id", jugadorUuid)
        .eq("slot_id", dbSlotId)
        .eq("semana", semanaNorm)
        .select("id");

      if (delErr) {
        return { ok: false, error: delErr.message };
      }
      if (!deleted?.length) {
        return { ok: false, error: "No se eliminó la inscripción (semana o permisos)." };
      }

      setInscripciones((prev) =>
        prev.filter(
          (i) =>
            !(
              i.slot_id === dbSlotId &&
              jugadoresCoinciden(i.jugador_id, jugadorUuid) &&
              normalizeSemanaValue(i.semana) === semanaNorm
            )
        )
      );

      void createActivityLog({
        jugadorId: jugadorUuid,
        tipo: "jugar",
        texto: `Se da de baja de ${slot.label} · ${slot.club} (${slot.semanaObjetivo})`
      });
    }

    if (slot.semana === "actual" && isBajaWarning({ diaSemana: slot.diaSemana })) {
      return {
        ok: true,
        warning: "Si te das de baja hoy, por favor busca un@ sustitut@ para el partido."
      };
    }
    return { ok: true };
  }

  return { slots: slotsConEstado, slotsJugar: slotsJugarConEstado, rawSlots: slots, slotsNotice, apuntarEnSlot, bajaEnSlot };
}
