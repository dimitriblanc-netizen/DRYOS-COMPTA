import React, { useState } from 'react';
import { Company, VatRegime, TaxRegime, VAT_REGIME_LABELS, formatEuro } from '../types';
import { 
  X, 
  Building2, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle,
  Landmark,
  Receipt,
  PiggyBank,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface CompanyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onSaveCompany: (company: Company) => void;
  onDeleteCompany: (companyId: string) => void;
  onReorderCompanies?: (newOrder: Company[]) => void;
}

export const CompanyManagerModal: React.FC<CompanyManagerModalProps> = ({
  isOpen,
  onClose,
  companies,
  onSaveCompany,
  onDeleteCompany,
  onReorderCompanies,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [legalForm, setLegalForm] = useState('SAS');
  const [siren, setSiren] = useState('');
  const [vatRegime, setVatRegime] = useState<VatRegime>('ASSUJETTI_NORMAL');
  const [taxRegime, setTaxRegime] = useState<TaxRegime>('IS');
  const [initialCash, setInitialCash] = useState<number | ''>(0);
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [fiscalClosingMonth, setFiscalClosingMonth] = useState<number>(12);
  const [color, setColor] = useState('#4f46e5');
  const [contactEmail, setContactEmail] = useState('');
  const [shareCapital, setShareCapital] = useState<number>(10000);
  const [totalShares, setTotalShares] = useState<number>(1000);
  const [shareNominalValue, setShareNominalValue] = useState<number>(10);
  const [presidentOrManager, setPresidentOrManager] = useState('');
  const [descriptionRole, setDescriptionRole] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setName('');
    setLegalForm('SAS');
    setSiren('');
    setVatRegime('ASSUJETTI_NORMAL');
    setTaxRegime('IS');
    setInitialCash(0);
    setBankName('');
    setIban('');
    setFiscalClosingMonth(12);
    setColor('#4f46e5');
    setContactEmail('');
    setShareCapital(10000);
    setTotalShares(1000);
    setShareNominalValue(10);
    setPresidentOrManager('');
    setDescriptionRole('');
  };

  const startEdit = (comp: Company) => {
    setEditingId(comp.id);
    setIsCreating(false);
    setName(comp.name);
    setLegalForm(comp.legalForm);
    setSiren(comp.siren);
    setVatRegime(comp.vatRegime || 'ASSUJETTI_NORMAL');
    setTaxRegime(comp.taxRegime || 'IS');
    setInitialCash(comp.initialCash ?? 0);
    setBankName(comp.bankName || '');
    setIban(comp.iban || '');
    setFiscalClosingMonth(comp.fiscalClosingMonth || 12);
    setColor(comp.color);
    setContactEmail(comp.contactEmail || '');
    setShareCapital(comp.shareCapital || 10000);
    setTotalShares(comp.totalShares || 1000);
    setShareNominalValue(comp.shareNominalValue || 10);
    setPresidentOrManager(comp.presidentOrManager || '');
    setDescriptionRole(comp.descriptionRole || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const companyToSave: Company = {
      id: editingId || `comp-${Date.now()}`,
      name: name.trim(),
      legalForm: legalForm.trim(),
      siren: siren.trim() || 'Non renseigné',
      vatRegime: vatRegime,
      taxRegime: taxRegime,
      initialCash: typeof initialCash === 'number' ? initialCash : 0,
      bankName: bankName.trim() || undefined,
      iban: iban.trim() || undefined,
      fiscalClosingMonth: Number(fiscalClosingMonth) || 12,
      color: color || '#4f46e5',
      currency: 'EUR',
      fiscalYear: 2026,
      contactEmail: contactEmail.trim() || undefined,
      shareCapital: Number(shareCapital) || 10000,
      totalShares: Number(totalShares) || 1000,
      shareNominalValue: Number(shareNominalValue) || 10,
      presidentOrManager: presidentOrManager.trim() || undefined,
      descriptionRole: descriptionRole.trim() || undefined,
    };

    onSaveCompany(companyToSave);
    setIsCreating(false);
    setEditingId(null);
  };

  const confirmDelete = (id: string) => {
    onDeleteCompany(id);
    setDeleteConfirmId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || !onReorderCompanies) return;
    const newCompanies = [...companies];
    const temp = newCompanies[index];
    newCompanies[index] = newCompanies[index - 1];
    newCompanies[index - 1] = temp;
    onReorderCompanies(newCompanies);
  };

  const handleMoveDown = (index: number) => {
    if (index === companies.length - 1 || !onReorderCompanies) return;
    const newCompanies = [...companies];
    const temp = newCompanies[index];
    newCompanies[index] = newCompanies[index + 1];
    newCompanies[index + 1] = temp;
    onReorderCompanies(newCompanies);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Périmètre Sociétés & Régimes Fiscaux
              </h2>
              <p className="text-xs text-slate-500">
                Configuration des entités, régime TVA, trésorerie de départ et comptes bancaires
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

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Create or Edit Form */}
          {(isCreating || editingId) ? (
            <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-900">
                  {isCreating ? 'Nouvelle structure juridique' : 'Paramètres de l\'entité'}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {isCreating ? 'Nouveau dossier' : editingId}
                </span>
              </div>

              {/* Ligne 1 : Dénomination & Forme */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Dénomination sociale *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Holding Dryos, SCI Montaigne, Sas Digital..."
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Forme juridique
                  </label>
                  <select
                    value={legalForm}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLegalForm(val);
                      // Auto-switch TVA recommendation for SCI
                      if (val === 'SCI' && vatRegime === 'ASSUJETTI_NORMAL') {
                        setVatRegime('FRANCHISE_BASE');
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                  >
                    <option value="SAS">SAS (Société par actions simplifiée)</option>
                    <option value="SASU">SASU</option>
                    <option value="SARL">SARL</option>
                    <option value="EURL">EURL</option>
                    <option value="SCI">SCI (Société Civile Immobilière)</option>
                    <option value="Holding">Holding</option>
                    <option value="SA">SA</option>
                    <option value="Micro">Micro-entreprise / Auto-entrepreneur</option>
                  </select>
                </div>
              </div>

              {/* Ligne 2 : Régime TVA & Fiscalité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Régime de TVA *</span>
                  </label>
                  <select
                    value={vatRegime}
                    onChange={(e) => setVatRegime(e.target.value as VatRegime)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none"
                  >
                    <option value="ASSUJETTI_NORMAL">Assujetti TVA - Réel Normal (CA3)</option>
                    <option value="ASSUJETTI_SIMPLIFIE">Assujetti TVA - Réel Simplifié (CA12)</option>
                    <option value="FRANCHISE_BASE">Franchise en base / Non assujetti (Art. 293 B CGI)</option>
                    <option value="EXONERE_SPECIFIQUE">Exonéré de TVA spécifique (Location nue...)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {VAT_REGIME_LABELS[vatRegime]?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Régime fiscal & Clôture</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={taxRegime}
                      onChange={(e) => setTaxRegime(e.target.value as TaxRegime)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none"
                    >
                      <option value="IS">IS (Impôt Sociétés)</option>
                      <option value="IR">IR (Transparence / Revenu)</option>
                    </select>

                    <select
                      value={fiscalClosingMonth}
                      onChange={(e) => setFiscalClosingMonth(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none"
                    >
                      <option value={12}>Clôture 31/12</option>
                      <option value={3}>Clôture 31/03</option>
                      <option value={6}>Clôture 30/06</option>
                      <option value={9}>Clôture 30/09</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Exercice fiscal et calendrier des déclarations.
                  </p>
                </div>
              </div>

              {/* Ligne 3 : Trésorerie d'ouverture & Banque */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Trésorerie de départ (€)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialCash}
                    onChange={(e) => setInitialCash(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Solde bancaire actuel de départ</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Banque principale
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Qonto, BNP, Shine..."
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    SIREN
                  </label>
                  <input
                    type="text"
                    value={siren}
                    onChange={(e) => setSiren(e.target.value)}
                    placeholder="Ex: 892 412 101"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Ligne 4 : IBAN, Email et Couleur */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    IBAN / Coordonnées bancaires
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Couleur
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-600">{color}</span>
                  </div>
                </div>
              </div>

              {/* Ligne 5 : Capital Social, Parts & Valeur Nominale (Organigramme) */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <span className="text-xs font-bold text-indigo-950 block">
                  Capital Social & Gouvernance (Organigramme Groupe)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Capital Social Total (€)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={shareCapital}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setShareCapital(val);
                        if (shareNominalValue > 0) {
                          setTotalShares(Math.round(val / shareNominalValue));
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Nombre d'actions / parts
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={totalShares}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTotalShares(val);
                        if (val > 0) {
                          setShareNominalValue(Number((shareCapital / val).toFixed(2)));
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Valeur nominale (€ / part)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={shareNominalValue}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setShareNominalValue(val);
                        if (val > 0) {
                          setTotalShares(Math.round(shareCapital / val));
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Présidence / Gérance
                    </label>
                    <input
                      type="text"
                      value={presidentOrManager}
                      onChange={(e) => setPresidentOrManager(e.target.value)}
                      placeholder="Ex: Dimitri Blanc (Président)"
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Rôle / Activité
                    </label>
                    <input
                      type="text"
                      value={descriptionRole}
                      onChange={(e) => setDescriptionRole(e.target.value)}
                      placeholder="Ex: Filiale opérationnelle, Société Mère..."
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Enregistrer l'entité
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Entités configurées ({companies.length})
              </span>
              <button
                onClick={startCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une société</span>
              </button>
            </div>
          )}

          {/* Companies List */}
          <div className="space-y-2.5">
            {companies.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Aucune société enregistrée</p>
                <p className="text-[11px] text-slate-500 mt-1">Créez votre première société pour commencer vos suivis.</p>
                <button
                  onClick={startCreate}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer une société</span>
                </button>
              </div>
            ) : (
              companies.map((comp, idx) => {
                const vatInfo = VAT_REGIME_LABELS[comp.vatRegime || 'ASSUJETTI_NORMAL'];
                return (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: comp.color }}
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{comp.name}</h4>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200">
                            {comp.legalForm}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${vatInfo.badgeColor}`}>
                            {vatInfo.short}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-50 text-[10px] font-semibold text-slate-600 border border-slate-200">
                            {comp.taxRegime || 'IS'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>SIREN: {comp.siren}</span>
                          <span>•</span>
                          <span>Tréso départ: {formatEuro(comp.initialCash || 0)}</span>
                          {comp.bankName && (
                            <>
                              <span>•</span>
                              <span>Banque: {comp.bankName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center">
                      {onReorderCompanies && (
                        <div className="flex items-center gap-0.5 mr-1 border-r border-slate-200 pr-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Déplacer vers le haut"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === companies.length - 1}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Déplacer vers le bas"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(comp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(comp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Supprimer la société"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Confirmation dialog for deleting company */}
          {deleteConfirmId && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Supprimer cette société ?</span>
              </div>
              <p className="text-xs text-rose-700">
                Attention : la suppression retirera cette entité et ses données associées de la consolidation.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1 rounded-lg text-xs bg-white text-slate-700 border border-slate-200"
                >
                  Annuler
                </button>
                <button
                  onClick={() => confirmDelete(deleteConfirmId)}
                  className="px-3 py-1 rounded-lg text-xs bg-rose-600 text-white font-semibold"
                >
                  Confirmer suppression
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
