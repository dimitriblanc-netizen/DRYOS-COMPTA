import { PaymentMethod, PaymentStatus, TransactionType } from '../types';

export interface InvoiceAnalysisResult {
  type?: TransactionType;
  amountHT?: number;
  amountTVA?: number;
  tvaRate?: number;
  amountTTC?: number;
  partnerName?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  category?: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  description?: string;
  isInterCompany?: boolean;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // remove data URL prefix (e.g. data:image/png;base64, or data:application/pdf;base64,)
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function analyzeInvoiceBase64(
  base64Data: string,
  mimeType: string,
  fileName: string,
  additionalNotes?: string
): Promise<InvoiceAnalysisResult> {
  const response = await fetch('/api/analyze-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64: base64Data,
      mimeType: mimeType || 'application/pdf',
      fileName: fileName,
      textContent: additionalNotes,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Impossible d\'analyser la facture.');
  }

  const data = await response.json();
  const raw = data.analysis || {};

  // Clean and sanitize numbers
  const numHT = typeof raw.amountHT === 'number' ? raw.amountHT : parseFloat(raw.amountHT) || 0;
  const numTVA = typeof raw.amountTVA === 'number' ? raw.amountTVA : parseFloat(raw.amountTVA) || 0;
  const numTTC = typeof raw.amountTTC === 'number' ? raw.amountTTC : parseFloat(raw.amountTTC) || (numHT + numTVA);
  const tvaRate = typeof raw.tvaRate === 'number' ? raw.tvaRate : parseFloat(raw.tvaRate) || (numHT > 0 ? Math.round((numTVA / numHT) * 100) : 20);

  return {
    type: raw.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    amountHT: Math.round(numHT * 100) / 100,
    amountTVA: Math.round(numTVA * 100) / 100,
    tvaRate: tvaRate,
    amountTTC: Math.round(numTTC * 100) / 100,
    partnerName: raw.partnerName || 'Fournisseur / Client non spécifié',
    invoiceNumber: raw.invoiceNumber || `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    issueDate: raw.issueDate || new Date().toISOString().split('T')[0],
    dueDate: raw.dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    category: raw.category || (raw.type === 'INCOME' ? 'CLIENT_INVOICE' : 'SERVICES_SUBCONTRACTING'),
    paymentMethod: raw.paymentMethod || 'VIREMENT',
    status: raw.status === 'PAID' ? 'PAID' : 'PENDING',
    description: raw.description || `Facture ${raw.partnerName || ''}`,
    isInterCompany: Boolean(raw.isInterCompany),
  };
}

export async function analyzeInvoiceDocument(
  file: File,
  additionalNotes?: string
): Promise<InvoiceAnalysisResult> {
  const base64Data = await fileToBase64(file);
  return analyzeInvoiceBase64(base64Data, file.type || 'application/pdf', file.name, additionalNotes);
}
