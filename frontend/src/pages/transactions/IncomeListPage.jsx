import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { transactionService } from '../../services/transactionService';

import programService from '../../services/programService';
import useAuth from '../../hooks/useAuth';
import { 
  ArrowDownLeft, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2,
  Send, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileText,
  Calendar
} from 'lucide-react';

export const IncomeListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleCode = user?.role?.code || user?.role || '';
  const canCreate = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  const [transactions, setTransactions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPrograms = async () => {
    try {
      const res = await programService.getPrograms();
      if (res.success) setPrograms(res.data || []);
    } catch (err) {
      //
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionService.getTransactions({
        type: 'INCOME',
        search,
        status: statusFilter,
        program_id: programFilter,
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (res.success) {
        setTransactions(res.data || []);
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
    fetchTransactions();
  }, [search, statusFilter, programFilter, dateFrom, dateTo]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleSubmitTransaction = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin mengajukan (submit) transaksi ini untuk diproses?')) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await transactionService.submitTransaction(id);
      if (res.success) {
        showToast('Transaksi berhasil diajukan (SUBMITTED).');
        fetchTransactions();
      } else {
        showToast(res.message || 'Gagal mengajukan transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTransaction = async (id, no) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus transaksi #${no}?`)) {
      return;
    }
    setActionLoading(id);
    try {
      const res = await transactionService.deleteTransaction(id);
      if (res && res.success) {
        showToast('Transaksi berhasil dihapus.');
        fetchTransactions();
      } else {
        showToast(res?.message || 'Gagal menghapus transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menghapus transaksi.');
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Draft</span>;
      case 'SUBMITTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Send className="w-3 h-3" /> Diajukan</span>;
      case 'POSTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Posted</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3 h-3" /> Ditolak</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
            Transaksi Penerimaan Dana
          </h1>
          <p className="text-xs text-slate-500 mt-1">Pencatatan dan riwayat donasi & penerimaan kas/bank yayasan.</p>
        </div>

        {canCreate && (
          <button
            onClick={() => navigate('/transactions/income/new')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Catat Penerimaan Baru
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. transaksi / keterangan..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Semua Status --</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED (Diajukan)</option>
            <option value="POSTED">POSTED (Disetujui)</option>
            <option value="REJECTED">REJECTED (Ditolak)</option>
          </select>

          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Semua Program --</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat data penerimaan...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Tidak ada transaksi penerimaan ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Tanggal / No TRX</th>
                  <th className="px-5 py-3.5">Kas/Bank & Akun</th>
                  <th className="px-5 py-3.5">Donatur & Program</th>
                  <th className="px-5 py-3.5">Keterangan</th>
                  <th className="px-5 py-3.5 text-right">Nominal</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{t.transaction_no}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {t.transaction_date}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{t.cash_bank_account?.name || '-'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Kredit: {t.income_account ? `[${t.income_account.code}] ${t.income_account.name}` : '-'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{t.donor?.name || 'Hamba Allah (Anonim)'}</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        {t.program ? t.program.name : 'Umum / Non-Program'}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                      {t.description}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                      {formatCurrency(t.amount)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(t.status)}
                    </td>

                    <td className="px-5 py-4 text-right space-x-1">
                      <button
                        onClick={() => navigate(`/transactions/${t.id}`)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                        title="Lihat Detail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canCreate && (
                        <>
                          <button
                            onClick={() => navigate(`/transactions/income/${t.id}/edit`)}
                            className="px-2.5 py-1 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                            title="Edit Transaksi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteTransaction(t.id, t.transaction_no)}
                            disabled={actionLoading === t.id}
                            className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeListPage;
