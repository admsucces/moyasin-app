import React, { useState, useEffect } from 'react';
import reportService from '../../services/reportService';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import { downloadPdf } from '../../components/reports/pdf/PdfCommon';
import ManagementReportPdf from '../../components/reports/pdf/ManagementReportPdf';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import {
  BarChart3,
  Calendar,
  RefreshCw,
  Printer,
  PieChart,
  Users,
  Layers,
  Download
} from 'lucide-react';

export const ManagementReportPage = () => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      await downloadPdf(
        <ManagementReportPdf data={data} startDate={startDate} endDate={endDate} />,
        `Laporan_Manajerial_${startDate}_${endDate}.pdf`
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
      const res = await reportService.getManagementSummary(startDate, endDate);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat Laporan Manajerial & Rekapitulasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

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

  const formatPercentage = (amount, total) => {
    if (!total || total === 0) return '0.0%';
    return ((amount / total) * 100).toFixed(1) + '%';
  };

  const exportToCSV = () => {
    if (!data) return;
    let csv = `LAPORAN MANAJERIAL & OPERASIONAL\nPeriode: ${startDate} s/d ${endDate}\n\n`;

    csv += `1. REKAPITULASI PEMBATASAN DANA DONOR\n`;
    csv += `Kategori Pembatasan\tJumlah (Rp)\n`;
    csv += `Tanpa Pembatasan (Unrestricted)\t${data.fund_restriction_breakdown.without_restriction}\n`;
    csv += `Dengan Pembatasan (Restricted)\t${data.fund_restriction_breakdown.with_restriction}\n`;
    csv += `TOTAL PENERIMAAN\t${data.fund_restriction_breakdown.total}\n\n`;

    csv += `2. BEBAN PENGELUARAN PER PROGRAM\n`;
    csv += `No\tKode Program\tNama Program\tJumlah (Rp)\tPersentase\n`;
    data.expense_by_program.items.forEach((item, idx) => {
      csv += `${idx + 1}\t${item.code}\t${item.name}\t${item.amount}\t${formatPercentage(item.amount, data.expense_by_program.total)}\n`;
    });
    csv += `TOTAL BEBAN PROGRAM\t\t\t${data.expense_by_program.total}\t100%\n\n`;

    csv += `3. PENERIMAAN PER DONATUR / SUMBER DANA\n`;
    csv += `No\tKategori\tNama Donatur / Sumber\tJumlah (Rp)\tPersentase\n`;
    data.income_by_donor.items.forEach((item, idx) => {
      csv += `${idx + 1}\t${item.category}\t${item.name}\t${item.amount}\t${formatPercentage(item.amount, data.income_by_donor.total)}\n`;
    });
    csv += `TOTAL PENERIMAAN DONATUR\t\t\t${data.income_by_donor.total}\t100%\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Manajerial_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={BarChart3}
          badge="Laporan Manajerial"
          title="Laporan Manajerial & Operasional"
          subtitle="Analisis Realisasi Beban Program, Kontribusi Donatur, dan Klasifikasi Pembatasan Dana"
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

      {/* Date Filter Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 no-print">
        <span className="text-xs font-bold text-slate-700">Filter Rentang Tanggal:</span>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-slate-700 font-medium focus:outline-none"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-slate-700 font-medium focus:outline-none"
          />
        </div>
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Memuat Laporan Manajerial...</span>
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
            title="LAPORAN MANAJERIAL & OPERASIONAL"
            subtitle="Analisis Realisasi Beban Program, Kontribusi Donatur, dan Pembatasan Dana"
            periodLabel={`${startDate} s/d ${endDate}`}
          />

          {/* 1. FUND RESTRICTION BREAKDOWN */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none print:p-0">
            <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex justify-between items-center print:bg-slate-900 print:text-white">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400 print:hidden" />
                <span>1. REKAPITULASI PEMBATASAN DANA DONOR</span>
              </div>
              <span className="text-emerald-400 font-bold">{formatCurrency(data.fund_restriction_breakdown.total)}</span>
            </div>

            {/* Screen KPI Cards (Hidden on print) */}
            <div className="p-6 no-print">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Tanpa Pembatasan (Unrestricted)</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(data.fund_restriction_breakdown.without_restriction)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatPercentage(data.fund_restriction_breakdown.without_restriction, data.fund_restriction_breakdown.total)} dari total penerimaan
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Dengan Pembatasan (Restricted)</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(data.fund_restriction_breakdown.with_restriction)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatPercentage(data.fund_restriction_breakdown.with_restriction, data.fund_restriction_breakdown.total)} dari total penerimaan
                  </p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <span className="text-xs text-emerald-800 font-medium">Total Penerimaan Donor</span>
                  <p className="text-lg font-bold text-emerald-900 mt-1">{formatCurrency(data.fund_restriction_breakdown.total)}</p>
                  <p className="text-[10px] text-emerald-700/70 mt-1">100.0% Alokasi Terakumulasi</p>
                </div>
              </div>
            </div>

            {/* Formal Accounting Table (Printed & Clean View) */}
            <div className="p-6 pt-0 print:p-4">
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">Klasifikasi Sumber Dana</th>
                    <th className="py-2.5 px-4 text-right">Jumlah Penerimaan</th>
                    <th className="py-2.5 px-4 text-right">Porsi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800 font-medium">Dana Tanpa Pembatasan (Unrestricted)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(data.fund_restriction_breakdown.without_restriction)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatPercentage(data.fund_restriction_breakdown.without_restriction, data.fund_restriction_breakdown.total)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800 font-medium">Dana Dengan Pembatasan (Restricted)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(data.fund_restriction_breakdown.with_restriction)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatPercentage(data.fund_restriction_breakdown.with_restriction, data.fund_restriction_breakdown.total)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-900">
                    <td className="py-2.5 px-4 text-slate-900 uppercase">Total Penerimaan Dana</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                      {formatCurrency(data.fund_restriction_breakdown.total)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                      100.0%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2 & 3. DUAL TABLE: EXPENSE BY PROGRAM & INCOME BY DONOR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-8">

            {/* EXPENSE BY PROGRAM */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none">
              <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400 print:hidden" />
                  <span>2. REALISASI BEBAN PER PROGRAM</span>
                </div>
                <span className="text-emerald-400 font-bold">{formatCurrency(data.expense_by_program.total)}</span>
              </div>

              <div className="p-6 print:p-4">
                {data.expense_by_program.items.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">Belum ada transaksi beban per program pada periode ini</p>
                ) : (
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2 px-3 w-10 text-center">No</th>
                        <th className="py-2 px-3">Program Kerja</th>
                        <th className="py-2 px-3 text-right">Realisasi (Rp)</th>
                        <th className="py-2 px-3 text-right w-16">Porsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.expense_by_program.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800 block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Kode: {item.code}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {formatPercentage(item.amount, data.expense_by_program.total)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-900">
                        <td colSpan={2} className="py-2.5 px-3 uppercase text-slate-900">Total Beban Program</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(data.expense_by_program.total)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* INCOME BY DONOR */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none">
              <div className="px-6 py-4 bg-slate-900 text-white font-semibold text-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400 print:hidden" />
                  <span>3. KONTRIBUSI PENERIMAAN PER DONATUR</span>
                </div>
                <span className="text-emerald-400 font-bold">{formatCurrency(data.income_by_donor.total)}</span>
              </div>

              <div className="p-6 print:p-4">
                {data.income_by_donor.items.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">Belum ada transaksi penerimaan donatur pada periode ini</p>
                ) : (
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2 px-3 w-10 text-center">No</th>
                        <th className="py-2 px-3">Nama Donatur / Sumber</th>
                        <th className="py-2 px-3 text-right">Kontribusi (Rp)</th>
                        <th className="py-2 px-3 text-right w-16">Porsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.income_by_donor.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800 block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">{item.category}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {formatPercentage(item.amount, data.income_by_donor.total)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-900">
                        <td colSpan={2} className="py-2.5 px-3 uppercase text-slate-900">Total Kontribusi Donatur</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(data.income_by_donor.total)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <PrintReportFooter />
        </div>
      )}
    </div>
  );
};

export default ManagementReportPage;
