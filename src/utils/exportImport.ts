import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { QuestionBank, QuestionOption, Teacher, Student, ExamResult, DailyGradeRecord } from '../types';
import { getGradePredicate, GRADE_SCALE_TABLE } from './gradeHelper';

// Download Excel Template for Upload Soal
export function downloadSoalTemplate() {
  const data = [
    {
      No: 1,
      Soal: 'Berapakah hasil dari 12 x 12?',
      A: '124',
      B: '144',
      C: '148',
      D: '164',
      E: '180',
      Jawaban: 'B',
      Pembahasan: '12 dikalikan 12 menghasilkan 144.',
    },
    {
      No: 2,
      Soal: 'Ibu kota negara Indonesia saat ini adalah...',
      A: 'Bandung',
      B: 'Surabaya',
      C: 'Jakarta / Nusantara',
      D: 'Medan',
      E: 'Makassar',
      Jawaban: 'C',
      Pembahasan: 'Ibu kota negara Indonesia adalah Jakarta/Nusantara.',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Soal');
  XLSX.writeFile(wb, 'Template_Upload_Soal_CBT.xlsx');
}

// Download Excel Template for Data Guru
export function downloadGuruTemplate() {
  const data = [
    {
      'NO': 1,
      'NAMA': 'Budi Santoso, S.Pd.',
      'JENIS KELAMIN': 'L',
      'TEMPAT LAHIR': 'Jakarta',
      'TANGGAL LAHIR (DD/MM/YYYY)': '15/01/1985',
      'JABATAN': 'Guru',
      'MAPEL YANG DIAMPU': 'Matematika Wajib',
      'NO NIK': '3171011501850001',
      'NUPTK': '1234567890123456',
      'ALAMAT RUMAH/YANG DITEMPATI': 'Jl. Mawar No. 12, Jakarta Selatan',
      'NO HP / WA YANG AKTIF': '081234567890',
      'STATUS KEAKTIFAN': 'Aktif',
    },
    {
      'NO': 2,
      'NAMA': 'Siti Rahma, M.Pd.',
      'JENIS KELAMIN': 'P',
      'TEMPAT LAHIR': 'Bandung',
      'TANGGAL LAHIR (DD/MM/YYYY)': '22/03/1990',
      'JABATAN': 'Guru Inklusi',
      'MAPEL YANG DIAMPU': 'Bahasa Inggris',
      'NO NIK': '3273022203900002',
      'NUPTK': '2345678901234567',
      'ALAMAT RUMAH/YANG DITEMPATI': 'Jl. Melati No. 45, Bandung',
      'NO HP / WA YANG AKTIF': '082198765432',
      'STATUS KEAKTIFAN': 'Aktif',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 25 }, // NAMA
    { wch: 16 }, // JENIS KELAMIN
    { wch: 18 }, // TEMPAT LAHIR
    { wch: 30 }, // TANGGAL LAHIR (DD/MM/YYYY)
    { wch: 18 }, // JABATAN
    { wch: 24 }, // MAPEL YANG DIAMPU
    { wch: 22 }, // NO NIK
    { wch: 20 }, // NUPTK
    { wch: 38 }, // ALAMAT RUMAH/YANG DITEMPATI
    { wch: 26 }, // NO HP / WA YANG AKTIF
    { wch: 20 }, // STATUS KEAKTIFAN
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Data Guru');
  XLSX.writeFile(wb, 'Template_Data_Guru.xlsx');
}

// Download Excel Template for Data Siswa
export function downloadSiswaTemplate() {
  const data = [
    {
      'NO': 1,
      'NIS': '1001',
      'NISN': '0081234567',
      'NAMA LENGKAP': 'Aditya Pratama',
      'JK': 'L',
      'TEMPAT LAHIR': 'Jakarta',
      'TANGGAL LAHIR (DD/MM/YYYY)': '12/05/2006',
      'NAMA AYAH': 'Bambang S.',
      'NAMA IBU': 'Siti Aminah',
      'ALAMAT LENGKAP': 'Jl. Mawar No. 5, Jakarta Selatan',
      'NO HP AYAH': '081298765432',
      'NO HP IBU': '081387654321',
      'KELAS': '6 Abu Bakar As Siddiq',
      'TAHUN AJARAN': '2024/2025',
      'STATUS': 'Aktif',
    },
    {
      'NO': 2,
      'NIS': '1002',
      'NISN': '0081234568',
      'NAMA LENGKAP': 'Anisa Putri',
      'JK': 'P',
      'TEMPAT LAHIR': 'Bandung',
      'TANGGAL LAHIR (DD/MM/YYYY)': '24/08/2006',
      'NAMA AYAH': 'Heri Herman',
      'NAMA IBU': 'Rina Kartika',
      'ALAMAT LENGKAP': 'Jl. Anggrek No. 10, Bandung',
      'NO HP AYAH': '082123456789',
      'NO HP IBU': '082234567890',
      'KELAS': '6 Abu Bakar As Siddiq',
      'TAHUN AJARAN': '2024/2025',
      'STATUS': 'Aktif',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 12 }, // NIS
    { wch: 16 }, // NISN
    { wch: 24 }, // NAMA LENGKAP
    { wch: 8 },  // JK
    { wch: 18 }, // TEMPAT LAHIR
    { wch: 30 }, // TANGGAL LAHIR (DD/MM/YYYY)
    { wch: 22 }, // NAMA AYAH
    { wch: 22 }, // NAMA IBU
    { wch: 38 }, // ALAMAT LENGKAP
    { wch: 18 }, // NO HP AYAH
    { wch: 18 }, // NO HP IBU
    { wch: 24 }, // KELAS
    { wch: 18 }, // TAHUN AJARAN
    { wch: 14 }, // STATUS
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Data Siswa');
  XLSX.writeFile(wb, 'Template_Data_Siswa.xlsx');
}

// Parse uploaded Excel file for Soal
export async function parseSoalExcel(file: File): Promise<{
  title: string;
  questions: any[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        const questions = jsonRows.map((row, idx) => {
          const correctLetter = (row.Jawaban || row.jawaban || 'A').toString().trim().toUpperCase();
          const options: QuestionOption[] = [];

          const letters = ['A', 'B', 'C', 'D', 'E'];
          letters.forEach((lettr) => {
            const val = row[lettr] || row[lettr.toLowerCase()];
            if (val !== undefined && val !== null && val.toString().trim() !== '') {
              options.push({
                option_letter: lettr,
                option_text: val.toString().trim(),
                is_correct: lettr === correctLetter,
              });
            }
          });

          return {
            id: 'q-up-' + (idx + 1) + '-' + Date.now(),
            question_number: idx + 1,
            question_text: row.Soal || row.soal || row.Pertanyaan || `Soal Nomor ${idx + 1}`,
            options: options,
            explanation: row.Pembahasan || row.pembahasan || 'Pembahasan belum tersedia.',
          };
        });

        resolve({
          title: file.name.replace(/\.[^/.]+$/, ''),
          questions,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Export Bank Soal / Answers to Excel
export function exportBankToExcel(bank: QuestionBank) {
  const exportRows = bank.questions.map((q) => {
    const correctOpt = q.options.find((o) => o.is_correct);
    const rowObj: any = {
      No: q.question_number,
      Soal: q.question_text,
    };
    q.options.forEach((opt) => {
      rowObj[`Pilihan ${opt.option_letter}`] = opt.option_text;
    });
    rowObj['Kunci Jawaban'] = correctOpt ? `${correctOpt.option_letter}. ${correctOpt.option_text}` : '-';
    rowObj['Pembahasan'] = q.explanation;
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bank Soal');
  XLSX.writeFile(wb, `Bank_Soal_${bank.subject.replace(/[^a-zA-Z0-9]/g, '_')}_Token_${bank.token}.xlsx`);
}

// Export All Answer Keys to Excel
export function exportAllKunciJawabanExcel(banks: QuestionBank[]) {
  const data: any[] = [];
  banks.forEach((b) => {
    b.questions.forEach((q) => {
      const correctOpt = q.options.find((o) => o.is_correct);
      data.push({
        'Mata Pelajaran': b.subject,
        'Jenjang / Kelas': `${b.grade_level} (${b.class_room})`,
        'Token Ujian': b.token,
        'No Soal': q.question_number,
        'Pertanyaan': q.question_text,
        'Kunci Jawaban': correctOpt ? `${correctOpt.option_letter}. ${correctOpt.option_text}` : '-',
        'Pembahasan': q.explanation,
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kumpulan Kunci Jawaban');
  XLSX.writeFile(wb, 'Kumpulan_Kunci_Jawaban_CBT.xlsx');
}

// Helper to clean sheet names for Excel (max 28 chars, no special chars)
function sanitizeSheetName(name: string): string {
  let clean = name.replace(/[\\/?*\[\]:]/g, ' ').trim();
  if (clean.length > 28) {
    clean = clean.substring(0, 28);
  }
  return clean || 'Mapel';
}

// Export Exam Results to Excel with per-subject sheets & summary
export function exportExamResultsExcel(results: ExamResult[], targetSubject?: string) {
  if (!results || results.length === 0) {
    alert('Tidak ada data hasil ujian untuk di-export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Format row records
  const formatRows = (list: ExamResult[]) =>
    list.map((r, i) => ({
      'NO': i + 1,
      'TANGGAL': r.date,
      'NAMA SISWA': r.studentName,
      'KELAS': r.classRoom,
      'MATA PELAJARAN': r.subject,
      'JUDUL UJIAN': r.examTitle,
      'TOKEN': r.token,
      'NILAI AKHIR': r.score,
      'BENAR': r.correctCount,
      'SALAH': r.wrongCount,
      'TOTAL SOAL': r.totalQuestions,
      'DURASI PENGERJAAN': r.durationSpent,
      'STATUS': r.passed ? 'LULUS' : 'REMEDIAL',
    }));

  // Standard column widths
  const colWidths = [
    { wch: 6 },  // NO
    { wch: 18 }, // TANGGAL
    { wch: 28 }, // NAMA SISWA
    { wch: 18 }, // KELAS
    { wch: 24 }, // MATA PELAJARAN
    { wch: 28 }, // JUDUL UJIAN
    { wch: 12 }, // TOKEN
    { wch: 14 }, // NILAI AKHIR
    { wch: 10 }, // BENAR
    { wch: 10 }, // SALAH
    { wch: 12 }, // TOTAL SOAL
    { wch: 20 }, // DURASI
    { wch: 14 }, // STATUS
  ];

  // If a specific target subject is chosen
  if (targetSubject && targetSubject !== 'ALL') {
    const subjectResults = results.filter(
      (r) => r.subject.trim().toLowerCase() === targetSubject.trim().toLowerCase()
    );
    const dataList = subjectResults.length > 0 ? subjectResults : results;
    const data = formatRows(dataList);
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = colWidths;
    const cleanSubjectName = sanitizeSheetName(targetSubject);
    XLSX.utils.book_append_sheet(wb, ws, cleanSubjectName);
    XLSX.writeFile(wb, `Rekap_Nilai_${cleanSubjectName.replace(/\s+/g, '_')}_CBT.xlsx`);
    return;
  }

  // 1. Summary Sheet ("Rekap Semua Mapel")
  const summaryData = formatRows(results);
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap Semua Mapel');

  // 2. Individual Per-Subject Sheets
  const subjectsMap: Record<string, ExamResult[]> = {};
  results.forEach((r) => {
    const subjKey = r.subject.trim() || 'Lain-lain';
    if (!subjectsMap[subjKey]) {
      subjectsMap[subjKey] = [];
    }
    subjectsMap[subjKey].push(r);
  });

  const usedSheetNames = new Set<string>(['REKAP SEMUA MAPEL']);

  Object.entries(subjectsMap).forEach(([subjName, subjResults]) => {
    let cleanName = sanitizeSheetName(subjName);
    let uniqueName = cleanName;
    let counter = 1;
    while (usedSheetNames.has(uniqueName.toUpperCase())) {
      uniqueName = `${cleanName.substring(0, 24)} (${counter})`;
      counter++;
    }
    usedSheetNames.add(uniqueName.toUpperCase());

    const sheetData = formatRows(subjResults);
    const wsSubj = XLSX.utils.json_to_sheet(sheetData);
    wsSubj['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, wsSubj, uniqueName);
  });

  XLSX.writeFile(wb, 'Rekap_Nilai_Ujian_Per_Mapel_CBT.xlsx');
}

// Export PDF / Print Layout for Answer Keys
export function exportAnswerKeysPDF(banks: QuestionBank[]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('KUMPULAN KUNCI JAWABAN & PEMBAHASAN CBT', 14, 20);
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 28);
  
  let y = 38;
  banks.forEach((b) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Mata Pelajaran: ${b.subject} | Token: ${b.token} (${b.grade_level})`, 14, y);
    y += 8;

    b.questions.forEach((q) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const correctOpt = q.options.find((o) => o.is_correct);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Soal ${q.question_number}: ${q.question_text.slice(0, 80)}${q.question_text.length > 80 ? '...' : ''}`, 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Kunci: ${correctOpt ? correctOpt.option_letter + '. ' + correctOpt.option_text : '-'}`, 18, y);
      y += 5;
      doc.text(`Pembahasan: ${q.explanation.slice(0, 90)}`, 18, y);
      y += 8;
    });
    y += 6;
  });

  doc.save('Kumpulan_Kunci_Jawaban_CBT.pdf');
}

// Download Excel Template for Nilai Harian
export function downloadNilaiHarianTemplate(
  students: Student[] = [],
  defaultSubject: string = 'Al-Qur\'an Hadits',
  defaultClass: string = 'Kelas 1'
) {
  const sampleDate = '26/08/2026';
  
  let rows: any[] = [];
  const activeStudents = students.filter(
    (s) => (defaultClass === 'Semua' || !defaultClass || s.classRoom === defaultClass) && s.activeStatus !== 'Non-Aktif'
  );

  if (activeStudents.length > 0) {
    rows = activeStudents.map((s, idx) => ({
      'NO': idx + 1,
      'NIS': s.nis || '',
      'NISN': s.nisn || '',
      'NAMA SISWA': s.name || '',
      'KELAS': s.classRoom || defaultClass || 'Kelas 1',
      'MATA PELAJARAN': defaultSubject || 'Al-Qur\'an Hadits',
      'TANGGAL PENILAIAN (DD/MM/YYYY)': sampleDate,
      'JENIS / MATERI PENILAIAN': 'Penilaian Harian 1 (PH-1)',
      'NILAI (0-100)': idx === 0 ? 95 : idx === 1 ? 88 : idx === 2 ? 78 : 85,
      'CATATAN': 'Tuntaskan bacaan & tajwid',
    }));
  } else {
    // Sample rows
    rows = [
      {
        'NO': 1,
        'NIS': '1001',
        'NISN': '0081234567',
        'NAMA SISWA': 'Ahmad Fauzan',
        'KELAS': defaultClass || 'Kelas 1',
        'MATA PELAJARAN': defaultSubject || 'Al-Qur\'an Hadits',
        'TANGGAL PENILAIAN (DD/MM/YYYY)': sampleDate,
        'JENIS / MATERI PENILAIAN': 'Penilaian Harian 1 (PH-1)',
        'NILAI (0-100)': 95,
        'CATATAN': 'Sangat lancar dan tertib',
      },
      {
        'NO': 2,
        'NIS': '1002',
        'NISN': '0081234568',
        'NAMA SISWA': 'Siti Aisyah Putri',
        'KELAS': defaultClass || 'Kelas 1',
        'MATA PELAJARAN': defaultSubject || 'Al-Qur\'an Hadits',
        'TANGGAL PENILAIAN (DD/MM/YYYY)': sampleDate,
        'JENIS / MATERI PENILAIAN': 'Penilaian Harian 1 (PH-1)',
        'NILAI (0-100)': 88,
        'CATATAN': 'Makharijul huruf baik',
      },
      {
        'NO': 3,
        'NIS': '1003',
        'NISN': '0081234569',
        'NAMA SISWA': 'Muhammad Rizky Pratama',
        'KELAS': defaultClass || 'Kelas 1',
        'MATA PELAJARAN': defaultSubject || 'Al-Qur\'an Hadits',
        'TANGGAL PENILAIAN (DD/MM/YYYY)': sampleDate,
        'JENIS / MATERI PENILAIAN': 'Penilaian Harian 1 (PH-1)',
        'NILAI (0-100)': 76,
        'CATATAN': 'Perlu latihan hukum mad',
      },
    ];
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Template Input Nilai
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 12 }, // NIS
    { wch: 16 }, // NISN
    { wch: 30 }, // NAMA SISWA
    { wch: 16 }, // KELAS
    { wch: 28 }, // MATA PELAJARAN
    { wch: 32 }, // TANGGAL PENILAIAN
    { wch: 32 }, // JENIS / MATERI PENILAIAN
    { wch: 16 }, // NILAI (0-100)
    { wch: 32 }, // CATATAN
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai Harian');

  // Sheet 2: Petunjuk Rentang Nilai (Sesuai Standar SDIT)
  const petunjukData = GRADE_SCALE_TABLE.map((item) => ({
    'RENTANG NILAI': item.range,
    'PREDIKAT (LATIN)': item.latin,
    'PREDIKAT (ARAB)': item.arabic,
    'KETERANGAN': item.description,
  }));
  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData);
  wsPetunjuk['!cols'] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Rentang Penilaian');

  const fileName = `Template_Nilai_Harian_${(defaultSubject || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_')}_${(defaultClass || 'Semua').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Export Rekap Nilai Harian to Excel with Calculations and Predicates
export function exportNilaiHarianToExcel(
  records: DailyGradeRecord[],
  subjectName: string = 'Semua Mapel',
  classRoom: string = 'Semua Kelas',
  schoolName: string = 'SDIT Al Hidayah Logam'
) {
  const wb = XLSX.utils.book_new();

  const formattedRows = records.map((r, idx) => {
    const pred = getGradePredicate(r.score);
    return {
      'NO': idx + 1,
      'NIS': r.nis || '-',
      'NISN': r.nisn || '-',
      'NAMA SISWA': r.studentName,
      'KELAS': r.classRoom,
      'MATA PELAJARAN': r.subjectName,
      'TANGGAL PENILAIAN': r.date,
      'JENIS / MATERI': r.taskTitle,
      'NILAI': r.score,
      'PREDIKAT': pred.fullPredicate,
      'KETERANGAN': pred.description,
      'CATATAN': r.notes || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(formattedRows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 16 },
    { wch: 30 },
    { wch: 15 },
    { wch: 28 },
    { wch: 20 },
    { wch: 30 },
    { wch: 10 },
    { wch: 24 },
    { wch: 22 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai Harian');

  // Also include Scale Reference Sheet
  const petunjukData = GRADE_SCALE_TABLE.map((item) => ({
    'RENTANG NILAI': item.range,
    'PREDIKAT': item.fullPredicate,
    'KETERANGAN': item.description,
  }));
  const wsPetunjuk = XLSX.utils.json_to_sheet(petunjukData);
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Rentang Penilaian');

  const fileName = `Rekap_Nilai_Harian_${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_${classRoom.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Export Rekap Nilai Harian to PDF
export function exportNilaiHarianToPdf(
  records: DailyGradeRecord[],
  subjectName: string = 'Semua Mapel',
  classRoom: string = 'Semua Kelas',
  schoolName: string = 'SDIT Al Hidayah Logam'
) {
  const doc = new jsPDF('landscape');

  // Header Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName.toUpperCase(), 148, 16, { align: 'center' });
  doc.setFontSize(12);
  doc.text('LAPORAN REKAPITULASI PENILAIAN HARIAN SISWA', 148, 23, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mata Pelajaran : ${subjectName}   |   Kelas : ${classRoom}   |   Total Data : ${records.length} Penilaian`, 14, 32);
  doc.text(`Tanggal Cetak   : ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 282, 32, { align: 'right' });

  // Table Line
  doc.setLineWidth(0.3);
  doc.line(14, 35, 282, 35);

  let y = 43;
  // Header Row
  doc.setFillColor(240, 243, 246);
  doc.rect(14, y - 5, 268, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('NO', 16, y);
  doc.text('NAMA SISWA', 28, y);
  doc.text('KELAS', 85, y);
  doc.text('MATA PELAJARAN', 110, y);
  doc.text('TANGGAL', 160, y);
  doc.text('MATERI / TUGAS', 185, y);
  doc.text('NILAI', 230, y);
  doc.text('PREDIKAT', 245, y);
  doc.text('KETERANGAN', 270, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');

  records.forEach((r, idx) => {
    if (y > 185) {
      doc.addPage('landscape');
      y = 20;
      doc.setFillColor(240, 243, 246);
      doc.rect(14, y - 5, 268, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('NO', 16, y);
      doc.text('NAMA SISWA', 28, y);
      doc.text('KELAS', 85, y);
      doc.text('MATA PELAJARAN', 110, y);
      doc.text('TANGGAL', 160, y);
      doc.text('MATERI / TUGAS', 185, y);
      doc.text('NILAI', 230, y);
      doc.text('PREDIKAT', 245, y);
      doc.text('KETERANGAN', 270, y, { align: 'right' });
      y += 6;
      doc.setFont('helvetica', 'normal');
    }

    const pred = getGradePredicate(r.score);
    doc.text(String(idx + 1), 16, y);
    doc.text(r.studentName.slice(0, 28), 28, y);
    doc.text(r.classRoom || '-', 85, y);
    doc.text(r.subjectName.slice(0, 24), 110, y);
    doc.text(r.date || '-', 160, y);
    doc.text(r.taskTitle.slice(0, 22), 185, y);
    doc.text(String(r.score), 230, y);
    doc.text(pred.latin, 245, y);
    doc.text(pred.description, 270, y, { align: 'right' });

    y += 5.5;
  });

  // Calculate Average
  if (records.length > 0) {
    const totalScore = records.reduce((acc, r) => acc + r.score, 0);
    const avg = Math.round((totalScore / records.length) * 10) / 10;
    const avgPred = getGradePredicate(avg);

    y += 4;
    doc.setLineWidth(0.2);
    doc.line(14, y - 2, 282, y - 2);
    doc.setFont('helvetica', 'bold');
    doc.text(`RATA-RATA KESELURUHAN: ${avg}  |  Predikat: ${avgPred.fullPredicate} (${avgPred.description})`, 14, y + 3);
  }

  doc.save(`Rekap_Nilai_Harian_${subjectName}_${classRoom}.pdf`);
}

