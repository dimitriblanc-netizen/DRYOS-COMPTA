import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Camera, 
  Wallet, 
  Percent, 
  Users, 
  MoreHorizontal,
  FileSpreadsheet, 
  Plus, 
  ShieldCheck, 
  FolderSearch, 
  Sparkles,
  Network
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'OVERVIEW' | 'TRANSACTIONS' | 'CASHFLOW' | 'VAT' | 'CCA' | 'DRIVE' | 'ORGANIGRAMME';
  onChangeTab: (tab: 'OVERVIEW' | 'TRANSACTIONS' | 'CASHFLOW' | 'VAT' | 'CCA' | 'DRIVE' | 'ORGANIGRAMME') => void;
  onOpenUpload: () => void;
  transactionsCount: number;
  onOpenDriveExplorer: () => void;
  onOpenAccessControl: () => void;
  onExportFec: () => void;
  onExportCsv: () => void;
  onExportExcel?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenUpload,
  transactionsCount,
  onOpenDriveExplorer,
  onOpenAccessControl,
  onExportFec,
  onExportCsv,
  onExportExcel,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleTabClick = (tab: 'OVERVIEW' | 'TRANSACTIONS' | 'CASHFLOW' | 'VAT' | 'CCA' | 'DRIVE' | 'ORGANIGRAMME') => {
    onChangeTab(tab);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* More / Fiscalité & Outils Sheet */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-150"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl p-5 space-y-4 border-t border-slate-200 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Modules & Outils Rapides</h3>
              <button 
                onClick={() => setIsMoreMenuOpen(false)}
                className="text-xs text-slate-500 font-semibold p-1 hover:text-slate-800"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
              <button
                onClick={() => handleTabClick('ORGANIGRAMME')}
                className={`p-3 rounded-2xl border flex flex-col items-start gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'ORGANIGRAMME' 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Network className="w-4 h-4 text-indigo-600" />
                <span>Organigramme & Associés</span>
              </button>

              <button
                onClick={() => handleTabClick('VAT')}
                className={`p-3 rounded-2xl border flex flex-col items-start gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'VAT' 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Percent className="w-4 h-4 text-indigo-600" />
                <span>Contrôle TVA (CA3/CA12)</span>
              </button>

              <button
                onClick={() => handleTabClick('CCA')}
                className={`p-3 rounded-2xl border flex flex-col items-start gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'CCA' 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Comptes Associés (CCA)</span>
              </button>

              <button
                onClick={() => handleTabClick('DRIVE')}
                className={`p-3 rounded-2xl border flex flex-col items-start gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'DRIVE' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <FolderSearch className="w-4 h-4 text-emerald-600" />
                <span>Dossiers Google Drive</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              {onExportExcel && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onExportExcel();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onExportFec();
                }}
                className="py-2.5 px-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Export FEC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 md:hidden px-2 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] shadow-lg"
        id="mobile-bottom-nav"
      >
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* 1. Dashboard */}
          <button
            onClick={() => handleTabClick('OVERVIEW')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all flex-1 min-h-[48px] cursor-pointer ${
              activeTab === 'OVERVIEW' 
                ? 'text-indigo-600 font-bold' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 transition-transform ${activeTab === 'OVERVIEW' ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Dashboard</span>
          </button>

          {/* 2. Grand Livre */}
          <button
            onClick={() => handleTabClick('TRANSACTIONS')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all flex-1 min-h-[48px] relative cursor-pointer ${
              activeTab === 'TRANSACTIONS' 
                ? 'text-indigo-600 font-bold' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <Receipt className={`w-5 h-5 transition-transform ${activeTab === 'TRANSACTIONS' ? 'scale-110' : ''}`} />
              {transactionsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-indigo-600 text-white text-[8px] font-bold px-1 py-0.2 rounded-full min-w-3.5 text-center">
                  {transactionsCount > 99 ? '99+' : transactionsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Grand Livre</span>
          </button>

          {/* 3. Central Primary Action Button : Scanner / Déposer */}
          <div className="flex-1 flex justify-center -mt-4">
            <button
              onClick={onOpenUpload}
              className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer border-2 border-white"
              title="Prendre une photo ou déposer une facture"
              id="mobile-fab-scan"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {/* 4. Trésorerie */}
          <button
            onClick={() => handleTabClick('CASHFLOW')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all flex-1 min-h-[48px] cursor-pointer ${
              activeTab === 'CASHFLOW' 
                ? 'text-indigo-600 font-bold' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wallet className={`w-5 h-5 transition-transform ${activeTab === 'CASHFLOW' ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Trésorerie</span>
          </button>

          {/* 5. More (TVA, CCA, Outils) */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all flex-1 min-h-[48px] cursor-pointer ${
              activeTab === 'VAT' || activeTab === 'CCA'
                ? 'text-indigo-600 font-bold' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">
              {activeTab === 'VAT' ? 'TVA' : activeTab === 'CCA' ? 'CCA' : 'Plus'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
