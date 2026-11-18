import React, { useState, useEffect } from 'react';
import { initialBalanceService } from '../../services/initialBalanceService';
import useAuth from '../../hooks/useAuth';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  Scale, 
  Save, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

export const InitialBalancePage = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role || '';
  const canEdit = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [asOfDate, setAsOfDate] = useState('2026-01-01');
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({}); // { [account_id]: { debit: 0, credit: 0 } }
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [hasSetup, setHasSetup] = useState(false);
  const [journalNo, setJournalNo] = useState(null);

  const fetchInitialBalances = async () => {
    setLoading(true);
    try {
      const res = await initialBalanceService.getInitialBalances();
      if (res.success && res.data) {
        setAsOfDate(res.data.as_of_date || '2026-01-01');
        setAccounts(res.data.accounts || []);
        setHasSetup(res.data.has_setup);
        setJournalNo(res.data.journal_no);

        const initialMap = {};
        (res.data.accounts || []).forEach((acc) => {
          initialMap[acc.id] = {
            debit: acc.debit || 0,
            credit: acc.credit || 0,
          };
        });
        setBalances(initialMap);
      }
    } catch (err) {
      showToast('Gagal memuat data saldo awal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialBalances();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleAmountChange = (accountId, field, value) => {
    const numericValue = Math.max(0, parseFloat(value) || 0);
    setBalances((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: numericValue,
      },
    }));
  };

  // Compute live totals
  const totalDebit = Object.values(balances).reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = Object.values(balances).reduce((sum, item) => sum + (item.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  const handleAutoBalance = () => {
    // Find equity account 3101 or 3100
    const equityAcc = accounts.find((a) => a.code === '3101' || a.code === '3100' || a.type === 'EQUITY');
    if (!equityAcc) {
      showToast('Akun Ekuitas / Saldo Dana tidak ditemukan.');
      return;
    }

    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) < 0.01) {
      showToast('Saldo awal sudah seimbang!');
      return;
    }

    setBalances((prev) => {
      const current = prev[equityAcc.id] || { debit: 0, credit: 0 };
      let newDebit = current.debit;
      let newCredit = current.credit;

      if (diff > 0) {
        // Debet > Kredit -> Add to Credit
        newCredit += diff;
      } else {
        // Kredit > Debet -> Add to Debit
        newDebit += Math.abs(diff);
      }

      return {
        ...prev,
        [equityAcc.id]: {
          debit: newDebit,
          credit: newCredit,
        },
      };
    });

    showToast(`Selisih ${formatCurrency(Math.abs(diff))} berhasil dialokasikan ke ${equityAcc.name}.`);
  };

  const handleSubmit = async (autoBalanceFlag = false) => {
    if (!isBalanced && !autoBalanceFlag) {
      alert(`Debet dan Kredit tidak seimbang! Selisih ${formatCurrency(difference)}. Silakan seimbangkan terlebih dahulu atau gunakan Otomatis Seimbangkan.`);
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menyimpan Setup Saldo Awal per tanggal ${asOfDate}? Jurnal Saldo Awal akan diposting ke Buku Besar.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const payloadBalances = accounts.map((acc) => ({
        account_id: acc.id,
        debit: balances[acc.id]?.debit || 0,
        credit: balances[acc.id]?.credit || 0,
      }));

      const res = await initialBalanceService.saveInitialBalances({
        as_of_date: asOfDate,
        balances: payloadBalances,
        auto_balance: autoBalanceFlag,
      });

      if (res.success) {
        showToast('Saldo awal berhasil disimpan dan diposting!');
        fetchInitialBalances();
      } else {
        showToast(res.message || 'Gagal menyimpan saldo awal.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan saldo awal.');
    } finally {
      setSubmitting(false);
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

  const filteredAccounts = accounts.filter((acc) => {
    const matchSearch = acc.code.toLowerCase().includes(search.toLowerCase()) || 
                        acc.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter ? acc.type === typeFilter : true;
    return matchSearch && matchType;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case 'ASSET':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ASET</span>;
      case 'LIABILITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">LIABILITAS</span>;
      case 'EQUITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">EKUITAS / S. DANA</span>;
      case 'INCOME':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">PENDAPATAN</span>;
      case 'EXPENSE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">BEBAN</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Scale}
        badge="Neraca Awal"
        title="Setup Saldo Awal Akun"
        subtitle="Pengaturan neraca awal per periode untuk Kas & Bank, Aset, Liabilitas, dan Saldo Dana Yayasan"
        actions={
          canEdit && (
            <>
              {!isBalanced && (
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                  title="Otomatis seimbangkan selisih ke Saldo Dana"
                >
                  <Sparkles className="w-4 h-4 fill-slate-900" />
                  Auto-Balance
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !isBalanced}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 disabled:opacity-50 shrink-0 transition-all"
              >
                <Save className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                {submitting ? 'Memproses...' : 'Simpan Saldo Awal'}
              </button>
            </>
          )
        }
      />

      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Audit Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Informasi Double-Entry Accounting:</span> Saldo awal akan diposting sebagai Jurnal Khusus Saldo Awal ({journalNo || 'SA-YYYYMMDD-001'}). Total Debet dan Kredit harus seimbangkan (selisih = Rp 0). Selisih pembukuan awal dapat dialokasikan ke akun <span className="font-semibold underline">3101 - Aset Neto Tanpa Pembatasan</span>.
        </div>
      </div>

      {/* Date & Balance Summary Cards DENGAN WARNA TOMPEL (2 Kolom di HP & Rata Tengah) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Date Selector Card with Tompel */}
        <div className="relative overflow-hidden bg-white p-3.5 sm:p-5 rounded-[24px] sm:rounded-[28px] border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-center items-center text-center group">
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-slate-200/40 pointer-events-none transition-transform duration-500 group-hover:scale-125"
            style={{ borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%' }}
          />
          <div className="relative z-10 flex items-center justify-center mb-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[15px] sm:rounded-[18px] border border-slate-200/50 bg-slate-100/70 text-slate-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
          </div>
          <div className="relative z-10 space-y-1 w-full max-w-full">
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase block font-sans truncate">
              TANGGAL SALDO AWAL
            </span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              disabled={!canEdit}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="relative z-10 text-[10px] sm:text-[11px] text-slate-400 font-medium pt-1 truncate max-w-full">
            Periode cut-off
          </div>
        </div>

        <StatCard
          icon={ArrowDownLeft}
          title="TOTAL DEBET"
          value={formatCurrency(totalDebit)}
          color="emerald"
          badge="Debet"
          badgeType="positive"
          subtitle="Akumulasi debet awal"
          verticalCenter={true}
        />

        <StatCard
          icon={ArrowUpRight}
          title="TOTAL KREDIT"
          value={formatCurrency(totalCredit)}
          color="blue"
          badge="Kredit"
          badgeType="info"
          subtitle="Akumulasi kredit awal"
          verticalCenter={true}
        />

        <StatCard
          icon={isBalanced ? CheckCircle2 : AlertTriangle}
          title="STATUS KESEIMBANGAN"
          value={isBalanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'}
          color={isBalanced ? 'emerald' : 'rose'}
          badge={isBalanced ? 'Rp 0' : `Selisih: ${formatCurrency(difference)}`}
          badgeType={isBalanced ? 'positive' : 'negative'}
          subtitle={isBalanced ? 'Double-entry terpenuhi' : 'Debet & Kredit belum sama'}
          verticalCenter={true}
        />
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama akun..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-48"
          >
            <option value="">-- Semua Tipe Akun --</option>
            <option value="ASSET">ASET (Aktiva)</option>
            <option value="LIABILITY">LIABILITAS (Kewajiban)</option>
            <option value="EQUITY">EKUITAS (Saldo Dana)</option>
            <option value="INCOME">PENDAPATAN</option>
            <option value="EXPENSE">BEBAN</option>
          </select>

          <button
            onClick={fetchInitialBalances}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
            title="Muat Ulang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Account Balance Inputs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat daftar akun...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Tidak ada akun postable ditemukan.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="min-w-[760px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-28">Kode</th>
                  <th className="px-5 py-3.5 min-w-[200px]">Nama Akun COA</th>
                  <th className="px-5 py-3.5 w-32 text-center">Tipe</th>
                  <th className="px-5 py-3.5 w-28 text-center">Saldo Normal</th>
                  <th className="px-5 py-3.5 min-w-[170px] w-48 text-right">Saldo Debet (Rp)</th>
                  <th className="px-5 py-3.5 min-w-[170px] w-48 text-right">Saldo Kredit (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredAccounts.map((acc) => {
                  const b = balances[acc.id] || { debit: 0, credit: 0 };
                  const isDebitAcc = acc.normal_balance === 'DEBIT';

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {acc.code}
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {acc.name}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {getTypeBadge(acc.type)}
                      </td>

                      <td className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500">
                        {acc.normal_balance}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={b.debit === 0 ? '' : b.debit}
                          onChange={(e) => handleAmountChange(acc.id, 'debit', e.target.value)}
                          disabled={!canEdit}
                          placeholder="0"
                          className={`w-full min-w-[140px] px-3.5 py-2.5 text-right font-mono font-extrabold text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            isDebitAcc && b.debit > 0
                              ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={b.credit === 0 ? '' : b.credit}
                          onChange={(e) => handleAmountChange(acc.id, 'credit', e.target.value)}
                          disabled={!canEdit}
                          placeholder="0"
                          className={`w-full min-w-[140px] px-3.5 py-2.5 text-right font-mono font-extrabold text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            !isDebitAcc && b.credit > 0
                              ? 'bg-blue-50/60 border-blue-300 text-blue-900'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialBalancePage;
