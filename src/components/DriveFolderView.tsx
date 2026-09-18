import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Company, DriveConfig, Transaction } from '../types';
import { 
  Folder, 
  FolderPlus, 
  FileText, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  Trash2, 
  Upload, 
  FolderTree, 
  Loader2, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Search, 
  HardDrive,
  Layers,
  ArrowRight,
  Plus
} from 'lucide-react';
import { 
  listFolderContents, 
  createNewDriveFolder, 
  deleteDriveFile, 
  uploadInvoiceFile, 
  renameDriveItem,
  fetchDriveFileBase64,
  formatStandardInvoiceFileName,
  generateFullCompanyYearStructure
} from '../services/driveService';
import { analyzeInvoiceBase64 } from '../services/aiService';

interface DriveFolderViewProps {
  companies: Company[];
  selectedCompanyId: string | null;
  driveConfig: DriveConfig;
  token: string | null;
  onAddTransaction: (transaction: Transaction) => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
  onOpenUploadModal: () => void;
}

interface NavCrumb {
  id: string;
  name: string;
}

export const DriveFolderView: React.FC<DriveFolderViewProps> = ({
  companies,
  selectedCompanyId,
  driveConfig,
  token,
  onAddTransaction,
  onShowToast,
  onOpenUploadModal,
}) => {
  const rootFolderId = driveConfig.rootFolderId || '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-';
  const rootFolderUrl = driveConfig.rootFolderUrl || `https://drive.google.com/drive/folders/${rootFolderId}`;

  // Current folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string>(rootFolderId);
  const [breadcrumbs, setBreadcrumbs] = useState<NavCrumb[]>([
    { id: rootFolderId, name: driveConfig.rootFolderName || 'Compta_Groupe (Racine)' },
  ]);
  const [contents, setContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'TREE' | 'EXPLORER'>('TREE');

  // Expanded tree folders
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    root: true,
    'folder-holding': true,
    'folder-immo': true,
    'folder-sci': true,
    'folder-holding-2026': true,
  });

  // Action states
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load contents when currentFolderId changes
  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, token]);

  const loadFolder = async (folderId: string) => {
    setIsLoading(true);
    try {
      const items = await listFolderContents(token || '', folderId);
      setContents(items);
    } catch (err) {
      console.error('Erreur chargement dossier:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFolder = (subId: string, subName: string) => {
    setCurrentFolderId(subId);
    setBreadcrumbs((prev) => [...prev, { id: subId, name: subName }]);
    setViewMode('EXPLORER');
  };

  const handleNavigateBreadcrumb = (targetIndex: number) => {
    const target = breadcrumbs[targetIndex];
    if (!target) return;
    setBreadcrumbs((prev) => prev.slice(0, targetIndex + 1));
    setCurrentFolderId(target.id);
  };

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;

    setIsSubmittingFolder(true);
    try {
      await createNewDriveFolder(token || '', cleanName, currentFolderId);
      onShowToast(`Dossier "${cleanName}" créé avec succès !`, 'success');
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadFolder(currentFolderId);
    } catch (err: any) {
      onShowToast(`Erreur : ${err.message || 'Impossible de créer le dossier'}`, 'info');
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      onShowToast(`Téléversement de "${file.name}"...`, 'info');
      await uploadInvoiceFile(
        token || '',
        file,
        currentFolderId,
        file.name,
        file.type || 'application/pdf'
      );
      onShowToast(`"${file.name}" a été ajouté au dossier Drive !`, 'success');
      await loadFolder(currentFolderId);
    } catch (err: any) {
      onShowToast(`Échec du téléversement : ${err.message}`, 'info');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteItem = async (item: any) => {
    const confirmMsg = item.isFolder
      ? `Supprimer le dossier "${item.name}" ?`
      : `Supprimer le document "${item.name}" ?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDriveFile(token || '', item.id);
      onShowToast(`"${item.name}" supprimé.`, 'success');
      setContents((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      onShowToast(`Erreur de suppression : ${err.message}`, 'info');
    }
  };

  const handleAnalyzeFile = async (fileItem: any) => {
    setAnalyzingFileId(fileItem.id);
    try {
      onShowToast(`Téléchargement et analyse de "${fileItem.name}" par Gemini...`, 'info');
      let base64 = '';
      let mimeType = fileItem.mimeType || 'application/pdf';
      let fileName = fileItem.name;

      if (token) {
        try {
          const res = await fetchDriveFileBase64(token, fileItem.id);
          base64 = res.base64;
          mimeType = res.mimeType;
          fileName = res.fileName;
        } catch {
          // fallback
        }
      }

      const analysis = await analyzeInvoiceBase64(base64, mimeType, fileName);
      const targetCompany = selectedCompanyId || companies[0]?.id || 'holding-sas';

      const newTx: Transaction = {
        id: `tx-drive-${Date.now()}`,
        companyId: targetCompany,
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
          webViewLink: fileItem.webViewLink || `${rootFolderUrl}`,
          mimeType: mimeType,
          size: fileItem.size,
          uploadedAt: new Date().toISOString(),
          folderId: currentFolderId,
        },
        createdAt: new Date().toISOString(),
      };

      onAddTransaction(newTx);
      onShowToast(`Facture ${newTx.invoiceNumber} comptabilisée avec succès !`, 'success');
    } catch (err: any) {
      console.error('Erreur analyse:', err);
      onShowToast('Impossible d\'analyser la pièce : ' + err.message, 'info');
    } finally {
      setAnalyzingFileId(null);
    }
  };

  const filteredContents = useMemo(() => {
    if (!searchQuery.trim()) return contents;
    const q = searchQuery.toLowerCase().trim();
    return contents.filter((item) => item.name.toLowerCase().includes(q));
  }, [contents, searchQuery]);

  return (
    <div className="space-y-4" id="drive-folder-view">
      {/* Top Banner: Direct Connection & Status */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xs border border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">
                Dossiers Google Drive du Groupe
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Connecté directement
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              Dossier racine lié : <span className="font-mono text-white font-semibold">{rootFolderId}</span> • Vos justificatifs sont synchronisés et classés par société et par année.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <a
            href={rootFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-indigo-900 hover:bg-indigo-50 shadow-xs transition-colors"
          >
            <span>Ouvrir sur Google Drive</span>
            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
          </a>

          <button
            onClick={onOpenUploadModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Déposer facture</span>
          </button>
        </div>
      </div>

      {/* Control Bar: View Mode Switcher, Search, Actions */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Toggle Mode */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('TREE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'TREE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
            <span>Arborescence Complète</span>
          </button>
          <button
            onClick={() => setViewMode('EXPLORER')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'EXPLORER'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span>Explorateur de Dossier</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un dossier, une facture ou un reçu..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Nouveau dossier</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>Déposer fichier</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
          />
        </div>
      </div>

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2 flex-1 w-full">
            <FolderPlus className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du nouveau sous-dossier (ex: 05_Notes_de_frais, 2027...)"
              className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmittingFolder || !newFolderName.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-2xs"
            >
              {isSubmittingFolder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Créer le dossier</span>
            </button>
          </div>
        </form>
      )}

      {/* View Mode 1: TREE VIEW */}
      {viewMode === 'TREE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                <span>Arborescence des Dossiers Comptables (Compta_Groupe)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Structure prête pour vos 3 structures. Cliquez sur un dossier pour entrer dedans et consulter ses documents.
              </p>
            </div>
            <a
              href={rootFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Voir sur Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Root node */}
          <div className="space-y-2 text-xs">
            {/* Boîte de dépôt temporaire */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between hover:bg-amber-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">00_Boite_de_Depot_Factures_a_traiter</span>
                  <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                    Boîte de dépôt rapide
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleOpenFolder('folder-depot', '00_Boite_de_Depot_Factures_a_traiter')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-white border border-amber-200 rounded-lg hover:bg-amber-100/50 cursor-pointer"
              >
                <span>Ouvrir</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Company Folders */}
            {companies.map((comp) => {
              const nodeKey = `company-${comp.id}`;
              const isExpanded = expandedNodes[nodeKey] ?? true;

              return (
                <div key={comp.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* Company Header */}
                  <div className="p-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors">
                    <div 
                      onClick={() => toggleNode(nodeKey)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1 select-none"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: comp.color }} 
                      />
                      <span className="font-bold text-slate-900 text-sm">{comp.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        SIREN {comp.siren || '912 345 678'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenFolder(`folder-${comp.id}`, comp.name)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 cursor-pointer shadow-2xs"
                      >
                        <span>Parcourir</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Subfolders for Years & Categories */}
                  {isExpanded && (
                    <div className="p-3 pl-8 bg-white space-y-2 border-t border-slate-100">
                      {[2026, 2025].map((year) => {
                        const yearKey = `${comp.id}-${year}`;
                        const isYearExpanded = expandedNodes[yearKey] ?? true;

                        return (
                          <div key={year} className="space-y-1.5">
                            <div 
                              onClick={() => toggleNode(yearKey)}
                              className="flex items-center gap-2 py-1 text-slate-800 font-semibold cursor-pointer hover:text-indigo-600 select-none"
                            >
                              {isYearExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Année {year}</span>
                            </div>

                            {isYearExpanded && (
                              <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                <button
                                  onClick={() => handleOpenFolder(`folder-${comp.id}-${year}-achats`, `01_Achats_Fournisseurs (${comp.name} ${year})`)}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-300 text-left transition-all group cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-indigo-900">
                                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="truncate">01_Achats</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Dépenses & Factures</p>
                                </button>

                                <button
                                  onClick={() => handleOpenFolder(`folder-${comp.id}-${year}-ventes`, `02_Ventes_Clients (${comp.name} ${year})`)}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all group cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-emerald-900">
                                    <Folder className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="truncate">02_Ventes</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Recettes & Clients</p>
                                </button>

                                <button
                                  onClick={() => handleOpenFolder(`folder-${comp.id}-${year}-banque`, `03_Banque_Releves (${comp.name} ${year})`)}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-300 text-left transition-all group cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-blue-900">
                                    <Folder className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="truncate">03_Banque</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Relevés bancaires</p>
                                </button>

                                <button
                                  onClick={() => handleOpenFolder(`folder-${comp.id}-${year}-fiscal`, `04_Fiscal_TVA (${comp.name} ${year})`)}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50 hover:border-purple-300 text-left transition-all group cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-purple-900">
                                    <Folder className="w-3.5 h-3.5 text-purple-500" />
                                    <span className="truncate">04_Fiscal_TVA</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Déclarations CA3/CA12</p>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Mode 2: EXPLORER VIEW */}
      {viewMode === 'EXPLORER' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 border-b border-slate-100 text-xs">
            <button
              onClick={() => {
                setViewMode('TREE');
                setCurrentFolderId(rootFolderId);
                setBreadcrumbs([{ id: rootFolderId, name: driveConfig.rootFolderName || 'Compta_Groupe (Racine)' }]);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
              <span>Arborescence</span>
            </button>

            <span className="text-slate-300">/</span>

            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id + idx}>
                  <button
                    onClick={() => handleNavigateBreadcrumb(idx)}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                      isLast
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {crumb.name}
                  </button>
                  {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Current folder actions & summary */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <span>Contenu : </span>
              <span className="font-bold text-slate-800">{filteredContents.length} élément(s)</span>
            </div>
            <a
              href={`${rootFolderUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <span>Ouvrir ce dossier sur Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Items Grid */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs">Chargement du dossier...</p>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <Folder className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Dossier vide</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Déposez une facture ou créez un sous-dossier ci-dessous.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-50 shadow-2xs"
                >
                  + Créer sous-dossier
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-2xs"
                >
                  Déposer une pièce
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredContents.map((item) => {
                const isFolder = item.isFolder;

                if (isFolder) {
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenFolder(item.id, item.name)}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-300 transition-all cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 group-hover:bg-indigo-100 text-amber-700 group-hover:text-indigo-700 flex items-center justify-center flex-shrink-0 transition-colors">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-950 truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">Dossier</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                  );
                }

                // File card
                const isAnalyzing = analyzingFileId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {item.size ? <span>{(item.size / 1024).toFixed(0)} Ko</span> : <span>Pièce jointe</span>}
                          <span>•</span>
                          <span>{item.modifiedTime ? item.modifiedTime.substring(0, 10) : 'Google Drive'}</span>
                        </div>
                      </div>
                    </div>

                    {/* File actions */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <button
                        onClick={() => handleAnalyzeFile(item)}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors cursor-pointer"
                        title="Extraire le montant, la TVA et ajouter aux écritures"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        )}
                        <span>Comptabiliser</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <a
                          href={item.webViewLink || `${rootFolderUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="Voir sur Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
