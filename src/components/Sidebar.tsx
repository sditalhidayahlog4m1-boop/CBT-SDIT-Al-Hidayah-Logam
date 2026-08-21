import React from 'react';
import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  BookOpen,
  Sparkles,
  ListOrdered,
  UploadCloud,
  FileText,
  Database,
  Key,
  PlayCircle,
  History,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Gamepad2,
  X,
  LogIn,
  UserCheck,
  ShieldCheck,
  User,
  Trophy,
} from 'lucide-react';
import { ActiveTab, AuthUser, RolePermissions } from '../types';
import { SchoolProfile } from '../utils/storage';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  currentUser?: AuthUser | null;
  onOpenLoginModal?: () => void;
  rolePermissions?: RolePermissions;
  schoolProfile?: SchoolProfile;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  currentUser,
  onOpenLoginModal,
  rolePermissions,
  schoolProfile,
}) => {
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profil-saya', label: 'Profil Saya', icon: User, isProfile: true },
    { id: 'profil-sekolah', label: 'Profil Sekolah', icon: School },
    { id: 'data-guru', label: 'Data Guru', icon: Users },
    { id: 'data-siswa', label: 'Data Siswa', icon: GraduationCap },
    { id: 'mata-pelajaran', label: 'Mata Pelajaran', icon: BookOpen },
    { id: 'ai-pembuat-game', label: 'Game Soal', icon: Gamepad2, highlightGame: true },
    { id: 'riwayat-game', label: 'Rekap Game Siswa', icon: Trophy },
    { id: 'pembuat-soal-ai', label: 'Pembuat Soal', icon: Sparkles, highlight: true },
    { id: 'ekstrak-dokumen', label: 'Ekstrak Dokumen', icon: FileText, digitalForm: true },
    { id: 'upload-soal', label: 'Upload Soal', icon: UploadCloud },
    { id: 'bank-soal', label: 'Bank Soal', icon: Database },
    { id: 'kumpulan-jawaban', label: 'Kumpulan Jawaban', icon: Key },
    { id: 'mulai-ujian', label: 'Mulai Ujian', icon: PlayCircle, student: true },
    { id: 'riwayat-ujian', label: 'Riwayat Ujian', icon: History },
    { id: 'hak-akses', label: 'Menu Akses', icon: ShieldCheck, isHakAkses: true },
    { id: 'reset-data', label: 'Reset Data', icon: RotateCcw, isReset: true },
  ];

  // Filter menu items based on current logged in user role & stored role permissions
  const menuItems = allMenuItems.filter((item) => {
    // Admin always sees everything
    if (currentUser?.role === 'admin') return true;

    // Hak Akses menu is specifically for Admin
    if (item.id === 'hak-akses') return false;

    if (currentUser?.role === 'guru') {
      return rolePermissions?.guru ? rolePermissions.guru.includes(item.id as ActiveTab) : true;
    }

    if (currentUser?.role === 'siswa') {
      return rolePermissions?.siswa
        ? rolePermissions.siswa.includes(item.id as ActiveTab)
        : ['profil-saya', 'ai-pembuat-game', 'bank-soal', 'mulai-ujian', 'riwayat-ujian'].includes(item.id);
    }

    if (currentUser?.role === 'umum') {
      return rolePermissions?.umum
        ? rolePermissions.umum.includes(item.id as ActiveTab)
        : ['profil-saya', 'ai-pembuat-game', 'bank-soal'].includes(item.id);
    }

    // Default for guest / not logged in: show allowed guru menus
    return rolePermissions?.guru ? rolePermissions.guru.includes(item.id as ActiveTab) : true;
  });

  const handleSelectTab = (tabId: ActiveTab) => {
    // If not logged in, prevent entering protected/restricted tabs and immediately open Login Modal
    if (!currentUser && tabId !== 'dashboard' && tabId !== 'profil-sekolah') {
      setIsMobileMenuOpen(false);
      if (onOpenLoginModal) {
        onOpenLoginModal();
      }
      return;
    }
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Sidebar Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar / Drawer Container */}
      <aside
        className={`bg-[#0f172a] text-slate-100 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 shrink-0 
        fixed inset-y-0 left-0 z-50 w-72 sm:w-80 shadow-2xl
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10 overflow-hidden">
              {schoolProfile?.logoUrl ? (
                <img src={schoolProfile.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-0.5" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-wide leading-tight text-white">
                CBT <span className="text-indigo-400">AI</span> System
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {schoolProfile?.name || 'Generator & CBT Engine'}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : item.highlight
                    ? 'bg-gradient-to-r from-purple-950/60 to-indigo-950/60 text-purple-300 border border-purple-800/40 hover:bg-purple-900/40'
                    : (item as any).highlightGame
                    ? 'bg-gradient-to-r from-amber-950/60 to-emerald-950/60 text-amber-300 border border-amber-800/40 hover:bg-amber-900/40'
                    : item.student
                    ? 'text-emerald-400 hover:bg-slate-800/80 hover:text-emerald-300'
                    : (item as any).isHakAkses
                    ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 border border-amber-500/30'
                    : (item as any).isReset
                    ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-purple-400'
                      : item.student
                      ? 'text-emerald-400'
                      : (item as any).isHakAkses
                      ? 'text-amber-400'
                      : (item as any).isReset
                      ? 'text-rose-400'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate flex-1 text-left">{item.label}</span>
                {item.highlight && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">
                    AI
                  </span>
                )}
                {(item as any).highlightGame && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                    Game
                  </span>
                )}
                {(item as any).digitalForm && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    New
                  </span>
                )}
                {item.student && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Ujian
                  </span>
                )}
                {(item as any).isHakAkses && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account Login Widget in Sidebar Footer */}
        {onOpenLoginModal && (
          <div className="p-3 border-t border-slate-800/80 m-2 rounded-2xl bg-slate-900/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden ${
                    currentUser
                      ? currentUser.role === 'guru'
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'
                        : currentUser.role === 'siswa'
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                        : currentUser.role === 'admin'
                        ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                        : 'bg-teal-600/20 border-teal-500/40 text-teal-400'
                      : 'bg-slate-800 border-slate-700 text-amber-400'
                  }`}
                >
                  {currentUser?.photoUrl ? (
                    <img src={currentUser.photoUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : currentUser ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-slate-200 truncate text-[11px]">
                    {currentUser ? currentUser.name : 'Belum Log In'}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {currentUser ? `${currentUser.role}` : 'Guru / Siswa'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenLoginModal();
                }}
                className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold border border-indigo-500/30 transition-all cursor-pointer shrink-0"
              >
                {currentUser ? 'Akun' : 'Masuk'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

