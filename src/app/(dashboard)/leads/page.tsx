import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import LeadsClient from "@/components/leads/LeadsClient";

export const metadata = { title: "Générateur de leads — Facturia" };

export default async function LeadsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <LeadsClient />;
}
