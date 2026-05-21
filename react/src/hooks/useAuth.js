import { useEffect, useMemo, useRef, useState } from "react";
import { COORDS, JUGADORES_INICIALES } from "../utils/mockData";
import { supabase } from "../lib/supabase";
import { t } from "../i18n";

const JUGADORES_SELECT =
  "id, auth_id, nombre, nombre_completo, nickname, email, telefono, instagram, foto_url, mostrar_telefono, autoriza_instagram, es_coordinador, activo";

function jugadorToState(jugador) {
  return {
    ...jugador,
    id: jugador.id != null ? String(jugador.id) : jugador.id,
    auth_id: jugador.auth_id ?? null,
    nombreCompleto: jugador.nombre_completo,
    nickname: jugador.nickname?.trim() || null,
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
  /** Incrementa en cada login/logout para que useSlots vuelva a cargar inscripciones. */
  const [authEpoch, setAuthEpoch] = useState(0);
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
    if (!jugador) return { ok: false, message: t("auth.errors.userNotFound") };
    return { ok: true, jugador };
  }

  async function aplicarSesionSupabase(authUser) {
    if (!authUser) {
      ultimoAuthIdCargadoRef.current = null;
      setCurrentUser(null);
      setError("");
      setAuthEpoch((n) => n + 1);
      return;
    }

    const mismoAuthId = ultimoAuthIdCargadoRef.current === authUser.id;

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
      if (!mismoAuthId) setAuthEpoch((n) => n + 1);
    } catch (e) {
      setError(e?.message ?? t("auth.errors.connection"));
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
        setAuthEpoch((n) => n + 1);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loginEmail() {
    setError("");
    if (!privacyAccepted) return setError(t("auth.errors.privacyRequired"));
    if (!email || !password) return setError(t("auth.errors.emailPasswordRequired"));
    if (!email.includes("@")) return setError(t("auth.errors.emailInvalid"));
    if (password.length < 6) return setError(t("auth.errors.passwordMinLength"));
    if (!supabase) return setError(t("auth.errors.supabaseEnvMissing"));

    setLoading(true);
    try {
      let loginTimeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        loginTimeoutId = setTimeout(
          () => reject(new Error(t("auth.errors.timeout"))),
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
        setError(t("auth.errors.sessionFailed"));
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
      setAuthEpoch((n) => n + 1);
    } catch (e) {
      setError(e?.message ?? t("auth.errors.connectionLogin"));
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
    if (!privacyAccepted) return setError(t("auth.errors.privacyRequired"));
    const selected = demoUsers.find((u) => u.id === Number(demoId));
    if (!selected) return setError(t("auth.errors.selectDemo"));
    setCurrentUser({ ...selected, fromFallback: true });
  }

  async function loginGoogle() {
    setError("");
    if (!privacyAccepted) return setError(t("auth.errors.privacyRequired"));
    if (!supabase) return setError(t("auth.errors.supabaseEnvMissing"));

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
      setError(e?.message ?? t("auth.errors.googleLogin"));
    } finally {
      setLoading(false);
    }
  }

  function patchCurrentUser(partial) {
    setCurrentUser((u) => (u && partial ? { ...u, ...partial } : u));
  }

  async function logout() {
    ultimoAuthIdCargadoRef.current = null;
    setAuthEpoch((n) => n + 1);
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
    authEpoch,
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
