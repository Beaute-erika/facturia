// Re-exports pour compatibilité — ne pas importer next/headers depuis ce fichier.
// Composants "use client" → importer depuis @/lib/supabase-client
// API routes / Server Components → importer depuis @/lib/supabase-server
export { createBrowserClient, type SupabaseBrowserClient } from "./supabase-client";
export { createServerClient, supabaseAdmin, getUser, getUserProfile, type SupabaseServerClient } from "./supabase-server";
