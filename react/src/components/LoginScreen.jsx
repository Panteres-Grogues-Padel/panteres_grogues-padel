export default function LoginScreen() {
  return (
    <section className="screen active">
      <div className="login-screen">
        <div className="login-card">
          <div className="login-title">Panteres Grogues Padel</div>
          <div className="login-sub">Inicia sesion para continuar</div>

          <div className="form-group">
            <label className="login-label">Email</label>
            <input type="text" placeholder="tu@email.com" />
          </div>

          <div className="form-group">
            <label className="login-label">Contrasena</label>
            <input type="password" placeholder="••••••••" />
          </div>

          <button className="btn btn-primary btn-block">Entrar</button>
          <div className="login-divider">
            <span>o acceso demo</span>
          </div>
          <select>
            <option>Selecciona un usuario demo...</option>
          </select>
          <button className="btn btn-block">Entrar como demo</button>
        </div>
      </div>
    </section>
  );
}
