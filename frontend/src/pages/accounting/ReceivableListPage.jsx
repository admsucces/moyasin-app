import React, { useState, useEffect } from 'react';
import receivableService from '../../services/receivableService';
import donorService from '../../services/donorService';
import accountService from '../../services/accountService';
import cashBankService from '../../services/cashBankService';
import useAuth from '../../hooks/useAuth';
import { 
  Receipt, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Building2, 
  X,
  CreditCard
} from 'lucide-react';

export const ReceivableListPage = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role || '';
  const canManage = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  const [receivables, setReceivables] = useState([]);
  const [summary, setSummary] = useState({});
  const [donors, setDonors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // New Receivable Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    donor_id: '',
    invoice_no: '',
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: '',
    receivable_account_id: '',
    description: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Receive Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [receiveData, setReceiveData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    cash_bank_account_id: '',
    notes: '',
  });
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

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

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const res = await receivableService.getReceivables({ search, status: statusFilter });
      if (res.success && res.data) {
        setReceivables(res.data.receivables || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      showToast('Gagal memuat data piutang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchReceivables();
  }, [search, statusFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const autoInvoiceNo = `INV-PTG-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

    const piutangAcc = accounts.find(a => a.code.includes('1104') || (a.type === 'ASSET' && a.name.toLowerCase().includes('piutang')))?.id || accounts.find(a => a.type === 'ASSET')?.id || '';
    const incomeAcc = accounts.find(a => a.type === 'INCOME')?.id || '';

    setFormData({
      customer_name: '',
      donor_id: '',
      invoice_no: autoInvoiceNo,
      transaction_date: today.toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_amount: '',
      receivable_account_id: piutangAcc,
      income_account_id: incomeAcc,
      description: '',
    });
    setAddModalOpen(true);
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

  const handleSaveReceivable = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const res = await receivableService.createReceivable(formData);
      if (res.success) {
        showToast('Catatan piutang baru berhasil disimpan.');
        setAddModalOpen(false);
        fetchReceivables();
      } else {
        showToast(res.message || 'Gagal menyimpan piutang.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmReceive = async (e) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    setReceiveSubmitting(true);
    try {
      const res = await receivableService.receiveReceivable(selectedReceivable.id, receiveData);
      if (res.success) {
        showToast('Penerimaan piutang berhasil dicatat dan diposting ke Jurnal Umum.');
        setReceiveModalOpen(false);
        fetchReceivables();
      } else {
        showToast(res.message || 'Gagal mencatat penerimaan piutang.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem saat pelunasan.');
    } finally {
      setReceiveSubmitting(false);
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
      case 'UNPAID':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">BELUM LUNAS</span>;
      case 'PARTIAL':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">SEBAGIAN</span>;
      case 'PAID':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">LUNAS</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-blue-600" />
            Piutang Usaha & Tagihan (Accounts Receivable)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan tagihan donasi/operasional, klaim piutang, dan penerimaan pelunasan.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Catat Piutang Baru
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')}>✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Jumlah Tagihan Piutang</span>
          <div className="text-xl font-bold text-slate-900 pt-1">
            {summary.total_count || 0} Tagihan ({summary.unpaid_count || 0} Belum Lunas)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Nilai Tagihan</span>
          <div className="text-xl font-bold text-slate-900 pt-1">
            {formatCurrency(summary.total_amount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Telah Diterima</span>
          <div className="text-xl font-bold text-emerald-600 pt-1">
            {formatCurrency(summary.total_received)}
          </div>
        </div>

        <div className="bg-blue-900 text-white p-4 rounded-2xl shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-blue-300 uppercase block">Sisa Piutang Belum Diterima</span>
          <div className="text-xl font-bold text-blue-300 pt-1">
            {formatCurrency(summary.total_remaining)}
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no piutang, no tagihan, nama pihak, atau keterangan..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Semua Status --</option>
          <option value="UNPAID">BELUM LUNAS (UNPAID)</option>
          <option value="PARTIAL">DICICIL (PARTIAL)</option>
          <option value="PAID">LUNAS (PAID)</option>
        </select>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat data piutang...</div>
        ) : receivables.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Tidak ada catatan piutang ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">No. Piutang / Tagihan</th>
                  <th className="px-5 py-3.5">Nama Pihak / Rekanan</th>
                  <th className="px-5 py-3.5">Tanggal & Jatuh Tempo</th>
                  <th className="px-5 py-3.5 text-right">Total Tagihan</th>
                  <th className="px-5 py-3.5 text-right">Telah Diterima</th>
                  <th className="px-5 py-3.5 text-right">Sisa Piutang</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  {canManage && <th className="px-5 py-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {receivables.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{r.receivable_no}</div>
                      <div className="text-[11px] text-slate-400">{r.invoice_no || 'Tanpa No. Invoice'}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{r.description || '-'}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-800 font-medium">{r.transaction_date}</div>
                      <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Jatuh Tempo: {r.due_date}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(r.total_amount)}
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-emerald-600">
                      {formatCurrency(r.received_amount)}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-blue-600">
                      {formatCurrency(r.remaining_balance)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(r.status)}
                    </td>

                    {canManage && (
                      <td className="px-5 py-4 text-right">
                        {r.status !== 'PAID' && (
                          <button
                            onClick={() => handleOpenReceive(r)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Terima Pelunasan
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Receivable */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Pencatatan Piutang Baru</h3>
              <button onClick={() => setAddModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveReceivable} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Donatur / Pihak Pembayar <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={formData.donor_id || (formData.customer_name ? 'MANUAL' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'MANUAL') {
                      setFormData({ ...formData, donor_id: '', customer_name: '' });
                    } else {
                      const selected = donors.find(d => String(d.id) === String(val));
                      setFormData({
                        ...formData,
                        donor_id: val,
                        customer_name: selected ? selected.name : '',
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih dari Data Rekanan --</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.type || 'REKANAN'}] {d.name} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                  <option value="MANUAL">+ Input Nama Donatur / Pihak Baru (Manual)</option>
                </select>

                {(!formData.donor_id || formData.donor_id === 'MANUAL') && (
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value, donor_id: '' })}
                    placeholder="Ketik nama donatur / pihak pembayar baru..."
                    className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No. Tagihan / Invoice <span className="text-slate-400 font-normal">(Otomatis Terbuat)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={formData.invoice_no}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tgl Transaksi <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jatuh Tempo <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Nominal Tagihan/Piutang (Rp) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  placeholder="3000000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Akun Piutang Aset (Debet Jurnal) <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={formData.receivable_account_id}
                  onChange={(e) => setFormData({ ...formData, receivable_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Akun Piutang --</option>
                  {accounts.filter(a => a.type === 'ASSET').map(a => (
                    <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Akun Pendapatan / Penerimaan (Kredit Jurnal) <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={formData.income_account_id}
                  onChange={(e) => setFormData({ ...formData, income_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Akun Pendapatan --</option>
                  {accounts.filter(a => a.type === 'INCOME').map(a => (
                    <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Piutang</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi komitmen donasi / tagihan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-60"
                >
                  {formSubmitting ? 'Simpan...' : 'Simpan Piutang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Receive Receivable */}
      {receiveModalOpen && selectedReceivable && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Terima Pelunasan Piutang #{selectedReceivable.receivable_no}
              </h3>
              <button onClick={() => setReceiveModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleConfirmReceive} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pihak Pembayar:</span>
                  <span className="font-bold text-slate-900">{selectedReceivable.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Piutang Belum Diterima:</span>
                  <span className="font-bold text-blue-600">{formatCurrency(selectedReceivable.remaining_balance)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Penerimaan <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={receiveData.payment_date}
                  onChange={(e) => setReceiveData({ ...receiveData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Diterima (Rp) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  max={selectedReceivable.remaining_balance}
                  required
                  value={receiveData.amount}
                  onChange={(e) => setReceiveData({ ...receiveData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Masuk Rekening Kas / Bank <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={receiveData.cash_bank_account_id}
                  onChange={(e) => setReceiveData({ ...receiveData, cash_bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Rekening Kas / Bank --</option>
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
                  placeholder="No transaksi bank, slip, dll..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={receiveSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-60"
                >
                  {receiveSubmitting ? 'Memproses Jurnal...' : 'Proses Penerimaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivableListPage;
