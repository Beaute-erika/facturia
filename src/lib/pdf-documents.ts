/**
 * Client-side PDF generation for Avoirs, Pro Forma, Bons de Commande, Bons de Livraison.
 * Uses jspdf + jspdf-autotable.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LigneDevis, BonLivraisonLigne } from "./database.types";

export interface DocumentArtisan {
  nom:          string;
  adresse?:     string;
  siret?:       string;
  email?:       string;
  tel?:         string;
}

export interface GenericDocumentData {
  type:          "Avoir" | "Pro Forma" | "Bon de commande" | "Bon de livraison";
  numero:        string;
  client_nom:    string;
  client_email?: string | null;
  objet:         string;
  date:          string;
  notes?:        string | null;
  lignes:        LigneDevis[] | BonLivraisonLigne[];
  montant_ht?:   number;
  montant_tva?:  number;
  montant_ttc?:  number;
  artisan:       DocumentArtisan;
}

function fmtEur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function generateDocumentPDF(doc: GenericDocumentData): void {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const MARGIN = 15;

  // ── Header ──────────────────────────────────────────────────────────────────
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 80, 0);
  pdf.text(doc.type.toUpperCase(), MARGIN, 20);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(60, 60, 60);
  pdf.text(`N° ${doc.numero}`, MARGIN, 28);
  pdf.text(`Date : ${doc.date}`, MARGIN, 34);

  // Artisan (right)
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(doc.artisan.nom, PAGE_W - MARGIN, 20, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  if (doc.artisan.adresse) pdf.text(doc.artisan.adresse, PAGE_W - MARGIN, 26, { align: "right" });
  if (doc.artisan.siret) pdf.text(`SIRET : ${doc.artisan.siret}`, PAGE_W - MARGIN, 32, { align: "right" });
  if (doc.artisan.email) pdf.text(doc.artisan.email, PAGE_W - MARGIN, 38, { align: "right" });
  if (doc.artisan.tel) pdf.text(doc.artisan.tel, PAGE_W - MARGIN, 44, { align: "right" });

  // Separator
  pdf.setDrawColor(0, 160, 100);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, 48, PAGE_W - MARGIN, 48);

  // Client block
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Destinataire", MARGIN, 55);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(doc.client_nom, MARGIN, 62);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  if (doc.client_email) pdf.text(doc.client_email, MARGIN, 68);

  // Objet
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`Objet : ${doc.objet}`, MARGIN, 78);

  // ── Table ───────────────────────────────────────────────────────────────────
  const hasPrices = doc.montant_ht !== undefined;
  const isLivraison = doc.type === "Bon de livraison";

  const head = isLivraison
    ? [["Référence", "Description", "Qté", "Unité"]]
    : [["Description", "Qté", "Unité", "P.U. HT", "TVA", "Total HT"]];

  const body = (doc.lignes as (LigneDevis | BonLivraisonLigne)[]).map((l) => {
    if (isLivraison) {
      const bl = l as BonLivraisonLigne;
      return [bl.reference || "—", bl.description, String(bl.quantite), bl.unite];
    }
    const dl = l as LigneDevis;
    return [
      dl.description,
      String(dl.quantite),
      dl.unite,
      fmtEur(dl.prix_unitaire),
      `${dl.tva} %`,
      fmtEur(dl.total_ht),
    ];
  });

  autoTable(pdf, {
    startY: 84,
    head,
    body,
    headStyles: { fillColor: [0, 160, 100], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [245, 250, 247] },
    margin: { left: MARGIN, right: MARGIN },
    styles: { cellPadding: 3 },
  });

  const finalY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── Totals (only for documents with prices) ──────────────────────────────
  if (hasPrices) {
    const ht  = doc.montant_ht  ?? 0;
    const tva = doc.montant_tva ?? 0;
    const ttc = doc.montant_ttc ?? 0;
    const totalsX = PAGE_W - MARGIN - 70;

    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    pdf.text("Montant HT", totalsX, finalY);
    pdf.text(fmtEur(ht), PAGE_W - MARGIN, finalY, { align: "right" });

    pdf.text("TVA", totalsX, finalY + 6);
    pdf.text(fmtEur(tva), PAGE_W - MARGIN, finalY + 6, { align: "right" });

    pdf.setDrawColor(0, 160, 100);
    pdf.line(totalsX, finalY + 9, PAGE_W - MARGIN, finalY + 9);

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 100, 60);
    pdf.text("Total TTC", totalsX, finalY + 15);
    pdf.text(fmtEur(ttc), PAGE_W - MARGIN, finalY + 15, { align: "right" });
  }

  // Notes
  if (doc.notes) {
    const notesY = hasPrices ? finalY + 28 : finalY + 6;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Notes : ${doc.notes}`, MARGIN, notesY);
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(150, 150, 150);
  pdf.text(doc.artisan.nom, PAGE_W / 2, 285, { align: "center" });

  pdf.save(`${doc.type.replace(/ /g, "-")}-${doc.numero}.pdf`);
}
