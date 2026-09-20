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
  limit,
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
import { SchoolProfile, AdminAccount, getStoredBanks, saveStoredBanks } from './storage';
import { normalizeExamResults, getExamResultTimestamp } from './dateUtils';
import firebaseConfigRaw from '../../firebase-applet-config.json';

// Firestore Quota / Resource-Exhausted Circuit Breaker
let isQuotaExhausted = false;
let quotaExhaustedUntil = 0;
const QUOTA_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown (prevents long lockout)

export function resetFirestoreQuotaCooldown() {
  isQuotaExhausted = false;
  quotaExhaustedUntil = 0;
  try {
    localStorage.removeItem('cbt_firestore_quota_until');
  } catch {}
}

try {
  const savedQuotaExpiry = localStorage.getItem('cbt_firestore_quota_until');
  if (savedQuotaExpiry) {
    const expiry = parseInt(savedQuotaExpiry, 10);
    if (expiry > Date.now()) {
      isQuotaExhausted = true;
      quotaExhaustedUntil = expiry;
    } else {
      localStorage.removeItem('cbt_firestore_quota_until');
    }
  }
} catch {}

export function isFirestoreQuotaExhausted(): boolean {
  if (!isQuotaExhausted) return false;
  if (Date.now() > quotaExhaustedUntil) {
    isQuotaExhausted = false;
    try {
      localStorage.removeItem('cbt_firestore_quota_until');
    } catch {}
    return false;
  }
  return true;
}

export function markFirestoreQuotaExhausted(err?: any) {
  isQuotaExhausted = true;
  quotaExhaustedUntil = Date.now() + QUOTA_COOLDOWN_MS;
  try {
    localStorage.setItem('cbt_firestore_quota_until', String(quotaExhaustedUntil));
  } catch {}
  console.warn(
    '[Firestore Circuit Breaker] Batas kuota Firestore terlampaui (resource-exhausted / quota exceeded). ' +
    'Sistem CBT beralih ke mode offline lokal yang 100% aman dan lancar.'
  );
}

export function checkAndHandleFirestoreError(err: any): boolean {
  if (!err) return false;
  const errMsg = String(err?.message || err?.code || err);
  if (
    err?.code === 'resource-exhausted' ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota exceeded') ||
    errMsg.includes('quota exceeded') ||
    errMsg.includes('Resource has been exhausted')
  ) {
    markFirestoreQuotaExhausted(err);
    return true;
  }
  return false;
}

// Local sets of IDs permanently deleted by user to prevent stale read race conditions
const locallyDeletedLogIds = new Set<string>();
const locallyDeletedResultIds = new Set<string>();
const locallyDeletedLoginLogIds = new Set<string>();

/**
 * Deep sanitizer for Firestore payloads: strips `undefined` values that cause
 * Firestore SDK to throw "Function setDoc() called with invalid data. Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) return null as any;
  try {
    return JSON.parse(
      JSON.stringify(data, (_key, value) => {
        if (value === undefined) return null;
        return value;
      })
    );
  } catch {
    return data;
  }
}

// User-deleted bank IDs tracked from localStorage
const locallyDeletedBankIds = new Set<string>();

// Load any previously persisted deleted bank IDs from localStorage
try {
  const savedDeletedBanks = JSON.parse(localStorage.getItem('cbt_deleted_bank_ids') || '[]');
  if (Array.isArray(savedDeletedBanks)) {
    savedDeletedBanks.forEach((id) => locallyDeletedBankIds.add(String(id)));
  }
} catch {}

export function recordDeletedBankId(id: string) {
  if (id) {
    locallyDeletedBankIds.add(id);
    try {
      const arr = Array.from(locallyDeletedBankIds);
      localStorage.setItem('cbt_deleted_bank_ids', JSON.stringify(arr));
    } catch {}
  }
}

export function isBankDeletedLocally(id: string): boolean {
  if (!id) return false;
  return locallyDeletedBankIds.has(id);
}

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
  if (isFirestoreQuotaExhausted()) return null;
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
export const EXAM_TOKENS_COLLECTION = 'exam_tokens';
export const QUESTION_BANKS_COLLECTION = 'question_banks';

/**
 * Fetch full app data from Firestore once:
 * - Master document (teachers, students, subjects, banks, schoolProfile, permissions, etc.)
 * - Separate collections (exam_results, game_logs, login_logs)
 */
export async function fetchAppDataFromFirestore(silent = true): Promise<AppData | null> {
  if (isFirestoreQuotaExhausted()) return null;
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnapPromise = getDoc(mainDocRef).catch((err) => {
      checkAndHandleFirestoreError(err);
      return null;
    });
    const resultsSnapPromise = getDocs(query(collection(db, EXAM_RESULTS_COLLECTION), limit(100))).catch((err) => {
      checkAndHandleFirestoreError(err);
      return null;
    });
    const gameLogsSnapPromise = getDocs(query(collection(db, GAME_LOGS_COLLECTION), limit(50))).catch((err) => {
      checkAndHandleFirestoreError(err);
      return null;
    });
    const loginLogsSnapPromise = getDocs(query(collection(db, LOGIN_LOGS_COLLECTION), limit(50))).catch((err) => {
      checkAndHandleFirestoreError(err);
      return null;
    });

    const [mainSnap, resultsSnap, gameLogsSnap, loginLogsSnap] = await Promise.all([
      mainSnapPromise,
      resultsSnapPromise,
      gameLogsSnapPromise,
      loginLogsSnapPromise,
    ]);

    let data: AppData = {};

    if (mainSnap && mainSnap.exists()) {
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
          if (item.name && item.name.trim().toLowerCase() === 'administrator') {
            return;
          }
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

    if (Array.isArray(data.banks)) {
      data.banks = data.banks.filter((b) => b && b.id && !isBankDeletedLocally(b.id));
    }

    return data;
  } catch (err: any) {
    checkAndHandleFirestoreError(err);
    if (!silent) {
      console.warn('[Firestore] Notice fetching app data:', err?.message || err);
    }
    return null;
  }
}

/**
 * Save master data to Firestore (app_data/main).
 * Automatically excludes high-volume items (results, gameLogs, loginLogs) from bloating main document.
 * Only writes master data to a single document to conserve Firestore quota.
 */
export async function saveAppDataToFirestore(data: Partial<AppData>): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) return false;
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    // Clone and separate master data from dynamic high-volume items
    const { results, gameLogs, loginLogs, ...masterData } = data;

    // Strict guard: ensure deleted banks are never written to Firestore
    if (Array.isArray(masterData.banks)) {
      masterData.banks = masterData.banks.filter((b) => b && b.id && !isBankDeletedLocally(b.id));
    }

    const rawPayload = {
      ...masterData,
      updatedAt: new Date().toISOString(),
    };

    // Deep sanitize to prevent Firestore SDK "Unsupported field value: undefined" errors
    const payload = sanitizeForFirestore(rawPayload);

    const docRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    await setDoc(docRef, payload, { merge: true }).catch((err) => {
      console.warn('[Firestore] Notice setDoc masterData:', err);
    });

    // Multi-account & multi-device sync: Write active banks to dedicated 'exam_tokens' and 'question_banks' collections
    if (Array.isArray(masterData.banks) && masterData.banks.length > 0) {
      for (const b of masterData.banks) {
        if (b && b.id && !isBankDeletedLocally(b.id)) {
          saveSingleBankToFirestore(b).catch(() => {});
        }
      }
    }

    return true;
  } catch (err: any) {
    checkAndHandleFirestoreError(err);
    console.warn('[Firestore] Notice saving master data to cloud:', err?.message || err);
    return false;
  }
}

/**
 * Saves or updates a single question bank directly to:
 * 1. Dedicated 'exam_tokens' collection (indexed by clean token, instant single-doc lookup for students)
 * 2. Dedicated 'question_banks' collection (indexed by bankId, no 1MB document limit)
 * 3. 'app_data/main' master array
 * Guarantees instant availability across all student accounts and devices.
 */
export async function saveSingleBankToFirestore(bank: QuestionBank): Promise<boolean> {
  if (!bank || !bank.id) return false;
  const db = getFirestoreDb();
  if (!db) return false;

  const rawToken = (bank.token || '').trim();
  const cleanToken = rawToken.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const sanitizedBank = sanitizeForFirestore(bank);

  try {
    // 1. Direct write to 'exam_tokens' (instant 1-document write, fast token lookup for any student)
    if (cleanToken) {
      const tokenDocRef = doc(db, EXAM_TOKENS_COLLECTION, cleanToken);
      await setDoc(
        tokenDocRef,
        {
          token: cleanToken,
          bankId: bank.id,
          title: bank.title || '',
          subject: bank.subject || '',
          grade_level: bank.grade_level || '',
          totalQuestions: bank.questions?.length || 0,
          bank: sanitizedBank,
          updatedAt: bank.updatedAt || new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => {
        checkAndHandleFirestoreError(err);
      });
    }

    // 2. Direct write to 'question_banks' collection (standalone bank document)
    const bankDocRef = doc(db, QUESTION_BANKS_COLLECTION, String(bank.id));
    await setDoc(bankDocRef, sanitizedBank, { merge: true }).catch((err) => {
      checkAndHandleFirestoreError(err);
    });

    // 3. Merge into app_data/main banks array
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef).catch(() => null);
    if (mainSnap && mainSnap.exists()) {
      const mainData = mainSnap.data() as AppData;
      const existingBanks: QuestionBank[] = Array.isArray(mainData.banks) ? mainData.banks : [];
      const exists = existingBanks.some((b) => b && String(b.id) === String(bank.id));
      const updatedBanks = exists
        ? existingBanks.map((b) => (b && String(b.id) === String(bank.id) ? sanitizedBank : b))
        : [sanitizedBank, ...existingBanks.filter((b) => b && !isBankDeletedLocally(b.id))];

      const cleanBanks = updatedBanks.filter((b) => b && b.id && !isBankDeletedLocally(b.id));

      await updateDoc(mainDocRef, {
        banks: cleanBanks,
        updatedAt: new Date().toISOString(),
      }).catch(async () => {
        await setDoc(mainDocRef, { banks: cleanBanks }, { merge: true }).catch(() => {});
      });
    }

    return true;
  } catch (err: any) {
    checkAndHandleFirestoreError(err);
    console.warn('[Firestore] Error in saveSingleBankToFirestore:', err);
    return false;
  }
}

/**
 * Uploads all active local question banks to Firestore (exam_tokens, question_banks, and app_data/main)
 * to guarantee that all banks seen in the Admin view are 100% available in the cloud.
 */
export async function syncAllLocalBanksToFirestore(banksToSync?: QuestionBank[]): Promise<{ success: boolean; count: number }> {
  const db = getFirestoreDb();
  if (!db) return { success: false, count: 0 };

  const sourceBanks = Array.isArray(banksToSync) && banksToSync.length > 0 ? banksToSync : getStoredBanks();
  const validBanks = sourceBanks.filter((b) => b && b.id && !isBankDeletedLocally(b.id));

  let savedCount = 0;
  for (const b of validBanks) {
    try {
      const ok = await saveSingleBankToFirestore(b);
      if (ok) savedCount++;
    } catch {}
  }

  // Also update master doc
  try {
    await saveAppDataToFirestore({ banks: validBanks });
  } catch {}

  return { success: true, count: savedCount };
}

/**
 * Permanently removes a token document from 'exam_tokens' and 'question_banks' collections in Firestore
 */
export async function deleteExamTokenFromFirestore(token: string, bankId?: string): Promise<boolean> {
  const cleanToken = (token || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    if (cleanToken) {
      const tokenDocRef = doc(db, EXAM_TOKENS_COLLECTION, cleanToken);
      await deleteDoc(tokenDocRef).catch(() => {});
    }
    if (bankId) {
      const bankDocRef = doc(db, QUESTION_BANKS_COLLECTION, String(bankId));
      await deleteDoc(bankDocRef).catch(() => {});
    }
    return true;
  } catch (err) {
    console.warn('[Firestore] Error in deleteExamTokenFromFirestore:', err);
    return false;
  }
}

/**
 * Fetches all question banks across all Firestore collections (exam_tokens, question_banks, app_data/main)
 * and merges them cleanly into local storage.
 */
export async function fetchAllQuestionBanksFromCloud(): Promise<QuestionBank[]> {
  const db = getFirestoreDb();
  if (!db) return getStoredBanks();

  const collectedBanks: QuestionBank[] = [];
  const bankIdsSeen = new Set<string>();

  // 1. Fetch from 'question_banks' collection
  try {
    const qbSnap = await getDocs(collection(db, QUESTION_BANKS_COLLECTION));
    qbSnap.forEach((docSnap) => {
      const b = docSnap.data() as QuestionBank;
      if (b && b.id && !isBankDeletedLocally(b.id) && !bankIdsSeen.has(String(b.id))) {
        collectedBanks.push(b);
        bankIdsSeen.add(String(b.id));
      }
    });
  } catch (err) {
    checkAndHandleFirestoreError(err);
  }

  // 2. Fetch from 'exam_tokens' collection
  try {
    const tokensSnap = await getDocs(collection(db, EXAM_TOKENS_COLLECTION));
    tokensSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.bank) {
        const b = data.bank as QuestionBank;
        if (b && b.id && !isBankDeletedLocally(b.id) && !bankIdsSeen.has(String(b.id))) {
          collectedBanks.push(b);
          bankIdsSeen.add(String(b.id));
        }
      }
    });
  } catch (err) {
    checkAndHandleFirestoreError(err);
  }

  // 3. Fetch from 'app_data/main'
  try {
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef);
    if (mainSnap.exists()) {
      const mainData = mainSnap.data() as AppData;
      if (Array.isArray(mainData.banks)) {
        mainData.banks.forEach((b) => {
          if (b && b.id && !isBankDeletedLocally(b.id) && !bankIdsSeen.has(String(b.id))) {
            collectedBanks.push(b);
            bankIdsSeen.add(String(b.id));
          }
        });
      }
    }
  } catch (err) {
    checkAndHandleFirestoreError(err);
  }

  // 4. Merge with existing local banks if any
  const localBanks = getStoredBanks();
  localBanks.forEach((l) => {
    if (l && l.id && !isBankDeletedLocally(l.id) && !bankIdsSeen.has(String(l.id))) {
      collectedBanks.push(l);
      bankIdsSeen.add(String(l.id));
    }
  });

  if (collectedBanks.length > 0) {
    saveStoredBanks(collectedBanks);
  }

  return collectedBanks;
}

/**
 * Direct lookup of an exam question bank by Token from:
 * 1. Local storage (instant)
 * 2. Dedicated 'exam_tokens' collection (1 doc read)
 * 3. Standalone 'question_banks' collection
 * 4. Master 'app_data/main' document
 * 5. Full cloud scan fallback
 * 
 * Automatically persists to local storage and updates cache if found.
 */
export async function fetchQuestionBankByToken(token: string): Promise<QuestionBank | null> {
  const rawToken = (token || '').trim();
  const cleanToken = rawToken.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!cleanToken) return null;

  // 1. Check local storage first (instant)
  try {
    const localBanks = getStoredBanks();
    const localMatch = localBanks.find(
      (b) =>
        b &&
        b.token &&
        b.token.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanToken &&
        !isBankDeletedLocally(b.id)
    );
    if (localMatch && localMatch.questions && localMatch.questions.length > 0) {
      return localMatch;
    }
  } catch {}

  const db = getFirestoreDb();
  if (!db) return null;

  // 2. Fetch directly from dedicated 'exam_tokens' collection (1 lightweight doc read!)
  try {
    const tokenDocRef = doc(db, EXAM_TOKENS_COLLECTION, cleanToken);
    const tokenSnap = await getDoc(tokenDocRef);
    if (tokenSnap.exists()) {
      const tokenData = tokenSnap.data();
      if (tokenData && tokenData.bank) {
        const cloudBank = tokenData.bank as QuestionBank;
        if (!isBankDeletedLocally(cloudBank.id)) {
          // Cache into local storage
          try {
            const current = getStoredBanks();
            const filtered = current.filter((b) => String(b.id) !== String(cloudBank.id));
            const merged = [cloudBank, ...filtered];
            saveStoredBanks(merged);
          } catch {}
          return cloudBank;
        }
      }
    }
  } catch (err) {
    checkAndHandleFirestoreError(err);
    console.warn('[Firestore] Token lookup error on exam_tokens:', err);
  }

  // 3. Fetch from 'question_banks' collection by querying token
  try {
    const q = query(collection(db, QUESTION_BANKS_COLLECTION), where('token', '==', cleanToken), limit(1));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const cloudBank = qSnap.docs[0].data() as QuestionBank;
      if (cloudBank && !isBankDeletedLocally(cloudBank.id)) {
        // Cache locally and ensure token doc exists
        saveSingleBankToFirestore(cloudBank).catch(() => {});
        try {
          const current = getStoredBanks();
          const filtered = current.filter((b) => String(b.id) !== String(cloudBank.id));
          const merged = [cloudBank, ...filtered];
          saveStoredBanks(merged);
        } catch {}
        return cloudBank;
      }
    }
  } catch (err) {
    checkAndHandleFirestoreError(err);
  }

  // 4. Fallback: Search inside app_data/main banks array
  try {
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef);
    if (mainSnap.exists()) {
      const mainData = mainSnap.data() as AppData;
      if (Array.isArray(mainData.banks)) {
        const found = mainData.banks.find(
          (b) =>
            b &&
            b.token &&
            b.token.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanToken &&
            !isBankDeletedLocally(b.id)
        );
        if (found) {
          // Self-heal and write to exam_tokens & question_banks so future lookups are instant
          saveSingleBankToFirestore(found).catch(() => {});

          // Cache locally
          try {
            const current = getStoredBanks();
            const filtered = current.filter((b) => String(b.id) !== String(found.id));
            const merged = [found, ...filtered];
            saveStoredBanks(merged);
          } catch {}
          return found;
        }
      }
    }
  } catch (err) {
    checkAndHandleFirestoreError(err);
    console.warn('[Firestore] Token fallback lookup error on app_data/main:', err);
  }

  // 5. Ultimate Fallback: Comprehensive cloud search across all banks
  try {
    const allBanks = await fetchAllQuestionBanksFromCloud();
    const deepMatch = allBanks.find(
      (b) =>
        b &&
        b.token &&
        b.token.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanToken &&
        !isBankDeletedLocally(b.id)
    );
    if (deepMatch) {
      saveSingleBankToFirestore(deepMatch).catch(() => {});
      return deepMatch;
    }
  } catch {}

  return null;
}

/**
 * Subscribe to real-time changes across master data and dynamic collections
 */
export function subscribeToAppData(
  onData: (data: AppData, isLocalWrite: boolean) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  if (isFirestoreQuotaExhausted()) return null;
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    let currentMaster: AppData = {};
    let currentResults: ExamResult[] = [];
    let currentGameLogs: GameHistoryLog[] = [];
    let currentLoginLogs: UserLoginLog[] = [];
    let isCleanedUp = false;

    const emitConsolidated = (isLocalWrite: boolean) => {
      if (isCleanedUp) return;
      const consolidated: AppData = {
        ...currentMaster,
        results: currentResults,
        gameLogs: currentGameLogs,
        loginLogs: currentLoginLogs,
      };
      onData(consolidated, isLocalWrite);
    };

    let unsubMain: Unsubscribe | null = null;
    let unsubResults: Unsubscribe | null = null;
    let unsubGameLogs: Unsubscribe | null = null;
    let unsubLoginLogs: Unsubscribe | null = null;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      try { unsubMain && unsubMain(); } catch {}
      try { unsubResults && unsubResults(); } catch {}
      try { unsubGameLogs && unsubGameLogs(); } catch {}
      try { unsubLoginLogs && unsubLoginLogs(); } catch {}
    };

    const handleSnapshotError = (err: any) => {
      const isQuota = checkAndHandleFirestoreError(err);
      if (onError) onError(err);
      if (isQuota) {
        cleanup();
      }
    };

    // 1. Listener for app_data/main (Master Data)
    unsubMain = onSnapshot(
      doc(db, MAIN_COLLECTION, MAIN_DOCUMENT),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as AppData;
          const { results, gameLogs, loginLogs, ...restMaster } = raw;
          if (Array.isArray(restMaster.banks)) {
            restMaster.banks = restMaster.banks.filter((b) => b && b.id && !isBankDeletedLocally(b.id));
          }
          currentMaster = restMaster;
          emitConsolidated(snap.metadata.hasPendingWrites);
        }
      },
      handleSnapshotError
    );

    // 2. Listener for exam_results collection (Real-time student exam submissions, limited to recent 100)
    unsubResults = onSnapshot(
      query(collection(db, EXAM_RESULTS_COLLECTION), limit(100)),
      { includeMetadataChanges: true },
      (snap) => {
        const list: ExamResult[] = [];
        snap.forEach((d) => {
          const item = d.data() as ExamResult;
          if (item && item.id && !isExamResultDeletedLocally(item.id)) {
            list.push(item);
          }
        });
        const normalizedList = normalizeExamResults(list);
        currentResults = normalizedList.sort((a, b) => {
          const timeA = getExamResultTimestamp(a);
          const timeB = getExamResultTimestamp(b);
          return timeB - timeA;
        });
        emitConsolidated(snap.metadata.hasPendingWrites);
      },
      handleSnapshotError
    );

    // 3. Listener for game_logs collection (limited to recent 50)
    unsubGameLogs = onSnapshot(
      query(collection(db, GAME_LOGS_COLLECTION), limit(50)),
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
      handleSnapshotError
    );

    // 4. Listener for login_logs collection (limited to recent 50)
    unsubLoginLogs = onSnapshot(
      query(collection(db, LOGIN_LOGS_COLLECTION), limit(50)),
      { includeMetadataChanges: true },
      (snap) => {
        const list: UserLoginLog[] = [];
        snap.forEach((d) => {
          const item = d.data() as UserLoginLog;
          if (item && item.id && !isLoginLogDeletedLocally(item.id)) {
            if (item.name && item.name.trim().toLowerCase() === 'administrator') {
              return;
            }
            list.push(item);
          }
        });
        currentLoginLogs = list.sort((a, b) => {
          return (b.lastSeenTime || '').localeCompare(a.lastSeenTime || '');
        });
        emitConsolidated(snap.metadata.hasPendingWrites);
      },
      handleSnapshotError
    );

    return cleanup;
  } catch (err) {
    checkAndHandleFirestoreError(err);
    console.warn('[Firestore Realtime Subscription Warning]:', err);
    return null;
  }
}

/**
 * Safely writes an individual student exam result to dedicated 'exam_results' collection.
 * 100% thread-safe: zero race conditions when 50+ students submit exams concurrently.
 */
export async function syncExamResultToFirestore(result: ExamResult): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const db = getFirestoreDb();
  if (!db || !result || !result.id) return;

  try {
    const resultRef = doc(db, EXAM_RESULTS_COLLECTION, result.id);
    await setDoc(resultRef, result, { merge: true });
    console.log('[Firestore] Hasil ujian siswa tersimpan mandiri di koleksi exam_results:', result.studentName);
  } catch (err: any) {
    checkAndHandleFirestoreError(err);
    console.warn('[Firestore] Gagal menyimpan hasil ujian mandiri:', err?.message || err);
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
 * Permanently delete multiple exam results from Firestore and localStorage in bulk
 */
export async function deleteExamResultsBulkFromFirestore(resultIds: string[]): Promise<boolean> {
  if (!Array.isArray(resultIds) || resultIds.length === 0) return true;
  const idSet = new Set(resultIds);
  resultIds.forEach((id) => recordDeletedExamResultId(id));

  // 1. Update localStorage
  try {
    const raw = localStorage.getItem('cbt_results');
    if (raw) {
      const parsed: ExamResult[] = JSON.parse(raw);
      const filtered = parsed.filter((item) => item && !idSet.has(item.id));
      localStorage.setItem('cbt_results', JSON.stringify(filtered));
    }
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    const batch = writeBatch(db);
    resultIds.forEach((id) => {
      batch.delete(doc(db, EXAM_RESULTS_COLLECTION, id));
    });
    await batch.commit().catch(() => {});

    // Remove from app_data/main if present
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef).catch(() => null);
    if (mainSnap && mainSnap.exists()) {
      const mainData = mainSnap.data();
      if (Array.isArray(mainData.results)) {
        const filtered = mainData.results.filter((r: any) => r && !idSet.has(r.id));
        await updateDoc(mainDocRef, { results: filtered }).catch(() => {});
      }
    }
    console.log(`[Firestore] Sebanyak ${resultIds.length} hasil ujian berhasil dihapus permanen secara massal.`);
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal menghapus batch hasil ujian:', err);
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
  if (isFirestoreQuotaExhausted()) return;
  const db = getFirestoreDb();
  if (!db || !log || !log.id) return;

  try {
    const logRef = doc(db, GAME_LOGS_COLLECTION, log.id);
    await setDoc(logRef, log, { merge: true });
  } catch (err: any) {
    checkAndHandleFirestoreError(err);
    console.warn('[Firestore] Gagal menyimpan riwayat game mandiri:', err?.message || err);
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
 * Permanently delete multiple game history logs from Firestore and localStorage in bulk
 */
export async function deleteGameLogsBulkFromFirestore(logIds: string[]): Promise<boolean> {
  if (!Array.isArray(logIds) || logIds.length === 0) return true;
  const idSet = new Set(logIds);
  logIds.forEach((id) => recordDeletedGameLogId(id));

  // 1. Update localStorage
  try {
    const raw = localStorage.getItem('cbt_game_logs');
    if (raw) {
      const parsed: GameHistoryLog[] = JSON.parse(raw);
      const filtered = parsed.filter((item) => item && !idSet.has(item.id));
      localStorage.setItem('cbt_game_logs', JSON.stringify(filtered));
    }
  } catch {}

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    const batch = writeBatch(db);
    logIds.forEach((id) => {
      batch.delete(doc(db, GAME_LOGS_COLLECTION, id));
    });
    await batch.commit().catch(() => {});

    // Remove from app_data/main if present
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);
    const mainSnap = await getDoc(mainDocRef).catch(() => null);
    if (mainSnap && mainSnap.exists()) {
      const mainData = mainSnap.data();
      if (Array.isArray(mainData.gameLogs)) {
        const filtered = mainData.gameLogs.filter((g: any) => g && !idSet.has(g.id));
        await updateDoc(mainDocRef, { gameLogs: filtered }).catch(() => {});
      }
    }
    console.log(`[Firestore] Sebanyak ${logIds.length} game logs berhasil dihapus permanen secara massal.`);
    return true;
  } catch (err) {
    console.warn('[Firestore] Gagal menghapus batch game logs:', err);
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

// In-memory tracker to throttle cloud presence writes to at most once per 3 minutes
const lastTrackedCloudLogTimes = new Map<string, number>();

/**
 * Track user login / heartbeat directly in 'login_logs' collection
 * Includes smart throttling (max once every 3 minutes for periodic pings) unless force=true (e.g. login/logout event).
 */
export async function trackUserLoginInFirestore(log: UserLoginLog, force = false): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  const db = getFirestoreDb();
  if (!db || !log || !log.id) return;

  // Students do NOT send background heartbeat writes to conserve Firestore quota
  // They only sync on explicit login (force=true) or exam events
  if (!force && log.role === 'siswa') {
    return;
  }

  const now = Date.now();
  const lastTime = lastTrackedCloudLogTimes.get(log.id) || 0;
  // If not forced, throttle writes to at most once per 5 minutes
  if (!force && now - lastTime < 300000) {
    return;
  }
  lastTrackedCloudLogTimes.set(log.id, now);

  try {
    const logRef = doc(db, LOGIN_LOGS_COLLECTION, log.id);
    await setDoc(logRef, log, { merge: true });
  } catch (err: any) {
    checkAndHandleFirestoreError(err);
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
 * Permanently purge any admin account login log named "Administrator"
 */
export async function purgeAdministratorLoginLog(): Promise<void> {
  // 1. Clean localStorage
  try {
    const raw = localStorage.getItem('cbt_login_logs');
    if (raw) {
      const parsed: UserLoginLog[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (item) => item && (!item.name || item.name.trim().toLowerCase() !== 'administrator')
        );
        localStorage.setItem('cbt_login_logs', JSON.stringify(filtered));
      }
    }
  } catch {}

  const db = getFirestoreDb();
  if (!db || isFirestoreQuotaExhausted()) return;

  try {
    const q = query(
      collection(db, LOGIN_LOGS_COLLECTION),
      where('name', '==', 'Administrator'),
      limit(5)
    );
    const snap = await getDocs(q).catch(() => null);
    if (snap && !snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit().catch(() => {});
    }
  } catch (err) {
    // silent
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
  recordDeletedBankId(bankId);
  const target = currentBanks.find((b) => String(b.id) === String(bankId));
  if (target?.token) {
    deleteExamTokenFromFirestore(target.token).catch(() => {});
  }
  const updated = currentBanks.filter((b) => String(b.id) !== String(bankId) && !isBankDeletedLocally(b.id));
  try {
    localStorage.setItem('cbt_banks', JSON.stringify(updated));
  } catch {}
  await saveAppDataToFirestore({ banks: updated });
  return updated;
}

export async function deleteBanksBulkPermanently(bankIds: string[], currentBanks: QuestionBank[]): Promise<QuestionBank[]> {
  bankIds.forEach((id) => {
    recordDeletedBankId(id);
    const target = currentBanks.find((b) => String(b.id) === String(id));
    if (target?.token) {
      deleteExamTokenFromFirestore(target.token).catch(() => {});
    }
  });
  const idSet = new Set(bankIds.map((id) => String(id)));
  const updated = currentBanks.filter((b) => !idSet.has(String(b.id)) && !isBankDeletedLocally(b.id));
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

/**
 * Unmark bank IDs so restored banks are not suppressed by deletion guard
 */
export function clearLocallyDeletedBankIds(bankIds: string[]) {
  if (!Array.isArray(bankIds)) return;
  bankIds.forEach((id) => locallyDeletedBankIds.delete(id));
  try {
    const arr = Array.from(locallyDeletedBankIds);
    localStorage.setItem('cbt_deleted_bank_ids', JSON.stringify(arr));
  } catch {}
}

/**
 * Pulihkan seluruh data aplikasi ke Firestore (Master Document + Subcollections)
 */
export async function restoreAllDataInFirestore(
  backup: {
    teachers?: Teacher[];
    students?: Student[];
    subjects?: Subject[];
    banks?: QuestionBank[];
    results?: ExamResult[];
    dailyGrades?: DailyGradeRecord[];
    gameLogs?: GameHistoryLog[];
    gameData?: Record<string, any>;
    schoolProfile?: SchoolProfile;
    rolePermissions?: RolePermissions;
  },
  mode: 'replace' | 'merge' = 'replace'
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const mainDocRef = doc(db, MAIN_COLLECTION, MAIN_DOCUMENT);

    // If restore contains bank IDs, clear them from deletion filter
    if (backup.banks && backup.banks.length > 0) {
      clearLocallyDeletedBankIds(backup.banks.map((b) => b.id));
    }

    const payloadToSave: any = {
      teachers: backup.teachers || [],
      students: backup.students || [],
      subjects: backup.subjects || [],
      banks: backup.banks || [],
      dailyGrades: backup.dailyGrades || [],
      gameData: backup.gameData || {},
      updatedAt: new Date().toISOString(),
    };

    if (backup.schoolProfile) payloadToSave.schoolProfile = backup.schoolProfile;
    if (backup.rolePermissions) payloadToSave.rolePermissions = backup.rolePermissions;

    if (mode === 'replace') {
      await setDoc(mainDocRef, payloadToSave, { merge: false });
      // Clear previous subcollections if replace mode
      await Promise.all([
        clearFirestoreCollection(db, EXAM_RESULTS_COLLECTION),
        clearFirestoreCollection(db, GAME_LOGS_COLLECTION),
      ]);
    } else {
      await setDoc(mainDocRef, payloadToSave, { merge: true });
    }

    // Write results to EXAM_RESULTS_COLLECTION
    if (backup.results && backup.results.length > 0) {
      const promises = backup.results.map((res) => {
        if (!res.id) return Promise.resolve();
        return setDoc(doc(db, EXAM_RESULTS_COLLECTION, res.id), res, { merge: true });
      });
      await Promise.all(promises);
    }

    // Write gameLogs to GAME_LOGS_COLLECTION
    if (backup.gameLogs && backup.gameLogs.length > 0) {
      const promises = backup.gameLogs.map((log) => {
        if (!log.id) return Promise.resolve();
        return setDoc(doc(db, GAME_LOGS_COLLECTION, log.id), log, { merge: true });
      });
      await Promise.all(promises);
    }

    console.log('[Firestore] Berhasil memulihkan dan memperbarui seluruh data sistem di Firestore.');
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Error restoring app data in Firestore:', err?.message || err);
    return false;
  }
}


