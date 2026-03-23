import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supabaseAdmin } from "@/lib/supabase-server";

const STATUT_MAP: Record<string, string> = {
  brouillon: "brouillon",
  envoye: "envoyé",
  accepte: "accepté",
  refuse: "refusé",
  expire: "en attente",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("devis")
      .select("*, clients(nom, prenom, raison_sociale)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const devis = (data ?? []).map((row) => {
      const c = row.clients as { nom: string; prenom: string | null; raison_sociale: string | null } | null;
      const client = c ? (c.prenom ? `${c.prenom} ${c.nom}` : c.raison_sociale || c.nom) : "—";
      return {
        id: row.numero,
        client,
        objet: row.objet,
        montant: `${Math.round(row.montant_ht ?? 0).toLocaleString("fr-FR")} €`,
        date: formatDate(row.date_emission),
        validite: formatDate(row.date_validite),
        status: STATUT_MAP[row.statut] ?? "brouillon",
        _uuid: row.id,
      };
    });

    return NextResponse.json({ devis });
  } catch (err) {
    console.error("[devis/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const {
      client_nom,
      client_email,
      client_id: client_id_payload,
      objet,
      date_emission,
      date_validite,
      lignes,
      montant_ht,
      montant_tva,
      montant_ttc,
      notes,
      numero,
    } = body;

    if (!client_nom || !objet || !numero) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // 2. Résolution du client_id
    // Utilise l'UUID direct si fourni, sinon cherche par email/nom, sinon crée à la volée
    let clientId: string | null = client_id_payload ?? null;

    if (clientId) {
      // Vérifie que le client appartient bien à cet utilisateur
      const { data: owned } = await supabaseAdmin()
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!owned) clientId = null; // client_id invalide, on refait la recherche
    }

    if (!clientId && client_email) {
      const { data: byEmail } = await supabaseAdmin()
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .eq("email", client_email)
        .maybeSingle();
      clientId = byEmail?.id ?? null;
    }

    if (!clientId) {
      const { data: byName } = await supabaseAdmin()
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .ilike("nom", client_nom)
        .maybeSingle();
      clientId = byName?.id ?? null;
    }

    if (!clientId) {
      // Crée le client à la volée pour satisfaire la FK
      const { data: created, error: clientErr } = await supabaseAdmin()
        .from("clients")
        .insert({
          user_id: user.id,
          type: "particulier",
          statut: "prospect",
          nom: client_nom,
          prenom: null,
          raison_sociale: null,
          email: client_email || null,
          tel: null,
          adresse: null,
          code_postal: null,
          ville: null,
          siret: null,
          notes: null,
          ca_total: 0,
        })
        .select("id")
        .single();

      if (clientErr || !created) {
        console.error("[devis/route] client creation failed:", clientErr?.message);
        return NextResponse.json({ error: "Impossible de créer le client" }, { status: 500 });
      }
      clientId = created.id;
    }

    // 3. Insertion du devis
    const { data, error } = await supabaseAdmin()
      .from("devis")
      .insert({
        user_id: user.id,
        client_id: clientId,
        numero,
        statut: "brouillon",
        objet,
        date_emission,
        date_validite,
        lignes,
        tva_rate: 10,
        montant_ht,
        montant_tva,
        montant_ttc,
        notes: notes || null,
        chorus_pro: false,
        pdf_url: null,
      })
      .select()
      .single();

    if (error) {
      console.error("[devis/route] insert failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[devis/route]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
