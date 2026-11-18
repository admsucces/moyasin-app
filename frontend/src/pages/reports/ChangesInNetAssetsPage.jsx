import React, { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import { downloadPdf } from '../../components/reports/pdf/PdfCommon';
import ChangesInNetAssetsPdf from '../../components/reports/pdf/ChangesInNetAssetsPdf';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import {
  Layers,
  RefreshCw,
  Printer,
  Download,
  Filter,
  TrendingUp,
  TrendingDown
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

export const ChangesInNetAssetsPage = () => {
  const currentDate = new Date();
  const [periodType, setPeriodType] = useState('MONTH'); // 'MONTH' | 'YEAR' | 'CUSTOM_DATE'
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Custom date
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
        ? `Perubahan_Aset_Neto_Komparatif_${label}.pdf`
        : `Perubahan_Aset_Neto_${label}.pdf`;
      await downloadPdf(<ChangesInNetAssetsPdf data={data} compareMode={compareMode} />, filename);
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

      const res = await reportService.getChangesInNetAssets(params);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Gagal memuat Laporan Perubahan Aset Neto.');
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat Laporan Perubahan Aset Neto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [periodType, selectedMonth, selectedYear, startDate, endDate, compareMode, compareMonth, compareYear]);

  // Format ISAK 35 (Negatives in parenthesis, zero as dash -, positive as dot-separated)
  const formatISAKAmount = (val) => {
    if (val === null || val === undefined || Math.abs(val) < 0.005) {
      return ' - ';
    }
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absVal);

    if (val < 0) {
      return `(${formatted})`;
    }
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
    const isZero = Math.abs(variance) < 0.01;

    if (isZero) {
      return <span className="text-slate-400 font-mono text-xs">0.00%</span>;
    }

    return (
      <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{formatPercentage(percentage)}</span>
      </div>
    );
  };

  const exportToCSV = () => {
    if (!data) return;
    const unres = data.unrestricted || {
      beginning: data.beginning_net_assets?.unrestricted || 0,
      prior_period: 0,
      current_period: data.current_period_changes?.unrestricted_surplus || 0,
      released: 0,
      ending: data.ending_net_assets?.unrestricted || 0,
    };
    const res = data.restricted || {
      beginning: data.beginning_net_assets?.restricted || 0,
      prior_period: 0,
      current_period: data.current_period_changes?.restricted_surplus || 0,
      released: 0,
      ending: data.ending_net_assets?.restricted || 0,
    };

    const label = data.current_period?.label || `${data.filter?.start_date} - ${data.filter?.end_date}`;
    let csv = `LAPORAN PERUBAHAN ASET NETO\nPeriode: ${label}\n\n`;

    csv += `ASET NETO TANPA PEMBATASAN\t\n`;
    csv += `Saldo Awal\t${formatISAKAmount(unres.beginning)}\n`;
    csv += `Kenaikan (Penurunan) Periode Lalu\t${formatISAKAmount(unres.prior_period)}\n`;
    csv += `Kenaikan (Penurunan) Periode Berjalan\t${formatISAKAmount(unres.current_period)}\n`;
    csv += `Aset Neto yang Dibebaskan dari Pembatasan\t${formatISAKAmount(unres.released)}\n`;
    csv += `Saldo Akhir\t${formatISAKAmount(unres.ending)}\n\n`;

    csv += `ASET NETO DENGAN PEMBATASAN\t\n`;
    csv += `Saldo Awal\t${formatISAKAmount(res.beginning)}\n`;
    csv += `Kenaikan (Penurunan) Periode Lalu\t${formatISAKAmount(res.prior_period)}\n`;
    csv += `Kenaikan (Penurunan) Periode Berjalan\t${formatISAKAmount(res.current_period)}\n`;
    csv += `Aset Neto yang Dibebaskan dari Pembatasan\t${formatISAKAmount(res.released)}\n`;
    csv += `Saldo Akhir\t${formatISAKAmount(res.ending)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Perubahan_Aset_Neto_${label.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const years = Array.from({ length: 11 }, (_, i) => currentDate.getFullYear() - 5 + i);

  // Data helpers
  const unrestrictedData = data?.unrestricted || {
    beginning: data?.beginning_net_assets?.unrestricted || 0,
    prior_period: 0,
    current_period: data?.current_period_changes?.unrestricted_surplus || 0,
    released: 0,
    ending: data?.ending_net_assets?.unrestricted || 0,
  };

  const restrictedData = data?.restricted || {
    beginning: data?.beginning_net_assets?.restricted || 0,
    prior_period: 0,
    current_period: data?.current_period_changes?.restricted_surplus || 0,
    released: 0,
    ending: data?.ending_net_assets?.restricted || 0,
  };

  const compData = data?.comparative_data;

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={Layers}
          badge="Laporan Keuangan"
          title="Laporan Perubahan Aset Neto"
          subtitle="Rekonsiliasi Aset Neto Tanpa & Dengan Pembatasan Standar ISAK 35"
          actions={
            <>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={fetchReport}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
                <span>Perbarui</span>
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="MONTH">Bulanan</option>
              <option value="YEAR">Tahunan</option>
              <option value="CUSTOM_DATE">Kustom Rentang Tanggal</option>
            </select>
          </div>

          {/* Pemilihan Bulan & Tahun */}
          {periodType === 'MONTH' && (
            <>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700"
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
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </>
          )}

          {periodType === 'YEAR' && (
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Tahun Buku</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                min="2000"
                max="2099"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}

          {periodType === 'CUSTOM_DATE' && (
            <>
              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700"
                />
              </div>
              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700"
                />
              </div>
            </>
          )}

          {/* Mode Pembanding */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Perbandingan</label>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="NONE">Tanpa Perbandingan</option>
              <option value="PRIOR_MONTH">Bulan Sebelumnya</option>
              <option value="PRIOR_YEAR">Tahun Sebelumnya</option>
              <option value="CUSTOM">Pilih Khusus...</option>
            </select>
          </div>

          {compareMode === 'CUSTOM' && (
            <div className="md:col-span-3 flex items-end gap-2">
              <select
                value={compareMonth}
                onChange={(e) => setCompareMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-slate-700"
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
                className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Memuat Laporan Perubahan Aset Neto...</span>
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
            title="LAPORAN PERUBAHAN ASET NETO"
            subtitle="Rekonsiliasi Aset Neto Tanpa & Dengan Pembatasan (ISAK 35)"
            periodLabel={data.is_comparative
              ? `${data.current_period?.label || ''} vs ${data.comparison_period?.label || ''}`
              : (data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`)}
          />

          {/* MAIN STATEMENT CONTAINER */}
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xs print:p-0 print:border-none print:shadow-none">
            <div className="max-w-4xl mx-auto space-y-10 print:max-w-full print:space-y-8">

              {/* JIKA MODE PERBANDINGAN */}
              {data.is_comparative ? (
                <>
                  {/* 1. ASET NETO TANPA PEMBATASAN KOMPARATIF */}
                  <div>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-t-2 border-b border-black font-bold text-black text-sm">
                          <th className="py-2.5 text-black font-bold uppercase tracking-tight">
                            ASET NETO TANPA PEMBATASAN
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[120px]">
                            {data.current_period?.label || 'Periode Berjalan'}
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[120px]">
                            {data.comparison_period?.label || 'Periode Pembanding'}
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[110px]">
                            Selisih
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[90px]">
                            Pertumbuhan
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Saldo Awal</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.beginning?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.unrestricted?.beginning?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.beginning?.variance ?? compData?.unrestricted?.beginning?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.unrestricted?.beginning?.variance ?? compData?.unrestricted?.beginning?.diff, compData?.unrestricted?.beginning?.percentage)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Kenaikan (Penurunan) Periode Lalu</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.prior_period?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.unrestricted?.prior_period?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.prior_period?.variance ?? compData?.unrestricted?.prior_period?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.unrestricted?.prior_period?.variance ?? compData?.unrestricted?.prior_period?.diff, compData?.unrestricted?.prior_period?.percentage)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Kenaikan (Penurunan) Periode Berjalan</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.current_period?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.unrestricted?.current_period?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.current_period?.variance ?? compData?.unrestricted?.current_period?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.unrestricted?.current_period?.variance ?? compData?.unrestricted?.current_period?.diff, compData?.unrestricted?.current_period?.percentage)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Aset Neto yang Dibebaskan dari Pembatasan</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.released?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.unrestricted?.released?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.unrestricted?.released?.variance ?? compData?.unrestricted?.released?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.unrestricted?.released?.variance ?? compData?.unrestricted?.released?.diff, compData?.unrestricted?.released?.percentage)}</td>
                        </tr>
                        <tr className="border-t border-black font-bold border-b-4 border-double border-black">
                          <td className="py-3 text-black font-bold text-xs uppercase tracking-tight">Saldo Akhir</td>
                          <td className="py-3 text-right font-mono font-bold text-black">{formatISAKAmount(compData?.unrestricted?.ending?.current)}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-700">{formatISAKAmount(compData?.unrestricted?.ending?.comparison)}</td>
                          <td className="py-3 text-right font-mono font-bold text-black">{formatISAKAmount(compData?.unrestricted?.ending?.variance ?? compData?.unrestricted?.ending?.diff)}</td>
                          <td className="py-3 text-right">{renderVarianceBadge(compData?.unrestricted?.ending?.variance ?? compData?.unrestricted?.ending?.diff, compData?.unrestricted?.ending?.percentage)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 2. ASET NETO DENGAN PEMBATASAN KOMPARATIF */}
                  <div>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-t-2 border-b border-black font-bold text-black text-sm">
                          <th className="py-2.5 text-black font-bold uppercase tracking-tight">
                            ASET NETO DENGAN PEMBATASAN
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[120px]">
                            {data.current_period?.label || 'Periode Berjalan'}
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[120px]">
                            {data.comparison_period?.label || 'Periode Pembanding'}
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[110px]">
                            Selisih
                          </th>
                          <th className="py-2.5 text-right font-bold text-black min-w-[90px]">
                            Pertumbuhan
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Saldo Awal</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.beginning?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.restricted?.beginning?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.beginning?.variance ?? compData?.restricted?.beginning?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.restricted?.beginning?.variance ?? compData?.restricted?.beginning?.diff, compData?.restricted?.beginning?.percentage)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Kenaikan (Penurunan) Periode Lalu</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.prior_period?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.restricted?.prior_period?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.prior_period?.variance ?? compData?.restricted?.prior_period?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.restricted?.prior_period?.variance ?? compData?.restricted?.prior_period?.diff, compData?.restricted?.prior_period?.percentage)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Kenaikan (Penurunan) Periode Berjalan</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.current_period?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.restricted?.current_period?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.current_period?.variance ?? compData?.restricted?.current_period?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.restricted?.current_period?.variance ?? compData?.restricted?.current_period?.diff, compData?.restricted?.current_period?.percentage)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-800">Aset Neto yang Dibebaskan dari Pembatasan</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.released?.current)}</td>
                          <td className="py-2.5 text-right font-mono text-slate-600">{formatISAKAmount(compData?.restricted?.released?.comparison)}</td>
                          <td className="py-2.5 text-right font-mono">{formatISAKAmount(compData?.restricted?.released?.variance ?? compData?.restricted?.released?.diff)}</td>
                          <td className="py-2.5 text-right">{renderVarianceBadge(compData?.restricted?.released?.variance ?? compData?.restricted?.released?.diff, compData?.restricted?.released?.percentage)}</td>
                        </tr>
                        <tr className="border-t border-black font-bold border-b-4 border-double border-black">
                          <td className="py-3 text-black font-bold text-xs uppercase tracking-tight">Saldo Akhir</td>
                          <td className="py-3 text-right font-mono font-bold text-black">{formatISAKAmount(compData?.restricted?.ending?.current)}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-700">{formatISAKAmount(compData?.restricted?.ending?.comparison)}</td>
                          <td className="py-3 text-right font-mono font-bold text-black">{formatISAKAmount(compData?.restricted?.ending?.variance ?? compData?.restricted?.ending?.diff)}</td>
                          <td className="py-3 text-right">{renderVarianceBadge(compData?.restricted?.ending?.variance ?? compData?.restricted?.ending?.diff, compData?.restricted?.ending?.percentage)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                /* VIEW STANDAR SESUAI CONTOH GAMBAR & ASTNETO.MD */
                <>
                  {/* 1. ASET NETO TANPA PEMBATASAN */}
                  <div>
                    <div className="border-t-2 border-b border-black py-1 font-bold text-sm text-black uppercase tracking-tight">
                      ASET NETO TANPA PEMBATASAN
                    </div>
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Saldo Awal</td>
                          <td className="py-2 text-right font-mono text-slate-900 min-w-[140px] text-xs">
                            {formatISAKAmount(unrestrictedData.beginning)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Kenaikan (Penurunan) Periode Lalu</td>
                          <td className="py-2 text-right font-mono text-slate-900 text-xs">
                            {formatISAKAmount(unrestrictedData.prior_period)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Kenaikan (Penurunan) Periode Berjalan</td>
                          <td className="py-2 text-right font-mono text-slate-900 text-xs">
                            {formatISAKAmount(unrestrictedData.current_period)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Aset Neto yang Dibebaskan dari Pembatasan</td>
                          <td className="py-2 text-right font-mono text-slate-900 text-xs">
                            {formatISAKAmount(unrestrictedData.released)}
                          </td>
                        </tr>
                        <tr className="border-t border-black font-bold border-b-4 border-double border-black">
                          <td className="py-2.5 text-black font-bold text-xs uppercase tracking-tight">Saldo Akhir</td>
                          <td className="py-2.5 text-right font-mono font-bold text-black text-xs">
                            {formatISAKAmount(unrestrictedData.ending)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 2. ASET NETO DENGAN PEMBATASAN */}
                  <div>
                    <div className="border-t-2 border-b border-black py-1 font-bold text-sm text-black uppercase tracking-tight">
                      ASET NETO DENGAN PEMBATASAN
                    </div>
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Saldo Awal</td>
                          <td className="py-2 text-right font-mono text-slate-900 min-w-[140px] text-xs">
                            {formatISAKAmount(restrictedData.beginning)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Kenaikan (Penurunan) Periode Lalu</td>
                          <td className="py-2 text-right font-mono text-slate-900 text-xs">
                            {formatISAKAmount(restrictedData.prior_period)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Kenaikan (Penurunan) Periode Berjalan</td>
                          <td className="py-2 text-right font-mono text-slate-900 text-xs">
                            {formatISAKAmount(restrictedData.current_period)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2 text-slate-900">Aset Neto yang Dibebaskan dari Pembatasan</td>
                          <td className="py-2 text-right font-mono text-slate-900 text-xs">
                            {formatISAKAmount(restrictedData.released)}
                          </td>
                        </tr>
                        <tr className="border-t border-black font-bold border-b-4 border-double border-black">
                          <td className="py-2.5 text-black font-bold text-xs uppercase tracking-tight">Saldo Akhir</td>
                          <td className="py-2.5 text-right font-mono font-bold text-black text-xs">
                            {formatISAKAmount(restrictedData.ending)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </div>
          </div>
          <PrintReportFooter />
        </div>
      )}
    </div>
  );
};

export default ChangesInNetAssetsPage;
