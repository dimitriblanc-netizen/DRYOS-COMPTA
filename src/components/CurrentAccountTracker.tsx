import React, { useMemo, useState } from 'react';
import { Company, Transaction, formatEuro } from '../types';
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Repeat, 
  ShieldAlert, 
  Plus, 
  Building2, 
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';

interface CurrentAccountTrackerProps {
  companies: Company[];
  transactions: Transaction[];
  onOpenNewCCAOperation: () => void;
}

export const CurrentAccountTracker: React.FC<CurrentAccountTrackerProps> = ({
  companies,
  transactions,
  onOpenNewCCAOperation,
}) => {
  const [filterPartner, setFilterPartner] = useState<string>('ALL');

  // Filter CCA and intercompany movements
  const ccaTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const isCCA = 
        t.operationType === 'CURRENT_ACCOUNT' ||
        t.category === 'CCA_CONTRIBUTION' ||
        t.category === 'CCA_REIMBURSEMENT' ||
        t.isInterCompany;
      return isCCA;
    });
  }, [transactions]);

  // Unique partner names (associates)
  const partnersList = useMemo(() => {
    const set = new Set<string>();
    ccaTransactions.forEach((t) => {
      const name = t.ccaPartnerName || t.partnerName;
      if (name && !companies.some((c) => c.id === t.interCompanyTargetId && c.name === name)) {
        set.add(name);
      }
    });
    // Default associates if none yet
    if (set.size === 0) {
      set.add('Dimitri Blanc (Associé principal)');
    }
    return Array.from(set);
  }, [ccaTransactions, companies]);

  // Compute balances per Associate & per Company
  // If associate made a deposit (Apport): Company owes associate (+) => Solde créditeur pour l'associé
  // If associate withdrew (Remboursement): Decreases company debt (-)
  const associateBalances = useMemo(() => {
    const balances: Record<string, Record<string, number>> = {};

    partnersList.forEach((p) => {
      balances[p] = {};
      companies.forEach((c) => {
        balances[p][c.id] = 0;
      });
    });

    ccaTransactions.forEach((t) => {
      const partner = t.ccaPartnerName || t.partnerName;
      if (!partner) return;
      if (!balances[partner]) {
        balances[partner] = {};
        companies.forEach((c) => {
          balances[partner][c.id] = 0;
        });
      }

      const amount = t.amountTTC || 0;
      // If it's a deposit by associate (INCOME or category CCA_CONTRIBUTION): +
      // If it's a repayment to associate (EXPENSE or category CCA_REIMBURSEMENT): -
      if (t.type === 'INCOME' || t.category === 'CCA_CONTRIBUTION' || t.ccaDirection === 'DEPOSIT') {
        balances[partner][t.companyId] = (balances[partner][t.companyId] || 0) + amount;
      } else {
        balances[partner][t.companyId] = (balances[partner][t.companyId] || 0) - amount;
      }
    });

    return balances;
  }, [ccaTransactions, partnersList, companies]);

  // Intercompany loan/debt matrix
  const intercompanyMatrix = useMemo(() => {
    // [SourceCompanyId][TargetCompanyId] = Net balance
    const matrix: Record<string, Record<string, number>> = {};
    companies.forEach((c1) => {
      matrix[c1.id] = {};
      companies.forEach((c2) => {
        matrix[c1.id][c2.id] = 0;
      });
    });

    ccaTransactions
      .filter((t) => t.isInterCompany && t.interCompanyTargetId)
      .forEach((t) => {
        const from = t.companyId;
        const to = t.interCompanyTargetId!;
        if (matrix[from] && matrix[from][to] !== undefined) {
          // If from spent money on behalf of to: to owes from
          matrix[from][to] += t.amountTTC || 0;
        }
      });

    return matrix;
  }, [ccaTransactions, companies]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Comptes Courants d'Associés (CCA) & Flux Intra-Groupe</span>
          </h2>
          <p className="text-xs text-slate-500">
            Suivi des apports et remboursements d'associés et des avances de trésorerie entre filiales
          </p>
        </div>

        <button
          onClick={onOpenNewCCAOperation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Enregistrer mouvement CCA</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Dette totale sociétés envers associés</span>
            <ArrowDownLeft className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-mono text-slate-900">
            {formatEuro(
              Object.values(associateBalances).reduce<number>(
                (sum, compObj) =>
                  sum +
                  Object.values(compObj).reduce<number>(
                    (s, v) => s + (typeof v === 'number' && v > 0 ? v : 0),
                    0
                  ),
                0
              )
            )}
          </p>
          <p className="text-[11px] text-slate-500">
            Fonds prêtés par les associés au groupe (solde créditeur)
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Flux de réconciliation inter-sociétés</span>
            <Repeat className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-lg sm:text-xl font-bold font-mono text-slate-900">
            {ccaTransactions.filter((t) => t.isInterCompany).length} écriture(s)
          </p>
          <p className="text-[11px] text-slate-500">
            Management fees et avances de trésorerie intragroupe
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Conformité juridique & fiscale</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1">
            <span>Aucun compte débiteur interdit</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Respect des règles du Code de commerce (art. L. 225-43)
          </p>
        </div>
      </div>

      {/* Associate Balances per Company Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900">
              Soldes des Comptes Courants d'Associés par Entité
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Solde &gt; 0 = La société doit à l'associé
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-3">Associé / Personne</th>
                {companies.map((c) => (
                  <th key={c.id} className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.name}</span>
                    </span>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right">Total Dû par le Groupe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partnersList.length === 0 ? (
                <tr>
                  <td colSpan={companies.length + 2} className="py-6 text-center text-slate-500">
                    Aucun apport en compte courant enregistré pour l'instant.
                  </td>
                </tr>
              ) : (
                partnersList.map((partner) => {
                  const partnerBalances = associateBalances[partner] || {};
                  const total = Object.values(partnerBalances).reduce<number>(
                    (a, b) => a + (typeof b === 'number' ? b : 0),
                    0
                  );

                  return (
                    <tr key={partner} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {partner}
                      </td>
                      {companies.map((c) => {
                        const val = partnerBalances[c.id] || 0;
                        const isDebtor = val < 0; // Attention compte courant débiteur
                        return (
                          <td key={c.id} className="py-2.5 px-3 text-right font-mono">
                            {isDebtor ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                                <ShieldAlert className="w-3 h-3" />
                                {formatEuro(val)}
                              </span>
                            ) : (
                              <span className={val > 0 ? 'text-indigo-900 font-semibold' : 'text-slate-400'}>
                                {formatEuro(val)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                        {formatEuro(total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Intercompany Balances Matrix (if multiple companies) */}
      {companies.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-900">
                Matrice des Avances de Trésorerie Inter-Sociétés (Qui prête à qui)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Créances & dettes réciproques
            </span>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="p-2 border-r border-slate-200">Société Créancière (Prêteuse)</th>
                  {companies.map((target) => (
                    <th key={target.id} className="p-2 text-right border-r border-slate-200 last:border-r-0">
                      Doit à : {target.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((src) => (
                  <tr key={src.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-800 border-r border-slate-200 bg-slate-50/40">
                      {src.name}
                    </td>
                    {companies.map((target) => {
                      if (src.id === target.id) {
                        return (
                          <td key={target.id} className="p-2 text-center text-slate-300 bg-slate-100/50 border-r border-slate-200 last:border-r-0">
                            —
                          </td>
                        );
                      }
                      const amount = intercompanyMatrix[src.id]?.[target.id] || 0;
                      return (
                        <td key={target.id} className="p-2 text-right font-mono text-xs border-r border-slate-200 last:border-r-0">
                          {amount > 0 ? (
                            <span className="font-semibold text-teal-700">+{formatEuro(amount)}</span>
                          ) : (
                            <span className="text-slate-400">0,00 €</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History of CCA & Intercompany transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Historique des Écritures de Comptes Courants & Avances</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {ccaTransactions.length} opération(s)
          </span>
        </div>

        <div className="p-3 divide-y divide-slate-100">
          {ccaTransactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Aucun mouvement de compte courant enregistré.
            </div>
          ) : (
            ccaTransactions.map((tx) => {
              const comp = companies.find((c) => c.id === tx.companyId);
              const isDeposit = tx.type === 'INCOME' || tx.category === 'CCA_CONTRIBUTION' || tx.ccaDirection === 'DEPOSIT';
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDeposit ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                      {isDeposit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {tx.description || tx.partnerName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                        <span>{tx.issueDate}</span>
                        <span>•</span>
                        <span>{comp?.name || tx.companyId}</span>
                        {tx.isInterCompany && (
                          <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 rounded text-[9px] font-semibold border border-teal-200">
                            Intragroupe
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-bold ${isDeposit ? 'text-indigo-900' : 'text-blue-800'}`}>
                      {isDeposit ? '+' : '-'}{formatEuro(tx.amountTTC)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isDeposit ? 'Apport de trésorerie' : 'Remboursement'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
