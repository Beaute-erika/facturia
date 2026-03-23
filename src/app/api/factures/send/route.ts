import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase-server";

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  factureId: string;
  attachPdf: boolean;
}

export async function POST(req: NextRequest) {
  // Auth guard
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const payload: SendEmailPayload = await req.json();

  if (!payload.to || !payload.subject || !payload.factureId) {
    return NextResponse.json(
      { error: "Champs manquants : to, subject, factureId requis" },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.to)) {
    return NextResponse.json(
      { error: "Adresse email invalide" },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Facturia <noreply@facturia.fr>";

  if (!apiKey || apiKey.startsWith("re_...") || apiKey === "") {
    return NextResponse.json(
      { error: "Email non configuré. Ajoutez RESEND_API_KEY dans votre .env.local." },
      { status: 503 }
    );
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
  });

  if (error) {
    console.error("[factures/send] Resend error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Facture ${payload.factureId} envoyée à ${payload.to}`,
    sentAt: new Date().toISOString(),
  });
}
