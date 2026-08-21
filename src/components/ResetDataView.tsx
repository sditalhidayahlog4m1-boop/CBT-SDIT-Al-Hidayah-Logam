import React, { useState } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Users,
  GraduationCap,
  BookOpen,
  Database,
  History,
  ArrowLeft,
} from 'lucide-react';
import { Teacher, Student, Subject, QuestionBank, ExamResult, ActiveTab } from '../types';

interface ResetDataViewProps {
  teachers: Teacher[];
  students: Student[];
  subjects: Subject[];
  banks: QuestionBank[];
  results: ExamResult[];
  onResetAllData: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const ResetDataView: React.FC<ResetDataViewProps> = ({
  teachers,
  students,
  subjects,
  banks,
  results,
  onResetAllData,
  setActiveTab,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const totalQuestions = banks.reduce((acc, b) => acc + (b.questions?.length || 0), 0);

  const handleConfirmReset = () => {
    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      return;
    }
    onResetAllData();
    setShowConfirmModal(false);
    setConfirmInput('');
    setResetSuccess(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Banner / Card */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[11px] mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Zona Manajemen System</span>
              </div>
              <h2 className="text-xl font-black text-slate-100">Reset Semua Data System</h2>
              <p className="text-xs text-slate-400">
                Kosongkan seluruh data master, bank soal bawaan, dan riwayat ujian
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>

        {/* Success Alert */}
        {resetSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-sm text-emerald-300">
                Berhasil! Semua data telah dikosongkan.
              </h4>
              <p className="text-emerald-400/90 leading-relaxed">
                Seluruh data guru, siswa, mata pelajaran, bank soal bawaan, dan riwayat ujian kini telah bernilai kosong (0 record).
              </p>
            </div>
          </div>
        )}

        {/* Current Data Overview */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ringkasan Data Saat Ini yang Akan Dikosongkan:
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-center space-y-1">
              <Users className="w-5 h-5 text-indigo-400 mx-auto" />
              <span className="text-2xl font-black text-slate-100 block">{teachers.length}</span>
              <span className="text-[11px] font-semibold text-slate-400 block">Data Guru</span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-center space-y-1">
              <GraduationCap className="w-5 h-5 text-emerald-400 mx-auto" />
              <span className="text-2xl font-black text-slate-100 block">{students.length}</span>
              <span className="text-[11px] font-semibold text-slate-400 block">Data Siswa</span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-center space-y-1">
              <BookOpen className="w-5 h-5 text-sky-400 mx-auto" />
              <span className="text-2xl font-black text-slate-100 block">{subjects.length}</span>
              <span className="text-[11px] font-semibold text-slate-400 block">Mata Pelajaran</span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-center space-y-1">
              <Database className="w-5 h-5 text-purple-400 mx-auto" />
              <span className="text-2xl font-black text-slate-100 block">{banks.length}</span>
              <span className="text-[11px] font-semibold text-slate-400 block">
                Paket Soal ({totalQuestions} Soal)
              </span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-center space-y-1 col-span-2 sm:col-span-1">
              <History className="w-5 h-5 text-amber-400 mx-auto" />
              <span className="text-2xl font-black text-slate-100 block">{results.length}</span>
              <span className="text-[11px] font-semibold text-slate-400 block">Hasil Ujian</span>
            </div>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2 text-xs text-rose-300">
          <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Peringatan Penting Reset Data:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-rose-200/90 leading-relaxed font-medium">
            <li>
              Tindakan ini akan <strong>menghapus secara permanen</strong> seluruh data master (Guru, Siswa bawaan, Mata Pelajaran).
            </li>
            <li>
              Semua <strong>Bank Soal bawaan & Soal buatan AI/upload</strong> akan dihapus sehingga daftar soal menjadi <strong>kosong (0)</strong>.
            </li>
            <li>
              Semua <strong>Riwayat Hasil Ujian</strong> siswa akan dibersihkan.
            </li>
            <li>
              Proses ini tidak dapat dibatalkan kembali setelah dikonfirmasi.
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Status Sistem: <strong className="text-slate-200 font-bold">{teachers.length + students.length + banks.length === 0 ? 'Data Sudah Kosong (Clean State)' : 'Terisi Data'}</strong>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>RESET SEMUA DATA SEKARANG</span>
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/30 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-100">Konfirmasi Reset Data</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Apakah Anda yakin ingin mengosongkan seluruh data sistem, termasuk soal bawaan dan nama siswa bawaan?
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-2 text-left">
              <label className="block text-[11px] font-bold text-slate-400">
                Ketik <span className="text-rose-400 font-mono">RESET</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-rose-400 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmInput('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={confirmInput.trim().toUpperCase() !== 'RESET'}
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 disabled:opacity-40 transition-all cursor-pointer"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
