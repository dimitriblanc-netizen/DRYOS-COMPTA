import { Company, Transaction, getCategoryLabel } from '../types';

/**
 * Returns PCG (Plan Comptable Général) account codes based on transaction categories
 */
export function getPcgAccounts(category: string, type: 'EXPENSE' | 'INCOME'): { code: string; label: string } {
  if (type === 'INCOME') {
    switch (category) {
      case 'CLIENT_INVOICE':
        return { code: '706000', label: 'Prestations de services' };
      case 'RENTAL_INCOME':
        return { code: '708300', label: 'Locations diverses (SCI)' };
      case 'PRODUCT_SALES':
        return { code: '707000', label: 'Ventes de marchandises' };
      case 'MANAGEMENT_FEES':
        return { code: '708800', label: 'Management fees intra-groupe' };
      case 'CCA_CONTRIBUTION':
        return { code: '455100', label: 'Apport Compte Courant Associé' };
      default:
        return { code: '706000', label: 'Produits d\'exploitation' };
    }
  }

  switch (category) {
    case 'SAAS_HOSTING':
      return { code: '651100', label: 'Redevances logiciels SaaS & Cloud' };
    case 'SERVICES_SUBCONTRACTING':
      return { code: '622600', label: 'Honoraires et sous-traitance' };
    case 'EQUIPMENT_HARDWARE':
      return { code: '606300', label: 'Fournitures d\'entretien & petit equipement' };
    case 'LEGAL_ACCOUNTING':
      return { code: '622600', label: 'Honoraires comptables et juridiques' };
    case 'RENT_OFFICE':
      return { code: '613200', label: 'Locations immobilieres et bureaux' };
    case 'MARKETING_COM':
      return { code: '623100', label: 'Publicite et marketing' };
    case 'TRAVEL_MEALS':
      return { code: '625100', label: 'Voyages et deplacements' };
    case 'SALARIES_CHARGES':
    case 'EMPLOYEE_SALARY':
      return { code: '641100', label: 'Salaires et appointements' };
    case 'EXECUTIVE_SALARY':
      return { code: '641400', label: 'Remuneration du dirigeant' };
    case 'SOCIAL_URSSAF':
      return { code: '645100', label: 'Cotisations a l\'URSSAF et prevoyance' };
    case 'TAX_CORPORATE_IS':
      return { code: '695100', label: 'Impot sur les societes' };
    case 'TAX_CFE_PROPERTY':
      return { code: '635100', label: 'Impots directs locaux CFE et taxes' };
    case 'TAX_VAT_PAYMENT':
      return { code: '445510', label: 'TVA a decaisser reglee' };
    case 'CCA_REIMBURSEMENT':
      return { code: '455100', label: 'Remboursement compte courant associe' };
    case 'LOAN_REPAYMENT':
      return { code: '164000', label: 'Emprunts aupres des etablissements de credit' };
    case 'BANK_FEES':
      return { code: '627000', label: 'Services bancaires et frais' };
    case 'BANK_TAXES':
      return { code: '627800', label: 'Autres frais financiers et assurances' };
    default:
      return { code: '606400', label: 'Autres charges d\'exploitation' };
  }
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  companies: Company[],
  selectedCompanyId: string | null
): void {
  const companyMap: Record<string, Company> = {};
  companies.forEach((c) => {
    companyMap[c.id] = c;
  });

  const headers = [
    'Date_Emission',
    'Date_Echeance',
    'Societe',
    'SIREN',
    'Type',
    'Code_Journal',
    'Compte_PCG',
    'Numero_Facture',
    'Tiers_Fournisseur_Client',
    'Categorie_Comptable',
    'Description',
    'Montant_HT_EUR',
    'Taux_TVA_Pourcent',
    'Montant_TVA_EUR',
    'Montant_TTC_EUR',
    'Mode_Reglement',
    'Statut_Paiement',
    'Intra_Groupe',
    'Lien_Justificatif_Google_Drive',
  ];

  const rows = transactions.map((tx) => {
    const comp = companyMap[tx.companyId];
    const isExpense = tx.type === 'EXPENSE';
    const journalCode = isExpense ? 'ACH' : 'VTE';
    const pcg = getPcgAccounts(tx.category, tx.type);

    return [
      tx.issueDate,
      tx.dueDate,
      `"${(comp?.name || '').replace(/"/g, '""')}"`,
      `"${comp?.siren || ''}"`,
      isExpense ? 'DEPENSE' : 'RECETTE',
      journalCode,
      pcg.code,
      `"${tx.invoiceNumber.replace(/"/g, '""')}"`,
      `"${(tx.partnerName || '').replace(/"/g, '""')}"`,
      `"${getCategoryLabel(tx.category, tx.type).replace(/"/g, '""')}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.amountHT.toFixed(2),
      tx.tvaRate.toString(),
      tx.amountTVA.toFixed(2),
      tx.amountTTC.toFixed(2),
      tx.paymentMethod,
      tx.status === 'PAID' ? 'PAYEE' : tx.status === 'OVERDUE' ? 'EN_RETARD' : 'EN_ATTENTE',
      tx.isInterCompany ? 'OUI' : 'NON',
      tx.driveFile?.webViewLink ? `"${tx.driveFile.webViewLink}"` : '""',
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const selectedName = selectedCompanyId
    ? companyMap[selectedCompanyId]?.name.replace(/[^a-zA-Z0-9]/g, '_')
    : 'Consolide_Groupe';
  const fileName = `Export_Comptable_${selectedName}_${new Date().toISOString().split('T')[0]}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export official French FEC (Fichier des Écritures Comptables)
 * Conformément à l'article A.47 A-1 du Livre des Procédures Fiscales (18 champs obligatoires, tabulation \t)
 */
export function exportTransactionsToFEC(
  transactions: Transaction[],
  companies: Company[],
  selectedCompanyId: string | null
): void {
  const companyMap: Record<string, Company> = {};
  companies.forEach((c) => {
    companyMap[c.id] = c;
  });

  const targetCompanies = selectedCompanyId
    ? [companyMap[selectedCompanyId]].filter(Boolean)
    : companies;

  // FEC 18 standard columns:
  const headers = [
    'JournalCode',
    'JournalLib',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLib',
    'CompAuxNum',
    'CompAuxLib',
    'PieceRef',
    'PieceDate',
    'EcritureLib',
    'Debit',
    'Credit',
    'EcritureLet',
    'DateLet',
    'ValidDate',
    'Montantdevise',
    'Idevise',
  ];

  const formatFecDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '');
  };

  const formatAmount = (num: number) => {
    return (num || 0).toFixed(2).replace('.', ',');
  };

  const fecRows: string[] = [];
  let ecritureCounter = 1;

  transactions.forEach((tx) => {
    const comp = companyMap[tx.companyId];
    if (selectedCompanyId && tx.companyId !== selectedCompanyId) return;

    const isExpense = tx.type === 'EXPENSE';
    const journalCode = isExpense ? 'ACH' : 'VTE';
    const journalLib = isExpense ? 'Journal des achats' : 'Journal des ventes';
    const ecritureNum = `ECR${String(ecritureCounter).padStart(6, '0')}`;
    const dateFormatted = formatFecDate(tx.issueDate);
    const pieceRef = tx.invoiceNumber || `PIECE-${ecritureCounter}`;
    const ecritureLib = tx.description || `${isExpense ? 'Achat' : 'Vente'} ${tx.partnerName}`;
    const partnerClean = (tx.partnerName || 'TIERS').substring(0, 30);
    const pcg = getPcgAccounts(tx.category, tx.type);

    if (isExpense) {
      // 1. Charge (Debit amountHT)
      fecRows.push([
        journalCode,
        journalLib,
        ecritureNum,
        dateFormatted,
        pcg.code,
        pcg.label,
        '',
        '',
        pieceRef,
        dateFormatted,
        ecritureLib,
        formatAmount(tx.amountHT),
        '0,00',
        '',
        '',
        dateFormatted,
        '',
        'EUR',
      ].join('\t'));

      // 2. TVA déductible (Debit amountTVA if > 0)
      if (tx.amountTVA > 0) {
        fecRows.push([
          journalCode,
          journalLib,
          ecritureNum,
          dateFormatted,
          '445660',
          'TVA deductible sur autres biens et services',
          '',
          '',
          pieceRef,
          dateFormatted,
          `TVA ${tx.tvaRate}% - ${pieceRef}`,
          formatAmount(tx.amountTVA),
          '0,00',
          '',
          '',
          dateFormatted,
          '',
          'EUR',
        ].join('\t'));
      }

      // 3. Fournisseur (Credit amountTTC)
      fecRows.push([
        journalCode,
        journalLib,
        ecritureNum,
        dateFormatted,
        '401000',
        'Fournisseurs',
        `401${partnerClean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10)}`,
        partnerClean,
        pieceRef,
        dateFormatted,
        ecritureLib,
        '0,00',
        formatAmount(tx.amountTTC),
        '',
        '',
        dateFormatted,
        '',
        'EUR',
      ].join('\t'));

      // 4. Si payée, écriture de règlement Banque
      if (tx.status === 'PAID') {
        const bqEcritureNum = `ECR${String(ecritureCounter + 1).padStart(6, '0')}`;
        fecRows.push([
          'BQ',
          'Journal de Banque',
          bqEcritureNum,
          dateFormatted,
          '401000',
          'Fournisseurs',
          `401${partnerClean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10)}`,
          partnerClean,
          pieceRef,
          dateFormatted,
          `Reglement ${pieceRef}`,
          formatAmount(tx.amountTTC),
          '0,00',
          '',
          '',
          dateFormatted,
          '',
          'EUR',
        ].join('\t'));

        fecRows.push([
          'BQ',
          'Journal de Banque',
          bqEcritureNum,
          dateFormatted,
          '512000',
          'Banque compte courant',
          '',
          '',
          pieceRef,
          dateFormatted,
          `Reglement ${pieceRef}`,
          '0,00',
          formatAmount(tx.amountTTC),
          '',
          '',
          dateFormatted,
          '',
          'EUR',
        ].join('\t'));
        ecritureCounter += 1;
      }
    } else {
      // VENTES / RECETTES
      // 1. Client (Debit amountTTC)
      fecRows.push([
        journalCode,
        journalLib,
        ecritureNum,
        dateFormatted,
        '411000',
        'Clients',
        `411${partnerClean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10)}`,
        partnerClean,
        pieceRef,
        dateFormatted,
        ecritureLib,
        formatAmount(tx.amountTTC),
        '0,00',
        '',
        '',
        dateFormatted,
        '',
        'EUR',
      ].join('\t'));

      // 2. Produit (Credit amountHT)
      fecRows.push([
        journalCode,
        journalLib,
        ecritureNum,
        dateFormatted,
        pcg.code,
        pcg.label,
        '',
        '',
        pieceRef,
        dateFormatted,
        ecritureLib,
        '0,00',
        formatAmount(tx.amountHT),
        '',
        '',
        dateFormatted,
        '',
        'EUR',
      ].join('\t'));

      // 3. TVA collectée (Credit amountTVA if > 0)
      if (tx.amountTVA > 0) {
        fecRows.push([
          journalCode,
          journalLib,
          ecritureNum,
          dateFormatted,
          '445710',
          'TVA collectee',
          '',
          '',
          pieceRef,
          dateFormatted,
          `TVA ${tx.tvaRate}% - ${pieceRef}`,
          '0,00',
          formatAmount(tx.amountTVA),
          '',
          '',
          dateFormatted,
          '',
          'EUR',
        ].join('\t'));
      }

      // 4. Si encaissée, écriture de banque
      if (tx.status === 'PAID') {
        const bqEcritureNum = `ECR${String(ecritureCounter + 1).padStart(6, '0')}`;
        fecRows.push([
          'BQ',
          'Journal de Banque',
          bqEcritureNum,
          dateFormatted,
          '512000',
          'Banque compte courant',
          '',
          '',
          pieceRef,
          dateFormatted,
          `Encaissement ${pieceRef}`,
          formatAmount(tx.amountTTC),
          '0,00',
          '',
          '',
          dateFormatted,
          '',
          'EUR',
        ].join('\t'));

        fecRows.push([
          'BQ',
          'Journal de Banque',
          bqEcritureNum,
          dateFormatted,
          '411000',
          'Clients',
          `411${partnerClean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10)}`,
          partnerClean,
          pieceRef,
          dateFormatted,
          `Encaissement ${pieceRef}`,
          '0,00',
          formatAmount(tx.amountTTC),
          '',
          '',
          dateFormatted,
          '',
          'EUR',
        ].join('\t'));
        ecritureCounter += 1;
      }
    }

    ecritureCounter += 1;
  });

  const fecContent = [headers.join('\t'), ...fecRows].join('\r\n');
  const blob = new Blob([fecContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const targetComp = targetCompanies[0];
  const sirenClean = (targetComp?.siren || 'GROUPE').replace(/\s+/g, '');
  const closingYear = targetComp?.fiscalYear || new Date().getFullYear();
  // Standard DGFiP nomenclature: <SIREN>FECYYYYMMDD.txt
  const fileName = `${sirenClean}FEC${closingYear}1231.txt`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
