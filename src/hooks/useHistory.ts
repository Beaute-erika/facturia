/**
 * useHistory — Undo / Redo stack (max 20 états)
 *
 * Utilise des refs pour le stack (synchrone) et du state pour canUndo/canRedo
 * (réactivité UI). undo() et redo() retournent la valeur cible directement
 * pour que le composant puisse mettre à jour son propre state immédiatement.
 */
import { useCallback, useRef, useState } from "react";

export interface UseHistoryReturn<T> {
  push: (value: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  reset: (value: T | null) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistory<T>(options?: {
  maxStack?: number;
}): UseHistoryReturn<T> {
  const maxStack = options?.maxStack ?? 20;

  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const presentRef = useRef<T | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const push = useCallback(
    (value: T) => {
      if (presentRef.current !== null) {
        pastRef.current = [
          ...pastRef.current.slice(-(maxStack - 1)),
          presentRef.current,
        ];
      }
      futureRef.current = [];
      presentRef.current = value;
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(false);
    },
    [maxStack],
  );

  const undo = useCallback((): T | null => {
    if (pastRef.current.length === 0) return null;
    const newPresent = pastRef.current[pastRef.current.length - 1];
    if (presentRef.current !== null) {
      futureRef.current = [presentRef.current, ...futureRef.current];
    }
    pastRef.current = pastRef.current.slice(0, -1);
    presentRef.current = newPresent;
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
    console.log("[History] undo →", newPresent);
    return newPresent;
  }, []);

  const redo = useCallback((): T | null => {
    if (futureRef.current.length === 0) return null;
    const [newPresent, ...rest] = futureRef.current;
    if (presentRef.current !== null) {
      pastRef.current = [...pastRef.current, presentRef.current];
    }
    futureRef.current = rest;
    presentRef.current = newPresent;
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
    console.log("[History] redo →", newPresent);
    return newPresent;
  }, []);

  const reset = useCallback((value: T | null) => {
    pastRef.current = [];
    futureRef.current = [];
    presentRef.current = value;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { push, undo, redo, reset, canUndo, canRedo };
}
