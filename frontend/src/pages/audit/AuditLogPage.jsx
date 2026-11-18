import React, { useState, useEffect } from 'react';
import auditLogService from '../../services/auditLogService';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { History, Search, Filter, Calendar, ShieldCheck } from 'lucide-react';

export const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        per_page: 25,
      };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await auditLogService.getAuditLogs(params);
      if (res.success) {
        setLogs(res.data);
        setMeta(res.meta);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat daftar audit log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATED') || action.includes('POSTED')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (action.includes('APPROVED') || action.includes('REOPENED')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action.includes('REJECTED') || action.includes('REVERSED')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (action.includes('SUBMITTED') || action.includes('REQUESTED')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={History}
        badge="Audit Trail"
        title="Audit Log System"
        subtitle="Jejak Rekam Aktivitas Perubahan Data & Transaksi Sistem (Keamanan & Integritas Data)"
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kata kunci, deskripsi, IP, atau user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button type="submit" className="px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors">
            Cari
          </button>
        </form>

        <div className="flex flex-wrap gap-2 text-xs">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Semua Aksi</option>
            <option value="TRANSACTION_CREATED">TRANSACTION_CREATED</option>
            <option value="TRANSACTION_SUBMITTED">TRANSACTION_SUBMITTED</option>
            <option value="TRANSACTION_APPROVED">TRANSACTION_APPROVED</option>
            <option value="TRANSACTION_REJECTED">TRANSACTION_REJECTED</option>
            <option value="TRANSACTION_POSTED">TRANSACTION_POSTED</option>
            <option value="TRANSACTION_REVERSED">TRANSACTION_REVERSED</option>
            <option value="PERIOD_CLOSED">PERIOD_CLOSED</option>
            <option value="PERIOD_REOPENED">PERIOD_REOPENED</option>
          </select>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          Memuat catatan audit log...
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Waktu</th>
                  <th className="py-3 px-4 font-bold">Pengguna (User)</th>
                  <th className="py-3 px-4 font-bold">Aksi (Action)</th>
                  <th className="py-3 px-4 font-bold">Entity</th>
                  <th className="py-3 px-4 font-bold">Deskripsi Perubahan</th>
                  <th className="py-3 px-4 font-bold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400 italic">
                      Belum ada rekam audit log yang tercatat
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">{log.created_at}</td>
                      <td className="py-3 px-4">
                        {log.user ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{log.user.name}</span>
                            <span className="text-[10px] text-slate-400">{log.user.email} ({log.user.role})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sistem / Terhapus</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {log.entity_type} #{log.entity_id}
                      </td>
                      <td className="py-3 px-4 text-slate-800">{log.description}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{log.ip_address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={meta?.page || page}
            totalItems={meta?.total || 0}
            itemsPerPage={meta?.per_page || 25}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
