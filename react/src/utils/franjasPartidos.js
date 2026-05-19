import { formatHoraInput } from "./dates";

export function createFranjaId() {
  return `franja-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createFranjaInicial(overrides = {}) {
  return {
    id: createFranjaId(),
    hora: "20:00",
    outdoor: 2,
    indoor: 0,
    ...overrides
  };
}

/** Expande franjas ordenadas por hora en slots de pista (outdoor antes que indoor en cada franja). */
export function expandFranjasToPistas(franjas) {
  const sorted = [...(franjas ?? [])].sort((a, b) =>
    String(a.hora || "").localeCompare(String(b.hora || ""))
  );
  const slots = [];
  for (const f of sorted) {
    const hora = formatHoraInput(f.hora) || "20:00";
    const outdoor = Math.max(0, Number(f.outdoor) || 0);
    const indoor = Math.max(0, Number(f.indoor) || 0);
    for (let i = 0; i < outdoor; i++) {
      slots.push({ hora, esIndoor: false });
    }
    for (let i = 0; i < indoor; i++) {
      slots.push({ hora, esIndoor: true });
    }
  }
  return slots;
}

/** Mezcla horarios (y tipo indoor/outdoor) entre pistas antes de asignar a grupos. */
export function shufflePistasPlan(pistas) {
  const copy = [...(pistas ?? [])];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function resumenFranjas(franjas, numJugadores = 0) {
  const pistas = expandFranjasToPistas(franjas);
  const totalPistas = pistas.length;
  const capacidad = totalPistas * 4;
  const titulares = Math.min(numJugadores, capacidad);
  const reserva = Math.max(0, numJugadores - titulares);
  const totalIndoor = pistas.filter((p) => p.esIndoor).length;
  return { totalPistas, totalIndoor, titulares, reserva, capacidad };
}

export function validarFranjas(franjas) {
  if (!franjas?.length) {
    return { ok: false, error: "Añade al menos una franja horaria." };
  }
  for (const f of franjas) {
    if (!formatHoraInput(f.hora)) {
      return { ok: false, error: "Indica la hora de cada franja." };
    }
    const outdoor = Number(f.outdoor) || 0;
    const indoor = Number(f.indoor) || 0;
    if (outdoor + indoor < 1) {
      return { ok: false, error: "Cada franja debe tener al menos una pista." };
    }
  }
  const { totalPistas } = resumenFranjas(franjas);
  if (totalPistas < 1) {
    return { ok: false, error: "Configura al menos una pista en las franjas." };
  }
  return { ok: true };
}

/** Reconstruye franjas desde partidos ya generados (para regenerar). */
export function franjasFromPartidos(partidos) {
  const byHora = new Map();
  for (const p of partidos ?? []) {
    const hora = formatHoraInput(p.hora) || "20:00";
    if (!byHora.has(hora)) {
      byHora.set(hora, { outdoor: 0, indoor: 0 });
    }
    const g = byHora.get(hora);
    if (p.indoor) g.indoor += 1;
    else g.outdoor += 1;
  }
  if (!byHora.size) {
    return [createFranjaInicial()];
  }
  return [...byHora.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hora, counts]) =>
      createFranjaInicial({
        hora,
        outdoor: counts.outdoor,
        indoor: counts.indoor
      })
    );
}
