import { avatarClassFromNombre, initialsFromNombre } from "../../utils/avatar";
import { avatarUrl } from "../../utils/avatarUrl";
import { useJugadorConFoto } from "../../context/CurrentJugadorContext";
import { getNombre } from "../../utils/nombres";

export default function PlayerAvatar({
  jugador,
  nombre,
  fotoUrl,
  size = 40,
  className = "",
  style = {}
}) {
  const jugadorResuelto = useJugadorConFoto(jugador);
  const displayName =
    nombre ??
    (jugadorResuelto ? getNombre(jugadorResuelto) || jugadorResuelto.nombreCompleto || jugadorResuelto.nombre : "");
  const foto = fotoUrl ?? jugadorResuelto?.foto_url ?? avatarUrl(jugador?.foto_url) ?? null;
  const initials = initialsFromNombre(displayName);
  const avClass = avatarClassFromNombre(displayName);
  const boxStyle = {
    width: size,
    height: size,
    fontSize: Math.max(10, Math.round(size * 0.34)),
    ...style
  };

  if (foto) {
    return (
      <div className={`player-avatar ${className}`.trim()} style={boxStyle} aria-hidden>
        <img src={foto} alt="" />
      </div>
    );
  }

  return (
    <div className={`player-avatar profile-av ${avClass} ${className}`.trim()} style={boxStyle} aria-hidden>
      {initials}
    </div>
  );
}
