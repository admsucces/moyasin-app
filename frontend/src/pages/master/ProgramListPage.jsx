import React, { useState, useEffect } from 'react';
import programService from '../../services/programService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { exportToCsv } from '../../utils/csvExport';
import { Layers, Plus, Search, Edit3, X, Trash2, Download } from 'lucide-react';

export const ProgramListPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.code === 'ADMIN';

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await programService.getPrograms({ search });
      if (res.success) setPrograms(res.data || []);
    } catch (err) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchPrograms();
  }, [search]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    setEditingProg(null);
    setFormData({ code: '', name: '', description: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (prog) => {
    setEditingProg(prog);
    setFormData({ code: prog.code, name: prog.name, description: prog.description || '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const res = editingProg
        ? await programService.updateProgram(editingProg.id, { name: formData.name, description: formData.description })
        : await programService.createProgram(formData);

      if (res.success) {
        setModalOpen(false);
        showToast(editingProg ? 'Program berhasil diperbarui.' : 'Program baru berhasil ditambahkan.');
        fetchPrograms();
      } else {
        if (res.errors) setFormErrors(res.errors);
        else showToast(res.message || 'Gagal menyimpan program.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (prog) => {
    if (!window.confirm(`Menonaktifkan program ${prog.name}? Data historis tetap tersimpan.`)) return;

    try {
      const res = await programService.deactivateProgram(prog.id);
      if (res.success) {
        showToast(`Program ${prog.name} berhasil dinonaktifkan.`);
        fetchPrograms();
      } else {
        showToast(res.message || 'Gagal menonaktifkan program.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    }
  };

  const handleDelete = async (prog) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus program [${prog.code}] ${prog.name} secara permanen?\n\nPerhatian: Program yang sudah memiliki transaksi atau jurnal tidak dapat dihapus (gunakan opsi Nonaktifkan).`)) {
      return;
    }

    try {
      const res = await programService.deleteProgram(prog.id);
      if (res.success) {
        showToast(res.message || `Program ${prog.name} berhasil dihapus.`);
        fetchPrograms();
      } else {
        showToast(res.message || 'Gagal menghapus program.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    }
  };

  const handleExportCsv = () => {
    if (!programs || programs.length === 0) {
      alert('Tidak ada data program untuk diekspor.');
      return;
    }

    const filename = `Master_Program_${new Date().toISOString().split('T')[0]}`;
    const headers = [
      'Kode Program',
      'Nama Program',
      'Deskripsi',
      'Status',
      'Tanggal Dibuat'
    ];

    const rows = programs.map((prog) => [
      prog.code || '',
      prog.name || '',
      prog.description || '-',
      prog.is_active ? 'Aktif' : 'Nonaktif',
      prog.created_at ? new Date(prog.created_at).toLocaleDateString('id-ID') : '-'
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Layers}
        badge="Master Data"
        title="Master Program Yayasan"
        subtitle="Klasifikasi kegiatan dan penyaluran dana (Yatim, Dhuafa, Lansia, Operasional)"
        actions={
          <>
            <button
              onClick={handleExportCsv}
              disabled={programs.length === 0}
              className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 shrink-0 transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                Tambah Program Baru
              </button>
            )}
          </>
        }
      />

      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama program..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Program List (Cards on Mobile/Tablet, Table on PC) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat program...</div>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW */}
            <div className="lg:hidden p-4 bg-slate-50/40">
              {programs.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200">
                  Tidak ada program ditemukan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {programs
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((prog) => (
                      <div
                        key={prog.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                      >
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            prog.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />

                        <div className="space-y-2.5 pl-1.5">
                          {/* Top Row: Kode Program & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Layers className="w-4 h-4" />
                              </div>
                              <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 truncate">
                                {prog.code}
                              </span>
                            </div>

                            {prog.is_active ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Nonaktif
                              </span>
                            )}
                          </div>

                          {/* Nama & Deskripsi */}
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {prog.name}
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                              {prog.description || (
                                <span className="text-slate-400 italic">Tidak ada deskripsi</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Aksi Admin */}
                        {isAdmin && (
                          <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleOpenEdit(prog)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                              title="Edit Program"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {prog.is_active && (
                              <button
                                onClick={() => handleDeactivate(prog)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold transition-colors"
                                title="Nonaktifkan Program"
                              >
                                Nonaktifkan
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(prog)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                              title="Hapus Program"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Kode Program</th>
                    <th className="px-6 py-3.5">Nama Program</th>
                    <th className="px-6 py-3.5">Deskripsi</th>
                    <th className="px-6 py-3.5">Status</th>
                    {isAdmin && <th className="px-6 py-3.5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {programs.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-slate-400">
                        Tidak ada program ditemukan.
                      </td>
                    </tr>
                  ) : (
                    programs
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((prog) => (
                      <tr key={prog.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                            {prog.code}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {prog.name}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 max-w-md">
                          {prog.description || <span className="text-slate-400 italic">Tidak ada deskripsi</span>}
                        </td>
                        <td className="px-6 py-3.5">
                          {prog.is_active ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Nonaktif
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenEdit(prog)}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Edit Program"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {prog.is_active && (
                              <button
                                onClick={() => handleDeactivate(prog)}
                                className="px-2.5 py-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-medium transition-colors"
                                title="Nonaktifkan Program"
                              >
                                Nonaktifkan
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(prog)}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Hapus Program"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={programs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProg ? 'Edit Program' : 'Tambah Program Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!editingProg && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Program</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Misal: BEASISWA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.code && <p className="text-[11px] text-rose-600 mt-1">{formErrors.code[0]}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Program</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama Program"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Penjelasan singkat mengenai tujuan dan penerima manfaat program..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramListPage;
