import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TIPO = "aniversari";
const TITULO = "Aniversari!";

type CumpleaneroRow = { id: string; nickname?: string | null; nombre?: string | null; nombre_completo?: string | null };
type JugadorRow = { id: string };

function rowsFromRpc<T>(data: unknown): T[] {
  if (data == null) return [];
  return Array.isArray(data) ? (data as T[]) : [data as T];
}

function nombreVisible(j: CumpleaneroRow): string {
  const nick = (j.nickname ?? "").trim();
  if (nick) return nick;
  const nombre = (j.nombre ?? j.nombre_completo ?? "").trim();
  return nombre || "un jugador";
}

function textoAniversari(cumpleaneros: CumpleaneroRow[]): string {
  const nicks = cumpleaneros.map(nombreVisible).filter(Boolean);
  if (!nicks.length) return "";
  if (nicks.length === 1) return `Avui és l'aniversari de ${nicks[0]}!`;
  if (nicks.length === 2) return `Avui és l'aniversari de ${nicks[0]} i ${nicks[1]}!`;
  const last = nicks[nicks.length - 1];
  return `Avui és l'aniversari de ${nicks.slice(0, -1).join(", ")} i ${last}!`;
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

  const { data: cumpleRaw, error: cumpleError } = await supabase.rpc("get_cumpleanos_hoy", {});
  if (cumpleError) {
    console.error("[cron-cumpleanos] get_cumpleanos_hoy", cumpleError.message);
    return new Response(JSON.stringify({ ok: false, error: cumpleError.message }), { status: 500 });
  }

  const cumpleaneros = rowsFromRpc<CumpleaneroRow>(cumpleRaw);
  if (!cumpleaneros.length) {
    return new Response(
      JSON.stringify({ ok: true, cumpleaneros: 0, inserted: 0, skipped: 0, message: "Cap aniversari avui" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const texto = textoAniversari(cumpleaneros);
  if (!texto) {
    return new Response(
      JSON.stringify({ ok: true, cumpleaneros: cumpleaneros.length, inserted: 0, skipped: 0, message: "Sense noms" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: jugadoresRaw, error: jugadoresError } = await supabase.rpc("get_jugadores_activos", {});
  if (jugadoresError) {
    console.error("[cron-cumpleanos] get_jugadores_activos", jugadoresError.message);
    return new Response(JSON.stringify({ ok: false, error: jugadoresError.message }), { status: 500 });
  }

  const jugadores = rowsFromRpc<JugadorRow>(jugadoresRaw);
  let inserted = 0;
  let skipped = 0;

  for (const jugador of jugadores) {
    if (!jugador?.id) continue;

    const { data: duplicada, error: dupError } = await supabase.rpc("notificacion_duplicada", {
      p_jugador_id: jugador.id,
      p_tipo: TIPO,
      p_titulo: TITULO,
      p_texto: texto
    });

    if (dupError) {
      console.warn("[cron-cumpleanos] notificacion_duplicada", dupError.message);
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
      console.warn("[cron-cumpleanos] insert", insertError.message);
      continue;
    }

    inserted += 1;
  }

  const body = {
    ok: true,
    cumpleaneros: cumpleaneros.length,
    jugadores: jugadores.length,
    inserted,
    skipped,
    texto
  };

  console.log("[cron-cumpleanos]", JSON.stringify(body));

  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" }
  });
});
