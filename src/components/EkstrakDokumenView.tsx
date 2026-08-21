import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  BookOpen,
  ArrowRight,
  Database,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { QuestionBank, Question, QuestionOption, ActiveTab } from '../types';

interface EkstrakDokumenViewProps {
  onSaveBank: (bank: QuestionBank) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const EkstrakDokumenView: React.FC<EkstrakDokumenViewProps> = ({
  onSaveBank,
  setActiveTab,
}) => {
  const [formTitle, setFormTitle] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [teacherName, setTeacherName] = useState('Guru Pengampu');
  const [gradeLevel, setGradeLevel] = useState('Kelas 6');
  const [classRoom, setClassRoom] = useState('6');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [minWorkingMinutes, setMinWorkingMinutes] = useState(30);
  const [examToken, setExamToken] = useState(() =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Local parser logic for extracting questions from raw pasted text
  const parseDocumentText = (rawText: string): Question[] => {
    if (!rawText.trim()) return [];

    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const questions: Question[] = [];

    let currentQuestionText = '';
    let currentOptions: { letter: string; text: string }[] = [];
    let currentKey = '';
    let currentExplanation = '';
    let qNumber = 1;

    const commitQuestion = () => {
      if (currentQuestionText && currentOptions.length > 0) {
        const parsedOptions: QuestionOption[] = currentOptions.map((opt) => ({
          option_letter: opt.letter.toUpperCase(),
          option_text: opt.text,
          is_correct: opt.letter.toUpperCase() === currentKey.toUpperCase(),
        }));

        // If no key matched explicitly, default to option A or check if any is_correct
        const hasCorrect = parsedOptions.some((o) => o.is_correct);
        if (!hasCorrect && parsedOptions.length > 0) {
          parsedOptions[0].is_correct = true;
        }

        questions.push({
          id: `q-ext-${Date.now()}-${qNumber}`,
          question_number: qNumber,
          question_text: currentQuestionText,
          options: parsedOptions,
          explanation: currentExplanation || 'Pembahasan soal otomatis dari dokumen.',
        });

        qNumber++;
      }

      currentQuestionText = '';
      currentOptions = [];
      currentKey = '';
      currentExplanation = '';
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line matches Question start e.g. "1. Pertanyaan...", "Soal 1:", "1) ..."
      const qMatch = line.match(/^(?:Soal\s*)?(\d+)[\.\)]\s*(.+)/i);
      
      // Check if line matches Option e.g. "A. pilihan...", "A) pilihan...", "a. pilihan..."
      const optMatch = line.match(/^([A-Ea-e])[\.\)]\s*(.+)/);

      // Check if line matches Key e.g. "Kunci: C", "Jawaban: C", "Kunci Jawaban: C"
      const keyMatch = line.match(/^(?:Kunci|Jawaban|Kunci\s*Jawaban|Answer)\s*[:=]\s*([A-Ea-e])/i);

      // Check if line matches Explanation e.g. "Pembahasan: ..."
      const expMatch = line.match(/^(?:Pembahasan|Penjelasan|Bahasan)\s*[:=]\s*(.+)/i);

      if (keyMatch) {
        currentKey = keyMatch[1].toUpperCase();
      } else if (expMatch) {
        currentExplanation = expMatch[1];
      } else if (optMatch) {
        currentOptions.push({
          letter: optMatch[1].toUpperCase(),
          text: optMatch[2],
        });
      } else if (qMatch) {
        // If we already had a question pending, commit it
        if (currentQuestionText) {
          commitQuestion();
        }
        currentQuestionText = qMatch[2];
      } else {
        // If not option or key, append to question text or option text
        if (currentOptions.length > 0) {
          // Append to last option text
          currentOptions[currentOptions.length - 1].text += ' ' + line;
        } else if (currentQuestionText) {
          // Append to current question text
          currentQuestionText += ' ' + line;
        } else {
          // Start first question if line exists
          currentQuestionText = line;
        }
      }
    }

    // Commit final question
    if (currentQuestionText) {
      commitQuestion();
    }

    return questions;
  };

  const handleProcessText = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!formTitle.trim()) {
      setErrorMessage('Harap isi Nama Mata Pelajaran / Judul Form terlebih dahulu.');
      return;
    }

    if (!documentText.trim()) {
      setErrorMessage('Harap tempel (paste) isi dokumen soal di dalam kotak yang disediakan.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        const parsed = parseDocumentText(documentText);
        if (parsed.length === 0) {
          setErrorMessage(
            'Tidak dapat membaca struktur soal. Pastikan format soal menggunakan nomor (1.), pilihan (A-D/E), dan kata kunci (Kunci: X).'
          );
        } else {
          setExtractedQuestions(parsed);

          const tokenToUse = examToken.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();

          const newBank: QuestionBank = {
            id: `bank-ext-${Date.now()}`,
            title: formTitle.trim(),
            teacher_name: teacherName || 'Guru Pengampu',
            subject: formTitle.split('–')[0]?.split('-')[0]?.trim() || 'Umum',
            grade_level: gradeLevel,
            class_room: classRoom,
            total_questions: parsed.length,
            token: tokenToUse,
            questions: parsed,
            createdAt: new Date().toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            durationMinutes: Number(durationMinutes) || 60,
            minWorkingMinutes: Number(minWorkingMinutes) || 30,
          };

          // Automatically save into Bank Soal
          onSaveBank(newBank);

          setSuccessMessage(
            `🎉 Berhasil mengekstrak ${parsed.length} soal! Soal & Token (${tokenToUse}) telah otomatis disimpan dan masuk ke Bank Soal.`
          );

          // Automatically redirect to 'bank-soal' after 1 second so user sees the new questions
          setTimeout(() => {
            setActiveTab('bank-soal');
          }, 1200);
        }
      } catch (err: any) {
        setErrorMessage('Terjadi kesalahan saat memproses dokumen: ' + (err.message || err));
      } finally {
        setIsProcessing(false);
      }
    }, 600);
  };

  const handleSaveToBank = () => {
    if (extractedQuestions.length === 0) return;

    const newBank: QuestionBank = {
      id: `bank-ext-${Date.now()}`,
      title: formTitle.trim() || 'Paket Soal Ekstrak Dokumen',
      teacher_name: teacherName || 'Guru Pengampu',
      subject: formTitle.split('-')[0]?.trim() || 'Umum',
      grade_level: gradeLevel,
      class_room: classRoom,
      total_questions: extractedQuestions.length,
      token: examToken,
      questions: extractedQuestions,
      createdAt: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      durationMinutes: durationMinutes || 60,
      minWorkingMinutes: Number(minWorkingMinutes) || 30,
    };

    onSaveBank(newBank);
    setActiveTab('bank-soal');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* White Main Card Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl text-slate-900 space-y-6">

        {/* Input Form Fields */}
        <div className="space-y-6 text-xs sm:text-sm">
          {/* Field 1: Nama Mata Pelajaran / Judul Form */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 text-xs sm:text-sm">
              Nama Mata Pelajaran / Judul Form:
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Contoh: ASAS 2026 – PAI KELAS 6"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
            />
          </div>

          {/* Additional CBT Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Guru Pengampu</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Guru Pengampu"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Kelas / Rombel</label>
              <input
                type="text"
                value={classRoom}
                onChange={(e) => setClassRoom(e.target.value)}
                placeholder="6"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-extrabold text-indigo-900">Token Ujian (CBT)</label>
                <button
                  type="button"
                  onClick={() => setExamToken(Math.random().toString(36).substring(2, 8).toUpperCase())}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  title="Acak Token Baru"
                >
                  Acak Token
                </button>
              </div>
              <input
                type="text"
                value={examToken}
                onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                placeholder="TOKEN"
                className="w-full px-3 py-2 bg-indigo-50/80 border border-indigo-300 rounded-xl text-xs font-mono font-black text-indigo-900 tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Durasi Total (Mnt)</label>
              <input
                type="number"
                min="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-amber-800 mb-1">Min. Pengerjaan (Mnt)</label>
              <input
                type="number"
                min="0"
                value={minWorkingMinutes}
                onChange={(e) => setMinWorkingMinutes(Number(e.target.value))}
                placeholder="30"
                title="Waktu minimal pengerjaan sebelum siswa dapat mengklik selesai ujian"
                className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Field 2: Tempel (Paste) Isi Dokumen Soal di Sini */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 text-xs sm:text-sm">
              Tempel (Paste) Isi Dokumen Soal di Sini:
            </label>
            <textarea
              rows={9}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Buka file Word dokumen Anda, tekan Ctrl+A lalu Ctrl+C, dan tempelkan (Ctrl+V) isi seluruh teks soal ke sini..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs leading-relaxed"
            />
          </div>

          {/* Notice Callout Box */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 space-y-1.5 text-xs text-amber-900 shadow-xs">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <span className="text-sm">📌</span> Ketentuan Format Teks Dokumen:
            </div>
            <p className="text-amber-800 leading-relaxed pl-5">
              Pastikan struktur soal di dokumen Anda memuat baris pertanyaan, diikuti pilihan <strong>A.</strong> sampai <strong>D.</strong> (atau <strong>E.</strong>), dan ditutup baris kata kunci (Contoh: <strong>Kunci: C</strong> atau <strong>Jawaban: C</strong>). 
              <br />
              <span className="italic text-amber-700 text-[11px]">*Sistem akan membaca otomatis tiap ada kata kunci.</span>
            </p>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Process Button */}
          <div className="pt-2 flex flex-col items-center justify-center">
            <button
              onClick={handleProcessText}
              disabled={isProcessing}
              className="px-8 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-full font-black text-sm sm:text-base tracking-wide flex items-center gap-2.5 shadow-lg shadow-emerald-700/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>MEMPROSES TEKS DOKUMEN...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">🚀</span>
                  <span>PROSES & BUAT FORM</span>
                </>
              )}
            </button>
          </div>

          {/* Footer Text */}
          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400">
              By Nisyandi Al Faqih-26
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Questions Preview */}
      {extractedQuestions.length > 0 && (
        <div className="bg-[#0f172a] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {extractedQuestions.length} Soal Berhasil Diekstrak
              </span>
              <h3 className="text-base font-black text-slate-100 mt-1">
                Pratinjau Paket Soal Ekstrak Dokumen
              </h3>
            </div>

            <button
              onClick={handleSaveToBank}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Simpan ke Bank Soal Permanen</span>
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {extractedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400 block">Soal #{idx + 1}</span>
                  <span className="text-[11px] text-slate-400">
                    {q.options.length} Pilihan Jawaban
                  </span>
                </div>

                <p className="font-semibold text-slate-100 leading-relaxed">
                  {q.question_text}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                        opt.is_correct
                          ? 'bg-emerald-500/10 border-emerald-500/30 font-bold text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          opt.is_correct
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {opt.option_letter}
                      </span>
                      <span className="leading-snug">{opt.option_text}</span>
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200">
                    <span className="font-bold text-amber-400 block">Pembahasan:</span>
                    <p className="text-slate-300 mt-0.5">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
