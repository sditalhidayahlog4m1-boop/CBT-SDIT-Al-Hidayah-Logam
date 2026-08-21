import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  BookOpen,
  Mail,
  BadgeInfo,
  Building,
  HeartHandshake,
  RefreshCw,
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
}

const JABATAN_OPTIONS = [
  'Guru',
  'Kepala Sekolah',
  'Guru Inklusi',
  'Guru Pendamping',
  'TAS (Tenaga Administrasi Sekolah)',
  'Lainnya',
];

export const ProfilSayaView: React.FC<ProfilSayaViewProps> = ({
  currentUser,
  setCurrentUser,
  teachers,
  setTeachers,
  students,
  setStudents,
  onOpenLoginModal,
}) => {
  // Common states
  const [photoUrl, setPhotoUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');

  // Admin Credentials
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Teacher specific states (Guru)
  const [teacherName, setTeacherName] = useState('');
  const [teacherGender, setTeacherGender] = useState<'L' | 'P' | string>('L');
  const [teacherBirthPlace, setTeacherBirthPlace] = useState('');
  const [teacherBirthDate, setTeacherBirthDate] = useState('');
  const [teacherPosition, setTeacherPosition] = useState('Guru');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherNik, setTeacherNik] = useState('');
  const [teacherNuptk, setTeacherNuptk] = useState('');
  const [teacherNip, setTeacherNip] = useState('');
  const [teacherAddress, setTeacherAddress] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherActiveStatus, setTeacherActiveStatus] = useState('Aktif');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPasswordMasked, setTeacherPasswordMasked] = useState('');

  // Student specific states (Siswa)
  const [studentName, setStudentName] = useState('');
  const [studentNis, setStudentNis] = useState('');
  const [studentNisn, setStudentNisn] = useState('');
  const [studentClassRoom, setStudentClassRoom] = useState('');
  const [studentAcademicYear, setStudentAcademicYear] = useState('');
  const [studentGender, setStudentGender] = useState<'L' | 'P' | string>('L');
  const [studentBirthPlace, setStudentBirthPlace] = useState('');
  const [studentBirthDate, setStudentBirthDate] = useState('');
  const [studentFatherName, setStudentFatherName] = useState('');
  const [studentMotherName, setStudentMotherName] = useState('');
  const [studentFatherPhone, setStudentFatherPhone] = useState('');
  const [studentMotherPhone, setStudentMotherPhone] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [studentActiveStatus, setStudentActiveStatus] = useState('Aktif');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPasswordMasked, setStudentPasswordMasked] = useState('');

  // General user (Umum)
  const [generalName, setGeneralName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync data with current logged in user and corresponding dataset (teachers / students)
  useEffect(() => {
    if (!currentUser) return;

    setPhotoUrl(currentUser.photoUrl || '');

    if (currentUser.role === 'admin') {
      const storedAdmin = getStoredAdminAccount();
      setAdminName(currentUser.name || storedAdmin.name || 'Administrator System');
      setAdminUsername(currentUser.username || storedAdmin.username || 'admin');
      setAdminPassword(currentUser.password || storedAdmin.password || 'admin');
    } else if (currentUser.role === 'guru') {
      // Find teacher in live teachers array
      const matchedTeacher =
        teachers.find(
          (t) =>
            (currentUser.details && 'id' in currentUser.details && t.id === currentUser.details.id) ||
            t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
            (t.username && t.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase())
        ) || (currentUser.details as Teacher | undefined);

      if (matchedTeacher) {
        setTeacherName(matchedTeacher.name || currentUser.name || '');
        setTeacherGender(matchedTeacher.gender || 'L');
        setTeacherBirthPlace(matchedTeacher.birthPlace || '');
        setTeacherBirthDate(matchedTeacher.birthDate || '');
        setTeacherPosition(matchedTeacher.position || 'Guru');
        setTeacherSubject(matchedTeacher.subject || '');
        setTeacherNik(matchedTeacher.nik || '');
        setTeacherNuptk(matchedTeacher.nuptk || '');
        setTeacherNip(matchedTeacher.nip || '');
        setTeacherAddress(matchedTeacher.address || '');
        setTeacherPhone(matchedTeacher.phone || '');
        setTeacherEmail(matchedTeacher.email || '');
        setTeacherActiveStatus(matchedTeacher.activeStatus || 'Aktif');
        setTeacherUsername(matchedTeacher.username || currentUser.username || matchedTeacher.name.toLowerCase().replace(/\s+/g, ''));
        setTeacherPasswordMasked(matchedTeacher.password || currentUser.password || matchedTeacher.birthDate || '••••••••');
        if (matchedTeacher.photoUrl) setPhotoUrl(matchedTeacher.photoUrl);
      } else {
        setTeacherName(currentUser.name || '');
        setTeacherUsername(currentUser.username || currentUser.name.toLowerCase().replace(/\s+/g, ''));
        setTeacherPasswordMasked(currentUser.password || '••••••••');
      }
    } else if (currentUser.role === 'siswa') {
      // Find student in live students array
      const matchedStudent =
        students.find(
          (s) =>
            (currentUser.details && 'id' in currentUser.details && s.id === currentUser.details.id) ||
            s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
            (s.username && s.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase()) ||
            (s.nis && s.nis.trim() === (currentUser.username || '').trim())
        ) || (currentUser.details as Student | undefined);

      if (matchedStudent) {
        setStudentName(matchedStudent.name || currentUser.name || '');
        setStudentNis(matchedStudent.nis || '');
        setStudentNisn(matchedStudent.nisn || '');
        setStudentClassRoom(matchedStudent.classRoom || '');
        setStudentAcademicYear(matchedStudent.academicYear || '2025/2026');
        setStudentGender(matchedStudent.gender || 'L');
        setStudentBirthPlace(matchedStudent.birthPlace || '');
        setStudentBirthDate(matchedStudent.birthDate || '');
        setStudentFatherName(matchedStudent.fatherName || '');
        setStudentMotherName(matchedStudent.motherName || '');
        setStudentFatherPhone(matchedStudent.fatherPhone || '');
        setStudentMotherPhone(matchedStudent.motherPhone || '');
        setStudentAddress(matchedStudent.address || '');
        setStudentActiveStatus(matchedStudent.activeStatus || 'Aktif');
        setStudentUsername(matchedStudent.username || currentUser.username || matchedStudent.nis || matchedStudent.name.toLowerCase().replace(/\s+/g, ''));
        setStudentPasswordMasked(matchedStudent.password || currentUser.password || matchedStudent.birthDate || '••••••••');
        if (matchedStudent.photoUrl) setPhotoUrl(matchedStudent.photoUrl);
      } else {
        setStudentName(currentUser.name || '');
        setStudentUsername(currentUser.username || currentUser.name.toLowerCase().replace(/\s+/g, ''));
        setStudentPasswordMasked(currentUser.password || '••••••••');
      }
    } else {
      setGeneralName(currentUser.name || 'Pengunjung Umum');
    }

    // Delay setting isInitialLoadRef to false to avoid initial spurious auto-save trigger
    const initialTimer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 400);

    return () => clearTimeout(initialTimer);
  }, [currentUser?.id, currentUser?.role]);

  // AUTO-SAVE ENGINE FOR ADMINISTRATOR
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || isInitialLoadRef.current) return;

    setAutoSaveStatus('saving');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      const finalName = adminName.trim() || 'Administrator System';
      const finalUsername = adminUsername.trim() || 'admin';
      const finalPassword = adminPassword.trim() || 'admin';
      const finalPhoto = photoUrl.trim();

      const updatedAdminObj = {
        username: finalUsername,
        password: finalPassword,
        name: finalName,
        photoUrl: finalPhoto,
      };

      saveStoredAdminAccount(updatedAdminObj);
      broadcastAppDataChange({ adminAccount: updatedAdminObj });

      const updatedAdminUser: AuthUser = {
        ...currentUser,
        name: finalName,
        username: finalUsername,
        password: finalPassword,
        photoUrl: finalPhoto,
      };

      setCurrentUser(updatedAdminUser);
      saveStoredCurrentUser(updatedAdminUser);

      setAutoSaveStatus('saved');
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [adminName, adminUsername, adminPassword, currentUser?.role]);

  // AUTO-SAVE ENGINE FOR GURU
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'guru' || isInitialLoadRef.current) return;
    if (!teacherName.trim()) return;

    setAutoSaveStatus('saving');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      let updatedTeacherObj: Teacher | null = null;
      const updatedTeachersList = teachers.map((t) => {
        const isMatch =
          (currentUser.details && 'id' in currentUser.details && t.id === currentUser.details.id) ||
          t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
          (t.username && t.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase());

        if (isMatch) {
          const updated: Teacher = {
            ...t,
            name: teacherName.trim(),
            gender: teacherGender,
            birthPlace: teacherBirthPlace.trim(),
            birthDate: teacherBirthDate.trim(),
            position: teacherPosition.trim(),
            subject: teacherSubject.trim(),
            nik: teacherNik.trim(),
            nuptk: teacherNuptk.trim(),
            nip: teacherNip.trim(),
            address: teacherAddress.trim(),
            phone: teacherPhone.trim(),
            email: teacherEmail.trim(),
            activeStatus: teacherActiveStatus,
            photoUrl: photoUrl.trim(),
          };
          updatedTeacherObj = updated;
          return updated;
        }
        return t;
      });

      if (!updatedTeacherObj) {
        const newTeacher: Teacher = {
          id: (currentUser.details as Teacher)?.id || `guru-${Date.now()}`,
          name: teacherName.trim(),
          gender: teacherGender,
          birthPlace: teacherBirthPlace.trim(),
          birthDate: teacherBirthDate.trim(),
          position: teacherPosition.trim(),
          subject: teacherSubject.trim(),
          nik: teacherNik.trim(),
          nuptk: teacherNuptk.trim(),
          nip: teacherNip.trim(),
          address: teacherAddress.trim(),
          phone: teacherPhone.trim(),
          email: teacherEmail.trim(),
          activeStatus: teacherActiveStatus,
          photoUrl: photoUrl.trim(),
          username: currentUser.username || teacherName.toLowerCase().replace(/\s+/g, ''),
          password: currentUser.password || teacherBirthDate.trim(),
        };
        updatedTeacherObj = newTeacher;
        updatedTeachersList.push(newTeacher);
      }

      setTeachers(updatedTeachersList);
      saveStoredTeachers(updatedTeachersList);
      broadcastAppDataChange({ teachers: updatedTeachersList });

      const updatedAuthUser: AuthUser = {
        ...currentUser,
        name: teacherName.trim(),
        photoUrl: photoUrl.trim(),
        details: updatedTeacherObj,
      };
      setCurrentUser(updatedAuthUser);
      saveStoredCurrentUser(updatedAuthUser);

      setAutoSaveStatus('saved');
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    teacherName,
    teacherGender,
    teacherBirthPlace,
    teacherBirthDate,
    teacherPosition,
    teacherSubject,
    teacherNik,
    teacherNuptk,
    teacherNip,
    teacherAddress,
    teacherPhone,
    teacherEmail,
    teacherActiveStatus,
    currentUser?.role,
  ]);

  // AUTO-SAVE ENGINE FOR SISWA
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'siswa' || isInitialLoadRef.current) return;
    if (!studentName.trim()) return;

    setAutoSaveStatus('saving');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      let updatedStudentObj: Student | null = null;
      const updatedStudentsList = students.map((s) => {
        const isMatch =
          (currentUser.details && 'id' in currentUser.details && s.id === currentUser.details.id) ||
          s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
          (s.username && s.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase()) ||
          (s.nis && s.nis.trim() === (currentUser.username || '').trim());

        if (isMatch) {
          const updated: Student = {
            ...s,
            name: studentName.trim(),
            nis: studentNis.trim(),
            nisn: studentNisn.trim(),
            classRoom: studentClassRoom.trim(),
            academicYear: studentAcademicYear.trim(),
            gender: studentGender,
            birthPlace: studentBirthPlace.trim(),
            birthDate: studentBirthDate.trim(),
            fatherName: studentFatherName.trim(),
            motherName: studentMotherName.trim(),
            fatherPhone: studentFatherPhone.trim(),
            motherPhone: studentMotherPhone.trim(),
            address: studentAddress.trim(),
            activeStatus: studentActiveStatus,
            photoUrl: photoUrl.trim(),
          };
          updatedStudentObj = updated;
          return updated;
        }
        return s;
      });

      if (!updatedStudentObj) {
        const newStudent: Student = {
          id: (currentUser.details as Student)?.id || `siswa-${Date.now()}`,
          name: studentName.trim(),
          nis: studentNis.trim(),
          nisn: studentNisn.trim(),
          classRoom: studentClassRoom.trim(),
          academicYear: studentAcademicYear.trim(),
          gender: studentGender,
          birthPlace: studentBirthPlace.trim(),
          birthDate: studentBirthDate.trim(),
          fatherName: studentFatherName.trim(),
          motherName: studentMotherName.trim(),
          fatherPhone: studentFatherPhone.trim(),
          motherPhone: studentMotherPhone.trim(),
          address: studentAddress.trim(),
          activeStatus: studentActiveStatus,
          photoUrl: photoUrl.trim(),
          username: currentUser.username || studentNis.trim() || studentName.toLowerCase().replace(/\s+/g, ''),
          password: currentUser.password || studentBirthDate.trim(),
        };
        updatedStudentObj = newStudent;
        updatedStudentsList.push(newStudent);
      }

      setStudents(updatedStudentsList);
      saveStoredStudents(updatedStudentsList);
      broadcastAppDataChange({ students: updatedStudentsList });

      const updatedAuthUser: AuthUser = {
        ...currentUser,
        name: studentName.trim(),
        photoUrl: photoUrl.trim(),
        details: updatedStudentObj,
      };
      setCurrentUser(updatedAuthUser);
      saveStoredCurrentUser(updatedAuthUser);

      setAutoSaveStatus('saved');
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    studentName,
    studentNis,
    studentNisn,
    studentClassRoom,
    studentAcademicYear,
    studentGender,
    studentBirthPlace,
    studentBirthDate,
    studentFatherName,
    studentMotherName,
    studentFatherPhone,
    studentMotherPhone,
    studentAddress,
    studentActiveStatus,
    currentUser?.role,
  ]);

  // AUTO-SAVE ENGINE FOR UMUM
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'umum' || isInitialLoadRef.current) return;

    setAutoSaveStatus('saving');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      const updatedGeneralUser: AuthUser = {
        ...currentUser,
        name: generalName.trim() || 'Pengunjung Umum',
        photoUrl: photoUrl.trim(),
      };
      setCurrentUser(updatedGeneralUser);
      saveStoredCurrentUser(updatedGeneralUser);
      setAutoSaveStatus('saved');
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [generalName, currentUser?.role]);

  // Handle Photo Upload via File Reader & Auto-Compress
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 10 MB!');
      return;
    }

    try {
      // Auto compress photo to ~20KB so Firestore syncing is instantaneous
      const compressedPhoto = await compressImage(file, 300, 300, 0.75);
      setPhotoUrl(compressedPhoto);
      setErrorMsg(null);

      // Realtime instant sync to current user and respective records
      if (currentUser) {
        const updatedUser: AuthUser = { ...currentUser, photoUrl: compressedPhoto };
        setCurrentUser(updatedUser);
        saveStoredCurrentUser(updatedUser);

        if (currentUser.role === 'admin') {
          const storedAdmin = getStoredAdminAccount();
          const updatedAdmin = { ...storedAdmin, photoUrl: compressedPhoto };
          saveStoredAdminAccount(updatedAdmin);
          broadcastAppDataChange({ adminAccount: updatedAdmin });
        } else if (currentUser.role === 'guru') {
          const updatedTeachersList = teachers.map((t) => {
            const isMatch =
              (currentUser.details && 'id' in currentUser.details && t.id === currentUser.details.id) ||
              t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
              (t.username && t.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase());
            return isMatch ? { ...t, photoUrl: compressedPhoto } : t;
          });
          setTeachers(updatedTeachersList);
          saveStoredTeachers(updatedTeachersList);
          broadcastAppDataChange({ teachers: updatedTeachersList });
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
        }
      }
    } catch (err: any) {
      setErrorMsg('Gagal memproses foto: ' + (err?.message || 'Error'));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    if (currentUser) {
      const updatedUser: AuthUser = { ...currentUser, photoUrl: '' };
      setCurrentUser(updatedUser);
      saveStoredCurrentUser(updatedUser);

      if (currentUser.role === 'admin') {
        const storedAdmin = getStoredAdminAccount();
        const updatedAdmin = { ...storedAdmin, photoUrl: '' };
        saveStoredAdminAccount(updatedAdmin);
        broadcastAppDataChange({ adminAccount: updatedAdmin });
      } else if (currentUser.role === 'guru') {
        const updatedTeachersList = teachers.map((t) => {
          const isMatch =
            (currentUser.details && 'id' in currentUser.details && t.id === currentUser.details.id) ||
            t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
            (t.username && t.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase());
          return isMatch ? { ...t, photoUrl: '' } : t;
        });
        setTeachers(updatedTeachersList);
        saveStoredTeachers(updatedTeachersList);
        broadcastAppDataChange({ teachers: updatedTeachersList });
      } else if (currentUser.role === 'siswa') {
        const updatedStudentsList = students.map((s) => {
          const isMatch =
            (currentUser.details && 'id' in currentUser.details && s.id === currentUser.details.id) ||
            s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
            (s.username && s.username.trim().toLowerCase() === (currentUser.username || '').trim().toLowerCase()) ||
            (s.nis && s.nis.trim() === (currentUser.username || '').trim());
          return isMatch ? { ...s, photoUrl: '' } : s;
        });
        setStudents(updatedStudentsList);
        saveStoredStudents(updatedStudentsList);
        broadcastAppDataChange({ students: updatedStudentsList });
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
        <div className="bg-[#0f172a] border border-amber-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-10 h-10 animate-bounce" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white">Anda Belum Log In</h2>
            <p className="text-sm text-slate-400">
              Silakan masuk ke akun Anda sebagai Admin, Guru, Siswa, atau Umum untuk melihat dan mengelola profil identitas Anda.
            </p>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            <span>Masuk ke Sistem</span>
          </button>
        </div>
      </div>
    );
  }

  const roleConfig = {
    admin: {
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      title: 'Administrator Utama',
      icon: ShieldCheck,
      desc: 'Memiliki wewenang penuh atas seluruh data sekolah, konfigurasi akun, username, dan kata sandi.',
    },
    guru: {
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      title: 'Tenaga Pendidik / Guru',
      icon: Users,
      desc: 'Terhubung langsung dengan Master Data Guru. Perubahan identitas & kontak akan otomatis tersinkronisasi.',
    },
    siswa: {
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      title: 'Peserta Didik / Siswa',
      icon: GraduationCap,
      desc: 'Terhubung langsung dengan Master Data Siswa. Perubahan biodata & kontak akan otomatis tersinkronisasi.',
    },
    umum: {
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      title: 'Pengunjung / Akun Umum',
      icon: User,
      desc: 'Akun tamu untuk latihan mandiri dan eksplorasi materi soal.',
    },
  }[currentUser.role] || {
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    title: 'Pengguna',
    icon: User,
    desc: 'Pengguna sistem.',
  };

  const RoleIcon = roleConfig.icon || User;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0b132b] to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* Avatar Photo Frame with Upload, Change & Delete */}
          <div className="relative group shrink-0">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-950 border-2 border-amber-400/50 flex items-center justify-center overflow-hidden shadow-2xl relative cursor-pointer group-hover:border-amber-400 transition-all"
              title="Klik untuk memilih atau mengganti foto profil"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-amber-400/80 p-2 group-hover:bg-slate-800/80 transition-colors">
                  <RoleIcon className="w-12 h-12 mb-1" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tanpa Foto</span>
                </div>
              )}

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[10px] font-bold text-white bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-700 shadow-md flex items-center gap-1">
                  <Camera className="w-3 h-3 text-amber-400" />
                  {photoUrl ? 'Ganti' : 'Unggah'}
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
                className="p-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl shadow-xl border-2 border-slate-900 transition-all cursor-pointer hover:scale-110 active:scale-95"
                title={photoUrl ? 'Ganti Foto Profil' : 'Unggah Foto Profil'}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-center sm:text-left space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${roleConfig.badgeBg}`}
              >
                <RoleIcon className="w-4 h-4" />
                <span>{roleConfig.title}</span>
              </div>

              {/* Real-time Auto-Save Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700/80 shadow-inner">
                {autoSaveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-[11px] font-bold text-amber-300">Menyimpan otomatis...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-300">Tersimpan Otomatis</span>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
              {currentUser.role === 'admin'
                ? adminName || currentUser.name
                : currentUser.role === 'guru'
                ? teacherName || currentUser.name
                : currentUser.role === 'siswa'
                ? studentName || currentUser.name
                : generalName || currentUser.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{roleConfig.desc}</span>
            </p>
          </div>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl text-xs sm:text-sm text-emerald-300 flex items-center gap-3 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl text-xs sm:text-sm text-rose-300 flex items-center gap-3 shadow-lg animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {/* FORM SECTION */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          accept="image/*"
          className="hidden"
        />

        {/* IDENTITAS PENGGUNA (SESUAI ROLE GURU / SISWA / ADMIN / UMUM) */}
        {currentUser.role === 'guru' && (
          /* ======================== ROLE: GURU ======================== */
          <>
            {/* Identitas Pokok Guru */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>1. Identitas Pokok Tenaga Pendidik (Guru)</span>
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Sinkron Master Guru
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Nama Lengkap */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nama Lengkap (Beserta Gelar) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi, S.Pd.I"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* Jabatan */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Jabatan di Sekolah</span>
                  </label>
                  <select
                    value={teacherPosition}
                    onChange={(e) => setTeacherPosition(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    {JABATAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-slate-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mata Pelajaran */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mata Pelajaran yang Diampu</span>
                  </label>
                  <input
                    type="text"
                    value={teacherSubject}
                    onChange={(e) => setTeacherSubject(e.target.value)}
                    placeholder="Contoh: Pendidikan Agama Islam / Matematika"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* NIP */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nomor Induk Pegawai (NIP)
                  </label>
                  <input
                    type="text"
                    value={teacherNip}
                    onChange={(e) => setTeacherNip(e.target.value)}
                    placeholder="Masukkan NIP (Opsional)"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* NIK */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nomor Induk Kependudukan (NIK)
                  </label>
                  <input
                    type="text"
                    value={teacherNik}
                    onChange={(e) => setTeacherNik(e.target.value)}
                    placeholder="Masukkan 16 digit NIK"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* NUPTK */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    NUPTK
                  </label>
                  <input
                    type="text"
                    value={teacherNuptk}
                    onChange={(e) => setTeacherNuptk(e.target.value)}
                    placeholder="Masukkan 16 digit NUPTK"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* Status Keaktifan */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Status Keaktifan
                  </label>
                  <select
                    value={teacherActiveStatus}
                    onChange={(e) => setTeacherActiveStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    <option value="Aktif" className="bg-slate-900 text-white">
                      Aktif Mengajar
                    </option>
                    <option value="Non-Aktif" className="bg-slate-900 text-white">
                      Non-Aktif / Cuti
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Biodata & Kontak Pribadi Guru */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <BadgeInfo className="w-4 h-4 text-amber-400" />
                <span>2. Biodata & Kontak Pribadi Guru</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Jenis Kelamin */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Jenis Kelamin
                  </label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="teacherGender"
                        value="L"
                        checked={teacherGender === 'L'}
                        onChange={() => setTeacherGender('L')}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                      <span>Laki-Laki (L)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="teacherGender"
                        value="P"
                        checked={teacherGender === 'P'}
                        onChange={() => setTeacherGender('P')}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                      <span>Perempuan (P)</span>
                    </label>
                  </div>
                </div>

                {/* Tempat & Tanggal Lahir */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={teacherBirthPlace}
                      onChange={(e) => setTeacherBirthPlace(e.target.value)}
                      placeholder="Contoh: Bandung"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Tgl Lahir</span>
                    </label>
                    <input
                      type="text"
                      value={teacherBirthDate}
                      onChange={(e) => setTeacherBirthDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                    />
                  </div>
                </div>

                {/* No HP / WA */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No. HP / WhatsApp Aktif</span>
                  </label>
                  <input
                    type="tel"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span>Alamat Email</span>
                  </label>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="Contoh: guru@sditalhidayah.sch.id"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* Alamat Lengkap */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Alamat Tempat Tinggal / Domisili</span>
                  </label>
                  <textarea
                    rows={2}
                    value={teacherAddress}
                    onChange={(e) => setTeacherAddress(e.target.value)}
                    placeholder="Masukkan alamat domisili lengkap..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner resize-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {currentUser.role === 'siswa' && (
          /* ======================== ROLE: SISWA ======================== */
          <>
            {/* Identitas Pokok Siswa */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span>1. Identitas Pokok Peserta Didik (Siswa)</span>
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sinkron Master Siswa
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Nama Lengkap */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nama Lengkap Siswa <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Masukkan nama lengkap siswa..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* NIS & NISN */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nomor Induk Siswa (NIS)
                  </label>
                  <input
                    type="text"
                    value={studentNis}
                    onChange={(e) => setStudentNis(e.target.value)}
                    placeholder="Contoh: 202401001"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    NISN (Nasional)
                  </label>
                  <input
                    type="text"
                    value={studentNisn}
                    onChange={(e) => setStudentNisn(e.target.value)}
                    placeholder="10 digit NISN"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* Rombel / Kelas & Tahun Ajaran */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kelas / Rombel</span>
                  </label>
                  <input
                    type="text"
                    value={studentClassRoom}
                    onChange={(e) => setStudentClassRoom(e.target.value)}
                    placeholder="Contoh: 1A, 2B, 6A"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={studentAcademicYear}
                    onChange={(e) => setStudentAcademicYear(e.target.value)}
                    placeholder="Contoh: 2025/2026"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Biodata Siswa & Kontak Orang Tua */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span>2. Biodata Siswa & Kontak Orang Tua / Wali</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Jenis Kelamin */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Jenis Kelamin
                  </label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="studentGender"
                        value="L"
                        checked={studentGender === 'L'}
                        onChange={() => setStudentGender('L')}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                      <span>Laki-Laki (L)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="studentGender"
                        value="P"
                        checked={studentGender === 'P'}
                        onChange={() => setStudentGender('P')}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                      />
                      <span>Perempuan (P)</span>
                    </label>
                  </div>
                </div>

                {/* Tempat & Tanggal Lahir */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={studentBirthPlace}
                      onChange={(e) => setStudentBirthPlace(e.target.value)}
                      placeholder="Bandung"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Tgl Lahir</span>
                    </label>
                    <input
                      type="text"
                      value={studentBirthDate}
                      onChange={(e) => setStudentBirthDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                    />
                  </div>
                </div>

                {/* Nama Ayah & No HP Ayah */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nama Ayah / Wali
                  </label>
                  <input
                    type="text"
                    value={studentFatherName}
                    onChange={(e) => setStudentFatherName(e.target.value)}
                    placeholder="Masukkan nama ayah..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No. HP / WA Ayah</span>
                  </label>
                  <input
                    type="tel"
                    value={studentFatherPhone}
                    onChange={(e) => setStudentFatherPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* Nama Ibu & No HP Ibu */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Nama Ibu
                  </label>
                  <input
                    type="text"
                    value={studentMotherName}
                    onChange={(e) => setStudentMotherName(e.target.value)}
                    placeholder="Masukkan nama ibu..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No. HP / WA Ibu</span>
                  </label>
                  <input
                    type="tel"
                    value={studentMotherPhone}
                    onChange={(e) => setStudentMotherPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                </div>

                {/* Alamat Rumah */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Alamat Rumah Tempat Tinggal</span>
                  </label>
                  <textarea
                    rows={2}
                    value={studentAddress}
                    onChange={(e) => setStudentAddress(e.target.value)}
                    placeholder="Masukkan alamat rumah siswa..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner resize-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {currentUser.role === 'admin' && (
          /* ======================== ROLE: ADMIN ======================== */
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>1. Identitas Administrator Utama</span>
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nama Lengkap / Tampilan Administrator <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Contoh: Administrator System"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
              />
            </div>
          </div>
        )}

        {currentUser.role === 'umum' && (
          /* ======================== ROLE: UMUM ======================== */
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>1. Identitas Pengunjung Umum</span>
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nama Pengunjung
              </label>
              <input
                type="text"
                value={generalName}
                onChange={(e) => setGeneralName(e.target.value)}
                placeholder="Masukkan nama Anda..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
              />
            </div>
          </div>
        )}

        {/* SECTION KREDENSIAL LOG IN: KHUSUS ADMINISTRATOR */}
        {currentUser.role === 'admin' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>2. Kredensial Log In (Username & Password)</span>
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Administrator</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Username / ID Log In Admin <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Masukkan username login admin..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                />
              </div>

              {/* Password Baru */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Kata Sandi / Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru..."
                    className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
