import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Max messages returned to the client for display
const MAX_DISPLAY_MESSAGES = 40;

// ─── GET — load conversation history ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contextType = searchParams.get("type") ?? "general";
    const contextId   = searchParams.get("id")   ?? "";

    // Find conversation
    const { data: conv } = await supabase
      .from("agent_conversations")
      .select("id, updated_at")
      .eq("user_id",      user.id)
      .eq("context_type", contextType)
      .eq("context_id",   contextId)
      .single();

    if (!conv) return NextResponse.json({ messages: [], conversationId: null });

    // Load last N messages ordered ASC for display
    const { data: rows } = await supabase
      .from("agent_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(MAX_DISPLAY_MESSAGES);

    const messages = (rows ?? []).reverse().map((r) => ({
      id:      r.id,
      role:    r.role as "user" | "assistant",
      content: r.content,
    }));

    return NextResponse.json({ messages, conversationId: conv.id, updatedAt: conv.updated_at });
  } catch (err) {
    console.error("[agent/memory GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── POST — save new message pair ────────────────────────────────────────────

interface SaveBody {
  contextType: string;
  contextId:   string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as SaveBody;
    const { contextType, contextId = "", messages } = body;

    if (!messages?.length) return NextResponse.json({ ok: true });

    // Upsert conversation
    const { data: conv, error: convErr } = await supabase
      .from("agent_conversations")
      .upsert(
        { user_id: user.id, context_type: contextType, context_id: contextId },
        { onConflict: "user_id,context_type,context_id", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (convErr || !conv) {
      console.error("[agent/memory POST] upsert conv", convErr);
      return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
    }

    // Insert messages
    const rows = messages.map((m) => ({
      conversation_id: conv.id,
      role:            m.role,
      content:         m.content,
    }));

    await supabase.from("agent_messages").insert(rows);

    return NextResponse.json({ ok: true, conversationId: conv.id });
  } catch (err) {
    console.error("[agent/memory POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── DELETE — clear conversation history ─────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contextType = searchParams.get("type") ?? "general";
    const contextId   = searchParams.get("id")   ?? "";

    await supabase
      .from("agent_conversations")
      .delete()
      .eq("user_id",      user.id)
      .eq("context_type", contextType)
      .eq("context_id",   contextId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[agent/memory DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
