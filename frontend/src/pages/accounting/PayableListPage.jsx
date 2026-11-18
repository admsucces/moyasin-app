import React, { useState, useEffect } from 'react';
import payableService from '../../services/payableService';
import donorService from '../../services/donorService';
import accountService from '../../services/accountService';
import cashBankService from '../../services/cashBankService';
import useAuth from '../../hooks/useAuth';
import { 
  FileCheck2, 
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

export const PayableListPage = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role || '';
  const canManage = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  const [payables, setPayables] = useState([]);
  const [summary, setSummary] = useState({});
  const [donors, setDonors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // New Payable Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    donor_id: '',
    invoice_no: '',
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: '',
    payable_account_id: '',
    description: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [payData, setPayData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    cash_bank_account_id: '',
    notes: '',
  });
  const [paySubmitting, setPaySubmitting] = useState(false);

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

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const res = await payableService.getPayables({ search, status: statusFilter });
      if (res.success && res.data) {
        setPayables(res.data.payables || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      showToast('Gagal memuat data hutang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchPayables();
  }, [search, statusFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const autoInvoiceNo = `INV-HTG-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

    const payableAcc = accounts.find(a => a.type === 'LIABILITY')?.id || '';
    const expenseAcc = accounts.find(a => a.type === 'EXPENSE')?.id || '';

    setFormData({
      vendor_name: '',
      donor_id: '',
      invoice_no: autoInvoiceNo,
      transaction_date: today.toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_amount: '',
      payable_account_id: payableAcc,
      expense_asset_account_id: expenseAcc,
      description: '',
    });
    setAddModalOpen(true);
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

  const handleSavePayable = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const res = await payableService.createPayable(formData);
      if (res.success) {
        showToast('Catatan hutang baru berhasil disimpan.');
        setAddModalOpen(false);
        fetchPayables();
      } else {
        showToast(res.message || 'Gagal menyimpan hutang.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!selectedPayable) return;

    setPaySubmitting(true);
    try {
      const res = await payableService.payPayable(selectedPayable.id, payData);
      if (res.success) {
        showToast('Pembayaran hutang berhasil dicatat dan diposting ke Jurnal Umum.');
        setPayModalOpen(false);
        fetchPayables();
      } else {
        showToast(res.message || 'Gagal mencatat pembayaran hutang.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem saat pelunasan.');
    } finally {
      setPaySubmitting(false);
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
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">BELUM LUNAS</span>;
      case 'PARTIAL':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">SEBAGIAN</span>;
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
            <FileCheck2 className="w-6 h-6 text-rose-600" />
            Hutang Usaha & Kewajiban (Accounts Payable)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan tagihan vendor, kewajiban pembayaran, jatuh tempo, dan pelunasan hutang yayasan.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Catat Hutang Baru
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
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Jumlah Transaksi Hutang</span>
          <div className="text-xl font-bold text-slate-900 pt-1">
            {summary.total_count || 0} Trx ({summary.unpaid_count || 0} Belum Lunas)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Nilai Hutang</span>
          <div className="text-xl font-bold text-slate-900 pt-1">
            {formatCurrency(summary.total_amount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Telah Dibayar</span>
          <div className="text-xl font-bold text-emerald-600 pt-1">
            {formatCurrency(summary.total_paid)}
          </div>
        </div>

        <div className="bg-rose-900 text-white p-4 rounded-2xl shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-rose-300 uppercase block">Sisa Hutang Belum Lunas</span>
          <div className="text-xl font-bold text-rose-300 pt-1">
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
            placeholder="Cari no hutang, no faktur, vendor, atau keterangan..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <option value="">-- Semua Status --</option>
          <option value="UNPAID">BELUM LUNAS (UNPAID)</option>
          <option value="PARTIAL">DICICIL (PARTIAL)</option>
          <option value="PAID">LUNAS (PAID)</option>
        </select>
      </div>

      {/* Payables Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat data hutang...</div>
        ) : payables.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Tidak ada catatan hutang ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">No. Hutang / Faktur</th>
                  <th className="px-5 py-3.5">Nama Vendor / Rekanan</th>
                  <th className="px-5 py-3.5">Tanggal & Jatuh Tempo</th>
                  <th className="px-5 py-3.5 text-right">Total Utang</th>
                  <th className="px-5 py-3.5 text-right">Telah Dibayar</th>
                  <th className="px-5 py-3.5 text-right">Sisa Utang</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  {canManage && <th className="px-5 py-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {payables.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{p.payable_no}</div>
                      <div className="text-[11px] text-slate-400">{p.invoice_no || 'Tanpa No. Faktur'}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{p.vendor_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.description || '-'}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-slate-800 font-medium">{p.transaction_date}</div>
                      <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-rose-400" />
                        Jatuh Tempo: {p.due_date}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(p.total_amount)}
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-emerald-600">
                      {formatCurrency(p.paid_amount)}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-rose-600">
                      {formatCurrency(p.remaining_balance)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(p.status)}
                    </td>

                    {canManage && (
                      <td className="px-5 py-4 text-right">
                        {p.status !== 'PAID' && (
                          <button
                            onClick={() => handleOpenPay(p)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Bayar Hutang
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

      {/* Modal Add Payable */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Pencatatan Hutang Baru</h3>
              <button onClick={() => setAddModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSavePayable} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Vendor / Rekanan <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={formData.donor_id || (formData.vendor_name ? 'MANUAL' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'MANUAL') {
                      setFormData({ ...formData, donor_id: '', vendor_name: '' });
                    } else {
                      const selected = donors.find(d => String(d.id) === String(val));
                      setFormData({
                        ...formData,
                        donor_id: val,
                        vendor_name: selected ? selected.name : '',
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Pilih dari Data Rekanan --</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.type || 'REKANAN'}] {d.name} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                  <option value="MANUAL">+ Input Nama Vendor Baru / Manual</option>
                </select>

                {(!formData.donor_id || formData.donor_id === 'MANUAL') && (
                  <input
                    type="text"
                    required
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value, donor_id: '' })}
                    placeholder="Ketik nama vendor / supplier baru..."
                    className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No. Faktur / Tagihan <span className="text-slate-400 font-normal">(Otomatis Terbuat)</span>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jatuh Tempo <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Nominal Hutang (Rp) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  placeholder="5000000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Akun Beban / Aset (Debet Jurnal) <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={formData.expense_asset_account_id}
                  onChange={(e) => setFormData({ ...formData, expense_asset_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Pilih Akun Beban / Aset --</option>
                  {accounts.filter(a => a.type === 'EXPENSE' || a.type === 'ASSET').map(a => (
                    <option key={a.id} value={a.id}>[{a.code}] {a.name} ({a.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Akun Utang / Kewajiban (Kredit Jurnal) <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={formData.payable_account_id}
                  onChange={(e) => setFormData({ ...formData, payable_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Pilih Akun Utang --</option>
                  {accounts.filter(a => a.type === 'LIABILITY').map(a => (
                    <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Transaksi</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi pembelian / keperluan utang..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-60"
                >
                  {formSubmitting ? 'Simpan...' : 'Simpan Hutang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pay Payable */}
      {payModalOpen && selectedPayable && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Pelunasan Hutang #{selectedPayable.payable_no}
              </h3>
              <button onClick={() => setPayModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="font-bold text-slate-900">{selectedPayable.vendor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Utang Belum Dibayar:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(selectedPayable.remaining_balance)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Bayar <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={payData.payment_date}
                  onChange={(e) => setPayData({ ...payData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Pembayaran (Rp) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  max={selectedPayable.remaining_balance}
                  required
                  value={payData.amount}
                  onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sumber Kas / Bank <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={payData.cash_bank_account_id}
                  onChange={(e) => setPayData({ ...payData, cash_bank_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Rekening Kas / Bank --</option>
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
                  placeholder="Catatan via transfer, no resi, dll..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-60"
                >
                  {paySubmitting ? 'Memproses Jurnal...' : 'Proses Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayableListPage;
