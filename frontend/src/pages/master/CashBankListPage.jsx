import React, { useState, useEffect } from 'react';
import cashBankService from '../../services/cashBankService';
import accountService from '../../services/accountService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { Landmark, Plus, Search, CreditCard, DollarSign, X, Edit3, Trash2, Wallet } from 'lucide-react';

export const CashBankListPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.code === 'ADMIN';

  const [cashBanks, setCashBanks] = useState([]);
  const [postableAccounts, setPostableAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    account_id: '',
    type: 'BANK',
    name: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await cashBankService.getCashBankAccounts();
      if (res.success) setCashBanks(res.data || []);

      if (isAdmin) {
        const accRes = await accountService.getAccounts({ type: 'ASSET', is_postable: 'true' });
        if (accRes.success) setPostableAccounts(accRes.data || []);
      }
    } catch (err) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      account_id: '',
      type: 'BANK',
      name: '',
      bank_name: '',
      account_number: '',
      account_holder: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      account_id: String(item.account_id || item.account?.id || ''),
      type: item.type || 'BANK',
      name: item.name || '',
      bank_name: item.bank_name || '',
      account_number: item.account_number || '',
      account_holder: item.account_holder || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        account_id: Number(formData.account_id),
      };

      const res = editingItem
        ? await cashBankService.updateCashBankAccount(editingItem.id, payload)
        : await cashBankService.createCashBankAccount(payload);

      if (res.success) {
        setModalOpen(false);
        showToast(editingItem ? 'Akun Kas/Bank berhasil diperbarui.' : 'Akun Kas/Bank baru berhasil ditambahkan.');
        fetchData();
      } else {
        if (res.errors) setFormErrors(res.errors);
        else showToast(res.message || 'Gagal menyimpan akun kas/bank.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun kas/bank "${item.name}" secara permanen?\n\nPerhatian: Akun kas/bank yang sudah memiliki transaksi atau saldo berjalan tidak dapat dihapus.`)) {
      return;
    }

    try {
      const res = await cashBankService.deleteCashBankAccount(item.id);
      if (res.success) {
        showToast(res.message || `Akun kas/bank ${item.name} berhasil dihapus.`);
        fetchData();
      } else {
        showToast(res.message || 'Gagal menghapus akun kas/bank.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    }
  };

  const filteredCashBanks = cashBanks.filter((item) => {
    const matchesType = !typeFilter || item.type === typeFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (
      item.name?.toLowerCase().includes(q) ||
      item.bank_name?.toLowerCase().includes(q) ||
      item.account_number?.toLowerCase().includes(q) ||
      item.account_holder?.toLowerCase().includes(q) ||
      item.account?.code?.toLowerCase().includes(q) ||
      item.account?.name?.toLowerCase().includes(q)
    );
    return matchesType && matchesSearch;
  });

  const totalCash = cashBanks
    .filter((item) => item.type === 'CASH')
    .reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const countCash = cashBanks.filter((item) => item.type === 'CASH').length;

  const totalBank = cashBanks
    .filter((item) => item.type === 'BANK')
    .reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
  const countBank = cashBanks.filter((item) => item.type === 'BANK').length;

  const totalSaldo = filteredCashBanks.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Landmark}
        badge="Master Data"
        title="Akun Kas & Bank"
        subtitle="Pemetaan kas & bank operasional ke akun Buku Besar (Saldo berasal dari ledger)"
        actions={
          isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 shrink-0 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              Tambah Kas / Bank Baru
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

      {/* KPI Summary Cards DENGAN WARNA TOMPEL */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card Total Kas */}
        <StatCard
          icon={Wallet}
          title="TOTAL AKUN KAS (CASH)"
          value={formatCurrency(totalCash)}
          color="emerald"
          badge="Kas Operasional"
          badgeType="positive"
          subtitle={`${countCash} Akun Kas Tunai Yayasan`}
          verticalCenter={true}
        />

        {/* Card Total Bank */}
        <StatCard
          icon={Landmark}
          title="TOTAL AKUN BANK (BANK)"
          value={formatCurrency(totalBank)}
          color="blue"
          badge="Rekening Bank"
          badgeType="info"
          subtitle={`${countBank} Rekening Bank Terdaftar`}
          verticalCenter={true}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kas, bank, nomor rekening, atau kode COA..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Tipe Akun</option>
          <option value="CASH">Kas Tunai (CASH)</option>
          <option value="BANK">Rekening Bank (BANK)</option>
        </select>
      </div>

      {/* Cash & Bank List (Cards on Mobile/Tablet, Table on PC) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat kas & bank...</div>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW */}
            <div className="lg:hidden p-4 bg-slate-50/40">
              {filteredCashBanks.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200">
                  {cashBanks.length === 0
                    ? 'Belum ada akun kas/bank terdaftar.'
                    : 'Tidak ada data kas & bank yang sesuai pencarian.'}
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredCashBanks
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((item) => {
                        const isBank = item.type === 'BANK';
                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                          >
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 ${
                                isBank ? 'bg-blue-500' : 'bg-emerald-500'
                              }`}
                            />

                            <div className="space-y-3 pl-1.5">
                              {/* Top Row: Icon + Tipe & Status */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                                      isBank
                                        ? 'bg-blue-50 border-blue-100 text-blue-600'
                                        : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                    }`}
                                  >
                                    {isBank ? (
                                      <Landmark className="w-4 h-4" />
                                    ) : (
                                      <Wallet className="w-4 h-4" />
                                    )}
                                  </div>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                      isBank
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    {isBank ? 'BANK' : 'KAS'}
                                  </span>
                                </div>

                                {item.is_active ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Nonaktif
                                  </span>
                                )}
                              </div>

                              {/* Nama Kas/Bank & COA */}
                              <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                  {item.name}
                                </h4>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 shrink-0">
                                    {item.account?.code || '-'}
                                  </span>
                                  <span className="text-xs text-slate-500 truncate">
                                    {item.account?.name || '-'}
                                  </span>
                                </div>
                              </div>

                              {/* Detail Rekening / Kas */}
                              <div className="px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-100 text-[11px]">
                                {isBank ? (
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-slate-800">
                                      {item.bank_name || '-'}
                                    </div>
                                    <div className="font-mono text-slate-500">
                                      No: {item.account_number || '-'}
                                    </div>
                                    <div className="text-slate-400 truncate">
                                      a.n. {item.account_holder || '-'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic">Kas Tunai Operasional</span>
                                )}
                              </div>

                              {/* Saldo Ledger */}
                              <div
                                className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                                  isBank
                                    ? 'bg-blue-50/50 border-blue-100'
                                    : 'bg-emerald-50/50 border-emerald-100'
                                }`}
                              >
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Saldo (Ledger)
                                </span>
                                <span className="font-mono font-extrabold text-sm text-slate-900 truncate">
                                  {formatCurrency(item.balance)}
                                </span>
                              </div>
                            </div>

                            {/* Aksi Admin */}
                            {isAdmin && (
                              <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                                  title="Edit Kas/Bank"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                                  title="Hapus Kas/Bank"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Ringkasan Total Saldo Mobile & Tablet */}
                  <div className="rounded-2xl bg-white border border-slate-200 p-3.5 flex items-center justify-between gap-3 text-xs shadow-xs">
                    <span className="font-bold text-slate-600">Total Saldo Kas & Bank:</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm">
                      {formatCurrency(totalSaldo)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Tipe</th>
                    <th className="px-6 py-3.5">Nama Kas / Bank</th>
                    <th className="px-6 py-3.5">Akun Buku Besar (COA)</th>
                    <th className="px-6 py-3.5">Detail Rekening</th>
                    <th className="px-6 py-3.5 text-right">Saldo (Ledger)</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    {isAdmin && <th className="px-6 py-3.5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredCashBanks.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                        {cashBanks.length === 0 ? 'Belum ada akun kas/bank terdaftar.' : 'Tidak ada data kas & bank yang sesuai pencarian.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCashBanks
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                            item.type === 'BANK'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {item.type === 'BANK' ? 'BANK' : 'KAS'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                              {item.account?.code || '-'}
                            </span>
                            <span className="text-slate-600">{item.account?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {item.type === 'BANK' ? (
                            <div className="space-y-0.5">
                              <div className="font-medium text-slate-800">{item.bank_name || '-'}</div>
                              <div className="font-mono text-[11px] text-slate-500">No: {item.account_number || '-'}</div>
                              <div className="text-[11px] text-slate-400">a.n. {item.account_holder || '-'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Kas Tunai Operasional</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.balance)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {item.is_active ? (
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
                              onClick={() => handleOpenEdit(item)}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Edit Kas/Bank"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Hapus Kas/Bank"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredCashBanks.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/80 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
                      <td colSpan={4} className="px-6 py-3.5 text-right text-slate-600">
                        Total Saldo Kas & Bank:
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-emerald-700 text-sm">
                        {formatCurrency(totalSaldo)}
                      </td>
                      <td colSpan={isAdmin ? 2 : 1}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCashBanks.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingItem ? 'Edit Akun Kas / Bank' : 'Tambah Akun Kas / Bank Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hubungkan ke Akun COA (Ledger Account)</label>
                <select
                  required
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Akun Aset Lancar --</option>
                  {postableAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
                {formErrors.account_id && <p className="text-[11px] text-rose-600 mt-1">{formErrors.account_id[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CASH">KAS (CASH)</option>
                    <option value="BANK">BANK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Tampilan</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Misal: Bank BSI Operasional"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name[0]}</p>}
                </div>
              </div>

              {formData.type === 'BANK' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="Bank Syariah Indonesia (BSI)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                      <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="7123456789"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pemilik Rekening (a.n.)</label>
                      <input
                        type="text"
                        value={formData.account_holder}
                        onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                        placeholder="Yayasan Yatim Piatu..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

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

export default CashBankListPage;
