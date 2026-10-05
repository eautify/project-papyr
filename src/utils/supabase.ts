import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const parsedUrl = (() => {
  try {
    return url ? new URL(url) : null;
  } catch {
    return null;
  }
})();
const localHost = parsedUrl?.hostname === "localhost" || parsedUrl?.hostname === "127.0.0.1";
const validUrl = Boolean(
  parsedUrl &&
    (parsedUrl.protocol === "https:" || (parsedUrl.protocol === "http:" && localHost)) &&
    !parsedUrl.username &&
    !parsedUrl.password,
);
function isLegacyAnonKey(value: string) {
  try {
    const payload = value.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload?.padEnd(Math.ceil((payload?.length ?? 0) / 4) * 4, "=");
    return padded ? JSON.parse(atob(padded)).role === "anon" : false;
  } catch {
    return false;
  }
}
const safeBrowserKey = Boolean(
  key && (key.startsWith("sb_publishable_") || isLegacyAnonKey(key)),
);

export const supabaseConfigured = validUrl && safeBrowserKey;
export const supabaseConfigIssue = !validUrl
  ? "Add the project URL from your Supabase project to VITE_SUPABASE_URL."
  : !key
    ? "Add the project publishable key to VITE_SUPABASE_PUBLISHABLE_KEY."
    : !safeBrowserKey
      ? key?.startsWith("sb_secret_") || (key?.split(".").length === 3 && !isLegacyAnonKey(key))
        ? "The configured key is a secret or service-role key. Replace it with the project publishable key (sb_publishable_…) before opening the app."
        : "The configured key does not look like a publishable key. Copy the project publishable key (sb_publishable_…) into VITE_SUPABASE_PUBLISHABLE_KEY."
      : null;

export const supabase =
  supabaseConfigured && url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
