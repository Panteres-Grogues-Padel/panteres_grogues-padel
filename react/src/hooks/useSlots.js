import { useEffect, useMemo, useState } from "react";
import { SLOTS_INICIALES } from "../utils/mockData";
import { isBajaWarning, isSlotOpen } from "../utils/slots";
import { supabase } from "../lib/supabase";
import { createActivityLog } from "../lib/engagement";

/** jugadores.id en Supabase es uuid; los usuarios demo usan números y no deben llamar a la API. */
function isJugadorUuid(id) {
  if (id == null || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

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
 * Semanas a mostrar / comprobar para un slot: lunes UTC actual y lunes de alta.
 */
function semanasRelevantesParaSlot(slot, now = new Date()) {
  const lunesEsta = formatDateUTC(getMondayUtc(now));
  const objetivo = getSemanaObjetivo(slot, now);
  return lunesEsta === objetivo ? [lunesEsta] : [lunesEsta, objetivo];
}

function inscripcionEnSemanasRelevantes(ins, slot, now = new Date()) {
  const s = normalizeSemanaValue(ins.semana);
  return semanasRelevantesParaSlot(slot, now).includes(s);
}

export function useSlots(currentUser) {
  const [slots, setSlots] = useState(SLOTS_INICIALES);
  const [inscripciones, setInscripciones] = useState([]);
  const [slotsNotice, setSlotsNotice] = useState("");

  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);

  async function loadSlotsSupabase() {
    // Tabla slots (seed): id, label, club, dia_semana, pistas_default, pistas_activo, activo — no existe columna nombre.
    const { data, error } = await supabase
      .from("slots")
      .select("id,label,club,dia_semana,pistas_default,pistas_activo,activo")
      .eq("activo", true)
      .order("dia_semana", { ascending: true });
    if (error) {
      setSlotsNotice(
        `Error al leer slots (tabla slots, campo activo): ${error.message}. Se muestran slots de respaldo.`
      );
      setSlots(SLOTS_INICIALES);
      return;
    }
    if (data?.length) {
      setSlotsNotice("");
      setSlots(
        data.map((s) => ({
          id: s.id,
          label: s.label,
          club: s.club,
          diaSemana: s.dia_semana,
          pistasDefault: Number(s.pistas_default ?? 0),
          // UI y cupos: solo pistas_activo (no pistas_default)
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

  async function loadInscripcionesSupabase() {
    if (!currentUser?.id) return;
    const now = new Date();
    const m0 = getMondayUtc(now);
    const semanaActual = normalizeSemanaValue(formatDateUTC(m0));
    const semanas = [
      normalizeSemanaValue(formatDateUTC(addDaysUtc(m0, -7))),
      semanaActual,
      normalizeSemanaValue(formatDateUTC(addDaysUtc(m0, 7)))
    ];
    // jugadores(nombre): FK jugadores. slots(label): FK slot_id → slots.
    const { data, error } = await supabase
      .from("inscripciones")
      .select("id,jugador_id,slot_id,semana,es_socio,inscrito_at,jugadores(nombre),slots(label)")
      .in("semana", semanas);
    if (!error && data) setInscripciones(data);
  }

  useEffect(() => {
    if (useFallback) return;
    loadSlotsSupabase();
    loadInscripcionesSupabase();
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
                  ins.jugador_id === currentUser.id &&
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
      (s) => s.diaSemana === slot.diaSemana && s.id !== slot.id && s.apuntado
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

    const { error } = await supabase.from("inscripciones").insert({
      jugador_id: currentUser.id,
      slot_id: slotId,
      semana: slot.semanaObjetivo,
      es_socio: Boolean(options.socio)
    });
    if (error) return { ok: false, error: error.message };
    await createActivityLog({
      jugadorId: currentUser.id,
      tipo: "jugar",
      texto: `Se apunta a ${slot.label} · ${slot.club} (${slot.semanaObjetivo})`
    });
    await loadInscripcionesSupabase();
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
      const now = new Date();
      const miInscripcion = inscripciones.find(
        (ins) =>
          ins.slot_id === slotId &&
          ins.jugador_id === currentUser.id &&
          inscripcionEnSemanasRelevantes(ins, slot, now)
      );
      const semanaBaja = miInscripcion ? normalizeSemanaValue(miInscripcion.semana) : slot.semanaObjetivo;
      const { error } = await supabase
        .from("inscripciones")
        .delete()
        .eq("jugador_id", currentUser.id)
        .eq("slot_id", slotId)
        .eq("semana", semanaBaja);
      if (error) return { ok: false, error: error.message };
      await createActivityLog({
        jugadorId: currentUser.id,
        tipo: "jugar",
        texto: `Se da de baja de ${slot.label} · ${slot.club} (${slot.semanaObjetivo})`
      });
      await loadInscripcionesSupabase();
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
