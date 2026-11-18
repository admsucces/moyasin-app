import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import programService from '../../services/programService';
import Pagination from '../../components/common/Pagination';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  CheckSquare, 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  User, 
  ArrowDownLeft, 
  ArrowUpRight, 
  X,
  AlertCircle
} from 'lucide-react';

export const ApprovalQueuePage = () => {
  const navigate = useNavigate();

  const [pendingList, setPendingList] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Modals & Actions
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const fetchPrograms = async () => {
    try {
      const res = await programService.getPrograms();
      if (res.success) setPrograms(res.data || []);
    } catch (err) {
      //
    }
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await approvalService.getPendingApprovals({
        search,
        type: typeFilter,
        program_id: programFilter,
      });
      if (res.success) {
        setPendingList(res.data || []);
      }
    } catch (err) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchPending();
  }, [search, typeFilter, programFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menyetujui (APPROVE) transaksi ini?')) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await approvalService.approveTransaction(id, 'Disetujui oleh Owner.');
      if (res.success) {
        showToast('Transaksi berhasil disetujui (APPROVED).');
        fetchPending();
      } else {
        showToast(res.message || 'Gagal memproses approval.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectModal = (trx) => {
    setSelectedTrx(trx);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedTrx || !rejectReason.trim()) return;

    setActionLoading(selectedTrx.id);
    try {
      const res = await approvalService.rejectTransaction(selectedTrx.id, rejectReason);
      if (res.success) {
        showToast('Transaksi berhasil ditolak (REJECTED).');
        setRejectModalOpen(false);
        fetchPending();
      } else {
        showToast(res.message || 'Gagal menolak transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi saat penolakan.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const calculateAgeDays = (submittedAt) => {
    if (!submittedAt) return 'Baru';
    const submitted = new Date(submittedAt);
    const now = new Date();
    const diffHours = Math.floor((now - submitted) / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  const totalNominalPending = pendingList.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={CheckSquare}
        badge="Pengawasan"
        title="Persetujuan Transaksi (Approval Queue)"
        subtitle="Antrean peninjauan transaksi penerimaan & pengeluaran oleh Pengawas/Owner"
      />

      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Summary KPI Cards DENGAN WARNA TOMPEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={CheckSquare}
          title="TRANSAKSI MENUNGGU REVIEW"
          value={`${pendingList.length} Transaksi`}
          color="amber"
          badge="Pending Review"
          badgeType="warning"
          subtitle="Perlu verifikasi & persetujuan"
        />

        <StatCard
          icon={AlertCircle}
          title="TOTAL NOMINAL MENUNGGU APPROVAL"
          value={formatCurrency(totalNominalPending)}
          color="indigo"
          badge="Nominal Total"
          badgeType="info"
          subtitle="Total nilai dana yang diajukan"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no TRX / pembuat / keterangan..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Semua Jenis Transaksi --</option>
            <option value="INCOME">Penerimaan Dana</option>
            <option value="EXPENSE">Pengeluaran Dana</option>
          </select>

          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Semua Program --</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat antrean persetujuan...</div>
        ) : pendingList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Tidak ada transaksi yang memerlukan persetujuan saat ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Jenis & No TRX</th>
                  <th className="px-5 py-3.5">Diajukan Oleh & Waktu</th>
                  <th className="px-5 py-3.5">Detail & Program</th>
                  <th className="px-5 py-3.5 text-right">Nominal</th>
                  <th className="px-5 py-3.5 text-right">Aksi Peninjauan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {pendingList
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        {t.type === 'INCOME' ? (
                          <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md"><ArrowDownLeft className="w-3.5 h-3.5" /></span>
                        ) : (
                          <span className="p-1 bg-rose-100 text-rose-700 rounded-md"><ArrowUpRight className="w-3.5 h-3.5" /></span>
                        )}
                        {t.transaction_no}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {t.transaction_date}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {t.creator?.name || 'Staf Keuangan'}
                      </div>
                      <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                        Diajukan: {calculateAgeDays(t.submitted_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800 truncate max-w-xs">{t.description}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {t.type === 'INCOME' 
                          ? `Donatur: ${t.donor?.name || 'Hamba Allah'}` 
                          : `Penerima: ${t.counterparty_name || '-'}`}
                        {' • '}
                        <span className="text-indigo-600 font-medium">
                          {t.program ? t.program.name : 'Umum'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(t.amount)}
                    </td>

                    <td className="px-5 py-4 text-right space-x-1">
                      <button
                        onClick={() => navigate(`/transactions/${t.id}`)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                        title="Lihat Detail Transaksi"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(t)}
                        disabled={actionLoading === t.id}
                        className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Tolak
                      </button>

                      <button
                        onClick={() => handleApprove(t.id)}
                        disabled={actionLoading === t.id}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={pendingList.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Reject Modal Dialog */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                Penolakan Transaksi #{selectedTrx?.transaction_no}
              </h3>
              <button onClick={() => setRejectModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas agar staf dapat melakukan koreksi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  Tolak Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueuePage;
