import React, { useState } from 'react';
import { Company, Shareholder, ShareholdingStake, Transaction, formatEuro } from '../types';
import { 
  Network, 
  Users, 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ShieldCheck, 
  ArrowDown, 
  ArrowUp,
  ArrowLeftRight,
  Percent, 
  Coins, 
  Scale, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { exportConsolidatedExcel } from '../utils/excelExport';

interface GroupOrgChartViewProps {
  companies: Company[];
  shareholders: Shareholder[];
  stakes: ShareholdingStake[];
  transactions?: Transaction[];
  onSaveShareholder: (shareholder: Shareholder) => void;
  onDeleteShareholder: (shareholderId: string) => void;
  onSaveStake: (stake: ShareholdingStake) => void;
  onDeleteStake: (stakeId: string) => void;
  onUpdateCompanyCapital: (companyId: string, capital: number, totalShares: number, nominalValue: number) => void;
  onShowToast: (text: string, type?: 'success' | 'info') => void;
  onReorderCompanies?: (newCompanies: Company[]) => void;
  onReorderShareholders?: (newShareholders: Shareholder[]) => void;
  groupLogoUrl?: string | null;
}

export const GroupOrgChartView: React.FC<GroupOrgChartViewProps> = ({
  companies,
  shareholders,
  stakes,
  transactions = [],
  onSaveShareholder,
  onDeleteShareholder,
  onSaveStake,
  onDeleteStake,
  onUpdateCompanyCapital,
  onShowToast,
  onReorderCompanies,
  onReorderShareholders,
  groupLogoUrl,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'CHART' | 'TABLE' | 'COMPANIES'>('CHART');
  const [copiedText, setCopiedText] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Modals state
  const [isAddShareholderOpen, setIsAddShareholderOpen] = useState(false);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [isEditStakeOpen, setIsEditStakeOpen] = useState(false);
  const [editingStake, setEditingStake] = useState<ShareholdingStake | null>(null);
  const [isEditCapitalOpen, setIsEditCapitalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  // Shareholder Form
  const [shName, setShName] = useState('');
  const [shEmail, setShEmail] = useState('');
  const [shType, setShType] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
  const [shRole, setShRole] = useState('');
  const [shNotes, setShNotes] = useState('');
  const [shCorporateId, setShCorporateId] = useState('');

  // Stake Form
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [targetShareholderId, setTargetShareholderId] = useState('');
  const [sharesCount, setSharesCount] = useState<number>(0);
  const [ownershipPct, setOwnershipPct] = useState<number>(0);
  const [votingPct, setVotingPct] = useState<number>(0);

  // Capital Form
  const [capAmount, setCapAmount] = useState<number>(10000);
  const [capTotalShares, setCapTotalShares] = useState<number>(1000);
  const [capNominal, setCapNominal] = useState<number>(10);

  // Holding / Head company & subsidiaries (dynamic selection)
  const holdingCompany = (selectedParentId ? companies.find(c => c.id === selectedParentId) : null)
    || companies.find((c) => c.name.toLowerCase().includes('holding'))
    || companies[0];

  const subsidiaryCompanies = companies.filter((c) => c.id !== holdingCompany?.id);

  // Stakes in holding
  const holdingStakes = stakes.filter((s) => s.companyId === holdingCompany?.id);

  // Individual shareholders
  const individualShareholders = shareholders.filter((s) => s.type === 'INDIVIDUAL');

  const handleMoveSubsidiaryUp = (index: number) => {
    if (index === 0 || !onReorderCompanies) return;
    const newCompanies = [...companies];
    const sub1 = subsidiaryCompanies[index];
    const sub2 = subsidiaryCompanies[index - 1];
    const idx1 = newCompanies.findIndex(c => c.id === sub1.id);
    const idx2 = newCompanies.findIndex(c => c.id === sub2.id);
    if (idx1 !== -1 && idx2 !== -1) {
      newCompanies[idx1] = sub2;
      newCompanies[idx2] = sub1;
      onReorderCompanies(newCompanies);
    }
  };

  const handleMoveSubsidiaryDown = (index: number) => {
    if (index === subsidiaryCompanies.length - 1 || !onReorderCompanies) return;
    const newCompanies = [...companies];
    const sub1 = subsidiaryCompanies[index];
    const sub2 = subsidiaryCompanies[index + 1];
    const idx1 = newCompanies.findIndex(c => c.id === sub1.id);
    const idx2 = newCompanies.findIndex(c => c.id === sub2.id);
    if (idx1 !== -1 && idx2 !== -1) {
      newCompanies[idx1] = sub2;
      newCompanies[idx2] = sub1;
      onReorderCompanies(newCompanies);
    }
  };

  const handleMoveShareholderUp = (index: number) => {
    if (index === 0 || !onReorderShareholders) return;
    const newShareholders = [...shareholders];
    const sh1 = individualShareholders[index];
    const sh2 = individualShareholders[index - 1];
    const idx1 = newShareholders.findIndex(s => s.id === sh1.id);
    const idx2 = newShareholders.findIndex(s => s.id === sh2.id);
    if (idx1 !== -1 && idx2 !== -1) {
      newShareholders[idx1] = sh2;
      newShareholders[idx2] = sh1;
      onReorderShareholders(newShareholders);
    }
  };

  const handleMoveShareholderDown = (index: number) => {
    if (index === individualShareholders.length - 1 || !onReorderShareholders) return;
    const newShareholders = [...shareholders];
    const sh1 = individualShareholders[index];
    const sh2 = individualShareholders[index + 1];
    const idx1 = newShareholders.findIndex(s => s.id === sh1.id);
    const idx2 = newShareholders.findIndex(s => s.id === sh2.id);
    if (idx1 !== -1 && idx2 !== -1) {
      newShareholders[idx1] = sh2;
      newShareholders[idx2] = sh1;
      onReorderShareholders(newShareholders);
    }
  };

  const openAddShareholder = () => {
    setEditingShareholder(null);
    setShName('');
    setShEmail('');
    setShType('INDIVIDUAL');
    setShRole('Associé');
    setShNotes('');
    setShCorporateId('');
    setIsAddShareholderOpen(true);
  };

  const openEditShareholder = (sh: Shareholder) => {
    setEditingShareholder(sh);
    setShName(sh.name);
    setShEmail(sh.email || '');
    setShType(sh.type);
    setShRole(sh.role || '');
    setShNotes(sh.notes || '');
    setShCorporateId(sh.corporateCompanyId || '');
    setIsAddShareholderOpen(true);
  };

  const handleSaveShareholderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shName.trim()) return;

    const sh: Shareholder = {
      id: editingShareholder?.id || `sh-${Date.now()}`,
      name: shName.trim(),
      email: shEmail.trim() || undefined,
      type: shType,
      role: shRole.trim() || 'Associé',
      notes: shNotes.trim() || undefined,
      corporateCompanyId: shType === 'CORPORATE' ? (shCorporateId || undefined) : undefined,
    };

    onSaveShareholder(sh);
    setIsAddShareholderOpen(false);
    onShowToast(`Actionnaire ${sh.name} enregistré avec succès`, 'success');
  };

  const openEditStake = (stake: ShareholdingStake) => {
    setEditingStake(stake);
    setTargetCompanyId(stake.companyId);
    setTargetShareholderId(stake.shareholderId);
    setSharesCount(stake.sharesCount);
    setOwnershipPct(stake.ownershipPercentage);
    setVotingPct(stake.votingRightsPercentage ?? stake.ownershipPercentage);
    setIsEditStakeOpen(true);
  };

  const openAddStake = (companyId?: string) => {
    setEditingStake(null);
    setTargetCompanyId(companyId || companies[0]?.id || '');
    setTargetShareholderId(shareholders[0]?.id || '');
    setSharesCount(100);
    setOwnershipPct(10);
    setVotingPct(10);
    setIsEditStakeOpen(true);
  };

  const handleSaveStakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompanyId || !targetShareholderId) return;

    const comp = companies.find((c) => c.id === targetCompanyId);
    const nominalAmount = sharesCount * (comp?.shareNominalValue || 10);

    const stake: ShareholdingStake = {
      id: editingStake?.id || `stake-${Date.now()}`,
      companyId: targetCompanyId,
      shareholderId: targetShareholderId,
      sharesCount: Number(sharesCount) || 0,
      ownershipPercentage: Number(ownershipPct) || 0,
      votingRightsPercentage: Number(votingPct) || Number(ownershipPct) || 0,
      nominalAmount,
    };

    onSaveStake(stake);
    setIsEditStakeOpen(false);
    onShowToast('Participation mise à jour', 'success');
  };

  const openEditCapital = (company: Company) => {
    setEditingCompanyId(company.id);
    setCapAmount(company.shareCapital || 10000);
    setCapTotalShares(company.totalShares || 1000);
    setCapNominal(company.shareNominalValue || 10);
    setIsEditCapitalOpen(true);
  };

  const handleSaveCapitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanyId) return;

    onUpdateCompanyCapital(editingCompanyId, capAmount, capTotalShares, capNominal);
    setIsEditCapitalOpen(false);
    onShowToast('Capital social mis à jour', 'success');
  };

  // Copier le résumé juridique du groupe
  const handleCopyLegalSummary = () => {
    const summary = [
      `ORGANIGRAMME ET STRUCTURE DU CAPITAL`,
      `Date : ${new Date().toLocaleDateString('fr-FR')}`,
      ``,
      `1. SOCIÉTÉ DE TÊTE :`,
      `- ${holdingCompany?.name} (${holdingCompany?.legalForm}), SIREN ${holdingCompany?.siren}`,
      `  Capital social : ${formatEuro(holdingCompany?.shareCapital || 0)} (${holdingCompany?.totalShares || 0} actions/parts)`,
      `  Direction : ${holdingCompany?.presidentOrManager || 'Direction'}`,
      `  Actionnaires :`,
      ...holdingStakes.map((s) => {
        const sh = shareholders.find((item) => item.id === s.shareholderId);
        return `    * ${sh?.name} : ${s.ownershipPercentage}% (${s.sharesCount} actions, ${formatEuro(s.nominalAmount || 0)})`;
      }),
      ``,
      `2. FILIALES ET PARTICIPATIONS :`,
      ...subsidiaryCompanies.flatMap((comp) => {
        const compStakes = stakes.filter((s) => s.companyId === comp.id);
        return [
          `- ${comp.name} (${comp.legalForm}), SIREN ${comp.siren}`,
          `  Capital : ${formatEuro(comp.shareCapital || 0)} (${comp.totalShares || 0} parts/actions)`,
          `  Rôle / Activité : ${comp.descriptionRole || 'Filiale'}`,
          `  Détention du capital :`,
          ...compStakes.map((s) => {
            const sh = shareholders.find((item) => item.id === s.shareholderId);
            return `    * ${sh?.name} : ${s.ownershipPercentage}% (${s.sharesCount} parts/actions)`;
          }),
          ``,
        ];
      }),
    ].join('\n');

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
    onShowToast('Synthèse juridique copiée dans le presse-papier !', 'info');
  };

  // Imprimer l'organigramme
  const handlePrint = () => {
    window.print();
  };

  // Export Excel
  const handleExportExcel = () => {
    exportConsolidatedExcel({
      companies,
      transactions,
      shareholders,
      stakes,
    });
    onShowToast('Classeur Excel exporté avec succès !', 'success');
  };

  return (
    <div className="space-y-6" id="group-orgchart-view">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-800">
            {groupLogoUrl ? (
              <img src={groupLogoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Network className="w-6 h-6 text-slate-200" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Organigramme & Structure du Capital
              </h1>
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
                {companies.length} Sociétés • {shareholders.length} Associés
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {companies.length > 0 ? companies.map(c => c.name).join(' • ') : 'Aucune société configurée'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Subtabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveSubTab('CHART')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'CHART' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Arborescence Visuelle
            </button>
            <button
              onClick={() => setActiveSubTab('TABLE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'TABLE' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Matrice de Détention
            </button>
            <button
              onClick={() => setActiveSubTab('COMPANIES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'COMPANIES' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Capitaux Sociaux
            </button>
          </div>

          <button
            onClick={openAddShareholder}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvel Associé</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            title="Exporter l'organigramme et les participations au format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Imprimer / Sortir l'organigramme (PDF/A4)"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyLegalSummary}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Copier la synthèse juridique"
          >
            {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* VIEW 1 : VISUAL CHART (ARBORESCENCE CAPITALISTIQUE) */}
      {activeSubTab === 'CHART' && (
        <div className="bg-gradient-to-b from-slate-50/80 to-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-10">
          
          {/* LEVEL 1 : ACTIONNAIRES PERSONNES PHYSIQUES */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                Niveau 1 : Associés & Actionnaires
              </span>
            </div>

            <div className="flex justify-center items-stretch gap-4 sm:gap-6 flex-wrap max-w-4xl mx-auto">
              {individualShareholders.map((sh, idx) => {
                // Participations of this shareholder in holding
                const stakeInHolding = stakes.find(
                  (s) => s.shareholderId === sh.id && s.companyId === holdingCompany?.id
                );
                // Participations in other companies
                const otherStakes = stakes.filter(
                  (s) => s.shareholderId === sh.id && s.companyId !== holdingCompany?.id
                );

                return (
                  <div
                    key={sh.id}
                    className="relative w-72 bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {sh.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{sh.name}</p>
                          <p className="text-[11px] text-slate-600 font-semibold">{sh.role || 'Associé'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {onReorderShareholders && (
                          <div className="flex items-center gap-0.5 mr-1 border-r border-slate-200 pr-1">
                            <button
                              onClick={() => handleMoveShareholderUp(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Déplacer vers la gauche"
                            >
                              <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
                            </button>
                            <button
                              onClick={() => handleMoveShareholderDown(idx)}
                              disabled={idx === individualShareholders.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Déplacer vers la droite"
                            >
                              <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => openEditShareholder(sh)}
                          className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                          title="Modifier l'associé"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteShareholder(sh.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Supprimer l'associé"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {sh.email && (
                      <p className="text-[11px] text-slate-500 font-mono mt-2 truncate">
                        {sh.email}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                      {stakeInHolding && (
                        <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span className="text-slate-700 font-medium text-[11px]">Dans {holdingCompany?.name} :</span>
                          <span className="font-bold text-slate-900">
                            {stakeInHolding.ownershipPercentage}% ({stakeInHolding.sharesCount} parts)
                          </span>
                        </div>
                      )}

                      {otherStakes.map((os) => {
                        const comp = companies.find((c) => c.id === os.companyId);
                        return (
                          <div key={os.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                            <span className="text-slate-700 font-medium text-[11px]">Dans {comp?.name} :</span>
                            <span className="font-bold text-slate-900">
                              {os.ownershipPercentage}% ({os.sharesCount} parts)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FLOW ARROW DOWN */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="h-6 w-0.5 bg-slate-300"></div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-700 shadow-2xs">
                <Percent className="w-3 h-3 text-slate-500" />
                <span>Détention du capital de la société principale</span>
              </div>
              <div className="h-6 w-0.5 bg-slate-300"></div>
              <ArrowDown className="w-4 h-4 text-slate-500 -mt-1" />
            </div>
          </div>

          {/* LEVEL 2 : SOCIÉTÉ PRINCIPALE / MÈRE */}
          <div className="max-w-xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                Niveau 2 : Société Principale / Tête de Groupe
              </span>
              {companies.length > 1 && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-500">Choisir :</span>
                  <select
                    value={holdingCompany?.id || ''}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="font-bold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer text-xs"
                    title="Sélectionner la société qui apparaît en tête d'organigramme"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.legalForm})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/15">
                    <Building2 className="w-6 h-6 text-slate-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold tracking-tight text-white">
                        {holdingCompany?.name || 'Société Principale'}
                      </h2>
                      <span className="text-[10px] bg-white/15 text-slate-200 px-2 py-0.5 rounded-md font-bold">
                        {holdingCompany?.legalForm || 'SAS'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      SIREN : <span className="font-mono">{holdingCompany?.siren || '-'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Capital Social
                  </span>
                  <p className="text-xl font-extrabold text-white">
                    {formatEuro(holdingCompany?.shareCapital || 0)}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {holdingCompany?.totalShares || 0} parts / actions de {formatEuro(holdingCompany?.shareNominalValue || 10)}
                  </p>
                </div>
              </div>

              {/* Holding Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Gouvernance</span>
                  <p className="font-bold text-white mt-0.5">{holdingCompany?.presidentOrManager || 'Direction'}</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">{holdingCompany?.descriptionRole || 'Société de tête'}</p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Actionnariat de tête</span>
                  <div className="mt-1 space-y-1">
                    {holdingStakes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Aucune part allouée</p>
                    ) : (
                      holdingStakes.map((s) => {
                        const sh = shareholders.find((item) => item.id === s.shareholderId);
                        return (
                          <div key={s.id} className="flex justify-between text-[11px]">
                            <span className="text-slate-200">{sh?.name} :</span>
                            <span className="font-bold text-white">{s.ownershipPercentage}% ({formatEuro(s.nominalAmount || 0)})</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-white/10">
                <button
                  onClick={() => openAddStake(holdingCompany?.id)}
                  className="text-xs font-semibold text-slate-300 hover:text-white underline cursor-pointer"
                >
                  + Gérer les parts
                </button>
                <button
                  onClick={() => holdingCompany && openEditCapital(holdingCompany)}
                  className="text-xs font-semibold text-slate-300 hover:text-white underline cursor-pointer"
                >
                  Modifier le capital
                </button>
              </div>
            </div>

            {/* FLOW ARROW DOWN TO SUBSIDIARIES */}
            <div className="flex flex-col items-center justify-center my-5">
              <div className="h-6 w-0.5 bg-slate-300"></div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full text-[10px] font-bold text-slate-700 shadow-2xs">
                <Network className="w-3 h-3 text-slate-600" />
                <span>Participations directes & filiales</span>
              </div>
              <div className="h-6 w-0.5 bg-slate-300"></div>
              <ArrowDown className="w-4 h-4 text-slate-500 -mt-1" />
            </div>
          </div>

          {/* LEVEL 3 : FILIALES & SOCIÉTÉS D'EXPLOITATION */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white px-3.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                Niveau 3 : Filiales & Participations
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {subsidiaryCompanies.map((comp, idx) => {
                const compStakes = stakes.filter((s) => s.companyId === comp.id);
                const holdingStake = compStakes.find((s) => {
                  const sh = shareholders.find((item) => item.id === s.shareholderId);
                  return sh?.type === 'CORPORATE' || s.shareholderId === `sh-${holdingCompany?.id}`;
                });

                return (
                  <div
                    key={comp.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs"
                          style={{ backgroundColor: comp.color || '#059669' }}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{comp.name}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {comp.legalForm}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            SIREN : <span className="font-mono font-medium">{comp.siren}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {onReorderCompanies && (
                          <div className="flex items-center gap-0.5 mr-1 border-r border-slate-200 pr-1">
                            <button
                              onClick={() => handleMoveSubsidiaryUp(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Déplacer vers la gauche"
                            >
                              <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
                            </button>
                            <button
                              onClick={() => handleMoveSubsidiaryDown(idx)}
                              disabled={idx === subsidiaryCompanies.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Déplacer vers la droite"
                            >
                              <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedParentId(comp.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                          title="Définir comme société de tête"
                        >
                          <ArrowUp className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => openEditCapital(comp)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                          title="Modifier le capital"
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 italic">
                      {comp.descriptionRole || 'Filiale'}
                    </p>

                    {/* Capital & Shares */}
                    <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Capital Social</span>
                        <span className="font-bold text-slate-900 text-sm">{formatEuro(comp.shareCapital || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Parts / Actions</span>
                        <span className="font-semibold text-slate-800">{comp.totalShares || 0} parts ({formatEuro(comp.shareNominalValue || 10)} / part)</span>
                      </div>
                    </div>

                    {/* Détention capitalistique */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                          Répartition du Capital & Contrôle :
                        </span>
                        <button
                          onClick={() => openAddStake(comp.id)}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer underline"
                        >
                          + Gérer les parts
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {compStakes.map((s) => {
                          const sh = shareholders.find((item) => item.id === s.shareholderId);
                          const isHoldingParent = sh?.type === 'CORPORATE' || s.shareholderId === `sh-${holdingCompany?.id}`;

                          return (
                            <div
                              key={s.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                isHoldingParent
                                  ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium'
                                  : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isHoldingParent ? 'bg-slate-900' : 'bg-emerald-600'}`} />
                                <span className="font-semibold">{sh?.name}</span>
                                <span className="text-[10px] text-slate-500">
                                  ({s.sharesCount} parts)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">
                                  {s.ownershipPercentage}%
                                </span>
                                <button
                                  onClick={() => openEditStake(s)}
                                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                  title="Modifier cette participation"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Control badge */}
                      {holdingStake && (
                        <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-600">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>
                            Contrôlée à <strong>{holdingStake.ownershipPercentage}%</strong> par {holdingCompany?.name || 'la société mère'}
                            {holdingStake.ownershipPercentage === 100 ? ' (Contrôle exclusif direct)' : ' (Contrôle majoritaire)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2 : COMPLETE SHAREHOLDING TABLE (MATRICE DE DÉTENTION) */}
      {activeSubTab === 'TABLE' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Table Complète de l'Actionnariat</h3>
              <p className="text-xs text-slate-500">
                Synthèse exhaustive des parts détenues, des pourcentages de capital et des droits de vote par entité.
              </p>
            </div>
            <button
              onClick={() => openAddStake()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attribuer des parts</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Société Cible</th>
                  <th className="py-3 px-4">Actionnaire / Associé</th>
                  <th className="py-3 px-4">Qualité</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4 text-right">Nb Parts / Actions</th>
                  <th className="py-3 px-4 text-right">% Capital</th>
                  <th className="py-3 px-4 text-right">% Droits de Vote</th>
                  <th className="py-3 px-4 text-right">Valeur Nominale</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stakes.map((stake) => {
                  const comp = companies.find((c) => c.id === stake.companyId);
                  const sh = shareholders.find((s) => s.id === stake.shareholderId);
                  const nominal = stake.nominalAmount || (stake.sharesCount * (comp?.shareNominalValue || 10));

                  return (
                    <tr key={stake.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: comp?.color || '#4f46e5' }}
                        />
                        <span>{comp?.name || stake.companyId}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {sh?.name || stake.shareholderId}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {sh?.type === 'CORPORATE' ? (
                          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                            Personne Morale
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            Personne Physique
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {sh?.role || 'Associé'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {stake.sharesCount.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {stake.ownershipPercentage.toFixed(2)} %
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {(stake.votingRightsPercentage ?? stake.ownershipPercentage).toFixed(2)} %
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {formatEuro(nominal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditStake(stake)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Modifier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteStake(stake.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3 : SOCIÉTÉS & CAPITAUX SOCIAUX */}
      {activeSubTab === 'COMPANIES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {companies.map((comp) => {
            const compStakes = stakes.filter((s) => s.companyId === comp.id);
            const totalAllocatedPct = compStakes.reduce((sum, s) => sum + s.ownershipPercentage, 0);
            const isBalanced = Math.abs(totalAllocatedPct - 100) < 0.1;

            return (
              <div
                key={comp.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: comp.color || '#4f46e5' }}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{comp.name}</h4>
                      <p className="text-xs text-slate-500">{comp.legalForm} • SIREN {comp.siren}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEditCapital(comp)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer"
                    title="Modifier le capital social"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capital Social :</span>
                    <span className="font-extrabold text-slate-900">{formatEuro(comp.shareCapital || 1000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nombre de parts :</span>
                    <span className="font-semibold text-slate-800">{comp.totalShares || 100} parts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valeur nominale :</span>
                    <span className="font-semibold text-slate-800">{formatEuro(comp.shareNominalValue || 10)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Total alloué :</span>
                    <span className={`font-bold ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {totalAllocatedPct.toFixed(1)} % {isBalanced ? '✓' : '(incomplet)'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                    Actionnaires ({compStakes.length})
                  </span>
                  <div className="space-y-1.5">
                    {compStakes.map((s) => {
                      const sh = shareholders.find((item) => item.id === s.shareholderId);
                      return (
                        <div key={s.id} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-700">{sh?.name}</span>
                          <span className="font-bold text-slate-900">{s.ownershipPercentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL : AJOUT / ÉDITION ACTIONNAIRE */}
      {isAddShareholderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {editingShareholder ? 'Modifier l\'Associé' : 'Ajouter un Associé / Actionnaire'}
            </h3>

            <form onSubmit={handleSaveShareholderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom complet ou Raison sociale *</label>
                <input
                  type="text"
                  required
                  value={shName}
                  onChange={(e) => setShName(e.target.value)}
                  placeholder="Ex: Nom Prénom ou Raison sociale"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type d'Associé</label>
                  <select
                    value={shType}
                    onChange={(e) => setShType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INDIVIDUAL">Personne Physique</option>
                    <option value="CORPORATE">Personne Morale (Société)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rôle / Mandat</label>
                  <input
                    type="text"
                    value={shRole}
                    onChange={(e) => setShRole(e.target.value)}
                    placeholder="Ex: Président, Gérant, Associé"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email de contact (Optionnel)</label>
                <input
                  type="email"
                  value={shEmail}
                  onChange={(e) => setShEmail(e.target.value)}
                  placeholder="ex: contact@societe.fr"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes ou remarques juridiques</label>
                <textarea
                  rows={2}
                  value={shNotes}
                  onChange={(e) => setShNotes(e.target.value)}
                  placeholder="Notes sur les statuts, pacte d'associés..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddShareholderOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : MODIFICATION DE PARTICIPATION / STAKE */}
      {isEditStakeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {editingStake ? 'Modifier la Participation' : 'Attribuer des Parts au Capital'}
            </h3>

            <form onSubmit={handleSaveStakeSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Société Cible *</label>
                <select
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.legalForm})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actionnaire / Associé détenteur *</label>
                <select
                  value={targetShareholderId}
                  onChange={(e) => setTargetShareholderId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  {shareholders.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role || s.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre d'actions/parts</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={sharesCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSharesCount(val);
                      const comp = companies.find((c) => c.id === targetCompanyId);
                      if (comp?.totalShares) {
                        const pct = Number(((val / comp.totalShares) * 100).toFixed(2));
                        setOwnershipPct(pct);
                        setVotingPct(pct);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">% Détention Capital</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    required
                    value={ownershipPct}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      setOwnershipPct(pct);
                      setVotingPct(pct);
                      const comp = companies.find((c) => c.id === targetCompanyId);
                      if (comp?.totalShares) {
                        setSharesCount(Math.round((pct / 100) * comp.totalShares));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">% Droits de Vote</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={votingPct}
                  onChange={(e) => setVotingPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditStakeOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : CAPITAL SOCIAL DE LA SOCIÉTÉ */}
      {isEditCapitalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Modifier le Capital Social
            </h3>

            <form onSubmit={handleSaveCapitalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Capital Social Total (€) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={capAmount}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    setCapAmount(amt);
                    if (capNominal > 0) {
                      setCapTotalShares(Math.round(amt / capNominal));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Total de Parts</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={capTotalShares}
                    onChange={(e) => {
                      const shares = Number(e.target.value);
                      setCapTotalShares(shares);
                      if (shares > 0) {
                        setCapNominal(Number((capAmount / shares).toFixed(2)));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valeur Nominale (€ / part)</label>
                  <input
                    type="number"
                    min={0.1}
                    step="0.01"
                    required
                    value={capNominal}
                    onChange={(e) => {
                      const nom = Number(e.target.value);
                      setCapNominal(nom);
                      if (nom > 0) {
                        setCapTotalShares(Math.round(capAmount / nom));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCapitalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
