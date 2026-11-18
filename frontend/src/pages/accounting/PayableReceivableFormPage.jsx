import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import payableService from '../../services/payableService';
import receivableService from '../../services/receivableService';
import donorService from '../../services/donorService';
import accountService from '../../services/accountService';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  ArrowLeft, 
  Save, 
  Paperclip, 
  FileText, 
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  X,
  CreditCard,
  User,
  Calendar,
  Building2,
  Layers
} from 'lucide-react';

export const PayableReceivableFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  // Default type from URL parameter '?type=RECEIVABLE' or '?type=PAYABLE', default to 'PAYABLE'
  const initialType = searchParams.get('type') === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE';
  const [recordType, setRecordType] = useState(initialType); // 'PAYABLE' | 'RECEIVABLE'

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [toastMsg, setToastMsg] = useState('');

  // Master options
  const [donors, setDonors] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);

  // Form State
  const today = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateStr = today.replace(/-/g, '');

  const [formData, setFormData] = useState({
    party_name: '', // Maps to vendor_name (Payable) or customer_name (Receivable)
    donor_id: '',
    invoice_no: recordType === 'PAYABLE' ? `INV-HTG-${dateStr}-${Math.floor(100 + Math.random() * 900)}` : `INV-PTG-${dateStr}-${Math.floor(100 + Math.random() * 900)}`,
    transaction_date: today,
    due_date: defaultDueDate,
    total_amount: '',
    primary_account_id: '', // payable_account_id OR receivable_account_id
    counterpart_account_id: '', // expense_asset_account_id OR income_account_id
    description: '',
  });

  // Fetch Master Data and Edit Data
  useEffect(() => {
    const fetchMastersAndData = async () => {
      setLoading(true);
      try {
        const [dRes, aRes] = await Promise.all([
          donorService.getDonors(),
          accountService.getAccounts({ is_active: true }),
        ]);

        if (dRes.success) setDonors(dRes.data || []);
        
        let loadedAccounts = [];
        if (aRes.success) {
          loadedAccounts = aRes.data || [];
          setAllAccounts(loadedAccounts);
        }

        if (isEdit) {
          const detailRes = recordType === 'PAYABLE'
            ? await payableService.getPayable(id)
            : await receivableService.getReceivable(id);

          if (detailRes.success && detailRes.data) {
            const d = detailRes.data;
            setFormData({
              party_name: d.vendor_name || d.customer_name || '',
              donor_id: d.donor_id ? String(d.donor_id) : '',
              invoice_no: d.invoice_no || '',
              transaction_date: d.transaction_date || today,
              due_date: d.due_date || defaultDueDate,
              total_amount: d.total_amount || '',
              primary_account_id: d.payable_account_id || d.receivable_account_id ? String(d.payable_account_id || d.receivable_account_id) : '',
              counterpart_account_id: d.expense_asset_account_id || d.income_account_id ? String(d.expense_asset_account_id || d.income_account_id) : '',
              description: d.description || '',
            });
          }
        } else {
          setDefaultsForType(recordType, loadedAccounts);
        }
      } catch (err) {
        setToastMsg('Gagal memuat data form.');
      } finally {
        setLoading(false);
      }
    };

    fetchMastersAndData();
  }, [id, isEdit]);

  // Helper to set COA account defaults based on record type
  const setDefaultsForType = (type, accsList = allAccounts) => {
    const postableAccs = accsList.filter(a => a.is_postable);
    
    if (type === 'PAYABLE') {
      const liabilityAcc = postableAccs.find(a => a.type === 'LIABILITY' || a.code.startsWith('2')) || postableAccs[0];
      const expenseAcc = postableAccs.find(a => a.type === 'EXPENSE' || a.code.startsWith('5')) || postableAccs[1];

      setFormData(prev => ({
        ...prev,
        invoice_no: prev.invoice_no.startsWith('INV-PTG') ? `INV-HTG-${dateStr}-${Math.floor(100 + Math.random() * 900)}` : prev.invoice_no,
        primary_account_id: liabilityAcc ? String(liabilityAcc.id) : '',
        counterpart_account_id: expenseAcc ? String(expenseAcc.id) : '',
      }));
    } else {
      const assetAcc = postableAccs.find(a => a.code === '1104' || a.code === '1-1004' || (a.type === 'ASSET' && a.name.toLowerCase().includes('piutang'))) 
        || postableAccs.find(a => a.type === 'ASSET') 
        || postableAccs[0];

      const incomeAcc = postableAccs.find(a => a.type === 'INCOME' || a.code.startsWith('4')) || postableAccs[1];

      setFormData(prev => ({
        ...prev,
        invoice_no: prev.invoice_no.startsWith('INV-HTG') ? `INV-PTG-${dateStr}-${Math.floor(100 + Math.random() * 900)}` : prev.invoice_no,
        primary_account_id: assetAcc ? String(assetAcc.id) : '',
        counterpart_account_id: incomeAcc ? String(incomeAcc.id) : '',
      }));
    }
  };

  const handleTypeSwitch = (newType) => {
    if (isEdit) return; // Type cannot be switched when editing existing record
    setRecordType(newType);
    setFormErrors({});
    setDefaultsForType(newType, allAccounts);
  };

  const handleDonorSelect = (donorId) => {
    if (!donorId) {
      setFormData(prev => ({ ...prev, donor_id: '' }));
      return;
    }
    const selected = donors.find(d => String(d.id) === String(donorId));
    if (selected) {
      setFormData(prev => ({
        ...prev,
        donor_id: String(selected.id),
        party_name: selected.name,
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      if (recordType === 'PAYABLE') {
        const payload = {
          vendor_name: formData.party_name,
          donor_id: formData.donor_id ? parseInt(formData.donor_id) : null,
          invoice_no: formData.invoice_no,
          transaction_date: formData.transaction_date,
          due_date: formData.due_date,
          total_amount: parseFloat(formData.total_amount) || 0,
          payable_account_id: parseInt(formData.primary_account_id),
          expense_asset_account_id: formData.counterpart_account_id ? parseInt(formData.counterpart_account_id) : null,
          description: formData.description,
        };

        const res = isEdit
          ? await payableService.updatePayable(id, payload)
          : await payableService.createPayable(payload);

        if (res.success) {
          navigate('/accounting/payables-receivables');
        } else {
          if (res.errors) setFormErrors(res.errors);
          else setToastMsg(res.message || 'Gagal menyimpan catatan hutang.');
        }
      } else {
        const payload = {
          customer_name: formData.party_name,
          donor_id: formData.donor_id ? parseInt(formData.donor_id) : null,
          invoice_no: formData.invoice_no,
          transaction_date: formData.transaction_date,
          due_date: formData.due_date,
          total_amount: parseFloat(formData.total_amount) || 0,
          receivable_account_id: parseInt(formData.primary_account_id),
          income_account_id: formData.counterpart_account_id ? parseInt(formData.counterpart_account_id) : null,
          description: formData.description,
        };

        const res = isEdit
          ? await receivableService.updateReceivable(id, payload)
          : await receivableService.createReceivable(payload);

        if (res.success) {
          navigate('/accounting/payables-receivables');
        } else {
          if (res.errors) setFormErrors(res.errors);
          else setToastMsg(res.message || 'Gagal menyimpan catatan piutang.');
        }
      }
    } catch (err) {
      setToastMsg('Terjadi kesalahan koneksi.');
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
      maximumFractionDigits: 0,
    }).format(num);
  };

  const postableAccounts = allAccounts.filter(a => a.is_postable);
  
  // Accounts filtering for COA dropdowns
  const primaryAccounts = recordType === 'PAYABLE' 
    ? postableAccounts.filter(a => a.type === 'LIABILITY' || a.code.startsWith('2'))
    : postableAccounts.filter(a => a.type === 'ASSET' || a.code.startsWith('1'));

  const counterpartAccounts = recordType === 'PAYABLE'
    ? postableAccounts.filter(a => a.type === 'EXPENSE' || a.type === 'ASSET' || a.code.startsWith('5') || a.code.startsWith('1'))
    : postableAccounts.filter(a => a.type === 'INCOME' || a.code.startsWith('4'));

  const selectedPrimaryAcc = allAccounts.find(a => String(a.id) === String(formData.primary_account_id));
  const selectedCounterpartAcc = allAccounts.find(a => String(a.id) === String(formData.counterpart_account_id));

  const isPayable = recordType === 'PAYABLE';

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3 bg-rose-600 text-white rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Top Bar Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={CreditCard}
        badge={isPayable ? 'Hutang (Payable)' : 'Piutang (Receivable)'}
        title={isEdit ? `Edit Data ${isPayable ? 'Hutang' : 'Piutang'}` : `Pencatatan ${isPayable ? 'Hutang' : 'Piutang'} Baru`}
        subtitle="Pengakuan kewajiban / klaim tagihan & posting jurnal otomatis"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isEdit && (
              <div className="flex items-center bg-white/20 p-1 rounded-xl backdrop-blur-md border border-white/30 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTypeSwitch('PAYABLE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isPayable
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Hutang</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeSwitch('RECEIVABLE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isPayable
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Piutang</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/accounting/payables-receivables')}
              className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-100">
          Memuat master data COA & Rekanan...
        </div>
      ) : (
        /* Minimalist & Compact Form Container */
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc p-5 space-y-4">
          
          {/* Row 1: Data Rekanan, Nama Pihak Ke-3, No. Invoice */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih dari Data Rekanan <span className="text-slate-400 font-normal">(Master Data)</span>
              </label>
              <select
                value={formData.donor_id}
                onChange={(e) => handleDonorSelect(e.target.value)}
                className={`w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              >
                <option value="">-- Pilih dari Master Rekanan --</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.type ? `[${d.type}]` : ''} {d.phone ? `(${d.phone})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Otomatis mengisi nama & menghubungkan ke master data rekanan</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isPayable ? 'Nama Vendor / Pihak Ke-3' : 'Nama Customer / Donatur'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                placeholder={isPayable ? 'Contoh: PT Provider Listrik / Toko ATK' : 'Contoh: Donatur Lembaga / Mitra Kerjasama'}
                className={`w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              {formErrors[isPayable ? 'vendor_name' : 'customer_name'] && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">
                  {formErrors[isPayable ? 'vendor_name' : 'customer_name'][0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. Tagihan / Invoice <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.invoice_no}
                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                placeholder="INV-XXXX-XXXX"
                className={`w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              {formErrors.invoice_no && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.invoice_no[0]}</p>
              )}
            </div>
          </div>

          {/* Row 2: Tanggal Transaksi, Jatuh Tempo, Nominal Tagihan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pengakuan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className={`w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              {formErrors.transaction_date && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.transaction_date[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Jatuh Tempo <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className={`w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              {formErrors.due_date && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.due_date[0]}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Total Nominal Tagihan (Rp) <span className="text-rose-500">*</span>
                </label>
                {formData.total_amount && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    isPayable ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  }`}>
                    {formatCurrency(formData.total_amount)}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="any"
                required
                min="1"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="0"
                className={`w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 ${
                  isPayable ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              {formErrors.total_amount && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.total_amount[0]}</p>
              )}
            </div>
          </div>

          {/* Row 3: Account COA Selection (UTAMA & TANDINGAN) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Pengaturan Akun Jurnal COA (Double-Entry)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Account Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPayable ? 'Akun Hutang / Kewajiban (Liability)' : 'Akun Piutang / Aset (Asset)'} <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.primary_account_id}
                  onChange={(e) => setFormData({ ...formData, primary_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Pilih Akun {isPayable ? 'Hutang' : 'Piutang'} --</option>
                  {(primaryAccounts.length > 0 ? primaryAccounts : postableAccounts).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                {formErrors[isPayable ? 'payable_account_id' : 'receivable_account_id'] && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1">
                    {formErrors[isPayable ? 'payable_account_id' : 'receivable_account_id'][0]}
                  </p>
                )}
              </div>

              {/* Counterpart Account Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPayable ? 'Akun Beban / Aset Tandingannya' : 'Akun Pendapatan Tandingannya'} <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.counterpart_account_id}
                  onChange={(e) => setFormData({ ...formData, counterpart_account_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Pilih Akun Tandingannya --</option>
                  {(counterpartAccounts.length > 0 ? counterpartAccounts : postableAccounts).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                {formErrors[isPayable ? 'expense_asset_account_id' : 'income_account_id'] && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1">
                    {formErrors[isPayable ? 'expense_asset_account_id' : 'income_account_id'][0]}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Keterangan Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan Transaksi
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={isPayable ? 'Detail rincian tagihan atau transaksi kewajiban hutang...' : 'Detail peruntukan atau rincian piutang...'}
              className={`w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                isPayable ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Compact Inline Journal Simulation Bar */}
          <div className="bg-slate-900 text-white rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2 text-amber-400 font-semibold shrink-0">
              <FileText className="w-4 h-4" />
              <span>Simulasi Posting Jurnal Otomatis:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              {isPayable ? (
                <>
                  <div className="bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
                    <span className="text-emerald-400 font-semibold">DEBIT:</span>{' '}
                    <span className="text-slate-200">{selectedCounterpartAcc ? selectedCounterpartAcc.name : 'Akun Beban/Aset'}</span>{' '}
                    <span className="text-emerald-300 font-bold">({formatCurrency(formData.total_amount)})</span>
                  </div>
                  <div className="bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
                    <span className="text-rose-400 font-semibold">KREDIT:</span>{' '}
                    <span className="text-slate-200">{selectedPrimaryAcc ? selectedPrimaryAcc.name : 'Akun Hutang'}</span>{' '}
                    <span className="text-rose-300 font-bold">({formatCurrency(formData.total_amount)})</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
                    <span className="text-emerald-400 font-semibold">DEBIT:</span>{' '}
                    <span className="text-slate-200">{selectedPrimaryAcc ? selectedPrimaryAcc.name : 'Akun Piutang'}</span>{' '}
                    <span className="text-emerald-300 font-bold">({formatCurrency(formData.total_amount)})</span>
                  </div>
                  <div className="bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
                    <span className="text-cyan-400 font-semibold">KREDIT:</span>{' '}
                    <span className="text-slate-200">{selectedCounterpartAcc ? selectedCounterpartAcc.name : 'Akun Pendapatan'}</span>{' '}
                    <span className="text-cyan-300 font-bold">({formatCurrency(formData.total_amount)})</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Action Buttons Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/accounting/payables-receivables')}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-60 ${
                isPayable 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Menyimpan...' : (isEdit ? `Simpan Perubahan ${isPayable ? 'Hutang' : 'Piutang'}` : `Simpan ${isPayable ? 'Hutang' : 'Piutang'}`)}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PayableReceivableFormPage;
