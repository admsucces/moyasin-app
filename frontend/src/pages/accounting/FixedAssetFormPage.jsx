import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fixedAssetService } from '../../services/fixedAssetService';
import accountService from '../../services/accountService';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  ArrowLeft, 
  Save, 
  Building2, 
  Sparkles, 
  Calendar, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  X 
} from 'lucide-react';

export const FixedAssetFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const [formErrors, setFormErrors] = useState({});

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

  // Fetch Master Accounts
  useEffect(() => {
    const fetchMasterAccounts = async () => {
      try {
        const res = await accountService.getAccounts({ is_postable: true });
        if (res.success && res.data) {
          const list = res.data;
          setAccounts(list);

          if (!isEdit) {
            // Auto select defaults
            const assetAcc = list.find(a => a.type === 'ASSET' && (a.code.startsWith('13') || a.name.toLowerCase().includes('aset')));
            const accumAcc = list.find(a => a.code.includes('1302') || a.name.toLowerCase().includes('akumulasi'));
            const expAcc = list.find(a => a.code.includes('5202') || a.name.toLowerCase().includes('penyusutan'));

            setFormData(prev => ({
              ...prev,
              asset_code: `AST-${String(Math.floor(100 + Math.random() * 900))}`,
              asset_account_id: assetAcc?.id || '',
              accumulated_depr_account_id: accumAcc?.id || '',
              depreciation_expense_account_id: expAcc?.id || '',
            }));
          }
        }
      } catch (err) {
        showToast('Gagal mengambil data Master Akun COA.');
      }
    };

    fetchMasterAccounts();
  }, [isEdit]);

  // Fetch Detail Asset if Editing
  useEffect(() => {
    if (isEdit) {
      const fetchAssetDetail = async () => {
        setLoading(true);
        try {
          const res = await fixedAssetService.getFixedAsset(id);
          if (res.success && res.data) {
            const ast = res.data;
            setFormData({
              asset_code: ast.asset_code || '',
              name: ast.name || '',
              acquisition_date: ast.acquisition_date || '',
              acquisition_cost: ast.acquisition_cost || '',
              useful_life_years: ast.useful_life_years || '5',
              salvage_value: ast.salvage_value || '0',
              depreciation_method: ast.depreciation_method || 'STRAIGHT_LINE',
              asset_account_id: ast.asset_account_id || '',
              accumulated_depr_account_id: ast.accumulated_depr_account_id || '',
              depreciation_expense_account_id: ast.depreciation_expense_account_id || '',
              description: ast.description || '',
            });
          } else {
            showToast('Data aset tetap tidak ditemukan.');
          }
        } catch (err) {
          showToast('Gagal memuat detail aset tetap.');
        } finally {
          setLoading(false);
        }
      };

      fetchAssetDetail();
    }
  }, [id, isEdit]);

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        acquisition_cost: parseFloat(formData.acquisition_cost) || 0,
        useful_life_years: parseInt(formData.useful_life_years) || 1,
        salvage_value: parseFloat(formData.salvage_value) || 0,
        asset_account_id: formData.asset_account_id ? parseInt(formData.asset_account_id) : null,
        accumulated_depr_account_id: formData.accumulated_depr_account_id ? parseInt(formData.accumulated_depr_account_id) : null,
        depreciation_expense_account_id: formData.depreciation_expense_account_id ? parseInt(formData.depreciation_expense_account_id) : null,
      };

      let res;
      if (isEdit) {
        res = await fixedAssetService.updateFixedAsset(id, payload);
      } else {
        res = await fixedAssetService.createFixedAsset(payload);
      }

      if (res.success) {
        navigate('/accounting/fixed-assets');
      } else {
        if (res.errors) setFormErrors(res.errors);
        else showToast(res.message || 'Gagal menyimpan aset tetap.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3 bg-rose-600 text-white rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {toastMsg}
          </span>
          <button onClick={() => setToastMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Top Header Card Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Building2}
        badge="Aset Tetap (Fixed Asset)"
        title={isEdit ? 'Edit Aset Tetap' : 'Input Aset Tetap Baru'}
        subtitle="Catat perolehan aset tetap, umur manfaat, & akun penyusutan aset yayasan"
        actions={
          <button
            type="button"
            onClick={() => navigate('/accounting/fixed-assets')}
            className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Aset Tetap</span>
          </button>
        }
      />

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-100">
          Memuat data form aset tetap...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Form Container Card */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc p-5 space-y-5">
            
            {/* Section 1: Informasi Utama Aset */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>Informasi Utama Aset</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Aset *</label>
                  <input
                    type="text"
                    required
                    value={formData.asset_code}
                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                    placeholder="Contoh: AST-001"
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-mono font-bold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  {formErrors.asset_code && <span className="text-[10px] text-rose-500">{formErrors.asset_code[0]}</span>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Aset Tetap *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Gedung Kantor Utama / Laptop Lenovo ThinkPad"
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  {formErrors.name && <span className="text-[10px] text-rose-500">{formErrors.name[0]}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Perolehan *</label>
                  <input
                    type="date"
                    required
                    value={formData.acquisition_date}
                    onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Nilai & Parameter Penyusutan */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Harga Perolehan & Parameter Penyusutan</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Perolehan (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formData.acquisition_cost}
                    onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-mono font-bold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  {formData.acquisition_cost && (
                    <span className="text-[10px] font-semibold text-emerald-600 block mt-1">
                      {formatCurrency(formData.acquisition_cost)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Masa Manfaat (Tahun) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={formData.useful_life_years}
                    onChange={(e) => setFormData({ ...formData, useful_life_years: e.target.value })}
                    placeholder="5"
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai Residu (Sisa) Rp</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.salvage_value}
                    onChange={(e) => setFormData({ ...formData, salvage_value: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-mono font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Penyusutan *</label>
                  <select
                    value={formData.depreciation_method}
                    onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value })}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="STRAIGHT_LINE">Garis Lurus (Straight-Line)</option>
                    <option value="NONE">Tanpa Penyusutan (Non-Depresiasi)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Pemetaan Akun COA Akuntansi */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Pemetaan Akun Akuntansi (COA)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Aset Tetap *</label>
                  <select
                    required
                    value={formData.asset_account_id}
                    onChange={(e) => setFormData({ ...formData, asset_account_id: e.target.value })}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="">-- Pilih Akun Aset Tetap --</option>
                    {accounts.filter(a => a.type === 'ASSET').map(a => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Akun Akumulasi Penyusutan {formData.depreciation_method === 'STRAIGHT_LINE' && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    required={formData.depreciation_method === 'STRAIGHT_LINE'}
                    value={formData.accumulated_depr_account_id}
                    onChange={(e) => setFormData({ ...formData, accumulated_depr_account_id: e.target.value })}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="">-- Pilih Akun Akumulasi --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                  {formErrors.accumulated_depr_account_id && (
                    <span className="text-[10px] text-rose-500">{formErrors.accumulated_depr_account_id[0]}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Akun Beban Penyusutan {formData.depreciation_method === 'STRAIGHT_LINE' && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    required={formData.depreciation_method === 'STRAIGHT_LINE'}
                    value={formData.depreciation_expense_account_id}
                    onChange={(e) => setFormData({ ...formData, depreciation_expense_account_id: e.target.value })}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="">-- Pilih Akun Beban --</option>
                    {accounts.filter(a => a.type === 'EXPENSE').map(a => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                  {formErrors.depreciation_expense_account_id && (
                    <span className="text-[10px] text-rose-500">{formErrors.depreciation_expense_account_id[0]}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Keterangan / Catatan */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Keterangan / Lokasi / Spesifikasi Aset</label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tuliskan spesifikasi, lokasi penyimpanan, atau nomor garansi aset tetap..."
                className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

          </div>

          {/* Bottom Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-curadoc flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/accounting/fixed-assets')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Simpan Aset Tetap')}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FixedAssetFormPage;
