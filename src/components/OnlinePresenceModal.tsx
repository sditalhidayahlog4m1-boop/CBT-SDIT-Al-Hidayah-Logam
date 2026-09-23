import React, { useState } from 'react';
import {
  X,
  Radio,
  Users,
  GraduationCap,
  ShieldCheck,
  Smartphone,
  Monitor,
  Activity,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Clock,
  Search,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { ActiveOnlineSession, PresenceSummary, AuthUser } from '../types';
import { kickPresenceSession } from '../utils/presenceClient';

interface OnlinePresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PresenceSummary | null;
  onRefresh: () => void;
  currentUser?: AuthUser | null;
}

export const OnlinePresenceModal: React.FC<OnlinePresenceModalProps> = ({
  isOpen,
  onClose,
  summary,
  onRefresh,
  currentUser,
}) => {
  const [filterRole, setFilterRole] = useState<'all' | 'guru' | 'siswa' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isKicking, setIsKicking] = useState<string | null>(null);

  if (!isOpen) return null;

  const sessions = summary?.sessions || [];

  const filteredSessions = sessions.filter((s) => {
    if (filterRole === 'guru' && s.role !== 'guru') return false;
    if (filterRole === 'siswa' && s.role !== 'siswa') return false;
    if (filterRole === 'admin' && s.role !== 'admin') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchId = (s.identifier || '').toLowerCase().includes(q);
      const matchClass = (s.classRoom || '').toLowerCase().includes(q);
      const matchAct = (s.currentActivity || '').toLowerCase().includes(q);
      return matchName || matchId || matchClass || matchAct;
    }
    return true;
  });

  const handleKick = async (sessionId: string, name: string) => {
    if (!window.confirm(`Yakin ingin memutuskan sesi online untuk "${name}"? Pengguna akan langsung dikeluarkan dari sistem.`)) {
      return;
    }
    setIsKicking(sessionId);
    await kickPresenceSession(sessionId);
    setIsKicking(null);
    onRefresh();
  };

  const guruCount = summary?.guruCount || 0;
  const siswaCount = summary?.siswaCount || 0;
  const adminCount = summary?.adminCount || 0;
  const totalCount = summary?.totalOnline || 0;
  const uniqueCount = summary?.uniqueAccountsCount || totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                  Pemantauan Akun Online Real-Time (Server CBT)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Server
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mendeteksi guru dan siswa yang sedang aktif menggunakan akun berbeda secara otomatis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
              title="Segarkan data online server"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 shrink-0">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sesi Online</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-emerald-400">{totalCount}</span>
                <span className="text-[11px] text-slate-400 font-semibold">({uniqueCount} Akun Berbeda)</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Guru Online</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-blue-300">{guruCount}</span>
                <span className="text-[11px] text-slate-400 font-semibold">Pengajar</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Anak / Siswa Online</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-purple-300">{siswaCount}</span>
                <span className="text-[11px] text-slate-400 font-semibold">Siswa</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Admin Online</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-amber-300">{adminCount}</span>
                <span className="text-[11px] text-slate-400 font-semibold">Akun</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="p-3 sm:p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRole === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setFilterRole('guru')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRole === 'guru' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Guru ({guruCount})
            </button>
            <button
              onClick={() => setFilterRole('siswa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRole === 'siswa' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Siswa ({siswaCount})
            </button>
            <button
              onClick={() => setFilterRole('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRole === 'admin' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin ({adminCount})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, kelas, NISN, atau aktivitas..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold">Tidak ada sesi online yang cocok dengan filter.</p>
              <p className="text-xs text-slate-500">
                Ketika guru atau siswa membuka sistem, akun mereka akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            filteredSessions.map((sess) => {
              const isGuru = sess.role === 'guru';
              const isSiswa = sess.role === 'siswa';
              const isAdmin = sess.role === 'admin';
              const isMobile = sess.device?.toLowerCase().includes('hp') || sess.device?.toLowerCase().includes('smart');

              return (
                <div
                  key={sess.sessionId}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    sess.isMultiDeviceLogin
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : isGuru
                      ? 'bg-blue-950/20 border-blue-500/30'
                      : isSiswa
                      ? 'bg-purple-950/20 border-purple-500/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Avatar with Live Indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm overflow-hidden border ${
                          isGuru
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isSiswa
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {sess.photoUrl ? (
                          <img src={sess.photoUrl} alt={sess.name} className="w-full h-full object-cover" />
                        ) : (
                          sess.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-100 truncate">{sess.name}</span>

                        {/* Role Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isGuru
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : isSiswa
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isGuru ? <Users className="w-3 h-3" /> : isSiswa ? <GraduationCap className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                          <span>{sess.role}</span>
                        </span>

                        {/* Class or Position */}
                        {sess.classRoom && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-200 border border-purple-800 text-[11px] font-bold">
                            Kelas {sess.classRoom}
                          </span>
                        )}
                        {sess.positionOrSubject && !sess.classRoom && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                            {sess.positionOrSubject}
                          </span>
                        )}

                        {/* Multi-Device Login Warning */}
                        {sess.isMultiDeviceLogin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Multi-Login Terdeteksi ({sess.duplicateCount} Perangkat)
                          </span>
                        )}
                      </div>

                      {/* Activity & Detail */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                          {sess.currentActivity}
                        </span>
                        {sess.activityDetails && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 truncate">{sess.activityDetails}</span>
                          </>
                        )}
                      </div>

                      {/* Device & Connection Metadata */}
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300 font-mono">
                          {isMobile ? <Smartphone className="w-3 h-3 text-sky-400" /> : <Monitor className="w-3 h-3 text-indigo-400" />}
                          {sess.device || 'Perangkat'} ({sess.browser || 'Web'})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Login: {sess.loginTime}
                        </span>
                        {sess.ip && sess.ip !== '::1' && sess.ip !== '127.0.0.1' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                              <Globe className="w-3 h-3 text-slate-500" />
                              IP: {sess.ip}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Admin Only) */}
                  {currentUser?.role === 'admin' && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <button
                        onClick={() => handleKick(sess.sessionId, sess.name)}
                        disabled={isKicking === sess.sessionId}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 active:bg-rose-500/40 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Putuskan sesi akun ini dari server"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Putus Sesi</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Deteksi server otomatis berjalan setiap 6-12 detik tanpa mengonsumsi kuota Firestore.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
