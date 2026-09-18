import React, { useMemo, useState } from 'react';
import { Company, Transaction, formatEuro, VAT_REGIME_LABELS } from '../types';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2,
  Calendar,
  Building,
  Landmark,
  Plus
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface CashFlowDashboardProps {
  companies: Company[];
  transactions: Transaction[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string | null) => void;
  onOpenNewOperation: () => void;
}

export const CashFlowDashboard: React.FC<CashFlowDashboardProps> = ({
  companies,
  transactions,
  selectedCompanyId,
  onSelectCompany,
  onOpenNewOperation,
}) => {
  const [forecastHorizon, setForecastHorizon] = useState<'30' | '60' | '90'>('30');

  // Filter companies based on selection
  const activeCompanies = useMemo(() => {
    if (selectedCompanyId) {
      return companies.filter((c) => c.id === selectedCompanyId);
    }
    return companies;
  }, [companies, selectedCompanyId]);

  // Compute Cash balances per company
  const companyCashMetrics = useMemo(() => {
    return activeCompanies.map((comp) => {
      const compTx = transactions.filter((t) => t.companyId === comp.id);

      // Paid movements affecting actual bank account
      const paidIncome = compTx
        .filter((t) => t.type === 'INCOME' && t.status === 'PAID')
        .reduce((sum, t) => sum + (t.amountTTC || 0), 0);

      const paidExpenses = compTx
        .filter((t) => t.type === 'EXPENSE' && t.status === 'PAID')
        .reduce((sum, t) => sum + (t.amountTTC || 0), 0);

      const currentBalance = (comp.initialCash || 0) + paidIncome - paidExpenses;

      // Pending movements within next X days
      const days = parseInt(forecastHorizon, 10);
      const now = new Date();
      const horizonDate = new Date(now.getTime() + days * 24 * 3600 * 1000);

      const pendingInflow = compTx
        .filter((t) => {
          if (t.type !== 'INCOME' || t.status === 'PAID') return false;
          if (!t.dueDate) return true;
          return new Date(t.dueDate) <= horizonDate;
        })
        .reduce((sum, t) => sum + (t.amountTTC || 0), 0);

      const pendingOutflow = compTx
        .filter((t) => {
          if (t.type !== 'EXPENSE' || t.status === 'PAID') return false;
          if (!t.dueDate) return true;
          return new Date(t.dueDate) <= horizonDate;
        })
        .reduce((sum, t) => sum + (t.amountTTC || 0), 0);

      const forecastedBalance = currentBalance + pendingInflow - pendingOutflow;

      return {
        company: comp,
        initialCash: comp.initialCash || 0,
        paidIncome,
        paidExpenses,
        currentBalance,
        pendingInflow,
        pendingOutflow,
        forecastedBalance,
      };
    });
  }, [activeCompanies, transactions, forecastHorizon]);

  // Aggregate totals
  const totalCurrentCash = companyCashMetrics.reduce((acc, m) => acc + m.currentBalance, 0);
  const totalPendingInflow = companyCashMetrics.reduce((acc, m) => acc + m.pendingInflow, 0);
  const totalPendingOutflow = companyCashMetrics.reduce((acc, m) => acc + m.pendingOutflow, 0);
  const totalForecastedCash = totalCurrentCash + totalPendingInflow - totalPendingOutflow;

  // Chart data
  const chartData = companyCashMetrics.map((m) => ({
    name: m.company.name,
    soldeActuel: Math.round(m.currentBalance),
    previsionnel: Math.round(m.forecastedBalance),
  }));

  // Upcoming operations due in horizon
  const upcomingPayables = useMemo(() => {
    const days = parseInt(forecastHorizon, 10);
    const now = new Date();
    const horizonDate = new Date(now.getTime() + days * 24 * 3600 * 1000);

    return transactions
      .filter((t) => {
        if (selectedCompanyId && t.companyId !== selectedCompanyId) return false;
        if (t.status === 'PAID') return false;
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d <= horizonDate;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [transactions, selectedCompanyId, forecastHorizon]);

  return (
    <div className="space-y-6">
      {/* Top Controls: Scope & Horizon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Pilotage Trésorerie & Cash-Flow</span>
          </h2>
          <p className="text-xs text-slate-500">
            Soldes bancaires réels et atterrissage de trésorerie prévisionnel
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Horizon Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setForecastHorizon('30')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                forecastHorizon === '30' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 jours
            </button>
            <button
              onClick={() => setForecastHorizon('60')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                forecastHorizon === '60' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              60 jours
            </button>
            <button
              onClick={() => setForecastHorizon('90')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                forecastHorizon === '90' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              90 jours
            </button>
          </div>

          <button
            onClick={onOpenNewOperation}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle opération</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Trésorerie Actuelle (Banque)</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className={`text-lg sm:text-xl font-bold font-mono ${totalCurrentCash >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatEuro(totalCurrentCash)}
          </p>
          <div className="text-[11px] text-slate-500">
            Solde bancaire consolidé en direct
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Encaissements attendus ({forecastHorizon}j)</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-mono text-emerald-600">
            +{formatEuro(totalPendingInflow)}
          </p>
          <div className="text-[11px] text-slate-500">
            Factures clients & recettes à échoir
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Décaissements prévus ({forecastHorizon}j)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-mono text-rose-600">
            -{formatEuro(totalPendingOutflow)}
          </p>
          <div className="text-[11px] text-slate-500">
            Fournisseurs, salaires & échéances
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Atterrissage Tréso ({forecastHorizon}j)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className={`text-lg sm:text-xl font-bold font-mono ${totalForecastedCash >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
            {formatEuro(totalForecastedCash)}
          </p>
          <div className="text-[11px] text-slate-500">
            Solde net théorique après échéances
          </div>
        </div>
      </div>

      {/* Grid: Bank Balances per Company & Upcoming Payables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Companies Cash Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-slate-600" />
              <span>Détail des Soldes Bancaires par Société</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {companyCashMetrics.length} compte(s)
            </span>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {companyCashMetrics.map((m) => (
              <div
                key={m.company.id}
                onClick={() => onSelectCompany(m.company.id)}
                className="p-3.5 space-y-2 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: m.company.color }}
                    />
                    <span className="font-bold text-slate-900 text-xs">{m.company.name}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${m.currentBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {formatEuro(m.currentBalance)}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  {m.company.bankName || 'Compte bancaire pro'} {m.company.iban ? `• ${m.company.iban.slice(0, 14)}...` : ''}
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                  <div>
                    <span className="text-slate-500 block">Initial</span>
                    <span className="font-mono text-slate-700">{formatEuro(m.initialCash)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Flux nets</span>
                    <span className="font-mono text-emerald-700 font-semibold">+{formatEuro(m.paidIncome - m.paidExpenses)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Prév. {forecastHorizon}j</span>
                    <span className={`font-mono font-bold ${m.forecastedBalance >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                      {formatEuro(m.forecastedBalance)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-3">Société / Banque</th>
                  <th className="py-2.5 px-3 text-right">Solde Initial</th>
                  <th className="py-2.5 px-3 text-right">Encaissements</th>
                  <th className="py-2.5 px-3 text-right">Décaissements</th>
                  <th className="py-2.5 px-3 text-right">Solde Actuel</th>
                  <th className="py-2.5 px-3 text-right">Prév. {forecastHorizon}j</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyCashMetrics.map((m) => (
                  <tr 
                    key={m.company.id}
                    onClick={() => onSelectCompany(m.company.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: m.company.color }}
                        />
                        <div>
                          <div className="font-bold text-slate-900">{m.company.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {m.company.bankName || 'Compte pro'} {m.company.iban ? `• ${m.company.iban.slice(0, 14)}...` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatEuro(m.initialCash)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                      +{formatEuro(m.paidIncome)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                      -{formatEuro(m.paidExpenses)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={m.currentBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}>
                        {formatEuro(m.currentBalance)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={m.forecastedBalance >= 0 ? 'text-indigo-900' : 'text-rose-600'}>
                        {formatEuro(m.forecastedBalance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upcoming Due Dates (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Échéancier ({forecastHorizon} jours)</span>
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {upcomingPayables.length} opération(s)
            </span>
          </div>

          <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[320px] flex-1">
            {upcomingPayables.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <span>Aucune échéance en attente sur cette période</span>
              </div>
            ) : (
              upcomingPayables.map((tx) => {
                const isExpense = tx.type === 'EXPENSE';
                const comp = companies.find((c) => c.id === tx.companyId);
                return (
                  <div key={tx.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {tx.partnerName || 'Sans tiers'}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-mono">Éch. {tx.dueDate}</span>
                        {comp && <span>• {comp.name}</span>}
                      </div>
                    </div>
                    <div className={`font-mono font-bold whitespace-nowrap ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isExpense ? '-' : '+'}{formatEuro(tx.amountTTC)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
