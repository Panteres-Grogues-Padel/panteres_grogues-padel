import { useEffect, useMemo, useRef, useState } from "react";
// Fallback offline: todos los slots del prototipo (index.html) en `utils/mockData.js` → SLOTS_INICIALES
import { SLOTS_INICIALES } from "../utils/mockData";
import { isBajaWarning, isSlotOpen, sameDiaSemanaSlot } from "../utils/slots";
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
  const open = isSlotOpen({ diaSemana: slot.diaSemana });
  if (open) monday.setUTCDate(monday.getUTCDate() + 7);
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
  if (import.meta.env.DEV) {
    console.log(
      "Comparando IDs:",
      String(insJugadorId).toLowerCase().trim(),
      "vs",
      String(currentUserId).toLowerCase().trim()
    );
  }
  return jugadoresCoinciden(insJugadorId, currentUserId);
}

export function useSlots(currentUser) {
  const [slots, setSlots] = useState(SLOTS_INICIALES);
  const [inscripciones, setInscripciones] = useState([]);
  const [slotsNotice, setSlotsNotice] = useState("");
  /** Invalida `loadInscripcionesSupabase` en vuelo al cambiar usuario o al desmontar. */
  const inscripcionesReloadGenRef = useRef(0);

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

  async function loadInscripcionesSupabase(extraSemanasRaw = [], reloadToken) {
    if (!currentUser?.id) return;
    const now = new Date();
    const m0 = getMondayUtc(now);
    const semanaLunesEsta = normalizeSemanaValue(formatDateUTC(m0));
    const semanaLunesProxima = normalizeSemanaValue(formatDateUTC(addDaysUtc(m0, 7)));
    // Ventana amplia de lunes ISO (sin límite artificial en el cliente más allá de este filtro de fechas)
    const baseSemanas = [
      normalizeSemanaValue(formatDateUTC(addDaysUtc(m0, -14))),
      normalizeSemanaValue(formatDateUTC(addDaysUtc(m0, -7))),
      semanaLunesEsta,
      semanaLunesProxima,
      normalizeSemanaValue(formatDateUTC(addDaysUtc(m0, 14))),
      normalizeSemanaValue(formatDateUTC(addDaysUtc(m0, 21)))
    ];
    const extra = (extraSemanasRaw ?? []).map(normalizeSemanaValue).filter(Boolean);
    const semanas = [...new Set([...baseSemanas, ...extra])];
    const selectCols = "id,jugador_id,slot_id,semana,es_socio,inscrito_at,jugadores(nombre)";
    const pageSize = 500;
    const allRows = [];
    let from = 0;

    for (;;) {
      const { data, error } = await supabase
        .from("inscripciones")
        .select(selectCols)
        .in("semana", semanas)
        .order("slot_id", { ascending: true })
        .order("inscrito_at", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.warn("[loadInscripcionesSupabase]", error.message);
        return;
      }
      if (!data?.length) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    if (reloadToken !== undefined && reloadToken !== inscripcionesReloadGenRef.current) {
      return;
    }
    setInscripciones(allRows);
  }

  useEffect(() => {
    if (useFallback) {
      setInscripciones([]);
      return undefined;
    }

    const reloadToken = ++inscripcionesReloadGenRef.current;
    setInscripciones([]);

    let cancelled = false;
    (async () => {
      await loadSlotsSupabase();
      if (cancelled) return;
      await loadInscripcionesSupabase([], reloadToken);
    })();

    return () => {
      cancelled = true;
      inscripcionesReloadGenRef.current += 1;
    };
  }, [useFallback, currentUser?.id]);

  const slotsConEstado = useMemo(() => {
    const now = new Date();
    return slots.map((slot) => ({
      ...slot,
      abierto: isSlotOpen({ diaSemana: slot.diaSemana }),
      bajaWarning: isBajaWarning({ diaSemana: slot.diaSemana }),
      semanaObjetivo: getSemanaObjetivo(slot, now),
      jugadores: (
        useFallback
          ? slot.jugadores.map((j, idx) => normalizePlayerEntry(j, idx)).filter(Boolean)
          : inscripciones
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
          : inscripciones
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
              inscripciones.find(
                (ins) =>
                  ins.slot_id === slot.id &&
                  jugadorIdCoincide(ins.jugador_id, currentUser.id) &&
                  inscripcionEnSemanasRelevantes(ins, slot, now)
              )
          )
    }));
  }, [slots, currentUser, inscripciones, useFallback]);

  function getSlot(slotId) {
    return slots.find((s) => s.id === slotId);
  }

  async function apuntarEnSlot(slotId, options = {}) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const slot = slotsConEstado.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: "Slot no encontrado." };
    if (!slot.abierto) return { ok: false, error: "La lista aun no esta abierta." };

    const slotMismoDia = slotsConEstado.find(
      (s) => s.id !== slot.id && s.apuntado && sameDiaSemanaSlot(s, slot)
    );
    if (slotMismoDia) {
      return { ok: false, error: `Ya estas apuntado en ${slotMismoDia.label} ${slotMismoDia.club}.` };
    }

    if (useFallback) {
      const ts = Date.now();
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId &&
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
    const { error } = await supabase.from("inscripciones").insert({
      jugador_id: jugadorId,
      slot_id: slotId,
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
      slot_id: slotId,
      semana: semanaNorm,
      es_socio: Boolean(options.socio),
      inscrito_at: nowIso,
      jugadores: { nombre: currentUser.nombre }
    };
    setInscripciones((prev) => {
      const ya = prev.some(
        (r) =>
          r.slot_id === slotId &&
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
    const slot = slotsConEstado.find((s) => s.id === slotId);
    if (!slot) return { ok: false, error: "Slot no encontrado." };

    if (useFallback) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
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

      const { data: filasInsc, error: selErr } = await supabase
        .from("inscripciones")
        .select("semana")
        .eq("jugador_id", jugadorUuid)
        .eq("slot_id", slotId);

      if (selErr) return { ok: false, error: selErr.message };
      if (!filasInsc?.length) {
        return { ok: false, error: "No hay inscripción en este slot para tu usuario." };
      }

      const now = new Date();
      const objNorm = normalizeSemanaValue(slot.semanaObjetivo);
      const relSet = new Set(semanasRelevantesParaSlot(slot, now).map((d) => normalizeSemanaValue(d)));
      const semanasEnBd = filasInsc.map((f) => normalizeSemanaValue(f.semana)).filter(Boolean);

      const semanaPrioritaria =
        semanasEnBd.find((s) => s === objNorm) ??
        semanasEnBd.find((s) => relSet.has(s)) ??
        semanasEnBd[0];

      const { data: deleted, error: delErr } = await supabase
        .from("inscripciones")
        .delete()
        .eq("jugador_id", jugadorUuid)
        .eq("slot_id", slotId)
        .eq("semana", semanaPrioritaria)
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
              i.slot_id === slotId &&
              jugadoresCoinciden(i.jugador_id, jugadorUuid) &&
              normalizeSemanaValue(i.semana) === semanaPrioritaria
            )
        )
      );

      void createActivityLog({
        jugadorId: jugadorUuid,
        tipo: "jugar",
        texto: `Se da de baja de ${slot.label} · ${slot.club} (${slot.semanaObjetivo})`
      });
    }

    if (isBajaWarning({ diaSemana: slot.diaSemana })) {
      return {
        ok: true,
        warning: "Si te das de baja hoy, por favor busca un@ sustitut@ para el partido."
      };
    }
    return { ok: true };
  }

  return { slots: slotsConEstado, rawSlots: slots, slotsNotice, apuntarEnSlot, bajaEnSlot };
}
