import { Euro, FileText, Users, Clock, AlertCircle, HardHat, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { redirect } from "next/navigation";
import KPICard from "@/components/dashboard/KPICard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import type { ActivityItem } from "@/components/dashboard/RecentActivity";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createServerClient, getUser, getUserProfile } from "@/lib/supabase-server";

function getLast7Months() {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    return {
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  });
}

function relativeTime(dateStr: string): string {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (diffH < 1) return "Il y a moins d'1h";
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffH < 48) return "Hier";
  return `Il y a ${Math.floor(diffH / 24)} jours`;
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const user = await getUser(supabase);
  if (!user) redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    .toISOString()
    .split("T")[0];

  const [
    profile,
    facturesMoisRes,
    devisCountRes,
    facturesImpayeesRes,
    clientsActifsRes,
    recentFacturesRes,
    recentDevisRes,
    upcomingChantiersRes,
    chartFacturesRes,
  ] = await Promise.all([
    getUserProfile(supabase, user.id),
    // CA mois = somme des factures payées ce mois
    supabase
      .from("factures")
      .select("montant_ttc")
      .eq("user_id", user.id)
      .eq("statut", "payee")
      .gte("date_paiement", monthStart)
      .lte("date_paiement", monthEnd),
    // Devis en attente = devis envoyés
    supabase
      .from("devis")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("statut", "envoye"),
    // Factures impayées = envoyées + en retard
    supabase
      .from("factures")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("statut", ["envoyee", "en_retard"]),
    // Clients actifs
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("statut", "actif"),
    // Activité récente — dernières factures
    supabase
      .from("factures")
      .select("id, numero, statut, montant_ttc, updated_at, objet")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
    // Activité récente — derniers devis
    supabase
      .from("devis")
      .select("id, numero, statut, montant_ttc, updated_at, objet")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
    // Chantiers à venir
    supabase
      .from("chantiers")
      .select("id, titre, statut, date_debut")
      .eq("user_id", user.id)
      .in("statut", ["planifie", "en_cours"])
      .order("date_debut", { ascending: true })
      .limit(3),
    // Données graphique — 7 derniers mois
    supabase
      .from("factures")
      .select("statut, montant_ttc, date_emission, date_paiement")
      .eq("user_id", user.id)
      .neq("statut", "brouillon")
      .gte("date_emission", sevenMonthsAgo),
  ]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const caMois = (facturesMoisRes.data ?? []).reduce(
    (sum, f) => sum + (f.montant_ttc ?? 0),
    0
  );
  const devisCount = devisCountRes.count ?? 0;
  const facturesImpayeesCount = facturesImpayeesRes.count ?? 0;
  const clientsActifsCount = clientsActifsRes.count ?? 0;

  // ── Graphique CA ──────────────────────────────────────────────────────────
  const months = getLast7Months();
  const chartData = months.map(({ label, key }) => {
    const monthFacs = (chartFacturesRes.data ?? []).filter(
      (f) => (f.date_emission ?? "").substring(0, 7) === key
    );
    const revenue = monthFacs
      .filter((f) => f.statut === "payee")
      .reduce((s, f) => s + (f.montant_ttc ?? 0), 0);
    const invoiced = monthFacs.reduce((s, f) => s + (f.montant_ttc ?? 0), 0);
    return { month: label, revenue, invoiced };
  });

  // ── Activité récente ──────────────────────────────────────────────────────
  const factureItems: ActivityItem[] = (recentFacturesRes.data ?? []).map((f) => ({
    id: f.id,
    type: "facture",
    title: f.numero,
    subtitle: f.objet,
    amount: f.montant_ttc != null ? `${Math.round(f.montant_ttc).toLocaleString("fr-FR")} €` : null,
    status: f.statut === "payee" ? "payée" : f.statut === "en_retard" ? "en retard" : "envoyée",
    statusVariant: f.statut === "payee" ? "success" : f.statut === "en_retard" ? "error" : "warning",
    time: relativeTime(f.updated_at),
  }));

  const devisItems: ActivityItem[] = (recentDevisRes.data ?? []).map((d) => ({
    id: d.id,
    type: "devis",
    title: d.numero,
    subtitle: d.objet,
    amount: d.montant_ttc != null ? `${Math.round(d.montant_ttc).toLocaleString("fr-FR")} €` : null,
    status: d.statut === "accepte" ? "accepté" : d.statut === "refuse" ? "refusé" : d.statut === "expire" ? "expiré" : "en attente",
    statusVariant: d.statut === "accepte" ? "success" : d.statut === "refuse" ? "error" : "warning",
    time: relativeTime(d.updated_at),
  }));

  const activities = [...factureItems, ...devisItems]
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);

  // ── Chantiers à venir ─────────────────────────────────────────────────────
  const upcomingChantiers = (upcomingChantiersRes.data ?? []).map((c) => ({
    id: c.id,
    client: c.titre,
    type: c.statut === "en_cours" ? "En cours" : "Planifié",
    date: c.date_debut
      ? new Date(c.date_debut).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      : "—",
    status: (c.statut === "en_cours" ? "confirmé" : "à confirmer") as "confirmé" | "à confirmer",
  }));

  // ── Affichage ─────────────────────────────────────────────────────────────
  const prenom = profile?.prenom ?? user.email ?? "";
  const today = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Bonjour, {prenom} 👋
          </h1>
          <p className="text-text-muted mt-1">{todayCapitalized}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={Calendar} size="sm">
            Planning
          </Button>
          <Button variant="primary" icon={Sparkles} size="sm">
            Agent IA
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="CA ce mois"
          value={Math.round(caMois).toLocaleString("fr-FR")}
          icon={Euro}
          color="primary"
          suffix=" €"
          period="Factures payées ce mois"
        />
        <KPICard
          title="Devis en attente"
          value={String(devisCount)}
          icon={Clock}
          color="primary"
          period={devisCount === 0 ? "Aucun devis en attente" : `${devisCount} devis envoyé${devisCount > 1 ? "s" : ""}`}
        />
        <KPICard
          title="Factures impayées"
          value={String(facturesImpayeesCount)}
          icon={FileText}
          color={facturesImpayeesCount > 0 ? "warning" : "primary"}
          period={facturesImpayeesCount === 0 ? "Tout est à jour ✓" : `${facturesImpayeesCount} facture${facturesImpayeesCount > 1 ? "s" : ""} en attente`}
        />
        <KPICard
          title="Clients actifs"
          value={String(clientsActifsCount)}
          icon={Users}
          color="info"
          period={clientsActifsCount === 0 ? "Aucun client actif" : `${clientsActifsCount} client${clientsActifsCount > 1 ? "s" : ""} actif${clientsActifsCount > 1 ? "s" : ""}`}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue chart — spans 2 cols */}
        <RevenueChart data={chartData} />

        {/* Factures en retard */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text-primary">Actions requises</h3>
            {facturesImpayeesCount > 0 && (
              <span className="w-5 h-5 bg-status-error rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {facturesImpayeesCount}
              </span>
            )}
          </div>
          {facturesImpayeesCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-text-muted">Aucune action requise</p>
              <p className="text-xs text-text-muted mt-1">Tout est à jour ✓</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-background-secondary">
                <AlertCircle className="w-4 h-4 text-status-warning mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {facturesImpayeesCount} facture{facturesImpayeesCount > 1 ? "s" : ""} impayée{facturesImpayeesCount > 1 ? "s" : ""} en attente de règlement.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="col-span-2">
          <RecentActivity activities={activities} />
        </div>

        {/* Upcoming chantiers */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Chantiers à venir</h3>
              <p className="text-sm text-text-muted mt-0.5">Planifiés &amp; en cours</p>
            </div>
            <Button variant="ghost" size="sm" iconRight={ArrowRight}>
              Voir tout
            </Button>
          </div>

          {upcomingChantiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-text-muted">Aucun chantier planifié</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingChantiers.map((chantier) => (
                <div
                  key={chantier.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-active flex items-center justify-center flex-shrink-0">
                    <HardHat className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{chantier.client}</p>
                    <p className="text-xs text-text-muted">{chantier.type}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-text-primary">{chantier.date}</p>
                    <Badge
                      variant={chantier.status === "confirmé" ? "success" : "warning"}
                      size="sm"
                    >
                      {chantier.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
