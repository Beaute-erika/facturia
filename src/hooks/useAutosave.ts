/**
 * useAutosave — Sauvegarde automatique niveau SaaS premium.
 *
 * Fonctionnalités :
 * - Debounce via data (géré par le composant parent)
 * - Skip PATCH si aucun vrai changement (snapshotRef)
 * - Retry exponentiel : 1s, 2s, 4s (max 3 tentatives)
 * - Détection online / offline avec reprise automatique
 * - "saved" se masque automatiquement après savedHideDuration (2s par défaut)
 * - Callbacks onSaved (pour clearDraft) et onError
 */
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface UseAutosaveOptions {
  /** Données debouncées — un changement déclenche une tentative de sauvegarde */
  data: ({ _uuid: string } & Record<string, unknown>) | null;
  /** Ref vers les valeurs initiales capturées au moment d'entrer en édition */
  snapshotRef: MutableRefObject<Record<string, unknown> | null>;
  /** Champs à comparer pour détecter un vrai changement */
  compareKeys: readonly string[];
  buildUrl: (uuid: string) => string;
  buildPayload: (data: Record<string, unknown>) => Record<string, unknown>;
  onError?: (msg: string) => void;
  /** Appelé après une sauvegarde réussie (ex: clearDraft) */
  onSaved?: () => void;
  /** Nombre max de retries après erreur (défaut : 3) */
  maxRetries?: number;
  /** Délai de base en ms — multiplié exponentiellement (défaut : 1000) */
  retryDelay?: number;
  /** Durée d'affichage du badge "saved" avant retour à "idle" (défaut : 2000ms) */
  savedHideDuration?: number;
}

export function useAutosave({
  data,
  snapshotRef,
  compareKeys,
  buildUrl,
  buildPayload,
  onError,
  onSaved,
  maxRetries = 3,
  retryDelay = 1000,
  savedHideDuration = 2000,
}: UseAutosaveOptions): { status: SaveStatus; reset: () => void; isOnline: boolean } {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Données en attente de sauvegarde (pour retry au retour du réseau)
  const pendingSaveRef = useRef<typeof data>(null);

  // Refs stables pour callbacks et options (évite les stale closures)
  const buildUrlRef = useRef(buildUrl);
  const buildPayloadRef = useRef(buildPayload);
  const onErrorRef = useRef(onError);
  const onSavedRef = useRef(onSaved);
  buildUrlRef.current = buildUrl;
  buildPayloadRef.current = buildPayload;
  onErrorRef.current = onError;
  onSavedRef.current = onSaved;

  // Détection online / offline
  useEffect(() => {
    const goOnline = () => {
      console.log("[Autosave] réseau rétabli");
      setIsOnline(true);
    };
    const goOffline = () => {
      console.log("[Autosave] réseau perdu");
      setIsOnline(false);
      setStatus("offline");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Logique de sauvegarde (via ref pour accès stable depuis setTimeout)
  const doSaveRef = useRef<
    (saveData: NonNullable<typeof data>, attempt: number) => Promise<void>
  >();
  doSaveRef.current = async (saveData, attempt) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    console.log(`[Autosave] saving... (tentative ${attempt + 1})`, saveData._uuid);
    setStatus("saving");

    try {
      const res = await fetch(buildUrlRef.current(saveData._uuid as string), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayloadRef.current(saveData)),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      console.log("[Autosave] sauvegardé ✓", saveData._uuid);
      setStatus("saved");
      onSavedRef.current?.();

      // Auto-masquer le badge "saved" après savedHideDuration
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus("idle"), savedHideDuration);
    } catch (err) {
      if ((err as DOMException).name === "AbortError") {
        console.log("[Autosave] annulé (remplacé par une sauvegarde plus récente)");
        return;
      }

      console.error(`[Autosave] erreur (tentative ${attempt + 1})`, err);

      if (attempt < maxRetries) {
        // Backoff exponentiel : 1s, 2s, 4s
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`[Autosave] retry dans ${delay}ms (${attempt + 1}/${maxRetries})`);
        retryTimerRef.current = setTimeout(
          () => doSaveRef.current!(saveData, attempt + 1),
          delay,
        );
      } else {
        setStatus("error");
        onErrorRef.current?.(
          "Connexion perdue — vos modifications seront sauvegardées dès le retour du réseau",
        );
      }
    }
  };

  // Déclenchement principal : sur changement de data
  useEffect(() => {
    if (!data?._uuid) return;

    // Offline : mémoriser pour retry plus tard
    if (!navigator.onLine) {
      setStatus("offline");
      pendingSaveRef.current = data;
      console.log("[Autosave] offline — données mémorisées pour retry");
      return;
    }

    // Skip si aucun vrai changement
    const snap = snapshotRef.current;
    if (snap && compareKeys.every((k) => data[k] === snap[k])) {
      console.log("[Autosave] aucun changement, skip PATCH");
      return;
    }

    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    pendingSaveRef.current = data;
    doSaveRef.current!(data, 0);

    return () => {
      abortRef.current?.abort();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Retry automatique au retour du réseau
  useEffect(() => {
    if (!isOnline) return;
    const pending = pendingSaveRef.current;
    if (!pending?._uuid) return;
    const snap = snapshotRef.current;
    if (snap && compareKeys.every((k) => pending[k] === snap[k])) return;
    console.log("[Autosave] réseau rétabli — relance sauvegarde");
    doSaveRef.current!(pending, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const reset = () => {
    abortRef.current?.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    pendingSaveRef.current = null;
    setStatus("idle");
  };

  return { status, reset, isOnline };
}
