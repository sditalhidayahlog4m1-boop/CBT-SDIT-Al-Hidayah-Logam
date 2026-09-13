import { QuestionBank, Subject } from '../types';

/**
 * Normalizes text by removing non-alphanumeric characters, lowering case, and trimming
 */
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts key alphanumeric tokens from text, filtering out boilerplate filler words
 */
function extractMeaningfulTokens(text: string): string[] {
  const ignoreWords = new Set([
    'paket',
    'ke',
    'soal',
    'ujian',
    'penilaian',
    'akhir',
    'tengah',
    'semester',
    'pts',
    'pas',
    'pat',
    'harian',
    'uh',
    'cbt',
    'dan',
    'yang',
    'untuk',
    'kelas',
    'sd',
    'mi',
    'smp',
    'mts',
    'sma',
    'smk',
  ]);

  const rawTokens = normalizeText(text).split(' ').filter(Boolean);
  return rawTokens.filter((t) => !ignoreWords.has(t) && t.length > 0);
}

/**
 * Extract numbers from string (e.g., '30', '29', '1', '2')
 */
function extractNumbers(text: string): string[] {
  const matches = (text || '').match(/\b\d+\b/g);
  return matches || [];
}

/**
 * Checks whether a given subject name is an exact registered subject
 */
export function isSubjectExactMatch(subjectName: string, registeredSubjects: Subject[]): boolean {
  if (!subjectName || !registeredSubjects || registeredSubjects.length === 0) return false;
  const cleanTarget = normalizeText(subjectName);
  return registeredSubjects.some((s) => normalizeText(s.name) === cleanTarget);
}

/**
 * Matches a question bank's subject or title with the master subjects from Menu Mata Pelajaran.
 * Implements token overlap, number preservation, and fuzzy substring detection.
 */
export function findMatchingSubject(
  bankOrSubject: QuestionBank | string,
  registeredSubjects: Subject[]
): Subject | null {
  if (!registeredSubjects || registeredSubjects.length === 0) return null;

  const subjectStr = typeof bankOrSubject === 'string' ? bankOrSubject : bankOrSubject.subject || '';
  const titleStr = typeof bankOrSubject === 'string' ? '' : bankOrSubject.title || '';

  const cleanSubj = normalizeText(subjectStr);
  const cleanTitle = normalizeText(titleStr);

  // 1. Exact match by normalized subject name
  const exact = registeredSubjects.find((s) => normalizeText(s.name) === cleanSubj);
  if (exact) return exact;

  // 2. Exact match by subject code
  const codeMatch = registeredSubjects.find(
    (s) => s.code && normalizeText(s.code) === cleanSubj
  );
  if (codeMatch) return codeMatch;

  // 3. Score all registered subjects using token overlap and number compatibility
  const bankCombinedText = `${subjectStr} ${titleStr}`;
  const bankTokens = extractMeaningfulTokens(bankCombinedText);
  const bankNumbers = extractNumbers(bankCombinedText);

  let bestSubject: Subject | null = null;
  let highestScore = 0;

  for (const reg of registeredSubjects) {
    const regName = reg.name;
    const cleanReg = normalizeText(regName);
    const regTokens = extractMeaningfulTokens(regName);
    const regNumbers = extractNumbers(regName);

    // Number compatibility: if both have specific numbers (e.g. Juz 30 vs Juz 29), they must match!
    const numbersConflict =
      bankNumbers.length > 0 &&
      regNumbers.length > 0 &&
      !bankNumbers.some((bn) => regNumbers.includes(bn));

    if (numbersConflict) {
      continue; // Skip because numbers conflict (e.g. Juz 30 vs Juz 29)
    }

    let score = 0;

    // Direct substring checks
    if (cleanReg.includes(cleanSubj) && cleanSubj.length >= 3) {
      score += 50 + cleanSubj.length;
    } else if (cleanSubj.includes(cleanReg) && cleanReg.length >= 3) {
      score += 50 + cleanReg.length;
    }

    if (cleanTitle && cleanReg.includes(cleanTitle) && cleanTitle.length >= 4) {
      score += 40;
    } else if (cleanTitle && cleanTitle.includes(cleanReg) && cleanReg.length >= 4) {
      score += 40;
    }

    // Token overlap scoring
    let matchingTokensCount = 0;
    for (const bToken of bankTokens) {
      for (const rToken of regTokens) {
        if (bToken === rToken) {
          matchingTokensCount++;
          // High boost for distinctive words like 'tahfidz', 'tahsin', 'tilawah', 'matematika', etc.
          score += bToken.length >= 4 ? 20 : 10;
        } else if (
          (bToken.length >= 4 && rToken.startsWith(bToken)) ||
          (rToken.length >= 4 && bToken.startsWith(rToken))
        ) {
          matchingTokensCount++;
          score += 15;
        }
      }
    }

    // Number matching bonus (e.g., both contain '30' or '29')
    for (const bn of bankNumbers) {
      if (regNumbers.includes(bn)) {
        score += 35;
      }
    }

    if (score > highestScore && score >= 15) {
      highestScore = score;
      bestSubject = reg;
    }
  }

  return bestSubject;
}

/**
 * Automatically synchronizes an array of banks with registered subjects.
 * Any bank whose subject does not match an exact registered subject,
 * but matches via smart matching, will have its subject updated to the master name.
 */
export function autoSyncBanksWithSubjects(
  banks: QuestionBank[],
  registeredSubjects: Subject[]
): { updatedBanks: QuestionBank[]; changedCount: number } {
  if (!banks || banks.length === 0 || !registeredSubjects || registeredSubjects.length === 0) {
    return { updatedBanks: banks, changedCount: 0 };
  }

  let changedCount = 0;
  const updatedBanks = banks.map((bank) => {
    // If it's already an exact match, keep it
    if (isSubjectExactMatch(bank.subject, registeredSubjects)) {
      return bank;
    }

    const matched = findMatchingSubject(bank, registeredSubjects);
    if (matched && matched.name && matched.name !== bank.subject) {
      changedCount++;
      return {
        ...bank,
        subject: matched.name,
        updatedAt: new Date().toISOString(),
      };
    }

    return bank;
  });

  return { updatedBanks, changedCount };
}
