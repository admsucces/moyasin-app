import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { journalService } from '../../services/journalService';
import { exportService } from '../../services/exportService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Calendar, 
  CheckCircle2, 
  RefreshCw,
  RotateCcw,
  X,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  UserCheck,
  CalendarCheck,
  Link2,
  Download
} from 'lucide-react';

export const JournalListPage = () => {
  const location = useLocation();
  const isTransactionMenu = location.pathname.includes('/transactions/journals');

  const { user } = useAuth();
  const role = user?.role?.code || user?.role || '';
  const isAdmin = role === 'ADMIN';

  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ page: 1, per_page: 25, total: 0, total_pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Selected Journal for Detail Modal
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportCsv = async () => {
    try {
      setExportLoading(true);
      await exportService.exportJournals({
        search,
        date_from: dateFrom,
        date_to: dateTo,
        status: statusFilter,
      });
    } catch (err) {
      alert('Gagal mengunduh CSV jurnal: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setExportLoading(false);
    }
  };

  const fetchJournals = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        per_page: 25,
        search,
        date_from: dateFrom,
        date_to: dateTo,
        status: statusFilter,
      };

      const response = await journalService.getJournals(params);
      if (response && response.success) {
        setJournals(response.data || []);
        if (response.meta) {
          setMeta(response.meta);
        }
      } else {
        setError(response?.message || 'Gagal memuat daftar jurnal.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem saat mengambil data jurnal.');
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    fetchJournals(1);
  }, [fetchJournals]);

  const filteredJournals = journals.filter((jrn) => {
    if (sourceFilter === 'MANUAL') return !jrn.transaction;
    if (sourceFilter === 'INCOME') return jrn.transaction?.type === 'INCOME';
    if (sourceFilter === 'EXPENSE') return jrn.transaction?.type === 'EXPENSE';
    return true;
  });

  const handleOpenDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await journalService.getJournal(id);
      if (res && res.success) {
        setSelectedJournal(res.data);
      }
    } catch (err) {
      alert(err.message || 'Gagal memuat detail jurnal.');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={FileText}
        badge="Akuntansi"
        title={isTransactionMenu ? 'Jurnal Umum (Pencatatan Jurnal Manual)' : 'Buku Jurnal (Journal Register)'}
        subtitle={
          isTransactionMenu 
            ? 'Modul transaksi pencatatan entri jurnal manual & penyesuaian akuntansi (Manual Journal Entry).' 
            : 'Buku pencatatan kronologis seluruh entri jurnal ter-posting dari Penerimaan, Pengeluaran, & Jurnal Manual.'
        }
        actions={
          <>
            <button
              onClick={handleExportCsv}
              disabled={exportLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs backdrop-blur-md border border-white/30 shadow-md transition-all"
            >
              <Download className={`w-4 h-4 text-white ${exportLoading ? 'animate-bounce' : ''}`} />
              <span>{exportLoading ? 'Mengunduh...' : 'Export CSV'}</span>
            </button>
            {isTransactionMenu && isAdmin && (
              <Link
                to="/journals/new"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs hover:bg-slate-100 transition-all shadow-md"
              >
                <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span>Input Jurnal Manual Baru</span>
              </Link>
            )}
          </>
        }
      />

      {/* Filter Section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
        {/* Source Filter Tabs with Icons - Rapi Lebar Kanan Kiri */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
                sourceFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Jurnal</span>
            </button>
            {!isTransactionMenu && (
              <>
                <button
                  onClick={() => setSourceFilter('INCOME')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
                    sourceFilter === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Jurnal Penerimaan</span>
                </button>
                <button
                  onClick={() => setSourceFilter('EXPENSE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
                    sourceFilter === 'EXPENSE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  <span>Jurnal Pengeluaran</span>
                </button>
              </>
            )}
            <button
              onClick={() => setSourceFilter('MANUAL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
                sourceFilter === 'MANUAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
              <span>Jurnal Manual / Penyesuaian</span>
            </button>
          </div>
        </div>

        {/* Input & Date Filters */}
        <div className="space-y-3">
          {/* Baris Pencarian & Tombol Reset (Desktop sm: ke atas sejajar) */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari No Jurnal / Deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Hapus teks pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tombol Reset Filter untuk PC/Tablet (di samping search) */}
            {(search || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors shrink-0 border border-rose-200/60"
                title="Reset pencarian dan tanggal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* Filter Tanggal 2 Kolom dengan Label Dari dan Sampai */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Dari Tanggal
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Sampai Tanggal
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Tombol Reset Filter Khusus Tampil di HP (di bawah tanggal) */}
          {(search || dateFrom || dateTo) && (
            <div className="sm:hidden pt-1">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200/80 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter (Pencarian & Tanggal)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-5 py-3.5">No. Jurnal & Deskripsi</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Referensi</th>
                <th className="px-5 py-3.5 text-right">Total Debit</th>
                <th className="px-5 py-3.5 text-right">Total Kredit</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Memuat data jurnal...</span>
                  </td>
                </tr>
              ) : filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    Tidak ditemukan catatan jurnal umum.
                  </td>
                </tr>
              ) : (
                filteredJournals.map((jrn) => (
                  <tr key={jrn.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Combined No. Jurnal & Deskripsi */}
                    <td className="px-5 py-4 max-w-sm">
                      <p className="font-bold text-slate-900 text-sm truncate">{jrn.description || '-'}</p>
                      <p className="font-mono text-slate-400 font-normal text-[11px] mt-0.5">{jrn.journal_no}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap font-medium">
                      {jrn.journal_date}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {jrn.transaction ? (
                        <Link 
                          to={`/transactions/${jrn.transaction.id}`} 
                          className="font-mono text-emerald-600 hover:underline font-semibold"
                        >
                          {jrn.transaction.transaction_no}
                        </Link>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          JURNAL MANUAL
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(jrn.total_debit)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(jrn.total_credit)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{jrn.status}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleOpenDetail(jrn.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Lihat Detail Jurnal"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={meta.page}
          totalItems={meta.total}
          itemsPerPage={meta.per_page || 25}
          onPageChange={(page) => fetchJournals(page)}
        />
      </div>

      {/* Journal Detail Modal (Elegan, Berwarna, Rapi & Responsive) */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold font-mono tracking-tight text-white">{selectedJournal.journal_no}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {selectedJournal.status || 'POSTED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">Detail Entri Buku Jurnal Umum (Double-Entry)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJournal(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              
              {/* Grid Cards for Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Tanggal Posting */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] uppercase">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tanggal Posting</span>
                  </div>
                  <p className="text-slate-800 font-semibold text-xs">{selectedJournal.journal_date || '-'}</p>
                </div>

                {/* Periode Akuntansi */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] uppercase">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Periode Akuntansi</span>
                  </div>
                  <p className="text-slate-800 font-semibold text-xs truncate">
                    {selectedJournal.accounting_period?.name || 
                     selectedJournal.accounting_period?.period_name || 
                     selectedJournal.accountingPeriod?.name || 
                     (selectedJournal.journal_date ? `Periode ${new Date(selectedJournal.journal_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : 'Periode Aktif')}
                  </p>
                </div>

                {/* Diposting Oleh */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] uppercase">
                    <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                    <span>Diposting Oleh</span>
                  </div>
                  <p className="text-slate-800 font-semibold text-xs truncate">
                    {selectedJournal.posted_user?.name || 
                     selectedJournal.postedBy?.name || 
                     selectedJournal.creator?.name || 
                     'Sistem (Otomatis)'}
                  </p>
                </div>

                {/* Referensi Transaksi */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] uppercase">
                    <Link2 className="w-3.5 h-3.5 text-purple-500" />
                    <span>Referensi Transaksi</span>
                  </div>
                  {selectedJournal.transaction ? (
                    <Link 
                      to={`/transactions/${selectedJournal.transaction.id}`} 
                      className="font-mono text-emerald-600 hover:underline font-semibold block truncate"
                    >
                      {selectedJournal.transaction.transaction_no}
                    </Link>
                  ) : (
                    <p className="text-slate-700 font-semibold text-xs">Jurnal Manual</p>
                  )}
                </div>
              </div>

              {/* Keterangan Card */}
              <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs">
                <span className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider block mb-1">
                  Keterangan / Deskripsi Jurnal:
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedJournal.description || '-'}
                </p>
              </div>

              {/* Entries Table Container (Responsive Scroll) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Rincian Entri Jurnal (Debet & Kredit)</span>
                  </h4>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                    Double-Entry Balanced
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-xs">
                  <table className="w-full text-xs text-left min-w-[500px]">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="px-4 py-2.5">Kode & Nama Akun</th>
                        <th className="px-4 py-2.5">Program</th>
                        <th className="px-4 py-2.5 text-right">Debit (Rp)</th>
                        <th className="px-4 py-2.5 text-right">Kredit (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {selectedJournal.entries?.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {entry.account?.code}
                              </span>
                              <span className="text-slate-700 font-medium">{entry.account?.name}</span>
                              {entry.account?.cash_bank_name && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {entry.account.cash_bank_name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {entry.program?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                            {Number(entry.debit) > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                            {Number(entry.credit) > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900 text-xs">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right uppercase text-[10px] text-slate-500 tracking-wider">
                          Total Saldo Jurnal:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700 text-sm">
                          {formatCurrency(selectedJournal.total_debit)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700 text-sm">
                          {formatCurrency(selectedJournal.total_credit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalListPage;
