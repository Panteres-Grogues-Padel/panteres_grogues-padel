import { useEffect, useMemo, useRef, useState } from "react";
import { COORDS, JUGADORES_INICIALES } from "../utils/mockData";
import { supabase } from "../lib/supabase";

const JUGADORES_SELECT =
  "id, auth_id, nombre, nombre_completo, email, telefono, instagram, foto_url, mostrar_telefono, autoriza_instagram, es_coordinador, activo";

function jugadorToState(jugador) {
  return {
    ...jugador,
    id: jugador.id != null ? String(jugador.id) : jugador.id,
    nombreCompleto: jugador.nombre_completo,
    fromFallback: false
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoId, setDemoId] = useState("");
  const ultimoAuthIdCargadoRef = useRef(null);

  const demoUsers = useMemo(
    () =>
      JUGADORES_INICIALES.map((j) => ({
        ...j,
        isCoord: COORDS.includes(j.nombre)
      })),
    []
  );

  async function fetchJugadorPorAuthId(authUserId) {
    const { data: jugador, error: jugadorError } = await supabase
      .from("jugadores")
      .select(JUGADORES_SELECT)
      .eq("auth_id", authUserId)
      .maybeSingle();
    if (jugadorError) return { ok: false, message: jugadorError.message };
    if (!jugador) return { ok: false, message: "Usuario no encontrado" };
    return { ok: true, jugador };
  }

  async function aplicarSesionSupabase(authUser) {
    console.log("[aplicarSesion] authId:", authUser?.id, "ref actual:", ultimoAuthIdCargadoRef.current);
    if (!authUser) {
      ultimoAuthIdCargadoRef.current = null;
      setCurrentUser(null);
      setError("");
      return;
    }

    if (ultimoAuthIdCargadoRef.current === authUser.id) return;

    setLoading(true);
    try {
      const result = await fetchJugadorPorAuthId(authUser.id);
      if (!result.ok) {
        setError(result.message);
        setCurrentUser(null);
        ultimoAuthIdCargadoRef.current = null;
        await supabase.auth.signOut({ scope: "local" });
        return;
      }
      setError("");
      setCurrentUser(jugadorToState(result.jugador));
      ultimoAuthIdCargadoRef.current = authUser.id;
    } catch (e) {
      setError(e?.message ?? "Error de conexion.");
      setCurrentUser(null);
      ultimoAuthIdCargadoRef.current = null;
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabase) return undefined;

    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const user = session?.user ?? null;
      if (user) {
        aplicarSesionSupabase(user);
      } else {
        ultimoAuthIdCargadoRef.current = null;
        setCurrentUser(null);
        setError("");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loginEmail() {
    setError("");
    if (!privacyAccepted) return setError("Debes aceptar la politica de privacidad para continuar.");
    if (!email || !password) return setError("Introduce tu email y contrasena.");
    if (!email.includes("@")) return setError("El email no es valido.");
    if (password.length < 6) return setError("La contrasena debe tener al menos 6 caracteres.");
    if (!supabase) return setError("Faltan variables de entorno de Supabase.");

    setLoading(true);
    try {
      let loginTimeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        loginTimeoutId = setTimeout(
          () => reject(new Error("Tiempo de espera agotado. Revisa la conexion.")),
          15000
        );
      });

      let data;
      let authError;
      try {
        const raceResult = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          timeoutPromise
        ]);
        ({ data, error: authError } = raceResult);
      } finally {
        clearTimeout(loginTimeoutId);
      }

      if (authError) {
        setError(authError.message);
        return;
      }

      const authUser = data?.user ?? data?.session?.user ?? null;
      if (!authUser) {
        setError("No se pudo obtener la sesion. Vuelve a intentarlo.");
        return;
      }

      const result = await fetchJugadorPorAuthId(authUser.id);
      if (!result.ok) {
        setError(result.message);
        ultimoAuthIdCargadoRef.current = null;
        await supabase.auth.signOut({ scope: "local" });
        return;
      }

      setError("");
      setCurrentUser(jugadorToState(result.jugador));
      ultimoAuthIdCargadoRef.current = authUser.id;
    } catch (e) {
      setError(e?.message ?? "Error de conexion al iniciar sesion.");
      ultimoAuthIdCargadoRef.current = null;
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }

  function loginDemo() {
    setError("");
    if (!privacyAccepted) return setError("Debes aceptar la politica de privacidad para continuar.");
    const selected = demoUsers.find((u) => u.id === Number(demoId));
    if (!selected) return setError("Selecciona un usuario demo.");
    setCurrentUser({ ...selected, fromFallback: true });
  }

  async function loginGoogle() {
    setError("");
    if (!privacyAccepted) return setError("Debes aceptar la politica de privacidad para continuar.");
    if (!supabase) return setError("Faltan variables de entorno de Supabase.");

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (authError) setError(authError.message);
    } catch (e) {
      setError(e?.message ?? "Error al iniciar sesion con Google.");
    } finally {
      setLoading(false);
    }
  }

  function patchCurrentUser(partial) {
    setCurrentUser((u) => (u && partial ? { ...u, ...partial } : u));
  }

  async function logout() {
    ultimoAuthIdCargadoRef.current = null;
    console.log("[logout] ref limpiado");
    setLoading(false);
    setCurrentUser(null);
    setPassword("");
    setEmail("");
    setError("");
    setDemoId("");
    setPrivacyAccepted(false);
    try {
      if (supabase) await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* estado UI ya limpio */
    }
  }

  return {
    currentUser,
    email,
    setEmail,
    password,
    setPassword,
    privacyAccepted,
    setPrivacyAccepted,
    error,
    loading,
    demoId,
    setDemoId,
    demoUsers,
    loginEmail,
    loginDemo,
    loginGoogle,
    logout,
    patchCurrentUser
  };
}
