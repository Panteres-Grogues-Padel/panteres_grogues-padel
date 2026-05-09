import { useEffect, useMemo, useState } from "react";
import { EVENTOS_INICIALES } from "../utils/mockData";
import { supabase } from "../lib/supabase";
import { isJugadorUuid } from "../utils/jugador";

export function useEventos(currentUser, isCoord) {
  const [eventos, setEventos] = useState(EVENTOS_INICIALES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);

  async function loadEventos() {
    if (useFallback) return;
    setLoading(true);
    setError("");
    const { data: eventosData, error: eventosError } = await supabase
      .from("eventos")
      .select("id,titulo,descripcion,tipo,fecha,precio")
      .order("fecha", { ascending: true });
    if (eventosError) {
      setLoading(false);
      setError(eventosError.message);
      return;
    }

    const { data: insData, error: insError } = await supabase
      .from("inscripciones_eventos")
      .select("id,evento_id,jugador_id,pareja,pago_confirmado,jugadores(nombre,nombre_completo)")
      .order("inscrito_at", { ascending: true });
    setLoading(false);
    if (insError) {
      setError(insError.message);
      return;
    }

    const byEvento = new Map();
    (insData ?? []).forEach((ins) => {
      const arr = byEvento.get(ins.evento_id) ?? [];
      arr.push({
        id: ins.id,
        jugadorId: ins.jugador_id,
        nombre: ins.jugadores?.nombre ?? "Jugador",
        nombreCompleto: ins.jugadores?.nombre_completo ?? ins.jugadores?.nombre ?? "Jugador",
        pareja: ins.pareja ?? "",
        pagoConfirmado: Boolean(ins.pago_confirmado)
      });
      byEvento.set(ins.evento_id, arr);
    });

    setEventos(
      (eventosData ?? []).map((e) => {
        const inscritos = byEvento.get(e.id) ?? [];
        const miInscripcion = inscritos.find((i) => i.jugadorId === currentUser.id) ?? null;
        return {
          id: e.id,
          titulo: e.titulo,
          desc: e.descripcion ?? "",
          tipo: e.tipo,
          fecha: e.fecha,
          precio: Number(e.precio ?? 0),
          inscritos,
          totalInscritos: inscritos.length,
          totalPagados: inscritos.filter((i) => i.pagoConfirmado).length,
          miInscripcion
        };
      })
    );
  }

  useEffect(() => {
    loadEventos();
  }, [useFallback, currentUser?.id]);

  const eventosOrdenados = useMemo(
    () => [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [eventos]
  );

  async function apuntarseEvento(eventoId, pareja = "") {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return { ok: false, error: "Evento no encontrado." };
    if (evento.tipo === "torneo" && !pareja.trim()) {
      return { ok: false, error: "En torneos debes indicar pareja." };
    }

    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) => {
          if (e.id !== eventoId) return e;
          if (e.inscritos.some((i) => i.jugadorId === currentUser.id)) return e;
          return {
            ...e,
            inscritos: [
              ...e.inscritos,
              {
                id: `tmp-${Date.now()}`,
                jugadorId: currentUser.id,
                nombre: currentUser.nombre,
                nombreCompleto: currentUser.nombreCompleto,
                pareja,
                pagoConfirmado: false
              }
            ]
          };
        })
      );
      return { ok: true };
    }

    const { error: insError } = await supabase.from("inscripciones_eventos").insert({
      evento_id: eventoId,
      jugador_id: currentUser.id,
      pareja: pareja || null
    });
    if (insError) return { ok: false, error: insError.message };
    await loadEventos();
    return { ok: true };
  }

  async function bajaEvento(eventoId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) =>
          e.id === eventoId
            ? { ...e, inscritos: e.inscritos.filter((i) => i.jugadorId !== currentUser.id) }
            : e
        )
      );
      return { ok: true };
    }
    const { error: delError } = await supabase
      .from("inscripciones_eventos")
      .delete()
      .eq("evento_id", eventoId)
      .eq("jugador_id", currentUser.id);
    if (delError) return { ok: false, error: delError.message };
    await loadEventos();
    return { ok: true };
  }

  async function validarPago(eventoId, inscripcionId) {
    if (!isCoord) return { ok: false, error: "Solo coordinacion." };
    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) =>
          e.id === eventoId
            ? {
                ...e,
                inscritos: e.inscritos.map((i) =>
                  i.id === inscripcionId ? { ...i, pagoConfirmado: true } : i
                )
              }
            : e
        )
      );
      return { ok: true };
    }

    const { error: valError } = await supabase
      .from("inscripciones_eventos")
      .update({
        pago_confirmado: true,
        pago_confirmado_por: currentUser.id,
        pago_confirmado_at: new Date().toISOString()
      })
      .eq("id", inscripcionId);
    if (valError) return { ok: false, error: valError.message };
    await loadEventos();
    return { ok: true };
  }

  return { eventos: eventosOrdenados, apuntarseEvento, bajaEvento, validarPago, loading, error };
}
