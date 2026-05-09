import { useEffect, useMemo, useState } from "react";
import { COORDS, JUGADORES_INICIALES } from "../utils/mockData";
import { supabase } from "../lib/supabase";

function buildFallbackUser(authUser) {
  if (!authUser) return null;
  const email = authUser.email || "";
  const baseName = email.includes("@") ? email.split("@")[0] : "usuario";
  const nombre = authUser.user_metadata?.nombre || authUser.user_metadata?.handle || baseName;
  const nombreCompleto = authUser.user_metadata?.full_name || nombre;

  return {
    id: null,
    auth_id: authUser.id,
    nombre,
    nombreCompleto,
    email,
    telefono: null,
    instagram: null,
    mostrar_telefono: false,
    autoriza_instagram: false,
    es_coordinador: false,
    fromFallback: true
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

  const demoUsers = useMemo(
    () =>
      JUGADORES_INICIALES.map((j) => ({
        ...j,
        isCoord: COORDS.includes(j.nombre)
      })),
    []
  );

  async function hydrateCurrentUser(authUser) {
    if (!authUser) {
      setCurrentUser(null);
      return;
    }

    if (!supabase) {
      setCurrentUser(buildFallbackUser(authUser));
      return;
    }

    const { data: jugador, error: jugadorError } = await supabase
      .from("jugadores")
      .select(
        "id, auth_id, nombre, nombre_completo, email, telefono, instagram, mostrar_telefono, autoriza_instagram, es_coordinador, activo"
      )
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (jugadorError) {
      setError("No se pudo cargar el perfil del jugador.");
      setCurrentUser(buildFallbackUser(authUser));
      return;
    }

    if (!jugador) {
      setError(
        "Tu usuario existe en Auth, pero no tiene perfil en jugadores. Contacta con coordinacion."
      );
      setCurrentUser(buildFallbackUser(authUser));
      return;
    }

    setError("");
    setCurrentUser({
      ...jugador,
      id: jugador.id != null ? String(jugador.id) : jugador.id,
      nombreCompleto: jugador.nombre_completo,
      fromFallback: false
    });
  }

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await hydrateCurrentUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await hydrateCurrentUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loginEmail() {
    setError("");
    if (!privacyAccepted) return setError("Debes aceptar la politica de privacidad para continuar.");
    if (!email || !password) return setError("Introduce tu email y contrasena.");
    if (!email.includes("@")) return setError("El email no es valido.");
    if (password.length < 6) return setError("La contrasena debe tener al menos 6 caracteres.");
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return setError("Faltan variables de entorno de Supabase.");
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);
    if (authError) return setError(authError.message);
    await hydrateCurrentUser(data.user);
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
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return setError("Faltan variables de entorno de Supabase.");
    }
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    setLoading(false);
    if (authError) return setError(authError.message);
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setPassword("");
    setEmail("");
    setError("");
    setDemoId("");
    setPrivacyAccepted(false);
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
    logout
  };
}
