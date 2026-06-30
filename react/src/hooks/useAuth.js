import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { avatarUrlBase } from "../utils/avatarUrl";
import {
  completarOnboardingRpc,
  crearJugadorPendienteRpc,
  fetchMiPerfilJugadorRpc,
  fetchMiPerfilPendienteRpc,
  fetchPerfilJugadorRpc,
  vincularJugadorExistenteRpc
} from "../utils/perfilJugador";
import { isJugadorUuid, normalizeJugadorUuid } from "../utils/jugador";
import { hoyLocalStr } from "../utils/dates";
import { t } from "../i18n";

function jugadorToState(jugador) {
  return {
    ...jugador,
    id: jugador.id != null ? String(jugador.id) : jugador.id,
    auth_id: jugador.auth_id ?? null,
    nombreCompleto: jugador.nombre_completo ?? jugador.nombreCompleto ?? jugador.nombre,
    nickname: jugador.nickname?.trim() || null,
    foto_url: avatarUrlBase(jugador.foto_url) ?? null,
    fromFallback: false
  };
}

function mergeJugadorConPerfil(base, perfil) {
  if (!perfil) return base;
  return {
    ...base,
    ...perfil,
    id: base.id ?? perfil.id,
    auth_id: base.auth_id,
    email: base.email,
    activo: base.activo,
    foto_url: perfil.foto_url ?? base.foto_url ?? null
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /** null | 'active' | 'onboarding' | 'pending' */
  const [authStatus, setAuthStatus] = useState(null);
  const [authEpoch, setAuthEpoch] = useState(0);
  const ultimoAuthIdCargadoRef = useRef(null);
  const currentUserRef = useRef(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const bumpAvatarVersion = useCallback(() => {
    setAvatarVersion(Date.now());
  }, []);

  const refreshCurrentJugador = useCallback(async () => {
    const u = currentUserRef.current;
    const jugadorId = normalizeJugadorUuid(u?.id);
    if (!supabase || !isJugadorUuid(jugadorId) || u?.fromFallback) {
      return { ok: false };
    }

    const { ok, perfil, error: rpcError } = await fetchPerfilJugadorRpc(supabase, jugadorId);
    if (!ok || !perfil) {
      return { ok: false, error: rpcError };
    }

    setCurrentUser((prev) => (prev ? mergeJugadorConPerfil(prev, perfil) : prev));
    bumpAvatarVersion();
    return { ok: true, perfil };
  }, [bumpAvatarVersion]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function onJugadorActualizado(event) {
      const jugadorId = event.detail?.jugadorId;
      const u = currentUserRef.current;
      if (!jugadorId || !u?.id) return;
      if (normalizeJugadorUuid(jugadorId) !== normalizeJugadorUuid(u.id)) return;
      void refreshCurrentJugador();
    }

    window.addEventListener("jugador-actualizado", onJugadorActualizado);
    return () => window.removeEventListener("jugador-actualizado", onJugadorActualizado);
  }, [refreshCurrentJugador]);

  function evaluarPerfilOAuth(perfil) {
    const jugador = jugadorToState(perfil);

    if (!String(perfil.nombre ?? "").trim()) {
      return { ok: true, needsOnboarding: true, jugador };
    }

    if (!perfil.activo) {
      return { ok: true, pendingApproval: true, jugador };
    }

    return { ok: true, jugador };
  }

  async function fetchJugadorSesion({ allowPending = false } = {}) {
    let { ok, perfil, error: rpcError } = await fetchMiPerfilJugadorRpc(supabase);
    if (!ok) return { ok: false, message: rpcError ?? t("auth.errors.connection") };

    if (perfil) {
      if (perfil.sancionat && perfil.sancio_fins && perfil.sancio_fins < hoyLocalStr()) {
        const { error: desancionarError } = await supabase.rpc("desancionar_jugador", {
          p_jugador_id: perfil.id
        });
        if (desancionarError) return { ok: false, message: desancionarError.message };

        const refreshed = await fetchMiPerfilJugadorRpc(supabase);
        if (refreshed.ok && refreshed.perfil) perfil = refreshed.perfil;
      }

      return { ok: true, jugador: jugadorToState(perfil) };
    }

    if (!allowPending) {
      return { ok: false, message: t("auth.errors.userNotFound") };
    }

    const vinculado = await vincularJugadorExistenteRpc(supabase);
    if (!vinculado.ok) {
      return { ok: false, message: vinculado.error ?? t("auth.errors.connection") };
    }
    if (vinculado.perfil) {
      return evaluarPerfilOAuth(vinculado.perfil);
    }

    let pendingRes = await fetchMiPerfilPendienteRpc(supabase);
    if (!pendingRes.ok) {
      return { ok: false, message: pendingRes.error ?? t("auth.errors.connection") };
    }

    let pending = pendingRes.perfil;
    if (!pending) {
      const created = await crearJugadorPendienteRpc(supabase);
      if (!created.ok) {
        return { ok: false, message: created.error ?? t("auth.errors.connection") };
      }
      pendingRes = await fetchMiPerfilPendienteRpc(supabase);
      if (!pendingRes.ok || !pendingRes.perfil) {
        return { ok: false, message: pendingRes.error ?? t("auth.errors.connection") };
      }
      pending = pendingRes.perfil;
    }

    return evaluarPerfilOAuth(pending);
  }

  function applyJugadorSesionResult(result) {
    setError("");
    setCurrentUser(result.jugador);
    bumpAvatarVersion();
    if (result.needsOnboarding) {
      setAuthStatus("onboarding");
    } else if (result.pendingApproval) {
      setAuthStatus("pending");
    } else {
      setAuthStatus("active");
    }
  }

  async function aplicarSesionSupabase(authUser) {
    if (!authUser) {
      ultimoAuthIdCargadoRef.current = null;
      setCurrentUser(null);
      setAvatarVersion(0);
      setError("");
      setAuthStatus(null);
      setAuthEpoch((n) => n + 1);
      return;
    }

    const mismoAuthId = ultimoAuthIdCargadoRef.current === authUser.id;

    setLoading(true);
    try {
      const result = await fetchJugadorSesion({ allowPending: true });
      if (!result.ok) {
        setError(result.message);
        setCurrentUser(null);
        setAvatarVersion(0);
        setAuthStatus(null);
        ultimoAuthIdCargadoRef.current = null;
        await supabase.auth.signOut({ scope: "local" });
        return;
      }
      applyJugadorSesionResult(result);
      ultimoAuthIdCargadoRef.current = authUser.id;
      if (!mismoAuthId) setAuthEpoch((n) => n + 1);
    } catch (e) {
      setError(e?.message ?? t("auth.errors.connection"));
      setCurrentUser(null);
      setAvatarVersion(0);
      setAuthStatus(null);
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
        setAvatarVersion(0);
        setError("");
        setAuthStatus(null);
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

      const result = await fetchJugadorSesion();
      if (!result.ok) {
        setError(result.message);
        ultimoAuthIdCargadoRef.current = null;
        await supabase.auth.signOut({ scope: "local" });
        return;
      }

      applyJugadorSesionResult(result);
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

  async function completeOnboarding(fields) {
    setError("");
    if (!fields?.acepto_privacidad) {
      setError(t("auth.errors.privacyRequired"));
      return { ok: false, error: t("auth.errors.privacyRequired") };
    }
    if (!supabase) {
      setError(t("auth.errors.supabaseEnvMissing"));
      return { ok: false, error: t("auth.errors.supabaseEnvMissing") };
    }

    setLoading(true);
    try {
      const res = await completarOnboardingRpc(supabase, fields);
      if (!res.ok) {
        setError(res.error ?? t("auth.errors.connection"));
        return { ok: false, error: res.error };
      }

      if (!res.perfil) {
        setError(t("auth.errors.connection"));
        return { ok: false, error: t("auth.errors.connection") };
      }

      applyJugadorSesionResult({
        ok: true,
        pendingApproval: true,
        jugador: jugadorToState(res.perfil)
      });
      setAuthEpoch((n) => n + 1);
      return { ok: true };
    } finally {
      setLoading(false);
    }
  }

  async function loginGoogle() {
    setError("");
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
    if (!partial) return;
    if (partial.foto_url != null) {
      partial = { ...partial, foto_url: avatarUrlBase(partial.foto_url) };
      bumpAvatarVersion();
    }
    setCurrentUser((u) => (u && partial ? { ...u, ...partial } : u));
  }

  async function logout() {
    ultimoAuthIdCargadoRef.current = null;
    setAuthEpoch((n) => n + 1);
    setLoading(false);
    setCurrentUser(null);
    setAvatarVersion(0);
    setAuthStatus(null);
    setPassword("");
    setEmail("");
    setError("");
    try {
      if (supabase) await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* estado UI ya limpio */
    }
  }

  return {
    currentUser,
    avatarVersion,
    authEpoch,
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    authStatus,
    loginEmail,
    loginGoogle,
    completeOnboarding,
    logout,
    patchCurrentUser,
    refreshCurrentJugador
  };
}
