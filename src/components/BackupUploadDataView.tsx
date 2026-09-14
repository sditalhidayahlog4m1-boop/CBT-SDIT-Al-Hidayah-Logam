import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Trash2,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  FolderArchive,
  Save,
  HelpCircle,
  X,
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
  BackupArchiveItem,
} from '../types';
import {
  downloadFullSystemBackupJson,
  downloadFullSystemBackupExcel,
  parseFullBackupJson,
} from '../utils/exportImport';
import {
  getStoredLastBackupTime,
  saveStoredLastBackupTime,
  getStoredBackupArchives,
  saveStoredBackupArchives,
  addStoredBackupArchive,
  deleteStoredBackupArchive,
} from '../utils/storage';

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

  // Upload & Restore states (Section 2)
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

  // Backup Archives List state (Gambar 2 Concept)
  const [backupArchives, setBackupArchives] = useState<BackupArchiveItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals for Table Actions
  const [restoreTargetArchive, setRestoreTargetArchive] = useState<BackupArchiveItem | null>(null);
  const [tableRestoreMode, setTableRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [deleteTargetArchive, setDeleteTargetArchive] = useState<BackupArchiveItem | null>(null);
  const [newlyCreatedArchive, setNewlyCreatedArchive] = useState<BackupArchiveItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const totalQuestions = banks.reduce((acc, b) => acc + (b.questions?.length || 0), 0);

  // Helper: Format Date String to YYYYMMDDHHMMSS and YYYY-MM-DD HH:mm:ss
  const formatDateTimeStamp = (date: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return {
      stamp: `${yyyy}${mm}${dd}${hh}${min}${ss}`,
      display: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
    };
  };

  const calculateSizeKb = (obj: any): number => {
    try {
      const str = JSON.stringify(obj);
      const bytes = new Blob([str]).size;
      return parseFloat((bytes / 1024).toFixed(2));
    } catch {
      return 84.29;
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

  // Compile Database CBT only payload
  const createDbBackupPayload = (): FullBackupData => {
    const nowIso = new Date().toISOString();
    return {
      version: '1.0.0',
      appName: 'CBT SDIT Al Hidayah Logam',
      exportedAt: nowIso,
      schoolName: schoolProfile?.name || 'SDIT Al Hidayah Logam',
      systemDescription: 'Arsip Cadangan Database CBT (Data Master & Hasil Ujian) SDIT Al Hidayah Logam',
      teachers,
      students,
      subjects,
      banks,
      results,
      dailyGrades,
      gameLogs,
      gameData,
    };
  };

  // Initialize backup archives: load real stored backups only, permanently purge any default seed data
  useEffect(() => {
    const stored = getStoredBackupArchives();
    // Permanently remove any legacy default seed items
    const realOnly = (stored || []).filter((item) => item && typeof item.id === 'string' && !item.id.startsWith('seed-'));
    saveStoredBackupArchives(realOnly);
    setBackupArchives(realOnly);

    // If no real backups exist, clear any default/seed backup timestamp
    if (realOnly.length === 0) {
      try {
        const lastTime = localStorage.getItem('cbt_last_backup_time');
        if (lastTime && (lastTime.includes('2026-09-13') || lastTime.includes('seed'))) {
          localStorage.removeItem('cbt_last_backup_time');
          setLastBackupTime(null);
        }
      } catch {
        // ignore
      }
    }
  }, []);

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
      return (
        d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
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

  // ACTION: Backup DB (Database CBT) - Tampil di Layar Dulu
  const handleBackupDB = () => {
    try {
      setIsDownloading(true);
      const payload = createDbBackupPayload();
      const { stamp, display } = formatDateTimeStamp();
      const fileName = `CBTBackup_DB_121232040235_${stamp}.json`;
      const sizeKb = calculateSizeKb(payload);

      // Simpan ke repository arsip cadangan
      const newArchive: BackupArchiveItem = {
        id: `backup-${Date.now()}`,
        fileName,
        type: 'db',
        sizeKb,
        createdAt: new Date().toISOString(),
        formattedDate: display,
        itemCounts: {
          teachers: teachers.length,
          students: students.length,
          subjects: subjects.length,
          banks: banks.length,
          results: results.length,
          dailyGrades: dailyGrades.length,
        },
        payload,
      };

      const updated = addStoredBackupArchive(newArchive);
      setBackupArchives(updated);
      setCurrentPage(1); // Pastikan tabel menampilkan baris teratas

      // Perbarui Waktu Cadangan Terakhir
      const nowIso = new Date().toISOString();
      saveStoredLastBackupTime(nowIso);
      setLastBackupTime(nowIso);

      // Tampilkan hasil langsung di layar
      setNewlyCreatedArchive(newArchive);
      setToastMessage(`Snapshot Database (${fileName}) berhasil dibuat dan ditampilkan di layar!`);
    } catch (err: any) {
      console.error('Backup DB error:', err);
      setToastMessage('Gagal mencadangkan Database: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsDownloading(false);
    }
  };

  // ACTION: Backup Semua (Seluruh Sistem) - Tampil di Layar Dulu
  const handleBackupSemua = () => {
    try {
      setIsDownloading(true);
      const payload = createFullBackupPayload();
      const { stamp, display } = formatDateTimeStamp();
      const fileName = `CBTBackup_121232040235_${stamp}.json`;
      const sizeKb = calculateSizeKb(payload);

      // Simpan ke repository arsip cadangan
      const newArchive: BackupArchiveItem = {
        id: `backup-${Date.now()}`,
        fileName,
        type: 'all',
        sizeKb,
        createdAt: new Date().toISOString(),
        formattedDate: display,
        itemCounts: {
          teachers: teachers.length,
          students: students.length,
          subjects: subjects.length,
          banks: banks.length,
          results: results.length,
          dailyGrades: dailyGrades.length,
        },
        payload,
      };

      const updated = addStoredBackupArchive(newArchive);
      setBackupArchives(updated);
      setCurrentPage(1); // Pastikan tabel menampilkan baris teratas

      // Perbarui Waktu Cadangan Terakhir
      const nowIso = new Date().toISOString();
      saveStoredLastBackupTime(nowIso);
      setLastBackupTime(nowIso);

      // Tampilkan hasil langsung di layar
      setNewlyCreatedArchive(newArchive);
      setToastMessage(`Snapshot Semua Data (${fileName}) berhasil dibuat dan ditampilkan di layar!`);
    } catch (err: any) {
      console.error('Backup Semua error:', err);
      setToastMessage('Gagal mencadangkan Semua Data: ' + (err?.message || 'Terjadi kesalahan'));
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

      const nowIso = new Date().toISOString();
      saveStoredLastBackupTime(nowIso);
      setLastBackupTime(nowIso);

      setToastMessage('Rekap arsip multi-sheet Excel (.xlsx) berhasil diunduh.');
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

  // Apply Restored Data from File Upload
  const handleApplyRestore = async () => {
    if (!parsedBackup || isRestoring) return;

    try {
      setIsRestoring(true);
      await Promise.resolve(onRestoreData(parsedBackup, restoreMode));

      // Also register into Backup Archives if not already there
      const sizeKb = selectedFile ? parseFloat((selectedFile.size / 1024).toFixed(2)) : calculateSizeKb(parsedBackup);
      const fileName = selectedFile?.name || `CBTBackup_Upload_${Date.now()}.json`;
      const { display } = formatDateTimeStamp();

      const newArchive: BackupArchiveItem = {
        id: `upload-${Date.now()}`,
        fileName,
        type: parsedBackup.schoolProfile ? 'all' : 'db',
        sizeKb,
        createdAt: new Date().toISOString(),
        formattedDate: display,
        itemCounts: {
          teachers: (parsedBackup.teachers || []).length,
          students: (parsedBackup.students || []).length,
          subjects: (parsedBackup.subjects || []).length,
          banks: (parsedBackup.banks || []).length,
          results: (parsedBackup.results || []).length,
          dailyGrades: (parsedBackup.dailyGrades || []).length,
        },
        payload: parsedBackup,
      };

      const updated = addStoredBackupArchive(newArchive);
      setBackupArchives(updated);

      setRestoreSuccessSummary({
        teachers: (parsedBackup.teachers || []).length,
        students: (parsedBackup.students || []).length,
        subjects: (parsedBackup.subjects || []).length,
        banks: (parsedBackup.banks || []).length,
        dailyGrades: (parsedBackup.dailyGrades || []).length,
        results: (parsedBackup.results || []).length,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });

      setToastMessage('Data berhasil dipulihkan dan seluruh menu sistem telah diperbarui!');
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

  // Restore directly from Table row snapshot (Concept Image 2)
  const handleExecuteTableRestore = async () => {
    if (!restoreTargetArchive || isRestoring) return;

    try {
      setIsRestoring(true);
      await Promise.resolve(onRestoreData(restoreTargetArchive.payload, tableRestoreMode));

      setRestoreSuccessSummary({
        teachers: (restoreTargetArchive.payload.teachers || []).length,
        students: (restoreTargetArchive.payload.students || []).length,
        subjects: (restoreTargetArchive.payload.subjects || []).length,
        banks: (restoreTargetArchive.payload.banks || []).length,
        dailyGrades: (restoreTargetArchive.payload.dailyGrades || []).length,
        results: (restoreTargetArchive.payload.results || []).length,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });

      setToastMessage(`Sistem berhasil dipulihkan dari arsip ${restoreTargetArchive.fileName}!`);
      setRestoreTargetArchive(null);
    } catch (err: any) {
      console.error('Table restore error:', err);
      setToastMessage('Gagal memulihkan data: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete archive from Table permanently
  const handleExecuteTableDelete = () => {
    if (!deleteTargetArchive) return;
    const updated = deleteStoredBackupArchive(deleteTargetArchive.id);
    setBackupArchives(updated);
    if (newlyCreatedArchive?.id === deleteTargetArchive.id) {
      setNewlyCreatedArchive(null);
    }
    if (updated.length === 0) {
      try {
        localStorage.removeItem('cbt_last_backup_time');
      } catch {
        // ignore
      }
      setLastBackupTime(null);
    }
    setToastMessage(`Arsip cadangan ${deleteTargetArchive.fileName} telah dihapus permanen dan tidak akan kembali lagi.`);
    setDeleteTargetArchive(null);
  };

  // Download specific archive from Table
  const handleDownloadArchiveItem = (item: BackupArchiveItem) => {
    downloadFullSystemBackupJson(item.payload, item.fileName);
    setToastMessage(`File ${item.fileName} sedang diunduh.`);
  };

  // Scroll smoothly to restore/upload zone
  const handleScrollToRestoreZone = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 400);
  };

  // Filter & Pagination for Table (Image 2 Concept)
  const filteredArchives = useMemo(() => {
    if (!searchTerm.trim()) return backupArchives;
    const term = searchTerm.toLowerCase();
    return backupArchives.filter(
      (item) =>
        item.fileName.toLowerCase().includes(term) ||
        item.formattedDate.toLowerCase().includes(term) ||
        (item.type === 'db' ? 'database cbt db' : 'semua data all').includes(term)
    );
  }, [backupArchives, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredArchives.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedArchives = useMemo(() => {
    const startIndex = (validPage - 1) * pageSize;
    return filteredArchives.slice(startIndex, startIndex + pageSize);
  }, [filteredArchives, validPage, pageSize]);

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

        {/* Prominent Banner: Status & Waktu Terakhir Backup Data + Image 2 Concept Action Buttons */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border transition-all ${
            lastBackupTime
              ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/30'
              : 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/30'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  lastBackupTime
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                }`}
              >
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    WAKTU TERAKHIR BACKUP DATA:
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
                <span className="text-indigo-400 font-semibold">Semua Menu Tercakup (100%)</span>
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

            {/* Tombol Unduh Rekap Excel & Informasi Cadangan */}
            <div className="space-y-3 pt-2">
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

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Pembuatan file cadangan sistem (.JSON) dapat dilakukan langsung melalui tombol <strong>Backup DB</strong> dan <strong>Backup Semua</strong> pada tabel riwayat di bawah.
              </p>
            </div>
          </div>

          {/* ===================== SECTION 2: UPLOAD & PULIHKAN DATA ===================== */}
          <div
            ref={uploadSectionRef}
            className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-6"
          >
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

        {/* ===================== SECTION 3: TABEL DAFTAR ARSIP CADANGAN (KONSEP GAMBAR 2) ===================== */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-xl">
          {/* Header & Table Action Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black text-slate-100">Backup/Restore</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Master Data & Riwayat Snapshot Arsip Cadangan</p>
            </div>

            {/* Quick Action Buttons (Matching Gambar 2: Restore, Backup DB, Backup Semua) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleScrollToRestoreZone}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Unggah file cadangan untuk memulihkan"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>

              <button
                onClick={handleBackupDB}
                disabled={isDownloading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Cadangkan Database"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Backup DB</span>
              </button>

              <button
                onClick={handleBackupSemua}
                disabled={isDownloading}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Cadangkan Semua Data"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Backup Semua</span>
              </button>
            </div>
          </div>

          {/* Table Controls (Show Entries & Search - Seperti Gambar 2) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Search:</span>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari nama file / tanggal..."
                  className="bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container (Persis Struktur Kolom Gambar 2: No, Nama Backup, Ukuran, Tanggal, Aksi) */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300 font-bold">
                  <th className="py-3 px-3.5 w-14 text-center">
                    <span className="inline-flex items-center gap-1">
                      No <span>▲</span>
                    </span>
                  </th>
                  <th className="py-3 px-4 min-w-[280px]">Nama Backup</th>
                  <th className="py-3 px-4 w-28">Ukuran</th>
                  <th className="py-3 px-4 min-w-[170px]">Tanggal</th>
                  <th className="py-3 px-4 w-44 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {paginatedArchives.length > 0 ? (
                  paginatedArchives.map((item, index) => {
                    const rowNumber = (validPage - 1) * pageSize + index + 1;
                    const isNewlyCreated = newlyCreatedArchive?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors text-slate-300 ${
                          isNewlyCreated
                            ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500 hover:bg-indigo-950/60'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-bold">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                item.type === 'db'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {item.type === 'db' ? 'DB' : 'SEMUA'}
                            </span>
                            <span className="truncate hover:text-white cursor-default" title={item.fileName}>
                              {item.fileName}
                            </span>
                            {isNewlyCreated && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                Baru di Layar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {item.sizeKb.toFixed(2)} KB
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {item.formattedDate}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {/* Aksi Buttons (Gambar 2: Download, Restore, Del) */}
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleDownloadArchiveItem(item)}
                              className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              title="Unduh file cadangan ini ke komputer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </button>

                            <button
                              onClick={() => {
                                setRestoreTargetArchive(item);
                                setTableRestoreMode('replace');
                              }}
                              className="px-2 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              title="Pulihkan sistem ke titik cadangan ini"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span className="hidden sm:inline">Restore</span>
                            </button>

                            <button
                              onClick={() => setDeleteTargetArchive(item)}
                              className="px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              title="Hapus file cadangan ini dari riwayat"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Del</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      {searchTerm
                        ? `Tidak ditemukan arsip cadangan dengan kata kunci "${searchTerm}".`
                        : 'Belum ada arsip cadangan data.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Counter (Seperti Gambar 2: Showing 1 to 4 of 4 entries) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-1">
            <div>
              {filteredArchives.length > 0 ? (
                <span>
                  Showing {(validPage - 1) * pageSize + 1} to{' '}
                  {Math.min(validPage * pageSize, filteredArchives.length)} of {filteredArchives.length} entries
                </span>
              ) : (
                <span>Showing 0 to 0 of 0 entries</span>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validPage <= 1}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage <= 1}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, validPage - 3), Math.min(totalPages, validPage + 2))
                .map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                      validPage === pageNum
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage >= totalPages}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={validPage >= totalPages}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              >
                Last
              </button>
            </div>
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
              Pencadangan mencakup seluruh data internal sekolah SDIT Al Hidayah Logam. Setelah file cadangan diunggah atau dipulihkan, perubahan langsung disimpan ke browser lokal dan disinkronkan secara otomatis ke <strong>Cloud Firestore</strong> sehingga semua guru dan pengawas yang sedang login dapat mengakses data terbaru secara instan.
            </p>
          </div>
        </div>

      </div>

      {/* ===================== MODAL KONFIRMASI RESTORE DARI DAFTAR (GAMBAR 2) ===================== */}
      {restoreTargetArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#0f172a] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Pulihkan Data Cadangan</h3>
                  <p className="text-xs text-slate-400">Restore snapshot sistem ke titik waktu ini</p>
                </div>
              </div>
              <button
                onClick={() => setRestoreTargetArchive(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nama File:</span>
                <span className="font-mono font-bold text-slate-200 truncate max-w-[240px]">
                  {restoreTargetArchive.fileName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tanggal Snapshot:</span>
                <span className="font-mono text-emerald-400">{restoreTargetArchive.formattedDate} WIB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ukuran:</span>
                <span className="font-mono text-slate-300">{restoreTargetArchive.sizeKb.toFixed(2)} KB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tipe Cadangan:</span>
                <span className="font-bold text-indigo-300">
                  {restoreTargetArchive.type === 'db' ? 'Database CBT (Master & Ujian)' : 'Semua Data Sistem'}
                </span>
              </div>
            </div>

            {/* Mode Pemulihan */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 block">Pilih Mode Pemulihan:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTableRestoreMode('replace')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    tableRestoreMode === 'replace'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold">
                    {tableRestoreMode === 'replace' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Timpa Penuh (Replace)</span>
                  </div>
                  <p className="text-[11px] text-slate-400/90 font-normal">
                    Mengganti seluruh data saat ini agar persis sama dengan snapshot ini.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTableRestoreMode('merge')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    tableRestoreMode === 'merge'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold">
                    {tableRestoreMode === 'merge' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Gabungkan (Merge)</span>
                  </div>
                  <p className="text-[11px] text-slate-400/90 font-normal">
                    Menambahkan data dari snapshot tanpa menghapus data yang ada sekarang.
                  </p>
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Tindakan ini akan memperbarui data guru, siswa, mapel, bank soal, dan hasil ujian di sistem. Pastikan Anda telah mengunduh cadangan terkini jika diperlukan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreTargetArchive(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteTableRestore}
                disabled={isRestoring}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memulihkan...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Ya, Pulihkan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL KONFIRMASI HAPUS ARSIP CADANGAN ===================== */}
      {deleteTargetArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-base">Hapus Permanen File Cadangan</h3>
                <p className="text-xs text-slate-400">Hapus arsip secara permanen dari sistem</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus file cadangan{' '}
              <strong className="text-rose-300 font-mono">{deleteTargetArchive.fileName}</strong> secara permanen? File yang dihapus tidak akan kembali lagi ke dalam riwayat sistem.
            </p>
            <p className="text-[11px] text-slate-500">
              Catatan: File cadangan yang sudah pernah Anda unduh ke perangkat Anda tidak akan terpengaruh.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetArchive(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteTableDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL PRATINJAU HASIL CADANGAN (TAMPIL DI LAYAR) ===================== */}
      {newlyCreatedArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#0f172a] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-indigo-500/30 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-100 text-base sm:text-lg">Cadangan Berhasil Dibuat</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                      Tampil di Layar
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Snapshot data telah tercatat pada daftar riwayat</p>
                </div>
              </div>
              <button
                onClick={() => setNewlyCreatedArchive(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 font-sans text-xs">Nama File:</span>
                <span className="text-indigo-300 font-bold break-all text-right select-all">
                  {newlyCreatedArchive.fileName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans text-xs">Tipe Cadangan:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    newlyCreatedArchive.type === 'db'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {newlyCreatedArchive.type === 'db' ? 'Database CBT' : 'Semua Data (Full System)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans text-xs">Ukuran File:</span>
                <span className="text-slate-200 font-bold">{newlyCreatedArchive.sizeKb.toFixed(2)} KB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans text-xs">Waktu Pembuatan:</span>
                <span className="text-slate-200">{newlyCreatedArchive.formattedDate}</span>
              </div>
            </div>

            {/* Rincian data tercakup */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block">Rincian Data yang Dicadangkan:</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Guru</span>
                  <span className="font-bold text-slate-200">{newlyCreatedArchive.itemCounts.teachers}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Siswa</span>
                  <span className="font-bold text-slate-200">{newlyCreatedArchive.itemCounts.students}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Mapel</span>
                  <span className="font-bold text-slate-200">{newlyCreatedArchive.itemCounts.subjects}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Bank Soal</span>
                  <span className="font-bold text-slate-200">{newlyCreatedArchive.itemCounts.banks}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Nilai Harian</span>
                  <span className="font-bold text-slate-200">{newlyCreatedArchive.itemCounts.dailyGrades}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Hasil Ujian</span>
                  <span className="font-bold text-slate-200">{newlyCreatedArchive.itemCounts.results}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Snapshot ini telah ditampilkan pada baris teratas tabel <strong>Backup/Restore</strong> di bawah. Anda dapat membiarkannya tersimpan di sistem, atau mengunduhnya ke komputer kapan pun diperlukan.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewlyCreatedArchive(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Tutup Pratinjau
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownloadArchiveItem(newlyCreatedArchive);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File (.JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
