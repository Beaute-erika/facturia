/**
 * Logger structuré pour le backend Facturia.
 *
 * Format : TIMESTAMP [CONTEXT] [ACTION] message  {meta?}
 * Exemple : 2024-01-15T10:30:00.000Z [CHORUS] [SEND] facture FAC-001 → success
 *
 * Usage :
 *   import { logInfo, logWarn, logError } from "@/lib/logger";
 *   logInfo("CHORUS", "SEND", `facture ${numero} → success`);
 *   logError("CHORUS", "SEND", `facture ${numero} → invalid SIRET`, err);
 */

function ts(): string {
  return new Date().toISOString();
}

function fmt(context: string, action: string, message: string): string {
  return `${ts()} [${context}] [${action}] ${message}`;
}

/**
 * Log informatif — opérations normales, succès, transitions d'état.
 */
export function logInfo(
  context: string,
  action: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (meta && Object.keys(meta).length > 0) {
    console.log(fmt(context, action, message), meta);
  } else {
    console.log(fmt(context, action, message));
  }
}

/**
 * Log avertissement — situations récupérables, retries, données manquantes.
 */
export function logWarn(
  context: string,
  action: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (meta && Object.keys(meta).length > 0) {
    console.warn(fmt(context, action, message), meta);
  } else {
    console.warn(fmt(context, action, message));
  }
}

/**
 * Log erreur — exceptions, erreurs API externes, échecs critiques.
 */
export function logError(
  context: string,
  action: string,
  message: string,
  err?: unknown,
): void {
  const errMsg =
    err instanceof Error ? err.message : err !== undefined ? String(err) : undefined;

  if (errMsg) {
    console.error(fmt(context, action, message), { error: errMsg });
  } else {
    console.error(fmt(context, action, message));
  }
}
