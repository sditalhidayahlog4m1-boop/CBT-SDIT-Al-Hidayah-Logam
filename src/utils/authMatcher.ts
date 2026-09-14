import { Teacher, Student, AuthUser } from '../types';

/**
 * Month names mapping for Indonesian and English text representations
 */
const MONTH_MAP: Record<string, number> = {
  januari: 1,
  jan: 1,
  january: 1,
  februari: 2,
  feb: 2,
  pebruari: 2,
  february: 2,
  maret: 3,
  mar: 3,
  march: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  jun: 6,
  june: 6,
  juli: 7,
  jul: 7,
  july: 7,
  agustus: 8,
  agt: 8,
  agu: 8,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  october: 10,
  oct: 10,
  november: 11,
  nopember: 11,
  nov: 11,
  nop: 11,
  desember: 12,
  des: 12,
  december: 12,
  dec: 12,
};

/**
 * Common Indonesian academic titles, prefixes, and suffixes to ignore when matching teacher names
 */
const TITLES_REGEX =
  /\b(drs|dra|dr|prof|h|hj|haji|hajjah|ustadz|ustadzah|ust|pak|ibu|bapak|s\.pd|m\.pd|s\.ag|m\.ag|s\.pd\.i|m\.pd\.i|s\.si|m\.si|s\.t|m\.t|s\.kom|m\.kom|s\.e|m\.m|s\.sos|m\.sos|l\.c|lc|s\.sos\.i|gr)\b/gi;

/**
 * Normalize a name or username string:
 * - Removes zero-width characters and converts non-breaking spaces
 * - Lowercase (HURUF BESAR SEMUA, kecil semua, maupun Huruf Awal Besar semuanya dinormalisasi)
 * - Trim leading/trailing whitespace
 * - Collapse multiple spaces into single space
 */
export function normalizeString(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width characters
    .replace(/\u00A0/g, ' ') // non-breaking space to regular space
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Strip all non-alphanumeric characters for loose slug matching
 * (e.g. "Ahmad Fauzi", "AHMAD FAUZI", "ahmad.fauzi", "Ahmad-Fauzi" -> "ahmadfauzi")
 */
export function cleanAlphanumeric(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Remove titles/honorifics and special characters from names for clean matching
 */
export function stripTitles(name: string): string {
  const withoutTitles = name
    .replace(TITLES_REGEX, ' ')
    .replace(/['"`’‘`\-()[\]{}_.,/\\+:]/g, ' ');
  return normalizeString(withoutTitles);
}


/**
 * Parsed date representation
 */
export interface ParsedDate {
  day: number;
  month: number;
  year: number;
}

/**
 * Extract all plausible (day, month, year) tuples from any date string or password.
 * Handles:
 * - DD/MM/YYYY (tanggal/bulan/tahun)
 * - MM/DD/YYYY (bulan/tanggal/tahun)
 * - YYYY-MM-DD, YYYY/MM/DD
 * - DD-MM-YYYY, DD.MM.YYYY
 * - Continuous digits: 8 digits (DDMMYYYY, MMDDYYYY, YYYYMMDD) or 6 digits (DDMMYY, MMDDYY)
 * - Month names: "15 Agustus 2012", "Agustus 15 2012", "5 Mei 2011", etc.
 */
export function extractDateCandidates(rawStr?: string | null): ParsedDate[] {
  if (!rawStr) return [];
  const trimmed = rawStr.trim();
  if (!trimmed) return [];

  const candidates: ParsedDate[] = [];
  const addedKeys = new Set<string>();

  const addCandidate = (day: number, month: number, year: number) => {
    // Validate reasonable day, month, year ranges
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const key = `${year}-${month}-${day}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        candidates.push({ day, month, year });
      }
    }
  };

  // 1. Check for textual month names (Indonesian / English)
  let workingStr = trimmed.toLowerCase();
  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    const regex = new RegExp(`\\b${monthName}\\b`, 'gi');
    if (regex.test(workingStr)) {
      workingStr = workingStr.replace(regex, ` ${monthNum} `);
      break;
    }
  }

  // 2. Extract numeric tokens
  const nums = workingStr.split(/[^0-9]+/).filter(Boolean).map((n) => parseInt(n, 10));

  if (nums.length >= 3) {
    const [n1, n2, n3] = nums;

    // Case A: Year is first (YYYY-MM-DD or YYYY-DD-MM)
    if (n1 >= 1900) {
      const year = n1;
      // standard YYYY-MM-DD
      addCandidate(n3, n2, year);
      // alternative YYYY-DD-MM
      addCandidate(n2, n3, year);
    }
    // Case B: Year is last (DD/MM/YYYY or MM/DD/YYYY)
    else if (n3 >= 1000 || n3 > 30) {
      const year = n3 < 100 ? (n3 > 30 ? 1900 + n3 : 2000 + n3) : n3;
      // DD/MM/YYYY (tanggal/bulan/tahun)
      addCandidate(n1, n2, year);
      // MM/DD/YYYY (bulan/tanggal/tahun)
      addCandidate(n2, n1, year);
    }
    // Case C: Year is in the middle (rare)
    else if (n2 >= 1900) {
      const year = n2;
      addCandidate(n1, n3, year);
      addCandidate(n3, n1, year);
    }
  }

  // 3. Continuous digits fallback (e.g. 05082012, 08052012, 20120805, 050812)
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');

  if (digitsOnly.length === 8) {
    // If starts with 19 or 20 (YYYYMMDD or YYYYDDMM)
    if (digitsOnly.startsWith('19') || digitsOnly.startsWith('20')) {
      const y = parseInt(digitsOnly.slice(0, 4), 10);
      const m = parseInt(digitsOnly.slice(4, 6), 10);
      const d = parseInt(digitsOnly.slice(6, 8), 10);
      addCandidate(d, m, y);
      addCandidate(m, d, y);
    }
    // Otherwise DDMMYYYY or MMDDYYYY
    const p1 = parseInt(digitsOnly.slice(0, 2), 10);
    const p2 = parseInt(digitsOnly.slice(2, 4), 10);
    const y = parseInt(digitsOnly.slice(4, 8), 10);
    addCandidate(p1, p2, y); // DDMMYYYY
    addCandidate(p2, p1, y); // MMDDYYYY
  } else if (digitsOnly.length === 6) {
    const p1 = parseInt(digitsOnly.slice(0, 2), 10);
    const p2 = parseInt(digitsOnly.slice(2, 4), 10);
    const yShort = parseInt(digitsOnly.slice(4, 6), 10);
    const y = yShort > 30 ? 1900 + yShort : 2000 + yShort;
    addCandidate(p1, p2, y); // DDMMYY
    addCandidate(p2, p1, y); // MMDDYY
  }

  return candidates;
}

/**
 * Check if the user password matches either:
 * - The stored password (case-sensitive or case-insensitive or trimmed)
 * - The stored birthdate as DD/MM/YYYY (tanggal/bulan/tahun)
 * - The stored birthdate as MM/DD/YYYY (bulan/tanggal/tahun)
 * - The stored password interpreted as a birthdate in any format
 */
export function checkPasswordOrDateMatch(
  userInput?: string | null,
  storedPass?: string | null,
  storedBirthDate?: string | null
): boolean {
  if (!userInput) return false;
  const userClean = userInput.trim();
  if (!userClean) return false;

  const userNorm = cleanAlphanumeric(userClean);

  // If teacher/student has neither password nor birthdate set, allow entry
  if (!storedPass?.trim() && !storedBirthDate?.trim()) {
    return true;
  }

  // 1. Direct password match (exact, case-insensitive, or alphanumeric slug)
  if (storedPass?.trim()) {
    const passTrim = storedPass.trim();
    if (userClean === passTrim) return true;
    if (userClean.toLowerCase() === passTrim.toLowerCase()) return true;
    if (userNorm === cleanAlphanumeric(passTrim)) return true;
  }

  // 2. Direct birthdate match (exact, case-insensitive, or alphanumeric slug)
  if (storedBirthDate?.trim()) {
    const birthTrim = storedBirthDate.trim();
    if (userClean === birthTrim) return true;
    if (userClean.toLowerCase() === birthTrim.toLowerCase()) return true;
    if (userNorm === cleanAlphanumeric(birthTrim)) return true;
  }

  // 3. Flexible date match ("mau tanggal/bulan/tahun atau bulan/tanggal/tahun tetap terbaca")
  // Extract candidates from user's input
  const userDateCandidates = extractDateCandidates(userClean);

  if (userDateCandidates.length > 0) {
    // Extract candidates from stored birthDate
    const storedDateCandidates: ParsedDate[] = [];
    if (storedBirthDate?.trim()) {
      storedDateCandidates.push(...extractDateCandidates(storedBirthDate));
    }
    // Also extract candidates from stored password if it looks like a date
    if (storedPass?.trim()) {
      storedDateCandidates.push(...extractDateCandidates(storedPass));
    }

    for (const u of userDateCandidates) {
      for (const s of storedDateCandidates) {
        // Must be the same year
        if (u.year === s.year) {
          // Exact day and month match
          if (u.day === s.day && u.month === s.month) {
            return true;
          }
          // Swapped day and month match: tanggal/bulan/tahun <-> bulan/tanggal/tahun
          if (u.day === s.month && u.month === s.day) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Score how well an input username/name matches an account record.
 * Returns match score (0 = no match, 100 = perfect match).
 */
export function getAccountNameMatchScore(
  inputRaw: string,
  account: {
    name: string;
    username?: string;
    nip?: string;
    nik?: string;
    nuptk?: string;
    nis?: string;
    nisn?: string;
  }
): number {
  const input = normalizeString(inputRaw);
  if (!input) return 0;
  const inputClean = cleanAlphanumeric(input);
  if (!inputClean) return 0;

  // 1. Exact match on username or formal identification numbers
  const identifiers = [
    account.username,
    account.nip,
    account.nik,
    account.nuptk,
    account.nis,
    account.nisn,
  ].filter(Boolean) as string[];

  for (const id of identifiers) {
    const idNorm = normalizeString(id);
    const idClean = cleanAlphanumeric(id);
    if (input === idNorm) return 100;
    if (inputClean === idClean) return 98;
    // Match username with dots/dashes against spaced input (e.g. "ahmad.fauzi" vs "Ahmad Fauzi")
    if (normalizeString(id.replace(/[._\-]/g, ' ')) === input) return 98;
  }

  // 2. Match on Full Name
  const targetName = normalizeString(account.name);
  const targetClean = cleanAlphanumeric(account.name);

  // Exact full name match (case-insensitive & trimmed, ignores UPPER/lower/TitleCase)
  if (input === targetName) return 95;

  // Full name alphanumeric slug match (ignores all spaces, punctuation, case)
  if (inputClean === targetClean) return 92;

  // 3. Match without academic titles / honorifics (e.g. "Drs. Ahmad, M.Pd" -> "ahmad")
  const targetNoTitles = stripTitles(account.name);
  const targetNoTitlesClean = cleanAlphanumeric(targetNoTitles);
  const inputNoTitles = stripTitles(input);
  const inputNoTitlesClean = cleanAlphanumeric(inputNoTitles);

  if (inputNoTitles === targetNoTitles) return 90;
  if (inputNoTitlesClean === targetNoTitlesClean) return 88;

  // 4. Word-level matching (bisa huruf besar semua, kecil semua, maupun huruf awal besar)
  const inputWords = inputNoTitles.split(/\s+/).filter((w) => w.length >= 2);
  const targetWords = targetNoTitles.split(/\s+/).filter((w) => w.length >= 2);

  if (inputWords.length > 0 && targetWords.length > 0) {
    // Check if input words are an exact subset of target's words (e.g. "Ahmad Fauzi" in "Muhammad Ahmad Fauzi")
    const allInputInTarget = inputWords.every((iw) =>
      targetWords.some((tw) => tw === iw || tw.startsWith(iw) || iw.startsWith(tw))
    );
    if (allInputInTarget) {
      return 85;
    }

    // Check if target words are a subset of input words (e.g. user typed extra middle/last name)
    const allTargetInInput = targetWords.every((tw) =>
      inputWords.some((iw) => iw === tw || iw.startsWith(tw) || tw.startsWith(iw))
    );
    if (allTargetInInput) {
      return 85;
    }

    // Check if at least 2 words match
    const matchingWordsCount = inputWords.filter((iw) =>
      targetWords.some((tw) => tw === iw || tw.startsWith(iw) || iw.startsWith(tw))
    ).length;
    if (matchingWordsCount >= 2) {
      return 80;
    }

    // Check if any single significant word matches (call name / nama panggilan)
    if (inputWords.length === 1 && inputWords[0].length >= 3) {
      const singleWord = inputWords[0];
      if (targetWords.some((tw) => tw === singleWord)) {
        return 75;
      }
    }
  }

  // 5. Prefix or substring matching if input is sufficiently long (>= 3 chars)
  if (inputClean.length >= 3 && targetClean.length >= 3) {
    if (targetClean.startsWith(inputClean)) return 70;
    if (inputClean.startsWith(targetClean)) return 70;
    if (targetClean.includes(inputClean) && inputClean.length >= 4) return 65;
  }

  return 0;
}

/**
 * Match a user login attempt against lists of Teachers and Students.
 * Returns authenticated user if credentials match, or list of candidate matches.
 */
export function authenticateUser(
  inputUsername: string,
  inputPassword: string,
  teachers: Teacher[],
  students: Student[]
): {
  authenticatedUser: AuthUser | null;
  matchedAccountName?: string;
  candidateRole?: 'guru' | 'siswa';
  hasNameMatch: boolean;
} {
  const cleanUser = inputUsername.trim();
  const cleanPass = inputPassword.trim();

  // Find all teacher candidates sorted by match score
  const teacherCandidates = teachers
    .map((t) => ({ user: t, score: getAccountNameMatchScore(cleanUser, t), role: 'guru' as const }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Find all student candidates sorted by match score
  const studentCandidates = students
    .map((s) => ({ user: s, score: getAccountNameMatchScore(cleanUser, s), role: 'siswa' as const }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Combine candidates, prioritizing higher scores
  const allCandidates = [...teacherCandidates, ...studentCandidates].sort(
    (a, b) => b.score - a.score
  );

  if (allCandidates.length === 0) {
    return {
      authenticatedUser: null,
      hasNameMatch: false,
    };
  }

  // Test password/birthDate against all matching candidates
  for (const candidate of allCandidates) {
    const isPassValid = checkPasswordOrDateMatch(
      cleanPass,
      candidate.user.password,
      candidate.user.birthDate
    );

    if (isPassValid) {
      if (candidate.role === 'guru') {
        const t = candidate.user as Teacher;
        const teacherUser: AuthUser = {
          role: 'guru',
          name: t.name,
          username: t.username || t.name.toLowerCase().replace(/\s+/g, ''),
          password: t.password || t.birthDate,
          photoUrl: t.photoUrl,
          birthDate: t.birthDate,
          details: t,
        };
        return {
          authenticatedUser: teacherUser,
          matchedAccountName: t.name,
          candidateRole: 'guru',
          hasNameMatch: true,
        };
      } else {
        const s = candidate.user as Student;
        const studentUser: AuthUser = {
          role: 'siswa',
          name: s.name,
          username: s.username || s.name.toLowerCase().replace(/\s+/g, ''),
          password: s.password || s.birthDate,
          photoUrl: s.photoUrl,
          birthDate: s.birthDate,
          details: s,
        };
        return {
          authenticatedUser: studentUser,
          matchedAccountName: s.name,
          candidateRole: 'siswa',
          hasNameMatch: true,
        };
      }
    }
  }

  // A user name was matched, but none of the passwords matched
  const bestCandidate = allCandidates[0];
  return {
    authenticatedUser: null,
    matchedAccountName: bestCandidate.user.name,
    candidateRole: bestCandidate.role,
    hasNameMatch: true,
  };
}
