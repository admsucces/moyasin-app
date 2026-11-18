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
  Layers,
  Calendar,
  Filter,
  RefreshCw,
  RotateCcw,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  BookOpen,
  X,
  Download
} from 'lucide-react';

export const LedgerPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Filters
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');

  // Ledger Statement Data
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Journal Detail Modal
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch Master Accounts & Programs
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoadingMaster(true);
        const [accRes, progRes] = await Promise.all([
          ApiService.get('/accounts'),
          ApiService.get('/programs'),
        ]);

        if (accRes && accRes.data) {
          const postable = accRes.data.filter(a => a.is_postable);
          setAccounts(postable);
          if (postable.length > 0) {
            setSelectedAccountId(postable[0].id);
          }
        }
        if (progRes && progRes.data) {
          setPrograms(progRes.data);
        }
      } catch (err) {
        setError('Gagal memuat master akun/program.');
      } finally {
        setLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, []);

  const fetchLedger = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      const params = {
        account_id: selectedAccountId,
        date_from: dateFrom,
        date_to: dateTo,
        program_id: selectedProgramId,
      };

      const res = await ledgerService.getLedger(params);
      if (res && res.success) {
        setLedgerData(res.data);
      } else {
        setError(res?.message || 'Gagal memuat Buku Besar.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem saat memuat Buku Besar.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, dateFrom, dateTo, selectedProgramId]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger();
    }
  }, [fetchLedger, selectedAccountId]);

  const handleOpenDetail = async (journalId) => {
    if (!journalId) return;
    try {
      setDetailLoading(true);
      const res = await journalService.getJournal(journalId);
      if (res && res.success) {
        setSelectedJournal(res.data);
      }
    } catch (err) {
      alert(err.message || 'Gagal memuat detail jurnal.');
    } finally {
      setDetailLoading(false);
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

  const handleExportCsv = () => {
    if (!ledgerData) return;
    const accountCode = ledgerData.account?.code || 'Akun';
    const accountName = ledgerData.account?.name || '';
    const filename = `Buku_Besar_${accountCode}_${new Date().toISOString().split('T')[0]}`;

    const headers = [
      'Tanggal',
      'No Jurnal',
      'No Referensi',
      'Keterangan',
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
        '0.00',
        '0.00',
        Number(ledgerData.opening_balance || 0).toFixed(2)
      ]
    ];

    if (ledgerData.entries && ledgerData.entries.length > 0) {
      ledgerData.entries.forEach((item) => {
        rows.push([
          item.journal_date || '',
          item.journal_no || '',
          item.reference_no || '-',
          item.description || '-',
          item.program_name || '-',
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
      `Penutupan Akun [${accountCode}] ${accountName}`,
      '-',
      Number(ledgerData.total_period_debit || 0).toFixed(2),
      Number(ledgerData.total_period_credit || 0).toFixed(2),
      Number(ledgerData.ending_balance || 0).toFixed(2)
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <div className="no-print">
        <PageHeaderCard
          icon={Layers}
          badge="Buku Besar"
          title="Buku Besar (General Ledger)"
          subtitle="Rincian mutasi debit, kredit, dan saldo berjalan per akun COA (POSTED entries)"
          actions={
            <button
              onClick={handleExportCsv}
              disabled={!ledgerData}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Export CSV</span>
            </button>
          }
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-3.5 no-print">
        {/* Baris 1: Pilih Akun COA & Filter Program */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* COA Account Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilih Akun COA *</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  [{acc.code}] {acc.name} ({acc.normal_balance})
                </option>
              ))}
            </select>
          </div>

          {/* Program Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Program</label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="">-- Semua Program --</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
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
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-medium"
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
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Tombol Reset Filter */}
        {(dateFrom || dateTo || selectedProgramId || (accounts.length > 0 && selectedAccountId !== accounts[0].id)) && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSelectedProgramId('');
                if (accounts.length > 0) {
                  setSelectedAccountId(accounts[0].id);
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200/60 shadow-xs"
              title="Reset seluruh filter buku besar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Account Info Cards */}
      {ledgerData && (
        <>
          <PrintReportHeader
            title="BUKU BESAR (GENERAL LEDGER)"
            subtitle={`Akun: [${ledgerData.account?.code || ''}] ${ledgerData.account?.name || ''}`}
            periodLabel={dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : 'Semua Tanggal'}
          />
          {/* KPI Summary Cards DENGAN WARNA TOMPEL (2 Kolom di HP & Konten Rata Tengah) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
            <StatCard
              icon={BookOpen}
              title="SALDO AWAL (OPENING)"
              value={formatCurrency(ledgerData.opening_balance)}
              color="indigo"
              badge="Saldo Awal"
              badgeType="neutral"
              subtitle={`Sebelum ${dateFrom || 'awal periode'}`}
              verticalCenter={true}
            />

            <StatCard
              icon={ArrowDownLeft}
              title="TOTAL MUTASI DEBET"
              value={formatCurrency(ledgerData.total_period_debit)}
              color="emerald"
              badge="Debet"
              badgeType="positive"
              subtitle="Total penambahan debet"
              verticalCenter={true}
            />

            <StatCard
              icon={ArrowUpRight}
              title="TOTAL MUTASI KREDIT"
              value={formatCurrency(ledgerData.total_period_credit)}
              color="cyan"
              badge="Kredit"
              badgeType="info"
              subtitle="Total penambahan kredit"
              verticalCenter={true}
            />

            <StatCard
              icon={Scale}
              title="SALDO AKHIR (CLOSING)"
              value={formatCurrency(ledgerData.closing_balance)}
              color="teal"
              badge={ledgerData.account?.normal_balance || 'Normal'}
              badgeType="positive"
              subtitle="Saldo buku besar akhir"
              verticalCenter={true}
            />
          </div>

          {/* Ledger Table Container */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rincian Mutasi Akun: {ledgerData?.account ? `[${ledgerData.account.code}] ${ledgerData.account.name}` : '-'}
                </h3>
                <p className="text-xs text-slate-500">Menampilkan seluruh ayat jurnal berstatus POSTED</p>
              </div>
              <button
                onClick={fetchLedger}
                className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                title="Refresh Data Buku Besar"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Keterangan & No. Jurnal</th>
                    <th className="px-5 py-3.5">Referensi</th>
                    <th className="px-5 py-3.5">Program</th>
                    <th className="px-5 py-3.5 text-right">Debet (Rp)</th>
                    <th className="px-5 py-3.5 text-right">Kredit (Rp)</th>
                    <th className="px-5 py-3.5 text-right">Saldo Berjalan (Rp)</th>
                    <th className="px-5 py-3.5 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* Opening Balance Row */}
                  {ledgerData && (
                    <tr className="bg-slate-50/60 font-semibold text-slate-800">
                      <td className="px-5 py-3 text-slate-500">{dateFrom || '-'}</td>
                      <td colSpan={2} className="px-5 py-3 font-sans italic text-slate-600">
                        SALDO AWAL (OPENING BALANCE)
                      </td>
                      <td className="px-5 py-3 font-sans text-slate-400">-</td>
                      <td className="px-5 py-3 text-right">-</td>
                      <td className="px-5 py-3 text-right">-</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(ledgerData.opening_balance)}
                      </td>
                      <td className="px-5 py-3 text-center">-</td>
                    </tr>
                  )}

                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-400 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                        <span>Memuat data mutasi buku besar...</span>
                      </td>
                    </tr>
                  ) : !ledgerData || ledgerData.entries?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-sans">
                        Tidak ada mutasi jurnal berstatus POSTED dalam periode ini.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.entries
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
                                className="text-sky-600 hover:underline"
                              >
                                {item.reference_no}
                              </Link>
                            ) : (
                              <span className="text-slate-400 font-sans text-[11px]">{item.reference_no}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-sans text-slate-500">{item.program?.name || '-'}</td>
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
                              className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                              title="Lihat Detail Jurnal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}

                  {/* Closing Balance Row */}
                  {ledgerData && (
                    <tr className="bg-slate-900 text-white font-semibold border-t-2 border-slate-800">
                      <td className="px-5 py-3 text-slate-300">{dateTo || 'Akhir'}</td>
                      <td colSpan={3} className="px-5 py-3 font-sans uppercase tracking-wider text-[11px] text-emerald-400 font-bold">
                        SALDO AKHIR (CLOSING BALANCE)
                      </td>
                      <td className="px-5 py-3 font-sans text-slate-400">-</td>
                      <td className="px-5 py-3 text-right text-emerald-400">
                        {formatCurrency(ledgerData.total_period_debit)}
                      </td>
                      <td className="px-5 py-3 text-right text-sky-400">
                        {formatCurrency(ledgerData.total_period_credit)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-white">
                        {formatCurrency(ledgerData.closing_balance)}
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
                totalItems={ledgerData?.entries?.length || 0}
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

export default LedgerPage;
