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

/** GET /api/expenses — liste des frais de l'utilisateur connecté */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .order("created_at",   { ascending: false });

    if (error) throw error;

    return NextResponse.json({ expenses: (data ?? []).map(rowToExpense) });
  } catch (err) {
    console.error("[expenses/GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** POST /api/expenses — création d'un frais */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json() as {
      title?: string;
      amount?: number;
      category?: string | null;
      expense_date?: string;
      status?: string;
      notes?: string | null;
    };

    // Validation
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 });
    }
    if (!body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Le montant doit être positif" }, { status: 400 });
    }
    if (!body.expense_date) {
      return NextResponse.json({ error: "La date est obligatoire" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id:      user.id,
        title:        body.title.trim(),
        amount:       Number(body.amount),
        category:     body.category ?? null,
        expense_date: body.expense_date,
        status:       body.status ?? "paid",
        notes:        body.notes?.trim() || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ expense: rowToExpense(data as ExpenseRow) }, { status: 201 });
  } catch (err) {
    console.error("[expenses/POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
