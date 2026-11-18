import React, { useState, useEffect } from 'react';
import periodService from '../../services/periodService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { CalendarCheck, Plus, Lock, Unlock, AlertCircle, X, RotateCcw } from 'lucide-react';

export const AccountingPeriodListPage = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role || '';
  const isOwner = roleCode === 'OWNER';
  const isAdmin = roleCode === 'ADMIN';
  const canManage = isAdmin || isOwner;

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' });
  const [formErrors, setFormErrors] = useState({});

  // Reopen Modal State
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [reopenReason, setReopenReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await periodService.getPeriods();
      if (res.success) setPeriods(res.data || []);
    } catch (err) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    setFormData({ name: '', start_date: '', end_date: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const res = await periodService.createPeriod(formData);
      if (res.success) {
        setModalOpen(false);
        showToast('Periode akuntansi baru berhasil dibuat.');
        fetchPeriods();
      } else {
        if (res.errors) setFormErrors(res.errors);
        else showToast(res.message || 'Gagal membuat periode akuntansi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePeriod = async (period) => {
    if (!window.confirm(`Apakah Anda yakin ingin MENUTUP periode akuntansi '${period.name}'? Seluruh transaksi bertanggal pada periode ini tidak dapat diubah/ditambah lagi.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await periodService.closePeriod(period.id);
      if (res && res.success) {
        showToast(`Periode akuntansi '${period.name}' berhasil DITUTUP (CLOSED).`);
        fetchPeriods();
      } else {
        showToast(res?.message || 'Gagal menutup periode akuntansi.');
      }
    } catch (err) {
      showToast(err.message || 'Gagal menutup periode. Pastikan tidak ada transaksi DRAFT atau SUBMITTED menggantung.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReopenModal = (period) => {
    setSelectedPeriod(period);
    setReopenReason('');
    setReopenModalOpen(true);
  };

  const handleConfirmReopen = async (e) => {
    e.preventDefault();
    if (!selectedPeriod) return;

    setSubmitting(true);
    try {
      let res;
      if (isOwner) {
        // Owner directly approves reopen
        res = await periodService.approveReopen(selectedPeriod.id, reopenReason);
      } else {
        // Admin requests reopen
        res = await periodService.requestReopen(selectedPeriod.id, reopenReason);
      }

      if (res && res.success) {
        showToast(res.message || 'Pengajuan/Pembukaan kembali periode berhasil.');
        setReopenModalOpen(false);
        fetchPeriods();
      } else {
        showToast(res?.message || 'Gagal memproses pembukaan kembali periode.');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full"><Unlock className="w-3 h-3" /> OPEN</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full"><Lock className="w-3 h-3" /> CLOSED</span>;
      case 'REOPEN_REQUESTED':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full"><RotateCcw className="w-3 h-3" /> REOPEN REQUESTED</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={CalendarCheck}
        badge="Master Data"
        title="Periode Akuntansi"
        subtitle="Pengaturan tahun buku & perlindungan periode transaksi bertanggal ditutup"
        actions={
          canManage && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              Buat Periode Baru
            </button>
          )
        }
      />

      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat periode akuntansi...</div>
        ) : periods.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Belum ada periode akuntansi dibuat.</div>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW */}
            <div className="lg:hidden p-4 bg-slate-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {periods
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          p.status === 'OPEN'
                            ? 'bg-emerald-500'
                            : p.status === 'REOPEN_REQUESTED'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />

                      <div className="space-y-3 pl-1.5">
                        {/* Header: Nama Periode & Status */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                                p.status === 'OPEN'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                  : p.status === 'REOPEN_REQUESTED'
                                  ? 'bg-amber-50 border-amber-100 text-amber-600'
                                  : 'bg-slate-100 border-slate-200 text-slate-500'
                              }`}
                            >
                              <CalendarCheck className="w-4 h-4" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                              {p.name}
                            </h4>
                          </div>
                          <div className="shrink-0">{getStatusBadge(p.status)}</div>
                        </div>

                        {/* Rentang Tanggal Mulai & Selesai */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Tanggal Mulai
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-700 block mt-0.5">
                              {p.start_date}
                            </span>
                          </div>
                          <div className="min-w-0 border-l border-slate-200/80 pl-2.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Tanggal Selesai
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-700 block mt-0.5">
                              {p.end_date}
                            </span>
                          </div>
                        </div>

                        {/* Informasi Penutupan / Pembukaan */}
                        <div className="text-[11px] leading-relaxed">
                          {p.status === 'CLOSED' && (
                            <p className="text-slate-500">
                              Ditutup pada{' '}
                              <span className="font-semibold text-slate-700">
                                {new Date(p.closed_at).toLocaleDateString('id-ID')}
                              </span>{' '}
                              oleh <span className="font-semibold text-slate-700">{p.closed_user?.name || 'User'}</span>
                            </p>
                          )}
                          {p.status === 'OPEN' && (
                            <p className="text-emerald-700 font-medium">Periode Aktif (OPEN) — Siap menerima pencatatan</p>
                          )}
                          {p.status === 'REOPEN_REQUESTED' && (
                            <p className="text-amber-700 bg-amber-50/70 border border-amber-100 rounded-xl px-2.5 py-1.5 font-medium">
                              Diajukan pembukaan kembali: &ldquo;{p.reopen_reason}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Aksi Control */}
                      {canManage && (
                        <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                          {p.status === 'OPEN' && (
                            <button
                              onClick={() => handleClosePeriod(p)}
                              disabled={submitting}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Tutup Periode</span>
                            </button>
                          )}

                          {(p.status === 'CLOSED' || p.status === 'REOPEN_REQUESTED') && (
                            <button
                              onClick={() => handleOpenReopenModal(p)}
                              disabled={submitting}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isOwner ? 'Buka Kembali Periode' : 'Minta Buka Periode'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Nama Periode</th>
                    <th className="px-6 py-3.5">Tanggal Mulai</th>
                    <th className="px-6 py-3.5">Tanggal Selesai</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Informasi Penutupan / Pembukaan</th>
                    <th className="px-6 py-3.5 text-center">Aksi Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {periods
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-600">{p.start_date}</td>
                      <td className="px-6 py-4 font-mono text-slate-600">{p.end_date}</td>
                      <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                      <td className="px-6 py-4 text-slate-400 text-[11px]">
                        {p.status === 'CLOSED' && (
                          <span>Ditutup pada {new Date(p.closed_at).toLocaleDateString('id-ID')} oleh {p.closed_user?.name || 'User'}</span>
                        )}
                        {p.status === 'OPEN' && (
                          <span>Periode Aktif (OPEN)</span>
                        )}
                        {p.status === 'REOPEN_REQUESTED' && (
                          <span className="text-amber-600 font-medium">Diajukan pembukaan kembali: "{p.reopen_reason}"</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.status === 'OPEN' && canManage && (
                          <button
                            onClick={() => handleClosePeriod(p)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-medium transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Tutup Periode</span>
                          </button>
                        )}

                        {(p.status === 'CLOSED' || p.status === 'REOPEN_REQUESTED') && canManage && (
                          <button
                            onClick={() => handleOpenReopenModal(p)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-medium transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{isOwner ? 'Buka Kembali Periode' : 'Minta Buka Periode'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={periods.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create Period Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Buat Periode Akuntansi Baru</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Periode</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Misal: Tahun Buku 2026 / Periode September 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.start_date && <p className="text-[11px] text-rose-600 mt-1">{formErrors.start_date[0]}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.end_date && <p className="text-[11px] text-rose-600 mt-1">{formErrors.end_date[0]}</p>}
                </div>
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
                  {submitting ? 'Membuat...' : 'Buat Periode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Period Modal */}
      {reopenModalOpen && selectedPeriod && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Pembukaan Kembali Periode: {selectedPeriod.name}
              </h3>
              <button onClick={() => setReopenModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleConfirmReopen} className="space-y-4">
              <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                {isOwner 
                  ? 'Sebagai Owner, Anda akan membuka kembali periode ini sehingga transaksi bertanggal pada periode ini dapat diproses kembali.' 
                  : 'Pengajuan pembukaan kembali periode akan dikirimkan kepada Owner untuk persetujuan.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembukaan Kembali <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Tuliskan alasan pembukaan kembali periode akuntansi secara jelas (min 5 karakter)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reopenReason.trim() || reopenReason.length < 5}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {isOwner ? 'Buka Kembali Periode' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPeriodListPage;
