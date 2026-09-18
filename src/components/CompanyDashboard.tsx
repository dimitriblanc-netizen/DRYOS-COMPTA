import React, { useMemo } from 'react';
import { Company, Transaction, formatEuro, VAT_REGIME_LABELS, TAX_REGIME_LABELS } from '../types';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  DollarSign, 
  HardDrive, 
  ExternalLink, 
  UploadCloud, 
  AlertCircle, 
  FolderCheck, 
  CheckCircle2, 
  Calendar,
  Landmark,
  ShieldCheck,
  CreditCard,
  Users
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

interface CompanyDashboardProps {
  company: Company;
  transactions: Transaction[];
  onOpenUpload: () => void;
  onOpenDriveSettings: () => void;
  driveConnected: boolean;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  company,
  transactions,
  onOpenUpload,
  onOpenDriveSettings,
  driveConnected,
}) => {
  const companyTransactions = useMemo(() => {
    return transactions.filter((t) => t.companyId === company.id);
  }, [transactions, company.id]);

  const vatConfig = VAT_REGIME_LABELS[company.vatRegime || 'ASSUJETTI_NORMAL'];
  const taxConfig = TAX_REGIME_LABELS[company.taxRegime || 'IS'];
  const isVatExempt = company.vatRegime === 'FRANCHISE_BASE' || company.vatRegime === 'EXONERE_SPECIFIQUE';

  const metrics = useMemo(() => {
    let incomeHT = 0;
    let incomeTTC = 0;
    let expenseHT = 0;
    let expenseTTC = 0;
    let tvaCollected = 0;
    let tvaDeductible = 0;
    let currentCash = company.initialCash || 0;
    let ccaBalance = 0;

    companyTransactions.forEach((tx) => {
      // Cash calculation
      if (tx.status === 'PAID') {
        if (tx.type === 'INCOME') currentCash += tx.amountTTC;
        else currentCash -= tx.amountTTC;
      }

      // CCA calculation
      if (tx.operationType === 'CURRENT_ACCOUNT') {
        if (tx.ccaDirection === 'DEPOSIT') ccaBalance += tx.amountTTC;
        else ccaBalance -= tx.amountTTC;
      } else {
        // Operational income and expense
        if (tx.type === 'INCOME') {
          incomeHT += tx.amountHT;
          incomeTTC += tx.amountTTC;
          if (!isVatExempt) tvaCollected += tx.amountTVA || 0;
        } else {
          expenseHT += tx.amountHT;
          expenseTTC += tx.amountTTC;
          if (!isVatExempt) tvaDeductible += tx.amountTVA || 0;
        }
      }
    });

    const netResultHT = incomeHT - expenseHT;
    const marginRate = incomeHT > 0 ? (netResultHT / incomeHT) * 100 : 0;
    const netVat = tvaCollected - tvaDeductible;

    return {
      incomeHT,
      incomeTTC,
      expenseHT,
      expenseTTC,
      netResultHT,
      marginRate,
      currentCash,
      tvaCollected,
      tvaDeductible,
      netVat,
      ccaBalance,
      totalCount: companyTransactions.length,
    };
  }, [company, companyTransactions, isVatExempt]);

  const monthlyChartData = useMemo(() => {
    const months = [
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

    return months.map((m) => {
      let inc = 0;
      let exp = 0;
      companyTransactions.forEach((t) => {
        if (t.issueDate.substring(5, 7) === m.key && t.operationType !== 'CURRENT_ACCOUNT') {
          if (t.type === 'INCOME') inc += t.amountHT;
          else exp += t.amountHT;
        }
      });
      return {
        month: m.name,
        Recettes: Math.round(inc),
        Dépenses: Math.round(exp),
      };
    });
  }, [companyTransactions]);

  return (
    <div className="space-y-6">
      {/* Entity Header Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0"
            style={{ backgroundColor: company.color }}
          >
            {company.name.substring(0, 2).toUpperCase()}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900">{company.name}</h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {company.legalForm}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${vatConfig.badgeColor}`}>
                {vatConfig.short}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {taxConfig.short}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
              <span>SIREN: {company.siren}</span>
              {company.bankName && (
                <>
                  <span>•</span>
                  <span>{company.bankName} {company.iban ? `(${company.iban.slice(-8)})` : ''}</span>
                </>
              )}
              <span>•</span>
              <span>Exercice {company.fiscalYear}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Nouvelle écriture</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Solde Trésorerie Bancaire */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Solde Bancaire</span>
            <Landmark className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className={`text-base font-bold font-mono ${metrics.currentCash >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatEuro(metrics.currentCash)}
          </div>
          <p className="text-[10px] text-slate-400">Ouverture: {formatEuro(company.initialCash || 0)}</p>
        </div>

        {/* Chiffre d'Affaires HT */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Chiffre d'Affaires</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base font-bold font-mono text-emerald-600">
            {formatEuro(metrics.incomeHT)}
          </div>
          <p className="text-[10px] text-slate-400">Total facturé HT</p>
        </div>

        {/* Charges HT */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Charges & Achats</span>
            <TrendingDown className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-base font-bold font-mono text-slate-900">
            {formatEuro(metrics.expenseHT)}
          </div>
          <p className="text-[10px] text-slate-400">Exploitation HT</p>
        </div>

        {/* Résultat d'Exploitation */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Résultat Net</span>
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className={`text-base font-bold font-mono ${metrics.netResultHT >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatEuro(metrics.netResultHT)}
          </div>
          <p className="text-[10px] text-slate-400">Marge: {metrics.marginRate.toFixed(1)}%</p>
        </div>

        {/* TVA Nette */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>TVA Nette</span>
            <Receipt className="w-3.5 h-3.5 text-amber-600" />
          </div>
          {isVatExempt ? (
            <div>
              <span className="text-xs font-bold text-amber-800">0,00 €</span>
              <p className="text-[10px] text-amber-700">Art. 293 B CGI</p>
            </div>
          ) : (
            <div>
              <div className={`text-base font-bold font-mono ${metrics.netVat >= 0 ? 'text-amber-800' : 'text-emerald-600'}`}>
                {formatEuro(Math.abs(metrics.netVat))}
              </div>
              <p className="text-[10px] text-slate-400">
                {metrics.netVat >= 0 ? 'À décaisser' : 'Crédit TVA'}
              </p>
            </div>
          )}
        </div>

        {/* Compte Courant Associé */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Solde CCA</span>
            <Users className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-base font-bold font-mono text-indigo-700">
            {formatEuro(metrics.ccaBalance)}
          </div>
          <p className="text-[10px] text-slate-400">Dû à l'associé</p>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
          <span>Activité Mensuelle {company.fiscalYear}</span>
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
    </div>
  );
};
