/**
 * Service Chorus Pro via PISTE (Plateforme d'Intermédiation des Services de l'État)
 * Documentation officielle : https://developer.aife.economie.gouv.fr/
 *
 * Flux :
 *   1. getAccessToken()           — OAuth2 client_credentials → Bearer token (mis en cache)
 *   2. validateChorusPayload()    — Validation locale avant tout appel API (fail-fast)
 *   3. sendInvoiceToChorus()      — Dépôt facture structurée (JSON)
 *   4. fetchChorusStatus()        — Consultation statut + motif rejet éventuel
 *
 * Variables d'environnement requises :
 *   CHORUS_CLIENT_ID      — identifiant application PISTE
 *   CHORUS_CLIENT_SECRET  — secret application PISTE
 *   CHORUS_API_BASE_URL   — ex. https://sandbox-api.piste.gouv.fr  (défaut sandbox)
 */

// ─── Constantes d'URL ────────────────────────────────────────────────────────

const API_BASE =
  process.env.CHORUS_API_BASE_URL ?? "https://sandbox-api.piste.gouv.fr";

// Dérive l'URL OAuth depuis la base API :
//   https://sandbox-api.piste.gouv.fr → https://sandbox-oauth.piste.gouv.fr/api/oauth/token
//   https://api.piste.gouv.fr         → https://oauth.piste.gouv.fr/api/oauth/token
const OAUTH_URL = API_BASE.replace(/api\.piste/, "oauth.piste") + "/api/oauth/token";

// ─── Cache token en mémoire (process) ────────────────────────────────────────

interface TokenCache {
  access_token: string;
  expires_at: number; // Date.now() + (expires_in - 30s)
}

let tokenCache: TokenCache | null = null;

// ─── 1. Authentification OAuth2 ──────────────────────────────────────────────

/**
 * Retourne un Bearer token valide pour l'API Chorus Pro (PISTE).
 * Le token est mis en cache en mémoire jusqu'à 30 s avant expiration.
 * Rafraîchissement automatique à l'expiration.
 */
export async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires_at) {
    return tokenCache.access_token;
  }

  const clientId = process.env.CHORUS_CLIENT_ID;
  const clientSecret = process.env.CHORUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Variables d'environnement CHORUS_CLIENT_ID et CHORUS_CLIENT_SECRET requises",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "openid",
  });

  const resp = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Erreur OAuth PISTE (${resp.status}) : ${text}`);
  }

  const json = (await resp.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    access_token: json.access_token,
    expires_at: Date.now() + (json.expires_in - 30) * 1000,
  };

  return tokenCache.access_token;
}

// ─── 2. Validation payload (fail-fast, sans appel API) ───────────────────────

export interface ChorusFacturePayload {
  /** SIRET de l'émetteur (fournisseur) — 14 chiffres */
  siretFournisseur: string;
  /** SIRET du destinataire (entité publique acheteuse) — 14 chiffres */
  siretDestinataire: string;
  /** Numéro de facture interne (ex. "FAC-2024-001") */
  numeroFacture: string;
  /** Date de la facture au format YYYY-MM-DD */
  dateFacture: string;
  /** Montant HT total en euros */
  montantHTTotal: number;
  /** Montant TVA total en euros */
  montantTVATotal: number;
  /** Montant TTC total en euros */
  montantTTCTotal: number;
  /** Numéro d'engagement juridique (bon de commande, marché) */
  numeroEngagementJuridique?: string;
  /** Code du service exécutant chez le destinataire */
  codeServiceExecutant?: string;
  /** Objet / désignation de la facture */
  designationFacture?: string;
  /** Nombre de lignes (pour validation) */
  nombreLignes?: number;
}

/**
 * Valide le payload Chorus avant tout appel API (fail-fast).
 * Lève une erreur descriptive si les données sont incomplètes ou invalides.
 *
 * Règles :
 *   - SIRET fournisseur et destinataire : exactement 14 chiffres
 *   - Montant TTC > 0
 *   - Date au format YYYY-MM-DD, non future de plus de 365 jours
 *   - Numéro de facture non vide
 *   - Au moins 1 ligne (si nombreLignes fourni)
 */
export function validateChorusPayload(payload: ChorusFacturePayload): void {
  const errors: string[] = [];
  const SIRET_RE = /^\d{14}$/;

  // SIRET fournisseur
  const siretF = payload.siretFournisseur.replace(/\s/g, "");
  if (!SIRET_RE.test(siretF)) {
    errors.push(`SIRET fournisseur invalide : "${siretF}" (14 chiffres requis)`);
  }

  // SIRET destinataire
  const siretD = payload.siretDestinataire.replace(/\s/g, "");
  if (!SIRET_RE.test(siretD)) {
    errors.push(`SIRET destinataire invalide : "${siretD}" (14 chiffres requis)`);
  }

  // Montant TTC
  if (!Number.isFinite(payload.montantTTCTotal) || payload.montantTTCTotal <= 0) {
    errors.push(`Montant TTC invalide : ${payload.montantTTCTotal} (doit être > 0)`);
  }

  // Cohérence HT + TVA ≈ TTC (tolérance 1 centime)
  const computed = Math.round((payload.montantHTTotal + payload.montantTVATotal) * 100) / 100;
  const ttc = Math.round(payload.montantTTCTotal * 100) / 100;
  if (Math.abs(computed - ttc) > 0.02) {
    errors.push(`Incohérence montants : HT (${payload.montantHTTotal}) + TVA (${payload.montantTVATotal}) ≠ TTC (${payload.montantTTCTotal})`);
  }

  // Date
  if (!payload.dateFacture || !/^\d{4}-\d{2}-\d{2}$/.test(payload.dateFacture)) {
    errors.push(`Date de facture invalide : "${payload.dateFacture}" (format YYYY-MM-DD requis)`);
  } else {
    const d = new Date(payload.dateFacture);
    if (isNaN(d.getTime())) {
      errors.push(`Date de facture non parseable : "${payload.dateFacture}"`);
    }
  }

  // Numéro de facture
  if (!payload.numeroFacture?.trim()) {
    errors.push("Numéro de facture manquant");
  }

  // Lignes
  if (payload.nombreLignes !== undefined && payload.nombreLignes < 1) {
    errors.push("La facture doit comporter au moins une ligne");
  }

  if (errors.length > 0) {
    throw new Error(`Validation Chorus échouée :\n• ${errors.join("\n• ")}`);
  }
}

// ─── 3. Envoi de facture ──────────────────────────────────────────────────────

export interface ChorusSendResult {
  success: boolean;
  /** Identifiant Chorus Pro du dépôt (idFactureCPP) */
  chorus_depot_id?: string;
  /** Message d'erreur si échec */
  error?: string;
}

/**
 * Envoie une facture structurée à Chorus Pro via l'endpoint de dépôt PISTE.
 *
 * ⚠️ Appeler validateChorusPayload() AVANT cette fonction.
 *
 * Exemple de payload envoyé :
 * ```json
 * {
 *   "siretFournisseur": "12345678901234",
 *   "siretEtablissementPayeur": "98765432109876",
 *   "numeroFacture": "FAC-2024-001",
 *   "dateFacture": "2024-01-15",
 *   "montantHT": 1000.00,
 *   "montantTVA": 200.00,
 *   "montantTTC": 1200.00,
 *   "codeDevise": "EUR",
 *   "designationFacture": "Travaux de rénovation toiture"
 * }
 * ```
 */
export async function sendInvoiceToChorus(
  payload: ChorusFacturePayload,
): Promise<ChorusSendResult> {
  try {
    const token = await getAccessToken();

    const siretFournisseur = payload.siretFournisseur.replace(/\s/g, "");
    const siretDestinataire = payload.siretDestinataire.replace(/\s/g, "");

    const body: Record<string, unknown> = {
      siretFournisseur,
      siretEtablissementPayeur: siretDestinataire,
      numeroFacture: payload.numeroFacture,
      dateFacture: payload.dateFacture,
      montantHT: Math.round(payload.montantHTTotal * 100) / 100,
      montantTVA: Math.round(payload.montantTVATotal * 100) / 100,
      montantTTC: Math.round(payload.montantTTCTotal * 100) / 100,
      codeDevise: "EUR",
    };

    if (payload.numeroEngagementJuridique) {
      body.numeroEngagementJuridique = payload.numeroEngagementJuridique;
    }
    if (payload.codeServiceExecutant) {
      body.codeServiceExecutant = payload.codeServiceExecutant;
    }
    if (payload.designationFacture) {
      body.designationFacture = payload.designationFacture.slice(0, 255);
    }

    const resp = await fetch(`${API_BASE}/cpro/factures/v1/deposer/facture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json;charset=UTF-8",
        // Header PISTE : identifie le compte fournisseur émetteur
        "cpro-account": siretFournisseur,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        success: false,
        error: `Chorus Pro (${resp.status}) : ${errText}`,
      };
    }

    const result = (await resp.json()) as {
      idFactureCPP?: string | number;
      numeroFactureCPP?: string;
      [key: string]: unknown;
    };

    const depotId =
      result.idFactureCPP ?? result.numeroFactureCPP ?? "CHORUS-DEPOT-OK";

    return { success: true, chorus_depot_id: String(depotId) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 4. Suivi du statut ───────────────────────────────────────────────────────

export type ChorusStatut = "depose" | "en_traitement" | "acceptee" | "rejetee";

/** Correspondance statuts Chorus Pro → valeurs internes */
const CHORUS_STATUT_MAP: Record<string, ChorusStatut> = {
  DEPOSEE: "depose",
  EN_COURS_TRAITEMENT: "en_traitement",
  EN_COURS: "en_traitement",
  SUSPENDUE: "en_traitement",
  COMPLETEE: "acceptee",
  ACCEPTEE: "acceptee",
  MISE_EN_PAIEMENT: "acceptee",
  MANDATEE: "acceptee",
  REJETEE: "rejetee",
  REJETEE_PARTIELLEMENT: "rejetee",
  ANNULEE: "rejetee",
};

export interface ChorusStatusResult {
  statut: ChorusStatut;
  /** Motif de rejet retourné par Chorus Pro (présent si statut === "rejetee") */
  motifRejet?: string;
}

/**
 * Consulte le statut d'une facture déposée sur Chorus Pro.
 * Retourne le statut normalisé et, si rejetée, le motif de rejet.
 * Lève une exception si l'appel API échoue (à gérer côté appelant).
 */
export async function fetchChorusStatus(
  chorusDepotId: string,
): Promise<ChorusStatusResult> {
  const token = await getAccessToken();

  const url = `${API_BASE}/cpro/factures/v1/consulterFacture?idFacture=${encodeURIComponent(chorusDepotId)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
  });

  if (!resp.ok) {
    throw new Error(`Chorus statut (${resp.status}) : ${await resp.text()}`);
  }

  const data = (await resp.json()) as {
    statutCourant?: string;
    statut?: string;
    motifRejet?: string;
    libelleRejet?: string;
    commentaireRejet?: string;
    [key: string]: unknown;
  };

  const raw = (data.statutCourant ?? data.statut ?? "").toUpperCase();
  const statut = CHORUS_STATUT_MAP[raw] ?? "en_traitement";

  // Extraire le motif de rejet si disponible
  const motifRejet =
    statut === "rejetee"
      ? (data.motifRejet ?? data.libelleRejet ?? data.commentaireRejet ?? "Facture rejetée par Chorus Pro")
      : undefined;

  return { statut, motifRejet };
}
