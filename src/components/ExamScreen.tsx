import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Award,
  ArrowRight,
  RotateCcw,
  ListOrdered,
  X,
} from 'lucide-react';
import { QuestionBank, ExamResult } from '../types';
import { normalizeQuestion } from '../utils/normalizeQuestion';

interface ExamScreenProps {
  studentName: string;
  classRoom: string;
  bank: QuestionBank;
  onFinishExam: (result: ExamResult) => void;
  onExitExam: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  studentName,
  classRoom,
  bank,
  onFinishExam,
  onExitExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionIndex: number]: string }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [questionIndex: number]: boolean }>({});

  // Countdown Timer
  const totalSecondsAllocated = (bank.durationMinutes || 45) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSecondsAllocated);

  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [showMinDurationModal, setShowMinDurationModal] = useState(false);
  const [minDurationInfo, setMinDurationInfo] = useState<{
    minMinutes: number;
    spentMinutes: number;
    spentSeconds: number;
    waitMinutes: number;
    waitSeconds: number;
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [finalResult, setFinalResult] = useState<ExamResult | null>(null);

  // Auto-save exam progress to LocalStorage for offline reliability
  useEffect(() => {
    if (isExamCompleted) return;
    const examProgressKey = `cbt_exam_progress_${bank.id}_${studentName}`;
    const progressData = {
      userAnswers,
      flaggedQuestions,
      secondsRemaining,
      currentIndex,
    };
    try {
      localStorage.setItem(examProgressKey, JSON.stringify(progressData));
    } catch (e) {
      // Ignore quota errors
    }
  }, [userAnswers, flaggedQuestions, secondsRemaining, currentIndex, bank.id, studentName, isExamCompleted]);

  // Time spent tracking
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    if (isExamCompleted) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit when time expires if all answered, else alert
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamCompleted]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = bank.questions[currentIndex];
  const totalQuestions = bank.questions.length;

  const handleSelectOption = (optionLetter: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionLetter,
    }));
  };

  const toggleFlagCurrent = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  // Click Finish Exam Button
  const handleFinishClick = () => {
    // 1. Check minimum duration constraint
    const secondsSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const minWorkingMinutes = bank.minWorkingMinutes !== undefined ? bank.minWorkingMinutes : 30;
    const minWorkingSeconds = minWorkingMinutes * 60;

    if (minWorkingMinutes > 0 && secondsSpent < minWorkingSeconds && secondsRemaining > 0) {
      const waitRemainingSecs = minWorkingSeconds - secondsSpent;
      const spentMinutes = Math.floor(secondsSpent / 60);
      const spentSeconds = secondsSpent % 60;
      const waitMinutes = Math.floor(waitRemainingSecs / 60);
      const waitSeconds = waitRemainingSecs % 60;

      setMinDurationInfo({
        minMinutes: minWorkingMinutes,
        spentMinutes,
        spentSeconds,
        waitMinutes,
        waitSeconds,
      });
      setShowMinDurationModal(true);
      return;
    }

    // 2. Check if any unanswered question remains
    const answeredCount = Object.keys(userAnswers).filter(
      (k) => userAnswers[Number(k)] !== undefined && userAnswers[Number(k)] !== ''
    ).length;

    if (answeredCount < totalQuestions) {
      // Show Unanswered Warning Modal - CANNOT proceed!
      setShowUnansweredModal(true);
    } else {
      // All questions answered -> Show Success Modal!
      setShowSuccessModal(true);
    }
  };

  // User clicks OK on Success Modal -> Calculate score & save!
  const handleConfirmFinishOK = () => {
    setShowSuccessModal(false);

    let correctCount = 0;
    bank.questions.forEach((q, idx) => {
      const selected = userAnswers[idx];
      const correctOpt = q.options.find((o) => o.is_correct);
      if (correctOpt && selected === correctOpt.option_letter) {
        correctCount++;
      }
    });

    const wrongCount = totalQuestions - correctCount;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70;

    const secondsSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const minsSpent = Math.floor(secondsSpent / 60);
    const secsSpent = secondsSpent % 60;
    const durationSpentStr = `${minsSpent} menit ${secsSpent} detik`;

    const result: ExamResult = {
      id: 'res-' + Date.now(),
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      studentName,
      classRoom,
      subject: bank.subject,
      examTitle: bank.title,
      token: bank.token,
      score,
      totalQuestions,
      correctCount,
      wrongCount,
      durationSpent: durationSpentStr,
      passed,
      answers: userAnswers,
      bankId: bank.id,
    };

    setFinalResult(result);
    setIsExamCompleted(true);
    onFinishExam(result);
  };

  if (isExamCompleted && finalResult) {
    return (
      <div className="min-h-screen bg-[#020617] p-6 flex items-center justify-center">
        <div className="bg-[#0f172a] rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-800 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Hasil Ujian Berhasil Disimpan
            </span>
            <h2 className="text-2xl font-black text-slate-100">{finalResult.examTitle}</h2>
            <p className="text-xs text-slate-400">
              Siswa: <strong className="text-slate-200">{finalResult.studentName}</strong> ({finalResult.classRoom})
            </p>
          </div>

          {/* Score Card */}
          <div className="p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl flex items-center justify-around">
            <div className="text-center">
              <span className="text-xs font-bold text-slate-400 block uppercase">NILAI AKHIR</span>
              <span className="text-5xl font-black text-emerald-400">{finalResult.score}</span>
            </div>
            <div className="h-12 w-px bg-slate-800" />
            <div className="text-center space-y-1">
              <span className="text-xs text-slate-300 block">Benar: <strong className="text-emerald-400">{finalResult.correctCount}</strong> / {finalResult.totalQuestions}</span>
              <span className="text-xs text-slate-300 block">Salah: <strong className="text-rose-400">{finalResult.wrongCount}</strong></span>
              <span className="text-xs text-slate-300 block">Waktu: {finalResult.durationSpent}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onExitExam}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 flex flex-col z-50 overflow-hidden font-sans select-none">
      {/* FOCUS EXAM TOP HEADER */}
      <header className="h-16 bg-[#0f172a] text-white px-6 flex items-center justify-between shadow-md shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm">
            CBT
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-white">{bank.subject}</h1>
            <p className="text-[11px] text-slate-400">
              Peserta: <span className="text-slate-200 font-semibold">{studentName}</span> ({classRoom})
            </p>
          </div>
        </div>

        {/* Timer & Finish & Mobile Grid Toggle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowMobilePalette(true)}
            className="md:hidden px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1 cursor-pointer"
            title="Daftar Soal"
          >
            <ListOrdered className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-bold">{currentIndex + 1}/{totalQuestions}</span>
          </button>

          <div className="px-2.5 sm:px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
            <span className="font-mono font-bold text-xs sm:text-sm text-white tracking-wider">
              {formatTimer(secondsRemaining)}
            </span>
          </div>

          <button
            onClick={handleFinishClick}
            className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden xs:inline">Selesai Ujian</span>
          </button>
        </div>
      </header>

      {/* EXAM MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* QUESTION AREA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Question Number Badge */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="px-3 py-1 bg-indigo-600 text-white font-black text-xs rounded-lg shadow-sm">
              Soal Nomor {currentIndex + 1} / {totalQuestions}
            </span>

            {flaggedQuestions[currentIndex] && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 font-bold text-[11px] rounded-lg border border-amber-500/20 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Ragu-Ragu
              </span>
            )}
          </div>

          {/* Question Text */}
          {(() => {
            const normQ = normalizeQuestion(currentQuestion, currentIndex, bank.title || bank.subject);
            return (
              <>
                <div className="p-6 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm space-y-3">
                  <p className="text-base font-bold text-slate-100 leading-relaxed">
                    {normQ.questionText}
                  </p>
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  {normQ.optionsList.map((option) => {
                    const isSelected = userAnswers[currentIndex] === option.letter;
                    return (
                      <button
                        key={option.letter}
                        type="button"
                        onClick={() => handleSelectOption(option.letter)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10 text-indigo-200 font-bold'
                            : 'bg-[#0f172a] border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-200 font-medium'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {option.letter}
                        </span>
                        <span className="text-sm leading-relaxed pt-0.5">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* BOTTOM NAVIGATION BUTTONS */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-5 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>

            <button
              onClick={toggleFlagCurrent}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                flaggedQuestions[currentIndex]
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md font-extrabold'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Ragu - Ragu</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinishClick}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai Ujian</span>
              </button>
            )}
          </div>
        </div>

        {/* QUESTION NAVIGATOR PALETTE SIDEBAR */}
        <div className="w-72 bg-[#0f172a] border-l border-slate-800 p-5 hidden md:flex flex-col justify-between shrink-0">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">
              Navigasi Nomor Soal
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {bank.questions.map((q, idx) => {
                const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== '';
                const isFlagged = flaggedQuestions[idx];
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-slate-800/70 text-slate-300 border-slate-700/80';
                if (isCurrent) {
                  btnClass = 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400 font-black';
                } else if (isFlagged) {
                  btnClass = 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold';
                } else if (isAnswered) {
                  btnClass = 'bg-emerald-600 text-white border-emerald-500 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl border text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${btnClass}`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && !isCurrent && (
                      <span className="text-[9px] opacity-90">{userAnswers[idx]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Legend */}
          <div className="pt-4 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
              <span>Sudah Dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-amber-400 shrink-0" />
              <span>Ragu-Ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 shrink-0" />
              <span>Belum Dijawab</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE QUESTION GRID POPUP MODAL */}
      {showMobilePalette && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 md:hidden">
          <div className="bg-[#0f172a] rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-800 animate-slide-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-indigo-400" />
                <span>Navigasi Nomor Soal ({totalQuestions} Soal)</span>
              </h3>
              <button
                onClick={() => setShowMobilePalette(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {bank.questions.map((q, idx) => {
                  const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== '';
                  const isFlagged = flaggedQuestions[idx];
                  const isCurrent = idx === currentIndex;

                  let btnClass = 'bg-slate-800/70 text-slate-300 border-slate-700/80';
                  if (isCurrent) {
                    btnClass = 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400 font-black';
                  } else if (isFlagged) {
                    btnClass = 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold';
                  } else if (isAnswered) {
                    btnClass = 'bg-emerald-600 text-white border-emerald-500 font-bold';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowMobilePalette(false);
                      }}
                      className={`h-11 rounded-xl border text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${btnClass}`}
                    >
                      <span className="text-sm font-bold">{idx + 1}</span>
                      {isAnswered && !isCurrent && (
                        <span className="text-[9px] opacity-90">{userAnswers[idx]}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Legend */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-around text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-600 shrink-0" />
                <span>Dijawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-400 shrink-0" />
                <span>Ragu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-800 border border-slate-700 shrink-0" />
                <span>Belum</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MINIMUM DURATION WARNING MODAL */}
      {showMinDurationModal && minDurationInfo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-amber-500/30 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-[11px] rounded-full border border-amber-500/30">
                Aturan Waktu Minimal Pengerjaan
              </span>
              <h3 className="text-lg font-black text-slate-100">
                Belum Bisa Mengakhiri Ujian!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paket ujian ini memiliki ketentuan waktu minimal pengerjaan selama{' '}
                <strong className="text-amber-300 font-bold">{minDurationInfo.minMinutes} Menit</strong>.
              </p>
            </div>

            {/* Time Tracking Details */}
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Waktu Berjalan:</span>
                <span className="font-mono font-bold text-slate-200">
                  {minDurationInfo.spentMinutes} menit {minDurationInfo.spentSeconds} detik
                </span>
              </div>
              <div className="flex items-center justify-between text-amber-400 font-bold pt-1 border-t border-slate-800">
                <span>Sisa Waktu Tunggu:</span>
                <span className="font-mono">
                  {minDurationInfo.waitMinutes} menit {minDurationInfo.waitSeconds} detik lagi
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Silakan gunakan waktu yang tersisa untuk memeriksa kembali jawaban Anda dengan teliti.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setShowMinDurationModal(false)}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer tracking-wide"
              >
                Kembali Periksa Jawaban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNANSWERED WARNING MODAL (Requirement #8) */}
      {showUnansweredModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-500/20 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-100">Masih Ada Soal Belum Dijawab!</h3>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Masih ada soal yang belum dijawab.<br />
              <strong className="text-slate-100 font-bold">Silakan selesaikan seluruh soal terlebih dahulu sebelum mengakhiri ujian.</strong>
            </p>

            <div className="pt-2">
              <button
                onClick={() => setShowUnansweredModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
              >
                Lanjutkan Mengerjakan Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL (Requirement #8) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-emerald-500/20 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-100">Alhamdulillah.</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Anda telah menyelesaikan seluruh soal ujian.<br />
                <span className="text-emerald-400 font-bold">Semoga mendapatkan hasil yang terbaik.</span>
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConfirmFinishOK}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
