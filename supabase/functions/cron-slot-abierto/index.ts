import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TIPO = "slot_abierto";
const TITULO = "Ja et pots apuntar!";

const DIES_ES_CA: Record<string, string> = {
  Lunes: "Dilluns",
  Martes: "Dimarts",
  Miércoles: "Dimecres",
  Miercoles: "Dimecres",
  Jueves: "Dijous",
  Viernes: "Divendres",
  Sábado: "Dissabte",
  Sabado: "Dissabte",
  Domingo: "Diumenge"
};

type SlotRow = { id: string; label: string; club: string; nombre: string };
type JugadorRow = { id: string };

function rowsFromRpc<T>(data: unknown): T[] {
  if (data == null) return [];
  return Array.isArray(data) ? (data as T[]) : [data as T];
}

function diaSetmanaCa(label: string): string {
  const trimmed = String(label ?? "").trim();
  return DIES_ES_CA[trimmed] ?? trimmed;
}

function nombreSlot(slot: SlotRow): string {
  if (slot.nombre) {
    const parts = String(slot.nombre).split(" · ");
    if (parts.length >= 2) {
      return `${diaSetmanaCa(parts[0])} · ${parts.slice(1).join(" · ")}`;
    }
    return diaSetmanaCa(slot.nombre);
  }
  const dia = diaSetmanaCa(slot.label ?? "");
  if (slot.club) return `${dia} · ${slot.club}`;
  return dia || "el teu slot";
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: slotsRaw, error: slotsError } = await supabase.rpc("get_slots_apertura_hoy", {});
  if (slotsError) {
    console.error("[cron-slot-abierto] get_slots_apertura_hoy", slotsError.message);
    return new Response(JSON.stringify({ ok: false, error: slotsError.message }), { status: 500 });
  }

  const slots = rowsFromRpc<SlotRow>(slotsRaw);
  if (!slots.length) {
    return new Response(
      JSON.stringify({ ok: true, slots: 0, inserted: 0, skipped: 0, message: "Cap slot obre avui" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: jugadoresRaw, error: jugadoresError } = await supabase.rpc("get_jugadores_activos", {});
  if (jugadoresError) {
    console.error("[cron-slot-abierto] get_jugadores_activos", jugadoresError.message);
    return new Response(JSON.stringify({ ok: false, error: jugadoresError.message }), { status: 500 });
  }

  const jugadores = rowsFromRpc<JugadorRow>(jugadoresRaw);
  let inserted = 0;
  let skipped = 0;

  for (const slot of slots) {
    const texto = `Les inscripcions per a ${nombreSlot(slot)} ja estan obertes`;

    for (const jugador of jugadores) {
      if (!jugador?.id) continue;

      const { data: duplicada, error: dupError } = await supabase.rpc("notificacion_duplicada", {
        p_jugador_id: jugador.id,
        p_tipo: TIPO,
        p_titulo: TITULO,
        p_texto: texto
      });

      if (dupError) {
        console.warn("[cron-slot-abierto] notificacion_duplicada", dupError.message);
        continue;
      }

      if (duplicada) {
        skipped += 1;
        continue;
      }

      const { error: insertError } = await supabase.from("notificaciones").insert({
        jugador_id: jugador.id,
        tipo: TIPO,
        titulo: TITULO,
        texto
      });

      if (insertError) {
        console.warn("[cron-slot-abierto] insert", insertError.message);
        continue;
      }

      inserted += 1;
    }
  }

  const body = {
    ok: true,
    slots: slots.length,
    jugadores: jugadores.length,
    inserted,
    skipped
  };

  console.log("[cron-slot-abierto]", JSON.stringify(body));

  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" }
  });
});
