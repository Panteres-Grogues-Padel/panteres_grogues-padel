export default function Overlays() {
  return (
    <>
      <div className="profile-overlay">
        <div className="profile-sheet">
          <div className="profile-handle" />
          <p>Perfil de jugador</p>
          <button className="close-btn">Cerrar</button>
        </div>
      </div>

      <div className="toast">Notificacion</div>
    </>
  );
}
