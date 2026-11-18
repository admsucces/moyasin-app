import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Palette,
  Building2,
  Image as ImageIcon,
  FileSignature,
  Save,
  RotateCcw,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  Check,
  Layout
} from 'lucide-react';
import { useSettings, DEFAULT_SETTINGS, THEME_PRESETS } from '../../context/SettingContext';
import { ICON_MAP } from '../../components/navigation/Sidebar';
import PageHeaderCard from '../../components/common/PageHeaderCard';

const ICON_OPTIONS = [
  { id: 'Sparkles', label: 'Sparkles' },
  { id: 'Landmark', label: 'Landmark' },
  { id: 'Building2', label: 'Gedung' },
  { id: 'ShieldCheck', label: 'Perisai' },
  { id: 'HeartHandshake', label: 'Sosial' },
  { id: 'Coins', label: 'Koin' },
  { id: 'Wallet', label: 'Dompet' },
  { id: 'Globe', label: 'Global' },
];

const BG_SWATCHES = [
  { label: 'Soft Indigo', color: '#f3f5fd' },
  { label: 'Clean Slate', color: '#f8fafc' },
  { label: 'Mint Cream', color: '#f0fdf4' },
  { label: 'Sky Mist', color: '#f0f9ff' },
  { label: 'Warm Stone', color: '#f5f5f4' },
  { label: 'Pure White', color: '#ffffff' },
];

export const SettingsPage = () => {
  const { settings, saveSettings, resetToDefault } = useSettings();
  const [formData, setFormData] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setFormData({ ...DEFAULT_SETTINGS, ...settings });
    }
  }, [settings]);

  const showNotice = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      theme_preset: preset.id,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      accent_color: preset.accent_color,
      bg_color: preset.bg_color,
    }));
  };

  const handleColorChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      theme_preset: 'custom',
      [field]: value,
    }));
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotice('error', 'Format file harus berupa gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showNotice('error', 'Ukuran file gambar maksimal 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        handleChange('logo_url', result);
        showNotice('success', 'Logo berhasil dimuat. Klik Simpan Pengaturan untuk menerapkan.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    handleChange('logo_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await saveSettings(formData);
      if (res?.success !== false) {
        showNotice('success', 'Pengaturan identitas & tampilan aplikasi berhasil disimpan!');
      } else {
        showNotice('error', res?.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      showNotice('error', err.message || 'Gagal menyimpan pengaturan ke server.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Kembalikan seluruh pengaturan identitas, logo, dan warna ke setelan awal (default)?')) {
      return;
    }
    setResetting(true);
    try {
      setFormData(DEFAULT_SETTINGS);
      await resetToDefault();
      showNotice('success', 'Pengaturan berhasil dikembalikan ke setelan awal (default).');
    } catch (err) {
      showNotice('error', 'Gagal mereset pengaturan.');
    } finally {
      setResetting(false);
    }
  };

  const PreviewIcon = ICON_MAP[formData.logo_icon] || Sparkles;

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header Banner Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Settings}
        badge="Konfigurasi"
        title="Pengaturan Aplikasi"
        subtitle="Kelola identitas aplikasi, informasi yayasan/lembaga, logo, tema warna, serta penandatangan laporan"
        actions={
          <>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || saving}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-white ${resetting ? 'animate-spin' : ''}`} />
              <span>Reset Default</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </>
        }
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium shadow-xs transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Form Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. IDENTITAS APLIKASI & LEMBAGA */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">1. Identitas Aplikasi & Lembaga</h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Aplikasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.app_name}
                  onChange={(e) => handleChange('app_name', e.target.value)}
                  placeholder="Contoh: Curadoc"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Nama utama yang tampil di pojok kiri atas Sidebar & halaman Login.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Label / Badge Aplikasi
                </label>
                <input
                  type="text"
                  value={formData.app_badge}
                  onChange={(e) => handleChange('app_badge', e.target.value)}
                  placeholder="Contoh: MONEY atau PRO"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Tampil sebagai lencana kecil di samping nama aplikasi (kosongkan jika tidak perlu).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Singkat Lembaga / Yayasan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.organization_name}
                  onChange={(e) => handleChange('organization_name', e.target.value)}
                  placeholder="Contoh: Yayasan ISAK 35"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Sub-judul identitas lembaga di Sidebar & tab browser.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Resmi Lengkap Lembaga
                </label>
                <input
                  type="text"
                  value={formData.organization_full_name}
                  onChange={(e) => handleChange('organization_full_name', e.target.value)}
                  placeholder="Contoh: YAYASAN ISAK 35 INDONESIA"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Deskripsi / Tagline Lembaga
                </label>
                <input
                  type="text"
                  value={formData.organization_tagline}
                  onChange={(e) => handleChange('organization_tagline', e.target.value)}
                  placeholder="Contoh: Yayasan Yatim Piatu, Dhuafa, dan Lansia"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alamat Lembaga
                </label>
                <input
                  type="text"
                  value={formData.organization_address}
                  onChange={(e) => handleChange('organization_address', e.target.value)}
                  placeholder="Alamat lengkap kantor yayasan/lembaga"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  value={formData.organization_phone}
                  onChange={(e) => handleChange('organization_phone', e.target.value)}
                  placeholder="(021) 555-0135"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Resmi
                </label>
                <input
                  type="email"
                  value={formData.organization_email}
                  onChange={(e) => handleChange('organization_email', e.target.value)}
                  placeholder="keuangan@yayasan.or.id"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. LOGO & IKON APLIKASI */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">2. Logo & Ikon Aplikasi</h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Upload Custom Image */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div
                  style={{
                    background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`,
                  }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 overflow-hidden p-1.5 border border-white/20"
                >
                  {formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <PreviewIcon
                      style={{ color: formData.accent_color }}
                      className="w-8 h-8"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upload Gambar Logo</span>
                    </button>

                    {formData.logo_url && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Format yang didukung: <strong>PNG, JPG, SVG, WebP</strong> (Maks. 2 MB). Disarankan rasio 1:1 (persegi) dengan latar transparan.
                  </p>
                </div>
              </div>

              {/* Icon Picker Fallback */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Pilihan Ikon Bawaan (Digunakan apabila tidak mengunggah gambar logo)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {ICON_OPTIONS.map((item) => {
                    const IconComp = ICON_MAP[item.id] || Sparkles;
                    const isSelected = formData.logo_icon === item.id && !formData.logo_url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleChange('logo_icon', item.id);
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-[10px] font-semibold transition-all ${
                          formData.logo_icon === item.id
                            ? 'bg-indigo-50/80 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/15'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="truncate w-full text-center">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. WARNA & TEMA APLIKASI */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <Palette className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">3. Tema & Warna Aplikasi</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Preset Themes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2.5">
                  Pilih Paket Tema Warna (Preset)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected =
                      formData.primary_color.toLowerCase() === preset.primary_color.toLowerCase() &&
                      formData.secondary_color.toLowerCase() === preset.secondary_color.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`group text-left p-3 rounded-2xl border transition-all relative overflow-hidden ${
                          isSelected
                            ? 'border-slate-900 ring-2 ring-slate-900/15 bg-slate-50/80'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center -space-x-1.5">
                            <span
                              style={{ backgroundColor: preset.primary_color }}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-xs"
                            />
                            <span
                              style={{ backgroundColor: preset.secondary_color }}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-xs"
                            />
                            <span
                              style={{ backgroundColor: preset.accent_color }}
                              className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
                            />
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-tight">{preset.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{preset.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-3">
                  Kustomisasi Warna Manual (Sidebar, Aksen & Latar Belakang)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Primary Color */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <span className="block text-[11px] font-semibold text-slate-600">Warna Utama (Atas)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 bg-white p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => handleColorChange('primary_color', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <span className="block text-[11px] font-semibold text-slate-600">Warna Gradasi (Bawah)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 bg-white p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.secondary_color}
                        onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <span className="block text-[11px] font-semibold text-slate-600">Warna Aksen Aktif</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) => handleColorChange('accent_color', e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 bg-white p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.accent_color}
                        onChange={(e) => handleColorChange('accent_color', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <span className="block text-[11px] font-semibold text-slate-600">Latar Belakang Halaman</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.bg_color}
                        onChange={(e) => handleChange('bg_color', e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 bg-white p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.bg_color}
                        onChange={(e) => handleChange('bg_color', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick BG Swatches */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[11px] text-slate-500 mr-1">Pilihan Cepat Latar Halaman:</span>
                  {BG_SWATCHES.map((sw) => (
                    <button
                      key={sw.color}
                      type="button"
                      onClick={() => handleChange('bg_color', sw.color)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                        formData.bg_color.toLowerCase() === sw.color.toLowerCase()
                          ? 'border-slate-800 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: sw.color }}
                        className="w-3 h-3 rounded-full border border-slate-300"
                      />
                      <span>{sw.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Extra Options */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Layout className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Kartu Pintasan "Dokumen & Panduan" di Sidebar</p>
                    <p className="text-[11px] text-slate-500">Tampilkan kartu akses cepat laporan di bagian bawah navigasi Sidebar.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_sidebar_promo !== 'false'}
                    onChange={(e) => handleChange('show_sidebar_promo', e.target.checked ? 'true' : 'false')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 4. PENGATURAN PENANDATANGAN LAPORAN (PDF) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <FileSignature className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">4. Penandatangan Laporan Resmi (Cetak PDF)</h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Penyusun */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pihak Pertama — Dibuat Oleh (Penyusun)
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Lengkap / Nama Pejabat Penyusun
                  </label>
                  <input
                    type="text"
                    value={formData.report_preparer_name}
                    onChange={(e) => handleChange('report_preparer_name', e.target.value)}
                    placeholder="Contoh: Staf Akuntansi & Keuangan"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Jabatan / Divisi Penyusun
                  </label>
                  <input
                    type="text"
                    value={formData.report_preparer_role}
                    onChange={(e) => handleChange('report_preparer_role', e.target.value)}
                    placeholder="Contoh: Bagian Keuangan Yayasan"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Penyetuju */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pihak Kedua — Disetujui Oleh (Pengesah)
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Lengkap / Nama Pimpinan
                  </label>
                  <input
                    type="text"
                    value={formData.report_approver_name}
                    onChange={(e) => handleChange('report_approver_name', e.target.value)}
                    placeholder="Contoh: Ketua Pengurus Yayasan"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Jabatan Pimpinan
                  </label>
                  <input
                    type="text"
                    value={formData.report_approver_role}
                    onChange={(e) => handleChange('report_approver_role', e.target.value)}
                    placeholder="Contoh: Pimpinan Lembaga"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden sticky top-20">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pratinjau Langsung (Live Preview)</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Real-Time
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* Mini App Layout Preview */}
              <div
                style={{ backgroundColor: formData.bg_color || '#f3f5fd' }}
                className="rounded-2xl border border-slate-200 p-3 shadow-inner flex gap-3 min-h-[260px]"
              >
                {/* Mini Sidebar */}
                <div
                  style={{
                    background: `linear-gradient(180deg, ${formData.primary_color} 0%, ${formData.secondary_color} 100%)`,
                  }}
                  className="w-44 rounded-xl p-3 text-white flex flex-col justify-between shadow-lg shrink-0"
                >
                  <div>
                    {/* Brand Header */}
                    <div className="flex items-center gap-2.5 pb-3 border-b border-white/15">
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${formData.accent_color}, #ffffff80)`,
                        }}
                        className="w-8 h-8 rounded-lg p-0.5 shrink-0 overflow-hidden"
                      >
                        <div
                          style={{ backgroundColor: formData.primary_color }}
                          className="w-full h-full rounded-[6px] flex items-center justify-center overflow-hidden"
                        >
                          {formData.logo_url ? (
                            <img
                              src={formData.logo_url}
                              alt="Logo"
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <PreviewIcon
                              style={{ color: formData.accent_color }}
                              className="w-4 h-4"
                            />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white flex items-center gap-1 truncate">
                          <span className="truncate">{formData.app_name || 'Curadoc'}</span>
                          {formData.app_badge && (
                            <span
                              style={{
                                color: formData.accent_color,
                                borderColor: `${formData.accent_color}50`,
                                backgroundColor: `${formData.accent_color}25`,
                              }}
                              className="text-[7px] font-bold px-1 py-0.2 rounded border"
                            >
                              {formData.app_badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-white/75 truncate">
                          {formData.organization_name || 'Yayasan ISAK 35'}
                        </p>
                      </div>
                    </div>

                    {/* Fake Menu Items */}
                    <div className="mt-3 space-y-1.5">
                      <div className="bg-white/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold">Dashboard</span>
                        <span
                          style={{ backgroundColor: formData.accent_color }}
                          className="w-1.5 h-1.5 rounded-full"
                        />
                      </div>
                      <div className="px-2.5 py-1 text-[10px] text-white/70">Transaksi</div>
                      <div className="px-2.5 py-1 text-[10px] text-white/70">Neraca Saldo</div>
                      <div className="px-2.5 py-1 text-[10px] text-white/70">Laporan Keuangan</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 text-[8px] text-white/60 text-center">
                    {formData.organization_full_name}
                  </div>
                </div>

                {/* Mini Content Area */}
                <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs flex items-center justify-between">
                    <div className="h-2 w-16 bg-slate-200 rounded-full" />
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`,
                      }}
                      className="w-5 h-5 rounded-md text-white text-[9px] font-bold flex items-center justify-center"
                    >
                      A
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200/70 shadow-2xs flex-1 space-y-2">
                    <div className="h-2.5 w-24 bg-slate-800 rounded-full" />
                    <div className="h-2 w-full bg-slate-100 rounded-full" />
                    <div className="h-2 w-4/5 bg-slate-100 rounded-full" />
                    <div className="pt-2 grid grid-cols-2 gap-1.5">
                      <div className="h-10 rounded-lg bg-emerald-50 border border-emerald-100" />
                      <div className="h-10 rounded-lg bg-indigo-50 border border-indigo-100" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Pratinjau Tanda Tangan Cetak PDF
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <p className="text-[8px] font-bold text-slate-500 uppercase">Dibuat Oleh</p>
                    <p className="text-[10px] font-bold text-slate-900 mt-4 border-b border-slate-300 pb-0.5 truncate">
                      {formData.report_preparer_name || '-'}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-0.5 truncate">
                      {formData.report_preparer_role || '-'}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <p className="text-[8px] font-bold text-slate-500 uppercase">Disetujui Oleh</p>
                    <p className="text-[10px] font-bold text-slate-900 mt-4 border-b border-slate-300 pb-0.5 truncate">
                      {formData.report_approver_name || '-'}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-0.5 truncate">
                      {formData.report_approver_role || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`,
                }}
                className="w-full py-3 rounded-xl text-white text-xs font-semibold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan Perubahan...' : 'Simpan & Terapkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;

