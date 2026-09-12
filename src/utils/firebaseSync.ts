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
  query,
  where,
  updateDoc,
  deleteField,
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

// Local sets of IDs permanently deleted by user to prevent stale read race conditions
const locallyDeletedLogIds = new Set<string>();
const locallyDeletedResultIds = new Set<string>();
const locallyDeletedLoginLogIds = new Set<string>();

export function recordDeletedGameLogId(id: string) {
  if (id) locallyDeletedLogIds.add(id);
}
export function isGameLogDeletedLocally(id: string): boolean {
  return locallyDeletedLogIds.has(id);
}

export function recordDeletedExamResultId(id: string) {
  if (id) locallyDeletedResultIds.add(id);
}
export function isExamResultDeletedLocally(id: string): boolean {
  return locallyDeletedResultIds.has(id);
}

export function recordDeletedLoginLogId(id: string) {
  if (id) locallyDeletedLoginLogIds.add(id);
}
export function isLoginLogDeletedLocally(id: string): boolean {
  return locallyDeletedLoginLogIds.has(id);
}

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
    const raw = (firebaseConfigRaw || {}) as any;
    const metaEnv = (import.meta as any).env || {};
    const config = {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY || raw.apiKey,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || raw.authDomain,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || raw.projectId,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || raw.storageBucket,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || raw.messagingSenderId,
      appId: metaEnv.VITE_FIREBASE_APP_ID || raw.appId,
      firestoreDatabaseId: metaEnv.VITE_FIRESTORE_DATABASE_ID || raw.firestoreDatabaseId,
    };

    if (!config.apiKey || !config.projectId) {
      console.warn('[Firebase] Config is incomplete or missing in firebase-applet-config.json / env.');
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

    // 1. Resolve Exam Results (dedicated collection is the source of truth)
    const resultsFromCollection: ExamResult[] = [];
    if (resultsSnap && !resultsSnap.empty) {
      resultsSnap.forEach((d) => {
        const item = d.data() as ExamResult;
        if (item && item.id && !isExamResultDeletedLocally(item.id)) {
          resultsFromCollection.push(item);
        }
      });
    }

    // 2. Resolve Game Logs (dedicated collection is the source of truth)
    const gameLogsFromCollection: GameHistoryLog[] = [];
    if (gameLogsSnap && !gameLogsSnap.empty) {
      gameLogsSnap.forEach((d) => {
        const item = d.data() as GameHistoryLog;
        if (item && item.id && !isGameLogDeletedLocally(item.id)) {
          gameLogsFromCollection.push(item);
        }
      });
    }

    // 3. Resolve Login Logs
    const loginLogsFromCollection: UserLoginLog[] = [];
    if (loginLogsSnap && !loginLogsSnap.empty) {
      loginLogsSnap.forEach((d) => {
        const item = d.data() as UserLoginLog;
        if (item && item.id && !isLoginLogDeletedLocally(item.id)) {
          loginLogsFromCollection.push(item);
        }
      });
    }

    // Permanently cleanup legacy high-volume arrays inside app_data/main so they never resurrect deleted items
    const hasLegacyResults = Array.isArray(data.results) && data.results.length > 0;
    const hasLegacyGameLogs = Array.isArray(data.gameLogs) && data.gameLogs.length > 0;
    const hasLegacyLoginLogs = Array.isArray(data.loginLogs) && data.loginLogs.length > 0;

    if (hasLegacyResults || hasLegacyGameLogs || hasLegacyLoginLogs) {
      // First-time migration check: if collection was completely empty, transfer non-deleted legacy items once
      if (resultsFromCollection.length === 0 && hasLegacyResults) {
        const batch = writeBatch(db);
        (data.results || []).forEach((r) => {
          if (r && r.id && !isExamResultDeletedLocally(r.id)) {
            batch.set(doc(db, EXAM_RESULTS_COLLECTION, r.id), r, { merge: true });
            resultsFromCollection.push(r);
          }
        });
        await batch.commit().catch(() => {});
      }

      if (gameLogsFromCollection.length === 0 && hasLegacyGameLogs) {
        const batch = writeBatch(db);
        (data.gameLogs || []).forEach((g) => {
          if (g && g.id && !isGameLogDeletedLocally(g.id)) {
            batch.set(doc(db, GAME_LOGS_COLLECTION, g.id), g, { merge: true });
            gameLogsFromCollection.push(g);
          }
        });
        await batch.commit().catch(() => {});
      }

      if (loginLogsFromCollection.length === 0 && hasLegacyLoginLogs) {
        const batch = writeBatch(db);
        (data.loginLogs || []).forEach((l) => {
          if (l && l.id && !isLoginLogDeletedLocally(l.id)) {
            batch.set(doc(db, LOGIN_LOGS_COLLECTION, l.id), l, { merge: true });
            loginLogsFromCollection.push(l);
          }
        });
        await batch.commit().catch(() => {});
      }

      // Immediately purge legacy fields from app_data/main to permanently prevent reappearance
      updateDoc(mainDocRef, {
        results: deleteField(),
        gameLogs: deleteField(),
        loginLogs: deleteField(),
      }).catch(async () => {
        await setDoc(mainDocRef, { results: [], gameLogs: [], loginLogs: [] }, { merge: true }).catch(() => {});
      });
    }

    data.results = resultsFromCollection;
    data.gameLogs = gameLogsFromCollection;
    data.loginLogs = loginLogsFromCollection;

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
          const item = d.data() as ExamResult;
          if (item && item.id && !isExamResultDeletedLocally(item.id)) {
            list.push(item);
          }
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
          const item = d.data() as GameHistoryLog;
          if (item && item.id && !isGameLogDeletedLocally(item.id)) {
            list.push(item);
          }
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
          const item = d.data() as UserLoginLog;
          if (item && item.id && !isLoginLogDeletedLocally(item.id)) {
            list.push(item);
          }
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
 * Permanently delete a single exam result document from Firestore and localStorage
 */
export async function deleteExamResultFromFirestore(resultId: string): Promise<boolean> {
  if (!resultId) return false;
  recordDeletedExamResultId(resultId);

  // 1. Immediately update localStorage
  try {
    const raw = localStorage.getItem('cbt_results');
    if (raw) {
      const parsed: ExamResult[] = JSON.parse(raw);
      const filtered = parsed.filter((item) => item && item.id !== resultId);
      localStorage.setItem('cbt_results', JSON.stringify(filtered));
    }
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    // 2. Delete document by ID in dedicated collection
    await deleteDoc(doc(db, EXAM_RESULTS_COLLECTION, resultId)).catch(() => {});

    // 3. Delete any documents matching 'id' field
    const querySnap = await getDocs(query(collection(db, EXAM_RESULTS_COLLECTION), where('id', '==', resultId))).catch(() => null);
    if (querySnap && !querySnap.empty) {
      const batch = writeBatch(db);
      querySnap.forEach((d) => batch.delete(d.ref));
      await batch.commit().catch(() => {});
    }

    // 4. Remove from app_data/main if legacy field exists
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef).catch(() => null);
    if (mainSnap && mainSnap.exists()) {
      const mainData = mainSnap.data();
      if (Array.isArray(mainData.results)) {
        const filtered = mainData.results.filter((r: any) => r && r.id !== resultId);
        await updateDoc(mainDocRef, { results: filtered }).catch(() => {});
      }
    }

    console.log(`[Firestore] Hasil ujian "${resultId}" berhasil dihapus permanen.`);
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal menghapus hasil ujian:', err);
    return false;
  }
}

/**
 * Permanently clear all exam results from Firestore and localStorage
 */
export async function clearAllExamResultsInFirestore(): Promise<boolean> {
  try {
    localStorage.setItem('cbt_results', JSON.stringify([]));
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    await clearFirestoreCollection(db, EXAM_RESULTS_COLLECTION);
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    await updateDoc(mainDocRef, {
      results: deleteField(),
    }).catch(async () => {
      await setDoc(mainDocRef, { results: [] }, { merge: true }).catch(() => {});
    });
    console.log('[Firestore] Seluruh riwayat ujian berhasil dibersihkan permanen.');
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal membersihkan semua hasil ujian:', err);
    return false;
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
 * Permanently delete a single game log document from Firestore and localStorage
 */
export async function deleteGameLogFromFirestore(logId: string): Promise<boolean> {
  if (!logId) return false;
  recordDeletedGameLogId(logId);

  // 1. Immediately update localStorage
  try {
    const raw = localStorage.getItem('cbt_game_logs');
    if (raw) {
      const parsed: GameHistoryLog[] = JSON.parse(raw);
      const filtered = parsed.filter((item) => item && item.id !== logId);
      localStorage.setItem('cbt_game_logs', JSON.stringify(filtered));
    }
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    // 2. Delete document by ID in dedicated collection
    await deleteDoc(doc(db, GAME_LOGS_COLLECTION, logId)).catch(() => {});

    // 3. Delete any documents matching 'id' field
    const querySnap = await getDocs(query(collection(db, GAME_LOGS_COLLECTION), where('id', '==', logId))).catch(() => null);
    if (querySnap && !querySnap.empty) {
      const batch = writeBatch(db);
      querySnap.forEach((d) => batch.delete(d.ref));
      await batch.commit().catch(() => {});
    }

    // 4. Remove from app_data/main if legacy field exists
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef).catch(() => null);
    if (mainSnap && mainSnap.exists()) {
      const mainData = mainSnap.data();
      if (Array.isArray(mainData.gameLogs)) {
        const filtered = mainData.gameLogs.filter((g: any) => g && g.id !== logId);
        await updateDoc(mainDocRef, { gameLogs: filtered }).catch(() => {});
      }
    }

    console.log(`[Firestore] Game log "${logId}" berhasil dihapus permanen.`);
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal menghapus game log:', err);
    return false;
  }
}

/**
 * Permanently clear all game logs from Firestore and localStorage
 */
export async function clearAllGameLogsInFirestore(): Promise<boolean> {
  try {
    localStorage.setItem('cbt_game_logs', JSON.stringify([]));
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    await clearFirestoreCollection(db, GAME_LOGS_COLLECTION);
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    await updateDoc(mainDocRef, {
      gameLogs: deleteField(),
    }).catch(async () => {
      await setDoc(mainDocRef, { gameLogs: [] }, { merge: true }).catch(() => {});
    });
    console.log('[Firestore] Seluruh riwayat game berhasil dibersihkan permanen.');
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal membersihkan semua game logs:', err);
    return false;
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
 * Permanently delete a single user login log
 */
export async function deleteLoginLogFromFirestore(logId: string): Promise<boolean> {
  if (!logId) return false;
  recordDeletedLoginLogId(logId);

  try {
    const raw = localStorage.getItem('cbt_login_logs');
    if (raw) {
      const parsed: UserLoginLog[] = JSON.parse(raw);
      const filtered = parsed.filter((item) => item && item.id !== logId);
      localStorage.setItem('cbt_login_logs', JSON.stringify(filtered));
    }
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    await deleteDoc(doc(db, LOGIN_LOGS_COLLECTION, logId)).catch(() => {});
    const querySnap = await getDocs(query(collection(db, LOGIN_LOGS_COLLECTION), where('id', '==', logId))).catch(() => null);
    if (querySnap && !querySnap.empty) {
      const batch = writeBatch(db);
      querySnap.forEach((d) => batch.delete(d.ref));
      await batch.commit().catch(() => {});
    }

    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef).catch(() => null);
    if (mainSnap && mainSnap.exists()) {
      const mainData = mainSnap.data();
      if (Array.isArray(mainData.loginLogs)) {
        const filtered = mainData.loginLogs.filter((l: any) => l && l.id !== logId);
        await updateDoc(mainDocRef, { loginLogs: filtered }).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal menghapus login log:', err);
    return false;
  }
}

/**
 * Permanently clear all user login logs
 */
export async function clearAllLoginLogsInFirestore(): Promise<boolean> {
  try {
    localStorage.setItem('cbt_login_logs', JSON.stringify([]));
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    await clearFirestoreCollection(db, LOGIN_LOGS_COLLECTION);
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    await updateDoc(mainDocRef, {
      loginLogs: deleteField(),
    }).catch(async () => {
      await setDoc(mainDocRef, { loginLogs: [] }, { merge: true }).catch(() => {});
    });
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal membersihkan login logs:', err);
    return false;
  }
}

/**
 * Direct permanent deletion functions for Master Data
 * (Guru, Siswa, Mata Pelajaran, Bank Soal, Nilai Harian)
 * Writes directly to Firestore Cloud immediately to prevent any sync delay or state loss.
 */

export async function deleteTeacherPermanently(teacherId: string, currentTeachers: Teacher[]): Promise<Teacher[]> {
  const updated = currentTeachers.filter((t) => t.id !== teacherId);
  try {
    localStorage.setItem('cbt_teachers', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ teachers: updated });
  return updated;
}

export async function deleteTeachersBulkPermanently(teacherIds: string[], currentTeachers: Teacher[]): Promise<Teacher[]> {
  const updated = currentTeachers.filter((t) => !teacherIds.includes(t.id));
  try {
    localStorage.setItem('cbt_teachers', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ teachers: updated });
  return updated;
}

export async function deleteStudentPermanently(studentId: string, currentStudents: Student[]): Promise<Student[]> {
  const updated = currentStudents.filter((s) => s.id !== studentId);
  try {
    localStorage.setItem('cbt_students', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ students: updated });
  return updated;
}

export async function deleteStudentsBulkPermanently(studentIds: string[], currentStudents: Student[]): Promise<Student[]> {
  const updated = currentStudents.filter((s) => !studentIds.includes(s.id));
  try {
    localStorage.setItem('cbt_students', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ students: updated });
  return updated;
}

export async function deleteSubjectPermanently(subjectId: string, currentSubjects: Subject[]): Promise<Subject[]> {
  const updated = currentSubjects.filter((s) => s.id !== subjectId);
  try {
    localStorage.setItem('cbt_subjects', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ subjects: updated });
  return updated;
}

export async function deleteBankSoalPermanently(bankId: string, currentBanks: QuestionBank[]): Promise<QuestionBank[]> {
  const updated = currentBanks.filter((b) => b.id !== bankId);
  try {
    localStorage.setItem('cbt_banks', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ banks: updated });
  return updated;
}

export async function deleteDailyGradePermanently(gradeId: string, currentGrades: DailyGradeRecord[]): Promise<DailyGradeRecord[]> {
  const updated = currentGrades.filter((g) => g.id !== gradeId);
  try {
    localStorage.setItem('cbt_daily_grades', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ dailyGrades: updated });
  return updated;
}

export async function deleteDailyGradesBulkPermanently(gradeIds: string[], currentGrades: DailyGradeRecord[]): Promise<DailyGradeRecord[]> {
  const updated = currentGrades.filter((g) => !gradeIds.includes(g.id));
  try {
    localStorage.setItem('cbt_daily_grades', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ dailyGrades: updated });
  return updated;
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

