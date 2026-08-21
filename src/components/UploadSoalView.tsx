import React, { useState, useMemo } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Key, BookOpen, Layers, User, GraduationCap, PenTool, ListFilter } from 'lucide-react';
import { QuestionBank, ActiveTab, Teacher, Subject, Student } from '../types';
import { downloadSoalTemplate, parseSoalExcel } from '../utils/exportImport';
import {
  getStoredTeachers,
  getStoredSubjects,
  getStoredStudents,
  getStoredBanks,
} from '../utils/storage';

interface UploadSoalViewProps {
  onSaveBank: (bank: QuestionBank) => void;
  setActiveTab: (tab: ActiveTab) => void;
  teachers?: Teacher[];
  subjects?: Subject[];
  students?: Student[];
  banks?: QuestionBank[];
}

export const UploadSoalView: React.FC<UploadSoalViewProps> = ({
  onSaveBank,
  setActiveTab,
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
      if (st.classRoom && st.classRoom.trim()) set.add(st.classRoom.trim());
    });
    bankList.forEach((b) => {
      if (b.class_room && b.class_room.trim() && b.class_room !== 'Umum' && b.class_room !== 'Semua Kelas') {
        set.add(b.class_room.trim());
      }
    });
    return Array.from(set);
  }, [studentList, bankList]);

  const [teacherName, setTeacherName] = useState(() => teacherList[0]?.name || '');
  const [subject, setSubject] = useState(() => subjectList[0]?.name || '');
  const [gradeLevel, setGradeLevel] = useState(() => gradeLevelsList[0] || 'SD / MI');
  const [classRoom, setClassRoom] = useState('Semua Kelas');

  // Input Mode States (Single Box per Field - No double stacked boxes)
  const [isCustomTeacher, setIsCustomTeacher] = useState(false);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [isCustomGrade, setIsCustomGrade] = useState(false);
  const [isCustomClassRoom, setIsCustomClassRoom] = useState(false);

  const [examToken, setExamToken] = useState('UPL' + Math.floor(1000 + Math.random() * 9000));
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [minWorkingMinutes, setMinWorkingMinutes] = useState(30);

  const [uploadedQuestions, setUploadedQuestions] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const parsed = await parseSoalExcel(file);
      if (!parsed.questions || parsed.questions.length === 0) {
        throw new Error('Tidak ada baris soal valid yang ditemukan dalam file Excel.');
      }
      setUploadedQuestions(parsed.questions);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membaca file Excel.');
      setUploadedQuestions([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToBank = () => {
    if (uploadedQuestions.length === 0) return;

    const newBank: QuestionBank = {
      id: 'bank-upl-' + Date.now(),
      title: `Soal Upload Excel: ${subject} - ${gradeLevel}`,
      teacher_name: teacherName || 'Guru Mata Pelajaran',
      subject: subject,
      grade_level: gradeLevel,
      class_room: classRoom || 'Umum',
      total_questions: uploadedQuestions.length,
      token: examToken || 'UPL123',
      durationMinutes: Number(durationMinutes) || 45,
      minWorkingMinutes: Number(minWorkingMinutes) || 30,
      createdAt: new Date().toISOString(),
      questions: uploadedQuestions,
    };

    onSaveBank(newBank);
    alert(`Berhasil mengimpor ${uploadedQuestions.length} soal ke Bank Soal dengan Token Ujian: ${examToken}`);
    setActiveTab('bank-soal');
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Banner - Yellow Accent Theme */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-3.5 sm:p-4 md:p-5 text-slate-950 shadow-xl relative overflow-hidden border border-amber-300/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/20 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
            <span>Template Excel CBT Soal & Jawaban</span>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 tracking-tight leading-snug">
            Upload Soal via Template Excel
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-900/90 font-medium leading-tight">
            Unduh template resmi, isi soal beserta pilihan A–E, kunci jawaban & pembahasan, lalu upload kembali.
          </p>
        </div>

        <button
          onClick={downloadSoalTemplate}
          className="px-3 py-2 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Download Template Excel Soal</span>
        </button>
      </div>

      {/* Metadata Form */}
      <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2">
          Parameter Paket Soal Upload
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Field: Nama Guru */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Nama Guru
              </label>
              <div className="flex items-center gap-1.5">
                {teacherList.length > 0 && !isCustomTeacher && (
                  <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {teacherList.length} Guru
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsCustomTeacher(!isCustomTeacher)}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isCustomTeacher ? (
                    <>
                      <ListFilter className="w-3 h-3 text-indigo-400" /> Pilih List
                    </>
                  ) : (
                    <>
                      <PenTool className="w-3 h-3 text-indigo-400" /> Manual
                    </>
                  )}
                </button>
              </div>
            </div>

            {isCustomTeacher ? (
              <input
                type="text"
                placeholder="Ketik nama guru..."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-indigo-500/60 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
                className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs font-medium cursor-pointer"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-300 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Mata Pelajaran *
              </label>
              <div className="flex items-center gap-1.5">
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
                      <ListFilter className="w-3 h-3 text-indigo-400" /> Pilih List
                    </>
                  ) : (
                    <>
                      <PenTool className="w-3 h-3 text-indigo-400" /> Manual
                    </>
                  )}
                </button>
              </div>
            </div>

            {isCustomSubject ? (
              <input
                type="text"
                placeholder="Ketik mata pelajaran..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-indigo-500/60 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
                className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs font-medium cursor-pointer"
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

          {/* Field: Jenjang Pendidikan */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-300 flex items-center gap-1">
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
                    <PenTool className="w-3 h-3 text-indigo-400" /> Manual
                  </>
                )}
              </button>
            </div>

            {isCustomGrade ? (
              <input
                type="text"
                placeholder="Ketik jenjang pendidikan..."
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-indigo-500/60 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
                className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs font-medium cursor-pointer"
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
          </div>

          {/* Field: Kelas / Rombel */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Kelas / Rombel
              </label>
              <div className="flex items-center gap-1.5">
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
                      <PenTool className="w-3 h-3 text-indigo-400" /> Manual
                    </>
                  )}
                </button>
              </div>
            </div>

            {isCustomClassRoom ? (
              <input
                type="text"
                placeholder="Ketik kelas / rombel..."
                value={classRoom}
                onChange={(e) => setClassRoom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-indigo-500/60 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
                className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs font-medium cursor-pointer"
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
            <label className="block font-bold text-slate-300 mb-1">Token Ujian Siswa</label>
            <input
              type="text"
              value={examToken}
              onChange={(e) => setExamToken(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg font-mono font-bold text-indigo-400 uppercase focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Durasi Total Ujian (Menit)</label>
            <input
              type="number"
              min="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg font-bold text-slate-100 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-amber-300 mb-1">Min. Pengerjaan (Menit)</label>
            <input
              type="number"
              min="0"
              value={minWorkingMinutes}
              onChange={(e) => setMinWorkingMinutes(Number(e.target.value))}
              placeholder="30"
              className="w-full px-3 py-2 bg-slate-800 border border-amber-500/40 rounded-lg font-bold text-amber-300 focus:bg-slate-800 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-[#0f172a] rounded-2xl p-8 border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 transition-colors text-center shadow-sm flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
          <FileSpreadsheet className="w-7 h-7" />
        </div>

        <div>
          <span className="text-sm font-bold text-slate-100 block">Pilih atau Drag File Excel Soal (.xlsx / .xls)</span>
          <p className="text-xs text-slate-400 mt-0.5">Format kolom: No | Soal | A | B | C | D | E | Jawaban | Pembahasan</p>
        </div>

        <label className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span>Upload File Excel Soal</span>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="hidden" />
        </label>

        {fileName && (
          <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>File terpilih: {fileName}</span>
          </div>
        )}

        {errorMessage && (
          <div className="text-xs font-semibold text-rose-300 bg-rose-500/10 px-3.5 py-2 rounded-xl border border-rose-500/20 flex items-center gap-1.5 mt-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Preview Uploaded */}
      {uploadedQuestions.length > 0 && (
        <div className="bg-[#0f172a] rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-black text-slate-100 text-sm">
              Pratinjau Impor Excel ({uploadedQuestions.length} Soal Berhasil Dibaca)
            </h3>
            <button
              onClick={handleSaveToBank}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              Simpan ke Bank Soal Permanen
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {uploadedQuestions.map((q, idx) => (
              <div key={idx} className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-indigo-400 block">Soal #{q.question_number}</span>
                <p className="font-semibold text-slate-100">{q.question_text}</p>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt: any, oIdx: number) => (
                    <div
                      key={oIdx}
                      className={`p-2 rounded-lg border flex items-center gap-2 ${
                        opt.is_correct ? 'bg-emerald-500/10 border-emerald-500/30 font-bold text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                        {opt.option_letter}
                      </span>
                      <span>{opt.option_text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
