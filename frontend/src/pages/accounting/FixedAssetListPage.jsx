import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fixedAssetService } from '../../services/fixedAssetService';
import accountService from '../../services/accountService';
import useAuth from '../../hooks/useAuth';
import Pagination from '../../components/common/Pagination';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { exportToCsv } from '../../utils/csvExport';
import { 
  Building2, 
  Plus, 
  Search, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Edit3, 
  Trash2, 
  Play, 
  X,
  Clock,
  Download
} from 'lucide-react';

export const FixedAssetListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role || '';
  const canManage = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Asset Form Modal State
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    asset_code: '',
    name: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_cost: '',
    useful_life_years: '5',
    salvage_value: '0',
    depreciation_method: 'STRAIGHT_LINE',
    asset_account_id: '',
    accumulated_depr_account_id: '',
    depreciation_expense_account_id: '',
    description: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Depreciation Modal State
  const [deprModalOpen, setDeprModalOpen] = useState(false);
  const [deprYear, setDeprYear] = useState(new Date().getFullYear());
  const [deprMonth, setDeprMonth] = useState(new Date().getMonth() + 1);
  const [deprSubmitting, setDeprSubmitting] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await accountService.getAccounts({ is_postable: true });
      if (res.success) {
        setAccounts(res.data || []);
      }
    } catch (err) {
      //
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fixedAssetService.getFixedAssets({ search });
      if (res.success && res.data) {
        setAssets(res.data.assets || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      showToast('Gagal memuat daftar aset tetap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchAssets();
  }, [search]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      asset_code: `AST-${String(assets.length + 1).padStart(3, '0')}`,
      name: '',
      acquisition_date: new Date().toISOString().split('T')[0],
      acquisition_cost: '',
      useful_life_years: '5',
      salvage_value: '0',
      depreciation_method: 'STRAIGHT_LINE',
      asset_account_id: accounts.find(a => a.type === 'ASSET' && a.code.startsWith('13'))?.id || '',
      accumulated_depr_account_id: accounts.find(a => a.code.includes('1302') || a.name.toLowerCase().includes('akumulasi'))?.id || '',
      depreciation_expense_account_id: accounts.find(a => a.code.includes('5202') || a.name.toLowerCase().includes('penyusutan'))?.id || '',
      description: '',
    });
    setAssetModalOpen(true);
  };

  const handleOpenEditModal = (asset) => {
    setEditingId(asset.id);
    setFormData({
      asset_code: asset.asset_code,
      name: asset.name,
      acquisition_date: asset.acquisition_date,
      acquisition_cost: asset.acquisition_cost,
      useful_life_years: asset.useful_life_years,
      salvage_value: asset.salvage_value || 0,
      depreciation_method: asset.depreciation_method,
      asset_account_id: asset.asset_account_id,
      accumulated_depr_account_id: asset.accumulated_depr_account_id || '',
      depreciation_expense_account_id: asset.depreciation_expense_account_id || '',
      description: asset.description || '',
    });
    setAssetModalOpen(true);
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      let res;
      if (editingId) {
        res = await fixedAssetService.updateFixedAsset(editingId, formData);
      } else {
        res = await fixedAssetService.createFixedAsset(formData);
      }

      if (res.success) {
        showToast(editingId ? 'Data aset tetap berhasil diperbarui.' : 'Aset tetap baru berhasil ditambahkan.');
        setAssetModalOpen(false);
        fetchAssets();
      } else {
        showToast(res.message || 'Gagal menyimpan aset tetap.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteAsset = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus aset tetap "${name}"? Data penyusutan terkait juga akan terhapus.`)) {
      return;
    }

    try {
      const res = await fixedAssetService.deleteFixedAsset(id);
      if (res.success) {
        showToast('Aset tetap berhasil dihapus.');
        fetchAssets();
      } else {
        showToast(res.message || 'Gagal menghapus aset tetap.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    }
  };

  const handleRunDepreciation = async (e) => {
    e.preventDefault();
    setDeprSubmitting(true);
    try {
      const res = await fixedAssetService.processMonthlyDepreciation({
        year: deprYear,
        month: deprMonth,
      });

      if (res.success) {
        showToast(res.message || 'Proses penyusutan bulanan berhasil dijalankan.');
        setDeprModalOpen(false);
        fetchAssets();
      } else {
        showToast(res.message || 'Gagal menjalankan penyusutan bulanan.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem saat penyusutan.');
    } finally {
      setDeprSubmitting(false);
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

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const handleExportCsv = () => {
    if (!assets || assets.length === 0) {
      alert('Tidak ada data aset tetap untuk diekspor.');
      return;
    }

    const filename = `Aset_Tetap_${new Date().toISOString().split('T')[0]}`;
    const headers = [
      'Kode Aset',
      'Nama Aset',
      'Tanggal Perolehan',
      'Masa Manfaat (Tahun)',
      'Harga Perolehan (IDR)',
      'Akumulasi Penyusutan (IDR)',
      'Nilai Buku (IDR)',
      'Penyusutan/Bulan (IDR)',
      'Nilai Sisa/Salvage (IDR)',
      'Status',
      'Keterangan'
    ];

    const rows = assets.map((ast) => [
      ast.asset_code || '',
      ast.name || '',
      ast.acquisition_date || '',
      ast.useful_life_years || '0',
      Number(ast.acquisition_cost || 0).toFixed(2),
      Number(ast.total_accumulated_depreciation || 0).toFixed(2),
      Number(ast.book_value || 0).toFixed(2),
      Number(ast.monthly_depreciation || 0).toFixed(2),
      Number(ast.salvage_value || 0).toFixed(2),
      ast.status || 'ACTIVE',
      ast.description || '-'
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Building2}
        badge="Aset Yayasan"
        title="Aset Tetap & Penyusutan"
        subtitle="Pencatatan inventaris aset tetap, nilai buku, dan proses penyusutan otomatis bulanan (Straight-Line Method)"
        actions={
          <>
            <button
              onClick={handleExportCsv}
              disabled={assets.length === 0}
              className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>

            {canManage && (
              <>
                <button
                  onClick={() => setDeprModalOpen(true)}
                  className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-2 shrink-0 transition-all"
                >
                  <Play className="w-4 h-4 text-cyan-200 fill-cyan-200" />
                  <span>Proses Penyusutan Bulanan</span>
                </button>

                <button
                  onClick={() => navigate('/accounting/fixed-assets/new')}
                  className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 shrink-0 transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>Tambah Aset Tetap Baru</span>
                </button>
              </>
            )}
          </>
        }
      />

      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Summary KPI Cards DENGAN WARNA TOMPEL (2 Kolom di HP & Rata Tengah) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Building2}
          title="JUMLAH UNIT ASET"
          value={`${summary.total_count || 0} Unit`}
          color="indigo"
          badge="Inventaris"
          badgeType="info"
          subtitle="Total aset tercatat"
          verticalCenter={true}
        />

        <StatCard
          icon={DollarSign}
          title="TOTAL HARGA PEROLEHAN"
          value={formatCurrency(summary.total_acquisition_cost)}
          color="emerald"
          badge="Perolehan"
          badgeType="positive"
          subtitle="Nilai historis beli"
          verticalCenter={true}
        />

        <StatCard
          icon={TrendingDown}
          title="AKUMULASI PENYUSUTAN"
          value={formatCurrency(summary.total_accumulated_depreciation)}
          color="rose"
          badge="Depresiasi"
          badgeType="negative"
          subtitle="Beban akumulasi"
          verticalCenter={true}
        />

        <StatCard
          icon={Building2}
          title="NILAI BUKU SAAT INI (NET)"
          value={formatCurrency(summary.total_book_value)}
          color="teal"
          badge="Net Book Value"
          badgeType="positive"
          subtitle="Nilai sisa buku saat ini"
          verticalCenter={true}
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode aset atau nama inventaris..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Fixed Assets List (Cards on Mobile/Tablet, Table on PC) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat data aset tetap...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Belum ada aset tetap yang terdaftar.</div>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW */}
            <div className="lg:hidden p-4 bg-slate-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {assets
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((ast) => (
                    <div
                      key={ast.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          ast.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />

                      <div className="space-y-3 pl-1.5">
                        {/* Header: Icon, Nama & Kode Aset, Status */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                                {ast.name}
                              </h4>
                              <span className="inline-block font-mono text-[11px] font-semibold text-slate-400 mt-0.5">
                                {ast.asset_code}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              ast.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ast.status}
                          </span>
                        </div>

                        {/* Tanggal Perolehan & Masa Manfaat */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-100 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{ast.acquisition_date}</span>
                          </span>
                          <span className="text-slate-500">
                            Manfaat: <strong className="text-slate-800">{ast.useful_life_years} Tahun</strong>
                          </span>
                        </div>

                        {/* 2x2 Ringkasan Nilai Aset */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Harga Perolehan
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-900 block truncate mt-0.5">
                              {formatCurrency(ast.acquisition_cost)}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/80 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 block">
                              Akum. Penyusutan
                            </span>
                            <span className="font-mono font-bold text-xs text-rose-600 block truncate mt-0.5">
                              {formatCurrency(ast.total_accumulated_depreciation)}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 block">
                              Nilai Buku
                            </span>
                            <span className="font-mono font-extrabold text-xs text-emerald-700 block truncate mt-0.5">
                              {formatCurrency(ast.book_value)}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Penyusutan / Bln
                            </span>
                            <span className="font-mono font-semibold text-xs text-slate-700 block truncate mt-0.5">
                              {formatCurrency(ast.monthly_depreciation)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Aksi */}
                      {canManage && (
                        <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/accounting/fixed-assets/${ast.id}/edit`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-colors"
                            title="Edit Aset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(ast.id, ast.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                            title="Hapus Aset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
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
                    <th className="px-5 py-3.5">Kode & Nama Aset</th>
                    <th className="px-5 py-3.5">Tgl Perolehan & Manfaat</th>
                    <th className="px-5 py-3.5 text-right">Harga Perolehan</th>
                    <th className="px-5 py-3.5 text-right">Akumulasi Penyusutan</th>
                    <th className="px-5 py-3.5 text-right">Nilai Buku</th>
                    <th className="px-5 py-3.5 text-right">Penyusutan/Bulan</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    {canManage && <th className="px-5 py-3.5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {assets
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((ast) => (
                    <tr key={ast.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{ast.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{ast.asset_code}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {ast.acquisition_date}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Masa Manfaat: <span className="font-semibold text-slate-700">{ast.useful_life_years} Tahun</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {formatCurrency(ast.acquisition_cost)}
                      </td>

                      <td className="px-5 py-4 text-right font-medium text-rose-600">
                        {formatCurrency(ast.total_accumulated_depreciation)}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-emerald-700">
                        {formatCurrency(ast.book_value)}
                      </td>

                      <td className="px-5 py-4 text-right text-slate-600">
                        {formatCurrency(ast.monthly_depreciation)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${ast.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {ast.status}
                        </span>
                      </td>

                      {canManage && (
                        <td className="px-5 py-4 text-right space-x-1">
                          <button
                            onClick={() => navigate(`/accounting/fixed-assets/${ast.id}/edit`)}
                            className="px-2 py-1 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                            title="Edit Aset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(ast.id, ast.name)}
                            className="px-2 py-1 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                            title="Hapus Aset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={assets.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Monthly Depreciation Processing Modal */}
      {deprModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                Eksekusi Penyusutan Bulanan
              </h3>
              <button onClick={() => setDeprModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleRunDepreciation} className="space-y-4 text-xs">
              <p className="text-slate-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                Proses ini akan mengkalkulasi penyusutan seluruh Aset Tetap aktif periode terhitung dan secara otomatis memposting **Jurnal Beban vs Akumulasi Penyusutan** ke Buku Besar.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Bulan</label>
                  <select
                    value={deprMonth}
                    onChange={(e) => setDeprMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Tahun</label>
                  <input
                    type="number"
                    min="2000"
                    max="2099"
                    value={deprYear}
                    onChange={(e) => setDeprYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeprModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={deprSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  {deprSubmitting ? 'Memproses Jurnal...' : 'Jalankan Penyusutan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedAssetListPage;
