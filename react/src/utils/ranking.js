const PEN = { 1: 0.48, 2: 0.43, 3: 0.38, 4: 0.33, 5: 0.27, 6: 0.2, 7: 0.13, 8: 0.05 };

export function getPenalizacion(partidosJugados) {
  return PEN[partidosJugados] ?? 0;
}

export function calcularRanking(jugador) {
  const eficacia = ((jugador.pg / jugador.pj) + (jugador.jg / jugador.jj)) / 2;
  const penalizacion = getPenalizacion(jugador.pj);
  const score = eficacia * (1 - penalizacion);
  return { eficacia, penalizacion, score };
}

export function rankearJugadores(jugadores) {
  return [...jugadores]
    .map((jugador) => {
      const normalized = {
        ...jugador,
        telefono: jugador.telefono ?? jugador.tel ?? "",
        instagram: jugador.instagram ?? jugador.ig ?? "",
        mostrar_telefono: jugador.mostrar_telefono ?? jugador.mostrarTel ?? false,
        autoriza_instagram: jugador.autoriza_instagram ?? jugador.autorizaIG ?? false,
        foto_url: jugador.foto_url ?? jugador.foto ?? null
      };
      return { ...normalized, ...calcularRanking(normalized) };
    })
    .sort((a, b) => b.score - a.score);
}
