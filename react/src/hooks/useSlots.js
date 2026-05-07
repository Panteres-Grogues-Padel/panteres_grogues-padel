import { useEffect, useMemo, useState } from "react";
import { SLOTS_INICIALES } from "../utils/mockData";
import { isBajaWarning, isSlotOpen } from "../utils/slots";
import { supabase } from "../lib/supabase";
import { createActivityLog } from "../lib/engagement";

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSemanaObjetivo(slot, now = new Date()) {
  const monday = getMonday(now);
  const open = isSlotOpen({ diaSemana: slot.diaSemana });
  if (open) monday.setDate(monday.getDate() + 7);
  return formatDate(monday);
}

export function useSlots(currentUser) {
  const [slots, setSlots] = useState(SLOTS_INICIALES);
  const [inscripciones, setInscripciones] = useState([]);

  const useFallback = !supabase || !currentUser?.id || currentUser.fromFallback === true;

  async function loadSlotsSupabase() {
    const { data, error } = await supabase
      .from("slots")
      .select("id,label,club,dia_semana,pistas_activo,activo")
      .eq("activo", true)
      .order("dia_semana", { ascending: true });
    if (!error && data) {
      setSlots(
        data.map((s) => ({
          id: s.id,
          label: s.label,
          club: s.club,
          diaSemana: s.dia_semana,
          pistas: s.pistas_activo,
          jugadores: []
        }))
      );
    }
  }

  async function loadInscripcionesSupabase() {
    if (!currentUser?.id) return;
    const now = new Date();
    const mondayCurrent = formatDate(getMonday(now));
    const mondayNext = formatDate(new Date(getMonday(now).getTime() + 7 * 24 * 3600 * 1000));
    const { data, error } = await supabase
      .from("inscripciones")
      .select("id,jugador_id,slot_id,semana,jugadores(nombre)")
      .in("semana", [mondayCurrent, mondayNext]);
    if (!error && data) setInscripciones(data);
  }

  useEffect(() => {
    if (useFallback) return;
    loadSlotsSupabase();
    loadInscripcionesSupabase();
  }, [useFallback, currentUser?.id]);

  const slotsConEstado = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        abierto: isSlotOpen({ diaSemana: slot.diaSemana }),
        semanaObjetivo: getSemanaObjetivo(slot),
        jugadores: useFallback
          ? slot.jugadores
          : inscripciones
              .filter((ins) => ins.slot_id === slot.id && ins.semana === getSemanaObjetivo(slot))
              .map((ins) => ins.jugadores?.nombre ?? ins.jugador_id),
        apuntado: useFallback
          ? Boolean(currentUser && slot.jugadores.includes(currentUser.nombre))
          : Boolean(
              currentUser &&
                inscripciones.find(
                  (ins) =>
                    ins.slot_id === slot.id &&
                    ins.semana === getSemanaObjetivo(slot) &&
                    ins.jugador_id === currentUser.id
                )
            )
      })),
    [slots, currentUser, inscripciones, useFallback]
  );

  function getSlot(slotId) {
    return slots.find((s) => s.id === slotId);
  }

  async function apuntarEnSlot(slotId) {
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
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId && !s.jugadores.includes(currentUser.nombre)
            ? { ...s, jugadores: [...s.jugadores, currentUser.nombre] }
            : s
        )
      );
      return { ok: true };
    }

    const { error } = await supabase.from("inscripciones").insert({
      jugador_id: currentUser.id,
      slot_id: slotId,
      semana: slot.semanaObjetivo,
      es_socio: false
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
          s.id === slotId ? { ...s, jugadores: s.jugadores.filter((n) => n !== currentUser.nombre) } : s
        )
      );
    } else {
      const { error } = await supabase
        .from("inscripciones")
        .delete()
        .eq("jugador_id", currentUser.id)
        .eq("slot_id", slotId)
        .eq("semana", slot.semanaObjetivo);
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

  return { slots: slotsConEstado, rawSlots: slots, apuntarEnSlot, bajaEnSlot };
}
