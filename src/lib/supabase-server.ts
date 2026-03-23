import { createServerClient as createServer } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function createServerClient() {
  const cookieStore = await cookies();
  return createServer<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Route Handler — lecture seule, ignoré
        }
      },
    },
  });
}

export function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** @deprecated Appelez getSupabaseAdmin() — supabaseAdmin est désormais une fonction */
export const supabaseAdmin = getSupabaseAdmin;

export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

/** Récupère l'utilisateur connecté */
export async function getUser(supabase: SupabaseServerClient) {
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/** Récupère le profil artisan */
export async function getUserProfile(supabase: SupabaseServerClient, userId: string) {
  const { data } = await supabase.from("users").select("*").eq("id", userId).single();
  return data;
}
