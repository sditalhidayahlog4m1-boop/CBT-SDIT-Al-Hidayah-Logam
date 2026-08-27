import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  writeBatch,
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
  DailyGradeRecord,
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
  dailyGrades?: DailyGradeRecord[];
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

// Master collection & document
const MAIN_COLLECTION = 'app_data';
const MAIN_DOCUMENT = 'main';

// Dedicated subcollections to eliminate 1MB document limit and concurrent write conflicts
export const EXAM_RESULTS_COLLECTION = 'exam_results';
export const GAME_LOGS_COLLECTION = 'game_logs';
export const LOGIN_LOGS_COLLECTION = 'login_logs';

/**
 * Fetch full app data from Firestore once:
 * - Master document (teachers, students, subjects, banks, schoolProfile, permissions, etc.)
 * - Separate collections (exam_results, game_logs, login_logs)
 */
export async function fetchAppDataFromFirestore(silent = true): Promise<AppData | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnapPromise = getDoc(mainDocRef);
    const resultsSnapPromise = getDocs(collection(db, EXAM_RESULTS_COLLECTION)).catch(() => null);
    const gameLogsSnapPromise = getDocs(collection(db, GAME_LOGS_COLLECTION)).catch(() => null);
    const loginLogsSnapPromise = getDocs(collection(db, LOGIN_LOGS_COLLECTION)).catch(() => null);

    const [mainSnap, resultsSnap, gameLogsSnap, loginLogsSnap] = await Promise.all([
      mainSnapPromise,
      resultsSnapPromise,
      gameLogsSnapPromise,
      loginLogsSnapPromise,
    ]);

    let data: AppData = {};

    if (mainSnap.exists()) {
      data = mainSnap.data() as AppData;
    }

    // 1. Resolve Exam Results
    const resultsFromCollection: ExamResult[] = [];
    if (resultsSnap && !resultsSnap.empty) {
      resultsSnap.forEach((d) => {
        resultsFromCollection.push(d.data() as ExamResult);
      });
    }

    // Merge with legacy results if present
    const legacyResults = Array.isArray(data.results) ? data.results : [];
    const resultMap = new Map<string, ExamResult>();
    [...legacyResults, ...resultsFromCollection].forEach((r) => {
      if (r && r.id) resultMap.set(r.id, r);
    });
    data.results = Array.from(resultMap.values());

    // 2. Resolve Game Logs
    const gameLogsFromCollection: GameHistoryLog[] = [];
    if (gameLogsSnap && !gameLogsSnap.empty) {
      gameLogsSnap.forEach((d) => {
        gameLogsFromCollection.push(d.data() as GameHistoryLog);
      });
    }
    const legacyGameLogs = Array.isArray(data.gameLogs) ? data.gameLogs : [];
    const gameLogMap = new Map<string, GameHistoryLog>();
    [...legacyGameLogs, ...gameLogsFromCollection].forEach((g) => {
      if (g && g.id) gameLogMap.set(g.id, g);
    });
    data.gameLogs = Array.from(gameLogMap.values());

    // 3. Resolve Login Logs
    const loginLogsFromCollection: UserLoginLog[] = [];
    if (loginLogsSnap && !loginLogsSnap.empty) {
      loginLogsSnap.forEach((d) => {
        loginLogsFromCollection.push(d.data() as UserLoginLog);
      });
    }
    const legacyLoginLogs = Array.isArray(data.loginLogs) ? data.loginLogs : [];
    const loginLogMap = new Map<string, UserLoginLog>();
    [...legacyLoginLogs, ...loginLogsFromCollection].forEach((l) => {
      if (l && l.id) loginLogMap.set(l.id, l);
    });
    data.loginLogs = Array.from(loginLogMap.values());

    return data;
  } catch (err: any) {
    if (!silent) {
      console.warn('[Firestore] Notice fetching app data:', err?.message || err);
    }
    return null;
  }
}

/**
 * Save master data to Firestore (app_data/main).
 * Automatically excludes high-volume items (results, gameLogs, loginLogs) from bloating main document.
 */
export async function saveAppDataToFirestore(data: Partial<AppData>): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    // Clone and separate master data from dynamic high-volume items
    const { results, gameLogs, loginLogs, ...masterData } = data;

    const docRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const payload = {
      ...masterData,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, payload, { merge: true });

    // If results are explicitly provided in payload, save each individually to exam_results collection
    if (Array.isArray(results) && results.length > 0) {
      const batch = writeBatch(db);
      results.slice(0, 100).forEach((r) => {
        if (r && r.id) {
          batch.set(doc(db, EXAM_RESULTS_COLLECTION, r.id), r, { merge: true });
        }
      });
      await batch.commit().catch(() => {});
    }

    // If gameLogs are explicitly provided, save individually to game_logs collection
    if (Array.isArray(gameLogs) && gameLogs.length > 0) {
      const batch = writeBatch(db);
      gameLogs.slice(0, 100).forEach((g) => {
        if (g && g.id) {
          batch.set(doc(db, GAME_LOGS_COLLECTION, g.id), g, { merge: true });
        }
      });
      await batch.commit().catch(() => {});
    }

    // If loginLogs are explicitly provided, save individually to login_logs collection
    if (Array.isArray(loginLogs) && loginLogs.length > 0) {
      const batch = writeBatch(db);
      loginLogs.slice(0, 100).forEach((l) => {
        if (l && l.id) {
          batch.set(doc(db, LOGIN_LOGS_COLLECTION, l.id), l, { merge: true });
        }
      });
      await batch.commit().catch(() => {});
    }

    return true;
  } catch (err: any) {
    console.warn('[Firestore] Notice saving master data to cloud:', err?.message || err);
    return false;
  }
}

/**
 * Subscribe to real-time changes across master data and dynamic collections
 */
export function subscribeToAppData(
  onData: (data: AppData, isLocalWrite: boolean) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    let currentMaster: AppData = {};
    let currentResults: ExamResult[] = [];
    let currentGameLogs: GameHistoryLog[] = [];
    let currentLoginLogs: UserLoginLog[] = [];

    const emitConsolidated = (isLocalWrite: boolean) => {
      const consolidated: AppData = {
        ...currentMaster,
        results: currentResults,
        gameLogs: currentGameLogs,
        loginLogs: currentLoginLogs,
      };
      onData(consolidated, isLocalWrite);
    };

    // 1. Listener for app_data/main (Master Data)
    const unsubMain = onSnapshot(
      doc(db, MAIN_COLLECTION, MAIN_DOCUMENT),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as AppData;
          const { results, gameLogs, loginLogs, ...restMaster } = raw;
          currentMaster = restMaster;
          emitConsolidated(snap.metadata.hasPendingWrites);
        }
      },
      (err) => onError && onError(err)
    );

    // 2. Listener for exam_results collection (Real-time student exam submissions)
    const unsubResults = onSnapshot(
      collection(db, EXAM_RESULTS_COLLECTION),
      { includeMetadataChanges: true },
      (snap) => {
        const list: ExamResult[] = [];
        snap.forEach((d) => {
          list.push(d.data() as ExamResult);
        });
        currentResults = list.sort((a, b) => {
          const timeA = new Date(a.date || (a as any).completedAt || 0).getTime();
          const timeB = new Date(b.date || (b as any).completedAt || 0).getTime();
          return timeB - timeA;
        });
        emitConsolidated(snap.metadata.hasPendingWrites);
      },
      (err) => onError && onError(err)
    );

    // 3. Listener for game_logs collection
    const unsubGameLogs = onSnapshot(
      collection(db, GAME_LOGS_COLLECTION),
      { includeMetadataChanges: true },
      (snap) => {
        const list: GameHistoryLog[] = [];
        snap.forEach((d) => {
          list.push(d.data() as GameHistoryLog);
        });
        currentGameLogs = list.sort((a, b) => {
          const timeA = new Date(a.timestamp || (a as any).playedAt || 0).getTime();
          const timeB = new Date(b.timestamp || (b as any).playedAt || 0).getTime();
          return timeB - timeA;
        });
        emitConsolidated(snap.metadata.hasPendingWrites);
      },
      (err) => onError && onError(err)
    );

    // 4. Listener for login_logs collection
    const unsubLoginLogs = onSnapshot(
      collection(db, LOGIN_LOGS_COLLECTION),
      { includeMetadataChanges: true },
      (snap) => {
        const list: UserLoginLog[] = [];
        snap.forEach((d) => {
          list.push(d.data() as UserLoginLog);
        });
        currentLoginLogs = list.sort((a, b) => {
          return (b.lastSeenTime || '').localeCompare(a.lastSeenTime || '');
        });
        emitConsolidated(snap.metadata.hasPendingWrites);
      },
      (err) => onError && onError(err)
    );

    return () => {
      unsubMain();
      unsubResults();
      unsubGameLogs();
      unsubLoginLogs();
    };
  } catch (err) {
    console.warn('[Firestore Realtime Subscription Warning]:', err);
    return null;
  }
}

/**
 * Safely writes an individual student exam result to dedicated 'exam_results' collection.
 * 100% thread-safe: zero race conditions when 50+ students submit exams concurrently.
 */
export async function syncExamResultToFirestore(result: ExamResult): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !result || !result.id) return;

  try {
    const resultRef = doc(db, EXAM_RESULTS_COLLECTION, result.id);
    await setDoc(resultRef, result, { merge: true });
    console.log('[Firestore] Hasil ujian siswa tersimpan mandiri di koleksi exam_results:', result.studentName);
  } catch (err) {
    console.warn('[Firestore] Gagal menyimpan hasil ujian mandiri:', err);
  }
}

/**
 * Delete a single exam result document from Firestore
 */
export async function deleteExamResultFromFirestore(resultId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !resultId) return;

  try {
    await deleteDoc(doc(db, EXAM_RESULTS_COLLECTION, resultId));
  } catch (err) {
    console.warn('[Firestore] Gagal menghapus hasil ujian:', err);
  }
}

/**
 * Safely writes an individual game log to dedicated 'game_logs' collection.
 */
export async function syncGameLogToFirestore(log: GameHistoryLog): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !log || !log.id) return;

  try {
    const logRef = doc(db, GAME_LOGS_COLLECTION, log.id);
    await setDoc(logRef, log, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Gagal menyimpan riwayat game mandiri:', err);
  }
}

/**
 * Delete a single game log document from Firestore
 */
export async function deleteGameLogFromFirestore(logId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !logId) return;

  try {
    await deleteDoc(doc(db, GAME_LOGS_COLLECTION, logId));
  } catch (err) {
    console.warn('[Firestore] Gagal menghapus game log:', err);
  }
}

/**
 * Clear all game logs from Firestore
 */
export async function clearAllGameLogsInFirestore(): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const snaps = await getDocs(collection(db, GAME_LOGS_COLLECTION));
    if (!snaps.empty) {
      const batch = writeBatch(db);
      snaps.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firestore] Gagal membersihkan semua game logs:', err);
  }
}

/**
 * Track user login / heartbeat directly in 'login_logs' collection
 */
export async function trackUserLoginInFirestore(log: UserLoginLog): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !log || !log.id) return;

  try {
    const logRef = doc(db, LOGIN_LOGS_COLLECTION, log.id);
    await setDoc(logRef, log, { merge: true });
  } catch (err) {
    // Silent on network glitch
  }
}

/**
 * Helper to delete all documents in a collection in safe chunked batches
 */
async function clearFirestoreCollection(db: Firestore, collectionName: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, collectionName)).catch(() => null);
    if (!snap || snap.empty) return;

    const docs = snap.docs;
    // Commit deletions in safe batches of 300 (Firestore max is 500 per batch)
    for (let i = 0; i < docs.length; i += 300) {
      const chunk = docs.slice(i, i + 300);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit().catch((err) => {
        console.warn(`[Firestore] Batch deletion notice for ${collectionName}:`, err);
      });
    }
  } catch (err) {
    console.warn(`[Firestore] Error clearing collection ${collectionName}:`, err);
  }
}

/**
 * Reset all data across master document and all subcollections (exam_results, game_logs, login_logs)
 */
export async function resetAllDataInFirestore(): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    // 1. Reset master document (app_data/main) to clean empty state
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    await setDoc(mainDocRef, {
      teachers: [],
      students: [],
      subjects: [],
      banks: [],
      dailyGrades: [],
      gameData: {},
      results: [],
      gameLogs: [],
      loginLogs: [],
      updatedAt: new Date().toISOString(),
    });

    // 2. Completely delete all records in dedicated subcollections
    await Promise.all([
      clearFirestoreCollection(db, EXAM_RESULTS_COLLECTION),
      clearFirestoreCollection(db, GAME_LOGS_COLLECTION),
      clearFirestoreCollection(db, LOGIN_LOGS_COLLECTION),
    ]);

    console.log('[Firestore] Berhasil mengosongkan seluruh database Firebase Firestore (Clean State).');
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Error resetting app data in Firestore:', err?.message || err);
    return false;
  }
}

