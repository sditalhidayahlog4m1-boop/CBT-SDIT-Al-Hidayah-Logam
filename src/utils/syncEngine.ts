import { AppData, saveAppDataToFirestore } from './firebaseSync';
import {
  saveStoredTeachers,
  saveStoredStudents,
  saveStoredSubjects,
  saveStoredBanks,
  saveStoredResults,
  saveStoredGameLogs,
  saveStoredLoginLogs,
  saveStoredDailyGrades,
  saveStoredSchoolProfile,
  saveStoredRolePermissions,
  saveStoredGameData,
  saveStoredAdminAccount,
  AdminAccount,
} from './storage';

// BroadcastChannel for instant (<5ms) sync across tabs/windows on the same browser/machine
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('cbt_realtime_sync');
  }
} catch {
  syncChannel = null;
}

export type SyncPayload = Partial<AppData>;

// Emit changes to local tabs AND Firestore Cloud
export function broadcastAppDataChange(data: Partial<AppData>) {
  // 1. Instantly update localStorage
  if (data.teachers) saveStoredTeachers(data.teachers);
  if (data.students) saveStoredStudents(data.students);
  if (data.subjects) saveStoredSubjects(data.subjects);
  if (data.banks) saveStoredBanks(data.banks);
  if (data.results) saveStoredResults(data.results);
  if (data.gameLogs) saveStoredGameLogs(data.gameLogs);
  if (data.loginLogs) saveStoredLoginLogs(data.loginLogs);
  if (data.dailyGrades) saveStoredDailyGrades(data.dailyGrades);
  if (data.schoolProfile) saveStoredSchoolProfile(data.schoolProfile);
  if (data.rolePermissions) saveStoredRolePermissions(data.rolePermissions);
  if (data.gameData) saveStoredGameData(data.gameData);
  if (data.adminAccount) saveStoredAdminAccount(data.adminAccount);

  // 2. Broadcast to other open browser tabs/windows immediately
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'APP_DATA_SYNC', payload: data, timestamp: Date.now() });
    } catch (e) {
      console.warn('[SyncChannel] Post message error:', e);
    }
  }

  // 3. Sync to Firebase Cloud Firestore for multi-device & multi-user sync
  saveAppDataToFirestore(data).catch((err) => {
    console.warn('[Firestore] Sync warning:', err);
  });
}

// Subscribe to local tab broadcasts
export function subscribeToLocalSync(onSync: (data: Partial<AppData>) => void): () => void {
  if (!syncChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'APP_DATA_SYNC' && event.data.payload) {
      onSync(event.data.payload);
    }
  };

  syncChannel.addEventListener('message', handler);

  // Also listen for storage events as fallback
  const storageHandler = (e: StorageEvent) => {
    if (e.key === 'cbt_admin_account' && e.newValue) {
      try {
        const admin: AdminAccount = JSON.parse(e.newValue);
        onSync({ adminAccount: admin });
      } catch {}
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    if (syncChannel) {
      syncChannel.removeEventListener('message', handler);
    }
    window.removeEventListener('storage', storageHandler);
  };
}
