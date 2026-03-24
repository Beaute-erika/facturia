import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface DevisData {
  id: string;
  client: string;
  clientAddress?: string;
  clientEmail?: string;
  objet: string;
  date: string;
  validite: string;
  lignes: {
    designation: string;
    quantite: number;
    unite: string;
    prixUnitaire: number;
    tva: number;
  }[];
  notes?: string;
  artisan: {
    nom: string;
    adresse: string;
    siret: string;
    email: string;
    tel: string;
    logo_url?: string | null;
  };
}

async function loadImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateDevisPDF(devis: DevisData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // ── Dark-to-print palette (print-friendly, use grays)
  const GREEN: [number, number, number] = [0, 180, 110];
  const DARK: [number, number, number] = [15, 23, 42];
  const GRAY: [number, number, number] = [100, 116, 139];
  const LIGHT: [number, number, number] = [241, 245, 249];

  // ── Header band
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 28, "F");

  if (devis.artisan.logo_url) {
    try {
      const base64 = await loadImageAsBase64(devis.artisan.logo_url);
      doc.addImage(base64, 14, 3, 32, 20);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("Facturia", 14, 17);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Facturia", 14, 17);
  }

  // DEVIS label
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("DEVIS", W - 14, 12, { align: "right" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(devis.id, W - 14, 22, { align: "right" });

  // ── Artisan info (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(devis.artisan.nom, 14, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(devis.artisan.adresse, 14, 44);
  doc.text(`SIRET : ${devis.artisan.siret}`, 14, 49);
  doc.text(devis.artisan.tel, 14, 54);
  doc.text(devis.artisan.email, 14, 59);

  // ── Client info box (right)
  doc.setFillColor(...LIGHT);
  doc.roundedRect(W - 80, 32, 66, 34, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("CLIENT", W - 74, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(devis.client, W - 74, 46);
  if (devis.clientAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(devis.clientAddress, W - 74, 52);
  }
  if (devis.clientEmail) {
    doc.text(devis.clientEmail, W - 74, 58);
  }

  // ── Meta info bar
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 70, W - 28, 14, "F");
  const metas = [
    { label: "Objet", value: devis.objet },
    { label: "Date", value: devis.date },
    { label: "Valide jusqu'au", value: devis.validite },
  ];
  metas.forEach((m, i) => {
    const x = 18 + i * 62;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(m.label.toUpperCase(), x, 76);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(m.value, x, 82);
  });

  // ── Items table
  const rows = devis.lignes.map((l) => {
    const ht = l.quantite * l.prixUnitaire;
    const tvaAmt = ht * (l.tva / 100);
    return [
      l.designation,
      `${l.quantite} ${l.unite}`,
      `${l.prixUnitaire.toLocaleString("fr-FR")} €`,
      `${l.tva}%`,
      `${ht.toLocaleString("fr-FR")} €`,
      `${(ht + tvaAmt).toLocaleString("fr-FR")} €`,
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [["Désignation", "Qté", "P.U. HT", "TVA", "Total HT", "Total TTC"]],
    body: rows,
    theme: "plain",
    headStyles: {
      fillColor: GREEN,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "center", cellWidth: 16 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 28, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Totals
  const totalHT = devis.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const totalTVA = devis.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (l.tva / 100), 0);
  const totalTTC = totalHT + totalTVA;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const txW = 80;
  const txX = W - 14 - txW;

  const totals = [
    { label: "Total HT", value: `${totalHT.toLocaleString("fr-FR")} €`, bold: false },
    { label: "TVA", value: `${totalTVA.toLocaleString("fr-FR")} €`, bold: false },
    { label: "Total TTC", value: `${totalTTC.toLocaleString("fr-FR")} €`, bold: true },
  ];

  totals.forEach((t, i) => {
    const y = finalY + i * 8;
    if (t.bold) {
      doc.setFillColor(...GREEN);
      doc.roundedRect(txX - 2, y - 5, txW + 2, 9, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...GRAY);
    }
    doc.setFont("helvetica", t.bold ? "bold" : "normal");
    doc.setFontSize(t.bold ? 10 : 9);
    doc.text(t.label, txX + 2, y);
    doc.text(t.value, W - 16, y, { align: "right" });
  });

  // ── Notes
  if (devis.notes) {
    const notesY = finalY + totals.length * 8 + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("CONDITIONS & NOTES", 14, notesY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(devis.notes, 14, notesY + 5, { maxWidth: W - 28 });
  }

  // ── Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...LIGHT);
  doc.rect(0, pageH - 16, W, 16, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    `Document généré par Facturia • ${devis.artisan.nom} • SIRET ${devis.artisan.siret}`,
    W / 2,
    pageH - 8,
    { align: "center" }
  );

  doc.save(`${devis.id}.pdf`);
}

// Build a DevisData from a table row (for quick download)
const ARTISAN_FALLBACK: DevisData["artisan"] = {
  nom: "Mon entreprise",
  adresse: "",
  siret: "",
  email: "",
  tel: "",
};

export function buildDevisDataFromRow(
  row: {
    id: string;
    client: string;
    objet: string;
    montant: string;
    date: string;
    validite: string;
  },
  artisan?: Partial<DevisData["artisan"]>
): DevisData {
  const montantHT = parseFloat(row.montant.replace(/[^0-9,]/g, "").replace(",", ".")) || 0;
  return {
    id: row.id,
    client: row.client,
    objet: row.objet,
    date: row.date,
    validite: row.validite,
    lignes: [
      {
        designation: row.objet,
        quantite: 1,
        unite: "forfait",
        prixUnitaire: montantHT,
        tva: 10,
      },
    ],
    notes:
      "Devis valable 30 jours. Acompte de 30% à la commande. Paiement sous 30 jours à réception de facture.",
    artisan: { ...ARTISAN_FALLBACK, ...artisan },
  };
}
