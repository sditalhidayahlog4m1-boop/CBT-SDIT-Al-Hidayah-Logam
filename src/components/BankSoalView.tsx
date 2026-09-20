import React, { useState, useMemo } from 'react';
import { Database, Search, Eye, Edit2, Edit3, Trash2, Key, Download, BookOpen, Layers, Plus, FileEdit, Copy, Check, Sparkles, RefreshCw, Shuffle, HelpCircle } from 'lucide-react';
import { QuestionBank, ActiveTab, Subject } from '../types';
import { normalizeQuestion } from '../utils/normalizeQuestion';
import { exportBankToExcel } from '../utils/exportImport';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';
import { EditBankSoalModal } from './EditBankSoalModal';
import { useHistoryModal } from '../utils/navigationHistory';
import { getStoredSubjects, saveStoredSubjects, saveStoredBanks } from '../utils/storage';
import {
  saveAppDataToFirestore,
  deleteBankSoalPermanently,
  recordDeletedBankId,
  isBankDeletedLocally,
  saveSingleBankToFirestore,
  deleteExamTokenFromFirestore,
} from '../utils/firebaseSync';
import { broadcastAppDataChange } from '../utils/syncEngine';
import {
  findMatchingSubject,
  autoSyncBanksWithSubjects,
  isSubjectExactMatch,
} from '../utils/subjectMatcher';

interface BankSoalViewProps {
  banks: QuestionBank[];
  setBanks: React.Dispatch<React.SetStateAction<QuestionBank[]>>;
  onSaveBank?: (bank: QuestionBank) => void;
  setActiveTab: (tab: ActiveTab) => void;
  subjects?: Subject[];
}

export const BankSoalView: React.FC<BankSoalViewProps> = ({ banks, setBanks, onSaveBank, setActiveTab, subjects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [previewBank, setPreviewBank] = useState<QuestionBank | null>(null);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number>(0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isShuffleModalOpen, setIsShuffleModalOpen] = useState<boolean>(false);
  const [shuffleTargetScope, setShuffleTargetScope] = useState<'ALL' | string>('ALL');

  // Synchronize with master subjects from Menu Mata Pelajaran
  const registeredSubjects = (subjects && subjects.length > 0) ? subjects : getStoredSubjects();

  // Synchronize Preview Modal with browser history
  useHistoryModal({
    modalId: 'preview-bank-modal',
    isOpen: Boolean(previewBank),
    onClose: () => setPreviewBank(null),
    tab: 'bank-soal',
  });

  // Synchronize Edit Bank & Soal Modal with browser history
  useHistoryModal({
    modalId: 'edit-bank-modal',
    isOpen: Boolean(editingBank),
    onClose: () => setEditingBank(null),
    tab: 'bank-soal',
  });

  // Synchronize Shuffle Modal with browser history
  useHistoryModal({
    modalId: 'shuffle-bank-modal',
    isOpen: isShuffleModalOpen,
    onClose: () => setIsShuffleModalOpen(false),
    tab: 'bank-soal',
  });

  // Helper to match a bank's subject or title with the master subjects from Menu Mata Pelajaran
  const findRegisteredSubjectMatch = (bank: QuestionBank): Subject | null => {
    return findMatchingSubject(bank, registeredSubjects);
  };

  // Check if any banks can be synchronized with master subjects
  const banksNeedingSync = useMemo(() => {
    if (!registeredSubjects || registeredSubjects.length === 0) return [];
    return banks.filter((b) => {
      const isExact = isSubjectExactMatch(b.subject, registeredSubjects);
      if (isExact) return false;
      const match = findMatchingSubject(b, registeredSubjects);
      return Boolean(match);
    });
  }, [banks, registeredSubjects]);

  // Collect unique subjects: prioritize registered subjects from Menu Mata Pelajaran, then any other in banks
  const uniqueSubjects = Array.from(
    new Set([
      ...registeredSubjects.map((s) => s.name),
      ...banks.map((b) => b.subject),
    ].filter(Boolean))
  );

  const filtered = banks.filter((b) => {
    if (!b || !b.id || isBankDeletedLocally(b.id)) return false;

    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.teacher_name.toLowerCase().includes(searchTerm.toLowerCase());

    const bSubj = (b.subject || '').trim().toLowerCase();
    const filterSubj = selectedSubjectFilter.trim().toLowerCase();
    const matchesSubject =
      selectedSubjectFilter === 'ALL' ||
      bSubj === filterSubj ||
      bSubj.includes(filterSubj) ||
      filterSubj.includes(bSubj);

    return matchesSearch && matchesSubject;
  });

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<QuestionBank | null>(null);
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

  const handleCopyToken = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    addToast('success', `Token "${token}" berhasil disalin ke clipboard!`, 'Token Tersalin');
    setTimeout(() => {
      setCopiedToken(null);
    }, 3000);
  };

  const handleQuickSyncSubject = (bank: QuestionBank, newSubject: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = banks.map((b) =>
      b.id === bank.id ? { ...b, subject: newSubject, updatedAt: new Date().toISOString() } : b
    );
    setBanks(updated);
    saveStoredBanks(updated);
    broadcastAppDataChange({ banks: updated });
    saveAppDataToFirestore({ banks: updated });
    addToast(
      'success',
      `Mata pelajaran untuk "${bank.title}" berhasil disinkronkan ke "${newSubject}".`,
      'Mapel Disinkronkan'
    );
  };

  const handleSyncAllSubjects = () => {
    const { updatedBanks, changedCount } = autoSyncBanksWithSubjects(banks, registeredSubjects);
    if (changedCount === 0) {
      addToast('info', 'Semua paket soal sudah sinkron dengan Menu Mata Pelajaran.', 'Sudah Sinkron');
      return;
    }
    setBanks(updatedBanks);
    saveStoredBanks(updatedBanks);
    broadcastAppDataChange({ banks: updatedBanks });
    saveAppDataToFirestore({ banks: updatedBanks });
    addToast(
      'success',
      `Berhasil menyinkronkan ${changedCount} paket soal dengan Menu Mata Pelajaran!`,
      'Mata Pelajaran Tersinkron'
    );
  };

  const handleEditBank = (bank: QuestionBank, questionIndex = 0) => {
    setEditingBank(bank);
    setEditingQuestionIndex(questionIndex);
  };

  const handleSaveEditedBank = (updatedBank: QuestionBank) => {
    const bankWithTimestamp: QuestionBank = {
      ...updatedBank,
      updatedAt: new Date().toISOString(),
    };

    const oldToken = editingBank?.token ? editingBank.token.trim().toUpperCase() : '';
    const newToken = bankWithTimestamp.token ? bankWithTimestamp.token.trim().toUpperCase() : '';
    if (oldToken && newToken && oldToken !== newToken) {
      deleteExamTokenFromFirestore(oldToken).catch(() => {});
    }

    const exists = banks.some((b) => String(b.id) === String(bankWithTimestamp.id));
    const updated = exists
      ? banks.map((b) => (String(b.id) === String(bankWithTimestamp.id) ? bankWithTimestamp : b))
      : [bankWithTimestamp, ...banks];

    setBanks(updated);
    saveStoredBanks(updated);

    if (onSaveBank) {
      onSaveBank(bankWithTimestamp);
    } else {
      broadcastAppDataChange({ banks: updated });
      saveAppDataToFirestore({ banks: updated });
      saveSingleBankToFirestore(bankWithTimestamp).catch(() => {});
    }

    if (previewBank && String(previewBank.id) === String(bankWithTimestamp.id)) {
      setPreviewBank(bankWithTimestamp);
    }
    setEditingBank(null);
    setEditingQuestionIndex(0);
    addToast(
      'success',
      `Paket soal "${bankWithTimestamp.title}" berhasil diperbarui dan tersimpan permanen.`,
      'Perubahan Tersimpan'
    );
  };

  const handleDeleteClick = (bank: QuestionBank) => {
    setDeleteConfirmTarget(bank);
  };

  const executeDelete = async () => {
    if (!deleteConfirmTarget) return;
    const targetTitle = deleteConfirmTarget.title;
    const targetId = deleteConfirmTarget.id;
    recordDeletedBankId(targetId);

    const updated = await deleteBankSoalPermanently(targetId, banks);
    setBanks(updated);
    broadcastAppDataChange({ banks: updated });

    if (previewBank?.id === targetId) setPreviewBank(null);
    setDeleteConfirmTarget(null);
    addToast('success', `Paket soal "${targetTitle}" berhasil dihapus permanen dari Bank Soal.`, 'Berhasil Dihapus');
  };

  // Helper untuk mengacak isi butir soal namun nomor soal tetap terurut rapi (1, 2, 3... N)
  const shuffleBankQuestions = (bank: QuestionBank): { updatedBank: QuestionBank; total: number } => {
    if (!bank.questions || bank.questions.length <= 1) {
      return { updatedBank: bank, total: bank.questions?.length || 0 };
    }

    // Clone array pertanyaan
    const shuffled = [...bank.questions];
    // Algoritma Fisher-Yates untuk mengacak urutan pertanyaan
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Beri penomoran berurutan rapi: 1, 2, 3... N
    const renumbered = shuffled.map((q, idx) => ({
      ...q,
      question_number: idx + 1,
    }));

    return {
      updatedBank: {
        ...bank,
        questions: renumbered,
        updatedAt: new Date().toISOString(),
      },
      total: renumbered.length,
    };
  };

  // Handler eksekusi acak urutan soal (bisa semua mapel atau mapel tertentu)
  const handleExecuteBulkShuffle = (scope: 'ALL' | string) => {
    let targetBankCount = 0;
    let totalQuestionsShuffled = 0;

    const updated = banks.map((bank) => {
      if (!bank || !bank.id || isBankDeletedLocally(bank.id)) return bank;

      const matchesScope =
        scope === 'ALL' ||
        (bank.subject || '').trim().toLowerCase() === scope.trim().toLowerCase();

      if (matchesScope && bank.questions && bank.questions.length > 1) {
        const { updatedBank, total } = shuffleBankQuestions(bank);
        targetBankCount++;
        totalQuestionsShuffled += total;
        return updatedBank;
      }
      return bank;
    });

    if (targetBankCount === 0) {
      addToast(
        'info',
        'Tidak ada paket soal yang memiliki lebih dari 1 butir pertanyaan pada cakupan ini.',
        'Tidak Ada Soal Diacak'
      );
      setIsShuffleModalOpen(false);
      return;
    }

    setBanks(updated);
    saveStoredBanks(updated);
    broadcastAppDataChange({ banks: updated });
    saveAppDataToFirestore({ banks: updated });

    if (previewBank) {
      const updatedPreview = updated.find((b) => b.id === previewBank.id);
      if (updatedPreview) setPreviewBank(updatedPreview);
    }

    setIsShuffleModalOpen(false);
    const scopeDescription =
      scope === 'ALL' ? 'semua mata pelajaran' : `mata pelajaran "${scope}"`;

    addToast(
      'success',
      `Berhasil mengacak urutan butir soal pada ${targetBankCount} paket soal (${scopeDescription})! Pertanyaan telah diacak dan nomor soal tetap berurutan 1, 2, 3...`,
      'Urutan Soal Berhasil Diacak'
    );
  };

  // Handler acak urutan soal untuk paket individual
  const handleShuffleSingleBank = (bank: QuestionBank, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!bank.questions || bank.questions.length <= 1) {
      addToast(
        'warning',
        `Paket "${bank.title}" hanya memiliki ${bank.questions?.length || 0} butir soal, tidak dapat diacak.`,
        'Soal Terlalu Sedikit'
      );
      return;
    }

    const { updatedBank, total } = shuffleBankQuestions(bank);
    const updated = banks.map((b) => (b.id === bank.id ? updatedBank : b));

    setBanks(updated);
    saveStoredBanks(updated);
    broadcastAppDataChange({ banks: updated });
    saveAppDataToFirestore({ banks: updated });

    if (previewBank?.id === bank.id) {
      setPreviewBank(updatedBank);
    }

    addToast(
      'success',
      `Pertanyaan pada paket "${bank.title}" (${total} butir) berhasil diacak! Nomor soal tetap berurutan 1 sampai ${total}.`,
      'Urutan Soal Diacak'
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-xl border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari di bank soal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 font-semibold focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Mata Pelajaran</option>
            {uniqueSubjects.map((sub, i) => (
              <option key={i} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {banksNeedingSync.length > 0 && (
            <button
              onClick={handleSyncAllSubjects}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
              title="Singkronkan nama mata pelajaran paket soal dengan Menu Mata Pelajaran"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Singkronkan Mapel ({banksNeedingSync.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setShuffleTargetScope(selectedSubjectFilter);
              setIsShuffleModalOpen(true);
            }}
            className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
            title="Acak urutan butir soal (pertanyaan diacak, nomor soal tetap berurutan 1, 2, 3...)"
          >
            <Shuffle className="w-4 h-4 text-purple-400" />
            <span>Acak Urutan Soal</span>
          </button>

          <button
            onClick={() => setActiveTab('ekstrak-dokumen')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors shrink-0 cursor-pointer"
            title="Tambah Paket Soal via Ekstrak Dokumen"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket Soal</span>
          </button>
        </div>
      </div>

      {/* Grid of Bank Soal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((bank) => {
          const isCopied = copiedToken === bank.token;
          const matchedSubject = findRegisteredSubjectMatch(bank);
          const isExactRegistered = registeredSubjects.some(
            (s) => s.name.trim().toLowerCase() === (bank.subject || '').trim().toLowerCase()
          );

          return (
            <div
              key={bank.id}
              className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-md hover:border-amber-500/40 hover:shadow-amber-500/5 transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* PROMINENT HIGH-CONTRAST TOKEN DISPLAY */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => handleCopyToken(bank.token, e)}
                    title="Klik untuk menyalin token ujian"
                    className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs border flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      isCopied
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-emerald-500/20 scale-105'
                        : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 border-amber-300 shadow-amber-500/20 hover:scale-105'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>TOKEN: <span className="tracking-wider text-slate-950 font-black">{bank.token}</span></span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-slate-950 stroke-[3] ml-0.5" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-900/70 hover:text-slate-950 ml-0.5" />
                    )}
                  </button>

                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                    {bank.total_questions || bank.questions?.length || 0} Soal
                  </span>
                </div>

                <h3 className="font-black text-slate-100 text-sm leading-snug line-clamp-2">{bank.title}</h3>

                <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleEditBank(bank, 0)}
                      className="flex items-center gap-1.5 font-semibold text-indigo-400 truncate cursor-pointer hover:text-indigo-300 transition-colors text-left"
                      title="Klik untuk ubah mata pelajaran paket ini"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{bank.subject}</span>
                    </button>
                    {!isExactRegistered && matchedSubject && (
                      <button
                        onClick={(e) => handleQuickSyncSubject(bank, matchedSubject.name, e)}
                        className="text-[10px] bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/60 px-2 py-0.5 rounded-md font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                        title={`Klik untuk sinkronkan mata pelajaran ke "${matchedSubject.name}" dari Menu Mapel`}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Sync: {matchedSubject.name}
                      </button>
                    )}
                    {!isExactRegistered && !matchedSubject && (
                      <button
                        onClick={() => handleEditBank(bank, 0)}
                        className="text-[10px] bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/50 px-1.5 py-0.5 rounded font-bold transition-all shrink-0 cursor-pointer"
                        title="Mata pelajaran ini belum terdaftar di Menu Mapel. Klik untuk pilih mapel resmi."
                      >
                        Pilih Mapel
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {bank.grade_level} ({bank.class_room})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Guru: {bank.teacher_name}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Durasi: {bank.durationMinutes} Mnt</span>
                    <span className="text-amber-400 font-bold">Min: {bank.minWorkingMinutes !== undefined ? bank.minWorkingMinutes : 30} Mnt</span>
                  </div>
                </div>
              </div>

              {/* Actions (5-Action Grid: Detail, Edit, Acak, Excel, Hapus) */}
              <div className="grid grid-cols-5 gap-1 pt-3 border-t border-slate-800 text-xs">
                <button
                  onClick={() => setPreviewBank(bank)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Lihat Detail Soal"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-300" />
                  <span className="hidden sm:inline">Detail</span>
                </button>

                <button
                  onClick={() => handleEditBank(bank, 0)}
                  className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Edit Judul, Soal, & Pilihan Ganda"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Edit</span>
                </button>

                <button
                  onClick={(e) => handleShuffleSingleBank(bank, e)}
                  className="p-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Acak urutan butir soal (pertanyaan diacak, nomor soal tetap berurutan 1, 2, 3...)"
                >
                  <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Acak</span>
                </button>

                <button
                  onClick={() => exportBankToExcel(bank)}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Export Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </button>

                <button
                  onClick={() => handleDeleteClick(bank)}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full bg-[#0f172a] rounded-2xl p-12 text-center text-slate-500 border border-slate-800 space-y-4">
            <Database className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-300">Tidak ditemukan paket soal di Bank Soal.</p>
              <p className="text-xs text-slate-500 mt-1">Gunakan fitur Ekstrak Dokumen untuk membuat dan mengimpor paket soal CBT baru.</p>
            </div>
            <button
              onClick={() => setActiveTab('ekstrak-dokumen')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Paket Soal via Ekstrak Dokumen</span>
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {previewBank && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f172a] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-800">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => handleCopyToken(previewBank.token)}
                    title="Klik untuk menyalin token ujian"
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-mono font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md border border-amber-300 transition-all"
                  >
                    <Key className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>TOKEN CBT: <span className="tracking-wider">{previewBank.token}</span></span>
                    <Copy className="w-3 h-3 text-slate-900 opacity-75" />
                  </button>
                </div>
                <h3 className="text-base font-black text-slate-100 mt-1">{previewBank.title}</h3>
                <p className="text-xs text-slate-400">
                  {previewBank.subject} | {previewBank.grade_level} ({previewBank.class_room}) • Durasi: {previewBank.durationMinutes} Menit (Min. Pengerjaan: {previewBank.minWorkingMinutes !== undefined ? previewBank.minWorkingMinutes : 30} Menit)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShuffleSingleBank(previewBank)}
                  className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Acak urutan butir soal pada paket ini (nomor soal tetap berurutan 1, 2, 3...)"
                >
                  <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Acak Soal</span>
                </button>

                <button
                  onClick={() => {
                    handleEditBank(previewBank, 0);
                  }}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Edit Judul & Soal Paket Ini"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Paket</span>
                </button>
                <button
                  onClick={() => setPreviewBank(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {previewBank.questions.map((q, idx) => {
                const norm = normalizeQuestion(q, idx, previewBank.title || previewBank.subject);
                return (
                  <div key={q.id || idx} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 relative group hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-400 block">Soal Nomor {idx + 1}</span>
                      <button
                        onClick={() => {
                          handleEditBank(previewBank, idx);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit butir soal ini"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
                        <span>Edit Butir Ini</span>
                      </button>
                    </div>

                    <p className="font-semibold text-slate-100 leading-relaxed whitespace-pre-line" dir="auto">{norm.questionText}</p>

                    {/* Gambar Soal jika ada */}
                    {norm.gambarUrl && (
                      <div className="py-2 flex justify-start">
                        <img
                          src={norm.gambarUrl}
                          alt={`Gambar Soal ${idx + 1}`}
                          className="rounded-xl border border-slate-700 max-h-48 object-contain bg-slate-950/60 p-1 shadow-sm"
                        />
                      </div>
                    )}

                    {norm.type === 'esai' ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 space-y-1">
                        <span className="font-bold block text-amber-400 text-[11px]">Kunci Jawaban Esai / Pedoman Penskoran:</span>
                        <p className="text-slate-200 whitespace-pre-line text-xs">{norm.essayAnswerKey || 'Kunci jawaban belum ditentukan.'}</p>
                        <span className="text-[10px] text-amber-300 font-bold block pt-0.5">Bobot Nilai: {norm.scoreWeight || 10} Poin</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {norm.optionsList.map((opt, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded-lg border flex items-center gap-2 ${
                              opt.isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 font-bold text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {opt.letter}
                            </span>
                            <span dir="auto">{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {norm.explanationText && (
                      <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200">
                        <span className="font-bold block text-amber-400">Pembahasan:</span>
                        <p className="text-slate-300">{norm.explanationText}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950 rounded-b-2xl">
              <button
                onClick={() => {
                  handleEditBank(previewBank, 0);
                }}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Judul & Seluruh Soal</span>
              </button>

              <button
                onClick={() => setPreviewBank(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bank & Question Modal */}
      <EditBankSoalModal
        isOpen={!!editingBank}
        bank={editingBank}
        initialQuestionIndex={editingQuestionIndex}
        subjects={registeredSubjects}
        onClose={() => setEditingBank(null)}
        onSave={handleSaveEditedBank}
      />

      {/* Modal Acak Urutan Soal (Bisa Semua Mapel / Mapel Tertentu) */}
      {isShuffleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#0f172a] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Acak Urutan Soal</h3>
                  <p className="text-xs text-slate-400">Pengacakan pertanyaan dalam paket bank soal</p>
                </div>
              </div>
              <button
                onClick={() => setIsShuffleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-purple-950/30 border border-purple-800/40 rounded-xl space-y-1.5 text-xs text-purple-200">
              <div className="font-bold flex items-center gap-1.5 text-purple-300">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <span>Aturan & Mekanisme Pengacakan:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px] leading-relaxed">
                <li>Yang diacak adalah <strong>isi butir pertanyaan beserta pilihan gandanya</strong>.</li>
                <li><strong>Nomor soal tetap tersusun rapi berurutan</strong> (Nomor 1, 2, 3, dst.) tanpa merusak urutan CBT.</li>
                <li>Hasil pengacakan langsung tersimpan permanen dan otomatis sinkron ke server.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-200">Pilih Cakupan Mata Pelajaran:</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="shuffleScope"
                    value="ALL"
                    checked={shuffleTargetScope === 'ALL'}
                    onChange={() => setShuffleTargetScope('ALL')}
                    className="accent-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-slate-200 flex items-center justify-between">
                      <span>Semua Mata Pelajaran</span>
                      <span className="text-[11px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {banks.length} Paket Soal
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Mengacak pertanyaan di seluruh paket soal pada semua mata pelajaran sekaligus.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="shuffleScope"
                    value="SPECIFIC"
                    checked={shuffleTargetScope !== 'ALL'}
                    onChange={() => {
                      const firstSubj = uniqueSubjects[0] || '';
                      setShuffleTargetScope(selectedSubjectFilter !== 'ALL' ? selectedSubjectFilter : firstSubj);
                    }}
                    className="accent-purple-500 w-4 h-4 mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1 space-y-2 text-xs">
                    <div className="font-bold text-slate-200">
                      Pilih Satu Mata Pelajaran Tertentu:
                    </div>
                    {shuffleTargetScope !== 'ALL' && (
                      <select
                        value={shuffleTargetScope}
                        onChange={(e) => setShuffleTargetScope(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-purple-500/50 rounded-lg text-xs text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                      >
                        {uniqueSubjects.map((subj) => {
                          const countInSubj = banks.filter(
                            (b) => (b.subject || '').trim().toLowerCase() === subj.trim().toLowerCase()
                          ).length;
                          return (
                            <option key={subj} value={subj}>
                              {subj} ({countInSubj} Paket Soal)
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsShuffleModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleExecuteBulkShuffle(shuffleTargetScope)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                <span>Mulai Acak Urutan Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title="Hapus Paket Soal"
        message={`Apakah Anda yakin ingin menghapus paket soal "${deleteConfirmTarget?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Paket Soal"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Floating Modern Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

