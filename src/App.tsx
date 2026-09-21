import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Teacher,
  Student,
  Subject,
  QuestionBank,
  ExamResult,
  GameHistoryLog,
  UserLoginLog,
  ActiveTab,
  AuthUser,
  RolePermissions,
  DailyGradeRecord,
  FullBackupData,
} from './types';
import {
  getStoredTeachers,
  saveStoredTeachers,
  getStoredStudents,
  saveStoredStudents,
  getStoredSubjects,
  saveStoredSubjects,
  getStoredBanks,
  saveStoredBanks,
  getStoredResults,
  saveStoredResults,
  getStoredGameLogs,
  saveStoredGameLogs,
  getStoredLoginLogs,
  saveStoredLoginLogs,
  getStoredDailyGrades,
  saveStoredDailyGrades,
  clearAllStoredData,
  getStoredCurrentUser,
  saveStoredCurrentUser,
  getStoredRolePermissions,
  saveStoredRolePermissions,
  SchoolProfile,
  getStoredSchoolProfile,
  saveStoredSchoolProfile,
  getStoredGameData,
  saveStoredGameData,
  getStoredAdminAccount,
  saveStoredAdminAccount,
} from './utils/storage';
import { normalizeExamResults } from './utils/dateUtils';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { ProfilSayaView } from './components/ProfilSayaView';
import { ProfilSekolahView } from './components/ProfilSekolahView';
import { TeacherDataView } from './components/TeacherDataView';
import { StudentDataView } from './components/StudentDataView';
import { SubjectView } from './components/SubjectView';
import { NilaiHarianView } from './components/NilaiHarianView';
import { AiQuestionGeneratorView } from './components/AiQuestionGeneratorView';
import { AiGameGeneratorView } from './components/AiGameGeneratorView';
import { EkstrakDokumenView } from './components/EkstrakDokumenView';
import { BankSoalView } from './components/BankSoalView';
import { KumpulanJawabanView } from './components/KumpulanJawabanView';
import { MulaiUjianView } from './components/MulaiUjianView';
import { ExamScreen } from './components/ExamScreen';
import { ExamHistoryView } from './components/ExamHistoryView';
import { GameHistoryView } from './components/GameHistoryView';
import { HakAksesView } from './components/HakAksesView';
import { BackupUploadDataView } from './components/BackupUploadDataView';
import { ResetDataView } from './components/ResetDataView';

import {
  fetchAppDataFromFirestore,
  saveAppDataToFirestore,
  saveSingleBankToFirestore,
  fetchAllQuestionBanksFromCloud,
  resetAllDataInFirestore,
  restoreAllDataInFirestore,
  clearLocallyDeletedBankIds,
  subscribeToAppData,
  trackUserLoginInFirestore,
  syncExamResultToFirestore,
  syncGameLogToFirestore,
  deleteGameLogFromFirestore,
  deleteGameLogsBulkFromFirestore,
  clearAllGameLogsInFirestore,
  purgeAdministratorLoginLog,
  isBankDeletedLocally,
  isFirestoreQuotaExhausted,
  AppData,
} from './utils/firebaseSync';
import { subscribeToLocalSync, broadcastAppDataChange } from './utils/syncEngine';
import { isDeepEqual } from './utils/deepEqual';
import { autoSyncBanksWithSubjects } from './utils/subjectMatcher';
import { authenticateUser, cleanAlphanumeric, normalizeString } from './utils/authMatcher';
import {
  getCurrentHistoryState,
  pushNavigationState,
  replaceNavigationState,
  HistoryStatePayload,
} from './utils/navigationHistory';
import { syncWebFaviconAndLogo } from './utils/logoSync';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredCurrentUser);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!getStoredCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !getStoredCurrentUser());

  // Role Access Permissions State
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(getStoredRolePermissions);

  // School Profile State
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(getStoredSchoolProfile);

  // Persistent States
  const [teachers, setTeachers] = useState<Teacher[]>(getStoredTeachers);
  const [students, setStudents] = useState<Student[]>(getStoredStudents);
  const [subjects, setSubjects] = useState<Subject[]>(getStoredSubjects);
  const [banks, setBanks] = useState<QuestionBank[]>(getStoredBanks);
  const [results, setResults] = useState<ExamResult[]>(getStoredResults);
  const [gameLogs, setGameLogs] = useState<GameHistoryLog[]>(getStoredGameLogs);
  const [loginLogs, setLoginLogs] = useState<UserLoginLog[]>(getStoredLoginLogs);
  const [dailyGrades, setDailyGrades] = useState<DailyGradeRecord[]>(getStoredDailyGrades);
  const [gameData, setGameData] = useState<Record<string, any>>(getStoredGameData);

  // Active Exam Focus Mode state
  const [activeExam, setActiveExam] = useState<{
    studentName: string;
    classRoom: string;
    bank: QuestionBank;
    studentId?: string;
  } | null>(null);

  // Track last synced data from Firestore to prevent unnecessary write loops
  const lastSyncedDataRef = useRef<AppData | null>(null);
  const hasFinishedInitialSyncRef = useRef(false);
  const lastLocalBankEditTimeRef = useRef<number>(0);

  // State refs for listener closures
  const teachersRef = useRef(teachers);
  teachersRef.current = teachers;
  const studentsRef = useRef(students);
  studentsRef.current = students;
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;
  const banksRef = useRef(banks);
  banksRef.current = banks;
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const gameLogsRef = useRef(gameLogs);
  gameLogsRef.current = gameLogs;
  const loginLogsRef = useRef(loginLogs);
  loginLogsRef.current = loginLogs;
  const dailyGradesRef = useRef(dailyGrades);
  dailyGradesRef.current = dailyGrades;
  const schoolProfileRef = useRef(schoolProfile);
  schoolProfileRef.current = schoolProfile;
  const rolePermissionsRef = useRef(rolePermissions);
  rolePermissionsRef.current = rolePermissions;
  const gameDataRef = useRef(gameData);
  gameDataRef.current = gameData;

  const applyRemoteData = (data: AppData, isLocalWrite: boolean = false) => {
    if (isLocalWrite) return;

    if (!lastSyncedDataRef.current) {
      lastSyncedDataRef.current = { ...data };
    }

    if (Array.isArray(data.teachers) && !isDeepEqual(teachersRef.current, data.teachers)) {
      setTeachers(data.teachers);
      saveStoredTeachers(data.teachers);
      lastSyncedDataRef.current.teachers = data.teachers;

      // Realtime session update if current user is Guru
      setCurrentUser((prev) => {
        if (prev && prev.role === 'guru') {
          const matched = data.teachers!.find(
            (t) =>
              (prev.details && 'id' in prev.details && t.id === prev.details.id) ||
              t.name.trim().toLowerCase() === prev.name.trim().toLowerCase() ||
              (t.username && t.username.trim().toLowerCase() === (prev.username || '').trim().toLowerCase())
          );
          if (matched) {
            const updated: AuthUser = {
              ...prev,
              name: matched.name,
              username: matched.username || prev.username,
              password: matched.password || matched.birthDate || prev.password,
              photoUrl: matched.photoUrl !== undefined ? matched.photoUrl : prev.photoUrl,
              birthDate: matched.birthDate || prev.birthDate,
              details: matched,
            };
            saveStoredCurrentUser(updated);
            return updated;
          }
        }
        return prev;
      });
    }
    if (Array.isArray(data.students) && !isDeepEqual(studentsRef.current, data.students)) {
      setStudents(data.students);
      saveStoredStudents(data.students);
      lastSyncedDataRef.current.students = data.students;

      // Realtime session update if current user is Siswa
      setCurrentUser((prev) => {
        if (prev && prev.role === 'siswa') {
          const matched = data.students!.find(
            (s) =>
              (prev.details && 'id' in prev.details && s.id === prev.details.id) ||
              s.name.trim().toLowerCase() === prev.name.trim().toLowerCase() ||
              (s.username && s.username.trim().toLowerCase() === (prev.username || '').trim().toLowerCase()) ||
              (s.nis && s.nis.trim() === (prev.username || '').trim())
          );
          if (matched) {
            const updated: AuthUser = {
              ...prev,
              name: matched.name,
              username: matched.username || prev.username,
              password: matched.password || matched.birthDate || prev.password,
              photoUrl: matched.photoUrl !== undefined ? matched.photoUrl : prev.photoUrl,
              birthDate: matched.birthDate || prev.birthDate,
              details: matched,
            };
            saveStoredCurrentUser(updated);
            return updated;
          }
        }
        return prev;
      });
    }
    if (Array.isArray(data.subjects) && !isDeepEqual(subjectsRef.current, data.subjects)) {
      setSubjects(data.subjects);
      saveStoredSubjects(data.subjects);
      lastSyncedDataRef.current.subjects = data.subjects;
    }
    if (Array.isArray(data.banks)) {
      const localBanks = (banksRef.current || []).filter((b) => b && b.id && !isBankDeletedLocally(b.id));
      const remoteBanks = data.banks.filter((b) => b && b.id && !isBankDeletedLocally(b.id));

      // Last-Write-Wins conflict resolution per question bank (preserving local edits with newer timestamp)
      const mergedBanks: QuestionBank[] = [];
      const processedIds = new Set<string>();

      for (const remoteB of remoteBanks) {
        const remoteIdStr = String(remoteB.id);
        const localB = localBanks.find((l) => String(l.id) === remoteIdStr);
        if (localB) {
          const localTime = localB.updatedAt ? new Date(localB.updatedAt).getTime() : 0;
          const remoteTime = remoteB.updatedAt ? new Date(remoteB.updatedAt).getTime() : 0;
          if (localTime > remoteTime) {
            // Local bank has newer edits (subject, token, questions, etc.) -> Preserve local bank!
            mergedBanks.push(localB);
          } else {
            // Remote bank is equal or newer -> Use remote bank
            mergedBanks.push(remoteB);
          }
        } else {
          mergedBanks.push(remoteB);
        }
        processedIds.add(remoteIdStr);
      }

      // Preserve any local banks not present in remote (unless locally deleted)
      for (const localB of localBanks) {
        const localIdStr = String(localB.id);
        if (!processedIds.has(localIdStr) && !isBankDeletedLocally(localB.id)) {
          mergedBanks.push(localB);
          processedIds.add(localIdStr);
        }
      }

      const finalBanks = mergedBanks.filter((b) => b && b.id && !isBankDeletedLocally(b.id));

      if (!isDeepEqual(banksRef.current, finalBanks)) {
        setBanks(finalBanks);
        saveStoredBanks(finalBanks);
        if (lastSyncedDataRef.current) {
          lastSyncedDataRef.current.banks = finalBanks;
        }
      }
    }
    if (Array.isArray(data.results)) {
      const normalized = normalizeExamResults(data.results);
      if (!isDeepEqual(resultsRef.current, normalized)) {
        setResults(normalized);
        saveStoredResults(normalized);
        lastSyncedDataRef.current.results = normalized;
      }
    }
    if (Array.isArray(data.gameLogs) && !isDeepEqual(gameLogsRef.current, data.gameLogs)) {
      setGameLogs(data.gameLogs);
      saveStoredGameLogs(data.gameLogs);
      lastSyncedDataRef.current.gameLogs = data.gameLogs;
    }
    if (Array.isArray(data.loginLogs) && !isDeepEqual(loginLogsRef.current, data.loginLogs)) {
      const cleanLogs = data.loginLogs.filter(
        (l) => l && (!l.name || l.name.trim().toLowerCase() !== 'administrator')
      );
      setLoginLogs(cleanLogs);
      saveStoredLoginLogs(cleanLogs);
      lastSyncedDataRef.current.loginLogs = cleanLogs;
    }
    if (Array.isArray(data.dailyGrades) && !isDeepEqual(dailyGradesRef.current, data.dailyGrades)) {
      setDailyGrades(data.dailyGrades);
      saveStoredDailyGrades(data.dailyGrades);
      lastSyncedDataRef.current.dailyGrades = data.dailyGrades;
    }
    if (data.schoolProfile && !isDeepEqual(schoolProfileRef.current, data.schoolProfile)) {
      setSchoolProfile(data.schoolProfile);
      saveStoredSchoolProfile(data.schoolProfile);
      lastSyncedDataRef.current.schoolProfile = data.schoolProfile;
    }
    if (data.rolePermissions && !isDeepEqual(rolePermissionsRef.current, data.rolePermissions)) {
      setRolePermissions(data.rolePermissions);
      saveStoredRolePermissions(data.rolePermissions);
      lastSyncedDataRef.current.rolePermissions = data.rolePermissions;
    }
    if (data.gameData && !isDeepEqual(gameDataRef.current, data.gameData)) {
      setGameData(data.gameData);
      saveStoredGameData(data.gameData);
      lastSyncedDataRef.current.gameData = data.gameData;
    }
    if (data.adminAccount) {
      saveStoredAdminAccount(data.adminAccount);
      lastSyncedDataRef.current.adminAccount = data.adminAccount;

      // Realtime session update if current user is Admin
      setCurrentUser((prev) => {
        if (prev && prev.role === 'admin') {
          const updated: AuthUser = {
            ...prev,
            name: data.adminAccount!.name || prev.name,
            username: data.adminAccount!.username || prev.username,
            password: data.adminAccount!.password || prev.password,
            photoUrl: data.adminAccount!.photoUrl !== undefined ? data.adminAccount!.photoUrl : prev.photoUrl,
          };
          saveStoredCurrentUser(updated);
          return updated;
        }
        return prev;
      });
    }
  };

  // Initial Firestore Sync, Realtime Firestore Subscription, and Local Tab Broadcast Listener
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeLocal: (() => void) | null = null;

    // 1. Subscribe to instant local multi-tab sync
    unsubscribeLocal = subscribeToLocalSync((localData) => {
      applyRemoteData(localData as AppData, false);
    });

    // 2. Fetch and subscribe to Firebase Cloud Firestore
    const performSync = async () => {
      try {
        await purgeAdministratorLoginLog();
        const remoteData = await fetchAppDataFromFirestore(true);
        if (remoteData) {
          applyRemoteData(remoteData, false);
        } else if (!isFirestoreQuotaExhausted() && banksRef.current.length > 0) {
          // Only seed initial master data if local client has meaningful banks data
          await saveAppDataToFirestore({
            teachers: teachersRef.current,
            students: studentsRef.current,
            subjects: subjectsRef.current,
            banks: banksRef.current,
            dailyGrades: dailyGradesRef.current,
            schoolProfile: schoolProfileRef.current,
            rolePermissions: rolePermissionsRef.current,
            gameData: gameDataRef.current,
            adminAccount: getStoredAdminAccount(),
          });
        }

        // Also fetch standalone question banks from dedicated collections to guarantee full cross-device availability
        try {
          const cloudBanks = await fetchAllQuestionBanksFromCloud();
          if (cloudBanks && cloudBanks.length > 0) {
            applyRemoteData({ banks: cloudBanks }, false);
          }
        } catch {}
      } catch (err) {
        console.warn('[Firestore] Initial sync note:', err);
      } finally {
        hasFinishedInitialSyncRef.current = true;

        unsubscribeFirestore = subscribeToAppData((data, isLocalWrite) => {
          applyRemoteData(data, isLocalWrite);
        });
      }
    };

    performSync();

    // Background polling fallback (run every 3 minutes, only when tab is active/visible and quota is not exhausted)
    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && (document.visibilityState !== 'visible' || isFirestoreQuotaExhausted())) {
        return;
      }
      try {
        const freshData = await fetchAppDataFromFirestore(true);
        if (freshData) {
          applyRemoteData(freshData, false);
        }
      } catch (err) {
        // silent
      }
    }, 180000);

    return () => {
      clearInterval(pollInterval);
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeLocal) unsubscribeLocal();
    };
  }, []);

  // Ref to hold the current user's live active work / activity
  const currentUserActivityRef = useRef<{ activity: string; details?: string }>({
    activity: 'Baru Saja Login',
    details: 'Masuk ke sistem CBT',
  });

  // Centralized function to instantly update user's live activity in state & Firestore (Real-time)
  const updateUserActivity = useCallback(
    (activity: string, details?: string) => {
      if (!currentUser) return;
      currentUserActivityRef.current = { activity, details };

      const now = new Date();
      const formattedTime = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      let identifier = currentUser.username || '';
      let classRoom: string | undefined = undefined;
      let positionOrSubject: string | undefined = undefined;
      let finalName = currentUser.name;

      if (currentUser.role === 'siswa' && currentUser.details && 'nisn' in currentUser.details) {
        identifier = currentUser.details.nisn || currentUser.details.nis || currentUser.username || '';
        classRoom = currentUser.details.classRoom;
      } else if (currentUser.role === 'guru' && currentUser.details && 'nip' in currentUser.details) {
        identifier = currentUser.details.nip || currentUser.details.nuptk || currentUser.username || '';
        positionOrSubject = `${currentUser.details.position || 'Guru'}${currentUser.details.subject ? ` (${currentUser.details.subject})` : ''}`;
      } else if (currentUser.role === 'admin') {
        if (!finalName || finalName.trim().toLowerCase() === 'administrator') {
          finalName = 'Administrator System';
        }
        positionOrSubject = 'Administrator Sistem';
      }

      if (finalName.trim().toLowerCase() === 'administrator') {
        return;
      }

      const deterministicId = `login-${currentUser.role}-${finalName.replace(/\s+/g, '-').toLowerCase()}`;

      const updatedLog: UserLoginLog = {
        id: deterministicId,
        userId: currentUser.details?.id || currentUser.username || finalName,
        name: finalName,
        role: currentUser.role,
        identifier: identifier || currentUser.username || '-',
        classRoom,
        positionOrSubject,
        loginTime: formattedTime,
        lastSeenTime: formattedTime,
        lastActiveTimestamp: Date.now(),
        currentActivity: activity,
        activityDetails: details,
        status: 'online',
        photoUrl: currentUser.photoUrl,
      };

      setLoginLogs((prev) => {
        const existing = prev.find(
          (l) => l.name.toLowerCase() === finalName.toLowerCase() && l.role === currentUser.role
        );
        if (existing?.loginTime) {
          updatedLog.loginTime = existing.loginTime;
        }
        const filtered = prev.filter(
          (l) =>
            !(l.name.toLowerCase() === finalName.toLowerCase() && l.role === currentUser.role) &&
            l.name.trim().toLowerCase() !== 'administrator'
        );
        const nextLogs = [updatedLog, ...filtered];
        saveStoredLoginLogs(nextLogs);
        broadcastAppDataChange({ loginLogs: nextLogs });
        return nextLogs;
      });

      trackUserLoginInFirestore(updatedLog);
    },
    [currentUser]
  );

    // Heartbeat Mechanism: Periodic active status ping every 90s (when visible and active)
    useEffect(() => {
      if (!currentUser) return;

      const pingHeartbeat = () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        const activeState = currentUserActivityRef.current;
        updateUserActivity(activeState.activity, activeState.details);
      };

      // Initial heartbeat on mount
      pingHeartbeat();

      // Heartbeat every 90 seconds while session is active for real-time monitoring without quota exhaustion
      const heartbeatTimer = setInterval(pingHeartbeat, 90000);
      return () => clearInterval(heartbeatTimer);
    }, [currentUser, updateUserActivity]);

  // Synchronize Favicon, Web App Icons, Meta Tags, and Document Title with School Profile & Custom Logo
  useEffect(() => {
    let name = schoolProfile?.name?.trim() || 'SDIT Al Hidayah Logam';
    if (name === 'SDIT AL HIDAYAH' || name === 'SDIT Al Hidayah' || name === 'SDIT AL HIDAYAH LOGAM') {
      name = 'SDIT Al Hidayah Logam';
    }

    if (name.startsWith('CBT_')) {
      document.title = name;
    } else {
      document.title = `CBT_${name}`;
    }

    syncWebFaviconAndLogo(schoolProfile?.logoUrl, name);
  }, [schoolProfile]);

  const handleLogin = (
    userOrUsername: AuthUser | string,
    passwordOrRememberMe?: string | boolean,
    rememberMe: boolean = true
  ) => {
    let user: AuthUser | null = null;
    let shouldRemember = true;

    // Jika dipanggil dengan (username, password) -> Pencarian otomatis di database pengguna
    if (typeof userOrUsername === 'string') {
      const inputUsername = userOrUsername.trim();
      const inputPassword = typeof passwordOrRememberMe === 'string' ? passwordOrRememberMe.trim() : '';
      shouldRemember = typeof rememberMe === 'boolean' ? rememberMe : true;

      // 1. Cek Akun Admin (fleksibel: huruf besar semua, kecil semua, maupun huruf awal besar)
      const storedAdmin = getStoredAdminAccount();
      const adminUserNorm = normalizeString(storedAdmin.username);
      const adminUserClean = cleanAlphanumeric(storedAdmin.username);
      const adminNameNorm = normalizeString(storedAdmin.name);
      const adminNameClean = cleanAlphanumeric(storedAdmin.name);
      const adminPassClean = storedAdmin.password.trim();

      const userNorm = normalizeString(inputUsername);
      const userClean = cleanAlphanumeric(inputUsername);

      const isAdminMatch =
        userNorm === 'admin' ||
        userNorm === 'administrator' ||
        userNorm === adminUserNorm ||
        userNorm === adminNameNorm ||
        userClean === 'admin' ||
        userClean === 'administrator' ||
        userClean === adminUserClean ||
        userClean === adminNameClean ||
        (userClean.startsWith('admin') && userClean.length <= 13);

      const isPassAdminMatch =
        inputPassword === adminPassClean ||
        inputPassword.toLowerCase() === adminPassClean.toLowerCase() ||
        cleanAlphanumeric(inputPassword) === cleanAlphanumeric(adminPassClean) ||
        (adminPassClean.toLowerCase() === 'admin' &&
          (inputPassword.toLowerCase() === 'admin' ||
            inputPassword.toLowerCase() === 'admin123' ||
            inputPassword.toLowerCase() === 'administrator'));

      if (isAdminMatch && isPassAdminMatch) {
        user = {
          role: 'admin',
          name: storedAdmin.name || 'Administrator System',
          username: storedAdmin.username,
          password: storedAdmin.password,
          photoUrl: storedAdmin.photoUrl || '',
          birthDate: 'Admin',
        };
      }

      // 2. Cek Guru & Siswa via flexible authMatcher
      if (!user) {
        const authResult = authenticateUser(inputUsername, inputPassword, teachers, students);
        if (authResult.authenticatedUser) {
          user = authResult.authenticatedUser;
        }
      }

      if (!user) {
        return;
      }
    } else {
      user = userOrUsername;
      shouldRemember = typeof passwordOrRememberMe === 'boolean' ? passwordOrRememberMe : true;
    }

    // Record login event in loginLogs & update lastLogin on user
    const now = new Date();
    const formattedTime = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    let identifier = user.username || '';
    let classRoom: string | undefined = undefined;
    let positionOrSubject: string | undefined = undefined;

    if (user.role === 'siswa' && user.details && 'nisn' in user.details) {
      identifier = user.details.nisn || user.details.nis || user.username || '';
      classRoom = user.details.classRoom;
    } else if (user.role === 'guru' && user.details && 'nip' in user.details) {
      identifier = user.details.nip || user.details.nuptk || user.username || '';
      positionOrSubject = `${user.details.position || 'Guru'}${user.details.subject ? ` (${user.details.subject})` : ''}`;
    }

    const updatedUser: AuthUser = {
      ...user,
      lastLogin: formattedTime,
      details: user.details ? { ...user.details, lastLogin: formattedTime } : user.details,
    };

    setCurrentUser(updatedUser);
    setIsLoggedIn(true);
    setIsLoginModalOpen(false); // Tutup modal login seketika agar pengguna langsung masuk ke aplikasi
    saveStoredCurrentUser(updatedUser, shouldRemember);
    try {
      localStorage.setItem('cbt_session', JSON.stringify(updatedUser));
      localStorage.setItem('cbt_user_session', JSON.stringify({
        id: updatedUser.id,
        role: updatedUser.role,
        name: updatedUser.name,
        timestamp: Date.now(),
      }));
    } catch {
      // ignore
    }
    setIsMobileMenuOpen(false);

    // Update teachers or students list to record lastLogin
    if (user.role === 'guru') {
      setTeachers((prev) => {
        const updated = prev.map((t) => {
          const isMatch =
            (user.details && 'id' in user.details && t.id === user.details.id) ||
            t.name.trim().toLowerCase() === user.name.trim().toLowerCase() ||
            (t.username && t.username.trim().toLowerCase() === (user.username || '').trim().toLowerCase()) ||
            (t.nip && t.nip === identifier);
          return isMatch ? { ...t, lastLogin: formattedTime } : t;
        });
        saveStoredTeachers(updated);
        broadcastAppDataChange({ teachers: updated });
        saveAppDataToFirestore({ teachers: updated });
        return updated;
      });
    } else if (user.role === 'siswa') {
      setStudents((prev) => {
        const updated = prev.map((s) => {
          const isMatch =
            (user.details && 'id' in user.details && s.id === user.details.id) ||
            s.name.trim().toLowerCase() === user.name.trim().toLowerCase() ||
            (s.username && s.username.trim().toLowerCase() === (user.username || '').trim().toLowerCase()) ||
            (s.nisn && s.nisn === identifier) ||
            (s.nis && s.nis === identifier);
          return isMatch ? { ...s, lastLogin: formattedTime } : s;
        });
        saveStoredStudents(updated);
        broadcastAppDataChange({ students: updated });
        saveAppDataToFirestore({ students: updated });
        return updated;
      });
    }

    let finalLoginName = user.name;
    if (user.role === 'admin') {
      if (!finalLoginName || finalLoginName.trim().toLowerCase() === 'administrator') {
        finalLoginName = 'Administrator System';
      }
      positionOrSubject = 'Administrator Sistem';
    }

    const deterministicId = `login-${user.role}-${finalLoginName.replace(/\s+/g, '-').toLowerCase()}`;
    const initialActivity =
      user.role === 'siswa'
        ? 'Baru Saja Login'
        : user.role === 'guru'
        ? 'Masuk ke Ruang Guru'
        : 'Masuk ke Dasbor Admin';
    const initialDetails =
      user.role === 'siswa'
        ? 'Belum Mengerjakan Ujian/Game (Hanya Login)'
        : 'Monitoring Sistem CBT';
    currentUserActivityRef.current = { activity: initialActivity, details: initialDetails };

    const newLog: UserLoginLog = {
      id: deterministicId,
      userId: user.details?.id || user.username || finalLoginName,
      name: finalLoginName,
      role: user.role,
      identifier: identifier || user.username || '-',
      classRoom,
      positionOrSubject,
      loginTime: formattedTime,
      lastSeenTime: formattedTime,
      lastActiveTimestamp: Date.now(),
      currentActivity: initialActivity,
      activityDetails: initialDetails,
      status: 'online',
      photoUrl: user.photoUrl,
    };

    if (finalLoginName.trim().toLowerCase() !== 'administrator') {
      setLoginLogs((prev) => {
        const filtered = prev.filter(
          (l) =>
            !(l.name.toLowerCase() === finalLoginName.toLowerCase() && l.role === user.role) &&
            l.name.trim().toLowerCase() !== 'administrator'
        );
        const updated = [newLog, ...filtered];
        saveStoredLoginLogs(updated);
        broadcastAppDataChange({ loginLogs: updated });
        return updated;
      });

      trackUserLoginInFirestore(newLog, true);
    }

    const targetTab = user.role === 'siswa' ? 'mulai-ujian' : user.role === 'guru' ? 'bank-soal' : 'dashboard';
    setActiveTab(targetTab);
    replaceNavigationState({
      tab: targetTab,
      modal: null,
      drawer: false,
      exam: false,
    });
  };

  const handleLogout = () => {
    // 0. Update status to offline in Firestore before resetting local state
    if (currentUser) {
      const now = new Date();
      const formattedTime = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      let finalName = currentUser.name;
      if (currentUser.role === 'admin' && (!finalName || finalName.trim().toLowerCase() === 'administrator')) {
        finalName = 'Administrator System';
      }
      if (finalName.trim().toLowerCase() !== 'administrator') {
        const offlineLog: UserLoginLog = {
          id: `login-${currentUser.role}-${finalName.replace(/\s+/g, '-').toLowerCase()}`,
          userId: currentUser.details?.id || currentUser.username || finalName,
          name: finalName,
          role: currentUser.role,
          identifier: currentUser.username || '-',
          loginTime: formattedTime,
          lastSeenTime: formattedTime,
          lastActiveTimestamp: Date.now() - 3600000,
          currentActivity: 'Sudah Logout',
          activityDetails: 'Keluar dari aplikasi CBT',
          status: 'offline',
          photoUrl: currentUser.photoUrl,
        };
        trackUserLoginInFirestore(offlineLog, true);
      }
    }

    // 1. Reset user state & login flag
    setCurrentUser(null);
    setIsLoggedIn(false);

    // 2. Clear stored user session
    saveStoredCurrentUser(null);
    try {
      localStorage.removeItem('cbt_user_session');
      sessionStorage.removeItem('cbt_user_session');
      localStorage.removeItem('cbt_current_user');
      sessionStorage.removeItem('cbt_current_user');
    } catch {
      // ignore
    }

    // 3. Close mobile menu drawer if open
    setIsMobileMenuOpen(false);

    // 4. Return to main dashboard overview
    setActiveTab('dashboard');

    // 5. Open login modal / interface immediately to return to login menu
    setIsLoginModalOpen(true);
  };

  // Sync state changes with localStorage, BroadcastChannel & Firestore
  useEffect(() => {
    saveStoredTeachers(teachers);
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.teachers, teachers)) {
      lastSyncedDataRef.current.teachers = teachers;
      broadcastAppDataChange({ teachers });
      saveAppDataToFirestore({ teachers });
    }
  }, [teachers]);

  useEffect(() => {
    saveStoredStudents(students);
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.students, students)) {
      lastSyncedDataRef.current.students = students;
      broadcastAppDataChange({ students });
      saveAppDataToFirestore({ students });
    }
  }, [students]);

  useEffect(() => {
    saveStoredSubjects(subjects);
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.subjects, subjects)) {
      lastSyncedDataRef.current.subjects = subjects;
      broadcastAppDataChange({ subjects });
      saveAppDataToFirestore({ subjects });
    }
  }, [subjects]);

  useEffect(() => {
    saveStoredBanks(banks);
    if (
      hasFinishedInitialSyncRef.current &&
      (!lastSyncedDataRef.current?.banks || !isDeepEqual(lastSyncedDataRef.current.banks, banks))
    ) {
      if (lastSyncedDataRef.current) {
        lastSyncedDataRef.current.banks = banks;
      }
      broadcastAppDataChange({ banks });
      saveAppDataToFirestore({ banks });
    }
  }, [banks]);

  useEffect(() => {
    saveStoredResults(results);
  }, [results]);

  useEffect(() => {
    saveStoredGameLogs(gameLogs);
  }, [gameLogs]);

  useEffect(() => {
    saveStoredLoginLogs(loginLogs);
  }, [loginLogs]);

  useEffect(() => {
    saveStoredDailyGrades(dailyGrades);
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.dailyGrades, dailyGrades)) {
      lastSyncedDataRef.current.dailyGrades = dailyGrades;
      broadcastAppDataChange({ dailyGrades });
      saveAppDataToFirestore({ dailyGrades });
    }
  }, [dailyGrades]);

  useEffect(() => {
    saveStoredRolePermissions(rolePermissions);
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.rolePermissions, rolePermissions)) {
      lastSyncedDataRef.current.rolePermissions = rolePermissions;
      broadcastAppDataChange({ rolePermissions });
      saveAppDataToFirestore({ rolePermissions });
    }
  }, [rolePermissions]);

  useEffect(() => {
    saveStoredGameData(gameData);
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.gameData, gameData)) {
      lastSyncedDataRef.current.gameData = gameData;
      broadcastAppDataChange({ gameData });
      saveAppDataToFirestore({ gameData });
    }
  }, [gameData]);

  useEffect(() => {
    saveStoredSchoolProfile(schoolProfile);
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.schoolProfile, schoolProfile)) {
      lastSyncedDataRef.current.schoolProfile = schoolProfile;
      broadcastAppDataChange({ schoolProfile });
      saveAppDataToFirestore({ schoolProfile });
    }
  }, [schoolProfile]);

  const handleSaveGameLog = useCallback(
    (newLog: GameHistoryLog) => {
      setGameLogs((prev) => {
        const exists = prev.some((l) => l.id === newLog.id);
        if (exists) return prev;
        const updated = [newLog, ...prev];
        saveStoredGameLogs(updated);
        return updated;
      });
      syncGameLogToFirestore(newLog);

      updateUserActivity(
        `Selesai Bermain Game: ${newLog.gameTitle || newLog.gameType}`,
        `Skor: ${newLog.score} Poin (${newLog.subject || 'Game Edukasi'})`
      );
    },
    [updateUserActivity]
  );

  const handleClearGameLogs = useCallback(() => {
    setGameLogs([]);
    saveStoredGameLogs([]);
    clearAllGameLogsInFirestore();
  }, []);

  const handleDeleteGameLog = useCallback((id: string) => {
    setGameLogs((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveStoredGameLogs(updated);
      return updated;
    });
    deleteGameLogFromFirestore(id);
  }, []);

  const handleDeleteGameLogsBulk = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setGameLogs((prev) => {
      const updated = prev.filter((item) => !idSet.has(item.id));
      saveStoredGameLogs(updated);
      return updated;
    });
    deleteGameLogsBulkFromFirestore(ids);
  }, []);

  const handleRefreshGameLogs = useCallback(async (): Promise<boolean> => {
    const data = await fetchAppDataFromFirestore(true);
    if (data && Array.isArray(data.gameLogs)) {
      setGameLogs(data.gameLogs);
      saveStoredGameLogs(data.gameLogs);
      return true;
    }
    const stored = getStoredGameLogs();
    setGameLogs(stored);
    return true;
  }, []);

  const handleUpdateGameData = useCallback((newGameData: Record<string, any>) => {
    setGameData(newGameData);
    saveStoredGameData(newGameData);
    saveAppDataToFirestore({ gameData: newGameData });
  }, []);

  // Auto-open login modal if user is not logged in, or redirect guest if trying to view protected tab
  useEffect(() => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      if (activeTab !== 'dashboard' && activeTab !== 'profil-sekolah') {
        setActiveTab('dashboard');
      }
    } else if (currentUser.role === 'siswa' || currentUser.role === 'umum') {
      const allowed = currentUser.role === 'siswa'
        ? (rolePermissions?.siswa || ['profil-saya', 'ai-pembuat-game', 'bank-soal', 'mulai-ujian', 'riwayat-ujian'])
        : (rolePermissions?.umum || ['profil-saya', 'ai-pembuat-game', 'bank-soal']);

      if (!allowed.includes(activeTab)) {
        if (allowed.includes('profil-saya')) {
          setActiveTab('profil-saya');
        } else if (allowed.length > 0) {
          setActiveTab(allowed[0]);
        } else {
          setActiveTab('dashboard');
        }
      }
    }
  }, [currentUser, activeTab, rolePermissions]);

  // Handler when AI Generator, Manual Builder or Bank Editor saves Question Bank
  const handleSaveBank = (newBank: QuestionBank) => {
    const bankWithTime: QuestionBank = {
      ...newBank,
      updatedAt: newBank.updatedAt || new Date().toISOString(),
    };

    let updatedList: QuestionBank[] = [];
    setBanks((prev) => {
      const exists = prev.some((b) => String(b.id) === String(bankWithTime.id));
      const updated = exists
        ? prev.map((b) => (String(b.id) === String(bankWithTime.id) ? bankWithTime : b))
        : [bankWithTime, ...prev];
      updatedList = updated;
      saveStoredBanks(updated);
      lastLocalBankEditTimeRef.current = Date.now();
      if (lastSyncedDataRef.current) {
        lastSyncedDataRef.current.banks = updated;
      }
      return updated;
    });

    // Run async multi-target sync outside updater
    const payloadBanks = updatedList.length > 0 ? updatedList : [bankWithTime];
    broadcastAppDataChange({ banks: payloadBanks });
    saveAppDataToFirestore({ banks: payloadBanks });
    saveSingleBankToFirestore(bankWithTime).catch(() => {});
  };

  // Helper to map tab names to clean Indonesian activity descriptions
  const getTabActivityDescription = (tab: ActiveTab): { activity: string; details?: string } => {
    switch (tab) {
      case 'dashboard':
        return { activity: 'Melihat Dashboard & Statistik', details: 'Monitoring CBT & Keaktifan' };
      case 'mulai-ujian':
        return { activity: 'Melihat Daftar Sesi Ujian', details: 'Memilih Ujian yang Tersedia' };
      case 'riwayat-ujian':
        return { activity: 'Melihat Riwayat Hasil Ujian', details: 'Daftar Nilai & Evaluasi' };
      case 'ai-pembuat-game':
        return { activity: 'Bermain Game Edukasi', details: 'Arena Game Pembelajaran Interaktif' };
      case 'riwayat-game':
        return { activity: 'Melihat Riwayat Game Edukasi', details: 'Peringkat & Skor Game' };
      case 'nilai-harian':
        return { activity: 'Melihat & Input Nilai Harian', details: 'Buku Nilai Siswa' };
      case 'data-guru':
        return { activity: 'Mengelola Data Guru', details: 'Database Tenaga Pengajar' };
      case 'data-siswa':
        return { activity: 'Mengelola Data Siswa', details: 'Database Peserta Didik' };
      case 'mata-pelajaran':
        return { activity: 'Mengelola Mata Pelajaran', details: 'Daftar Kurikulum & Mapel' };
      case 'bank-soal':
        return { activity: 'Mengelola Bank Soal & Ujian', details: 'Editor Butir Soal CBT' };
      case 'pembuat-soal-ai':
        return { activity: 'Pembuat Soal Berbasis AI', details: 'Generator Soal Otomatis' };
      case 'ekstrak-dokumen':
        return { activity: 'Ekstrak Dokumen / Buat Soal AI', details: 'Import Dokumen Bank Soal' };
      case 'kumpulan-jawaban':
        return { activity: 'Melihat Kumpulan Lembar Jawaban', details: 'Koreksi & Verifikasi Jawaban' };
      case 'profil-saya':
        return { activity: 'Mengatur Profil Pengguna', details: 'Biodata & Foto Akun' };
      case 'profil-sekolah':
        return { activity: 'Mengatur Profil Sekolah', details: 'Identitas & Logo Satuan Pendidikan' };
      case 'hak-akses':
        return { activity: 'Mengatur Hak Akses Role', details: 'Izin Menu & Fitur' };
      case 'backup-data':
        return { activity: 'Kelola Backup & Restore', details: 'Cadangan Database Cloud' };
      case 'reset-data':
        return { activity: 'Reset / Bersihkan Data', details: 'Pemeliharaan Sistem' };
      default:
        return { activity: 'Sedang Aktif di Sistem', details: 'Mengakses Menu CBT' };
    }
  };

  // 1. Masukkan Setiap Perubahan Tampilan ke dalam History (pushState runtut)
  const handleNavigateTab = useCallback(
    (action: React.SetStateAction<ActiveTab>) => {
      setActiveTab((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        const currentState = getCurrentHistoryState();

        if (next !== prev || isMobileMenuOpen) {
          const nextStep = (currentState?.step || 0) + 1;
          pushNavigationState({
            tab: next,
            modal: null,
            drawer: false,
            exam: false,
            step: nextStep,
          });
        }

        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }

        const tabInfo = getTabActivityDescription(next);
        updateUserActivity(tabInfo.activity, tabInfo.details);

        return next;
      });
    },
    [isMobileMenuOpen, updateUserActivity]
  );

  const handleSetMobileMenuOpen = useCallback(
    (action: React.SetStateAction<boolean>) => {
      setIsMobileMenuOpen((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        const currentState = getCurrentHistoryState();

        if (next && !prev) {
          pushNavigationState({
            tab: activeTab,
            modal: 'mobile-menu-drawer',
            drawer: true,
            exam: false,
          });
        } else if (!next && prev) {
          if (currentState?.drawer || currentState?.modal === 'mobile-menu-drawer') {
            window.history.back();
          }
        }
        return next;
      });
    },
    [activeTab]
  );

  const handleOpenLoginModal = useCallback(() => {
    pushNavigationState({
      tab: activeTab,
      modal: 'login-modal',
      drawer: false,
      exam: false,
    });
    setIsLoginModalOpen(true);
  }, [activeTab]);

  const handleCloseLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    const currentState = getCurrentHistoryState();
    if (currentState?.modal === 'login-modal') {
      try {
        window.history.back();
      } catch {
        // ignore
      }
    }
  }, []);

  // Handler when student logs in to start exam with history state
  const handleStartExam = (studentName: string, classRoom: string, bank: QuestionBank, studentId?: string) => {
    pushNavigationState({
      tab: 'mulai-ujian',
      modal: 'active-exam',
      drawer: false,
      exam: true,
    });
    setActiveExam({ studentName, classRoom, bank, studentId });

    updateUserActivity(
      `Sedang Mengerjakan Ujian: ${bank.title || bank.subject}`,
      `Mapel: ${bank.subject} • Kelas ${classRoom} (${bank.questions?.length || 0} Soal)`
    );
  };

  // Handler when exam is completed
  const handleFinishExam = (result: ExamResult) => {
    setResults((prev) => {
      const updated = [result, ...prev];
      saveStoredResults(updated);
      return updated;
    });
    syncExamResultToFirestore(result);

    updateUserActivity(
      `Selesai Mengerjakan Ujian: ${result.examTitle || result.bankTitle || result.subject}`,
      `Nilai: ${result.score} (${result.correctCount ?? result.correctAnswers ?? 0}/${result.totalQuestions} Benar)`
    );
  };

  const handleExitExam = () => {
    const currentState = getCurrentHistoryState();
    if (currentState?.exam || currentState?.modal === 'active-exam') {
      window.history.back();
    }
    setActiveExam(null);
    updateUserActivity('Keluar dari Sesi Ujian', 'Membuka Riwayat Hasil Ujian');
    handleNavigateTab('riwayat-ujian');
  };

  // 2. Tangani Event popstate Secara Sinkron (Runtut & Presisi)
  useEffect(() => {
    const current = getCurrentHistoryState();
    if (!current || !current.tab) {
      replaceNavigationState({
        tab: activeTab,
        modal: isLoginModalOpen ? 'login-modal' : null,
        drawer: isMobileMenuOpen,
        exam: Boolean(activeExam),
        step: 0,
      });
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryStatePayload | null;
      if (state && state.tab) {
        // Pulihkan halaman/tab aktif secara runtut
        setActiveTab(state.tab);

        // Pulihkan status drawer mobile
        setIsMobileMenuOpen(Boolean(state.drawer));

        // Pulihkan modal login jika pengguna sudah login
        if (state.modal === 'login-modal') {
          setIsLoginModalOpen(true);
        } else if (!state.modal && isLoginModalOpen && currentUser) {
          setIsLoginModalOpen(false);
        }

        // Pulihkan sesi ujian jika navigasi kembali
        if (!state.exam && activeExam) {
          setActiveExam(null);
        }
      } else {
        // Jika kembali ke titik awal (root history)
        setActiveTab('dashboard');
        setIsMobileMenuOpen(false);
        if (currentUser) {
          setIsLoginModalOpen(false);
        }
        setActiveExam(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeExam, currentUser, isLoginModalOpen, isMobileMenuOpen, activeTab]);

  const handleUpdateSchoolProfile = (updated: SchoolProfile) => {
    saveStoredSchoolProfile(updated);
    setSchoolProfile(updated);
    syncWebFaviconAndLogo(updated.logoUrl, updated.name);
    saveAppDataToFirestore({ schoolProfile: updated });
    broadcastAppDataChange({ schoolProfile: updated });
  };

  // Handler for Restoring & Uploading Full System Backup Data
  const handleRestoreFullBackup = async (backup: FullBackupData, mode: 'replace' | 'merge') => {
    let nextTeachers: Teacher[];
    let nextStudents: Student[];
    let nextSubjects: Subject[];
    let nextBanks: QuestionBank[];
    let nextResults: ExamResult[];
    let nextDailyGrades: DailyGradeRecord[];
    let nextGameLogs: GameHistoryLog[];
    let nextGameData: Record<string, any>;
    let nextSchoolProfile: SchoolProfile;
    let nextRolePermissions: RolePermissions;

    if (mode === 'replace') {
      nextTeachers = backup.teachers || [];
      nextStudents = backup.students || [];
      nextSubjects = backup.subjects || [];
      nextBanks = backup.banks || [];
      nextResults = backup.results || [];
      nextDailyGrades = backup.dailyGrades || [];
      nextGameLogs = backup.gameLogs || [];
      nextGameData = backup.gameData || {};
      nextSchoolProfile = backup.schoolProfile || schoolProfile;
      nextRolePermissions = backup.rolePermissions || rolePermissions;
    } else {
      // Merge mode: combine by IDs without duplicates
      const teacherIds = new Set(teachers.map((t) => t.id));
      nextTeachers = [...teachers, ...(backup.teachers || []).filter((t) => !teacherIds.has(t.id))];

      const studentIds = new Set(students.map((s) => s.id));
      nextStudents = [...students, ...(backup.students || []).filter((s) => !studentIds.has(s.id))];

      const subjectIds = new Set(subjects.map((sub) => sub.id));
      nextSubjects = [...subjects, ...(backup.subjects || []).filter((sub) => !subjectIds.has(sub.id))];

      const bankIds = new Set(banks.map((b) => b.id));
      nextBanks = [...banks, ...(backup.banks || []).filter((b) => !bankIds.has(b.id))];

      const resultIds = new Set(results.map((r) => r.id));
      nextResults = [...results, ...(backup.results || []).filter((r) => !resultIds.has(r.id))];

      const gradeIds = new Set(dailyGrades.map((g) => g.id));
      nextDailyGrades = [...dailyGrades, ...(backup.dailyGrades || []).filter((g) => !gradeIds.has(g.id))];

      const gameLogIds = new Set(gameLogs.map((l) => l.id));
      nextGameLogs = [...gameLogs, ...(backup.gameLogs || []).filter((l) => !gameLogIds.has(l.id))];

      nextGameData = { ...gameData, ...(backup.gameData || {}) };
      nextSchoolProfile = backup.schoolProfile || schoolProfile;
      nextRolePermissions = backup.rolePermissions || rolePermissions;
    }

    // If there were any restored banks, clear their IDs from deletion guard
    if (nextBanks.length > 0) {
      clearLocallyDeletedBankIds(nextBanks.map((b) => b.id));
    }

    // 1. Update React States
    setTeachers(nextTeachers);
    setStudents(nextStudents);
    setSubjects(nextSubjects);
    setBanks(nextBanks);
    setResults(nextResults);
    setDailyGrades(nextDailyGrades);
    setGameLogs(nextGameLogs);
    setGameData(nextGameData);
    if (backup.schoolProfile) {
      setSchoolProfile(nextSchoolProfile);
      syncWebFaviconAndLogo(nextSchoolProfile.logoUrl, nextSchoolProfile.name);
    }
    if (backup.rolePermissions) setRolePermissions(nextRolePermissions);

    // 2. Persist to localStorage
    saveStoredTeachers(nextTeachers);
    saveStoredStudents(nextStudents);
    saveStoredSubjects(nextSubjects);
    saveStoredBanks(nextBanks);
    saveStoredResults(nextResults);
    saveStoredDailyGrades(nextDailyGrades);
    saveStoredGameLogs(nextGameLogs);
    saveStoredGameData(nextGameData);
    if (backup.schoolProfile) saveStoredSchoolProfile(nextSchoolProfile);
    if (backup.rolePermissions) saveStoredRolePermissions(nextRolePermissions);

    // 3. Update sync tracking ref
    if (lastSyncedDataRef.current) {
      lastSyncedDataRef.current = {
        ...lastSyncedDataRef.current,
        teachers: nextTeachers,
        students: nextStudents,
        subjects: nextSubjects,
        banks: nextBanks,
        results: nextResults,
        dailyGrades: nextDailyGrades,
        gameLogs: nextGameLogs,
        gameData: nextGameData,
        schoolProfile: nextSchoolProfile,
        rolePermissions: nextRolePermissions,
        updatedAt: new Date().toISOString(),
      };
    }

    // 4. Broadcast to other tabs & windows
    broadcastAppDataChange({
      teachers: nextTeachers,
      students: nextStudents,
      subjects: nextSubjects,
      banks: nextBanks,
      results: nextResults,
      dailyGrades: nextDailyGrades,
      gameLogs: nextGameLogs,
      gameData: nextGameData,
      schoolProfile: nextSchoolProfile,
      rolePermissions: nextRolePermissions,
    });

    // 5. Restore into Firebase Cloud Firestore
    await restoreAllDataInFirestore(
      {
        teachers: nextTeachers,
        students: nextStudents,
        subjects: nextSubjects,
        banks: nextBanks,
        results: nextResults,
        dailyGrades: nextDailyGrades,
        gameLogs: nextGameLogs,
        gameData: nextGameData,
        schoolProfile: nextSchoolProfile,
        rolePermissions: nextRolePermissions,
      },
      mode
    );
  };

  const handleResetAllData = async () => {
    clearAllStoredData();
    setTeachers([]);
    setStudents([]);
    setSubjects([]);
    setBanks([]);
    setResults([]);
    setGameLogs([]);
    setLoginLogs([]);
    setDailyGrades([]);
    setGameData({});
    await resetAllDataInFirestore();
  };

  // If in Focus Exam Mode, render ONLY ExamScreen (No Sidebar, No Header)
  if (activeExam) {
    return (
      <ExamScreen
        studentName={activeExam.studentName}
        classRoom={activeExam.classRoom}
        bank={activeExam.bank}
        studentId={activeExam.studentId}
        onFinishExam={handleFinishExam}
        onExitExam={handleExitExam}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] font-sans text-slate-100 antialiased overflow-hidden">
      {/* Sidebar / Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={handleSetMobileMenuOpen}
        currentUser={currentUser}
        onOpenLoginModal={handleOpenLoginModal}
        onLogout={handleLogout}
        rolePermissions={rolePermissions}
        schoolProfile={schoolProfile}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={handleNavigateTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={handleSetMobileMenuOpen}
          currentUser={currentUser}
          onOpenLoginModal={handleOpenLoginModal}
          onLogout={handleLogout}
          schoolProfile={schoolProfile}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              teachers={teachers}
              students={students}
              subjects={subjects}
              banks={banks}
              results={results}
              gameLogs={gameLogs}
              loginLogs={loginLogs}
              setActiveTab={handleNavigateTab}
              currentUser={currentUser}
              onOpenLoginModal={handleOpenLoginModal}
            />
          )}

          {activeTab === 'profil-saya' && (
            <ProfilSayaView
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              teachers={teachers}
              setTeachers={setTeachers}
              students={students}
              setStudents={setStudents}
              onOpenLoginModal={handleOpenLoginModal}
              onLogout={handleLogout}
            />
          )}

          {activeTab === 'profil-sekolah' && (
            <ProfilSekolahView
              currentUser={currentUser}
              teachers={teachers}
              students={students}
              subjects={subjects}
              schoolProfile={schoolProfile}
              onUpdateSchoolProfile={handleUpdateSchoolProfile}
            />
          )}

          {activeTab === 'data-guru' && (
            <TeacherDataView teachers={teachers} setTeachers={setTeachers} loginLogs={loginLogs} />
          )}

          {activeTab === 'data-siswa' && (
            <StudentDataView students={students} setStudents={setStudents} loginLogs={loginLogs} />
          )}

          {activeTab === 'mata-pelajaran' && (
            <SubjectView subjects={subjects} setSubjects={setSubjects} />
          )}

          {activeTab === 'nilai-harian' && (
            <NilaiHarianView
              students={students}
              subjects={subjects}
              dailyGrades={dailyGrades}
              setDailyGrades={setDailyGrades}
              currentUser={currentUser}
              schoolName={schoolProfile?.name}
            />
          )}

          {activeTab === 'pembuat-soal-ai' && (
            <AiQuestionGeneratorView
              onSaveBank={handleSaveBank}
              setActiveTab={handleNavigateTab}
              currentUser={currentUser}
              teachers={teachers}
              subjects={subjects}
              students={students}
              banks={banks}
            />
          )}

          {activeTab === 'ai-pembuat-game' && (
            <AiGameGeneratorView
              currentUser={currentUser}
              subjects={subjects}
              banks={banks}
              setBanks={setBanks}
              onSaveGameLog={handleSaveGameLog}
              gameData={gameData}
              onUpdateGameData={handleUpdateGameData}
            />
          )}

          {activeTab === 'riwayat-game' && (
            <GameHistoryView
              gameLogs={gameLogs}
              setGameLogs={setGameLogs}
              currentUser={currentUser}
              onClearLogs={handleClearGameLogs}
              onDeleteLog={handleDeleteGameLog}
              onDeleteLogsBulk={handleDeleteGameLogsBulk}
              onRefresh={handleRefreshGameLogs}
            />
          )}

          {activeTab === 'ekstrak-dokumen' && (
            <EkstrakDokumenView
              onSaveBank={handleSaveBank}
              setActiveTab={handleNavigateTab}
              teachers={teachers}
              subjects={subjects}
              students={students}
              banks={banks}
            />
          )}

          {activeTab === 'bank-soal' && (
            <BankSoalView
              banks={banks}
              setBanks={setBanks}
              onSaveBank={handleSaveBank}
              setActiveTab={handleNavigateTab}
              subjects={subjects}
            />
          )}

          {activeTab === 'kumpulan-jawaban' && <KumpulanJawabanView banks={banks} />}

          {activeTab === 'mulai-ujian' && (
            <MulaiUjianView
              banks={banks}
              students={students}
              subjects={subjects}
              currentUser={currentUser}
              onStartExam={handleStartExam}
              onUpdateBanks={(updatedBanks) => {
                setBanks(updatedBanks);
                saveStoredBanks(updatedBanks);
              }}
            />
          )}

          {activeTab === 'riwayat-ujian' && (
            <ExamHistoryView
              results={results}
              setResults={setResults}
              banks={banks}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'hak-akses' && (
            <HakAksesView
              rolePermissions={rolePermissions}
              setRolePermissions={setRolePermissions}
              currentUser={currentUser}
              onOpenLoginModal={handleOpenLoginModal}
            />
          )}

          {activeTab === 'backup-data' && (
            <BackupUploadDataView
              teachers={teachers}
              students={students}
              subjects={subjects}
              banks={banks}
              results={results}
              dailyGrades={dailyGrades}
              gameLogs={gameLogs}
              gameData={gameData}
              schoolProfile={schoolProfile}
              rolePermissions={rolePermissions}
              onRestoreData={handleRestoreFullBackup}
              setActiveTab={handleNavigateTab}
            />
          )}

          {activeTab === 'reset-data' && (
            <ResetDataView
              teachers={teachers}
              students={students}
              subjects={subjects}
              banks={banks}
              results={results}
              onResetAllData={handleResetAllData}
              setActiveTab={handleNavigateTab}
            />
          )}
        </main>

        {/* Modal Login System */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={handleCloseLoginModal}
          teachers={teachers}
          students={students}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          schoolProfile={schoolProfile}
        />
      </div>
    </div>
  );
}
