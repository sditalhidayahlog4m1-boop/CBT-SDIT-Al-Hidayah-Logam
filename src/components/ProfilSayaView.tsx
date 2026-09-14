import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  UserCheck,
  ShieldCheck,
  GraduationCap,
  Users,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogIn,
  KeyRound,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  BookOpen,
  Mail,
  BadgeInfo,
  Building,
  HeartHandshake,
  LogOut,
  Search,
  Edit2,
  Key,
  Save,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { AuthUser, Teacher, Student } from '../types';
import {
  getStoredAdminAccount,
  saveStoredAdminAccount,
  saveStoredCurrentUser,
  saveStoredTeachers,
  saveStoredStudents,
} from '../utils/storage';
import { broadcastAppDataChange } from '../utils/syncEngine';
import { compressImage } from '../utils/imageCompressor';

interface ProfilSayaViewProps {
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onOpenLoginModal: () => void;
  onLogout?: () => void;
}

export const ProfilSayaView: React.FC<ProfilSayaViewProps> = ({
  currentUser,
  setCurrentUser,
  teachers,
  setTeachers,
  students,
  setStudents,
  onOpenLoginModal,
  onLogout,
}) => {
  // Common states
  const [photoUrl, setPhotoUrl] = useState('');
  const [syncAlert, setSyncAlert] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Admin Profile states
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Admin Student Manager Sub-tab (for Admin only)
  const [adminActiveTab, setAdminActiveTab] = useState<'admin-profile' | 'manage-students'>('admin-profile');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isEditingStudentModalOpen, setIsEditingStudentModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Student Edit Form (Admin only)
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  // Student Custom User & Pass (Admin only)
  const [studentUsernameInput, setStudentUsernameInput] = useState('');
  const [studentPasswordInput, setStudentPasswordInput] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);

  // Teacher Profile states
  const [teacherName, setTeacherName] = useState('');
  const [teacherPosition, setTeacherPosition] = useState('Guru');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherAddress, setTeacherAddress] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  // Find active student object if currentUser is 'siswa'
  const currentStudentObj: Student | undefined =
    currentUser?.role === 'siswa'
      ? students.find(
          (s) =>
            (currentUser.details && 'id' in currentUser.details && s.id === currentUser.details.id) ||
            (s.nis && s.nis.trim() === (currentUser.username || '').trim()) ||
            (s.username && s.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase()) ||
            s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
        ) || (currentUser.details as Student | undefined)
      : undefined;

  // Selected student in Admin mode
  const selectedStudent: Student | undefined =
    students.find((s) => s.id === selectedStudentId) || students[0];

  // Initialize selectedStudentId for Admin
  useEffect(() => {
    if (currentUser?.role === 'admin' && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [currentUser?.role, students, selectedStudentId]);

  // Sync state with currentUser
  useEffect(() => {
    if (!currentUser) return;
    setPhotoUrl(currentUser.photoUrl || '');

    if (currentUser.role === 'admin') {
      const stored = getStoredAdminAccount();
      setAdminName(currentUser.name || stored.name || 'Administrator System');
      setAdminUsername(currentUser.username || stored.username || 'admin');
      setAdminPassword(currentUser.password || stored.password || 'admin');
    } else if (currentUser.role === 'guru') {
      const matchedTeacher =
        teachers.find(
          (t) =>
            (currentUser.details && 'id' in currentUser.details && t.id === currentUser.details.id) ||
            t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
            (t.username && t.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase())
        ) || (currentUser.details as Teacher | undefined);

      if (matchedTeacher) {
        setTeacherName(matchedTeacher.name || currentUser.name);
        setTeacherPosition(matchedTeacher.position || 'Guru');
        setTeacherSubject(matchedTeacher.subject || '');
        setTeacherPhone(matchedTeacher.phone || '');
        setTeacherEmail(matchedTeacher.email || '');
        setTeacherAddress(matchedTeacher.address || '');
        if (matchedTeacher.photoUrl) setPhotoUrl(matchedTeacher.photoUrl);
      }
    } else if (currentUser.role === 'siswa') {
      if (currentStudentObj?.photoUrl) {
        setPhotoUrl(currentStudentObj.photoUrl);
      }
    }
  }, [currentUser?.id, currentUser?.role, currentStudentObj?.photoUrl]);

  // Sync selected student credentials form when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      setStudentUsernameInput(selectedStudent.username || selectedStudent.nis || selectedStudent.name.toLowerCase().replace(/\s+/g, ''));
      setStudentPasswordInput(selectedStudent.password || selectedStudent.birthDate || '');
    }
  }, [selectedStudent?.id]);

  // Auto-dismiss sync alert
  useEffect(() => {
    if (syncAlert) {
      const timer = setTimeout(() => setSyncAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [syncAlert]);

  // ---------------- PHOTO UPLOAD & SYNC HANDLERS ----------------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setSyncAlert({ type: 'error', message: 'Ukuran file foto maksimal 10 MB.' });
      return;
    }

    setIsProcessingPhoto(true);
    try {
      // Compress to lightweight data URI (~20-30KB) for instant sync & storage
      const compressedPhoto = await compressImage(file, 300, 300, 0.8);
      setPhotoUrl(compressedPhoto);

      if (currentUser) {
        // 1. Update AuthUser & LocalStorage
        const updatedAuthUser: AuthUser = { ...currentUser, photoUrl: compressedPhoto };
        setCurrentUser(updatedAuthUser);
        saveStoredCurrentUser(updatedAuthUser);

        // 2. Synchronize to corresponding role database
        if (currentUser.role === 'admin') {
          const storedAdmin = getStoredAdminAccount();
          const updatedAdmin = { ...storedAdmin, photoUrl: compressedPhoto };
          saveStoredAdminAccount(updatedAdmin);
          broadcastAppDataChange({ adminAccount: updatedAdmin });
        } else if (currentUser.role === 'siswa') {
          const updatedStudentsList = students.map((s) => {
            const isMatch =
              (currentUser.details && 'id' in currentUser.details && s.id === currentUser.details.id) ||
              s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
              (s.username && s.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase()) ||
              (s.nis && s.nis.trim() === (currentUser.username || '').trim());
            return isMatch ? { ...s, photoUrl: compressedPhoto } : s;
          });
          setStudents(updatedStudentsList);
          saveStoredStudents(updatedStudentsList);
          broadcastAppDataChange({ students: updatedStudentsList });
        } else if (currentUser.role === 'guru') {
          const updatedTeachersList = teachers.map((t) => {
            const isMatch =
              (currentUser.details && 'id' in currentUser.details && t.id === currentUser.details.id) ||
              t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
            return isMatch ? { ...t, photoUrl: compressedPhoto } : t;
          });
          setTeachers(updatedTeachersList);
          saveStoredTeachers(updatedTeachersList);
          broadcastAppDataChange({ teachers: updatedTeachersList });
        }

        setSyncAlert({
          type: 'success',
          message: 'Foto profil berhasil diperbarui & disinkronkan langsung dengan logo pojok pengguna!',
        });
      }
    } catch (err: any) {
      setSyncAlert({ type: 'error', message: 'Gagal memproses foto: ' + (err?.message || 'Error') });
    } finally {
      setIsProcessingPhoto(false);
      // Reset input value so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    if (currentUser) {
      // 1. Update AuthUser & LocalStorage
      const updatedAuthUser: AuthUser = { ...currentUser, photoUrl: '' };
      setCurrentUser(updatedAuthUser);
      saveStoredCurrentUser(updatedAuthUser);

      // 2. Synchronize to corresponding role database
      if (currentUser.role === 'admin') {
        const storedAdmin = getStoredAdminAccount();
        const updatedAdmin = { ...storedAdmin, photoUrl: '' };
        saveStoredAdminAccount(updatedAdmin);
        broadcastAppDataChange({ adminAccount: updatedAdmin });
      } else if (currentUser.role === 'siswa') {
        const updatedStudentsList = students.map((s) => {
          const isMatch =
            (currentUser.details && 'id' in currentUser.details && s.id === currentUser.details.id) ||
            s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
            (s.nis && s.nis.trim() === (currentUser.username || '').trim());
          return isMatch ? { ...s, photoUrl: '' } : s;
        });
        setStudents(updatedStudentsList);
        saveStoredStudents(updatedStudentsList);
        broadcastAppDataChange({ students: updatedStudentsList });
      } else if (currentUser.role === 'guru') {
        const updatedTeachersList = teachers.map((t) => {
          const isMatch =
            (currentUser.details && 'id' in currentUser.details && t.id === currentUser.details.id) ||
            t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
          return isMatch ? { ...t, photoUrl: '' } : t;
        });
        setTeachers(updatedTeachersList);
        saveStoredTeachers(updatedTeachersList);
        broadcastAppDataChange({ teachers: updatedTeachersList });
      }

      setSyncAlert({
        type: 'info',
        message: 'Foto profil berhasil dihapus dan dikembalikan ke logo bawaan.',
      });
    }
  };

  // ---------------- ADMIN ACTIONS (EDIT, HAPUS, USER & PASS SISWA) ----------------
  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) return;

    const finalName = adminName.trim() || 'Administrator System';
    const finalUser = adminUsername.trim() || 'admin';
    const finalPass = adminPassword.trim() || 'admin';

    const updatedAdmin = {
      username: finalUser,
      password: finalPass,
      name: finalName,
      photoUrl: photoUrl.trim(),
    };

    saveStoredAdminAccount(updatedAdmin);
    broadcastAppDataChange({ adminAccount: updatedAdmin });

    if (currentUser && currentUser.role === 'admin') {
      const updatedUser: AuthUser = {
        ...currentUser,
        name: finalName,
        username: finalUser,
        password: finalPass,
        photoUrl: photoUrl.trim(),
      };
      setCurrentUser(updatedUser);
      saveStoredCurrentUser(updatedUser);
    }

    setSyncAlert({
      type: 'success',
      message: 'Profil & Kredensial Administrator berhasil disimpan!',
    });
  };

  const handleOpenEditStudentModal = (student: Student) => {
    setEditFormData({ ...student });
    setIsEditingStudentModalOpen(true);
  };

  const handleSaveEditedStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !editFormData.name?.trim()) return;

    const updatedList = students.map((s) => (s.id === selectedStudent.id ? { ...s, ...editFormData } : s));
    setStudents(updatedList);
    saveStoredStudents(updatedList);
    broadcastAppDataChange({ students: updatedList });

    setIsEditingStudentModalOpen(false);
    setSyncAlert({
      type: 'success',
      message: `Biodata siswa ${editFormData.name} berhasil diperbarui oleh Administrator!`,
    });
  };

  const handleSaveStudentCredentials = () => {
    if (!selectedStudent) return;
    const finalUser = studentUsernameInput.trim();
    const finalPass = studentPasswordInput.trim();

    const updatedList = students.map((s) =>
      s.id === selectedStudent.id ? { ...s, username: finalUser, password: finalPass } : s
    );

    setStudents(updatedList);
    saveStoredStudents(updatedList);
    broadcastAppDataChange({ students: updatedList });

    setSyncAlert({
      type: 'success',
      message: `Username & Password untuk siswa "${selectedStudent.name}" berhasil disimpan!`,
    });
  };

  const handleGenerateStudentCredentials = () => {
    if (!selectedStudent) return;
    const cleanNis = (selectedStudent.nis || '').trim();
    const defaultUser = cleanNis || selectedStudent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const defaultPass = (selectedStudent.birthDate || '12345678').trim();

    setStudentUsernameInput(defaultUser);
    setStudentPasswordInput(defaultPass);
  };

  const handleExecuteDeleteStudent = () => {
    if (!studentToDelete) return;
    const studentName = studentToDelete.name;
    const updatedList = students.filter((s) => s.id !== studentToDelete.id);
    setStudents(updatedList);
    saveStoredStudents(updatedList);
    broadcastAppDataChange({ students: updatedList });

    setStudentToDelete(null);
    if (selectedStudentId === studentToDelete.id && updatedList.length > 0) {
      setSelectedStudentId(updatedList[0].id);
    }

    setSyncAlert({
      type: 'info',
      message: `Data siswa "${studentName}" berhasil dihapus dari sistem.`,
    });
  };

  const handleStudentPhotoUploadByAdmin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedStudent) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 300, 300, 0.8);
      const updatedList = students.map((s) => (s.id === selectedStudent.id ? { ...s, photoUrl: compressed } : s));
      setStudents(updatedList);
      saveStoredStudents(updatedList);
      broadcastAppDataChange({ students: updatedList });

      setSyncAlert({
        type: 'success',
        message: `Foto siswa "${selectedStudent.name}" berhasil diunggah!`,
      });
    } catch (err: any) {
      setSyncAlert({ type: 'error', message: 'Gagal mengunggah foto siswa: ' + err.message });
    } finally {
      if (studentFileInputRef.current) studentFileInputRef.current.value = '';
    }
  };

  const handleRemoveStudentPhotoByAdmin = () => {
    if (!selectedStudent) return;
    const updatedList = students.map((s) => (s.id === selectedStudent.id ? { ...s, photoUrl: '' } : s));
    setStudents(updatedList);
    saveStoredStudents(updatedList);
    broadcastAppDataChange({ students: updatedList });

    setSyncAlert({
      type: 'info',
      message: `Foto siswa "${selectedStudent.name}" berhasil dihapus.`,
    });
  };

  // ---------------- NOT LOGGED IN STATE ----------------
  if (!currentUser) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-[#0f172a] border border-amber-500/30 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <Lock className="w-10 h-10 animate-bounce" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Anda Belum Masuk Akun</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Silakan login sebagai <strong>Siswa</strong> untuk melihat biodata lengkap dan mengelola foto profil, atau sebagai <strong>Administrator</strong> untuk pengelolaan akun.
            </p>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            <span>Masuk ke Akun Sekarang</span>
          </button>
        </div>
      </div>
    );
  }

  // Filtered students for Admin selector
  const filteredStudents = students.filter((s) => {
    const term = studentSearchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.nis || '').includes(term) ||
      (s.nisn || '').includes(term) ||
      (s.classRoom || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* SYNC NOTIFICATION TOAST */}
      {syncAlert && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 shadow-lg transition-all animate-fadeIn ${
            syncAlert.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : syncAlert.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
          }`}
        >
          {syncAlert.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : syncAlert.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs sm:text-sm font-semibold leading-relaxed">
            {syncAlert.message}
          </div>
          <button
            onClick={() => setSyncAlert(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP PROFILE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0b132b] to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* Avatar Photo Frame with Upload, Change & Delete */}
          <div className="relative group shrink-0">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-950 border-2 border-amber-400/50 flex items-center justify-center overflow-hidden shadow-2xl relative cursor-pointer group-hover:border-amber-400 transition-all"
              title="Klik untuk memilih atau mengganti foto profil (sinkron dengan logo pojok kanan atas)"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-amber-400/80 p-2 group-hover:bg-slate-800/80 transition-colors">
                  {currentUser.role === 'siswa' ? (
                    <GraduationCap className="w-12 h-12 mb-1" />
                  ) : currentUser.role === 'guru' ? (
                    <Users className="w-12 h-12 mb-1" />
                  ) : (
                    <ShieldCheck className="w-12 h-12 mb-1" />
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tanpa Foto</span>
                </div>
              )}

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[10px] font-bold text-white bg-slate-900/95 px-2.5 py-1 rounded-full border border-slate-700 shadow-md flex items-center gap-1">
                  <Camera className="w-3 h-3 text-amber-400" />
                  {photoUrl ? 'Ganti Foto' : 'Unggah Foto'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Camera Upload & Red Trash Delete */}
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1.5 z-20">
              {photoUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto();
                  }}
                  className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl shadow-xl border-2 border-slate-900 transition-all cursor-pointer hover:scale-110 active:scale-95"
                  title="Hapus Foto Profil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isProcessingPhoto}
                className="p-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl shadow-xl border-2 border-slate-900 transition-all cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-50"
                title="Pilih / Ganti Foto Profil Baru"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* User Bio Information */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border ${
                  currentUser.role === 'siswa'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : currentUser.role === 'guru'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {currentUser.role === 'siswa'
                  ? 'Peserta Didik (Siswa)'
                  : currentUser.role === 'guru'
                  ? 'Tenaga Pendidik (Guru)'
                  : 'Administrator Utama'}
              </span>

              {currentUser.role === 'siswa' && currentStudentObj?.classRoom && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                  Kelas: {currentStudentObj.classRoom}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentUser.name}
            </h2>

            <p className="text-xs text-slate-400 max-w-xl">
              {currentUser.role === 'siswa'
                ? 'Profil Biodata Resmi Peserta Didik SDIT Al Hidayah Logam. Anda dapat mengunggah atau mengganti foto profil yang langsung terhubung ke logo akun Anda di pojok kanan atas.'
                : currentUser.role === 'guru'
                ? 'Profil Pendidik & Akun Pengajar Sekolah.'
                : 'Portal Administrator: Pengelolaan profil sekolah, data siswa, serta pengaturan kredensial (user & pass).'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: VIEW FOR SISWA (BIODATA READ-ONLY, FOTO UPLOAD/HAPUS, NO USER/PASS) */}
      {/* ========================================================================= */}
      {currentUser.role === 'siswa' && (
        <div className="space-y-6">
          {/* Read-Only Notice Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 flex items-start gap-3.5 shadow-md">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wide flex items-center gap-2">
                <span>Biodata Siswa Resmi Terverifikasi (Hanya Lihat)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                  Read-Only Master Data
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Biodata siswa di bawah ini tercatat resmi di database sekolah dan <strong>bersifat hanya lihat</strong>. Jika terdapat kesalahan penulisan nama, kelas, atau identitas lainnya, silakan mengajukan perubahan kepada <strong>Administrator / Wali Kelas</strong>. Anda tetap memiliki akses penuh untuk <strong>mengunggah, mengganti, atau menghapus foto profil</strong> Anda di atas (otomatis tersinkronkan dengan logo pojok kanan atas).
              </p>
            </div>
          </div>

          {/* Card 1: Identitas Pokok Peserta Didik */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>1. Identitas Pokok Peserta Didik</span>
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Terkunci</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Nama Lengkap */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 sm:col-span-2 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nama Lengkap Siswa
                </span>
                <p className="text-sm sm:text-base font-extrabold text-white">
                  {currentStudentObj?.name || currentUser.name}
                </p>
              </div>

              {/* Status Keaktifan */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status Siswa
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {currentStudentObj?.activeStatus || 'Aktif'}
                </span>
              </div>

              {/* NIS */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nomor Induk Siswa (NIS)
                </span>
                <p className="text-sm font-mono font-bold text-amber-300">
                  {currentStudentObj?.nis || '-'}
                </p>
              </div>

              {/* NISN */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  NISN (Nasional)
                </span>
                <p className="text-sm font-mono font-bold text-slate-200">
                  {currentStudentObj?.nisn || '-'}
                </p>
              </div>

              {/* Jenis Kelamin */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Jenis Kelamin
                </span>
                <p className="text-sm font-bold text-white">
                  {currentStudentObj?.gender === 'P' ? 'Perempuan (P)' : 'Laki-Laki (L)'}
                </p>
              </div>

              {/* Kelas & Rombel */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Building className="w-3 h-3 text-emerald-400" />
                  <span>Kelas / Rombel</span>
                </span>
                <p className="text-sm font-extrabold text-emerald-300">
                  {currentStudentObj?.classRoom || '-'}
                </p>
              </div>

              {/* Tahun Ajaran */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tahun Ajaran
                </span>
                <p className="text-sm font-bold text-slate-200">
                  {currentStudentObj?.academicYear || '2024/2025'}
                </p>
              </div>

              {/* Tempat & Tanggal Lahir */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>Tempat & Tanggal Lahir</span>
                </span>
                <p className="text-sm font-bold text-white">
                  {currentStudentObj?.birthPlace
                    ? `${currentStudentObj.birthPlace}, ${currentStudentObj.birthDate || '-'}`
                    : currentStudentObj?.birthDate || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Biodata Keluarga & Kontak Orang Tua / Wali */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span>2. Data Orang Tua / Wali & Alamat Tempat Tinggal</span>
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Terkunci</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Ayah */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nama Ayah / Wali
                </span>
                <p className="text-sm font-bold text-white">
                  {currentStudentObj?.fatherName || '-'}
                </p>
                {currentStudentObj?.fatherPhone && (
                  <p className="text-xs text-emerald-400 font-mono flex items-center gap-1 pt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{currentStudentObj.fatherPhone}</span>
                  </p>
                )}
              </div>

              {/* Nama Ibu */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nama Ibu
                </span>
                <p className="text-sm font-bold text-white">
                  {currentStudentObj?.motherName || '-'}
                </p>
                {currentStudentObj?.motherPhone && (
                  <p className="text-xs text-emerald-400 font-mono flex items-center gap-1 pt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{currentStudentObj.motherPhone}</span>
                  </p>
                )}
              </div>

              {/* Alamat Lengkap */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 sm:col-span-2 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span>Alamat Domisili / Rumah Siswa</span>
                </span>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {currentStudentObj?.address || 'Alamat belum tercatat di sistem.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Logout */}
          {onLogout && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
              <p className="text-xs text-slate-400">
                Selesai melihat biodata atau mengikuti ujian? Anda dapat keluar secara aman.
              </p>
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 hover:text-rose-100 border border-rose-500/30 hover:border-rose-500/50 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Keluar dari Akun Siswa</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: VIEW FOR ADMINISTRATOR (ADMIN PROFILE + KELOLA BIODATA SISWA) */}
      {/* ========================================================================= */}
      {currentUser.role === 'admin' && (
        <div className="space-y-6">
          {/* Sub-tabs switch */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              onClick={() => setAdminActiveTab('admin-profile')}
              className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                adminActiveTab === 'admin-profile'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Profil Administrator Saya</span>
            </button>
            <button
              onClick={() => setAdminActiveTab('manage-students')}
              className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                adminActiveTab === 'manage-students'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Kelola Biodata Siswa & Akun (Admin)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/40 font-mono">
                {students.length}
              </span>
            </button>
          </div>

          {/* SUB-TAB 1: PROFIL ADMIN */}
          {adminActiveTab === 'admin-profile' && (
            <form onSubmit={handleSaveAdminProfile} className="space-y-6">
              {/* Identitas Admin */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Identitas Administrator Utama</span>
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nama Administrator / Tampilan <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Contoh: Administrator Utama CBT"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Kredensial Admin */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Kredensial Login Administrator</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Khusus Admin
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Username Admin <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Username admin..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Password Admin <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Password admin..."
                        className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Administrator</span>
                </button>
              </div>
            </form>
          )}

          {/* SUB-TAB 2: KELOLA BIODATA SISWA, EDIT, HAPUS & TAMBAHAN USER & PASS SISWA (ADMIN) */}
          {adminActiveTab === 'manage-students' && (
            <div className="space-y-6">
              {/* Header Selector Box */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>Pilih Siswa untuk Kelola Biodata & Kredensial</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Admin dapat mengedit biodata, menghapus siswa, serta menambahkan/mengatur <strong>Username & Password</strong> khusus ujian.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder="Cari nama, NIS, kelas..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Dropdown Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Daftar Siswa Terdaftar:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} - Kelas: {s.classRoom || 'N/A'} (NIS: {s.nis || '-'})
                      </option>
                    ))}
                    {filteredStudents.length === 0 && (
                      <option value="" disabled>
                        Tidak ada siswa yang cocok dengan pencarian
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {selectedStudent ? (
                <div className="space-y-6 animate-fadeIn">
                  {/* Student Card Summary with Actions (Edit, Hapus, Foto) */}
                  <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-5">
                      <div className="flex items-center gap-4">
                        {/* Student Photo */}
                        <div className="relative group">
                          <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-amber-400/40 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                            {selectedStudent.photoUrl ? (
                              <img
                                src={selectedStudent.photoUrl}
                                alt={selectedStudent.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <GraduationCap className="w-9 h-9 text-amber-400/60" />
                            )}
                          </div>
                          <div className="absolute -bottom-1.5 -right-1.5 flex items-center gap-1">
                            {selectedStudent.photoUrl && (
                              <button
                                type="button"
                                onClick={handleRemoveStudentPhotoByAdmin}
                                className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-md border border-slate-900 cursor-pointer"
                                title="Hapus foto siswa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => studentFileInputRef.current?.click()}
                              className="p-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-md border border-slate-900 cursor-pointer"
                              title="Unggah / ganti foto siswa"
                            >
                              <Camera className="w-3 h-3" />
                            </button>
                          </div>
                          <input
                            ref={studentFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleStudentPhotoUploadByAdmin}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {selectedStudent.classRoom || 'Tanpa Kelas'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              NIS: {selectedStudent.nis || '-'}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-white mt-1">
                            {selectedStudent.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {selectedStudent.gender === 'P' ? 'Perempuan' : 'Laki-Laki'} • TTL: {selectedStudent.birthPlace || '-'}, {selectedStudent.birthDate || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons: Edit Biodata & Hapus Siswa */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenEditStudentModal(selectedStudent)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                          title="Edit biodata siswa lengkap"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Biodata</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(selectedStudent)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                          title="Hapus siswa ini dari sistem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Siswa</span>
                        </button>
                      </div>
                    </div>

                    {/* SECTION TAMBAHAN USER & PASS SISWA (KHUSUS ADMIN) */}
                    <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                            Kredensial Akun Siswa (User & Pass Khusus Admin)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateStudentCredentials}
                          className="text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                          title="Isi otomatis username dari NIS dan password dari Tanggal Lahir"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Generate dari NIS & TTL</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                            Username / ID Siswa
                          </label>
                          <input
                            type="text"
                            value={studentUsernameInput}
                            onChange={(e) => setStudentUsernameInput(e.target.value)}
                            placeholder="Contoh: 1001 atau nama_siswa"
                            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="text-[10px] text-slate-500 block">
                            Siswa dapat masuk menggunakan Username ini atau NIS/NISN.
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                            Password / Kata Sandi Siswa
                          </label>
                          <div className="relative">
                            <input
                              type={showStudentPass ? 'text' : 'password'}
                              value={studentPasswordInput}
                              onChange={(e) => setStudentPasswordInput(e.target.value)}
                              placeholder="Masukkan password baru siswa..."
                              className="w-full pl-3.5 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowStudentPass(!showStudentPass)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                            >
                              {showStudentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Default: Tanggal Lahir (DD/MM/YYYY) atau password kustom.
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveStudentCredentials}
                          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Simpan User & Pass Siswa</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview Biodata Siswa */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <BadgeInfo className="w-4 h-4 text-indigo-400" />
                        <span>Rincian Biodata Tersimpan:</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">NISN</span>
                          <span className="font-bold text-slate-200">{selectedStudent.nisn || '-'}</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Tahun Ajaran</span>
                          <span className="font-bold text-slate-200">{selectedStudent.academicYear || '2024/2025'}</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Status</span>
                          <span className="font-bold text-emerald-400">{selectedStudent.activeStatus || 'Aktif'}</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Nama Ayah</span>
                          <span className="font-bold text-slate-200">{selectedStudent.fatherName || '-'}</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Nama Ibu</span>
                          <span className="font-bold text-slate-200">{selectedStudent.motherName || '-'}</span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">No. HP Orang Tua</span>
                          <span className="font-bold text-slate-200">
                            {selectedStudent.fatherPhone || selectedStudent.motherPhone || '-'}
                          </span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 sm:col-span-2 md:col-span-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Alamat Rumah</span>
                          <span className="text-slate-300">{selectedStudent.address || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-[#0f172a] border border-slate-800 rounded-3xl text-slate-400">
                  <p>Tidak ada data siswa yang dipilih.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: VIEW FOR GURU & UMUM */}
      {/* ========================================================================= */}
      {currentUser.role === 'guru' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Identitas Pendidik (Guru)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</span>
              <p className="text-sm font-bold text-white">{teacherName || currentUser.name}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Jabatan</span>
              <p className="text-sm font-bold text-amber-300">{teacherPosition}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mata Pelajaran yang Diampu</span>
              <p className="text-sm font-bold text-white">{teacherSubject || '-'}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">No. HP / Kontak</span>
              <p className="text-sm font-bold text-emerald-400">{teacherPhone || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {currentUser.role === 'umum' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Pengunjung Umum</span>
          </h3>
          <p className="text-xs text-slate-300">
            Anda masuk sebagai akun tamu/umum. Anda dapat berlatih dan mengerjakan soal-soal latihan mandiri.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT BIODATA SISWA (KHUSUS ADMINISTRATOR) */}
      {/* ========================================================================= */}
      {isEditingStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0f172a] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Edit Biodata Siswa: {editFormData.name}</span>
              </h3>
              <button
                onClick={() => setIsEditingStudentModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">NIS</label>
                  <input
                    type="text"
                    value={editFormData.nis || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, nis: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">NISN</label>
                  <input
                    type="text"
                    value={editFormData.nisn || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, nisn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jenis Kelamin</label>
                  <select
                    value={editFormData.gender || 'L'}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white cursor-pointer"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={editFormData.birthPlace || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tanggal Lahir (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={editFormData.birthDate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nama Ayah / Wali</label>
                  <input
                    type="text"
                    value={editFormData.fatherName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">No. HP Ayah</label>
                  <input
                    type="tel"
                    value={editFormData.fatherPhone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, fatherPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nama Ibu</label>
                  <input
                    type="text"
                    value={editFormData.motherName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">No. HP Ibu</label>
                  <input
                    type="tel"
                    value={editFormData.motherPhone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, motherPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Alamat Rumah Lengkap</label>
                <textarea
                  rows={2}
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Kelas *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.classRoom || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, classRoom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={editFormData.academicYear || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Status</label>
                  <select
                    value={editFormData.activeStatus || 'Aktif'}
                    onChange={(e) => setEditFormData({ ...editFormData, activeStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingStudentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black shadow-lg cursor-pointer"
                >
                  Simpan Perubahan Biodata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS SISWA (KHUSUS ADMINISTRATOR) */}
      {/* ========================================================================= */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-500/30">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Konfirmasi Hapus Data Siswa</h3>
              <p className="text-xs text-slate-300">
                Apakah Anda yakin ingin menghapus data siswa <strong>"{studentToDelete.name}"</strong> (Kelas: {studentToDelete.classRoom})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteStudent}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Ya, Hapus Siswa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
