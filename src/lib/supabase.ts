import { createClient } from "@supabase/supabase-js";
import { createBrowserClient as createBrowser, createServerClient as createServer } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Client-side (composants "use client") ───────────────────────────────────
export function createBrowserClient() {
  return createBrowser<Database>(supabaseUrl, supabaseAnonKey);
}

// ─── Server-side (Server Components, Route Handlers) ─────────────────────────
export function createServerClient() {
  const cookieStore = cookies();
  return createServer<Database>(
    supabaseUrl,
    supabaseAnonKey,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
}

// ─── Admin (Service Role — serveur uniquement, bypass RLS) ───────────────────
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;
export type SupabaseServerClient = ReturnType<typeof createServerClient>;

/** Récupère l'utilisateur connecté */
export async function getUser(supabase: SupabaseBrowserClient | SupabaseServerClient) {
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/** Récupère le profil artisan */
export async function getUserProfile(supabase: SupabaseBrowserClient | SupabaseServerClient, userId: string) {
  const { data } = await supabase.from("users").select("*").eq("id", userId).single();
  return data;
}
