import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  Database,
  FileCheck,
  UserCheck,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  LogIn,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  RefreshCw,
  Activity,
  Gamepad2,
  Radio,
  FileText,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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
} from '../types';
import { formatExamDisplayDate, getExamResultTimestamp } from '../utils/dateUtils';

interface DashboardViewProps {
  teachers: Teacher[];
  students: Student[];
  subjects: Subject[];
  banks: QuestionBank[];
  results: ExamResult[];
  gameLogs?: GameHistoryLog[];
  loginLogs?: UserLoginLog[];
  setActiveTab: (tab: ActiveTab) => void;
  currentUser?: AuthUser | null;
  onOpenLoginModal?: () => void;
}

interface UserAccountStatus {
  id: string;
  name: string;
  role: 'guru' | 'siswa' | 'admin' | 'umum';
  identifier: string;
  classRoom?: string;
  positionOrSubject?: string;
  photoUrl?: string;
  gender?: string;
  isLoggedIn: boolean;
  isOnline: boolean;
  isIdle: boolean;
  lastLoginTime?: string;
  lastActiveTimestamp?: number;
  relativeTime: string;
  currentActivity: string;
  activityDetails?: string;
  examCount: number;
  gameCount: number;
  latestScore?: number;
  isCurrentSessionUser?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  teachers,
  students,
  subjects,
  banks,
  results,
  gameLogs = [],
  loginLogs = [],
  setActiveTab,
  currentUser,
  onOpenLoginModal,
}) => {
  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'guru' | 'siswa' | 'admin'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'online' | 'logged' | 'ujian' | 'just_logged' | 'not_logged'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const pageSizeOptions = [5, 10, 15, 20, 25, 30, 100, 200, 300, 400, 500];

  // Live real-time ticker that re-renders relative timestamps smoothly every second
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTabClick = (targetTab: ActiveTab) => {
    if (!currentUser && targetTab !== 'dashboard' && targetTab !== 'profil-sekolah') {
      if (onOpenLoginModal) {
        onOpenLoginModal();
      }
      return;
    }
    setActiveTab(targetTab);
  };

  const totalGuru = teachers.length;
  const totalSiswa = students.length;
  const totalMapel = subjects.length;
  const totalBankSoal = banks.length;
  const totalUjian = results.length;
  const totalPeserta = new Set(results.map((r) => r.studentName)).size;

  // Calculate pass percentage
  const totalLulus = results.filter((r) => r.passed).length;
  const passPercentage = totalUjian > 0 ? Math.round((totalLulus / totalUjian) * 100) : 0;

  // Chart data for score distribution
  const chartScoreData = [
    { range: '90 - 100 (Sangat Baik)', count: results.filter((r) => r.score >= 90).length },
    { range: '75 - 89 (Baik)', count: results.filter((r) => r.score >= 75 && r.score < 90).length },
    { range: '60 - 74 (Cukup)', count: results.filter((r) => r.score >= 60 && r.score < 75).length },
    { range: '< 60 (Perlu Remedial)', count: results.filter((r) => r.score < 60).length },
  ];

  // Most recent completed exams sorted chronologically descending (newest first)
  const recentResults = useMemo(() => {
    return [...results]
      .sort((a, b) => {
        const timeB = getExamResultTimestamp(b);
        const timeA = getExamResultTimestamp(a);
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [results]);

  // Pie chart data for pass vs fail
  const pieData =
    totalUjian > 0
      ? [
          { name: 'Lulus Ujian', value: totalLulus, color: '#10b981' },
          { name: 'Belum Lulus', value: Math.max(0, totalUjian - totalLulus), color: '#ef4444' },
        ]
      : [{ name: 'Belum Ada Ujian', value: 1, color: '#334155' }];

  const stats = [
    {
      title: 'Jumlah Guru',
      value: totalGuru,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      tab: 'data-guru' as ActiveTab,
    },
    {
      title: 'Jumlah Siswa',
      value: totalSiswa,
      icon: GraduationCap,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      tab: 'data-siswa' as ActiveTab,
    },
    {
      title: 'Mata Pelajaran',
      value: totalMapel,
      icon: BookOpen,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      tab: 'mata-pelajaran' as ActiveTab,
    },
    {
      title: 'Jumlah Bank Soal',
      value: totalBankSoal,
      icon: Database,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      tab: 'bank-soal' as ActiveTab,
    },
    {
      title: 'Jumlah Ujian Selesai',
      value: totalUjian,
      icon: FileCheck,
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      tab: 'riwayat-ujian' as ActiveTab,
    },
    {
      title: 'Siswa Peserta Ujian',
      value: totalPeserta,
      icon: UserCheck,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      tab: 'riwayat-ujian' as ActiveTab,
    },
  ];

  // Distinct classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.classRoom) set.add(s.classRoom);
    });
    return Array.from(set).sort();
  }, [students]);

  // Helper to parse multiple timestamp formats into epoch milliseconds
  const parseTimestampMs = (timeStr?: string, explicitMs?: number): number | undefined => {
    if (typeof explicitMs === 'number' && explicitMs > 0) return explicitMs;
    if (!timeStr || timeStr.trim() === '' || timeStr.trim() === '-') return undefined;

    // Format: "DD/MM/YYYY HH:mm:ss" or "DD/MM/YYYY HH:mm"
    const match = timeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      const [, d, m, y, h, min, s] = match;
      const date = new Date(Number(y), Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
      const time = date.getTime();
      if (!isNaN(time)) return time;
    }
    const isoTime = Date.parse(timeStr);
    if (!isNaN(isoTime)) return isoTime;
    return undefined;
  };

  // Helper to format live real-time relative string
  const getLiveRelativeTime = (now: number, timestampMs?: number, originalStr?: string, isCurrent?: boolean): string => {
    if (isCurrent) {
      return 'Online (Sesi Ini)';
    }
    if (!timestampMs) {
      if (originalStr && originalStr.trim() && originalStr !== '-') return originalStr;
      return 'Belum Pernah';
    }
    const diffSec = Math.floor((now - timestampMs) / 1000);
    if (diffSec < 0 || diffSec <= 15) {
      return 'Baru saja (Real-time)';
    }
    if (diffSec < 60) {
      return `${diffSec} dtk lalu`;
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin} mnt lalu`;
    }
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return `${diffHour} jam lalu`;
    }
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) {
      return `${diffDay} hr lalu`;
    }
    return originalStr || `${diffDay} hr lalu`;
  };

  // Build Comprehensive User Login Status List with Real-Time Activity Tracking
  const userAccountList = useMemo<UserAccountStatus[]>(() => {
    const list: UserAccountStatus[] = [];
    const processedKeys = new Set<string>();

    // 1. Process Teachers
    teachers.forEach((t) => {
      const teacherNameLower = t.name.trim().toLowerCase();
      const teacherNip = t.nip?.trim();
      const teacherNuptk = t.nuptk?.trim();
      const teacherUsername = t.username?.trim().toLowerCase();

      const matchLog = loginLogs.find((l) => {
        if (!l || !l.name) return false;
        const logNameLower = l.name.trim().toLowerCase();
        const logIdentifier = l.identifier ? l.identifier.trim() : '';
        const logUserId = l.userId ? String(l.userId).trim() : '';

        return (
          logNameLower === teacherNameLower ||
          (teacherNip && logIdentifier === teacherNip) ||
          (teacherNuptk && logIdentifier === teacherNuptk) ||
          (teacherUsername && (logIdentifier.toLowerCase() === teacherUsername || logNameLower === teacherUsername)) ||
          (logUserId && (logUserId === t.id || (teacherNip && logUserId === teacherNip)))
        );
      });

      const isCurrent = currentUser?.role === 'guru' && (
        currentUser.name.trim().toLowerCase() === teacherNameLower ||
        (teacherUsername && currentUser.username?.toLowerCase() === teacherUsername) ||
        (teacherNip && (currentUser.username === teacherNip || currentUser.details?.nip === teacherNip))
      );

      const teacherDirectLastLogin = t.lastLogin?.trim();
      const isLoggedIn = Boolean(
        matchLog ||
        isCurrent ||
        (teacherDirectLastLogin && teacherDirectLastLogin !== '-')
      );

      let lastLoginTime: string | undefined = undefined;
      if (isCurrent) {
        lastLoginTime = 'Sedang Aktif';
      } else if (matchLog?.lastSeenTime || matchLog?.loginTime) {
        lastLoginTime = matchLog.lastSeenTime || matchLog.loginTime;
      } else if (teacherDirectLastLogin && teacherDirectLastLogin !== '-') {
        lastLoginTime = teacherDirectLastLogin;
      }

      const timestampMs = parseTimestampMs(
        matchLog?.lastSeenTime || matchLog?.loginTime || teacherDirectLastLogin,
        matchLog?.lastActiveTimestamp
      );
      const isOnline = isCurrent || Boolean(timestampMs && (nowMs - timestampMs) <= 120000 && matchLog?.status !== 'offline');
      const isIdle = !isOnline && Boolean(timestampMs && (nowMs - timestampMs) <= 600000 && matchLog?.status !== 'offline');
      const relativeTime = getLiveRelativeTime(
        nowMs,
        timestampMs,
        matchLog?.lastSeenTime || matchLog?.loginTime || teacherDirectLastLogin,
        isCurrent
      );

      let currentActivity = 'Belum Pernah Masuk';
      let activityDetails = 'Belum ada riwayat aktivitas';

      if (matchLog?.currentActivity) {
        currentActivity = matchLog.currentActivity;
        activityDetails = matchLog.activityDetails || (isCurrent ? 'Aktif Sekarang' : 'Guru SDIT Al Hidayah');
      } else if (isCurrent) {
        currentActivity = 'Melihat Dashboard & Statistik';
        activityDetails = 'Monitoring CBT & Keaktifan Siswa';
      } else if (isLoggedIn) {
        currentActivity = 'Aktif di Ruang Guru';
        activityDetails = t.subject ? `Guru Pengampu Mapel ${t.subject}` : 'Tenaga Pendidik';
      }

      const key = `guru-${teacherNameLower}`;
      processedKeys.add(key);

      list.push({
        id: t.id || `teacher-${t.name}`,
        name: t.name,
        role: 'guru',
        identifier: t.nip || t.nuptk || t.username || '-',
        positionOrSubject: `${t.position || 'Guru'}${t.subject ? ` (${t.subject})` : ''}`,
        photoUrl: t.photoUrl,
        gender: t.gender,
        isLoggedIn,
        isOnline,
        isIdle,
        lastLoginTime,
        lastActiveTimestamp: timestampMs,
        relativeTime,
        currentActivity,
        activityDetails,
        examCount: 0,
        gameCount: 0,
        isCurrentSessionUser: isCurrent,
      });
    });

    // 2. Process Students
    students.forEach((s) => {
      const studentNameLower = s.name.trim().toLowerCase();
      const studentNisn = s.nisn?.trim();
      const studentNis = s.nis?.trim();
      const studentUsername = s.username?.trim().toLowerCase();

      const matchLog = loginLogs.find((l) => {
        if (!l || !l.name) return false;
        const logNameLower = l.name.trim().toLowerCase();
        const logIdentifier = l.identifier ? l.identifier.trim() : '';
        const logUserId = l.userId ? String(l.userId).trim() : '';

        return (
          logNameLower === studentNameLower ||
          (studentNisn && logIdentifier === studentNisn) ||
          (studentNis && logIdentifier === studentNis) ||
          (studentUsername && (logIdentifier.toLowerCase() === studentUsername || logNameLower === studentUsername)) ||
          (logUserId && (logUserId === s.id || (studentNisn && logUserId === studentNisn) || (studentNis && logUserId === studentNis)))
        );
      });

      const isCurrent = currentUser?.role === 'siswa' && (
        currentUser.name.trim().toLowerCase() === studentNameLower ||
        (studentUsername && currentUser.username?.toLowerCase() === studentUsername) ||
        (studentNisn && (currentUser.username === studentNisn || currentUser.details?.nisn === studentNisn))
      );

      const studentResults = results
        .filter((r) => r.studentName && r.studentName.trim().toLowerCase() === studentNameLower)
        .sort((a, b) => {
          const tB = getExamResultTimestamp(b);
          const tA = getExamResultTimestamp(a);
          return tB - tA;
        });
      const studentExamCount = studentResults.length;
      const latestExam = studentResults[0];

      const studentGameLogs = gameLogs
        .filter((g) => g.studentName && g.studentName.trim().toLowerCase() === studentNameLower)
        .sort((a, b) => {
          const timeA = a.timestamp || (a as any).playedAt || '';
          const timeB = b.timestamp || (b as any).playedAt || '';
          return timeB.localeCompare(timeA);
        });
      const studentGameCount = studentGameLogs.length;
      const latestGame = studentGameLogs[0];

      const studentDirectLastLogin = s.lastLogin?.trim();

      // If student logged in, even with 0 exams and 0 games, they are detected as logged in!
      const isLoggedIn = Boolean(
        matchLog ||
        isCurrent ||
        (studentDirectLastLogin && studentDirectLastLogin !== '-') ||
        studentExamCount > 0 ||
        studentGameCount > 0
      );

      let lastLoginTime: string | undefined = undefined;
      let rawTimeStr: string | undefined = undefined;

      if (isCurrent) {
        lastLoginTime = 'Sedang Aktif';
      } else if (matchLog?.lastSeenTime || matchLog?.loginTime) {
        lastLoginTime = matchLog.lastSeenTime || matchLog.loginTime;
        rawTimeStr = lastLoginTime;
      } else if (studentDirectLastLogin && studentDirectLastLogin !== '-') {
        lastLoginTime = studentDirectLastLogin;
        rawTimeStr = lastLoginTime;
      } else if (studentExamCount > 0 && latestExam) {
        const examDisplayDate = formatExamDisplayDate(latestExam);
        lastLoginTime = `${examDisplayDate} (Ujian)`;
        rawTimeStr = examDisplayDate;
      } else if (studentGameCount > 0 && latestGame) {
        const rawGameTime = latestGame?.timestamp || (latestGame as any)?.playedAt;
        if (rawGameTime && rawGameTime !== 'undefined') {
          lastLoginTime = `${rawGameTime} (Game)`;
          rawTimeStr = rawGameTime;
        } else if (studentDirectLastLogin) {
          lastLoginTime = studentDirectLastLogin;
          rawTimeStr = lastLoginTime;
        }
      }

      const examTimestamp = latestExam ? getExamResultTimestamp(latestExam) : undefined;
      const timestampMs = parseTimestampMs(rawTimeStr, matchLog?.lastActiveTimestamp || examTimestamp);
      const isOnline = isCurrent || Boolean(timestampMs && (nowMs - timestampMs) <= 120000 && matchLog?.status !== 'offline');
      const isIdle = !isOnline && Boolean(timestampMs && (nowMs - timestampMs) <= 600000 && matchLog?.status !== 'offline');
      const relativeTime = getLiveRelativeTime(nowMs, timestampMs, rawTimeStr, isCurrent);

      let currentActivity = 'Belum Pernah Masuk';
      let activityDetails = 'Belum ada riwayat aktivitas';

      if (matchLog?.currentActivity) {
        currentActivity = matchLog.currentActivity;
        activityDetails = matchLog.activityDetails || '';
      } else if (isCurrent) {
        currentActivity = 'Sedang Aktif di Dashboard';
        activityDetails = 'Sesi Siswa Aktif';
      } else if (studentExamCount > 0) {
        currentActivity = `Selesai Ujian: ${latestExam.bankTitle || latestExam.subject}`;
        activityDetails = `Nilai: ${latestExam.score} (${latestExam.correctAnswers}/${latestExam.totalQuestions} Benar)`;
      } else if (studentGameCount > 0) {
        currentActivity = `Selesai Game: ${latestGame.gameTitle}`;
        activityDetails = `Skor: ${latestGame.score} Poin (${latestGame.subject || 'Game Edukasi'})`;
      } else if (isLoggedIn) {
        currentActivity = 'Baru Saja Login';
        activityDetails = 'Belum Mengerjakan Ujian/Game (Hanya Login)';
      }

      const key = `siswa-${studentNameLower}`;
      processedKeys.add(key);

      list.push({
        id: s.id || `student-${s.name}`,
        name: s.name,
        role: 'siswa',
        identifier: s.nisn || s.nis || s.username || '-',
        classRoom: s.classRoom,
        photoUrl: s.photoUrl,
        gender: s.gender,
        isLoggedIn,
        isOnline,
        isIdle,
        lastLoginTime,
        lastActiveTimestamp: timestampMs,
        relativeTime,
        currentActivity,
        activityDetails,
        examCount: studentExamCount,
        gameCount: studentGameCount,
        latestScore: latestExam?.score,
        isCurrentSessionUser: isCurrent,
      });
    });

    // 3. Process any extra login logs (e.g. Admin, Tamu, or direct accounts)
    loginLogs.forEach((l) => {
      if (!l || !l.name) return;
      // PERMANENT FILTER: User asked to permanently delete the admin named "Administrator"
      if (l.name.trim().toLowerCase() === 'administrator') return;

      const key = `${l.role}-${l.name.trim().toLowerCase()}`;
      if (!processedKeys.has(key)) {
        processedKeys.add(key);

        const timestampMs = parseTimestampMs(l.lastSeenTime || l.loginTime, l.lastActiveTimestamp);
        const isOnline = Boolean(timestampMs && (nowMs - timestampMs) <= 120000 && l.status !== 'offline');
        const isIdle = !isOnline && Boolean(timestampMs && (nowMs - timestampMs) <= 600000 && l.status !== 'offline');
        const relativeTime = getLiveRelativeTime(nowMs, timestampMs, l.lastSeenTime || l.loginTime, false);

        list.push({
          id: l.id || `log-${l.name}`,
          name: l.name,
          role: (l.role as any) || 'admin',
          identifier: l.identifier || '-',
          classRoom: l.classRoom,
          positionOrSubject: l.positionOrSubject || (l.role === 'admin' ? 'Administrator Sistem' : 'Tamu'),
          photoUrl: l.photoUrl,
          isLoggedIn: true,
          isOnline,
          isIdle,
          lastLoginTime: l.lastSeenTime || l.loginTime,
          lastActiveTimestamp: timestampMs,
          relativeTime,
          currentActivity: l.currentActivity || (l.role === 'admin' ? 'Monitoring CBT & Sistem' : 'Aktif di CBT'),
          activityDetails: l.activityDetails || 'Akses Sistem',
          examCount: 0,
          gameCount: 0,
          isCurrentSessionUser: false,
        });
      }
    });

    // Add current user if Admin and not in list
    if (currentUser && currentUser.role === 'admin') {
      const adminName = (!currentUser.name || currentUser.name.trim().toLowerCase() === 'administrator')
        ? 'Administrator System'
        : currentUser.name;
      const adminKey = `admin-${adminName.trim().toLowerCase()}`;
      if (!processedKeys.has(adminKey)) {
        list.unshift({
          id: 'admin-current',
          name: adminName,
          role: 'admin',
          identifier: currentUser.username || 'admin',
          positionOrSubject: 'Administrator Sistem',
          photoUrl: currentUser.photoUrl,
          isLoggedIn: true,
          isOnline: true,
          isIdle: false,
          lastLoginTime: 'Sedang Aktif',
          lastActiveTimestamp: nowMs,
          relativeTime: 'Online (Sesi Ini)',
          currentActivity: 'Sedang Monitoring Dasbor & Pengguna',
          activityDetails: 'Aktif Sekarang (Administrator)',
          examCount: 0,
          gameCount: 0,
          isCurrentSessionUser: true,
        });
      }
    }

    // Filter out any admin named "Administrator" permanently
    return list.filter((u) => !(u.role === 'admin' && u.name.trim().toLowerCase() === 'administrator'));
  }, [teachers, students, loginLogs, results, gameLogs, currentUser, nowMs]);

  // Aggregate Metrics for User Logins
  const totalAccounts = userAccountList.length;
  const loggedInAccounts = userAccountList.filter((u) => u.isLoggedIn).length;
  const notLoggedInAccounts = userAccountList.filter((u) => !u.isLoggedIn).length;
  const percentLoggedIn = totalAccounts > 0 ? Math.round((loggedInAccounts / totalAccounts) * 100) : 0;

  // Real-time dynamic counts
  const onlineAccountsCount = userAccountList.filter((u) => u.isOnline).length;
  const examAccountsCount = userAccountList.filter((u) => u.examCount > 0 || u.currentActivity.toLowerCase().includes('ujian')).length;
  const justLoginAccountsCount = userAccountList.filter((u) => u.isLoggedIn && u.examCount === 0 && u.gameCount === 0 && !u.currentActivity.toLowerCase().includes('ujian')).length;

  const teacherAccounts = userAccountList.filter((u) => u.role === 'guru');
  const teacherLoggedInCount = teacherAccounts.filter((u) => u.isLoggedIn).length;

  const studentAccounts = userAccountList.filter((u) => u.role === 'siswa');
  const studentLoggedInCount = studentAccounts.filter((u) => u.isLoggedIn).length;

  // Filtered List
  const filteredUsers = useMemo(() => {
    return userAccountList.filter((user) => {
      // Role Filter
      if (activeRoleFilter === 'guru' && user.role !== 'guru') return false;
      if (activeRoleFilter === 'siswa' && user.role !== 'siswa') return false;
      if (activeRoleFilter === 'admin' && user.role !== 'admin' && user.role !== 'umum') return false;

      // Status Filter
      if (activeStatusFilter === 'online' && !user.isOnline) return false;
      if (activeStatusFilter === 'logged' && !user.isLoggedIn) return false;
      if (activeStatusFilter === 'ujian' && !(user.examCount > 0 || user.currentActivity.toLowerCase().includes('ujian'))) return false;
      if (activeStatusFilter === 'just_logged' && !(user.isLoggedIn && user.examCount === 0 && user.gameCount === 0 && !user.currentActivity.toLowerCase().includes('ujian'))) return false;
      if (activeStatusFilter === 'not_logged' && user.isLoggedIn) return false;

      // Class Filter
      if (selectedClass !== 'all' && user.classRoom !== selectedClass) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = user.name.toLowerCase().includes(q);
        const matchIdentifier = user.identifier.toLowerCase().includes(q);
        const matchClass = user.classRoom?.toLowerCase().includes(q);
        const matchRole = user.role.toLowerCase().includes(q);
        const matchSubject = user.positionOrSubject?.toLowerCase().includes(q);
        const matchActivity = user.currentActivity?.toLowerCase().includes(q);
        const matchDetails = user.activityDetails?.toLowerCase().includes(q);
        if (!matchName && !matchIdentifier && !matchClass && !matchRole && !matchSubject && !matchActivity && !matchDetails) {
          return false;
        }
      }

      return true;
    });
  }, [userAccountList, activeRoleFilter, activeStatusFilter, selectedClass, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const headers = [
      'Nama',
      'Peran',
      'NIS/NISN/Username',
      'Kelas/Mata Pelajaran',
      'Status Keaktifan',
      'Aktivitas Terkini',
      'Detail Aktivitas',
      'Waktu Relatif',
      'Waktu Login Terakhir',
      'Jumlah Ujian Selesai',
      'Jumlah Game Dimainkan',
    ];
    const rows = filteredUsers.map((u) => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.role.toUpperCase()}"`,
      `"${u.identifier}"`,
      `"${(u.classRoom || u.positionOrSubject || '-').replace(/"/g, '""')}"`,
      `"${u.isOnline ? 'ONLINE' : u.isLoggedIn ? 'OFFLINE (PERNAH LOGIN)' : 'BELUM LOGIN'}"`,
      `"${u.currentActivity.replace(/"/g, '""')}"`,
      `"${(u.activityDetails || '-').replace(/"/g, '""')}"`,
      `"${u.relativeTime}"`,
      `"${u.lastLoginTime || '-'}"`,
      u.examCount,
      u.gameCount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_monitoring_login_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Banner AI Generator with Yellow Header Theme */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden border border-amber-300/60">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-3.5">
          <div className="space-y-1 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/20 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-slate-950" />
              <span>Teknologi Pembuat Soal Berbasis Gemini AI</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-slate-950 leading-snug">
              CBT AI Generator & System Ujian Modern
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-900/90 font-medium leading-tight max-w-2xl">
              Buat puluhan hingga ratusan soal CBT otomatis disesuaikan dengan jenjang SD/MI, SMP/MTs, SMA/MA, maupun SMK.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              onClick={() => handleTabClick(s.tab)}
              className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 truncate">{s.title}</span>
                <div className={`p-2 rounded-lg border ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-100 group-hover:text-indigo-400 transition-colors">
                  {s.value}
                </div>
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1 group-hover:text-slate-300">
                  <span>Lihat Detail</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION: MONITORING STATUS LOGIN PENGGUNA (GURU & SISWA) */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Section Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100 tracking-tight flex items-center gap-2">
                    Monitoring Status Login Pengguna
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      Real-time
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pantau guru dan siswa yang sudah pernah login/aktif maupun yang belum pernah masuk ke sistem CBT.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title="Muat ulang dan perbarui status login terkini"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Segarkan Data</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title="Download Rekap Data Login format CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unduh Rekap CSV</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800/70">
            {/* Total Akun */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Akun</span>
                <span className="text-xl font-black text-slate-100">{totalAccounts}</span>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>

            {/* Online Saat Ini (Real-Time) */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-emerald-500/30 flex items-center justify-between shadow-sm shadow-emerald-950/40">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Online (Live)</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-emerald-300">{onlineAccountsCount}</span>
                  <span className="text-xs text-emerald-400/80 font-semibold">Aktif</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-4 h-4" />
              </div>
            </div>

            {/* Sedang / Sudah Ujian */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Sedang/Sudah Ujian</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-indigo-300">{examAccountsCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">Siswa</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            {/* Baru Login (Belum Ujian) */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Baru Login (Belum Ujian)</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-amber-300">{justLoginAccountsCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">Akun</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Belum Login */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Belum Login</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-rose-400">{notLoggedInAccounts}</span>
                  <span className="text-xs text-slate-400 font-semibold">
                    ({totalAccounts > 0 ? Math.round((notLoggedInAccounts / totalAccounts) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Role & Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Pills */}
            <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => {
                  setActiveRoleFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeRoleFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({totalAccounts})
              </button>
              <button
                onClick={() => {
                  setActiveRoleFilter('guru');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeRoleFilter === 'guru'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Guru ({teacherAccounts.length})
              </button>
              <button
                onClick={() => {
                  setActiveRoleFilter('siswa');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeRoleFilter === 'siswa'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Siswa ({studentAccounts.length})
              </button>
            </div>

            {/* Status Dropdown / Pills */}
            <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => {
                  setActiveStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeStatusFilter === 'all'
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua Status
              </button>
              <button
                onClick={() => {
                  setActiveStatusFilter('online');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeStatusFilter === 'online'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Online ({onlineAccountsCount})</span>
              </button>
              <button
                onClick={() => {
                  setActiveStatusFilter('ujian');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeStatusFilter === 'ujian'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-400 hover:text-indigo-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ujian ({examAccountsCount})</span>
              </button>
              <button
                onClick={() => {
                  setActiveStatusFilter('just_logged');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeStatusFilter === 'just_logged'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Baru Login ({justLoginAccountsCount})</span>
              </button>
              <button
                onClick={() => {
                  setActiveStatusFilter('not_logged');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeStatusFilter === 'not_logged'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Belum ({notLoggedInAccounts})</span>
              </button>
            </div>

            {/* Class Filter if Siswa or All */}
            {availableClasses.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-200 border-none outline-none cursor-pointer pr-2"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    Semua Kelas
                  </option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls} className="bg-slate-900 text-slate-200">
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
              <span className="text-slate-400 font-semibold text-xs">Baris:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-amber-300 border-none outline-none cursor-pointer pr-1"
                title="Pilih jumlah baris yang ditampilkan per halaman"
              >
                {pageSizeOptions.map((sz) => (
                  <option key={sz} value={sz} className="bg-slate-900 text-slate-200">
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px] w-full md:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, NIS, aktivitas, mapel..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* User Status Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 pl-5">Nama Pengguna & Akun</th>
                <th className="p-3.5">Peran / Role</th>
                <th className="p-3.5">Kelas / Jabatan</th>
                <th className="p-3.5 text-center">Status Keaktifan</th>
                <th className="p-3.5 min-w-[240px]">Aktivitas yang Sedang Dikerjakan (Real-Time)</th>
                <th className="p-3.5 text-center">Waktu Login & Real-Time</th>
                <th className="p-3.5 text-center pr-5">Rekap CBT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200 font-medium">
              {paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    user.isOnline
                      ? 'bg-emerald-950/15'
                      : user.isLoggedIn
                      ? 'bg-slate-900/20'
                      : 'bg-transparent'
                  }`}
                >
                  {/* Name with Avatar & Online Dot Indicator */}
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden border ${
                            user.role === 'guru'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : user.role === 'siswa'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {user.photoUrl ? (
                            <img
                              src={user.photoUrl}
                              alt={user.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {/* Live Online Badge Indicator on Avatar Corner */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                            user.isOnline
                              ? 'bg-emerald-400 ring-2 ring-emerald-500/40'
                              : user.isIdle
                              ? 'bg-amber-400'
                              : user.isLoggedIn
                              ? 'bg-slate-500'
                              : 'bg-rose-500/40'
                          }`}
                          title={
                            user.isOnline
                              ? 'Sedang Aktif Online'
                              : user.isIdle
                              ? 'Sedang Idle'
                              : user.isLoggedIn
                              ? 'Pernah Login (Offline)'
                              : 'Belum Pernah Login'
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {currentUser?.name?.toLowerCase() === user.name.toLowerCase() && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                          <span className="font-mono text-slate-300">{user.identifier}</span>
                          {user.gender && <span>• {user.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role Badge */}
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        user.role === 'guru'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : user.role === 'siswa'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {user.role === 'guru' ? (
                        <>
                          <Users className="w-3 h-3" />
                          <span>Guru</span>
                        </>
                      ) : user.role === 'siswa' ? (
                        <>
                          <GraduationCap className="w-3 h-3" />
                          <span>Siswa</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>Admin</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Class / Position */}
                  <td className="p-3.5 text-slate-300">
                    {user.classRoom ? (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 font-bold border border-slate-800 text-xs inline-block">
                        Kelas {user.classRoom}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">{user.positionOrSubject || '-'}</span>
                    )}
                  </td>

                  {/* Status Keaktifan (Live) */}
                  <td className="p-3.5 text-center">
                    {user.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[11px] shadow-sm shadow-emerald-950">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>ONLINE</span>
                      </span>
                    ) : user.isIdle ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>IDLE</span>
                      </span>
                    ) : user.isLoggedIn ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span>OFFLINE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-rose-500/50"></span>
                        <span>BELUM</span>
                      </span>
                    )}
                  </td>

                  {/* Aktivitas yang Sedang Dikerjakan (Real-Time) */}
                  <td className="p-3.5">
                    <div className="flex items-start gap-2.5 max-w-md">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 border ${
                          user.currentActivity.toLowerCase().includes('ujian')
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : user.currentActivity.toLowerCase().includes('game')
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : user.currentActivity.toLowerCase().includes('baru saja login')
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : user.isOnline
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : user.isLoggedIn
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-slate-900/60 text-slate-500 border-slate-800'
                        }`}
                      >
                        {user.currentActivity.toLowerCase().includes('ujian') ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : user.currentActivity.toLowerCase().includes('game') ? (
                          <Gamepad2 className="w-3.5 h-3.5" />
                        ) : user.currentActivity.toLowerCase().includes('baru saja login') ? (
                          <LogIn className="w-3.5 h-3.5" />
                        ) : user.isOnline ? (
                          <Activity className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`font-bold text-xs truncate ${
                            user.isOnline ? 'text-emerald-300' : 'text-slate-100'
                          }`}
                        >
                          {user.currentActivity}
                        </div>
                        {user.activityDetails && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {user.activityDetails}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Waktu Login & Real-Time */}
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center gap-1">
                      {user.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          <span>{user.relativeTime}</span>
                        </span>
                      ) : user.isIdle ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold text-[11px] border border-amber-500/20">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{user.relativeTime}</span>
                        </span>
                      ) : user.isLoggedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{user.relativeTime}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">-</span>
                      )}
                      {user.lastLoginTime && user.lastLoginTime !== 'Sedang Aktif' && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {user.lastLoginTime}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rekap CBT */}
                  <td className="p-3.5 text-center pr-5">
                    {user.role === 'siswa' ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold"
                            title="Jumlah Ujian Selesai"
                          >
                            {user.examCount} Ujian
                          </span>
                          {user.gameCount > 0 && (
                            <span
                              className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-bold"
                              title="Jumlah Game Dimainkan"
                            >
                              {user.gameCount} Game
                            </span>
                          )}
                        </div>
                        {typeof user.latestScore === 'number' && (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            Nilai Terakhir: {user.latestScore}
                          </span>
                        )}
                      </div>
                    ) : user.role === 'guru' ? (
                      <span className="text-slate-400 text-[11px]">{user.positionOrSubject || 'Tenaga Pendidik'}</span>
                    ) : (
                      <span className="text-amber-400 text-[11px] font-bold">Admin Sistem</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <UserIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-300">Tidak ada data pengguna ditemukan.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Coba sesuaikan kata kunci pencarian atau ganti filter di atas.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination (Hanya jika lebih dari 1 halaman, tanpa duplikasi info baris) */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-slate-200">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 bg-[#0f172a] rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Distribusi Nilai Hasil Ujian Siswa
              </h3>
              <p className="text-xs text-slate-400">Statistik sebaran rentang nilai ujian CBT seluruh kelas</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              {passPercentage}% Tingkat Kelulusan
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartScoreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Jumlah Siswa" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart & Quick Pass Rate */}
        <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Persentase Kelulusan
            </h3>
            <p className="text-xs text-slate-400">Rasio siswa Lulus vs Tidak Lulus</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-xl font-black text-slate-100">{passPercentage}%</span>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Lulus</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-300 font-medium">Lulus Ujian</span>
              </div>
              <span className="font-bold text-slate-100">{totalLulus} Siswa</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-300 font-medium">Belum Lulus</span>
              </div>
              <span className="font-bold text-slate-100">{Math.max(0, totalUjian - totalLulus)} Siswa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Exams Log Table */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Aktivitas Ujian Terbaru
            </h3>
            <p className="text-xs text-slate-400">Log hasil ujian CBT yang baru diselesaikan oleh siswa</p>
          </div>
          <button
            onClick={() => handleTabClick('riwayat-ujian')}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Lihat Semua Riwayat Ujian
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Waktu Selesai (Real-Time)</th>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Mata Pelajaran</th>
                <th className="p-3 text-center">Nilai</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
              {recentResults.map((r) => {
                const displayDate = formatExamDisplayDate(r);
                const timestampMs = getExamResultTimestamp(r);
                const relativeBadge = getLiveRelativeTime(nowMs, timestampMs, r.date);

                return (
                  <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200 font-semibold">{displayDate}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <Clock className="w-2.5 h-2.5 text-indigo-400" />
                          {relativeBadge}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-100">{r.studentName}</td>
                    <td className="p-3 text-slate-300">{r.classRoom}</td>
                    <td className="p-3 text-slate-300">{r.subject}</td>
                    <td className="p-3 text-center font-black text-indigo-400 text-sm">{r.score}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.passed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {r.passed ? 'LULUS' : 'REMEDIAL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {recentResults.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Belum ada riwayat ujian tersimpan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
