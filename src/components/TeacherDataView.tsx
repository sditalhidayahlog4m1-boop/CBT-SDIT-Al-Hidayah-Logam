import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Download, Upload, Search, UserCheck, Phone, MapPin, Calendar, Briefcase, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Teacher } from '../types';
import { downloadGuruTemplate } from '../utils/exportImport';
import * as XLSX from 'xlsx';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';

// Helper to convert Excel date numbers / JS Date / ISO strings into DD/MM/YYYY format
function parseExcelDateValue(val: any): string {
  if (val === undefined || val === null || val === '') return '';

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

  if (val instanceof Date) {
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const yyyy = val.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const str = String(val).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const datePart = str.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return str;
}

interface TeacherDataViewProps {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
}

const JABATAN_OPTIONS = [
  'Kepala Sekolah',
  'Guru',
  'Guru Inklusi',
  'Guru Pendamping',
  'TAS (Tenaga Administrasi Sekolah)',
  'Lainnya',
];

export const TeacherDataView: React.FC<TeacherDataViewProps> = ({ teachers, setTeachers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Teacher, 'id'>>({
    name: '',
    gender: 'L',
    birthPlace: '',
    birthDate: '',
    position: 'Guru',
    subject: '',
    nik: '',
    nuptk: '',
    address: '',
    phone: '',
    activeStatus: 'Aktif',
  });

  const filtered = teachers.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (t.name || '').toLowerCase().includes(term) ||
      (t.subject || '').toLowerCase().includes(term) ||
      (t.position || '').toLowerCase().includes(term) ||
      (t.nik || '').includes(term) ||
      (t.nuptk || '').includes(term) ||
      (t.phone || '').includes(term) ||
      (t.address || '').toLowerCase().includes(term);

    const matchesJabatan =
      filterJabatan === 'Semua' || t.position === filterJabatan;

    return matchesSearch && matchesJabatan;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      gender: 'L',
      birthPlace: '',
      birthDate: '',
      position: 'Guru',
      subject: '',
      nik: '',
      nuptk: '',
      address: '',
      phone: '',
      activeStatus: 'Aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setFormData({
      name: teacher.name || '',
      gender: teacher.gender || 'L',
      birthPlace: teacher.birthPlace || '',
      birthDate: teacher.birthDate ? parseExcelDateValue(teacher.birthDate) : '',
      position: teacher.position || 'Guru',
      subject: teacher.subject || '',
      nik: teacher.nik || '',
      nuptk: teacher.nuptk || '',
      address: teacher.address || '',
      phone: teacher.phone || '',
      activeStatus: teacher.activeStatus || 'Aktif',
    });
    setIsModalOpen(true);
  };

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Teacher | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'selected' | 'all'>('selected');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isAllFilteredSelected = filtered.length > 0 && filtered.every((t) => selectedIds.includes(t.id));

  const toggleSelectTeacher = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filtered.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filtered.map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleOpenBulkDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteType('selected');
    setIsBulkDeleteModalOpen(true);
  };

  const handleOpenBulkDeleteAll = () => {
    if (teachers.length === 0) return;
    setBulkDeleteType('all');
    setIsBulkDeleteModalOpen(true);
  };

  const executeBulkDelete = () => {
    if (bulkDeleteType === 'all') {
      setTeachers([]);
      setSelectedIds([]);
      addToast('success', 'Seluruh data guru berhasil dihapus dari sistem.', 'Semua Data Dihapus');
    } else {
      const count = selectedIds.length;
      setTeachers((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
      setSelectedIds([]);
      addToast('success', `${count} data guru terpilih berhasil dihapus.`, 'Hapus Terpilih Berhasil');
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

  const handleDeleteClick = (teacher: Teacher) => {
    setDeleteConfirmTarget(teacher);
  };

  const executeDelete = () => {
    if (!deleteConfirmTarget) return;
    const targetName = deleteConfirmTarget.name;
    setTeachers((prev) => prev.filter((t) => t.id !== deleteConfirmTarget.id));
    setDeleteConfirmTarget(null);
    addToast('success', `Data guru ${targetName} berhasil dihapus dari sistem.`, 'Berhasil Dihapus');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subject.trim()) {
      addToast('warning', 'Nama guru dan Mata Pelajaran yang diampu wajib diisi.', 'Form Belum Lengkap');
      return;
    }

    if (editingId) {
      setTeachers((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, ...formData } : t))
      );
      addToast('success', `Data guru ${formData.name} berhasil diperbarui.`, 'Berhasil Disimpan');
    } else {
      const newTeacher: Teacher = {
        id: 'guru-' + Date.now(),
        ...formData,
      };
      setTeachers((prev) => [newTeacher, ...prev]);
      addToast('success', `Guru baru ${formData.name} berhasil ditambahkan.`, 'Berhasil Ditambah');
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

        const newTeachers: Teacher[] = rows.map((r, i) => {
          // Flexible key reader
          const getVal = (keys: string[], isDate = false): string => {
            if (!r || typeof r !== 'object') return '';
            const rowKeys = Object.keys(r);

            // 1. Exact / case-insensitive
            for (const k of keys) {
              const foundKey = rowKeys.find((rk) => rk.trim().toLowerCase() === k.trim().toLowerCase());
              if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null && String(r[foundKey]).trim() !== '') {
                return isDate ? parseExcelDateValue(r[foundKey]) : String(r[foundKey]).trim();
              }
            }

            // 2. Partial
            for (const k of keys) {
              const foundKey = rowKeys.find((rk) => rk.trim().toLowerCase().includes(k.trim().toLowerCase()));
              if (foundKey && r[foundKey] !== undefined && r[foundKey] !== null && String(r[foundKey]).trim() !== '') {
                return isDate ? parseExcelDateValue(r[foundKey]) : String(r[foundKey]).trim();
              }
            }

            // 3. Fallback date
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

          const name = getVal(['NAMA', 'Nama', 'name', 'NAMA LENGKAP']) || `Guru ${i + 1}`;
          const gender = getVal(['JENIS KELAMIN', 'JenisKelamin', 'JK', 'gender']).toUpperCase().startsWith('P') ? 'P' : 'L';
          const birthPlace = getVal(['TEMPAT LAHIR', 'TempatLahir', 'birthPlace', 'TEMPAT']);
          const birthDate = getVal(['TANGGAL LAHIR (DD/MM/YYYY)', 'TANGGAL LAHIR', 'TanggalLahir', 'birthDate', 'TGL LAHIR', 'DOB'], true);
          const position = getVal(['JABATAN', 'Jabatan', 'position']) || 'Guru';
          const subject = getVal(['MAPEL YANG DIAMPU', 'MAPEL', 'MataPelajaran', 'subject']) || 'Umum';
          const nik = getVal(['NO NIK', 'NIK', 'nik']);
          const nuptk = getVal(['NUPTK', 'nuptk']);
          const address = getVal(['ALAMAT RUMAH/YANG DITEMPATI', 'ALAMAT RUMAH', 'ALAMAT', 'address']);
          const phone = getVal(['NO HP / WA YANG AKTIF', 'NO HP', 'TELEPON', 'Telepon', 'phone']);
          const activeStatus = getVal(['STATUS KEAKTIFAN', 'STATUS', 'activeStatus']) || 'Aktif';

          return {
            id: 'guru-imp-' + Date.now() + '-' + i,
            name,
            gender,
            birthPlace,
            birthDate,
            position,
            subject,
            nik,
            nuptk,
            address,
            phone,
            activeStatus: activeStatus.toLowerCase().includes('non') ? 'Non-Aktif' : 'Aktif',
          };
        });

        setTeachers((prev) => [...newTeachers, ...prev]);
        addToast('success', `Berhasil mengimpor ${newTeachers.length} data guru dari file Excel!`, 'Import Berhasil');
      } catch (err) {
        addToast('error', 'Gagal membaca file Excel data guru. Pastikan format kolom sesuai template.', 'Import Gagal');
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
              <UserCheck className="w-3.5 h-3.5 text-slate-950" />
              <span>Template Master Data Guru & Pengajar</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-slate-950 leading-snug">
              Manajemen Data Guru (CBT System)
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-900/90 font-medium leading-tight">
              Kelola profil guru, jabatan, mata pelajaran yang diampu, NIK, NUPTK, alamat, kontak WhatsApp aktif, serta status keaktifan secara terpusat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={downloadGuruTemplate}
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
              <span>Tambah Guru Baru</span>
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
            placeholder="Cari nama guru, mapel, NIK, NUPTK, HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Filter Jabatan:</span>
          <select
            value={filterJabatan}
            onChange={(e) => setFilterJabatan(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="Semua">Semua Jabatan</option>
            {JABATAN_OPTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
          <div className="text-xs text-slate-300 font-extrabold px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-1.5">
            <span>Total:</span>
            <span className="text-amber-400 font-black">{filtered.length}</span>
            <span className="text-slate-400">Guru</span>
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

          {teachers.length > 0 && (
            <button
              onClick={handleOpenBulkDeleteAll}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Hapus Seluruh Data Guru di Sistem"
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
                    title="Pilih / Batalkan Semua Data Guru"
                  />
                </th>
                <th className="p-4 w-10 text-center">NO</th>
                <th className="p-4 min-w-[200px]">NAMA GURU</th>
                <th className="p-4 text-center w-24">JENIS KELAMIN</th>
                <th className="p-4 min-w-[160px]">TEMPAT & TANGGAL LAHIR</th>
                <th className="p-4 min-w-[150px]">JABATAN</th>
                <th className="p-4 min-w-[180px]">MAPEL YANG DIAMPU</th>
                <th className="p-4 min-w-[160px]">NO NIK & NUPTK</th>
                <th className="p-4 min-w-[200px]">ALAMAT RUMAH</th>
                <th className="p-4 min-w-[150px]">NO HP / WA AKTIF</th>
                <th className="p-4 text-center w-28">STATUS KEAKTIFAN</th>
                <th className="p-4 text-center w-20">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
              {filtered.map((teacher, idx) => {
                const isSelected = selectedIds.includes(teacher.id);
                return (
                  <tr
                    key={teacher.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTeacher(teacher.id)}
                        className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-center font-black text-amber-400/80">{idx + 1}</td>
                  
                  {/* Nama */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-black shrink-0 border border-amber-400/30 shadow-sm">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-100 text-sm">{teacher.name}</div>
                        {teacher.nip && <div className="text-[10px] text-slate-400 font-mono">NIP: {teacher.nip}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Jenis Kelamin */}
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black ${
                      teacher.gender === 'P' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {teacher.gender === 'P' ? 'P (Perempuan)' : 'L (Laki-laki)'}
                    </span>
                  </td>

                  {/* Tempat, Tgl Lahir */}
                  <td className="p-4">
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-200">{teacher.birthPlace || '-'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{teacher.birthDate || '-'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Jabatan */}
                  <td className="p-4">
                    <span className="font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg text-[11px] border border-amber-400/20 inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                      <span>{teacher.position || 'Guru'}</span>
                    </span>
                  </td>

                  {/* Mapel yang Diampu */}
                  <td className="p-4">
                    <div className="font-bold text-slate-100 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 inline-block">
                      {teacher.subject}
                    </div>
                  </td>

                  {/* NIK & NUPTK */}
                  <td className="p-4 font-mono text-[11px] space-y-0.5">
                    <div className="text-slate-200">NIK: <strong className="text-slate-100">{teacher.nik || '-'}</strong></div>
                    <div className="text-slate-400">NUPTK: {teacher.nuptk || '-'}</div>
                  </td>

                  {/* Alamat */}
                  <td className="p-4">
                    <div className="flex items-start gap-1.5 text-slate-300 max-w-[220px] leading-relaxed text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-medium" title={teacher.address}>
                        {teacher.address || '-'}
                      </span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="p-4 font-mono">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {teacher.phone ? (
                        <a
                          href={`https://wa.me/${teacher.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                        >
                          {teacher.phone}
                        </a>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>

                  {/* Status Keaktifan */}
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      teacher.activeStatus === 'Non-Aktif'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {teacher.activeStatus === 'Non-Aktif' ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>{teacher.activeStatus || 'Aktif'}</span>
                    </span>
                  </td>

                  {/* Aksi */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(teacher)}
                        className="p-2 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700 shadow-sm"
                        title="Edit Guru"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(teacher)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all cursor-pointer border border-rose-500/30 shadow-sm"
                        title="Hapus Guru"
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
                    <UserCheck className="w-10 h-10 mx-auto text-amber-400/60" />
                    <p className="font-bold text-slate-300 text-sm">Tidak ditemukan data guru.</p>
                    <p className="text-xs text-slate-400">Silakan tambah guru baru atau gunakan fitur Import Excel.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0f172a] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                {editingId ? 'Edit Data Guru' : 'Tambah Data Guru Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Row 1: Nama & Jenis Kelamin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    NAMA LENGKAP GURU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    JENIS KELAMIN *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Tempat Lahir & Tanggal Lahir */}
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
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    TANGGAL LAHIR (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 15/01/1985"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Jabatan & Mapel yang Diampu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    JABATAN *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                    <option value="Guru">Guru</option>
                    <option value="Guru Inklusi">Guru Inklusi</option>
                    <option value="Guru Pendamping">Guru Pendamping</option>
                    <option value="TAS (Tenaga Administrasi Sekolah)">TAS (Tenaga Administrasi)</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    MAPEL YANG DIAMPU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Matematika, Bahasa Indonesia"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: NIK & NUPTK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NO NIK
                  </label>
                  <input
                    type="text"
                    placeholder="16 digit NIK..."
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NUPTK
                  </label>
                  <input
                    type="text"
                    placeholder="16 digit NUPTK..."
                    value={formData.nuptk}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 5: Alamat & No HP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    ALAMAT RUMAH / YANG DITEMPATI
                  </label>
                  <input
                    type="text"
                    placeholder="Jl. Mawar No. 12, RT 01/RW 02..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NO HP / WA YANG AKTIF
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 6: Status Keaktifan */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  STATUS KEAKTIFAN
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="activeStatus"
                      value="Aktif"
                      checked={formData.activeStatus === 'Aktif'}
                      onChange={() => setFormData({ ...formData, activeStatus: 'Aktif' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-emerald-400">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="activeStatus"
                      value="Non-Aktif"
                      checked={formData.activeStatus === 'Non-Aktif'}
                      onChange={() => setFormData({ ...formData, activeStatus: 'Non-Aktif' })}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-rose-400">Non-Aktif</span>
                  </label>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal Single Delete */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title="Hapus Data Guru"
        message={`Apakah Anda yakin ingin menghapus data guru "${deleteConfirmTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Guru"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Confirmation Modal Bulk Delete */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title={bulkDeleteType === 'all' ? 'Hapus Seluruh Data Guru' : 'Hapus Data Guru Terpilih'}
        message={
          bulkDeleteType === 'all'
            ? `Apakah Anda benar-benar yakin ingin menghapus SELURUH ${teachers.length} data guru? Seluruh data guru akan dihapus permanen.`
            : `Apakah Anda yakin ingin menghapus ${selectedIds.length} data guru yang Anda pilih?`
        }
        confirmText={bulkDeleteType === 'all' ? 'Ya, Hapus Seluruh Data Guru' : `Ya, Hapus ${selectedIds.length} Guru`}
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
