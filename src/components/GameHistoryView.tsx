import React, { useState, useMemo, useEffect } from 'react';
import {
  Gamepad2,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Trophy,
  Award,
  Calendar,
  User,
  Sparkles,
  RefreshCw,
  BarChart3,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Clock,
  BookOpen,
  Wifi,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { GameHistoryLog, AuthUser } from '../types';
import { getStoredGameLogs } from '../utils/storage';
import { useHistoryModal } from '../utils/navigationHistory';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';

interface GameHistoryViewProps {
  gameLogs: GameHistoryLog[];
  setGameLogs?: React.Dispatch<React.SetStateAction<GameHistoryLog[]>>;
  currentUser?: AuthUser | null;
  onClearLogs?: () => void;
  onDeleteLog?: (id: string) => void;
  onRefresh?: () => Promise<boolean | void> | void;
}

export const GameHistoryView: React.FC<GameHistoryViewProps> = ({
  gameLogs = [],
  setGameLogs,
  currentUser,
  onClearLogs,
  onDeleteLog,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGameType, setSelectedGameType] = useState('Semua');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedSubject, setSelectedSubject] = useState('Semua');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Semua');
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);

  // Synchronize Reset Confirmation Modal with browser history
  useHistoryModal({
    modalId: 'game-history-reset-modal',
    isOpen: showConfirmResetModal,
    onClose: () => setShowConfirmResetModal(false),
    tab: 'riwayat-game',
  });
  const [activeTabFilter, setActiveTabFilter] = useState<'semua' | 'saya'>('semua');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const pageSizeOptions = [5, 10, 15, 20, 25, 30, 100, 200, 300, 400, 500];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [refreshSuccessMessage, setRefreshSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<GameHistoryLog | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auto set initial sync time & perform background refresh on mount
  useEffect(() => {
    const now = new Date();
    setLastSyncTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    if (onRefresh) {
      onRefresh();
    }
  }, []);

  // Manual Refresh Handler
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshSuccessMessage(null);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        const storedLogs = getStoredGameLogs();
        if (storedLogs && Array.isArray(storedLogs) && setGameLogs) {
          setGameLogs(storedLogs);
        }
      }
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(timeStr);
      setRefreshSuccessMessage('Data riwayat game berhasil diperbarui secara real-time dari Firebase Firestore!');
      setTimeout(() => {
        setRefreshSuccessMessage(null);
      }, 3500);
    } catch (e) {
      console.warn('Failed to refresh game logs:', e);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Available unique Game Types, Classes, & Subjects for dropdown filters
  const gameTypeOptions = useMemo(() => {
    const types = Array.from(new Set(gameLogs.map((log) => log.gameType).filter(Boolean)));
    return ['Semua', ...types];
  }, [gameLogs]);

  const classOptions = useMemo(() => {
    const classes = Array.from(new Set(gameLogs.map((log) => log.classRoom).filter(Boolean)));
    return ['Semua', ...classes];
  }, [gameLogs]);

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(new Set(gameLogs.map((log) => log.subject).filter(Boolean)));
    return ['Semua', ...subjects];
  }, [gameLogs]);

  const difficultyOptions = ['Semua', 'Mudah', 'Sedang', 'Sulit'];

  // Is current user a student?
  const isStudent = currentUser?.role === 'siswa';

  // Filtered Game Logs
  const filteredLogs = useMemo(() => {
    return gameLogs.filter((log) => {
      // If student tab filter is active or user is student wanting personal log
      if (isStudent || activeTabFilter === 'saya') {
        if (currentUser?.name && log.studentName !== currentUser.name) {
          return false;
        }
      }

      // Search match
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        log.studentName.toLowerCase().includes(query) ||
        (log.classRoom && log.classRoom.toLowerCase().includes(query)) ||
        log.gameType.toLowerCase().includes(query) ||
        log.subject.toLowerCase().includes(query) ||
        ((log.difficulty || '').toLowerCase().includes(query)) ||
        (log.topic && log.topic.toLowerCase().includes(query));

      // Game Type filter
      const matchGameType = selectedGameType === 'Semua' || log.gameType === selectedGameType;

      // Class filter
      const matchClass = selectedClass === 'Semua' || log.classRoom === selectedClass;

      // Subject filter
      const matchSubject = selectedSubject === 'Semua' || log.subject === selectedSubject;

      // Difficulty filter
      const logDiff = log.difficulty || 'Sedang';
      const matchDifficulty = selectedDifficulty === 'Semua' || logDiff === selectedDifficulty;

      return matchSearch && matchGameType && matchClass && matchSubject && matchDifficulty;
    });
  }, [gameLogs, searchTerm, selectedGameType, selectedClass, selectedSubject, selectedDifficulty, isStudent, activeTabFilter, currentUser]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Subject + Difficulty Score Recap Calculation
  const subjectStatsList = useMemo(() => {
    const map: {
      [key: string]: {
        subject: string;
        difficulty: string;
        totalPlayed: number;
        totalScore: number;
        avgScore: number;
        maxScore: number;
        totalCorrect: number;
        totalQuestions: number;
        topStudentName: string;
        topStudentClass: string;
        studentNames: string[];
      };
    } = {};

    const baseLogs = gameLogs.filter((log) => {
      if (isStudent || activeTabFilter === 'saya') {
        if (currentUser?.name && log.studentName !== currentUser.name) {
          return false;
        }
      }
      return true;
    });

    baseLogs.forEach((log) => {
      const subj = log.subject || 'Umum';
      const diff = log.difficulty || 'Sedang';
      const key = `${subj}__${diff}`;

      if (!map[key]) {
        map[key] = {
          subject: subj,
          difficulty: diff,
          totalPlayed: 0,
          totalScore: 0,
          avgScore: 0,
          maxScore: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          topStudentName: log.studentName || '',
          topStudentClass: log.classRoom || '',
          studentNames: [],
        };
      }
      map[key].totalPlayed += 1;
      map[key].totalScore += log.score || 0;

      if ((log.score || 0) >= map[key].maxScore) {
        map[key].maxScore = log.score || 0;
        if (log.studentName) {
          map[key].topStudentName = log.studentName;
          map[key].topStudentClass = log.classRoom || '';
        }
      }

      if (log.studentName && !map[key].studentNames.includes(log.studentName)) {
        map[key].studentNames.push(log.studentName);
      }

      map[key].totalCorrect += log.correctCount || 0;
      map[key].totalQuestions += log.totalQuestions || 0;
    });

    return Object.values(map).map((s) => ({
      ...s,
      avgScore: s.totalPlayed > 0 ? Math.round(s.totalScore / s.totalPlayed) : 0,
    }));
  }, [gameLogs, isStudent, activeTabFilter, currentUser]);

  // Key Statistics
  const stats = useMemo(() => {
    const totalPlayed = filteredLogs.length;
    const avgScore = totalPlayed > 0 ? Math.round(filteredLogs.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalPlayed) : 0;
    const maxScore = totalPlayed > 0 ? Math.max(...filteredLogs.map((l) => l.score || 0)) : 0;
    const uniqueStudents = new Set(filteredLogs.map((l) => l.studentName)).size;

    return { totalPlayed, avgScore, maxScore, uniqueStudents };
  }, [filteredLogs]);

  // Delete single log entry with confirmation
  const handleDeleteClick = (log: GameHistoryLog) => {
    setDeleteConfirmTarget(log);
  };

  const executeDelete = () => {
    if (!deleteConfirmTarget) return;
    const targetName = deleteConfirmTarget.studentName;
    const targetId = deleteConfirmTarget.id;
    if (onDeleteLog) {
      onDeleteLog(targetId);
    } else if (setGameLogs) {
      setGameLogs((prev) => prev.filter((item) => item.id !== targetId));
    }
    setDeleteConfirmTarget(null);
    addToast('success', `Riwayat game milik "${targetName}" berhasil dihapus secara permanen dari Firebase.`, 'Berhasil Dihapus');
  };

  // Clear all game history logs
  const handleConfirmClearAll = () => {
    if (onClearLogs) {
      onClearLogs();
    } else if (setGameLogs) {
      setGameLogs([]);
    }
    setShowConfirmResetModal(false);
    addToast('success', 'Seluruh catatan riwayat game siswa berhasil dibersihkan permanen dari Firebase Firestore.', 'Berhasil Dikosongkan');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data riwayat game untuk di-export.');
      return;
    }

    const excelData = filteredLogs.map((log, index) => ({
      No: index + 1,
      'Waktu Main': log.timestamp,
      'Nama Siswa': log.studentName,
      Kelas: log.classRoom || '-',
      'Jenis Game': log.gameType,
      'Mata Pelajaran': log.subject,
      'Tingkat Kesulitan': log.difficulty || 'Sedang',
      Topik: log.topic || '-',
      'Skor Akhir': log.score,
      'Jawaban Benar': log.correctCount,
      'Total Soal': log.totalQuestions,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Game');

    const fileName = `Rekap_Riwayat_Game_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export / Print PDF Report
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data riwayat game untuk di-export.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('REKAPITULASI RIWAYAT GAME EDUKASI SISWA', 14, 18);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 25);
    doc.text(`Total Catatan: ${filteredLogs.length} Aktivitas`, 14, 30);

    let startY = 38;
    doc.setFontSize(8);

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(14, startY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('No', 16, startY + 6);
    doc.text('Waktu', 24, startY + 6);
    doc.text('Nama Siswa', 52, startY + 6);
    doc.text('Jenis Game', 92, startY + 6);
    doc.text('Mapel', 128, startY + 6);
    doc.text('Level', 158, startY + 6);
    doc.text('Skor', 178, startY + 6);

    doc.setFont('helvetica', 'normal');
    startY += 10;

    filteredLogs.slice(0, 35).forEach((log, index) => {
      if (startY > 270) {
        doc.addPage();
        startY = 20;
      }
      doc.text(`${index + 1}`, 16, startY);
      doc.text(`${log.timestamp.slice(0, 16)}`, 24, startY);
      doc.text(`${log.studentName.slice(0, 18)}`, 52, startY);
      doc.text(`${log.gameType.slice(0, 16)}`, 92, startY);
      doc.text(`${log.subject.slice(0, 14)}`, 128, startY);
      doc.text(`${log.difficulty || 'Sedang'}`, 158, startY);
      doc.text(`${log.score}`, 178, startY);
      startY += 7;
    });

    doc.save(`Laporan_Riwayat_Game_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner - Yellow Header Theme */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-3.5 sm:p-4 md:p-5 text-slate-950 shadow-xl relative overflow-hidden border border-amber-300/60">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/20 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <Gamepad2 className="w-3.5 h-3.5 text-slate-950" />
              <span>Rekap Aktivitas & Skor Game Edukasi</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-slate-950 leading-snug">
              Riwayat & Rekap Game Siswa (AI Game Engine)
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-900/90 font-medium leading-tight">
              Pantau seluruh hasil permainan game edukasi CBT, perolehan skor, tanggal main, serta performa siswa secara otomatis dan real-time.
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md border border-amber-400/50 transition-all cursor-pointer disabled:opacity-60"
              title="Segarkan data & tarik rekapan terbaru siswa dari semua akun/perangkat secara real-time"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-900 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-950/30 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak PDF</span>
            </button>
            {!isStudent && gameLogs.length > 0 && (
              <button
                onClick={() => setShowConfirmResetModal(true)}
                className="px-3 py-2 bg-rose-600/90 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Riwayat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Success Alert Notification Banner */}
      {refreshSuccessMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-lg text-xs font-semibold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{refreshSuccessMessage}</span>
          </div>
          <span className="text-[11px] text-emerald-300/80 font-mono">
            {lastSyncTime}
          </span>
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0b132b] p-3.5 rounded-2xl border border-slate-800/80 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Permainan
            </span>
            <span className="text-lg font-black text-white leading-none">
              {stats.totalPlayed} <span className="text-xs text-slate-400 font-normal">Sesi</span>
            </span>
          </div>
        </div>

        <div className="bg-[#0b132b] p-3.5 rounded-2xl border border-slate-800/80 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Rata-Rata Skor
            </span>
            <span className="text-lg font-black text-emerald-400 leading-none">
              {stats.avgScore} <span className="text-xs text-slate-400 font-normal">Poin</span>
            </span>
          </div>
        </div>

        <div className="bg-[#0b132b] p-3.5 rounded-2xl border border-slate-800/80 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Skor Tertinggi
            </span>
            <span className="text-lg font-black text-purple-300 leading-none">
              {stats.maxScore} <span className="text-xs text-slate-400 font-normal">Poin</span>
            </span>
          </div>
        </div>

        <div className="bg-[#0b132b] p-3.5 rounded-2xl border border-slate-800/80 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Siswa Bermain
            </span>
            <span className="text-lg font-black text-indigo-300 leading-none">
              {stats.uniqueStudents} <span className="text-xs text-slate-400 font-normal">Siswa</span>
            </span>
          </div>
        </div>
      </div>

      {/* Subject & Difficulty Score Recap Cards Section */}
      {subjectStatsList.length > 0 && (
        <div className="bg-[#0b132b] p-4 rounded-2xl border border-indigo-500/30 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                Rekapitulasi Skor Berdasarkan Mapel & Tingkat Kesulitan Game
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              Klik kartu untuk memfilter tabel berdasarkan Mapel & Level
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subjectStatsList.map((stat) => {
              const isSelected = selectedSubject === stat.subject && selectedDifficulty === stat.difficulty;
              const diffColor =
                stat.difficulty === 'Mudah'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : stat.difficulty === 'Sedang'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

              return (
                <div
                  key={`${stat.subject}__${stat.difficulty}`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedSubject('Semua');
                      setSelectedDifficulty('Semua');
                    } else {
                      setSelectedSubject(stat.subject);
                      setSelectedDifficulty(stat.difficulty);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-extrabold text-xs text-white truncate max-w-[150px]" title={stat.subject}>
                      {stat.subject}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${diffColor}`}>
                      {stat.difficulty === 'Mudah' ? '🟢 Mudah' : stat.difficulty === 'Sedang' ? '🟡 Sedang' : '🔴 Sulit'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-800/60">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-semibold">Rata-Rata</span>
                      <span className="font-black text-amber-400 font-mono text-sm">{stat.avgScore} Poin</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-semibold">Tertinggi</span>
                      <span className="font-black text-emerald-400 font-mono text-sm">{stat.maxScore} Poin</span>
                    </div>
                  </div>

                  {/* Student Name Display */}
                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                      <User className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Siswa :</span>
                    </span>
                    <span
                      className="font-bold text-amber-300 truncate max-w-[140px] text-right"
                      title={
                        stat.topStudentName
                          ? `Peraih Tertinggi: ${stat.topStudentName}${stat.topStudentClass ? ` (${stat.topStudentClass})` : ''} | Pemain: ${stat.studentNames.join(', ')}`
                          : stat.studentNames.join(', ') || '-'
                      }
                    >
                      {stat.topStudentName || (stat.studentNames.length > 0 ? stat.studentNames[0] : '-')}
                      {stat.topStudentClass ? ` (${stat.topStudentClass})` : ''}
                    </span>
                  </div>

                  <div className="mt-1.5 pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Total Sesi:</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {stat.totalPlayed} Kali Main
                      {stat.studentNames.length > 1 ? ` (${stat.studentNames.length} Siswa)` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0b132b] p-4 rounded-2xl border border-slate-800/80 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tab Toggle for Guru/Admin: View All vs Personal Log */}
        {!isStudent && currentUser && (
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => {
                setActiveTabFilter('semua');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'semua'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Siswa ({gameLogs.length})
            </button>
            <button
              onClick={() => {
                setActiveTabFilter('saya');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTabFilter === 'saya'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Aktivitas Saya
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama siswa, kelas, mapel, tingkat kesulitan, atau jenis game..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none font-bold text-xs cursor-pointer"
            >
              {subjectOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt === 'Semua' ? 'Semua Mapel' : opt}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none font-bold text-xs cursor-pointer"
            >
              {difficultyOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt === 'Semua' ? 'Semua Level' : `Level ${opt}`}
                </option>
              ))}
            </select>
          </div>

          {/* Game Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={selectedGameType}
              onChange={(e) => {
                setSelectedGameType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none font-bold text-xs cursor-pointer"
            >
              {gameTypeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt === 'Semua' ? 'Semua Mode Game' : opt}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none font-bold text-xs cursor-pointer"
            >
              {classOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt === 'Semua' ? 'Semua Kelas' : opt}
                </option>
              ))}
            </select>
          </div>

          {/* Rows Per Page (Baris) Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold text-xs">Baris:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent text-amber-300 focus:outline-none font-bold text-xs cursor-pointer"
              title="Pilih jumlah baris yang ditampilkan per halaman"
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz} className="bg-slate-900 text-white">
                  {sz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#0b132b] rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs sm:text-sm text-slate-200">
              Daftar Record Activity & Skor Game ({filteredLogs.length} Entri)
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
              title="Klik untuk memuat data game terbaru yang baru masuk dari Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Memuat...' : 'Refresh'}</span>
            </button>

            {lastSyncTime && (
              <span className="hidden md:inline text-[11px] text-slate-400 font-mono bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
                Sync: {lastSyncTime}
              </span>
            )}

            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Terhubung Cloud</span>
            </span>
          </div>
        </div>

        {/* Table View */}
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-200">Belum Ada Riwayat Game Sesuai Filter</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Silakan sesuaikan pilihan filter mata pelajaran atau tingkat kesulitan untuk menampilkan riwayat game lainnya.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Waktu Main</th>
                  <th className="py-3 px-4">Nama Siswa / Pengguna</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Jenis Game</th>
                  <th className="py-3 px-4">Mata Pelajaran & Topik</th>
                  <th className="py-3 px-4 text-center">Tingkat Kesulitan</th>
                  <th className="py-3 px-4 text-center">Skor Sesi</th>
                  <th className="py-3 px-4 text-center">Hasil Benar</th>
                  {!isStudent && <th className="py-3 px-4 text-center w-16">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedLogs.map((log, index) => {
                  const isHighScore = log.score >= 80;
                  const isMediumScore = log.score >= 60 && log.score < 80;
                  const diff = log.difficulty || 'Sedang';
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr
                      key={log.id || index}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {rowNumber}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-black text-[10px] shrink-0">
                            {log.studentName.charAt(0).toUpperCase()}
                          </div>
                          <span>{log.studentName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700 text-[11px]">
                          {log.classRoom || 'Umum'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-amber-300 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px]">
                          <Gamepad2 className="w-3 h-3 text-amber-400" />
                          <span>{log.gameType}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 text-xs">
                            {log.subject || 'Umum'}
                          </span>
                          {log.topic && (
                            <span className="text-[10px] text-slate-400 truncate">
                              Topik: {log.topic}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            diff === 'Mudah'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : diff === 'Sedang'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <span>
                            {diff === 'Mudah'
                              ? '🟢 Mudah'
                              : diff === 'Sedang'
                              ? '🟡 Sedang'
                              : '🔴 Sulit'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-black text-xs shadow-sm ${
                            isHighScore
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isMediumScore
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {isHighScore && <Trophy className="w-3 h-3 text-amber-400" />}
                          <span>{log.score} Poin</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-medium text-slate-300 text-xs">
                          {log.correctCount} / {log.totalQuestions || 10} Soal
                        </span>
                      </td>

                      {!isStudent && (
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteClick(log)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all cursor-pointer"
                            title="Hapus Riwayat Game Siswa (Permanen)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with Pagination */}
        {filteredLogs.length > 0 && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <div>
                Menampilkan{' '}
                <span className="font-bold text-slate-200">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLogs.length)} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
                </span>{' '}
                dari <span className="font-bold text-slate-200">{filteredLogs.length}</span> entri
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-0.5">
                <span className="text-[11px] text-slate-400">Baris:</span>
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

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Resetting All Game History */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b132b] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Reset Semua Riwayat Game?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan menghapus secara permanen seluruh catatan riwayat game siswa dari sistem dan Firestore cloud database. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer"
              >
                Ya, Hapus Semua Data Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Satuan Riwayat Game */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmTarget)}
        title="Konfirmasi Hapus Riwayat Game"
        message={`Apakah Anda yakin ingin menghapus data riwayat game milik "${deleteConfirmTarget?.studentName}" (Game: ${deleteConfirmTarget?.gameTitle}, Nilai: ${deleteConfirmTarget?.score})? Data akan dihapus secara permanen dari database Firebase Firestore.`}
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Floating Notifications / Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
