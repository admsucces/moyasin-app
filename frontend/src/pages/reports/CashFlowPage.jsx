import React, { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import { downloadPdf } from '../../components/reports/pdf/PdfCommon';
import CashFlowPdf from '../../components/reports/pdf/CashFlowPdf';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import {
  Landmark,
  Calendar,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  Layers
} from 'lucide-react';

const MONTHS = [
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

export const CashFlowPage = () => {
  const currentDate = new Date();
  const [periodType, setPeriodType] = useState('MONTH'); // 'MONTH' | 'YEAR' | 'CUSTOM_DATE'
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Date range fallback for custom date
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Comparison mode: 'NONE' | 'PRIOR_MONTH' | 'PRIOR_YEAR' | 'CUSTOM'
  const [compareMode, setCompareMode] = useState('NONE');
  const [compareMonth, setCompareMonth] = useState(selectedMonth === 1 ? 12 : selectedMonth - 1);
  const [compareYear, setCompareYear] = useState(selectedMonth === 1 ? selectedYear - 1 : selectedYear);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const isComparative = Boolean(compareMode !== 'NONE' || data.is_comparative);
      const label = (data.current_period?.label || `${data.filter?.start_date}_${data.filter?.end_date}`).replace(/\s+/g, '_');
      const filename = isComparative
        ? `Arus_Kas_Komparatif_${label}.pdf`
        : `Arus_Kas_${label}.pdf`;
      await downloadPdf(<CashFlowPdf data={data} compareMode={compareMode} />, filename);
    } catch (err) {
      console.error('PDF error, falling back to window.print():', err);
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        period_type: periodType,
        month: selectedMonth,
        year: selectedYear,
        start_date: periodType === 'CUSTOM_DATE' ? startDate : undefined,
        end_date: periodType === 'CUSTOM_DATE' ? endDate : undefined,
        compare_mode: compareMode,
        compare_month: compareMode === 'CUSTOM' ? compareMonth : undefined,
        compare_year: compareMode === 'CUSTOM' ? compareYear : undefined,
      };

      const res = await reportService.getCashFlows(params);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Gagal memuat Laporan Arus Kas.');
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat Laporan Arus Kas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [periodType, selectedMonth, selectedYear, startDate, endDate, compareMode, compareMonth, compareYear]);

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

  const formatPercentage = (val) => {
    if (val === null || val === undefined) return '0.00%';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const renderVarianceBadge = (variance, percentage, invertColor = false) => {
    const isPositive = variance > 0;
    const isZero = variance === 0;

    if (isZero) {
      return <span className="text-slate-400 font-mono text-xs">0.00%</span>;
    }

    let isGood = isPositive;
    if (invertColor) isGood = !isPositive;

    return (
      <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{formatPercentage(percentage)}</span>
      </div>
    );
  };

  const renderComparativeRow = (title, compObj, isTotal = false, invertColor = false, isDisbursement = false) => {
    if (!compObj) return null;
    const { current, comparison, diff, percentage } = compObj;

    return (
      <tr className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${isTotal ? 'font-bold bg-slate-50/50' : 'text-slate-700'
        }`}>
        <td className={`py-2.5 px-4 text-xs ${isTotal ? 'text-slate-900 font-bold' : 'text-slate-600 pl-6'}`}>
          {title}
        </td>
        <td className="py-2.5 px-4 text-xs text-right font-mono font-medium text-slate-800">
          {isDisbursement && current > 0 ? `(${formatCurrency(current)})` : formatCurrency(current)}
        </td>
        <td className="py-2.5 px-4 text-xs text-right font-mono font-medium text-slate-500">
          {isDisbursement && comparison > 0 ? `(${formatCurrency(comparison)})` : formatCurrency(comparison)}
        </td>
        <td className={`py-2.5 px-4 text-xs text-right font-mono font-semibold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'
          }`}>
          {diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
        </td>
        <td className="py-2.5 px-4 text-xs text-right">
          {renderVarianceBadge(diff, percentage, invertColor)}
        </td>
      </tr>
    );
  };

  const years = Array.from({ length: 11 }, (_, i) => currentDate.getFullYear() - 5 + i);

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={Landmark}
          badge="Laporan Keuangan"
          title="Laporan Arus Kas"
          subtitle="Arus Kas Aktivitas Operasi, Investasi, dan Pendanaan (ISAK 35 Direct/Indirect)"
          actions={
            <>
              <button
                onClick={fetchReport}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                <span>Perbarui Data</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading || loading || !data}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-md transition-all disabled:opacity-50"
              >
                <Printer className={`w-3.5 h-3.5 text-slate-800 ${pdfLoading ? 'animate-spin' : ''}`} />
                <span>{pdfLoading ? 'Membuat PDF...' : 'Unduh PDF Resmi'}</span>
              </button>
            </>
          }
        />
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Tipe Periode Utama */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Periode Laporan
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="MONTH">Bulanan</option>
              <option value="YEAR">Tahunan</option>
              <option value="CUSTOM_DATE">Rentang Tanggal Kustom</option>
            </select>
          </div>

          {/* Opsi Bulan & Tahun */}
          {periodType === 'MONTH' && (
            <>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500">Tahun</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  min="2000"
                  max="2099"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </>
          )}

          {periodType === 'YEAR' && (
            <div className="md:col-span-4 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Tahun Laporan</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                min="2000"
                max="2099"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}

          {periodType === 'CUSTOM_DATE' && (
            <div className="md:col-span-4 flex items-center gap-2 pt-5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
              />
            </div>
          )}

          {/* Opsi Perbandingan (Comparison) */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-600" /> Mode Perbandingan
            </label>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value)}
              className="bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="NONE">Tanpa Perbandingan</option>
              <option value="PRIOR_MONTH">Dibandingkan Bulan Lalu</option>
              <option value="PRIOR_YEAR">Dibandingkan Tahun Lalu (YoY)</option>
              <option value="CUSTOM">Periode Pembanding Kustom</option>
            </select>
          </div>

          {/* Detail Pembanding Kustom */}
          {compareMode === 'CUSTOM' && (
            <div className="md:col-span-2 flex items-center gap-2 pt-5">
              <select
                value={compareMonth}
                onChange={(e) => setCompareMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={compareYear}
                onChange={(e) => setCompareYear(Number(e.target.value))}
                min="2000"
                max="2099"
                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          Memuat Laporan Arus Kas...
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          <PrintReportHeader
            title="LAPORAN ARUS KAS"
            subtitle="Arus Kas Aktivitas Operasi, Investasi, dan Pendanaan (ISAK 35)"
            periodLabel={data.is_comparative
              ? `${data.current_period?.label || ''} vs ${data.comparison_period?.label || ''}`
              : (data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`)}
          />
          {/* Badge Rekonsiliasi Kas */}
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium no-print ${data.is_reconciled
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
            <div className="flex items-center gap-2">
              {data.is_reconciled ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {data.is_reconciled
                  ? 'Kas Akhir Laporan Arus Kas cocok sempurna dengan Kas & Bank di Neraca'
                  : `Terdapat selisih rekonsiliasi kas: ${formatCurrency(Math.abs(data.ending_cash - data.balance_sheet_cash))}`}
              </span>
            </div>
            <span className="font-bold">Saldo Akhir Kas: {formatCurrency(data.ending_cash)}</span>
          </div>

          {/* TABLE DISPLAY */}
          {data.is_comparative ? (
            /* VIEW PERBANDINGAN (COMPARATIVE VIEW) */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex justify-between items-center">
                <span>LAPORAN ARUS KAS KOMPARATIF</span>
                <span className="text-xs font-normal text-slate-300">
                  {data.current_period?.label} vs {data.comparison_period?.label}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                      <th className="py-3 px-4 min-w-[280px]">KOMPONEN ARUS KAS</th>
                      <th className="py-3 px-4 text-right min-w-[140px]">{data.current_period?.label || 'Periode Berjalan'}</th>
                      <th className="py-3 px-4 text-right min-w-[140px]">{data.comparison_period?.label || 'Periode Pembanding'}</th>
                      <th className="py-3 px-4 text-right min-w-[130px]">SELISIH (RP)</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">PERTUMBUHAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Saldo Awal Kas */}
                    {renderComparativeRow(
                      'SALDO KAS & BANK AWAL PERIODE',
                      data.comparative_data?.beginning_cash,
                      true
                    )}

                    {/* 1. AKTIVITAS OPERASI */}
                    <tr className="bg-slate-50/80 font-bold text-slate-900 border-t border-b border-slate-200">
                      <td colSpan={5} className="py-2.5 px-4 text-xs tracking-wider uppercase text-emerald-800">
                        1. ARUS KAS DARI AKTIVITAS OPERASI
                      </td>
                    </tr>
                    {renderComparativeRow(
                      'Penerimaan Kas Operasional & Donasi',
                      data.comparative_data?.operating_activities?.cash_receipts
                    )}
                    {renderComparativeRow(
                      'Pengeluaran Kas Beban Program & Operasional',
                      data.comparative_data?.operating_activities?.cash_disbursements,
                      false,
                      true,
                      true
                    )}
                    {renderComparativeRow(
                      'Kas Bersih Dari Aktivitas Operasi',
                      data.comparative_data?.operating_activities?.net_cash,
                      true
                    )}

                    {/* 2. AKTIVITAS INVESTASI */}
                    <tr className="bg-slate-50/80 font-bold text-slate-900 border-t border-b border-slate-200">
                      <td colSpan={5} className="py-2.5 px-4 text-xs tracking-wider uppercase text-emerald-800">
                        2. ARUS KAS DARI AKTIVITAS INVESTASI
                      </td>
                    </tr>
                    {renderComparativeRow(
                      'Penerimaan Hasil Penjualan Aset Tetap',
                      data.comparative_data?.investing_activities?.cash_receipts
                    )}
                    {renderComparativeRow(
                      'Pengeluaran Kas Pembelian Aset Tetap',
                      data.comparative_data?.investing_activities?.cash_disbursements,
                      false,
                      true,
                      true
                    )}
                    {renderComparativeRow(
                      'Kas Bersih Dari Aktivitas Investasi',
                      data.comparative_data?.investing_activities?.net_cash,
                      true
                    )}

                    {/* 3. AKTIVITAS PENDANAAN */}
                    <tr className="bg-slate-50/80 font-bold text-slate-900 border-t border-b border-slate-200">
                      <td colSpan={5} className="py-2.5 px-4 text-xs tracking-wider uppercase text-emerald-800">
                        3. ARUS KAS DARI AKTIVITAS PENDANAAN
                      </td>
                    </tr>
                    {renderComparativeRow(
                      'Penerimaan Pinjaman / Dana Terikat Persisten',
                      data.comparative_data?.financing_activities?.cash_receipts
                    )}
                    {renderComparativeRow(
                      'Pembayaran Pinjaman / Kewajiban Pendanaan',
                      data.comparative_data?.financing_activities?.cash_disbursements,
                      false,
                      true,
                      true
                    )}
                    {renderComparativeRow(
                      'Kas Bersih Dari Aktivitas Pendanaan',
                      data.comparative_data?.financing_activities?.net_cash,
                      true
                    )}

                    {/* KENAIKAN BERSIH KAS */}
                    {renderComparativeRow(
                      'KENAIKAN / (PENURUNAN) BERSIH KAS & BANK',
                      data.comparative_data?.net_cash_increase_decrease,
                      true
                    )}

                    {/* SALDO AKHIR KAS */}
                    {renderComparativeRow(
                      'SALDO KAS & BANK AKHIR PERIODE',
                      data.comparative_data?.ending_cash,
                      true
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW TUNGGAL (SINGLE PERIOD VIEW - FORMAL HTML TABLE) */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none">
              <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex justify-between items-center print:bg-slate-900 print:text-white">
                <span>LAPORAN ARUS KAS (ISAK 35)</span>
                <span className="text-xs text-slate-300 font-normal">
                  Periode: {data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`}
                </span>
              </div>

              <div className="p-6 print:p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="py-2.5 px-4">Komponen Arus Kas</th>
                      <th className="py-2.5 px-4 text-right w-48">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {/* Saldo Awal */}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-b border-slate-300">
                      <td className="py-2.5 px-4 uppercase text-slate-900">SALDO KAS &amp; BANK AWAL PERIODE</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(data.beginning_cash)}</td>
                    </tr>

                    {/* 1. AKTIVITAS OPERASI */}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                      <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                        1. ARUS KAS DARI AKTIVITAS OPERASI
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-4 pl-8 text-slate-700">Penerimaan Kas Operasional &amp; Donasi</td>
                      <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(data.operating_activities?.cash_receipts)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-4 pl-8 text-slate-700">Pengeluaran Kas Beban Program &amp; Operasional</td>
                      <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                        {Number(data.operating_activities?.cash_disbursements) > 0 ? `(${formatCurrency(data.operating_activities?.cash_disbursements)})` : formatCurrency(data.operating_activities?.cash_disbursements)}
                      </td>
                    </tr>
                    <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                      <td className="py-2 px-4 pl-6">Kas Bersih Diperoleh Dari (Digunakan Untuk) Aktivitas Operasi</td>
                      <td className={`py-2 px-4 text-right font-mono font-bold ${data.operating_activities?.net_cash >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                        {formatCurrency(data.operating_activities?.net_cash)}
                      </td>
                    </tr>

                    {/* 2. AKTIVITAS INVESTASI */}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                      <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                        2. ARUS KAS DARI AKTIVITAS INVESTASI
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-4 pl-8 text-slate-700">Penerimaan Hasil Penjualan Aset Tetap</td>
                      <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(data.investing_activities?.cash_receipts)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-4 pl-8 text-slate-700">Pengeluaran Kas Pembelian Aset Tetap</td>
                      <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                        {Number(data.investing_activities?.cash_disbursements) > 0 ? `(${formatCurrency(data.investing_activities?.cash_disbursements)})` : formatCurrency(data.investing_activities?.cash_disbursements)}
                      </td>
                    </tr>
                    <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                      <td className="py-2 px-4 pl-6">Kas Bersih Diperoleh Dari (Digunakan Untuk) Aktivitas Investasi</td>
                      <td className={`py-2 px-4 text-right font-mono font-bold ${data.investing_activities?.net_cash >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                        {formatCurrency(data.investing_activities?.net_cash)}
                      </td>
                    </tr>

                    {/* 3. AKTIVITAS PENDANAAN */}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                      <td colSpan={2} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                        3. ARUS KAS DARI AKTIVITAS PENDANAAN
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-4 pl-8 text-slate-700">Penerimaan Pinjaman / Dana Terikat Persisten</td>
                      <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(data.financing_activities?.cash_receipts)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-4 pl-8 text-slate-700">Pembayaran Pinjaman / Kewajiban Pendanaan</td>
                      <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                        {Number(data.financing_activities?.cash_disbursements) > 0 ? `(${formatCurrency(data.financing_activities?.cash_disbursements)})` : formatCurrency(data.financing_activities?.cash_disbursements)}
                      </td>
                    </tr>
                    <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                      <td className="py-2 px-4 pl-6">Kas Bersih Diperoleh Dari (Digunakan Untuk) Aktivitas Pendanaan</td>
                      <td className={`py-2 px-4 text-right font-mono font-bold ${data.financing_activities?.net_cash >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                        {formatCurrency(data.financing_activities?.net_cash)}
                      </td>
                    </tr>

                    {/* KENAIKAN / PENURUNAN BERSIH */}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                      <td className="py-2.5 px-4 uppercase text-slate-900">KENAIKAN / (PENURUNAN) BERSIH KAS &amp; BANK</td>
                      <td className={`py-2.5 px-4 text-right font-mono font-bold ${data.net_cash_increase_decrease >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                        {formatCurrency(data.net_cash_increase_decrease)}
                      </td>
                    </tr>

                    {/* SALDO AKHIR KAS */}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b-4 border-double border-slate-900">
                      <td className="py-3 px-4 uppercase tracking-tight text-xs">
                        SALDO KAS &amp; BANK AKHIR PERIODE
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-slate-900">
                        {formatCurrency(data.ending_cash)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <PrintReportFooter />
        </div>
      )}
    </div>
  );
};

export default CashFlowPage;
