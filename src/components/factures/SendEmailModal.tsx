"use client";

import { useState } from "react";
import {
  X,
  Mail,
  Paperclip,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  FileText,
} from "lucide-react";


interface SendEmailModalProps {
  facture: {
    id: string;
    client: string;
    objet: string;
    total: string;
    echeance: string;
  };
  onClose: () => void;
  onSent: () => void;
}

type SendState = "form" | "sending" | "success" | "error";

export default function SendEmailModal({ facture, onClose, onSent }: SendEmailModalProps) {
  const defaultEmail = `${facture.client.toLowerCase().replace(/[^a-z]/g, ".")}@email.com`;
  const defaultSubject = `Facture ${facture.id} — ${facture.objet}`;
  const defaultBody = `Bonjour,

Veuillez trouver ci-joint la facture ${facture.id} d'un montant de ${facture.total} TTC, relative à : ${facture.objet}.

Le règlement est à effectuer avant le ${facture.echeance}, par virement bancaire aux coordonnées indiquées sur la facture.

N'hésitez pas à me contacter pour toute question.

Cordialement,
Jean Dupont
Plomberie Dupont — 06 12 34 56 78`;

  const [to, setTo] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [attachPdf, setAttachPdf] = useState(true);
  const [sendState, setSendState] = useState<SendState>("form");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSend = async () => {
    setSendState("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/factures/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, factureId: facture.id, attachPdf }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Erreur lors de l'envoi");
        setSendState("error");
        return;
      }
      setSendState("success");
      setTimeout(() => {
        onSent();
        onClose();
      }, 1800);
    } catch {
      setErrorMsg("Impossible de joindre le serveur. Vérifiez votre connexion.");
      setSendState("error");
    }
  };

  const isLoading = sendState === "sending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />

      <div className="relative w-full max-w-lg bg-background-secondary border border-surface-border rounded-2xl shadow-card overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
          <div className="w-8 h-8 rounded-xl bg-status-info/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-status-info" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-text-primary">Envoyer la facture par email</h2>
            <p className="text-xs text-text-muted font-mono">{facture.id}</p>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Success state */}
          {sendState === "success" && (
            <div className="py-8 flex flex-col items-center gap-3 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <p className="font-semibold text-text-primary">Email envoyé avec succès !</p>
              <p className="text-sm text-text-muted">
                La facture a été envoyée à <span className="text-text-primary">{to}</span>
              </p>
            </div>
          )}

          {sendState !== "success" && (
            <>
              {/* Facture summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-surface-border">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{facture.objet}</p>
                  <p className="text-xs text-text-muted">{facture.client} • {facture.total} TTC</p>
                </div>
              </div>

              {/* To */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Destinataire
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={isLoading}
                  className="input-field w-full text-sm disabled:opacity-50"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Objet
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isLoading}
                  className="input-field w-full text-sm disabled:opacity-50"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={isLoading}
                  rows={7}
                  className="input-field w-full text-sm resize-none font-mono text-xs leading-relaxed disabled:opacity-50"
                />
              </div>

              {/* Attach PDF toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-background border border-surface-border cursor-pointer hover:border-primary/30 transition-colors">
                <input
                  type="checkbox"
                  checked={attachPdf}
                  onChange={(e) => setAttachPdf(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 accent-[#00c97a]"
                />
                <Paperclip className="w-4 h-4 text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Joindre la facture en PDF</p>
                  <p className="text-xs text-text-muted">{facture.id}.pdf</p>
                </div>
              </label>

              {/* Error */}
              {sendState === "error" && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-status-error/10 border border-status-error/20">
                  <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0" />
                  <p className="text-xs text-status-error">{errorMsg}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="btn-ghost flex-1 text-center py-2.5 rounded-xl border border-surface-border text-sm disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading || !to || !subject}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
