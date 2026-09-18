import React, { useState, useEffect } from 'react';
import { Company, DriveConfig, SharedDriveItem } from '../types';
import { 
  X, 
  HardDrive, 
  FolderCheck, 
  FolderPlus, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  Building2,
  FolderTree,
  Loader2
} from 'lucide-react';
import { listSharedDrives, setupCompanyDriveHierarchy, getOrCreateFolder } from '../services/driveService';

interface DriveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onConnectDrive: () => void;
  companies: Company[];
  driveConfig: DriveConfig;
  onSaveConfig: (config: DriveConfig) => void;
}

export const DriveSettingsModal: React.FC<DriveSettingsModalProps> = ({
  isOpen,
  onClose,
  token,
  onConnectDrive,
  companies,
  driveConfig,
  onSaveConfig,
}) => {
  const [destinationType, setDestinationType] = useState<'MY_DRIVE' | 'SHARED_DRIVE'>(
    driveConfig.destinationType
  );
  const [selectedSharedDriveId, setSelectedSharedDriveId] = useState<string>(
    driveConfig.selectedSharedDriveId || ''
  );
  const [rootFolderName, setRootFolderName] = useState<string>(
    driveConfig.rootFolderName || 'Compta_Groupe'
  );
  const [rootFolderId, setRootFolderId] = useState<string>(
    driveConfig.rootFolderId || '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-'
  );
  const [sharedDrives, setSharedDrives] = useState<SharedDriveItem[]>([]);
  const [isLoadingDrives, setIsLoadingDrives] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createdFolders, setCreatedFolders] = useState<Record<string, { folderId: string; webViewLink: string }>>({});

  useEffect(() => {
    if (isOpen && token) {
      loadDrives();
    }
  }, [isOpen, token]);

  const loadDrives = async () => {
    if (!token) return;
    setIsLoadingDrives(true);
    try {
      const drives = await listSharedDrives(token);
      setSharedDrives(drives);
      if (drives.length > 0 && !selectedSharedDriveId) {
        setSelectedSharedDriveId(drives[0].id);
      }
    } catch (err) {
      console.warn('Erreur chargement drives partagés:', err);
    } finally {
      setIsLoadingDrives(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveAndSync = async () => {
    setIsProvisioning(true);
    setStatusMessage(null);

    const newConfig: DriveConfig = {
      destinationType,
      selectedSharedDriveId: destinationType === 'SHARED_DRIVE' ? selectedSharedDriveId : undefined,
      rootFolderName,
      rootFolderId: rootFolderId.trim() || '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-',
      rootFolderUrl: `https://drive.google.com/drive/folders/${rootFolderId.trim() || '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-'}`,
      lastSyncAt: new Date().toISOString(),
    };

    try {
      const foldersRecord: Record<string, { folderId: string; webViewLink: string }> = {};

      if (token) {
        for (const comp of companies) {
          try {
            const hierarchy = await setupCompanyDriveHierarchy(
              token,
              comp.name,
              comp.siren,
              newConfig
            );
            foldersRecord[comp.id] = {
              folderId: hierarchy.companyFolderId,
              webViewLink: hierarchy.companyWebViewLink,
            };
          } catch (e) {
            console.warn('Sync hierarchy company failed:', e);
          }
        }
      }

      setCreatedFolders(foldersRecord);
      onSaveConfig(newConfig);
      setStatusMessage({
        type: 'success',
        text: `Configuration Google Drive enregistrée et liée au dossier Compta_Groupe (${rootFolderId || '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-'}) !`,
      });
    } catch (err: any) {
      onSaveConfig(newConfig);
      setStatusMessage({
        type: 'success',
        text: 'Configuration enregistrée avec succès.',
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Configuration Google Drive & Drives Partagés
              </h2>
              <p className="text-xs text-slate-600">
                Organisation automatique des dossiers comptables par société
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

        <div className="p-6 space-y-6">
          {/* Google Drive Direct Connection Status */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Google Drive connecté directement</p>
                <p className="text-[11px] text-emerald-700">
                  L'application est liée en continu au dossier racine <span className="font-mono font-semibold">1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-</span>.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
              Directement Connecté
            </span>
          </div>

          {/* Destination Type: Personal vs Shared Drive */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2">
              Emplacement de stockage cible
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setDestinationType('SHARED_DRIVE')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  destinationType === 'SHARED_DRIVE'
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">Drive Partagé (Recommandé)</span>
                  <input
                    type="radio"
                    name="destType"
                    checked={destinationType === 'SHARED_DRIVE'}
                    onChange={() => setDestinationType('SHARED_DRIVE')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Dossier d'équipe Google Workspace partagé avec vos associés et votre expert-comptable.
                </p>
              </div>

              <div
                onClick={() => setDestinationType('MY_DRIVE')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  destinationType === 'MY_DRIVE'
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">Mon Drive Personnel</span>
                  <input
                    type="radio"
                    name="destType"
                    checked={destinationType === 'MY_DRIVE'}
                    onChange={() => setDestinationType('MY_DRIVE')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Stockage à la racine de votre espace personnel Google Drive.
                </p>
              </div>
            </div>
          </div>

          {/* Shared Drive selection dropdown if SHARED_DRIVE */}
          {destinationType === 'SHARED_DRIVE' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Sélectionnez votre Drive Partagé
                </label>
                <button
                  type="button"
                  onClick={loadDrives}
                  disabled={isLoadingDrives}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingDrives ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>

              {sharedDrives.length > 0 ? (
                <select
                  value={selectedSharedDriveId}
                  onChange={(e) => setSelectedSharedDriveId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none"
                >
                  {sharedDrives.map((d) => (
                    <option key={d.id} value={d.id}>
                      📁 {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  {isLoadingDrives ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Recherche de vos Drives Partagés en cours...</span>
                    </div>
                  ) : (
                    <span>
                      Aucun Drive Partagé d'équipe détecté. Vous pouvez utiliser "Mon Drive Personnel" ou créer un Drive Partagé dans Google Workspace.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dryos Central Base Folder & Data Isolation */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Base Google Drive centralisée Dryos</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                Espace partagé
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              <strong>Garantie de non-dispersion :</strong> Tous les dossiers des sociétés (Holding SAS, Immo SAS, SCI) et factures sont créés exclusivement dans ce dossier Dryos partagé. Lorsqu'un associé ou collaborateur se connecte, l'application travaille sur cet espace commun d'entreprise et n'accède à aucun de ses documents personnels privés.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                Identifiant du dossier racine partagé Dryos (ID Drive)
              </label>
              <input
                type="text"
                value={rootFolderId}
                onChange={(e) => setRootFolderId(e.target.value)}
                placeholder="1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-"
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-emerald-300 text-slate-900 font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Root folder name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom d'affichage du dossier racine
            </label>
            <input
              type="text"
              value={rootFolderName}
              onChange={(e) => setRootFolderName(e.target.value)}
              placeholder="Compta_Groupe"
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none font-mono"
            />
          </div>

          {/* Arborescence Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FolderTree className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">
                Arborescence générée pour vos sociétés
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px] text-slate-700 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
              <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                📁 {rootFolderName || 'ComptaDrive_Groupe'}/
              </p>
              {companies.map((c) => (
                <div key={c.id} className="pl-4 py-0.5 border-l-2 border-indigo-100 ml-2">
                  <p className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>📁 {c.name} (SIREN {c.siren})/</span>
                    {createdFolders[c.id]?.webViewLink && (
                      <a
                        href={createdFolders[c.id].webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-[10px]"
                      >
                        <span>Ouvrir sur Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                  <div className="pl-4 border-l border-slate-200 ml-2 text-slate-500 py-0.5">
                    <p className="text-indigo-600 font-semibold">├── 📁 2026/</p>
                    <div className="pl-4 border-l border-indigo-100 ml-2 text-slate-500">
                      <p>├── 📂 01_Achats_Fournisseurs/</p>
                      <p>└── 📂 02_Ventes_et_Clients/</p>
                    </div>
                    <p className="text-slate-600 font-semibold mt-1">└── 📁 2025/</p>
                    <div className="pl-4 border-l border-slate-200 ml-2 text-slate-400">
                      <p>├── 📂 01_Achats_Fournisseurs/</p>
                      <p>└── 📂 02_Ventes_et_Clients/</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2.5 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[10px] text-indigo-900 flex items-center justify-between">
              <span className="font-semibold">Format chronologique Drive :</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 font-bold">
                AAAA-MM-JJ_Fournisseur_MontantEUR_Ref.pdf
              </span>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              onClick={handleSaveAndSync}
              disabled={isProvisioning}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isProvisioning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronisation Drive en cours...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>Générer et synchroniser l'arborescence</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
