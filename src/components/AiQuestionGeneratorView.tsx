import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Save,
  Key,
  BookOpen,
  User,
  GraduationCap,
  Layers,
  FileText,
  Edit2,
  Check,
  PenTool,
  ListFilter,
} from 'lucide-react';
import { QuestionBank, ActiveTab, AuthUser, Teacher, Subject, Student } from '../types';
import { normalizeQuestion } from '../utils/normalizeQuestion';
import {
  getStoredTeachers,
  getStoredSubjects,
  getStoredStudents,
  getStoredBanks,
} from '../utils/storage';

interface AiQuestionGeneratorViewProps {
  onSaveBank: (bank: QuestionBank) => void;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  subjects?: Subject[];
  students?: Student[];
  banks?: QuestionBank[];
}

export const AiQuestionGeneratorView: React.FC<AiQuestionGeneratorViewProps> = ({
  onSaveBank,
  setActiveTab,
  currentUser,
  teachers,
  subjects,
  students,
  banks,
}) => {
  // Synchronized Master Data from Sub Menus
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

  // Derived unique Grade Levels (Jenjang Pendidikan) from Sub Menu
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

  // Derived unique Rombel / Kelas from Sub Menu (Data Siswa & Bank Soal)
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

  useEffect(() => {
    if (currentUser && currentUser.role === 'guru') {
      setTeacherName(currentUser.name);
      if (currentUser.details && 'subject' in currentUser.details) {
        setSubject(currentUser.details.subject);
      }
    }
  }, [currentUser]);

  const [gradeLevel, setGradeLevel] = useState(() => {
    const foundSub = subjectList.find((s) => s.name.toLowerCase() === subject.toLowerCase());
    return foundSub?.gradeLevel || gradeLevelsList[0] || 'SD / MI';
  });
  const [classRoom, setClassRoom] = useState('Semua Kelas');

  // Input Mode States (Single Box per Field - No double stacked boxes)
  const [isCustomTeacher, setIsCustomTeacher] = useState(false);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [isCustomGrade, setIsCustomGrade] = useState(false);
  const [isCustomClassRoom, setIsCustomClassRoom] = useState(false);

  const [totalQuestionsText, setTotalQuestionsText] = useState('5');
  const [difficulty, setDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit'>('Sedang');
  const [topic, setTopic] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedData, setGeneratedData] = useState<any | null>(() => {
    try {
      const draft = localStorage.getItem('cbt_ai_generated_questions_draft');
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  });

  const [examToken, setExamToken] = useState('AI' + Math.floor(1000 + Math.random() * 9000));
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [minWorkingMinutes, setMinWorkingMinutes] = useState(30);
  const [copied, setCopied] = useState(false);

  // Validate number-only for totalQuestions input
  const handleTotalQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only accept numeric characters
    if (/^\d*$/.test(val)) {
      setTotalQuestionsText(val);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setGeneratedData(null);
    try {
      localStorage.removeItem('cbt_ai_generated_questions_draft');
    } catch {
      // ignore
    }

    const numQuestions = parseInt(totalQuestionsText, 10);
    if (!totalQuestionsText || isNaN(numQuestions) || numQuestions <= 0) {
      setErrorMessage('Jumlah soal harus berupa angka positif.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Mata Pelajaran wajib diisi.');
      return;
    }

    if (!gradeLevel.trim()) {
      setErrorMessage('Jenjang Pendidikan wajib diisi.');
      return;
    }

    if (!topic.trim()) {
      setErrorMessage('Materi / Topik soal wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName,
          subject,
          gradeLevel,
          classRoom,
          totalQuestions: numQuestions,
          topic,
          difficulty,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Terjadi kesalahan saat generate soal dari Gemini AI.');
      }

      setGeneratedData(resData.data);
      try {
        localStorage.setItem('cbt_ai_generated_questions_draft', JSON.stringify(resData.data));
      } catch {
        // ignore
      }
      // Auto refresh token
      setExamToken('CBT' + Math.floor(1000 + Math.random() * 9000));
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal terhubung ke AI Service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToBank = () => {
    if (!generatedData) return;

    const rawQuestions = generatedData.questions || generatedData.items || [];
    const questionsList = rawQuestions.map((q: any, i: number) => {
      const norm = normalizeQuestion(q, i, topic || subject);
      return {
        id: 'q-ai-' + Date.now() + '-' + i,
        question_number: i + 1,
        question_text: norm.questionText,
        options: norm.optionsList.map((o) => ({
          option_letter: o.letter,
          option_text: o.text,
          is_correct: o.isCorrect,
        })),
        explanation: norm.explanationText,
      };
    });

    const newBank: QuestionBank = {
      id: 'bank-ai-' + Date.now(),
      title: `Soal AI ${subject} - ${gradeLevel}`,
      teacher_name: teacherName || 'Guru Mata Pelajaran',
      subject: subject,
      grade_level: gradeLevel,
      class_room: classRoom || 'Semua Kelas',
      total_questions: questionsList.length,
      token: examToken || 'CBT123',
      durationMinutes: Number(durationMinutes) || 45,
      minWorkingMinutes: Number(minWorkingMinutes) || 30,
      createdAt: new Date().toISOString(),
      questions: questionsList,
    };

    onSaveBank(newBank);
    try {
      localStorage.removeItem('cbt_ai_generated_questions_draft');
    } catch {
      // ignore
    }
    setGeneratedData(null);
    alert(`Berhasil menyimpan ${questionsList.length} soal ke Bank Soal dengan Token Ujian: ${examToken}`);
    setActiveTab('bank-soal');
  };

  const handleCopyJson = () => {
    if (!generatedData) return;
    navigator.clipboard.writeText(JSON.stringify(generatedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page Header Banner - Teacher Template */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-3.5 sm:p-4 md:p-5 text-slate-950 shadow-lg relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/20 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-slate-900" />
                  <span>Template Guru - Gemini AI Engine</span>
                </div>
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 tracking-tight leading-snug">
                  Pembuat Soal AI Otomatis (CBT Generator)
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-900/90 font-medium leading-tight">
                  Isi parameter di bawah ini untuk membuat paket soal CBT beserta pilihan jawaban & pembahasan otomatis
                </p>
              </div>
            </div>
          </div>

      {/* Form Input Section */}
      <form onSubmit={handleGenerate} className="bg-[#0f172a] rounded-2xl p-6 border border-slate-800 shadow-sm space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          Formulir Parameter Ujian
        </h3>

        {/* Row 1: Teacher & Subject */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Field: Nama Guru */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Nama Guru
              </label>
              <div className="flex items-center gap-2">
                {teacherList.length > 0 && !isCustomTeacher && (
                  <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {teacherList.length} Terdaftar
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomTeacher(!isCustomTeacher)}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isCustomTeacher ? (
                    <>
                      <ListFilter className="w-3 h-3 text-indigo-400" /> Pilih dari List
                    </>
                  ) : (
                    <>
                      <PenTool className="w-3 h-3 text-indigo-400" /> Ketik Manual
                    </>
                  )}
                </button>
              </div>
            </div>

            {isCustomTeacher ? (
              <input
                type="text"
                placeholder="Ketik nama guru manual..."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-indigo-500/60 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
              />
            ) : (
              <select
                value={teacherList.some((t) => t.name === teacherName) ? teacherName : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__MANUAL__') {
                    setIsCustomTeacher(true);
                  } else if (val) {
                    setTeacherName(val);
                    const found = teacherList.find((t) => t.name === val);
                    if (found && found.subject && found.subject !== '-') {
                      setSubject(found.subject);
                      const foundSub = subjectList.find(
                        (s) => s.name.toLowerCase() === found.subject.toLowerCase()
                      );
                      if (foundSub && foundSub.gradeLevel) {
                        setGradeLevel(foundSub.gradeLevel);
                      }
                    }
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="">-- Pilih Guru Terdaftar --</option>
                {teacherList.map((t) => (
                  <option key={t.id || t.name} value={t.name}>
                    {t.name} {t.subject ? `(${t.subject})` : ''}
                  </option>
                ))}
                <option value="__MANUAL__">✏️ Ketik Nama Guru Manual...</option>
              </select>
            )}
          </div>

          {/* Field: Mata Pelajaran */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Mata Pelajaran *
              </label>
              <div className="flex items-center gap-2">
                {subjectList.length > 0 && !isCustomSubject && (
                  <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {subjectList.length} Mapel
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomSubject(!isCustomSubject)}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isCustomSubject ? (
                    <>
                      <ListFilter className="w-3 h-3 text-indigo-400" /> Pilih dari List
                    </>
                  ) : (
                    <>
                      <PenTool className="w-3 h-3 text-indigo-400" /> Ketik Manual
                    </>
                  )}
                </button>
              </div>
            </div>

            {isCustomSubject ? (
              <input
                type="text"
                required
                placeholder="Ketik mata pelajaran manual..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-indigo-500/60 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
              />
            ) : (
              <select
                value={subjectList.some((s) => s.name === subject) ? subject : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__MANUAL__') {
                    setIsCustomSubject(true);
                  } else if (val) {
                    setSubject(val);
                    const found = subjectList.find((s) => s.name === val);
                    if (found && found.gradeLevel) {
                      setGradeLevel(found.gradeLevel);
                    }
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="">-- Pilih Mapel Terdaftar --</option>
                {subjectList.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name} {s.gradeLevel ? `(${s.gradeLevel})` : ''}
                  </option>
                ))}
                <option value="__MANUAL__">✏️ Ketik Mapel Manual...</option>
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Jenjang, Kelas/Rombel, Jumlah Soal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Field: Jenjang Pendidikan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Jenjang Pendidikan *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomGrade(!isCustomGrade)}
                className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
              >
                {isCustomGrade ? (
                  <>
                    <ListFilter className="w-3 h-3 text-indigo-400" /> Pilih List
                  </>
                ) : (
                  <>
                    <PenTool className="w-3 h-3 text-indigo-400" /> Ketik Manual
                  </>
                )}
              </button>
            </div>

            {isCustomGrade ? (
              <input
                type="text"
                required
                placeholder="Contoh: SD Kelas 4, SMP Kelas 8, SMA Kelas 11, SMK Kelas 12 TKJ..."
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-indigo-500/60 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
              />
            ) : (
              <select
                value={gradeLevelsList.includes(gradeLevel) ? gradeLevel : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__MANUAL__') {
                    setIsCustomGrade(true);
                  } else if (val) {
                    setGradeLevel(val);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="">-- Pilih Jenjang Terdaftar --</option>
                {gradeLevelsList.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
                <option value="__MANUAL__">✏️ Ketik Jenjang Manual...</option>
              </select>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              SD/MI (A-D), SMP/MTs (A-D), SMA/MA (A-E HOTS), SMK (A-E Vokasional).
            </p>
          </div>

          {/* Field: Kelas / Rombel */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Kelas / Rombel
              </label>
              <div className="flex items-center gap-2">
                {classRoomsList.length > 0 && !isCustomClassRoom && (
                  <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {classRoomsList.length} Rombel
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomClassRoom(!isCustomClassRoom)}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isCustomClassRoom ? (
                    <>
                      <ListFilter className="w-3 h-3 text-indigo-400" /> Pilih List
                    </>
                  ) : (
                    <>
                      <PenTool className="w-3 h-3 text-indigo-400" /> Ketik Manual
                    </>
                  )}
                </button>
              </div>
            </div>

            {isCustomClassRoom ? (
              <input
                type="text"
                placeholder="Contoh: 6 Abu Bakar As Siddiq, 6 A, Semua Kelas..."
                value={classRoom}
                onChange={(e) => setClassRoom(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-indigo-500/60 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
              />
            ) : (
              <select
                value={classRoomsList.includes(classRoom) ? classRoom : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__MANUAL__') {
                    setIsCustomClassRoom(true);
                  } else if (val) {
                    setClassRoom(val);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="">-- Pilih Rombel Terdaftar --</option>
                {classRoomsList.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
                <option value="__MANUAL__">✏️ Ketik Rombel Manual...</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Jumlah Soal *</span>
              <span className="text-[10px] text-indigo-400 font-semibold">Tanpa Batas Maksimal</span>
            </label>
            <input
              type="text"
              required
              placeholder="Masukkan angka (contoh: 5, 20, 100, 500)"
              value={totalQuestionsText}
              onChange={handleTotalQuestionsChange}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 text-indigo-400 font-bold rounded-xl text-xs focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Input ketik biasa. Tidak berubah saat di-scroll mouse.
            </p>
          </div>
        </div>

        {/* Row: Tingkat Kesulitan */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tingkat Kesulitan & Model Soal
            </span>
            <span className="text-[10px] text-slate-400">Sinkronisasi Jenjang & Kesulitan</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setDifficulty('Mudah')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                difficulty === 'Mudah'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${difficulty === 'Mudah' ? 'text-emerald-400' : 'text-slate-300'}`}>
                  🟢 Level Mudah
                </span>
                {difficulty === 'Mudah' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                Pertanyaan lugas dan langsung menguji pemahaman dasar/definisi dengan pilihan jawaban yang jelas.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDifficulty('Sedang')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                difficulty === 'Sedang'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-900/30'
                  : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${difficulty === 'Sedang' ? 'text-indigo-400' : 'text-slate-300'}`}>
                  🔵 Level Sedang
                </span>
                {difficulty === 'Sedang' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                Menguji pemahaman konsep, hukum kaidah, dan korelasi antar komponen materi.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDifficulty('Sulit')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                difficulty === 'Sulit'
                  ? 'bg-rose-950/40 border-rose-500 text-white shadow-md shadow-rose-900/30'
                  : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${difficulty === 'Sulit' ? 'text-rose-400' : 'text-slate-300'}`}>
                  🔴 Level Sulit (HOTS)
                </span>
                {difficulty === 'Sulit' && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                Soal penalaran analitis (HOTS), evaluasi kasus kritis, dan studi pemecahan masalah.
              </p>
            </button>
          </div>
        </div>

        {/* Row 3: Materi / Topik */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Materi / Topik Soal *</span>
            <span className="text-[10px] text-slate-400">Dukungan Copy-Paste Word/PDF (Tanpa batas panjang)</span>
          </label>
          <textarea
            required
            rows={5}
            placeholder="Ketik atau paste materi pelajaran, ringkasan bab, silabus, atau poin-poin soal di sini..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl text-xs focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium leading-relaxed"
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Gagal Generate Soal:</span> {errorMessage}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Memproses Gemini AI... (Sabar sejenak)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Generate Soal CBT Sekarang</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Result Preview Modal / Section */}
      {generatedData && (
        <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-800 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Berhasil Digenerate oleh Gemini AI</span>
              </div>
              <h3 className="text-lg font-black text-slate-100 mt-1">
                Hasil Paket Soal CBT ({generatedData.questions?.length || 0} Soal)
              </h3>
              <p className="text-xs text-slate-400">
                Mata Pelajaran: <span className="font-semibold text-slate-200">{subject}</span> | Jenjang:{' '}
                <span className="font-semibold text-slate-200">{gradeLevel}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tercopy!' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={handleSaveToBank}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan ke Bank Soal</span>
              </button>
            </div>
          </div>

          {/* Token & Duration Config before saving */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Token Ujian Siswa
              </label>
              <input
                type="text"
                value={examToken}
                onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg font-mono font-bold text-amber-400 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">Durasi Total Ujian (Menit)</label>
              <input
                type="number"
                min="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-amber-300 mb-1 flex items-center gap-1">
                <span>Waktu Minimal Pengerjaan (Menit)</span>
              </label>
              <input
                type="number"
                min="0"
                value={minWorkingMinutes}
                onChange={(e) => setMinWorkingMinutes(Number(e.target.value))}
                placeholder="Default: 30"
                className="w-full px-3 py-2 bg-slate-800 border border-amber-500/40 rounded-lg font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Siswa tidak bisa klik Selesai jika belum mencapai waktu ini.
              </span>
            </div>
          </div>

          {/* List of generated questions */}
          <div className="space-y-4">
            {(generatedData.questions || generatedData.items || []).map((q: any, qIdx: number) => {
              const norm = normalizeQuestion(q, qIdx, topic || subject);
              return (
                <div key={qIdx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs rounded-lg">
                      Soal No. {qIdx + 1}
                    </span>
                  </div>

                  <p className={`text-xs sm:text-sm font-bold text-slate-100 leading-relaxed ${/[\u0600-\u06FF]/.test(norm.questionText) ? 'font-arabic text-base text-amber-200 dir-rtl text-right leading-loose' : ''}`}>
                    {norm.questionText}
                  </p>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                    {norm.optionsList.map((opt, oIdx) => {
                      const isArabicOpt = /[\u0600-\u06FF]/.test(opt.text);
                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                            opt.isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                              opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {opt.letter}
                          </span>
                          <span className={`flex-1 ${isArabicOpt ? 'font-arabic text-base text-amber-300 font-bold dir-rtl leading-loose' : ''}`}>
                            {opt.text}
                          </span>
                          {opt.isCorrect && (
                            <span className="text-[9px] uppercase font-bold text-emerald-400 px-1.5 py-0.5 bg-emerald-500/20 rounded shrink-0">
                              Kunci
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {norm.explanationText && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-200">
                      <span className="font-bold block mb-0.5 text-amber-400">Pembahasan:</span>
                      <p className="text-slate-300 leading-relaxed">{norm.explanationText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
