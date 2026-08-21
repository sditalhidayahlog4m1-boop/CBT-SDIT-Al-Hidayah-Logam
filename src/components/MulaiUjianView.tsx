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
} from 'lucide-react';
import { QuestionBank, Student, AuthUser, Subject } from '../types';
import { shuffleQuestionBank } from '../utils/storage';

interface MulaiUjianViewProps {
  banks: QuestionBank[];
  students: Student[];
  subjects?: Subject[];
  currentUser?: AuthUser | null;
  onStartExam: (studentName: string, classRoom: string, bank: QuestionBank) => void;
}

export const MulaiUjianView: React.FC<MulaiUjianViewProps> = ({
  banks,
  students,
  subjects = [],
  currentUser,
  onStartExam,
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

  // Generate subject list from registered subjects & banks
  const subjectList = React.useMemo(() => {
    const list = new Set<string>();
    subjects.forEach((s) => {
      if (s.name) list.add(s.name);
    });
    banks.forEach((b) => {
      if (b.subject) list.add(b.subject);
    });
    return Array.from(list);
  }, [subjects, banks]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

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

    // Validate token against active bank soal
    const trimmedToken = tokenInput.trim().toUpperCase();
    let matchedBank = banks.find(
      (b) => b.token.trim().toUpperCase() === trimmedToken
    );

    // If a specific subject is selected, verify the token belongs to that subject
    if (selectedSubject !== 'all' && matchedBank) {
      if (matchedBank.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
        setErrorMessage(`Token "${trimmedToken}" bukan untuk mata pelajaran ${selectedSubject}. Silakan pilih mata pelajaran yang sesuai atau ganti ke Semua Mata Pelajaran.`);
        return;
      }
    }

    if (!matchedBank) {
      setErrorMessage('Token ujian tidak valid atau belum terdaftar.');
      return;
    }

    if (!matchedBank.questions || matchedBank.questions.length === 0) {
      setErrorMessage('Paket ujian ini belum memiliki daftar butir soal.');
      return;
    }

    // Valid -> Start Exam with automatically shuffled questions & choices!
    onStartExam(studentName, classRoom, shuffleQuestionBank(matchedBank));
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
          <div className="flex items-center gap-3 relative z-10">
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

            {/* Info Box: Token Rahasia */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 flex items-start gap-2 text-[11px] leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Token ujian bersifat rahasia untuk menjaga ketertiban pelaksanaan CBT. Silakan minta token kepada guru pengawas atau administrator ruang ujian.
              </span>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-xl font-black text-sm shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer tracking-wide"
            >
              <PlayCircle className="w-5 h-5 text-slate-950" />
              <span>MULAI MENGERJAKAN UJIAN SEKARANG</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
