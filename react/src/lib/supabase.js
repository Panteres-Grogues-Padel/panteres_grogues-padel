import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "sb-session",
        },
        global: {
          fetch: (url, options = {}) => {
            const headers = new Headers(options.headers || {});
            headers.set("Cache-Control", "no-cache, no-store");
            return fetch(url, { ...options, headers, cache: "no-store" });
          },
        },
      })
    : null;
