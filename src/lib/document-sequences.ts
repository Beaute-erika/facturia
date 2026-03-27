import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const PREFIXES: Record<string, string> = {
  devis:              "DV",
  factures:           "FACT",
  avoirs:             "AV",
  factures_pro_forma: "PF",
  bons_de_commande:   "BC",
  bons_de_livraison:  "BL",
};

/**
 * Generates an auto-incremented document number via the atomic DB function.
 * Falls back to a random suffix if the function is not yet available.
 */
export async function generateDocumentNumber(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: keyof typeof PREFIXES | string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = PREFIXES[type] ?? type.toUpperCase().slice(0, 3);

  try {
    const { data, error } = await supabase.rpc("get_next_document_number", {
      p_user_id: userId,
      p_type:    type,
      p_year:    year,
    });
    if (error) throw error;
    return `${prefix}-${year}-${String(data as number).padStart(3, "0")}`;
  } catch {
    // Migration not yet applied — fallback to random
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}-${year}-${rand}`;
  }
}
