import React, { useState, useEffect } from 'react';
import {
  PlayCircle,
  Key,
  User,
  GraduationCap,
  AlertCircle,
  BookOpen,
  ShieldCheck,
  Info,
  Lock,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { QuestionBank, Student, AuthUser, Subject } from '../types';
import { shuffleQuestionBank, getStoredBanks } from '../utils/storage';
import { findMatchingSubject } from '../utils/subjectMatcher';
import {
  fetchQuestionBankByToken,
  fetchAppDataFromFirestore,
  fetchAllQuestionBanksFromCloud,
  resetFirestoreQuotaCooldown,
} from '../utils/firebaseSync';

interface MulaiUjianViewProps {
  banks: QuestionBank[];
  students: Student[];
  subjects?: Subject[];
  currentUser?: AuthUser | null;
  onStartExam: (studentName: string, classRoom: string, bank: QuestionBank, studentId?: string) => void;
  onUpdateBanks?: (banks: QuestionBank[]) => void;
}

export const MulaiUjianView: React.FC<MulaiUjianViewProps> = ({
  banks,
  students,
  subjects = [],
  currentUser,
  onStartExam,
  onUpdateBanks,
}) => {
  // Sync initial state with currentUser (admin, guru, siswa, umum)
  const getInitialName = () => {
    if (currentUser?.name) return currentUser.name;
    return students[0]?.name || '';
  };

  const getInitialClass = () => {
    if (currentUser) {
      if (currentUser.role === 'siswa' && currentUser.details && 'classRoom' in currentUser.details) {
        return currentUser.details.classRoom;
      }
      if (currentUser.role === 'guru') return 'Guru / Pengawas';
      if (currentUser.role === 'admin') return 'Admin / Pengawas';
      if (currentUser.role === 'umum') return 'Peserta Umum';
    }
    return students[0]?.classRoom || '6';
  };

  const [studentName, setStudentName] = useState(getInitialName);
  const [classRoom, setClassRoom] = useState(getInitialClass);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [tokenInput, setTokenInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Sync state whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setStudentName(currentUser.name);
      if (currentUser.role === 'siswa' && currentUser.details && 'classRoom' in currentUser.details) {
        setClassRoom(currentUser.details.classRoom);
      } else if (currentUser.role === 'guru') {
        setClassRoom('Guru / Pengawas');
      } else if (currentUser.role === 'admin') {
        setClassRoom('Admin / Pengawas');
      } else if (currentUser.role === 'umum') {
        setClassRoom('Peserta Umum');
      }
    }
  }, [currentUser]);

  // Generate subject list prioritizing master registered subjects from Menu Mata Pelajaran
  const subjectList = React.useMemo(() => {
    if (subjects && subjects.length > 0) {
      const registeredNames = Array.from(
        new Set(subjects.map((s) => s.name.trim()).filter(Boolean))
      );
      if (registeredNames.length > 0) return registeredNames;
    }
    const list = new Set<string>();
    banks.forEach((b) => {
      if (b.subject) list.add(b.subject.trim());
    });
    return Array.from(list);
  }, [subjects, banks]);

  // Manual trigger to pull fresh exams from server
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      resetFirestoreQuotaCooldown();
      const cloudBanks = await fetchAllQuestionBanksFromCloud();
      if (cloudBanks && cloudBanks.length > 0) {
        if (onUpdateBanks) {
          onUpdateBanks(cloudBanks);
        }
        setSuccessMessage(`Berhasil menyinkronkan ${cloudBanks.length} paket soal ujian dari server!`);
      } else {
        const freshData = await fetchAppDataFromFirestore(false);
        if (freshData?.banks && freshData.banks.length > 0) {
          if (onUpdateBanks) onUpdateBanks(freshData.banks);
          setSuccessMessage(`Berhasil menyinkronkan ${freshData.banks.length} paket soal ujian dari server!`);
        } else {
          const local = getStoredBanks();
          if (local.length > 0) {
            if (onUpdateBanks) onUpdateBanks(local);
            setSuccessMessage(`Tersedia ${local.length} paket soal ujian di memori perangkat.`);
          } else {
            setErrorMessage('Belum ada paket soal ujian yang terdaftar di server.');
          }
        }
      }
    } catch {
      setErrorMessage('Gagal menyinkronkan data dari server. Silakan coba beberapa saat lagi.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!studentName.trim()) {
      setErrorMessage('Nama peserta ujian wajib diisi.');
      return;
    }

    if (!classRoom.trim()) {
      setErrorMessage('Kelas / Rombel wajib diisi.');
      return;
    }

    if (!tokenInput.trim()) {
      setErrorMessage('Token Ujian wajib diisi.');
      return;
    }

    const rawToken = tokenInput.trim();
    const cleanInputToken = rawToken.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setIsVerifying(true);

    try {
      // 1. Search in-memory question banks
      let matchedBank = banks.find(
        (b) => b && b.token && b.token.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanInputToken
      );

      // 2. If not found in-memory, search in local storage
      if (!matchedBank) {
        const localBanks = getStoredBanks();
        matchedBank = localBanks.find(
          (b) => b && b.token && b.token.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanInputToken
        );
        if (matchedBank && onUpdateBanks) {
          onUpdateBanks([matchedBank, ...banks.filter((b) => String(b.id) !== String(matchedBank!.id))]);
        }
      }

      // 3. If not found locally, fetch directly from dedicated 'exam_tokens' or 'question_banks'
      if (!matchedBank) {
        resetFirestoreQuotaCooldown();
        try {
          const cloudBank = await fetchQuestionBankByToken(cleanInputToken);
          if (cloudBank) {
            matchedBank = cloudBank;
            if (onUpdateBanks) {
              onUpdateBanks([cloudBank, ...banks.filter((b) => String(b.id) !== String(cloudBank.id))]);
            }
          }
        } catch (fetchErr) {
          console.warn('[MulaiUjian] Token lookup error:', fetchErr);
        }
      }

      // 4. Fetch all question banks across all cloud collections
      if (!matchedBank) {
        try {
          const allCloudBanks = await fetchAllQuestionBanksFromCloud();
          if (allCloudBanks && allCloudBanks.length > 0) {
            if (onUpdateBanks) {
              onUpdateBanks(allCloudBanks);
            }
            matchedBank = allCloudBanks.find(
              (b) => b && b.token && b.token.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanInputToken
            );
          }
        } catch (cloudErr) {
          console.warn('[MulaiUjian] Cloud scan error:', cloudErr);
        }
      }

      // 5. Fallback: fetch app_data/main directly
      if (!matchedBank) {
        try {
          const freshData = await fetchAppDataFromFirestore(true);
          if (freshData?.banks) {
            const found = freshData.banks.find(
              (b) => b && b.token && b.token.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanInputToken
            );
            if (found) {
              matchedBank = found;
              if (onUpdateBanks) {
                onUpdateBanks(freshData.banks);
              }
            }
          }
        } catch (freshErr) {
          console.warn('[MulaiUjian] Fresh sync error:', freshErr);
        }
      }

      if (!matchedBank) {
        setErrorMessage(
          `Token ujian "${rawToken}" tidak valid atau belum terdaftar. Pastikan token yang Anda masukkan sesuai dengan yang diberikan oleh guru/admin, atau klik tombol "Perbarui / Sinkronkan Soal" di bawah.`
        );
        setIsVerifying(false);
        return;
      }

      if (!matchedBank.questions || matchedBank.questions.length === 0) {
        setErrorMessage(`Paket ujian "${matchedBank.title}" belum memiliki daftar butir soal.`);
        setIsVerifying(false);
        return;
      }

      // If a specific subject is selected in dropdown, automatically adapt to matchedBank.subject
      if (selectedSubject !== 'all') {
        const bankSubj = (matchedBank.subject || '').trim().toLowerCase();
        const selSubj = selectedSubject.trim().toLowerCase();
        const matchedReg = findMatchingSubject(matchedBank, subjects);
        const isMatch =
          bankSubj === selSubj ||
          bankSubj.includes(selSubj) ||
          selSubj.includes(bankSubj) ||
          (matchedReg && matchedReg.name.trim().toLowerCase() === selSubj);

        if (!isMatch && matchedBank.subject) {
          setSelectedSubject(matchedBank.subject);
        }
      }

      // Valid -> Start Exam with automatically shuffled questions & choices!
      const matchedStudent = students.find(
        (s) => s.name.trim().toLowerCase() === studentName.trim().toLowerCase() && s.classRoom === classRoom
      );
      const resolvedStudentId =
        currentUser?.role === 'siswa'
          ? (currentUser.details?.id || (currentUser as any)?.studentId || currentUser.id || matchedStudent?.id || currentUser.username)
          : (matchedStudent?.id || undefined);

      setIsVerifying(false);
      onStartExam(studentName, classRoom, shuffleQuestionBank(matchedBank), resolvedStudentId);
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err?.message || 'Terjadi kesalahan saat memverifikasi token ujian.');
    }
  };

  const getRoleBadge = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case 'admin':
        return { label: 'Administrator', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'guru':
        return { label: 'Guru / Pengajar', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'siswa':
        return { label: 'Siswa / Siswi', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'umum':
        return { label: 'Peserta Umum', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      default:
        return { label: 'Pengguna', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
      <div className="bg-[#0b132b] rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden text-slate-100">
        
        {/* TOP YELLOW ACCENT BANNER & HEADER */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 p-3.5 sm:p-4 relative shadow-md">
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg border border-amber-300/40 shrink-0">
                <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
                  Mulai Ujian CBT Online
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-900/90 font-medium">
                  Masukkan token validasi dari guru/admin untuk memulai pengerjaan
                </p>
              </div>
            </div>

            {/* Quick Refresh / Sync Button */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isManualSyncing}
              title="Perbarui / Sinkronkan data paket soal ujian dari server"
              className="px-2.5 py-1.5 rounded-lg bg-slate-950/20 hover:bg-slate-950/30 border border-slate-950/30 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sinkron Server</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Account Sync Banner */}
          {currentUser && roleBadge && (
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-400 block text-[10px]">Tersinkron dengan Akun:</span>
                  <span className="font-bold text-slate-100 truncate block">{currentUser.name}</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
          )}

          {/* Active Question Banks Count Badge */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span>Paket Ujian Siap:</span>
            <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              {banks.length} Paket Tersedia
            </span>
          </div>

          <form onSubmit={handleStart} className="space-y-4 text-xs">
            {/* Nama Peserta */}
            <div>
              <label className="block font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                <span>Nama Peserta *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan nama lengkap peserta"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl font-bold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm"
              />
            </div>

            {/* Kelas / Rombel */}
            <div>
              <label className="block font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>Kelas / Rombel *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 6 Abu Bakar As Siddiq, 6, dll."
                value={classRoom}
                onChange={(e) => setClassRoom(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl font-bold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm"
              />
            </div>

            {/* Pilihan Pelajaran */}
            <div>
              <label className="block font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Pilihan Mata Pelajaran</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-100">
                  -- Semua Mata Pelajaran (Otomatis Deteksi Token) --
                </option>
                {subjectList.map((subj) => (
                  <option key={subj} value={subj} className="bg-slate-900 text-slate-100">
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Token Ujian */}
            <div>
              <label className="block font-bold text-slate-200 mb-1.5 flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Token Ujian *</span>
                </span>
                <span className="text-[10px] text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Token CBT
                </span>
              </label>
              <input
                type="text"
                required
                placeholder="MASUKKAN 6 DIGIT TOKEN"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 bg-amber-400/10 border-2 border-amber-400/30 rounded-xl font-mono font-black text-center text-xl tracking-widest text-amber-300 uppercase focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder-slate-600 shadow-inner"
              />
            </div>

            {/* Info Box: Token & Aturan Layar Terkunci */}
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-300 space-y-2 text-[11px] leading-relaxed">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Token ujian bersifat unik untuk setiap paket soal. Masukkan token yang diberikan pengawas untuk langsung membuka lembar soal ujian.
                </span>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-slate-800/90 text-amber-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Aturan Layar Terkunci:</strong> Saat mulai ujian, layar akan otomatis dikunci ke mode pengerjaan. Peserta tidak dapat keluar atau berpindah aplikasi sebelum pengerjaan selesai.
                </span>
              </div>
            </div>

            {successMessage && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-xl font-black text-sm shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer tracking-wide disabled:opacity-60"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 text-slate-950 animate-spin" />
                  <span>MEMVERIFIKASI TOKEN UJIAN...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 text-slate-950" />
                  <span>MULAI MENGERJAKAN UJIAN SEKARANG</span>
                </>
              )}
            </button>

            {/* Secondary Manual Sync Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isManualSyncing || isVerifying}
                className="text-xs text-slate-400 hover:text-amber-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-800/50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>Token belum terbaca? Klik di sini untuk perbarui data dari server</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
