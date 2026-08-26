import React, { useState, useEffect } from 'react';
import {
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  Key,
  Clock,
  User,
  GraduationCap,
  Layers,
  HelpCircle,
  FileEdit,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Upload,
  Eye,
} from 'lucide-react';
import { QuestionBank, Question, QuestionOption } from '../types';
import { normalizeQuestion } from '../utils/normalizeQuestion';

interface EditBankSoalModalProps {
  bank: QuestionBank | null;
  initialQuestionIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBank: QuestionBank) => void;
}

export const EditBankSoalModal: React.FC<EditBankSoalModalProps> = ({
  bank,
  initialQuestionIndex = 0,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !bank) return null;

  // Metadata states
  const [title, setTitle] = useState(bank.title || '');
  const [subject, setSubject] = useState(bank.subject || '');
  const [teacherName, setTeacherName] = useState(bank.teacher_name || '');
  const [gradeLevel, setGradeLevel] = useState(bank.grade_level || 'SD / MI');
  const [classRoom, setClassRoom] = useState(bank.class_room || 'Semua Kelas');
  const [token, setToken] = useState(bank.token || '');
  const [durationMinutes, setDurationMinutes] = useState(bank.durationMinutes || 45);
  const [minWorkingMinutes, setMinWorkingMinutes] = useState(
    bank.minWorkingMinutes !== undefined ? bank.minWorkingMinutes : 30
  );

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(initialQuestionIndex);
  const [activeTab, setActiveTab] = useState<'soal' | 'info'>('soal');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize questions on bank change
  useEffect(() => {
    if (bank) {
      setTitle(bank.title || '');
      setSubject(bank.subject || '');
      setTeacherName(bank.teacher_name || '');
      setGradeLevel(bank.grade_level || 'SD / MI');
      setClassRoom(bank.class_room || 'Semua Kelas');
      setToken(bank.token || '');
      setDurationMinutes(bank.durationMinutes || 45);
      setMinWorkingMinutes(bank.minWorkingMinutes !== undefined ? bank.minWorkingMinutes : 30);

      // Normalize all existing questions to standard Question format
      const standardQuestions: Question[] = (bank.questions || []).map((q, idx) => {
        const norm = normalizeQuestion(q, idx, bank.title || bank.subject);
        const options: QuestionOption[] = norm.optionsList.map((opt) => ({
          option_letter: opt.letter,
          option_text: opt.text,
          is_correct: opt.isCorrect,
        }));

        // Ensure at least 4 options (A, B, C, D)
        const letters = ['A', 'B', 'C', 'D', 'E'];
        while (options.length < 4) {
          const letter = letters[options.length] || 'X';
          options.push({
            option_letter: letter,
            option_text: `Pilihan ${letter}`,
            is_correct: false,
          });
        }

        // Ensure at least one option is marked correct
        if (!options.some((o) => o.is_correct) && options.length > 0) {
          options[0].is_correct = true;
        }

        return {
          id: norm.id || `q-${Date.now()}-${idx}`,
          question_number: idx + 1,
          question_text: norm.questionText,
          options: options,
          explanation: norm.explanationText || '',
          gambarUrl: norm.gambarUrl || undefined,
        };
      });

      setQuestions(standardQuestions);
      setActiveQIndex(
        initialQuestionIndex >= 0 && initialQuestionIndex < standardQuestions.length
          ? initialQuestionIndex
          : 0
      );
    }
  }, [bank, initialQuestionIndex]);

  // Handle Upload Image for Question
  const handleUploadGambarSoal = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('File harus berupa format gambar (JPG, PNG, GIF, WEBP, SVG)!');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Ukuran gambar maksimal adalah 2 MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setQuestions((prev) =>
        prev.map((q, idx) => (idx === index ? { ...q, gambarUrl: base64String } : q))
      );
      setErrorMessage('');
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca file gambar. Silakan coba file lain.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Handle Remove Image for Question
  const handleHapusGambarSoal = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === index ? { ...q, gambarUrl: undefined } : q))
    );
  };

  // Handle Question Text Change
  const handleQuestionTextChange = (text: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeQIndex ? { ...q, question_text: text } : q))
    );
  };

  // Handle Option Text Change
  const handleOptionTextChange = (optIdx: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== activeQIndex) return q;
        const newOpts = [...q.options];
        if (newOpts[optIdx]) {
          newOpts[optIdx] = { ...newOpts[optIdx], option_text: text };
        }
        return { ...q, options: newOpts };
      })
    );
  };

  // Set Correct Answer
  const handleSetCorrectOption = (optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== activeQIndex) return q;
        const newOpts = q.options.map((opt, oIdx) => ({
          ...opt,
          is_correct: oIdx === optIdx,
        }));
        return { ...q, options: newOpts };
      })
    );
  };

  // Handle Explanation Change
  const handleExplanationChange = (explanation: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeQIndex ? { ...q, explanation } : q))
    );
  };

  // Add Option (e.g. Option E)
  const handleAddOption = () => {
    const currentQ = questions[activeQIndex];
    if (!currentQ || currentQ.options.length >= 6) return;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextLetter = letters[currentQ.options.length] || 'X';
    const newOpts = [
      ...currentQ.options,
      { option_letter: nextLetter, option_text: `Pilihan ${nextLetter}`, is_correct: false },
    ];
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeQIndex ? { ...q, options: newOpts } : q))
    );
  };

  // Remove Option (minimum 2 options)
  const handleRemoveOption = (optIdx: number) => {
    const currentQ = questions[activeQIndex];
    if (!currentQ || currentQ.options.length <= 2) return;
    let newOpts = currentQ.options.filter((_, i) => i !== optIdx);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    newOpts = newOpts.map((opt, i) => ({
      ...opt,
      option_letter: letters[i] || opt.option_letter,
    }));
    // If removed option was the correct one, make first option correct
    if (!newOpts.some((o) => o.is_correct) && newOpts.length > 0) {
      newOpts[0].is_correct = true;
    }
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeQIndex ? { ...q, options: newOpts } : q))
    );
  };

  // Add New Question
  const handleAddNewQuestion = () => {
    const newNumber = questions.length + 1;
    const newQ: Question = {
      id: `q-manual-${Date.now()}-${newNumber}`,
      question_number: newNumber,
      question_text: `Tuliskan pertanyaan baru nomor ${newNumber} di sini...`,
      options: [
        { option_letter: 'A', option_text: 'Pilihan Jawaban A', is_correct: true },
        { option_letter: 'B', option_text: 'Pilihan Jawaban B', is_correct: false },
        { option_letter: 'C', option_text: 'Pilihan Jawaban C', is_correct: false },
        { option_letter: 'D', option_text: 'Pilihan Jawaban D', is_correct: false },
      ],
      explanation: 'Pembahasan jawaban...',
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveQIndex(questions.length);
    setActiveTab('soal');
  };

  // Delete Current Question
  const handleDeleteCurrentQuestion = (indexToDelete: number) => {
    if (questions.length <= 1) {
      setErrorMessage('Paket soal minimal harus memiliki 1 butir pertanyaan.');
      return;
    }
    const updated = questions
      .filter((_, i) => i !== indexToDelete)
      .map((q, i) => ({ ...q, question_number: i + 1 }));
    setQuestions(updated);
    if (activeQIndex >= updated.length) {
      setActiveQIndex(Math.max(0, updated.length - 1));
    }
  };

  // Handle Save
  const handleSave = () => {
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Judul paket soal tidak boleh kosong.');
      setActiveTab('info');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Mata pelajaran tidak boleh kosong.');
      setActiveTab('info');
      return;
    }

    if (!token.trim()) {
      setErrorMessage('Token ujian tidak boleh kosong.');
      setActiveTab('info');
      return;
    }

    if (questions.length === 0) {
      setErrorMessage('Daftar pertanyaan tidak boleh kosong.');
      return;
    }

    // Validate that each question has valid question_text and at least one correct option
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setErrorMessage(`Pertanyaan pada nomor ${i + 1} tidak boleh kosong.`);
        setActiveQIndex(i);
        setActiveTab('soal');
        return;
      }
      if (!q.options || q.options.length < 2) {
        setErrorMessage(`Soal nomor ${i + 1} minimal harus memiliki 2 pilihan ganda.`);
        setActiveQIndex(i);
        setActiveTab('soal');
        return;
      }
      if (!q.options.some((o) => o.is_correct)) {
        setErrorMessage(`Soal nomor ${i + 1} belum ditentukan kunci jawaban yang benar.`);
        setActiveQIndex(i);
        setActiveTab('soal');
        return;
      }
    }

    const updatedBank: QuestionBank = {
      ...bank,
      title: title.trim(),
      subject: subject.trim(),
      teacher_name: teacherName.trim() || 'Guru Pengampu',
      grade_level: gradeLevel.trim() || 'SD / MI',
      class_room: classRoom.trim() || 'Semua Kelas',
      token: token.trim().toUpperCase(),
      total_questions: questions.length,
      durationMinutes: Number(durationMinutes) || 45,
      minWorkingMinutes: Number(minWorkingMinutes) || 30,
      questions: questions.map((q, idx) => ({ ...q, question_number: idx + 1 })),
    };

    onSave(updatedBank);
    onClose();
  };

  const currentQ = questions[activeQIndex] || null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in">
      <div className="bg-[#0f172a] rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 text-slate-100 overflow-hidden">
        {/* HEADER BAR */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>Edit Paket & Butir Soal</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  Token: {token || 'BELUM DIATUR'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ubah judul, informasi ujian, narasi soal, pilihan ganda, dan kunci jawaban
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION IF ANY */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB SELECTOR */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('soal')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'soal'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Edit Butir Pertanyaan ({questions.length} Soal)</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Pengaturan Judul & Waktu Paket</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b132b]/40">
          {activeTab === 'info' ? (
            /* TAB 1: PENGATURAN INFORMASI & JUDUL PAKET */
            <div className="max-w-3xl mx-auto space-y-5 bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Identitas & Konfigurasi Paket Ujian</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Judul Paket Soal *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Penilaian Akhir Semester - Bahasa Indonesia"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Mata Pelajaran *</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Contoh: PAI, Matematika, IPA"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Guru Pengampu</span>
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="Nama guru pembuat soal"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tingkat Jenjang</span>
                    </label>
                    <input
                      type="text"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      placeholder="Contoh: SD / MI, SMP / MTs, Kelas 6"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Target Kelas / Rombel</span>
                    </label>
                    <input
                      type="text"
                      value={classRoom}
                      onChange={(e) => setClassRoom(e.target.value)}
                      placeholder="Contoh: 6 Abu Bakar, Semua Kelas"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Token Ujian CBT *</span>
                    </label>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                      placeholder="Contoh: CBT999"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-amber-500/40 rounded-xl font-mono font-black text-amber-300 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Durasi Total Ujian (Menit)</span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Min. Pengerjaan (Menit)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minWorkingMinutes}
                      onChange={(e) => setMinWorkingMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-amber-500/40 rounded-xl font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Waktu tunggu wajib sebelum klik Selesai.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: EDIT BUTIR SOAL & PILIHAN GANDA */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* SIDEBAR: DAFTAR NOMOR SOAL */}
              <div className="lg:col-span-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-300">Daftar Soal ({questions.length})</span>
                  <button
                    onClick={handleAddNewQuestion}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Soal</span>
                  </button>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === activeQIndex;
                    const correctOpt = q.options.find((o) => o.is_correct)?.option_letter || '?';
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveQIndex(idx)}
                        className={`p-2 rounded-xl text-center border font-bold text-xs transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                          isCurrent
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30 scale-105'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>#{idx + 1}</span>
                          {q.gambarUrl && (
                            <ImageIcon className={`w-3 h-3 ${isCurrent ? 'text-amber-300' : 'text-blue-400'}`} title="Memiliki lampiran gambar" />
                          )}
                        </div>
                        <span
                          className={`text-[9px] px-1 rounded-sm mt-0.5 ${
                            isCurrent
                              ? 'bg-indigo-900 text-indigo-200'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          Kunci: {correctOpt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MAIN EDITOR FOR ACTIVE QUESTION */}
              {currentQ ? (
                <div className="lg:col-span-8 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-500/30">
                        {activeQIndex + 1}
                      </span>
                      <h3 className="font-bold text-slate-100 text-sm">
                        Edit Pertanyaan Nomor {activeQIndex + 1}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleDeleteCurrentQuestion(activeQIndex)}
                      className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Hapus butir soal ini"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hapus Soal</span>
                    </button>
                  </div>

                  {/* 1. TEKS SOAL (QUESTION PROMPT) */}
                  <div className="space-y-1.5 text-xs">
                    <label className="block font-bold text-slate-200 flex items-center gap-1.5">
                      <FileEdit className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Isi Teks Soal / Pertanyaan *</span>
                    </label>
                    <textarea
                      rows={4}
                      value={currentQ.question_text}
                      onChange={(e) => handleQuestionTextChange(e.target.value)}
                      placeholder="Ketik teks soal atau pertanyaan lengkap di sini..."
                      className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed text-sm"
                    />

                    {/* Tombol Upload & Kelola Gambar Soal */}
                    <div className="pt-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl cursor-pointer transition-all shadow-xs">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                          <span>{currentQ.gambarUrl ? 'Ganti Gambar Soal' : 'Unggah Gambar Soal'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadGambarSoal(activeQIndex, e)}
                          />
                        </label>

                        {currentQ.gambarUrl && (
                          <button
                            type="button"
                            onClick={() => handleHapusGambarSoal(activeQIndex)}
                            className="px-3 py-1.5 text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Hapus Gambar</span>
                          </button>
                        )}

                        <span className="text-[11px] text-slate-400">
                          Mendukung grafik, peta, diagram, tabel, huruf Arab/Hijaiyyah (Maks. 2MB)
                        </span>
                      </div>

                      {/* Pratinjau Gambar Soal */}
                      {currentQ.gambarUrl && (
                        <div className="mt-3 p-2 bg-slate-950/80 rounded-xl border border-slate-800 inline-block max-w-md">
                          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1 text-blue-400">
                              <ImageIcon className="w-3 h-3" /> Pratinjau Gambar Lampiran:
                            </span>
                          </div>
                          <img
                            src={currentQ.gambarUrl}
                            alt="Lampiran Soal"
                            className="rounded-lg border border-slate-700/60 max-h-48 w-auto object-contain bg-slate-900 mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. PILIHAN GANDA (OPTIONS A, B, C, D, E) */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pilihan Ganda & Kunci Jawaban</span>
                      </label>
                      <span className="text-[11px] text-slate-400 italic">
                        Klik tombol &quot;Kunci Benar&quot; untuk memilih kunci jawaban
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {currentQ.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${
                            opt.is_correct
                              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                              : 'bg-slate-800/80 border-slate-700'
                          }`}
                        >
                          {/* Letter Badge & Set Correct Button */}
                          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                opt.is_correct
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {opt.option_letter}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleSetCorrectOption(optIdx)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                                opt.is_correct
                                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                                  : 'bg-slate-700/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-600'
                              }`}
                            >
                              {opt.is_correct ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Kunci Benar</span>
                                </>
                              ) : (
                                <span>Pilih Kunci</span>
                              )}
                            </button>
                          </div>

                          {/* Option Input Field */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={opt.option_text}
                              onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                              placeholder={`Teks pilihan ${opt.option_letter}...`}
                              className={`w-full px-3 py-2 rounded-lg font-semibold text-xs focus:outline-none focus:ring-2 ${
                                opt.is_correct
                                  ? 'bg-slate-900 text-emerald-200 border border-emerald-500/30 focus:ring-emerald-400'
                                  : 'bg-slate-900/90 text-slate-200 border border-slate-700 focus:ring-indigo-500'
                              }`}
                            />
                          </div>

                          {/* Delete Option (if more than 2) */}
                          {currentQ.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(optIdx)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                              title="Hapus opsi ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {currentQ.options.length < 6 && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Tambah Opsi Pilihan ({String.fromCharCode(65 + currentQ.options.length)})</span>
                      </button>
                    )}
                  </div>

                  {/* 3. PEMBAHASAN / PENJELASAN (EXPLANATION) */}
                  <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800">
                    <label className="block font-bold text-amber-300 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pembahasan & Penjelasan Kunci Jawaban</span>
                    </label>
                    <textarea
                      rows={2}
                      value={currentQ.explanation}
                      onChange={(e) => handleExplanationChange(e.target.value)}
                      placeholder="Tuliskan pembahasan atau alasan kenapa kunci jawaban tersebut benar..."
                      className="w-full p-3 bg-slate-800 border border-amber-500/30 rounded-xl font-normal text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                    />
                  </div>

                  {/* PAGINATION / NAVIGATION FOOTER */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <button
                      type="button"
                      disabled={activeQIndex <= 0}
                      onClick={() => setActiveQIndex((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-bold rounded-lg cursor-pointer"
                    >
                      ← Soal Sebelumnya
                    </button>
                    <span className="text-slate-400 font-bold">
                      {activeQIndex + 1} dari {questions.length} Soal
                    </span>
                    <button
                      type="button"
                      disabled={activeQIndex >= questions.length - 1}
                      onClick={() => setActiveQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-bold rounded-lg cursor-pointer"
                    >
                      Soal Berikutnya →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
                  Pilih nomor soal pada daftar sebelah kiri untuk mengedit.
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER ACTION BAR */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Total {questions.length} butir soal terdaftar pada paket ini.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
