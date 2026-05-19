import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TIPO = "slot_abierto";
const TITULO = "¡Ya puedes inscribirte!";

type SlotRow = { id: string; label: string; club: string; nombre: string };
type JugadorRow = { id: string };

function rowsFromRpc<T>(data: unknown): T[] {
  if (data == null) return [];
  return Array.isArray(data) ? (data as T[]) : [data as T];
}

function nombreSlot(slot: SlotRow): string {
  return slot.nombre || slot.label || slot.club || "tu slot";
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
      JSON.stringify({ ok: true, slots: 0, inserted: 0, skipped: 0, message: "No slots abren hoy" }),
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
    const texto = `Las inscripciones para ${nombreSlot(slot)} ya están abiertas`;

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
