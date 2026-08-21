import { Teacher, Student, Subject, QuestionBank, ExamResult, AuthUser, RolePermissions, GameHistoryLog, UserLoginLog } from '../types';

export function getStoredCurrentUser(): AuthUser | null {
  try {
    // Check sessionStorage first (automatically cleared when tab/window is closed)
    const saved = sessionStorage.getItem('cbt_current_user');
    if (saved) return JSON.parse(saved);
    // Cleanup any legacy localStorage user session
    localStorage.removeItem('cbt_current_user');
  } catch (e) {
    // ignore
  }
  return null;
}

export function saveStoredCurrentUser(user: AuthUser | null) {
  try {
    if (user) {
      sessionStorage.setItem('cbt_current_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('cbt_current_user');
    }
    // Remove persistent localStorage user so user is required to re-login upon closing tab
    localStorage.removeItem('cbt_current_user');
  } catch (e) {
    // ignore
  }
}

export interface AdminAccount {
  username: string;
  password: string;
  name: string;
  photoUrl?: string;
}

export function getStoredAdminAccount(): AdminAccount {
  try {
    const saved = localStorage.getItem('cbt_admin_account');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // ignore
  }
  return {
    username: 'admin',
    password: 'admin',
    name: 'Administrator System',
    photoUrl: '',
  };
}

export function saveStoredAdminAccount(account: AdminAccount) {
  localStorage.setItem('cbt_admin_account', JSON.stringify(account));
}

const INITIAL_TEACHERS: Teacher[] = [];

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_SUBJECTS: Subject[] = [];

const INITIAL_BANKS: QuestionBank[] = [];

const INITIAL_RESULTS: ExamResult[] = [];

export function getStoredTeachers(): Teacher[] {
  try {
    const data = localStorage.getItem('cbt_teachers');
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function saveStoredTeachers(teachers: Teacher[]) {
  localStorage.setItem('cbt_teachers', JSON.stringify(teachers));
}

export function getStoredStudents(): Student[] {
  try {
    const data = localStorage.getItem('cbt_students');
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function saveStoredStudents(students: Student[]) {
  localStorage.setItem('cbt_students', JSON.stringify(students));
}

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'mapel-1', code: 'QH-01', name: 'Al-Qur\'an Hadits', gradeLevel: 'SD / MI' },
  { id: 'mapel-2', code: 'AA-02', name: 'Aqidah Akhlak', gradeLevel: 'SD / MI' },
  { id: 'mapel-3', code: 'FQ-03', name: 'Fiqih', gradeLevel: 'SD / MI' },
  { id: 'mapel-4', code: 'SKI-04', name: 'Sejarah Kebudayaan Islam (SKI)', gradeLevel: 'SD / MI' },
  { id: 'mapel-5', code: 'BA-05', name: 'Bahasa Arab', gradeLevel: 'SD / MI' },
  { id: 'mapel-6', code: 'PAI-06', name: 'Pendidikan Agama Islam (PAI)', gradeLevel: 'SD / MI' },
  { id: 'mapel-7', code: 'BI-07', name: 'Bahasa Indonesia', gradeLevel: 'SD / MI' },
  { id: 'mapel-8', code: 'MTK-08', name: 'Matematika', gradeLevel: 'SD / MI' },
  { id: 'mapel-9', code: 'IPA-09', name: 'IPA / Sains', gradeLevel: 'SD / MI' },
  { id: 'mapel-10', code: 'IPS-10', name: 'IPS', gradeLevel: 'SD / MI' },
  { id: 'mapel-11', code: 'BIG-11', name: 'Bahasa Inggris', gradeLevel: 'SD / MI' },
];

export function getStoredSubjects(): Subject[] {
  try {
    const data = localStorage.getItem('cbt_subjects');
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function saveStoredSubjects(subjects: Subject[]) {
  localStorage.setItem('cbt_subjects', JSON.stringify(subjects));
}

export function getStoredBanks(): QuestionBank[] {
  try {
    const data = localStorage.getItem('cbt_banks');
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function saveStoredBanks(banks: QuestionBank[]) {
  localStorage.setItem('cbt_banks', JSON.stringify(banks));
}

export function getStoredResults(): ExamResult[] {
  try {
    const data = localStorage.getItem('cbt_results');
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function saveStoredResults(results: ExamResult[]) {
  localStorage.setItem('cbt_results', JSON.stringify(results));
}

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

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  name: 'SDIT Al Hidayah Logam',
  npsn: '20109876',
  nss: '102010109876',
  accreditation: 'A (Sangat Baik)',
  educationalLevel: 'SD / MI',
  schoolStatus: 'Swasta / Terakreditasi',
  headmaster: 'Dr. Ahmad Fauzi, M.T.',
  address: 'Jl. Pendidikan Karakter No. 45',
  village: 'Sukamaju',
  district: 'Cilodong',
  city: 'Kota Depok',
  province: 'Jawa Barat',
  postalCode: '16415',
  phone: '(021) 77889900 / 0812-3456-7890',
  email: 'sditalhidayahlog4m@gmail.com',
  website: 'www.sditalhidayah.sch.id',
  establishmentYear: '2010',
  vision: 'Mewujudkan Generasi Rabbani yang Berakhlak Mulia, Cerdas, Kreatif, Berprestasi, dan Menguasai Teknologi Informasi.',
  mission: [
    'Menyelenggarakan pendidikan Islam terpadu yang berlandaskan Al-Qur\'an dan As-Sunnah.',
    'Membentuk karakter peserta didik yang jujur, disiplin, santun, dan mandiri.',
    'Mengembangkan potensi akademik dan non-akademik secara optimal berbasis teknologi digital (CBT).',
    'Menjalin kemitraan yang harmonis antara sekolah, orang tua, dan masyarakat.',
  ],
};

export function getStoredSchoolProfile(): SchoolProfile {
  try {
    const saved = localStorage.getItem('cbt_school_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      let name = parsed.name || DEFAULT_SCHOOL_PROFILE.name;
      if (name === 'SDIT AL HIDAYAH' || name === 'SDIT Al Hidayah' || name === 'SDIT AL HIDAYAH LOGAM') {
        name = 'SDIT Al Hidayah Logam';
      }
      return { ...DEFAULT_SCHOOL_PROFILE, ...parsed, name };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_SCHOOL_PROFILE;
}

export function saveStoredSchoolProfile(profile: SchoolProfile) {
  localStorage.setItem('cbt_school_profile', JSON.stringify(profile));
}

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  guru: [
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
  ],
  siswa: [
    'profil-saya',
    'ai-pembuat-game',
    'bank-soal',
    'mulai-ujian',
    'riwayat-ujian',
  ],
  umum: [
    'profil-saya',
    'ai-pembuat-game',
    'bank-soal',
  ],
};

export function getStoredGameLogs(): GameHistoryLog[] {
  try {
    const data = localStorage.getItem('cbt_game_logs');
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function saveStoredGameLogs(logs: GameHistoryLog[]) {
  localStorage.setItem('cbt_game_logs', JSON.stringify(logs));
}

export function getStoredLoginLogs(): UserLoginLog[] {
  try {
    const data = localStorage.getItem('cbt_login_logs');
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function saveStoredLoginLogs(logs: UserLoginLog[]) {
  try {
    localStorage.setItem('cbt_login_logs', JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function getStoredRolePermissions(): RolePermissions {
  const data = localStorage.getItem('cbt_role_permissions');
  if (!data) {
    localStorage.setItem('cbt_role_permissions', JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
    return DEFAULT_ROLE_PERMISSIONS;
  }
  try {
    const parsed = JSON.parse(data);
    return {
      guru: Array.isArray(parsed.guru) ? parsed.guru : DEFAULT_ROLE_PERMISSIONS.guru,
      siswa: Array.isArray(parsed.siswa) ? parsed.siswa : DEFAULT_ROLE_PERMISSIONS.siswa,
      umum: Array.isArray(parsed.umum) ? parsed.umum : DEFAULT_ROLE_PERMISSIONS.umum,
    };
  } catch (e) {
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

export function saveStoredRolePermissions(permissions: RolePermissions) {
  localStorage.setItem('cbt_role_permissions', JSON.stringify(permissions));
}

export function getStoredGameData(): Record<string, any> {
  try {
    const data = localStorage.getItem('cbt_game_data');
    if (!data) return {};
    return JSON.parse(data) || {};
  } catch {
    return {};
  }
}

export function saveStoredGameData(gameData: Record<string, any>) {
  try {
    localStorage.setItem('cbt_game_data', JSON.stringify(gameData));
  } catch {
    // ignore
  }
}

export function clearAllStoredData() {
  localStorage.setItem('cbt_teachers', JSON.stringify([]));
  localStorage.setItem('cbt_students', JSON.stringify([]));
  localStorage.setItem('cbt_subjects', JSON.stringify([]));
  localStorage.setItem('cbt_banks', JSON.stringify([]));
  localStorage.setItem('cbt_results', JSON.stringify([]));
  localStorage.setItem('cbt_game_logs', JSON.stringify([]));
  localStorage.removeItem('cbt_game_data');
  localStorage.setItem('cbt_role_permissions', JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
}

// Fisher-Yates Array Shuffle Utility
export function shuffleArray<T>(array: T[]): T[] {
  if (!array || !Array.isArray(array)) return array;
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Shuffles questions and options in a QuestionBank for CBT Exams
export function shuffleQuestionBank(bank: QuestionBank): QuestionBank {
  if (!bank || !bank.questions || bank.questions.length === 0) return bank;

  const shuffledQuestions = shuffleArray(bank.questions).map((q, idx) => {
    if (q.options && q.options.length > 0) {
      const shuffledOptions = shuffleArray(q.options).map((opt, optIdx) => ({
        ...opt,
        option_letter: String.fromCharCode(65 + optIdx), // Reassign A, B, C, D...
      }));
      return {
        ...q,
        question_number: idx + 1,
        options: shuffledOptions,
      };
    }
    return {
      ...q,
      question_number: idx + 1,
    };
  });

  return {
    ...bank,
    questions: shuffledQuestions,
  };
}

// Shuffles all QuestionBanks in an array
export function shuffleAllBanks(banks: QuestionBank[]): QuestionBank[] {
  if (!banks) return [];
  return banks.map((bank) => shuffleQuestionBank(bank));
}

// Shuffles AI Game items and options
export function shuffleGameDataMap(map: Record<string, any[]>): Record<string, any[]> {
  if (!map) return {};
  const newMap: Record<string, any[]> = {};
  for (const mode of Object.keys(map)) {
    if (Array.isArray(map[mode])) {
      newMap[mode] = shuffleArray(map[mode]).map((item) => {
        if (item && item.options && Array.isArray(item.options)) {
          return {
            ...item,
            options: shuffleArray(item.options),
          };
        }
        return item;
      });
    } else {
      newMap[mode] = map[mode];
    }
  }
  return newMap;
}

