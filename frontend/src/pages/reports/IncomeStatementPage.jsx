import React, { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import { downloadPdf } from '../../components/reports/pdf/PdfCommon';
import IncomeStatementPdf from '../../components/reports/pdf/IncomeStatementPdf';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import {
  FileText,
  Calendar,
  RefreshCw,
  Printer,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Filter,
  Layers,
  Download,
  ArrowDownLeft,
  ArrowUpRight
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

export const IncomeStatementPage = () => {
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
      const label = (data.current_period?.label || 'Periode').replace(/\s+/g, '_');
      const filename = isComparative
        ? `Laporan_Aktivitas_${compareMode}_${label}.pdf`
        : `Laporan_Aktivitas_${label}.pdf`;
      await downloadPdf(
        <IncomeStatementPdf data={data} compareMode={compareMode} selectedYear={selectedYear} />,
        filename
      );
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

      const res = await reportService.getIncomeStatement(params);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Gagal memuat Laporan Penghasilan Komprehensif.');
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat Laporan Penghasilan Komprehensif.');
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

  const formatNumber = (val) => {
    if (val === null || val === undefined || Number(val) === 0) return ' - ';
    const num = Number(val);
    const absVal = Math.abs(num);
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absVal);
    if (num < 0) return `(${formatted})`;
    return formatted;
  };

  const exportAnnualToCSV = () => {
    if (!data?.annual_statement) return;
    const year = data.annual_statement.year || selectedYear;
    const months = data.months || MONTHS;

    let csv = `Kode\tNama Akun\t${months.map(m => m.name || m.label).join('\t')}\t${year}\n`;

    csv += `4000\tPENERIMAAN\t${months.map(() => '').join('\t')}\t\n`;
    (data.annual_statement.revenues?.accounts || []).forEach(acc => {
      const vals = months.map(m => {
        const v = acc.months?.[m.id || m.value] || 0;
        return v > 0 ? v : '-';
      });
      csv += `"${acc.code}"\t"${acc.name}"\t${vals.join('\t')}\t${acc.total_year > 0 ? acc.total_year : '-'}\n`;
    });

    const revTotals = months.map(m => data.annual_statement.revenues?.monthly_totals?.[m.id || m.value] || 0);
    csv += `Total Penerimaan\t\t${revTotals.join('\t')}\t${data.annual_statement.revenues?.total_year || 0}\n`;

    csv += `5000\tBEBAN\t${months.map(() => '').join('\t')}\t-\n`;
    (data.annual_statement.expenses?.accounts || []).forEach(acc => {
      const vals = months.map(m => {
        const v = acc.months?.[m.id || m.value] || 0;
        return v > 0 ? v : '-';
      });
      csv += `"${acc.code}"\t"${acc.name}"\t${vals.join('\t')}\t${acc.total_year > 0 ? acc.total_year : '-'}\n`;
    });

    const expTotals = months.map(m => data.annual_statement.expenses?.monthly_totals?.[m.id || m.value] || 0);
    csv += `Total Biaya\t\t${expTotals.join('\t')}\t${data.annual_statement.expenses?.total_year || 0}\n`;

    const netTotals = months.map(m => data.annual_statement.net_surplus?.monthly_totals?.[m.id || m.value] || 0);
    csv += `Total Penghasilan Komprehensif\t\t${netTotals.join('\t')}\t${data.annual_statement.net_surplus?.total_year || 0}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Aktivitas_12_Bulan_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getRestrictionRevenues = () => {
    if (data?.restriction_comparison?.revenues) {
      return data.restriction_comparison.revenues;
    }
    const map = {};
    (data?.revenues?.unrestricted || []).forEach((u) => {
      map[u.account_id] = { ...u, unrestricted: Number(u.amount) || 0, restricted: 0, total: Number(u.amount) || 0 };
    });
    (data?.revenues?.restricted || []).forEach((r) => {
      if (map[r.account_id]) {
        map[r.account_id].restricted = Number(r.amount) || 0;
        map[r.account_id].total += Number(r.amount) || 0;
      } else {
        map[r.account_id] = { ...r, unrestricted: 0, restricted: Number(r.amount) || 0, total: Number(r.amount) || 0 };
      }
    });
    const totRev = Number(data?.revenues?.total_revenue) || 0;
    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: totRev > 0 ? ((item.total / totRev) * 100).toFixed(2) : '0.00',
      }))
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={FileText}
          badge="Laporan Keuangan"
          title="Laporan Penghasilan Komprehensif"
          subtitle="Rincian Penerimaan & Beban Berdasarkan Batasan Donor (ISAK 35) & Analisis Aktivitas"
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
          {/* Period Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jenis Periode</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              disabled={compareMode === 'MONTHLY_ANNUAL'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="MONTH">Per Bulan</option>
              <option value="YEAR">Per Tahun</option>
              <option value="CUSTOM_DATE">Rentang Tanggal</option>
            </select>
          </div>

          {/* Month Selector */}
          {periodType === 'MONTH' && compareMode !== 'MONTHLY_ANNUAL' && (
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
          )}

          {/* Year Selector */}
          {(periodType === 'MONTH' || periodType === 'YEAR' || compareMode === 'MONTHLY_ANNUAL') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {compareMode === 'MONTHLY_ANNUAL' ? 'Pilih Tahun' : 'Tahun Utama'}
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                min="2000"
                max="2099"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          )}

          {/* Custom Date Range */}
          {periodType === 'CUSTOM_DATE' && compareMode !== 'MONTHLY_ANNUAL' && (
            <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Compare Mode Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Perbandingan (Komparasi)</label>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="NONE">Tanpa Perbandingan (Single Period)</option>
              <option value="RESTRICTION">Perbandingan Tanpa Batasan dan Dengan Batasan</option>
              <option value="WITHOUT_RESTRICTION">Laporan Aktivitas Tanpa Batasan</option>
              <option value="WITH_RESTRICTION">Laporan Aktivitas Dengan Batasan</option>
              <option value="MONTHLY_ANNUAL">Laporan Aktivitas 12 Bulan (Januari - Desember)</option>
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
          <span>Memuat Laporan Penghasilan Komprehensif...</span>
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
            title={
              compareMode === 'MONTHLY_ANNUAL'
                ? "LAPORAN AKTIVITAS 12 BULAN (TAHUNAN)"
                : compareMode === 'RESTRICTION'
                  ? "LAPORAN AKTIVITAS - PERBANDINGAN PEMBATASAN DONOR"
                  : compareMode === 'WITHOUT_RESTRICTION'
                    ? "LAPORAN AKTIVITAS - TANPA PEMBATASAN"
                    : compareMode === 'WITH_RESTRICTION'
                      ? "LAPORAN AKTIVITAS - DENGAN PEMBATASAN"
                      : "LAPORAN PENGHASILAN KOMPREHENSIF"
            }
            subtitle="Laporan Aktivitas Penerimaan & Beban Entitas Nirlaba (ISAK 35)"
            periodLabel={
              compareMode === 'MONTHLY_ANNUAL'
                ? `Tahun Buku: ${data.annual_statement?.year || selectedYear}`
                : compareMode === 'RESTRICTION'
                  ? `Komparasi Batasan: ${data.current_period?.label || ''}`
                  : compareMode === 'WITHOUT_RESTRICTION'
                    ? `Tanpa Pembatasan: ${data.current_period?.label || ''}`
                    : compareMode === 'WITH_RESTRICTION'
                      ? `Dengan Pembatasan: ${data.current_period?.label || ''}`
                      : data.is_comparative
                        ? `${data.current_period?.label || ''} vs ${data.comparison_period?.label || ''}`
                        : (data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`)
            }
          />

          {/* Status Indicator */}
          <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-medium no-print">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {compareMode === 'MONTHLY_ANNUAL'
                  ? `Laporan Aktivitas 12 Bulan: Rekapitulasi Penerimaan & Beban Januari s/d Desember - Tahun ${data.annual_statement?.year || selectedYear}`
                  : compareMode === 'RESTRICTION'
                    ? `Laporan Komparatif Aktivitas: Tanpa Batasan vs Dengan Batasan Donor - Periode ${data.current_period?.label || ''}`
                    : compareMode === 'WITHOUT_RESTRICTION'
                      ? `Laporan Aktivitas: Tanpa Pembatasan (Unrestricted) - Periode ${data.current_period?.label || ''}`
                      : compareMode === 'WITH_RESTRICTION'
                        ? `Laporan Aktivitas: Dengan Pembatasan (Restricted) - Periode ${data.current_period?.label || ''}`
                        : data.is_comparative
                          ? `Laporan Komparatif Aktivitas: ${data.current_period?.label || ''} vs ${data.comparison_period?.label || ''}`
                          : `Laporan Aktivitas Periode: ${data.current_period ? data.current_period.label : (data.filter?.start_date + ' s/d ' + data.filter?.end_date)}`}
              </span>
            </div>
            <span className="font-bold text-slate-700">Format Standard ISAK 35</span>
          </div>

          {/* A. PERBANDINGAN TANPA BATASAN DAN DENGAN BATASAN (ISAK 35 COLUMNAR COMPARISON) */}
          {compareMode === 'RESTRICTION' && data.revenues && (
            <div className="space-y-6">
              {/* Summary KPI Cards DENGAN WARNA TOMPEL */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 no-print">
                <StatCard
                  icon={ArrowDownLeft}
                  title="TOTAL PENERIMAAN"
                  value={formatCurrency(data.revenues.total_revenue)}
                  color="emerald"
                  badge="Penerimaan"
                  badgeType="positive"
                  subtitle={`Tanpa Batasan: ${formatCurrency(data.revenues.total_unrestricted)}`}
                  verticalCenter={true}
                />

                <StatCard
                  icon={ArrowUpRight}
                  title="TOTAL BEBAN"
                  value={formatCurrency(data.expenses.total_expense)}
                  color="rose"
                  badge="Beban"
                  badgeType="negative"
                  subtitle={`Program: ${formatCurrency(data.expenses.total_program)}`}
                  verticalCenter={true}
                />

                <StatCard
                  icon={TrendingUp}
                  title="SURPLUS / (DEFISIT) BERSIH"
                  value={formatCurrency(data.surplus_deficit.total_surplus)}
                  color={data.surplus_deficit.total_surplus >= 0 ? 'emerald' : 'rose'}
                  badge={data.surplus_deficit.total_surplus >= 0 ? 'SURPLUS' : 'DEFISIT'}
                  badgeType={data.surplus_deficit.total_surplus >= 0 ? 'positive' : 'negative'}
                  subtitle={`Tanpa Batasan: ${formatCurrency(data.surplus_deficit.unrestricted)}`}
                  className="col-span-2 md:col-span-1"
                  verticalCenter={true}
                />
              </div>

              {/* Table Perbandingan */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex items-center justify-between">
                  <span>TABEL PERBANDINGAN AKTIVITAS: TANPA BATASAN DAN DENGAN BATASAN (ISAK 35)</span>
                  <span className="text-xs text-emerald-400 font-normal">
                    Periode: {data.current_period ? data.current_period.label : (data.filter?.start_date + ' s/d ' + data.filter?.end_date)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="py-3.5 px-6 min-w-[280px]">Komponen Aktivitas (ISAK 35)</th>
                        <th className="py-3.5 px-4 text-right min-w-[150px]">Tanpa Batasan (Rp)</th>
                        <th className="py-3.5 px-4 text-right min-w-[150px]">Dengan Batasan (Rp)</th>
                        <th className="py-3.5 px-4 text-right min-w-[160px] bg-slate-100/60 font-bold text-slate-800">Total / Jumlah (Rp)</th>
                        <th className="py-3.5 px-4 text-center min-w-[90px]">Porsi (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {/* 1. PENERIMAAN / PENDAPATAN */}
                      <tr className="bg-slate-100/70 font-sans font-bold text-slate-900 text-xs">
                        <td colSpan={5} className="py-3 px-6 uppercase tracking-wider text-emerald-800">
                          1. PENERIMAAN / PENDAPATAN
                        </td>
                      </tr>

                      {getRestrictionRevenues().length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 px-8 text-center text-slate-400 italic font-sans">
                            Tidak ada penerimaan tercatat dalam periode ini
                          </td>
                        </tr>
                      ) : (
                        getRestrictionRevenues().map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-8 font-sans text-slate-700">
                              <span className="font-semibold text-slate-900 mr-2">{item.code}</span>
                              <span>{item.name}</span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-800 font-semibold">
                              {item.unrestricted > 0 ? formatCurrency(item.unrestricted) : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-800 font-semibold">
                              {item.restricted > 0 ? formatCurrency(item.restricted) : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900 bg-slate-50/50">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="py-2.5 px-4 text-center font-sans font-medium text-slate-500">
                              {item.percentage}%
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Subtotal Penerimaan */}
                      <tr className="font-sans font-bold bg-slate-100 text-slate-900 border-t border-b text-xs">
                        <td className="py-3 px-6 uppercase text-emerald-800">TOTAL PENERIMAAN</td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-mono">
                          {formatCurrency(data.revenues.total_unrestricted)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-mono">
                          {formatCurrency(data.revenues.total_restricted)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-800 font-mono bg-slate-200/50">
                          {formatCurrency(data.revenues.total_revenue)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">100.00%</td>
                      </tr>

                      {/* 2. BEBAN / PENGELUARAN */}
                      <tr className="bg-slate-100/70 font-sans font-bold text-slate-900 text-xs">
                        <td colSpan={5} className="py-3 px-6 uppercase tracking-wider text-rose-800">
                          2. BEBAN / PENGELUARAN
                        </td>
                      </tr>

                      {/* Beban Program */}
                      <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                        <td colSpan={5} className="py-2 px-8 uppercase">A. Beban Program (Penyaluran Manfaat)</td>
                      </tr>
                      {data.expenses.program.map((item) => (
                        <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-10 font-sans text-slate-700">
                            <span className="font-semibold text-slate-900 mr-2">{item.code}</span>
                            <span>{item.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-rose-700 font-semibold">{formatCurrency(item.amount)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-400 font-sans">-</td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-700 bg-slate-50/50">{formatCurrency(item.amount)}</td>
                          <td className="py-2.5 px-4 text-center font-sans text-slate-500">
                            {data.expenses.total_expense > 0 ? `${((item.amount / data.expenses.total_expense) * 100).toFixed(2)}%` : '0.00%'}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-sans font-semibold bg-slate-50/80 text-slate-800 border-t border-b text-[11px]">
                        <td className="py-2.5 px-8">Subtotal Beban Program</td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-700">{formatCurrency(data.expenses.total_program)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400 font-sans">-</td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-800 bg-slate-100/50">{formatCurrency(data.expenses.total_program)}</td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {data.expenses.total_expense > 0 ? `${((data.expenses.total_program / data.expenses.total_expense) * 100).toFixed(2)}%` : '0.00%'}
                        </td>
                      </tr>

                      {/* Beban Manajemen */}
                      <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                        <td colSpan={5} className="py-2 px-8 uppercase">B. Beban Manajemen & Operasional Umum</td>
                      </tr>
                      {data.expenses.management.map((item) => (
                        <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-10 font-sans text-slate-700">
                            <span className="font-semibold text-slate-900 mr-2">{item.code}</span>
                            <span>{item.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-rose-700 font-semibold">{formatCurrency(item.amount)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-400 font-sans">-</td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-700 bg-slate-50/50">{formatCurrency(item.amount)}</td>
                          <td className="py-2.5 px-4 text-center font-sans text-slate-500">
                            {data.expenses.total_expense > 0 ? `${((item.amount / data.expenses.total_expense) * 100).toFixed(2)}%` : '0.00%'}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-sans font-semibold bg-slate-50/80 text-slate-800 border-t border-b text-[11px]">
                        <td className="py-2.5 px-8">Subtotal Beban Manajemen & Umum</td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-700">{formatCurrency(data.expenses.total_management)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400 font-sans">-</td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-800 bg-slate-100/50">{formatCurrency(data.expenses.total_management)}</td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {data.expenses.total_expense > 0 ? `${((data.expenses.total_management / data.expenses.total_expense) * 100).toFixed(2)}%` : '0.00%'}
                        </td>
                      </tr>

                      {/* Beban Penggalangan Dana (Fundraising) */}
                      {(data.expenses.fundraising?.length > 0 || data.expenses.total_fundraising > 0) && (
                        <>
                          <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                            <td colSpan={5} className="py-2 px-8 uppercase">C. Beban Penggalangan Dana (Fundraising)</td>
                          </tr>
                          {data.expenses.fundraising.map((item) => (
                            <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-10 font-sans text-slate-700">
                                <span className="font-semibold text-slate-900 mr-2">{item.code}</span>
                                <span>{item.name}</span>
                              </td>
                              <td className="py-2.5 px-4 text-right text-rose-700 font-semibold">{formatCurrency(item.amount)}</td>
                              <td className="py-2.5 px-4 text-right text-slate-400 font-sans">-</td>
                              <td className="py-2.5 px-4 text-right font-bold text-rose-700 bg-slate-50/50">{formatCurrency(item.amount)}</td>
                              <td className="py-2.5 px-4 text-center font-sans text-slate-500">
                                {data.expenses.total_expense > 0 ? `${((item.amount / data.expenses.total_expense) * 100).toFixed(2)}%` : '0.00%'}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-sans font-semibold bg-slate-50/80 text-slate-800 border-t border-b text-[11px]">
                            <td className="py-2.5 px-8">Subtotal Beban Penggalangan Dana</td>
                            <td className="py-2.5 px-4 text-right font-mono text-rose-700">{formatCurrency(data.expenses.total_fundraising)}</td>
                            <td className="py-2.5 px-4 text-right text-slate-400 font-sans">-</td>
                            <td className="py-2.5 px-4 text-right font-mono text-rose-800 bg-slate-100/50">{formatCurrency(data.expenses.total_fundraising)}</td>
                            <td className="py-2.5 px-4 text-center font-mono">
                              {data.expenses.total_expense > 0 ? `${((data.expenses.total_fundraising / data.expenses.total_expense) * 100).toFixed(2)}%` : '0.00%'}
                            </td>
                          </tr>
                        </>
                      )}

                      {/* TOTAL BEBAN */}
                      <tr className="bg-slate-100 text-slate-900 font-sans font-bold text-xs border-t border-b">
                        <td className="py-3 px-6 uppercase text-rose-800">TOTAL BEBAN</td>
                        <td className="py-3 px-4 text-right text-rose-700 font-mono">{formatCurrency(data.expenses.total_expense)}</td>
                        <td className="py-3 px-4 text-right text-slate-400 font-sans">-</td>
                        <td className="py-3 px-4 text-right text-rose-800 font-mono bg-slate-200/50">{formatCurrency(data.expenses.total_expense)}</td>
                        <td className="py-3 px-4 text-center font-mono">100.00%</td>
                      </tr>

                      {/* 3. SURPLUS / DEFISIT BERSIH */}
                      <tr className="bg-slate-900 text-white font-sans font-bold text-sm">
                        <td className="py-4 px-6 uppercase tracking-wider text-emerald-400">
                          SURPLUS / (DEFISIT) BERSIH PERIODE BERJALAN
                        </td>
                        <td className={`py-4 px-4 text-right font-mono ${data.surplus_deficit.unrestricted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(data.surplus_deficit.unrestricted)}
                        </td>
                        <td className={`py-4 px-4 text-right font-mono ${data.surplus_deficit.restricted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(data.surplus_deficit.restricted)}
                        </td>
                        <td className={`py-4 px-4 text-right font-mono bg-slate-800 ${data.surplus_deficit.total_surplus >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {formatCurrency(data.surplus_deficit.total_surplus)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data.surplus_deficit.total_surplus >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                            }`}>
                            {data.surplus_deficit.total_surplus >= 0 ? 'SURPLUS' : 'DEFISIT'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* B. LAPORAN AKTIVITAS 12 BULAN (TAHUNAN) SESUAI ISAK 35 (lathn.md) */}
          {compareMode === 'MONTHLY_ANNUAL' && data.annual_statement && (
            <div className="space-y-6">
              {/* Summary KPI Cards DENGAN WARNA TOMPEL */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 no-print">
                <StatCard
                  icon={ArrowDownLeft}
                  title={`PENERIMAAN TAHUN ${data.annual_statement.year}`}
                  value={formatCurrency(data.annual_statement.revenues?.total_year)}
                  color="emerald"
                  badge="Akumulasi 12 Bulan"
                  badgeType="positive"
                  subtitle="Januari s/d Desember"
                  verticalCenter={true}
                />

                <StatCard
                  icon={ArrowUpRight}
                  title={`TOTAL BEBAN TAHUN ${data.annual_statement.year}`}
                  value={formatCurrency(data.annual_statement.expenses?.total_year)}
                  color="rose"
                  badge="Akumulasi 12 Bulan"
                  badgeType="negative"
                  subtitle="Januari s/d Desember"
                  verticalCenter={true}
                />

                <StatCard
                  icon={TrendingUp}
                  title="TOTAL PENGHASILAN KOMPREHENSIF"
                  value={formatCurrency(data.annual_statement.net_surplus?.total_year)}
                  color={data.annual_statement.net_surplus?.total_year >= 0 ? 'emerald' : 'rose'}
                  badge={data.annual_statement.net_surplus?.total_year >= 0 ? 'SURPLUS' : 'DEFISIT'}
                  badgeType={data.annual_statement.net_surplus?.total_year >= 0 ? 'positive' : 'negative'}
                  subtitle={`Surplus / (Defisit) Tahun ${data.annual_statement.year}`}
                  className="col-span-2 md:col-span-1"
                  verticalCenter={true}
                />
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex items-center justify-between no-print">
                  <div className="flex items-center gap-2">
                    <span>LAPORAN AKTIVITAS 12 BULAN (TAHUNAN) - TAHUN {data.annual_statement.year}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ISAK 35
                    </span>
                  </div>
                  <button
                    onClick={exportAnnualToCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto relative">
                  <table className="w-full text-xs text-left border-collapse">
                    <colgroup>
                      <col style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }} />
                      <col style={{ minWidth: '220px' }} />
                    </colgroup>
                    <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-20 shadow-xs border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 border-r border-slate-200 w-[80px] min-w-[80px] max-w-[80px] sticky left-0 bg-slate-100 z-30">
                          Kode
                        </th>
                        <th className="px-4 py-3 border-r border-slate-200 min-w-[220px] sticky left-[80px] bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          Nama Akun
                        </th>
                        {(data.months || MONTHS).map(m => (
                          <th key={m.id || m.value} className="px-3 py-3 border-r border-slate-200 text-right min-w-[105px]">
                            {m.name || m.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right min-w-[130px] bg-slate-200/70 font-bold text-slate-900">
                          {data.annual_statement.year}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {/* 1. PENERIMAAN / PENDAPATAN */}
                      <tr className="bg-slate-100/80 font-sans font-bold text-slate-900 text-xs border-t border-b border-slate-200">
                        <td className="px-3 py-2.5 border-r border-slate-200 w-[80px] min-w-[80px] max-w-[80px] sticky left-0 bg-slate-100 z-10">
                          4000
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-200 min-w-[220px] sticky left-[80px] bg-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-wider text-emerald-800">
                          PENERIMAAN
                        </td>
                        {(data.months || MONTHS).map(m => (
                          <td key={`rev-head-${m.id || m.value}`} className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-400">
                            -
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right bg-slate-100/70 text-slate-400">
                          -
                        </td>
                      </tr>

                      {/* Revenue Account Rows */}
                      {data.annual_statement.revenues?.accounts?.map(acc => {
                        const isHeader = !acc.is_postable;
                        return (
                          <tr
                            key={acc.code}
                            className={`hover:bg-teal-50/30 transition-colors ${isHeader ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'
                              }`}
                          >
                            <td className={`px-3 py-2 border-r border-slate-200 w-[80px] min-w-[80px] max-w-[80px] sticky left-0 z-10 ${isHeader ? 'bg-slate-50 font-bold' : 'bg-white font-semibold text-slate-800'
                              }`}>
                              {acc.code}
                            </td>
                            <td className={`px-4 py-2 border-r border-slate-200 font-sans min-w-[220px] sticky left-[80px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap ${isHeader ? 'bg-slate-50 font-bold uppercase' : 'bg-white font-medium pl-6 text-slate-800'
                              }`}>
                              {acc.name}
                            </td>
                            {(data.months || MONTHS).map(m => {
                              const val = acc.months?.[m.id || m.value] || 0;
                              return (
                                <td key={`rev-val-${acc.code}-${m.id || m.value}`} className={`px-3 py-2 text-right border-r border-slate-100 ${val > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'
                                  }`}>
                                  {isHeader ? ' - ' : formatNumber(val)}
                                </td>
                              );
                            })}
                            <td className={`px-4 py-2 text-right bg-slate-50 font-bold ${acc.total_year > 0 ? 'text-emerald-800' : 'text-slate-400'
                              }`}>
                              {isHeader ? ' - ' : formatNumber(acc.total_year)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Total Penerimaan Row */}
                      <tr className="bg-emerald-50/80 font-bold text-emerald-950 border-t-2 border-b-2 border-emerald-200">
                        <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-xs font-sans border-r border-emerald-200 sticky left-0 bg-emerald-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                          Total Penerimaan
                        </td>
                        {(data.months || MONTHS).map(m => {
                          const tot = data.annual_statement.revenues?.monthly_totals?.[m.id || m.value] || 0;
                          return (
                            <td key={`rev-tot-${m.id || m.value}`} className="px-3 py-3 text-right border-r border-emerald-200 font-bold text-emerald-900">
                              {formatNumber(tot)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right bg-emerald-100/90 font-bold text-emerald-950 text-xs">
                          {formatNumber(data.annual_statement.revenues?.total_year)}
                        </td>
                      </tr>

                      {/* 2. BEBAN */}
                      <tr className="bg-slate-100/80 font-sans font-bold text-slate-900 text-xs border-t border-b border-slate-200">
                        <td className="px-3 py-2.5 border-r border-slate-200 w-[80px] min-w-[80px] max-w-[80px] sticky left-0 bg-slate-100 z-10">
                          5000
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-200 min-w-[220px] sticky left-[80px] bg-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-wider text-rose-800">
                          BEBAN
                        </td>
                        {(data.months || MONTHS).map(m => (
                          <td key={`exp-head-${m.id || m.value}`} className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-400">
                            -
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right bg-slate-100/70 text-slate-400">
                          -
                        </td>
                      </tr>

                      {/* Expense Account Rows */}
                      {data.annual_statement.expenses?.accounts?.map(acc => {
                        const isHeader = !acc.is_postable;
                        return (
                          <tr
                            key={acc.code}
                            className={`hover:bg-rose-50/20 transition-colors ${isHeader ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'
                              }`}
                          >
                            <td className={`px-3 py-2 border-r border-slate-200 w-[80px] min-w-[80px] max-w-[80px] sticky left-0 z-10 ${isHeader ? 'bg-slate-50 font-bold' : 'bg-white font-semibold text-slate-800'
                              }`}>
                              {acc.code}
                            </td>
                            <td className={`px-4 py-2 border-r border-slate-200 font-sans min-w-[220px] sticky left-[80px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap ${isHeader ? 'bg-slate-50 font-bold uppercase' : 'bg-white font-medium pl-6 text-slate-800'
                              }`}>
                              {acc.name}
                            </td>
                            {(data.months || MONTHS).map(m => {
                              const val = acc.months?.[m.id || m.value] || 0;
                              return (
                                <td key={`exp-val-${acc.code}-${m.id || m.value}`} className={`px-3 py-2 text-right border-r border-slate-100 ${val > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'
                                  }`}>
                                  {isHeader ? ' - ' : formatNumber(val)}
                                </td>
                              );
                            })}
                            <td className={`px-4 py-2 text-right bg-slate-50 font-bold ${acc.total_year > 0 ? 'text-rose-800' : 'text-slate-400'
                              }`}>
                              {isHeader ? ' - ' : formatNumber(acc.total_year)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Total Biaya Row */}
                      <tr className="bg-rose-50/80 font-bold text-rose-950 border-t-2 border-b-2 border-rose-200">
                        <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-xs font-sans border-r border-rose-200 sticky left-0 bg-rose-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                          Total Biaya
                        </td>
                        {(data.months || MONTHS).map(m => {
                          const tot = data.annual_statement.expenses?.monthly_totals?.[m.id || m.value] || 0;
                          return (
                            <td key={`exp-tot-${m.id || m.value}`} className="px-3 py-3 text-right border-r border-rose-200 font-bold text-rose-900">
                              {formatNumber(tot)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right bg-rose-100/90 font-bold text-rose-950 text-xs">
                          {formatNumber(data.annual_statement.expenses?.total_year)}
                        </td>
                      </tr>

                      {/* Total Penghasilan Komprehensif Row */}
                      <tr className="bg-slate-900 font-bold text-white border-t-2 border-slate-900 sticky bottom-0 z-20 shadow-md">
                        <td colSpan={2} className="px-4 py-3.5 text-right uppercase tracking-wider text-xs font-sans border-r border-slate-800 sticky left-0 bg-slate-900 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                          Total Penghasilan Komprehensif
                        </td>
                        {(data.months || MONTHS).map(m => {
                          const tot = data.annual_statement.net_surplus?.monthly_totals?.[m.id || m.value] || 0;
                          const isPositive = tot >= 0;
                          return (
                            <td key={`net-tot-${m.id || m.value}`} className={`px-3 py-3.5 text-right border-r border-slate-800 font-bold ${tot === 0 ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                              {formatNumber(tot)}
                            </td>
                          );
                        })}
                        <td className={`px-4 py-3.5 text-right bg-slate-950 font-bold text-xs ${data.annual_statement.net_surplus?.total_year >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                          {formatNumber(data.annual_statement.net_surplus?.total_year)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* C. VIEW: TANPA PEMBATASAN ONLY */}
          {compareMode === 'WITHOUT_RESTRICTION' && data.revenues && (
            <div className="space-y-6">
              {/* Summary Cards DENGAN WARNA TOMPEL */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 no-print">
                <StatCard
                  icon={ArrowDownLeft}
                  title="PENERIMAAN TANPA PEMBATASAN"
                  value={formatCurrency(data.revenues.total_unrestricted)}
                  color="emerald"
                  badge="Unrestricted"
                  badgeType="positive"
                  subtitle="Penerimaan umum tidak terikat"
                  verticalCenter={true}
                />

                <StatCard
                  icon={ArrowUpRight}
                  title="TOTAL BEBAN"
                  value={formatCurrency(data.expenses.total_expense)}
                  color="rose"
                  badge="Beban"
                  badgeType="negative"
                  subtitle={`Program: ${formatCurrency(data.expenses.total_program)}`}
                  verticalCenter={true}
                />

                <StatCard
                  icon={TrendingUp}
                  title="SURPLUS / (DEFISIT)"
                  value={formatCurrency(data.surplus_deficit.unrestricted)}
                  color={data.surplus_deficit.unrestricted >= 0 ? 'emerald' : 'rose'}
                  badge={data.surplus_deficit.unrestricted >= 0 ? 'SURPLUS' : 'DEFISIT'}
                  badgeType={data.surplus_deficit.unrestricted >= 0 ? 'positive' : 'negative'}
                  subtitle="Aset neto tanpa pembatasan"
                  className="col-span-2 md:col-span-1"
                  verticalCenter={true}
                />
              </div>

              {/* Details Table - Formal HTML Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none">
                <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex items-center justify-between print:bg-slate-900 print:text-white">
                  <span>LAPORAN AKTIVITAS - TANPA PEMBATASAN DARI DONOR (UNRESTRICTED)</span>
                  <span className="text-xs text-emerald-400 font-normal">
                    Periode: {data.current_period ? data.current_period.label : (data.filter?.start_date + ' s/d ' + data.filter?.end_date)}
                  </span>
                </div>

                <div className="p-6 print:p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-2.5 px-4">Uraian / Nama Akun</th>
                        <th className="py-2.5 px-4 w-32 font-mono">Kode Akun</th>
                        <th className="py-2.5 px-4 text-right w-48">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {/* 1. PENERIMAAN TANPA PEMBATASAN */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          1. PENERIMAAN TANPA PEMBATASAN
                        </td>
                      </tr>
                      {data.revenues.unrestricted.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-8 text-slate-400 italic">Tidak ada penerimaan tanpa pembatasan</td>
                        </tr>
                      ) : (
                        data.revenues.unrestricted.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6 uppercase">Jumlah Penerimaan Tanpa Pembatasan</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(data.revenues.total_unrestricted)}
                        </td>
                      </tr>

                      {/* 2. BEBAN / PENGELUARAN */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          2. BEBAN / PENGELUARAN
                        </td>
                      </tr>

                      {/* A. Beban Program */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          A. Beban Program
                        </td>
                      </tr>
                      {data.expenses.program.map((item) => (
                        <tr key={item.account_id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                          <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                          <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6">Jumlah Beban Program</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.expenses.total_program)}
                        </td>
                      </tr>

                      {/* B. Beban Manajemen & Umum */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          B. Beban Manajemen &amp; Umum
                        </td>
                      </tr>
                      {data.expenses.management.map((item) => (
                        <tr key={item.account_id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                          <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                          <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6">Jumlah Beban Manajemen &amp; Umum</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.expenses.total_management)}
                        </td>
                      </tr>

                      {/* TOTAL BEBAN */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300">
                        <td colSpan={2} className="py-2 px-4 uppercase text-slate-900">Jumlah Beban Operasional</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(data.expenses.total_expense)}
                        </td>
                      </tr>

                      {/* SURPLUS / DEFISIT BERSIH */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b-4 border-double border-slate-900">
                        <td colSpan={2} className="py-3 px-4 uppercase tracking-tight text-xs">
                          SURPLUS / (DEFISIT) BERSIH TANPA PEMBATASAN
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold text-xs ${data.surplus_deficit.unrestricted >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                          {formatCurrency(data.surplus_deficit.unrestricted)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* C. VIEW: DENGAN PEMBATASAN ONLY */}
          {compareMode === 'WITH_RESTRICTION' && data.revenues && (
            <div className="space-y-6">
              {/* Summary Cards DENGAN WARNA TOMPEL */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 no-print">
                <StatCard
                  icon={ArrowDownLeft}
                  title="PENERIMAAN DENGAN PEMBATASAN"
                  value={formatCurrency(data.revenues.total_restricted)}
                  color="emerald"
                  badge="Restricted"
                  badgeType="positive"
                  subtitle="Terikat peruntukan program/donor"
                  verticalCenter={true}
                />

                <StatCard
                  icon={ArrowUpRight}
                  title="BEBAN TERIKAT LANGSUNG"
                  value="Rp 0"
                  color="amber"
                  badge="ISAK 35"
                  badgeType="neutral"
                  subtitle="Dicatat pada pos tanpa pembatasan"
                  verticalCenter={true}
                />

                <StatCard
                  icon={TrendingUp}
                  title="KENAIKAN ASET NETO TERIKAT"
                  value={formatCurrency(data.surplus_deficit.restricted)}
                  color="teal"
                  badge="KENAIKAN"
                  badgeType="positive"
                  subtitle="Akumulasi periode berjalan"
                  className="col-span-2 md:col-span-1"
                  verticalCenter={true}
                />
              </div>

              {/* Details Table - Formal HTML Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none">
                <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex items-center justify-between print:bg-slate-900 print:text-white">
                  <span>LAPORAN AKTIVITAS - DENGAN PEMBATASAN DARI DONOR (RESTRICTED)</span>
                  <span className="text-xs text-emerald-400 font-normal">
                    Periode: {data.current_period ? data.current_period.label : (data.filter?.start_date + ' s/d ' + data.filter?.end_date)}
                  </span>
                </div>

                <div className="p-6 print:p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-2.5 px-4">Uraian / Nama Akun</th>
                        <th className="py-2.5 px-4 w-32 font-mono">Kode Akun</th>
                        <th className="py-2.5 px-4 text-right w-48">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          1. PENERIMAAN DENGAN PEMBATASAN DARI DONOR (TERIKAT PROGRAM)
                        </td>
                      </tr>
                      {data.revenues.restricted.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-8 text-slate-400 italic">Tidak ada penerimaan dengan pembatasan tercatat</td>
                        </tr>
                      ) : (
                        data.revenues.restricted.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6 uppercase">Jumlah Penerimaan Dengan Pembatasan</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(data.revenues.total_restricted)}
                        </td>
                      </tr>

                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          2. BEBAN TERIKAT LANGSUNG
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="py-3 px-4 pl-8 text-slate-500 italic">
                          Sesuai pedoman ISAK 35, seluruh pengeluaran operasional dan program dilaporkan dalam kelompok aset neto tanpa pembatasan (setelah reklasifikasi / pelepasan batasan).
                        </td>
                      </tr>

                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b-4 border-double border-slate-900">
                        <td colSpan={2} className="py-3 px-4 uppercase tracking-tight text-xs">
                          KENAIKAN ASET NETO DENGAN PEMBATASAN PERIODE BERJALAN
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-xs text-emerald-700">
                          {formatCurrency(data.surplus_deficit.restricted)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* D. SINGLE PERIOD VIEW (STANDARD ISAK 35) */}
          {compareMode === 'NONE' && data.revenues && (
            <div className="space-y-6">
              {/* Summary Cards DENGAN WARNA TOMPEL */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 no-print">
                <StatCard
                  icon={ArrowDownLeft}
                  title="TOTAL PENERIMAAN"
                  value={formatCurrency(data.revenues.total_revenue)}
                  color="emerald"
                  badge="Penerimaan"
                  badgeType="positive"
                  subtitle={`Tanpa Batasan: ${formatCurrency(data.revenues.total_unrestricted)}`}
                  verticalCenter={true}
                />

                <StatCard
                  icon={ArrowUpRight}
                  title="TOTAL BEBAN OPERASIONAL"
                  value={formatCurrency(data.expenses.total_expense)}
                  color="rose"
                  badge="Beban"
                  badgeType="negative"
                  subtitle={`Program: ${formatCurrency(data.expenses.total_program)}`}
                  verticalCenter={true}
                />

                <StatCard
                  icon={TrendingUp}
                  title="SURPLUS / (DEFISIT) BERSIH"
                  value={formatCurrency(data.surplus_deficit.total_surplus)}
                  color={data.surplus_deficit.total_surplus >= 0 ? 'emerald' : 'rose'}
                  badge={data.surplus_deficit.total_surplus >= 0 ? 'SURPLUS' : 'DEFISIT'}
                  badgeType={data.surplus_deficit.total_surplus >= 0 ? 'positive' : 'negative'}
                  subtitle="Akumulasi kenaikan (penurunan) aset neto"
                  className="col-span-2 md:col-span-1"
                  verticalCenter={true}
                />
              </div>

              {/* Details Table - Formal HTML Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none">
                <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex justify-between items-center print:bg-slate-900 print:text-white">
                  <span>RINCIAN PENERIMAAN DAN BEBAN (ISAK 35)</span>
                  <span className="text-xs text-slate-300 font-normal">
                    {data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`}
                  </span>
                </div>

                <div className="p-6 print:p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="py-2.5 px-4">Uraian / Nama Akun</th>
                        <th className="py-2.5 px-4 w-32 font-mono">Kode Akun</th>
                        <th className="py-2.5 px-4 text-right w-48">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {/* 1. PENERIMAAN / PENDAPATAN */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          1. PENERIMAAN / PENDAPATAN
                        </td>
                      </tr>

                      {/* A. Tanpa Pembatasan */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          A. Tanpa Pembatasan Dari Donor (Unrestricted)
                        </td>
                      </tr>
                      {data.revenues.unrestricted.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-8 text-slate-400 italic">Tidak ada penerimaan tanpa pembatasan</td>
                        </tr>
                      ) : (
                        data.revenues.unrestricted.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6">Subtotal Penerimaan Tanpa Pembatasan</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.revenues.total_unrestricted)}
                        </td>
                      </tr>

                      {/* B. Dengan Pembatasan */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          B. Dengan Pembatasan Dari Donor (Restricted)
                        </td>
                      </tr>
                      {data.revenues.restricted.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-8 text-slate-400 italic">Tidak ada penerimaan dengan pembatasan</td>
                        </tr>
                      ) : (
                        data.revenues.restricted.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6">Subtotal Penerimaan Dengan Pembatasan</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.revenues.total_restricted)}
                        </td>
                      </tr>

                      {/* TOTAL PENERIMAAN */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={2} className="py-2.5 px-4 uppercase text-slate-900">
                          JUMLAH PENERIMAAN
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(data.revenues.total_revenue)}
                        </td>
                      </tr>

                      {/* 2. BEBAN / PENGELUARAN */}
                      <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-emerald-900">
                          2. BEBAN / PENGELUARAN
                        </td>
                      </tr>

                      {/* A. Beban Program */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          A. Beban Program
                        </td>
                      </tr>
                      {data.expenses.program.map((item) => (
                        <tr key={item.account_id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                          <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                          <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6">Subtotal Beban Program</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.expenses.total_program)}
                        </td>
                      </tr>

                      {/* B. Beban Manajemen & Umum */}
                      <tr className="font-semibold text-slate-800 bg-slate-50/50">
                        <td colSpan={3} className="py-2 px-4 pl-6 text-slate-700">
                          B. Beban Manajemen &amp; Operasional Umum
                        </td>
                      </tr>
                      {data.expenses.management.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-2 px-4 pl-8 text-slate-400 italic">Tidak ada beban manajemen & umum</td>
                        </tr>
                      ) : (
                        data.expenses.management.map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-4 pl-8 text-slate-700">{item.name}</td>
                            <td className="py-1.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-1.5 px-4 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="font-semibold text-slate-900 bg-slate-50/80 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-4 pl-6">Subtotal Beban Manajemen &amp; Umum</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.expenses.total_management)}
                        </td>
                      </tr>

                      {/* TOTAL BEBAN */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td colSpan={2} className="py-2.5 px-4 uppercase text-slate-900">
                          JUMLAH BEBAN OPERASIONAL
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(data.expenses.total_expense)}
                        </td>
                      </tr>

                      {/* SURPLUS / (DEFISIT) BERSIH */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b-4 border-double border-slate-900">
                        <td colSpan={2} className="py-3 px-4 uppercase tracking-tight text-xs">
                          SURPLUS / (DEFISIT) BERSIH PERIODE BERJALAN
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold text-xs ${data.surplus_deficit.total_surplus >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                          {formatCurrency(data.surplus_deficit.total_surplus)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. COMPARATIVE MULTI-PERIOD TABLE VIEW */}
          {data.is_comparative && data.comparative_data && compareMode !== 'RESTRICTION' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex items-center justify-between">
                <span>TABEL PERBANDINGAN AKTIVITAS & PENGHASILAN KOMPREHENSIF (KOMPARATIF)</span>
                <span className="text-xs text-emerald-400 font-normal">
                  {data.current_period.label} vs {data.comparison_period.label}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3.5 px-6">Komponen Aktivitas (ISAK 35)</th>
                      <th className="py-3.5 px-4 text-right">{data.current_period.label}</th>
                      <th className="py-3.5 px-4 text-right text-slate-400">{data.comparison_period.label}</th>
                      <th className="py-3.5 px-4 text-right">Perubahan (Rp)</th>
                      <th className="py-3.5 px-4 text-center">Pertumbuhan (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {/* 1. PENERIMAAN */}
                    <tr className="bg-slate-100/70 font-sans font-bold text-slate-900 text-xs">
                      <td colSpan={5} className="py-3 px-6 uppercase tracking-wider text-emerald-800">
                        1. PENERIMAAN / PENDAPATAN
                      </td>
                    </tr>

                    {/* Tanpa Pembatasan */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">A. Tanpa Pembatasan Dari Donor (Unrestricted)</td>
                    </tr>
                    {data.comparative_data.revenues.unrestricted.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-10 font-sans text-slate-700">{item.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.current_amount)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(item.comparison_amount)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${item.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(item.variance)}
                        </td>
                        <td className="py-2.5 px-4 text-center">{renderVarianceBadge(item.variance, item.percentage)}</td>
                      </tr>
                    ))}
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Subtotal Penerimaan Tanpa Pembatasan</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-mono">{formatCurrency(data.comparative_data.revenues.total_unrestricted.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.revenues.total_unrestricted.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.revenues.total_unrestricted.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.revenues.total_unrestricted.variance, data.comparative_data.revenues.total_unrestricted.percentage)}</td>
                    </tr>

                    {/* Dengan Pembatasan */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">B. Dengan Pembatasan Dari Donor (Restricted)</td>
                    </tr>
                    {data.comparative_data.revenues.restricted.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-10 font-sans text-slate-700">{item.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.current_amount)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(item.comparison_amount)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${item.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(item.variance)}
                        </td>
                        <td className="py-2.5 px-4 text-center">{renderVarianceBadge(item.variance, item.percentage)}</td>
                      </tr>
                    ))}
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Subtotal Penerimaan Dengan Pembatasan</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-mono">{formatCurrency(data.comparative_data.revenues.total_restricted.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.revenues.total_restricted.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.revenues.total_restricted.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.revenues.total_restricted.variance, data.comparative_data.revenues.total_restricted.percentage)}</td>
                    </tr>

                    {/* TOTAL PENERIMAAN ROW */}
                    <tr className="bg-slate-800 text-white font-sans font-bold text-xs">
                      <td className="py-3 px-6 uppercase tracking-wider text-emerald-400">TOTAL PENERIMAAN</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-mono">{formatCurrency(data.comparative_data.revenues.total_revenue.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.revenues.total_revenue.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.revenues.total_revenue.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.revenues.total_revenue.variance, data.comparative_data.revenues.total_revenue.percentage)}</td>
                    </tr>

                    {/* 2. BEBAN */}
                    <tr className="bg-slate-100/70 font-sans font-bold text-slate-900 text-xs">
                      <td colSpan={5} className="py-3 px-6 uppercase tracking-wider text-emerald-800">
                        2. BEBAN / PENGELUARAN
                      </td>
                    </tr>

                    {/* Beban Program */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">A. Beban Program</td>
                    </tr>
                    {data.comparative_data.expenses.program.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-10 font-sans text-slate-700">{item.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.current_amount)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(item.comparison_amount)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${item.variance <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(item.variance)}
                        </td>
                        <td className="py-2.5 px-4 text-center">{renderVarianceBadge(item.variance, item.percentage)}</td>
                      </tr>
                    ))}
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Subtotal Beban Program</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.expenses.total_program.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.expenses.total_program.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.expenses.total_program.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.expenses.total_program.variance, data.comparative_data.expenses.total_program.percentage)}</td>
                    </tr>

                    {/* Beban Manajemen */}
                    <tr className="bg-slate-50/50 font-sans font-semibold text-slate-700 text-[11px]">
                      <td colSpan={5} className="py-2 px-8 uppercase">B. Beban Manajemen & Operasional Umum</td>
                    </tr>
                    {data.comparative_data.expenses.management.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-10 font-sans text-slate-700">{item.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.current_amount)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(item.comparison_amount)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${item.variance <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatCurrency(item.variance)}
                        </td>
                        <td className="py-2.5 px-4 text-center">{renderVarianceBadge(item.variance, item.percentage)}</td>
                      </tr>
                    ))}
                    <tr className="font-sans font-bold bg-slate-50 text-slate-900 border-t border-b">
                      <td className="py-3 px-8">Subtotal Beban Manajemen & Umum</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.expenses.total_management.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.expenses.total_management.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.expenses.total_management.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.expenses.total_management.variance, data.comparative_data.expenses.total_management.percentage)}</td>
                    </tr>

                    {/* TOTAL BEBAN ROW */}
                    <tr className="bg-slate-800 text-white font-sans font-bold text-xs">
                      <td className="py-3 px-6 uppercase tracking-wider text-rose-400">TOTAL BEBAN</td>
                      <td className="py-3 px-4 text-right text-rose-400 font-mono">{formatCurrency(data.comparative_data.expenses.total_expense.current)}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.expenses.total_expense.comparison)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.comparative_data.expenses.total_expense.variance)}</td>
                      <td className="py-3 px-4 text-center">{renderVarianceBadge(data.comparative_data.expenses.total_expense.variance, data.comparative_data.expenses.total_expense.percentage)}</td>
                    </tr>

                    {/* 3. SURPLUS / DEFISIT BERSIH */}
                    <tr className="bg-slate-900 text-white font-sans font-bold text-sm">
                      <td className="py-3.5 px-6 uppercase tracking-wider text-emerald-400">SURPLUS / (DEFISIT) BERSIH PERIODE BERJALAN</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-mono">{formatCurrency(data.comparative_data.surplus_deficit.total_surplus.current)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono">{formatCurrency(data.comparative_data.surplus_deficit.total_surplus.comparison)}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{formatCurrency(data.comparative_data.surplus_deficit.total_surplus.variance)}</td>
                      <td className="py-3.5 px-4 text-center">{renderVarianceBadge(data.comparative_data.surplus_deficit.total_surplus.variance, data.comparative_data.surplus_deficit.total_surplus.percentage)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Footer Tanda Tangan Cetak PDF */}
          <PrintReportFooter />
        </div>
      )}
    </div>
  );
};

export default IncomeStatementPage;
