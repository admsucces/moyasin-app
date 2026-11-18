import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { journalService } from '../../services/journalService';
import ApiService from '../../services/api';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

export const JournalFormPage = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([
    { account_id: '', program_id: '', description: '', debit: 0, credit: 0 },
    { account_id: '', program_id: '', description: '', debit: 0, credit: 0 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoadingMaster(true);
        const [accRes, progRes] = await Promise.all([
          ApiService.get('/accounts'),
          ApiService.get('/programs'),
        ]);

        if (accRes && accRes.data) {
          // Filter only postable accounts
          const postable = accRes.data.filter(a => a.is_postable);
          setAccounts(postable);
        }
        if (progRes && progRes.data) {
          setPrograms(progRes.data);
        }
      } catch (err) {
        setError('Gagal mengambil data Master Accounts / Program.');
      } finally {
        setLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, []);

  const handleAddEntry = () => {
    setEntries([
      ...entries,
      { account_id: '', program_id: '', description: '', debit: 0, credit: 0 },
    ]);
  };

  const handleRemoveEntry = (index) => {
    if (entries.length <= 2) {
      alert('Jurnal umum minimal memerlukan 2 entri (Double-Entry).');
      return;
    }
    const updated = [...entries];
    updated.splice(index, 1);
    setEntries(updated);
  };

  const handleEntryChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    
    // Ensure if debit > 0, credit set to 0 and vice-versa if typing amount
    if (field === 'debit' && Number(value) > 0) {
      updated[index].credit = 0;
    } else if (field === 'credit' && Number(value) > 0) {
      updated[index].debit = 0;
    }

    setEntries(updated);
  };

  const totalDebit = useMemo(() => {
    return entries.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  }, [entries]);

  const totalCredit = useMemo(() => {
    return entries.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  }, [entries]);

  const isBalanced = useMemo(() => {
    return Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  }, [totalDebit, totalCredit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isBalanced) {
      setError('Jurnal harus seimbang (Total Debit = Total Kredit) dan lebih dari 0.');
      return;
    }

    // Validate accounts selected
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].account_id) {
        setError(`Silakan pilih Akun COA pada baris ke-${i + 1}.`);
        return;
      }
      if (Number(entries[i].debit) === 0 && Number(entries[i].credit) === 0) {
        setError(`Nominal Debit atau Kredit pada baris ke-${i + 1} harus diisi.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        journal_date: journalDate,
        description,
        entries: entries.map(e => ({
          account_id: Number(e.account_id),
          program_id: e.program_id ? Number(e.program_id) : null,
          description: e.description || null,
          debit: Number(e.debit) || 0,
          credit: Number(e.credit) || 0,
        })),
      };

      const res = await journalService.createManualJournal(payload);
      if (res && res.success) {
        navigate('/transactions');
      } else {
        setError(res?.message || 'Gagal menyimpan jurnal manual.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan jurnal manual.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={FileText}
        badge="Jurnal Umum"
        title="Input Jurnal Umum Manual"
        subtitle="Buat entri jurnal ganda manual untuk penyesuaian / pembukaan"
        actions={
          <Link
            to="/transactions"
            className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Transaksi</span>
          </Link>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Metadata Section */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Informasi Utama Jurnal</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Jurnal *</label>
              <input
                type="date"
                required
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi / Keterangan Jurnal *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Jurnal penyesuaian kas awal periode..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Entries Table */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Baris Entri Debet & Kredit (Double Entry)
            </h2>
            <button
              type="button"
              onClick={handleAddEntry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold sm:font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris</span>
            </button>
          </div>

          {loadingMaster ? (
            <div className="text-center py-8 text-xs text-slate-400">Memuat Master Data Accounts...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="min-w-[760px] w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">No</th>
                    <th className="px-3 py-2.5 min-w-[260px] w-64">Akun COA *</th>
                    <th className="px-3 py-2.5 min-w-[180px] w-48">Program (Opsional)</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Keterangan Baris</th>
                    <th className="px-3 py-2.5 min-w-[140px] w-36 text-right">Debit (Rp)</th>
                    <th className="px-3 py-2.5 min-w-[140px] w-36 text-right">Kredit (Rp)</th>
                    <th className="px-3 py-2.5 w-12 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <select
                          required
                          value={entry.account_id}
                          onChange={(e) => handleEntryChange(idx, 'account_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Pilih Akun COA --</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={entry.program_id}
                          onChange={(e) => handleEntryChange(idx, 'program_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Tanpa Program --</option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} - {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="Keterangan baris..."
                          value={entry.description}
                          onChange={(e) => handleEntryChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={entry.debit}
                          onChange={(e) => handleEntryChange(idx, 'debit', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs text-right font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={entry.credit}
                          onChange={(e) => handleEntryChange(idx, 'credit', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs text-right font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Balance Summary Footer: Diposisikan di Tengah di HP */}
          <div className="pt-4 border-t border-slate-100 flex flex-col items-center md:flex-row md:items-center md:justify-between gap-4 text-center md:text-left">
            <div className="flex items-center justify-center w-full md:w-auto">
              {isBalanced ? (
                <div className="inline-flex items-center justify-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>JURNAL BALANCED (SEIMBANG)</span>
                </div>
              ) : (
                <div className="inline-flex items-center justify-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-semibold text-center">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>JURNAL TIDAK SEIMBANG (Selisih: {formatCurrency(Math.abs(totalDebit - totalCredit))})</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 sm:gap-8 text-xs font-mono w-full md:w-auto">
              <div className="text-center">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">TOTAL DEBIT</span>
                <span className="text-slate-900 font-extrabold text-sm block mt-0.5">{formatCurrency(totalDebit)}</span>
              </div>
              <div className="w-px h-8 bg-slate-200 md:hidden" />
              <div className="text-center">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">TOTAL KREDIT</span>
                <span className="text-slate-900 font-extrabold text-sm block mt-0.5">{formatCurrency(totalCredit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3">
          <Link
            to="/transactions"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting || !isBalanced}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-xs shadow-emerald-900/20 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Menyimpan...' : 'Simpan & Post Jurnal'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default JournalFormPage;
