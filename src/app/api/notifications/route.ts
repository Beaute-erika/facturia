import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * GET /api/notifications
 * Retourne les 20 dernières notifications non lues de l'utilisateur.
 *
 * PATCH /api/notifications
 * Body: { ids?: string[] }
 * Marque les notifications (ou toutes si ids absent) comme lues.
 */

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, data, read, created_at")
      .eq("user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20) as unknown as {
        data: Array<{
          id: string;
          type: string;
          title: string;
          message: string | null;
          data: Record<string, unknown> | null;
          read: boolean;
          created_at: string;
        }> | null;
        error: unknown;
      };

    if (error) throw error;

    return NextResponse.json({ notifications: data ?? [] });
  } catch (err) {
    console.error("[notifications/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as { ids?: string[] };

    let query = supabase
      .from("notifications")
      .update({ read: true } as unknown as Record<string, unknown>)
      .eq("user_id", user.id);

    if (body.ids?.length) {
      query = query.in("id", body.ids) as typeof query;
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
