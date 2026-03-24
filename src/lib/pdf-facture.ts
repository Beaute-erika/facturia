import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface FactureData {
  id: string;
  client: string;
  clientAddress?: string;
  clientEmail?: string;
  clientSiret?: string;
  objet: string;
  date: string;
  echeance: string;
  lignes: {
    designation: string;
    quantite: number;
    unite: string;
    prixUnitaire: number;
    tva: number;
  }[];
  modePaiement?: string;
  iban?: string;
  notes?: string;
  chorus?: boolean;
  artisan: {
    nom: string;
    adresse: string;
    siret: string;
    email: string;
    tel: string;
    tvaNum?: string;
    logo_url?: string | null;
  };
}

const GREEN: [number, number, number] = [0, 180, 110];
const DARK: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];
const RED: [number, number, number] = [239, 68, 68];

async function loadImageAsBase64(url: string): Promise<{ data: string; format: string }> {
  console.log("[PDF] loadImageAsBase64 url:", url);
  const res = await fetch(url);
  console.log("[PDF] fetch status:", res.status, "content-type:", res.headers.get("content-type"));
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const blob = await res.blob();
  const mimeType = blob.type || "image/png";
  const rawFormat = mimeType.split("/")[1].toUpperCase(); // PNG, JPEG, WEBP…
  const format = rawFormat === "SVG+XML" ? "SVG" : rawFormat;
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  console.log("[PDF] image format détecté:", format, "| data length:", data.length);
  return { data, format };
}

export async function generateFacturePDF(facture: FactureData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // ── Header band
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 28, "F");

  console.log("[PDF] generateFacturePDF logo_url:", facture.artisan.logo_url);

  // Rectangle rouge de test — vérifie que la zone header est bien visible
  doc.setFillColor(239, 68, 68);
  doc.rect(14, 3, 32, 20, "F");

  if (facture.artisan.logo_url) {
    try {
      const { data, format } = await loadImageAsBase64(facture.artisan.logo_url);
      console.log("[PDF] addImage format:", format);
      doc.addImage(data, format, 14, 3, 32, 20);
      console.log("[PDF] addImage OK");
    } catch (err) {
      console.error("[PDF] addImage erreur:", err);
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

  doc.setFontSize(10);
  doc.text("FACTURE", W - 14, 11, { align: "right" });
  doc.setFontSize(14);
  doc.text(facture.id, W - 14, 22, { align: "right" });

  // ── Artisan block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(facture.artisan.nom, 14, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(facture.artisan.adresse, 14, 44);
  doc.text(`SIRET : ${facture.artisan.siret}`, 14, 49);
  if (facture.artisan.tvaNum) {
    doc.text(`N° TVA : ${facture.artisan.tvaNum}`, 14, 54);
    doc.text(facture.artisan.tel, 14, 59);
    doc.text(facture.artisan.email, 14, 64);
  } else {
    doc.text(facture.artisan.tel, 14, 54);
    doc.text(facture.artisan.email, 14, 59);
  }

  // ── Client block
  doc.setFillColor(...LIGHT);
  doc.roundedRect(W - 82, 32, 68, 40, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("FACTURÉ À", W - 76, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(facture.client, W - 76, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  if (facture.clientAddress) doc.text(facture.clientAddress, W - 76, 52);
  if (facture.clientEmail) doc.text(facture.clientEmail, W - 76, 58);
  if (facture.clientSiret) doc.text(`SIRET : ${facture.clientSiret}`, W - 76, 64);

  // ── Meta bar
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 76, W - 28, 14, "F");
  const metas = [
    { label: "Objet", value: facture.objet },
    { label: "Date de facture", value: facture.date },
    { label: "Date d'échéance", value: facture.echeance },
  ];
  metas.forEach((m, i) => {
    const x = 18 + i * 62;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(m.label.toUpperCase(), x, 82);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(m.value, x, 88);
  });

  // ── Line items
  const rows = facture.lignes.map((l) => {
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
    startY: 96,
    head: [["Désignation", "Qté", "P.U. HT", "TVA", "Montant HT", "Montant TTC"]],
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
  const totalHT = facture.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const totalTVA = facture.lignes.reduce(
    (s, l) => s + l.quantite * l.prixUnitaire * (l.tva / 100),
    0
  );
  const totalTTC = totalHT + totalTVA;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const txW = 80;
  const txX = W - 14 - txW;

  const totals = [
    { label: "Total HT", value: `${totalHT.toLocaleString("fr-FR")} €`, bold: false, accent: false },
    { label: `TVA (détail ci-dessus)`, value: `${totalTVA.toLocaleString("fr-FR")} €`, bold: false, accent: false },
    { label: "NET À PAYER TTC", value: `${totalTTC.toLocaleString("fr-FR")} €`, bold: true, accent: true },
  ];

  totals.forEach((t, i) => {
    const y = finalY + i * 9;
    if (t.accent) {
      doc.setFillColor(...GREEN);
      doc.roundedRect(txX - 4, y - 6, txW + 4, 10, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
    } else {
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    doc.text(t.label, txX, y);
    doc.text(t.value, W - 16, y, { align: "right" });
  });

  // ── Payment info
  const payY = finalY + totals.length * 9 + 12;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, payY - 4, (W - 28) * 0.55, 26, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("MODALITÉS DE PAIEMENT", 18, payY + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(
    `Mode : ${facture.modePaiement || "Virement bancaire"}`,
    18,
    payY + 10
  );
  if (facture.iban) {
    doc.text(`IBAN : ${facture.iban}`, 18, payY + 17);
  }

  // Late payment notice
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  const noticeY = payY + (facture.iban ? 24 : 18);
  doc.text(
    "En cas de retard, indemnité forfaitaire de recouvrement : 40 €. Taux pénalités : 3× taux légal.",
    14,
    noticeY,
    { maxWidth: W - 28 }
  );

  // ── Notes
  if (facture.notes) {
    const notesY = noticeY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("NOTES", 14, notesY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(facture.notes, 14, notesY + 5, { maxWidth: W - 28 });
  }

  // ── Chorus Pro stamp
  if (facture.chorus) {
    doc.setFillColor(0, 120, 75);
    doc.roundedRect(W - 50, payY - 4, 36, 14, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("CHORUS PRO", W - 32, payY + 2, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Facture électronique", W - 32, payY + 7, { align: "center" });
  }

  // ── Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...LIGHT);
  doc.rect(0, pageH - 16, W, 16, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    `${facture.artisan.nom} • SIRET ${facture.artisan.siret} • Document généré par Facturia`,
    W / 2,
    pageH - 8,
    { align: "center" }
  );

  // Watermark if overdue
  if (facture.chorus === false && facture.notes?.includes("RETARD")) {
    doc.setFontSize(60);
    doc.setTextColor(...RED);
    doc.saveGraphicsState();
    doc.text("EN RETARD", W / 2, 160, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  doc.save(`${facture.id}.pdf`);
}

const ARTISAN_FALLBACK: FactureData["artisan"] = {
  nom: "Mon entreprise",
  adresse: "",
  siret: "",
  email: "",
  tel: "",
};

export function buildFactureDataFromRow(
  row: {
    id: string;
    client: string;
    objet: string;
    montant: string;
    tva: string;
    total: string;
    date: string;
    echeance: string;
    chorus: boolean;
  },
  artisan?: Partial<FactureData["artisan"]>
): FactureData {
  const ht = parseFloat(row.montant.replace(/[^0-9]/g, "")) || 0;
  const tvaRate = ht > 0
    ? Math.round((parseFloat(row.tva.replace(/[^0-9]/g, "")) / ht) * 100)
    : 10;

  return {
    id: row.id,
    client: row.client,
    objet: row.objet,
    date: row.date,
    echeance: row.echeance,
    chorus: row.chorus,
    lignes: [
      {
        designation: row.objet,
        quantite: 1,
        unite: "forfait",
        prixUnitaire: ht,
        tva: tvaRate,
      },
    ],
    modePaiement: "Virement bancaire",
    notes: "Merci pour votre confiance. Paiement sous 30 jours.",
    artisan: { ...ARTISAN_FALLBACK, ...artisan },
  };
}
