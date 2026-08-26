import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Search,
  BookOpen,
  Calendar,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckSquare,
  Square,
  Users,
  TrendingUp,
  BarChart3,
  X,
  Sparkles,
  Layers,
  ArrowUpDown,
  GraduationCap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Subject, DailyGradeRecord, AuthUser } from '../types';
import { getGradePredicate, GRADE_SCALE_TABLE, GradePredicate } from '../utils/gradeHelper';
import {
  downloadNilaiHarianTemplate,
  exportNilaiHarianToExcel,
  exportNilaiHarianToPdf,
} from '../utils/exportImport';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';

interface NilaiHarianViewProps {
  students: Student[];
  subjects: Subject[];
  dailyGrades: DailyGradeRecord[];
  setDailyGrades: React.Dispatch<React.SetStateAction<DailyGradeRecord[]>>;
  currentUser?: AuthUser | null;
  schoolName?: string;
}

// Helper to convert Excel date numbers / JS Date / strings into DD/MM/YYYY
function parseDateValue(val: any): string {
  if (val === undefined || val === null || val === '') {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const dd = String(parsed.d).padStart(2, '0');
        const mm = String(parsed.m).padStart(2, '0');
        const yyyy = parsed.y;
        return `${dd}/${mm}/${yyyy}`;
      }
    } catch {
      // fallback
    }
  }

  if (val instanceof Date) {
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const yyyy = val.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return str;
}

// Format Date object to YYYY-MM-DD for <input type="date">
function formatDateToInput(dStr: string): string {
  if (!dStr) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().split('T')[0];
}

// Convert input date (YYYY-MM-DD) to DD/MM/YYYY
function formatInputToDDMMYYYY(val: string): string {
  if (!val) return '';
  const parts = val.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
}

export const NilaiHarianView: React.FC<NilaiHarianViewProps> = ({
  students,
  subjects,
  dailyGrades,
  setDailyGrades,
  currentUser,
  schoolName = 'SDIT Al Hidayah Logam',
}) => {
  // Filters & State
  const [selectedSubject, setSelectedSubject] = useState<string>('Semua');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubView, setActiveSubView] = useState<'detail' | 'matriks'>('detail');

  // Multi-Selection State (Checkbox)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals State
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<DailyGradeRecord | null>(null);

  // Delete Confirmations
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DailyGradeRecord | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Class Lists & Subject Lists for Dropdowns
  const classList = useMemo(() => {
    const list = Array.from(new Set(students.map((s) => s.classRoom).filter(Boolean)));
    if (list.length === 0) {
      return ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];
    }
    return list.sort();
  }, [students]);

  const subjectNames = useMemo(() => {
    if (subjects.length > 0) {
      return subjects.map((s) => s.name);
    }
    return [
      'Al-Qur\'an Hadits',
      'Aqidah Akhlak',
      'Fiqih',
      'Sejarah Kebudayaan Islam (SKI)',
      'Bahasa Arab',
      'Pendidikan Agama Islam (PAI)',
      'Bahasa Indonesia',
      'Matematika',
      'IPA / Sains',
      'IPS',
      'Bahasa Inggris',
    ];
  }, [subjects]);

  // Single Form State
  const [singleFormData, setSingleFormData] = useState({
    studentId: '',
    studentName: '',
    classRoom: '',
    subjectName: subjectNames[0] || 'Al-Qur\'an Hadits',
    taskTitle: 'Penilaian Harian 1',
    dateInput: new Date().toISOString().split('T')[0],
    score: 85,
    notes: '',
  });

  // Batch Form State (Input Nilai Massal Sekelas)
  const [batchSubject, setBatchSubject] = useState<string>(subjectNames[0] || 'Al-Qur\'an Hadits');
  const [batchClass, setBatchClass] = useState<string>(classList[0] || 'Kelas 1');
  const [batchTaskTitle, setBatchTaskTitle] = useState<string>('Penilaian Harian 1');
  const [batchDateInput, setBatchDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [batchScores, setBatchScores] = useState<Record<string, { score: number; notes: string }>>({});

  // Filtered Daily Grades
  const filteredGrades = useMemo(() => {
    return dailyGrades.filter((g) => {
      const matchSubject = selectedSubject === 'Semua' || g.subjectName === selectedSubject;
      const matchClass = selectedClass === 'Semua' || g.classRoom === selectedClass;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        g.studentName.toLowerCase().includes(term) ||
        (g.nis || '').includes(term) ||
        (g.nisn || '').includes(term) ||
        g.taskTitle.toLowerCase().includes(term) ||
        g.subjectName.toLowerCase().includes(term) ||
        g.date.includes(term);

      return matchSubject && matchClass && matchSearch;
    });
  }, [dailyGrades, selectedSubject, selectedClass, searchTerm]);

  // Calculations & Statistics
  const stats = useMemo(() => {
    if (filteredGrades.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        mumtazCount: 0,
        jayyidJiddanCount: 0,
        jayyidCount: 0,
        maqbulCount: 0,
        naqisCount: 0,
      };
    }

    const scores = filteredGrades.map((g) => g.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / scores.length) * 10) / 10;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    let mumtaz = 0;
    let jayyidJiddan = 0;
    let jayyid = 0;
    let maqbul = 0;
    let naqis = 0;

    scores.forEach((s) => {
      if (s >= 91) mumtaz++;
      else if (s >= 81) jayyidJiddan++;
      else if (s >= 71) jayyid++;
      else if (s >= 61) maqbul++;
      else naqis++;
    });

    return {
      total: filteredGrades.length,
      average: avg,
      highest,
      lowest,
      mumtazCount: mumtaz,
      jayyidJiddanCount: jayyidJiddan,
      jayyidCount: jayyid,
      maqbulCount: maqbul,
      naqisCount: naqis,
    };
  }, [filteredGrades]);

  // Multi-Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredGrades.length && filteredGrades.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGrades.map((g) => g.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Delete Handlers
  const executeDeleteSingle = () => {
    if (!deleteConfirmTarget) return;
    setDailyGrades((prev) => prev.filter((g) => g.id !== deleteConfirmTarget.id));
    setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmTarget.id));
    addToast('success', `Nilai siswa ${deleteConfirmTarget.studentName} berhasil dihapus.`, 'Nilai Dihapus');
    setDeleteConfirmTarget(null);
  };

  const executeBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setDailyGrades((prev) => prev.filter((g) => !selectedIds.includes(g.id)));
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
    addToast('success', `${count} data nilai harian terpilih berhasil dihapus.`, 'Hapus Masal Berhasil');
  };

  const executeClearAll = () => {
    if (selectedSubject === 'Semua' && selectedClass === 'Semua') {
      setDailyGrades([]);
      setSelectedIds([]);
      addToast('success', 'Seluruh data nilai harian berhasil dikosongkan.', 'Reset Berhasil');
    } else {
      setDailyGrades((prev) =>
        prev.filter((g) => {
          const matchSubj = selectedSubject === 'Semua' || g.subjectName === selectedSubject;
          const matchCls = selectedClass === 'Semua' || g.classRoom === selectedClass;
          return !(matchSubj && matchCls);
        })
      );
      setSelectedIds([]);
      addToast('success', `Data nilai untuk filter yang dipilih berhasil dikosongkan.`, 'Reset Berhasil');
    }
    setShowClearAllConfirm(false);
  };

  // Open Add Single Grade Modal
  const handleOpenAddSingle = () => {
    setEditingGrade(null);
    const firstStudent = students.find((s) => (selectedClass === 'Semua' ? true : s.classRoom === selectedClass)) || students[0];
    setSingleFormData({
      studentId: firstStudent ? firstStudent.id : '',
      studentName: firstStudent ? firstStudent.name : '',
      classRoom: firstStudent ? firstStudent.classRoom : (selectedClass === 'Semua' ? (classList[0] || 'Kelas 1') : selectedClass),
      subjectName: selectedSubject === 'Semua' ? (subjectNames[0] || 'Al-Qur\'an Hadits') : selectedSubject,
      taskTitle: 'Penilaian Harian 1',
      dateInput: new Date().toISOString().split('T')[0],
      score: 85,
      notes: '',
    });
    setIsSingleModalOpen(true);
  };

  // Open Edit Single Grade Modal
  const handleOpenEdit = (grade: DailyGradeRecord) => {
    setEditingGrade(grade);
    setSingleFormData({
      studentId: grade.studentId,
      studentName: grade.studentName,
      classRoom: grade.classRoom,
      subjectName: grade.subjectName,
      taskTitle: grade.taskTitle,
      dateInput: formatDateToInput(grade.date),
      score: grade.score,
      notes: grade.notes || '',
    });
    setIsSingleModalOpen(true);
  };

  // Handle Save Single Grade
  const handleSaveSingleGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFormData.studentName.trim()) {
      addToast('warning', 'Nama siswa wajib dipilih / diisi.', 'Data Belum Lengkap');
      return;
    }

    const formattedDate = formatInputToDDMMYYYY(singleFormData.dateInput);
    const matchedStudent = students.find((s) => s.id === singleFormData.studentId || s.name === singleFormData.studentName);

    if (editingGrade) {
      setDailyGrades((prev) =>
        prev.map((g) =>
          g.id === editingGrade.id
            ? {
                ...g,
                studentId: matchedStudent ? matchedStudent.id : g.studentId,
                studentName: singleFormData.studentName,
                nis: matchedStudent?.nis || g.nis,
                nisn: matchedStudent?.nisn || g.nisn,
                classRoom: singleFormData.classRoom,
                subjectName: singleFormData.subjectName,
                taskTitle: singleFormData.taskTitle,
                date: formattedDate,
                score: Number(singleFormData.score),
                notes: singleFormData.notes,
              }
            : g
        )
      );
      addToast('success', `Nilai ${singleFormData.studentName} berhasil diperbarui.`, 'Berhasil Disimpan');
    } else {
      const newGrade: DailyGradeRecord = {
        id: 'grade-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        studentId: matchedStudent ? matchedStudent.id : 'std-' + Date.now(),
        studentName: singleFormData.studentName,
        nis: matchedStudent?.nis || '',
        nisn: matchedStudent?.nisn || '',
        classRoom: singleFormData.classRoom || (matchedStudent ? matchedStudent.classRoom : 'Kelas 1'),
        subjectName: singleFormData.subjectName,
        taskTitle: singleFormData.taskTitle,
        date: formattedDate,
        score: Number(singleFormData.score),
        notes: singleFormData.notes,
        createdAt: new Date().toISOString(),
      };
      setDailyGrades((prev) => [newGrade, ...prev]);
      addToast('success', `Nilai ${singleFormData.studentName} berhasil ditambahkan.`, 'Nilai Ditambahkan');
    }

    setIsSingleModalOpen(false);
  };

  // Open Batch Input Modal
  const handleOpenBatch = () => {
    const targetCls = selectedClass === 'Semua' ? (classList[0] || 'Kelas 1') : selectedClass;
    const targetSubj = selectedSubject === 'Semua' ? (subjectNames[0] || 'Al-Qur\'an Hadits') : selectedSubject;
    setBatchClass(targetCls);
    setBatchSubject(targetSubj);
    setBatchTaskTitle('Penilaian Harian 1');
    setBatchDateInput(new Date().toISOString().split('T')[0]);

    // Pre-populate scores with existing or default 85
    const classStudents = students.filter((s) => s.classRoom === targetCls && s.activeStatus !== 'Non-Aktif');
    const initialMap: Record<string, { score: number; notes: string }> = {};
    classStudents.forEach((s) => {
      initialMap[s.id] = { score: 85, notes: '' };
    });
    setBatchScores(initialMap);
    setIsBatchModalOpen(true);
  };

  // Update batch student score state
  const handleBatchClassChange = (newCls: string) => {
    setBatchClass(newCls);
    const classStudents = students.filter((s) => s.classRoom === newCls && s.activeStatus !== 'Non-Aktif');
    const initialMap: Record<string, { score: number; notes: string }> = {};
    classStudents.forEach((s) => {
      initialMap[s.id] = { score: 85, notes: '' };
    });
    setBatchScores(initialMap);
  };

  // Save Batch Grades
  const handleSaveBatchGrades = () => {
    const classStudents = students.filter((s) => s.classRoom === batchClass && s.activeStatus !== 'Non-Aktif');
    if (classStudents.length === 0) {
      addToast('warning', `Tidak ada siswa aktif ditemukan di ${batchClass}. Tambahkan siswa terlebih dahulu.`, 'Siswa Kosong');
      return;
    }

    const formattedDate = formatInputToDDMMYYYY(batchDateInput);
    const newRecords: DailyGradeRecord[] = classStudents.map((s, idx) => {
      const entry = batchScores[s.id] || { score: 85, notes: '' };
      return {
        id: 'grade-' + (Date.now() + idx) + '-' + Math.floor(Math.random() * 1000),
        studentId: s.id,
        studentName: s.name,
        nis: s.nis || '',
        nisn: s.nisn || '',
        classRoom: batchClass,
        subjectName: batchSubject,
        taskTitle: batchTaskTitle || 'Penilaian Harian',
        date: formattedDate,
        score: Number(entry.score) || 0,
        notes: entry.notes || '',
        createdAt: new Date().toISOString(),
      };
    });

    setDailyGrades((prev) => [...newRecords, ...prev]);
    setIsBatchModalOpen(false);
    addToast('success', `Berhasil menyimpan nilai harian untuk ${newRecords.length} siswa di ${batchClass}.`, 'Input Masal Berhasil');
  };

  // Upload Excel Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { raw: false });

        if (!rawJson || rawJson.length === 0) {
          addToast('error', 'File Excel kosong atau format tidak sesuai template.', 'Gagal Import');
          return;
        }

        const newRecords: DailyGradeRecord[] = [];
        let successCount = 0;

        rawJson.forEach((row, idx) => {
          const studentName = row['NAMA SISWA'] || row['NAMA'] || row['Nama Siswa'] || row['Nama'] || row['nama'] || '';
          if (!studentName) return;

          const rawScore = row['NILAI (0-100)'] || row['NILAI'] || row['Nilai'] || row['SCORE'] || row['Score'] || 0;
          const score = Math.max(0, Math.min(100, Number(rawScore) || 0));

          const rawDate = row['TANGGAL PENILAIAN (DD/MM/YYYY)'] || row['TANGGAL PENILAIAN'] || row['TANGGAL'] || row['Tanggal'] || '';
          const date = parseDateValue(rawDate);

          const classRoom = row['KELAS'] || row['Kelas'] || row['ROMBEL'] || selectedClass !== 'Semua' ? selectedClass : 'Kelas 1';
          const subjectName = row['MATA PELAJARAN'] || row['MAPEL'] || row['Mata Pelajaran'] || selectedSubject !== 'Semua' ? selectedSubject : 'Al-Qur\'an Hadits';
          const taskTitle = row['JENIS / MATERI PENILAIAN'] || row['MATERI'] || row['TUGAS'] || row['Jenis / Materi'] || 'Penilaian Harian';
          const notes = row['CATATAN'] || row['Catatan'] || row['Keterangan'] || '';
          const nis = row['NIS'] || row['nis'] || '';
          const nisn = row['NISN'] || row['nisn'] || '';

          // Match student ID if exists
          const matched = students.find((s) => s.name.toLowerCase() === String(studentName).trim().toLowerCase() || (nis && s.nis === String(nis)));

          newRecords.push({
            id: 'grade-imp-' + Date.now() + '-' + idx + '-' + Math.floor(Math.random() * 1000),
            studentId: matched ? matched.id : 'std-imp-' + idx,
            studentName: String(studentName).trim(),
            nis: matched?.nis || String(nis),
            nisn: matched?.nisn || String(nisn),
            classRoom: String(classRoom),
            subjectName: String(subjectName),
            taskTitle: String(taskTitle),
            date: date,
            score: score,
            notes: String(notes),
            createdAt: new Date().toISOString(),
          });
          successCount++;
        });

        if (newRecords.length > 0) {
          setDailyGrades((prev) => [...newRecords, ...prev]);
          addToast('success', `Berhasil mengimpor ${successCount} data nilai harian dari file Excel.`, 'Import Sukses');
          setIsUploadModalOpen(false);
        } else {
          addToast('error', 'Tidak ada data nilai yang valid ditemukan dalam file.', 'Format Tidak Sesuai');
        }
      } catch (err: any) {
        addToast('error', 'Gagal memproses file Excel: ' + (err?.message || 'Format tidak didukung'), 'Kesalahan Import');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  // Matrix View Calculations (Siswa x Tanggal Tugas)
  const matrixData = useMemo(() => {
    // Unique list of students in the current filter
    let targetStudents = students;
    if (selectedClass !== 'Semua') {
      targetStudents = students.filter((s) => s.classRoom === selectedClass);
    }

    // Unique dates and tasks for the selected subject
    const subjectGrades = dailyGrades.filter(
      (g) => (selectedSubject === 'Semua' || g.subjectName === selectedSubject) && (selectedClass === 'Semua' || g.classRoom === selectedClass)
    );

    // Group columns by unique `taskTitle + date`
    const columnKeysMap = new Map<string, { taskTitle: string; date: string }>();
    subjectGrades.forEach((g) => {
      const key = `${g.date}_${g.taskTitle}`;
      if (!columnKeysMap.has(key)) {
        columnKeysMap.set(key, { taskTitle: g.taskTitle, date: g.date });
      }
    });

    const columns = Array.from(columnKeysMap.entries()).map(([key, val]) => ({
      key,
      taskTitle: val.taskTitle,
      date: val.date,
    }));

    // Rows for each student
    const rows = targetStudents.map((st) => {
      const stGrades = subjectGrades.filter((g) => g.studentId === st.id || g.studentName.toLowerCase() === st.name.toLowerCase());
      const scoresMap: Record<string, number> = {};
      stGrades.forEach((g) => {
        const key = `${g.date}_${g.taskTitle}`;
        scoresMap[key] = g.score;
      });

      const recordedScores = Object.values(scoresMap);
      const avg = recordedScores.length > 0 ? Math.round((recordedScores.reduce((a, b) => a + b, 0) / recordedScores.length) * 10) / 10 : null;
      const pred = avg !== null ? getGradePredicate(avg) : null;

      return {
        student: st,
        scoresMap,
        average: avg,
        predicate: pred,
        totalEntries: recordedScores.length,
      };
    });

    return {
      columns,
      rows,
    };
  }, [students, dailyGrades, selectedSubject, selectedClass]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Main Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#131d36] to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Modul Evaluasi Pembelajaran & Penilaian Harian</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Nilai Harian Siswa</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Otomatisasi kalkulasi nilai, rekapitulasi per tanggal, sinkronisasi data pokok, dan predikat standar SDIT.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                downloadNilaiHarianTemplate(
                  students,
                  selectedSubject !== 'Semua' ? selectedSubject : 'Al-Qur\'an Hadits',
                  selectedClass !== 'Semua' ? selectedClass : 'Kelas 1'
                );
                addToast('info', 'Template Excel Nilai Harian berhasil diunduh.', 'Unduh Template');
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Unduh format template Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Unduh Template</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Upload file nilai dari Excel"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Upload Nilai</span>
            </button>

            <button
              onClick={handleOpenBatch}
              className="px-3.5 py-2 bg-indigo-700/80 hover:bg-indigo-600 text-indigo-100 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Input nilai satu kelas secara bersamaan"
            >
              <Users className="w-4 h-4" />
              <span>Input Sekelas</span>
            </button>

            <button
              onClick={handleOpenAddSingle}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Nilai</span>
            </button>
          </div>
        </div>

        {/* Rentang Penilaian Standar SDIT Visual Card */}
        <div className="pt-2">
          <div className="bg-slate-950/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/90 shadow-inner">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200">Rentang Penilaian Standar (Kategori Predikat & Keterangan)</span>
              </div>
              <span className="text-[11px] text-slate-400">Dihitung otomatis per butir nilai & rata-rata</span>
            </div>

            {/* Scale badges grid matching user's image */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {GRADE_SCALE_TABLE.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border ${item.badgeClass} flex flex-col justify-between transition-transform hover:scale-102`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black tracking-wide font-mono">{item.range}</span>
                    <span className="text-sm font-semibold font-arabic" dir="rtl">
                      {item.arabic}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-white leading-tight">
                    {item.latin}
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium mt-0.5 opacity-90">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Total Data Nilai</span>
            <div className="text-xl font-bold text-slate-100">{stats.total} <span className="text-xs font-normal text-slate-400">entri</span></div>
          </div>
        </div>

        <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Rata-Rata Nilai</span>
            <div className="text-xl font-bold text-slate-100 flex items-baseline gap-1.5">
              <span>{stats.average || 0}</span>
              {stats.average > 0 && (
                <span className="text-[11px] font-bold text-emerald-400">
                  {getGradePredicate(stats.average).latin}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Nilai Tertinggi</span>
            <div className="text-xl font-bold text-slate-100">{stats.highest || 0}</div>
          </div>
        </div>

        <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Predikat Mumtaz (≥91)</span>
            <div className="text-xl font-bold text-slate-100">{stats.mumtazCount} <span className="text-xs font-normal text-slate-400">siswa</span></div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveSubView('detail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubView === 'detail'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Daftar Nilai Rinci ({filteredGrades.length})</span>
            </button>

            <button
              onClick={() => setActiveSubView('matriks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubView === 'matriks'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Matriks Rekap Kelas</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, materi, tanggal, atau mapel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (filteredGrades.length === 0) {
                  addToast('warning', 'Tidak ada data nilai untuk diekspor.', 'Data Kosong');
                  return;
                }
                exportNilaiHarianToExcel(filteredGrades, selectedSubject, selectedClass, schoolName);
                addToast('success', 'File Excel Rekap Nilai Harian berhasil diunduh.', 'Ekspor Excel');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ekspor rekap ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>

            <button
              onClick={() => {
                if (filteredGrades.length === 0) {
                  addToast('warning', 'Tidak ada data nilai untuk diekspor.', 'Data Kosong');
                  return;
                }
                exportNilaiHarianToPdf(filteredGrades, selectedSubject, selectedClass, schoolName);
                addToast('success', 'File PDF Laporan Nilai Harian berhasil diunduh.', 'Ekspor PDF');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cetak/Ekspor rekap ke PDF"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters (Mata Pelajaran & Kelas) */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium">Mata Pelajaran:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Semua">Semua Mata Pelajaran</option>
              {subjectNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium">Kelas / Rombel:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Semua">Semua Kelas</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Selection Actions Bar */}
          {selectedIds.length > 0 && activeSubView === 'detail' && (
            <div className="ml-auto flex items-center gap-2 animate-fade-in bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30">
              <span className="text-xs font-bold text-rose-300">
                {selectedIds.length} baris terpilih
              </span>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </button>
            </div>
          )}

          {dailyGrades.length > 0 && selectedIds.length === 0 && (
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="ml-auto text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Nilai</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Views */}
      {activeSubView === 'detail' ? (
        /* DETAIL TABLE VIEW (No, Checkbox, Nama Siswa, Mapel, Tugas, Tanggal, Nilai, Predikat, Keterangan, Aksi) */
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={selectedIds.length === filteredGrades.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    >
                      {filteredGrades.length > 0 && selectedIds.length === filteredGrades.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5">Mata Pelajaran</th>
                  <th className="p-3.5">Jenis / Materi Penilaian</th>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5 text-center">Nilai</th>
                  <th className="p-3.5">Predikat</th>
                  <th className="p-3.5">Keterangan</th>
                  <th className="p-3.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredGrades.length > 0 ? (
                  filteredGrades.map((grade, index) => {
                    const pred = getGradePredicate(grade.score);
                    const isSelected = selectedIds.includes(grade.id);

                    return (
                      <tr
                        key={grade.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleSelectOne(grade.id)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* No */}
                        <td className="p-3.5 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>

                        {/* Nama Siswa & NIS/Kelas */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{grade.studentName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="inline-block px-1.5 py-0.2 bg-slate-800 rounded font-mono text-[10px] text-slate-300">
                              {grade.classRoom || 'Kelas 1'}
                            </span>
                            {grade.nis && <span>NIS: {grade.nis}</span>}
                          </div>
                        </td>

                        {/* Mata Pelajaran */}
                        <td className="p-3.5 font-medium text-slate-200">
                          {grade.subjectName}
                        </td>

                        {/* Jenis / Materi */}
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{grade.taskTitle}</div>
                          {grade.notes && (
                            <div className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                              {grade.notes}
                            </div>
                          )}
                        </td>

                        {/* Tanggal Penilaian */}
                        <td className="p-3.5 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{grade.date}</span>
                          </div>
                        </td>

                        {/* Nilai Angka */}
                        <td className="p-3.5 text-center">
                          <span className="font-bold text-sm text-white px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700/80 font-mono">
                            {grade.score}
                          </span>
                        </td>

                        {/* Predikat */}
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-xs ${pred.badgeClass}`}
                          >
                            <span>{pred.latin}</span>
                            <span className="text-[11px] font-arabic font-normal opacity-90" dir="rtl">
                              ({pred.arabic})
                            </span>
                          </span>
                        </td>

                        {/* Keterangan */}
                        <td className="p-3.5 text-slate-300 font-medium">
                          {pred.description}
                        </td>

                        {/* Aksi (Edit & Hapus) */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(grade)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Nilai"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmTarget(grade)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Nilai"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-500 mx-auto flex items-center justify-center">
                          <FileSpreadsheet className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-slate-200 text-sm">Belum Ada Data Nilai Harian</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Tambahkan nilai baru melalui tombol <strong>Tambah Nilai</strong>, gunakan <strong>Input Sekelas</strong> untuk entri massal, atau <strong>Upload Nilai</strong> dari file template Excel.
                        </p>
                        <div className="pt-2 flex justify-center gap-2">
                          <button
                            onClick={handleOpenAddSingle}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Nilai</span>
                          </button>
                          <button
                            onClick={handleOpenBatch}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Input Sekelas</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MATRIX RECAP TABLE VIEW (Siswa x Kolom Tanggal/Tugas + Rata-rata Otomatis) */
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-md overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Matriks Rekapitulasi: {selectedSubject} ({selectedClass})
              </h3>
              <p className="text-xs text-slate-400">
                Nilai harian dikelompokkan per tanggal & materi dengan perhitungan rata-rata dan predikat otomatis.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Total Siswa: <strong className="text-white">{matrixData.rows.length}</strong> | Total Evaluasi: <strong className="text-white">{matrixData.columns.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3 min-w-[180px]">Nama Siswa</th>
                  <th className="p-3 w-20">Kelas</th>

                  {/* Dynamic Assessment Columns with Dates */}
                  {matrixData.columns.map((col, idx) => (
                    <th key={col.key} className="p-3 text-center min-w-[120px]">
                      <div className="text-slate-200 font-bold normal-case text-xs">{col.taskTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{col.date}</div>
                    </th>
                  ))}

                  {matrixData.columns.length === 0 && (
                    <th className="p-3 text-center text-slate-500 font-normal italic">
                      (Belum ada kolom tugas ber-tanggal)
                    </th>
                  )}

                  <th className="p-3 text-center bg-indigo-950/40 text-indigo-300 border-l border-slate-800 min-w-[90px]">
                    Rata-Rata
                  </th>
                  <th className="p-3 bg-indigo-950/40 text-indigo-300 min-w-[140px]">
                    Predikat
                  </th>
                  <th className="p-3 bg-indigo-950/40 text-indigo-300 min-w-[140px]">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {matrixData.rows.length > 0 ? (
                  matrixData.rows.map((row, idx) => (
                    <tr key={row.student.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-100">
                        {row.student.name}
                        {row.student.nis && (
                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                            NIS: {row.student.nis}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-300">{row.student.classRoom}</td>

                      {/* Scores for each column */}
                      {matrixData.columns.map((col) => {
                        const sc = row.scoresMap[col.key];
                        return (
                          <td key={col.key} className="p-3 text-center font-mono">
                            {sc !== undefined ? (
                              <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-100 font-bold">
                                {sc}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}

                      {matrixData.columns.length === 0 && (
                        <td className="p-3 text-center text-slate-600">-</td>
                      )}

                      {/* Average Column */}
                      <td className="p-3 text-center font-bold font-mono text-sm bg-indigo-950/20 text-white border-l border-slate-800">
                        {row.average !== null ? (
                          <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30">
                            {row.average}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Predicate */}
                      <td className="p-3 bg-indigo-950/20">
                        {row.predicate ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-bold text-[11px] ${row.predicate.badgeClass}`}
                          >
                            <span>{row.predicate.latin}</span>
                            <span className="font-arabic font-normal" dir="rtl">
                              ({row.predicate.arabic})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="p-3 bg-indigo-950/20 text-slate-300 font-medium text-[11px]">
                        {row.predicate ? row.predicate.description : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={matrixData.columns.length + 6} className="p-8 text-center text-slate-400">
                      Tidak ada data siswa ditemukan untuk kelas {selectedClass}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Tambah / Edit Single Nilai */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">
                  {editingGrade ? 'Edit Data Nilai Harian' : 'Tambah Nilai Harian Siswa'}
                </h3>
              </div>
              <button
                onClick={() => setIsSingleModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleGrade} className="space-y-4 text-xs">
              {/* Siswa Selector */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  Pilih Siswa (Singkron Data Siswa):
                </label>
                <select
                  value={singleFormData.studentId}
                  onChange={(e) => {
                    const st = students.find((s) => s.id === e.target.value);
                    if (st) {
                      setSingleFormData((prev) => ({
                        ...prev,
                        studentId: st.id,
                        studentName: st.name,
                        classRoom: st.classRoom || prev.classRoom,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {students.length > 0 ? (
                    students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.classRoom || 'Tanpa Kelas'}) {s.nis ? `- NIS: ${s.nis}` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">Belum ada data siswa di master</option>
                  )}
                </select>
              </div>

              {/* Or manual student name input if no students */}
              {students.length === 0 && (
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nama Siswa Manual:</label>
                  <input
                    type="text"
                    value={singleFormData.studentName}
                    onChange={(e) => setSingleFormData({ ...singleFormData, studentName: e.target.value })}
                    placeholder="Masukkan nama siswa..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              {/* Row: Kelas & Mata Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kelas / Rombel:</label>
                  <select
                    value={singleFormData.classRoom}
                    onChange={(e) => setSingleFormData({ ...singleFormData, classRoom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {classList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Mata Pelajaran:</label>
                  <select
                    value={singleFormData.subjectName}
                    onChange={(e) => setSingleFormData({ ...singleFormData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjectNames.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: Tanggal Penilaian & Jenis/Materi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    Tanggal Penilaian (Dilengkapi Tanggal):
                  </label>
                  <input
                    type="date"
                    value={singleFormData.dateInput}
                    onChange={(e) => setSingleFormData({ ...singleFormData, dateInput: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Judul / Materi Evaluasi:</label>
                  <input
                    type="text"
                    value={singleFormData.taskTitle}
                    onChange={(e) => setSingleFormData({ ...singleFormData, taskTitle: e.target.value })}
                    placeholder="Contoh: PH 1 Surat Al-Falaq"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Nilai Input & Real-time Predicate Preview */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-xs">Nilai Harian (0 - 100):</label>
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 bg-indigo-600 rounded">
                    Skor: {singleFormData.score}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={singleFormData.score}
                    onChange={(e) => setSingleFormData({ ...singleFormData, score: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={singleFormData.score}
                    onChange={(e) =>
                      setSingleFormData({
                        ...singleFormData,
                        score: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-sm text-white font-mono"
                  />
                </div>

                {/* Live Predicate Badge */}
                {(() => {
                  const pred = getGradePredicate(singleFormData.score);
                  return (
                    <div className={`p-2 rounded-lg border ${pred.badgeClass} flex items-center justify-between text-xs`}>
                      <div>
                        <span className="font-bold">{pred.latin} </span>
                        <span className="font-arabic" dir="rtl">({pred.arabic})</span>
                      </div>
                      <span className="font-medium">{pred.description}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Catatan Tambahan (Opsional):</label>
                <input
                  type="text"
                  value={singleFormData.notes}
                  onChange={(e) => setSingleFormData({ ...singleFormData, notes: e.target.value })}
                  placeholder="Catatan perkembangan belajar siswa..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Nilai</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Input Massal Sekelas */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-6 space-y-4 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-base text-white">Input Nilai Harian Sekelas</h3>
                  <p className="text-xs text-slate-400">Entri cepat seluruh siswa dalam satu kelas sekaligus</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header controls for batch */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 shrink-0 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Kelas:</label>
                <select
                  value={batchClass}
                  onChange={(e) => handleBatchClassChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-bold"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Mata Pelajaran:</label>
                <select
                  value={batchSubject}
                  onChange={(e) => setBatchSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-bold"
                >
                  {subjectNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Tanggal Penilaian:</label>
                <input
                  type="date"
                  value={batchDateInput}
                  onChange={(e) => setBatchDateInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Judul / Materi:</label>
                <input
                  type="text"
                  value={batchTaskTitle}
                  onChange={(e) => setBatchTaskTitle(e.target.value)}
                  placeholder="Contoh: PH-1 Bab 1"
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
            </div>

            {/* Students List Inputs */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl bg-slate-950/60 p-2">
              {(() => {
                const classStudents = students.filter((s) => s.classRoom === batchClass && s.activeStatus !== 'Non-Aktif');
                if (classStudents.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada siswa aktif ditemukan di {batchClass}. Pastikan data siswa sudah diinput di menu Data Siswa.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 w-10 text-center">No</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5 w-28 text-center">Nilai (0-100)</th>
                        <th className="p-2.5 w-40">Predikat Otomatis</th>
                        <th className="p-2.5">Catatan (Opsional)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {classStudents.map((st, idx) => {
                        const currentScore = batchScores[st.id]?.score ?? 85;
                        const currentNotes = batchScores[st.id]?.notes ?? '';
                        const pred = getGradePredicate(currentScore);

                        return (
                          <tr key={st.id} className="hover:bg-slate-800/30">
                            <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-100">{st.name}</td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={currentScore}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                  setBatchScores((prev) => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], score: val },
                                  }));
                                }}
                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2.5">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${pred.badgeClass}`}>
                                {pred.latin} ({pred.arabic})
                              </span>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={currentNotes}
                                onChange={(e) => {
                                  setBatchScores((prev) => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], notes: e.target.value },
                                  }));
                                }}
                                placeholder="Catatan..."
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Nilai dan predikat akan otomatis dihitung dan disimpan ke data penilaian.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBatchGrades}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Nilai Sekelas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Upload Template Excel */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Upload Nilai dari File Excel</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-indigo-200 leading-relaxed">
                <p className="font-bold mb-1">💡 Petunjuk Upload:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                  <li>Gunakan template resmi dari tombol <strong>Unduh Template</strong>.</li>
                  <li>Pastikan kolom <code>NAMA SISWA</code>, <code>TANGGAL PENILAIAN</code>, dan <code>NILAI (0-100)</code> terisi.</li>
                  <li>Predikat dan keterangan akan dihitung otomatis saat data terimpor.</li>
                </ul>
              </div>

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 p-8 rounded-2xl text-center cursor-pointer transition-colors space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-200 block">
                    Klik untuk memilih file Excel (.xlsx / .xls)
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    atau tarik file ke dalam area ini
                  </span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    downloadNilaiHarianTemplate(
                      students,
                      selectedSubject !== 'Semua' ? selectedSubject : 'Al-Qur\'an Hadits',
                      selectedClass !== 'Semua' ? selectedClass : 'Kelas 1'
                    );
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template Dulu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title="Hapus Nilai Siswa"
        message={`Apakah Anda yakin ingin menghapus data nilai "${deleteConfirmTarget?.taskTitle}" milik siswa ${deleteConfirmTarget?.studentName} (${deleteConfirmTarget?.date})?`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDeleteSingle}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        title="Hapus Nilai Terpilih"
        message={`Apakah Anda yakin ingin menghapus sekaligus ${selectedIds.length} data nilai harian yang dicentang?`}
        confirmText="Ya, Hapus Semua Terpilih"
        cancelText="Batal"
        type="danger"
        onConfirm={executeBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />

      {/* Clear All Confirm Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        title="Kosongkan Semua Nilai Harian"
        message="Apakah Anda yakin ingin menghapus seluruh data nilai harian yang tampil? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Kosongkan"
        cancelText="Batal"
        type="danger"
        onConfirm={executeClearAll}
        onCancel={() => setShowClearAllConfirm(false)}
      />
    </div>
  );
};
