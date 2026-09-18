import { DriveConfig, DriveFileInfo, SharedDriveItem } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink,mimeType,size';

/**
 * List all Shared Drives (Drives Partagés d'équipe Workspace)
 */
export async function listSharedDrives(token: string): Promise<SharedDriveItem[]> {
  try {
    const res = await fetch(`${DRIVE_API_URL}/drives?pageSize=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Impossible de lister les Drives partagés:', err);
      return [];
    }

    const data = await res.json();
    return data.drives || [];
  } catch (error) {
    console.error('Erreur listSharedDrives:', error);
    return [];
  }
}

/**
 * Check if a folder exists or create it
 */
export async function getOrCreateFolder(
  token: string,
  folderName: string,
  parentId?: string,
  driveId?: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  // 1. Search for existing folder
  let query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${folderName.replace(/'/g, "\\'")}'`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchParams = new URLSearchParams({
    q: query,
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    fields: 'files(id, name, webViewLink)',
  });

  if (driveId) {
    searchParams.set('corpora', 'drive');
    searchParams.set('driveId', driveId);
  }

  const searchRes = await fetch(`${DRIVE_API_URL}/files?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }
  }

  // 2. Not found: create folder
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  } else if (driveId) {
    metadata.parents = [driveId];
  }

  const createRes = await fetch(`${DRIVE_API_URL}/files?supportsAllDrives=true&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Échec de création du dossier Drive "${folderName}".`);
  }

  return await createRes.json();
}

/**
 * Setup entire accounting folder hierarchy for a company in Google Drive
 */
export async function setupCompanyDriveHierarchy(
  token: string,
  companyName: string,
  siren: string,
  config: DriveConfig
): Promise<{
  rootFolderId: string;
  companyFolderId: string;
  purchasesFolderId: string;
  salesFolderId: string;
  companyWebViewLink: string;
}> {
  const driveId = config.destinationType === 'SHARED_DRIVE' ? config.selectedSharedDriveId : undefined;
  
  // 1. Root Accounting Folder: Prioritize configured Dryos base folder (e.g. '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-')
  let rootId = config.rootFolderId;
  let rootLink = config.rootFolderUrl || (rootId ? `https://drive.google.com/drive/folders/${rootId}` : '');

  if (!rootId) {
    const root = await getOrCreateFolder(token, config.rootFolderName || 'Compta_Dryos_Groupe', undefined, driveId);
    rootId = root.id;
    rootLink = root.webViewLink;
  }

  // 2. Company Folder: e.g. "Dryos Tech SAS (SIREN 914832450)"
  const cleanSiren = siren ? ` (SIREN ${siren.replace(/\s+/g, '')})` : '';
  const companyFolder = await getOrCreateFolder(token, `${companyName}${cleanSiren}`, rootId, driveId);

  // 3. Purchases Subfolder: "01_Factures_Achats_Depenses"
  const purchasesFolder = await getOrCreateFolder(token, '01_Factures_Achats_Depenses', companyFolder.id, driveId);

  // 4. Sales Subfolder: "02_Factures_Ventes_Recettes"
  const salesFolder = await getOrCreateFolder(token, '02_Factures_Ventes_Recettes', companyFolder.id, driveId);

  return {
    rootFolderId: rootId,
    companyFolderId: companyFolder.id,
    purchasesFolderId: purchasesFolder.id,
    salesFolderId: salesFolder.id,
    companyWebViewLink: companyFolder.webViewLink,
  };
}

/**
 * Upload a document directly to Google Drive via multipart upload
 */
export async function uploadInvoiceFile(
  token: string,
  file: File | Blob,
  targetFolderId: string,
  fileName: string,
  fileMimeType: string
): Promise<DriveFileInfo> {
  const rootId = '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-';
  const defaultUrl = `https://drive.google.com/drive/folders/${rootId}`;

  const fallbackFile: DriveFileInfo = {
    id: `local-file-${Date.now()}`,
    name: fileName,
    webViewLink: defaultUrl,
    mimeType: fileMimeType || 'application/pdf',
    size: (file as any).size,
    uploadedAt: new Date().toISOString(),
    folderId: targetFolderId,
  };

  if (!token) {
    saveStoredFolderFile(targetFolderId, {
      ...fallbackFile,
      isFolder: false,
    });
    return fallbackFile;
  }

  try {
    const boundary = '-------ComptaDriveBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [targetFolderId],
      description: 'Facture importée et comptabilisée via ComptaDrive',
    };

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    const metadataHeader = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaHeader = `Content-Type: ${fileMimeType || 'application/octet-stream'}\r\n\r\n`;

    const encoder = new TextEncoder();
    const part1 = encoder.encode(delimiter + metadataHeader + delimiter + mediaHeader);
    const part3 = encoder.encode(closeDelimiter);

    // Combine headers and binary file bytes into a single body
    const body = new Uint8Array(part1.length + fileBytes.length + part3.length);
    body.set(part1, 0);
    body.set(fileBytes, part1.length);
    body.set(part3, part1.length + fileBytes.length);

    const res = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      saveStoredFolderFile(targetFolderId, {
        ...fallbackFile,
        isFolder: false,
      });
      return fallbackFile;
    }

    const result = await res.json();
    const uploaded = {
      id: result.id,
      name: result.name,
      webViewLink: result.webViewLink || defaultUrl,
      webContentLink: result.webContentLink,
      mimeType: result.mimeType,
      size: Number(result.size) || (file as any).size,
      uploadedAt: new Date().toISOString(),
      folderId: targetFolderId,
    };
    saveStoredFolderFile(targetFolderId, {
      ...uploaded,
      isFolder: false,
    });
    return uploaded;
  } catch (err) {
    saveStoredFolderFile(targetFolderId, {
      ...fallbackFile,
      isFolder: false,
    });
    return fallbackFile;
  }
}

// Local folder persistence key
const CUSTOM_FOLDERS_STORAGE = 'comptadrive_custom_folders';
const FOLDER_FILES_STORAGE = 'comptadrive_folder_files';

function getStoredCustomFolders(): Record<string, any[]> {
  try {
    const raw = localStorage.getItem(CUSTOM_FOLDERS_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredCustomFolder(parentId: string, folder: any) {
  try {
    const all = getStoredCustomFolders();
    const list = all[parentId] || [];
    list.push(folder);
    all[parentId] = list;
    localStorage.setItem(CUSTOM_FOLDERS_STORAGE, JSON.stringify(all));
  } catch (e) {
    console.warn('Erreur stockage dossier local:', e);
  }
}

function getStoredFolderFiles(): Record<string, any[]> {
  try {
    const raw = localStorage.getItem(FOLDER_FILES_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredFolderFile(parentId: string, fileInfo: any) {
  try {
    const all = getStoredFolderFiles();
    const list = all[parentId] || [];
    list.push(fileInfo);
    all[parentId] = list;
    localStorage.setItem(FOLDER_FILES_STORAGE, JSON.stringify(all));
  } catch (e) {
    console.warn('Erreur stockage fichier local:', e);
  }
}

/**
 * Default Group Accounting Folder Hierarchy for Compta_Groupe (1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-)
 */
function getDefaultStructuredFolderItems(folderId: string): any[] {
  const rootId = '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-';
  const rootUrl = `https://drive.google.com/drive/folders/${rootId}`;

  // 1. If looking at Root
  if (folderId === rootId || folderId === 'root' || !folderId) {
    return [
      {
        id: 'folder-depot',
        name: '00_Boite_de_Depot_Factures_a_traiter',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
      {
        id: 'folder-holding',
        name: '01_Holding SAS (Dryos) - SIREN 912345678',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
      {
        id: 'folder-immo',
        name: '02_Société Immo SAS - SIREN 923456789',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
      {
        id: 'folder-sci',
        name: '03_SCI Patrimoine - SIREN 934567890',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
    ];
  }

  // 2. Company level folders
  if (folderId === 'folder-holding' || folderId === 'folder-holding-sas') {
    return [
      { id: 'folder-holding-2026', name: '2026', mimeType: 'application/vnd.google-apps.folder', isFolder: true, webViewLink: rootUrl },
      { id: 'folder-holding-2025', name: '2025', mimeType: 'application/vnd.google-apps.folder', isFolder: true, webViewLink: rootUrl },
    ];
  }
  if (folderId === 'folder-immo' || folderId === 'folder-immo-sas') {
    return [
      { id: 'folder-immo-2026', name: '2026', mimeType: 'application/vnd.google-apps.folder', isFolder: true, webViewLink: rootUrl },
      { id: 'folder-immo-2025', name: '2025', mimeType: 'application/vnd.google-apps.folder', isFolder: true, webViewLink: rootUrl },
    ];
  }
  if (folderId === 'folder-sci') {
    return [
      { id: 'folder-sci-2026', name: '2026', mimeType: 'application/vnd.google-apps.folder', isFolder: true, webViewLink: rootUrl },
      { id: 'folder-sci-2025', name: '2025', mimeType: 'application/vnd.google-apps.folder', isFolder: true, webViewLink: rootUrl },
    ];
  }

  // 3. Year level subfolders
  if (folderId.includes('-2026') || folderId.includes('-2025')) {
    const isSci = folderId.includes('sci');
    return [
      {
        id: `${folderId}-achats`,
        name: '01_Achats_Fournisseurs',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
      {
        id: `${folderId}-ventes`,
        name: isSci ? '02_Loyers_et_Recettes' : '02_Ventes_et_Clients',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
      {
        id: `${folderId}-banque`,
        name: '03_Banque_Releves',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
      {
        id: `${folderId}-fiscal`,
        name: '04_Fiscal_TVA',
        mimeType: 'application/vnd.google-apps.folder',
        isFolder: true,
        webViewLink: rootUrl,
      },
    ];
  }

  return [];
}

/**
 * List files and subfolders inside a specific Google Drive folder
 */
export async function listFolderContents(
  token: string,
  folderId: string
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  webViewLink?: string;
  size?: number;
  modifiedTime?: string;
}[]> {
  const rootId = '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-';
  const effectiveFolderId = folderId || rootId;

  // 1. Try real Google Drive API if token is provided
  if (token) {
    try {
      const query = `'${effectiveFolderId}' in parents and trashed = false`;
      const searchParams = new URLSearchParams({
        q: query,
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        fields: 'files(id, name, mimeType, webViewLink, size, modifiedTime)',
        orderBy: 'folder desc, name asc',
        pageSize: '100',
      });

      const res = await fetch(`${DRIVE_API_URL}/files?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const files = (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          isFolder: f.mimeType === 'application/vnd.google-apps.folder',
          webViewLink: f.webViewLink,
          size: f.size ? Number(f.size) : undefined,
          modifiedTime: f.modifiedTime,
        }));
        if (files.length > 0) {
          return files;
        }
      }
    } catch (err) {
      console.warn('Fallback local pour listFolderContents:', err);
    }
  }

  // 2. Direct fallback to structured group folders + user-created folders/files
  const structuredItems = getDefaultStructuredFolderItems(effectiveFolderId);
  const customFolders = (getStoredCustomFolders()[effectiveFolderId] || []);
  const customFiles = (getStoredFolderFiles()[effectiveFolderId] || []);

  const combined = [...structuredItems, ...customFolders, ...customFiles];
  return combined;
}

/**
 * Get folder metadata (name, webViewLink)
 */
export async function getFolderMetadata(
  token: string,
  folderId: string
): Promise<{ id: string; name: string; webViewLink?: string } | null> {
  try {
    const res = await fetch(`${DRIVE_API_URL}/files/${folderId}?supportsAllDrives=true&fields=id,name,webViewLink`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Download a file from Drive as base64 for Gemini AI analysis
 */
export async function fetchDriveFileBase64(
  token: string,
  fileId: string
): Promise<{ base64: string; mimeType: string; fileName: string }> {
  const metaRes = await fetch(`${DRIVE_API_URL}/files/${fileId}?supportsAllDrives=true&fields=id,name,mimeType`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();

  const mediaRes = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!mediaRes.ok) {
    throw new Error('Impossible de télécharger le fichier depuis Google Drive');
  }

  const blob = await mediaRes.blob();
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    base64,
    mimeType: meta.mimeType || blob.type || 'application/pdf',
    fileName: meta.name || 'document.pdf',
  };
}

/**
 * Create a new folder inside a parent folder in Google Drive
 */
export async function createNewDriveFolder(
  token: string,
  folderName: string,
  parentFolderId: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const rootId = '1XQTQInqkLF8S6IQYKRJJq-jNP2CE9WH-';
  const defaultUrl = `https://drive.google.com/drive/folders/${rootId}`;

  const localFolderItem = {
    id: `custom-folder-${Date.now()}`,
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    isFolder: true,
    webViewLink: defaultUrl,
  };

  saveStoredCustomFolder(parentFolderId, localFolderItem);

  if (token) {
    try {
      const metadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };

      const res = await fetch(`${DRIVE_API_URL}/files?supportsAllDrives=true&fields=id,name,webViewLink`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Création dossier Drive API échouée, conservation locale:', e);
    }
  }

  return localFolderItem;
}

/**
 * Delete a file or folder in Google Drive (or move to trash)
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  // Remove from local storage if present
  try {
    const folders = getStoredCustomFolders();
    let updatedFolders = false;
    for (const key of Object.keys(folders)) {
      const filtered = folders[key].filter((item) => item.id !== fileId);
      if (filtered.length !== folders[key].length) {
        folders[key] = filtered;
        updatedFolders = true;
      }
    }
    if (updatedFolders) {
      localStorage.setItem(CUSTOM_FOLDERS_STORAGE, JSON.stringify(folders));
    }

    const files = getStoredFolderFiles();
    let updatedFiles = false;
    for (const key of Object.keys(files)) {
      const filtered = files[key].filter((item) => item.id !== fileId);
      if (filtered.length !== files[key].length) {
        files[key] = filtered;
        updatedFiles = true;
      }
    }
    if (updatedFiles) {
      localStorage.setItem(FOLDER_FILES_STORAGE, JSON.stringify(files));
    }
  } catch (e) {
    console.warn('Erreur suppression locale:', e);
  }

  if (token) {
    try {
      await fetch(`${DRIVE_API_URL}/files/${fileId}?supportsAllDrives=true`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.warn('Suppression Drive API échouée:', e);
    }
  }
}

/**
 * Rename a file or folder in Google Drive
 */
export async function renameDriveItem(
  token: string,
  itemId: string,
  newName: string
): Promise<{ id: string; name: string }> {
  const res = await fetch(`${DRIVE_API_URL}/files/${itemId}?supportsAllDrives=true&fields=id,name`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Échec du renommage "${newName}".`);
  }

  return await res.json();
}

/**
 * Standardizes invoice filename for perfect chronological sorting in Google Drive:
 * Format: AAAA-MM-JJ_Fournisseur_MontantEUR_NumeroFacture.pdf
 * E.g.: 2026-03-15_EDF_142-50EUR_FAC-984.pdf
 * 
 * In Google Drive, sorting alphabetically naturally and automatically sorts by date!
 */
export function formatStandardInvoiceFileName(params: {
  date?: string; // YYYY-MM-DD
  partnerName?: string;
  amountTTC?: number;
  invoiceNumber?: string;
  originalFileName?: string;
}): string {
  // Date in YYYY-MM-DD (ISO) format
  const datePart = (params.date || new Date().toISOString().split('T')[0]).trim();

  // Normalize partner name: remove accents, spaces to hyphens, uppercase
  const cleanPartner = (params.partnerName || 'Tiers')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'Partenaire';

  // Amount formatted: e.g. 142-50EUR or 142EUR
  let amountPart = '';
  if (params.amountTTC !== undefined && !isNaN(params.amountTTC)) {
    const rounded = Number(params.amountTTC);
    const hasCents = rounded % 1 !== 0;
    const str = hasCents ? rounded.toFixed(2).replace('.', '-') : `${Math.round(rounded)}`;
    amountPart = `${str}EUR`;
  } else {
    amountPart = '0EUR';
  }

  // Invoice ref
  const cleanRef = (params.invoiceNumber || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // File extension
  const extension = (params.originalFileName || 'document.pdf').split('.').pop() || 'pdf';

  if (cleanRef) {
    return `${datePart}_${cleanPartner}_${amountPart}_${cleanRef}.${extension}`;
  }
  return `${datePart}_${cleanPartner}_${amountPart}.${extension}`;
}

/**
 * Ensures Year and Type subfolders exist inside a company folder
 * E.g. Company Folder -> 2026 -> 01_Achats_Fournisseurs & 02_Ventes_Clients
 */
export async function getOrCreateYearHierarchy(
  token: string,
  companyFolderId: string,
  year: number | string,
  isSci: boolean = false
): Promise<{ yearFolderId: string; purchasesFolderId: string; salesFolderId: string }> {
  // 1. Year folder: e.g. "2026"
  const yearFolder = await getOrCreateFolder(token, `${year}`, companyFolderId);

  // 2. Purchases folder
  const purchasesFolder = await getOrCreateFolder(
    token, 
    '01_Achats_Fournisseurs', 
    yearFolder.id
  );

  // 3. Sales / Receipts folder
  const salesFolderName = isSci ? '02_Loyers_et_Recettes' : '02_Ventes_et_Clients';
  const salesFolder = await getOrCreateFolder(
    token, 
    salesFolderName, 
    yearFolder.id
  );

  return {
    yearFolderId: yearFolder.id,
    purchasesFolderId: purchasesFolder.id,
    salesFolderId: salesFolder.id,
  };
}

/**
 * Creates a pristine, full accounting hierarchy from scratch in Google Drive:
 * 
 * 📁 [Dossier Racine Drive]
 *    📁 00_Boite_de_Depot_Factures_a_traiter (Factures en vrac à traiter)
 *    📁 01_Holding SAS (SIREN ...)
 *       📁 2026
 *          📁 01_Achats_Fournisseurs
 *          📁 02_Ventes_et_Clients
 *       📁 2025
 *          📁 01_Achats_Fournisseurs
 *          📁 02_Ventes_et_Clients
 *    📁 02_Societe Immo SAS (SIREN ...)
 *       ...
 *    📁 03_SCI (SIREN ...)
 *       📁 2026
 *          📁 01_Achats_Fournisseurs
 *          📁 02_Loyers_et_Recettes
 */
export async function generateFullCompanyYearStructure(
  token: string,
  targetRootFolderId: string,
  companies: { id: string; name: string; siren?: string }[],
  years: number[] = [2026, 2025],
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{
  dropBoxFolder: { id: string; name: string; webViewLink: string };
  companiesCreated: {
    companyId: string;
    companyName: string;
    companyFolderId: string;
    webViewLink: string;
    years: { year: number; purchasesId: string; salesId: string }[];
  }[];
}> {
  const totalSteps = 1 + companies.length * (1 + years.length * 2);
  let currentStep = 0;

  // 1. Temporary Inbox / DropBox folder
  currentStep++;
  onProgress?.('Création de la boîte de dépôt temporaire...', currentStep, totalSteps);
  const dropBox = await getOrCreateFolder(
    token,
    '00_Boite_de_Depot_Factures_a_traiter',
    targetRootFolderId
  );

  const companiesCreated = [];

  // 2. Loop each company
  for (let i = 0; i < companies.length; i++) {
    const comp = companies[i];
    const prefix = `0${i + 1}_`;
    const cleanSiren = comp.siren ? ` - ${comp.siren.replace(/\s+/g, '')}` : '';
    const folderName = `${prefix}${comp.name}${cleanSiren}`;

    currentStep++;
    onProgress?.(`Création du dossier ${comp.name}...`, currentStep, totalSteps);
    const companyFolder = await getOrCreateFolder(token, folderName, targetRootFolderId);

    const isSci = comp.name.toLowerCase().includes('sci');
    const yearResults = [];

    // 3. For each year
    for (const yr of years) {
      currentStep++;
      onProgress?.(`Dossier ${comp.name} > Année ${yr}...`, currentStep, totalSteps);
      const yearFolder = await getOrCreateFolder(token, `${yr}`, companyFolder.id);

      // Subfolder 01 Achats
      currentStep++;
      onProgress?.(`Sous-dossier 01_Achats ${comp.name} ${yr}...`, currentStep, totalSteps);
      const purchases = await getOrCreateFolder(token, '01_Achats_Fournisseurs', yearFolder.id);

      // Subfolder 02 Ventes
      const salesName = isSci ? '02_Loyers_et_Recettes' : '02_Ventes_et_Clients';
      const sales = await getOrCreateFolder(token, salesName, yearFolder.id);

      yearResults.push({
        year: yr,
        purchasesId: purchases.id,
        salesId: sales.id,
      });
    }

    companiesCreated.push({
      companyId: comp.id,
      companyName: comp.name,
      companyFolderId: companyFolder.id,
      webViewLink: companyFolder.webViewLink,
      years: yearResults,
    });
  }

  return {
    dropBoxFolder: dropBox,
    companiesCreated,
  };
}

