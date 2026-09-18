import React, { useState, useEffect, useRef } from 'react';
import { Company, DriveConfig, Transaction } from '../types';
import { 
  X, 
  HardDrive, 
  Folder, 
  FolderPlus,
  FileText, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  Trash2,
  Upload,
  Loader2,
  CheckCircle2,
  FolderTree,
  Edit3,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { 
  listFolderContents, 
  fetchDriveFileBase64, 
  createNewDriveFolder, 
  deleteDriveFile,
  uploadInvoiceFile,
  renameDriveItem,
  generateFullCompanyYearStructure,
  formatStandardInvoiceFileName
} from '../services/driveService';
import { analyzeInvoiceBase64 } from '../services/aiService';

interface DriveExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onConnectDrive: () => void;
  driveConfig: DriveConfig;
  companies: Company[];
  onAddTransaction: (transaction: Transaction) => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

interface NavCrumb {
  id: string;
  name: string;
}

export const DriveExplorerModal: React.FC<DriveExplorerModalProps> = ({
  isOpen,
  onClose,
  token,
  onConnectDrive,
  driveConfig,
  companies,
  onAddTransaction,
  onShowToast,
}) => {
  const rootFolderId = driveConfig.rootFolderId || '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-';
  const rootFolderUrl = driveConfig.rootFolderUrl || `https://drive.google.com/drive/folders/${rootFolderId}`;

  const [currentFolderId, setCurrentFolderId] = useState<string>(rootFolderId);
  const [breadcrumbs, setBreadcrumbs] = useState<NavCrumb[]>([
    { id: rootFolderId, name: 'Dossier Trié Drive (Racine)' },
  ]);
  const [contents, setContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [selectedTargetCompany, setSelectedTargetCompany] = useState<string>(companies[0]?.id || 'holding-sas');

  // New folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContents(currentFolderId);
    }
  }, [isOpen, token, currentFolderId]);

  const loadContents = async (folderId: string) => {
    setIsLoading(true);
    try {
      const items = await listFolderContents(token || '', folderId);
      setContents(items);
    } catch (err: any) {
      console.error('Erreur chargement contenu dossier:', err);
      onShowToast('Impossible de lire le contenu du dossier Drive.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSubfolder = (subId: string, subName: string) => {
    setCurrentFolderId(subId);
    setBreadcrumbs((prev) => [...prev, { id: subId, name: subName }]);
  };

  const handleNavigateBack = (targetIndex: number) => {
    const targetCrumb = breadcrumbs[targetIndex];
    if (!targetCrumb) return;
    setBreadcrumbs((prev) => prev.slice(0, targetIndex + 1));
    setCurrentFolderId(targetCrumb.id);
  };

  // Create a new folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;

    setIsSubmittingFolder(true);
    try {
      await createNewDriveFolder(token || '', cleanName, currentFolderId);
      onShowToast(`Dossier "${cleanName}" créé sur votre Google Drive !`, 'success');
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadContents(currentFolderId);
    } catch (err: any) {
      console.error('Erreur création dossier:', err);
      onShowToast(`Erreur : ${err.message || 'Impossible de créer le dossier'}`, 'info');
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  // Delete an item (file or folder)
  const handleDeleteItem = async (item: any) => {
    const confirmText = item.isFolder 
      ? `Supprimer définitivement le dossier "${item.name}" et son contenu de votre Drive ?`
      : `Supprimer la facture "${item.name}" de votre Drive ?`;
    
    if (!window.confirm(confirmText)) return;

    setDeletingItemId(item.id);
    try {
      await deleteDriveFile(token || '', item.id);
      onShowToast(`"${item.name}" supprimé de Google Drive.`, 'success');
      setContents((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      console.error('Erreur suppression Drive:', err);
      onShowToast(`Erreur lors de la suppression : ${err.message}`, 'info');
    } finally {
      setDeletingItemId(null);
    }
  };

  // Upload file directly into current folder
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      onShowToast(`Envoi de "${file.name}" vers Google Drive...`, 'info');
      await uploadInvoiceFile(
        token || '',
        file,
        currentFolderId,
        file.name,
        file.type || 'application/pdf'
      );
      onShowToast(`"${file.name}" a été ajouté dans ce dossier Drive !`, 'success');
      await loadContents(currentFolderId);
    } catch (err: any) {
      console.error('Erreur téléversement Drive:', err);
      onShowToast(`Échec du téléversement : ${err.message}`, 'info');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScanAndImport = async (fileItem: any) => {
    setAnalyzingFileId(fileItem.id);
    try {
      onShowToast(`Téléchargement de "${fileItem.name}" depuis Google Drive...`, 'info');
      let base64 = '';
      let mimeType = fileItem.mimeType || 'application/pdf';
      let fileName = fileItem.name;

      if (token) {
        try {
          const fetched = await fetchDriveFileBase64(token, fileItem.id);
          base64 = fetched.base64;
          mimeType = fetched.mimeType;
          fileName = fetched.fileName;
        } catch {
          // fallback
        }
      }

      onShowToast(`Analyse intelligente par l'IA Gemini en cours...`, 'info');
      const analysis = await analyzeInvoiceBase64(base64, mimeType, fileName);

      // Create transaction
      const newTx: Transaction = {
        id: `tx-drive-${Date.now()}`,
        companyId: selectedTargetCompany,
        type: analysis.type || 'EXPENSE',
        invoiceNumber: analysis.invoiceNumber || `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        partnerName: analysis.partnerName || 'Fournisseur / Client',
        description: analysis.description || `Facture ${fileName}`,
        issueDate: analysis.issueDate || new Date().toISOString().split('T')[0],
        dueDate: analysis.dueDate || new Date().toISOString().split('T')[0],
        amountHT: analysis.amountHT || 0,
        tvaRate: analysis.tvaRate || 20,
        amountTVA: analysis.amountTVA || 0,
        amountTTC: analysis.amountTTC || 0,
        category: analysis.category || 'SERVICES_SUBCONTRACTING',
        paymentMethod: analysis.paymentMethod || 'VIREMENT',
        status: analysis.status || 'PAID',
        isInterCompany: analysis.isInterCompany,
        driveFile: {
          id: fileItem.id,
          name: fileItem.name,
          webViewLink: fileItem.webViewLink || `https://drive.google.com/file/d/${fileItem.id}/view`,
          mimeType: mimeType,
          size: fileItem.size,
          uploadedAt: new Date().toISOString(),
          folderId: currentFolderId,
        },
        createdAt: new Date().toISOString(),
      };

      onAddTransaction(newTx);
      onShowToast(`Facture "${fileItem.name}" comptabilisée avec succès !`, 'success');
    } catch (err: any) {
      console.error('Erreur scan facture depuis Drive:', err);
      onShowToast(`Erreur lors de l'analyse : ${err.message || 'Fichier non lisible'}`, 'info');
    } finally {
      setAnalyzingFileId(null);
    }
  };

  // Generate full structure from scratch
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerateStructure = async () => {
    const confirmMsg = `Générer l'arborescence complète à partir de 0 pour vos ${companies.length} sociétés (Holding, Société Immo, SCI) et les années 2026 & 2025 dans ce dossier Drive ?\n\nTous les sous-dossiers 01_Achats et 02_Ventes seront automatiquement créés avec la boîte de dépôt temporaire.`;
    if (!window.confirm(confirmMsg)) return;

    setIsGeneratingStructure(true);
    setGenerationProgress(5);
    setGenerationStepText('Initialisation de l\'arborescence propre...');

    try {
      await generateFullCompanyYearStructure(
        token || '',
        currentFolderId,
        companies,
        [2026, 2025],
        (step, current, total) => {
          setGenerationStepText(step);
          setGenerationProgress(Math.round((current / total) * 100));
        }
      );

      onShowToast('Arborescence complète créée avec succès sur votre Google Drive !', 'success');
      await loadContents(currentFolderId);
    } catch (err: any) {
      console.error('Erreur génération arborescence:', err);
      onShowToast(`Erreur : ${err.message || 'Impossible de créer l\'arborescence'}`, 'info');
    } finally {
      setIsGeneratingStructure(false);
      setGenerationStepText('');
      setGenerationProgress(0);
    }
  };

  // Rename to standard chronological format
  const [renamingItem, setRenamingItem] = useState<any | null>(null);
  const [renameDate, setRenameDate] = useState('');
  const [renamePartner, setRenamePartner] = useState('');
  const [renameAmount, setRenameAmount] = useState('');
  const [renameRef, setRenameRef] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const openRenameModal = (item: any) => {
    const parts = item.name.replace(/\.[^/.]+$/, '').split('_');
    const dateCandidate = parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) 
      ? parts[0] 
      : new Date().toISOString().split('T')[0];
    
    setRenamingItem(item);
    setRenameDate(dateCandidate);
    setRenamePartner(parts[1] || item.name.replace(/\.[^/.]+$/, ''));
    setRenameAmount(parts[2]?.replace('EUR', '') || '');
    setRenameRef(parts[3] || '');
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !renamingItem) return;

    const formattedName = formatStandardInvoiceFileName({
      date: renameDate,
      partnerName: renamePartner,
      amountTTC: renameAmount ? parseFloat(renameAmount.replace(',', '.')) : undefined,
      invoiceNumber: renameRef,
      originalFileName: renamingItem.name,
    });

    setIsRenaming(true);
    try {
      await renameDriveItem(token, renamingItem.id, formattedName);
      onShowToast(`Fichier renommé en : "${formattedName}"`, 'success');
      setContents(prev => prev.map(i => i.id === renamingItem.id ? { ...i, name: formattedName } : i));
      setRenamingItem(null);
    } catch (err: any) {
      console.error('Erreur renommage Drive:', err);
      onShowToast(`Échec du renommage : ${err.message}`, 'info');
    } finally {
      setIsRenaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Gestionnaire Google Drive</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                  Dossier Trié & Opérations
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                Créez des dossiers, supprimez des pièces et comptabilisez vos factures en 1 clic grâce à l'IA
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

        <div className="p-6 space-y-4">
          {/* Top Bar: Folder ID + Drive Direct Link + Action Buttons */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900">
                Dossier racine lié : <span className="font-mono text-indigo-700 font-normal">{rootFolderId}</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Toutes les modifications (création de dossier, suppression) sont synchronisées en direct sur Google Drive.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={rootFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors flex-shrink-0"
              >
                <span>Ouvrir sur Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Direct Connection indicator */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-emerald-950">Google Drive connecté directement</p>
                <p className="text-emerald-700 text-[11px]">
                  Tous vos dossiers et sous-dossiers sont accessibles, consultables et synchronisés.
                </p>
              </div>
            </div>
            <a
              href={`https://drive.google.com/drive/folders/${currentFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-800 border border-emerald-200 font-semibold hover:bg-emerald-100/50 transition-colors shadow-2xs"
            >
              <span>Ouvrir sur Drive</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </a>
          </div>

          {/* Explorer Toolbar: Actions (New folder, Upload, Refresh) + Target Company */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleGenerateStructure}
                    disabled={isGeneratingStructure}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    title="Créer toute l'arborescence propre à partir de zéro"
                  >
                    {isGeneratingStructure ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderTree className="w-3.5 h-3.5" />
                    )}
                    <span>Générer arborescence propre (0)</span>
                  </button>

                  <button
                    onClick={() => setIsCreatingFolder(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Nouveau dossier</span>
                  </button>

                  {/* Direct upload into this drive folder */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>{isUploading ? 'Envoi...' : 'Déposer ici'}</span>
                  </button>

                  <button
                    onClick={() => loadContents(currentFolderId)}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Actualiser la liste"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Target company assignment for AI imports */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 font-medium">Affecter facture à :</span>
                  <select
                    value={selectedTargetCompany}
                    onChange={(e) => setSelectedTargetCompany(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.legalForm})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Breadcrumbs Navigation */}
              <div className="flex items-center gap-1 text-xs overflow-x-auto py-1.5 px-2 bg-slate-50 rounded-lg border border-slate-200">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    <button
                      onClick={() => handleNavigateBack(idx)}
                      className={`hover:text-indigo-600 transition-colors whitespace-nowrap cursor-pointer px-1 py-0.5 rounded ${
                        idx === breadcrumbs.length - 1 
                          ? 'text-indigo-700 font-bold bg-white shadow-2xs' 
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Live Structure Generation Progress */}
              {isGeneratingStructure && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      {generationStepText || 'Création de l\'arborescence Drive en cours...'}
                    </span>
                    <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {generationProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Educational Chronological Sorting Banner */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowUpDown className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">
                    <strong className="text-slate-800">Tri chrono automatique :</strong> Factures nommées <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono font-bold">AAAA-MM-JJ_Fournisseur_xxEUR_Ref</code>
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                  Classé 01 Jan ➔ 31 Déc
                </span>
              </div>

              {/* In-line Folder Creation Box */}
              {isCreatingFolder && (
                <form 
                  onSubmit={handleCreateFolder}
                  className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-center gap-2 animate-in fade-in duration-100"
                >
                  <FolderPlus className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nom du nouveau dossier (ex: 2026_Factures_Holding)"
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white border border-indigo-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingFolder || !newFolderName.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingFolder ? 'Création...' : 'Créer dossier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </form>
              )}

              {/* Files / Subfolders List */}
              <div className="min-h-[240px] max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {isLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs">Synchronisation avec Google Drive...</span>
                  </div>
                ) : contents.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                    <Folder className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-700">Ce dossier est vide.</p>
                    <p className="text-[11px] text-slate-500">
                      Vous pouvez y créer un sous-dossier ou y glisser vos factures avec le bouton "Déposer ici".
                    </p>
                  </div>
                ) : (
                  contents.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.isFolder ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {item.isFolder ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{item.isFolder ? 'Dossier Drive' : 'Facture / Document'}</span>
                            {item.size && (
                              <>
                                <span>•</span>
                                <span>{Math.round(item.size / 1024)} Ko</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.isFolder ? (
                          <>
                            <button
                              onClick={() => handleOpenSubfolder(item.id, item.name)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors cursor-pointer"
                            >
                              <span>Ouvrir</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              disabled={deletingItemId === item.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce dossier du Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {item.webViewLink && (
                              <a
                                href={item.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Voir sur Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleScanAndImport(item)}
                              disabled={analyzingFileId === item.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {analyzingFileId === item.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Analyse IA...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Comptabiliser IA</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => openRenameModal(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Renommer au format chronologique AAAA-MM-JJ"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              disabled={deletingItemId === item.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce fichier du Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Sociétés configurées : {companies.map(c => c.name).join(', ')}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Modal Dialog: Renommer au format chronologique */}
        {renamingItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Format Chronologique Drive</h3>
                    <p className="text-[11px] text-slate-500">Normalise le nom pour un tri automatique par date</p>
                  </div>
                </div>
                <button
                  onClick={() => setRenamingItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmRename} className="mt-4 space-y-3.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fichier actuel</span>
                  <span className="font-mono text-slate-700 truncate block mt-0.5">{renamingItem.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Date d'émission</label>
                    <input
                      type="date"
                      required
                      value={renameDate}
                      onChange={(e) => setRenameDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Montant TTC (€)</label>
                    <input
                      type="text"
                      placeholder="145.50"
                      value={renameAmount}
                      onChange={(e) => setRenameAmount(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Fournisseur / Client</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: TotalEnergies"
                      value={renamePartner}
                      onChange={(e) => setRenamePartner(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">N° Facture / Réf</label>
                    <input
                      type="text"
                      placeholder="Ex: FAC-2026-081"
                      value={renameRef}
                      onChange={(e) => setRenameRef(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                    Nouveau nom dans Google Drive
                  </span>
                  <p className="font-mono text-xs font-semibold text-indigo-950 mt-1 break-all">
                    {formatStandardInvoiceFileName({
                      date: renameDate,
                      partnerName: renamePartner || 'Fournisseur',
                      amountTTC: renameAmount ? parseFloat(renameAmount.replace(',', '.')) : undefined,
                      invoiceNumber: renameRef,
                      originalFileName: renamingItem.name,
                    })}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRenamingItem(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isRenaming}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isRenaming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Renommage...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Renommer sur Google Drive</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

