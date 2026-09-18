import React, { useState, useEffect, useMemo } from 'react';
import { Company, Transaction, DriveConfig, PaymentStatus, AccessControlConfig, Shareholder, ShareholdingStake } from './types';
import { 
  INITIAL_COMPANIES, 
  INITIAL_TRANSACTIONS, 
  DEFAULT_DRIVE_CONFIG,
  INITIAL_ACCESS_CONTROL,
  DEMO_TRANSACTIONS,
  loadAccessControl,
  saveAccessControl,
  loadShareholders,
  saveShareholders,
  INITIAL_SHAREHOLDERS,
  loadStakes,
  saveStakes,
  INITIAL_STAKES,
  loadGroupLogo,
  saveGroupLogo
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { ConsolidatedDashboard } from './components/ConsolidatedDashboard';
import { CompanyDashboard } from './components/CompanyDashboard';
import { TransactionTable } from './components/TransactionTable';
import { CashFlowDashboard } from './components/CashFlowDashboard';
import { VatTaxControl } from './components/VatTaxControl';
import { CurrentAccountTracker } from './components/CurrentAccountTracker';
import { GroupOrgChartView } from './components/GroupOrgChartView';
import { LogoManagerModal } from './components/LogoManagerModal';
import { InvoiceUploadModal } from './components/InvoiceUploadModal';
import { DriveSettingsModal } from './components/DriveSettingsModal';
import { CompanyManagerModal } from './components/CompanyManagerModal';
import { AccessControlModal } from './components/AccessControlModal';
import { DriveExplorerModal } from './components/DriveExplorerModal';
import { QuickSetupModal } from './components/QuickSetupModal';
import { DriveFolderView } from './components/DriveFolderView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AccessRestrictedScreen } from './components/AccessRestrictedScreen';
import { 
  getCurrentAuthToken, 
  signInWithGoogleDrive, 
  signOutGoogle, 
  subscribeToAuthState,
  User 
} from './services/authService';
import { exportTransactionsToCsv, exportTransactionsToFEC } from './utils/exportUtils';
import { exportConsolidatedExcel } from './utils/excelExport';
import {
  DEFAULT_DRYOS_COMPANIES,
  subscribeCompanies,
  saveCompanyToCloud,
  deleteCompanyFromCloud,
  seedCompaniesInBatch,
  subscribeTransactions,
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  subscribeAppConfig,
  saveAppConfigToCloud,
  subscribeShareholders,
  saveShareholderToCloud,
  deleteShareholderFromCloud,
  seedShareholdersInBatch,
  subscribeStakes,
  saveStakeToCloud,
  deleteStakeFromCloud,
  seedStakesInBatch,
} from './services/firebaseService';
import { 
  LayoutDashboard, 
  Receipt, 
  HardDrive, 
  FileSpreadsheet, 
  Plus, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FolderSearch,
  Lock,
  Building2,
  RotateCcw,
  Wallet,
  Percent,
  Users,
  Network
} from 'lucide-react';

export default function App() {
  // State: Companies with Cloud Firestore & local cache (defaults to the 3 Dryos companies)
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem('comptadrive_companies');
      if (saved) {
        const parsed: Company[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_DRYOS_COMPANIES;
  });

  // State: Transactions with Cloud Firestore & local cache
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('comptadrive_transactions');
      if (saved) {
        const parsed: Transaction[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // State: Drive Config with Cloud Firestore & local cache
  const [driveConfig, setDriveConfig] = useState<DriveConfig>(() => {
    try {
      const saved = localStorage.getItem('comptadrive_config');
      return saved ? JSON.parse(saved) : DEFAULT_DRIVE_CONFIG;
    } catch {
      return DEFAULT_DRIVE_CONFIG;
    }
  });

  // State: Access Control (Dimitri & authorized associates restricted access)
  const [accessControl, setAccessControl] = useState<AccessControlConfig>(() => {
    return loadAccessControl();
  });

  // Selection state (null = Consolidated view)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Shareholders & Stakes (Organigramme & Capital social)
  const [shareholders, setShareholders] = useState<Shareholder[]>(() => loadShareholders());
  const [stakes, setStakes] = useState<ShareholdingStake[]>(() => loadStakes());
  const [groupLogoUrl, setGroupLogoUrl] = useState<string | null>(() => loadGroupLogo());
  const [isLogoManagerOpen, setIsLogoManagerOpen] = useState(false);

  // Active view tab: 'OVERVIEW' | 'TRANSACTIONS' | 'CASHFLOW' | 'VAT' | 'CCA' | 'DRIVE' | 'ORGANIGRAMME'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRANSACTIONS' | 'CASHFLOW' | 'VAT' | 'CCA' | 'DRIVE' | 'ORGANIGRAMME'>('OVERVIEW');

  // Auth & Token states
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getCurrentAuthToken());
  const [isCloudConnected, setIsCloudConnected] = useState(true);

  // Modal open states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDriveSettingsOpen, setIsDriveSettingsOpen] = useState(false);
  const [isCompanyManagerOpen, setIsCompanyManagerOpen] = useState(false);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState(false);
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Save to localStorage as instant offline cache
  useEffect(() => {
    localStorage.setItem('comptadrive_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('comptadrive_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('comptadrive_config', JSON.stringify(driveConfig));
  }, [driveConfig]);

  useEffect(() => {
    saveAccessControl(accessControl);
  }, [accessControl]);

  useEffect(() => {
    saveShareholders(shareholders);
  }, [shareholders]);

  useEffect(() => {
    saveStakes(stakes);
  }, [stakes]);

  useEffect(() => {
    saveGroupLogo(groupLogoUrl);
  }, [groupLogoUrl]);

  // Real-time Cloud Firestore Subscriptions
  useEffect(() => {
    let isMounted = true;

    // 1. Synchronize Companies
    const unsubCompanies = subscribeCompanies(
      (cloudCompanies) => {
        if (!isMounted) return;
        setIsCloudConnected(true);
        if (cloudCompanies.length > 0) {
          setCompanies(cloudCompanies);
          localStorage.setItem('comptadrive_companies', JSON.stringify(cloudCompanies));
        } else {
          // Empty in Firestore: auto-seed the Dryos group entities
          seedCompaniesInBatch(DEFAULT_DRYOS_COMPANIES)
            .then(() => {
              if (isMounted) {
                setCompanies(DEFAULT_DRYOS_COMPANIES);
                localStorage.setItem('comptadrive_companies', JSON.stringify(DEFAULT_DRYOS_COMPANIES));
              }
            })
            .catch((err) => console.warn('[Firebase] Seed error:', err));
        }
      },
      (err) => {
        console.warn('[Firebase] Companies offline:', err);
        if (isMounted) setIsCloudConnected(false);
      }
    );

    // 2. Synchronize Transactions
    const unsubTransactions = subscribeTransactions(
      (cloudTx) => {
        if (!isMounted) return;
        setIsCloudConnected(true);
        setTransactions(cloudTx);
        localStorage.setItem('comptadrive_transactions', JSON.stringify(cloudTx));
      },
      (err) => {
        console.warn('[Firebase] Transactions offline:', err);
        if (isMounted) setIsCloudConnected(false);
      }
    );

    // 3. Synchronize App Config
    const unsubConfig = subscribeAppConfig((cloudCfg) => {
      if (!isMounted) return;
      if (cloudCfg && cloudCfg.rootFolderName) {
        setDriveConfig(cloudCfg);
        localStorage.setItem('comptadrive_config', JSON.stringify(cloudCfg));
      }
    });

    // 4. Synchronize Shareholders
    const unsubShareholders = subscribeShareholders(
      (cloudSh) => {
        if (!isMounted) return;
        if (cloudSh.length > 0) {
          setShareholders(cloudSh);
          saveShareholders(cloudSh);
        } else {
          seedShareholdersInBatch(INITIAL_SHAREHOLDERS)
            .then(() => {
              if (isMounted) setShareholders(INITIAL_SHAREHOLDERS);
            })
            .catch((err) => console.warn('[Firebase] Seed shareholders error:', err));
        }
      },
      (err) => console.warn('[Firebase] Shareholders offline:', err)
    );

    // 5. Synchronize Stakes
    const unsubStakes = subscribeStakes(
      (cloudStakes) => {
        if (!isMounted) return;
        if (cloudStakes.length > 0) {
          setStakes(cloudStakes);
          saveStakes(cloudStakes);
        } else {
          seedStakesInBatch(INITIAL_STAKES)
            .then(() => {
              if (isMounted) setStakes(INITIAL_STAKES);
            })
            .catch((err) => console.warn('[Firebase] Seed stakes error:', err));
        }
      },
      (err) => console.warn('[Firebase] Stakes offline:', err)
    );

    return () => {
      isMounted = false;
      unsubCompanies();
      unsubTransactions();
      unsubConfig();
      unsubShareholders();
      unsubStakes();
    };
  }, []);

  // Subscribe to Google Drive auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      setToken(getCurrentAuthToken());
    });
    return () => unsubscribe();
  }, []);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Check if current logged in user is authorized (Dimitri & authorized associates)
  const isUserAuthorized = useMemo(() => {
    if (!user) return true; // not logged in, user can browse public UI or login
    if (!accessControl.restrictedMode) return true;
    const userEmail = (user.email || '').toLowerCase().trim();
    if (!userEmail) return false;
    return accessControl.authorizedEmails.some(
      (e) => e.toLowerCase().trim() === userEmail
    );
  }, [user, accessControl]);

  // Auth Handlers
  const handleConnectDrive = async () => {
    try {
      const authResult = await signInWithGoogleDrive();
      if (authResult) {
        setUser(authResult.user);
        setToken(authResult.accessToken);
        showToast(`Google Drive connecté avec succès (${authResult.user.email}) !`);
      }
    } catch (err: any) {
      console.error('Erreur connexion Google Drive:', err);
      showToast('Impossible de connecter Google Drive : ' + err.message, 'info');
    }
  };

  const handleDisconnectDrive = async () => {
    await signOutGoogle();
    setUser(null);
    setToken(null);
    showToast('Compte Google déconnecté.', 'info');
  };

  // Transaction Handlers with Cloud Firestore
  const handleAddTransaction = async (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    try {
      await saveTransactionToCloud(newTx);
    } catch (err) {
      console.error('Erreur sauvegarde transaction Firestore:', err);
    }
    showToast(`Écriture ${newTx.invoiceNumber} enregistrée dans le Cloud !`);
  };

  const handleUpdateStatus = async (id: string, newStatus: PaymentStatus) => {
    const current = transactions.find((t) => t.id === id);
    if (current) {
      const updated = { ...current, status: newStatus };
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      try {
        await saveTransactionToCloud(updated);
      } catch (err) {
        console.error('Erreur mise à jour statut Firestore:', err);
      }
    }
    showToast(`Statut mis à jour : ${newStatus === 'PAID' ? 'Payée' : 'En attente'}`);
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTransactionFromCloud(id);
    } catch (err) {
      console.error('Erreur suppression transaction Firestore:', err);
    }
    showToast('Écriture comptable supprimée.');
  };

  const handleResetLedger = async () => {
    if (window.confirm("Confirmez-vous la réinitialisation des écritures ?\nToutes les factures seront effacées et les 3 sociétés du groupe réinitialisées à 0 € dans le Cloud.")) {
      for (const tx of transactions) {
        deleteTransactionFromCloud(tx.id).catch(() => {});
      }
      setTransactions([]);
      setSelectedCompanyId(null);
      await seedCompaniesInBatch(DEFAULT_DRYOS_COMPANIES);
      setCompanies(DEFAULT_DRYOS_COMPANIES);
      showToast('Écritures comptables réinitialisées.', 'info');
    }
  };

  // Company Handlers with Cloud Firestore
  const handleSaveCompany = async (savedComp: Company) => {
    setCompanies((prev) => {
      const exists = prev.find((c) => c.id === savedComp.id);
      if (exists) {
        return prev.map((c) => (c.id === savedComp.id ? savedComp : c));
      }
      return [...prev, savedComp];
    });
    try {
      await saveCompanyToCloud(savedComp);
    } catch (err) {
      console.error('Erreur sauvegarde société Firestore:', err);
    }
    showToast(`Société "${savedComp.name}" enregistrée dans le Cloud.`);
  };

  const handleDeleteCompany = async (compId: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== compId));
    if (selectedCompanyId === compId) {
      setSelectedCompanyId(null);
    }
    try {
      await deleteCompanyFromCloud(compId);
    } catch (err) {
      console.error('Erreur suppression société Firestore:', err);
    }
    showToast('Société retirée du périmètre.');
  };

  const handleReorderCompanies = (newCompanies: Company[]) => {
    setCompanies(newCompanies);
    seedCompaniesInBatch(newCompanies).catch((err) => console.error('Erreur reorder companies Firestore:', err));
  };

  const handleReorderShareholders = (newShareholders: Shareholder[]) => {
    setShareholders(newShareholders);
    seedShareholdersInBatch(newShareholders).catch((err) => console.error('Erreur reorder shareholders Firestore:', err));
  };

  // Export CSV
  const handleExportCsv = () => {
    exportTransactionsToCsv(transactions, companies, selectedCompanyId);
    showToast('Journal comptable exporté au format CSV.');
  };

  // Export FEC (Fichier des Écritures Comptables conforme DGFiP)
  const handleExportFec = () => {
    exportTransactionsToFEC(transactions, companies, selectedCompanyId);
    showToast('FEC officiel DGFiP généré avec succès.');
  };

  // Export Excel Pro complet multi-onglets (Synthèse, Grand Livre, Capital, CCA, TVA)
  const handleExportExcelWorkbook = () => {
    exportConsolidatedExcel({
      companies,
      transactions,
      shareholders,
      stakes,
      selectedCompanyId,
    });
    showToast('Classeur Excel consolidé (.xlsx) exporté avec succès !');
  };

  // Actionnariat & Organigramme handlers
  const handleSaveShareholder = async (savedSh: Shareholder) => {
    setShareholders((prev) => {
      const idx = prev.findIndex((s) => s.id === savedSh.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedSh;
        return next;
      }
      return [...prev, savedSh];
    });
    try {
      await saveShareholderToCloud(savedSh);
    } catch (err) {
      console.error('Erreur sauvegarde actionnaire Firestore:', err);
    }
    showToast(`Actionnaire ${savedSh.name} enregistré.`);
  };

  const handleDeleteShareholder = async (shId: string) => {
    setShareholders((prev) => prev.filter((s) => s.id !== shId));
    setStakes((prev) => prev.filter((st) => st.shareholderId !== shId));
    try {
      await deleteShareholderFromCloud(shId);
    } catch (err) {
      console.error('Erreur suppression actionnaire Firestore:', err);
    }
    showToast('Actionnaire et ses participations supprimés.');
  };

  const handleSaveStake = async (savedStake: ShareholdingStake) => {
    setStakes((prev) => {
      const idx = prev.findIndex((s) => s.id === savedStake.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedStake;
        return next;
      }
      return [...prev, savedStake];
    });
    try {
      await saveStakeToCloud(savedStake);
    } catch (err) {
      console.error('Erreur sauvegarde participation Firestore:', err);
    }
    showToast('Participation mise à jour.');
  };

  const handleDeleteStake = async (stakeId: string) => {
    setStakes((prev) => prev.filter((s) => s.id !== stakeId));
    try {
      await deleteStakeFromCloud(stakeId);
    } catch (err) {
      console.error('Erreur suppression participation Firestore:', err);
    }
    showToast('Lien de participation supprimé.');
  };

  const handleUpdateCompanyCapital = (
    companyId: string,
    capital: number,
    totalShares: number,
    nominalValue: number
  ) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === companyId
          ? {
              ...c,
              shareCapital: capital,
              totalShares,
              shareNominalValue: nominalValue,
            }
          : c
      )
    );
    const targetComp = companies.find((c) => c.id === companyId);
    if (targetComp) {
      saveCompanyToCloud({
        ...targetComp,
        shareCapital: capital,
        totalShares,
        shareNominalValue: nominalValue,
      }).catch(() => {});
    }
  };

  const handleSaveLogo = (newLogoUrl: string | null) => {
    setGroupLogoUrl(newLogoUrl);
    saveGroupLogo(newLogoUrl);
  };

  // Initialize group companies in 1 click
  const handleInitGroupCompanies = async () => {
    setCompanies(DEFAULT_DRYOS_COMPANIES);
    try {
      await seedCompaniesInBatch(DEFAULT_DRYOS_COMPANIES);
    } catch (err) {
      console.error('Erreur initialisation Firestore:', err);
    }
    showToast('3 sociétés du groupe configurées dans le Cloud (Holding, Immo, SCI) !');
  };

  const handleSaveDriveConfig = async (newCfg: DriveConfig) => {
    setDriveConfig(newCfg);
    try {
      await saveAppConfigToCloud(newCfg);
    } catch (err) {
      console.error('Erreur sauvegarde config Drive Firestore:', err);
    }
  };

  // Current selected company object
  const currentCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c) => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // Security gate: If user is logged in with an unauthorized Google email
  if (user && !isUserAuthorized) {
    return (
      <AccessRestrictedScreen
        user={user}
        onLogout={handleDisconnectDrive}
        authorizedCount={accessControl.authorizedEmails.length}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Application Navbar */}
      <Navbar
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={setSelectedCompanyId}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenDriveSettings={() => setIsDriveSettingsOpen(true)}
        onOpenCompanyManager={() => setIsCompanyManagerOpen(true)}
        onOpenDriveExplorer={() => setIsDriveExplorerOpen(true)}
        onOpenAccessControl={() => setIsAccessControlOpen(true)}
        onOpenQuickSetup={() => setIsQuickSetupOpen(true)}
        onOpenOrganigramme={() => setActiveTab('ORGANIGRAMME')}
        onOpenLogoManager={() => setIsLogoManagerOpen(true)}
        onExportExcel={handleExportExcelWorkbook}
        groupLogoUrl={groupLogoUrl}
        user={user}
        token={token}
        isLoggingIn={false}
        onLogin={handleConnectDrive}
        onLogout={handleDisconnectDrive}
        onExportCsv={handleExportCsv}
        driveConfig={driveConfig}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
        {/* Permanent Direct Drive Connection Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-2">
                <span>Google Drive connecté directement</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Actif
                </span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dossier racine groupe : <span className="font-mono text-indigo-600 font-medium">1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-</span> (Holding SAS, Société Immo SAS, SCI)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('DRIVE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              <FolderSearch className="w-3.5 h-3.5 text-emerald-600" />
              <span>Voir les dossiers</span>
            </button>
            <button
              onClick={() => setIsDriveExplorerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <span>Explorateur popup</span>
            </button>
            <a
              href={driveConfig.rootFolderUrl || `https://drive.google.com/drive/folders/1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Ouvrir sur Google Drive dans un nouvel onglet"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Empty state notice if ledger is empty */}
        {transactions.length === 0 && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5 text-slate-600" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Grand livre vierge
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aucune écriture enregistrée. Déposez une facture ou connectez Google Drive pour importer vos pièces.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Déposer une facture</span>
              </button>
              <button
                onClick={() => setIsDriveExplorerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <FolderSearch className="w-4 h-4 text-indigo-600" />
                <span>Importer depuis Google Drive</span>
              </button>
            </div>
          </div>
        )}

        {/* View Switcher & Action Bar (Desktop only, mobile uses MobileBottomNav) */}
        <div className="hidden md:flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>
                {selectedCompanyId ? `Dashboard ${currentCompany?.name}` : 'Dashboard Consolidé'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Grand Livre ({transactions.length})</span>
            </button>

            <button
              id="tab-btn-organigramme"
              onClick={() => setActiveTab('ORGANIGRAMME')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ORGANIGRAMME'
                  ? 'bg-indigo-950 text-white shadow-xs'
                  : 'text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100'
              }`}
            >
              <Network className="w-4 h-4 text-indigo-500" />
              <span>Organigramme & Associés</span>
            </button>

            <button
              onClick={() => setActiveTab('CASHFLOW')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'CASHFLOW'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Trésorerie</span>
            </button>

            <button
              onClick={() => setActiveTab('VAT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'VAT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className="w-4 h-4" />
              <span>Contrôle TVA</span>
            </button>

            <button
              onClick={() => setActiveTab('CCA')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'CCA'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Comptes Associés (CCA)</span>
            </button>

            <button
              onClick={() => setActiveTab('DRIVE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'DRIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50/60'
              }`}
            >
              <FolderSearch className="w-4 h-4 text-emerald-600" />
              <span>Dossiers Drive</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            <button
              id="btn-main-export-excel"
              onClick={handleExportExcelWorkbook}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Exporter le classeur complet multi-onglets au format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            {transactions.length > 0 && (
              <button
                onClick={handleResetLedger}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                title="Purger toutes les écritures et remettre le grand livre à 0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Remettre à 0</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Exporter les écritures en format CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportFec}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Exporter le Fichier des Écritures Comptables officiel (FEC norme DGFiP)"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export FEC (DGFiP)</span>
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Déposer une facture</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Content */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {selectedCompanyId === null || !currentCompany ? (
              <ConsolidatedDashboard
                companies={companies}
                transactions={transactions}
                onSelectCompany={setSelectedCompanyId}
                onOpenUpload={() => setIsUploadOpen(true)}
                onOpenCompanyManager={() => setIsCompanyManagerOpen(true)}
                onInitGroupCompanies={handleInitGroupCompanies}
                driveConnected={Boolean(token)}
              />
            ) : (
              <CompanyDashboard
                company={currentCompany}
                transactions={transactions}
                onOpenUpload={() => setIsUploadOpen(true)}
                onOpenDriveSettings={() => setIsDriveSettingsOpen(true)}
                driveConnected={Boolean(token)}
              />
            )}

            {/* Quick Journal Preview beneath Dashboard */}
            <div className="pt-2">
              <TransactionTable
                transactions={transactions}
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onUpdateStatus={handleUpdateStatus}
                onDeleteTransaction={handleDeleteTransaction}
                onOpenUpload={() => setIsUploadOpen(true)}
                onExportCsv={handleExportCsv}
                onExportFec={handleExportFec}
              />
            </div>
          </div>
        )}

        {activeTab === 'TRANSACTIONS' && (
          <div className="space-y-6">
            <TransactionTable
              transactions={transactions}
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              onUpdateStatus={handleUpdateStatus}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenUpload={() => setIsUploadOpen(true)}
              onExportCsv={handleExportCsv}
              onExportFec={handleExportFec}
            />
          </div>
        )}

        {activeTab === 'ORGANIGRAMME' && (
          <GroupOrgChartView
            companies={companies}
            shareholders={shareholders}
            stakes={stakes}
            transactions={transactions}
            onSaveShareholder={handleSaveShareholder}
            onDeleteShareholder={handleDeleteShareholder}
            onSaveStake={handleSaveStake}
            onDeleteStake={handleDeleteStake}
            onUpdateCompanyCapital={handleUpdateCompanyCapital}
            onShowToast={showToast}
            onReorderCompanies={handleReorderCompanies}
            onReorderShareholders={handleReorderShareholders}
            groupLogoUrl={groupLogoUrl}
          />
        )}

        {activeTab === 'CASHFLOW' && (
          <div className="space-y-6">
            <CashFlowDashboard
              companies={companies}
              transactions={transactions}
              selectedCompanyId={selectedCompanyId}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </div>
        )}

        {activeTab === 'VAT' && (
          <div className="space-y-6">
            <VatTaxControl
              companies={companies}
              transactions={transactions}
              selectedCompanyId={selectedCompanyId}
            />
          </div>
        )}

        {activeTab === 'CCA' && (
          <div className="space-y-6">
            <CurrentAccountTracker
              companies={companies}
              transactions={transactions}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          </div>
        )}

        {activeTab === 'DRIVE' && (
          <div className="space-y-6">
            <DriveFolderView
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              driveConfig={driveConfig}
              token={token}
              onAddTransaction={handleAddTransaction}
              onShowToast={showToast}
              onOpenUploadModal={() => setIsUploadOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Upload Modal */}
      <InvoiceUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onAddTransaction={handleAddTransaction}
        token={token}
        onConnectDrive={handleConnectDrive}
        driveConfig={driveConfig}
      />

      {/* Drive Settings Modal */}
      <DriveSettingsModal
        isOpen={isDriveSettingsOpen}
        onClose={() => setIsDriveSettingsOpen(false)}
        token={token}
        onConnectDrive={handleConnectDrive}
        companies={companies}
        driveConfig={driveConfig}
        onSaveConfig={setDriveConfig}
      />

      {/* Company Manager Modal */}
      <CompanyManagerModal
        isOpen={isCompanyManagerOpen}
        onClose={() => setIsCompanyManagerOpen(false)}
        companies={companies}
        onSaveCompany={handleSaveCompany}
        onDeleteCompany={handleDeleteCompany}
        onReorderCompanies={handleReorderCompanies}
      />

      {/* Access Control & Hosting Guide Modal */}
      <AccessControlModal
        isOpen={isAccessControlOpen}
        onClose={() => setIsAccessControlOpen(false)}
        accessConfig={accessControl}
        onSaveConfig={setAccessControl}
        currentUser={user}
      />

      {/* Drive Explorer for the User's Sorted Folder */}
      <DriveExplorerModal
        isOpen={isDriveExplorerOpen}
        onClose={() => setIsDriveExplorerOpen(false)}
        token={token}
        onConnectDrive={handleConnectDrive}
        driveConfig={driveConfig}
        companies={companies}
        onAddTransaction={handleAddTransaction}
        onShowToast={showToast}
      />

      {/* Logo Manager Modal */}
      <LogoManagerModal
        isOpen={isLogoManagerOpen}
        onClose={() => setIsLogoManagerOpen(false)}
        currentLogoUrl={groupLogoUrl}
        onSaveLogo={handleSaveLogo}
        onShowToast={showToast}
      />

      {/* Quick Setup 3 companies Modal */}
      <QuickSetupModal
        isOpen={isQuickSetupOpen}
        onClose={() => setIsQuickSetupOpen(false)}
        companies={companies}
        onSaveCompanies={setCompanies}
        accessConfig={accessControl}
        onSaveAccessConfig={setAccessControl}
        driveConfig={driveConfig}
        onResetLedger={handleResetLedger}
        onShowToast={showToast}
      />

      {/* Native Smartphone Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        transactionsCount={transactions.length}
        onOpenDriveExplorer={() => setIsDriveExplorerOpen(true)}
        onOpenAccessControl={() => setIsAccessControlOpen(true)}
        onExportFec={handleExportFec}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcelWorkbook}
      />
    </div>
  );
}

