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
import { MobileBottomNav } from './components/MobileBottomNav';
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
  AppData,
} from './utils/firebaseSync';
import { subscribeToLocalSync, broadcastAppDataChange } from './utils/syncEngine';
import { isDeepEqual } from './utils/deepEqual';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredCurrentUser);
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

  // Synchronize Favicon and Document Title with School Profile & Custom Logo
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

    if (schoolProfile?.logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = schoolProfile.logoUrl;
    }
  }, [schoolProfile]);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    saveStoredCurrentUser(user);
    setIsMobileMenuOpen(false);

    // Record login event in loginLogs
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

    if (user.role === 'siswa' || user.role === 'umum') {
      setActiveTab('profil-saya');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveStoredCurrentUser(null);
  };

  // Sync state changes with localStorage, BroadcastChannel & Firestore
  useEffect(() => {
    saveStoredTeachers(teachers);
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ teachers });
    }
  }, [teachers]);

  useEffect(() => {
    saveStoredStudents(students);
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ students });
    }
  }, [students]);

  useEffect(() => {
    saveStoredSubjects(subjects);
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ subjects });
    }
  }, [subjects]);

  useEffect(() => {
    saveStoredBanks(banks);
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ banks });
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
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ dailyGrades });
      saveAppDataToFirestore({ dailyGrades });
    }
  }, [dailyGrades]);

  useEffect(() => {
    saveStoredRolePermissions(rolePermissions);
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ rolePermissions });
    }
  }, [rolePermissions]);

  useEffect(() => {
    saveStoredGameData(gameData);
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ gameData });
    }
  }, [gameData]);

  useEffect(() => {
    saveStoredSchoolProfile(schoolProfile);
    if (hasFinishedInitialSyncRef.current) {
      broadcastAppDataChange({ schoolProfile });
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
    saveAppDataToFirestore({ gameLogs: [] });
  }, []);

  const handleDeleteGameLog = useCallback((id: string) => {
    setGameLogs((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveStoredGameLogs(updated);
      saveAppDataToFirestore({ gameLogs: updated });
      return updated;
    });
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

  // Handler when student logs in to start exam
  const handleStartExam = (studentName: string, classRoom: string, bank: QuestionBank) => {
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
    setActiveExam(null);
    setActiveTab('riwayat-ujian');
  };

  const handleUpdateSchoolProfile = (updated: SchoolProfile) => {
    saveStoredSchoolProfile(updated);
    setSchoolProfile(updated);
    saveAppDataToFirestore({ schoolProfile: updated });
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
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        rolePermissions={rolePermissions}
        schoolProfile={schoolProfile}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          schoolProfile={schoolProfile}
        />

        {/* Content Area with Mobile Bottom Nav Padding */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              teachers={teachers}
              students={students}
              subjects={subjects}
              banks={banks}
              results={results}
              gameLogs={gameLogs}
              loginLogs={loginLogs}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
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
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
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
            <TeacherDataView teachers={teachers} setTeachers={setTeachers} />
          )}

          {activeTab === 'data-siswa' && (
            <StudentDataView students={students} setStudents={setStudents} />
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
              setActiveTab={setActiveTab}
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
              setActiveTab={setActiveTab}
              teachers={teachers}
              subjects={subjects}
              students={students}
              banks={banks}
            />
          )}

          {activeTab === 'upload-soal' && (
            <UploadSoalView
              onSaveBank={handleSaveBank}
              setActiveTab={setActiveTab}
              teachers={teachers}
              subjects={subjects}
              students={students}
              banks={banks}
            />
          )}

          {activeTab === 'bank-soal' && (
            <BankSoalView banks={banks} setBanks={setBanks} setActiveTab={setActiveTab} />
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
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
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
              setActiveTab={setActiveTab}
            />
          )}
        </main>

        {/* Modal Login System */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          teachers={teachers}
          students={students}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          schoolProfile={schoolProfile}
        />

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
          currentUser={currentUser}
          rolePermissions={rolePermissions}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />
      </div>
    </div>
  );
}
