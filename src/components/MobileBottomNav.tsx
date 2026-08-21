import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Database,
  PlayCircle,
  Menu,
  FileText,
} from 'lucide-react';
import { ActiveTab, AuthUser, RolePermissions } from '../types';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  currentUser?: AuthUser | null;
  rolePermissions?: RolePermissions;
  onOpenLoginModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onToggleMobileMenu,
  isMobileMenuOpen,
  currentUser,
  rolePermissions,
  onOpenLoginModal,
}) => {
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pembuat-soal-ai', label: 'Soal AI', icon: Sparkles, highlight: true },
    { id: 'ekstrak-dokumen', label: 'Ekstrak', icon: FileText },
    { id: 'bank-soal', label: 'Bank Soal', icon: Database },
    { id: 'mulai-ujian', label: 'Ujian', icon: PlayCircle, student: true },
  ];

  const primaryTabs = allTabs.filter((tab) => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'guru') {
      return rolePermissions?.guru ? rolePermissions.guru.includes(tab.id as ActiveTab) : true;
    }
    if (currentUser?.role === 'siswa') {
      return rolePermissions?.siswa
        ? rolePermissions.siswa.includes(tab.id as ActiveTab)
        : ['profil-saya', 'ai-pembuat-game', 'bank-soal', 'mulai-ujian', 'riwayat-ujian'].includes(tab.id);
    }
    if (currentUser?.role === 'umum') {
      return rolePermissions?.umum
        ? rolePermissions.umum.includes(tab.id as ActiveTab)
        : ['profil-saya', 'ai-pembuat-game', 'bank-soal'].includes(tab.id);
    }
    return rolePermissions?.guru ? rolePermissions.guru.includes(tab.id as ActiveTab) : true;
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 md:hidden shadow-2xl">
      <div className="flex items-center justify-around">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!currentUser && tab.id !== 'dashboard') {
                  if (onOpenLoginModal) {
                    onOpenLoginModal();
                  }
                  return;
                }
                setActiveTab(tab.id as ActiveTab);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[58px] active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20'
                  : tab.student
                  ? 'text-emerald-400 font-medium hover:text-emerald-300'
                  : tab.highlight
                  ? 'text-purple-400 font-medium hover:text-purple-300'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${
                  isActive ? 'scale-110 text-indigo-400 animate-pulse' : ''
                }`}
              />
              <span className="text-[10px] tracking-tight truncate max-w-[64px]">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[58px] active:scale-95 cursor-pointer ${
            isMobileMenuOpen
              ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Semua</span>
        </button>
      </div>
    </div>
  );
};
