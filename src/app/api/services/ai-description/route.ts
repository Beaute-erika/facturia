import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * POST /api/services/ai-description
 * Body: { name: string; category?: string }
 * Returns: { description: string }
 *
 * Generates a professional service description using Claude Haiku.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as { name?: string; category?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Le nom du service est requis" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "IA non configurée" }, { status: 503 });
    }

    const client  = new Anthropic({ apiKey });
    const category = body.category?.trim() ? ` (catégorie : ${body.category.trim()})` : "";

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Tu es un assistant pour artisans français. Génère une description professionnelle et concise pour le service suivant : "${body.name.trim()}"${category}.

La description doit :
- Être rédigée à la 3e personne ou de façon impersonnelle
- Décrire brièvement ce que comprend la prestation
- Mentionner les étapes clés ou livrables si pertinent
- Faire entre 2 et 4 phrases maximum
- Être directement utilisable dans un devis ou une facture

Retourne uniquement la description, sans titre ni formatage.`,
      }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ description: text });
  } catch (err) {
    console.error("[services/ai-description]", err);
    return NextResponse.json({ error: "Erreur de génération" }, { status: 500 });
  }
}
