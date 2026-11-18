import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transactionService } from '../../services/transactionService';
import { journalService } from '../../services/journalService';
import programService from '../../services/programService';
import approvalService from '../../services/approvalService';
import reversalService from '../../services/reversalService';
import useAuth from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingContext';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  Receipt, 
  ArrowUpRight, 
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
  Calendar,
  Layers,
  BookOpen,
  Sparkles,
  RefreshCw,
  X,
  Paperclip,
  Download,
  Upload,
  RotateCcw,
  CheckSquare,
  UserCheck,
  CalendarCheck,
  Link2
} from 'lucide-react';

export const TransactionUnifiedListPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const primaryColor = settings?.primary_color || '#4935e4';
  const secondaryColor = settings?.secondary_color || '#331ea0';
  const accentColor = settings?.accent_color || '#67e8f9';

  const roleCode = user?.role?.code || user?.role || '';
  const canCreate = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';
  const isAdmin = roleCode === 'ADMIN';

  // Determine initial active tab based on route
  const getInitialTab = () => {
    if (location.pathname.includes('/income')) return 'INCOME';
    if (location.pathname.includes('/expense')) return 'EXPENSE';
    if (location.pathname.includes('/journals')) return 'JOURNAL';
    return 'ALL';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [transactions, setTransactions] = useState([]);
  const [journals, setJournals] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 25;

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Toast & Modal & Drawer
  const [toastMsg, setToastMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Right Drawer State for Transaction Detail
  const [selectedTxDetail, setSelectedTxDetail] = useState(null);
  const [txDetailLoading, setTxDetailLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submittingDrawer, setSubmittingDrawer] = useState(false);

  // Reject & Reversal Modal States
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, statusFilter, programFilter, dateFrom, dateTo]);

  // Sync tab with location change if user navigates via direct URL
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const fetchPrograms = async () => {
    try {
      const res = await programService.getPrograms();
      if (res.success) setPrograms(res.data || []);
    } catch (err) {
      //
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'JOURNAL') {
        const params = {
          search,
          status: statusFilter,
          date_from: dateFrom,
          date_to: dateTo,
          page: currentPage,
          per_page: ITEMS_PER_PAGE,
        };
        const res = await journalService.getJournals(params);
        if (res && res.success) {
          setJournals(res.data || []);
          setTotalItems(res.meta?.total ?? (res.data || []).length);
        }
      } else {
        const params = {
          type: activeTab === 'ALL' ? undefined : activeTab,
          search,
          status: statusFilter,
          program_id: programFilter,
          date_from: dateFrom,
          date_to: dateTo,
          page: currentPage,
          per_page: ITEMS_PER_PAGE,
        };
        const res = await transactionService.getTransactions(params);
        if (res && res.success) {
          setTransactions(res.data || []);
          setTotalItems(res.meta?.total ?? (res.data || []).length);
        }
      }
    } catch (err) {
      //
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, statusFilter, programFilter, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Open Right Drawer for Transaction Detail
  const handleOpenTransactionDetail = async (id) => {
    setTxDetailLoading(true);
    setSelectedTxDetail(null);
    try {
      const res = await transactionService.getTransaction(id);
      if (res && res.success) {
        setSelectedTxDetail(res.data);
      } else {
        showToast(res?.message || 'Gagal memuat detail transaksi.');
      }
    } catch (err) {
      showToast('Gagal memuat detail transaksi.');
    } finally {
      setTxDetailLoading(false);
    }
  };

  const refreshDrawerDetail = async (id) => {
    try {
      const res = await transactionService.getTransaction(id);
      if (res && res.success) {
        setSelectedTxDetail(res.data);
      }
    } catch (err) {
      //
    }
  };

  const handleSubmitTransaction = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin mengajukan (submit) transaksi ini untuk diproses?')) {
      return;
    }

    setActionLoading(id);
    setSubmittingDrawer(true);
    try {
      const res = await transactionService.submitTransaction(id);
      if (res.success) {
        showToast('Transaksi berhasil diajukan (SUBMITTED).');
        fetchData();
        if (selectedTxDetail?.id === id) refreshDrawerDetail(id);
      } else {
        showToast(res.message || 'Gagal mengajukan transaksi.');
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengajukan transaksi.');
    } finally {
      setActionLoading(null);
      setSubmittingDrawer(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.')) {
      return;
    }

    setActionLoading(id);
    setSubmittingDrawer(true);
    try {
      const res = await transactionService.deleteTransaction(id);
      if (res.success) {
        showToast('Transaksi berhasil dihapus.');
        if (selectedTxDetail?.id === id) setSelectedTxDetail(null);
        fetchData();
      } else {
        showToast(res.message || 'Gagal menghapus transaksi.');
      }
    } catch (err) {
      showToast(err.message || 'Gagal menghapus transaksi.');
    } finally {
      setActionLoading(null);
      setSubmittingDrawer(false);
    }
  };

  const handleDrawerApprove = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menyetujui (APPROVE) transaksi ini?')) return;
    setSubmittingDrawer(true);
    try {
      const res = await approvalService.approveTransaction(id);
      if (res.success) {
        showToast('Transaksi berhasil disetujui (APPROVED).');
        fetchData();
        refreshDrawerDetail(id);
      } else {
        showToast(res.message || 'Gagal menyetujui transaksi.');
      }
    } catch (err) {
      showToast('Gagal memproses persetujuan.');
    } finally {
      setSubmittingDrawer(false);
    }
  };

  const handleDrawerConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedTxDetail || !rejectReason.trim()) return;
    setSubmittingDrawer(true);
    try {
      const res = await approvalService.rejectTransaction(selectedTxDetail.id, rejectReason);
      if (res.success) {
        showToast('Transaksi berhasil ditolak.');
        setRejectModalOpen(false);
        setRejectReason('');
        fetchData();
        refreshDrawerDetail(selectedTxDetail.id);
      } else {
        showToast(res.message || 'Gagal menolak transaksi.');
      }
    } catch (err) {
      showToast('Gagal memproses penolakan.');
    } finally {
      setSubmittingDrawer(false);
    }
  };

  const handleDrawerPost = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin memposting transaksi ini ke Jurnal Umum?')) return;
    setSubmittingDrawer(true);
    try {
      const res = await journalService.postTransaction(id);
      if (res.success) {
        showToast('Transaksi berhasil diposting ke Jurnal Umum.');
        fetchData();
        refreshDrawerDetail(id);
      } else {
        showToast(res.message || 'Gagal memposting transaksi.');
      }
    } catch (err) {
      showToast('Gagal memproses posting jurnal.');
    } finally {
      setSubmittingDrawer(false);
    }
  };

  const handleDrawerConfirmReversal = async (e) => {
    e.preventDefault();
    if (!selectedTxDetail || !reversalReason.trim() || reversalReason.length < 5) return;
    setSubmittingDrawer(true);
    try {
      const res = await reversalService.reverseTransaction(selectedTxDetail.id, reversalReason);
      if (res.success) {
        showToast('Pembalikan (Reversal) transaksi berhasil dilakukan.');
        setReverseModalOpen(false);
        setReversalReason('');
        fetchData();
        refreshDrawerDetail(selectedTxDetail.id);
      } else {
        showToast(res.message || 'Gagal melakukan pembalikan transaksi.');
      }
    } catch (err) {
      showToast('Gagal memproses reversal.');
    } finally {
      setSubmittingDrawer(false);
    }
  };

  const handleDrawerUploadAttachment = async (e, id) => {
    e.preventDefault();
    if (!selectedFile || !id) return;
    setUploading(true);
    try {
      const res = await transactionService.uploadAttachment(id, selectedFile);
      if (res.success) {
        showToast('Bukti transaksi berhasil diunggah.');
        setSelectedFile(null);
        refreshDrawerDetail(id);
      } else {
        showToast(res.message || 'Gagal mengunggah bukti transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat unggah bukti.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenJournalDetail = async (id) => {
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
    const num = Number(val) || 0;
    const absVal = Math.abs(num);
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absVal);
    if (num < 0) return `(${formatted})`;
    return formatted;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'POSTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> POSTED
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> SUBMITTED
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            DRAFT
          </span>
        );
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'INCOME') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowDownLeft className="w-3 h-3" /> Penerimaan
        </span>
      );
    }
    if (type === 'EXPENSE') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <ArrowUpRight className="w-3 h-3" /> Pengeluaran
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
        <BookOpen className="w-3 h-3" /> Jurnal Umum
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Card Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Receipt}
        badge="Pusat Transaksi"
        title="Modul Transaksi"
        subtitle="Kelola seluruh data Penerimaan, Pengeluaran, dan Jurnal Umum secara terpadu"
        hideActionsOnMobile={true}
        actions={
          canCreate && (
            <>
              <button
                onClick={() => navigate('/transactions/income/new')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-md transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span>Catat Penerimaan</span>
              </button>
              <button
                onClick={() => navigate('/transactions/expense/new')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-rose-300 stroke-[2.5]" />
                <span>Catat Pengeluaran</span>
              </button>
              <button
                onClick={() => navigate('/journals/new')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
                <span>Catat Jurnal Umum</span>
              </button>
            </>
          )
        }
      />

      {/* Main Container Card (Slightly Rounded) */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc overflow-hidden space-y-4 p-5">
        
        {/* Module Navigation Tabs (Slightly Rounded) */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-[#4935e4] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Transaksi</span>
          </button>
          
          <button
            onClick={() => setActiveTab('INCOME')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'INCOME'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Penerimaan (Income)</span>
          </button>

          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'EXPENSE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Pengeluaran (Expense)</span>
          </button>

          <button
            onClick={() => setActiveTab('JOURNAL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'JOURNAL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
            <span>Jurnal Umum (Journal)</span>
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari no. transaksi, keterangan, donatur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-medium pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              <option value="">Semua Status Approval</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="POSTED">POSTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Program Filter (For Income & Expense) */}
          {activeTab !== 'JOURNAL' && (
            <div className="w-full sm:w-44 shrink-0">
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="">Semua Program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Group */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Tanggal:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Table / Card Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Memuat data transaksi...
          </div>
        ) : activeTab === 'JOURNAL' ? (
          <>
            {/* MOBILE & TABLET CARD VIEW - JURNAL UMUM */}
            <div className="lg:hidden">
              {journals.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  Tidak ada data jurnal ditemukan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {journals.map((jrn) => (
                    <div
                      key={jrn.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />

                      <div className="space-y-3 pl-1.5">
                        {/* Header: Jenis, Nomor & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            {getTypeBadge('JOURNAL')}
                            <span className="font-mono text-[11px] font-bold text-slate-500 truncate">
                              {jrn.journal_no}
                            </span>
                          </div>
                          <div className="shrink-0">{getStatusBadge(jrn.status)}</div>
                        </div>

                        {/* Deskripsi & Tanggal */}
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                            {jrn.description || '-'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{jrn.journal_date}</span>
                          </div>
                        </div>

                        {/* Ringkasan Debit & Kredit */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Total Debit
                            </span>
                            <span className="font-mono font-extrabold text-xs text-slate-800 block truncate mt-0.5">
                              {formatCurrency(jrn.total_debit)}
                            </span>
                          </div>
                          <div className="min-w-0 border-l border-slate-200/80 pl-2.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Total Kredit
                            </span>
                            <span className="font-mono font-extrabold text-xs text-slate-800 block truncate mt-0.5">
                              {formatCurrency(jrn.total_credit)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Aksi */}
                      <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={() => handleOpenJournalDetail(jrn.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Detail</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW - JURNAL UMUM */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">No. Jurnal & Deskripsi</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4 text-right">Total Debit (Rp)</th>
                    <th className="py-3 px-4 text-right">Total Kredit (Rp)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {journals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada data jurnal ditemukan.
                      </td>
                    </tr>
                  ) : (
                    journals.map((jrn) => (
                      <tr key={jrn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 max-w-sm">
                          <p className="font-bold text-slate-900 text-sm truncate">{jrn.description || '-'}</p>
                          <p className="font-mono text-slate-400 font-normal text-[11px] mt-0.5">{jrn.journal_no}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {jrn.journal_date}
                        </td>
                        <td className="py-3 px-4">{getTypeBadge('JOURNAL')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(jrn.total_debit)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(jrn.total_credit)}
                        </td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(jrn.status)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenJournalDetail(jrn.id)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
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
          </>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW - TRANSAKSI (INCOME & EXPENSE) */}
            <div className="lg:hidden">
              {transactions.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  Tidak ada data transaksi ditemukan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'INCOME';
                    const canModifyDraft =
                      tx.status === 'DRAFT' &&
                      (roleCode === 'ADMIN' || (roleCode === 'PENGELOLA' && tx.created_by === user?.id));

                    return (
                      <div
                        key={tx.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                      >
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />

                        <div className="space-y-3 pl-1.5">
                          {/* Top Row: Jenis, No Transaksi & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              {getTypeBadge(tx.type)}
                              <span className="font-mono text-[11px] font-extrabold text-slate-600 truncate">
                                {tx.transaction_no}
                              </span>
                            </div>
                            <div className="shrink-0">{getStatusBadge(tx.status)}</div>
                          </div>

                          {/* Keterangan, Rekanan & Tanggal */}
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                              {tx.description || '-'}
                            </p>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-500 font-medium truncate">
                                {tx.donor?.name || tx.counterparty_name || '-'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-400 shrink-0 font-medium">
                                <Calendar className="w-3 h-3" />
                                {tx.transaction_date}
                              </span>
                            </div>
                          </div>

                          {/* Akun Kas/Lawan & Nominal */}
                          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-[11px] font-bold text-slate-700 truncate">
                                {tx.cash_bank_account?.account?.name || tx.cash_bank_account?.name || '-'}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {(isIncome ? tx.income_account?.name : tx.expense_account?.name) || '-'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                Nominal
                              </span>
                              <span
                                className={`font-mono font-extrabold text-sm tracking-tight ${
                                  isIncome ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {formatCurrency(tx.amount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenTransactionDetail(tx.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>

                          {canModifyDraft && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  navigate(
                                    isIncome
                                      ? `/transactions/income/${tx.id}/edit`
                                      : `/transactions/expense/${tx.id}/edit`
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-colors"
                                title="Edit DRAFT"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleSubmitTransaction(tx.id)}
                                disabled={actionLoading === tx.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors disabled:opacity-50"
                                title="Submit Approval"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Kirim</span>
                              </button>

                              <button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                disabled={actionLoading === tx.id}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-50"
                                title="Hapus DRAFT"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW - TRANSAKSI (INCOME & EXPENSE) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">No. Transaksi & Tanggal</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Keterangan / Donatur / Rekanan</th>
                    <th className="py-3 px-4">Akun Kas & Lawan</th>
                    <th className="py-3 px-4 text-right">Jumlah (Rp)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada data transaksi ditemukan.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-800">{tx.transaction_no}</p>
                          <p className="text-[10px] text-slate-400">{tx.transaction_date}</p>
                        </td>
                        <td className="py-3 px-4">{getTypeBadge(tx.type)}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800 max-w-xs truncate">{tx.description || '-'}</p>
                          <p className="text-[10px] text-slate-400">
                            {tx.donor?.name || tx.counterparty_name || '-'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600">
                          <p className="font-medium">{tx.cash_bank_account?.account?.name || tx.cash_bank_account?.name || '-'}</p>
                          <p className="text-[10px] text-slate-400">
                            {tx.type === 'INCOME' ? tx.income_account?.name : tx.expense_account?.name}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(tx.status)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenTransactionDetail(tx.id)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                              title="Lihat Detail Transaksi"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {tx.status === 'DRAFT' && (roleCode === 'ADMIN' || (roleCode === 'PENGELOLA' && tx.created_by === user?.id)) && (
                              <>
                                <button
                                  onClick={() => navigate(tx.type === 'INCOME' ? `/transactions/income/${tx.id}/edit` : `/transactions/expense/${tx.id}/edit`)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                                  title="Edit DRAFT"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleSubmitTransaction(tx.id)}
                                  disabled={actionLoading === tx.id}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                  title="Submit Approval"
                                >
                                  <Send className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  disabled={actionLoading === tx.id}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                  title="Hapus DRAFT"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
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
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* DETAIL JURNAL MODAL */}
      {selectedJournal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
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
                    <span className="font-mono text-emerald-600 font-semibold block truncate">
                      {selectedJournal.transaction.transaction_no}
                    </span>
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

      {/* RIGHT SIDE TRANSACTION DETAIL DRAWER */}
      {(selectedTxDetail || txDetailLoading) && (
        <>
          {/* Backdrop */}
          <div
            className="fixed top-0 left-0 right-0 bottom-[70px] md:bottom-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedTxDetail(null)}
          />

          {/* Slide-over Right Panel */}
          <div className="fixed top-0 right-0 bottom-[70px] md:bottom-0 z-40 w-full max-w-xl sm:max-w-2xl bg-white shadow-2xl border-l border-slate-200/80 flex flex-col transition-all duration-300">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200/70 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4935e4] text-white flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      {selectedTxDetail ? `Detail ${selectedTxDetail.transaction_no}` : 'Memuat Detail...'}
                    </h3>
                    {selectedTxDetail && getStatusBadge(selectedTxDetail.status)}
                  </div>
                  <p className="text-[10px] text-slate-500">Pratinjau cepat transaksi & audit trail</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            {txDetailLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mb-2 text-indigo-600" />
                <span>Memuat data transaksi...</span>
              </div>
            ) : selectedTxDetail ? (
              <>
                <div className="flex-1 overflow-y-auto p-4.5 space-y-4 custom-scrollbar">
                  
                  {/* Main Summary Box */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.2 rounded-md border mb-0.5 ${
                          selectedTxDetail.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {selectedTxDetail.type === 'INCOME' ? 'PENERIMAAN KAS' : 'PENGELUARAN KAS'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800">{selectedTxDetail.transaction_no}</h4>
                      </div>

                      <div className="text-right bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 uppercase font-medium block">Total Nominal</span>
                        <span className="text-sm font-extrabold text-emerald-700">{formatCurrency(selectedTxDetail.amount)}</span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tanggal</span>
                        <span className="font-semibold text-slate-800 text-[11px]">{selectedTxDetail.transaction_date}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Kas / Bank</span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block">{selectedTxDetail.cash_bank_account?.name || '-'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Akun COA</span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block">
                          {selectedTxDetail.type === 'INCOME' 
                            ? (selectedTxDetail.income_account ? `[${selectedTxDetail.income_account.code}] ${selectedTxDetail.income_account.name}` : '-')
                            : (selectedTxDetail.expense_account ? `[${selectedTxDetail.expense_account.code}] ${selectedTxDetail.expense_account.name}` : '-')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {selectedTxDetail.type === 'INCOME' ? 'Donatur' : 'Vendor/Penerima'}
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block">
                          {selectedTxDetail.type === 'INCOME' ? (selectedTxDetail.donor?.name || 'Hamba Allah') : (selectedTxDetail.counterparty_name || '-')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Program</span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block">{selectedTxDetail.program?.name || 'Umum'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Klasifikasi</span>
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {selectedTxDetail.restriction_type === 'WITH_RESTRICTION' ? 'Terikat Program' : 'Tanpa Pembatasan'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 block text-[10px] mb-0.5">Keterangan:</span>
                      <p className="p-2 bg-slate-50 rounded-lg text-slate-700 text-[11px] font-medium">{selectedTxDetail.description}</p>
                    </div>
                  </div>

                  {/* Bukti Transaksi & Lampiran */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-xs space-y-2.5">
                    <h4 className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                      Bukti Transaksi & Lampiran ({selectedTxDetail.attachments?.length || 0})
                    </h4>

                    {!selectedTxDetail.attachments || selectedTxDetail.attachments.length === 0 ? (
                      <p className="text-[10px] text-slate-400">Belum ada lampiran diunggah.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedTxDetail.attachments.map((att) => (
                          <div key={att.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                            <div className="truncate mr-2">
                              <p className="font-semibold text-slate-800 text-[11px] truncate">{att.original_name}</p>
                              <p className="text-[9px] text-slate-400">{(att.size_bytes / 1024).toFixed(1)} KB</p>
                            </div>
                            <a
                              href={att.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3 h-3" /> Unduh
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {canCreate && (selectedTxDetail.status === 'DRAFT' || selectedTxDetail.status === 'REJECTED') && (
                      <form onSubmit={(e) => handleDrawerUploadAttachment(e, selectedTxDetail.id)} className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                          className="text-[11px] text-slate-600 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700"
                        />
                        <button
                          type="submit"
                          disabled={!selectedFile || uploading}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-semibold shadow-xs flex items-center gap-1 disabled:opacity-50 shrink-0"
                        >
                          <Upload className="w-3 h-3" />
                          {uploading ? 'Unggah...' : 'Unggah'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Double-Entry Journal Preview Bar (Dark Luxury) */}
                  <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-xs space-y-2">
                    <h4 className="font-semibold text-xs text-emerald-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Simulasi Jurnal (Double-Entry)
                    </h4>

                    {selectedTxDetail.journal_preview && (
                      <div className="space-y-1.5 text-xs font-mono">
                        {selectedTxDetail.journal_preview.debit?.map((d, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <div className="truncate mr-2">
                              <span className="text-[8px] font-bold uppercase text-emerald-400 block">DEBIT</span>
                              <span className="font-medium text-slate-200 text-[10px] truncate block">[{d.account_code}] {d.account_name}</span>
                            </div>
                            <span className="font-bold text-emerald-300 text-[11px] shrink-0">{formatCurrency(d.amount)}</span>
                          </div>
                        ))}

                        {selectedTxDetail.journal_preview.credit?.map((c, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-800/90 p-2 rounded-lg border border-slate-700">
                            <div className="truncate mr-2">
                              <span className="text-[8px] font-bold uppercase text-cyan-400 block">KREDIT</span>
                              <span className="font-medium text-slate-200 text-[10px] truncate block">[{c.account_code}] {c.account_name}</span>
                            </div>
                            <span className="font-bold text-cyan-300 text-[11px] shrink-0">{formatCurrency(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-800 text-[9px] text-slate-400 space-y-0.5">
                      <div>Dibuat oleh: <span className="text-slate-200 font-semibold">{selectedTxDetail.creator?.name || 'Sistem'}</span></div>
                      {selectedTxDetail.submitted_at && <div>Diajukan: <span className="text-slate-200 font-semibold">{selectedTxDetail.submitted_at}</span></div>}
                      {selectedTxDetail.approved_at && <div>Disetujui: <span className="text-slate-200 font-semibold">{selectedTxDetail.approved_at}</span></div>}
                    </div>
                  </div>

                  {/* Riwayat Persetujuan Owner */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-xs space-y-2">
                    <h4 className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      Riwayat Persetujuan Owner ({selectedTxDetail.approval_history?.length || 0})
                    </h4>

                    {!selectedTxDetail.approval_history || selectedTxDetail.approval_history.length === 0 ? (
                      <p className="text-[10px] text-slate-400">Belum ada riwayat peninjauan oleh Owner.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedTxDetail.approval_history.map((appr) => (
                          <div key={appr.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 font-semibold">
                                {appr.action === 'APPROVED' ? (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">APPROVED</span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[9px] font-bold">REJECTED</span>
                                )}
                                <span className="text-slate-800 text-[10px]">{appr.actor_name}</span>
                              </div>
                              <span className="text-[9px] text-slate-400">{appr.created_at}</span>
                            </div>
                            {appr.comments && (
                              <p className="text-slate-600 bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                                "{appr.comments}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky Bottom Action Bar Inside Drawer */}
                <div className="p-3 border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-sm flex items-center justify-between shrink-0 text-xs gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">Aksi Transaksi:</span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {canCreate && (
                      <>
                        <button
                          onClick={() => navigate(selectedTxDetail.type === 'INCOME' ? `/transactions/income/${selectedTxDetail.id}/edit` : `/transactions/expense/${selectedTxDetail.id}/edit`)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[11px] font-semibold border border-amber-200 flex items-center gap-1 transition-colors"
                          title="Edit Transaksi"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(selectedTxDetail.id)}
                          disabled={submittingDrawer}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-[11px] font-semibold border border-rose-200 flex items-center gap-1 disabled:opacity-60 transition-colors"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </>
                    )}

                    {canCreate && (selectedTxDetail.status === 'DRAFT' || selectedTxDetail.status === 'REJECTED') && (
                      <button
                        onClick={() => handleSubmitTransaction(selectedTxDetail.id)}
                        disabled={submittingDrawer}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit
                      </button>
                    )}

                    {isAdmin && selectedTxDetail.status === 'APPROVED' && (
                      <button
                        onClick={() => handleDrawerPost(selectedTxDetail.id)}
                        disabled={submittingDrawer}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs disabled:opacity-60"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Posting Jurnal
                      </button>
                    )}

                    {(isAdmin || roleCode === 'OWNER') && selectedTxDetail.status === 'POSTED' && (
                      <button
                        onClick={() => { setReversalReason(''); setReverseModalOpen(true); }}
                        disabled={submittingDrawer}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs disabled:opacity-60"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reverse
                      </button>
                    )}

                    {roleCode === 'OWNER' && selectedTxDetail.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={() => { setRejectReason(''); setRejectModalOpen(true); }}
                          disabled={submittingDrawer}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs disabled:opacity-60"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Tolak
                        </button>
                        <button
                          onClick={() => handleDrawerApprove(selectedTxDetail.id)}
                          disabled={submittingDrawer}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      {/* Reject Modal Dialog */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                Penolakan Transaksi #{selectedTxDetail?.transaction_no}
              </h3>
              <button onClick={() => setRejectModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleDrawerConfirmReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim() || submittingDrawer}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  Tolak Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Modal Dialog */}
      {reverseModalOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                Pembalik (Reversal) Transaksi #{selectedTxDetail?.transaction_no}
              </h3>
              <button onClick={() => setReverseModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleDrawerConfirmReversal} className="space-y-3">
              <p className="text-xs text-slate-600 bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                Pembalikan akan membuat Jurnal Pembalik (*Reversal Journal*) yang membalik posisi Debet & Kredit transaksi asli tanpa menghapus data secara permanen.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembalikan (Reversal) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Tuliskan alasan koreksi / pembalikan transaksi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReverseModalOpen(false)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!reversalReason.trim() || reversalReason.length < 5 || submittingDrawer}
                  className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  Proses Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionUnifiedListPage;
