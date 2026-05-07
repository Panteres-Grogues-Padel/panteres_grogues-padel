import { useEffect, useMemo, useRef, useState } from "react";
import { PARTIDOS_INICIALES } from "../utils/mockData";
import { supabase } from "../lib/supabase";
import { createActivityLog, createNotifications } from "../lib/engagement";

const ROTACIONES = [
  { izq: [0, 3], der: [1, 2] },
  { izq: [0, 2], der: [1, 3] },
  { izq: [0, 1], der: [2, 3] }
];

function flattenPartidos(data) {
  const items = [];
  (data ?? []).forEach((pg) => {
    (pg.pistas_partido ?? []).forEach((pista) => {
      const jugadoresOrdenados = [...(pista.jugadores_pista ?? [])]
        .sort((a, b) => a.posicion - b.posicion)
        .map((jp) => ({
          id: jp.id,
          jugadorId: jp.jugador_id,
          nombre: jp.jugadores?.nombre ?? "Jugador",
          nombreCompleto: jp.jugadores?.nombre_completo ?? jp.jugadores?.nombre ?? "Jugador",
          posicion: jp.posicion,
          confirmado: Boolean(jp.confirmado)
        }));

      items.push({
        id: pista.id,
        pistaId: pista.id,
        partidoGeneradoId: pg.id,
        slotId: pg.slot_id,
        slotLabel: pg.slots?.label ?? pg.slot_id,
        club: pg.slots?.club ?? "",
        diaSemana: pg.slots?.dia_semana ?? null,
        semana: pg.semana,
        indoor: Boolean(pista.es_indoor),
        hora: pista.hora ?? "",
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

export function usePartidos(currentUser) {
  const [partidos, setPartidos] = useState(PARTIDOS_INICIALES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const useFallback = !supabase || !currentUser?.id || currentUser.fromFallback === true;
  const remindersSentRef = useRef(new Set());

  async function loadPartidos() {
    if (useFallback) return;
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("partidos_generados")
      .select(
        "id,slot_id,semana,pistas_partido(id,numero_pista,hora,es_indoor,jugadores_pista(id,jugador_id,posicion,confirmado,jugadores(nombre,nombre_completo))),slots(label,club,dia_semana)"
      )
      .order("semana", { ascending: false });

    setLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setPartidos(flattenPartidos(data));
  }

  useEffect(() => {
    loadPartidos();
  }, [useFallback]);

  useEffect(() => {
    if (useFallback || !currentUser?.es_coordinador) return;
    const today = new Date().toISOString().slice(0, 10);
    partidos.forEach((p) => {
      const fechaPartido = getFechaPartido(p.semana, p.diaSemana);
      if (!fechaPartido) return;
      const diffDays = Math.floor(
        (new Date(`${fechaPartido}T00:00:00`) - new Date(`${today}T00:00:00`)) / (1000 * 60 * 60 * 24)
      );
      if (diffDays !== 2) return;
      const key = `${p.id}:${fechaPartido}`;
      if (remindersSentRef.current.has(key)) return;
      remindersSentRef.current.add(key);
      const notifications = p.jugadores.map((j) => ({
        jugadorId: j.jugadorId,
        tipo: "partidos",
        titulo: "Recordatorio de partido en 2 dias",
        texto: `${p.slotLabel} · ${p.club} · ${fechaPartido}`
      }));
      createNotifications(notifications);
    });
  }, [partidos, useFallback, currentUser?.es_coordinador]);

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
  }, [useFallback]);

  const partidosAgrupados = useMemo(() => {
    const map = {};
    partidos.forEach((p) => {
      if (!map[p.fecha]) map[p.fecha] = [];
      map[p.fecha].push(p);
    });
    return map;
  }, [partidos]);

  async function generarPartidos({ jugadoresRanking, slotId, semana, currentUserId }) {
    if (useFallback) {
      const generados = groupsOf4(jugadoresRanking).map((g, idx) => ({
        id: `${Date.now()}-${idx}`,
        pistaId: `${Date.now()}-${idx}`,
        partidoGeneradoId: `pg-${Date.now()}`,
        slotId,
        slotLabel: slotId,
        club: "",
        semana,
        indoor: false,
        hora: "",
        jugadores: g.map((j, i) => ({
          jugadorId: j.id,
          nombre: j.nombre,
          nombreCompleto: j.nombreCompleto,
          posicion: i + 1,
          confirmado: false
        }))
      }));
      setPartidos((prev) => [...generados, ...prev]);
      return { ok: true, cantidad: generados.length };
    }

    const { data: inscripciones, error: insError } = await supabase
      .from("inscripciones")
      .select("jugador_id")
      .eq("slot_id", slotId)
      .eq("semana", semana);
    if (insError) return { ok: false, error: insError.message };

    const inscritosIds = new Set((inscripciones ?? []).map((i) => i.jugador_id));
    const candidatos = jugadoresRanking.filter((j) => inscritosIds.has(j.id));
    const grupos = groupsOf4(candidatos);
    if (!grupos.length) return { ok: false, error: "No hay suficientes jugadores para generar pistas de 4." };

    const { data: prevGenerated } = await supabase
      .from("partidos_generados")
      .select("id")
      .eq("slot_id", slotId)
      .eq("semana", semana)
      .maybeSingle();

    const { data: upserted, error: pgError } = await supabase
      .from("partidos_generados")
      .upsert(
        {
          slot_id: slotId,
          semana,
          num_pistas: grupos.length,
          num_indoor: 0,
          generado_por: currentUserId
        },
        { onConflict: "slot_id,semana" }
      )
      .select("id")
      .single();
    if (pgError) return { ok: false, error: pgError.message };

    const partidoGeneradoId = upserted.id;
    const { data: oldPistas } = await supabase
      .from("pistas_partido")
      .select("id")
      .eq("partido_generado_id", partidoGeneradoId);
    if (oldPistas?.length) {
      await supabase.from("pistas_partido").delete().eq("partido_generado_id", partidoGeneradoId);
    }

    for (let i = 0; i < grupos.length; i += 1) {
      const { data: pista, error: pistaError } = await supabase
        .from("pistas_partido")
        .insert({
          partido_generado_id: partidoGeneradoId,
          numero_pista: i + 1,
          es_indoor: false
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
    }

    await loadPartidos();
    const generatedType = prevGenerated?.id ? "Regeneracion de partidos" : "Partidos generados";
    await createActivityLog({
      jugadorId: currentUserId,
      tipo: "partidos",
      texto: `${generatedType} para ${slotId} (${semana}) · ${grupos.length} pistas`
    });
    const notifications = grupos
      .flatMap((g) => g)
      .map((j) => ({
        jugadorId: j.id,
        tipo: "partidos",
        titulo: generatedType,
        texto: `${slotId} · Semana ${semana}`
      }));
    await createNotifications(notifications);
    return { ok: true, cantidad: grupos.length };
  }

  async function asignarHora(partidoId, hora) {
    if (useFallback) {
      setPartidos((prev) => prev.map((p) => (p.id === partidoId ? { ...p, hora } : p)));
      return { ok: true };
    }
    const { error: updateError } = await supabase
      .from("pistas_partido")
      .update({ hora })
      .eq("id", partidoId);
    if (updateError) return { ok: false, error: updateError.message };
    await loadPartidos();
    return { ok: true };
  }

  async function toggleIndoor(partidoId) {
    if (useFallback) {
      setPartidos((prev) => prev.map((p) => (p.id === partidoId ? { ...p, indoor: !p.indoor } : p)));
      return { ok: true };
    }
    const partido = partidos.find((p) => p.id === partidoId);
    if (!partido) return { ok: false, error: "Partido no encontrado." };
    const { error: updateError } = await supabase
      .from("pistas_partido")
      .update({ es_indoor: !partido.indoor })
      .eq("id", partidoId);
    if (updateError) return { ok: false, error: updateError.message };
    await loadPartidos();
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
    await loadPartidos();
    return true;
  }

  async function confirmarAsistencia(partidoId, jugadorId, confirmado) {
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
    await loadPartidos();
    return { ok: true };
  }

  return {
    partidos,
    setPartidos,
    partidosAgrupados,
    loading,
    error,
    generarPartidos,
    asignarHora,
    toggleIndoor,
    moverJugador,
    confirmarAsistencia,
    rotaciones: ROTACIONES
  };
}
