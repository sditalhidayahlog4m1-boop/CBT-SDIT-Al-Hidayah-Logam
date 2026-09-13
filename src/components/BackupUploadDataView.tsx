import React, { useState, useRef, useEffect } from 'react';
import {
  HardDriveDownload,
  UploadCloud,
  Download,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Database,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  History,
  ShieldCheck,
  Check,
  FileCheck,
  Sparkles,
  Gamepad2,
  School,
  Sliders,
} from 'lucide-react';
import {
  Teacher,
  Student,
  Subject,
  QuestionBank,
  ExamResult,
  DailyGradeRecord,
  GameHistoryLog,
  SchoolProfile,
  RolePermissions,
  ActiveTab,
  FullBackupData,
} from '../types';
import {
  downloadFullSystemBackupJson,
  downloadFullSystemBackupExcel,
  parseFullBackupJson,
} from '../utils/exportImport';
import { getStoredLastBackupTime, saveStoredLastBackupTime } from '../utils/storage';

interface BackupUploadDataViewProps {
  teachers: Teacher[];
  students: Student[];
  subjects: Subject[];
  banks: QuestionBank[];
  results: ExamResult[];
  dailyGrades: DailyGradeRecord[];
  gameLogs: GameHistoryLog[];
  gameData?: Record<string, any>;
  schoolProfile?: SchoolProfile;
  rolePermissions?: RolePermissions;
  onRestoreData: (backup: FullBackupData, mode: 'replace' | 'merge') => Promise<void> | void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BackupUploadDataView: React.FC<BackupUploadDataViewProps> = ({
  teachers,
  students,
  subjects,
  banks,
  results,
  dailyGrades,
  gameLogs,
  gameData = {},
  schoolProfile,
  rolePermissions,
  onRestoreData,
  setActiveTab,
}) => {
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(getStoredLastBackupTime);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExcelDownloading, setIsExcelDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload & Restore states
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<FullBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreSuccessSummary, setRestoreSuccessSummary] = useState<{
    teachers: number;
    students: number;
    subjects: number;
    banks: number;
    dailyGrades: number;
    results: number;
    timestamp: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalQuestions = banks.reduce((acc, b) => acc + (b.questions?.length || 0), 0);

  // Auto-hide toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'Belum Pernah Dicadangkan';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Baru saja';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} menit yang lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam yang lalu`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay} hari yang lalu`;
    } catch {
      return null;
    }
  };

  // Compile full backup payload object from all menu data
  const createFullBackupPayload = (): FullBackupData => {
    const nowIso = new Date().toISOString();
    return {
      version: '1.0.0',
      appName: 'CBT SDIT Al Hidayah Logam',
      exportedAt: nowIso,
      schoolName: schoolProfile?.name || 'SDIT Al Hidayah Logam',
      systemDescription: 'Arsip Cadangan Lengkap Seluruh Data Menu CBT SDIT Al Hidayah Logam',
      teachers,
      students,
      subjects,
      banks,
      results,
      dailyGrades,
      gameLogs,
      gameData,
      schoolProfile,
      rolePermissions,
    };
  };

  // Handle Download Full Backup JSON
  const handleDownloadJson = () => {
    try {
      setIsDownloading(true);
      const backupPayload = createFullBackupPayload();
      downloadFullSystemBackupJson(backupPayload);

      // Record last backup time
      const nowIso = new Date().toISOString();
      saveStoredLastBackupTime(nowIso);
      setLastBackupTime(nowIso);

      setToastMessage('File cadangan JSON berhasil diunduh dan waktu pencadangan telah dicatat.');
    } catch (err: any) {
      console.error('Download JSON error:', err);
      setToastMessage('Gagal mengunduh file cadangan JSON: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Download Multi-Sheet Excel
  const handleDownloadExcel = () => {
    try {
      setIsExcelDownloading(true);
      const backupPayload = createFullBackupPayload();
      downloadFullSystemBackupExcel(backupPayload);

      // Record last backup time
      const nowIso = new Date().toISOString();
      saveStoredLastBackupTime(nowIso);
      setLastBackupTime(nowIso);

      setToastMessage('Rekap arsip multi-sheet Excel berhasil diunduh.');
    } catch (err: any) {
      console.error('Download Excel error:', err);
      setToastMessage('Gagal mengunduh arsip Excel: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsExcelDownloading(false);
    }
  };

  // Process File when selected or dropped
  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedBackup(null);
    setRestoreSuccessSummary(null);

    if (!file.name.endsWith('.json')) {
      setParseError('Format file harus berupa file cadangan JSON (.json).');
      return;
    }

    try {
      const parsed = await parseFullBackupJson(file);
      setParsedBackup(parsed);
    } catch (err: any) {
      setParseError(err.message || 'Gagal membaca atau memvalidasi file JSON.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Apply Restored Data & Automatically Update System
  const handleApplyRestore = async () => {
    if (!parsedBackup || isRestoring) return;

    try {
      setIsRestoring(true);
      await Promise.resolve(onRestoreData(parsedBackup, restoreMode));

      setRestoreSuccessSummary({
        teachers: (parsedBackup.teachers || []).length,
        students: (parsedBackup.students || []).length,
        subjects: (parsedBackup.subjects || []).length,
        banks: (parsedBackup.banks || []).length,
        dailyGrades: (parsedBackup.dailyGrades || []).length,
        results: (parsedBackup.results || []).length,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });

      setToastMessage('Data berhasil diupload dan seluruh menu sistem telah diperbarui!');
      setParsedBackup(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      setParseError('Gagal memulihkan data: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in border border-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-[11px] mb-1">
                <Database className="w-3.5 h-3.5" />
                <span>Pencadangan & Pemulihan Sistem</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100">Backup & Upload Data</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Cadangkan seluruh data menu sistem ke file arsip, unduh kapan saja, dan perbarui data setelah file diupload
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors border border-slate-700 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>

        {/* Prominent Banner: Status & Waktu Terakhir Backup Data */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          lastBackupTime
            ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/30'
            : 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/30'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                lastBackupTime
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              }`}>
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Waktu Terakhir Backup Data:
                  </span>
                  {lastBackupTime ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tercadangkan {getRelativeTime(lastBackupTime) ? `(${getRelativeTime(lastBackupTime)})` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Belum Ada Cadangan
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-black text-slate-100">
                  {formatDateTime(lastBackupTime)}
                </div>
                <p className="text-xs text-slate-400">
                  {lastBackupTime
                    ? 'Data terakhir telah disimpan dengan aman. Anda dapat mengunduh salinan baru kapan saja sebelum melakukan perubahan besar.'
                    : 'Sangat disarankan untuk mengunduh cadangan data berkala agar seluruh data sekolah Anda tetap terlindungi.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownloadJson}
                disabled={isDownloading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Menyiapkan...' : 'Cadangkan Sekarang (JSON)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Restoration Summary Banner */}
        {restoreSuccessSummary && (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-4 animate-fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-black text-sm text-emerald-300">
                  Data Berhasil Diupload & Terbaharui Otomatis!
                </h4>
                <span className="text-[11px] text-emerald-400/80 font-semibold">
                  Diperbarui pada pukul {restoreSuccessSummary.timestamp} WIB
                </span>
              </div>
              <p className="text-emerald-300/90 leading-relaxed font-medium">
                Seluruh menu sistem di browser dan Cloud Firestore telah sinkron dengan data baru dari file yang diunggah.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-center font-bold">
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200">
                  <span className="text-xs block text-slate-400">Guru</span>
                  <span className="text-sm font-black">{restoreSuccessSummary.teachers}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200">
                  <span className="text-xs block text-slate-400">Siswa</span>
                  <span className="text-sm font-black">{restoreSuccessSummary.students}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200">
                  <span className="text-xs block text-slate-400">Mapel</span>
                  <span className="text-sm font-black">{restoreSuccessSummary.subjects}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200">
                  <span className="text-xs block text-slate-400">Bank Soal</span>
                  <span className="text-sm font-black">{restoreSuccessSummary.banks}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200">
                  <span className="text-xs block text-slate-400">Nilai Harian</span>
                  <span className="text-sm font-black">{restoreSuccessSummary.dailyGrades}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200">
                  <span className="text-xs block text-slate-400">Hasil Ujian</span>
                  <span className="text-sm font-black">{restoreSuccessSummary.results}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Grid: Section 1 (Backup & Unduh) & Section 2 (Upload Data) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* ===================== SECTION 1: CADANGKAN & UNDUH DATA SEMUA MENU ===================== */}
          <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">1. Cadangkan & Unduh Data</h3>
                <p className="text-xs text-slate-400">
                  Mencakup seluruh menu data master, paket bank soal, nilai, dan konfigurasi
                </p>
              </div>
            </div>

            {/* Inventory Data yang Disertakan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Daftar Data Menu yang Disertakan:</span>
                <span className="text-indigo-400">Semua Menu Tercakup (100%)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                    <Users className="w-3.5 h-3.5" />
                    <span>Data Guru</span>
                  </div>
                  <span className="text-lg font-black text-slate-100 block">{teachers.length}</span>
                  <span className="text-[10px] text-slate-500">Guru Terdaftar</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Data Siswa</span>
                  </div>
                  <span className="text-lg font-black text-slate-100 block">{students.length}</span>
                  <span className="text-[10px] text-slate-500">Siswa Aktif</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Mata Pelajaran</span>
                  </div>
                  <span className="text-lg font-black text-slate-100 block">{subjects.length}</span>
                  <span className="text-[10px] text-slate-500">Mapel Kurikulum</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold">
                    <Database className="w-3.5 h-3.5" />
                    <span>Bank Soal</span>
                  </div>
                  <span className="text-lg font-black text-slate-100 block">{banks.length}</span>
                  <span className="text-[10px] text-slate-500">{totalQuestions} Butir Soal</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>Nilai Harian</span>
                  </div>
                  <span className="text-lg font-black text-slate-100 block">{dailyGrades.length}</span>
                  <span className="text-[10px] text-slate-500">Rekap Penilaian</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                    <History className="w-3.5 h-3.5" />
                    <span>Hasil Ujian</span>
                  </div>
                  <span className="text-lg font-black text-slate-100 block">{results.length}</span>
                  <span className="text-[10px] text-slate-500">Riwayat CBT</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Game Edukasi</span>
                  </div>
                  <span className="text-lg font-black text-slate-100 block">{gameLogs.length}</span>
                  <span className="text-[10px] text-slate-500">Log Aktivitas</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-teal-400 text-xs font-bold">
                    <School className="w-3.5 h-3.5" />
                    <span>Profil & Akses</span>
                  </div>
                  <span className="text-xs font-black text-emerald-400 block pt-1">Tersertifikasi</span>
                  <span className="text-[10px] text-slate-500">Lengkap</span>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Unduh */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleDownloadJson}
                disabled={isDownloading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <FileJson className="w-4 h-4" />
                <span>
                  {isDownloading ? 'Sedang Menyiapkan Arsip...' : 'Unduh Cadangan Lengkap (.JSON)'}
                </span>
              </button>

              <button
                onClick={handleDownloadExcel}
                disabled={isExcelDownloading}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 hover:text-emerald-300 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 border border-emerald-500/30 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  {isExcelDownloading ? 'Membuat File Excel...' : 'Unduh Arsip Rekap Multi-Sheet (.XLSX)'}
                </span>
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                File .JSON digunakan untuk pemulihan (upload) data. File .XLSX digunakan untuk melihat dan mencetak data di Microsoft Excel.
              </p>
            </div>
          </div>

          {/* ===================== SECTION 2: UPLOAD & PULIHKAN DATA ===================== */}
          <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">2. Upload & Perbarui Data</h3>
                <p className="text-xs text-slate-400">
                  Unggah file cadangan JSON untuk memperbarui seluruh menu sistem secara langsung
                </p>
              </div>
            </div>

            {/* Hidden Input File */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-200">
                  Pilih atau Tarik (Drag & Drop) File Cadangan JSON
                </h4>
                <p className="text-xs text-slate-400">
                  Mendukung format arsip <strong>.json</strong> cadangan resmi CBT SDIT Al Hidayah Logam
                </p>
              </div>

              <span className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                Pilih File dari Komputer
              </span>
            </div>

            {/* Parse Error Notification */}
            {parseError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-start gap-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-rose-200">Gagal Memproses File:</span>
                  <span>{parseError}</span>
                </div>
              </div>
            )}

            {/* Pratinjau Data yang Terdeteksi dalam File Upload */}
            {parsedBackup && (
              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <FileCheck className="w-4 h-4" />
                    <span>File Terverifikasi Valid: {selectedFile?.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {parsedBackup.exportedAt ? new Date(parsedBackup.exportedAt).toLocaleDateString('id-ID') : 'Valid'}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    Isi Data yang Akan Diperbarui:
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Guru</span>
                      <strong className="text-slate-100 text-sm">{(parsedBackup.teachers || []).length} Orang</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Siswa</span>
                      <strong className="text-slate-100 text-sm">{(parsedBackup.students || []).length} Siswa</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Mata Pelajaran</span>
                      <strong className="text-slate-100 text-sm">{(parsedBackup.subjects || []).length} Mapel</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Bank Soal</span>
                      <strong className="text-slate-100 text-sm">{(parsedBackup.banks || []).length} Paket</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Nilai Harian</span>
                      <strong className="text-slate-100 text-sm">{(parsedBackup.dailyGrades || []).length} Nilai</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Hasil Ujian</span>
                      <strong className="text-slate-100 text-sm">{(parsedBackup.results || []).length} Sesi</strong>
                    </div>
                  </div>
                </div>

                {/* Mode Pilihan Restore */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Mode Pemulihan / Pembaruan Data:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        restoreMode === 'replace'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 font-black">
                        {restoreMode === 'replace' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>Timpa Seluruhnya (Full Replace)</span>
                      </div>
                      <p className="text-[11px] text-slate-400/90 font-normal">
                        Rekomendasi. Menyelaraskan seluruh data menu persis seperti isi file cadangan.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        restoreMode === 'merge'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 font-black">
                        {restoreMode === 'merge' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>Gabungkan (Merge)</span>
                      </div>
                      <p className="text-[11px] text-slate-400/90 font-normal">
                        Tambahkan data baru tanpa menghapus data yang telah ada di sistem saat ini.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Tombol Konfirmasi Terapkan */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setParsedBackup(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleApplyRestore}
                    disabled={isRestoring}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memperbarui Data Sistem...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Terapkan & Perbarui Data Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Cloud Sync Notice Card */}
        <div className="p-4 sm:p-5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <h5 className="font-bold text-slate-200">Keamanan & Sinkronisasi Dua Arah</h5>
            <p className="leading-relaxed">
              Pencadangan mencakup data internal sekolah SDIT Al Hidayah Logam. Setelah file cadangan diunggah, perubahan langsung disimpan ke browser lokal dan disinkronkan secara otomatis ke <strong>Cloud Firestore</strong> sehingga semua guru dan pengawas yang sedang login dapat mengakses data terbaru secara instan.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
