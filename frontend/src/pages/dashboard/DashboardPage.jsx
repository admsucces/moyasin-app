import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingContext';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import StatCard from '../../components/common/StatCard';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  Plus, 
  PlusCircle, 
  FileText,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Calendar,
  Layers,
  Sparkles,
  Activity,
  User,
  ExternalLink,
  ShieldCheck,
  Landmark,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Catmull-Rom smooth cubic bezier curve generator for SVG
const getSmoothSvgPath = (coords) => {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const roleCode = user?.role?.code || user?.role || '';
  const roleName = user?.role?.name || roleCode;

  const isAdmin = roleCode === 'ADMIN';
  const isOwner = roleCode === 'OWNER';
  const isPengelola = roleCode === 'PENGELOLA' || roleCode === 'MANAGER' || roleCode === 'OPERATOR';

  const primaryColor = settings.primary_color || '#4935e4';
  const secondaryColor = settings.secondary_color || '#7652f4';
  const accentColor = settings.accent_color || '#67e8f9';

  // Overall dashboard initial load state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dedicated filter state exclusively for the "Statistik Keuangan" section
  const [statFilter, setStatFilter] = useState('Bulan Ini');
  const [statData, setStatData] = useState(null);
  const [statLoading, setStatLoading] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  // Initial load for entire dashboard data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const res = await dashboardService.getDashboardData({ filter: 'Bulan Ini' });
        if (res && res.success) {
          setData(res.data);
          setStatData({
            financial_stats: res.data.financial_stats || {
              income: res.data.summary.period_income,
              expense: res.data.summary.period_expense,
              net_surplus: (res.data.summary.period_income - res.data.summary.period_expense),
            },
            trend: res.data.trend,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Dedicated handler when changing filter in "Statistik Keuangan" section only
  const handleStatFilterChange = async (newFilter) => {
    setStatFilter(newFilter);
    setSelectedPointIndex(null);
    try {
      setStatLoading(true);
      const res = await dashboardService.getDashboardData({ filter: newFilter });
      if (res && res.success) {
        // Only update the financial statistics section state
        setStatData({
          financial_stats: res.data.financial_stats || {
            income: res.data.summary.period_income,
            expense: res.data.summary.period_expense,
            net_surplus: (res.data.summary.period_income - res.data.summary.period_expense),
          },
          trend: res.data.trend,
        });
      }
    } catch (err) {
      console.error('Failed to update financial stats:', err);
    } finally {
      setStatLoading(false);
    }
  };

  const summary = data?.summary || {
    total_cash_bank: 0,
    period_income: 0,
    period_expense: 0,
    pending_approvals: 0,
    pending_postings: 0,
    draft_count: 0,
    rejected_count: 0,
    posted_count: 0,
    total_journals: 0,
  };

  const financialStats = statData?.financial_stats || {
    income: summary.period_income,
    expense: summary.period_expense,
    net_surplus: (summary.period_income - summary.period_expense),
  };

  const recentTransactions = data?.recent_transactions || [];
  const programStats = data?.program_stats || [];
  const trendPoints = statData?.trend?.points || data?.trend?.points || [];

  return (
    <div className="space-y-6">
      {/* 1. TOP BANNER WIDGET (DESAIN MODERN FINTECH SESUAI GAMBAR & WARNA PENGATURAN) */}
      <div
        style={{
          background: `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
        className="text-white p-6 sm:p-8 lg:p-9 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-300"
      >
        {/* Decorative Organic Tompel Blobs (Warna Tompel Lembut) */}
        <div
          className="absolute -top-14 -right-14 w-56 h-56 rounded-full bg-white/15 blur-2xl pointer-events-none"
          style={{ borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%' }}
        />
        <div
          className="absolute -bottom-14 -left-14 w-52 h-52 rounded-full bg-white/10 blur-2xl pointer-events-none"
          style={{ borderRadius: '58% 42% 48% 52% / 38% 52% 48% 62%' }}
        />
        <div
          style={{ backgroundColor: `${accentColor}26` }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-48 rounded-full blur-3xl pointer-events-none"
        />

        {/* 1. Period / Month Badge (seperti di gambar referensi) */}
        <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-white/95 border border-white/20 shadow-xs mb-3.5">
          <Calendar className="w-3.5 h-3.5 text-white/80" />
          <span>
            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
          <ChevronDown className="w-3 h-3 text-white/70" />
        </div>

        {/* 2. User Avatar dengan Mini Badge Sparkle (seperti di gambar) */}
        <div className="relative z-10 mb-3">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 flex items-center justify-center text-white font-black text-2xl shadow-xl ring-4 ring-white/10">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
          </span>
        </div>

        {/* 3. Welcome Typography & Subtitle (Semua Posisi Rata Tengah) */}
        <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
          <p className="text-[11px] sm:text-xs uppercase tracking-wider font-extrabold text-white/80">
            {roleName} Portal • {settings.app_name || 'Curadoc'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1 leading-tight text-center">
            Selamat Datang, {user?.name || 'User'}!
          </h1>
          <p className="text-xs sm:text-sm text-white/85 mt-2 font-medium leading-relaxed text-center max-w-md">
            Pantau arus kas, posisi keuangan, dan transaksi yayasan secara terstruktur & transparan.
          </p>
        </div>

        {/* 4. Action Buttons: Catat Pemasukan & Catat Pengeluaran (Seimbang Otomatis Sesuai Lebar Layar) */}
        {(isPengelola || isAdmin) && (
          <div className="relative z-10 grid grid-cols-2 gap-3 w-full max-w-sm sm:max-w-md mx-auto mt-6">
            <button
              onClick={() => navigate('/transactions/income/new')}
              className="w-full py-3 px-3 sm:px-4 bg-white text-slate-900 hover:bg-slate-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg shadow-black/15 flex items-center justify-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.4]" />
              <span className="truncate">Catat Pemasukan</span>
            </button>
            <button
              onClick={() => navigate('/transactions/expense/new')}
              className="w-full py-3 px-3 sm:px-4 bg-white/20 hover:bg-white/30 text-white active:scale-95 rounded-2xl text-xs sm:text-sm font-extrabold backdrop-blur-md border border-white/30 shadow-lg shadow-black/15 flex items-center justify-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-rose-300 shrink-0 stroke-[2.4]" />
              <span className="truncate">Catat Pengeluaran</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI METRIC CARDS ROW DENGAN WARNA TOMPEL (2 KOLOM DI HP & RATA TENGAH) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Saldo Kas & Bank */}
        <StatCard
          icon={Landmark}
          title="TOTAL KAS & BANK"
          value={loading ? '...' : formatCurrency(summary.total_cash_bank)}
          badge="Sinkron"
          badgeType="positive"
          subtitle="Buku Besar Sesuai"
          color="emerald"
          centered
          onClick={() => navigate('/master/cash-banks')}
        />

        {/* Total Penerimaan */}
        <StatCard
          icon={ArrowDownLeft}
          title="PENERIMAAN"
          value={loading ? '...' : formatCurrency(summary.period_income)}
          color="cyan"
          centered
          verticalCenter
          onClick={() => navigate('/transactions/income')}
        />

        {/* Total Pengeluaran */}
        <StatCard
          icon={ArrowUpRight}
          title="PENGELUARAN"
          value={loading ? '...' : formatCurrency(summary.period_expense)}
          color="rose"
          centered
          verticalCenter
          onClick={() => navigate('/transactions/expense')}
        />

        {/* Status Antrean Approval / Posting */}
        <StatCard
          icon={Activity}
          title={isOwner ? 'PERLU APPROVAL' : isAdmin ? 'PERLU POSTING' : 'DRAFT TRANSAKSI'}
          value={
            loading
              ? '...'
              : isOwner
              ? `${summary.pending_approvals} Transaksi`
              : isAdmin
              ? `${summary.pending_postings} Transaksi`
              : `${summary.draft_count} Draft`
          }
          badge={isOwner ? 'Approval' : isAdmin ? 'Posting' : 'Draft'}
          badgeType="info"
          subtitle={`${summary.posted_count} Transaksi Selesai`}
          color="indigo"
          centered
          onClick={() => navigate(isOwner ? '/approvals' : '/transactions')}
        />
      </div>

      {/* 2. DUAL-COLUMN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* CARD A: FINANCIAL TREND CHART (GRAFIK TREN KELEPASAN HARIAN / 12 BULAN) */}
          {(() => {
            const trendPoints = statData?.trend?.points || data?.trend?.points || [];
            const isYearly = statFilter === 'Tahun Ini';
            const isWeekly = statFilter === 'Minggu Ini';

            // Find default active point (first point with non-zero data, or fallback to latest point)
            const defaultIndex = trendPoints.length > 0
              ? (() => {
                  const withData = trendPoints.map((p, idx) => ({ p, idx })).filter(item => item.p.income > 0 || item.p.expense > 0);
                  return withData.length > 0 ? withData[withData.length - 1].idx : Math.max(0, trendPoints.length - 1);
                })()
              : 0;

            const activeIndex = selectedPointIndex !== null && selectedPointIndex < trendPoints.length
              ? selectedPointIndex
              : defaultIndex;

            const activePoint = trendPoints[activeIndex] || null;

            // SVG Geometry Constants
            const svgWidth = 800;
            const svgHeight = 220;
            const padLeft = 45;
            const padRight = 35;
            const padTop = 30;
            const padBottom = 35;
            const usableWidth = svgWidth - padLeft - padRight;
            const usableHeight = svgHeight - padTop - padBottom;
            const baseY = svgHeight - padBottom;

            const maxVal = Math.max(
              ...trendPoints.map(p => Math.max(Number(p.income) || 0, Number(p.expense) || 0)),
              1000000
            );
            const yCeil = Math.ceil(maxVal * 1.15);
            const totalPoints = Math.max(trendPoints.length, 2);

            const incomeCoords = trendPoints.map((p, i) => ({
              x: padLeft + (i / (totalPoints - 1)) * usableWidth,
              y: padTop + (1 - (Number(p.income) || 0) / yCeil) * usableHeight,
              val: Number(p.income) || 0,
              point: p,
            }));

            const expenseCoords = trendPoints.map((p, i) => ({
              x: padLeft + (i / (totalPoints - 1)) * usableWidth,
              y: padTop + (1 - (Number(p.expense) || 0) / yCeil) * usableHeight,
              val: Number(p.expense) || 0,
              point: p,
            }));

            const incomeLine = getSmoothSvgPath(incomeCoords);
            const incomeArea = incomeCoords.length > 0
              ? `${incomeLine} L ${incomeCoords[incomeCoords.length - 1].x.toFixed(1)} ${baseY} L ${incomeCoords[0].x.toFixed(1)} ${baseY} Z`
              : '';

            const expenseLine = getSmoothSvgPath(expenseCoords);
            const expenseArea = expenseCoords.length > 0
              ? `${expenseLine} L ${expenseCoords[expenseCoords.length - 1].x.toFixed(1)} ${baseY} L ${expenseCoords[0].x.toFixed(1)} ${baseY} Z`
              : '';

            const activeCoordX = incomeCoords[activeIndex]?.x ?? padLeft;
            const activeIncomeY = incomeCoords[activeIndex]?.y ?? baseY;
            const activeExpenseY = expenseCoords[activeIndex]?.y ?? baseY;

            return (
              <div className="bg-white rounded-[32px] p-5 sm:p-7 shadow-[0_10px_35px_rgba(76,58,227,0.06)] border border-slate-100/90 space-y-5 relative overflow-hidden">
                {/* Background Subtle Tompel Blobs */}
                <div
                  className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-cyan-400/10 blur-2xl pointer-events-none"
                  style={{ borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%' }}
                />
                <div
                  className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-xl pointer-events-none"
                  style={{ borderRadius: '58% 42% 48% 52% / 38% 52% 48% 62%' }}
                />

                {/* Header Card: Judul dan Keterangan terlebih dahulu, lalu Filter di bawahnya (Menyesuaikan Lebar Layar di HP, Sejajar di PC) */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4">
                  {/* Judul & Keterangan */}
                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left w-full sm:w-auto">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Grafik Tren Keuangan
                      </h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
                        {isYearly ? '12 Bulan' : isWeekly ? '7 Hari' : 'Harian / Tanggal'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-center sm:text-left">
                      {isYearly
                        ? 'Akumulasi tren penerimaan & pengeluaran kas sepanjang 12 bulan'
                        : isWeekly
                        ? 'Pergerakan arus kas harian dalam minggu ini'
                        : 'Pergerakan arus kas harian per tanggal di bulan ini'}
                    </p>
                  </div>

                  {/* Filter Switches: Menyesuaikan Lebar Layar (w-full di HP, w-auto di PC) */}
                  <div className="w-full sm:w-auto flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatFilterChange('Bulan Ini')}
                      className={`flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        statFilter === 'Bulan Ini'
                          ? 'bg-white text-indigo-700 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Bulan Ini (Harian)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatFilterChange('Tahun Ini')}
                      className={`flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        statFilter === 'Tahun Ini'
                          ? 'bg-white text-indigo-700 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tahun Ini (12 Bulan)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatFilterChange('Minggu Ini')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all hidden md:block ${
                        statFilter === 'Minggu Ini'
                          ? 'bg-white text-indigo-700 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Mingguan
                    </button>
                  </div>
                </div>

                {/* Interactive Dynamic Recap Bar (Rata Tengah di HP, Normal di PC) */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center sm:justify-between text-center sm:text-left gap-3.5 bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-100">
                  <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2.5 text-center sm:text-left">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-indigo-600 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <span className="text-xs font-extrabold text-slate-800">
                          {activePoint?.full_label || statFilter}
                        </span>
                        {statLoading && (
                          <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 text-center sm:text-left">
                        Surplus / Defisit:{' '}
                        <span
                          className={`font-mono font-bold ${
                            (activePoint?.net ?? financialStats.net_surplus) >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(activePoint?.net ?? financialStats.net_surplus)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Badges Penerimaan & Pengeluaran (Rata Tengah di HP, Kiri di PC) */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 text-xs font-bold">
                    <div className="flex items-center gap-1.5 bg-cyan-50 px-2.5 py-1 rounded-xl border border-cyan-200/60">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-xs" />
                      <span className="text-cyan-900 text-[11px]">
                        Penerimaan:{' '}
                        <span className="font-mono font-extrabold">
                          {formatCurrency(activePoint?.income ?? financialStats.income)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200/60">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                      <span className="text-rose-900 text-[11px]">
                        Pengeluaran:{' '}
                        <span className="font-mono font-extrabold">
                          {formatCurrency(activePoint?.expense ?? financialStats.expense)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* The Modern Fluid SVG Chart Canvas */}
                <div className="relative h-56 sm:h-64 w-full pt-1">
                  <svg
                    className="w-full h-full overflow-visible select-none"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      {/* Gradient for Cyan Income Area */}
                      <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                        <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.00" />
                      </linearGradient>

                      {/* Gradient for Rose Expense Area */}
                      <linearGradient id="roseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.30" />
                        <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
                      </linearGradient>

                      {/* Filter Glow Effects */}
                      <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.45" />
                      </filter>
                      <filter id="glowRose" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.45" />
                      </filter>
                    </defs>

                    {/* Horizontal Reference Grid Lines */}
                    {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                      const y = padTop + (1 - ratio) * usableHeight;
                      return (
                        <g key={idx}>
                          <line
                            x1={padLeft - 5}
                            y1={y}
                            x2={svgWidth - padRight + 5}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="4 5"
                          />
                          <text
                            x={padLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#94a3b8"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {ratio === 1.0 ? formatCurrency(yCeil) : ratio === 0.5 ? formatCurrency(yCeil / 2) : ''}
                          </text>
                        </g>
                      );
                    })}

                    {/* Base zero line */}
                    <line
                      x1={padLeft - 5}
                      y1={baseY}
                      x2={svgWidth - padRight + 5}
                      y2={baseY}
                      stroke="#cbd5e1"
                      strokeWidth="1.2"
                    />
                    <text
                      x={padLeft - 8}
                      y={baseY + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94a3b8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Rp 0
                    </text>

                    {/* 1. Rose Expense Area & Spline Curve */}
                    {expenseArea && <path d={expenseArea} fill="url(#roseAreaGrad)" />}
                    {expenseLine && (
                      <path
                        d={expenseLine}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        filter="url(#glowRose)"
                      />
                    )}

                    {/* 2. Cyan Income Area & Spline Curve */}
                    {incomeArea && <path d={incomeArea} fill="url(#cyanAreaGrad)" />}
                    {incomeLine && (
                      <path
                        d={incomeLine}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        filter="url(#glowCyan)"
                      />
                    )}

                    {/* Vertical Active Crosshair Guide Line */}
                    {trendPoints.length > 0 && (
                      <line
                        x1={activeCoordX}
                        y1={padTop - 8}
                        x2={activeCoordX}
                        y2={baseY}
                        stroke="#6366f1"
                        strokeWidth="1.8"
                        strokeDasharray="3 3"
                        opacity="0.8"
                      />
                    )}

                    {/* Active Nodes on Cyan and Rose Lines */}
                    {trendPoints.length > 0 && (
                      <>
                        {/* Income Active Node */}
                        <circle
                          cx={activeCoordX}
                          cy={activeIncomeY}
                          r="6"
                          fill="#06b6d4"
                          stroke="#ffffff"
                          strokeWidth="3"
                          className="transition-all duration-150"
                        />
                        {/* Expense Active Node */}
                        <circle
                          cx={activeCoordX}
                          cy={activeExpenseY}
                          r="6"
                          fill="#f43f5e"
                          stroke="#ffffff"
                          strokeWidth="3"
                          className="transition-all duration-150"
                        />
                      </>
                    )}

                    {/* Transparent Click/Hover Column Targets for all points */}
                    {trendPoints.map((pt, i) => {
                      const colWidth = usableWidth / totalPoints;
                      const x = padLeft + (i / (totalPoints - 1)) * usableWidth;
                      return (
                        <rect
                          key={i}
                          x={x - colWidth / 2}
                          y={0}
                          width={colWidth}
                          height={svgHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setSelectedPointIndex(i)}
                          onClick={() => setSelectedPointIndex(i)}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Bottom X-Axis Selector / Labels */}
                <div className="relative z-10 pt-1 border-t border-slate-100">
                  {isYearly ? (
                    /* 12 Bulan Grid: Jan to Des */
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center">
                      {trendPoints.map((pt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedPointIndex(i)}
                          className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all ${
                            activeIndex === i
                              ? 'bg-gradient-to-tr from-[#4935e4] to-[#7652f4] text-white shadow-md shadow-indigo-500/30 scale-105'
                              : pt.income > 0 || pt.expense > 0
                              ? 'bg-slate-100/90 text-slate-800 hover:bg-slate-200'
                              : 'bg-transparent text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block leading-none">{pt.label}</span>
                          {(pt.income > 0 || pt.expense > 0) && (
                            <span className="w-1 h-1 rounded-full bg-cyan-400 mx-auto mt-1 block" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* Per Hari / Tanggal Horizontal Scroller */
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Pilih Tanggal:
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600">
                          {trendPoints.length} Hari dalam Periode
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                        {trendPoints.map((pt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedPointIndex(i)}
                            className={`min-w-[36px] py-1.5 px-2 rounded-xl text-center text-xs font-extrabold shrink-0 transition-all ${
                              activeIndex === i
                                ? 'bg-gradient-to-tr from-[#4935e4] to-[#7652f4] text-white shadow-md shadow-indigo-500/30 scale-105'
                                : pt.income > 0 || pt.expense > 0
                                ? 'bg-slate-100 text-slate-800 border border-slate-200/60 hover:bg-slate-200'
                                : 'bg-slate-50/80 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <span className="block leading-none">{pt.label}</span>
                            {(pt.income > 0 || pt.expense > 0) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-auto mt-1 block" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* RIGHT COLUMN (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* CARD C: RECENT TRANSACTIONS (Maksimal 5 Transaksi Terbaru, Konten Otomatis Menyesuaikan Lebar Card) */}
          <div className="bg-white rounded-[32px] p-4 sm:p-6 shadow-[0_10px_30px_rgba(76,58,227,0.06)] border border-slate-100/90 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Transaksi Terbaru</h3>
                <p className="text-[11px] text-slate-400">5 aktivitas pencatatan terakhir</p>
              </div>
              <button 
                onClick={() => navigate('/transactions')}
                className="text-[10px] font-extrabold px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full transition-colors shrink-0"
              >
                Semua
              </button>
            </div>

            <div className="space-y-1 sm:space-y-2">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Memuat transaksi...</div>
              ) : recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Belum ada transaksi di sistem.</div>
              ) : (
                recentTransactions.slice(0, 5).map((tx) => {
                  const isInc = tx.type === 'INCOME';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 sm:gap-3 py-2.5 border-b border-slate-100/80 last:border-0 w-full min-w-0"
                    >
                      {/* Kolom Kiri: Icon Bulat + Keterangan (min-w-0 flex-1 overflow-hidden agar terpotong elips dengan aman) */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                            isInc ? 'bg-cyan-100 text-cyan-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isInc ? '+' : '-'}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h4
                            className="text-xs font-bold text-slate-800 truncate"
                            title={tx.description || tx.transaction_no}
                          >
                            {tx.description || tx.transaction_no}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">
                            {tx.donor_name || 'Umum'} • {tx.program_name || 'Operasional'}
                          </p>
                        </div>
                      </div>

                      {/* Kolom Kanan: Nominal & Badge Status (shrink-0 dan aman di dalam card) */}
                      <div className="text-right shrink-0 flex flex-col items-end pl-1 max-w-[48%]">
                        <span
                          className={`text-xs sm:text-sm font-black font-mono block whitespace-nowrap leading-tight ${
                            isInc ? 'text-cyan-700' : 'text-rose-600'
                          }`}
                        >
                          {isInc ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                        <span
                          className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase mt-1 tracking-tight border ${
                            tx.status === 'POSTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tx.status === 'APPROVED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : tx.status === 'SUBMITTED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
