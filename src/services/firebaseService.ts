import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Company, Transaction, DriveConfig, Shareholder, ShareholdingStake } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the dedicated Firestore database ID specified in config or default database
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Test connection on boot according to Firebase integration guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database initializing.');
    }
    return false;
  }
}

// Default companies without fictional figures or weird comments
export const DEFAULT_DRYOS_COMPANIES: Company[] = [
  {
    id: 'dryos-holding',
    name: 'DRYOS HOLDING',
    legalForm: 'SAS',
    siren: '912 345 678',
    color: '#1e1b4b',
    currency: 'EUR',
    fiscalYear: 2026,
    fiscalClosingMonth: 12,
    vatRegime: 'ASSUJETTI_NORMAL',
    taxRegime: 'IS',
    initialCash: 0,
    bankName: 'BNP Paribas',
    shareCapital: 10000,
    totalShares: 1000,
    shareNominalValue: 10,
    presidentOrManager: 'Dimitri Blanc (Président)',
    descriptionRole: 'Holding',
    contactEmail: 'dimitri.blanc@dryos.fr',
  },
  {
    id: 'dryos-immobilier',
    name: 'DRYOS IMMOBILIER',
    legalForm: 'SAS',
    siren: '923 456 789',
    color: '#047857',
    currency: 'EUR',
    fiscalYear: 2026,
    fiscalClosingMonth: 12,
    vatRegime: 'ASSUJETTI_NORMAL',
    taxRegime: 'IS',
    initialCash: 0,
    bankName: 'BNP Paribas',
    shareCapital: 10000,
    totalShares: 1000,
    shareNominalValue: 10,
    presidentOrManager: 'Dimitri Blanc',
    descriptionRole: 'Immobilier',
    contactEmail: 'contact@dryos.fr',
  },
  {
    id: 'sci-dryos-1',
    name: 'SCI DRYOS I',
    legalForm: 'SCI',
    siren: '934 567 890',
    color: '#b45309',
    currency: 'EUR',
    fiscalYear: 2026,
    fiscalClosingMonth: 12,
    vatRegime: 'FRANCHISE_BASE',
    taxRegime: 'IS',
    initialCash: 0,
    bankName: 'Crédit Agricole',
    shareCapital: 1000,
    totalShares: 100,
    shareNominalValue: 10,
    presidentOrManager: 'Dimitri Blanc (Gérant)',
    descriptionRole: 'SCI',
    contactEmail: 'sci1@dryos.fr',
  },
];

/**
 * Subscribe to real-time updates for Companies
 */
export function subscribeCompanies(
  onUpdate: (companies: Company[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'companies');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Company[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Company);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('[Firestore] Error subscribing to companies:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a single company
 */
export async function saveCompanyToCloud(company: Company): Promise<void> {
  const docRef = doc(db, 'companies', company.id);
  await setDoc(docRef, {
    ...company,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Delete a company
 */
export async function deleteCompanyFromCloud(companyId: string): Promise<void> {
  const docRef = doc(db, 'companies', companyId);
  await deleteDoc(docRef);
}

/**
 * Seed companies in batch
 */
export async function seedCompaniesInBatch(companies: Company[]): Promise<void> {
  const batch = writeBatch(db);
  companies.forEach((comp) => {
    const docRef = doc(db, 'companies', comp.id);
    batch.set(docRef, { ...comp, updatedAt: new Date().toISOString() }, { merge: true });
  });
  await batch.commit();
}

/**
 * Subscribe to real-time updates for Transactions
 */
export function subscribeTransactions(
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'transactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Transaction);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error('[Firestore] Error subscribing to transactions:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a transaction
 */
export async function saveTransactionToCloud(tx: Transaction): Promise<void> {
  const docRef = doc(db, 'transactions', tx.id);
  await setDoc(docRef, tx, { merge: true });
}

/**
 * Delete a transaction
 */
export async function deleteTransactionFromCloud(txId: string): Promise<void> {
  const docRef = doc(db, 'transactions', txId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to global App / Drive configuration
 */
export function subscribeAppConfig(
  onUpdate: (config: DriveConfig) => void
): () => void {
  const docRef = doc(db, 'config', 'global');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as DriveConfig);
    }
  });
}

/**
 * Save global config to cloud
 */
export async function saveAppConfigToCloud(config: DriveConfig): Promise<void> {
  const docRef = doc(db, 'config', 'global');
  await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Subscribe to Shareholders
 */
export function subscribeShareholders(
  onUpdate: (shareholders: Shareholder[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'shareholders');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Shareholder[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Shareholder);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('[Firestore] Error subscribing to shareholders:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveShareholderToCloud(sh: Shareholder): Promise<void> {
  const docRef = doc(db, 'shareholders', sh.id);
  await setDoc(docRef, sh, { merge: true });
}

export async function deleteShareholderFromCloud(shId: string): Promise<void> {
  const docRef = doc(db, 'shareholders', shId);
  await deleteDoc(docRef);
}

export async function seedShareholdersInBatch(shareholders: Shareholder[]): Promise<void> {
  const batch = writeBatch(db);
  shareholders.forEach((sh) => {
    const docRef = doc(db, 'shareholders', sh.id);
    batch.set(docRef, sh, { merge: true });
  });
  await batch.commit();
}

/**
 * Subscribe to Stakes
 */
export function subscribeStakes(
  onUpdate: (stakes: ShareholdingStake[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'stakes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ShareholdingStake[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ShareholdingStake);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('[Firestore] Error subscribing to stakes:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveStakeToCloud(stake: ShareholdingStake): Promise<void> {
  const docRef = doc(db, 'stakes', stake.id);
  await setDoc(docRef, stake, { merge: true });
}

export async function deleteStakeFromCloud(stakeId: string): Promise<void> {
  const docRef = doc(db, 'stakes', stakeId);
  await deleteDoc(docRef);
}

export async function seedStakesInBatch(stakes: ShareholdingStake[]): Promise<void> {
  const batch = writeBatch(db);
  stakes.forEach((st) => {
    const docRef = doc(db, 'stakes', st.id);
    batch.set(docRef, st, { merge: true });
  });
  await batch.commit();
}

// Initial connection test
testFirestoreConnection().catch(() => {});
