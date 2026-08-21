import React, { useState, useEffect } from 'react';
import { Clock, UserCheck, ShieldCheck, Wifi, WifiOff, Menu, X, LogIn, GraduationCap, Users } from 'lucide-react';
import { ActiveTab, AuthUser } from '../types';
import { SchoolProfile } from '../utils/storage';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  currentUser: AuthUser | null;
  onOpenLoginModal: () => void;
  schoolProfile?: SchoolProfile;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Overview',
    subtitle: 'Ringkasan statistik, bank soal, dan aktivitas ujian sekolah',
  },
  'profil-saya': {
    title: 'Profil Saya',
    subtitle: 'Kelola informasi nama, username, kata sandi, dan foto profil akun Anda',
  },
  'profil-sekolah': {
    title: 'Profil Sekolah',
    subtitle: 'Identitas lembaga, visi & misi, statistik, serta kontak resmi sekolah',
  },
  'data-guru': {
    title: 'Manajemen Data Guru',
    subtitle: 'Kelola data pengajar, mata pelajaran diampu, dan import data guru',
  },
  'data-siswa': {
    title: 'Manajemen Data Siswa',
    subtitle: 'Kelola data peserta didik, kelas, dan akun ujian',
  },
  'mata-pelajaran': {
    title: 'Kelola Mata Pelajaran',
    subtitle: 'Daftar mata pelajaran dan kurikulum jenjang pendidikan',
  },
  'pembuat-soal-ai': {
    title: 'Pembuat Soal AI (Gemini)',
    subtitle: 'Generate soal CBT otomatis berstandar HOTS/Vokasional dengan Gemini AI',
  },
  'ai-pembuat-game': {
    title: 'Pembuat Game Soal',
    subtitle: 'Platform Game Edukasi Interaktif, Sambung Ayat, & Permainan Islami/Al-Qur\'an',
  },
  'ekstrak-dokumen': {
    title: 'Ekstrak Dokumen Soal',
    subtitle: 'Ekstrak soal dari teks dokumen ke format CBT',
  },
  'upload-soal': {
    title: 'Upload Soal dari Excel',
    subtitle: 'Impor bank soal beserta kunci jawaban menggunakan template Excel',
  },
  'bank-soal': {
    title: 'Bank Soal Permanen',
    subtitle: 'Arsip seluruh paket soal terverifikasi dan siap digunakan untuk ujian',
  },
  'kumpulan-jawaban': {
    title: 'Kumpulan Kunci Jawaban',
    subtitle: 'Unduh rekapitulasi kunci jawaban dan pembahasan format Excel & PDF',
  },
  'mulai-ujian': {
    title: 'Halaman Ujian Siswa',
    subtitle: 'Masuk ujian menggunakan nama, kelas, dan token validasi',
  },
  'riwayat-ujian': {
    title: 'Riwayat & Hasil Ujian',
    subtitle: 'Rekapitulasi nilai, waktu pengerjaan, dan analisis kelulusan siswa',
  },
  'riwayat-game': {
    title: 'Rekapitulasi Riwayat Game Siswa',
    subtitle: 'Pantau aktivitas, skor akhir, dan rekap bermain game edukasi AI siswa secara real-time',
  },
  'hak-akses': {
    title: 'Manajemen Hak Akses Menu',
    subtitle: 'Atur dan batasi hak akses menu yang boleh dilihat dan diakses oleh Guru dan Siswa',
  },
  'reset-data': {
    title: 'Reset Semua Data System',
    subtitle: 'Hapus dan kosongkan seluruh data guru, siswa bawaan, soal, dan riwayat ujian',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  currentUser,
  onOpenLoginModal,
  schoolProfile,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Realtime clock and date state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const currentInfo =
    activeTab === 'ai-pembuat-game' && currentUser?.role === 'siswa'
      ? {
          title: '🎮 Game Edukasi Islami',
          subtitle: 'Platform Permainan Interaktif, Sambung Ayat, & Kuis Al-Qur\'an',
        }
      : TAB_TITLES[activeTab] || {
          title: 'Sistem CBT AI',
          subtitle: 'Aplikasi Ujian Berbasis Komputer',
        };

  return (
    <header className="min-h-[3.5rem] sm:h-16 py-2 px-3 sm:px-6 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800/80 border-t-2 border-t-amber-400 flex items-center justify-between shrink-0 shadow-md z-30 sticky top-0 gap-2 sm:gap-4">
      {/* Left Title & Mobile Hamburger */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Hamburger Drawer Toggle (Garis 3) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
            isMobileMenuOpen
              ? 'bg-amber-400/20 border-amber-400/50 text-amber-400 shadow-md shadow-amber-500/10'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
          }`}
          title={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu Navigasi (Garis 3)'}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-amber-400" />
          ) : (
            <Menu className="w-5 h-5 text-slate-100" />
          )}
        </button>

        {schoolProfile?.logoUrl && (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            <img src={schoolProfile.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-0.5" />
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm md:text-base font-bold text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
            {currentInfo.title}
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 hidden md:block truncate max-w-xs md:max-w-md lg:max-w-xl">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Online/Offline Badge & Action */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Online / Offline Status Badge */}
        <div
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse'
          }`}
          title={
            isOnline
              ? 'Terhubung ke Internet & Cloud API'
              : 'Mode Offline Aktif - Data Tersimpan Otomatis di Storage Lokal'
          }
        >
          {isOnline ? (
            <>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Offline</span>
            </>
          )}
        </div>

        {/* Realtime Clock & Date Widget */}
        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-slate-900/90 border border-slate-700/80 rounded-xl text-[10px] sm:text-xs shadow-inner">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-slate-300 font-sans text-[10px] sm:text-[11px] font-semibold hidden md:inline">{formattedDate}</span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-amber-300 font-mono font-bold tracking-wider text-[11px] sm:text-xs">{formattedTime}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-sans font-bold hidden lg:inline">WIB</span>
          </div>
        </div>

        {/* User Login & Info Badge */}
        <button
          onClick={onOpenLoginModal}
          className="flex items-center gap-2 pl-1.5 sm:pl-3 border-l border-slate-800 hover:opacity-90 transition-all cursor-pointer group"
          title="Klik untuk Portal Log In / Ganti Akun Guru & Siswa"
        >
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-md transition-all overflow-hidden ${
              currentUser
                ? currentUser.role === 'guru'
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 group-hover:scale-105'
                  : currentUser.role === 'siswa'
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400 group-hover:scale-105'
                  : currentUser.role === 'umum'
                  ? 'bg-sky-600/20 border-sky-500/40 text-sky-400 group-hover:scale-105'
                  : 'bg-amber-600/20 border-amber-500/40 text-amber-400 group-hover:scale-105'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {currentUser?.photoUrl ? (
              <img src={currentUser.photoUrl} alt="Foto Profil" className="w-full h-full object-cover" />
            ) : currentUser ? (
              currentUser.role === 'guru' ? (
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : currentUser.role === 'siswa' ? (
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : currentUser.role === 'umum' ? (
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )
            ) : (
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
            )}
          </div>

          <div className="hidden lg:flex flex-col text-left max-w-[120px] xl:max-w-[160px]">
            <span className="text-xs font-bold text-slate-100 leading-none group-hover:text-indigo-300 transition-colors truncate">
              {currentUser ? currentUser.name : 'Log In System'}
            </span>
            <span
              className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${
                currentUser
                  ? currentUser.role === 'guru'
                    ? 'text-indigo-400'
                    : currentUser.role === 'siswa'
                    ? 'text-emerald-400'
                    : currentUser.role === 'umum'
                    ? 'text-sky-400'
                    : 'text-amber-400'
                  : 'text-amber-400'
              }`}
            >
              {currentUser ? (
                <>
                  <UserCheck className="w-3 h-3" />
                  <span className="capitalize truncate">{currentUser.role}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3" /> Masuk System
                </>
              )}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

