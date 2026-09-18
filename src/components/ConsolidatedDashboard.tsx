import React, { useState, useMemo } from 'react';
import { Company, Transaction, formatEuro, VAT_REGIME_LABELS } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Receipt, 
  Building, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck, 
  HardDrive, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Plus,
  Landmark,
  Scale,
  Users,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from 'recharts';

interface ConsolidatedDashboardProps {
  companies: Company[];
  transactions: Transaction[];
  onSelectCompany: (companyId: string) => void;
  onOpenUpload: () => void;
  onOpenCompanyManager?: () => void;
  onInitGroupCompanies?: () => void;
  driveConnected: boolean;
}

export const ConsolidatedDashboard: React.FC<ConsolidatedDashboardProps> = ({
  companies,
  transactions,
  onSelectCompany,
  onOpenUpload,
  onOpenCompanyManager,
  onInitGroupCompanies,
  driveConnected,
}) => {
  const [eliminateIntercompany, setEliminateIntercompany] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'ALL' | '2026' | 'Q1'>('2026');

  // If no companies are defined yet
  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
          <Building className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">
            Aucune société enregistrée
          </h2>
          <p className="text-xs text-slate-500">
            Configurez vos structures (SAS, SCI, SARL, Holding) ou initialisez les 3 sociétés du groupe en 1 clic.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          {onInitGroupCompanies && (
            <button
              onClick={onInitGroupCompanies}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Initialiser le Groupe (Holding, Immo, SCI)</span>
            </button>
          )}
          <button
            onClick={() => onOpenCompanyManager?.()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer manuellement</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (eliminateIntercompany && tx.isInterCompany) {
        return false;
      }
      if (timePeriod === '2026' && !tx.issueDate.startsWith('2026')) {
        return false;
      }
      if (timePeriod === 'Q1') {
        const month = tx.issueDate.substring(5, 7);
        if (!['01', '02', '03'].includes(month)) return false;
      }
      return true;
    });
  }, [transactions, eliminateIntercompany, timePeriod]);

  // Financial aggregates
  const metrics = useMemo(() => {
    let totalIncomeHT = 0;
    let totalExpenseHT = 0;
    let totalVatCollected = 0;
    let totalVatDeductible = 0;
    let totalCcaBalance = 0;

    // Build map for companies with VAT liability
    const vatSubjectMap = new Set(
      companies
        .filter((c) => c.vatRegime === 'ASSUJETTI_NORMAL' || c.vatRegime === 'ASSUJETTI_SIMPLIFIE')
        .map((c) => c.id)
    );

    // Calculate real bank cash balance
    let totalCurrentCash = 0;
    companies.forEach((c) => {
      totalCurrentCash += c.initialCash || 0;
    });

    transactions.forEach((tx) => {
      if (tx.status === 'PAID') {
        if (tx.type === 'INCOME') totalCurrentCash += tx.amountTTC;
        else totalCurrentCash -= tx.amountTTC;
      }

      // CCA balance
      if (tx.operationType === 'CURRENT_ACCOUNT') {
        if (tx.ccaDirection === 'DEPOSIT') {
          totalCcaBalance += tx.amountTTC; // Apport = dette envers l'associé
        } else {
          totalCcaBalance -= tx.amountTTC;
        }
      }
    });

    filteredTransactions.forEach((tx) => {
      if (tx.operationType !== 'CURRENT_ACCOUNT') {
        if (tx.type === 'INCOME') {
          totalIncomeHT += tx.amountHT;
        } else {
          totalExpenseHT += tx.amountHT;
        }
      }

      // VAT only for subject entities
      if (vatSubjectMap.has(tx.companyId)) {
        if (tx.type === 'INCOME') {
          totalVatCollected += tx.amountTVA || 0;
        } else {
          totalVatDeductible += tx.amountTVA || 0;
        }
      }
    });

    const netOperatingResult = totalIncomeHT - totalExpenseHT;
    const marginRate = totalIncomeHT > 0 ? (netOperatingResult / totalIncomeHT) * 100 : 0;
    const netVatPayable = totalVatCollected - totalVatDeductible;

    return {
      totalIncomeHT,
      totalExpenseHT,
      netOperatingResult,
      marginRate,
      totalCurrentCash,
      netVatPayable,
      totalCcaBalance,
    };
  }, [companies, transactions, filteredTransactions]);

  // Per-company stats
  const companyStats = useMemo(() => {
    return companies.map((comp) => {
      const compTxs = transactions.filter((t) => t.companyId === comp.id);
      let cash = comp.initialCash || 0;
      let incomeHT = 0;
      let expenseHT = 0;

      compTxs.forEach((t) => {
        if (t.status === 'PAID') {
          if (t.type === 'INCOME') cash += t.amountTTC;
          else cash -= t.amountTTC;
        }
        if (t.operationType !== 'CURRENT_ACCOUNT') {
          if (t.type === 'INCOME') incomeHT += t.amountHT;
          else expenseHT += t.amountHT;
        }
      });

      return {
        company: comp,
        currentCash: cash,
        incomeHT,
        expenseHT,
        result: incomeHT - expenseHT,
        txCount: compTxs.length,
      };
    });
  }, [companies, transactions]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const allMonths = [
      { key: '01', name: 'Jan.' },
      { key: '02', name: 'Fév.' },
      { key: '03', name: 'Mar.' },
      { key: '04', name: 'Avr.' },
      { key: '05', name: 'Mai' },
      { key: '06', name: 'Juin' },
      { key: '07', name: 'Juil.' },
      { key: '08', name: 'Août' },
      { key: '09', name: 'Sept.' },
      { key: '10', name: 'Oct.' },
      { key: '11', name: 'Nov.' },
      { key: '12', name: 'Déc.' },
    ];

    const months = timePeriod === 'Q1' ? allMonths.slice(0, 3) : allMonths;

    return months.map((m) => {
      let income = 0;
      let expense = 0;

      filteredTransactions.forEach((tx) => {
        if (tx.issueDate.substring(5, 7) === m.key && tx.operationType !== 'CURRENT_ACCOUNT') {
          if (tx.type === 'INCOME') income += tx.amountHT;
          else expense += tx.amountHT;
        }
      });

      return {
        month: m.name,
        Recettes: Math.round(income),
        Dépenses: Math.round(expense),
      };
    });
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <span>Synthèse Consolidée</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setTimePeriod('Q1')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                timePeriod === 'Q1' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              T1
            </button>
            <button
              onClick={() => setTimePeriod('2026')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                timePeriod === '2026' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2026
            </button>
            <button
              onClick={() => setTimePeriod('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                timePeriod === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Intercompany toggle */}
          <button
            onClick={() => setEliminateIntercompany(!eliminateIntercompany)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              eliminateIntercompany
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sans flux internes</span>
          </button>
        </div>
      </div>

      {/* When no transactions exist yet */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Comptabilité vierge</h3>
            <p className="text-xs text-slate-500">
              Aucune facture ou écriture n'est encore saisie. Importez une facture ou un reçu pour démarrer.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Déposer une facture / reçu</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Trésorerie Bancaire */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Trésorerie</span>
                <Landmark className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {formatEuro(metrics.totalCurrentCash)}
              </div>
            </div>

            {/* Chiffre d'Affaires */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Chiffre d'Affaires</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-base font-bold font-mono text-emerald-600">
                {formatEuro(metrics.totalIncomeHT)}
              </div>
            </div>

            {/* Charges d'Exploitation */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Charges HT</span>
                <TrendingDown className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {formatEuro(metrics.totalExpenseHT)}
              </div>
            </div>

            {/* Résultat d'Exploitation */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Résultat Net</span>
                <Percent className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className={`text-base font-bold font-mono ${metrics.netOperatingResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatEuro(metrics.netOperatingResult)}
              </div>
            </div>

            {/* TVA Nette */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>TVA Nette</span>
                <Receipt className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {formatEuro(metrics.netVatPayable > 0 ? metrics.netVatPayable : 0)}
              </div>
            </div>

            {/* Comptes Courants Associés */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Solde CCA</span>
                <Users className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {formatEuro(metrics.totalCcaBalance)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Companies Grid - Quick Switch & Health */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-600" />
            <span>Situation par Entité Juridique</span>
          </h2>
          <button
            onClick={() => onOpenCompanyManager?.()}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Gérer les sociétés</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {companyStats.map((s) => {
            const vatConfig = VAT_REGIME_LABELS[s.company.vatRegime || 'ASSUJETTI_NORMAL'];

            return (
              <div
                key={s.company.id}
                onClick={() => onSelectCompany(s.company.id)}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-400 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.company.color }}
                    />
                    <span className="text-xs font-bold text-slate-900">{s.company.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {s.company.legalForm}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${vatConfig.badgeColor}`}>
                    {vatConfig.short}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tréso</span>
                    <span className="font-mono font-bold text-slate-900">{formatEuro(s.currentCash)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">CA HT</span>
                    <span className="font-mono font-bold text-emerald-600">{formatEuro(s.incomeHT)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Résultat</span>
                    <span className={`font-mono font-bold ${s.result >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatEuro(s.result)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Evolution Chart */}
      {transactions.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
            <span>Évolution Mensuelle Recettes & Dépenses HT</span>
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val: number) => [formatEuro(val), '']} 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Recettes" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dépenses" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
