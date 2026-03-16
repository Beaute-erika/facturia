"use client";

import { useState } from "react";
import { Save, Bell, Mail, MessageSquare, Clock, Repeat, BarChart3, Lock } from "lucide-react";
import { clsx } from "clsx";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";

interface NotifGroup {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  email: boolean;
  sms: boolean;
  proOnly?: boolean;
  delay?: number;
  delayUnit?: "jours" | "heures";
}

export default function NotificationsSection({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState<NotifGroup[]>([
    { id: "new_client", icon: Bell, title: "Nouveau client créé", description: "Confirmation à la création d'une fiche client", email: true, sms: false },
    { id: "devis_sent", icon: Mail, title: "Devis envoyé", description: "Copie de confirmation d'envoi", email: true, sms: false },
    { id: "devis_accepted", icon: Bell, title: "Devis accepté", description: "Alerte quand un client accepte votre devis", email: true, sms: true, proOnly: true },
    { id: "devis_reminder", icon: Clock, title: "Relance devis sans réponse", description: "Rappel automatique si le devis n'est pas ouvert", email: true, sms: false, delay: 7, delayUnit: "jours" },
    { id: "facture_paid", icon: Bell, title: "Facture payée", description: "Notification dès réception du paiement", email: true, sms: true, proOnly: true },
    { id: "facture_overdue", icon: Bell, title: "Facture en retard", description: "Alerte si une facture dépasse l'échéance", email: true, sms: false, delay: 1, delayUnit: "jours" },
    { id: "auto_relance", icon: Repeat, title: "Relance automatique clients", description: "Email de relance envoyé automatiquement", email: true, sms: false, delay: 15, delayUnit: "jours" },
    { id: "weekly_report", icon: BarChart3, title: "Rapport hebdomadaire", description: "Résumé CA, devis, factures chaque lundi matin", email: true, sms: false },
  ]);
  const [delays, setDelays] = useState<Record<string, number>>({
    devis_reminder: 7, facture_overdue: 1, auto_relance: 15,
  });

  const toggle = (id: string, channel: "email" | "sms") => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, [channel]: !n[channel] } : n));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(); }, 1500);
  };

  return (
    <div className="space-y-8">
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
        <div className="flex items-start gap-3">
          <Bell className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">Notifications actives</p>
            <p className="text-xs text-text-muted mt-0.5">
              {notifs.filter((n) => n.email || n.sms).length} notification(s) configurée(s) sur {notifs.length}
            </p>
          </div>
        </div>
      </div>

      {/* Channel headers */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">Canaux de notification</h3>
          <div className="flex-1 h-px bg-surface-border ml-2" />
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_64px_64px] gap-4 px-4 mb-2">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Événement</span>
          <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-text-muted uppercase">
            <Mail className="w-3 h-3" /> Email
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-text-muted uppercase">
            <MessageSquare className="w-3 h-3" /> SMS
          </div>
        </div>

        <div className="space-y-1">
          {notifs.map((notif) => {
            const Icon = notif.icon;
            return (
              <div key={notif.id} className="grid grid-cols-[1fr_64px_64px] gap-4 items-center p-3 rounded-xl bg-background border border-surface-border hover:border-surface-active transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                      {notif.proOnly && <Badge variant="info" size="sm">Pro</Badge>}
                    </div>
                    <p className="text-xs text-text-muted">{notif.description}</p>
                    {notif.delay !== undefined && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-text-muted">Délai :</span>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={delays[notif.id] ?? notif.delay}
                          onChange={(e) => setDelays((d) => ({ ...d, [notif.id]: Number(e.target.value) }))}
                          className="input-field w-14 py-0.5 text-xs text-center font-mono"
                        />
                        <span className="text-[10px] text-text-muted">{notif.delayUnit}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center">
                  <Toggle checked={notif.email} onChange={() => toggle(notif.id, "email")} size="sm" />
                </div>
                <div className="flex justify-center">
                  {notif.proOnly ? (
                    <div title="Disponible en plan Pro">
                      <Toggle checked={notif.sms} onChange={() => toggle(notif.id, "sms")} size="sm" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-[9px] text-text-muted">Pro</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SMS Pro upsell */}
      <div className="p-4 rounded-xl bg-surface-active border border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Notifications SMS</p>
              <p className="text-xs text-text-muted mt-0.5">Recevez des alertes instantanées sur votre mobile. Disponible en plan Pro.</p>
            </div>
          </div>
          <button className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
            Passer Pro
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
            saved ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary text-background hover:bg-primary-400 hover:shadow-glow"
          )}
        >
          <Save className="w-4 h-4" />
          {saved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
