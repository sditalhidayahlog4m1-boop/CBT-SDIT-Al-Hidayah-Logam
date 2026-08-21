import React, { useState, useEffect, useRef } from 'react';
import {
  School,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Award,
  Users,
  GraduationCap,
  BookOpen,
  Edit3,
  Save,
  X,
  CheckCircle2,
  FileText,
  UserCheck,
  Calendar,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
} from 'lucide-react';
import { AuthUser, Teacher, Student, Subject } from '../types';
import { SchoolProfile, getStoredSchoolProfile, saveStoredSchoolProfile } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';

interface ProfilSekolahViewProps {
  currentUser?: AuthUser | null;
  teachers?: Teacher[];
  students?: Student[];
  subjects?: Subject[];
  schoolProfile?: SchoolProfile;
  onUpdateSchoolProfile?: (profile: SchoolProfile) => void;
}

export const ProfilSekolahView: React.FC<ProfilSekolahViewProps> = ({
  currentUser,
  teachers = [],
  students = [],
  subjects = [],
  schoolProfile,
  onUpdateSchoolProfile,
}) => {
  const [profile, setProfile] = useState<SchoolProfile>(schoolProfile || getStoredSchoolProfile());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<SchoolProfile>(profile);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (schoolProfile) {
      setProfile(schoolProfile);
      setEditForm(schoolProfile);
    } else {
      const stored = getStoredSchoolProfile();
      setProfile(stored);
      setEditForm(stored);
    }
  }, [schoolProfile]);

  const isAdminOrGuru = currentUser?.role === 'admin' || currentUser?.role === 'guru';

  const handleOpenEdit = () => {
    setEditForm({ ...profile });
    setIsEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSchoolProfile(editForm);
    setProfile(editForm);
    if (onUpdateSchoolProfile) {
      onUpdateSchoolProfile(editForm);
    }
    setIsEditModalOpen(false);
    setSuccessMessage('Profil & Logo sekolah berhasil diperbarui dan disimpan!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file terlalu besar. Harap unggah gambar di bawah 10MB.');
      return;
    }

    try {
      const compressedLogo = await compressImage(file, 256, 256, 0.85);
      const updated = { ...profile, logoUrl: compressedLogo };
      setProfile(updated);
      setEditForm((prev) => ({ ...prev, logoUrl: compressedLogo }));
      saveStoredSchoolProfile(updated);
      if (onUpdateSchoolProfile) {
        onUpdateSchoolProfile(updated);
      }
      setSuccessMessage('Logo sekolah berhasil diunggah & tersinkronisasi di seluruh aplikasi!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.warn('Error uploading logo:', err);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    const updated = { ...profile, logoUrl: '' };
    setProfile(updated);
    setEditForm(prev => ({ ...prev, logoUrl: '' }));
    saveStoredSchoolProfile(updated);
    if (onUpdateSchoolProfile) {
      onUpdateSchoolProfile(updated);
    }
    setSuccessMessage('Logo sekolah berhasil dihapus. Kembali menggunakan logo standar.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleMissionChange = (index: number, val: string) => {
    const newMission = [...editForm.mission];
    newMission[index] = val;
    setEditForm({ ...editForm, mission: newMission });
  };

  const handleAddMission = () => {
    setEditForm({ ...editForm, mission: [...editForm.mission, ''] });
  };

  const handleRemoveMission = (index: number) => {
    const newMission = editForm.mission.filter((_, i) => i !== index);
    setEditForm({ ...editForm, mission: newMission });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Alert Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 shadow-xl shrink-0 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center border border-white/10 overflow-hidden">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-1" />
                ) : (
                  <School className="w-9 h-9 sm:w-11 sm:h-11 text-amber-400" />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                  Akreditasi {profile.accreditation}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                  NPSN: {profile.npsn}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                  {profile.schoolStatus}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {profile.name}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    {profile.address}, {profile.district}, {profile.city}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Kepala Sekolah: <strong>{profile.headmaster}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {isAdminOrGuru && (
            <button
              onClick={handleOpenEdit}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profil Sekolah</span>
            </button>
          )}
        </div>
      </div>

      {/* KOTAK UPLOAD & HAPUS LOGO SEKOLAH */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Kelola Logo Resmi Sekolah
                {profile.logoUrl && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    Logo Kustom Aktif
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Unggah atau hapus logo sekolah. Logo otomatis tersinkronisasi pada Pojok Navigasi (Sidebar), Header Utama, & Halaman Log In.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 pt-1">
          {/* Preview Box */}
          <div className="w-36 h-36 rounded-2xl bg-slate-950 border-2 border-dashed border-indigo-500/40 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner shrink-0 p-2">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt="Preview Logo Sekolah"
                className="w-full h-full object-contain drop-shadow-md"
              />
            ) : (
              <div className="text-center p-3">
                <School className="w-10 h-10 text-slate-600 mx-auto mb-1.5" />
                <span className="text-[11px] font-semibold text-slate-400 block leading-tight">
                  Belum Ada Logo Custom
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Standard Icon Active
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons & Guidance */}
          <div className="flex-1 space-y-3.5 text-xs text-slate-300 w-full">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-200 block text-xs">
                📌 Petunjuk Pengelolaan Logo:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li>Gunakan format gambar <strong>PNG, JPG, WEBP, atau SVG</strong> (disarankan latar transparan).</li>
                <li>Logo akan langsung diperbarui di Pojok Navigasi (Sidebar), Header, & Halaman Log In.</li>
                <li>Gunakan tombol <strong>Hapus Logo</strong> jika ingin kembali ke icon standar aplikasi.</li>
              </ul>
            </div>

            {isAdminOrGuru ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileUpload}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span>{profile.logoUrl ? 'Ganti Logo Sekolah' : 'Upload Logo Sekolah'}</span>
                </button>

                {profile.logoUrl && (
                  <button
                    onClick={handleRemoveLogo}
                    className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Logo</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-900 rounded-xl text-[11px] text-slate-400 italic border border-slate-800">
                🔒 Pengunggahan dan penghapusan logo sekolah hanya dapat dilakukan oleh Admin atau Guru.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VISI & MISI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Visi Card */}
        <div className="md:col-span-1 bg-gradient-to-b from-indigo-950/80 to-[#0f172a] border border-indigo-900/50 rounded-3xl p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-2 border-b border-indigo-800/40 pb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white tracking-wide">VISI SEKOLAH</h2>
          </div>
          <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed italic bg-indigo-900/30 p-4 rounded-2xl border border-indigo-800/30">
            "{profile.vision}"
          </p>
        </div>

        {/* Misi Card */}
        <div className="md:col-span-2 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Award className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-black text-white tracking-wide">MISI SEKOLAH</h2>
          </div>

          <ul className="space-y-3">
            {profile.mission.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800 text-xs sm:text-sm text-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* IDENTITAS SEKOLAH GRID TABLE */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Identitas & Data Pokok Sekolah</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Status Data: Terverifikasi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Nama Sekolah</span>
              <span className="font-bold text-white text-right">{profile.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">NPSN</span>
              <span className="font-mono font-bold text-indigo-300">{profile.npsn}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">NSS / NDS</span>
              <span className="font-mono font-bold text-slate-200">{profile.nss}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Bentuk Pendidikan</span>
              <span className="font-semibold text-slate-200">{profile.educationalLevel}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Status Sekolah</span>
              <span className="font-semibold text-amber-300">{profile.schoolStatus}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Akreditasi</span>
              <span className="font-bold text-emerald-400">{profile.accreditation}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Kepala Sekolah</span>
              <span className="font-bold text-white">{profile.headmaster}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Alamat Jalan</span>
              <span className="font-medium text-slate-200 text-right">{profile.address}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Kelurahan / Desa</span>
              <span className="font-medium text-slate-200">{profile.village}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Kecamatan</span>
              <span className="font-medium text-slate-200">{profile.district}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Kabupaten / Kota</span>
              <span className="font-medium text-slate-200">{profile.city}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Provinsi & Kode Pos</span>
              <span className="font-medium text-slate-200">{profile.province} ({profile.postalCode})</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">No. Telepon / WA</span>
              <span className="font-medium text-indigo-300 flex items-center gap-1">
                <Phone className="w-3 h-3 text-indigo-400" />
                {profile.phone}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Email Resmi</span>
              <span className="font-medium text-indigo-300 flex items-center gap-1">
                <Mail className="w-3 h-3 text-indigo-400" />
                {profile.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFIL MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Edit Profil Sekolah</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Sekolah</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">NPSN</label>
                  <input
                    type="text"
                    required
                    value={editForm.npsn}
                    onChange={(e) => setEditForm({ ...editForm, npsn: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kepala Sekolah</label>
                  <input
                    type="text"
                    required
                    value={editForm.headmaster}
                    onChange={(e) => setEditForm({ ...editForm, headmaster: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Akreditasi</label>
                  <input
                    type="text"
                    value={editForm.accreditation}
                    onChange={(e) => setEditForm({ ...editForm, accreditation: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Sekolah</label>
                  <input
                    type="text"
                    value={editForm.schoolStatus}
                    onChange={(e) => setEditForm({ ...editForm, schoolStatus: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun Berdiri</label>
                  <input
                    type="text"
                    value={editForm.establishmentYear}
                    onChange={(e) => setEditForm({ ...editForm, establishmentYear: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Alamat Lengkap Jalan</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Sekolah</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Visi Sekolah</label>
                  <textarea
                    rows={2}
                    value={editForm.vision}
                    onChange={(e) => setEditForm({ ...editForm, vision: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold">Misi Sekolah</label>
                    <button
                      type="button"
                      onClick={handleAddMission}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Misi
                    </button>
                  </div>
                  {editForm.mission.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => handleMissionChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMission(idx)}
                        className="p-1.5 text-rose-400 hover:text-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
