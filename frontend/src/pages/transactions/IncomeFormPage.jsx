import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transactionService } from '../../services/transactionService';
import cashBankService from '../../services/cashBankService';
import accountService from '../../services/accountService';
import donorService from '../../services/donorService';
import programService from '../../services/programService';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Paperclip, 
  FileText, 
  Sparkles,
  ArrowDownLeft,
  CheckCircle2,
  X
} from 'lucide-react';

export const IncomeFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [toastMsg, setToastMsg] = useState('');

  // Master options
  const [cashBanks, setCashBanks] = useState([]);
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [donors, setDonors] = useState([]);
  const [programs, setPrograms] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    cash_bank_account_id: '',
    income_account_id: '',
    donor_id: '',
    program_id: '',
    restriction_type: 'WITHOUT_RESTRICTION',
    amount: '',
    description: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [cbRes, accRes, dnrRes, prgRes] = await Promise.all([
          cashBankService.getCashBankAccounts(),
          accountService.getAccounts(),
          donorService.getDonors(),
          programService.getPrograms(),
        ]);

        if (cbRes.success) setCashBanks(cbRes.data || []);
        if (accRes.success) {
          const list = (accRes.data || []).filter(a => a.type === 'INCOME' && a.is_postable);
          setIncomeAccounts(list);
        }
        if (dnrRes.success) setDonors(dnrRes.data || []);
        if (prgRes.success) setPrograms(prgRes.data || []);
      } catch (err) {
        //
      }
    };

    fetchMasters();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const fetchTransactionDetail = async () => {
        setLoading(true);
        try {
          const res = await transactionService.getTransaction(id);
          if (res.success && res.data) {
            const t = res.data;
            setFormData({
              transaction_date: t.transaction_date || '',
              cash_bank_account_id: t.cash_bank_account_id || '',
              income_account_id: t.income_account_id || '',
              donor_id: t.donor_id || '',
              program_id: t.program_id || '',
              restriction_type: t.restriction_type || 'WITHOUT_RESTRICTION',
              amount: t.amount || '',
              description: t.description || '',
            });
          } else {
            setToastMsg('Transaksi tidak ditemukan.');
          }
        } catch (err) {
          setToastMsg('Gagal memuat data transaksi.');
        } finally {
          setLoading(false);
        }
      };

      fetchTransactionDetail();
    }
  }, [id, isEdit]);

  const handleSave = async (shouldSubmit = false) => {
    setFormErrors({});
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        donor_id: formData.donor_id ? parseInt(formData.donor_id) : null,
        program_id: formData.program_id ? parseInt(formData.program_id) : null,
      };

      const res = isEdit
        ? await transactionService.updateIncome(id, payload)
        : await transactionService.createIncome(payload);

      if (res.success && res.data) {
        const targetId = res.data.id;

        if (selectedFile) {
          await transactionService.uploadAttachment(targetId, selectedFile);
        }

        if (shouldSubmit) {
          await transactionService.submitTransaction(targetId);
        }

        navigate('/transactions');
      } else {
        if (res.errors) setFormErrors(res.errors);
        else setToastMsg(res.message || 'Gagal menyimpan transaksi.');
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

  const selectedCashBank = cashBanks.find(c => c.id === parseInt(formData.cash_bank_account_id));
  const selectedIncomeAcc = incomeAccounts.find(a => a.id === parseInt(formData.income_account_id));

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
        icon={ArrowDownLeft}
        badge="Penerimaan Kas"
        title={isEdit ? 'Edit Penerimaan' : 'Pencatatan Penerimaan Baru'}
        subtitle="Input transaksi kas masuk & donasi yayasan (ISAK 35)"
        actions={
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Transaksi</span>
          </button>
        }
      />

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-100">
          Memuat data form...
        </div>
      ) : (
        /* Minimalist & Compact Form Container */
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc p-5 space-y-4">
          {/* Row 1: Tanggal, Klasifikasi, Masuk Ke (Kas/Bank) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Transaksi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {formErrors.transaction_date && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.transaction_date[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Klasifikasi Dana (ISAK 35) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.restriction_type}
                onChange={(e) => setFormData({ ...formData, restriction_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="WITHOUT_RESTRICTION">Tanpa Pembatasan (Unrestricted)</option>
                <option value="WITH_RESTRICTION">Dengan Pembatasan (Terikat Program)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Masuk Ke Rekening <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.cash_bank_account_id}
                onChange={(e) => setFormData({ ...formData, cash_bank_account_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">-- Pilih Kas / Bank --</option>
                {cashBanks.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name} ({cb.type})
                  </option>
                ))}
              </select>
              {formErrors.cash_bank_account_id && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.cash_bank_account_id[0]}</p>
              )}
            </div>
          </div>

          {/* Row 2: Akun COA, Donatur, Program */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Akun Penerimaan (COA) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.income_account_id}
                onChange={(e) => setFormData({ ...formData, income_account_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">-- Pilih Akun COA --</option>
                {incomeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name}
                  </option>
                ))}
              </select>
              {formErrors.income_account_id && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.income_account_id[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Donatur / Pembayar (Opsional)
              </label>
              <select
                value={formData.donor_id}
                onChange={(e) => setFormData({ ...formData, donor_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">-- Anonim (Hamba Allah) --</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.phone ? `(${d.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Program Terkait (Opsional)
              </label>
              <select
                value={formData.program_id}
                onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">-- Umum / Non-Program --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Nominal (Rp) & File Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nominal Penerimaan (Rp) <span className="text-rose-500">*</span>
                </label>
                {formData.amount && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {formatCurrency(formData.amount)}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="any"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {formErrors.amount && (
                <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.amount[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bukti Transaksi / Kwitansi (PDF/Foto)
              </label>
              <div className="flex items-center gap-2 p-1.5 bg-slate-50/80 border border-slate-200/80 rounded-lg">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
              </div>
              {selectedFile && (
                <p className="text-[10px] font-bold text-emerald-700 mt-1">
                  File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          {/* Row 4: Keterangan (Compact Textarea) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan Transaksi <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="2"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detail peruntukan atau catatan penerimaan..."
              className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {formErrors.description && (
              <p className="text-[10px] font-bold text-rose-600 mt-1">{formErrors.description[0]}</p>
            )}
          </div>

          {/* Compact Inline Journal Simulation Bar */}
          <div className="bg-slate-900 text-white rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold shrink-0">
              <FileText className="w-4 h-4" />
              <span>Simulasi Jurnal (Double-Entry):</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <div className="bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="text-emerald-400 font-semibold">DEBIT:</span>{' '}
                <span className="text-slate-200">{selectedCashBank ? selectedCashBank.name : 'Kas/Bank'}</span>{' '}
                <span className="text-emerald-300 font-bold">({formatCurrency(formData.amount)})</span>
              </div>
              <div className="bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="text-cyan-400 font-semibold">KREDIT:</span>{' '}
                <span className="text-slate-200">{selectedIncomeAcc ? selectedIncomeAcc.name : 'Akun Penerimaan'}</span>{' '}
                <span className="text-cyan-300 font-bold">({formatCurrency(formData.amount)})</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan DRAFT</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simpan & Submit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeFormPage;
