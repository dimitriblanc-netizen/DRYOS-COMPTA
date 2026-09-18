import React, { useState, useMemo } from 'react';
import { 
  Company, 
  Transaction, 
  TransactionType, 
  OperationType,
  PaymentStatus, 
  formatEuro, 
  getCategoryLabel,
  VAT_REGIME_LABELS
} from '../types';
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  HardDrive, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronDown,
  UploadCloud,
  FileText,
  Users,
  Receipt,
  Landmark,
  ArrowDownLeft
} from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  companies: Company[];
  selectedCompanyId: string | null;
  onUpdateStatus: (id: string, newStatus: PaymentStatus) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenUpload: () => void;
  onExportCsv: () => void;
  onExportFec?: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  companies,
  selectedCompanyId,
  onUpdateStatus,
  onDeleteTransaction,
  onOpenUpload,
  onExportCsv,
  onExportFec,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [operationFilter, setOperationFilter] = useState<'ALL' | OperationType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>(selectedCompanyId || 'ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync internal company filter when top bar changes
  React.useEffect(() => {
    setCompanyFilter(selectedCompanyId || 'ALL');
  }, [selectedCompanyId]);

  const companyMap = useMemo(() => {
    const map: Record<string, Company> = {};
    companies.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [companies]);

  // Filter transactions
  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      // Company
      if (companyFilter !== 'ALL' && tx.companyId !== companyFilter) {
        return false;
      }
      // Type
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
        return false;
      }
      // Operation type
      if (operationFilter !== 'ALL') {
        const op = tx.operationType || (tx.type === 'EXPENSE' ? 'EXPENSE_INVOICE' : 'INCOME_INVOICE');
        if (op !== operationFilter) return false;
      }
      // Status
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
        return false;
      }
      // Search text
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const partner = (tx.partnerName || '').toLowerCase();
        const invoiceNum = (tx.invoiceNumber || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const companyName = (companyMap[tx.companyId]?.name || '').toLowerCase();
        if (!partner.includes(query) && !invoiceNum.includes(query) && !desc.includes(query) && !companyName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, companyFilter, typeFilter, operationFilter, statusFilter, searchTerm, companyMap]);

  // Totals for filtered list
  const totals = useMemo(() => {
    let ht = 0;
    let tva = 0;
    let ttc = 0;
    filteredList.forEach((t) => {
      const sign = t.type === 'INCOME' ? 1 : -1;
      ht += t.amountHT * sign;
      tva += t.amountTVA * sign;
      ttc += t.amountTTC * sign;
    });
    return { ht, tva, ttc };
  }, [filteredList]);

  const handleDeleteClick = (tx: Transaction) => {
    setDeleteConfirmId(tx.id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par tiers, référence, libellé..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Company filter (when consolidated) */}
          {selectedCompanyId === null && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:outline-none"
            >
              <option value="ALL">Toutes les sociétés ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Operation Filter */}
          <select
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">Toutes natures d'opérations</option>
            <option value="EXPENSE_INVOICE">Factures d'Achats</option>
            <option value="INCOME_INVOICE">Factures de Ventes</option>
            <option value="SALARY_PAYROLL">Salaires & Rémunérations</option>
            <option value="CURRENT_ACCOUNT">Comptes Courants d'Associés (CCA)</option>
            <option value="TAX_DUTY">Impôts & Taxes</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">Tous flux</option>
            <option value="EXPENSE">Décaissements</option>
            <option value="INCOME">Encaissements</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">Tous statuts</option>
            <option value="PAID">Payé / Réglé</option>
            <option value="PENDING">En attente d'échéance</option>
            <option value="OVERDUE">En retard</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Exporter l'ensemble du journal en CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Export FEC (DGFiP) */}
          {onExportFec && (
            <button
              onClick={onExportFec}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Exporter le Fichier des Écritures Comptables officiel (FEC norme fiscale DGFiP)"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Export FEC (DGFiP)</span>
            </button>
          )}

          {/* Action button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Nouvelle écriture</span>
          </button>
        </div>
      </div>

      {/* Mobile Card Feed (< md screens) */}
      <div className="md:hidden divide-y divide-slate-100">
        {filteredList.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-500">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Aucune écriture trouvée</p>
            <p className="text-xs text-slate-500 mt-1">Modifiez vos filtres ou ajoutez une écriture comptable.</p>
          </div>
        ) : (
          filteredList.map((tx) => {
            const company = companyMap[tx.companyId];
            const isExpense = tx.type === 'EXPENSE';
            const isSalary = tx.operationType === 'SALARY_PAYROLL';
            const isCCA = tx.operationType === 'CURRENT_ACCOUNT';

            return (
              <div key={tx.id} className="p-3.5 space-y-2.5 bg-white hover:bg-slate-50/70 transition-colors">
                {/* Top row: Company + Date + Status */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {company && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: company.color }}
                        />
                        <span className="truncate max-w-[120px]">{company.name}</span>
                      </span>
                    )}
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 text-[11px] whitespace-nowrap">{tx.issueDate}</span>
                  </div>

                  {/* Status toggle pill */}
                  <button
                    onClick={() => {
                      const nextStatus: PaymentStatus = tx.status === 'PAID' ? 'PENDING' : 'PAID';
                      onUpdateStatus(tx.id, nextStatus);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer min-h-[28px] ${
                      tx.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : tx.status === 'OVERDUE'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {tx.status === 'PAID' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {tx.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                    {tx.status === 'OVERDUE' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                    <span>{tx.status === 'PAID' ? 'Payé' : tx.status === 'OVERDUE' ? 'En retard' : 'En attente'}</span>
                  </button>
                </div>

                {/* Main row: Partner Name & TTC Amount */}
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{tx.partnerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {tx.invoiceNumber} {tx.description && `• ${tx.description}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-mono text-base font-bold ${isExpense ? 'text-slate-900' : 'text-emerald-600'}`}>
                      {isExpense ? '-' : '+'}{formatEuro(tx.amountTTC)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      HT: {formatEuro(tx.amountHT)} {tx.amountTVA > 0 && `• TVA: ${formatEuro(tx.amountTVA)}`}
                    </div>
                  </div>
                </div>

                {/* Bottom row: Category labels + Drive link + Delete */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                      {getCategoryLabel(tx.category, tx.type)}
                    </span>
                    {isSalary && (
                      <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-semibold border border-teal-200">
                        Paie
                      </span>
                    )}
                    {isCCA && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                        CCA
                      </span>
                    )}
                    {tx.isInterCompany && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200">
                        Intra-groupe
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {tx.driveFile?.webViewLink && (
                      <a
                        href={tx.driveFile.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px] min-h-[30px] border border-indigo-200"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Drive</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteClick(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors min-w-[30px] min-h-[30px] flex items-center justify-center cursor-pointer"
                      title="Supprimer cette écriture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table Container (hidden on mobile, visible on md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Opération & Tiers</th>
              {selectedCompanyId === null && <th className="py-2.5 px-3">Société</th>}
              <th className="py-2.5 px-3">Détail & Nature</th>
              <th className="py-2.5 px-3 text-right">Montant HT</th>
              <th className="py-2.5 px-3 text-right">TVA</th>
              <th className="py-2.5 px-3 text-right">Montant TTC</th>
              <th className="py-2.5 px-3 text-center">Statut</th>
              <th className="py-2.5 px-3 text-center">Drive</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Aucune écriture trouvée</p>
                  <p className="text-xs text-slate-500 mt-1">Modifiez vos filtres ou ajoutez une écriture comptable.</p>
                </td>
              </tr>
            ) : (
              filteredList.map((tx) => {
                const company = companyMap[tx.companyId];
                const isExpense = tx.type === 'EXPENSE';
                const isSalary = tx.operationType === 'SALARY_PAYROLL';
                const isCCA = tx.operationType === 'CURRENT_ACCOUNT';
                const isExemptCompany = company?.vatRegime === 'FRANCHISE_BASE' || company?.vatRegime === 'EXONERE_SPECIFIQUE';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{tx.issueDate}</div>
                      {tx.dueDate && tx.dueDate !== tx.issueDate && (
                        <div className="text-[10px] text-slate-500">Éch. {tx.dueDate}</div>
                      )}
                    </td>

                    {/* Invoice Number & Partner */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{tx.partnerName}</span>
                        {isSalary && (
                          <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 text-[9px] font-semibold border border-teal-200">
                            Paie
                          </span>
                        )}
                        {isCCA && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-semibold border border-blue-200">
                            Compte Courant
                          </span>
                        )}
                        {tx.isInterCompany && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[9px] font-semibold border border-purple-200">
                            Intra-groupe
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>{tx.invoiceNumber}</span>
                        <span>•</span>
                        <span className={isExpense ? 'text-slate-600' : 'text-emerald-700'}>
                          {isExpense ? 'Décaissement' : 'Encaissement'}
                        </span>
                      </div>
                    </td>

                    {/* Company */}
                    {selectedCompanyId === null && (
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {company ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: company.color }}
                            />
                            <span className="text-slate-800 font-semibold">{company.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Inconnue</span>
                        )}
                      </td>
                    )}

                    {/* Category & Description */}
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="text-[11px] font-semibold text-slate-700">
                        {getCategoryLabel(tx.category, tx.type)}
                      </div>
                      {isSalary && tx.netSalary !== undefined && (
                        <div className="text-[10px] text-teal-700 font-mono mt-0.5">
                          Net: {formatEuro(tx.netSalary)} • URSSAF: {formatEuro(tx.socialCharges || 0)}
                        </div>
                      )}
                      {tx.description && !isSalary && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5" title={tx.description}>
                          {tx.description}
                        </div>
                      )}
                    </td>

                    {/* Montant HT */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatEuro(tx.amountHT)}
                    </td>

                    {/* TVA */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                      {isExemptCompany || tx.tvaRate === 0 ? (
                        <span className="text-[10px] text-slate-400">
                          {isExemptCompany ? '0% (Franchise)' : '0%'}
                        </span>
                      ) : (
                        <div>
                          <div className="text-slate-700">{formatEuro(tx.amountTVA)}</div>
                          <div className="text-[9px] text-slate-400">{tx.tvaRate}%</div>
                        </div>
                      )}
                    </td>

                    {/* Montant TTC */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span className={`font-mono font-bold ${isExpense ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'}{formatEuro(tx.amountTTC)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          const nextStatus: PaymentStatus = tx.status === 'PAID' ? 'PENDING' : 'PAID';
                          onUpdateStatus(tx.id, nextStatus);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                          tx.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : tx.status === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title="Cliquer pour basculer Payé / En attente"
                      >
                        {tx.status === 'PAID' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {tx.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                        {tx.status === 'OVERDUE' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                        <span>{tx.status === 'PAID' ? 'Payé' : tx.status === 'OVERDUE' ? 'En retard' : 'En attente'}</span>
                      </button>
                    </td>

                    {/* Drive Link */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {tx.driveFile?.webViewLink ? (
                        <a
                          href={tx.driveFile.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-medium"
                          title={`Fichier Drive: ${tx.driveFile.name}`}
                        >
                          <HardDrive className="w-3 h-3 text-emerald-600" />
                          <span>Drive</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteClick(tx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Supprimer cette écriture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 text-sm font-bold">
              <AlertCircle className="w-5 h-5" />
              <span>Supprimer l'écriture</span>
            </div>
            <p className="text-xs text-slate-600">
              Êtes-vous sûr de vouloir supprimer cette écriture comptable ? Le fichier associé sur Google Drive ne sera pas détruit.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
