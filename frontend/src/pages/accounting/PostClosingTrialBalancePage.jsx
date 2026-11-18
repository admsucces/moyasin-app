import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ledgerService } from '../../services/ledgerService';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import {
  Landmark,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Search,
  Filter,
  ShieldCheck,
  Download,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';

export const PostClosingTrialBalancePage = () => {
  const currentYear = new Date().getFullYear();

  // Filters
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showZeroBalances, setShowZeroBalances] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Data state
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPostClosingTrialBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        year: selectedYear,
      };

      const res = await ledgerService.getPostClosingTrialBalance(params);
      if (res && res.success) {
        setReportData(res.data);
        if (res.data.available_years && res.data.available_years.length > 0) {
          setAvailableYears(res.data.available_years);
        }
      } else {
        setError(res?.message || 'Gagal memuat Neraca Penutup.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem saat memuat Neraca Penutup.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchPostClosingTrialBalance();
  }, [fetchPostClosingTrialBalance]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    if (!reportData?.accounts) return [];

    return reportData.accounts.filter(acc => {
      // Search
      const matchesSearch = !search ||
        acc.code.toLowerCase().includes(search.toLowerCase()) ||
        acc.name.toLowerCase().includes(search.toLowerCase());

      // Type filter
      const matchesType = !typeFilter || acc.type === typeFilter;

      // Zero balances filter (headers always shown if parent match, detail only if has non-zero in at least 1 month)
      if (!showZeroBalances && acc.is_postable) {
        const hasBalance = Object.values(acc.months || {}).some(
          m => (m.debit > 0 || m.credit > 0)
        );
        if (!hasBalance) return false;
      }

      return matchesSearch && matchesType;
    });
  }, [reportData, search, typeFilter, showZeroBalances]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, showZeroBalances, itemsPerPage]);

  // Paginated accounts
  const paginatedAccounts = useMemo(() => {
    if (itemsPerPage === 'ALL') return filteredAccounts;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  }, [filteredAccounts, currentPage, itemsPerPage]);

  const formatNumber = (val) => {
    if (val === null || val === undefined || val === 0 || val === '0') return ' - ';
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || Number(val) === 0) return 'Rp 0';
    const num = Number(val);
    const absVal = Math.abs(num);
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(absVal);
    if (num < 0) return `(${formatted})`;
    return formatted;
  };

  // Export to CSV matching the nrcpntp.md table structure
  const exportToCSV = () => {
    if (!reportData?.accounts) return;

    const months = reportData.months || [];

    // Header Row 1
    let csv = 'Kode\tNama Akun\t';
    months.forEach(m => {
      csv += `${m.name}\t\t`;
    });
    csv += '\n';

    // Header Row 2
    csv += '\t\t';
    months.forEach(() => {
      csv += 'Debit\tKredit\t';
    });
    csv += '\n';

    // Rows
    filteredAccounts.forEach(acc => {
      csv += `"${acc.code}"\t"${acc.name}"\t`;
      months.forEach(m => {
        const d = acc.months?.[m.id]?.debit || 0;
        const c = acc.months?.[m.id]?.credit || 0;
        csv += `${d > 0 ? d : '-'}\t${c > 0 ? c : '-'}\t`;
      });
      csv += '\n';
    });

    // Total Row
    csv += 'Total\t\t';
    months.forEach(m => {
      const tot = reportData.monthly_totals?.[m.id] || { debit: 0, credit: 0 };
      csv += `${tot.debit}\t${tot.credit}\t`;
    });
    csv += '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Neraca_Penutup_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = reportData?.months || [
    { id: 1, name: 'Januari' }, { id: 2, name: 'Februari' }, { id: 3, name: 'Maret' },
    { id: 4, name: 'April' }, { id: 5, name: 'Mei' }, { id: 6, name: 'Juni' },
    { id: 7, name: 'Juli' }, { id: 8, name: 'Agustus' }, { id: 9, name: 'September' },
    { id: 10, name: 'Oktober' }, { id: 11, name: 'November' }, { id: 12, name: 'Desember' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={Scale}
          badge="12 Bulan (Tahunan)"
          title="Neraca Penutup"
          subtitle="Rekapitulasi saldo penutup debit & kredit seluruh akun per bulan (Januari - Desember) sesuai ISAK 35"
          actions={
            <>
              <Link
                to="/accounting/trial-balance"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all"
              >
                <Landmark className="w-4 h-4 text-white" />
                <span>Neraca Saldo</span>
              </Link>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-md transition-all"
              >
                <Download className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span>Export CSV</span>
              </button>
            </>
          }
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Year Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pilih Tahun</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              min="2000"
              max="2099"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-800"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Klasifikasi Akun</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
            >
              <option value="">Semua Golongan Akun</option>
              <option value="ASSET">Aktiva (Aset)</option>
              <option value="LIABILITY">Liabilitas (Kewajiban)</option>
              <option value="EQUITY">Aset Neto (Ekuitas)</option>
              <option value="INCOME">Penerimaan Dana</option>
              <option value="EXPENSE">Beban / Pengeluaran</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cari Akun</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kode / nama akun..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* View Mode (All vs Non-Zero) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tampilan Baris</label>
            <button
              type="button"
              onClick={() => setShowZeroBalances(!showZeroBalances)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              {showZeroBalances ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                  <span>Semua Akun COA</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hanya Ada Saldo</span>
                </>
              )}
            </button>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchPostClosingTrialBalance}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Print Report Header */}
      {reportData && (
        <PrintReportHeader
          title="NERACA SALDO SETELAH PENUTUPAN (NERACA PENUTUP)"
          subtitle="Rekapitulasi Saldo Penutupan Debit & Kredit 12 Bulan (Januari - Desember) Sesuai ISAK 35"
          periodLabel={`Tahun Buku: ${selectedYear}`}
        />
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        {/* Table Toolbar Info */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Menampilkan <strong>{filteredAccounts.length}</strong> akun untuk <strong>Tahun {selectedYear}</strong></span>
          </div>

          {/* Rows per page selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tampilkan per halaman:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
            >
              <option value={25}>25 data</option>
              <option value={50}>50 data</option>
              <option value={100}>100 data</option>
              <option value="ALL">Semua ({filteredAccounts.length})</option>
            </select>
          </div>
        </div>

        {/* Scrollable 12-Month Matrix Table */}
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <colgroup>
              <col style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }} />
              <col style={{ minWidth: '220px' }} />
            </colgroup>
            <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-20 shadow-xs border-b border-slate-200">
              {/* Row 1: Months header */}
              <tr>
                <th rowSpan={2} className="px-3 py-3 border-r border-slate-200 w-[80px] min-w-[80px] max-w-[80px] sticky left-0 bg-slate-100 z-30">
                  Kode
                </th>
                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 min-w-[220px] sticky left-[80px] bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Nama Akun
                </th>
                {months.map(m => (
                  <th
                    key={m.id}
                    colSpan={2}
                    className="px-4 py-2 border-r border-slate-200 text-center font-bold text-slate-800 bg-slate-100"
                  >
                    {m.name}
                  </th>
                ))}
              </tr>

              {/* Row 2: Debit & Kredit sub-headers */}
              <tr className="border-t border-slate-200 text-[10px]">
                {months.map(m => (
                  <React.Fragment key={`sub-${m.id}`}>
                    <th className="px-2.5 py-1.5 text-right border-r border-slate-200 min-w-[100px] text-blue-700 font-semibold bg-blue-50/40">
                      Debit
                    </th>
                    <th className="px-2.5 py-1.5 text-right border-r border-slate-200 min-w-[100px] text-purple-700 font-semibold bg-purple-50/40">
                      Kredit
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={26} className="px-5 py-16 text-center text-slate-400 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span className="text-xs">Mengkalkulasi Neraca Penutup 12 Bulan...</span>
                  </td>
                </tr>
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={26} className="px-5 py-12 text-center text-slate-400 font-sans">
                    <Scale className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-medium">Tidak ada data akun yang sesuai dengan filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
                  const isHeader = !acc.is_postable;

                  return (
                    <tr
                      key={acc.id || acc.code}
                      className={`hover:bg-teal-50/30 transition-colors ${isHeader ? 'bg-slate-50/90 font-bold text-slate-900 border-t border-b border-slate-200' : 'text-slate-700'
                        }`}
                    >
                      {/* Kode */}
                      <td className={`px-3 py-2 border-r border-slate-200 w-[80px] min-w-[80px] max-w-[80px] sticky left-0 z-10 ${isHeader ? 'bg-slate-100 font-bold text-slate-900' : 'bg-white font-semibold text-slate-800'
                        }`}>
                        {acc.code}
                      </td>

                      {/* Nama Akun */}
                      <td className={`px-4 py-2 border-r border-slate-200 font-sans min-w-[220px] sticky left-[80px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap ${isHeader ? 'bg-slate-100 font-bold uppercase text-slate-900 tracking-wide' : 'bg-white font-medium text-slate-800 pl-6'
                        }`}>
                        {acc.name}
                      </td>

                      {/* 12 Months: Debit & Kredit */}
                      {months.map(m => {
                        const mData = acc.months?.[m.id];
                        const d = mData?.debit || 0;
                        const c = mData?.credit || 0;

                        return (
                          <React.Fragment key={`cell-${acc.code}-${m.id}`}>
                            <td className={`px-2.5 py-2 text-right border-r border-slate-100 ${d > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'
                              }`}>
                              {isHeader ? ' - ' : formatNumber(d)}
                            </td>
                            <td className={`px-2.5 py-2 text-right border-r border-slate-200 ${c > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'
                              }`}>
                              {isHeader ? ' - ' : formatNumber(c)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Total row for each month */}
            {reportData && (
              <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-20 shadow-md">
                <tr>
                  <td colSpan={2} className="px-4 py-3.5 text-right uppercase tracking-wider text-xs font-sans border-r border-slate-200 sticky left-0 bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                    TOTAL
                  </td>
                  {months.map(m => {
                    const tot = reportData.monthly_totals?.[m.id] || { debit: 0, credit: 0, is_balanced: true };
                    return (
                      <React.Fragment key={`tot-${m.id}`}>
                        <td className="px-2.5 py-3.5 text-right border-r border-slate-200 text-teal-800 bg-teal-50/50">
                          {formatNumber(tot.debit)}
                        </td>
                        <td className="px-2.5 py-3.5 text-right border-r border-slate-200 text-teal-800 bg-teal-50/50">
                          {formatNumber(tot.credit)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        {itemsPerPage !== 'ALL' && (
          <div className="no-print">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredAccounts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Verification Notice */}
      <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-teal-900 no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-teal-950">Invariansi Double-Entry Seimbang di Seluruh Bulan</h4>
            <p className="text-[11px] text-teal-800 mt-0.5">
              Akun nominal (Penerimaan &amp; Beban) otomatis tertutup ke Aset Neto per akhir setiap bulan sehingga Total Debit selalu persis sama dengan Total Kredit.
            </p>
          </div>
        </div>
      </div>

      {/* Print Report Footer */}
      {reportData && (
        <PrintReportFooter />
      )}
    </div>
  );
};

export default PostClosingTrialBalancePage;
