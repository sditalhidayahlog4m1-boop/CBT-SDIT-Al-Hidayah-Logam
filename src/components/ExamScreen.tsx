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
  LogOut,
  PenTool,
  Type,
  Lock,
  Unlock,
  Maximize2,
  ShieldAlert,
} from 'lucide-react';
import { QuestionBank, ExamResult } from '../types';
import { normalizeQuestion } from '../utils/normalizeQuestion';
import { useHistoryModal } from '../utils/navigationHistory';
import { AVAILABLE_FONTS, FontOption } from './EkstrakDokumenView';
import { formatToLocalDateTime } from '../utils/dateUtils';

interface ExamScreenProps {
  studentName: string;
  classRoom: string;
  bank: QuestionBank;
  studentId?: string;
  onFinishExam: (result: ExamResult) => void;
  onExitExam: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  studentName,
  classRoom,
  bank,
  studentId,
  onFinishExam,
  onExitExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionIndex: number]: string }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [questionIndex: number]: boolean }>({});

  // Countdown & Time tracking
  const totalSecondsAllocated = (bank.durationMinutes || 45) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSecondsAllocated);
  const [startTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Minimum duration constraints & lock condition
  const minWorkingMinutes = Math.min(
    bank.minWorkingMinutes !== undefined ? bank.minWorkingMinutes : 30,
    bank.durationMinutes || 45
  );
  const minWorkingSeconds = minWorkingMinutes * 60;
  const isMinTimePassed =
    minWorkingMinutes <= 0 || elapsedSeconds >= minWorkingSeconds || secondsRemaining <= 0;
  const waitRemainingSeconds = Math.max(0, minWorkingSeconds - elapsedSeconds);
  const waitMinutes = Math.floor(waitRemainingSeconds / 60);
  const waitSeconds = waitRemainingSeconds % 60;
  const spentMinutes = Math.floor(elapsedSeconds / 60);
  const spentSeconds = elapsedSeconds % 60;

  // Screen lock & anti-cheat states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenRequiredModal, setShowFullscreenRequiredModal] = useState(false);
  const [showScreenSwitchWarning, setShowScreenSwitchWarning] = useState(false);
  const [screenSwitchCount, setScreenSwitchCount] = useState(0);

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
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [finalResult, setFinalResult] = useState<ExamResult | null>(null);

  // Resolve bank font and typography
  const activeFont: FontOption =
    AVAILABLE_FONTS.find((f) => f.id === bank.fontFamily || f.family === bank.fontFamily) ||
    AVAILABLE_FONTS.find((f) => f.id === 'jakarta-sans') ||
    AVAILABLE_FONTS[4];
  const appliedFontSize = bank.fontSize || '16px';

  // Helper to enter fullscreen
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setShowFullscreenRequiredModal(false);
      }
    } catch (e) {
      console.warn('Fullscreen request rejected or not permitted:', e);
    }
  };

  // 1. Enforce Fullscreen Mode while exam is active & locked
  useEffect(() => {
    enterFullscreen();

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && !isExamCompleted && !isMinTimePassed) {
        setShowFullscreenRequiredModal(true);
      } else if (active) {
        setShowFullscreenRequiredModal(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isExamCompleted, isMinTimePassed]);

  // 2. Detect Tab / Window / Application Switch while locked
  useEffect(() => {
    if (isExamCompleted) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isExamCompleted && !isMinTimePassed) {
        setScreenSwitchCount((prev) => prev + 1);
        setShowScreenSwitchWarning(true);
      }
    };

    const handleWindowBlur = () => {
      if (!isExamCompleted && !isMinTimePassed) {
        setScreenSwitchCount((prev) => prev + 1);
        setShowScreenSwitchWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isExamCompleted, isMinTimePassed]);

  // 3. Prevent page reload / close
  useEffect(() => {
    if (isExamCompleted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isExamCompleted) {
        e.preventDefault();
        e.returnValue = 'Sesi ujian sedang berlangsung dan layar dikunci!';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExamCompleted]);

  // 4. Intercept shortcut keys that could navigate away or reload
  useEffect(() => {
    if (isExamCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) ||
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
      ) {
        e.preventDefault();
        if (!isMinTimePassed) {
          setMinDurationInfo({
            minMinutes: minWorkingMinutes,
            spentMinutes,
            spentSeconds,
            waitMinutes,
            waitSeconds,
          });
          setShowMinDurationModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExamCompleted, isMinTimePassed, minWorkingMinutes, spentMinutes, spentSeconds, waitMinutes, waitSeconds]);

  // Synchronize Mobile Palette drawer with browser history
  useHistoryModal({
    modalId: 'exam-mobile-palette-modal',
    isOpen: showMobilePalette,
    onClose: () => setShowMobilePalette(false),
    tab: 'mulai-ujian',
  });

  // Synchronize Minimum Duration Warning modal with browser history
  useHistoryModal({
    modalId: 'exam-min-duration-modal',
    isOpen: showMinDurationModal,
    onClose: () => setShowMinDurationModal(false),
    tab: 'mulai-ujian',
  });

  // Synchronize Unanswered Warning modal with browser history
  useHistoryModal({
    modalId: 'exam-unanswered-modal',
    isOpen: showUnansweredModal,
    onClose: () => setShowUnansweredModal(false),
    tab: 'mulai-ujian',
  });

  // Synchronize Success Finish modal with browser history
  useHistoryModal({
    modalId: 'exam-success-modal',
    isOpen: showSuccessModal,
    onClose: () => setShowSuccessModal(false),
    tab: 'mulai-ujian',
  });

  // Synchronize Exit Confirmation modal with browser history
  useHistoryModal({
    modalId: 'exam-exit-confirm-modal',
    isOpen: showExitConfirmModal,
    onClose: () => setShowExitConfirmModal(false),
    tab: 'mulai-ujian',
  });

  // 5. Intercept back button while exam is actively in progress
  useEffect(() => {
    if (isExamCompleted) return;

    window.history.pushState({ tab: 'mulai-ujian', exam: true }, '');

    const handleExamPopState = (e: PopStateEvent) => {
      // Re-push exam state to lock back navigation
      window.history.pushState({ tab: 'mulai-ujian', exam: true }, '');

      if (!isMinTimePassed) {
        setMinDurationInfo({
          minMinutes: minWorkingMinutes,
          spentMinutes: Math.floor(elapsedSeconds / 60),
          spentSeconds: elapsedSeconds % 60,
          waitMinutes: Math.floor(waitRemainingSeconds / 60),
          waitSeconds: waitRemainingSeconds % 60,
        });
        setShowMinDurationModal(true);
      } else {
        setShowExitConfirmModal(true);
      }
    };

    window.addEventListener('popstate', handleExamPopState);
    return () => window.removeEventListener('popstate', handleExamPopState);
  }, [isExamCompleted, isMinTimePassed, minWorkingMinutes, elapsedSeconds, waitRemainingSeconds]);

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

  // Live timer interval (both elapsed and remaining) synchronized with real wall clock
  useEffect(() => {
    if (isExamCompleted) return;

    const tick = () => {
      const now = Date.now();
      const currentElapsed = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(currentElapsed);
      const remaining = Math.max(0, totalSecondsAllocated - currentElapsed);
      setSecondsRemaining(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [isExamCompleted, startTime, totalSecondsAllocated]);

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

  const handleAnswerEssay = (text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: text,
    }));
  };

  const toggleFlagCurrent = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  // Click Exit Exam Button
  const handleExitClick = () => {
    if (!isMinTimePassed) {
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
    setShowExitConfirmModal(true);
  };

  // Click Finish Exam Button
  const handleFinishClick = () => {
    // 1. Check minimum duration constraint
    if (!isMinTimePassed) {
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
      (k) => userAnswers[Number(k)] !== undefined && userAnswers[Number(k)].trim() !== ''
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
    let totalScoreObtained = 0;
    let totalScorePossible = 0;

    bank.questions.forEach((q, idx) => {
      const norm = normalizeQuestion(q, idx, bank.title || bank.subject);
      const isEssay = norm.type === 'esai';
      const userAns = userAnswers[idx] || '';

      if (isEssay) {
        const weight = norm.scoreWeight || 10;
        totalScorePossible += weight;
        if (userAns.trim().length >= 3) {
          correctCount++;
          totalScoreObtained += weight;
        }
      } else {
        totalScorePossible += 10;
        const correctOpt = norm.optionsList.find((o) => o.isCorrect);
        if (correctOpt && userAns.trim() === correctOpt.letter) {
          correctCount++;
          totalScoreObtained += 10;
        }
      }
    });

    const wrongCount = totalQuestions - correctCount;
    const score = totalScorePossible > 0 ? Math.round((totalScoreObtained / totalScorePossible) * 100) : 0;
    const passed = score >= 70;

    const secondsSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const minsSpent = Math.floor(secondsSpent / 60);
    const secsSpent = secondsSpent % 60;
    const durationSpentStr = `${minsSpent} menit ${secsSpent} detik`;

    const nowEpoch = Date.now();
    const result: ExamResult = {
      id: 'res-' + nowEpoch,
      date: formatToLocalDateTime(nowEpoch),
      timestamp: nowEpoch,
      completedAt: new Date(nowEpoch).toISOString(),
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
      studentId: studentId,
      userId: studentId,
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
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowMobilePalette(true)}
            className="md:hidden px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1 cursor-pointer"
            title="Daftar Soal"
          >
            <ListOrdered className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-bold">{currentIndex + 1}/{totalQuestions}</span>
          </button>

          {/* Screen Lock Status Indicator */}
          {!isMinTimePassed ? (
            <div
              className="px-2.5 sm:px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-1.5 cursor-pointer text-amber-300 hover:bg-amber-500/20 transition"
              title={`Layar Terkunci. Sisa waktu pengerjaan minimal: ${waitMinutes}m ${waitSeconds}s`}
              onClick={() => {
                setMinDurationInfo({
                  minMinutes: minWorkingMinutes,
                  spentMinutes,
                  spentSeconds,
                  waitMinutes,
                  waitSeconds,
                });
                setShowMinDurationModal(true);
              }}
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] uppercase font-black tracking-wider text-amber-400">Terkunci</span>
                <span className="font-mono text-[11px] font-bold text-amber-200">
                  {waitMinutes.toString().padStart(2, '0')}:{waitSeconds.toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hidden xs:flex items-center gap-1.5 text-emerald-300"
              title="Waktu minimal pengerjaan telah terpenuhi. Anda boleh keluar atau menyelesaikan ujian."
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Boleh Keluar</span>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={enterFullscreen}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isFullscreen
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
            }`}
            title={isFullscreen ? 'Layar Penuh Aktif' : 'Aktifkan Layar Penuh'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Countdown Timer */}
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

          <button
            onClick={handleExitClick}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              !isMinTimePassed
                ? 'bg-slate-900 hover:bg-amber-500/10 text-amber-400/80 hover:text-amber-300 border-slate-800 hover:border-amber-500/30'
                : 'bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30'
            }`}
            title={!isMinTimePassed ? `Layar Terkunci (${waitMinutes}m ${waitSeconds}s tersisa)` : 'Keluar Sesi Ujian'}
          >
            {!isMinTimePassed ? <Lock className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* EXAM MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* QUESTION AREA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Question Number Badge */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-indigo-600 text-white font-black text-xs rounded-lg shadow-sm">
                Soal Nomor {currentIndex + 1} / {totalQuestions}
              </span>
              {(() => {
                const norm = normalizeQuestion(currentQuestion, currentIndex, bank.title || bank.subject);
                const isEssay = norm.type === 'esai';
                return isEssay ? (
                  <span className="px-2.5 py-1 bg-amber-500/15 text-amber-300 font-bold text-[11px] rounded-lg border border-amber-500/30 flex items-center gap-1">
                    <PenTool className="w-3 h-3 text-amber-400" />
                    Soal Esai (Uraian) • Bobot: {norm.scoreWeight || 10} Poin
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 font-medium text-[11px] rounded-lg border border-blue-500/20">
                    Pilihan Ganda
                  </span>
                );
              })()}
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700/60">
                <Type className="w-3 h-3 text-indigo-400" />
                {activeFont.name.split('(')[0].trim()} ({appliedFontSize})
              </span>
            </div>

            {flaggedQuestions[currentIndex] && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 font-bold text-[11px] rounded-lg border border-amber-500/20 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Ragu-Ragu
              </span>
            )}
          </div>

          {/* Question Text & Content */}
          {(() => {
            const normQ = normalizeQuestion(currentQuestion, currentIndex, bank.title || bank.subject);
            const isEssay = normQ.type === 'esai';
            const isArabicQuestion =
              activeFont.isArabic || /[\u0600-\u06FF]/.test(normQ.questionText);
            const lineSpacing = isArabicQuestion ? '2.3' : '1.7';

            return (
              <>
                <div className="p-6 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm space-y-4">
                  <p
                    className="font-bold text-slate-100 leading-relaxed whitespace-pre-line"
                    dir="auto"
                    style={{
                      fontFamily: activeFont.family,
                      fontSize: appliedFontSize,
                      unicodeBidi: 'plaintext',
                      direction: isArabicQuestion && !normQ.questionText.trim().match(/^[0-9A-Za-z]/) ? 'rtl' : 'ltr',
                      lineHeight: lineSpacing,
                    }}
                  >
                    {normQ.questionText}
                  </p>

                  {/* Teks Arab Tambahan Jika Ada */}
                  {normQ.arabicText && (
                    <div
                      className="p-4 bg-slate-900/90 rounded-xl border border-amber-500/20 text-amber-100 text-right leading-loose shadow-inner"
                      style={{
                        fontFamily: activeFont.isArabic ? activeFont.family : "'Amiri Quran', 'Amiri', serif",
                        fontSize: '20px',
                        direction: 'rtl',
                      }}
                    >
                      {normQ.arabicText}
                    </div>
                  )}

                  {/* Terjemahan Jika Ada */}
                  {normQ.translationText && (
                    <p className="text-xs text-slate-400 italic">
                      Artinya: "{normQ.translationText}"
                    </p>
                  )}

                  {/* Gambar Lampiran Soal */}
                  {normQ.gambarUrl && (
                    <div className="flex justify-center p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                      <img
                        src={normQ.gambarUrl}
                        alt={`Gambar Soal Nomor ${currentIndex + 1}`}
                        className="max-h-72 sm:max-h-80 w-auto rounded-lg border border-slate-700/60 shadow-md object-contain bg-slate-900"
                      />
                    </div>
                  )}
                </div>

                {/* Question Interactive Area: Essay Textarea OR Multiple Choice Buttons */}
                {isEssay ? (
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-amber-400" />
                        Tuliskan Lembar Jawaban Uraian / Esai Anda:
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {(userAnswers[currentIndex] || '').length} karakter
                      </span>
                    </label>

                    <textarea
                      value={userAnswers[currentIndex] || ''}
                      onChange={(e) => handleAnswerEssay(e.target.value)}
                      placeholder={
                        isArabicQuestion
                          ? 'اكتب إجابتك بالتفصيل هنا...'
                          : 'Ketik jawaban lengkap / uraian esai Anda di sini...'
                      }
                      rows={6}
                      style={{
                        fontFamily: activeFont.family,
                        fontSize: appliedFontSize,
                        direction:
                          isArabicQuestion || /[\u0600-\u06FF]/.test(userAnswers[currentIndex] || '')
                            ? 'rtl'
                            : 'ltr',
                        lineHeight: isArabicQuestion ? '2.2' : '1.7',
                      }}
                      className="w-full p-4 bg-[#0f172a] border border-amber-500/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-2xl text-slate-100 placeholder-slate-500 font-medium transition-all shadow-inner outline-none"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Jawaban tersimpan otomatis di sesi ini</span>
                      {userAnswers[currentIndex]?.trim() ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Jawaban Tersimpan
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Belum dijawab</span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Options List */
                  <div className="space-y-3">
                    {normQ.optionsList.map((option) => {
                      const isSelected = userAnswers[currentIndex] === option.letter;
                      const isOptArabic =
                        activeFont.isArabic || /[\u0600-\u06FF]/.test(option.text);
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
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {option.letter}
                          </span>
                          <span
                            className="text-sm leading-relaxed pt-0.5"
                            style={{
                              fontFamily: activeFont.family,
                              direction: isOptArabic ? 'rtl' : 'ltr',
                            }}
                          >
                            {option.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
                const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx].trim() !== '';
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
                      <span className="text-[9px] font-bold opacity-90">
                        {userAnswers[idx].length <= 2 ? userAnswers[idx] : '✓'}
                      </span>
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
                  const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx].trim() !== '';
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
                        <span className="text-[9px] font-bold opacity-90">
                          {userAnswers[idx].length <= 2 ? userAnswers[idx] : '✓'}
                        </span>
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

      {/* FULLSCREEN REQUIRED LOCK MODAL */}
      {showFullscreenRequiredModal && !isExamCompleted && !isMinTimePassed && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-rose-500/40 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Maximize2 className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-300 font-bold text-[11px] rounded-full border border-rose-500/30">
                Layar Penuh Diwajibkan
              </span>
              <h3 className="text-lg font-black text-slate-100">
                Layar Ujian Terkunci
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Selama sesi ujian berlangsung, Anda wajib berada dalam mode layar penuh. Layar tidak dapat diperkecil atau ditutup sebelum batas waktu minimal pengerjaan ({minWorkingMinutes} menit) terpenuhi.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Sisa Kunci Layar:</span>
              <span className="text-rose-400 font-mono font-bold">{waitMinutes} menit {waitSeconds} detik</span>
            </div>

            <div className="pt-2">
              <button
                onClick={enterFullscreen}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer tracking-wide flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Masuk Kembali ke Layar Penuh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN / TAB SWITCH WARNING MODAL */}
      {showScreenSwitchWarning && !isExamCompleted && !isMinTimePassed && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-amber-500/40 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-[11px] rounded-full border border-amber-500/30">
                Peringatan Perpindahan Layar
              </span>
              <h3 className="text-lg font-black text-slate-100">
                Dilarang Berpindah Layar / Tab!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sistem mendeteksi Anda mencoba beralih tab, jendela browser, atau aplikasi lain
                {screenSwitchCount > 0 ? ` (${screenSwitchCount} kali terdeteksi)` : ''}.
                Layar ujian dikunci dan Anda tidak diizinkan meninggalkan ruang ujian digital sebelum batas waktu minimal tercapai.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Sisa Kunci Layar:</span>
              <span className="text-amber-400 font-mono font-bold">{waitMinutes} menit {waitSeconds} detik</span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowScreenSwitchWarning(false);
                  enterFullscreen();
                }}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer tracking-wide flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Saya Mengerti, Kembali Fokus Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINIMUM DURATION WARNING MODAL */}
      {showMinDurationModal && minDurationInfo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-amber-500/30 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-[11px] rounded-full border border-amber-500/30">
                Aturan Layar Terkunci & Waktu Minimal
              </span>
              <h3 className="text-lg font-black text-slate-100">
                Belum Boleh Keluar dari Ujian!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paket ujian ini memiliki ketentuan waktu minimal pengerjaan selama{' '}
                <strong className="text-amber-300 font-bold">{minDurationInfo.minMinutes} Menit</strong>. Layar dikunci dan Anda tidak dapat keluar atau berpindah layar sebelum waktu tersebut terpenuhi.
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
                <span>Sisa Waktu Kunci Layar:</span>
                <span className="font-mono">
                  {minDurationInfo.waitMinutes} menit {minDurationInfo.waitSeconds} detik lagi
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Tombol keluar dan selesai ujian akan aktif secara otomatis setelah batas waktu minimal terlewati.
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowMinDurationModal(false);
                  enterFullscreen();
                }}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer tracking-wide flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kembali Fokus Mengerjakan Soal</span>
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

      {/* EXIT EXAM CONFIRMATION MODAL */}
      {showExitConfirmModal && isMinTimePassed && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0f172a] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-rose-500/30 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-[11px] rounded-full border border-emerald-500/30">
                Waktu Minimal ({minWorkingMinutes} Menit) Telah Terlewati
              </span>
              <h3 className="text-lg font-black text-slate-100">
                Keluar dari Sesi Ujian?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Jawaban Anda telah tersimpan secara otomatis di memori perangkat. Apakah Anda yakin ingin keluar dari sesi ujian sekarang?
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
              >
                Lanjutkan Ujian
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  onExitExam();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
