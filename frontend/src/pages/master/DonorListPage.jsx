import React, { useState, useEffect } from 'react';
import donorService from '../../services/donorService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { exportToCsv } from '../../utils/csvExport';
import { Users, UserPlus, Search, Edit3, X, Phone, Mail, MapPin, Tag, Trash2, ArrowUpRight, ArrowDownLeft, Download } from 'lucide-react';

export const DonorListPage = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role || '';
  const canManage = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState(null);
  const [formData, setFormData] = useState({ type: 'DONATUR', name: '', phone: '', email: '', address: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const res = await donorService.getDonors({ search });
      if (res.success) setDonors(res.data || []);
    } catch (err) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchDonors();
  }, [search]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    setEditingDonor(null);
    setFormData({ type: 'DONATUR', name: '', phone: '', email: '', address: '', notes: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (d) => {
    setEditingDonor(d);
    setFormData({
      type: d.type || 'DONATUR',
      name: d.name,
      phone: d.phone || '',
      email: d.email || '',
      address: d.address || '',
      notes: d.notes || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const res = editingDonor
        ? await donorService.updateDonor(editingDonor.id, formData)
        : await donorService.createDonor(formData);

      if (res.success) {
        setModalOpen(false);
        showToast(editingDonor ? 'Data rekanan diperbarui.' : 'Rekanan baru berhasil dicatat.');
        fetchDonors();
      } else {
        if (res.errors) setFormErrors(res.errors);
        else showToast(res.message || 'Gagal menyimpan data rekanan.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data rekanan "${d.name}" secara permanen?\n\nPerhatian: Rekanan yang memiliki riwayat transaksi, hutang, atau piutang tidak dapat dihapus.`)) {
      return;
    }

    try {
      const res = await donorService.deleteDonor(d.id);
      if (res.success) {
        showToast(res.message || `Data rekanan ${d.name} berhasil dihapus.`);
        fetchDonors();
      } else {
        showToast(res.message || 'Gagal menghapus data rekanan.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    }
  };

  const filteredDonors = donors.filter((d) => {
    if (!typeFilter) return true;
    return (d.type || 'DONATUR') === typeFilter;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case 'VENDOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">VENDOR / SUPPLIER</span>;
      case 'DONATUR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">DONATUR / SUMBER</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">LAINNYA</span>;
    }
  };

  const handleExportCsv = () => {
    if (!filteredDonors || filteredDonors.length === 0) {
      alert('Tidak ada data rekanan untuk diekspor.');
      return;
    }

    const typeSuffix = typeFilter ? `_${typeFilter}` : '';
    const filename = `Data_Rekanan${typeSuffix}_${new Date().toISOString().split('T')[0]}`;
    const headers = [
      'Nama Rekanan / Instansi',
      'Kategori',
      'No Telepon',
      'Email',
      'Alamat',
      'Total Tagihan Hutang (IDR)',
      'Sisa Hutang (IDR)',
      'Total Tagihan Piutang (IDR)',
      'Sisa Piutang (IDR)',
      'Catatan'
    ];

    const rows = filteredDonors.map((d) => [
      d.name || '',
      d.type || 'DONATUR',
      d.phone || '-',
      d.email || '-',
      d.address || '-',
      Number(d.total_payable || 0).toFixed(2),
      Number(d.remaining_payable || 0).toFixed(2),
      Number(d.total_receivable || 0).toFixed(2),
      Number(d.remaining_receivable || 0).toFixed(2),
      d.notes || '-'
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Users}
        badge="Master Data"
        title="Data Rekanan (Donatur & Vendor)"
        subtitle="Direktori kontak donatur, vendor supplier, dan rekanan transaksi yayasan"
        actions={
          <>
            <button
              onClick={handleExportCsv}
              disabled={filteredDonors.length === 0}
              className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>

            {canManage && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 shrink-0 transition-all"
              >
                <UserPlus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                Tambah Rekanan Baru
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

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama rekanan, nomor telepon, atau email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">-- Semua Kategori Rekanan --</option>
          <option value="DONATUR">DONATUR / SUMBER DANA</option>
          <option value="VENDOR">VENDOR / SUPPLIER</option>
          <option value="LAINNYA">LAINNYA</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat data rekanan...</div>
        ) : filteredDonors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Tidak ada data rekanan ditemukan.</div>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW */}
            <div className="lg:hidden p-4 bg-slate-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredDonors
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((d) => {
                    const donorType = d.type || 'DONATUR';
                    const hasPayable = Number(d.total_payable) > 0;
                    const hasReceivable = Number(d.total_receivable) > 0;

                    return (
                      <div
                        key={d.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                      >
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            donorType === 'VENDOR'
                              ? 'bg-amber-500'
                              : donorType === 'DONATUR'
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                          }`}
                        />

                        <div className="space-y-3 pl-1.5">
                          {/* Header: Avatar Inisial, Nama Rekanan & Badge Kategori */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                  donorType === 'VENDOR'
                                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                                    : donorType === 'DONATUR'
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                              >
                                {(d.name || 'R').charAt(0).toUpperCase()}
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                                {d.name}
                              </h4>
                            </div>
                            <div className="shrink-0">{getTypeBadge(donorType)}</div>
                          </div>

                          {/* Kontak & Alamat */}
                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {d.phone && (
                                <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{d.phone}</span>
                                </span>
                              )}
                              {d.email && (
                                <span className="inline-flex items-center gap-1.5 text-slate-500 text-[11px] min-w-0">
                                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{d.email}</span>
                                </span>
                              )}
                              {!d.phone && !d.email && (
                                <span className="text-[11px] text-slate-400 italic">Kontak belum diisi</span>
                              )}
                            </div>

                            {d.address && (
                              <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{d.address}</span>
                              </div>
                            )}

                            {d.notes && (
                              <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-1 italic">{d.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Ringkasan Hutang / Piutang */}
                          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 space-y-1.5">
                            {hasPayable && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-0.5 shrink-0">
                                  <ArrowUpRight className="w-2.5 h-2.5" /> Hutang
                                </span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono font-bold text-rose-600 text-xs truncate">
                                    {formatCurrency(
                                      d.remaining_payable > 0 ? d.remaining_payable : d.total_payable
                                    )}
                                  </span>
                                  {Number(d.remaining_payable) === 0 ? (
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      Lunas
                                    </span>
                                  ) : d.remaining_payable < d.total_payable ? (
                                    <span className="text-[10px] text-slate-400 font-mono">(Sisa)</span>
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {hasReceivable && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-0.5 shrink-0">
                                  <ArrowDownLeft className="w-2.5 h-2.5" /> Piutang
                                </span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono font-bold text-emerald-600 text-xs truncate">
                                    {formatCurrency(
                                      d.remaining_receivable > 0 ? d.remaining_receivable : d.total_receivable
                                    )}
                                  </span>
                                  {Number(d.remaining_receivable) === 0 ? (
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      Lunas
                                    </span>
                                  ) : d.remaining_receivable < d.total_receivable ? (
                                    <span className="text-[10px] text-slate-400 font-mono">(Sisa)</span>
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {!hasPayable && !hasReceivable && (
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>Saldo Hutang / Piutang</span>
                                <span className="font-mono font-semibold">Rp 0</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Aksi */}
                        {canManage && (
                          <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(d)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                              title="Edit Rekanan"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(d)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                              title="Hapus Rekanan"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Nama Rekanan / Instansi</th>
                    <th className="px-6 py-3.5 text-center">Kategori</th>
                    <th className="px-6 py-3.5">Total Hutang / Piutang</th>
                    <th className="px-6 py-3.5">Kontak</th>
                    <th className="px-6 py-3.5">Alamat</th>
                    <th className="px-6 py-3.5">Catatan</th>
                    {canManage && <th className="px-6 py-3.5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDonors
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{d.name}</td>
                      <td className="px-6 py-4 text-center">{getTypeBadge(d.type || 'DONATUR')}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {Number(d.total_payable) > 0 ? (
                            <div className="flex items-center gap-1.5" title={`Total Tagihan Hutang: ${formatCurrency(d.total_payable)} | Sisa Hutang: ${formatCurrency(d.remaining_payable)}`}>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-0.5 shrink-0">
                                <ArrowUpRight className="w-2.5 h-2.5" /> Hutang
                              </span>
                              <span className="font-mono font-bold text-rose-600 text-xs">
                                {formatCurrency(d.remaining_payable > 0 ? d.remaining_payable : d.total_payable)}
                              </span>
                              {Number(d.remaining_payable) === 0 && Number(d.total_payable) > 0 ? (
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">Lunas</span>
                              ) : d.remaining_payable < d.total_payable ? (
                                <span className="text-[10px] text-slate-400 font-mono">(Sisa)</span>
                              ) : null}
                            </div>
                          ) : null}
                          {Number(d.total_receivable) > 0 ? (
                            <div className="flex items-center gap-1.5" title={`Total Tagihan Piutang: ${formatCurrency(d.total_receivable)} | Sisa Piutang: ${formatCurrency(d.remaining_receivable)}`}>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-0.5 shrink-0">
                                <ArrowDownLeft className="w-2.5 h-2.5" /> Piutang
                              </span>
                              <span className="font-mono font-bold text-emerald-600 text-xs">
                                {formatCurrency(d.remaining_receivable > 0 ? d.remaining_receivable : d.total_receivable)}
                              </span>
                              {Number(d.remaining_receivable) === 0 && Number(d.total_receivable) > 0 ? (
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">Lunas</span>
                              ) : d.remaining_receivable < d.total_receivable ? (
                                <span className="text-[10px] text-slate-400 font-mono">(Sisa)</span>
                              ) : null}
                            </div>
                          ) : null}
                          {Number(d.total_payable) === 0 && Number(d.total_receivable) === 0 && (
                            <span className="text-slate-400 text-xs font-mono">- (Rp 0)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-0.5">
                        {d.phone && <div className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3 h-3 text-slate-400" /> {d.phone}</div>}
                        {d.email && <div className="flex items-center gap-1.5 text-slate-500 text-[11px]"><Mail className="w-3 h-3 text-slate-400" /> {d.email}</div>}
                        {!d.phone && !d.email && <span className="text-slate-400 text-[11px]">-</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{d.address || '-'}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{d.notes || '-'}</td>
                      {canManage && (
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                            title="Edit Rekanan"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                            title="Hapus Rekanan"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredDonors.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingDonor ? 'Edit Data Rekanan' : 'Tambah Rekanan Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Rekanan <span className="text-rose-500">*</span></label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DONATUR">DONATUR / SUMBER DANA</option>
                  <option value="VENDOR">VENDOR / SUPPLIER / PENYEDIA</option>
                  <option value="LAINNYA">LAINNYA / MITRA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Rekanan / Instansi <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Misal: PT Toko Semen Jaya / Hamba Allah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rekanan@example.org"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat domisili atau kantor..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Khusus</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan kerja sama, termin bayar, dll..."
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

export default DonorListPage;
