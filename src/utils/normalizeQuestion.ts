export interface NormalizedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  arabicText?: string;
  translationText?: string;
  optionsList: { letter: string; text: string; isCorrect: boolean }[];
  rawOptions: string[];
  correctAnswerText: string;
  correctAnswerLetter: string;
  explanationText: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sulit';
  category?: string;
  subjectName?: string;
  surahNumber?: number;
  ayahNumber?: number;
}

/**
 * Normalizes raw question data from Gemini API, local storage, or external banks.
 * Ensures strict fallback handling so no key is ever missing or blank in the UI.
 */
export function normalizeQuestion(
  q: any,
  index: number = 0,
  defaultTopic: string = 'Materi Pembelajaran'
): NormalizedQuestion {
  if (!q || typeof q !== 'object') {
    return {
      id: `q-fallback-${Date.now()}-${index}`,
      questionNumber: index + 1,
      questionText: `Soal #${index + 1} (${defaultTopic}): Pertanyaan tidak dapat dimuat.`,
      optionsList: [
        { letter: 'A', text: 'Pilihan A', isCorrect: true },
        { letter: 'B', text: 'Pilihan B', isCorrect: false },
        { letter: 'C', text: 'Pilihan C', isCorrect: false },
        { letter: 'D', text: 'Pilihan D', isCorrect: false },
      ],
      rawOptions: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
      correctAnswerText: 'Pilihan A',
      correctAnswerLetter: 'A',
      explanationText: 'Pembahasan belum tersedia.',
    };
  }

  // 1. Resolve Question ID & Number
  const id = q.id || `q-${Date.now()}-${index}`;
  const questionNumber = q.question_number || q.questionNumber || index + 1;

  // 2. Resolve Question Text (Prompt)
  const rawQuestion =
    q.question_text ||
    q.questionText ||
    q.prompt_text ||
    q.promptText ||
    q.question ||
    q.teksSoal ||
    q.soal ||
    q.pertanyaan ||
    q.prompt ||
    '';

  let questionText = typeof rawQuestion === 'string' ? rawQuestion.trim() : String(rawQuestion || '').trim();

  // Guard against blank question text or text that is literally just the topic title without a prompt
  if (!questionText || (defaultTopic && questionText.toLowerCase() === defaultTopic.toLowerCase().trim())) {
    questionText = `Berdasarkan materi "${defaultTopic}", manakah pernyataan berikut yang paling tepat?`;
  }

  // 3. Resolve Arabic Text & Translation
  const arabicText = (q.arabic_text || q.arabicText || q.teksArab || q.ayatArab || '').trim();
  const translationText = (q.translation || q.translationText || q.terjemahan || q.latinText || '').trim();

  // 4. Resolve Options (Array of strings or Array of objects)
  const rawOpts = q.options || q.pilihan || q.opsi || q.optionsList || q.choices || [];
  const rawOptions: string[] = [];
  let optionsList: { letter: string; text: string; isCorrect: boolean }[] = [];

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  let correctAnswerText = '';
  let correctAnswerLetter = '';

  const rawCorrectAns = q.correct_answer || q.correctAnswer || q.answer || q.kunciJawaban || q.kunci || '';

  if (Array.isArray(rawOpts) && rawOpts.length > 0) {
    optionsList = rawOpts.map((opt: any, idx: number) => {
      const letter = letters[idx] || String.fromCharCode(65 + idx);

      if (typeof opt === 'string') {
        const text = opt.trim();
        rawOptions.push(text);

        // Check if string matches answer
        let isCorrect = false;
        if (typeof rawCorrectAns === 'string' && rawCorrectAns.trim()) {
          const trimmedAns = rawCorrectAns.trim();
          if (trimmedAns.toUpperCase() === letter) {
            isCorrect = true;
          } else if (trimmedAns.toLowerCase() === text.toLowerCase()) {
            isCorrect = true;
          }
        }

        if (isCorrect) {
          correctAnswerText = text;
          correctAnswerLetter = letter;
        }

        return { letter, text, isCorrect };
      } else if (typeof opt === 'object' && opt !== null) {
        const letter = opt.option_letter || opt.letter || letters[idx];
        const text = (opt.option_text || opt.text || opt.label || opt.value || '').trim();
        const isCorrect = Boolean(opt.is_correct || opt.isCorrect);

        rawOptions.push(text);

        if (isCorrect) {
          correctAnswerText = text;
          correctAnswerLetter = letter;
        }

        return { letter, text, isCorrect };
      }

      return { letter, text: String(opt || ''), isCorrect: false };
    });
  }

  // If no correct answer was flagged yet, try resolving from rawCorrectAns string or default to first option
  if (!correctAnswerText && optionsList.length > 0) {
    if (typeof rawCorrectAns === 'string' && rawCorrectAns.trim()) {
      const trimmedAns = rawCorrectAns.trim();

      // Is single letter A-E
      if (/^[A-E]$/i.test(trimmedAns)) {
        const targetLetter = trimmedAns.toUpperCase();
        const found = optionsList.find((o) => o.letter === targetLetter);
        if (found) {
          found.isCorrect = true;
          correctAnswerText = found.text;
          correctAnswerLetter = found.letter;
        }
      } else {
        // Try exact text match
        const found = optionsList.find((o) => o.text.toLowerCase() === trimmedAns.toLowerCase());
        if (found) {
          found.isCorrect = true;
          correctAnswerText = found.text;
          correctAnswerLetter = found.letter;
        } else {
          correctAnswerText = trimmedAns;
        }
      }
    }

    if (!correctAnswerText) {
      optionsList[0].isCorrect = true;
      correctAnswerText = optionsList[0].text;
      correctAnswerLetter = optionsList[0].letter;
    }
  }

  // 5. Resolve Explanation / Pembahasan
  const rawExplanation = q.explanation || q.pembahasan || q.explanationText || q.alasan || '';
  const explanationText = typeof rawExplanation === 'string' && rawExplanation.trim()
    ? rawExplanation.trim()
    : 'Pembahasan ringkas belum tersedia untuk soal ini.';

  return {
    id,
    questionNumber,
    questionText,
    arabicText,
    translationText,
    optionsList,
    rawOptions,
    correctAnswerText,
    correctAnswerLetter,
    explanationText,
    difficulty: q.difficulty || 'Sedang',
    category: q.category || q.game_type || '',
    subjectName: q.subject_name || q.subject || '',
    surahNumber: q.surah_number || q.surahNumber,
    ayahNumber: q.ayah_number || q.ayahNumber,
  };
}
