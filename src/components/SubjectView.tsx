import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, BookOpen } from 'lucide-react';
import { Subject } from '../types';
import { ConfirmModal, ToastContainer, ToastMessage } from './NotificationModal';
import { useHistoryModal } from '../utils/navigationHistory';

interface SubjectViewProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
}

export const SubjectView: React.FC<SubjectViewProps> = ({ subjects, setSubjects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Synchronize Add/Edit Mapel modal with browser history
  useHistoryModal({
    modalId: 'subject-form-modal',
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
    tab: 'mata-pelajaran',
  });

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    gradeLevel: '',
  });

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ code: '', name: '', gradeLevel: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setFormData({
      code: subject.code,
      name: subject.name,
      gradeLevel: subject.gradeLevel,
    });
    setIsModalOpen(true);
  };

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Subject | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  const handleDeleteClick = (subject: Subject) => {
    setDeleteConfirmTarget(subject);
  };

  const executeDelete = () => {
    if (!deleteConfirmTarget) return;
    const targetName = deleteConfirmTarget.name;
    setSubjects((prev) => prev.filter((s) => s.id !== deleteConfirmTarget.id));
    setDeleteConfirmTarget(null);
    addToast('success', `Mata pelajaran ${targetName} berhasil dihapus.`, 'Berhasil Dihapus');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      addToast('warning', 'Nama mata pelajaran wajib diisi.', 'Form Belum Lengkap');
      return;
    }

    if (editingId) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...formData } : s))
      );
      addToast('success', `Mata pelajaran ${formData.name} berhasil diperbarui.`, 'Berhasil Disimpan');
    } else {
      const newSubject: Subject = {
        id: 'mapel-' + Date.now(),
        code: formData.code || 'MP-' + Math.floor(100 + Math.random() * 900),
        name: formData.name,
        gradeLevel: formData.gradeLevel || 'Umum',
      };
      setSubjects((prev) => [newSubject, ...prev]);
      addToast('success', `Mata pelajaran ${formData.name} berhasil ditambahkan.`, 'Berhasil Ditambah');
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-xl border border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari mata pelajaran atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">Kode Mapel</th>
                <th className="p-3.5">Nama Mata Pelajaran</th>
                <th className="p-3.5">Target Jenjang / Tingkat</th>
                <th className="p-3.5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filtered.map((subject, idx) => (
                <tr key={subject.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-3.5 font-mono font-bold text-indigo-400">{subject.code}</td>
                  <td className="p-3.5 font-bold text-slate-100">{subject.name}</td>
                  <td className="p-3.5 font-medium text-slate-400">{subject.gradeLevel}</td>
                  <td className="p-3.5 text-center space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(subject)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(subject)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Tidak ditemukan data mata pelajaran.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              {editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Kode Mapel</label>
                <input
                  type="text"
                  placeholder="Contoh: MAT-12 atau TKJ-12"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Wajib"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Target Jenjang / Tingkat</label>
                <input
                  type="text"
                  placeholder="Contoh: SMA Kelas 12 atau SMK Kelas 12 TKJ"
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-md shadow-indigo-600/20"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title="Hapus Mata Pelajaran"
        message={`Apakah Anda yakin ingin menghapus mata pelajaran "${deleteConfirmTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Mapel"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
