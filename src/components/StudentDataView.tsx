import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Download, Upload, Search, GraduationCap, Phone, MapPin, Calendar, Users, CheckCircle2, XCircle } from 'lucide-react';
import { Student } from '../types';
import { downloadSiswaTemplate } from '../utils/exportImport';
import * as XLSX from 'xlsx';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';

// Helper to convert Excel date numbers / JS Date / ISO strings into DD/MM/YYYY format
function parseExcelDateValue(val: any): string {
  if (val === undefined || val === null || val === '') return '';

  // Handle Excel serial date number (e.g., 39204)
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const dd = String(parsed.d).padStart(2, '0');
        const mm = String(parsed.m).padStart(2, '0');
        const yyyy = parsed.y;
        return `${dd}/${mm}/${yyyy}`;
      }
    } catch (e) {
      // fallback
    }
  }

  // Handle JS Date object
  if (val instanceof Date) {
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const yyyy = val.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const str = String(val).trim();

  // Handle ISO YYYY-MM-DD or YYYY-MM-DDT00:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const datePart = str.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return str;
}

interface StudentDataViewProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

export const StudentDataView: React.FC<StudentDataViewProps> = ({ students, setStudents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    nis: '',
    nisn: '',
    name: '',
    gender: 'L',
    birthPlace: '',
    birthDate: '',
    fatherName: '',
    motherName: '',
    address: '',
    fatherPhone: '',
    motherPhone: '',
    classRoom: '',
    academicYear: '2024/2025',
    activeStatus: 'Aktif',
    active: true,
  });

  // Extract unique classes for filter
  const classList = Array.from(new Set(students.map((s) => s.classRoom).filter(Boolean)));

  const filtered = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(term) ||
      (s.nis || '').includes(term) ||
      (s.nisn || '').includes(term) ||
      (s.classRoom || '').toLowerCase().includes(term) ||
      (s.fatherName || '').toLowerCase().includes(term) ||
      (s.motherName || '').toLowerCase().includes(term) ||
      (s.address || '').toLowerCase().includes(term) ||
      (s.fatherPhone || '').includes(term) ||
      (s.motherPhone || '').includes(term);

    const matchesClass = filterClass === 'Semua' || s.classRoom === filterClass;
    const matchesStatus = filterStatus === 'Semua' || (s.activeStatus || 'Aktif') === filterStatus;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      nis: '',
      nisn: '',
      name: '',
      gender: 'L',
      birthPlace: '',
      birthDate: '',
      fatherName: '',
      motherName: '',
      address: '',
      fatherPhone: '',
      motherPhone: '',
      classRoom: '',
      academicYear: '2024/2025',
      activeStatus: 'Aktif',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      nis: student.nis || '',
      nisn: student.nisn || '',
      name: student.name || '',
      gender: student.gender || 'L',
      birthPlace: student.birthPlace || '',
      birthDate: student.birthDate ? parseExcelDateValue(student.birthDate) : '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      address: student.address || '',
      fatherPhone: student.fatherPhone || '',
      motherPhone: student.motherPhone || '',
      classRoom: student.classRoom || '',
      academicYear: student.academicYear || '2024/2025',
      activeStatus: student.activeStatus || 'Aktif',
      active: student.activeStatus !== 'Non-Aktif',
    });
    setIsModalOpen(true);
  };

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'selected' | 'all'>('selected');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isAllFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.includes(s.id));

  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filtered.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filtered.map((s) => s.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleOpenBulkDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteType('selected');
    setIsBulkDeleteModalOpen(true);
  };

  const handleOpenBulkDeleteAll = () => {
    if (students.length === 0) return;
    setBulkDeleteType('all');
    setIsBulkDeleteModalOpen(true);
  };

  const executeBulkDelete = () => {
    if (bulkDeleteType === 'all') {
      setStudents([]);
      setSelectedIds([]);
      addToast('success', 'Seluruh data siswa berhasil dihapus dari sistem.', 'Semua Data Dihapus');
    } else {
      const count = selectedIds.length;
      setStudents((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      addToast('success', `${count} data siswa terpilih berhasil dihapus.`, 'Hapus Terpilih Berhasil');
    }
    setIsBulkDeleteModalOpen(false);
  };

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

  const handleDeleteClick = (student: Student) => {
    setDeleteConfirmTarget(student);
  };

  const executeDelete = () => {
    if (!deleteConfirmTarget) return;
    const targetName = deleteConfirmTarget.name;
    setStudents((prev) => prev.filter((s) => s.id !== deleteConfirmTarget.id));
    setDeleteConfirmTarget(null);
    addToast('success', `Data siswa ${targetName} berhasil dihapus dari sistem.`, 'Berhasil Dihapus');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.classRoom.trim()) {
      addToast('warning', 'Nama siswa dan Kelas wajib diisi.', 'Form Belum Lengkap');
      return;
    }

    if (editingId) {
      setStudents((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...formData } : s))
      );
      addToast('success', `Data siswa ${formData.name} berhasil diperbarui.`, 'Berhasil Disimpan');
    } else {
      const newStudent: Student = {
        id: 'sis-' + Date.now(),
        ...formData,
      };
      setStudents((prev) => [newStudent, ...prev]);
      addToast('success', `Siswa baru ${formData.name} berhasil ditambahkan.`, 'Berhasil Ditambah');
    }
    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        const newStudents: Student[] = rows.map((r, i) => {
          // Flexible key reader with case-insensitivity & partial match
          const getVal = (keys: string[], isDate = false): string => {
            if (!r || typeof r !== 'object') return '';
            const rowKeys = Object.keys(r);

            // 1. Exact / case-insensitive match
            for (const k of keys) {
              const foundKey = rowKeys.find((rk) => rk.trim().toLowerCase() === k.trim().toLowerCase());
              if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null && String(r[foundKey]).trim() !== '') {
                return isDate ? parseExcelDateValue(r[foundKey]) : String(r[foundKey]).trim();
              }
            }

            // 2. Partial match
            for (const k of keys) {
              const foundKey = rowKeys.find((rk) => rk.trim().toLowerCase().includes(k.trim().toLowerCase()));
              if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null && String(r[foundKey]).trim() !== '') {
                return isDate ? parseExcelDateValue(r[foundKey]) : String(r[foundKey]).trim();
              }
            }

            // 3. Fallback for date fields
            if (isDate) {
              const dateKey = rowKeys.find((rk) => {
                const u = rk.toUpperCase();
                return (u.includes('LAHIR') || u.includes('BIRTH') || u.includes('DOB') || u.includes('TGL')) && !u.includes('TEMPAT');
              });
              if (dateKey && r[dateKey] !== undefined && r[dateKey] !== null && String(r[dateKey]).trim() !== '') {
                return parseExcelDateValue(r[dateKey]);
              }
            }

            return '';
          };

          const nis = getVal(['NIS', 'nis', 'Nis']);
          const nisn = getVal(['NISN', 'nisn', 'Nisn']) || '008' + (100000 + i);
          const name = getVal(['NAMA LENGKAP', 'Nama Lengkap', 'NAMA', 'Nama', 'name', 'Nama Siswa']) || `Siswa ${i + 1}`;
          const gender = getVal(['JK', 'JENIS KELAMIN', 'Jenis Kelamin', 'gender']).toUpperCase().startsWith('P') ? 'P' : 'L';
          const birthPlace = getVal(['TEMPAT LAHIR', 'Tempat Lahir', 'TempatLahir', 'birthPlace', 'TEMPAT']);
          const birthDate = getVal(['TANGGAL LAHIR (DD/MM/YYYY)', 'TANGGAL LAHIR', 'Tanggal Lahir', 'TGL LAHIR', 'Tgl Lahir', 'TanggalLahir', 'birthDate', 'DOB', 'TGL'], true);
          const fatherName = getVal(['NAMA AYAH', 'Nama Ayah', 'fatherName', 'AYAH']);
          const motherName = getVal(['NAMA IBU', 'Nama Ibu', 'motherName', 'IBU']);
          const address = getVal(['ALAMAT LENGKAP', 'Alamat Lengkap', 'ALAMAT', 'Alamat', 'address']);
          const fatherPhone = getVal(['NO HP AYAH', 'No Hp Ayah', 'fatherPhone', 'HP AYAH', 'WA AYAH']);
          const motherPhone = getVal(['NO HP IBU', 'No Hp Ibu', 'motherPhone', 'HP IBU', 'WA IBU']);
          const classRoom = getVal(['KELAS', 'Kelas', 'classRoom']) || 'Umum';
          const academicYear = getVal(['TAHUN AJARAN', 'Tahun Ajaran', 'academicYear']) || '2024/2025';
          const activeStatus = getVal(['STATUS', 'Status', 'activeStatus']) || 'Aktif';

          return {
            id: 'sis-imp-' + Date.now() + '-' + i,
            nis,
            nisn,
            name,
            gender,
            birthPlace,
            birthDate,
            fatherName,
            motherName,
            address,
            fatherPhone,
            motherPhone,
            classRoom,
            academicYear,
            activeStatus: activeStatus.toLowerCase().includes('non') ? 'Non-Aktif' : activeStatus,
            active: !activeStatus.toLowerCase().includes('non'),
          };
        });

        setStudents((prev) => [...newStudents, ...prev]);
        addToast('success', `Berhasil mengimpor ${newStudents.length} data siswa dari file Excel!`, 'Import Berhasil');
      } catch (err) {
        addToast('error', 'Gagal membaca file Excel data siswa. Pastikan format kolom sesuai template.', 'Import Gagal');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card - Yellow Accent Theme */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-3.5 sm:p-4 md:p-5 text-slate-950 shadow-xl relative overflow-hidden border border-amber-300/60">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/20 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <GraduationCap className="w-3.5 h-3.5 text-slate-950" />
              <span>Template Master Data Siswa Terdaftar</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-slate-950 leading-snug">
              Manajemen Data Siswa (CBT System)
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-900/90 font-medium leading-tight">
              Kelola NIS, NISN, data orang tua (Ayah & Ibu), alamat lengkap, kontak WhatsApp orang tua, kelas, tahun ajaran, serta status keaktifan siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={downloadSiswaTemplate}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-105"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download Template Excel</span>
            </button>

            <label className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-900 text-emerald-300 border border-slate-950/30 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-lg hover:scale-105">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import Data Excel</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-amber-300 hover:bg-amber-200 text-slate-950 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xl transition-all cursor-pointer hover:scale-105"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Tambah Siswa Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0b132b] p-4 rounded-3xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-amber-400" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, NISN, ortu, HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Kelas:</span>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="Semua">Semua Kelas</option>
            {classList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <span className="text-xs font-bold text-slate-300 whitespace-nowrap ml-1">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Non-Aktif">Non-Aktif</option>
            <option value="Lulus">Lulus</option>
          </select>

          <div className="text-xs text-slate-300 font-extrabold px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-1.5">
            <span>Total:</span>
            <span className="text-amber-400 font-black">{filtered.length}</span>
            <span className="text-slate-400">Siswa</span>
          </div>

          {/* Bulk Delete Buttons */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleOpenBulkDeleteSelected}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/30 cursor-pointer animate-fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          )}

          {students.length > 0 && (
            <button
              onClick={handleOpenBulkDeleteAll}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Hapus Seluruh Data Siswa di Sistem"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#0b132b] rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/90 text-amber-300 font-black uppercase tracking-wider border-b border-amber-500/20">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950 cursor-pointer"
                    title="Pilih / Batalkan Semua Data Siswa"
                  />
                </th>
                <th className="p-4 w-10 text-center">NO</th>
                <th className="p-4 min-w-[130px]">NIS & NISN</th>
                <th className="p-4 min-w-[200px]">NAMA LENGKAP SISWA</th>
                <th className="p-4 text-center w-16">JK</th>
                <th className="p-4 min-w-[160px]">TEMPAT & TANGGAL LAHIR</th>
                <th className="p-4 min-w-[180px]">NAMA AYAH & IBU</th>
                <th className="p-4 min-w-[200px]">ALAMAT LENGKAP</th>
                <th className="p-4 min-w-[170px]">NO HP AYAH & IBU</th>
                <th className="p-4 min-w-[160px]">KELAS & TAHUN AJARAN</th>
                <th className="p-4 text-center w-24">STATUS</th>
                <th className="p-4 text-center w-20">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
              {filtered.map((student, idx) => {
                const isSelected = selectedIds.includes(student.id);
                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStudent(student.id)}
                        className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-center font-black text-amber-400/80">{idx + 1}</td>

                  {/* NIS & NISN */}
                  <td className="p-4 font-mono text-[11px] space-y-0.5">
                    <div className="text-amber-300 font-bold">NIS: {student.nis || '-'}</div>
                    <div className="text-slate-400">NISN: {student.nisn || '-'}</div>
                  </td>

                  {/* Nama Lengkap */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-black shrink-0 border border-amber-400/30 shadow-sm">
                        {student.name.charAt(0)}
                      </div>
                      <span className="font-extrabold text-slate-100 text-sm">{student.name}</span>
                    </div>
                  </td>

                  {/* JK */}
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black ${
                      student.gender === 'P' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {student.gender === 'P' ? 'P' : 'L'}
                    </span>
                  </td>

                  {/* Tempat, Tgl Lahir */}
                  <td className="p-4">
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-200">{student.birthPlace || '-'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{student.birthDate || '-'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Orang Tua */}
                  <td className="p-4 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Ayah: <strong className="text-slate-100">{student.fatherName || '-'}</strong></span>
                    </div>
                    <div className="text-slate-400 pl-5">
                      Ibu: <strong className="text-slate-200">{student.motherName || '-'}</strong>
                    </div>
                  </td>

                  {/* Alamat Lengkap */}
                  <td className="p-4">
                    <div className="flex items-start gap-1.5 text-slate-300 max-w-[220px] leading-relaxed text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-medium" title={student.address}>
                        {student.address || '-'}
                      </span>
                    </div>
                  </td>

                  {/* No HP Ortu */}
                  <td className="p-4 font-mono text-[11px] space-y-1">
                    {student.fatherPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-slate-400 text-[10px]">Ayah:</span>
                        <a
                          href={`https://wa.me/${student.fatherPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                        >
                          {student.fatherPhone}
                        </a>
                      </div>
                    )}
                    {student.motherPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-pink-400 shrink-0" />
                        <span className="text-slate-400 text-[10px]">Ibu:</span>
                        <a
                          href={`https://wa.me/${student.motherPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-pink-400 font-bold bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20"
                        >
                          {student.motherPhone}
                        </a>
                      </div>
                    )}
                    {!student.fatherPhone && !student.motherPhone && <span className="text-slate-500">-</span>}
                  </td>

                  {/* Kelas & Tahun Ajaran */}
                  <td className="p-4 space-y-1">
                    <div className="font-extrabold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 inline-block text-[11px]">
                      {student.classRoom}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">Thn: {student.academicYear || '2024/2025'}</div>
                  </td>

                  {/* Status */}
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      student.activeStatus === 'Non-Aktif'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : student.activeStatus === 'Lulus'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {student.activeStatus === 'Non-Aktif' ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>{student.activeStatus || 'Aktif'}</span>
                    </span>
                  </td>

                  {/* Aksi */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(student)}
                        className="p-2 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700 shadow-sm"
                        title="Edit Siswa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(student)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all cursor-pointer border border-rose-500/30 shadow-sm"
                        title="Hapus Siswa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-500 space-y-2">
                    <GraduationCap className="w-10 h-10 mx-auto text-amber-400/60" />
                    <p className="font-bold text-slate-300 text-sm">Tidak ditemukan data siswa.</p>
                    <p className="text-xs text-slate-400">Silakan tambah siswa baru atau gunakan fitur Import Excel.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                {editingId ? 'Edit Data Siswa' : 'Tambah Data Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Row 1: NIS, NISN & Nama Lengkap */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1001"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0081234567"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    JENIS KELAMIN (JK) *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Nama Lengkap */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  NAMA LENGKAP SISWA *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Aditya Pratama"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Row 3: Tempat Lahir & Tanggal Lahir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    TEMPAT LAHIR
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jakarta"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    TANGGAL LAHIR (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 12/05/2007"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Nama Ayah & Nama Ibu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NAMA AYAH
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bambang Pratama"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NAMA IBU
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Siti Aminah"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: No HP Ayah & No HP Ibu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NO HP AYAH
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081298765432"
                    value={formData.fatherPhone}
                    onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NO HP IBU
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081387654321"
                    value={formData.motherPhone}
                    onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 6: Alamat Lengkap */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  ALAMAT LENGKAP
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Mawar No. 10, RT 02/RW 05..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Row 7: Kelas, Tahun Ajaran, & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    KELAS *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 6 Abu Bakar As Siddiq, 6 A, dll."
                    value={formData.classRoom}
                    onChange={(e) => setFormData({ ...formData, classRoom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    TAHUN AJARAN
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 2024/2025"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    STATUS
                  </label>
                  <select
                    value={formData.activeStatus}
                    onChange={(e) => setFormData({ ...formData, activeStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal Single Delete */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title="Hapus Data Siswa"
        message={`Apakah Anda yakin ingin menghapus data siswa "${deleteConfirmTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Siswa"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Confirmation Modal Bulk Delete */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title={bulkDeleteType === 'all' ? 'Hapus Seluruh Data Siswa' : 'Hapus Data Siswa Terpilih'}
        message={
          bulkDeleteType === 'all'
            ? `Apakah Anda benar-benar yakin ingin menghapus SELURUH ${students.length} data siswa? Seluruh data siswa akan dihapus permanen.`
            : `Apakah Anda yakin ingin menghapus ${selectedIds.length} data siswa yang Anda pilih?`
        }
        confirmText={bulkDeleteType === 'all' ? 'Ya, Hapus Seluruh Data Siswa' : `Ya, Hapus ${selectedIds.length} Siswa`}
        cancelText="Batal"
        type="danger"
        onConfirm={executeBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Floating Modern Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
