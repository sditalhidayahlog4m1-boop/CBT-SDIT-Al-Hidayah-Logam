export interface AuthUser {
  id?: string;
  role: 'guru' | 'siswa' | 'admin' | 'umum';
  name: string;
  username?: string;
  password?: string;
  photoUrl?: string;
  birthDate?: string;
  details?: Teacher | Student | null;
  lastLogin?: string;
}

export interface Teacher {
  id: string;
  name: string;
  gender: 'L' | 'P' | string;
  birthPlace: string;
  birthDate: string; // DD/MM/YYYY
  position: string; // Kepala Sekolah, Guru, Guru Inklusi, Guru Pendamping, TAS, dll.
  subject: string; // Mapel yang diampu
  nik: string; // NO NIK
  nuptk: string; // NUPTK
  address: string; // Alamat Rumah / Yang Ditempati
  phone: string; // No HP / WA Aktif
  activeStatus: 'Aktif' | 'Non-Aktif' | string; // Status Keaktifan
  nip?: string;
  email?: string;
  username?: string;
  password?: string;
  photoUrl?: string;
  lastLogin?: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P' | string;
  birthPlace: string;
  birthDate: string; // DD/MM/YYYY
  fatherName: string;
  motherName: string;
  address: string;
  fatherPhone: string;
  motherPhone: string;
  classRoom: string;
  academicYear: string;
  activeStatus: 'Aktif' | 'Non-Aktif' | string;
  active?: boolean;
  username?: string;
  password?: string;
  photoUrl?: string;
  lastLogin?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  gradeLevel: string;
}

export interface QuestionOption {
  option_letter: 'A' | 'B' | 'C' | 'D' | 'E' | string;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: QuestionOption[];
  explanation: string;
  gambarUrl?: string;
  type?: 'pilihan_ganda' | 'esai' | string;
  essayAnswerKey?: string;
  scoreWeight?: number;
}

export interface QuestionBank {
  id: string;
  title: string;
  teacher_name: string;
  subject: string;
  grade_level: string;
  class_room: string;
  total_questions: number;
  token: string;
  questions: Question[];
  createdAt: string;
  durationMinutes: number;
  minWorkingMinutes?: number;
  updatedAt?: string;
  fontFamily?: string;
  fontSize?: string;
}

export interface ExamResult {
  id: string;
  date: string;
  studentName: string;
  classRoom: string;
  subject: string;
  examTitle: string;
  token: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSpent: string; // e.g. "18 menit 45 detik"
  passed: boolean;
  answers: { [questionIndex: number]: string }; // e.g. { 0: 'B', 1: 'A' }
  bankId: string;
}

export interface GameHistoryLog {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  studentName: string;
  classRoom: string;
  gameType: string;
  subject: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sulit' | string;
  topic?: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}

export interface UserLoginLog {
  id: string;
  userId?: string;
  name: string;
  role: 'admin' | 'guru' | 'siswa' | 'umum';
  identifier?: string; // NISN / NIS / NUPTK / NIP / Username
  classRoom?: string;
  positionOrSubject?: string;
  loginTime: string; // e.g. "16/08/2026 15:15:00"
  lastSeenTime?: string;
  device?: string;
  photoUrl?: string;
}

export interface DailyGradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  nis?: string;
  nisn?: string;
  classRoom: string;
  subjectName: string;
  subjectId?: string;
  taskTitle: string; // e.g. "Penilaian Harian 1", "Tugas Surat Al-Falaq", "Latihan Bab 1"
  date: string; // DD/MM/YYYY
  score: number; // 0 - 100
  notes?: string;
  createdAt?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'profil-saya'
  | 'profil-sekolah'
  | 'data-guru'
  | 'data-siswa'
  | 'mata-pelajaran'
  | 'nilai-harian'
  | 'pembuat-soal-ai'
  | 'ekstrak-dokumen'
  | 'ai-pembuat-game'
  | 'riwayat-game'
  | 'bank-soal'
  | 'kumpulan-jawaban'
  | 'mulai-ujian'
  | 'riwayat-ujian'
  | 'hak-akses'
  | 'backup-data'
  | 'reset-data';

export interface SchoolProfile {
  name: string;
  logoUrl?: string;
  npsn: string;
  nss: string;
  accreditation: string;
  educationalLevel: string;
  schoolStatus: string;
  headmaster: string;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  establishmentYear: string;
  vision: string;
  mission: string[];
}

export interface FullBackupData {
  version: string;
  appName: string;
  exportedAt: string;
  schoolName: string;
  systemDescription?: string;
  teachers: Teacher[];
  students: Student[];
  subjects: Subject[];
  banks: QuestionBank[];
  results: ExamResult[];
  dailyGrades?: DailyGradeRecord[];
  gameLogs?: GameHistoryLog[];
  gameData?: Record<string, any>;
  schoolProfile?: SchoolProfile;
  rolePermissions?: RolePermissions;
}

export interface RolePermissions {
  guru: ActiveTab[];
  siswa: ActiveTab[];
  umum: ActiveTab[];
}

export interface BackupArchiveItem {
  id: string;
  fileName: string;
  type: 'db' | 'all'; // 'db' = Database CBT, 'all' = Backup Semua
  sizeKb: number;
  createdAt: string; // ISO date string
  formattedDate: string; // e.g. "2026-09-14 21:51:34"
  itemCounts?: {
    teachers: number;
    students: number;
    subjects: number;
    banks: number;
    results: number;
    dailyGrades?: number;
  };
  payload: FullBackupData;
}

