import React, { useMemo, useState } from 'react';
import { Company, Transaction, formatEuro, VAT_REGIME_LABELS, VatRegime } from '../types';
import { 
  Receipt, 
  Landmark, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Scale,
  ArrowRight,
  Filter
} from 'lucide-react';

interface VatTaxControlProps {
  companies: Company[];
  transactions: Transaction[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string | null) => void;
}

export const VatTaxControl: React.FC<VatTaxControlProps> = ({
  companies,
  transactions,
  selectedCompanyId,
  onSelectCompany,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'CURRENT_MONTH' | 'CURRENT_QUARTER' | 'YEAR_TO_DATE'>('CURRENT_MONTH');

  // Filter companies based on selection
  const activeCompanies = useMemo(() => {
    if (selectedCompanyId) {
      return companies.filter((c) => c.id === selectedCompanyId);
    }
    return companies;
  }, [companies, selectedCompanyId]);

  // Compute VAT balances per company
  const vatMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    return activeCompanies.map((comp) => {
      const isSubjectToVAT = comp.vatRegime === 'ASSUJETTI_NORMAL' || comp.vatRegime === 'ASSUJETTI_SIMPLIFIE';
      const compTx = transactions.filter((t) => {
        if (t.companyId !== comp.id) return false;
        if (!t.issueDate) return true;

        const [tYear, tMonth] = t.issueDate.split('-');
        const txQuarter = Math.floor((parseInt(tMonth, 10) - 1) / 3) + 1;

        if (selectedPeriod === 'CURRENT_MONTH') {
          return tYear === String(currentYear) && tMonth === currentMonthStr;
        }
        if (selectedPeriod === 'CURRENT_QUARTER') {
          return tYear === String(currentYear) && txQuarter === currentQuarter;
        }
        if (selectedPeriod === 'YEAR_TO_DATE') {
          return tYear === String(currentYear);
        }
        return true;
      });

      let tvaCollected = 0; // On sales
      let tvaDeductible = 0; // On purchases

      if (isSubjectToVAT) {
        compTx.forEach((t) => {
          const tva = t.amountTVA || 0;
          if (t.type === 'INCOME') {
            tvaCollected += tva;
          } else if (t.type === 'EXPENSE') {
            tvaDeductible += tva;
          }
        });
      }

      const netVAT = tvaCollected - tvaDeductible; // > 0 = TVA à payer au Trésor, < 0 = Crédit de TVA

      // Check anomalies (e.g. non-VAT entity with VAT recorded)
      const anomalyNonVatWithTva = !isSubjectToVAT && compTx.some((t) => (t.amountTVA || 0) > 0);

      return {
        company: comp,
        isSubjectToVAT,
        regime: comp.vatRegime,
        tvaCollected,
        tvaDeductible,
        netVAT,
        isCredit: netVAT < 0,
        anomalyNonVatWithTva,
        txCount: compTx.length,
      };
    });
  }, [activeCompanies, transactions]);

  // Totals for VAT-subject companies
  const totalCollected = vatMetrics.filter((m) => m.isSubjectToVAT).reduce((sum, m) => sum + m.tvaCollected, 0);
  const totalDeductible = vatMetrics.filter((m) => m.isSubjectToVAT).reduce((sum, m) => sum + m.tvaDeductible, 0);
  const totalNetVAT = totalCollected - totalDeductible;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Contrôle TVA & Régimes Fiscaux</span>
          </h2>
          <p className="text-xs text-slate-500">
            Suivi de la TVA collectée / déductible et séparation stricte des sociétés assujetties et exonérées (Art. 293 B)
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setSelectedPeriod('CURRENT_MONTH')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              selectedPeriod === 'CURRENT_MONTH' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mois en cours
          </button>
          <button
            onClick={() => setSelectedPeriod('CURRENT_QUARTER')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              selectedPeriod === 'CURRENT_QUARTER' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Trimestre
          </button>
          <button
            onClick={() => setSelectedPeriod('YEAR_TO_DATE')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              selectedPeriod === 'YEAR_TO_DATE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cumul Annuel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>TVA Collectée (Sur factures clients)</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-mono text-emerald-600">
            {formatEuro(totalCollected)}
          </p>
          <p className="text-[11px] text-slate-500">
            Somme de la TVA perçue sur les ventes
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>TVA Déductible (Sur achats & charges)</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-mono text-blue-600">
            {formatEuro(totalDeductible)}
          </p>
          <p className="text-[11px] text-slate-500">
            TVA récupérable auprès de l'administration
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Solde Net TVA {totalNetVAT >= 0 ? '(À payer)' : '(Crédit)'}</span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <p className={`text-lg sm:text-xl font-bold font-mono ${totalNetVAT >= 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
            {formatEuro(Math.abs(totalNetVAT))}
          </p>
          <p className="text-[11px] text-slate-500">
            {totalNetVAT >= 0 ? 'Montant à reverser à la DGFIP' : 'Crédit de TVA reportable ou remboursable'}
          </p>
        </div>
      </div>

      {/* Detail per company */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-slate-600" />
            <span>Position Fiscale & Statut TVA par Entité</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {vatMetrics.length} société(s)
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {vatMetrics.map((m) => {
            const vatConfig = VAT_REGIME_LABELS[m.regime || 'ASSUJETTI_NORMAL'];

            return (
              <div key={m.company.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                {/* Left: Entity identity & regime */}
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.company.color }}
                    />
                    <h4 className="text-xs font-bold text-slate-900">{m.company.name}</h4>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {m.company.legalForm}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${vatConfig.badgeColor}`}>
                      {vatConfig.short}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {vatConfig.description}
                  </p>

                  {m.anomalyNonVatWithTva && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Attention : des écritures comportent de la TVA alors que la structure est exonérée.</span>
                    </div>
                  )}
                </div>

                {/* Right: Numbers or Exemption status */}
                {m.isSubjectToVAT ? (
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">TVA Collectée</div>
                      <div className="font-mono font-bold text-emerald-600">
                        +{formatEuro(m.tvaCollected)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">TVA Déductible</div>
                      <div className="font-mono font-bold text-blue-600">
                        -{formatEuro(m.tvaDeductible)}
                      </div>
                    </div>

                    <div className="text-right pl-3 border-l border-slate-200">
                      <div className="text-[10px] text-slate-400">
                        {m.netVAT >= 0 ? 'TVA à Décaisser' : 'Crédit de TVA'}
                      </div>
                      <div className={`font-mono font-bold ${m.netVAT >= 0 ? 'text-slate-900' : 'text-emerald-700'}`}>
                        {formatEuro(Math.abs(m.netVAT))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900">
                    <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <div>
                      <span className="font-bold block text-[11px]">Exonération de TVA applicable</span>
                      <span className="text-[10px] text-amber-700">Comptabilisation 100% TTC sans déclaration CA3.</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tax Deadlines Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-600" />
          <span>Échéancier Fiscal & Social de Contrôle</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-slate-800 block">15 du mois</span>
            <span className="text-slate-600 block text-[11px]">Échéance URSSAF / DSN</span>
            <span className="text-[10px] text-slate-500">Paiement cotisations sociales des salaires & prévoyance</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-slate-800 block">19 - 24 du mois</span>
            <span className="text-slate-600 block text-[11px]">Déclaration TVA (CA3)</span>
            <span className="text-[10px] text-slate-500">Télédéclaration et télérèglement DGFIP des entités assujetties</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-slate-800 block">15 Mars, Juin, Sept, Déc</span>
            <span className="text-slate-600 block text-[11px]">Acomptes IS (Impôt Sociétés)</span>
            <span className="text-[10px] text-slate-500">Acomptes trimestriels pour les sociétés soumises à l'IS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
