import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ledgerService } from '../../services/ledgerService';
import { journalService } from '../../services/journalService';
import ApiService from '../../services/api';
import PrintReportHeader from '../../components/reports/PrintReportHeader';
import PrintReportFooter from '../../components/reports/PrintReportFooter';
import Pagination from '../../components/common/Pagination';
import StatCard from '../../components/common/StatCard';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { exportToCsv } from '../../utils/csvExport';
import {
  BookMarked,
  Calendar,
  Filter,
  RefreshCw,
  RotateCcw,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Users,
  FolderKanban,
  FileSpreadsheet,
  X,
  Search,
  Building2,
  Download
} from 'lucide-react';

export const SubLedgerPage = () => {
  // Master options
  const [accounts, setAccounts] = useState([]);
  const [donors, setDonors] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Filter States
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('REKANAN'); // 'REKANAN' | 'PROGRAM' | 'ALL'

  // Data State
  const [subLedgerData, setSubLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Modal State
  const [selectedJournal, setSelectedJournal] = useState(null);

  // Fetch Master Data (Accounts, Donors/Rekanan, Programs)
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoadingMaster(true);
        const [accRes, donorRes, progRes] = await Promise.all([
          ApiService.get('/accounts'),
          ApiService.get('/donors'),
          ApiService.get('/programs'),
        ]);

        if (accRes && accRes.data) {
          setAccounts(accRes.data.filter(a => a.is_postable));
        }
        if (donorRes && donorRes.data) {
          setDonors(donorRes.data);
        }
        if (progRes && progRes.data) {
          setPrograms(progRes.data);
        }
      } catch (err) {
        setError('Gagal memuat data master (Akun, Rekanan, Program).');
      } finally {
        setLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, []);

  // Fetch Subsidiary Ledger Data
  const fetchSubLedger = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      const params = {
        account_id: selectedAccountId || undefined,
        donor_id: selectedDonorId || undefined,
        program_id: selectedProgramId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const res = await ledgerService.getSubLedger(params);
      if (res && res.success) {
        setSubLedgerData(res.data);
      } else {
        setError(res?.message || 'Gagal memuat Buku Besar Pembantu.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem saat memuat Buku Besar Pembantu.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, selectedDonorId, selectedProgramId, dateFrom, dateTo]);

  useEffect(() => {
    fetchSubLedger();
  }, [fetchSubLedger]);

  const handleOpenDetail = async (journalId) => {
    if (!journalId) return;
    try {
      const res = await journalService.getJournal(journalId);
      if (res && res.success) {
        setSelectedJournal(res.data);
      }
    } catch (err) {
      alert(err.message || 'Gagal memuat detail jurnal.');
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

  const handleResetFilters = () => {
    setSelectedAccountId('');
    setSelectedDonorId('');
    setSelectedProgramId('');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportCsv = () => {
    if (!subLedgerData) return;
    const tabName = activeTab === 'REKANAN' ? 'Rekanan' : activeTab === 'PROGRAM' ? 'Program' : 'Gabungan';
    const filename = `Buku_Besar_Pembantu_${tabName}_${new Date().toISOString().split('T')[0]}`;

    const headers = [
      'Tanggal',
      'No Jurnal',
      'No Referensi',
      'Deskripsi / Uraian',
      'Kode Akun',
      'Nama Akun',
      'Rekanan',
      'Program',
      'Debet (IDR)',
      'Kredit (IDR)',
      'Saldo Berjalan (IDR)'
    ];

    const rows = [
      [
        dateFrom || '-',
        '-',
        '-',
        'SALDO AWAL (OPENING BALANCE)',
        '-',
        '-',
        '-',
        '-',
        '0.00',
        '0.00',
        Number(subLedgerData.opening_balance || 0).toFixed(2)
      ]
    ];

    if (subLedgerData.entries && subLedgerData.entries.length > 0) {
      subLedgerData.entries.forEach((item) => {
        rows.push([
          item.journal_date || '',
          item.journal_no || '',
          item.reference_no || '-',
          item.description || '-',
          item.account?.code || '',
          item.account?.name || '',
          item.rekanan?.name || '-',
          item.program?.name || '-',
          Number(item.debit || 0).toFixed(2),
          Number(item.credit || 0).toFixed(2),
          Number(item.running_balance || 0).toFixed(2)
        ]);
      });
    }

    rows.push([
      'TOTAL MUTASI & SALDO AKHIR',
      '-',
      '-',
      `Penutupan Buku Besar Pembantu (${tabName})`,
      '-',
      '-',
      '-',
      '-',
      Number(subLedgerData.total_period_debit || 0).toFixed(2),
      Number(subLedgerData.total_period_credit || 0).toFixed(2),
      Number(subLedgerData.ending_balance || 0).toFixed(2)
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={BookMarked}
          badge="Buku Pembantu"
          title="Buku Besar Pembantu (Subsidiary Ledger)"
          subtitle="Rincian mutasi akun per Data Rekanan (Vendor/Donatur), Program, atau Sub-Entitas"
          actions={
            <button
              onClick={handleExportCsv}
              disabled={!subLedgerData}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>
          }
        />
      </div>

      {/* Mode / Quick Filter Tabs - Rapi Horizontal Scroll */}
      <div className="overflow-x-auto no-print -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 w-max text-xs">
          <button
            onClick={() => setActiveTab('REKANAN')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'REKANAN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Per Rekanan (Vendor / Donatur)</span>
          </button>
          <button
            onClick={() => setActiveTab('PROGRAM')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'PROGRAM' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Per Program / Proyek</span>
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'ALL' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter Gabungan</span>
          </button>
        </div>
      </div>

      {/* Filter Section Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-3.5 no-print">
        {/* Baris 1: Filter Dropdown Kategori */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Rekanan Selector */}
          {(activeTab === 'REKANAN' || activeTab === 'ALL') && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Rekanan (Vendor/Donatur)</label>
              <select
                value={selectedDonorId}
                onChange={(e) => setSelectedDonorId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              >
                <option value="">-- Semua Rekanan --</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.donor_code}] {d.name} ({d.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Program Selector */}
          {(activeTab === 'PROGRAM' || activeTab === 'ALL') && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Program</label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              >
                <option value="">-- Semua Program --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* COA Account Selector */}
          <div className={activeTab === 'REKANAN' || activeTab === 'PROGRAM' ? 'md:col-span-2' : ''}>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Akun COA (Opsional)</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="">-- Semua Akun --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  [{acc.code}] {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Baris 2: Filter Dari & Sampai Tanggal (2 Kolom) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 font-medium"
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
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Baris Bawah: Keterangan & Tombol Reset Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              Menampilkan rincian buku besar pembantu berdasarkan kriteria terpilih
            </span>
          </div>

          {(selectedAccountId || selectedDonorId || selectedProgramId || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200/60 shadow-xs shrink-0"
              title="Reset seluruh filter buku besar pembantu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      {subLedgerData && (
        <>
          <PrintReportHeader
            title="BUKU BESAR PEMBANTU (SUBSIDIARY LEDGER)"
            subtitle={`Filter: ${activeTab === 'REKANAN' ? 'Per Rekanan' : activeTab === 'PROGRAM' ? 'Per Program' : 'Filter Gabungan'}`}
            periodLabel={dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : 'Semua Tanggal'}
          />
          {/* KPI Summary Cards DENGAN WARNA TOMPEL (2 Kolom di HP & Konten Rata Tengah) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
            <StatCard
              icon={BookMarked}
              title="SALDO AWAL (OPENING)"
              value={formatCurrency(subLedgerData.opening_balance)}
              color="indigo"
              badge="Saldo Awal"
              badgeType="neutral"
              subtitle={`Sebelum ${dateFrom || 'awal periode'}`}
              verticalCenter={true}
            />

            <StatCard
              icon={ArrowDownLeft}
              title="TOTAL MUTASI DEBET"
              value={formatCurrency(subLedgerData.total_period_debit)}
              color="emerald"
              badge="Debet"
              badgeType="positive"
              subtitle="Subtotal debet periode ini"
              verticalCenter={true}
            />

            <StatCard
              icon={ArrowUpRight}
              title="TOTAL MUTASI KREDIT"
              value={formatCurrency(subLedgerData.total_period_credit)}
              color="cyan"
              badge="Kredit"
              badgeType="info"
              subtitle="Subtotal kredit periode ini"
              verticalCenter={true}
            />

            <StatCard
              icon={Scale}
              title="SALDO AKHIR (CLOSING)"
              value={formatCurrency(subLedgerData.closing_balance)}
              color="teal"
              badge="Closing"
              badgeType="positive"
              subtitle="Saldo berjalan akumulatif"
              verticalCenter={true}
            />
          </div>

          {/* Main Sub-Ledger Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rincian Mutasi Buku Besar Pembantu
                  {subLedgerData?.donor ? ` - [${subLedgerData.donor.code}] ${subLedgerData.donor.name}` : ''}
                  {subLedgerData?.account ? ` (${subLedgerData.account.code} ${subLedgerData.account.name})` : ''}
                </h3>
                <p className="text-xs text-slate-500">Transkripsi ayat jurnal posting dengan rincian pihak/rekanan & program</p>
              </div>
              <button
                onClick={fetchSubLedger}
                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Keterangan & No. Jurnal</th>
                    <th className="px-5 py-3.5">Referensi</th>
                    <th className="px-5 py-3.5">Akun COA</th>
                    <th className="px-5 py-3.5">Rekanan / Pihak</th>
                    <th className="px-5 py-3.5">Program</th>
                    <th className="px-5 py-3.5 text-right">Debet (Rp)</th>
                    <th className="px-5 py-3.5 text-right">Kredit (Rp)</th>
                    <th className="px-5 py-3.5 text-right">Saldo Berjalan</th>
                    <th className="px-5 py-3.5 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* Opening Balance Row */}
                  {subLedgerData && (
                    <tr className="bg-slate-50/70 font-semibold text-slate-800">
                      <td className="px-5 py-3 text-slate-500">{dateFrom || '-'}</td>
                      <td colSpan={5} className="px-5 py-3 font-sans italic text-slate-600">
                        SALDO AWAL (OPENING BALANCE)
                      </td>
                      <td className="px-5 py-3 text-right">-</td>
                      <td className="px-5 py-3 text-right">-</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(subLedgerData.opening_balance)}
                      </td>
                      <td className="px-5 py-3 text-center">-</td>
                    </tr>
                  )}

                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-10 text-center text-slate-400 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Memuat data buku besar pembantu...</span>
                      </td>
                    </tr>
                  ) : !subLedgerData || subLedgerData.entries?.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-8 text-center text-slate-400 font-sans">
                        Tidak ada transaksi buku besar pembantu yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    subLedgerData.entries
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">{item.journal_date}</td>
                          <td className="px-5 py-3.5 max-w-sm font-sans">
                            <p className="font-bold text-slate-900 text-sm truncate">{item.description || '-'}</p>
                            <p className="font-mono text-slate-400 font-normal text-[11px] mt-0.5">{item.journal_no}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            {item.transaction_id ? (
                              <Link
                                to={`/transactions/${item.transaction_id}`}
                                className="text-emerald-600 hover:underline"
                              >
                                {item.reference_no}
                              </Link>
                            ) : (
                              <span className="text-slate-400 font-sans text-[11px]">{item.reference_no}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-sans">
                            {item.account ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-medium">
                                {item.account.code} - {item.account.name}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-5 py-3.5 font-sans">
                            {item.rekanan ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-sky-50 text-sky-700 font-medium border border-sky-100">
                                <Building2 className="w-3 h-3 text-sky-500" />
                                {item.rekanan.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-sans">
                            {item.program ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                                {item.program.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right text-emerald-700 font-semibold">
                            {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sky-700 font-semibold">
                            {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                            {formatCurrency(item.running_balance)}
                          </td>
                          <td className="px-5 py-3.5 text-center font-sans">
                            <button
                              onClick={() => handleOpenDetail(item.journal_id)}
                              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Detail Jurnal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}

                  {/* Closing Balance Row */}
                  {subLedgerData && (
                    <tr className="bg-slate-900 text-white font-semibold border-t-2 border-slate-800">
                      <td className="px-5 py-3 text-slate-300">{dateTo || 'Akhir'}</td>
                      <td colSpan={6} className="px-5 py-3 font-sans uppercase tracking-wider text-[11px] text-emerald-400 font-bold">
                        SALDO AKHIR (CLOSING BALANCE)
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-400">
                        {formatCurrency(subLedgerData.total_period_debit)}
                      </td>
                      <td className="px-5 py-3 text-right text-sky-400">
                        {formatCurrency(subLedgerData.total_period_credit)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-white">
                        {formatCurrency(subLedgerData.closing_balance)}
                      </td>
                      <td className="px-5 py-3 text-center">-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="no-print">
              <Pagination
                currentPage={currentPage}
                totalItems={subLedgerData?.entries?.length || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
          <PrintReportFooter />
        </>
      )}

      {/* Journal Detail Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">Detail Jurnal: {selectedJournal.journal_no}</h3>
                <p className="text-xs text-slate-500">Tanggal Posting: {selectedJournal.journal_date}</p>
              </div>
              <button
                onClick={() => setSelectedJournal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 block font-medium">Deskripsi Jurnal:</span>
                  <span className="text-slate-800 font-semibold">{selectedJournal.description}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Periode Akuntansi:</span>
                  <span className="text-slate-800 font-semibold">{selectedJournal.accounting_period?.name || selectedJournal.accounting_period?.period_name || '-'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Rincian Debet & Kredit</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Kode COA</th>
                        <th className="px-4 py-2.5">Nama Akun</th>
                        <th className="px-4 py-2.5 text-right">Debit</th>
                        <th className="px-4 py-2.5 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedJournal.entries?.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">{entry.account?.code}</td>
                          <td className="px-4 py-2.5 text-slate-700">{entry.account?.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-medium text-emerald-700">
                            {Number(entry.debit) > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-medium text-sky-700">
                            {Number(entry.credit) > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubLedgerPage;
