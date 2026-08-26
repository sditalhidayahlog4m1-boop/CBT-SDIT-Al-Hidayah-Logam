import React, { useState } from 'react';
import { Database, Search, Eye, Edit2, Edit3, Trash2, Key, Download, BookOpen, Layers, Plus, FileEdit, Copy, Check } from 'lucide-react';
import { QuestionBank, ActiveTab } from '../types';
import { normalizeQuestion } from '../utils/normalizeQuestion';
import { exportBankToExcel } from '../utils/exportImport';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';
import { EditBankSoalModal } from './EditBankSoalModal';

interface BankSoalViewProps {
  banks: QuestionBank[];
  setBanks: React.Dispatch<React.SetStateAction<QuestionBank[]>>;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BankSoalView: React.FC<BankSoalViewProps> = ({ banks, setBanks, setActiveTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [previewBank, setPreviewBank] = useState<QuestionBank | null>(null);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number>(0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Collect unique subjects
  const uniqueSubjects = Array.from(new Set(banks.map((b) => b.subject)));

  const filtered = banks.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.teacher_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubject = selectedSubjectFilter === 'ALL' || b.subject === selectedSubjectFilter;

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

  const handleEditBank = (bank: QuestionBank, questionIndex = 0) => {
    setEditingBank(bank);
    setEditingQuestionIndex(questionIndex);
  };

  const handleSaveEditedBank = (updatedBank: QuestionBank) => {
    setBanks((prev) => prev.map((b) => (b.id === updatedBank.id ? updatedBank : b)));
    if (previewBank?.id === updatedBank.id) {
      setPreviewBank(updatedBank);
    }
    setEditingBank(null);
    addToast(
      'success',
      `Paket soal "${updatedBank.title}" berhasil diperbarui.`,
      'Perubahan Tersimpan'
    );
  };

  const handleDeleteClick = (bank: QuestionBank) => {
    setDeleteConfirmTarget(bank);
  };

  const executeDelete = () => {
    if (!deleteConfirmTarget) return;
    const targetTitle = deleteConfirmTarget.title;
    const targetId = deleteConfirmTarget.id;
    setBanks((prev) => prev.filter((b) => b.id !== targetId));
    if (previewBank?.id === targetId) setPreviewBank(null);
    setDeleteConfirmTarget(null);
    addToast('success', `Paket soal "${targetTitle}" berhasil dihapus dari Bank Soal.`, 'Berhasil Dihapus');
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

        <button
          onClick={() => setActiveTab('pembuat-soal-ai')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Paket Soal</span>
        </button>
      </div>

      {/* Grid of Bank Soal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((bank) => {
          const isCopied = copiedToken === bank.token;
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
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-400">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{bank.subject}</span>
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

              {/* Actions (4-Action Grid: Detail, Edit, Excel, Hapus) */}
              <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-800 text-xs">
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
                  <span>Edit</span>
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
          <div className="col-span-full bg-[#0f172a] rounded-2xl p-12 text-center text-slate-500 border border-slate-800">
            Tidak ditemukan paket soal di Bank Soal.
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

                    <p className="font-semibold text-slate-100 leading-relaxed">{norm.questionText}</p>

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
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
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
        onClose={() => setEditingBank(null)}
        onSave={handleSaveEditedBank}
      />

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

