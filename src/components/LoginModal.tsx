import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  UserCheck,
  ShieldCheck,
  GraduationCap,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  KeyRound,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Globe,
  Settings,
  Save,
  ChevronDown,
} from 'lucide-react';
import { Teacher, Student, AuthUser } from '../types';
import { SchoolProfile, getStoredAdminAccount, saveStoredAdminAccount, AdminAccount } from '../utils/storage';
import { broadcastAppDataChange } from '../utils/syncEngine';
import { useHistoryModal } from '../utils/navigationHistory';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  students: Student[];
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser, rememberMe?: boolean) => void;
  onLogout: () => void;
  schoolProfile?: SchoolProfile;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  teachers,
  students,
  currentUser,
  onLogin,
  onLogout,
  schoolProfile,
}) => {
  // Synchronize Login Modal with browser history when user is already authenticated
  useHistoryModal({
    modalId: 'login-modal',
    isOpen: isOpen && Boolean(currentUser),
    onClose,
  });

  const [roleTab, setRoleTab] = useState<'admin' | 'guru' | 'siswa' | 'umum'>('admin');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [showHelpAccounts, setShowHelpAccounts] = useState(false);

  // Admin Profile Settings Sub-view State
  const [showAdminProfileSettings, setShowAdminProfileSettings] = useState(false);
  const [adminConfig, setAdminConfig] = useState<AdminAccount>(getStoredAdminAccount);
  const [adminFullName, setAdminFullName] = useState(adminConfig.name);
  const [adminUsername, setAdminUsername] = useState(adminConfig.username);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminSaveMessage, setAdminSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentAdmin = getStoredAdminAccount();
      setAdminConfig(currentAdmin);
      setAdminFullName(currentAdmin.name);
      setAdminUsername(currentAdmin.username);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to normalize strings for comparisons
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const checkPasswordOrDateMatch = (
    cleanPass: string,
    storedPass?: string,
    storedBirthDate?: string
  ): boolean => {
    if (!cleanPass) return false;

    const userNorm = cleanPass.toLowerCase().replace(/[^a-z0-9]/g, '');

    // If teacher/student has no password and no birthDate stored in database
    if (!storedPass?.trim() && !storedBirthDate?.trim()) {
      return true;
    }

    // 1. Check custom password match
    if (storedPass?.trim()) {
      const passClean = storedPass.trim();
      const passNorm = passClean.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanPass === passClean || userNorm === passNorm) {
        return true;
      }
    }

    // 2. Check direct birthDate string match
    if (storedBirthDate?.trim()) {
      const birthClean = storedBirthDate.trim();
      const birthNorm = birthClean.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanPass === birthClean || userNorm === birthNorm) {
        return true;
      }

      // 3. Permutations & Format Equivalence (handles DDMMYYYY, YYYYMMDD, MMDDYYYY, YYYY-MM-DD, DD/MM/YYYY, etc.)
      const extractDateCandidates = (rawStr: string): string[] => {
        const candidates: string[] = [];
        const trimmed = rawStr.trim();
        if (!trimmed) return candidates;

        const norm = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
        candidates.push(norm);

        const nums = trimmed.split(/[^0-9]+/).filter(Boolean).map(Number);
        const digitsOnly = trimmed.replace(/[^0-9]/g, '');

        let day = 0, month = 0, year = 0;

        if (nums.length === 3) {
          if (nums[0] > 1000) {
            year = nums[0];
            if (nums[1] <= 12 && nums[2] <= 31) { month = nums[1]; day = nums[2]; }
            else if (nums[2] <= 12 && nums[1] <= 31) { month = nums[2]; day = nums[1]; }
          } else if (nums[2] > 0) {
            year = nums[2] < 100 ? (nums[2] > 30 ? 1900 + nums[2] : 2000 + nums[2]) : nums[2];
            if (nums[0] > 12) { day = nums[0]; month = nums[1]; }
            else if (nums[1] > 12) { month = nums[0]; day = nums[1]; }
            else { day = nums[0]; month = nums[1]; }
          }
        } else if (digitsOnly.length === 8) {
          if (digitsOnly.startsWith('19') || digitsOnly.startsWith('20')) {
            year = parseInt(digitsOnly.slice(0, 4), 10);
            month = parseInt(digitsOnly.slice(4, 6), 10);
            day = parseInt(digitsOnly.slice(6, 8), 10);
          } else {
            const y = parseInt(digitsOnly.slice(4, 8), 10);
            const p1 = parseInt(digitsOnly.slice(0, 2), 10);
            const p2 = parseInt(digitsOnly.slice(2, 4), 10);
            year = y;
            if (p1 > 12) { day = p1; month = p2; }
            else if (p2 > 12) { month = p1; day = p2; }
            else { day = p1; month = p2; }
          }
        } else if (digitsOnly.length === 6) {
          const p1 = parseInt(digitsOnly.slice(0, 2), 10);
          const p2 = parseInt(digitsOnly.slice(2, 4), 10);
          const yShort = parseInt(digitsOnly.slice(4, 6), 10);
          year = yShort > 30 ? 1900 + yShort : 2000 + yShort;
          if (p1 > 12) { day = p1; month = p2; }
          else if (p2 > 12) { month = p1; day = p2; }
          else { day = p1; month = p2; }
        }

        if (day > 0 && month > 0 && year > 0) {
          const dd = String(day).padStart(2, '0');
          const mm = String(month).padStart(2, '0');
          const yyyy = String(year);
          const yy = yyyy.slice(-2);

          candidates.push(`${dd}${mm}${yyyy}`);
          candidates.push(`${mm}${dd}${yyyy}`);
          candidates.push(`${yyyy}${mm}${dd}`);
          candidates.push(`${dd}${mm}${yy}`);
          candidates.push(`${mm}${dd}${yy}`);
          candidates.push(`${dd}/${mm}/${yyyy}`);
          candidates.push(`${mm}/${dd}/${yyyy}`);
          candidates.push(`${yyyy}-${mm}-${dd}`);
          candidates.push(`${dd}-${mm}-${yyyy}`);
        }

        return candidates;
      };

      const storedCandidates = extractDateCandidates(storedBirthDate);
      const userCandidates = extractDateCandidates(cleanPass);

      for (const u of userCandidates) {
        if (storedCandidates.includes(u)) {
          return true;
        }
      }
    }

    return false;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    if (roleTab === 'umum') {
      const umumUser: AuthUser = {
        role: 'umum',
        name: 'Pengunjung Umum',
      };
      onLogin(umumUser, rememberMe);
      setSuccessMessage('Berhasil masuk sebagai Pengunjung Umum!');
      setTimeout(() => onClose(), 800);
      return;
    }

    if (!cleanUsername) {
      setErrorMessage('Username wajib diisi.');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Password wajib diisi.');
      return;
    }

    if (roleTab === 'admin') {
      const storedAdmin = getStoredAdminAccount();
      const adminUserClean = storedAdmin.username.trim().toLowerCase();
      const adminPassClean = storedAdmin.password.trim();
      const isUsernameAdmin =
        cleanUsername.toLowerCase() === adminUserClean ||
        cleanUsername.toLowerCase() === 'admin' ||
        normalize(cleanUsername) === 'admin';
      const isPasswordAdmin =
        cleanPass === adminPassClean ||
        cleanPass.toLowerCase() === adminPassClean.toLowerCase() ||
        (adminPassClean === 'admin' && (cleanPass === 'admin' || cleanPass === 'admin123' || cleanPass === 'administrator'));

      if (isUsernameAdmin && isPasswordAdmin) {
        const adminUser: AuthUser = {
          role: 'admin',
          name: storedAdmin.name || 'Administrator System',
          username: storedAdmin.username,
          password: storedAdmin.password,
          photoUrl: storedAdmin.photoUrl || '',
          birthDate: 'Admin',
        };
        onLogin(adminUser, rememberMe);
        setSuccessMessage(`Berhasil masuk sebagai ${storedAdmin.name}!`);
        setTimeout(() => onClose(), 800);
        return;
      }

      // Fallback: check if credentials belong to Guru or Siswa
      const teacherMatch = teachers.find((t) => {
        const nameClean = t.name.trim().toLowerCase();
        const userClean = cleanUsername.toLowerCase();
        const normName = normalize(t.name);
        const normUser = normalize(cleanUsername);
        if (nameClean === userClean || (t.username && t.username.trim().toLowerCase() === userClean) || normName === normUser) return true;
        if (normName.length >= 3 && normUser.length >= 3 && (normName.startsWith(normUser) || normUser.startsWith(normName))) return true;
        return false;
      });

      if (teacherMatch && checkPasswordOrDateMatch(cleanPass, teacherMatch.password, teacherMatch.birthDate)) {
        const teacherUser: AuthUser = {
          role: 'guru',
          name: teacherMatch.name,
          username: teacherMatch.username || teacherMatch.name.toLowerCase().replace(/\s+/g, ''),
          password: teacherMatch.password || teacherMatch.birthDate,
          photoUrl: teacherMatch.photoUrl,
          birthDate: teacherMatch.birthDate,
          details: teacherMatch,
        };
        onLogin(teacherUser, rememberMe);
        setSuccessMessage(`Berhasil masuk sebagai Guru (${teacherMatch.name})!`);
        setTimeout(() => onClose(), 800);
        return;
      }

      const studentMatch = students.find((s) => {
        const nameClean = s.name.trim().toLowerCase();
        const userClean = cleanUsername.toLowerCase();
        const normName = normalize(s.name);
        const normUser = normalize(cleanUsername);
        if (nameClean === userClean || (s.username && s.username.trim().toLowerCase() === userClean) || normName === normUser) return true;
        if (normName.length >= 3 && normUser.length >= 3 && (normName.startsWith(normUser) || normUser.startsWith(normName))) return true;
        return false;
      });

      if (studentMatch && checkPasswordOrDateMatch(cleanPass, studentMatch.password, studentMatch.birthDate)) {
        const studentUser: AuthUser = {
          role: 'siswa',
          name: studentMatch.name,
          username: studentMatch.username || studentMatch.name.toLowerCase().replace(/\s+/g, ''),
          password: studentMatch.password || studentMatch.birthDate,
          photoUrl: studentMatch.photoUrl,
          birthDate: studentMatch.birthDate,
          details: studentMatch,
        };
        onLogin(studentUser, rememberMe);
        setSuccessMessage(`Berhasil masuk sebagai Siswa (${studentMatch.name})!`);
        setTimeout(() => onClose(), 800);
        return;
      }

      setErrorMessage('Username atau Password Admin salah. Silakan periksa kembali.');
      return;
    }

    if (roleTab === 'guru') {
      const match = teachers.find((t) => {
        const nameClean = t.name.trim().toLowerCase();
        const userClean = cleanUsername.toLowerCase();
        const normName = normalize(t.name);
        const normUser = normalize(cleanUsername);

        if (nameClean === userClean) return true;
        if (t.username && t.username.trim().toLowerCase() === userClean) return true;
        if (t.nip && t.nip.trim().toLowerCase() === userClean) return true;
        if (t.nik && t.nik.trim().toLowerCase() === userClean) return true;
        if (t.nuptk && t.nuptk.trim().toLowerCase() === userClean) return true;
        if (normName === normUser) return true;
        if (normName.length >= 3 && normUser.length >= 3) {
          if (normName.startsWith(normUser) || normUser.startsWith(normName)) return true;
        }
        return false;
      });

      if (!match) {
        // Fallback: check admin
        const storedAdmin = getStoredAdminAccount();
        if (
          (cleanUsername.toLowerCase() === storedAdmin.username.trim().toLowerCase() || cleanUsername.toLowerCase() === 'admin') &&
          (cleanPass.trim() === storedAdmin.password.trim() || cleanPass.toLowerCase() === storedAdmin.password.trim().toLowerCase())
        ) {
          const adminUser: AuthUser = {
            role: 'admin',
            name: storedAdmin.name || 'Administrator System',
            username: storedAdmin.username,
            password: storedAdmin.password,
            photoUrl: storedAdmin.photoUrl || '',
            birthDate: 'Admin',
          };
          onLogin(adminUser, rememberMe);
          setSuccessMessage(`Berhasil masuk sebagai ${storedAdmin.name}!`);
          setTimeout(() => onClose(), 800);
          return;
        }

        setErrorMessage(
          `Nama Guru / Username "${cleanUsername}" tidak ditemukan. Silakan cek daftar guru terdaftar.`
        );
        return;
      }

      // Check Password (Custom Password atau Tanggal Lahir)
      const passMatch = checkPasswordOrDateMatch(
        cleanPass,
        match.password,
        match.birthDate
      );

      if (!passMatch) {
        setErrorMessage(
          `Password / Tanggal lahir salah untuk Guru ${match.name}.`
        );
        return;
      }

      const teacherUser: AuthUser = {
        role: 'guru',
        name: match.name,
        username: match.username || match.name.toLowerCase().replace(/\s+/g, ''),
        password: match.password || match.birthDate,
        photoUrl: match.photoUrl,
        birthDate: match.birthDate,
        details: match,
      };
      onLogin(teacherUser, rememberMe);
      setSuccessMessage(`Selamat datang, ${match.name}! (Guru/Pengajar)`);
      setTimeout(() => onClose(), 800);
      return;
    }

    if (roleTab === 'siswa') {
      const match = students.find((s) => {
        const nameClean = s.name.trim().toLowerCase();
        const userClean = cleanUsername.toLowerCase();
        const normName = normalize(s.name);
        const normUser = normalize(cleanUsername);

        if (nameClean === userClean) return true;
        if (s.username && s.username.trim().toLowerCase() === userClean) return true;
        if (s.nis && s.nis.trim().toLowerCase() === userClean) return true;
        if (s.nisn && s.nisn.trim().toLowerCase() === userClean) return true;
        if (normName === normUser) return true;
        if (normName.length >= 3 && normUser.length >= 3) {
          if (normName.startsWith(normUser) || normUser.startsWith(normName)) return true;
        }
        return false;
      });

      if (!match) {
        // Fallback: check admin
        const storedAdmin = getStoredAdminAccount();
        if (
          (cleanUsername.toLowerCase() === storedAdmin.username.trim().toLowerCase() || cleanUsername.toLowerCase() === 'admin') &&
          (cleanPass.trim() === storedAdmin.password.trim() || cleanPass.toLowerCase() === storedAdmin.password.trim().toLowerCase())
        ) {
          const adminUser: AuthUser = {
            role: 'admin',
            name: storedAdmin.name || 'Administrator System',
            username: storedAdmin.username,
            password: storedAdmin.password,
            photoUrl: storedAdmin.photoUrl || '',
            birthDate: 'Admin',
          };
          onLogin(adminUser, rememberMe);
          setSuccessMessage(`Berhasil masuk sebagai ${storedAdmin.name}!`);
          setTimeout(() => onClose(), 800);
          return;
        }

        setErrorMessage(
          `Nama Siswa / Username "${cleanUsername}" tidak ditemukan. Silakan cek daftar siswa terdaftar.`
        );
        return;
      }

      // Check Password (Custom Password atau Tanggal Lahir)
      const passMatch = checkPasswordOrDateMatch(
        cleanPass,
        match.password,
        match.birthDate
      );

      if (!passMatch) {
        setErrorMessage(
          `Password / Tanggal lahir salah untuk Siswa ${match.name}.`
        );
        return;
      }

      const studentUser: AuthUser = {
        role: 'siswa',
        name: match.name,
        username: match.username || match.name.toLowerCase().replace(/\s+/g, ''),
        password: match.password || match.birthDate,
        photoUrl: match.photoUrl,
        birthDate: match.birthDate,
        details: match,
      };
      onLogin(studentUser, rememberMe);
      setSuccessMessage(`Selamat datang, ${match.name}! (Siswa)`);
      setTimeout(() => onClose(), 800);
      return;
    }
  };

  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaveMessage(null);

    const currentAdmin = getStoredAdminAccount();

    if (!adminFullName.trim()) {
      setAdminSaveMessage({ type: 'error', text: 'Nama Admin tidak boleh kosong.' });
      return;
    }

    if (!adminUsername.trim()) {
      setAdminSaveMessage({ type: 'error', text: 'Username Admin tidak boleh kosong.' });
      return;
    }

    if (oldPassword !== currentAdmin.password) {
      setAdminSaveMessage({ type: 'error', text: 'Password Lama Admin tidak sesuai!' });
      return;
    }

    let updatedPassword = currentAdmin.password;
    if (newPassword || confirmNewPassword) {
      if (newPassword.length < 4) {
        setAdminSaveMessage({ type: 'error', text: 'Password Baru minimal 4 karakter.' });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setAdminSaveMessage({ type: 'error', text: 'Konfirmasi Password Baru tidak cocok!' });
        return;
      }
      updatedPassword = newPassword;
    }

    const updatedAdmin: AdminAccount = {
      name: adminFullName.trim(),
      username: adminUsername.trim(),
      password: updatedPassword,
      photoUrl: currentAdmin.photoUrl || '',
    };

    saveStoredAdminAccount(updatedAdmin);
    setAdminConfig(updatedAdmin);
    broadcastAppDataChange({ adminAccount: updatedAdmin });

    // Update active currentUser if currently logged in as admin
    if (currentUser?.role === 'admin') {
      onLogin({
        ...currentUser,
        name: updatedAdmin.name,
      });
    }

    setAdminSaveMessage({
      type: 'success',
      text: 'Profil & Kredensial Admin berhasil diperbarui!',
    });

    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');

    setTimeout(() => {
      setShowAdminProfileSettings(false);
      setAdminSaveMessage(null);
    }, 1500);
  };

  const handleQuickFillAccount = (
    role: 'guru' | 'siswa',
    name: string,
    birthDate: string
  ) => {
    setRoleTab(role);
    setUsernameInput(name);
    setPasswordInput(birthDate);
    setErrorMessage(null);
  };

  // Filter accounts for the help drawer
  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchAccountQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchAccountQuery.toLowerCase())
  );

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchAccountQuery.toLowerCase()) ||
      s.classRoom.toLowerCase().includes(searchAccountQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b132b] border border-amber-500/30 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        
        {/* TOP YELLOW ACCENT BANNER & HEADER (CENTER ALIGNED) */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 p-3.5 sm:p-4 relative shadow-md">
          <div className="flex flex-col items-center justify-center text-center relative z-10 px-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 mb-1.5">
              <img
                src={schoolProfile?.logoUrl || '/favicon.svg'}
                alt="Logo Sekolah"
                className="w-full h-full object-contain filter drop-shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/favicon.svg';
                }}
              />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-tight">
              Selamat Datang
            </h2>
            <p className="text-xs font-semibold text-slate-900/90 mt-0.5">
              {(() => {
                const name = schoolProfile?.name?.trim() || 'SDIT AL HIDAYAH LOGAM';
                if (name === 'SDIT AL HIDAYAH' || name === 'SDIT Al Hidayah' || name === 'SDIT AL HIDAYAH LOGAM') {
                  return 'SDIT AL HIDAYAH LOGAM';
                }
                return name;
              })()}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 bg-[#0b132b]">
          
          {/* Active Logged-In User Banner (If logged in) */}
          {currentUser && (
            <div className="bg-gradient-to-r from-slate-900 to-slate-900/90 border-2 border-amber-400/40 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 font-bold text-lg shadow-lg border ${
                      currentUser.role === 'guru'
                        ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300'
                        : currentUser.role === 'siswa'
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                        : currentUser.role === 'umum'
                        ? 'bg-sky-600/30 border-sky-400 text-sky-300'
                        : 'bg-amber-500/30 border-amber-400 text-amber-300'
                    }`}
                  >
                    {currentUser.role === 'guru' && <Users className="w-7 h-7" />}
                    {currentUser.role === 'siswa' && <GraduationCap className="w-7 h-7" />}
                    {currentUser.role === 'umum' && <Globe className="w-7 h-7" />}
                    {currentUser.role === 'admin' && <ShieldCheck className="w-7 h-7" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white tracking-tight">{currentUser.name}</h3>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          currentUser.role === 'guru'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : currentUser.role === 'siswa'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : currentUser.role === 'umum'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                        }`}
                      >
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium">
                      Status Log In: <span className="text-emerald-400 font-bold">Sesi Aktif</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-2">
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setShowAdminProfileSettings(!showAdminProfileSettings)}
                      className="px-3 py-2 bg-amber-400/15 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>Pengaturan Profil Saya</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onLogout();
                      setSuccessMessage('Anda telah keluar dari sistem.');
                    }}
                    className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout Sesi</span>
                  </button>
                </div>
              </div>

              {/* Extra details from teacher / student record */}
              {currentUser.details && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs relative z-10">
                  {'position' in currentUser.details && (
                    <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-medium">Jabatan & Mapel</span>
                      <span className="font-bold text-indigo-300">
                        {currentUser.details.position} - {currentUser.details.subject}
                      </span>
                    </div>
                  )}
                  {'nip' in currentUser.details && currentUser.details.nip && (
                    <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-medium">NIP Guru</span>
                      <span className="font-mono font-bold text-slate-200">{currentUser.details.nip}</span>
                    </div>
                  )}
                  {'classRoom' in currentUser.details && (
                    <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-medium">Kelas Siswa</span>
                      <span className="font-bold text-emerald-400">{currentUser.details.classRoom}</span>
                    </div>
                  )}
                  {'nis' in currentUser.details && (
                    <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-medium">NIS / NISN</span>
                      <span className="font-mono font-bold text-slate-200">{currentUser.details.nis} / {currentUser.details.nisn}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ADMIN PROFILE SETTINGS FORM SECTION */}
          {currentUser?.role === 'admin' && showAdminProfileSettings && (
            <div className="p-5 bg-slate-900 border-2 border-amber-400/50 rounded-2xl space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                    Pengaturan Profil & Kredensial Admin
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminProfileSettings(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  Tutup
                </button>
              </div>

              {adminSaveMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    adminSaveMessage.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {adminSaveMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{adminSaveMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveAdminProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nama Lengkap Admin</label>
                  <input
                    type="text"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Contoh: Administrator Utama"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Username Admin Baru</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Username Admin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Password Admin Saat Ini (Lama)</label>
                  <div className="relative">
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Masukkan Password Lama"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Password Baru (Opsional)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Minimal 4 Karakter"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Ulangi Password Baru"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Profil Admin</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Role Choice Section (Dropdown Select Ramping) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pilih Peran Log In</span>
            </label>

            <div className="relative">
              <select
                value={roleTab}
                onChange={(e) => {
                  setRoleTab(e.target.value as 'admin' | 'guru' | 'siswa' | 'umum');
                  setErrorMessage(null);
                }}
                className="w-full px-4 py-3 bg-slate-950 text-slate-100 font-bold rounded-xl border border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none cursor-pointer pr-10 shadow-inner"
              >
                <option value="admin" className="bg-slate-900 text-slate-100 py-1.5">🛡️ Admin</option>
                <option value="guru" className="bg-slate-900 text-slate-100 py-1.5">👨‍🏫 Guru</option>
                <option value="siswa" className="bg-slate-900 text-slate-100 py-1.5">👨‍🎓 Siswa</option>
                <option value="umum" className="bg-slate-900 text-slate-100 py-1.5">👥 Umum</option>
              </select>
              <div className="absolute right-3.5 top-3.5 pointer-events-none text-amber-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Alert Messages */}
            {errorMessage && (
              <div className="p-4 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-3 animate-shake shadow-lg">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-3 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            {/* Form Inputs Container per Role */}
            <div className={`p-5 rounded-2xl border transition-all ${
              roleTab === 'guru'
                ? 'bg-gradient-to-b from-indigo-950/30 to-slate-950 border-indigo-500/30'
                : roleTab === 'siswa'
                ? 'bg-gradient-to-b from-emerald-950/30 to-slate-950 border-emerald-500/30'
                : roleTab === 'umum'
                ? 'bg-gradient-to-b from-sky-950/30 to-slate-950 border-sky-500/30'
                : 'bg-gradient-to-b from-amber-950/30 to-slate-950 border-amber-500/30'
            }`}>

              {roleTab === 'umum' ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center mx-auto shadow-inner">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Akses Pengunjung Umum</h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                      Mode umum memberikan akses baca untuk informasi profil sekolah, permainan edukasi interaktif, dan navigasi informasi umum sekolah tanpa batasan kata sandi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoginSubmit}
                    className="w-full py-3.5 bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black rounded-xl text-xs shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-slate-950" />
                    <span>MASUK SEBAGAI PENGUNJUNG UMUM</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Username Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Username {roleTab === 'admin' ? 'Admin' : ' (Nama Lengkap)'}</span>
                      </span>
                      <span className="text-[10px] text-amber-300/80 font-mono font-semibold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      </span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder={
                          roleTab === 'guru' || roleTab === 'siswa'
                            ? 'Contoh : Tsubatsa Ozora'
                            : 'Contoh : admin'
                        }
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-semibold placeholder:text-slate-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Password {roleTab !== 'admin' && '(Tanggal Lahir / Password: DD/MM/YYYY)'}</span>
                      </span>
                      {roleTab !== 'admin' && (
                        <span className="text-[10px] text-amber-300/80 font-mono font-semibold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                          DDMMYYYY / Tanggal Lahir
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder={
                          roleTab === 'admin'
                            ? 'Masukkan Password Admin'
                            : 'Contoh : 25081991 atau 25/08/1991'
                        }
                        className="w-full pl-10 pr-10 py-3 bg-slate-900/90 border border-slate-700 text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-semibold placeholder:text-slate-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me / Ingat Saya Checkbox */}
                  <div className="flex items-center justify-between pt-0.5 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-400 accent-amber-400 cursor-pointer"
                      />
                      <span className="text-[11px] sm:text-xs">Ingat Saya (Tetap Masuk Otomatis)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      Sesi tersimpan aman
                    </span>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3.5 rounded-xl font-extrabold text-xs text-slate-950 shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      roleTab === 'guru'
                        ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-amber-400/25'
                        : roleTab === 'siswa'
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 shadow-amber-400/25'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-amber-400/30'
                    }`}
                  >
                    <LogIn className="w-4 h-4 text-slate-950" />
                    <span>
                      LOG IN SEBAGAI {roleTab === 'guru' ? 'GURU' : roleTab === 'siswa' ? 'SISWA' : 'ADMINISTRATOR'}
                    </span>
                  </button>
                </form>
              )}
            </div>

          {/* Quick Account Helper for Registered Teachers/Students - Khusus Admin */}
          {currentUser?.role === 'admin' && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Bantuan Informasi Akun Terdaftar (Khusus Administrator)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpAccounts(!showHelpAccounts)}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer font-bold"
                >
                  {showHelpAccounts ? 'Sembunyikan' : 'Tampilkan Daftar Terdaftar'}
                </button>
              </div>

              {showHelpAccounts && (
                <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-amber-500/20 space-y-3 shadow-inner">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      value={searchAccountQuery}
                      onChange={(e) => setSearchAccountQuery(e.target.value)}
                      placeholder="Cari nama guru / siswa terdaftar..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Daftar Guru Terdaftar (Klik untuk Isi Otomatis):</div>
                    {filteredTeachers.length === 0 ? (
                      <p className="text-xs text-slate-500 py-1 font-medium">Belum ada data guru terdaftar.</p>
                    ) : (
                      filteredTeachers.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setRoleTab('guru');
                            setUsernameInput(t.name);
                            setPasswordInput(t.password || t.birthDate || '');
                            setErrorMessage(null);
                          }}
                          className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl flex items-center justify-between gap-2 text-xs text-left transition-all cursor-pointer group"
                        >
                          <div>
                            <span className="font-bold text-white group-hover:text-amber-300">{t.name}</span>
                            <span className="text-[10px] ml-2 text-indigo-300 font-mono">({t.subject})</span>
                          </div>
                          <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            Pass: {t.birthDate || 'Tanpa Password'}
                          </span>
                        </button>
                      ))
                    )}

                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mt-3 mb-1">Daftar Siswa Terdaftar (Klik untuk Isi Otomatis):</div>
                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-slate-500 py-1 font-medium">Belum ada data siswa terdaftar.</p>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setRoleTab('siswa');
                            setUsernameInput(s.name);
                            setPasswordInput(s.password || s.birthDate || '');
                            setErrorMessage(null);
                          }}
                          className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl flex items-center justify-between gap-2 text-xs text-left transition-all cursor-pointer group"
                        >
                          <div>
                            <span className="font-bold text-white group-hover:text-amber-300">{s.name}</span>
                            <span className="text-[10px] ml-2 text-emerald-300 font-mono">({s.classRoom})</span>
                          </div>
                          <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            Pass: {s.birthDate || 'Tanpa Password'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

