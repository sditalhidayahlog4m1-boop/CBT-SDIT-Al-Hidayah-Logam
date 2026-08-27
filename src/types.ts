export interface AuthUser {
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
  | 'upload-soal'
  | 'bank-soal'
  | 'kumpulan-jawaban'
  | 'mulai-ujian'
  | 'riwayat-ujian'
  | 'hak-akses'
  | 'reset-data';

export interface RolePermissions {
  guru: ActiveTab[];
  siswa: ActiveTab[];
  umum: ActiveTab[];
}

