"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X, Sparkles, Send, RotateCcw, ChevronRight, User, Bot,
  AlertCircle, FileText, Receipt, HardHat, Users, Clock,
  Bell, Loader2, Mail, StickyNote, CheckCircle2, RefreshCcw,
  TrendingUp, Zap, Lock,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useAgent, type AgentContextType } from "./AgentContext";
import type { AgentSuggestion } from "@/app/api/agent/suggestions/route";

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS: Record<string, { label: string; prompt: string }[]> = {
  client: [
    { label: "Résumer ce client",    prompt: "Résume la fiche de ce client en points clés : situation, documents récents, ce qui est important à savoir." },
    { label: "Prochaine action",     prompt: "Quelle est la prochaine action prioritaire pour ce client ? Propose quelque chose de concret." },
    { label: "Rédiger un suivi",     prompt: "Rédige un message de suivi professionnel à envoyer à ce client." },
    { label: "Demande d'avis",       prompt: "Rédige un message court et naturel pour demander un avis Google à ce client." },
  ],
  devis: [
    { label: "Résumer ce devis",     prompt: "Résume ce devis en points clés : client, objet, montant, statut, points importants." },
    { label: "Email d'envoi",        prompt: "Rédige un email professionnel pour envoyer ce devis au client." },
    { label: "Relance devis",        prompt: "Ce devis n'a pas encore été accepté. Rédige une relance cordiale et professionnelle." },
    { label: "Expliquer simplement", prompt: "Explique ce devis en termes simples, comme si je devais le présenter oralement à mon client." },
  ],
  facture: [
    { label: "Situation paiement",   prompt: "Résume la situation de paiement de cette facture." },
    { label: "Email d'envoi",        prompt: "Rédige un email professionnel pour envoyer cette facture au client." },
    { label: "Relance douce",        prompt: "Rédige une relance de paiement cordiale et amicale pour cette facture." },
    { label: "Relance standard",     prompt: "Cette facture est impayée. Rédige une relance de paiement claire et professionnelle, ton neutre." },
    { label: "Relance ferme",        prompt: "Cette facture n'est toujours pas payée. Rédige une relance ferme mais professionnelle." },
  ],
  chantier: [
    { label: "Résumer le chantier",  prompt: "Résume l'état actuel de ce chantier : avancement, points importants, prochaines étapes." },
    { label: "Point d'avancement",   prompt: "Prépare un message de point d'avancement à envoyer au client pour ce chantier." },
    { label: "Notes → message",      prompt: "Transforme les notes de ce chantier en un message clair et professionnel à envoyer au client." },
    { label: "Message de retard",    prompt: "Le chantier a pris du retard. Rédige un message professionnel pour en informer le client." },
    { label: "Compte-rendu fin",     prompt: "Ce chantier est terminé ou presque. Prépare un compte-rendu de fin d'intervention à envoyer au client." },
  ],
  general: [
    { label: "Vue d'ensemble",        prompt: "Donne-moi un résumé de la situation actuelle de mon CRM : ce qui est urgent, ce qui mérite une relance, les points d'attention." },
    { label: "Relances prioritaires", prompt: "Identifie les éléments qui méritent une relance en priorité (devis, factures, clients) et explique pourquoi." },
    { label: "Préparer les relances", prompt: "Prépare des messages de relance pour les éléments les plus urgents." },
    { label: "Prochaines actions",    prompt: "Quelles sont les 3 actions les plus importantes à faire aujourd'hui dans mon CRM ? Explique le raisonnement." },
  ],
};

// Actions disponibles par contexte pour les message blocks
const CONTEXT_ACTIONS: Record<string, { key: string; label: string; icon: React.ElementType; action: string; statut?: string }[]> = {
  client: [
    { key: "email",    label: "Envoyer par email", icon: Mail,        action: "email" },
    { key: "add_note", label: "Ajouter comme note", icon: StickyNote, action: "add_note" },
  ],
  devis: [
    { key: "email",         label: "Envoyer par email",  icon: Mail,         action: "email" },
    { key: "statut_envoye", label: "Marquer envoyé",      icon: CheckCircle2, action: "update_statut", statut: "envoye" },
    { key: "statut_accepte",label: "Marquer accepté",     icon: TrendingUp,   action: "update_statut", statut: "accepte" },
  ],
  facture: [
    { key: "email",        label: "Envoyer par email", icon: Mail,         action: "email" },
    { key: "statut_payee", label: "Marquer payée",      icon: CheckCircle2, action: "update_statut", statut: "payee" },
  ],
  chantier: [
    { key: "email",           label: "Envoyer par email", icon: Mail,         action: "email" },
    { key: "statut_termine",  label: "Marquer terminé",    icon: CheckCircle2, action: "update_statut", statut: "termine" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractMessageBlock(content: string): string | null {
  const match = content.match(/---MESSAGE---([\s\S]*?)(?:---FIN MESSAGE---|$)/);
  return match?.[1]?.trim() ?? null;
}

function ContextIcon({ type }: { type: AgentContextType["type"] }) {
  const icons = { client: Users, devis: FileText, facture: Receipt, chantier: HardHat, general: Sparkles };
  const Icon = icons[type] ?? Sparkles;
  return <Icon className="w-3.5 h-3.5" />;
}

// ─── Message renderer ─────────────────────────────────────────────────────────

function MessageContent({ content, pending }: { content: string; pending?: boolean }) {
  if (!content && pending) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    );
  }

  const hasBlock = content.includes("---MESSAGE---");

  if (hasBlock) {
    const parts = content.split(/---MESSAGE---|---FIN MESSAGE---/);
    return (
      <div className="space-y-2">
        {parts.map((part, i) => {
          const isBlock = i === 1;
          const text    = part.trim();
          if (!text) return null;
          if (isBlock) {
            return (
              <div key={i} className="bg-background border border-primary/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Message prêt à envoyer</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="text-[10px] text-text-muted hover:text-primary transition-colors font-medium"
                  >
                    Copier
                  </button>
                </div>
                <pre className="text-xs text-text-primary whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
              </div>
            );
          }
          return <FormattedText key={i} text={text} />;
        })}
      </div>
    );
  }

  return <FormattedText text={content} />;
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        const formatted = line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        const isBullet  = line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ");
        const isHeader  = line.startsWith("## ") || line.startsWith("### ");
        if (isHeader) return (
          <p key={i} className="text-xs font-semibold text-text-primary mt-1"
            dangerouslySetInnerHTML={{ __html: formatted.replace(/^#{2,3}\s/, "") }} />
        );
        if (isBullet) return (
          <div key={i} className="flex gap-1.5 text-xs text-text-secondary">
            <span className="text-primary mt-0.5 flex-shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[\s\-•]+/, "") }} />
          </div>
        );
        return (
          <p key={i} className="text-xs text-text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      })}
    </div>
  );
}

// ─── Action chips (below message blocks) ─────────────────────────────────────

type ActionStatus = "idle" | "confirming" | "loading" | "done" | "error";

interface ActionChipsProps {
  messageId:   string;
  blockContent: string;
  context:     AgentContextType | undefined;
}

function ActionChips({ messageId, blockContent, context }: ActionChipsProps) {
  const [states,   setStates]   = useState<Record<string, ActionStatus>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const availableActions = CONTEXT_ACTIONS[context?.type ?? ""] ?? [];

  const setState = useCallback((key: string, s: ActionStatus) =>
    setStates((prev) => ({ ...prev, [`${messageId}:${key}`] : s })), [messageId]);
  const setMsg = useCallback((key: string, m: string) =>
    setFeedback((prev) => ({ ...prev, [`${messageId}:${key}`]: m })), [messageId]);

  const stateOf = (key: string): ActionStatus =>
    states[`${messageId}:${key}`] ?? "idle";
  const msgOf = (key: string): string =>
    feedback[`${messageId}:${key}`] ?? "";

  const execute = useCallback(async (actionDef: typeof availableActions[0]) => {
    const { key, action, statut } = actionDef;

    if (action === "email") {
      const subject = encodeURIComponent(`Facturia — ${context?.label ?? ""}`);
      const body    = encodeURIComponent(blockContent);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
      setState(key, "done");
      setMsg(key, "Messagerie ouverte");
      setTimeout(() => setState(key, "idle"), 3000);
      return;
    }

    setState(key, "loading");
    try {
      const res = await fetch("/api/agent/actions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action,
          contextType: context?.type,
          contextId:   context?.id,
          content:     action === "add_note" ? blockContent : undefined,
          statut:      action === "update_statut" ? statut : undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setState(key, "error");
        setMsg(key, data.error ?? "Erreur");
      } else {
        setState(key, "done");
        setMsg(key, data.message ?? "Fait");
      }
      setTimeout(() => setState(key, "idle"), 3500);
    } catch {
      setState(key, "error");
      setMsg(key, "Erreur réseau");
      setTimeout(() => setState(key, "idle"), 3000);
    }
  }, [context, blockContent, setState, setMsg]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!availableActions.length || !context?.id) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pl-0.5">
      {availableActions.map((a) => {
        const s     = stateOf(a.key);
        const fb    = msgOf(a.key);
        const Icon  = a.icon;

        if (s === "done" || s === "error") {
          return (
            <span key={a.key} className={clsx(
              "inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium",
              s === "done" ? "bg-status-success/10 text-status-success border border-status-success/20" : "bg-status-error/10 text-status-error border border-status-error/20"
            )}>
              {s === "done" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {fb}
            </span>
          );
        }

        if (s === "confirming") {
          return (
            <span key={a.key} className="inline-flex items-center gap-1">
              <span className="text-[10px] text-text-muted font-medium">Confirmer ?</span>
              <button
                onClick={() => execute(a)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-status-success/10 text-status-success border border-status-success/20 hover:bg-status-success/20 transition-colors"
              >✓</button>
              <button
                onClick={() => setState(a.key, "idle")}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-surface text-text-muted border border-surface-border hover:bg-surface-hover transition-colors"
              >✗</button>
            </span>
          );
        }

        if (s === "loading") {
          return (
            <span key={a.key} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-surface border border-surface-border text-text-muted">
              <Loader2 className="w-3 h-3 animate-spin" />
              En cours…
            </span>
          );
        }

        // idle — for email, no confirm needed; others require confirm
        const needsConfirm = a.action !== "email";
        return (
          <button
            key={a.key}
            onClick={() => needsConfirm ? setState(a.key, "confirming") : execute(a)}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-surface border border-surface-border text-text-muted hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Icon className="w-3 h-3" />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ used, limit, plan }: { used: number; limit: number; plan: string }) {
  const pct     = Math.min(100, Math.round((used / limit) * 100));
  const isHigh  = pct >= 80;
  const isFull  = pct >= 100;

  return (
    <div className="px-4 py-2 border-t border-surface-border bg-background">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-text-muted">
          {used} / {limit === 9999 ? "∞" : limit} messages ce mois
          <span className={clsx("ml-1.5 font-semibold capitalize", plan === "business" ? "text-primary" : "text-text-muted")}>
            · {plan}
          </span>
        </span>
        {isHigh && plan !== "business" && (
          <span className={clsx("text-[10px] font-semibold", isFull ? "text-status-error" : "text-status-warning")}>
            {isFull ? "Quota atteint" : `${100 - pct}% restant`}
          </span>
        )}
      </div>
      {limit < 9999 && (
        <div className="h-1 w-full bg-surface rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", isFull ? "bg-status-error" : isHigh ? "bg-status-warning" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AgentPanel() {
  const {
    isOpen, context, messages, isLoading,
    isLoadingHistory, historyLoaded,
    error, usage, closeAgent, sendMessage, clearMessages,
  } = useAgent();

  const [input,       setInput]       = useState("");
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [sugLoaded,   setSugLoaded]   = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSuggestions([]);
    setSugLoaded(false);

    fetch("/api/agent/suggestions")
      .then((r) => r.json())
      .then((d: { suggestions: AgentSuggestion[] }) => {
        setSuggestions(d.suggestions ?? []);
        setSugLoaded(true);
      })
      .catch(() => setSugLoaded(true));
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions   = QUICK_ACTIONS[context?.type ?? "general"] ?? QUICK_ACTIONS.general;
  const contextLabel   = context?.label ?? (context?.type === "general" ? "Vue générale CRM" : "Assistant CRM");
  const showEmptyState = messages.length === 0 && !isLoadingHistory;
  const quotaExceeded  = !!(usage && usage.used >= usage.limit && usage.limit < 9999);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden" onClick={closeAgent} />

      <div className={clsx(
        "fixed top-0 right-0 bottom-0 z-50 flex flex-col",
        "w-full max-w-md bg-background-secondary border-l border-surface-border shadow-card",
        "animate-slide-in"
      )}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-surface-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-text-primary">Agent IA</span>
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">V3</span>
                </div>
                <p className="text-[10px] text-text-muted">Assistant CRM Facturia</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearMessages} title="Effacer l'historique"
                  className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={closeAgent}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {context && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/15 min-w-0 flex-1">
                <ContextIcon type={context.type} />
                <span className="text-xs font-medium text-primary truncate">{contextLabel}</span>
              </div>
              {isLoadingHistory && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface border border-surface-border flex-shrink-0">
                  <Loader2 className="w-3 h-3 text-text-muted animate-spin" />
                  <span className="text-[10px] text-text-muted">Chargement…</span>
                </div>
              )}
              {historyLoaded && messages.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface border border-surface-border flex-shrink-0">
                  <Clock className="w-3 h-3 text-text-muted" />
                  <span className="text-[10px] text-text-muted">{messages.length} msg</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading state */}
          {isLoadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Chargement de l&apos;historique…</span>
            </div>
          )}

          {/* Empty state */}
          {showEmptyState && (
            <div className="p-4 space-y-5">
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-text-primary">
                  {context ? `Contexte : ${contextLabel}` : "Comment puis-je vous aider ?"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Posez une question ou choisissez une action rapide
                </p>
              </div>

              {/* Suggestions */}
              {sugLoaded && suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <Bell className="w-3 h-3 text-status-warning" />
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Actions suggérées
                    </p>
                  </div>
                  {suggestions.map((s) => (
                    <button key={s.id}
                      onClick={() => sendMessage(s.prompt)}
                      disabled={isLoading}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-background border border-surface-border hover:border-status-warning/40 hover:bg-status-warning/5 transition-all text-left group"
                    >
                      <span className={clsx(
                        "w-2 h-2 rounded-full flex-shrink-0 mt-1",
                        s.priority === "high" ? "bg-status-error" : "bg-status-warning"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-medium text-text-primary truncate">{s.label}</p>
                          <span className={clsx(
                            "text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide",
                            s.priority === "high" ? "bg-status-error/10 text-status-error" : "bg-status-warning/10 text-status-warning"
                          )}>
                            {s.priority === "high" ? "URGENT" : "À FAIRE"}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-0.5">{s.detail}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5 group-hover:text-status-warning transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-1">Actions rapides</p>
                {quickActions.map((action) => (
                  <button key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-background border border-surface-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                  >
                    <span className="text-xs font-medium text-text-primary group-hover:text-primary transition-colors">
                      {action.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="p-4 space-y-4">
              {historyLoaded && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-surface-border" />
                  <span className="text-[10px] text-text-muted flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    Historique chargé
                  </span>
                  <div className="flex-1 h-px bg-surface-border" />
                </div>
              )}

              {messages.map((msg) => {
                const blockContent = msg.role === "assistant" && !msg.pending
                  ? extractMessageBlock(msg.content)
                  : null;

                return (
                  <div key={msg.id}>
                    <div className={clsx("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}>
                      <div className={clsx(
                        "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        msg.role === "user"
                          ? "bg-primary/20 border border-primary/30"
                          : "bg-surface border border-surface-border"
                      )}>
                        {msg.role === "user" ? <User className="w-3 h-3 text-primary" /> : <Bot className="w-3 h-3 text-text-muted" />}
                      </div>
                      <div className={clsx(
                        "rounded-xl px-3 py-2.5 max-w-[85%]",
                        msg.role === "user"
                          ? "bg-primary/10 border border-primary/20 text-text-primary text-xs"
                          : "bg-background border border-surface-border"
                      )}>
                        {msg.role === "user"
                          ? <p className="text-xs text-text-primary whitespace-pre-wrap">{msg.content}</p>
                          : <MessageContent content={msg.content} pending={msg.pending} />
                        }
                      </div>
                    </div>

                    {/* Action chips below assistant message blocks */}
                    {blockContent && (
                      <div className="ml-8">
                        <ActionChips
                          messageId={msg.id}
                          blockContent={blockContent}
                          context={context}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {error && !quotaExceeded && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-error/10 border border-status-error/20">
                  <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0" />
                  <p className="text-xs text-status-error">{error}</p>
                </div>
              )}

              {/* Quick action chips during conversation */}
              {!isLoading && (
                <div className="pt-1 border-t border-surface-border">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Actions rapides</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.slice(0, 4).map((a) => (
                      <button key={a.label}
                        onClick={() => sendMessage(a.prompt)}
                        className="text-[10px] font-medium px-2 py-1 rounded-lg bg-surface border border-surface-border hover:border-primary/30 hover:bg-primary/5 hover:text-primary text-text-muted transition-all"
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      onClick={() => { clearMessages(); }}
                      title="Nouvelle conversation"
                      className="text-[10px] font-medium px-2 py-1 rounded-lg bg-surface border border-surface-border hover:border-status-error/30 hover:text-status-error text-text-muted transition-all flex items-center gap-1"
                    >
                      <RefreshCcw className="w-2.5 h-2.5" />
                      Nouvelle conv.
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Usage bar */}
        {usage && !quotaExceeded && (
          <UsageBar used={usage.used} limit={usage.limit} plan={usage.plan} />
        )}

        {/* Paywall — quota exceeded */}
        {quotaExceeded && (
          <div className="px-4 py-4 border-t border-status-error/30 bg-status-error/5 flex-shrink-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-status-error/10 border border-status-error/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-status-error" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Quota mensuel atteint</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Plan {usage ? usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1) : ""} — {usage?.used}/{usage?.limit === 9999 ? "∞" : usage?.limit} messages utilisés
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/settings?tab=subscription"
                onClick={closeAgent}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-background text-xs font-semibold hover:bg-primary-400 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                Passer au plan supérieur
              </Link>
              <Link
                href="/pricing"
                target="_blank"
                className="px-3 py-2.5 rounded-xl border border-surface-border text-xs text-text-muted hover:text-primary hover:border-primary/30 transition-all"
              >
                Voir les plans
              </Link>
            </div>
          </div>
        )}

        {/* Input */}
        {!quotaExceeded && (
          <div className="px-4 py-3 border-t border-surface-border flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez une question ou décrivez ce que vous voulez…"
                rows={1}
                disabled={isLoading || isLoadingHistory}
                className={clsx(
                  "flex-1 input-field text-xs resize-none leading-relaxed py-2.5",
                  "min-h-[38px] max-h-[120px]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isLoadingHistory}
                className={clsx(
                  "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                  input.trim() && !isLoading && !isLoadingHistory
                    ? "bg-primary text-background hover:bg-primary-400 hover:shadow-glow"
                    : "bg-surface text-text-muted cursor-not-allowed"
                )}
              >
                {isLoading
                  ? <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 text-center">
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
            </p>
          </div>
        )}
      </div>
    </>
  );
}
