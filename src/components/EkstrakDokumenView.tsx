import React, { useState, useMemo } from 'react';
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
  ListFilter,
  PenTool,
  Type,
  AlignRight,
  AlignLeft,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { QuestionBank, Question, QuestionOption, ActiveTab, Subject, Teacher } from '../types';
import { getStoredSubjects } from '../utils/storage';
import { parseDocumentQuestions, convertParsedToQuestions } from '../utils/documentQuestionParser';

export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: 'Arab' | 'Latin';
  sampleText: string;
  isArabic: boolean;
}

export const AVAILABLE_FONTS: FontOption[] = [
  // FONT BAHASA ARAB & AL-QUR'AN
  {
    id: 'amiri-quran',
    name: 'Amiri Quran (Mushaf & Tasykil Rapi)',
    family: "'Amiri Quran', serif",
    category: 'Arab',
    sampleText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    isArabic: true,
  },
  {
    id: 'amiri',
    name: 'Amiri (Naskh Standar Arab Klasik)',
    family: "'Amiri', serif",
    category: 'Arab',
    sampleText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    isArabic: true,
  },
  {
    id: 'scheherazade',
    name: 'Scheherazade New (Naskh Tradisional)',
    family: "'Scheherazade New', serif",
    category: 'Arab',
    sampleText: 'مَالِكِ يَوْمِ الدِّينِ',
    isArabic: true,
  },
  {
    id: 'noto-arabic',
    name: 'Noto Naskh Arabic (Jelas & Proporsional)',
    family: "'Noto Naskh Arabic', serif",
    category: 'Arab',
    sampleText: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    isArabic: true,
  },
  // FONT LATIN / STANDAR
  {
    id: 'jakarta-sans',
    name: 'Plus Jakarta Sans (Modern & Bersih)',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
    category: 'Latin',
    sampleText: 'Ujian Berbasis Komputer & Asesmen Sekolah',
    isArabic: false,
  },
  {
    id: 'times',
    name: 'Times New Roman (Klasik Naskah Ujian)',
    family: "'Times New Roman', Times, serif",
    category: 'Latin',
    sampleText: 'Petunjuk Soal dan Naskah Formal',
    isArabic: false,
  },
  {
    id: 'system-sans',
    name: 'Arial / System Sans (Standar Jelas)',
    family: 'Arial, -apple-system, sans-serif',
    category: 'Latin',
    sampleText: 'Karakter huruf standar mudah dibaca',
    isArabic: false,
  },
  {
    id: 'courier',
    name: 'Courier Monospace (Naskah Dokumen)',
    family: "'Courier New', Courier, monospace",
    category: 'Latin',
    sampleText: 'Format naskah teks monospace',
    isArabic: false,
  },
];

export const FONT_SIZES = [
  { id: '14px', label: '14px (Standar)' },
  { id: '16px', label: '16px (Sedang - Nyaman)' },
  { id: '18px', label: '18px (Besar - Ideal Arab & Tasykil)' },
  { id: '22px', label: '22px (Ekstra Besar - Sangat Jelas)' },
];

interface EkstrakDokumenViewProps {
  onSaveBank: (bank: QuestionBank) => void;
  setActiveTab: (tab: ActiveTab) => void;
  subjects?: Subject[];
  teachers?: Teacher[];
  students?: any[];
  banks?: QuestionBank[];
}

export const EkstrakDokumenView: React.FC<EkstrakDokumenViewProps> = ({
  onSaveBank,
  setActiveTab,
  subjects,
  teachers,
}) => {
  // Synchronize master subjects from Menu Mata Pelajaran
  const subjectList = useMemo(() => {
    if (subjects && subjects.length > 0) return subjects;
    return getStoredSubjects();
  }, [subjects]);

  const [formTitle, setFormTitle] = useState('');
  const [subject, setSubject] = useState(() => subjectList[0]?.name || '');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [documentText, setDocumentText] = useState('');
  const [teacherName, setTeacherName] = useState(() => teachers?.[0]?.name || 'Guru Pengampu');
  const [gradeLevel, setGradeLevel] = useState('Kelas 6');
  const [classRoom, setClassRoom] = useState('6');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [minWorkingMinutes, setMinWorkingMinutes] = useState(30);
  const [examToken, setExamToken] = useState(() =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  // Typography & Font states
  const [selectedFontId, setSelectedFontId] = useState<string>('amiri-quran');
  const [selectedFontSize, setSelectedFontSize] = useState<string>('18px');
  const [textDirection, setTextDirection] = useState<'auto' | 'ltr' | 'rtl'>('auto');

  const activeFont = useMemo(() => {
    return AVAILABLE_FONTS.find((f) => f.id === selectedFontId) || AVAILABLE_FONTS[0];
  }, [selectedFontId]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Parser logic that handles BOTH Multiple Choice (PG) AND Essay (Esai) questions
  // Supports "soal berundak" (stepped questions with Quranic verses / stimuli), preserving line breaks
  // Strictly defaults to Pilihan Ganda (PG) unless an explicit essay tag / section is present!
  const parseDocumentText = (rawText: string): Question[] => {
    const parsed = parseDocumentQuestions(rawText);
    return convertParsedToQuestions(parsed);
  };

  // Quick Template Helpers
  const insertTemplatePG = () => {
    const sample = `1. Berapakah jumlah ayat dalam Surah Al-Ikhlas?
A. 3 Ayat
B. 4 Ayat
C. 5 Ayat
D. 6 Ayat
Kunci: B
Pembahasan: Surah Al-Ikhlas terdiri dari 4 ayat.

2. Surah Al-Fatihah sering disebut sebagai...
A. Ummul Qur'an
B. Ayat Kursi
C. Al-Baqarah
D. As-Sab'ul Matsani
Kunci: A
Pembahasan: Surah Al-Fatihah disebut Ummul Qur'an atau Induk Al-Qur'an.`;
    setDocumentText(sample);
  };

  const insertTemplateEsai = () => {
    const sample = `1. [Esai] Tuliskan lafadz basmalah dalam tulisan bahasa Arab yang berharakat lengkap!
Kunci: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
Bobot: 10
Pembahasan: Menuliskan huruf hijaiyah dengan harakat yang benar dan rapi.

2. [Esai] Jelaskan makna yang terkandung dalam Surah An-Nasr!
Kunci: Mengabarkan datangnya pertolongan Allah SWT dan kemenangan umat Islam, serta perintah bertasbih dan memohon ampunan kepada Allah.
Bobot: 15
Pembahasan: Kandungan ayat tentang pertolongan Allah dan Fathu Makkah.

3. [Esai] Sebutkan 5 rukun Islam secara urut dan benar!
Kunci: 1. Syahadat, 2. Shalat lima waktu, 3. Zakat, 4. Puasa di bulan Ramadhan, 5. Haji bagi yang mampu.
Bobot: 15
Pembahasan: Rukun Islam sebagai fondasi utama seorang Muslim.`;
    setDocumentText(sample);
  };

  const insertTemplateCampuran = () => {
    const sample = `A. PILIHAN GANDA
1. Tempat diturunkannya Surah Al-Fiil adalah di kota...
A. Madinah
B. Makkah
C. Mesir
D. Syam
Kunci: B
Pembahasan: Surah Al-Fiil tergolong surah Makkiyah karena diturunkan di Makkah.

2. Pasukan bergajah yang hendak menghancurkan Ka'bah dipimpin oleh...
A. Abu Lahab
B. Abu Jahal
C. Abrahah
D. Fir'aun
Kunci: C
Pembahasan: Pasukan bergajah dipimpin oleh raja Abrahah dari Yaman.

B. SOAL ESAI / URAIAN
3. [Esai] Tuliskan ayat pertama Surah Al-Ikhlas beserta artinya!
Kunci: قُلْ هُوَ اللَّهُ أَحَدٌ - Katakanlah (Muhammad): "Dialah Allah, Yang Maha Esa".
Bobot: 10
Pembahasan: Hafalan ayat dan terjemahan tauhid.

4. [Esai] Mengapa burung yang dikirim oleh Allah dinamakan Burung Ababil? Jelaskan!
Kunci: Ababil artinya berbondong-bondong atau berkelompok dalam jumlah banyak membawa batu kerikil panas dari tanah yang terbakar.
Bobot: 15
Pembahasan: Kisah kehancuran tentara gajah dalam Surah Al-Fiil.`;
    setDocumentText(sample);
  };

  const insertArabSymbol = (symbol: string) => {
    setDocumentText((prev) => (prev ? prev + ' ' + symbol : symbol));
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
            'Tidak dapat membaca struktur soal. Pastikan format soal menggunakan nomor (1.), dan memiliki pilihan (A-D) atau baris kunci/pertanyaan untuk soal esai.'
          );
        } else {
          setExtractedQuestions(parsed);

          const tokenToUse = examToken.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
          const cleanSubject = isCustomSubject ? subject : (subject || formTitle.split('-')[0]?.trim() || 'Umum');

          const newBank: QuestionBank = {
            id: `bank-ext-${Date.now()}`,
            title: formTitle.trim(),
            teacher_name: teacherName || 'Guru Pengampu',
            subject: cleanSubject,
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
            fontFamily: activeFont.id,
            fontSize: selectedFontSize,
          };

          // Automatically save into Bank Soal
          onSaveBank(newBank);

          const pgNum = parsed.filter((q) => q.type !== 'esai').length;
          const essayNum = parsed.filter((q) => q.type === 'esai').length;

          setSuccessMessage(
            `🎉 Berhasil mengekstrak ${parsed.length} butir soal (${pgNum} Pilihan Ganda, ${essayNum} Esai)! Paket soal dengan Token (${tokenToUse}) telah tersimpan ke Bank Soal.`
          );
        }
      } catch (err: any) {
        setErrorMessage('Terjadi kesalahan saat memproses dokumen: ' + (err.message || err));
      } finally {
        setIsProcessing(false);
      }
    }, 400);
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
      fontFamily: activeFont.id,
      fontSize: selectedFontSize,
    };

    onSaveBank(newBank);
    setActiveTab('bank-soal');
  };

  // Toggle question type between Pilihan Ganda & Esai directly in preview
  const handleToggleQuestionType = (qIndex: number) => {
    setExtractedQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        if (q.type === 'esai') {
          // Switch to PG
          return {
            ...q,
            type: 'pilihan_ganda',
            options: [
              { option_letter: 'A', option_text: q.essayAnswerKey || 'Pilihan A', is_correct: true },
              { option_letter: 'B', option_text: 'Pilihan B', is_correct: false },
              { option_letter: 'C', option_text: 'Pilihan C', is_correct: false },
              { option_letter: 'D', option_text: 'Pilihan D', is_correct: false },
            ],
          };
        } else {
          // Switch to Esai
          const correct = q.options.find((o) => o.is_correct);
          return {
            ...q,
            type: 'esai',
            options: [],
            essayAnswerKey: correct ? `${correct.option_letter}. ${correct.option_text}` : 'Kunci jawaban esai.',
            scoreWeight: q.scoreWeight || 10,
          };
        }
      })
    );
  };

  const pgCount = extractedQuestions.filter((q) => q.type !== 'esai').length;
  const essayCount = extractedQuestions.filter((q) => q.type === 'esai').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* White Main Card Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl text-slate-900 space-y-6">
        {/* Header Title */}
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Ekstrak Dokumen Soal
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mendukung soal <strong>Pilihan Ganda</strong> &amp; <strong>Soal Esai (Uraian)</strong> serta tipografi <strong>Huruf Latin &amp; Bahasa Arab (Al-Qur'an)</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Input Form Fields */}
        <div className="space-y-6 text-xs sm:text-sm">
          {/* Field 1: Mata Pelajaran (Sync dengan Menu Mapel) & Judul Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mata Pelajaran Dropdown / Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Mata Pelajaran (Tersinkronisasi):</span>
                </label>
                <div className="flex items-center gap-2">
                  {subjectList.length > 0 && !isCustomSubject && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {subjectList.length} Mapel Tersedia
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(!isCustomSubject)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomSubject ? (
                      <>
                        <ListFilter className="w-3 h-3" /> Pilih dari List
                      </>
                    ) : (
                      <>
                        <PenTool className="w-3 h-3" /> Ketik Manual
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isCustomSubject ? (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ketik mata pelajaran kustom..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-emerald-400 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm"
                />
              ) : (
                <select
                  value={subjectList.some((s) => s.name.toLowerCase() === subject.toLowerCase()) ? subject : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__MANUAL__') {
                      setIsCustomSubject(true);
                    } else if (val) {
                      setSubject(val);
                      if (!formTitle || formTitle.trim() === '') {
                        setFormTitle(`${val} - Kelas ${classRoom}`);
                      }
                      const found = subjectList.find((s) => s.name === val);
                      if (found && found.gradeLevel) {
                        setGradeLevel(found.gradeLevel);
                      }
                      // Auto-switch to Arabic font if subject is Tahfidz / Qur'an / Arab / PAI
                      if (/qur|tahfidz|arab|al-qur|fiqih|pai/i.test(val)) {
                        setSelectedFontId('amiri-quran');
                        setSelectedFontSize('18px');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm cursor-pointer"
                >
                  <option value="">-- Pilih Mata Pelajaran (Menu Mapel) --</option>
                  {subjectList.map((s) => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name} {s.code ? `[${s.code}]` : ''} {s.gradeLevel ? `(${s.gradeLevel})` : ''}
                    </option>
                  ))}
                  <option value="__MANUAL__">✏️ Ketik Mapel Manual...</option>
                </select>
              )}
            </div>

            {/* Judul Form / Paket Soal */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800 text-xs sm:text-sm">
                Judul Paket Ujian / Form:
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={subject ? `Contoh: ASAS 2026 – ${subject} Kelas ${classRoom}` : 'Contoh: ASAS 2026 – Tahfidz Al Qur-an Juz 30 Kelas 6'}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm shadow-xs"
              />
            </div>
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

          {/* Dedicated Typography Toolbar: Latin & Arabic Font Settings */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 via-indigo-50/70 to-slate-50 border border-emerald-200/80 rounded-2xl space-y-2.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-emerald-700" />
                <span className="font-extrabold text-xs text-slate-800">
                  Pengaturan Tipografi: Jenis Font Latin &amp; Bahasa Arab
                </span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                {activeFont.category === 'Arab' ? '🌙 Mode Arab / Qur\'an Aktif' : '🔤 Mode Latin / Standar Aktif'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              {/* Dropdown Font Family */}
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[10px] font-bold text-slate-600 block">
                  Pilihan Font (Latin &amp; Arab):
                </label>
                <select
                  value={selectedFontId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedFontId(nextId);
                    const f = AVAILABLE_FONTS.find((x) => x.id === nextId);
                    if (f?.isArabic) {
                      setSelectedFontSize('18px');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  <optgroup label="🌙 FONT BAHASA ARAB & AL-QUR'AN">
                    {AVAILABLE_FONTS.filter((f) => f.category === 'Arab').map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🔤 FONT LATIN / STANDAR">
                    {AVAILABLE_FONTS.filter((f) => f.category === 'Latin').map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Dropdown Font Size */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-bold text-slate-600 block">
                  Ukuran Huruf:
                </label>
                <select
                  value={selectedFontSize}
                  onChange={(e) => setSelectedFontSize(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation Toggle */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-600 block">
                  Arah Penulisan:
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setTextDirection('ltr')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                      textDirection === 'ltr'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Kiri ke Kanan (LTR)"
                  >
                    <AlignLeft className="w-3 h-3" /> LTR
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextDirection('rtl')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                      textDirection === 'rtl'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Kanan ke Kiri (RTL Arab)"
                  >
                    <AlignRight className="w-3 h-3" /> RTL (Arab)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Helper Tools & Arabic Symbols Toolbar */}
            <div className="pt-2 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 mr-1">Sisip Template:</span>
                <button
                  type="button"
                  onClick={insertTemplatePG}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  📝 Contoh PG
                </button>
                <button
                  type="button"
                  onClick={insertTemplateEsai}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  ✍️ Contoh Esai
                </button>
                <button
                  type="button"
                  onClick={insertTemplateCampuran}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  🔀 Contoh Campuran (PG + Esai)
                </button>
              </div>

              {/* Quick Arabic Calligraphy Insert */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 mr-1">Simbol Arab:</span>
                <button
                  type="button"
                  onClick={() => insertArabSymbol('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')}
                  title="Sisipkan Basmalah"
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-[11px] font-serif shadow-2xs transition-all cursor-pointer"
                >
                  بِسْمِ اللَّهِ
                </button>
                <button
                  type="button"
                  onClick={() => insertArabSymbol('ﷺ')}
                  title="Shallallahu 'alaihi wa sallam"
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                >
                  ﷺ
                </button>
                <button
                  type="button"
                  onClick={() => insertArabSymbol('ﷻ')}
                  title="Jalla Jalaluh"
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                >
                  ﷻ
                </button>
                <button
                  type="button"
                  onClick={() => insertArabSymbol('۝')}
                  title="Simbol Tanda Ayat Al-Qur'an"
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                >
                  ۝
                </button>
              </div>
            </div>
          </div>

          {/* Field 2: Tempel (Paste) Isi Dokumen Soal di Sini */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 text-xs sm:text-sm">
                Tempel (Paste) Isi Dokumen Soal di Sini:
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Font: <strong className="text-emerald-700">{activeFont.name}</strong> ({selectedFontSize})
              </span>
            </div>

            <textarea
              rows={11}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Buka file Word/PDF dokumen Anda, tekan Ctrl+A lalu Ctrl+C, dan tempelkan (Ctrl+V) isi seluruh teks soal di sini..."
              style={{
                fontFamily: activeFont.family,
                fontSize: selectedFontSize,
                lineHeight: activeFont.isArabic ? '2.4' : '1.7',
                direction:
                  textDirection === 'auto'
                    ? activeFont.isArabic
                      ? 'rtl'
                      : 'ltr'
                    : textDirection,
                textAlign:
                  textDirection === 'rtl' || (textDirection === 'auto' && activeFont.isArabic)
                    ? 'right'
                    : 'left',
              }}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
            />
          </div>

          {/* Notice Callout Box - Explains PG and Essay formats */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs text-amber-900 shadow-xs">
            <div className="font-bold flex items-center gap-1.5 text-amber-950 text-sm">
              <span>📌</span>
              <span>Panduan Format Dokumen (Pilihan Ganda &amp; Soal Esai):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/70 space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 1. Format Soal Pilihan Ganda (PG)
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Tuliskan nomor soal, baris pertanyaan, opsi jawaban <strong>A.</strong> sampai <strong>D.</strong> (atau <strong>E.</strong>), dan baris kata kunci (contoh: <strong>Kunci: B</strong>).
                </p>
              </div>

              <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/70 space-y-1">
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <FileQuestion className="w-3.5 h-3.5" /> 2. Format Soal Esai / Uraian
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Tuliskan nomor soal pertanyaan uraian, diikuti kata <strong>Kunci: [teks jawaban]</strong> atau tag <strong>[Esai]</strong>. Soal tanpa opsi A-D akan otomatis dikenali sebagai <strong>Soal Esai</strong>.
                </p>
              </div>
            </div>
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
                  <span>PROSES &amp; BUAT FORM SOAL</span>
                </>
              )}
            </button>
          </div>

          {/* Footer Text */}
          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400">
              By Nisyandi Al Faqih-26 • CBT SDIT Al Hidayah Logam
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Questions Preview */}
      {extractedQuestions.length > 0 && (
        <div className="bg-[#0f172a] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {extractedQuestions.length} Total Soal
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {pgCount} Pilihan Ganda
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {essayCount} Soal Esai
                </span>
              </div>
              <h3 className="text-base font-black text-slate-100 mt-1.5">
                Pratinjau Paket Soal Ekstrak Dokumen
              </h3>
              <p className="text-[11px] text-slate-400">
                Font terpilih: <span className="text-emerald-400 font-semibold">{activeFont.name}</span> ({selectedFontSize})
              </p>
            </div>

            <button
              onClick={handleSaveToBank}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
            >
              <Database className="w-4 h-4" />
              <span>Buka di Bank Soal</span>
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {extractedQuestions.map((q, idx) => {
              const isEssay = q.type === 'esai';

              return (
                <div
                  key={q.id || idx}
                  className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-400 block">Soal #{idx + 1}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          isEssay
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isEssay ? '✍️ Soal Esai / Uraian' : '📝 Pilihan Ganda'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleQuestionType(idx)}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-200 underline cursor-pointer"
                      title="Klik untuk mengubah jenis soal antara Esai dan Pilihan Ganda"
                    >
                      {isEssay ? 'Ganti ke PG' : 'Ganti ke Esai'}
                    </button>
                  </div>

                  {/* Question Prompt with Font Styling */}
                  <p
                    style={{
                      fontFamily: activeFont.family,
                      fontSize: selectedFontSize,
                      lineHeight: activeFont.isArabic ? '2.4' : '1.7',
                      direction:
                        textDirection === 'auto'
                          ? activeFont.isArabic
                            ? 'rtl'
                            : 'ltr'
                          : textDirection,
                      textAlign:
                        textDirection === 'rtl' || (textDirection === 'auto' && activeFont.isArabic)
                          ? 'right'
                          : 'left',
                    }}
                    className="font-bold text-slate-100 whitespace-pre-line"
                  >
                    {q.question_text}
                  </p>

                  {/* Options for PG */}
                  {!isEssay && q.options && q.options.length > 0 && (
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
                  )}

                  {/* Rubric/Answer Key for Essay */}
                  {isEssay && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1 text-amber-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                          <FileQuestion className="w-3.5 h-3.5" /> Kunci Jawaban / Pedoman Penskoran Esai:
                        </span>
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">
                          Bobot: {q.scoreWeight || 10} Poin
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: activeFont.family,
                          fontSize: '14px',
                          lineHeight: activeFont.isArabic ? '2.2' : '1.6',
                        }}
                        className="text-slate-200 font-medium pt-0.5"
                      >
                        {q.essayAnswerKey || 'Belum diisi oleh pembuat soal.'}
                      </p>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300">
                      <span className="font-bold text-slate-400 block text-[11px]">Pembahasan:</span>
                      <p className="mt-0.5">{q.explanation}</p>
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
