import React, { useState, useEffect } from 'react';
import accountService from '../../services/accountService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { exportToCsv } from '../../utils/csvExport';
import { 
  Database, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  X,
  Layers,
  Tag,
  Trash2,
  Download
} from 'lucide-react';

export const CoaListPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.code === 'ADMIN';

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'ASSET',
    normal_balance: 'DEBIT',
    parent_id: '',
    is_postable: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const res = await accountService.getAccounts(params);
      if (res.success) {
        setAccounts(res.data || []);
      }
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    setCurrentPage(1);
  }, [search, typeFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    setEditingAcc(null);
    setFormData({
      code: '',
      name: '',
      type: 'ASSET',
      normal_balance: 'DEBIT',
      parent_id: '',
      is_postable: true,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (acc) => {
    setEditingAcc(acc);
    setFormData({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normal_balance: acc.normal_balance,
      parent_id: acc.parent_id ? String(acc.parent_id) : '',
      is_postable: acc.is_postable,
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
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
      };

      const res = editingAcc 
        ? await accountService.updateAccount(editingAcc.id, payload)
        : await accountService.createAccount(payload);

      if (res.success) {
        setModalOpen(false);
        showToast(editingAcc ? 'Akun berhasil diperbarui.' : 'Akun COA baru berhasil ditambahkan.');
        fetchAccounts();
      } else {
        if (res.errors) setFormErrors(res.errors);
        else showToast(res.message || 'Gagal menyimpan akun.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (acc) => {
    if (!window.confirm(`Menonaktifkan akun ${acc.code} - ${acc.name}? (Akun tidak di-delete untuk integritas data).`)) return;

    try {
      const res = await accountService.deactivateAccount(acc.id);
      if (res.success) {
        showToast(`Akun ${acc.code} telah dinonaktifkan.`);
        fetchAccounts();
      } else {
        showToast(res.message || 'Gagal menonaktifkan akun.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun ${acc.code} - ${acc.name} secara permanen?\n\nPerhatian: Akun yang telah memiliki histori transaksi atau jurnal tidak dapat dihapus (gunakan opsi Nonaktifkan).`)) {
      return;
    }

    try {
      const res = await accountService.deleteAccount(acc.id);
      if (res.success) {
        showToast(res.message || `Akun ${acc.code} berhasil dihapus.`);
        fetchAccounts();
      } else {
        showToast(res.message || 'Gagal menghapus akun.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    }
  };

  const getTypeBadge = (type) => {
    const labels = {
      ASSET: 'ASET',
      LIABILITY: 'LIABILITAS',
      EQUITY: 'ASET NETO',
      INCOME: 'PENDAPATAN',
      EXPENSE: 'BEBAN',
    };
    const colors = {
      ASSET: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      LIABILITY: 'bg-amber-100 text-amber-800 border-amber-200',
      EQUITY: 'bg-blue-100 text-blue-800 border-blue-200',
      INCOME: 'bg-teal-100 text-teal-800 border-teal-200',
      EXPENSE: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${colors[type] || 'bg-slate-100 text-slate-700'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const handleExportCsv = () => {
    if (!accounts || accounts.length === 0) {
      alert('Tidak ada akun COA untuk diekspor.');
      return;
    }

    const filename = `COA_Chart_of_Accounts_${new Date().toISOString().split('T')[0]}`;
    const headers = [
      'Kode Akun',
      'Nama Akun',
      'Tipe Akun',
      'Saldo Normal',
      'Akun Induk (Parent)',
      'Klasifikasi',
      'Status'
    ];

    const rows = accounts.map((acc) => [
      acc.code || '',
      acc.name || '',
      acc.type || '',
      acc.normal_balance || 'DEBIT',
      acc.parent ? `[${acc.parent.code}] ${acc.parent.name}` : '-',
      acc.is_postable ? 'Postable' : 'Header / Group',
      acc.is_active ? 'Aktif' : 'Nonaktif'
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Database}
        badge="Master Data"
        title="Chart of Accounts (COA)"
        subtitle="Daftar hirarki akun akuntansi Yayasan (Berorientasi ISAK 35)"
        actions={
          <>
            <button
              onClick={handleExportCsv}
              disabled={accounts.length === 0}
              className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 shrink-0 transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                Tambah Akun COA
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama akun..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Tipe Akun</option>
          <option value="ASSET">ASET</option>
          <option value="LIABILITY">LIABILITAS</option>
          <option value="EQUITY">ASET NETO</option>
          <option value="INCOME">PENDAPATAN</option>
          <option value="EXPENSE">BEBAN</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat data COA...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Kode Akun</th>
                  <th className="px-6 py-3.5">Nama Akun</th>
                  <th className="px-6 py-3.5">Tipe</th>
                  <th className="px-6 py-3.5">Saldo Normal</th>
                  <th className="px-6 py-3.5">Postable</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                      Tidak ada akun COA ditemukan.
                    </td>
                  </tr>
                ) : (
                  accounts
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((acc) => (
                      <tr key={acc.id} className={`hover:bg-slate-50/80 ${!acc.is_postable ? 'bg-slate-50/50 font-semibold text-slate-900' : ''}`}>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-900">{acc.code}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            {acc.parent && <span className="text-[10px] text-slate-400">↳</span>}
                            <span>{acc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">{getTypeBadge(acc.type)}</td>
                        <td className="px-6 py-3.5 font-mono text-[11px]">{acc.normal_balance}</td>
                        <td className="px-6 py-3.5">
                          {acc.is_postable ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">Postable</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">Header / Group</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {acc.is_active ? (
                            <span className="text-emerald-600 text-[10px] font-semibold">Aktif</span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-semibold">Nonaktif</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenEdit(acc)}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Edit Akun"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {acc.is_active && (
                              <button
                                onClick={() => handleDeactivate(acc)}
                                className="px-2.5 py-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-medium transition-colors"
                                title="Nonaktifkan Akun"
                              >
                                Nonaktifkan
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(acc)}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={accounts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingAcc ? 'Edit Akun COA' : 'Tambah Akun COA Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Akun</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Misal: 1104"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {formErrors.code && <p className="text-[11px] text-rose-600 mt-1">{formErrors.code[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Akun</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama Akun"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Akun</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ASSET">ASET</option>
                    <option value="LIABILITY">LIABILITAS</option>
                    <option value="EQUITY">ASET NETO (EKUITAS)</option>
                    <option value="INCOME">PENDAPATAN</option>
                    <option value="EXPENSE">BEBAN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Saldo Normal</label>
                  <select
                    value={formData.normal_balance}
                    onChange={(e) => setFormData({ ...formData, normal_balance: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Induk (Parent - Opsional)</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Tanpa Parent (Header Utama) --</option>
                  {accounts.filter(a => !editingAcc || a.id !== editingAcc.id).map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_postable"
                  checked={formData.is_postable}
                  onChange={(e) => setFormData({ ...formData, is_postable: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="is_postable" className="text-xs text-slate-700 font-medium">
                  Dapat menerima posting jurnal (Postable Account)
                </label>
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

export default CoaListPage;
