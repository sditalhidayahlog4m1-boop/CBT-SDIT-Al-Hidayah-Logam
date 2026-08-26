import React, { useState } from 'react';
import { History, Download, Eye, Search, Trash2, Award, CheckCircle2, XCircle, Filter, BookOpen } from 'lucide-react';
import { ExamResult, QuestionBank } from '../types';
import { exportExamResultsExcel } from '../utils/exportImport';
import { deleteExamResultFromFirestore } from '../utils/firebaseSync';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';

interface ExamHistoryViewProps {
  results: ExamResult[];
  setResults: React.Dispatch<React.SetStateAction<ExamResult[]>>;
  banks: QuestionBank[];
}

export const ExamHistoryView: React.FC<ExamHistoryViewProps> = ({
  results,
  setResults,
  banks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  // Get list of unique subjects from results
  const uniqueSubjects = Array.from(new Set(results.map((r) => r.subject.trim()))).filter(Boolean);

  const filtered = results.filter((r) => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.classRoom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.token.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubject = selectedSubject === 'ALL' || r.subject.trim() === selectedSubject;

    return matchesSearch && matchesSubject;
  });

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ExamResult | null>(null);
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
    setDeleteConfirmTarget(result);
  };

  const executeDelete = () => {
    if (!deleteConfirmTarget) return;
    const studentName = deleteConfirmTarget.studentName;
    const targetId = deleteConfirmTarget.id;
    setResults((prev) => prev.filter((r) => r.id !== targetId));
    deleteExamResultFromFirestore(targetId);
    if (selectedResult?.id === targetId) setSelectedResult(null);
    setDeleteConfirmTarget(null);
    addToast('success', `Riwayat ujian ${studentName} berhasil dihapus.`, 'Berhasil Dihapus');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa, mapel, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Mapel Dropdown */}
          <div className="relative w-full sm:w-56">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-3 text-indigo-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-indigo-200 font-semibold focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Mata Pelajaran ({results.length})</option>
              {uniqueSubjects.map((subj) => {
                const count = results.filter((r) => r.subject.trim() === subj).length;
                return (
                  <option key={subj} value={subj}>
                    {subj} ({count} siswa)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Export Excel Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedSubject !== 'ALL' && (
            <button
              onClick={() => exportExamResultsExcel(results, selectedSubject)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors shrink-0"
              title={`Export khusus rekap ${selectedSubject}`}
            >
              <Download className="w-4 h-4" />
              <span>Export {selectedSubject}</span>
            </button>
          )}

          <button
            onClick={() => exportExamResultsExcel(results, 'ALL')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors shrink-0"
            title="Export semua nilai per sheet/tab mata pelajaran"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel Rekap Per Mapel</span>
          </button>
        </div>
      </div>

      {/* Quick Subject Tabs Filter Pills */}
      {uniqueSubjects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Filter Mapel:
          </span>
          <button
            onClick={() => setSelectedSubject('ALL')}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
              selectedSubject === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Semua ({results.length})
          </button>
          {uniqueSubjects.map((subj) => {
            const count = results.filter((r) => r.subject.trim() === subj).length;
            const isSelected = selectedSubject === subj;
            return (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
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

      {/* Table */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Nama Siswa</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Mata Pelajaran</th>
                <th className="p-3.5 text-center">Nilai Akhir</th>
                <th className="p-3.5 text-center">Waktu Pengerjaan</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">{r.date}</td>
                  <td className="p-3.5 font-bold text-slate-100">{r.studentName}</td>
                  <td className="p-3.5 text-slate-400">{r.classRoom}</td>
                  <td className="p-3.5 font-semibold text-indigo-400">{r.subject}</td>
                  <td className="p-3.5 text-center font-black text-indigo-300 text-sm">{r.score}</td>
                  <td className="p-3.5 text-center text-slate-400">{r.durationSpent}</td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.passed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {r.passed ? 'LULUS' : 'REMEDIAL'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center space-x-1">
                    <button
                      onClick={() => setSelectedResult(r)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors border border-slate-700"
                      title="Lihat Detail Jawaban"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(r)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md transition-colors border border-rose-500/20"
                      title="Hapus Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Belum ada riwayat ujian tersimpan.
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
                  {selectedResult.subject} ({selectedResult.classRoom})
                </p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full font-bold text-xs"
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

              {/* Find Question Details */}
              {(() => {
                const bank = banks.find((b) => b.id === selectedResult.bankId);
                if (!bank) {
                  return <p className="text-slate-500 text-center py-4">Paket soal asli telah dihapus.</p>;
                }

                return bank.questions.map((q, idx) => {
                  const userAns = selectedResult.answers[idx];
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Tutup Review
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title="Hapus Riwayat Ujian"
        message={`Apakah Anda yakin ingin menghapus data riwayat ujian milik "${deleteConfirmTarget?.studentName}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Record"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
