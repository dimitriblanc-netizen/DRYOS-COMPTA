import React, { useState } from 'react';
import { Company, DriveConfig } from '../types';
import { 
  Building2, 
  Layers, 
  UploadCloud, 
  HardDrive, 
  FileSpreadsheet, 
  Settings2, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  RefreshCw,
  Plus,
  ShieldCheck,
  FolderSearch,
  Sparkles,
  Lock,
  Share2,
  Network,
  Image as ImageIcon
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  companies: Company[];
  selectedCompanyId: string | null; // null = Consolidé Groupe
  onSelectCompany: (id: string | null) => void;
  user: User | null;
  token: string | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenUpload: () => void;
  onOpenDriveSettings: () => void;
  onOpenCompanyManager: () => void;
  onOpenDriveExplorer: () => void;
  onOpenAccessControl: () => void;
  onOpenQuickSetup: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onOpenOrganigramme: () => void;
  onOpenLogoManager: () => void;
  groupLogoUrl?: string | null;
  driveConfig: DriveConfig;
  isCloudConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
  user,
  token,
  isLoggingIn,
  onLogin,
  onLogout,
  onOpenUpload,
  onOpenDriveSettings,
  onOpenCompanyManager,
  onOpenDriveExplorer,
  onOpenAccessControl,
  onOpenQuickSetup,
  onExportCsv,
  onExportExcel,
  onOpenOrganigramme,
  onOpenLogoManager,
  groupLogoUrl,
  driveConfig,
  isCloudConnected = true,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Multi-entity Switcher */}
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <div 
                onClick={onOpenLogoManager}
                className="relative group cursor-pointer"
                title="Cliquer pour importer ou changer le logo"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 p-1 flex items-center justify-center shadow-xs border border-slate-800 flex-shrink-0 overflow-hidden">
                  {groupLogoUrl ? (
                    <img src={groupLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 text-slate-200" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-white text-[8px] flex items-center justify-center shadow-xs border border-white opacity-80 group-hover:opacity-100 font-bold">
                  ✎
                </div>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">Compta</span>
              </div>
            </div>

            {/* Entity switcher tabs */}
            <div className="hidden xl:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {companies.length === 0 ? (
                <button
                  onClick={onOpenCompanyManager}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Créer ma 1ère société</span>
                </button>
              ) : (
                <>
                  <button
                    id="btn-consolidated-view"
                    onClick={() => onSelectCompany(null)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedCompanyId === null
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-700" />
                    <span>Consolidé</span>
                    <span className="ml-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
                      {companies.length}
                    </span>
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  <div className="flex items-center gap-1">
                    {companies.map((comp) => {
                      const isSelected = selectedCompanyId === comp.id;
                      return (
                        <button
                          key={comp.id}
                          id={`btn-company-select-${comp.id}`}
                          onClick={() => onSelectCompany(comp.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-slate-900 shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: comp.color }}
                          />
                          <span className="truncate max-w-[120px]">{comp.name}</span>
                        </button>
                      );
                    })}

                    <button
                      onClick={onOpenCompanyManager}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-0.5 cursor-pointer"
                      title="Gérer les sociétés"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Actions: Organigramme, Excel Export, Drive Explorer, Upload, User */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Organigramme & Actionnariat Button */}
            <button
              id="btn-organigramme-nav"
              onClick={onOpenOrganigramme}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer min-h-[36px]"
              title="Consulter l'organigramme du groupe et gérer les actionnaires"
            >
              <Network className="w-4 h-4 text-indigo-700" />
              <span className="hidden md:inline">Organigramme & Associés</span>
            </button>

            {/* Beautiful Excel Export Button */}
            <button
              id="btn-header-export-excel"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-2xs transition-all cursor-pointer min-h-[36px]"
              title="Exporter un classeur Excel complet (.xlsx) avec synthèse, grand livre, TVA et actionnariat"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Direct access to sorted Drive folder */}
            <button
              id="btn-drive-explorer-nav"
              onClick={onOpenDriveExplorer}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer min-h-[36px]"
              title="Explorer votre dossier Google Drive déjà trié"
            >
              <FolderSearch className="w-4 h-4 text-indigo-600" />
              <span>Dossier Drive</span>
            </button>

            {/* Access & Security Button */}
            <button
              id="btn-access-control-nav"
              onClick={onOpenAccessControl}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px]"
              title="Contrôle d'accès & Associés autorisés (Sécurité Dryos)"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Accès</span>
            </button>

            {/* Quick Upload Invoice Button */}
            <button
              id="btn-header-upload-invoice"
              onClick={onOpenUpload}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-xs transition-all cursor-pointer min-h-[36px]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Déposer facture</span>
            </button>

            {/* Export CSV button */}
            <button
              id="btn-header-export"
              onClick={onExportCsv}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              title="Exporter le journal comptable au format CSV / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Export FEC</span>
            </button>

            {/* User Profile / Login */}
            {user ? (
              <div className="relative">
                <button
                  id="btn-user-avatar"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-300 transition-all cursor-pointer"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Utilisateur'}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {user.displayName || 'Compte Google'}
                      </p>
                      <p className="text-xs text-slate-600 truncate font-mono">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenDriveExplorer();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <FolderSearch className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Dossier Drive Trié (1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-)</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenAccessControl();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Accès Restreint & Hébergement</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenQuickSetup();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Configuration Simple des Sociétés</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenDriveSettings();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                      <span>Paramètres du Google Drive</span>
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-drive-direct"
                onClick={onOpenDriveExplorer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                title="Google Drive directement connecté (1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-)"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Drive Groupe Connecté</span>
                <span className="sm:hidden">Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile entity tabs */}
        <div className="flex xl:hidden items-center overflow-x-auto py-2 gap-2 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => onSelectCompany(null)}
            className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap font-bold transition-all min-h-[36px] cursor-pointer flex items-center gap-1.5 ${
              selectedCompanyId === null
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Consolidé Groupe</span>
          </button>
          {companies.map((comp) => (
            <button
              key={comp.id}
              onClick={() => onSelectCompany(comp.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap font-semibold transition-all min-h-[36px] cursor-pointer ${
                selectedCompanyId === comp.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: comp.color }} />
              <span>{comp.name}</span>
            </button>
          ))}
          <button
            onClick={onOpenCompanyManager}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center bg-slate-100 cursor-pointer"
            title="Gérer les sociétés"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
