import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ledgerService } from '../../services/ledgerService';
import { exportService } from '../../services/exportService';
import ApiService from '../../services/api';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import { downloadPdf } from '../../components/reports/pdf/PdfCommon';
import TrialBalancePdf from '../../components/reports/pdf/TrialBalancePdf';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import {
  Landmark,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ExternalLink,
  Printer,
  Download
} from 'lucide-react';

export const TrialBalancePage = () => {
  const [periods, setPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  // Trial Balance Data
  const [tbData, setTbData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!tbData) return;
    try {
      setPdfLoading(true);
      const selectedPeriod = periods.find(p => String(p.id) === String(selectedPeriodId));
      const periodLabel = selectedPeriod ? selectedPeriod.name : (dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : 'Semua Periode');
      const filename = `Neraca_Saldo_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      await downloadPdf(<TrialBalancePdf tbData={tbData} periodLabel={periodLabel} />, filename);
    } catch (err) {
      console.error('PDF error, falling back to window.print():', err);
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportLoading(true);
      await exportService.exportTrialBalance({
        date_from: dateFrom,
        date_to: dateTo,
        accounting_period_id: selectedPeriodId,
      });
    } catch (err) {
      alert('Gagal mengunduh CSV Neraca Saldo: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoadingPeriods(true);
        const res = await ApiService.get('/accounting-periods');
        if (res && res.data) {
          setPeriods(res.data);
          const openP = res.data.find(p => p.status === 'OPEN');
          if (openP) {
            setSelectedPeriodId(openP.id);
          }
        }
      } catch (err) {
        setError('Gagal memuat daftar Periode Akuntansi.');
      } finally {
        setLoadingPeriods(false);
      }
    };

    fetchPeriods();
  }, []);

  const fetchTrialBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        date_from: dateFrom,
        date_to: dateTo,
        accounting_period_id: selectedPeriodId,
      };

      const res = await ledgerService.getTrialBalance(params);
      if (res && res.success) {
        setTbData(res.data);
      } else {
        setError(res?.message || 'Gagal memuat Neraca Saldo.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem saat memuat Neraca Saldo.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedPeriodId]);

  useEffect(() => {
    fetchTrialBalance();
  }, [fetchTrialBalance]);

  const formatCurrency = (val) => {
    if (!val || Number(val) === 0) return '-';
    const num = Number(val);
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

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={Landmark}
          badge="Buku Besar"
          title="Neraca Saldo (Trial Balance)"
          subtitle="Rekapitulasi saldo awal, mutasi, dan saldo akhir seluruh akun COA (POSTED entries)"
          actions={
            <>
              <button
                onClick={handleExportCsv}
                disabled={exportLoading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all"
              >
                <Download className={`w-4 h-4 text-white ${exportLoading ? 'animate-bounce' : ''}`} />
                <span>{exportLoading ? 'Mengunduh...' : 'Export CSV'}</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || loading || !tbData}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-md transition-all disabled:opacity-50"
              >
                <Printer className={`w-4 h-4 text-slate-800 ${pdfLoading ? 'animate-spin' : ''}`} />
                <span>{pdfLoading ? 'Membuat PDF...' : 'Cetak / PDF'}</span>
              </button>
            </>
          }
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-3.5 no-print">
        {/* Baris 1: Pilihan Periode Akuntansi */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Periode Akuntansi</label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value="">-- Semua Periode --</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.period_name} ({p.status})
              </option>
            ))}
          </select>
        </div>

        {/* Baris 2: Filter Dari & Sampai Tanggal (2 Kolom) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-medium"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Baris 3: Tombol Aksi Tampilkan Neraca & Reset */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <button
            onClick={fetchTrialBalance}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
            <span>Tampilkan Neraca</span>
          </button>

          {(selectedPeriodId || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPeriodId('');
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200/60 shadow-xs"
              title="Reset filter"
            >
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Balance Verification Banner */}
      {tbData && (
        <>
          <PrintReportHeader
            title="NERACA SALDO (TRIAL BALANCE)"
            subtitle="Rekapitulasi Saldo Awal, Mutasi Debet/Kredit, dan Saldo Akhir Seluruh Akun (ISAK 35)"
            periodLabel={tbData.period ? tbData.period.name : (dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : 'Semua Periode')}
          />
          <div className={`relative overflow-hidden p-5 rounded-[28px] border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print group ${tbData.summary?.is_balanced
            ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
            : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
            }`}>
            {/* Warna Tompel Background */}
            <div
              className={`absolute -top-10 -right-10 w-36 h-36 rounded-full ${tbData.summary?.is_balanced ? 'bg-emerald-400/20' : 'bg-rose-400/20'} pointer-events-none transition-transform duration-700 group-hover:scale-125`}
              style={{ borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%' }}
            />
            <div
              className={`absolute top-1/2 -right-5 w-24 h-24 rounded-full ${tbData.summary?.is_balanced ? 'bg-emerald-500/10' : 'bg-rose-500/10'} pointer-events-none transition-transform duration-700 group-hover:scale-125`}
              style={{ borderRadius: '58% 42% 48% 52% / 38% 52% 48% 62%' }}
            />
            <div
              className={`absolute -bottom-8 -left-8 w-24 h-24 rounded-full ${tbData.summary?.is_balanced ? 'bg-emerald-500/10' : 'bg-rose-500/10'} pointer-events-none`}
              style={{ borderRadius: '50% 50% 35% 65% / 60% 35% 65% 40%' }}
            />

            <div className="relative z-10 flex items-center gap-3">
              {tbData.summary?.is_balanced ? (
                <div className="w-12 h-12 rounded-[18px] bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-[18px] bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  {tbData.summary?.is_balanced ? 'NERACA SALDO SEIMBANG (BALANCED)' : 'NERACA SALDO TIDAK SEIMBANG (UNBALANCED)'}
                </h3>
                <p className="text-xs opacity-80">
                  {tbData.summary?.is_balanced
                    ? 'Total Debet dan Kredit akhir persis sama. Invariansi double-entry akuntansi terpenuhi.'
                    : `Terdapat selisih sebesar ${formatCurrency(tbData.summary?.difference)} antara Total Debet dan Kredit!`}
                </p>
              </div>
            </div>

            {/* Informasi Debet & Kredit Akhir: Rata Tengah di HP (Kotak Merah) */}
            <div className="relative z-10 grid grid-cols-2 gap-4 text-center justify-center p-3 rounded-2xl bg-white/60 sm:bg-transparent border border-emerald-200/50 sm:border-0 font-mono text-xs w-full sm:w-auto shrink-0">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold opacity-60 block tracking-wider">Total Debet Akhir</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 block mt-0.5">{formatCurrency(tbData.summary?.total_ending_debit)}</span>
              </div>
              <div className="text-center border-l border-slate-200/80 pl-3 sm:border-0 sm:pl-0">
                <span className="text-[10px] uppercase font-bold opacity-60 block tracking-wider">Total Kredit Akhir</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 block mt-0.5">{formatCurrency(tbData.summary?.total_ending_credit)}</span>
              </div>
            </div>
          </div>

          {/* Trial Balance Table Container */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 border-r border-slate-200">Kode COA</th>
                    <th rowSpan={2} className="px-4 py-3 border-r border-slate-200">Nama Akun Ledger</th>
                    <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-center">Tipe</th>
                    <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-slate-100/60">Saldo Awal</th>
                    <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-slate-100/60">Mutasi Periode</th>
                    <th colSpan={2} className="px-4 py-2 text-center bg-slate-100/60">Saldo Akhir</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Debet</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Kredit</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Debet</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Kredit</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200">Debet</th>
                    <th className="px-3 py-2 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-slate-400 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Mengkalkulasi Neraca Saldo...</span>
                      </td>
                    </tr>
                  ) : !tbData || tbData.accounts?.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-sans">
                        Tidak ditemukan data akun COA aktif.
                      </td>
                    </tr>
                  ) : (
                    tbData.accounts.map((row) => (
                      <tr key={row.account_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900">
                          <Link
                            to={`/accounting/ledger?account_id=${row.account_id}`}
                            className="text-indigo-600 hover:underline flex items-center gap-1 group"
                            title="Buka Buku Besar Akun Ini"
                          >
                            <span>{row.account_code}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 font-sans font-medium text-slate-800">
                          {row.account_name}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 font-sans text-center text-[10px] text-slate-400">
                          {row.account_type}
                        </td>
                        <td className="px-3 py-3 text-right border-r border-slate-100 text-slate-600">
                          {formatCurrency(row.opening_debit)}
                        </td>
                        <td className="px-3 py-3 text-right border-r border-slate-100 text-slate-600">
                          {formatCurrency(row.opening_credit)}
                        </td>
                        <td className="px-3 py-3 text-right border-r border-slate-100 text-emerald-700 font-semibold">
                          {formatCurrency(row.period_debit)}
                        </td>
                        <td className="px-3 py-3 text-right border-r border-slate-100 text-sky-700 font-semibold">
                          {formatCurrency(row.period_credit)}
                        </td>
                        <td className="px-3 py-3 text-right border-r border-slate-100 font-bold text-emerald-800">
                          {formatCurrency(row.ending_debit)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-sky-800">
                          {formatCurrency(row.ending_credit)}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Summary Totals Row */}
                  {tbData && tbData.summary && (
                    <tr className="bg-slate-900 text-white font-semibold border-t-2 border-slate-800">
                      <td colSpan={3} className="px-4 py-3.5 font-sans uppercase tracking-wider text-[11px] text-indigo-400 font-bold">
                        GRAND TOTAL BALANCE
                      </td>
                      <td className="px-3 py-3.5 text-right text-slate-300">
                        {formatCurrency(tbData.summary.total_opening_debit)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-slate-300">
                        {formatCurrency(tbData.summary.total_opening_credit)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-emerald-400 font-bold">
                        {formatCurrency(tbData.summary.total_period_debit)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-sky-400 font-bold">
                        {formatCurrency(tbData.summary.total_period_credit)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-emerald-400 font-bold">
                        {formatCurrency(tbData.summary.total_ending_debit)}
                      </td>
                      <td className="px-3 py-3.5 text-right text-sky-400 font-bold">
                        {formatCurrency(tbData.summary.total_ending_credit)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <PrintReportFooter />
        </>
      )}
    </div>
  );
};

export default TrialBalancePage;
