import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingContext';
import { 
  LayoutDashboard, 
  Receipt, 
  Layers, 
  BarChart3, 
  Grid,
  X,
  ChevronRight,
  BookOpen, 
  BookMarked,
  Landmark, 
  Scale, 
  Building2, 
  FileCheck2, 
  CalendarCheck,
  FileText,
  PieChart,
  Database,
  FolderKanban,
  Users,
  Settings,
  History,
  CheckSquare,
  PlusCircle,
  LogOut,
  Wallet,
  Coins,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const MobileBottomDock = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeGroup, setActiveGroup] = useState(null); // 'TRANSAKSI' | 'AKUNTANSI' | 'LAPORAN' | 'LAINNYA' | null

  const role = user?.role?.code || user?.role || '';
  const isAdmin = role === 'ADMIN';
  const isOwner = role === 'OWNER';
  const isPengelola = role === 'PENGELOLA' || role === 'MANAGER' || role === 'OPERATOR';

  const primaryColor = settings.primary_color || '#4935e4';
  const secondaryColor = settings.secondary_color || '#331ea0';
  const accentColor = settings.accent_color || '#67e8f9';

  // Close bottom sheet whenever location changes
  useEffect(() => {
    setActiveGroup(null);
  }, [location.pathname]);

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    if (activeGroup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeGroup]);

  // Group definitions
  const groupMenus = {
    TRANSAKSI: {
      title: 'Menu Transaksi & Kas',
      subtitle: 'Pencatatan mutasi kas, pengeluaran & penerimaan',
      badge: 'Transaksi',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      color: 'emerald',
      items: [
        {
          name: 'Semua Transaksi',
          path: '/transactions',
          desc: 'Riwayat transaksi masuk & keluar',
          icon: Receipt,
          show: true,
        },
        {
          name: 'Catat Penerimaan',
          path: '/transactions/income/new',
          desc: 'Input donasi / penerimaan baru',
          icon: PlusCircle,
          show: isPengelola || isAdmin,
          highlight: true,
        },
        {
          name: 'Catat Pengeluaran',
          path: '/transactions/expense/new',
          desc: 'Input beban operasional baru',
          icon: PlusCircle,
          show: isPengelola || isAdmin,
        },
        {
          name: 'Catat Jurnal Umum',
          path: '/journals/new',
          desc: 'Input jurnal umum berimbang baru',
          icon: PlusCircle,
          show: isPengelola || isAdmin,
        },
        {
          name: 'Approval Queue',
          path: '/approvals/pending',
          desc: 'Persetujuan transaksi oleh pengawas',
          icon: CheckSquare,
          show: isOwner,
          badge: 'Owner',
        },
      ].filter((i) => i.show),
    },

    AKUNTANSI: {
      title: 'Modul Akuntansi',
      subtitle: 'Standar pembukuan double-entry & siklus akun',
      badge: 'Akuntansi',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      color: 'indigo',
      items: [
        {
          name: 'Jurnal',
          path: '/accounting/journals',
          desc: 'Daftar jurnal & posting transaksi',
          icon: FileText,
          show: true,
        },
        {
          name: 'Buku Besar (Ledger)',
          path: '/accounting/ledger',
          desc: 'Rincian mutasi akun COA',
          icon: Layers,
          show: true,
        },
        {
          name: 'Buku Besar Pembantu',
          path: '/accounting/sub-ledger',
          desc: 'Rincian per donatur & program',
          icon: BookMarked,
          show: true,
        },
        {
          name: 'Neraca Saldo',
          path: '/accounting/trial-balance',
          desc: 'Trial balance sebelum penutupan',
          icon: Landmark,
          show: true,
        },
        {
          name: 'Neraca Penutup',
          path: '/accounting/post-closing-trial-balance',
          desc: 'Trial balance setelah tutup buku',
          icon: Scale,
          show: true,
        },
        {
          name: 'Setup Saldo Awal',
          path: '/accounting/initial-balances',
          desc: 'Saldo awal pembukuan entitas',
          icon: BookOpen,
          show: true,
        },
        {
          name: 'Aset Tetap & Depresiasi',
          path: '/accounting/fixed-assets',
          desc: 'Inventaris & penyusutan garis lurus',
          icon: Building2,
          show: true,
        },
        {
          name: 'Hutang & Piutang',
          path: '/accounting/payables-receivables',
          desc: 'Kewajiban bayar & klaim penerimaan',
          icon: FileCheck2,
          show: true,
        },
        {
          name: 'Periode Akuntansi',
          path: '/accounting/periods',
          desc: 'Pengaturan & status tutup buku',
          icon: CalendarCheck,
          show: isAdmin || isOwner,
        },
      ].filter((i) => i.show),
    },

    LAPORAN: {
      title: 'Laporan Keuangan',
      subtitle: 'Format standar pelaporan entitas nirlaba ISAK 35',
      badge: 'ISAK 35',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      color: 'cyan',
      items: [
        {
          name: 'Posisi Keuangan (Neraca)',
          path: '/reports/balance-sheet',
          desc: 'Aset, liabilitas, & aset neto ISAK 35',
          icon: Landmark,
          show: true,
        },
        {
          name: 'Penghasilan Komprehensif',
          path: '/reports/income-statement',
          desc: 'Aktivitas penerimaan, beban & 12 bulan',
          icon: FileText,
          show: true,
        },
        {
          name: 'Perubahan Aset Neto',
          path: '/reports/changes-in-net-assets',
          desc: 'Rekonsiliasi aset tanpa & dengan batasan',
          icon: Layers,
          show: true,
        },
        {
          name: 'Laporan Arus Kas',
          path: '/reports/cash-flows',
          desc: 'Arus kas operasi, investasi, pendanaan',
          icon: BarChart3,
          show: true,
        },
        {
          name: 'Laporan Manajerial',
          path: '/reports/management',
          desc: 'Analisis donatur & realisasi program',
          icon: PieChart,
          show: true,
        },
      ].filter((i) => i.show),
    },

    LAINNYA: {
      title: 'Master Data & Administrasi',
      subtitle: 'Pengaturan akun, profil, program & master data',
      badge: 'Master & Pengaturan',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      color: 'purple',
      items: [
        {
          name: 'Chart of Accounts (COA)',
          path: '/master/coa',
          desc: 'Bagan akun standar entitas nirlaba',
          icon: Database,
          show: true,
        },
        {
          name: 'Program Kerja Yayasan',
          path: '/master/programs',
          desc: 'Alokasi program yatim, dhuafa, dll.',
          icon: FolderKanban,
          show: true,
        },
        {
          name: 'Data Rekanan & Donatur',
          path: '/master/rekanan',
          desc: 'Daftar donatur & rekanan lembaga',
          icon: Users,
          show: true,
        },
        {
          name: 'Kas & Rekening Bank',
          path: '/master/cash-bank',
          desc: 'Daftar kas tunai & rekening bank',
          icon: Wallet,
          show: true,
        },
        {
          name: 'Pengaturan Aplikasi',
          path: '/settings',
          desc: 'Identitas lembaga, logo, & warna tema',
          icon: Settings,
          show: isAdmin || isOwner,
          highlight: true,
        },
        {
          name: 'Manajemen Pengguna',
          path: '/users',
          desc: 'Kelola akun user & hak akses',
          icon: Users,
          show: isAdmin,
        },
        {
          name: 'Audit Log & Aktivitas',
          path: '/audit-logs',
          desc: 'Rekam jejak seluruh mutasi sistem',
          icon: History,
          show: isAdmin || isOwner,
        },
      ].filter((i) => i.show),
    },
  };

  // Helper check for active dock button
  const isGroupActive = (key) => {
    if (activeGroup === key) return true;
    const group = groupMenus[key];
    if (!group) return false;
    return group.items.some(
      (item) => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'))
    );
  };

  const isUtamaActive = !activeGroup && location.pathname === '/dashboard';

  const toggleGroup = (key) => {
    if (activeGroup === key) {
      setActiveGroup(null);
    } else {
      setActiveGroup(key);
    }
  };

  return (
    <>
      {/* ========================================================
          1. BOTTOM SHEET DRAWER PER GROUP (Tampil di Atas Menu Dok)
          ======================================================== */}
      {activeGroup && (
        <div className="fixed inset-0 z-40 md:hidden flex flex-col justify-end">
          {/* Backdrop Blur (Menutup area layar di atas dok) */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setActiveGroup(null)}
          />

          {/* Drawer Container: Berada Tepat di Atas Menu Dok (mb-[70px]) */}
          <div
            className="relative z-10 bg-white rounded-t-[30px] shadow-[0_-16px_40px_rgba(0,0,0,0.3)] border-t border-slate-200/90 max-h-[75vh] mb-[70px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200 ease-out"
          >
            {/* Tompel Aksen Header Drawer */}
            <div
              className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
              style={{ borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%', backgroundColor: `${primaryColor}18` }}
            />
            <div
              className="absolute top-20 -left-10 w-28 h-28 rounded-full pointer-events-none"
              style={{ borderRadius: '58% 42% 48% 52% / 38% 52% 48% 62%', backgroundColor: `${accentColor}22` }}
            />

            {/* Drag Handle Bar */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Drawer Header: Diposisikan di Tengah */}
            <div className="relative z-10 px-6 py-3.5 border-b border-slate-100 flex flex-col items-center justify-center text-center">
              <button
                onClick={() => setActiveGroup(null)}
                className="absolute right-4 top-3.5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight text-center">
                  {groupMenus[activeGroup]?.title}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    groupMenus[activeGroup]?.badgeColor
                  }`}
                >
                  {groupMenus[activeGroup]?.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-[290px] text-center leading-relaxed">
                {groupMenus[activeGroup]?.subtitle}
              </p>
            </div>

            {/* Menu Items Grid: 2 Kolom di Layar HP & Konten Rata Tengah */}
            <div className="relative z-10 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2.5">
                {groupMenus[activeGroup]?.items.map((item) => {
                  const Icon = item.icon;
                  const isItemActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path + '/'));

                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setActiveGroup(null);
                      }}
                      className={`relative p-3.5 rounded-[22px] border text-center flex flex-col items-center justify-center transition-all group overflow-hidden ${
                        isItemActive
                          ? 'shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                      }`}
                      style={isItemActive ? {
                        backgroundColor: `${primaryColor}12`,
                        borderColor: `${primaryColor}50`,
                      } : {}}
                    >
                      {/* Subtle Tompel Accent on Item Card */}
                      <div
                        className="absolute -top-4 -right-4 w-14 h-14 rounded-full pointer-events-none transition-transform group-hover:scale-125"
                        style={{
                          borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%',
                          backgroundColor: isItemActive ? `${primaryColor}30` : 'rgba(100,100,100,0.07)',
                        }}
                      />

                      {/* Active indicator dot or badge in corner */}
                      {isItemActive && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-2" style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}40` }} />
                      )}
                      {item.badge && !isItemActive && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {item.badge}
                        </span>
                      )}

                      {/* Centered Icon Container */}
                      <div
                        className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 border mb-2 transition-transform group-hover:scale-105 shadow-xs`}
                        style={
                          isItemActive
                            ? { backgroundColor: primaryColor, color: '#ffffff', borderColor: secondaryColor, boxShadow: `0 4px 12px ${primaryColor}40` }
                            : item.highlight
                            ? { backgroundColor: '#f0fdf4', color: '#059669', borderColor: '#a7f3d0' }
                            : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }
                        }
                      >
                        <Icon className="w-5 h-5 stroke-[2.2]" />
                      </div>

                      {/* Centered Title & Description */}
                      <div className="relative z-10 w-full text-center flex flex-col items-center">
                        <span
                          className="text-xs font-bold block leading-snug line-clamp-2 text-center"
                          style={{ color: isItemActive ? primaryColor : '#1e293b' }}
                        >
                          {item.name}
                        </span>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 font-medium leading-tight text-center">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {/* Special Logout button if on LAINNYA: Rata Tengah */}
                {activeGroup === 'LAINNYA' && (
                  <button
                    onClick={() => {
                      setActiveGroup(null);
                      logout();
                    }}
                    className="col-span-2 mt-1.5 p-3 rounded-[20px] border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 flex items-center justify-center gap-2.5 text-rose-700 transition-all shadow-xs text-center"
                  >
                    <div className="w-8 h-8 rounded-[12px] bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold block text-rose-800">
                        Keluar Akun (Logout)
                      </span>
                      <p className="text-[10px] text-rose-500 font-medium">
                        Sesi login saat ini
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. FULL-WIDTH BOTTOM DOCK BAR (Pojok ke Pojok & Selalu di Depan)
          ======================================================== */}
      <nav
        aria-label="Mobile Navigation Dock"
        className="fixed bottom-0 left-0 right-0 w-full z-50 md:hidden backdrop-blur-xl text-white border-t shadow-[0_-8px_30px_rgba(0,0,0,0.35)] h-[70px] px-1 flex items-center justify-around"
        style={{
          backgroundColor: secondaryColor,
          borderColor: `${primaryColor}60`,
        }}
      >
        {/* 1. DOCK ITEM: UTAMA / DASHBOARD */}
        <button
          onClick={() => {
            setActiveGroup(null);
            navigate('/dashboard');
          }}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
            isUtamaActive
              ? 'text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all ${
              isUtamaActive ? 'text-white shadow-md scale-105' : 'bg-transparent text-slate-400'
            }`}
            style={isUtamaActive ? {
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              boxShadow: `0 4px 12px ${primaryColor}60`,
            } : {}}
          >
            <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-bold mt-1 tracking-tight leading-none ${
              isUtamaActive ? '' : 'text-slate-400'
            }`}
            style={isUtamaActive ? { color: accentColor } : {}}
          >
            Utama
          </span>
          {isUtamaActive && (
            <div className="absolute -top-1 w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />
          )}
        </button>

        {/* 2. DOCK ITEM: TRANSAKSI */}
        <button
          onClick={() => toggleGroup('TRANSAKSI')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
            isGroupActive('TRANSAKSI')
              ? 'text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all ${
              isGroupActive('TRANSAKSI') ? 'text-white shadow-md scale-105' : 'bg-transparent text-slate-400'
            }`}
            style={isGroupActive('TRANSAKSI') ? {
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor}cc)`,
              boxShadow: `0 4px 12px ${primaryColor}60`,
            } : {}}
          >
            <Receipt className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-bold mt-1 tracking-tight leading-none ${
              isGroupActive('TRANSAKSI') ? '' : 'text-slate-400'
            }`}
            style={isGroupActive('TRANSAKSI') ? { color: accentColor } : {}}
          >
            Transaksi
          </span>
          {isGroupActive('TRANSAKSI') && (
            <div className="absolute -top-1 w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />
          )}
        </button>

        {/* 3. DOCK ITEM: AKUNTANSI */}
        <button
          onClick={() => toggleGroup('AKUNTANSI')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
            isGroupActive('AKUNTANSI')
              ? 'text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all ${
              isGroupActive('AKUNTANSI') ? 'text-white shadow-md scale-105' : 'bg-transparent text-slate-400'
            }`}
            style={isGroupActive('AKUNTANSI') ? {
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              boxShadow: `0 4px 12px ${primaryColor}60`,
            } : {}}
          >
            <Layers className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-bold mt-1 tracking-tight leading-none ${
              isGroupActive('AKUNTANSI') ? '' : 'text-slate-400'
            }`}
            style={isGroupActive('AKUNTANSI') ? { color: accentColor } : {}}
          >
            Akuntansi
          </span>
          {isGroupActive('AKUNTANSI') && (
            <div className="absolute -top-1 w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />
          )}
        </button>

        {/* 4. DOCK ITEM: LAPORAN KEUANGAN */}
        <button
          onClick={() => toggleGroup('LAPORAN')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
            isGroupActive('LAPORAN')
              ? 'text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all ${
              isGroupActive('LAPORAN') ? 'text-white shadow-md scale-105' : 'bg-transparent text-slate-400'
            }`}
            style={isGroupActive('LAPORAN') ? {
              background: `linear-gradient(135deg, ${primaryColor}cc, ${accentColor})`,
              boxShadow: `0 4px 12px ${primaryColor}60`,
            } : {}}
          >
            <BarChart3 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-bold mt-1 tracking-tight leading-none ${
              isGroupActive('LAPORAN') ? '' : 'text-slate-400'
            }`}
            style={isGroupActive('LAPORAN') ? { color: accentColor } : {}}
          >
            Laporan
          </span>
          {isGroupActive('LAPORAN') && (
            <div className="absolute -top-1 w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />
          )}
        </button>

        {/* 5. DOCK ITEM: LAINNYA (MASTER & ADMIN) */}
        <button
          onClick={() => toggleGroup('LAINNYA')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
            isGroupActive('LAINNYA')
              ? 'text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all ${
              isGroupActive('LAINNYA') ? 'text-white shadow-md scale-105' : 'bg-transparent text-slate-400'
            }`}
            style={isGroupActive('LAINNYA') ? {
              background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
              boxShadow: `0 4px 12px ${primaryColor}60`,
            } : {}}
          >
            <Grid className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-bold mt-1 tracking-tight leading-none ${
              isGroupActive('LAINNYA') ? '' : 'text-slate-400'
            }`}
            style={isGroupActive('LAINNYA') ? { color: accentColor } : {}}
          >
            Lainnya
          </span>
          {isGroupActive('LAINNYA') && (
            <div className="absolute -top-1 w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />
          )}
        </button>
      </nav>
    </>
  );
};

export default MobileBottomDock;

