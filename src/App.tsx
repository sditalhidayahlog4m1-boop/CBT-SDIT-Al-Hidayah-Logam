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
import { UploadSoalView } from './components/UploadSoalView';
import { BankSoalView } from './components/BankSoalView';
import { KumpulanJawabanView } from './components/KumpulanJawabanView';
import { MulaiUjianView } from './components/MulaiUjianView';
import { ExamScreen } from './components/ExamScreen';
import { ExamHistoryView } from './components/ExamHistoryView';
import { GameHistoryView } from './components/GameHistoryView';
import { HakAksesView } from './components/HakAksesView';
import { ResetDataView } from './components/ResetDataView';

import {
  fetchAppDataFromFirestore,
  saveAppDataToFirestore,
  resetAllDataInFirestore,
  subscribeToAppData,
  trackUserLoginInFirestore,
  syncExamResultToFirestore,
  syncGameLogToFirestore,
  deleteGameLogFromFirestore,
  clearAllGameLogsInFirestore,
  AppData,
} from './utils/firebaseSync';
import { subscribeToLocalSync, broadcastAppDataChange } from './utils/syncEngine';
import { isDeepEqual } from './utils/deepEqual';
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
  } | null>(null);

  // Track last synced data from Firestore to prevent unnecessary write loops
  const lastSyncedDataRef = useRef<AppData | null>(null);
  const hasFinishedInitialSyncRef = useRef(false);

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
    if (Array.isArray(data.banks) && !isDeepEqual(banksRef.current, data.banks)) {
      setBanks(data.banks);
      saveStoredBanks(data.banks);
      lastSyncedDataRef.current.banks = data.banks;
    }
    if (Array.isArray(data.results) && !isDeepEqual(resultsRef.current, data.results)) {
      setResults(data.results);
      saveStoredResults(data.results);
      lastSyncedDataRef.current.results = data.results;
    }
    if (Array.isArray(data.gameLogs) && !isDeepEqual(gameLogsRef.current, data.gameLogs)) {
      setGameLogs(data.gameLogs);
      saveStoredGameLogs(data.gameLogs);
      lastSyncedDataRef.current.gameLogs = data.gameLogs;
    }
    if (Array.isArray(data.loginLogs) && !isDeepEqual(loginLogsRef.current, data.loginLogs)) {
      setLoginLogs(data.loginLogs);
      saveStoredLoginLogs(data.loginLogs);
      lastSyncedDataRef.current.loginLogs = data.loginLogs;
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
        const remoteData = await fetchAppDataFromFirestore(true);
        if (remoteData) {
          applyRemoteData(remoteData, false);
        } else {
          // If Firestore is empty, seed it with current local baseline
          await saveAppDataToFirestore({
            teachers: teachersRef.current,
            students: studentsRef.current,
            subjects: subjectsRef.current,
            banks: banksRef.current,
            results: resultsRef.current,
            gameLogs: gameLogsRef.current,
            loginLogs: loginLogsRef.current,
            dailyGrades: dailyGradesRef.current,
            schoolProfile: schoolProfileRef.current,
            rolePermissions: rolePermissionsRef.current,
            gameData: gameDataRef.current,
            adminAccount: getStoredAdminAccount(),
          });
        }
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

    // Auto-refresh interval (polling fallback every 15s to keep monitoring perfectly updated)
    const pollInterval = setInterval(async () => {
      try {
        const freshData = await fetchAppDataFromFirestore(true);
        if (freshData) {
          applyRemoteData(freshData, false);
        }
      } catch (err) {
        // silent
      }
    }, 15000);

    return () => {
      clearInterval(pollInterval);
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeLocal) unsubscribeLocal();
    };
  }, []);

  // Heartbeat Mechanism: Periodic active status ping for logged-in user (Guru, Siswa, Admin)
  useEffect(() => {
    if (!currentUser) return;

    const pingHeartbeat = () => {
      const now = new Date();
      const formattedTime = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      let identifier = currentUser.username || '';
      let classRoom: string | undefined = undefined;
      let positionOrSubject: string | undefined = undefined;

      if (currentUser.role === 'siswa' && currentUser.details && 'nisn' in currentUser.details) {
        identifier = currentUser.details.nisn || currentUser.details.nis || currentUser.username || '';
        classRoom = currentUser.details.classRoom;
      } else if (currentUser.role === 'guru' && currentUser.details && 'nip' in currentUser.details) {
        identifier = currentUser.details.nip || currentUser.details.nuptk || currentUser.username || '';
        positionOrSubject = `${currentUser.details.position || 'Guru'}${currentUser.details.subject ? ` (${currentUser.details.subject})` : ''}`;
      } else if (currentUser.role === 'admin') {
        positionOrSubject = 'Administrator Sistem';
      }

      const updatedLog: UserLoginLog = {
        id: `login-${currentUser.role}-${currentUser.name.replace(/\s+/g, '-').toLowerCase()}`,
        userId: currentUser.details?.id || currentUser.username || currentUser.name,
        name: currentUser.name,
        role: currentUser.role,
        identifier: identifier || currentUser.username || '-',
        classRoom,
        positionOrSubject,
        loginTime: formattedTime,
        lastSeenTime: formattedTime,
        photoUrl: currentUser.photoUrl,
      };

      setLoginLogs((prev) => {
        const filtered = prev.filter(
          (l) => !(l.name.toLowerCase() === currentUser.name.toLowerCase() && l.role === currentUser.role)
        );
        const nextLogs = [updatedLog, ...filtered];
        saveStoredLoginLogs(nextLogs);
        return nextLogs;
      });

      trackUserLoginInFirestore(updatedLog);
    };

    // Initial heartbeat on mount
    pingHeartbeat();

    // Heartbeat every 45 seconds while session is active
    const heartbeatTimer = setInterval(pingHeartbeat, 45000);
    return () => clearInterval(heartbeatTimer);
  }, [currentUser]);

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
      const inputUsername = userOrUsername.trim().toLowerCase();
      const inputPassword = typeof passwordOrRememberMe === 'string' ? passwordOrRememberMe.trim() : '';
      shouldRemember = typeof rememberMe === 'boolean' ? rememberMe : true;

      // 1. Cek Akun Admin
      const storedAdmin = getStoredAdminAccount();
      const isAdminMatch =
        inputUsername === storedAdmin.username.trim().toLowerCase() ||
        inputUsername === 'admin';
      const isPassAdminMatch =
        inputPassword === storedAdmin.password.trim() ||
        inputPassword.toLowerCase() === storedAdmin.password.trim().toLowerCase() ||
        (storedAdmin.password.trim() === 'admin' && (inputPassword === 'admin' || inputPassword === 'admin123'));

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

      // 2. Cek Array Guru (Teachers)
      if (!user) {
        const foundTeacher = teachers.find((t) => {
          const tName = t.name.trim().toLowerCase();
          const tUser = (t.username || '').trim().toLowerCase();
          const tNip = (t.nip || '').trim();
          return tName === inputUsername || tUser === inputUsername || tNip === inputUsername;
        });

        if (foundTeacher) {
          user = {
            role: 'guru',
            name: foundTeacher.name,
            username: foundTeacher.username || foundTeacher.name.toLowerCase().replace(/\s+/g, ''),
            password: foundTeacher.password || foundTeacher.birthDate,
            photoUrl: foundTeacher.photoUrl,
            birthDate: foundTeacher.birthDate,
            details: foundTeacher,
          };
        }
      }

      // 3. Cek Array Siswa (Students)
      if (!user) {
        const foundStudent = students.find((s) => {
          const sName = s.name.trim().toLowerCase();
          const sUser = (s.username || '').trim().toLowerCase();
          const sNis = (s.nis || '').trim();
          const sNisn = (s.nisn || '').trim();
          return sName === inputUsername || sUser === inputUsername || sNis === inputUsername || sNisn === inputUsername;
        });

        if (foundStudent) {
          user = {
            role: 'siswa',
            name: foundStudent.name,
            username: foundStudent.username || foundStudent.name.toLowerCase().replace(/\s+/g, ''),
            password: foundStudent.password || foundStudent.birthDate,
            photoUrl: foundStudent.photoUrl,
            birthDate: foundStudent.birthDate,
            details: foundStudent,
          };
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
      setTeachers((prev) =>
        prev.map((t) => {
          const isMatch =
            (user.details && 'id' in user.details && t.id === user.details.id) ||
            t.name.trim().toLowerCase() === user.name.trim().toLowerCase() ||
            (t.username && t.username.trim().toLowerCase() === (user.username || '').trim().toLowerCase()) ||
            (t.nip && t.nip === identifier);
          return isMatch ? { ...t, lastLogin: formattedTime } : t;
        })
      );
    } else if (user.role === 'siswa') {
      setStudents((prev) =>
        prev.map((s) => {
          const isMatch =
            (user.details && 'id' in user.details && s.id === user.details.id) ||
            s.name.trim().toLowerCase() === user.name.trim().toLowerCase() ||
            (s.username && s.username.trim().toLowerCase() === (user.username || '').trim().toLowerCase()) ||
            (s.nisn && s.nisn === identifier) ||
            (s.nis && s.nis === identifier);
          return isMatch ? { ...s, lastLogin: formattedTime } : s;
        })
      );
    }

    const newLog: UserLoginLog = {
      id: `login-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.details?.id || user.username || user.name,
      name: user.name,
      role: user.role,
      identifier: identifier || user.username || '-',
      classRoom,
      positionOrSubject,
      loginTime: formattedTime,
      lastSeenTime: formattedTime,
      photoUrl: user.photoUrl,
    };

    setLoginLogs((prev) => {
      const filtered = prev.filter(
        (l) => !(l.name.toLowerCase() === user.name.toLowerCase() && l.role === user.role)
      );
      const updated = [newLog, ...filtered];
      saveStoredLoginLogs(updated);
      return updated;
    });

    trackUserLoginInFirestore(newLog);

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
    if (hasFinishedInitialSyncRef.current && !isDeepEqual(lastSyncedDataRef.current.banks, banks)) {
      lastSyncedDataRef.current.banks = banks;
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

  const handleSaveGameLog = useCallback((newLog: GameHistoryLog) => {
    setGameLogs((prev) => {
      const exists = prev.some((l) => l.id === newLog.id);
      if (exists) return prev;
      const updated = [newLog, ...prev];
      saveStoredGameLogs(updated);
      return updated;
    });
    syncGameLogToFirestore(newLog);
  }, []);

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

  // Handler when AI Generator or Upload saves new Question Bank
  const handleSaveBank = (newBank: QuestionBank) => {
    setBanks((prev) => {
      const filtered = prev.filter((b) => b.id !== newBank.id);
      const updated = [newBank, ...filtered];
      saveStoredBanks(updated);
      saveAppDataToFirestore({ banks: updated });
      return updated;
    });
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
        return next;
      });
    },
    [isMobileMenuOpen]
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
  const handleStartExam = (studentName: string, classRoom: string, bank: QuestionBank) => {
    pushNavigationState({
      tab: 'mulai-ujian',
      modal: 'active-exam',
      drawer: false,
      exam: true,
    });
    setActiveExam({ studentName, classRoom, bank });
  };

  // Handler when exam is completed
  const handleFinishExam = (result: ExamResult) => {
    setResults((prev) => {
      const updated = [result, ...prev];
      saveStoredResults(updated);
      return updated;
    });
    syncExamResultToFirestore(result);
  };

  const handleExitExam = () => {
    const currentState = getCurrentHistoryState();
    if (currentState?.exam || currentState?.modal === 'active-exam') {
      window.history.back();
    }
    setActiveExam(null);
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

          {activeTab === 'upload-soal' && (
            <UploadSoalView
              onSaveBank={handleSaveBank}
              setActiveTab={handleNavigateTab}
              teachers={teachers}
              subjects={subjects}
              students={students}
              banks={banks}
            />
          )}

          {activeTab === 'bank-soal' && (
            <BankSoalView banks={banks} setBanks={setBanks} setActiveTab={handleNavigateTab} />
          )}

          {activeTab === 'kumpulan-jawaban' && <KumpulanJawabanView banks={banks} />}

          {activeTab === 'mulai-ujian' && (
            <MulaiUjianView
              banks={banks}
              students={students}
              subjects={subjects}
              currentUser={currentUser}
              onStartExam={handleStartExam}
            />
          )}

          {activeTab === 'riwayat-ujian' && (
            <ExamHistoryView results={results} setResults={setResults} banks={banks} />
          )}

          {activeTab === 'hak-akses' && (
            <HakAksesView
              rolePermissions={rolePermissions}
              setRolePermissions={setRolePermissions}
              currentUser={currentUser}
              onOpenLoginModal={handleOpenLoginModal}
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
