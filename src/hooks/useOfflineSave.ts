/**
 * useOfflineSave — Sauvegarde locale (localStorage) pour la résilience offline.
 *
 * - Sauvegarde automatique à chaque modification via storageKey + data
 * - getDraft(key) pour récupérer un brouillon au moment d'entrer en édition
 * - clearDraft(key) à appeler après une sauvegarde serveur réussie
 */
import { useCallback, useEffect } from "react";

export function useOfflineSave<T>(options: {
  /** Clé localStorage (ex: "devis:uuid-123"). null = désactivé. */
  storageKey: string | null;
  /** Données à sauvegarder (null = pas de sauvegarde). */
  data: T | null;
}) {
  const { storageKey, data } = options;

  // Sauvegarde automatique à chaque changement de data
  useEffect(() => {
    if (!storageKey || data === null) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log("[OfflineSave] brouillon sauvegardé →", storageKey);
    } catch (e) {
      console.warn("[OfflineSave] échec écriture localStorage", e);
    }
  }, [storageKey, data]);

  /** Récupère un brouillon depuis localStorage (null si absent ou invalide). */
  const getDraft = useCallback(<D = T>(key: string): D | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as D) : null;
    } catch {
      return null;
    }
  }, []);

  /** Supprime un brouillon (à appeler après sauvegarde serveur réussie). */
  const clearDraft = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
      console.log("[OfflineSave] brouillon supprimé →", key);
    } catch {}
  }, []);

  return { getDraft, clearDraft };
}
