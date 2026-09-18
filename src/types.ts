export type TransactionType = 'EXPENSE' | 'INCOME';

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export type PaymentMethod = 'VIREMENT' | 'CB' | 'PRELEVEMENT' | 'CHEQUE' | 'ESPECES';

export type VatRegime = 
  | 'ASSUJETTI_NORMAL'      // Assujetti TVA (Réel normal - CA3)
  | 'ASSUJETTI_SIMPLIFIE'   // Assujetti TVA (Réel simplifié - CA12)
  | 'FRANCHISE_BASE'        // Franchise en base (Art. 293 B CGI - Pas de TVA)
  | 'EXONERE_SPECIFIQUE';   // Exonéré (Location nue, activités financières)

export type TaxRegime = 'IS' | 'IR';

export type OperationType = 
  | 'EXPENSE_INVOICE'    // Facture fournisseur
  | 'INCOME_INVOICE'     // Facture client
  | 'SALARY_PAYROLL'     // Salaires, rémunérations & charges sociales
  | 'TAX_DUTY'           // Impôts, IS, CFE, taxes foncières
  | 'CURRENT_ACCOUNT'    // Compte Courant d'Associé (CCA) & flux trésorerie
  | 'BANK_FINANCE';      // Frais bancaires, mensualité emprunt

export interface DriveFileInfo {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  mimeType: string;
  size?: number;
  uploadedAt: string;
  folderId?: string;
}

export interface Company {
  id: string;
  name: string;
  legalForm: string; // SAS, SASU, SARL, EURL, SCI, Holding, SA...
  siren: string;
  color: string; // hex color
  currency: string; // 'EUR'
  fiscalYear: number;
  fiscalClosingMonth?: number; // 1-12 (défaut 12 pour Décembre)
  vatRegime: VatRegime; // Régime TVA (Assujetti vs Non-assujetti / Franchise)
  taxRegime: TaxRegime; // IS vs IR
  initialCash: number; // Solde bancaire d'ouverture (€)
  bankName?: string;
  iban?: string;
  driveFolderId?: string;
  drivePurchasesFolderId?: string;
  driveSalesFolderId?: string;
  contactEmail?: string;
  // Capital social & gouvernance
  shareCapital?: number; // Ex: 10000 €
  totalShares?: number; // Ex: 1000 actions ou parts
  shareNominalValue?: number; // Ex: 10 €
  presidentOrManager?: string; // Ex: "Dimitri Blanc (Président)"
  descriptionRole?: string; // Ex: "Société Mère / Holding de tête"
}

export type ShareholderType = 'INDIVIDUAL' | 'CORPORATE';

export interface Shareholder {
  id: string;
  name: string;
  email?: string;
  type: ShareholderType;
  corporateCompanyId?: string; // Si personne morale, lien avec une société du groupe
  role?: string; // "Président", "Directeur Général", "Gérant", "Associé"
  notes?: string;
}

export interface ShareholdingStake {
  id: string;
  companyId: string; // Société émettrice des actions/parts
  shareholderId: string; // Actionnaire / Associé détenteur
  sharesCount: number; // Nombre d'actions ou parts
  ownershipPercentage: number; // % de détention du capital (0 - 100)
  votingRightsPercentage: number; // % des droits de vote (0 - 100)
  nominalAmount?: number; // Montant nominal (€)
}

export interface Transaction {
  id: string;
  companyId: string;
  type: TransactionType;
  operationType?: OperationType;
  invoiceNumber: string;
  partnerName: string; // Fournisseur, Client, Salarié, URSSAF, Associé...
  description: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  amountHT: number;
  tvaRate: number; // 20, 10, 5.5, 2.1, 0
  amountTVA: number;
  amountTTC: number;
  category: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;

  // Détails Paie & Rémunérations
  netSalary?: number;
  socialCharges?: number; // URSSAF, Retraite, Prévoyance
  withholdingTax?: number; // Prélèvement à la source (PAS)

  // Détails Comptes Courants d'Associés (CCA) & Interco
  isInterCompany?: boolean; // Flux intra-groupe
  interCompanyTargetId?: string; // Entité contrepartie
  ccaPartnerName?: string; // Nom associé (ex: Dimitri Blanc)
  ccaDirection?: 'DEPOSIT' | 'WITHDRAWAL'; // Apport en trésorerie (+) ou Remboursement (-)

  driveFile?: DriveFileInfo;
  notes?: string;
  createdAt: string;
}

export interface SharedDriveItem {
  id: string;
  name: string;
  kind?: string;
}

export interface DriveConfig {
  destinationType: 'MY_DRIVE' | 'SHARED_DRIVE';
  selectedSharedDriveId?: string;
  rootFolderName: string;
  rootFolderId?: string;
  rootFolderUrl?: string;
  lastSyncAt?: string;
}

export interface DriveFolderContentItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  webViewLink?: string;
  size?: number;
  modifiedTime?: string;
}

export interface AccessControlConfig {
  restrictedMode: boolean;
  authorizedEmails: string[];
}

export const CATEGORIES_EXPENSES: Record<string, { label: string; iconName: string; color: string }> = {
  SAAS_HOSTING: { label: 'Logiciels & Cloud SaaS', iconName: 'Server', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  SERVICES_SUBCONTRACTING: { label: 'Prestations & Sous-traitance', iconName: 'Briefcase', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  EQUIPMENT_HARDWARE: { label: 'Matériel & Équipement', iconName: 'Laptop', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  LEGAL_ACCOUNTING: { label: 'Comptabilité & Juridique', iconName: 'Scale', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  RENT_OFFICE: { label: 'Loyers & Bureaux', iconName: 'Building', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  MARKETING_COM: { label: 'Marketing & Communication', iconName: 'Megaphone', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  TRAVEL_MEALS: { label: 'Déplacements & Frais', iconName: 'Car', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  SALARIES_CHARGES: { label: 'Rémunérations & Charges', iconName: 'Users', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  EXECUTIVE_SALARY: { label: 'Rémunération Dirigeant', iconName: 'UserCheck', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  EMPLOYEE_SALARY: { label: 'Salaires Collaborateurs', iconName: 'Users', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  SOCIAL_URSSAF: { label: 'Charges URSSAF & Prévoyance', iconName: 'ShieldAlert', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  TAX_CORPORATE_IS: { label: 'Impôt sur les Sociétés (IS)', iconName: 'Landmark', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  TAX_CFE_PROPERTY: { label: 'CFE & Taxes Foncières', iconName: 'Building', color: 'text-stone-700 bg-stone-50 border-stone-200' },
  TAX_VAT_PAYMENT: { label: 'Règlement TVA Trésor Public', iconName: 'Receipt', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  CCA_REIMBURSEMENT: { label: 'Remboursement Compte Courant (CCA)', iconName: 'ArrowUpRight', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  LOAN_REPAYMENT: { label: 'Échéance Emprunt Bancaire', iconName: 'CalendarCheck', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  BANK_FEES: { label: 'Frais & Agios Bancaires', iconName: 'CreditCard', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  BANK_TAXES: { label: 'Banque, Assurances & Divers', iconName: 'CreditCard', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  OTHER_EXPENSE: { label: 'Autres charges d\'exploitation', iconName: 'Tag', color: 'text-zinc-600 bg-zinc-50 border-zinc-200' },
};

export const CATEGORIES_INCOME: Record<string, { label: string; iconName: string; color: string }> = {
  CLIENT_INVOICE: { label: 'Facturation Client / Prestations', iconName: 'TrendingUp', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  RENTAL_INCOME: { label: 'Loyers & Revenus Locatifs (SCI)', iconName: 'Building2', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  PRODUCT_SALES: { label: 'Ventes Produits & Marchandises', iconName: 'PackageCheck', color: 'text-green-600 bg-green-50 border-green-200' },
  MANAGEMENT_FEES: { label: 'Management Fees Intra-Groupe', iconName: 'Repeat', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  CCA_CONTRIBUTION: { label: 'Apport Compte Courant d\'Associé', iconName: 'ArrowDownLeft', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  SUBSCRIPTION: { label: 'Abonnements & Récurrents', iconName: 'Clock', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  OTHER_INCOME: { label: 'Autres produits financiers / exceptionnels', iconName: 'DollarSign', color: 'text-teal-600 bg-teal-50 border-teal-200' },
};

export const VAT_REGIME_LABELS: Record<VatRegime, { label: string; short: string; badgeColor: string; description: string }> = {
  ASSUJETTI_NORMAL: {
    label: 'Assujetti TVA (Réel Normal - CA3)',
    short: 'TVA Réel Normal',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Déclarations mensuelles/trimestrielles. TVA collectée et déductible sur factures.',
  },
  ASSUJETTI_SIMPLIFIE: {
    label: 'Assujetti TVA (Réel Simplifié - CA12)',
    short: 'TVA Réel Simplifié',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Acomptes semestriels et déclaration annuelle CA12.',
  },
  FRANCHISE_BASE: {
    label: 'Franchise en base (Art. 293 B CGI - Pas de TVA)',
    short: 'Exonéré / Franchise TVA',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Pas de TVA collectée, pas de TVA déductible. Recommandé pour SCI sans option TVA et micro-entreprises.',
  },
  EXONERE_SPECIFIQUE: {
    label: 'Exonéré de plein droit (Immobilier nu / Financier)',
    short: 'Exonéré spécifique',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Opérations exonérées de plein droit selon la réglementation fiscale.',
  },
};

export const TAX_REGIME_LABELS: Record<TaxRegime, { label: string; short: string; description: string }> = {
  IS: {
    label: 'Impôt sur les Sociétés (IS)',
    short: 'IS',
    description: 'Imposition des bénéfices au niveau de la société (taux réduit 15% / normal 25%).',
  },
  IR: {
    label: 'Impôt sur le Revenu (IR / Translucidité fiscale)',
    short: 'IR',
    description: 'Imposition directe entre les mains des associés (quote-part des bénéfices ou déficits).',
  },
};

export function getCategoryLabel(categoryKey: string, type: TransactionType): string {
  if (type === 'EXPENSE') {
    return CATEGORIES_EXPENSES[categoryKey]?.label || categoryKey;
  }
  return CATEGORIES_INCOME[categoryKey]?.label || categoryKey;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}
