import { useCallback, useEffect, useMemo, useState } from "react";
import { EVENTOS_INICIALES } from "../utils/mockData";
import { createActivityLog } from "../lib/engagement";
import { supabase } from "../lib/supabase";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";

function rowsFromRpc(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

export function useEventos(currentUser, isCoord) {
  const [eventos, setEventos] = useState(EVENTOS_INICIALES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);

  const loadEventos = useCallback(async () => {
    if (useFallback) return;
    setLoading(true);
    setError("");
    const { data: eventosData, error: eventosError } = await supabase
      .from("eventos")
      .select("id,titulo,descripcion,tipo,fecha,precio,hora,aforo_maximo")
      .order("fecha", { ascending: true });
    if (eventosError) {
      setLoading(false);
      setError(eventosError.message);
      return;
    }

    const { data: insRaw, error: insError } = await supabase.rpc("get_inscripciones_eventos");
    setLoading(false);
    if (insError) {
      setError(insError.message);
      return;
    }

    const byEvento = new Map();
    rowsFromRpc(insRaw).forEach((ins) => {
      const arr = byEvento.get(ins.evento_id) ?? [];
      arr.push({
        id: ins.id,
        jugadorId: ins.jugador_id,
        nombre: ins.nombre ?? "Jugador",
        nombreCompleto: ins.nombre_completo ?? ins.nombre ?? "Jugador",
        pareja: ins.pareja ?? "",
        pagoConfirmado: Boolean(ins.pago_confirmado)
      });
      byEvento.set(ins.evento_id, arr);
    });

    setEventos(
      (eventosData ?? []).map((e) => {
        const inscritos = byEvento.get(e.id) ?? [];
        const miInscripcion = inscritos.find((i) => jugadoresCoinciden(i.jugadorId, currentUser.id)) ?? null;
        return {
          id: e.id,
          titulo: e.titulo,
          desc: e.descripcion ?? "",
          tipo: e.tipo,
          fecha: e.fecha,
          hora: e.hora ?? null,
          aforoMaximo: e.aforo_maximo != null ? Number(e.aforo_maximo) : null,
          precio: Number(e.precio ?? 0),
          inscritos,
          totalInscritos: inscritos.length,
          totalPagados: inscritos.filter((i) => i.pagoConfirmado).length,
          miInscripcion
        };
      })
    );
  }, [useFallback, currentUser?.id]);

  useEffect(() => {
    loadEventos();
  }, [loadEventos]);

  const eventosOrdenados = useMemo(() => {
    const sorted = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return sorted.map((e) => {
      const inscritos = e.inscritos ?? [];
      const miInscripcion = currentUser
        ? inscritos.find((i) => jugadoresCoinciden(i.jugadorId, currentUser.id)) ?? null
        : null;
      return {
        ...e,
        inscritos,
        miInscripcion,
        totalInscritos: inscritos.length,
        totalPagados: inscritos.filter((i) => i.pagoConfirmado).length
      };
    });
  }, [eventos, currentUser]);

  async function crearEvento({ titulo, fecha, hora, descripcion, aforoMaximo }) {
    if (!isCoord) return { ok: false, error: "Solo coordinación." };
    const tituloTrim = String(titulo ?? "").trim();
    if (!tituloTrim) return { ok: false, error: "El título es obligatorio." };
    if (!fecha) return { ok: false, error: "La fecha es obligatoria." };

    let aforo = null;
    if (aforoMaximo !== "" && aforoMaximo != null) {
      aforo = Number(aforoMaximo);
      if (!Number.isInteger(aforo) || aforo < 1) {
        return { ok: false, error: "El aforo debe ser un número entero mayor que 0." };
      }
    }

    const horaVal = hora ? String(hora).trim() : null;

    if (useFallback) {
      setEventos((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          titulo: tituloTrim,
          desc: String(descripcion ?? "").trim(),
          tipo: "otro",
          fecha,
          hora: horaVal,
          aforoMaximo: aforo,
          precio: 0,
          inscritos: [],
          totalInscritos: 0,
          totalPagados: 0,
          miInscripcion: null
        }
      ]);
      return { ok: true };
    }

    const uid = normalizeJugadorUuid(currentUser.id);
    const { error: insError } = await supabase.from("eventos").insert({
      titulo: tituloTrim,
      fecha,
      descripcion: String(descripcion ?? "").trim() || null,
      tipo: "otro",
      precio: 0,
      hora: horaVal,
      aforo_maximo: aforo,
      creado_por: uid
    });
    if (insError) return { ok: false, error: insError.message };

    await createActivityLog({
      jugadorId: uid,
      tipo: "agenda",
      texto: `Crea evento: ${tituloTrim} (${fecha})`
    });
    await loadEventos();
    return { ok: true };
  }

  /** Inscripción individual: sin pareja en el alta (torneos y resto). */
  async function apuntarseEvento(eventoId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return { ok: false, error: "Evento no encontrado." };

    if (evento.aforoMaximo != null && (evento.inscritos?.length ?? 0) >= evento.aforoMaximo) {
      return { ok: false, error: "El evento está completo (aforo máximo alcanzado)." };
    }

    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) => {
          if (e.id !== eventoId) return e;
          if (e.inscritos.some((i) => jugadoresCoinciden(i.jugadorId, currentUser.id))) return e;
          return {
            ...e,
            inscritos: [
              ...e.inscritos,
              {
                id: `tmp-${Date.now()}`,
                jugadorId: currentUser.id,
                nombre: currentUser.nombre,
                nombreCompleto: currentUser.nombreCompleto,
                pareja: "",
                pagoConfirmado: false
              }
            ]
          };
        })
      );
      return { ok: true };
    }

    const uid = normalizeJugadorUuid(currentUser.id);
    const { error: insError } = await supabase.from("inscripciones_eventos").insert({
      evento_id: eventoId,
      jugador_id: uid,
      pareja: null
    });
    if (insError) return { ok: false, error: insError.message };
    await createActivityLog({
      jugadorId: uid,
      tipo: "agenda",
      texto: `Se apunta a ${evento.titulo} (${evento.fecha})`
    });
    await loadEventos();
    return { ok: true };
  }

  /** Pareja = `jugador_id` del compañer@ (debe estar ya inscrito en el mismo torneo). */
  async function setParejaTorneo(eventoId, parejaJugadorId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const pid = normalizeJugadorUuid(parejaJugadorId);
    if (!isJugadorUuid(pid)) return { ok: false, error: "Selecciona una pareja válida." };
    if (jugadoresCoinciden(pid, currentUser.id)) {
      return { ok: false, error: "No puedes emparejarte contigo mism@." };
    }

    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento || evento.tipo !== "torneo") return { ok: false, error: "Solo aplica a torneos." };
    const inscritos = evento.inscritos ?? [];
    const parejaInscrita = inscritos.some((i) => jugadoresCoinciden(i.jugadorId, pid));
    if (!parejaInscrita) return { ok: false, error: "Esa persona no está inscrita en este torneo." };

    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) => {
          if (e.id !== eventoId) return e;
          return {
            ...e,
            inscritos: e.inscritos.map((i) =>
              jugadoresCoinciden(i.jugadorId, currentUser.id) ? { ...i, pareja: pid } : i
            )
          };
        })
      );
      return { ok: true };
    }

    const { error: upError } = await supabase
      .from("inscripciones_eventos")
      .update({ pareja: pid })
      .eq("evento_id", eventoId)
      .eq("jugador_id", normalizeJugadorUuid(currentUser.id));
    if (upError) return { ok: false, error: upError.message };
    await loadEventos();
    return { ok: true };
  }

  async function bajaEvento(eventoId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const uid = normalizeJugadorUuid(currentUser.id);

    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) => {
          if (e.id !== eventoId) return e;
          return {
            ...e,
            inscritos: e.inscritos
              .filter((i) => !jugadoresCoinciden(i.jugadorId, currentUser.id))
              .map((i) => (jugadoresCoinciden(i.pareja, uid) ? { ...i, pareja: "" } : i))
          };
        })
      );
      return { ok: true };
    }

    const { error: clearErr } = await supabase
      .from("inscripciones_eventos")
      .update({ pareja: null })
      .eq("evento_id", eventoId)
      .eq("pareja", uid);
    if (clearErr) return { ok: false, error: clearErr.message };

    const evento = eventos.find((e) => e.id === eventoId);
    const { error: delError } = await supabase
      .from("inscripciones_eventos")
      .delete()
      .eq("evento_id", eventoId)
      .eq("jugador_id", uid);
    if (delError) return { ok: false, error: delError.message };
    await createActivityLog({
      jugadorId: uid,
      tipo: "agenda",
      texto: `Se da de baja de ${evento?.titulo ?? "evento"} (${evento?.fecha ?? eventoId})`
    });
    await loadEventos();
    return { ok: true };
  }

  /** Igual que `validarPago` en index.html: marca pago del inscrito (coordinador). */
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
        pago_confirmado_por: normalizeJugadorUuid(currentUser.id),
        pago_confirmado_at: new Date().toISOString()
      })
      .eq("id", inscripcionId);
    if (valError) return { ok: false, error: valError.message };
    await loadEventos();
    return { ok: true };
  }

  return {
    eventos: eventosOrdenados,
    crearEvento,
    apuntarseEvento,
    setParejaTorneo,
    bajaEvento,
    validarPago,
    loading,
    error
  };
}
