/**
 * SaveStatusBadge — Badge d'état de sauvegarde partagé.
 *
 * États : idle+dirty → Modifié | saving → Sauvegarde… (pulse) |
 *          saved → Sauvegardé ✓ | offline → Hors ligne | error → Erreur
 */
import { clsx } from "clsx";
import type { SaveStatus } from "@/hooks/useAutosave";

interface Props {
  status: SaveStatus;
  isDirty: boolean;
  isEditing: boolean;
}

export function SaveStatusBadge({ status, isDirty, isEditing }: Props) {
  if (!isEditing) return null;

  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded text-status-warning bg-status-warning/10">
        <span className="w-1.5 h-1.5 rounded-full bg-status-warning flex-shrink-0" />
        Hors ligne
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded text-status-info bg-status-info/10">
        <span className="w-1.5 h-1.5 rounded-full bg-status-info animate-pulse flex-shrink-0" />
        Sauvegarde…
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-primary bg-primary/10">
        Sauvegardé ✓
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-status-error bg-status-error/10">
        Erreur
      </span>
    );
  }

  if (isDirty) {
    return (
      <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded text-text-muted bg-surface-active")}>
        ● Modifié
      </span>
    );
  }

  return null;
}
