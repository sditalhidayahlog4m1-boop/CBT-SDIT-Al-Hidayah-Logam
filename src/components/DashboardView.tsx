import React, { useState, useMemo } from 'react';
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
  lastLoginTime?: string;
  examCount: number;
  gameCount: number;
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
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'logged' | 'not_logged'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const pageSizeOptions = [5, 10, 15, 20, 25, 30, 100, 200, 300, 400, 500];

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
  const passPercentage = totalUjian > 0 ? Math.round((totalLulus / totalUjian) * 100) : 100;

  // Chart data for score distribution
  const chartScoreData = [
    { range: '90 - 100 (Sangat Baik)', count: results.filter((r) => r.score >= 90).length || 1 },
    { range: '75 - 89 (Baik)', count: results.filter((r) => r.score >= 75 && r.score < 90).length || 2 },
    { range: '60 - 74 (Cukup)', count: results.filter((r) => r.score >= 60 && r.score < 75).length || 1 },
    { range: '< 60 (Perlu Remedial)', count: results.filter((r) => r.score < 60).length || 0 },
  ];

  // Pie chart data for pass vs fail
  const pieData = [
    { name: 'Lulus Ujian', value: totalLulus || 3, color: '#10b981' },
    { name: 'Belum Lulus', value: Math.max(0, totalUjian - totalLulus) || 1, color: '#ef4444' },
  ];

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

  // Build Comprehensive User Login Status List
  const userAccountList = useMemo<UserAccountStatus[]>(() => {
    const list: UserAccountStatus[] = [];
    const processedKeys = new Set<string>();

    // 1. Process Teachers
    teachers.forEach((t) => {
      const matchLog = loginLogs.find(
        (l) =>
          (l.name && l.name.toLowerCase() === t.name.toLowerCase()) ||
          (t.nip && l.identifier && l.identifier === t.nip) ||
          (t.nuptk && l.identifier && l.identifier === t.nuptk) ||
          (l.userId && l.userId === t.id)
      );

      const isCurrent = currentUser?.name?.toLowerCase() === t.name.toLowerCase() && currentUser.role === 'guru';
      const isLoggedIn = Boolean(matchLog || isCurrent);
      const lastLoginTime = matchLog?.lastSeenTime || matchLog?.loginTime || (isCurrent ? 'Sedang Aktif' : undefined);

      const key = `guru-${t.name.toLowerCase()}`;
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
        lastLoginTime,
        examCount: 0,
        gameCount: 0,
      });
    });

    // 2. Process Students
    students.forEach((s) => {
      const matchLog = loginLogs.find(
        (l) =>
          (l.name && l.name.toLowerCase() === s.name.toLowerCase()) ||
          (s.nisn && l.identifier && l.identifier === s.nisn) ||
          (s.nis && l.identifier && l.identifier === s.nis) ||
          (l.userId && l.userId === s.id)
      );

      const isCurrent = currentUser?.name?.toLowerCase() === s.name.toLowerCase() && currentUser.role === 'siswa';
      const studentExamCount = results.filter((r) => r.studentName.toLowerCase() === s.name.toLowerCase()).length;
      const studentGameCount = gameLogs.filter((g) => g.studentName?.toLowerCase() === s.name.toLowerCase()).length;

      // If student took exam or played game, they have definitely logged in before
      const isLoggedIn = Boolean(matchLog || isCurrent || studentExamCount > 0 || studentGameCount > 0);
      let lastLoginTime = matchLog?.lastSeenTime || matchLog?.loginTime;

      if (!lastLoginTime) {
        if (isCurrent) {
          lastLoginTime = 'Sedang Aktif';
        } else if (studentExamCount > 0) {
          const latestExam = results
            .filter((r) => r.studentName.toLowerCase() === s.name.toLowerCase())
            .sort((a, b) => (b.date > a.date ? 1 : -1))[0];
          lastLoginTime = latestExam ? `${latestExam.date} (Ujian)` : undefined;
        } else if (studentGameCount > 0) {
          const latestGame = gameLogs
            .filter((g) => g.studentName?.toLowerCase() === s.name.toLowerCase())
            .sort((a, b) => (b.playedAt > a.playedAt ? 1 : -1))[0];
          lastLoginTime = latestGame ? `${latestGame.playedAt} (Game)` : undefined;
        }
      }

      const key = `siswa-${s.name.toLowerCase()}`;
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
        lastLoginTime,
        examCount: studentExamCount,
        gameCount: studentGameCount,
      });
    });

    // 3. Process any extra login logs (e.g. Admin, Tamu, or direct accounts)
    loginLogs.forEach((l) => {
      const key = `${l.role}-${l.name.toLowerCase()}`;
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        list.push({
          id: l.id || `log-${l.name}`,
          name: l.name,
          role: (l.role as any) || 'admin',
          identifier: l.identifier || '-',
          classRoom: l.classRoom,
          positionOrSubject: l.positionOrSubject || (l.role === 'admin' ? 'Administrator Sistem' : 'Tamu'),
          photoUrl: l.photoUrl,
          isLoggedIn: true,
          lastLoginTime: l.lastSeenTime || l.loginTime,
          examCount: 0,
          gameCount: 0,
        });
      }
    });

    // Add current user if Admin and not in list
    if (currentUser && currentUser.role === 'admin') {
      const adminKey = `admin-${currentUser.name.toLowerCase()}`;
      if (!processedKeys.has(adminKey)) {
        list.unshift({
          id: 'admin-current',
          name: currentUser.name,
          role: 'admin',
          identifier: currentUser.username || 'admin',
          positionOrSubject: 'Administrator Sistem',
          photoUrl: currentUser.photoUrl,
          isLoggedIn: true,
          lastLoginTime: 'Sedang Aktif',
          examCount: 0,
          gameCount: 0,
        });
      }
    }

    return list;
  }, [teachers, students, loginLogs, results, gameLogs, currentUser]);

  // Aggregate Metrics for User Logins
  const totalAccounts = userAccountList.length;
  const loggedInAccounts = userAccountList.filter((u) => u.isLoggedIn).length;
  const notLoggedInAccounts = totalAccounts - loggedInAccounts;
  const percentLoggedIn = totalAccounts > 0 ? Math.round((loggedInAccounts / totalAccounts) * 100) : 0;

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
      if (activeStatusFilter === 'logged' && !user.isLoggedIn) return false;
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
        if (!matchName && !matchIdentifier && !matchClass && !matchRole && !matchSubject) {
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
  }, [filteredUsers, currentPage]);

  const handleExportCSV = () => {
    const headers = ['Nama', 'Peran', 'NISN/NIP/Username', 'Kelas/Mata Pelajaran', 'Status Login', 'Waktu Login Terakhir', 'Jumlah Ujian Selesai'];
    const rows = filteredUsers.map((u) => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.role.toUpperCase()}"`,
      `"${u.identifier}"`,
      `"${(u.classRoom || u.positionOrSubject || '-').replace(/"/g, '""')}"`,
      `"${u.isLoggedIn ? 'Sudah Login' : 'Belum Login'}"`,
      `"${u.lastLoginTime || '-'}"`,
      u.examCount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_status_login_${new Date().toISOString().slice(0, 10)}.csv`);
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/70">
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

            {/* Sudah Login */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Sudah Login</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-400">{loggedInAccounts}</span>
                  <span className="text-xs text-slate-400 font-semibold">({percentLoggedIn}%)</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Belum Login */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Belum Login</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-rose-400">{notLoggedInAccounts}</span>
                  <span className="text-xs text-slate-400 font-semibold">
                    ({totalAccounts > 0 ? 100 - percentLoggedIn : 0}%)
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <XCircle className="w-4 h-4" />
              </div>
            </div>

            {/* Partisipasi Guru & Siswa */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex flex-col justify-center gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Guru Login:</span>
                <span className="font-bold text-blue-400">{teacherLoggedInCount} / {teacherAccounts.length}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Siswa Login:</span>
                <span className="font-bold text-purple-400">{studentLoggedInCount} / {studentAccounts.length}</span>
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
                  setActiveStatusFilter('logged');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeStatusFilter === 'logged'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sudah Login ({loggedInAccounts})</span>
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
          <div className="relative min-w-[240px] w-full md:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, NISN, NIP, kelas..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* User Status Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 pl-5">Nama Pengguna</th>
                <th className="p-3.5">Peran / Role</th>
                <th className="p-3.5">NISN / NIP / ID</th>
                <th className="p-3.5">Kelas / Jabatan</th>
                <th className="p-3.5 text-center">Status Login</th>
                <th className="p-3.5 text-center">Waktu Login Terakhir</th>
                <th className="p-3.5 text-center pr-5">Aktivitas CBT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200 font-medium">
              {paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    user.isLoggedIn ? 'bg-slate-900/20' : 'bg-transparent'
                  }`}
                >
                  {/* Name with Avatar */}
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border ${
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
                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {currentUser?.name?.toLowerCase() === user.name.toLowerCase() && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {user.gender === 'L' ? 'Laki-laki' : user.gender === 'P' ? 'Perempuan' : ''}
                        </span>
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

                  {/* Identifier */}
                  <td className="p-3.5 text-slate-300 font-mono text-xs">
                    {user.identifier}
                  </td>

                  {/* Class / Subject */}
                  <td className="p-3.5 text-slate-300">
                    {user.classRoom ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-bold border border-slate-700 text-xs">
                        Kelas {user.classRoom}
                      </span>
                    ) : (
                      <span className="text-slate-400">{user.positionOrSubject || '-'}</span>
                    )}
                  </td>

                  {/* Status Login */}
                  <td className="p-3.5 text-center">
                    {user.isLoggedIn ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Sudah Login</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700 font-semibold text-xs">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span>Belum Login</span>
                      </span>
                    )}
                  </td>

                  {/* Last Login Time */}
                  <td className="p-3.5 text-center whitespace-nowrap">
                    {user.lastLoginTime ? (
                      <div className="inline-flex items-center gap-1.5 text-slate-300 font-medium bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{user.lastLoginTime}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-xs">Belum pernah masuk</span>
                    )}
                  </td>

                  {/* CBT Activity Count */}
                  <td className="p-3.5 text-center pr-5">
                    {user.role === 'siswa' ? (
                      <div className="flex items-center justify-center gap-2">
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
                    ) : (
                      <span className="text-slate-500 text-xs">-</span>
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

        {/* Table Footer with Pagination */}
        {filteredUsers.length > 0 && (
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <div>
                Menampilkan{' '}
                <span className="font-bold text-slate-200">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                </span>{' '}
                dari <span className="font-bold text-slate-200">{filteredUsers.length}</span> akun
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
                <span className="text-[11px] text-slate-400">Baris:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-amber-300 border-none outline-none cursor-pointer pr-1"
                >
                  {pageSizeOptions.map((sz) => (
                    <option key={sz} value={sz} className="bg-slate-900 text-slate-200">
                      {sz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
                <th className="p-3">Tanggal</th>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Mata Pelajaran</th>
                <th className="p-3 text-center">Nilai</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
              {results.slice(0, 5).map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-slate-400 whitespace-nowrap">{r.date}</td>
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
              ))}
              {results.length === 0 && (
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
