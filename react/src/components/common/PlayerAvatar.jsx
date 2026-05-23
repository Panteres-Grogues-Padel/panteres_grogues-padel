import { avatarClassFromNombre, initialsFromNombre } from "../../utils/avatar";
import { getNombre } from "../../utils/nombres";

export default function PlayerAvatar({
  jugador,
  nombre,
  fotoUrl,
  size = 40,
  className = "",
  style = {}
}) {
  const displayName = nombre ?? (jugador ? getNombre(jugador) || jugador.nombreCompleto || jugador.nombre : "");
  const foto = fotoUrl ?? jugador?.foto_url ?? null;
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
