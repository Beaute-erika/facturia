import { NextRequest, NextResponse } from "next/server";

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  factureId: string;
  attachPdf: boolean;
}

export async function POST(req: NextRequest) {
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

  // Simulate sending delay (replace with real SMTP / Resend / Mailgun in production)
  await new Promise((r) => setTimeout(r, 800));

  console.log(`[Facturia] Email envoyé :`, {
    to: payload.to,
    subject: payload.subject,
    factureId: payload.factureId,
    attachPdf: payload.attachPdf,
    sentAt: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: `Facture ${payload.factureId} envoyée à ${payload.to}`,
    sentAt: new Date().toISOString(),
  });
}
