import React, { useState, useRef, useEffect } from 'react';
import { 
  Company, 
  Transaction, 
  TransactionType, 
  OperationType,
  PaymentMethod, 
  PaymentStatus, 
  DriveConfig,
  formatEuro,
  VAT_REGIME_LABELS
} from '../types';
import { 
  X, 
  UploadCloud, 
  Sparkles, 
  HardDrive, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Receipt,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Building2,
  Percent,
  Calendar,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { analyzeInvoiceDocument } from '../services/aiService';
import { 
  uploadInvoiceFile, 
  setupCompanyDriveHierarchy, 
  formatStandardInvoiceFileName, 
  getOrCreateYearHierarchy 
} from '../services/driveService';

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  selectedCompanyId: string | null;
  onAddTransaction: (transaction: Transaction) => void;
  token: string | null;
  onConnectDrive: () => void;
  driveConfig: DriveConfig;
}

export const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({
  isOpen,
  onClose,
  companies,
  selectedCompanyId,
  onAddTransaction,
  token,
  onConnectDrive,
  driveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<OperationType>('EXPENSE_INVOICE');
  const [targetCompanyId, setTargetCompanyId] = useState<string>(
    selectedCompanyId || (companies[0]?.id || '')
  );

  // Sync selected company when opened
  useEffect(() => {
    if (selectedCompanyId) {
      setTargetCompanyId(selectedCompanyId);
    } else if (companies.length > 0 && !targetCompanyId) {
      setTargetCompanyId(companies[0].id);
    }
  }, [selectedCompanyId, companies, targetCompanyId]);

  const currentCompany = companies.find((c) => c.id === targetCompanyId);
  const isCompanyVatExempt = currentCompany?.vatRegime === 'FRANCHISE_BASE' || currentCompany?.vatRegime === 'EXONERE_SPECIFIQUE';

  // Common Form States
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIREMENT');
  const [status, setStatus] = useState<PaymentStatus>('PAID');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Invoice States
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [invoiceType, setInvoiceType] = useState<TransactionType>('EXPENSE');
  const [partnerName, setPartnerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amountHT, setAmountHT] = useState<number | ''>('');
  const [tvaRate, setTvaRate] = useState<number>(isCompanyVatExempt ? 0 : 20);
  const [amountTVA, setAmountTVA] = useState<number | ''>(isCompanyVatExempt ? 0 : '');
  const [amountTTC, setAmountTTC] = useState<number | ''>('');
  const [category, setCategory] = useState('SAAS_HOSTING');
  const [isInterCompany, setIsInterCompany] = useState(false);
  const [interCompanyTargetId, setInterCompanyTargetId] = useState<string>('');
  const [syncWithDrive, setSyncWithDrive] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 2. Payroll / Salaires States
  const [payrollBeneficiary, setPayrollBeneficiary] = useState('Dimitri Blanc (Rémunération Dirigeant)');
  const [payrollNet, setPayrollNet] = useState<number | ''>('');
  const [payrollUrssaf, setPayrollUrssaf] = useState<number | ''>('');
  const [payrollWithholdingTax, setPayrollWithholdingTax] = useState<number | ''>('');
  const [payrollMonth, setPayrollMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // 3. Current Account (CCA) States
  const [ccaDirection, setCcaDirection] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [ccaPartner, setCcaPartner] = useState('Dimitri Blanc');
  const [ccaAmount, setCcaAmount] = useState<number | ''>('');
  const [isIntercoTransfer, setIsIntercoTransfer] = useState(false);
  const [intercoCounterpartId, setIntercoCounterpartId] = useState<string>('');

  // 4. Taxes States
  const [taxType, setTaxType] = useState<'IS' | 'CFE' | 'TVA' | 'TAXE_FONCIERE'>('IS');
  const [taxAmount, setTaxAmount] = useState<number | ''>('');

  // Auto adjust TVA when target company changes
  useEffect(() => {
    if (isCompanyVatExempt) {
      setTvaRate(0);
      setAmountTVA(0);
      if (typeof amountHT === 'number') {
        setAmountTTC(amountHT);
      }
    }
  }, [isCompanyVatExempt, amountHT]);

  if (!isOpen) return null;

  // Invoice calculations
  const handleAmountHTChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) {
      setAmountHT('');
      setAmountTVA('');
      setAmountTTC('');
    } else {
      setAmountHT(num);
      const effectiveRate = isCompanyVatExempt ? 0 : tvaRate;
      const calcTVA = Math.round(num * (effectiveRate / 100) * 100) / 100;
      setAmountTVA(calcTVA);
      setAmountTTC(Math.round((num + calcTVA) * 100) / 100);
    }
  };

  const handleTvaRateChange = (newRate: number) => {
    if (isCompanyVatExempt) return;
    setTvaRate(newRate);
    if (typeof amountHT === 'number') {
      const calcTVA = Math.round(amountHT * (newRate / 100) * 100) / 100;
      setAmountTVA(calcTVA);
      setAmountTTC(Math.round((amountHT + calcTVA) * 100) / 100);
    }
  };

  // AI Invoice Analysis
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAnalyzing(true);

    try {
      const result = await analyzeInvoiceDocument(selectedFile);
      if (result.type) setInvoiceType(result.type);
      if (result.partnerName) setPartnerName(result.partnerName);
      if (result.invoiceNumber) setInvoiceNumber(result.invoiceNumber);
      if (result.issueDate) setIssueDate(result.issueDate);
      if (result.dueDate) setDueDate(result.dueDate);
      if (result.amountHT !== undefined) {
        setAmountHT(result.amountHT);
        if (isCompanyVatExempt) {
          setTvaRate(0);
          setAmountTVA(0);
          setAmountTTC(result.amountHT);
        } else {
          if (result.tvaRate !== undefined) setTvaRate(result.tvaRate);
          if (result.amountTVA !== undefined) setAmountTVA(result.amountTVA);
          if (result.amountTTC !== undefined) setAmountTTC(result.amountTTC);
        }
      }
      if (result.category) setCategory(result.category);
      if (result.paymentMethod) setPaymentMethod(result.paymentMethod);
      if (result.status) setStatus(result.status);
      if (result.description) setDescription(result.description);
      setSuccessMessage('Pièce analysée par l\'IA avec succès.');
    } catch (err: any) {
      console.warn('AI analysis fallback:', err);
      setErrorMessage('Lecture IA non disponible. Saisie manuelle activée.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetCompanyId) {
      setErrorMessage('Veuillez sélectionner la société concernée.');
      return;
    }

    const company = companies.find((c) => c.id === targetCompanyId);
    let newTx: Transaction;

    if (activeTab === 'EXPENSE_INVOICE' || activeTab === 'INCOME_INVOICE') {
      // 1. INVOICE OPERATION
      if (typeof amountHT !== 'number' || amountHT < 0) {
        setErrorMessage('Veuillez renseigner un montant valide.');
        return;
      }

      let driveFileInfo = undefined;
      if (syncWithDrive && file && company) {
        setIsUploadingDrive(true);
        try {
          const hierarchy = await setupCompanyDriveHierarchy(
            token || '',
            company.name,
            company.siren,
            driveConfig
          );

          const invoiceYear = issueDate ? issueDate.split('-')[0] : `${new Date().getFullYear()}`;
          const isSci = company.name.toLowerCase().includes('sci') || company.legalForm === 'SCI';
          const yearHierarchy = await getOrCreateYearHierarchy(
            token || '',
            hierarchy.companyFolderId,
            invoiceYear,
            isSci
          );

          const targetFolderId = invoiceType === 'EXPENSE' 
            ? yearHierarchy.purchasesFolderId 
            : yearHierarchy.salesFolderId;

          const formattedFileName = formatStandardInvoiceFileName({
            date: issueDate,
            partnerName: partnerName || 'Fournisseur',
            amountTTC: Number(amountTTC) || Number(amountHT),
            invoiceNumber: invoiceNumber || 'SANS_REF',
            originalFileName: file.name,
          });

          driveFileInfo = await uploadInvoiceFile(
            token || '',
            file,
            targetFolderId,
            formattedFileName,
            file.type || 'application/pdf'
          );
        } catch (err: any) {
          console.error('Drive upload warning:', err);
        } finally {
          setIsUploadingDrive(false);
        }
      }

      newTx = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        companyId: targetCompanyId,
        type: invoiceType,
        operationType: invoiceType === 'EXPENSE' ? 'EXPENSE_INVOICE' : 'INCOME_INVOICE',
        invoiceNumber: invoiceNumber.trim() || `FAC-${Date.now().toString().slice(-4)}`,
        partnerName: partnerName.trim() || (invoiceType === 'EXPENSE' ? 'Fournisseur' : 'Client'),
        description: description.trim() || `${invoiceType === 'EXPENSE' ? 'Achat' : 'Vente'} ${partnerName}`,
        issueDate,
        dueDate,
        amountHT: Number(amountHT),
        tvaRate: isCompanyVatExempt ? 0 : Number(tvaRate),
        amountTVA: isCompanyVatExempt ? 0 : Number(amountTVA || 0),
        amountTTC: Number(amountTTC || amountHT),
        category,
        paymentMethod,
        status,
        isInterCompany,
        interCompanyTargetId: isInterCompany ? interCompanyTargetId : undefined,
        driveFile: driveFileInfo,
        createdAt: new Date().toISOString(),
      };

    } else if (activeTab === 'SALARY_PAYROLL') {
      // 2. SALARY & PAYROLL OPERATION
      const net = Number(payrollNet) || 0;
      const urssaf = Number(payrollUrssaf) || 0;
      const pas = Number(payrollWithholdingTax) || 0;
      const totalCost = net + urssaf;

      if (totalCost <= 0) {
        setErrorMessage('Veuillez renseigner le montant du salaire ou des charges.');
        return;
      }

      newTx = {
        id: `tx-sal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        companyId: targetCompanyId,
        type: 'EXPENSE',
        operationType: 'SALARY_PAYROLL',
        invoiceNumber: `PAIE-${payrollMonth}`,
        partnerName: payrollBeneficiary.trim() || 'Rémunération / URSSAF',
        description: `Paie ${payrollMonth} : ${payrollBeneficiary} (Net: ${formatEuro(net)}, Cotisations: ${formatEuro(urssaf)})`,
        issueDate,
        dueDate,
        amountHT: totalCost,
        tvaRate: 0,
        amountTVA: 0,
        amountTTC: totalCost,
        category: payrollBeneficiary.toLowerCase().includes('dirigeant') ? 'EXECUTIVE_SALARY' : 'EMPLOYEE_SALARY',
        paymentMethod: 'VIREMENT',
        status,
        netSalary: net,
        socialCharges: urssaf,
        withholdingTax: pas,
        createdAt: new Date().toISOString(),
      };

    } else if (activeTab === 'CURRENT_ACCOUNT') {
      // 3. CURRENT ACCOUNT (CCA) OPERATION
      const amount = Number(ccaAmount) || 0;
      if (amount <= 0) {
        setErrorMessage('Veuillez saisir un montant pour le mouvement de compte courant.');
        return;
      }

      const isDeposit = ccaDirection === 'DEPOSIT';

      newTx = {
        id: `tx-cca-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        companyId: targetCompanyId,
        type: isDeposit ? 'INCOME' : 'EXPENSE',
        operationType: 'CURRENT_ACCOUNT',
        invoiceNumber: `CCA-${Date.now().toString().slice(-4)}`,
        partnerName: isIntercoTransfer ? (companies.find((c) => c.id === intercoCounterpartId)?.name || 'Filiale') : ccaPartner,
        description: isIntercoTransfer
          ? `Avance de trésorerie inter-sociétés vers ${companies.find((c) => c.id === intercoCounterpartId)?.name}`
          : `${isDeposit ? 'Apport' : 'Remboursement'} compte courant d'associé (${ccaPartner})`,
        issueDate,
        dueDate: issueDate,
        amountHT: amount,
        tvaRate: 0,
        amountTVA: 0,
        amountTTC: amount,
        category: isDeposit ? 'CCA_CONTRIBUTION' : 'CCA_REIMBURSEMENT',
        paymentMethod: 'VIREMENT',
        status: 'PAID',
        ccaPartnerName: ccaPartner,
        ccaDirection,
        isInterCompany: isIntercoTransfer,
        interCompanyTargetId: isIntercoTransfer ? intercoCounterpartId : undefined,
        createdAt: new Date().toISOString(),
      };

    } else if (activeTab === 'TAX_DUTY') {
      // 4. TAX & DUTIES OPERATION
      const amount = Number(taxAmount) || 0;
      if (amount <= 0) {
        setErrorMessage('Veuillez renseigner le montant de l\'impôt ou taxe.');
        return;
      }

      newTx = {
        id: `tx-tax-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        companyId: targetCompanyId,
        type: 'EXPENSE',
        operationType: 'TAX_DUTY',
        invoiceNumber: `TAX-${taxType}`,
        partnerName: 'DGFIP / Trésor Public',
        description: `Règlement ${taxType} - ${company?.name}`,
        issueDate,
        dueDate,
        amountHT: amount,
        tvaRate: 0,
        amountTVA: 0,
        amountTTC: amount,
        category: taxType === 'IS' ? 'TAX_CORPORATE_IS' : taxType === 'TVA' ? 'TAX_VAT_PAYMENT' : 'TAX_CFE_PROPERTY',
        paymentMethod: 'PRELEVEMENT',
        status,
        createdAt: new Date().toISOString(),
      };

    } else {
      return;
    }

    onAddTransaction(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] my-0 sm:my-6">
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Saisie & Contrôle d'Écriture Financière
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Factures, salaires, compte courant d'associé et fiscalité
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operation Type Tabs */}
        <div className="px-4 sm:px-6 pt-2 sm:pt-3 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto text-xs flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('EXPENSE_INVOICE')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'EXPENSE_INVOICE'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Facture Achat / Vente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SALARY_PAYROLL')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'SALARY_PAYROLL'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Paie & Rémunérations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CURRENT_ACCOUNT')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'CURRENT_ACCOUNT'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Compte Courant & Avance CCA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TAX_DUTY')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'TAX_DUTY'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Impôts & Taxes</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target Company Selector */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <label className="text-xs font-semibold text-slate-800">
                  Société d'imputation *
                </label>
              </div>

              <select
                value={targetCompanyId}
                onChange={(e) => setTargetCompanyId(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-none"
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.legalForm}) - {VAT_REGIME_LABELS[c.vatRegime || 'ASSUJETTI_NORMAL']?.short}
                  </option>
                ))}
              </select>
            </div>

            {isCompanyVatExempt && (
              <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5">
                <Percent className="w-3 h-3 text-amber-700 flex-shrink-0" />
                <span>Régime Franchise en base (Art. 293 B CGI) : Pas de TVA facturée ou déduite.</span>
              </div>
            )}
          </div>

          {/* TAB 1: INVOICE FORM */}
          {activeTab === 'EXPENSE_INVOICE' && (
            <div className="space-y-4">
              {/* Quick capture buttons (Smartphones & Desktop) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold transition-all shadow-2xs cursor-pointer min-h-[44px]"
                  title="Ouvrir l'appareil photo du smartphone pour scanner le ticket"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Prendre photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer min-h-[44px]"
                  title="Sélectionner un fichier PDF ou une image"
                >
                  <UploadCloud className="w-4 h-4 text-slate-600" />
                  <span>Fichier / PDF</span>
                </button>
              </div>

              <input
                type="file"
                ref={cameraInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {/* Dropzone File */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  file ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                {isAnalyzing ? (
                  <div className="py-2 flex items-center justify-center gap-2 text-indigo-700 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Lecture automatique de la facture par l'IA...</span>
                  </div>
                ) : file ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 truncate max-w-sm">{file.name}</div>
                        <div className="text-[10px] text-slate-500">Prêt pour classement Google Drive</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-indigo-700">Changer</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
                    <UploadCloud className="w-4 h-4 text-slate-500" />
                    <span>Glisser la facture (PDF, image) ou <strong>parcourir</strong></span>
                  </div>
                )}
              </div>

              {/* Sens : Achat vs Vente */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInvoiceType('EXPENSE')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    invoiceType === 'EXPENSE' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Facture d'Achat (Fournisseur)
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('INCOME')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    invoiceType === 'INCOME' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Facture de Vente (Client)
                </button>
              </div>

              {/* Tiers & Référence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {invoiceType === 'EXPENSE' ? 'Nom du Fournisseur *' : 'Nom du Client *'}
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder={invoiceType === 'EXPENSE' ? 'Ex: Google Cloud, OVH, Cabinet Comptable' : 'Ex: Client SARL, Locataire...'}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    N° Facture / Pièce
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ex: FAC-2026-0042"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Date d'émission *
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Date d'échéance / Paiement *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Financials: HT, TVA, TTC */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Montant HT (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountHT}
                    onChange={(e) => handleAmountHTChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Taux TVA {isCompanyVatExempt && '(0% Franchise)'}
                  </label>
                  <select
                    value={tvaRate}
                    onChange={(e) => handleTvaRateChange(parseFloat(e.target.value))}
                    disabled={isCompanyVatExempt}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-900 focus:outline-none ${
                      isCompanyVatExempt ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  >
                    <option value={20}>20 % (Normal)</option>
                    <option value={10}>10 % (Intermédiaire)</option>
                    <option value={5.5}>5.5 % (Réduit)</option>
                    <option value={0}>0 % (Exonéré)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Montant TTC (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountTTC}
                    readOnly
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-100 border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYROLL FORM */}
          {activeTab === 'SALARY_PAYROLL' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Bénéficiaire (Salarié / Dirigeant) *
                  </label>
                  <input
                    type="text"
                    value={payrollBeneficiary}
                    onChange={(e) => setPayrollBeneficiary(e.target.value)}
                    placeholder="Dimitri Blanc, Collaborateur..."
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mois de paie *
                  </label>
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Salaire Net à verser (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollNet}
                    onChange={(e) => setPayrollNet(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Ex: 3500.00"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Virement bancaire au salarié</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Charges URSSAF (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollUrssaf}
                    onChange={(e) => setPayrollUrssaf(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Ex: 1400.00"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">À régler le 15 du mois suivant</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Coût Global Société (€)
                  </label>
                  <div className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 border border-slate-300 font-mono font-bold text-slate-900">
                    {formatEuro((Number(payrollNet) || 0) + (Number(payrollUrssaf) || 0))}
                  </div>
                  <span className="text-[10px] text-slate-400">Impact total sur la trésorerie</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CURRENT ACCOUNT (CCA) */}
          {activeTab === 'CURRENT_ACCOUNT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCcaDirection('DEPOSIT');
                    setIsIntercoTransfer(false);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    ccaDirection === 'DEPOSIT' && !isIntercoTransfer ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Apport Associé (Injection Tréso)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCcaDirection('WITHDRAWAL');
                    setIsIntercoTransfer(false);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    ccaDirection === 'WITHDRAWAL' && !isIntercoTransfer ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Remboursement Associé
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nom de l'Associé *
                  </label>
                  <input
                    type="text"
                    value={ccaPartner}
                    onChange={(e) => setCcaPartner(e.target.value)}
                    placeholder="Dimitri Blanc"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Montant de l'opération (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ccaAmount}
                    onChange={(e) => setCcaAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Ex: 5000.00"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                <span className="font-bold block mb-1">Impact sur le compte courant :</span>
                {ccaDirection === 'DEPOSIT' 
                  ? 'Augmente la créance de l\'associé sur la société (la société doit ces fonds à l\'associé).'
                  : 'Diminue le solde du compte courant d\'associé (la société rembourse l\'associé).'}
              </div>
            </div>
          )}

          {/* TAB 4: TAXES */}
          {activeTab === 'TAX_DUTY' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nature de l'Impôt / Taxe *
                  </label>
                  <select
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                  >
                    <option value="IS">Impôt sur les Sociétés (Acompte ou Solde IS)</option>
                    <option value="CFE">Cotisation Foncière des Entreprises (CFE)</option>
                    <option value="TVA">Télérèglement TVA au Trésor Public</option>
                    <option value="TAXE_FONCIERE">Taxe Foncière (Immobilier / SCI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Montant Décaissé (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common Status & Payment Method */}
          <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Mode de règlement
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
              >
                <option value="VIREMENT">Virement bancaire</option>
                <option value="PRELEVEMENT">Prélèvement automatique</option>
                <option value="CB">Carte bancaire pro</option>
                <option value="CHEQUE">Chèque</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Statut du paiement
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
              >
                <option value="PAID">Payé / Débité (Trésorerie déduite)</option>
                <option value="PENDING">En attente d'échéance (Prévisionnel)</option>
              </select>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 pb-1 flex items-center justify-end gap-2 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors min-h-[44px] flex-1 sm:flex-initial"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isUploadingDrive}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
            >
              {isUploadingDrive ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Envoi Drive & Enregistrement...</span>
                </>
              ) : (
                <span>Valider l'écriture</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
