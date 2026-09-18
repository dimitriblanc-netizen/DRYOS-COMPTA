import * as XLSX from 'xlsx';
import { Company, Transaction, Shareholder, ShareholdingStake, formatEuro, getCategoryLabel } from '../types';

export interface ExcelExportOptions {
  companies: Company[];
  transactions: Transaction[];
  shareholders: Shareholder[];
  stakes: ShareholdingStake[];
  selectedCompanyId?: string | null;
}

/**
 * Calcule automatiquement la largeur idéale des colonnes pour un rendu propre sans coupure
 */
function autoFitColumns(data: (string | number | undefined | null)[][]): { wch: number }[] {
  const colWidths: number[] = [];

  data.forEach((row) => {
    row.forEach((cell, colIndex) => {
      const length = cell ? String(cell).length : 0;
      colWidths[colIndex] = Math.max(colWidths[colIndex] || 10, length + 3);
    });
  });

  return colWidths.map((wch) => ({ wch: Math.min(Math.max(wch, 12), 45) }));
}

/**
 * Exporte un classeur Excel complet multi-feuilles pour le Groupe DRYOS
 */
export function exportConsolidatedExcel({
  companies,
  transactions,
  shareholders,
  stakes,
  selectedCompanyId,
}: ExcelExportOptions): void {
  const wb = XLSX.utils.book_new();
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Filtrer si une société spécifique est sélectionnée
  const targetCompanies = selectedCompanyId 
    ? companies.filter((c) => c.id === selectedCompanyId)
    : companies;

  const targetTransactions = selectedCompanyId
    ? transactions.filter((t) => t.companyId === selectedCompanyId)
    : transactions;

  const targetCompanyName = selectedCompanyId
    ? companies.find((c) => c.id === selectedCompanyId)?.name || 'Société'
    : 'Consolidation Groupe DRYOS';

  // -------------------------------------------------------------
  // FEUILLE 1 : SYNTHÈSE DU GROUPE DRYOS
  // -------------------------------------------------------------
  const summaryRows: (string | number)[][] = [
    ['GROUPE DRYOS - COMPTA DRYOS'],
    [`Rapport Financier & Comptable - ${targetCompanyName}`],
    [`Généré le : ${currentDate}`, '', 'Devise : EUR (€)'],
    [],
    [
      'Société',
      'Forme',
      'SIREN',
      'Régime TVA',
      'Régime Fiscal',
      'Capital Social (€)',
      'Trésorerie Actuelle (€)',
      'Chiffre d\'Affaires HT (€)',
      'Charges d\'Exploitation HT (€)',
      'Résultat d\'Exploitation HT (€)',
      'TVA Collectée (€)',
      'TVA Déductible (€)',
      'Solde TVA Net (€)',
      'Nb Écritures',
    ],
  ];

  let totalCapital = 0;
  let totalCash = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalVatCollected = 0;
  let totalVatDeductible = 0;

  targetCompanies.forEach((comp) => {
    const compTxs = transactions.filter((t) => t.companyId === comp.id);
    const incomeHT = compTxs
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amountHT || 0), 0);
    const expenseHT = compTxs
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amountHT || 0), 0);
    const vatColl = compTxs
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amountTVA || 0), 0);
    const vatDed = compTxs
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amountTVA || 0), 0);

    const netCashflow = compTxs.reduce((sum, t) => {
      return t.type === 'INCOME' ? sum + t.amountTTC : sum - t.amountTTC;
    }, 0);
    const currentCash = (comp.initialCash || 0) + netCashflow;
    const netResult = incomeHT - expenseHT;
    const netVat = vatColl - vatDed;

    totalCapital += comp.shareCapital || 0;
    totalCash += currentCash;
    totalRevenue += incomeHT;
    totalExpenses += expenseHT;
    totalVatCollected += vatColl;
    totalVatDeductible += vatDed;

    summaryRows.push([
      comp.name,
      comp.legalForm,
      comp.siren || 'Non renseigné',
      comp.vatRegime,
      comp.taxRegime,
      comp.shareCapital || 0,
      Number(currentCash.toFixed(2)),
      Number(incomeHT.toFixed(2)),
      Number(expenseHT.toFixed(2)),
      Number(netResult.toFixed(2)),
      Number(vatColl.toFixed(2)),
      Number(vatDed.toFixed(2)),
      Number(netVat.toFixed(2)),
      compTxs.length,
    ]);
  });

  // Ligne de TOTAL
  summaryRows.push([]);
  summaryRows.push([
    'TOTAL GROUPE CONSOLIDÉ',
    '',
    '',
    '',
    '',
    Number(totalCapital.toFixed(2)),
    Number(totalCash.toFixed(2)),
    Number(totalRevenue.toFixed(2)),
    Number(totalExpenses.toFixed(2)),
    Number((totalRevenue - totalExpenses).toFixed(2)),
    Number(totalVatCollected.toFixed(2)),
    Number(totalVatDeductible.toFixed(2)),
    Number((totalVatCollected - totalVatDeductible).toFixed(2)),
    targetTransactions.length,
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = autoFitColumns(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse Groupe');

  // -------------------------------------------------------------
  // FEUILLE 2 : GRAND LIVRE & ÉCRITURES (JOURNAL)
  // -------------------------------------------------------------
  const ledgerRows: (string | number)[][] = [
    ['GROUPE DRYOS - GRAND LIVRE DES ÉCRITURES COMPTABLES'],
    [`Périmètre : ${targetCompanyName} | Extrait au : ${currentDate}`],
    [],
    [
      'ID Écriture',
      'Date Facture',
      'Date Échéance',
      'Société DRYOS',
      'Flux',
      'N° Pièce / Facture',
      'Tiers / Partenaire',
      'Catégorie',
      'Description & Libellé',
      'Montant HT (€)',
      'Taux TVA (%)',
      'Montant TVA (€)',
      'Montant TTC (€)',
      'Moyen Paiement',
      'Statut Règlement',
      'Intra-Groupe / CCA',
      'Fichier Drive',
      'Lien Drive',
    ],
  ];

  let sumHT = 0;
  let sumTVA = 0;
  let sumTTC = 0;

  // Trier par date décroissante
  const sortedTxs = [...targetTransactions].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );

  sortedTxs.forEach((t) => {
    const comp = companies.find((c) => c.id === t.companyId);
    sumHT += t.amountHT || 0;
    sumTVA += t.amountTVA || 0;
    sumTTC += t.amountTTC || 0;

    ledgerRows.push([
      t.id,
      t.issueDate,
      t.dueDate || t.issueDate,
      comp?.name || t.companyId,
      t.type === 'INCOME' ? 'Recette / Vente' : 'Dépense / Achat',
      t.invoiceNumber || 'S/N',
      t.partnerName,
      getCategoryLabel(t.category, t.type),
      t.description,
      Number((t.amountHT || 0).toFixed(2)),
      t.tvaRate ?? 20,
      Number((t.amountTVA || 0).toFixed(2)),
      Number((t.amountTTC || 0).toFixed(2)),
      t.paymentMethod,
      t.status === 'PAID' ? 'RÉGLÉ' : t.status === 'OVERDUE' ? 'EN RETARD' : 'EN ATTENTE',
      t.isInterCompany ? 'OUI (Intra-Groupe)' : t.ccaPartnerName ? `CCA (${t.ccaPartnerName})` : 'NON',
      t.driveFile?.name || 'Aucun fichier lié',
      t.driveFile?.webViewLink || '',
    ]);
  });

  ledgerRows.push([]);
  ledgerRows.push([
    'TOTAL ÉCRITURES',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Number(sumHT.toFixed(2)),
    '',
    Number(sumTVA.toFixed(2)),
    Number(sumTTC.toFixed(2)),
    '',
    '',
    '',
    '',
    '',
  ]);

  const wsLedger = XLSX.utils.aoa_to_sheet(ledgerRows);
  wsLedger['!cols'] = autoFitColumns(ledgerRows);
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Grand Livre Écritures');

  // -------------------------------------------------------------
  // FEUILLE 3 : ACTIONNARIAT & ORGANIGRAMME DU GROUPE
  // -------------------------------------------------------------
  const capRows: (string | number)[][] = [
    ['GROUPE DRYOS - STRUCTURE DU CAPITAL & ORGANIGRAMME CAPITALISTIQUE'],
    [`Extrait officiel d'actionnariat | Date : ${currentDate}`],
    [],
    ['1. RECAPITULATIF DES SOCIETES DU GROUPE'],
    ['Société', 'Forme', 'SIREN', 'Capital Social (€)', 'Nb Actions / Parts', 'Valeur Nominale (€)', 'Gouvernance / Direction', 'Rôle au sein du groupe'],
  ];

  targetCompanies.forEach((comp) => {
    capRows.push([
      comp.name,
      comp.legalForm,
      comp.siren || 'Non renseigné',
      comp.shareCapital || 0,
      comp.totalShares || 0,
      comp.shareNominalValue || 10,
      comp.presidentOrManager || 'Présidence',
      comp.descriptionRole || 'Société du groupe',
    ]);
  });

  capRows.push([]);
  capRows.push(['2. TABLEAU DE DETENTION DES PARTS ET DROITS DE VOTE']);
  capRows.push([
    'Société Cible',
    'Actionnaire / Associé',
    'Type Associé',
    'Rôle / Mandat',
    'Nb Actions / Parts Détenues',
    '% Détention Capital',
    '% Droits de Vote',
    'Valeur Nominale Détenue (€)',
    'Email Contact',
  ]);

  stakes.forEach((stake) => {
    const comp = companies.find((c) => c.id === stake.companyId);
    const sh = shareholders.find((s) => s.id === stake.shareholderId);
    if (selectedCompanyId && stake.companyId !== selectedCompanyId) return;

    capRows.push([
      comp?.name || stake.companyId,
      sh?.name || stake.shareholderId,
      sh?.type === 'CORPORATE' ? 'Personne Morale (Société)' : 'Personne Physique',
      sh?.role || 'Associé',
      stake.sharesCount,
      `${stake.ownershipPercentage.toFixed(2)} %`,
      `${(stake.votingRightsPercentage ?? stake.ownershipPercentage).toFixed(2)} %`,
      Number((stake.nominalAmount || (stake.sharesCount * (comp?.shareNominalValue || 10))).toFixed(2)),
      sh?.email || '',
    ]);
  });

  const wsCap = XLSX.utils.aoa_to_sheet(capRows);
  wsCap['!cols'] = autoFitColumns(capRows);
  XLSX.utils.book_append_sheet(wb, wsCap, 'Actionnariat & Capital');

  // -------------------------------------------------------------
  // FEUILLE 4 : COMPTES COURANTS D'ASSOCIÉS (CCA)
  // -------------------------------------------------------------
  const ccaRows: (string | number)[][] = [
    ['GROUPE DRYOS - SUIVI DES COMPTES COURANTS D\'ASSOCIÉS (CCA)'],
    [`Extrait au : ${currentDate}`],
    [],
    [
      'Date',
      'Société Débitrice/Créditrice',
      'Nom Associé',
      'Sens de l\'Opération',
      'N° Pièce',
      'Montant Apport (+ €)',
      'Montant Remboursement (- €)',
      'Libellé / Motif',
      'Statut',
    ],
  ];

  const ccaTxs = targetTransactions.filter(
    (t) => t.ccaPartnerName || t.category === 'CCA_CONTRIBUTION' || t.category === 'CCA_REIMBURSEMENT' || t.operationType === 'CURRENT_ACCOUNT'
  );

  let totalApports = 0;
  let totalRemboursements = 0;

  ccaTxs.forEach((t) => {
    const comp = companies.find((c) => c.id === t.companyId);
    const isApport = t.type === 'INCOME' || t.category === 'CCA_CONTRIBUTION' || t.ccaDirection === 'DEPOSIT';
    const apportAmt = isApport ? t.amountTTC : 0;
    const rembAmt = !isApport ? t.amountTTC : 0;

    totalApports += apportAmt;
    totalRemboursements += rembAmt;

    ccaRows.push([
      t.issueDate,
      comp?.name || t.companyId,
      t.ccaPartnerName || 'Dimitri Blanc',
      isApport ? 'Apport Trésorerie (+)' : 'Remboursement (-)',
      t.invoiceNumber || 'CCA',
      Number(apportAmt.toFixed(2)),
      Number(rembAmt.toFixed(2)),
      t.description,
      t.status === 'PAID' ? 'EXÉCUTÉ' : 'EN COURS',
    ]);
  });

  ccaRows.push([]);
  ccaRows.push([
    'TOTAL CCA',
    '',
    '',
    '',
    '',
    Number(totalApports.toFixed(2)),
    Number(totalRemboursements.toFixed(2)),
    `Solde Net Dû aux Associés : ${formatEuro(totalApports - totalRemboursements)}`,
    '',
  ]);

  const wsCca = XLSX.utils.aoa_to_sheet(ccaRows);
  wsCca['!cols'] = autoFitColumns(ccaRows);
  XLSX.utils.book_append_sheet(wb, wsCca, 'Comptes Associés (CCA)');

  // -------------------------------------------------------------
  // FEUILLE 5 : DÉCLARATION TVA (CA3 & DÉTAIL DES TAUX)
  // -------------------------------------------------------------
  const vatRows: (string | number)[][] = [
    ['GROUPE DRYOS - SYNTHÈSE FISCALE DE LA TVA (DÉCLARATION CA3 / CA12)'],
    [`Extrait au : ${currentDate}`],
    [],
    [
      'Société',
      'Régime TVA',
      'Base HT 20% (€)',
      'TVA 20% (€)',
      'Base HT 10% (€)',
      'TVA 10% (€)',
      'Base HT 5.5% (€)',
      'TVA 5.5% (€)',
      'Total TVA Collectée (€)',
      'Total TVA Déductible (€)',
      'Solde Net de TVA (€)',
      'Situation Fiscale',
    ],
  ];

  targetCompanies.forEach((comp) => {
    const compTxs = transactions.filter((t) => t.companyId === comp.id);
    const tva20HT = compTxs.filter((t) => t.type === 'INCOME' && t.tvaRate === 20).reduce((s, t) => s + t.amountHT, 0);
    const tva20Val = compTxs.filter((t) => t.type === 'INCOME' && t.tvaRate === 20).reduce((s, t) => s + t.amountTVA, 0);
    const tva10HT = compTxs.filter((t) => t.type === 'INCOME' && t.tvaRate === 10).reduce((s, t) => s + t.amountHT, 0);
    const tva10Val = compTxs.filter((t) => t.type === 'INCOME' && t.tvaRate === 10).reduce((s, t) => s + t.amountTVA, 0);
    const tva55HT = compTxs.filter((t) => t.type === 'INCOME' && t.tvaRate === 5.5).reduce((s, t) => s + t.amountHT, 0);
    const tva55Val = compTxs.filter((t) => t.type === 'INCOME' && t.tvaRate === 5.5).reduce((s, t) => s + t.amountTVA, 0);

    const coll = compTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amountTVA, 0);
    const ded = compTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountTVA, 0);
    const net = coll - ded;

    vatRows.push([
      comp.name,
      comp.vatRegime,
      Number(tva20HT.toFixed(2)),
      Number(tva20Val.toFixed(2)),
      Number(tva10HT.toFixed(2)),
      Number(tva10Val.toFixed(2)),
      Number(tva55HT.toFixed(2)),
      Number(tva55Val.toFixed(2)),
      Number(coll.toFixed(2)),
      Number(ded.toFixed(2)),
      Number(net.toFixed(2)),
      net > 0 ? `TVA à décaisser (${formatEuro(net)})` : net < 0 ? `Crédit de TVA (${formatEuro(Math.abs(net))})` : 'Solde nul (0 €)',
    ]);
  });

  const wsVat = XLSX.utils.aoa_to_sheet(vatRows);
  wsVat['!cols'] = autoFitColumns(vatRows);
  XLSX.utils.book_append_sheet(wb, wsVat, 'Déclarations TVA');

  // Nom du fichier soigné
  const cleanScope = selectedCompanyId 
    ? companies.find((c) => c.id === selectedCompanyId)?.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Societe'
    : 'Consolidation_Groupe';
  const fileDate = new Date().toISOString().split('T')[0];
  const fileName = `Compta_DRYOS_${cleanScope}_${fileDate}.xlsx`;

  // Déclencher le téléchargement direct
  XLSX.writeFile(wb, fileName);
}
