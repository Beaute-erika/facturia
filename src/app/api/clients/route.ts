import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { Client, ClientType, ClientStatus } from "@/lib/clients-data";
import type { ClientRow } from "@/lib/database.types";

// Map DB row → frontend Client shape
function rowToClient(row: ClientRow): Client {
  const typeMap: Record<string, ClientType> = {
    particulier: "Particulier",
    professionnel: "Professionnel",
    public: "Public",
  };
  const statusMap: Record<string, ClientStatus> = {
    actif: "actif",
    inactif: "inactif",
    prospect: "prospect",
  };
  return {
    id: parseInt(row.id, 36) || Date.now(), // stable numeric id from uuid
    name: row.prenom ? `${row.prenom} ${row.nom}` : row.raison_sociale || row.nom,
    type: typeMap[row.type] ?? "Particulier",
    status: statusMap[row.statut] ?? "prospect",
    city: [row.code_postal, row.ville].filter(Boolean).join(" "),
    address: row.adresse || "",
    phone: row.tel || "",
    email: row.email || "",
    siret: row.siret || undefined,
    ca: row.ca_total,
    chantiers: 0,
    createdAt: new Date(row.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    lastActivity: new Date(row.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
    documents: [],
    chantiersList: [],
    notes: row.notes
      ? [{ id: "n-db", content: row.notes, date: new Date(row.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }), author: "Moi" }]
      : [],
    tags: [],
    _uuid: row.id, // keep uuid for updates
  } as Client & { _uuid: string };
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ clients: (data ?? []).map(rowToClient) });
  } catch (err) {
    console.error("[clients/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body: {
      name: string;
      type: ClientType;
      email: string;
      phone: string;
      address?: string;
      city?: string;
      siret?: string;
      contactName?: string;
      tags?: string[];
      notes?: string;
    } = await req.json();

    if (!body.name || !body.email) {
      return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
    }

    const typeMap: Record<ClientType, "particulier" | "professionnel"> = {
      Particulier: "particulier",
      Professionnel: "professionnel",
      Public: "professionnel", // DB enum doesn't have "public" — closest match
    };

    // Split city into code_postal + ville
    const cityParts = (body.city || "").match(/^(\d{5})?\s*(.*)$/);
    const code_postal = cityParts?.[1] || null;
    const ville = cityParts?.[2]?.trim() || body.city || null;

    const insert = {
      user_id: user.id,
      type: typeMap[body.type] ?? "particulier",
      statut: "prospect" as const,
      nom: body.name,
      prenom: null,
      raison_sociale: body.type !== "Particulier" ? body.name : null,
      email: body.email || null,
      tel: body.phone || null,
      adresse: body.address || null,
      code_postal,
      ville,
      siret: body.siret || null,
      notes: body.notes || null,
      ca_total: 0,
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ client: rowToClient(data) });
  } catch (err) {
    console.error("[clients/POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
