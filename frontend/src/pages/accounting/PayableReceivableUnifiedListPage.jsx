import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import payableService from '../../services/payableService';
import receivableService from '../../services/receivableService';
import debtPaymentService from '../../services/debtPaymentService';
import donorService from '../../services/donorService';
import accountService from '../../services/accountService';
import cashBankService from '../../services/cashBankService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { exportToCsv } from '../../utils/csvExport';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Building2, 
  X,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  FileText,
  User,
  CheckSquare,
  History,
  Pencil,
  Trash2,
  Download
} from 'lucide-react';

export const PayableReceivableUnifiedListPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const roleCode = user?.role?.code || user?.role || '';
  const canManage = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  // Active Tab: 'ALL' | 'PAYABLE' | 'RECEIVABLE'
  const getInitialTab = () => {
    if (location.pathname.includes('/receivables')) return 'RECEIVABLE';
    if (location.pathname.includes('/payables') && !location.pathname.includes('/payables-receivables')) return 'PAYABLE';
    return 'ALL';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Master Data
  const [donors, setDonors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  // Data State
  const [payables, setPayables] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [payableSummary, setPayableSummary] = useState({});
  const [receivableSummary, setReceivableSummary] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, statusFilter]);

  // Pay Payable Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [payData, setPayData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    cash_bank_account_id: '',
    notes: '',
  });

  // Receive Receivable Modal
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [receiveData, setReceiveData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    cash_bank_account_id: '',
    notes: '',
  });

  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Detail Drawer Modal
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(null); // 'PAYABLE' | 'RECEIVABLE'

  // Payment History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit Payment Modal
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [editPaymentData, setEditPaymentData] = useState({
    id: '',
    payment_date: '',
    amount: '',
    cash_bank_account_id: '',
    notes: '',
  });
  const [editPaymentSubmitting, setEditPaymentSubmitting] = useState(false);

  // Delete Payment Modal
  const [deletePaymentModalOpen, setDeletePaymentModalOpen] = useState(false);
  const [deletePaymentData, setDeletePaymentData] = useState(null);
  const [deletePaymentSubmitting, setDeletePaymentSubmitting] = useState(false);

  // Delete Confirmation Modal for Payable/Receivable
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMasterData = async () => {
    try {
      const [dRes, aRes, cbRes] = await Promise.all([
        donorService.getDonors(),
        accountService.getAccounts({ is_postable: true }),
        cashBankService.getCashBankAccounts(),
      ]);
      if (dRes.success) setDonors(dRes.data || []);
      if (aRes.success) setAccounts(aRes.data || []);
      if (cbRes.success) setCashBankAccounts(cbRes.data || []);
    } catch (err) {
      //
    }
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        payableService.getPayables({ search, status: statusFilter }),
        receivableService.getReceivables({ search, status: statusFilter }),
      ]);

      if (pRes.success && pRes.data) {
        setPayables(pRes.data.payables || []);
        setPayableSummary(pRes.data.summary || {});
      }
      if (rRes.success && rRes.data) {
        setReceivables(rRes.data.receivables || []);
        setReceivableSummary(rRes.data.summary || {});
      }
    } catch (err) {
      showToast('Gagal memuat data hutang & piutang.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenPay = (payable) => {
    setSelectedPayable(payable);
    setPayData({
      payment_date: new Date().toISOString().split('T')[0],
      amount: payable.remaining_balance,
      cash_bank_account_id: cashBankAccounts[0]?.id || '',
      notes: `Pelunasan Hutang No. ${payable.payable_no}`,
    });
    setPayModalOpen(true);
  };

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    try {
      const res = await payableService.payPayable(selectedPayable.id, payData);
      if (res.success) {
        showToast('Pembayaran / pelunasan hutang berhasil diproses.');
        setPayModalOpen(false);
        if (detailItem && detailType === 'PAYABLE') setDetailItem(null);
        fetchAllData();
      } else {
        showToast(res.message || 'Gagal memproses pembayaran hutang.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleOpenReceive = (receivable) => {
    setSelectedReceivable(receivable);
    setReceiveData({
      payment_date: new Date().toISOString().split('T')[0],
      amount: receivable.remaining_balance,
      cash_bank_account_id: cashBankAccounts[0]?.id || '',
      notes: `Penerimaan Pelunasan Piutang No. ${receivable.receivable_no}`,
    });
    setReceiveModalOpen(true);
  };

  const handleConfirmReceive = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    try {
      const res = await receivableService.receiveReceivable(selectedReceivable.id, receiveData);
      if (res.success) {
        showToast('Penerimaan pelunasan piutang berhasil diproses.');
        setReceiveModalOpen(false);
        if (detailItem && detailType === 'RECEIVABLE') setDetailItem(null);
        fetchAllData();
      } else {
        showToast(res.message || 'Gagal memproses penerimaan piutang.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const reloadHistoryItem = async (item) => {
    try {
      const res = item.itemType === 'PAYABLE'
        ? await payableService.getPayable(item.id)
        : await receivableService.getReceivable(item.id);

      if (res.success && res.data) {
        setHistoryItem({ ...res.data, itemType: item.itemType });
      }
    } catch (err) {
      //
    }
  };

  const handleOpenHistory = async (item) => {
    setLoadingHistory(true);
    setHistoryItem(item);
    setHistoryModalOpen(true);
    try {
      await reloadHistoryItem(item);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenEditPayment = (pmt) => {
    setEditPaymentData({
      id: pmt.id,
      payment_date: pmt.payment_date || new Date().toISOString().split('T')[0],
      amount: pmt.amount || '',
      cash_bank_account_id: pmt.cash_bank_account_id || (cashBankAccounts[0]?.id || ''),
      notes: pmt.notes || '',
    });
    setEditPaymentModalOpen(true);
  };

  const handleConfirmUpdatePayment = async (e) => {
    e.preventDefault();
    setEditPaymentSubmitting(true);
    try {
      const res = await debtPaymentService.updatePayment(editPaymentData.id, editPaymentData);
      if (res.success) {
        showToast('Catatan pembayaran berhasil diperbarui.');
        setEditPaymentModalOpen(false);
        if (historyItem) await reloadHistoryItem(historyItem);
        fetchAllData();
      } else {
        showToast(res.message || 'Gagal memperbarui catatan pembayaran.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setEditPaymentSubmitting(false);
    }
  };

  const handleOpenDeletePayment = (pmt) => {
    setDeletePaymentData(pmt);
    setDeletePaymentModalOpen(true);
  };

  const handleConfirmDeletePayment = async () => {
    if (!deletePaymentData) return;
    setDeletePaymentSubmitting(true);
    try {
      const res = await debtPaymentService.deletePayment(deletePaymentData.id);
      if (res.success) {
        showToast('Catatan pembayaran berhasil dihapus.');
        setDeletePaymentModalOpen(false);
        setDeletePaymentData(null);
        if (historyItem) await reloadHistoryItem(historyItem);
        fetchAllData();
      } else {
        showToast(res.message || 'Gagal menghapus catatan pembayaran.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi saat menghapus.');
    } finally {
      setDeletePaymentSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = deleteItem.itemType === 'PAYABLE'
        ? await payableService.deletePayable(deleteItem.id)
        : await receivableService.deleteReceivable(deleteItem.id);

      if (res.success) {
        showToast(`Catatan ${deleteItem.itemType === 'PAYABLE' ? 'Hutang' : 'Piutang'} berhasil dihapus.`);
        setDeleteModalOpen(false);
        setDeleteItem(null);
        fetchAllData();
      } else {
        showToast(res.message || 'Gagal menghapus data.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi saat menghapus.');
    } finally {
      setDeleting(false);
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
      case 'PAID':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">LUNAS (PAID)</span>;
      case 'PARTIAL':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">SEBAGIAN (PARTIAL)</span>;
      case 'OVERDUE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">JATUH TEMPO</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">BELUM DIBAYAR</span>;
    }
  };

  // Prepare combined list
  const combinedList = [];
  if (activeTab === 'ALL' || activeTab === 'PAYABLE') {
    payables.forEach(p => {
      combinedList.push({
        ...p,
        itemType: 'PAYABLE',
        codeNo: p.payable_no,
        partyName: p.vendor_name || p.donor?.name || 'Vendor / Pihak Ke-3',
      });
    });
  }
  if (activeTab === 'ALL' || activeTab === 'RECEIVABLE') {
    receivables.forEach(r => {
      combinedList.push({
        ...r,
        itemType: 'RECEIVABLE',
        codeNo: r.receivable_no,
        partyName: r.customer_name || r.donor?.name || 'Customer / Donatur',
      });
    });
  }

  // Sort by date descending
  combinedList.sort((a, b) => new Date(b.transaction_date || 0) - new Date(a.transaction_date || 0));

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculated reliable KPI summaries with fallback
  const totalPayableRemaining = payableSummary.total_unpaid_amount 
    ?? payableSummary.total_remaining 
    ?? payables.filter(p => p.status !== 'PAID').reduce((sum, p) => sum + (Number(p.remaining_balance) || 0), 0);

  const totalReceivableRemaining = receivableSummary.total_unpaid_amount 
    ?? receivableSummary.total_remaining 
    ?? receivables.filter(r => r.status !== 'PAID').reduce((sum, r) => sum + (Number(r.remaining_balance) || 0), 0);

  const payableOverdueCount = payableSummary.overdue_count 
    ?? payables.filter(p => p.status !== 'PAID' && p.due_date && p.due_date < todayStr).length;

  const receivableOverdueCount = receivableSummary.overdue_count 
    ?? receivables.filter(r => r.status !== 'PAID' && r.due_date && r.due_date < todayStr).length;

  const handleExportCsv = () => {
    if (!combinedList || combinedList.length === 0) {
      alert('Tidak ada data hutang & piutang untuk diekspor.');
      return;
    }

    const tabName = activeTab === 'PAYABLE' ? 'Hutang' : activeTab === 'RECEIVABLE' ? 'Piutang' : 'Hutang_Piutang';
    const filename = `${tabName}_${new Date().toISOString().split('T')[0]}`;

    const headers = [
      'Tipe',
      'No Referensi',
      'Pihak Terkait (Rekanan)',
      'Tanggal Transaksi',
      'Jatuh Tempo',
      'Total Tagihan (IDR)',
      'Sudah Dibayar/Diterima (IDR)',
      'Sisa Saldo (IDR)',
      'Status',
      'Catatan / Keterangan'
    ];

    const rows = combinedList.map((item) => {
      const typeLabel = item.itemType === 'PAYABLE' ? 'Hutang (Kewajiban)' : 'Piutang (Klaim)';
      const paidOrReceived = item.itemType === 'PAYABLE' ? (item.paid_amount || 0) : (item.received_amount || 0);

      return [
        typeLabel,
        item.codeNo || '',
        item.partyName || '-',
        item.transaction_date || '',
        item.due_date || '-',
        Number(item.total_amount || 0).toFixed(2),
        Number(paidOrReceived).toFixed(2),
        Number(item.remaining_balance || 0).toFixed(2),
        item.status || 'UNPAID',
        item.notes || item.description || '-'
      ];
    });

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={CreditCard}
        badge="Buku Pembantu"
        title="Hutang & Piutang"
        subtitle="Kelola kewajiban hutang yayasan & klaim piutang penerimaan, pelunasan, serta saldo berjalan"
        actions={
          <>
            <button
              onClick={handleExportCsv}
              disabled={combinedList.length === 0}
              className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>

            {canManage && (
              <button
                onClick={() => navigate('/accounting/payables-receivables/new')}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span>Catat Hutang Piutang</span>
              </button>
            )}
          </>
        }
      />

      {/* KPI Cards DENGAN WARNA TOMPEL (2 Kolom di HP & Rata Tengah) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={ArrowUpRight}
          title="TOTAL SALDO HUTANG"
          value={formatCurrency(totalPayableRemaining)}
          color="rose"
          badge="Kewajiban"
          badgeType="negative"
          subtitle="Belum dilunasi"
          verticalCenter={true}
        />

        <StatCard
          icon={ArrowDownLeft}
          title="TOTAL SALDO PIUTANG"
          value={formatCurrency(totalReceivableRemaining)}
          color="emerald"
          badge="Klaim"
          badgeType="positive"
          subtitle="Belum dicairkan"
          verticalCenter={true}
        />

        <StatCard
          icon={AlertCircle}
          title="HUTANG JATUH TEMPO"
          value={`${payableOverdueCount || 0} Tagihan`}
          color="amber"
          badge="Prioritas"
          badgeType="warning"
          subtitle="Perlu pembayaran segera"
          verticalCenter={true}
        />

        <StatCard
          icon={Clock}
          title="PIUTANG JATUH TEMPO"
          value={`${receivableOverdueCount || 0} Tagihan`}
          color="indigo"
          badge="Follow-up"
          badgeType="info"
          subtitle="Perlu tindak lanjut"
          verticalCenter={true}
        />
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc p-5 space-y-4">
        
        {/* Module Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Hutang & Piutang</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYABLE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'PAYABLE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Hutang (Payable)</span>
          </button>

          <button
            onClick={() => setActiveTab('RECEIVABLE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'RECEIVABLE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Piutang (Receivable)</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari no. invoice, vendor, customer, keterangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-medium pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              <option value="">Semua Status Tagihan</option>
              <option value="UNPAID">UNPAID (Belum Lunas)</option>
              <option value="PARTIAL">PARTIAL (Dicicil)</option>
              <option value="PAID">PAID (Lunas)</option>
              <option value="OVERDUE">OVERDUE (Jatuh Tempo)</option>
            </select>
          </div>
        </div>

        {/* MOBILE & TABLET CARD VIEW */}
        <div className="lg:hidden">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
              <span>Memuat data hutang & piutang...</span>
            </div>
          ) : combinedList.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              Tidak ditemukan data catatan hutang / piutang.
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {combinedList
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((item) => {
                    const isPayable = item.itemType === 'PAYABLE';
                    return (
                      <div
                        key={`${item.itemType}-${item.id}`}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                      >
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            isPayable ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />

                        <div className="space-y-3 pl-1.5">
                          {/* Top Row: Jenis, No. Kode & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              {isPayable ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shrink-0">
                                  <ArrowUpRight className="w-3 h-3 text-rose-500" /> Hutang
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> Piutang
                                </span>
                              )}
                              <span className="font-mono text-[11px] font-bold text-slate-500 truncate">
                                {item.codeNo}
                              </span>
                            </div>
                            <div className="shrink-0">{getStatusBadge(item.status)}</div>
                          </div>

                          {/* Deskripsi & Pihak Rekanan */}
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                              {item.description || item.invoice_no || '-'}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{item.partyName}</span>
                            </div>
                          </div>

                          {/* Tanggal & Jatuh Tempo */}
                          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50/80 border border-slate-100 text-[11px]">
                            <span className="text-slate-500">
                              Tgl: <strong className="text-slate-700">{item.transaction_date}</strong>
                            </span>
                            <span className="text-slate-500">
                              Tempo: <strong className="text-slate-700">{item.due_date || '-'}</strong>
                            </span>
                          </div>

                          {/* Nominal Total Tagihan & Sisa Saldo */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                Total Tagihan
                              </span>
                              <span className="font-mono font-bold text-xs text-slate-900 block truncate mt-0.5">
                                {formatCurrency(item.total_amount)}
                              </span>
                            </div>
                            <div
                              className={`p-2.5 rounded-xl border min-w-0 ${
                                isPayable
                                  ? 'bg-rose-50/60 border-rose-100'
                                  : 'bg-emerald-50/60 border-emerald-100'
                              }`}
                            >
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider block ${
                                  isPayable ? 'text-rose-400' : 'text-emerald-500'
                                }`}
                              >
                                Sisa Saldo
                              </span>
                              <span
                                className={`font-mono font-extrabold text-xs block truncate mt-0.5 ${
                                  isPayable ? 'text-rose-700' : 'text-emerald-700'
                                }`}
                              >
                                {formatCurrency(item.remaining_balance)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {canManage && item.status !== 'PAID' && (
                              isPayable ? (
                                <button
                                  onClick={() => handleOpenPay(item)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                                >
                                  Bayar
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenReceive(item)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                                >
                                  Terima
                                </button>
                              )
                            )}
                            <button
                              onClick={() => { setDetailItem(item); setDetailType(item.itemType); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold transition-colors"
                              title="Detail Rincian"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Rincian</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenHistory(item)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 transition-colors"
                              title="Riwayat Pembayaran"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            {canManage && (
                              <button
                                onClick={() => navigate(`/accounting/payables-receivables/${item.id}/edit?type=${item.itemType}`)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 transition-colors"
                                title="Edit Data"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {canManage && (
                              <button
                                onClick={() => { setDeleteItem(item); setDeleteModalOpen(true); }}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 transition-colors"
                                title="Hapus Data"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Ringkasan Total Mobile & Tablet */}
              <div className="rounded-2xl bg-slate-50/90 border border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <span className="font-bold text-slate-600">
                  Total {activeTab === 'ALL' ? 'Semua Tagihan (Hutang & Piutang)' : activeTab === 'PAYABLE' ? 'Semua Hutang' : 'Semua Piutang'}:
                </span>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block sm:inline sm:mr-1.5">
                      Tagihan:
                    </span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {formatCurrency(combinedList.reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block sm:inline sm:mr-1.5">
                      Sisa:
                    </span>
                    <span className="font-mono font-extrabold text-rose-600">
                      {formatCurrency(combinedList.reduce((acc, item) => acc + (Number(item.remaining_balance) || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP MAIN COMBINED TABLE */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Keterangan & No. Invoice</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Tgl & Jatuh Tempo</th>
                <th className="py-3 px-4">Pihak / Rekanan</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-right">Sisa Saldo</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Memuat data hutang & piutang...</span>
                  </td>
                </tr>
              ) : combinedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ditemukan data catatan hutang / piutang.
                  </td>
                </tr>
              ) : (
                combinedList
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((item) => (
                  <tr key={`${item.itemType}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-bold text-slate-900 text-sm truncate">{item.description || item.invoice_no || '-'}</p>
                      <p className="font-mono text-slate-400 font-normal text-[11px] mt-0.5">{item.codeNo}</p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.itemType === 'PAYABLE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                          <ArrowUpRight className="w-3 h-3 text-rose-500" /> Hutang
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> Piutang
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      <div>Tgl: <span className="font-semibold">{item.transaction_date}</span></div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Tempo: {item.due_date || '-'}</div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {item.partyName}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.total_amount)}
                    </td>

                    <td className={`py-3 px-4 text-right font-mono font-bold ${item.itemType === 'PAYABLE' ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatCurrency(item.remaining_balance)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {canManage && item.status !== 'PAID' && (
                          item.itemType === 'PAYABLE' ? (
                            <button
                              onClick={() => handleOpenPay(item)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-xs mr-0.5"
                            >
                              Bayar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenReceive(item)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-xs mr-0.5"
                            >
                              Terima
                            </button>
                          )
                        )}

                        {/* Riwayat Pembayaran Action Button */}
                        <button
                          onClick={() => handleOpenHistory(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Riwayat Pembayaran"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Edit Action Button */}
                        {canManage && (
                          <button
                            onClick={() => navigate(`/accounting/payables-receivables/${item.id}/edit?type=${item.itemType}`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Data"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {/* Hapus Action Button */}
                        {canManage && (
                          <button
                            onClick={() => { setDeleteItem(item); setDeleteModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Detail Rincian Action Button */}
                        <button
                          onClick={() => { setDetailItem(item); setDetailType(item.itemType); }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Detail Rincian"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {combinedList.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 border-t-2 border-slate-200 text-xs font-bold text-slate-800">
                  <td colSpan={4} className="py-3 px-4 text-right text-slate-600 font-semibold">
                    Total {activeTab === 'ALL' ? 'Semua Tagihan (Hutang & Piutang)' : activeTab === 'PAYABLE' ? 'Semua Hutang' : 'Semua Piutang'} :
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">
                    {formatCurrency(combinedList.reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                    {formatCurrency(combinedList.reduce((acc, item) => acc + (Number(item.remaining_balance) || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={combinedList.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>


      {/* Pay Payable Modal */}
      {payModalOpen && selectedPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Pembayaran Hutang #{selectedPayable.payable_no}</h3>
              <button onClick={() => setPayModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-3 text-xs">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                <span className="text-slate-500 block text-[11px]">Sisa Saldo Hutang:</span>
                <span className="text-rose-700 font-bold font-mono text-base">{formatCurrency(selectedPayable.remaining_balance)}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Bayar *</label>
                <input
                  type="date"
                  required
                  value={payData.payment_date}
                  onChange={(e) => setPayData({ ...payData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jumlah Bayar (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedPayable.remaining_balance}
                  value={payData.amount}
                  onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sumber Kas / Bank *</label>
                <select
                  required
                  value={payData.cash_bank_account_id}
                  onChange={(e) => setPayData({ ...payData, cash_bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                >
                  {cashBankAccounts.map(cb => (
                    <option key={cb.id} value={cb.id}>{cb.name} (Saldo: {formatCurrency(cb.balance ?? cb.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Pembayaran</label>
                <input
                  type="text"
                  value={payData.notes}
                  onChange={(e) => setPayData({ ...payData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setPayModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={actionSubmitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50">
                  {actionSubmitting ? 'Memproses...' : 'Konfirmasi Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Receivable Modal */}
      {receiveModalOpen && selectedReceivable && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Penerimaan Pelunasan Piutang #{selectedReceivable.receivable_no}</h3>
              <button onClick={() => setReceiveModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleConfirmReceive} className="space-y-3 text-xs">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="text-slate-500 block text-[11px]">Sisa Saldo Piutang:</span>
                <span className="text-emerald-700 font-bold font-mono text-base">{formatCurrency(selectedReceivable.remaining_balance)}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Penerimaan *</label>
                <input
                  type="date"
                  required
                  value={receiveData.payment_date}
                  onChange={(e) => setReceiveData({ ...receiveData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jumlah Diterima (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedReceivable.remaining_balance}
                  value={receiveData.amount}
                  onChange={(e) => setReceiveData({ ...receiveData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Masuk Rekening Kas / Bank *</label>
                <select
                  required
                  value={receiveData.cash_bank_account_id}
                  onChange={(e) => setReceiveData({ ...receiveData, cash_bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                >
                  {cashBankAccounts.map(cb => (
                    <option key={cb.id} value={cb.id}>{cb.name} (Saldo: {formatCurrency(cb.balance ?? cb.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Penerimaan</label>
                <input
                  type="text"
                  value={receiveData.notes}
                  onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setReceiveModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={actionSubmitting} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50">
                  {actionSubmitting ? 'Memproses...' : 'Konfirmasi Penerimaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Riwayat Pembayaran Modal */}
      {historyModalOpen && historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Riwayat Pembayaran {historyItem.itemType === 'PAYABLE' ? 'Hutang' : 'Piutang'}</h3>
                  <p className="text-[11px] text-slate-300 font-mono">No. Ref: {historyItem.codeNo} | Invoice: {historyItem.invoice_no || '-'}</p>
                </div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Summary Bar */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Total Tagihan:</span>
                  <span className="text-slate-900 font-mono font-bold text-sm">{formatCurrency(historyItem.total_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Total Terbayar:</span>
                  <span className="text-emerald-700 font-mono font-bold text-sm">
                    {formatCurrency(historyItem.itemType === 'PAYABLE' ? historyItem.paid_amount : historyItem.received_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Sisa Saldo:</span>
                  <span className="text-rose-600 font-mono font-bold text-sm">{formatCurrency(historyItem.remaining_balance)}</span>
                </div>
              </div>

              {/* Payment Records Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">Catatan Transaksi Pelunasan:</h4>
                {loadingHistory ? (
                  <div className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Memuat riwayat transaksi...</span>
                  </div>
                ) : !historyItem.payments || historyItem.payments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada riwayat pembayaran / pelunasan untuk data ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">No. Transaksi</th>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Kas / Bank</th>
                          <th className="py-2.5 px-3 text-right">Nominal</th>
                          <th className="py-2.5 px-3">Catatan</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyItem.payments.map((pmt) => (
                          <tr key={pmt.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{pmt.payment_no}</td>
                            <td className="py-2.5 px-3 text-slate-600">{pmt.payment_date}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{pmt.cash_bank_account?.name || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(pmt.amount)}</td>
                            <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{pmt.notes || '-'}</td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {canManage && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditPayment(pmt)}
                                    className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Edit Pembayaran"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeletePayment(pmt)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Hapus Pembayaran"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

            <div className="flex justify-end p-4 bg-slate-50 border-t border-slate-200">
              <button onClick={() => setHistoryModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Sub-Modal */}
      {editPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Edit Transaksi Pembayaran
              </h3>
              <button onClick={() => setEditPaymentModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleConfirmUpdatePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Transaksi *</label>
                <input
                  type="date"
                  required
                  value={editPaymentData.payment_date}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Pembayaran (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editPaymentData.amount}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rekening Kas / Bank *</label>
                <select
                  required
                  value={editPaymentData.cash_bank_account_id}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, cash_bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                >
                  {cashBankAccounts.map(cb => (
                    <option key={cb.id} value={cb.id}>{cb.name} (Saldo: {formatCurrency(cb.balance ?? cb.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={editPaymentData.notes}
                  onChange={(e) => setEditPaymentData({ ...editPaymentData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditPaymentModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={editPaymentSubmitting} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50">
                  {editPaymentSubmitting ? 'Simpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Sub-Modal */}
      {deletePaymentModalOpen && deletePaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Catatan Pembayaran</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              <p>Apakah Anda yakin ingin menghapus transaksi pembayaran ini?</p>
              <div className="font-semibold text-slate-800 space-y-0.5 pt-1">
                <p>• No. Pembayaran: <span className="font-mono">{deletePaymentData.payment_no}</span></p>
                <p>• Tanggal: {deletePaymentData.payment_date}</p>
                <p>• Nominal: <span className="font-mono font-bold text-rose-700">{formatCurrency(deletePaymentData.amount)}</span></p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletePaymentModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePayment}
                disabled={deletePaymentSubmitting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50"
              >
                {deletePaymentSubmitting ? 'Menghapus...' : 'Ya, Hapus Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hapus Confirmation Modal for Item */}
      {deleteModalOpen && deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Konfirmasi Hapus {deleteItem.itemType === 'PAYABLE' ? 'Hutang' : 'Piutang'}</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              <p>Apakah Anda yakin ingin menghapus data berikut?</p>
              <div className="font-semibold text-slate-800 space-y-0.5 pt-1">
                <p>• Ref: <span className="font-mono">{deleteItem.codeNo}</span></p>
                <p>• Pihak: {deleteItem.partyName}</p>
                <p>• Total Nominal: <span className="font-mono font-bold text-rose-700">{formatCurrency(deleteItem.total_amount)}</span></p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-sm font-mono">Detail Rincian {detailType === 'PAYABLE' ? 'Hutang' : 'Piutang'}: {detailItem.codeNo}</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">Tgl Transaksi: {detailItem.transaction_date}</p>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Pihak / Rekanan:</span>
                  <span className="text-slate-800 font-semibold">{detailItem.partyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">No Invoice / Tagihan:</span>
                  <span className="text-slate-800 font-mono font-semibold">{detailItem.invoice_no || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Total Tagihan:</span>
                  <span className="text-slate-900 font-mono font-bold">{formatCurrency(detailItem.total_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Sisa Saldo:</span>
                  <span className="text-rose-600 font-mono font-bold">{formatCurrency(detailItem.remaining_balance)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Keterangan:</span>
                <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200">{detailItem.description || '-'}</p>
              </div>
            </div>

            <div className="flex justify-end p-4 bg-slate-50 border-t border-slate-200">
              <button onClick={() => setDetailItem(null)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayableReceivableUnifiedListPage;
