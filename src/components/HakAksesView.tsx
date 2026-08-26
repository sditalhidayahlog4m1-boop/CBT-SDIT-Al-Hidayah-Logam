import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  RotateCcw,
  Save,
  Users,
  School,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Lock,
  LayoutDashboard,
  BookOpen,
  Gamepad2,
  FileText,
  ListOrdered,
  UploadCloud,
  Database,
  Key,
  PlayCircle,
  History,
  Sliders,
  Eye,
  Info,
  Globe,
  User,
  Award,
} from 'lucide-react';
import { ActiveTab, AuthUser, RolePermissions } from '../types';

interface HakAksesViewProps {
  rolePermissions: RolePermissions;
  setRolePermissions: React.Dispatch<React.SetStateAction<RolePermissions>>;
  currentUser: AuthUser | null;
  onOpenLoginModal: () => void;
}

interface MenuDefinition {
  id: ActiveTab;
  label: string;
  category: string;
  description: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

const MENU_LIST: MenuDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    category: 'Utama & Ringkasan',
    description: 'Ringkasan statistik guru, siswa, mapel, bank soal, dan riwayat ujian',
    icon: LayoutDashboard,
  },
  {
    id: 'profil-saya',
    label: 'Profil Saya / Pengaturan Akun',
    category: 'Utama & Ringkasan',
    description: 'Halaman pengelolaan informasi akun, nama, username, foto profil, dan kata sandi',
    icon: User,
  },
  {
    id: 'profil-sekolah',
    label: 'Profil Sekolah',
    category: 'Utama & Ringkasan',
    description: 'Informasi identitas sekolah, visi, misi, kontak, dan statistik lembaga',
    icon: School,
  },
  {
    id: 'data-guru',
    label: 'Data Guru & Tenaga Pendidik',
    category: 'Master Data Pokok',
    description: 'Manajemen data guru, NIP, mapel diampu, serta ekspor-impor Excel',
    icon: Users,
  },
  {
    id: 'data-siswa',
    label: 'Data Siswa / Peserta Didik',
    category: 'Master Data Pokok',
    description: 'Manajemen data siswa, NIS, NISN, kelas, dan ekspor-impor Excel',
    icon: GraduationCap,
  },
  {
    id: 'mata-pelajaran',
    label: 'Data Mata Pelajaran & Rombel',
    category: 'Master Data Pokok',
    description: 'Pengaturan mata pelajaran, kode mapel, dan tingkatan kelas',
    icon: BookOpen,
  },
  {
    id: 'nilai-harian',
    label: 'Nilai Harian Siswa & Rekapitulasi',
    category: 'Master Data Pokok',
    description: 'Pencatatan nilai harian siswa dilengkapi tanggal, perhitungan rata-rata, predikat, dan ekspor-impor Excel',
    icon: Award,
    badge: 'Penilaian',
    badgeColor: 'bg-indigo-500/30 text-indigo-200 border-indigo-500/40',
  },
  {
    id: 'ai-pembuat-game',
    label: 'AI Game Soal Edukasi Interaktif',
    category: 'Fitur AI & Otomatisasi',
    description: 'Permainan edukatif (Ular Tangga, Memory Card, Kuis) berbasis AI',
    icon: Gamepad2,
    badge: 'Game AI',
    badgeColor: 'bg-amber-500/30 text-amber-200 border-amber-500/40',
  },
  {
    id: 'riwayat-game',
    label: 'Riwayat & Rekap Log Game',
    category: 'Fitur AI & Otomatisasi',
    description: 'Rekapitulasi riwayat permainan edukasi interaktif seluruh siswa',
    icon: History,
  },
  {
    id: 'pembuat-soal-ai',
    label: 'Pembuat Soal AI Auto-Generate',
    category: 'Fitur AI & Otomatisasi',
    description: 'Generator kisi-kisi dan butir soal otomatis berbasis kecerdasan buatan',
    icon: Sparkles,
    badge: 'AI',
    badgeColor: 'bg-purple-500/30 text-purple-200 border-purple-500/40',
  },
  {
    id: 'ekstrak-dokumen',
    label: 'Ekstrak Soal dari Dokumen (PDF/Word)',
    category: 'Fitur AI & Otomatisasi',
    description: 'Konversi otomatis file PDF/DOCX menjadi bank soal siap pakai',
    icon: FileText,
    badge: 'New',
    badgeColor: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/40',
  },
  {
    id: 'upload-soal',
    label: 'Upload Soal dari Excel',
    category: 'Manajemen Bank Soal',
    description: 'Import massal bank soal dari file Excel template standar CBT',
    icon: UploadCloud,
  },
  {
    id: 'bank-soal',
    label: 'Bank Soal & Token Ujian',
    category: 'Manajemen Bank Soal',
    description: 'Pengelolaan paket soal, durasi waktu, serta token acak ujian',
    icon: Database,
  },
  {
    id: 'kumpulan-jawaban',
    label: 'Kumpulan Kunci Jawaban & Bobot',
    category: 'Manajemen Bank Soal',
    description: 'Katalog kunci jawaban dan analisa butir soal',
    icon: Key,
  },
  {
    id: 'mulai-ujian',
    label: 'Ruang Ujian CBT (Siswa)',
    category: 'Pelaksanaan Ujian',
    description: 'Layar interaktif pelaksanaan ujian berbasis komputer untuk siswa',
    icon: PlayCircle,
    badge: 'Ruang Ujian',
    badgeColor: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/40',
  },
  {
    id: 'riwayat-ujian',
    label: 'Riwayat & Hasil Ujian',
    category: 'Pelaksanaan Ujian',
    description: 'Rekapitulasi nilai, statistik kelulusan, dan cetak hasil ujian',
    icon: History,
  },
  {
    id: 'reset-data',
    label: 'Pengaturan System & Reset Data',
    category: 'Pengaturan System',
    description: 'Pembersihan database sistem dan reset ke kondisi awal (Reset All)',
    icon: Sliders,
  },
];

export const HakAksesView: React.FC<HakAksesViewProps> = ({
  rolePermissions,
  setRolePermissions,
  currentUser,
  onOpenLoginModal,
}) => {
  const [localPerms, setLocalPerms] = useState<RolePermissions>(rolePermissions);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<'guru' | 'siswa' | 'umum'>('guru');

  const isAdmin = currentUser?.role === 'admin';

  // Toggle single menu for specific role
  const handleToggle = (role: 'guru' | 'siswa' | 'umum', tabId: ActiveTab) => {
    setLocalPerms((prev) => {
      const currentList = prev[role] || [];
      const exists = currentList.includes(tabId);
      let updated: ActiveTab[];

      if (exists) {
        updated = currentList.filter((t) => t !== tabId);
      } else {
        updated = [...currentList, tabId];
      }

      return {
        ...prev,
        [role]: updated,
      };
    });
  };

  // Select all menus for a role
  const handleSelectAll = (role: 'guru' | 'siswa' | 'umum') => {
    const allIds = MENU_LIST.map((m) => m.id);
    setLocalPerms((prev) => ({
      ...prev,
      [role]: allIds,
    }));
  };

  // Unselect all menus for a role
  const handleUnselectAll = (role: 'guru' | 'siswa' | 'umum') => {
    setLocalPerms((prev) => ({
      ...prev,
      [role]: [],
    }));
  };

  // Reset to default settings
  const handleResetDefault = () => {
    const defaultGuru: ActiveTab[] = [
      'dashboard',
      'profil-saya',
      'profil-sekolah',
      'data-guru',
      'data-siswa',
      'mata-pelajaran',
      'pembuat-soal-ai',
      'ai-pembuat-game',
      'riwayat-game',
      'ekstrak-dokumen',
      'upload-soal',
      'bank-soal',
      'kumpulan-jawaban',
      'mulai-ujian',
      'riwayat-ujian',
    ];
    const defaultSiswa: ActiveTab[] = [
      'profil-saya',
      'ai-pembuat-game',
      'bank-soal',
      'mulai-ujian',
      'riwayat-ujian',
    ];
    const defaultUmum: ActiveTab[] = [
      'profil-saya',
      'ai-pembuat-game',
      'bank-soal',
    ];

    setLocalPerms({
      guru: defaultGuru,
      siswa: defaultSiswa,
      umum: defaultUmum,
    });
    setSaveToast('Hak Akses dikembalikan ke pengaturan standar (Default). Klik "Simpan" untuk menerapkan.');
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Save changes to state & localStorage
  const handleSave = () => {
    setRolePermissions(localPerms);
    localStorage.setItem('cbt_role_permissions', JSON.stringify(localPerms));
    setSaveToast('🎉 Hak Akses Berhasil Disimpan & Diterapkan ke Seluruh Sistem!');
    setTimeout(() => setSaveToast(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-300 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Kelola Hak Akses Pengguna</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Manajemen Akses Menu & Fitur</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed font-medium">
              Centang kotak pada daftar menu di bawah ini untuk mengizinkan atau membatasi menu yang boleh dilihat dan diakses oleh <strong className="text-amber-300">Guru</strong>, <strong className="text-emerald-300">Siswa</strong>, dan <strong className="text-sky-300">Pengunjung Umum</strong>. Administrator selalu memiliki akses penuh.
            </p>
          </div>

          {/* Admin Status Pill */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {isAdmin ? (
              <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mode Akses: Administrator (Akses Penuh)</span>
              </div>
            ) : (
              <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Memerlukan Akses Administrator</span>
              </div>
            )}
            
            <button
              onClick={onOpenLoginModal}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              {currentUser ? `Log in Sebagai: ${currentUser.name} (${currentUser.role})` : 'Masuk Akun Admin'}
            </button>
          </div>
        </div>
      </div>

      {/* NON-ADMIN WARNING BANNER */}
      {!isAdmin && (
        <div className="p-5 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-200 text-xs sm:text-sm animate-fade-in shadow-xl">
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <strong className="block font-bold text-amber-300">Perhatian: Anda Belum Masuk Sebagai Administrator</strong>
              <span>Pengubahan hak akses di bawah ini hanya dapat disimpan dan dikelola secara resmi oleh akun Administrator. Silakan klik tombol di samping untuk masuk sebagai Admin.</span>
            </div>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all shrink-0 cursor-pointer"
          >
            Masuk Akun Admin
          </button>
        </div>
      )}

      {/* NOTIFICATION TOAST */}
      {saveToast && (
        <div className="p-4 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-200 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-2xl animate-shake">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <button
            onClick={() => setSaveToast(null)}
            className="text-xs text-emerald-300 hover:text-white underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* SUMMARY STATS & ACTION BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat Guru */}
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold block">Akses Menu Guru</span>
              <span className="text-xl font-black text-indigo-300">
                {(localPerms.guru || []).length} <span className="text-xs font-normal text-slate-400">/ {MENU_LIST.length} Menu</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleSelectAll('guru')}
              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 rounded-lg text-[10px] font-bold cursor-pointer border border-indigo-500/40"
            >
              Pilih Semua
            </button>
            <button
              onClick={() => handleUnselectAll('guru')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer border border-slate-700"
            >
              Hapus Semua
            </button>
          </div>
        </div>

        {/* Stat Siswa */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold block">Akses Menu Siswa</span>
              <span className="text-xl font-black text-emerald-300">
                {(localPerms.siswa || []).length} <span className="text-xs font-normal text-slate-400">/ {MENU_LIST.length} Menu</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleSelectAll('siswa')}
              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer border border-emerald-500/40"
            >
              Pilih Semua
            </button>
            <button
              onClick={() => handleUnselectAll('siswa')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer border border-slate-700"
            >
              Hapus Semua
            </button>
          </div>
        </div>

        {/* Stat Umum */}
        <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold block">Akses Menu Umum</span>
              <span className="text-xl font-black text-sky-300">
                {(localPerms.umum || []).length} <span className="text-xs font-normal text-slate-400">/ {MENU_LIST.length} Menu</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleSelectAll('umum')}
              className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600 text-sky-200 rounded-lg text-[10px] font-bold cursor-pointer border border-sky-500/40"
            >
              Pilih Semua
            </button>
            <button
              onClick={() => handleUnselectAll('umum')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer border border-slate-700"
            >
              Hapus Semua
            </button>
          </div>
        </div>

        {/* Save & Reset Actions */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Aksi Manajemen Admin</span>
            <button
              onClick={handleResetDefault}
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              title="Kembalikan ke Pengaturan Awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-extrabold rounded-xl text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>SIMPAN HAK AKSES PERUBAHAN</span>
          </button>
        </div>
      </div>

      {/* MATRIX TABLE OF PERMISSIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Matriks Pengaturan Hak Akses per Menu</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Klik kotak centang di bawah ini untuk mengaktifkan atau menonaktifkan tampilan menu pada pengguna.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-bold px-2">Pratinjau Tampilan:</span>
            <button
              onClick={() => setPreviewRole('guru')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                previewRole === 'guru'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Role Guru
            </button>
            <button
              onClick={() => setPreviewRole('siswa')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                previewRole === 'siswa'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Role Siswa
            </button>
            <button
              onClick={() => setPreviewRole('umum')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                previewRole === 'umum'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Role Umum
            </button>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-300 text-xs uppercase font-extrabold border-b border-slate-800">
                <th className="py-4 px-5">Nama Menu & Deskripsi Fitur</th>
                <th className="py-4 px-4">Kategori Modul</th>
                <th className="py-4 px-4 text-center bg-indigo-950/30 border-x border-slate-800 text-indigo-300">
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Akses Guru</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center bg-emerald-950/30 border-r border-slate-800 text-emerald-300">
                  <div className="flex items-center justify-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>Akses Siswa</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center bg-sky-950/30 border-r border-slate-800 text-sky-300">
                  <div className="flex items-center justify-center gap-1.5">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>Akses Umum</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center text-amber-300">
                  <div className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Admin System</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {MENU_LIST.map((menu, idx) => {
                const Icon = menu.icon;
                const isGuruAllowed = (localPerms.guru || []).includes(menu.id);
                const isSiswaAllowed = (localPerms.siswa || []).includes(menu.id);
                const isUmumAllowed = (localPerms.umum || []).includes(menu.id);

                return (
                  <tr
                    key={menu.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-950/20'
                    }`}
                  >
                    {/* Menu Info */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0 border border-slate-700 mt-0.5">
                          <Icon className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-100">{menu.label}</span>
                            {menu.badge && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${menu.badgeColor}`}>
                                {menu.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 max-w-md leading-relaxed">
                            {menu.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 font-semibold text-slate-300 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px]">
                        {menu.category}
                      </span>
                    </td>

                    {/* Checkbox Guru */}
                    <td className="py-3.5 px-4 text-center bg-indigo-950/10 border-x border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleToggle('guru', menu.id)}
                        className={`inline-flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                          isGuruAllowed
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-slate-800/80 text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                        }`}
                        title={isGuruAllowed ? 'Nonaktifkan untuk Guru' : 'Aktifkan untuk Guru'}
                      >
                        {isGuruAllowed ? (
                          <CheckSquare className="w-5 h-5 text-white" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>

                    {/* Checkbox Siswa */}
                    <td className="py-3.5 px-4 text-center bg-emerald-950/10 border-r border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleToggle('siswa', menu.id)}
                        className={`inline-flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                          isSiswaAllowed
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                            : 'bg-slate-800/80 text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                        }`}
                        title={isSiswaAllowed ? 'Nonaktifkan untuk Siswa' : 'Aktifkan untuk Siswa'}
                      >
                        {isSiswaAllowed ? (
                          <CheckSquare className="w-5 h-5 text-white" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>

                    {/* Checkbox Umum */}
                    <td className="py-3.5 px-4 text-center bg-sky-950/10 border-r border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleToggle('umum', menu.id)}
                        className={`inline-flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                          isUmumAllowed
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                            : 'bg-slate-800/80 text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                        }`}
                        title={isUmumAllowed ? 'Nonaktifkan untuk Umum' : 'Aktifkan untuk Umum'}
                      >
                        {isUmumAllowed ? (
                          <CheckSquare className="w-5 h-5 text-white" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>

                    {/* Always Allowed for Admin */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-xl text-[11px] font-bold">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Penuh</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & Save CTA */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Perubahan hak akses disimpan otomatis di database sistem lokal (LocalStorage) dan bertahan selamanya.</span>
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-xs shadow-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>SIMPAN PERUBAHAN HAK AKSES</span>
          </button>
        </div>
      </div>

      {/* LIVE SIDEBAR PREVIEW CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-extrabold text-white">
              Pratinjau Live Sidebar {previewRole === 'guru' ? 'Guru' : previewRole === 'siswa' ? 'Siswa' : 'Pengunjung Umum'}
            </h3>
          </div>
          <span className="text-xs text-amber-300 font-bold bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            {(localPerms[previewRole] || []).length} Menu Terlihat
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Di bawah ini adalah tampilan menu sidebar yang akan dapat dilihat dan diakses secara langsung oleh pengguna ber-role <strong className="text-slate-200 uppercase">{previewRole}</strong>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
          {MENU_LIST.filter((m) => (localPerms[previewRole] || []).includes(m.id)).map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3 text-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold text-slate-200 block truncate">{m.label}</span>
                  <span className="text-[10px] text-slate-500">{m.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
