import React, { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import { downloadPdf } from '../../components/reports/pdf/PdfCommon';
import BalanceSheetPdf from '../../components/reports/pdf/BalanceSheetPdf';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { exportToCsv } from '../../utils/csvExport';
import {
  Landmark,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Printer,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Filter,
  Download,
  Wallet,
  Scale
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

export const BalanceSheetPage = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Comparison options: 'NONE' | 'PRIOR_MONTH' | 'PRIOR_YEAR' | 'CUSTOM'
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
      const label = (data.current_period?.label || 'Periode').replace(/\s+/g, '_');
      const filename = isComparative
        ? `Posisi_Keuangan_Komparatif_${label}.pdf`
        : `Posisi_Keuangan_${label}.pdf`;
      await downloadPdf(<BalanceSheetPdf data={data} compareMode={compareMode} />, filename);
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
        month: selectedMonth,
        year: selectedYear,
        compare_mode: compareMode,
        compare_month: compareMode === 'CUSTOM' ? compareMonth : undefined,
        compare_year: compareMode === 'CUSTOM' ? compareYear : undefined,
      };

      const res = await reportService.getBalanceSheet(params);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Gagal memuat Laporan Posisi Keuangan.');
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat Laporan Posisi Keuangan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear, compareMode, compareMonth, compareYear]);

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

  const renderVarianceBadge = (variance, percentage) => {
    const isPositive = variance > 0;
    const isZero = variance === 0;

    if (isZero) {
      return <span className="text-slate-400 font-mono text-xs">0.00%</span>;
    }

    return (
      <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {formatPercentage(percentage)}
      </span>
    );
  };

  const handleExportCsv = () => {
    if (!data) return;
    const isComp = data.is_comparative;
    const curLabel = data.current_period?.label || 'Periode Berjalan';
    const compLabel = data.comparison_period?.label || 'Periode Pembanding';
    const filename = `Posisi_Keuangan_Neraca_${curLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

    const headers = isComp
      ? ['Kategori / Uraian Akun', 'Kode Akun', `Saldo ${curLabel} (IDR)`, `Saldo ${compLabel} (IDR)`, 'Variance (IDR)', 'Pertumbuhan (%)']
      : ['Kategori / Uraian Akun', 'Kode Akun', `Saldo ${curLabel} (IDR)`];

    const rows = [];

    const addSection = (title, items, totalLabel, totalCurrent, totalComp, totalVariance, totalPct) => {
      rows.push(isComp ? [title, '', '', '', '', ''] : [title, '', '']);
      if (items && items.length > 0) {
        items.forEach((item) => {
          if (isComp) {
            rows.push([
              `  ${item.name}`,
              item.code || '',
              Number(item.current_balance || item.balance || 0).toFixed(2),
              Number(item.comparison_balance || 0).toFixed(2),
              Number(item.variance || 0).toFixed(2),
              Number(item.percentage || 0).toFixed(2) + '%'
            ]);
          } else {
            rows.push([
              `  ${item.name}`,
              item.code || '',
              Number(item.balance || 0).toFixed(2)
            ]);
          }
        });
      }
      if (isComp) {
        rows.push([
          totalLabel,
          '',
          Number(totalCurrent || 0).toFixed(2),
          Number(totalComp || 0).toFixed(2),
          Number(totalVariance || 0).toFixed(2),
          Number(totalPct || 0).toFixed(2) + '%'
        ]);
      } else {
        rows.push([
          totalLabel,
          '',
          Number(totalCurrent || 0).toFixed(2)
        ]);
      }
      rows.push(isComp ? ['', '', '', '', '', ''] : ['', '', '']);
    };

    // 1. ASET
    addSection(
      '1. ASET LANCAR',
      data.assets?.current_assets,
      'TOTAL ASET LANCAR',
      data.assets?.total_current_assets,
      data.assets?.comp_total_current_assets,
      data.assets?.variance_current_assets,
      data.assets?.pct_current_assets
    );
    addSection(
      '2. ASET TIDAK LANCAR / TETAP',
      data.assets?.non_current_assets,
      'TOTAL ASET TIDAK LANCAR',
      data.assets?.total_non_current_assets,
      data.assets?.comp_total_non_current_assets,
      data.assets?.variance_non_current_assets,
      data.assets?.pct_non_current_assets
    );
    rows.push(isComp
      ? ['JUMLAH ASET', '', Number(data.assets?.total_assets || 0).toFixed(2), Number(data.assets?.comp_total_assets || 0).toFixed(2), Number(data.assets?.variance_total_assets || 0).toFixed(2), Number(data.assets?.pct_total_assets || 0).toFixed(2) + '%']
      : ['JUMLAH ASET', '', Number(data.assets?.total_assets || 0).toFixed(2)]);
    rows.push(isComp ? ['', '', '', '', '', ''] : ['', '', '']);

    // 2. LIABILITAS
    addSection(
      '3. LIABILITAS JANGKA PENDEK',
      data.liabilities?.short_term,
      'TOTAL LIABILITAS JANGKA PENDEK',
      data.liabilities?.total_short_term,
      data.liabilities?.comp_total_short_term,
      data.liabilities?.variance_short_term,
      data.liabilities?.pct_short_term
    );
    addSection(
      '4. LIABILITAS JANGKA PANJANG',
      data.liabilities?.long_term,
      'TOTAL LIABILITAS JANGKA PANJANG',
      data.liabilities?.total_long_term,
      data.liabilities?.comp_total_long_term,
      data.liabilities?.variance_long_term,
      data.liabilities?.pct_long_term
    );
    rows.push(isComp
      ? ['JUMLAH LIABILITAS', '', Number(data.liabilities?.total_liabilities || 0).toFixed(2), Number(data.liabilities?.comp_total_liabilities || 0).toFixed(2), Number(data.liabilities?.variance_total_liabilities || 0).toFixed(2), Number(data.liabilities?.pct_total_liabilities || 0).toFixed(2) + '%']
      : ['JUMLAH LIABILITAS', '', Number(data.liabilities?.total_liabilities || 0).toFixed(2)]);
    rows.push(isComp ? ['', '', '', '', '', ''] : ['', '', '']);

    // 3. ASET NETO
    if (isComp) {
      rows.push(['5. ASET NETO', '', '', '', '', '']);
      rows.push(['  Aset Neto Tanpa Pembatasan', '', Number(data.net_assets?.unrestricted_net_assets || 0).toFixed(2), Number(data.net_assets?.comp_unrestricted || 0).toFixed(2), Number(data.net_assets?.variance_unrestricted || 0).toFixed(2), Number(data.net_assets?.pct_unrestricted || 0).toFixed(2) + '%']);
      rows.push(['  Aset Neto Dengan Pembatasan', '', Number(data.net_assets?.restricted_net_assets || 0).toFixed(2), Number(data.net_assets?.comp_restricted || 0).toFixed(2), Number(data.net_assets?.variance_restricted || 0).toFixed(2), Number(data.net_assets?.pct_restricted || 0).toFixed(2) + '%']);
      rows.push(['JUMLAH ASET NETO', '', Number(data.net_assets?.total_net_assets || 0).toFixed(2), Number(data.net_assets?.comp_total_net_assets || 0).toFixed(2), Number(data.net_assets?.variance_total_net_assets || 0).toFixed(2), Number(data.net_assets?.pct_total_net_assets || 0).toFixed(2) + '%']);
      rows.push(['', '', '', '', '', '']);
      rows.push(['JUMLAH LIABILITAS DAN ASET NETO', '', Number(data.total_liabilities_and_net_assets || 0).toFixed(2), Number(data.comp_total_liabilities_and_net_assets || 0).toFixed(2), Number(data.variance_total_liabilities_and_net_assets || 0).toFixed(2), Number(data.pct_total_liabilities_and_net_assets || 0).toFixed(2) + '%']);
    } else {
      rows.push(['5. ASET NETO', '', '']);
      rows.push(['  Aset Neto Tanpa Pembatasan', '', Number(data.net_assets?.unrestricted_net_assets || 0).toFixed(2)]);
      rows.push(['  Aset Neto Dengan Pembatasan', '', Number(data.net_assets?.restricted_net_assets || 0).toFixed(2)]);
      rows.push(['JUMLAH ASET NETO', '', Number(data.net_assets?.total_net_assets || 0).toFixed(2)]);
      rows.push(['', '', '']);
      rows.push(['JUMLAH LIABILITAS DAN ASET NETO', '', Number(data.total_liabilities_and_net_assets || 0).toFixed(2)]);
    }

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={Landmark}
          badge="Laporan Keuangan"
          title="Laporan Posisi Keuangan (Neraca)"
          subtitle="Standar Pelaporan Keuangan Entitas Nirlaba (ISAK 35) & Analisis Komparatif"
          actions={
            <>
              <button
                onClick={fetchReport}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
                <span>Tampilkan</span>
              </button>
              <button
                onClick={handleExportCsv}
                disabled={loading || !data}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Export CSV</span>
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

      {/* Filter Controls Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Month Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bulan Utama</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tahun Utama</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              min="2000"
              max="2099"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Compare Mode Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Perbandingan (Komparasi)</label>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="NONE">Tanpa Perbandingan (Single)</option>
              <option value="PRIOR_MONTH">Dibandingkan Bulan Sebelumnya</option>
              <option value="PRIOR_YEAR">Dibandingkan Tahun Sebelumnya (YoY)</option>
              <option value="CUSTOM">Kustom Bulan & Tahun</option>
            </select>
          </div>

          {/* Custom Compare Month */}
          {compareMode === 'CUSTOM' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bulan Komparasi</label>
              <select
                value={compareMonth}
                onChange={(e) => setCompareMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Compare Year */}
          {compareMode === 'CUSTOM' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tahun Komparasi</label>
              <input
                type="number"
                value={compareYear}
                onChange={(e) => setCompareYear(Number(e.target.value))}
                min="2000"
                max="2099"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Memuat Laporan Posisi Keuangan...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Printable Header */}
          <PrintReportHeader
            title="LAPORAN POSISI KEUANGAN (NERACA)"
            subtitle="Format Standard ISAK 35 (Entitas Nirlaba)"
            periodLabel={data.is_comparative ? `Komparatif: ${data.current_period.label} vs ${data.comparison_period.label}` : `Per ${data.current_period?.label || ''}`}
          />

          {/* Status Indicator */}
          <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-medium no-print">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {data.is_comparative
                  ? `Laporan Komparatif: ${data.current_period.label} vs ${data.comparison_period.label}`
                  : `Laporan Posisi Keuangan per ${data.current_period.label} (${data.current_period.as_of_date})`}
              </span>
            </div>
            <span className="font-bold text-slate-700">Format Standard ISAK 35</span>
          </div>

          {/* 1. SINGLE PERIOD VIEW */}
          {!data.is_comparative && data.assets && (
            <div className="space-y-6">
              {/* Summary Cards DENGAN WARNA TOMPEL (Total Aset & Total Liabilitas 2 Kolom di HP, Rata Tengah) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 no-print">
                <StatCard
                  icon={Landmark}
                  title="TOTAL ASET"
                  value={formatCurrency(data.assets.total_assets)}
                  color="emerald"
                  badge="Aset"
                  badgeType="positive"
                  subtitle={`Lancar: ${formatCurrency(data.assets.total_current_assets)}`}
                  verticalCenter={true}
                />

                <StatCard
                  icon={TrendingDown}
                  title="TOTAL LIABILITAS (KEWAJIBAN)"
                  value={formatCurrency(data.liabilities.total_liabilities)}
                  color="rose"
                  badge="Kewajiban"
                  badgeType="negative"
                  subtitle="Kewajiban jangka pendek & operasional"
                  verticalCenter={true}
                />

                <StatCard
                  icon={Scale}
                  title="TOTAL ASET NETO (EKUITAS)"
                  value={formatCurrency(data.net_assets.total_net_assets)}
                  color="indigo"
                  badge="ISAK 35"
                  badgeType="info"
                  subtitle={`Tanpa Batasan: ${formatCurrency(data.net_assets.unrestricted_net_assets)}`}
                  verticalCenter={true}
                  className="col-span-2 md:col-span-1"
                />
              </div>

              {/* Details Table - Formal HTML Table for Screen & Print */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none">
                <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex justify-between items-center print:bg-slate-900 print:text-white">
                  <span>RINCIAN POSISI KEUANGAN (ISAK 35)</span>
                  <span className="text-xs text-slate-300 font-normal">
                    {data.current_period ? data.current_period.label : `Per ${data.filter?.as_of_date}`}
                  </span>
                </div>

                <div className="p-6 print:p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-2.5 px-4">Posisi Keuangan / Nama Akun</th>
                        <th className="py-2.5 px-4 w-32 font-mono">Kode Akun</th>
                        <th className="py-2.5 px-4 text-right w-48">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {/* 1. ASET */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          1. ASET
                        </td>
                      </tr>

                      {/* A. Aset Lancar */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          A. Aset Lancar
                        </td>
                      </tr>
                      {data.assets.current_assets.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-10 text-slate-400 italic">Tidak ada aset lancar</td>
                        </tr>
                      ) : (
                        data.assets.current_assets.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-10 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-8">Jumlah Aset Lancar</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.assets.total_current_assets)}
                        </td>
                      </tr>

                      {/* B. Aset Tidak Lancar / Tetap */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          B. Aset Tidak Lancar / Aset Tetap
                        </td>
                      </tr>
                      {data.assets.non_current_assets.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-10 text-slate-400 italic">Tidak ada aset tidak lancar</td>
                        </tr>
                      ) : (
                        data.assets.non_current_assets.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-10 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-8">Jumlah Aset Tidak Lancar</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.assets.total_non_current_assets)}
                        </td>
                      </tr>

                      {/* TOTAL ASET */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b-4 border-double border-slate-900">
                        <td colSpan={2} className="py-3 px-4 uppercase tracking-tight text-slate-900 text-xs">
                          TOTAL ASET
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(data.assets.total_assets)}
                        </td>
                      </tr>

                      {/* 2. LIABILITAS */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          2. LIABILITAS
                        </td>
                      </tr>
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          A. Liabilitas Jangka Pendek &amp; Operasional
                        </td>
                      </tr>
                      {data.liabilities.short_term_liabilities.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-10 text-slate-400 italic">Tidak ada liabilitas</td>
                        </tr>
                      ) : (
                        data.liabilities.short_term_liabilities.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-10 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-8">Jumlah Liabilitas</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.liabilities.total_liabilities)}
                        </td>
                      </tr>

                      {/* 3. ASET NETO */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          3. ASET NETO (ISAK 35)
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2 px-4 pl-6 text-slate-700">Tanpa Pembatasan Dari Donor (Unrestricted)</td>
                        <td className="py-2 px-4 font-mono text-slate-400">-</td>
                        <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                          {formatCurrency(data.net_assets.unrestricted_net_assets)}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2 px-4 pl-6 text-slate-700">Dengan Pembatasan Dari Donor (Restricted)</td>
                        <td className="py-2 px-4 font-mono text-slate-400">-</td>
                        <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                          {formatCurrency(data.net_assets.restricted_net_assets)}
                        </td>
                      </tr>
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-8">Jumlah Aset Neto</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.net_assets.total_net_assets)}
                        </td>
                      </tr>

                      {/* TOTAL LIABILITAS DAN ASET NETO */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b-4 border-double border-slate-900">
                        <td colSpan={2} className="py-3 px-4 uppercase tracking-tight text-slate-900 text-xs">
                          TOTAL LIABILITAS DAN ASET NETO
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(data.total_liabilities_and_net_assets)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold text-xs flex justify-between items-center border-t border-slate-200 print:hidden">
                  <span>Status Keseimbangan (Aset = Liabilitas + Aset Neto)</span>
                  <span className={`font-mono font-bold ${data.is_balanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {data.is_balanced ? 'SEIMBANG (BALANCED)' : 'SELISIH / TIDAK SEIMBANG'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. COMPARATIVE MULTI-PERIOD TABLE VIEW */}
          {data.is_comparative && data.comparative_data && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex items-center justify-between">
                <span>TABEL PERBANDINGAN POSISI KEUANGAN (KOMPARATIF)</span>
                <span className="text-xs text-emerald-400 font-normal">
                  {data.current_period.label} vs {data.comparison_period.label}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3.5 px-6">Komponen Akun COA</th>
                      <th className="py-3.5 px-4 text-right">{data.current_period.label}</th>
                      <th className="py-3.5 px-4 text-right text-slate-400">{data.comparison_period.label}</th>
                      <th className="py-3.5 px-4 text-right">Perubahan (Rp)</th>
                      <th className="py-3.5 px-4 text-center">Pertumbuhan (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {/* ASET SECTION */}
                    <tr className="bg-slate-100/70 font-sans font-bold text-slate-900 text-xs">
                      <td colSpan={5} className="py-3 px-6 uppercase tracking-wider text-emerald-800">
                        1. ASET
                      </td>
                    </tr>

                    {/* Aset Lancar */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">Aset Lancar</td>
                    </tr>
                    {data.comparative_data.assets.current_assets.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-10 font-sans text-slate-700">{item.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.current_balance)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(item.comparison_balance)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${item.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(item.variance)}
                        </td>
                        <td className="py-2.5 px-4 text-center">{renderVarianceBadge(item.variance, item.percentage)}</td>
                      </tr>
                    ))}
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Total Aset Lancar</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-mono">{formatCurrency(data.comparative_data.assets.total_current_assets.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.assets.total_current_assets.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.assets.total_current_assets.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.assets.total_current_assets.variance, data.comparative_data.assets.total_current_assets.percentage)}</td>
                    </tr>

                    {/* Aset Tidak Lancar */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">Aset Tidak Lancar / Aset Tetap</td>
                    </tr>
                    {data.comparative_data.assets.non_current_assets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-2 px-10 font-sans italic text-slate-400">Tidak ada aset tidak lancar</td>
                      </tr>
                    ) : (
                      data.comparative_data.assets.non_current_assets.map((item) => (
                        <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-10 font-sans text-slate-700">{item.name}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.current_balance)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(item.comparison_balance)}</td>
                          <td className={`py-2.5 px-4 text-right font-semibold ${item.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatCurrency(item.variance)}
                          </td>
                          <td className="py-2.5 px-4 text-center">{renderVarianceBadge(item.variance, item.percentage)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Total Aset Tidak Lancar</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-mono">{formatCurrency(data.comparative_data.assets.total_non_current_assets.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.assets.total_non_current_assets.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.assets.total_non_current_assets.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.assets.total_non_current_assets.variance, data.comparative_data.assets.total_non_current_assets.percentage)}</td>
                    </tr>

                    {/* TOTAL ASET ROW */}
                    <tr className="bg-slate-900 text-white font-sans font-bold text-sm">
                      <td className="py-3.5 px-6 uppercase tracking-wider text-emerald-400">TOTAL ASET</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-mono">{formatCurrency(data.comparative_data.assets.total_assets.current)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.assets.total_assets.comparison)}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{formatCurrency(data.comparative_data.assets.total_assets.variance)}</td>
                      <td className="py-3.5 px-4 text-center">{renderVarianceBadge(data.comparative_data.assets.total_assets.variance, data.comparative_data.assets.total_assets.percentage)}</td>
                    </tr>

                    {/* LIABILITAS & ASET NETO SECTION */}
                    <tr className="bg-slate-100/70 font-sans font-bold text-slate-900 text-xs">
                      <td colSpan={5} className="py-3 px-6 uppercase tracking-wider text-emerald-800">
                        2. LIABILITAS & ASET NETO
                      </td>
                    </tr>

                    {/* Liabilitas */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">Liabilitas</td>
                    </tr>
                    {data.comparative_data.liabilities.short_term_liabilities.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-10 font-sans text-slate-700">{item.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.current_balance)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(item.comparison_balance)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${item.variance <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(item.variance)}
                        </td>
                        <td className="py-2.5 px-4 text-center">{renderVarianceBadge(item.variance, item.percentage)}</td>
                      </tr>
                    ))}
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Total Liabilitas</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.liabilities.total_liabilities.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.liabilities.total_liabilities.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.liabilities.total_liabilities.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.liabilities.total_liabilities.variance, data.comparative_data.liabilities.total_liabilities.percentage)}</td>
                    </tr>

                    {/* Aset Neto */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">Aset Neto (ISAK 35)</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-10 font-sans text-slate-700">Tanpa Pembatasan Dari Donor (Unrestricted)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(data.comparative_data.net_assets.unrestricted_net_assets.current)}</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(data.comparative_data.net_assets.unrestricted_net_assets.comparison)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold">{formatCurrency(data.comparative_data.net_assets.unrestricted_net_assets.variance)}</td>
                      <td className="py-2.5 px-4 text-center">{renderVarianceBadge(data.comparative_data.net_assets.unrestricted_net_assets.variance, data.comparative_data.net_assets.unrestricted_net_assets.percentage)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-10 font-sans text-slate-700">Dengan Pembatasan Dari Donor (Restricted)</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(data.comparative_data.net_assets.restricted_net_assets.current)}</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(data.comparative_data.net_assets.restricted_net_assets.comparison)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold">{formatCurrency(data.comparative_data.net_assets.restricted_net_assets.variance)}</td>
                      <td className="py-2.5 px-4 text-center">{renderVarianceBadge(data.comparative_data.net_assets.restricted_net_assets.variance, data.comparative_data.net_assets.restricted_net_assets.percentage)}</td>
                    </tr>
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Total Aset Neto</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-mono">{formatCurrency(data.comparative_data.net_assets.total_net_assets.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.net_assets.total_net_assets.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.net_assets.total_net_assets.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.net_assets.total_net_assets.variance, data.comparative_data.net_assets.total_net_assets.percentage)}</td>
                    </tr>

                    {/* TOTAL LIABILITAS & ASET NETO ROW */}
                    <tr className="bg-slate-900 text-white font-sans font-bold text-sm">
                      <td className="py-3.5 px-6 uppercase tracking-wider text-emerald-400">TOTAL LIABILITAS & ASET NETO</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-mono">{formatCurrency(data.comparative_data.total_liabilities_and_net_assets.current)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.total_liabilities_and_net_assets.comparison)}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{formatCurrency(data.comparative_data.total_liabilities_and_net_assets.variance)}</td>
                      <td className="py-3.5 px-4 text-center">{renderVarianceBadge(data.comparative_data.total_liabilities_and_net_assets.variance, data.comparative_data.total_liabilities_and_net_assets.percentage)}</td>
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

export default BalanceSheetPage;
