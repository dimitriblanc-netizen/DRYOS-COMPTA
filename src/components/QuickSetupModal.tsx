import React, { useState } from 'react';
import { Company, AccessControlConfig, DriveConfig } from '../types';
import { 
  X, 
  Sparkles, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  HardDrive, 
  ExternalLink,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onSaveCompanies: (companies: Company[]) => void;
  accessConfig: AccessControlConfig;
  onSaveAccessConfig: (config: AccessControlConfig) => void;
  driveConfig: DriveConfig;
  onResetLedger: (keepDemoData: boolean) => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  companies,
  onSaveCompanies,
  accessConfig,
  onSaveAccessConfig,
  driveConfig,
  onResetLedger,
  onShowToast,
}) => {
  // Find or default 3 entities:
  const holding = companies.find((c) => c.id === 'holding-sas') || companies[0] || {
    id: 'holding-sas',
    name: 'Holding SAS',
    legalForm: 'SAS',
    siren: '',
    color: '#4f46e5',
    currency: 'EUR',
    fiscalYear: 2026,
    contactEmail: 'dimitri.blanc@dryos.fr',
  };

  const immo = companies.find((c) => c.id === 'immo-sas') || companies[1] || {
    id: 'immo-sas',
    name: 'Société Immo SAS',
    legalForm: 'SAS',
    siren: '',
    color: '#059669',
    currency: 'EUR',
    fiscalYear: 2026,
    contactEmail: 'dimitri.blanc@dryos.fr',
  };

  const sci = companies.find((c) => c.id === 'sci') || companies[2] || {
    id: 'sci',
    name: 'SCI',
    legalForm: 'SCI',
    siren: '',
    color: '#d97706',
    currency: 'EUR',
    fiscalYear: 2026,
    contactEmail: 'dimitri.blanc@dryos.fr',
  };

  const [holdingName, setHoldingName] = useState(holding.name);
  const [holdingSiren, setHoldingSiren] = useState(holding.siren === 'À renseigner' ? '' : holding.siren);

  const [immoName, setImmoName] = useState(immo.name);
  const [immoSiren, setImmoSiren] = useState(immo.siren === 'À renseigner' ? '' : immo.siren);

  const [sciName, setSciName] = useState(sci.name);
  const [sciSiren, setSciSiren] = useState(sci.siren === 'À renseigner' ? '' : sci.siren);

  const [associateEmail, setAssociateEmail] = useState('');
  const [emptyLedger, setEmptyLedger] = useState(true);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedCompanies: Company[] = [
      {
        ...holding,
        id: 'holding-sas',
        name: holdingName.trim() || 'Holding SAS',
        legalForm: 'SAS',
        siren: holdingSiren.trim() || 'Non renseigné',
        color: '#4f46e5',
      },
      {
        ...immo,
        id: 'immo-sas',
        name: immoName.trim() || 'Société Immo SAS',
        legalForm: 'SAS',
        siren: immoSiren.trim() || 'Non renseigné',
        color: '#059669',
      },
      {
        ...sci,
        id: 'sci',
        name: sciName.trim() || 'SCI',
        legalForm: 'SCI',
        siren: sciSiren.trim() || 'Non renseigné',
        color: '#d97706',
      },
    ];

    onSaveCompanies(updatedCompanies);

    // Save Access Config
    const cleanAssociate = associateEmail.trim().toLowerCase();
    const authorized = [...accessConfig.authorizedEmails];
    if (cleanAssociate && !authorized.some((e) => e.toLowerCase() === cleanAssociate)) {
      authorized.push(cleanAssociate);
    }
    onSaveAccessConfig({
      ...accessConfig,
      authorizedEmails: authorized,
    });

    // Reset ledger if chosen
    if (emptyLedger) {
      onResetLedger(false);
    }

    onShowToast('Vos 3 sociétés et vos accès ont été configurés avec succès !', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Configuration Simple du Groupe
              </h2>
              <p className="text-xs text-slate-600">
                Configurez vos 3 entités réelles et l'accès sécurisé à la base Dryos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="p-6 space-y-5">
          {/* Company 1: Holding SAS */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">1. Holding (SAS)</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Maison Mère
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nom exact de votre Holding
                </label>
                <input
                  type="text"
                  value={holdingName}
                  onChange={(e) => setHoldingName(e.target.value)}
                  placeholder="Ex: Dryos Holding SAS"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Numéro SIREN
                </label>
                <input
                  type="text"
                  value={holdingSiren}
                  onChange={(e) => setHoldingSiren(e.target.value)}
                  placeholder="Ex: 892 412 101"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Company 2: Société Immo SAS */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900">2. Société Immobilière (SAS)</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Exploitation Immo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nom exact de votre société immo
                </label>
                <input
                  type="text"
                  value={immoName}
                  onChange={(e) => setImmoName(e.target.value)}
                  placeholder="Ex: Dryos Promotion Immo SAS"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Numéro SIREN
                </label>
                <input
                  type="text"
                  value={immoSiren}
                  onChange={(e) => setImmoSiren(e.target.value)}
                  placeholder="Ex: 914 832 450"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Company 3: SCI */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-600" />
                <h3 className="text-xs font-bold text-slate-900">3. SCI</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Patrimoine / SCI
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nom exact de votre SCI
                </label>
                <input
                  type="text"
                  value={sciName}
                  onChange={(e) => setSciName(e.target.value)}
                  placeholder="Ex: SCI Familiale Dryos"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Numéro SIREN
                </label>
                <input
                  type="text"
                  value={sciSiren}
                  onChange={(e) => setSciSiren(e.target.value)}
                  placeholder="Ex: 902 541 230"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Associate's Google Email */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              Inviter un compte Google associé (Optionnel)
            </label>
            <input
              type="email"
              value={associateEmail}
              onChange={(e) => setAssociateEmail(e.target.value)}
              placeholder="ex: associe@dryos.fr ou collaborateur@..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">
              Seuls votre compte (<span className="font-mono">dimitri.blanc@dryos.fr</span>) et les adresses autorisées pourront se connecter à la base Dryos.
            </p>
          </div>

          {/* Starting state choice: empty ledger vs demo */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emptyLedger}
                onChange={(e) => setEmptyLedger(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-xs font-bold text-slate-900">
                Démarrer avec un journal comptable vide (0 facture)
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pl-6">
              Recommandé : vous commencez avec un journal vierge prêt pour importer vos vraies factures depuis votre dossier Google Drive.
            </p>
          </div>

          {/* Google Drive Pre-configured folder reminder */}
          <div className="p-3.5 rounded-xl bg-slate-100 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Dossier Drive configuré : <strong>1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-</strong></span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Prêt
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer"
            >
              Enregistrer la configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
