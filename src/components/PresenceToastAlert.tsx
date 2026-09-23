import React, { useEffect, useState } from 'react';
import { Radio, X, Users, GraduationCap, ArrowRight } from 'lucide-react';
import { ActiveOnlineSession } from '../types';

interface PresenceToastAlertProps {
  detectedSession: ActiveOnlineSession | null;
  onClear: () => void;
  onOpenModal: () => void;
}

export const PresenceToastAlert: React.FC<PresenceToastAlertProps> = ({
  detectedSession,
  onClear,
  onOpenModal,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (detectedSession) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClear, 300);
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [detectedSession, onClear]);

  if (!detectedSession || !visible) return null;

  const isGuru = detectedSession.role === 'guru';
  const isSiswa = detectedSession.role === 'siswa';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce-short shadow-2xl">
      <div
        className={`p-4 rounded-2xl border backdrop-blur-md flex items-start gap-3 relative overflow-hidden ${
          isGuru
            ? 'bg-blue-950/95 border-blue-500/50 text-blue-100 shadow-blue-500/20'
            : isSiswa
            ? 'bg-purple-950/95 border-purple-500/50 text-purple-100 shadow-purple-500/20'
            : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-500/20'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-indigo-400 animate-pulse" />

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
            isGuru
              ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
              : isSiswa
              ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
          }`}
        >
          {isGuru ? <Users className="w-5 h-5" /> : isSiswa ? <GraduationCap className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0 pr-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Terdeteksi Server CBT
            </span>
          </div>
          <div className="text-xs font-bold text-white mt-0.5 truncate">
            {detectedSession.name} <span className="text-slate-300 font-normal">sedang Online</span>
          </div>
          <p className="text-[11px] text-slate-300 truncate mt-0.5">
            {isSiswa && detectedSession.classRoom ? `Siswa Kelas ${detectedSession.classRoom}` : detectedSession.positionOrSubject || 'Akun Berbeda'} • {detectedSession.device || 'Perangkat Web'}
          </p>

          <button
            onClick={() => {
              onOpenModal();
              setVisible(false);
              onClear();
            }}
            className="mt-2 text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer transition-all"
          >
            <span>Buka Pemantauan Server</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClear, 300);
          }}
          className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
