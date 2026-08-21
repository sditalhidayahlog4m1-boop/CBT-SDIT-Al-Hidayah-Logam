import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Trash2,
  CheckCircle,
  Save,
  FileText,
  User,
  BookOpen,
  GraduationCap,
  Layers,
  Key,
  Clock,
  Sparkles,
  HelpCircle,
  Plus,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Pin,
  Rocket,
} from 'lucide-react';
import { QuestionBank, AuthUser, Teacher, Subject, Student, Question, QuestionOption } from '../types';
import {
  getStoredTeachers,
  getStoredSubjects,
  getStoredStudents,
  getStoredBanks,
} from '../utils/storage';

export interface QuestionManualItem {
  id: string;
  question: string;
  options: string[];
  answer: string; // The correct option text or letter
  explanation?: string;
}

// Utility function to parse raw pasted text (Word/Text document)
export function parseRawDocumentText(rawText: string): QuestionManualItem[] {
  if (!rawText.trim()) return [];

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const questions: QuestionManualItem[] = [];

  let currentQuestionText = '';
  let currentOptions: string[] = [];
  let currentKeyLetter = '';
  let currentExplanation = '';
  let qNumber = 1;

  const commitQuestion = () => {
    if (currentQuestionText && currentOptions.length > 0) {
      const cleanOpts = currentOptions.map((o) => o.trim()).filter(Boolean);
      while (cleanOpts.length < 4) {
        cleanOpts.push('');
      }

      let matchedAnswer = '';
      if (currentKeyLetter) {
        const letterIdx = currentKeyLetter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (letterIdx >= 0 && letterIdx < cleanOpts.length && cleanOpts[letterIdx]) {
          matchedAnswer = cleanOpts[letterIdx];
        }
      }
      if (!matchedAnswer && cleanOpts.length > 0) {
        matchedAnswer = cleanOpts[0];
      }

      questions.push({
        id: `qm-${Date.now()}-${qNumber}`,
        question: currentQuestionText.trim(),
        options: cleanOpts.slice(0, 4),
        answer: matchedAnswer,
        explanation: currentExplanation.trim(),
      });
      qNumber++;
    }

    currentQuestionText = '';
    currentOptions = [];
    currentKeyLetter = '';
    currentExplanation = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const qMatch = line.match(/^(?:Soal\s*)?(\d+)[\.\)]\s*(.+)/i);
    const optMatch = line.match(/^([A-Ea-e])[\.\)]\s*(.+)/);
    const keyMatch = line.match(/^(?:Kunci|Jawaban|Kunci\s*Jawaban|Answer)\s*[:=]\s*([A-Ea-e])/i);
    const expMatch = line.match(/^(?:Pembahasan|Penjelasan|Bahasan)\s*[:=]\s*(.+)/i);

    if (keyMatch) {
      currentKeyLetter = keyMatch[1].toUpperCase();
    } else if (expMatch) {
      currentExplanation = expMatch[1];
    } else if (optMatch) {
      currentOptions.push(optMatch[2]);
    } else if (qMatch) {
      if (currentQuestionText) {
        commitQuestion();
      }
      currentQuestionText = qMatch[2];
    } else {
      if (currentOptions.length > 0) {
        currentOptions[currentOptions.length - 1] += ' ' + line;
      } else if (currentQuestionText) {
        currentQuestionText += ' ' + line;
      } else {
        currentQuestionText = line;
      }
    }
  }

  if (currentQuestionText) {
    commitQuestion();
  }

  return questions;
}

interface ManualQuestionBuilderProps {
  onSaveBank: (bank: QuestionBank) => void;
  onCancel?: () => void;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  subjects?: Subject[];
  students?: Student[];
  banks?: QuestionBank[];
}

export const ManualQuestionBuilder: React.FC<ManualQuestionBuilderProps> = ({
  onSaveBank,
  onCancel,
  currentUser,
  teachers,
  subjects,
  students,
  banks,
}) => {
  // Master Data Integration
  const teacherList = useMemo(() => {
    if (teachers && teachers.length > 0) return teachers;
    return getStoredTeachers();
  }, [teachers]);

  const subjectList = useMemo(() => {
    if (subjects && subjects.length > 0) return subjects;
    return getStoredSubjects();
  }, [subjects]);

  const studentList = useMemo(() => {
    if (students && students.length > 0) return students;
    return getStoredStudents();
  }, [students]);

  const bankList = useMemo(() => {
    if (banks && banks.length > 0) return banks;
    return getStoredBanks();
  }, [banks]);

  // Unique Grade Levels & Class Rooms
  const gradeLevelsList = useMemo(() => {
    const set = new Set<string>();
    subjectList.forEach((s) => {
      if (s.gradeLevel && s.gradeLevel.trim()) set.add(s.gradeLevel.trim());
    });
    const defaults = [
      'SD / MI',
      'SMP / MTs',
      'SMA / MA',
      'SMK / MAK',
      'SD Kelas 1',
      'SD Kelas 2',
      'SD Kelas 3',
      'SD Kelas 4',
      'SD Kelas 5',
      'SD Kelas 6',
      'SMP Kelas 7',
      'SMP Kelas 8',
      'SMP Kelas 9',
      'SMA Kelas 10',
      'SMA Kelas 11',
      'SMA Kelas 12',
      'SMK Kelas 10 TKJ',
      'SMK Kelas 11 TKJ',
      'SMK Kelas 12 TKJ',
    ];
    defaults.forEach((d) => set.add(d));
    return Array.from(set);
  }, [subjectList]);

  const classRoomsList = useMemo(() => {
    const set = new Set<string>();
    set.add('Semua Kelas');
    studentList.forEach((st) => {
      if (st.classRoom && st.classRoom.trim()) {
        set.add(st.classRoom.trim());
      }
    });
    bankList.forEach((b) => {
      if (b.class_room && b.class_room.trim() && b.class_room !== 'Umum' && b.class_room !== 'Semua Kelas') {
        set.add(b.class_room.trim());
      }
    });
    return Array.from(set);
  }, [studentList, bankList]);

  // Package Header Form State
  const [bankTitle, setBankTitle] = useState('');
  const [teacherName, setTeacherName] = useState(() => {
    if (currentUser && currentUser.role === 'guru') return currentUser.name;
    return teacherList[0]?.name || '';
  });
  const [subject, setSubject] = useState(() => {
    if (currentUser && currentUser.role === 'guru' && currentUser.details && 'subject' in currentUser.details) {
      return currentUser.details.subject;
    }
    return subjectList[0]?.name || '';
  });
  const [gradeLevel, setGradeLevel] = useState(() => {
    const foundSub = subjectList.find((s) => s.name.toLowerCase() === subject.toLowerCase());
    return foundSub?.gradeLevel || gradeLevelsList[0] || 'SD / MI';
  });
  const [classRoom, setClassRoom] = useState('Semua Kelas');
  const [examToken, setExamToken] = useState('MNL' + Math.floor(1000 + Math.random() * 9000));
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [minWorkingMinutes, setMinWorkingMinutes] = useState(30);

  // Questions State
  const [inputMode, setInputMode] = useState<'form' | 'paste'>('paste');
  const [pastedDocText, setPastedDocText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [questions, setQuestions] = useState<QuestionManualItem[]>([
    {
      id: 'qm-' + Date.now() + '-0',
      question: '',
      options: ['', '', '', ''],
      answer: '',
      explanation: '',
    },
  ]);

  const handleProcessPasteText = () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!pastedDocText.trim()) {
      setErrorMessage('Harap tempel (paste) isi dokumen soal di dalam kotak yang disediakan.');
      return;
    }

    const parsed = parseRawDocumentText(pastedDocText);
    if (parsed.length === 0) {
      setErrorMessage(
        'Tidak dapat membaca struktur soal. Pastikan format soal menggunakan nomor (1.), pilihan (A-D/E), dan kata kunci (Kunci: X atau Jawaban: X).'
      );
      return;
    }

    setQuestions(parsed);
    setSuccessMessage(`🚀 Berhasil mengekstrak ${parsed.length} soal sekaligus dari dokumen! Silakan periksa atau langsung simpan.`);
    setInputMode('form');
  };

  // Add new question block
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: 'qm-' + Date.now() + '-' + prev.length,
        question: '',
        options: ['', '', '', ''],
        answer: '',
        explanation: '',
      },
    ]);
  };

  // Remove question by index
  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Update question text or explanation
  const handleQuestionChange = (index: number, field: 'question' | 'explanation', value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  // Update option text (A, B, C, D)
  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const prevValue = updated[qIndex].options[optIndex];
    updated[qIndex].options[optIndex] = value;

    // If option was set as correct answer, keep synced
    if (updated[qIndex].answer === prevValue) {
      updated[qIndex].answer = value;
    }
    setQuestions(updated);
  };

  // Select correct option
  const handleSelectCorrectAnswer = (qIndex: number, optionValue: string) => {
    const updated = [...questions];
    updated[qIndex].answer = optionValue;
    setQuestions(updated);
  };

  // Submit manual questions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Package metadata validations
    const finalTitle = bankTitle.trim() || `Soal Manual ${subject} - ${gradeLevel}`;
    const finalTeacher = teacherName.trim() || 'Guru Mata Pelajaran';

    // Questions validations
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMessage(`Teks Pertanyaan Soal No. ${i + 1} belum diisi.`);
        return;
      }

      // Check if at least 2 non-empty options exist
      const filledOpts = q.options.filter((o) => o.trim() !== '');
      if (filledOpts.length < 2) {
        setErrorMessage(`Soal No. ${i + 1} minimal harus memiliki 2 pilihan jawaban.`);
        return;
      }

      if (!q.answer || !q.answer.trim()) {
        setErrorMessage(`Kunci Jawaban untuk Soal No. ${i + 1} belum dipilih. Klik tombol (Benar/Pilih) pada salah satu pilihan.`);
        return;
      }
    }

    // Convert to QuestionBank format
    const formattedQuestions: Question[] = questions.map((q, idx) => {
      // Build options array
      const optionsList: QuestionOption[] = q.options.map((optText, oIdx) => {
        const letter = String.fromCharCode(65 + oIdx);
        const isCorrect = q.answer.trim() === optText.trim();
        return {
          option_letter: letter,
          option_text: optText.trim(),
          is_correct: isCorrect,
        };
      });

      return {
        id: 'q-manual-' + Date.now() + '-' + idx,
        question_number: idx + 1,
        question_text: q.question.trim(),
        options: optionsList,
        explanation: q.explanation?.trim() || '',
      };
    });

    const newBank: QuestionBank = {
      id: 'bank-manual-' + Date.now(),
      title: finalTitle,
      teacher_name: finalTeacher,
      subject: subject || 'Umum',
      grade_level: gradeLevel || 'SD / MI',
      class_room: classRoom || 'Semua Kelas',
      total_questions: formattedQuestions.length,
      token: examToken || 'MNL123',
      durationMinutes: Number(durationMinutes) || 45,
      minWorkingMinutes: Number(minWorkingMinutes) || 30,
      createdAt: new Date().toISOString(),
      questions: formattedQuestions,
    };

    onSaveBank(newBank);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-100 text-[10px] sm:text-xs font-black uppercase tracking-wider border border-white/20">
              <FileText className="w-3.5 h-3.5 text-indigo-200" />
              <span>Input Soal Manual - Guru / Admin</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Tambah Paket Soal Manual (Zero Error / Offline Backup)
            </h2>
            <p className="text-xs text-indigo-100/90 font-medium">
              Ketik pertanyaan, opsi A/B/C/D, dan tentukan kunci jawaban secara langsung tanpa kuota API AI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl font-bold border border-white/20">
              Total: {questions.length} Soal
            </span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Package Metadata Form Box */}
        <div className="bg-[#0f172a] rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Informasi & Parameter Paket Ujian
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Judul Paket Soal */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Judul / Nama Paket Ujian <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                placeholder={`Contoh: Soal Ujian Tengah Semester ${subject} Kelas ${gradeLevel}`}
                value={bankTitle}
                onChange={(e) => setBankTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Nama Guru */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Nama Guru Pengampu
              </label>
              <input
                type="text"
                placeholder="Nama Guru..."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Mata Pelajaran
              </label>
              <input
                type="text"
                placeholder="Mata Pelajaran..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Jenjang */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Jenjang Pendidikan
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {gradeLevelsList.map((g, idx) => (
                  <option key={idx} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas / Rombel */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Target Kelas / Rombel
              </label>
              <select
                value={classRoom}
                onChange={(e) => setClassRoom(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {classRoomsList.map((c, idx) => (
                  <option key={idx} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Token Ujian */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" /> Token Ujian CBT
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={examToken}
                  onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setExamToken('MNL' + Math.floor(1000 + Math.random() * 9000))}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 shrink-0"
                >
                  Acak Token
                </button>
              </div>
            </div>

            {/* Durasi Ujian */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Durasi Total (Menit)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Min. Pengerjaan */}
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Min. Pengerjaan (Menit)
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={minWorkingMinutes}
                onChange={(e) => setMinWorkingMinutes(Number(e.target.value))}
                placeholder="30"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-bold flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Input Mode Switcher Tabs */}
        <div className="bg-[#0f172a] p-1.5 rounded-2xl border border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              inputMode === 'paste'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-amber-300" />
            <span>📋 Tempel (Paste) Teks Dokumen Word (Sekaligus)</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('form')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              inputMode === 'form'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-300" />
            <span>✍️ Form Input Per-Soal ({questions.length} Soal)</span>
          </button>
        </div>

        {/* MODE 1: TEMPEL (PASTE) TEKS DOKUMEN WORD */}
        {inputMode === 'paste' && (
          <div className="bg-[#0f172a] rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                Tempel (Paste) Isi Dokumen Soal di Sini:
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Ekstrak otomatis seluruh soal dari dokumen Word/Text tanpa perlu ketik satu per satu.
              </p>
            </div>

            <textarea
              rows={12}
              value={pastedDocText}
              onChange={(e) => setPastedDocText(e.target.value)}
              placeholder="Buka file Word dokumen Anda, tekan Ctrl+A lalu Ctrl+C, dan tempelkan (Ctrl+V) isi seluruh teks soal ke sini..."
              className="w-full p-4 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-slate-100 placeholder-slate-500 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />

            {/* Format Notice Box */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Ketentuan Format Teks Dokumen:</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Pastikan struktur soal di dokumen Anda memuat baris pertanyaan, diikuti pilihan <strong className="text-amber-200">A.</strong> sampai <strong className="text-amber-200">D.</strong> (atau <strong className="text-amber-200">E.</strong>), dan ditutup baris kata kunci (Contoh: <strong className="text-amber-200">Kunci: C</strong> atau <strong className="text-amber-200">Jawaban: C</strong>).
              </p>
              <p className="text-amber-400/90 italic text-[11px] font-medium">
                *Sistem akan membaca otomatis tiap ada kata kunci.
              </p>
            </div>

            {/* Action Process Button */}
            <button
              type="button"
              onClick={handleProcessPasteText}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Rocket className="w-5 h-5 text-amber-300" />
              <span>PROSES & BUAT FORM</span>
            </button>
          </div>
        )}

        {/* MODE 2: FORM PER-SOAL */}
        {inputMode === 'form' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Daftar Soal & Kunci Jawaban ({questions.length} Soal)
              </h3>
              <span className="text-xs text-slate-400">
                Klik <span className="text-emerald-400 font-bold">Kunci</span> pada opsi jawaban untuk menandai jawaban benar.
              </span>
            </div>

          {questions.map((q, qIndex) => (
            <div
              key={q.id || qIndex}
              className="p-5 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm space-y-4 relative"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-extrabold text-xs rounded-lg">
                    Soal No. {qIndex + 1}
                  </span>
                  {q.answer && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Kunci Terisi
                    </span>
                  )}
                </div>

                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all"
                    title="Hapus Soal Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Question Text Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Teks Pertanyaan / Soal <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={q.question}
                  onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                  placeholder="Ketik pertanyaan soal di sini..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium leading-relaxed"
                  required
                />
              </div>

              {/* Options Fields A, B, C, D */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Pilihan Jawaban (A, B, C, D) & Kunci Jawaban <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIndex) => {
                    const label = String.fromCharCode(65 + optIndex); // A, B, C, D
                    const isCorrect = q.answer !== '' && q.answer.trim() === opt.trim() && opt.trim() !== '';

                    return (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                            : 'bg-slate-900 border-slate-700/80 text-slate-200'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {label}
                        </span>

                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                          placeholder={`Isi pilihan ${label}...`}
                          className="flex-1 bg-transparent text-xs text-slate-100 focus:outline-none font-medium placeholder-slate-500"
                          required
                        />

                        <button
                          type="button"
                          onClick={() => handleSelectCorrectAnswer(qIndex, opt)}
                          disabled={!opt.trim()}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                          } ${!opt.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={isCorrect ? 'Ini Kunci Jawaban' : 'Tandai sebagai Kunci Jawaban'}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{isCorrect ? 'KUNCI' : 'Pilih'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Pembahasan / Alasan Jawaban (Opsional)
                </label>
                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                  placeholder="Penjelasan singkat kunci jawaban..."
                  className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-indigo-400" />
            <span>Tambah Soal Lagi</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Paket Soal ke Bank Soal</span>
          </button>
        </div>
      </form>
    </div>
  );
};
