import React, { useState, useMemo } from 'react';
import { History, Download, Eye, Search, Trash2, Award, CheckCircle2, XCircle, Filter, BookOpen, GraduationCap, User } from 'lucide-react';
import { ExamResult, QuestionBank, AuthUser } from '../types';
import { exportExamResultsExcel } from '../utils/exportImport';
import { deleteExamResultFromFirestore, clearAllExamResultsInFirestore } from '../utils/firebaseSync';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';
import { useHistoryModal } from '../utils/navigationHistory';

interface ExamHistoryViewProps {
  results: ExamResult[];
  setResults: React.Dispatch<React.SetStateAction<ExamResult[]>>;
  banks: QuestionBank[];
  currentUser?: AuthUser | null;
}

export const ExamHistoryView: React.FC<ExamHistoryViewProps> = ({
  results,
  setResults,
  banks,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  // Synchronize Exam Result Detail modal with browser history
  useHistoryModal({
    modalId: 'exam-result-detail-modal',
    isOpen: Boolean(selectedResult),
    onClose: () => setSelectedResult(null),
    tab: 'riwayat-ujian',
  });

  // Determine if the logged-in user is a student
  const isStudent = currentUser?.role === 'siswa' || (currentUser as any)?.role === 'student';
  const currentStudentId = currentUser?.id || currentUser?.details?.id || (currentUser as any)?.studentId || currentUser?.username;
  const currentStudentName = currentUser?.name?.trim().toLowerCase();
  const currentStudentClass = currentUser?.details && 'classRoom' in currentUser.details ? currentUser.details.classRoom : '';

  // Filter exam results based on role:
  // - Siswa: only their own exam records
  // - Guru / Admin: all exam records
  const roleFilteredResults = useMemo(() => {
    if (!currentUser) return results;

    if (isStudent) {
      return results.filter((result) => {
        // 1. Direct match by studentId or userId
        if (currentStudentId && (result.studentId === currentStudentId || result.userId === currentStudentId)) {
          return true;
        }
        // 2. Fallback match by student name (case-insensitive) for older or name-based results
        if (currentStudentName && result.studentName?.trim().toLowerCase() === currentStudentName) {
          return true;
        }
        // 3. Fallback match by username
        if (currentUser.username && (result.studentId === currentUser.username || result.userId === currentUser.username)) {
          return true;
        }
        return false;
      });
    }

    // Guru & Admin: show all records
    return results;
  }, [results, currentUser, isStudent, currentStudentId, currentStudentName]);

  // Quick statistics for student personal summary
  const studentStats = useMemo(() => {
    if (!isStudent || roleFilteredResults.length === 0) return null;
    const totalExams = roleFilteredResults.length;
    const totalScore = roleFilteredResults.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const avgScore = Math.round(totalScore / totalExams);
    const passedCount = roleFilteredResults.filter((r) => r.passed).length;
    const remedialCount = totalExams - passedCount;
    return { totalExams, avgScore, passedCount, remedialCount };
  }, [isStudent, roleFilteredResults]);

  // Derived list of unique classes from role-filtered results
  const uniqueClasses = useMemo(() => {
    const classNames: string[] = roleFilteredResults
      .map((r) => r.classRoom?.trim())
      .filter((cls): cls is string => Boolean(cls));
    const setList: string[] = Array.from(new Set(classNames));
    return setList.sort((a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [roleFilteredResults]);

  // Derived list of unique subjects from role-filtered results
  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(roleFilteredResults.map((r) => r.subject.trim()))).filter(Boolean);
  }, [roleFilteredResults]);

  // Search, Class & Subject Filter applied on role-filtered data
  const filtered = useMemo(() => {
    return roleFilteredResults.filter((r) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = isStudent
        ? r.subject.toLowerCase().includes(searchLower) ||
          r.token.toLowerCase().includes(searchLower) ||
          (r.examTitle && r.examTitle.toLowerCase().includes(searchLower))
        : r.studentName.toLowerCase().includes(searchLower) ||
          r.subject.toLowerCase().includes(searchLower) ||
          (r.classRoom && r.classRoom.toLowerCase().includes(searchLower)) ||
          r.token.toLowerCase().includes(searchLower) ||
          (r.examTitle && r.examTitle.toLowerCase().includes(searchLower));

      const matchesSubject = selectedSubject === 'ALL' || r.subject.trim() === selectedSubject;
      const matchesClass = selectedClass === 'ALL' || (r.classRoom && r.classRoom.trim() === selectedClass);
      return matchesSearch && matchesSubject && matchesClass;
    });
  }, [roleFilteredResults, searchTerm, selectedSubject, selectedClass, isStudent]);

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ExamResult | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
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

  const handleDeleteClick = (result: ExamResult) => {
    // Only teachers/admins are allowed to delete
    if (isStudent) return;
    setDeleteConfirmTarget(result);
  };

  const executeDelete = async () => {
    if (!deleteConfirmTarget) return;
    const studentName = deleteConfirmTarget.studentName;
    const targetId = deleteConfirmTarget.id;
    setResults((prev) => prev.filter((r) => r.id !== targetId));
    await deleteExamResultFromFirestore(targetId);
    if (selectedResult?.id === targetId) setSelectedResult(null);
    setDeleteConfirmTarget(null);
    addToast('success', `Riwayat ujian "${studentName}" berhasil dihapus permanen dari Firebase.`, 'Berhasil Dihapus');
  };

  const executeClearAll = async () => {
    // Only teachers/admins are allowed to clear all
    if (isStudent) return;
    setResults([]);
    await clearAllExamResultsInFirestore();
    setShowClearAllModal(false);
    setSelectedResult(null);
    addToast('success', 'Seluruh data riwayat ujian siswa berhasil dikosongkan permanen dari Firebase.', 'Berhasil Dikosongkan');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Student Personal Banner (Only rendered when logged in as Siswa) */}
      {isStudent && (
        <div className="bg-gradient-to-r from-slate-900 via-[#0f172a] to-indigo-950/70 border border-indigo-500/30 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  <span>Siswa Aktif</span>
                </span>
                {currentUser?.username && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    NIS/NISN: {currentUser.username}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>Riwayat & Nilai Ujian Saya</span>
              </h2>
              <p className="text-xs text-slate-400">
                Nama Siswa:{' '}
                <span className="font-bold text-slate-100">{currentUser?.name}</span>
                {currentStudentClass && (
                  <>
                    {' '}• Kelas:{' '}
                    <span className="font-bold text-indigo-300">{currentStudentClass}</span>
                  </>
                )}
              </p>
            </div>

            {/* Student Personal Statistics Cards */}
            {studentStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center min-w-[75px]">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Ujian</div>
                  <div className="text-lg font-black text-slate-100">{studentStats.totalExams}</div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center min-w-[75px]">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Rata-rata</div>
                  <div className="text-lg font-black text-indigo-300">{studentStats.avgScore}</div>
                </div>
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3 text-center min-w-[75px]">
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase">Lulus</div>
                  <div className="text-lg font-black text-emerald-400">{studentStats.passedCount}</div>
                </div>
                <div className="bg-slate-950/80 border border-rose-500/30 rounded-2xl p-3 text-center min-w-[75px]">
                  <div className="text-[10px] text-rose-400 font-semibold uppercase">Remedial</div>
                  <div className="text-lg font-black text-rose-400">{studentStats.remedialCount}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5">
                Belum ada riwayat ujian yang pernah diselesaikan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Header & Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={
                isStudent
                  ? 'Cari mata pelajaran, judul ujian, atau token...'
                  : 'Cari nama siswa, mapel, atau kelas...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Kelas Dropdown (Especially for Guru & Admin, but also available whenever classes exist) */}
          {!isStudent && uniqueClasses.length > 0 && (
            <div className="relative w-full sm:w-56">
              <GraduationCap className="w-3.5 h-3.5 absolute left-3 top-3 text-emerald-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-emerald-200 font-semibold focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Kelas ({roleFilteredResults.length})</option>
                {uniqueClasses.map((cls) => {
                  const count = roleFilteredResults.filter((r) => r.classRoom?.trim() === cls).length;
                  return (
                    <option key={cls} value={cls}>
                      {cls} ({count} {count === 1 ? 'ujian' : 'ujian'})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Filter Mapel Dropdown */}
          <div className="relative w-full sm:w-56">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-3 text-indigo-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-indigo-200 font-semibold focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Mata Pelajaran ({roleFilteredResults.length})</option>
              {uniqueSubjects.map((subj) => {
                const count = roleFilteredResults.filter((r) => r.subject.trim() === subj).length;
                return (
                  <option key={subj} value={subj}>
                    {subj} ({count} {isStudent ? 'ujian' : 'siswa'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reset Filters button if any filter is active */}
          {(selectedClass !== 'ALL' || selectedSubject !== 'ALL' || searchTerm.trim()) && (
            <button
              onClick={() => {
                setSelectedClass('ALL');
                setSelectedSubject('ALL');
                setSearchTerm('');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 shrink-0 cursor-pointer"
              title="Reset semua filter dan pencarian"
            >
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Action Buttons: Only shown for Guru & Admin */}
        {!isStudent ? (
          <div className="flex flex-wrap items-center gap-2">
            {selectedSubject !== 'ALL' && (
              <button
                onClick={() => exportExamResultsExcel(roleFilteredResults, selectedSubject, selectedClass)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors shrink-0 cursor-pointer"
                title={`Export khusus rekap ${selectedSubject}${selectedClass !== 'ALL' ? ` Kelas ${selectedClass}` : ''}`}
              >
                <Download className="w-4 h-4" />
                <span>
                  Export {selectedSubject}
                  {selectedClass !== 'ALL' ? ` (${selectedClass})` : ''}
                </span>
              </button>
            )}

            <button
              onClick={() => exportExamResultsExcel(roleFilteredResults, 'ALL', selectedClass)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors shrink-0 cursor-pointer"
              title="Export rekap semua nilai per mapel ke format Excel"
            >
              <Download className="w-4 h-4" />
              <span>
                Export Excel Rekap {selectedClass !== 'ALL' ? `Kelas ${selectedClass}` : 'Per Mapel'}
              </span>
            </button>

            {roleFilteredResults.length > 0 && (
              <button
                onClick={() => setShowClearAllModal(true)}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                title="Kosongkan seluruh riwayat ujian secara permanen dari Firebase"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Riwayat</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold px-3 py-1.5 bg-slate-800/60 rounded-xl border border-slate-700/60 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {filtered.length} dari {roleFilteredResults.length} Ujian
            </span>
          </div>
        )}
      </div>

      {/* Quick Class Tabs Filter Pills (For Guru & Admin) */}
      {!isStudent && uniqueClasses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> Filter Kelas:
          </span>
          <button
            onClick={() => setSelectedClass('ALL')}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              selectedClass === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Semua ({roleFilteredResults.length})
          </button>
          {uniqueClasses.map((cls) => {
            const count = roleFilteredResults.filter((r) => r.classRoom?.trim() === cls).length;
            const isSelected = selectedClass === cls;
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                {cls} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Subject Tabs Filter Pills */}
      {uniqueSubjects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Filter Mapel:
          </span>
          <button
            onClick={() => setSelectedSubject('ALL')}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              selectedSubject === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Semua ({roleFilteredResults.length})
          </button>
          {uniqueSubjects.map((subj) => {
            const count = roleFilteredResults.filter((r) => r.subject.trim() === subj).length;
            const isSelected = selectedSubject === subj;
            return (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                {subj} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Active Filter Chips indicator */}
      {!isStudent && (selectedClass !== 'ALL' || selectedSubject !== 'ALL' || searchTerm.trim()) && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Filter Aktif:</span>
          {selectedClass !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold">
              <GraduationCap className="w-3 h-3 text-emerald-400" />
              <span>Kelas: {selectedClass}</span>
              <button
                onClick={() => setSelectedClass('ALL')}
                className="hover:text-emerald-100 cursor-pointer ml-0.5"
                title="Hapus filter kelas"
              >
                ✕
              </button>
            </span>
          )}
          {selectedSubject !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
              <BookOpen className="w-3 h-3 text-indigo-400" />
              <span>Mapel: {selectedSubject}</span>
              <button
                onClick={() => setSelectedSubject('ALL')}
                className="hover:text-indigo-100 cursor-pointer ml-0.5"
                title="Hapus filter mapel"
              >
                ✕
              </button>
            </span>
          )}
          {searchTerm.trim() && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold">
              <Search className="w-3 h-3 text-slate-400" />
              <span>Kata kunci: "{searchTerm}"</span>
              <button
                onClick={() => setSearchTerm('')}
                className="hover:text-white cursor-pointer ml-0.5"
                title="Hapus kata kunci"
              >
                ✕
              </button>
            </span>
          )}
          <span className="text-[11px] text-slate-400 ml-auto">
            Menampilkan <strong className="text-slate-100">{filtered.length}</strong> dari {roleFilteredResults.length} data
          </span>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">Tanggal & Waktu</th>
                {/* For Teachers/Admins: show Student Name and Class */}
                {!isStudent && (
                  <>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Kelas</th>
                  </>
                )}
                <th className="p-3.5">Mata Pelajaran</th>
                {isStudent && <th className="p-3.5">Token</th>}
                <th className="p-3.5 text-center">Nilai Akhir</th>
                <th className="p-3.5 text-center">Waktu Pengerjaan</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">{r.date}</td>
                  {/* For Teachers/Admins: display student name & class */}
                  {!isStudent && (
                    <>
                      <td className="p-3.5 font-bold text-slate-100">{r.studentName}</td>
                      <td className="p-3.5 text-slate-400">{r.classRoom}</td>
                    </>
                  )}
                  <td className="p-3.5">
                    <span className="font-bold text-indigo-400 block">{r.subject}</span>
                    {r.examTitle && r.examTitle !== r.subject && (
                      <span className="text-[11px] text-slate-400 block">{r.examTitle}</span>
                    )}
                  </td>
                  {isStudent && (
                    <td className="p-3.5 font-mono text-[11px] text-slate-400">{r.token}</td>
                  )}
                  <td className="p-3.5 text-center font-black text-indigo-300 text-sm">
                    {r.score}
                  </td>
                  <td className="p-3.5 text-center text-slate-400">{r.durationSpent}</td>
                  <td className="p-3.5 text-center">
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
                  <td className="p-3.5 text-center space-x-1">
                    <button
                      onClick={() => setSelectedResult(r)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors border border-slate-700 cursor-pointer"
                      title="Lihat Detail Jawaban"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete button is ONLY rendered for Guru and Admin */}
                    {!isStudent && (
                      <button
                        onClick={() => handleDeleteClick(r)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md transition-colors border border-rose-500/20 cursor-pointer"
                        title="Hapus Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={isStudent ? 7 : 9}
                    className="p-8 text-center text-slate-500 text-xs"
                  >
                    {isStudent
                      ? 'Belum ada data riwayat ujian yang sesuai pencarian atau filter.'
                      : `Belum ada riwayat ujian siswa yang sesuai filter${selectedClass !== 'ALL' ? ` Kelas "${selectedClass}"` : ''}${selectedSubject !== 'ALL' ? ` Mapel "${selectedSubject}"` : ''}${searchTerm.trim() ? ` dengan pencarian "${searchTerm}"` : ''}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-800">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-3xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Tanggal: {selectedResult.date}
                </span>
                <h3 className="text-base font-black text-slate-100 mt-1">{selectedResult.studentName}</h3>
                <p className="text-xs text-slate-400">
                  {selectedResult.subject} ({selectedResult.classRoom}) • Token: {selectedResult.token}
                </p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Score Summary */}
              <div className="p-4 bg-slate-950 border border-slate-800 text-white rounded-2xl flex items-center justify-around shadow-md">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Nilai</span>
                  <span className="text-3xl font-black text-emerald-400 block">{selectedResult.score}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Benar / Salah</span>
                  <span className="text-sm font-bold block text-slate-200">
                    {selectedResult.correctCount} / {selectedResult.wrongCount}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Durasi</span>
                  <span className="text-sm font-bold block text-slate-200">{selectedResult.durationSpent}</span>
                </div>
              </div>

              {/* Question Review Details */}
              {(() => {
                const bank = banks.find((b) => b.id === selectedResult.bankId);
                if (!bank) {
                  return <p className="text-slate-500 text-center py-4">Paket soal asli telah dihapus.</p>;
                }

                return bank.questions.map((q, idx) => {
                  const userAns = selectedResult.answers[idx];
                  const isEssay = q.type === 'esai';

                  if (isEssay) {
                    const hasAnswer = userAns && userAns.trim().length > 0;
                    return (
                      <div key={q.id} className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-200 flex items-center gap-2">
                            <span>Soal #{idx + 1}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                              Esai (Uraian)
                            </span>
                          </span>
                          <span className={hasAnswer ? 'text-emerald-400' : 'text-amber-400'}>
                            {hasAnswer ? '✓ Terjawab' : 'Belum Dijawab'}
                          </span>
                        </div>
                        <p className="text-slate-200 font-medium whitespace-pre-wrap">{q.question_text}</p>
                        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Jawaban Siswa:
                          </span>
                          <p className="text-slate-200 text-xs italic whitespace-pre-wrap">
                            {userAns || '(Tidak ada jawaban tertulis)'}
                          </p>
                        </div>
                        {q.essayAnswerKey && (
                          <div className="bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                              Kunci / Rubrik Esai:
                            </span>
                            <p className="text-emerald-300 text-xs whitespace-pre-wrap">{q.essayAnswerKey}</p>
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-[11px] text-amber-200 bg-amber-500/10 p-2 rounded border border-amber-500/20 italic">
                            Pembahasan: {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  }

                  // Multiple Choice Question Review
                  const correctOpt = q.options.find((o) => o.is_correct);
                  const isCorrect = correctOpt && userAns === correctOpt.option_letter;

                  return (
                    <div key={q.id} className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-200">Soal #{idx + 1}</span>
                        <span className={isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                          {isCorrect ? '✓ Benar' : `✗ Salah (Dipilih: ${userAns || '-'})`}
                        </span>
                      </div>
                      <p className="text-slate-200 font-medium">{q.question_text}</p>
                      <p className="text-emerald-400 font-bold">
                        Kunci: {correctOpt ? `${correctOpt.option_letter}. ${correctOpt.option_text}` : '-'}
                      </p>
                      {q.explanation && (
                        <p className="text-[11px] text-amber-200 bg-amber-500/10 p-2 rounded border border-amber-500/20 italic">
                          Pembahasan: {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950 rounded-b-3xl">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Single Record */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title="Hapus Riwayat Ujian"
        message={`Apakah Anda yakin ingin menghapus data riwayat ujian milik "${deleteConfirmTarget?.studentName}"? Tindakan ini akan menghapus data secara permanen dari database Firebase Firestore.`}
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Confirmation Modal - Clear All Records */}
      <ConfirmModal
        isOpen={showClearAllModal}
        title="Kosongkan Seluruh Riwayat Ujian"
        message="Apakah Anda yakin ingin mengosongkan seluruh riwayat ujian siswa? Seluruh data hasil ujian akan dihapus secara permanen dari database Firebase Firestore dan tidak dapat dikembalikan."
        confirmText="Ya, Kosongkan Semua"
        cancelText="Batal"
        type="danger"
        onConfirm={executeClearAll}
        onCancel={() => setShowClearAllModal(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
