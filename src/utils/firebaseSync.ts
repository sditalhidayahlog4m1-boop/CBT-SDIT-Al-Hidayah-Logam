import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import {
  Teacher,
  Student,
  Subject,
  QuestionBank,
  ExamResult,
  GameHistoryLog,
  UserLoginLog,
  RolePermissions,
} from '../types';
import { SchoolProfile, AdminAccount } from './storage';
import firebaseConfigRaw from '../../firebase-applet-config.json';

export interface AppData {
  teachers?: Teacher[];
  students?: Student[];
  subjects?: Subject[];
  banks?: QuestionBank[];
  results?: ExamResult[];
  gameLogs?: GameHistoryLog[];
  loginLogs?: UserLoginLog[];
  schoolProfile?: SchoolProfile;
  rolePermissions?: RolePermissions;
  gameData?: Record<string, any>;
  adminAccount?: AdminAccount;
  updatedAt?: string;
}

let firestoreDb: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  try {
    const config = firebaseConfigRaw as any;
    if (!config || !config.apiKey || !config.projectId) {
      console.warn('[Firebase] Config is incomplete or missing in firebase-applet-config.json.');
      return null;
    }

    const app = !getApps().length ? initializeApp(config) : getApp();
    const dbId = config.firestoreDatabaseId;

    try {
      firestoreDb = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
    } catch {
      firestoreDb = getFirestore(app);
    }

    return firestoreDb;
  } catch (error) {
    console.error('[Firebase Init Error]:', error);
    return null;
  }
}

const MAIN_COLLECTION = 'app_data';
const MAIN_DOCUMENT = 'main';

// Fetch full app data from Firestore once
export async function fetchAppDataFromFirestore(silent = true): Promise<AppData | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const docRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as AppData;
    }
    return null;
  } catch (err: any) {
    if (!silent) {
      console.warn('[Firestore] Notice fetching app data:', err?.message || err);
    }
    return null;
  }
}

// Save or partial merge app data to Firestore
export async function saveAppDataToFirestore(data: Partial<AppData>): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const payload: Partial<AppData> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Notice saving app data to cloud:', err?.message || err);
    return false;
  }
}

// Subscribe to real-time changes
export function subscribeToAppData(
  onData: (data: AppData, isLocalWrite: boolean) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const docRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const isLocalWrite = snap.metadata.hasPendingWrites;
          onData(snap.data() as AppData, isLocalWrite);
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore Realtime Subscription Warning]:', err);
    return null;
  }
}

// Safely append/update an exam result to prevent overwriting other students' results
export async function syncExamResultToFirestore(result: ExamResult): Promise<void> {
  try {
    const current = await fetchAppDataFromFirestore(true);
    const existingResults: ExamResult[] = current?.results || [];
    const filtered = existingResults.filter((r) => r.id !== result.id);
    const updated = [result, ...filtered];
    await saveAppDataToFirestore({ results: updated });
  } catch (err) {
    console.warn('[Firestore] Unable to append exam result:', err);
  }
}

// Safely append/update a game log to prevent overwriting other students' logs
export async function syncGameLogToFirestore(log: GameHistoryLog): Promise<void> {
  try {
    const current = await fetchAppDataFromFirestore(true);
    const existingLogs: GameHistoryLog[] = current?.gameLogs || [];
    const filtered = existingLogs.filter((l) => l.id !== log.id);
    const updated = [log, ...filtered];
    await saveAppDataToFirestore({ gameLogs: updated });
  } catch (err) {
    console.warn('[Firestore] Unable to append game log:', err);
  }
}

// Reset all cloud data
export async function resetAllDataInFirestore(): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    await setDoc(docRef, {
      teachers: [],
      students: [],
      subjects: [],
      banks: [],
      results: [],
      gameLogs: [],
      loginLogs: [],
      gameData: {},
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Error resetting app data in Firestore:', err?.message || err);
    return false;
  }
}

// Track user login
export async function trackUserLoginInFirestore(log: UserLoginLog): Promise<void> {
  try {
    const current = await fetchAppDataFromFirestore(true);
    const existingLogs: UserLoginLog[] = current?.loginLogs || [];
    const filtered = existingLogs.filter(
      (l) => !(l.name.toLowerCase() === log.name.toLowerCase() && l.role === log.role)
    );
    const updated = [log, ...filtered].slice(0, 100);
    await saveAppDataToFirestore({ loginLogs: updated });
  } catch (err) {
    // Silent on offline
  }
}
