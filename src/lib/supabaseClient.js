import { createClient } from "@supabase/supabase-js";

// The browser only ever holds the publishable key. Every permission is enforced by row level security in the database.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key) : null;

// Signs in to the database as well, so the pages that read real data have a session. Failure is not fatal: the older
// sample-data pages keep working without it.
export async function signInToDatabase(email, password) {
  if (!supabase) return false;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function signOutOfDatabase() {
  if (supabase) await supabase.auth.signOut();
}
