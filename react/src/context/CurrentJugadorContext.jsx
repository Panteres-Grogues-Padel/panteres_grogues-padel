import { createContext, useCallback, useContext, useMemo } from "react";
import { avatarUrl } from "../utils/avatarUrl";

const CurrentJugadorContext = createContext(null);

export function CurrentJugadorProvider({ jugador, avatarVersion, refreshJugador, patchJugador, children }) {
  const jugadorConFoto = useMemo(() => {
    if (!jugador) return null;
    return {
      ...jugador,
      foto_url: avatarUrl(jugador.foto_url, avatarVersion)
    };
  }, [jugador, avatarVersion]);

  const value = useMemo(
    () => ({
      jugador: jugadorConFoto,
      fotoUrl: jugadorConFoto?.foto_url ?? null,
      avatarVersion,
      refreshJugador,
      patchJugador
    }),
    [jugadorConFoto, avatarVersion, refreshJugador, patchJugador]
  );

  return <CurrentJugadorContext.Provider value={value}>{children}</CurrentJugadorContext.Provider>;
}

export function useCurrentJugador() {
  const ctx = useContext(CurrentJugadorContext);
  if (!ctx) {
    throw new Error("useCurrentJugador must be used within CurrentJugadorProvider");
  }
  return ctx;
}

/** Retorna el jugador del context si és el mateix id; si no, el passat (altres jugadors). */
export function useJugadorConFoto(jugador) {
  const ctx = useContext(CurrentJugadorContext);
  const esYo =
    ctx?.jugador &&
    jugador?.id != null &&
    String(ctx.jugador.id) === String(jugador.id);

  if (esYo) return ctx.jugador;
  if (!jugador) return null;
  return {
    ...jugador,
    foto_url: avatarUrl(jugador.foto_url)
  };
}

export function useCurrentJugadorOptional() {
  return useContext(CurrentJugadorContext);
}
