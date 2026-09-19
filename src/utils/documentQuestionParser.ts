import { Question, QuestionOption } from '../types';

/**
 * Strips zero-width characters, BOM, and bidi/RTL/LTR control characters
 * that commonly appear when copying Arabic text, Quranic verses, or Word documents.
 */
export function cleanBidiAndInvisibleChars(text: string): string {
  if (!text) return '';
  return text
    .replace(/^[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C\s\u00A0]+/, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C\s\u00A0]+$/, '');
}

export interface ParsedDocumentQuestion {
  questionNumber: number;
  questionText: string;
  type: 'pilihan_ganda' | 'esai';
  options: { letter: string; text: string; isCorrect: boolean }[];
  key: string;
  essayAnswerKey?: string;
  scoreWeight: number;
  explanation: string;
}

/**
 * Parses raw text from Word, PDF, or text documents into structured questions.
 * Handles "soal berundak" (stepped questions with Quranic verses / stimuli / case studies),
 * preserving multi-line breaks (\n) for authentic visual layout.
 *
 * CRITICAL RULE (Per user intent):
 * A question is strictly treated as PILIHAN GANDA (Multiple Choice)
 * unless there is an EXPLICIT indicator of essay format (e.g. section header or [Esai]/(Esai)).
 */
export function parseDocumentQuestions(rawText: string): ParsedDocumentQuestion[] {
  if (!rawText.trim()) return [];

  const rawLines = rawText.split(/\r?\n/);
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    const cleaned = cleanBidiAndInvisibleChars(rawLine);
    if (cleaned.length > 0) {
      lines.push(cleaned);
    }
  }

  const results: ParsedDocumentQuestion[] = [];

  let currentQuestionLines: string[] = [];
  let currentOptions: { letter: string; text: string }[] = [];
  let currentKey = '';
  let currentEssayKey = '';
  let currentExplanation = '';
  let currentScoreWeight = 10;
  let isExplicitEssay = false;
  let isSectionEssay = false;
  let qNumber = 1;

  let currentQuestionNumber = 0;
  let expectedNextQuestionNumber = 1;
  let subListMode = false;
  let lastSubItemNumber = 0;

  const hasUpcomingStimulusClosureOrOptions = (fromIdx: number): boolean => {
    for (let j = fromIdx; j < Math.min(lines.length, fromIdx + 15); j++) {
      const nextLine = lines[j].trim();
      if (!nextLine) continue;

      // Detected option A, B, C, D, E (e.g. "A. ...", "A) ...", "(A) ...")
      if (/^(?:(?:\(([A-Ea-e])\)|\[([A-Ea-e])\]|([A-Ea-e])[\.\:\)\-–]))\s*(.+)/.test(nextLine)) {
        return true;
      }

      // Detected answer key
      if (/^(?:Kunci|Jawaban|Kunci\s*Jawaban|Answer)\s*[:=]/i.test(nextLine)) {
        return true;
      }

      // Detected ordering / matching / stimulus evaluation prompts
      if (
        /(?:urutan|susunan|pasangan|pernyataan|ayat|nomor)\s+(?:yang|di\s+atas)?\s*(?:benar|tepat|sesuai|paling\s+tepat)/i.test(nextLine) ||
        /\b(?:ditunjukkan|terdapat|merupakan)\s+oleh\s+nomor\b/i.test(nextLine) ||
        /\b(?:adalah|merupakan)\s*\.{2,}/i.test(nextLine) ||
        /\b(?:berdasarkan\s+(?:ayat|data|pernyataan|tabel|bacaan|teks))\b/i.test(nextLine)
      ) {
        return true;
      }
    }
    return false;
  };

  const commitCurrentQuestion = () => {
    const fullText = currentQuestionLines.join('\n').trim();
    if (fullText) {
      // Check explicit essay tags in question text: [Esai], (Esai), [Uraian], (Uraian), "Bentuk: Esai", "Bentuk Soal: Esai"
      const textHasExplicitEssay =
        /\[(?:esai|uraian)\]/i.test(fullText) ||
        /\((?:esai|uraian)\)/i.test(fullText) ||
        /\b(?:bentuk|tipe|jenis)(?:\s+soal)?\s*:\s*(?:esai|uraian)\b/i.test(fullText) ||
        /^soal\s+(?:esai|uraian)\b/i.test(fullText);

      // Only classify as esai IF explicit section header or explicit question tag exists!
      const isEssay = isExplicitEssay || isSectionEssay || textHasExplicitEssay;

      if (isEssay) {
        // Clean off tag from question text
        const cleanedText = fullText
          .replace(/^\[(?:esai|uraian)\]\s*/i, '')
          .replace(/^\((?:esai|uraian)\)\s*/i, '')
          .replace(/\b(?:bentuk|tipe|jenis)(?:\s+soal)?\s*:\s*(?:esai|uraian)\b/i, '')
          .trim();

        results.push({
          questionNumber: qNumber,
          questionText: cleanedText || fullText,
          type: 'esai',
          options: [],
          key: currentEssayKey || currentKey || 'Kunci jawaban esai guru.',
          essayAnswerKey: currentEssayKey || currentKey || 'Kunci jawaban esai guru.',
          scoreWeight: currentScoreWeight || 10,
          explanation: currentExplanation || 'Pedoman penskoran soal esai / uraian.',
        });
      } else {
        // PILIHAN GANDA (Default)
        // Standardize options to at least A, B, C, D
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const finalOptions: { letter: string; text: string; isCorrect: boolean }[] = [];

        // Determine correct answer letter
        let targetKey = currentKey.toUpperCase();
        if (!targetKey && currentEssayKey) {
          const letterM = currentEssayKey.match(/^(?:\[|\()?([A-Ea-e])(?:\.|\)|\:|\s|$)/);
          if (letterM) {
            targetKey = letterM[1].toUpperCase();
          }
        }
        if (!targetKey) {
          targetKey = 'A';
        }

        // Add detected options
        currentOptions.forEach((opt, idx) => {
          const letter = (opt.letter || letters[idx] || 'A').toUpperCase();
          finalOptions.push({
            letter,
            text: opt.text.trim() || `Pilihan ${letter}`,
            isCorrect: letter === targetKey,
          });
        });

        // Ensure at least 4 options (A-D)
        while (finalOptions.length < 4) {
          const nextLetter = letters[finalOptions.length] || 'X';
          finalOptions.push({
            letter: nextLetter,
            text: `Pilihan ${nextLetter}`,
            isCorrect: nextLetter === targetKey,
          });
        }

        // If no option marked correct yet, set the first option (or targetKey) as correct
        if (!finalOptions.some((o) => o.isCorrect)) {
          const targetOpt = finalOptions.find((o) => o.letter === targetKey);
          if (targetOpt) {
            targetOpt.isCorrect = true;
          } else {
            finalOptions[0].isCorrect = true;
          }
        }

        results.push({
          questionNumber: qNumber,
          questionText: fullText,
          type: 'pilihan_ganda',
          options: finalOptions,
          key: targetKey,
          scoreWeight: currentScoreWeight || 10,
          explanation: currentExplanation || 'Pembahasan soal otomatis dari dokumen.',
        });
      }

      qNumber++;
    }

    currentQuestionLines = [];
    currentOptions = [];
    currentKey = '';
    currentEssayKey = '';
    currentExplanation = '';
    currentScoreWeight = 10;
    isExplicitEssay = false;
    subListMode = false;
    lastSubItemNumber = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Check Section Header for Essay
    const sectionEssayMatch = line.match(
      /^(?:(?:BAGIAN|ROMBEL|PART)\s+[A-Z0-9]+[:\s]*)?(?:[A-Z0-9IVX]+[\.\)]\s*)?(?:SOAL\s+)?(?:ESAI|URAIAN)\b/i
    );
    if (sectionEssayMatch) {
      if (currentQuestionLines.length > 0) {
        commitCurrentQuestion();
      }
      isSectionEssay = true;
      continue;
    }

    // 2. Check Section Header for Pilihan Ganda
    const sectionPgMatch = line.match(
      /^(?:(?:BAGIAN|ROMBEL|PART)\s+[A-Z0-9]+[:\s]*)?(?:[A-Z0-9IVX]+[\.\)]\s*)?(?:SOAL\s+)?PILIHAN\s+GANDA\b/i
    );
    if (sectionPgMatch) {
      if (currentQuestionLines.length > 0) {
        commitCurrentQuestion();
      }
      isSectionEssay = false;
      continue;
    }

    // 3. Check Question Number Start: e.g. "1. Pertanyaan...", "Soal 1. ...", "1) ..."
    const qMatch = line.match(/^(?:Soal\s*)?(\d+)[\.\)]\s*(.*)/i);

    // 4. Check Option Start: e.g. "A. ...", "A) ...", "(A) ...", "[A] ...", "a. ...", "A: ...", "A - ..."
    const optMatch = line.match(/^(?:(?:\(([A-Ea-e])\)|\[([A-Ea-e])\]|([A-Ea-e])[\.\:\)\-–]))\s*(.+)/);

    // 5. Check Key Match: e.g. "Kunci: D", "Kunci: D.", "Jawaban: D", "Kunci Jawaban: D", "Kunci: [D]", etc.
    const keyMatch = line.match(/^(?:Kunci|Jawaban|Kunci\s*Jawaban|Answer)\s*[:=]\s*(.+)/i);

    // 6. Check Score / Bobot: e.g. "Bobot: 10", "Skor: 15"
    const scoreMatch = line.match(/^(?:Bobot|Skor|Poin|Nilai)\s*[:=]\s*(\d+)/i);

    // 7. Check Explanation / Pembahasan: e.g. "Pembahasan: ..."
    const expMatch = line.match(/^(?:Pembahasan|Penjelasan|Bahasan|Rubrik)\s*[:=]\s*(.+)/i);

    if (scoreMatch) {
      currentScoreWeight = parseInt(scoreMatch[1], 10) || 10;
    } else if (keyMatch) {
      subListMode = false;
      lastSubItemNumber = 0;
      const val = cleanBidiAndInvisibleChars(keyMatch[1]);
      const letterM = val.match(/^(?:\[|\()?([A-Ea-e])(?:\.|\)|\:|\s|$)/);
      if (letterM) {
        currentKey = letterM[1].toUpperCase();
      } else {
        currentEssayKey = val;
      }
    } else if (expMatch) {
      currentExplanation = expMatch[1].trim();
    } else if (optMatch && !isExplicitEssay && !isSectionEssay) {
      subListMode = false;
      lastSubItemNumber = 0;
      const letter = (optMatch[1] || optMatch[2] || optMatch[3]).toUpperCase();
      const text = optMatch[4].trim();

      // Check if line contains inline multiple options (e.g. "A. xxx  B. yyy  C. zzz")
      const inlineSplitRegex = /\s+(?:(?:\(([B-Eb-e])\)|\[([B-Eb-e])\]|([B-Eb-e])[\.\:\)\-–]))\s+/g;
      const inlineMatches: { index: number; length: number; letter: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = inlineSplitRegex.exec(text)) !== null) {
        inlineMatches.push({
          index: m.index,
          length: m[0].length,
          letter: (m[1] || m[2] || m[3]).toUpperCase(),
        });
      }

      if (inlineMatches.length > 0) {
        let curStart = 0;
        let curLetter = letter;
        for (const im of inlineMatches) {
          const optPart = text.substring(curStart, im.index).trim();
          currentOptions.push({ letter: curLetter, text: optPart });
          curStart = im.index + im.length;
          curLetter = im.letter;
        }
        currentOptions.push({ letter: curLetter, text: text.substring(curStart).trim() });
      } else {
        currentOptions.push({ letter, text });
      }
    } else if (qMatch) {
      const matchedNum = parseInt(qMatch[1], 10);
      let qText = (qMatch[2] || '').trim();

      // Check if this numbered line is actually an internal sub-item / stimulus list (e.g. 1. Ayat..., 2. Ayat..., 3. Ayat...)
      // rather than a brand-new top-level question.
      const hasPrecedingQuestionStem = currentQuestionLines.length > 0;
      const hasNoOptionsYet = currentOptions.length === 0;
      const hasNoKeyYet = !currentKey && !currentEssayKey;
      const fullStemSoFar = currentQuestionLines.join(' ');

      const stimulusIntroRegex = /(?:perhatikan|berikut|susunan|pernyataan|ayat|tabel|bacaan|kutipan|wacana|urutan|dialog|amatilah|cermatilah|simaklah|bacalah|pasangkan|cocokkan|data|teks|nomor|nomor-nomor)\b/i;
      const lastLineSoFar = currentQuestionLines[currentQuestionLines.length - 1] || '';
      const hasStimulusMarker = stimulusIntroRegex.test(fullStemSoFar) || /[:!]\s*$/.test(lastLineSoFar.trim());

      let isInternalSubItem = false;

      if (hasPrecedingQuestionStem && hasNoOptionsYet && hasNoKeyYet) {
        // Case 1: subListMode is already active and the number continues the sequence (e.g. item 2 after item 1, or item 3 after 2)
        if (subListMode && (matchedNum === lastSubItemNumber + 1 || (matchedNum > lastSubItemNumber && matchedNum <= lastSubItemNumber + 4))) {
          isInternalSubItem = true;
        }
        // Case 2: Number restarts at 1 inside an already started question (a question never begins with 1 then immediately repeats 1 as a new question!)
        else if (matchedNum === 1) {
          isInternalSubItem = true;
        }
        // Case 3: Stimulus markers ("Perhatikan susunan berikut!", etc.) are present and upcoming lines have options or sequence prompts
        else if (hasStimulusMarker && (hasUpcomingStimulusClosureOrOptions(i + 1) || matchedNum <= 10)) {
          isInternalSubItem = true;
        }
        // Case 4: Lookahead explicitly confirms an ordering question (e.g. "Urutan yang benar adalah ....") or options (A. 1 - 2 - 3)
        else if (hasUpcomingStimulusClosureOrOptions(i + 1) && matchedNum !== expectedNextQuestionNumber) {
          isInternalSubItem = true;
        }
      }

      if (isInternalSubItem) {
        // Treat as internal sub-item / verse / stimulus within the current question!
        subListMode = true;
        lastSubItemNumber = matchedNum;
        // Keep the line with its numbering (e.g. "1.	وَجَعَلْنَا اللَّيْلَ لِبَاسًا") so it is clearly referenced by options
        currentQuestionLines.push(line);
      } else {
        // It IS a new top-level question!
        if (currentQuestionLines.length > 0) {
          commitCurrentQuestion();
        }

        currentQuestionNumber = matchedNum;
        expectedNextQuestionNumber = matchedNum + 1;
        subListMode = false;
        lastSubItemNumber = 0;

        if (/^\[(?:esai|uraian)\]/i.test(qText) || /^\((?:esai|uraian)\)/i.test(qText)) {
          isExplicitEssay = true;
          qText = qText.replace(/^\[(?:esai|uraian)\]\s*/i, '').replace(/^\((?:esai|uraian)\)\s*/i, '');
        }

        if (qText) {
          currentQuestionLines.push(qText);
        }
      }
    } else {
      // Continuation line (part of question stimulus / ayat / verse / table, or part of option)
      if (currentOptions.length > 0 && !isExplicitEssay && !isSectionEssay) {
        currentOptions[currentOptions.length - 1].text += ' ' + line;
      } else if (currentQuestionLines.length > 0) {
        currentQuestionLines.push(line);
      } else {
        currentQuestionLines.push(line);
      }
    }
  }

  if (currentQuestionLines.length > 0) {
    commitCurrentQuestion();
  }

  return results;
}

/**
 * Converts parsed questions to the standard CBT `Question[]` model
 */
export function convertParsedToQuestions(parsedList: ParsedDocumentQuestion[]): Question[] {
  return parsedList.map((p, idx) => {
    const qNumber = p.questionNumber || idx + 1;
    const isEssay = p.type === 'esai';

    if (isEssay) {
      return {
        id: `q-doc-${Date.now()}-${idx + 1}`,
        question_number: qNumber,
        question_text: p.questionText,
        type: 'esai',
        options: [],
        essayAnswerKey: p.essayAnswerKey || p.key || 'Kunci jawaban esai guru.',
        scoreWeight: p.scoreWeight || 10,
        explanation: p.explanation || 'Pedoman penskoran soal esai / uraian.',
      };
    }

    const options: QuestionOption[] = p.options.map((opt) => ({
      option_letter: opt.letter,
      option_text: opt.text,
      is_correct: opt.isCorrect,
    }));

    return {
      id: `q-doc-${Date.now()}-${idx + 1}`,
      question_number: qNumber,
      question_text: p.questionText,
      type: 'pilihan_ganda',
      options,
      scoreWeight: p.scoreWeight || 10,
      explanation: p.explanation || 'Pembahasan soal otomatis.',
    };
  });
}
