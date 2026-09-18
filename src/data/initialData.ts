import { 
  Company, 
  Transaction, 
  DriveConfig, 
  AccessControlConfig,
  Shareholder,
  ShareholdingStake 
} from '../types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'dryos-holding',
    name: 'DRYOS HOLDING',
    legalForm: 'SAS',
    siren: '912 345 678',
    color: '#1e1b4b',
    currency: 'EUR',
    fiscalYear: 2026,
    fiscalClosingMonth: 12,
    vatRegime: 'ASSUJETTI_NORMAL',
    taxRegime: 'IS',
    initialCash: 0,
    bankName: 'BNP Paribas',
    shareCapital: 10000,
    totalShares: 1000,
    shareNominalValue: 10,
    presidentOrManager: 'Dimitri Blanc (Président)',
    descriptionRole: 'Holding',
    contactEmail: 'dimitri.blanc@dryos.fr',
  },
  {
    id: 'dryos-immobilier',
    name: 'DRYOS IMMOBILIER',
    legalForm: 'SAS',
    siren: '923 456 789',
    color: '#047857',
    currency: 'EUR',
    fiscalYear: 2026,
    fiscalClosingMonth: 12,
    vatRegime: 'ASSUJETTI_NORMAL',
    taxRegime: 'IS',
    initialCash: 0,
    bankName: 'BNP Paribas',
    shareCapital: 10000,
    totalShares: 1000,
    shareNominalValue: 10,
    presidentOrManager: 'Dimitri Blanc',
    descriptionRole: 'Immobilier',
    contactEmail: 'contact@dryos.fr',
  },
  {
    id: 'sci-dryos-1',
    name: 'SCI DRYOS I',
    legalForm: 'SCI',
    siren: '934 567 890',
    color: '#b45309',
    currency: 'EUR',
    fiscalYear: 2026,
    fiscalClosingMonth: 12,
    vatRegime: 'FRANCHISE_BASE',
    taxRegime: 'IS',
    initialCash: 0,
    bankName: 'Crédit Agricole',
    shareCapital: 1000,
    totalShares: 100,
    shareNominalValue: 10,
    presidentOrManager: 'Dimitri Blanc (Gérant)',
    descriptionRole: 'SCI',
    contactEmail: 'sci1@dryos.fr',
  },
];

export const INITIAL_SHAREHOLDERS: Shareholder[] = [
  {
    id: 'sh-dimitri',
    name: 'Dimitri Blanc',
    email: 'dimitri.blanc@dryos.fr',
    type: 'INDIVIDUAL',
    role: 'Dirigeant',
  },
  {
    id: 'sh-charline',
    name: 'Charline Blanc',
    email: 'blanccharline13@gmail.com',
    type: 'INDIVIDUAL',
    role: 'Associée',
  },
  {
    id: 'sh-dryos-holding',
    name: 'DRYOS HOLDING',
    type: 'CORPORATE',
    corporateCompanyId: 'dryos-holding',
    role: 'Société Mère',
  },
];

export const INITIAL_STAKES: ShareholdingStake[] = [
  // DRYOS HOLDING
  {
    id: 'stake-holding-dimitri',
    companyId: 'dryos-holding',
    shareholderId: 'sh-dimitri',
    sharesCount: 800,
    ownershipPercentage: 80.0,
    votingRightsPercentage: 80.0,
    nominalAmount: 8000,
  },
  {
    id: 'stake-holding-charline',
    companyId: 'dryos-holding',
    shareholderId: 'sh-charline',
    sharesCount: 200,
    ownershipPercentage: 20.0,
    votingRightsPercentage: 20.0,
    nominalAmount: 2000,
  },
  // DRYOS IMMOBILIER S.A.S (100% détenue par DRYOS HOLDING)
  {
    id: 'stake-immo-holding',
    companyId: 'dryos-immobilier',
    shareholderId: 'sh-dryos-holding',
    sharesCount: 1000,
    ownershipPercentage: 100.0,
    votingRightsPercentage: 100.0,
    nominalAmount: 10000,
  },
  // SCI DRYOS I (99% DRYOS HOLDING, 1% Dimitri Blanc pour règle des 2 associés min)
  {
    id: 'stake-sci-holding',
    companyId: 'sci-dryos-1',
    shareholderId: 'sh-dryos-holding',
    sharesCount: 99,
    ownershipPercentage: 99.0,
    votingRightsPercentage: 99.0,
    nominalAmount: 990,
  },
  {
    id: 'stake-sci-dimitri',
    companyId: 'sci-dryos-1',
    shareholderId: 'sh-dimitri',
    sharesCount: 1,
    ownershipPercentage: 1.0,
    votingRightsPercentage: 1.0,
    nominalAmount: 10,
  },
];

export const DEMO_TRANSACTIONS: Transaction[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_DRIVE_CONFIG: DriveConfig = {
  destinationType: 'SHARED_DRIVE',
  rootFolderName: 'Compta_Groupe',
  rootFolderId: '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-',
  rootFolderUrl: 'https://drive.google.com/drive/folders/1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-',
  lastSyncAt: undefined,
};
export const DEFAULT_DRIVE_CONFIG = INITIAL_DRIVE_CONFIG;

export const INITIAL_ACCESS_CONTROL: AccessControlConfig = {
  restrictedMode: true,
  authorizedEmails: [
    'dimitri.blanc@dryos.fr',
    'blanccharline13@gmail.com',
  ],
};

const STORAGE_KEYS = {
  COMPANIES: 'dryos_companies_v3',
  TRANSACTIONS: 'dryos_transactions_v3',
  DRIVE_CONFIG: 'dryos_drive_config_v3',
  ACCESS_CONTROL: 'dryos_access_control_v3',
  SHAREHOLDERS: 'dryos_shareholders_v1',
  STAKES: 'dryos_stakes_v1',
  LOGO: 'dryos_group_logo_v1',
};

export function loadCompanies(): Company[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPANIES) || localStorage.getItem('comptadrive_companies_v2') || localStorage.getItem('comptadrive_companies');
    if (saved) {
      const parsed: Company[] = JSON.parse(saved);
      // If user had the old generic demo companies, replace with the official DRYOS group entities
      const hasOldGeneric = parsed.length > 0 && parsed.every((c) => ['holding-sas', 'immo-sas', 'sci'].includes(c.id));
      if (hasOldGeneric || parsed.length === 0) {
        saveCompanies(INITIAL_COMPANIES);
        return INITIAL_COMPANIES;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Erreur chargement entreprises:', e);
  }
  saveCompanies(INITIAL_COMPANIES);
  return INITIAL_COMPANIES;
}

export function saveCompanies(companies: Company[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  } catch (e) {
    console.error('Erreur sauvegarde entreprises:', e);
  }
}

export function loadShareholders(): Shareholder[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SHAREHOLDERS);
    if (saved) {
      const parsed: Shareholder[] = JSON.parse(saved);
      if (parsed && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur chargement actionnaires:', e);
  }
  saveShareholders(INITIAL_SHAREHOLDERS);
  return INITIAL_SHAREHOLDERS;
}

export function saveShareholders(shareholders: Shareholder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHAREHOLDERS, JSON.stringify(shareholders));
  } catch (e) {
    console.error('Erreur sauvegarde actionnaires:', e);
  }
}

export function loadStakes(): ShareholdingStake[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STAKES);
    if (saved) {
      const parsed: ShareholdingStake[] = JSON.parse(saved);
      if (parsed && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur chargement participations:', e);
  }
  saveStakes(INITIAL_STAKES);
  return INITIAL_STAKES;
}

export function saveStakes(stakes: ShareholdingStake[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STAKES, JSON.stringify(stakes));
  } catch (e) {
    console.error('Erreur sauvegarde participations:', e);
  }
}

export function loadGroupLogo(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LOGO);
  } catch {
    return null;
  }
}

export function saveGroupLogo(logoDataUrl: string | null): void {
  try {
    if (logoDataUrl) {
      localStorage.setItem(STORAGE_KEYS.LOGO, logoDataUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.LOGO);
    }
  } catch (e) {
    console.error('Erreur sauvegarde logo:', e);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || localStorage.getItem('comptadrive_transactions');
    if (saved) {
      const parsed: Transaction[] = JSON.parse(saved);
      // Filter out any fake/demo transactions from earlier tests
      const cleaned = parsed.filter((t) => !t.id.startsWith('tx-') && !t.invoiceNumber?.includes('MF-2026') && !t.invoiceNumber?.includes('BNP-FRAIS'));
      if (cleaned.length !== parsed.length) {
        saveTransactions(cleaned);
      }
      return cleaned;
    }
  } catch (e) {
    console.error('Erreur chargement transactions:', e);
  }
  saveTransactions([]);
  return [];
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Erreur sauvegarde transactions:', e);
  }
}

export function loadDriveConfig(): DriveConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DRIVE_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erreur chargement drive config:', e);
  }
  return INITIAL_DRIVE_CONFIG;
}

export function saveDriveConfig(config: DriveConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DRIVE_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Erreur sauvegarde drive config:', e);
  }
}

export function loadAccessControl(): AccessControlConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACCESS_CONTROL);
    if (saved) {
      const parsed: AccessControlConfig = JSON.parse(saved);
      // Ensure blanccharline13@gmail.com and dimitri.blanc@dryos.fr are always authorized
      const defaultEmails = ['dimitri.blanc@dryos.fr', 'blanccharline13@gmail.com'];
      const combined = Array.from(new Set([...(parsed.authorizedEmails || []), ...defaultEmails]));
      return {
        ...parsed,
        authorizedEmails: combined,
      };
    }
  } catch (e) {
    console.error('Erreur chargement access control:', e);
  }
  return INITIAL_ACCESS_CONTROL;
}

export function saveAccessControl(config: AccessControlConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_CONTROL, JSON.stringify(config));
  } catch (e) {
    console.error('Erreur sauvegarde access control:', e);
  }
}
