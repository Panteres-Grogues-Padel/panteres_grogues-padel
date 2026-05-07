export default function LoginScreen({ auth }) {
  return (
    <section className="screen active">
      <div className="login-screen">
        <div className="login-card">
          <div className="login-title">Panteres Grogues Padel</div>
          <div className="login-sub">Inicia sesion para continuar</div>

          <div className="form-group">
            <label className="login-label">Email</label>
            <input
              type="text"
              value={auth.email}
              onChange={(e) => auth.setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label className="login-label">Contrasena</label>
            <input
              type="password"
              value={auth.password}
              onChange={(e) => auth.setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <label className="privacy-row">
            <input
              type="checkbox"
              checked={auth.privacyAccepted}
              onChange={(e) => auth.setPrivacyAccepted(e.target.checked)}
            />
            <span>Acepto la politica de privacidad</span>
          </label>

          <button className="btn btn-primary btn-block" onClick={auth.loginEmail} disabled={auth.loading}>
            {auth.loading ? "Entrando..." : "Entrar"}
          </button>

          <button className="btn btn-block mt-8" onClick={auth.loginGoogle} disabled={auth.loading}>
            Entrar con Google
          </button>

          <div className="login-divider">
            <span>o acceso demo</span>
          </div>
          <select value={auth.demoId} onChange={(e) => auth.setDemoId(e.target.value)}>
            <option value="">Selecciona un usuario demo...</option>
            {auth.demoUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto}
                {u.isCoord ? " (Coord.)" : ""}
              </option>
            ))}
          </select>
          <button className="btn btn-block mt-8" onClick={auth.loginDemo} disabled={auth.loading}>
            Entrar como demo
          </button>

          {auth.error ? <p className="error-box">{auth.error}</p> : null}
        </div>
      </div>
    </section>
  );
}
