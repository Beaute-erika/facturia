import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { Expense, ExpenseStatus } from "@/lib/expenses-types";
import type { ExpenseRow } from "@/lib/database.types";

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id:           row.id,
    title:        row.title,
    amount:       Number(row.amount),
    category:     row.category,
    expense_date: row.expense_date,
    status:       row.status as ExpenseStatus,
    notes:        row.notes,
    created_at:   row.created_at,
  };
}

/** PATCH /api/expenses/[id] — modification partielle d'un frais */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as Partial<{
      title: string;
      amount: number;
      category: string | null;
      expense_date: string;
      status: string;
      notes: string | null;
    }>;

    // Validation si les champs obligatoires sont présents dans la requête
    if (body.title !== undefined && !body.title?.trim()) {
      return NextResponse.json({ error: "Le titre ne peut pas être vide" }, { status: 400 });
    }
    if (body.amount !== undefined && Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Le montant doit être positif" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title        !== undefined) updates.title        = body.title!.trim();
    if (body.amount       !== undefined) updates.amount       = Number(body.amount);
    if (body.category     !== undefined) updates.category     = body.category ?? null;
    if (body.expense_date !== undefined) updates.expense_date = body.expense_date;
    if (body.status       !== undefined) updates.status       = body.status;
    if (body.notes        !== undefined) updates.notes        = body.notes?.trim() || null;

    const { data, error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)   // garantit que l'utilisateur est propriétaire
      .select("*")
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Frais introuvable" }, { status: 404 });

    return NextResponse.json({ expense: rowToExpense(data as ExpenseRow) });
  } catch (err) {
    console.error("[expenses/[id]/PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** DELETE /api/expenses/[id] — suppression d'un frais */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { error, count } = await supabase
      .from("expenses")
      .delete({ count: "exact" })
      .eq("id", params.id)
      .eq("user_id", user.id);  // garantit que l'utilisateur est propriétaire

    if (error) throw error;
    if (count === 0) return NextResponse.json({ error: "Frais introuvable" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[expenses/[id]/DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
