import React from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingContext';
import { 
  LayoutDashboard, 
  Receipt, 
  BookOpen, 
  BookMarked,
  Users, 
  FileText, 
  Layers, 
  Database, 
  CheckSquare,
  Landmark,
  CalendarCheck,
  History,
  BarChart3,
  PieChart,
  Scale,
  Building2,
  FileCheck2,
  FolderKanban,
  Sparkles,
  ExternalLink,
  Settings,
  ShieldCheck,
  HeartHandshake,
  Coins,
  Wallet,
  Globe,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

export const ICON_MAP = {
  Sparkles,
  Landmark,
  Building2,
  ShieldCheck,
  HeartHandshake,
  Coins,
  Wallet,
  Globe,
};

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const role = user?.role?.code || user?.role || '';

  const isAdmin = role === 'ADMIN';
  const isOwner = role === 'OWNER';
  const isPengelola = role === 'PENGELOLA' || role === 'MANAGER' || role === 'OPERATOR';

  const primaryColor = settings.primary_color || '#4935e4';
  const secondaryColor = settings.secondary_color || '#331ea0';
  const accentColor = settings.accent_color || '#67e8f9';
  const BrandIcon = ICON_MAP[settings.logo_icon] || Sparkles;

  const menuSections = [
    {
      title: 'UTAMA',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] }
      ]
    },
    {
      title: 'TRANSAKSI',
      items: [
        { name: 'Transaksi', path: '/transactions', icon: Receipt, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] }
      ]
    },
    {
      title: 'APPROVAL',
      items: [
        { name: 'Approval Queue', path: '/approvals/pending', icon: CheckSquare, roles: ['OWNER'] }
      ]
    },
    {
      title: 'AKUNTANSI',
      items: [
        { name: 'Jurnal', path: '/accounting/journals', icon: FileText, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Buku Besar', path: '/accounting/ledger', icon: Layers, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Buku Besar Pembantu', path: '/accounting/sub-ledger', icon: BookMarked, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Neraca Saldo', path: '/accounting/trial-balance', icon: Landmark, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Neraca Penutup', path: '/accounting/post-closing-trial-balance', icon: Scale, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Saldo Awal', path: '/accounting/initial-balances', icon: BookOpen, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Aset Tetap', path: '/accounting/fixed-assets', icon: Building2, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Hutang & Piutang', path: '/accounting/payables-receivables', icon: FileCheck2, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Periode Akuntansi', path: '/accounting/periods', icon: CalendarCheck, roles: ['ADMIN', 'OWNER'] }
      ]
    },
    {
      title: 'LAPORAN KEUANGAN',
      items: [
        { name: 'Posisi Keuangan (Neraca)', path: '/reports/balance-sheet', icon: Landmark, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Penghasilan Komprehensif', path: '/reports/income-statement', icon: FileText, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Perubahan Aset Neto', path: '/reports/changes-in-net-assets', icon: Layers, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Arus Kas', path: '/reports/cash-flows', icon: BarChart3, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Laporan Manajerial', path: '/reports/management', icon: PieChart, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] }
      ]
    },
    {
      title: 'MASTER DATA',
      items: [
        { name: 'Chart of Accounts', path: '/master/coa', icon: Database, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Program', path: '/master/programs', icon: FolderKanban, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Data Rekanan', path: '/master/rekanan', icon: Users, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] },
        { name: 'Kas & Bank', path: '/master/cash-bank', icon: Landmark, roles: ['ADMIN', 'PENGELOLA', 'OWNER'] }
      ]
    },
    {
      title: 'ADMINISTRASI',
      items: [
        { name: 'Users', path: '/users', icon: Users, roles: ['ADMIN'] },
        { name: 'Audit Log', path: '/audit-logs', icon: History, roles: ['ADMIN', 'OWNER'] },
        { name: 'Pengaturan', path: '/settings', icon: Settings, roles: ['ADMIN', 'OWNER'] }
      ]
    }
  ];

  return (
    <>
      {/* Sidebar Container (Desktop/Tablet Only) - Collapsible to Icon-Only */}
      <aside
        style={{
          background: `linear-gradient(180deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        } text-white flex-col transition-all duration-300 ease-in-out shadow-2xl md:rounded-r-2xl select-none`}
      >
        {/* Brand Logo Header */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          } py-4 border-b border-white/10`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #ffffff80)`,
              }}
              className="w-10 h-10 rounded-xl p-0.5 shadow-md shrink-0 overflow-hidden cursor-pointer"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Klik untuk memperluas menu' : undefined}
            >
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-full h-full rounded-[10px] flex items-center justify-center text-white font-bold text-lg tracking-wider overflow-hidden"
              >
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={settings.app_name || 'Logo'}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <BrandIcon style={{ color: accentColor }} className="w-5 h-5" />
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                  <span className="truncate">{settings.app_name || 'Curadoc'}</span>
                  {settings.app_badge && (
                    <span
                      style={{
                        color: accentColor,
                        borderColor: `${accentColor}4D`,
                        backgroundColor: `${accentColor}26`,
                      }}
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded-md border"
                    >
                      {settings.app_badge}
                    </span>
                  )}
                </h1>
                <p className="text-[10px] text-white/75 font-medium truncate">
                  {settings.organization_name || 'Yayasan ISAK 35'}
                </p>
              </div>
            )}
          </div>

          {/* Toggle Button in Sidebar Header (Tablet & PC) */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors shrink-0"
              title="Ciutkan Menu (Hanya Ikon)"
              aria-label="Ciutkan Menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav
          className={`flex-1 overflow-y-auto ${
            isCollapsed ? 'px-2 space-y-2.5' : 'px-3.5 space-y-4'
          } py-3 custom-scrollbar`}
        >
          {menuSections.map((section, idx) => {
            const allowedItems = section.items.filter(
              (item) =>
                (item.roles.includes('ADMIN') && isAdmin) ||
                (item.roles.includes('OWNER') && isOwner) ||
                (item.roles.includes('PENGELOLA') && isPengelola)
            );

            if (allowedItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!isCollapsed ? (
                  <p className="px-3 text-[10px] font-semibold tracking-wider text-white/55 uppercase">
                    {section.title}
                  </p>
                ) : (
                  <div className="my-1.5 border-t border-white/10 mx-2" />
                )}

                {allowedItems.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={itemIdx}
                      to={item.path}
                      className={({ isActive }) => `
                        relative flex items-center ${
                          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
                        } rounded-xl text-xs font-medium transition-all duration-200 group
                        ${
                          isActive
                            ? 'bg-white/20 text-white shadow-xs backdrop-blur-md font-semibold'
                            : 'text-white/75 hover:text-white hover:bg-white/10'
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            style={isActive ? { color: accentColor } : undefined}
                            className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0 ${
                              isActive ? '' : 'text-white/75'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                          {isActive && !isCollapsed && (
                            <div
                              style={{
                                backgroundColor: accentColor,
                                boxShadow: `0 0 6px ${accentColor}`,
                              }}
                              className="absolute right-3 w-1.5 h-1.5 rounded-full"
                            />
                          )}

                          {/* Floating Tooltip on Hover when Collapsed */}
                          {isCollapsed && (
                            <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-900/95 text-white text-[11px] font-bold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                              {item.name}
                            </div>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Bottom Section (Toggle / Promo Card) */}
        <div className="p-3 border-t border-white/10">
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-full py-2.5 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all group relative"
              title="Perluas Menu Lengkap"
              aria-label="Perluas Menu Lengkap"
            >
              <PanelLeft className="w-5 h-5" />
              <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-900/95 text-white text-[11px] font-bold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                Perluas Menu
              </div>
            </button>
          ) : (
            settings.show_sidebar_promo !== 'false' && (
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20 text-white text-center shadow-md relative overflow-hidden group">
                <div
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${primaryColor})`,
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-xs mx-auto mb-1.5 group-hover:scale-105 transition-transform"
                >
                  <FolderKanban className="w-4.5 h-4.5 text-white" />
                </div>
                <h4 className="text-xs font-semibold tracking-tight text-white">Dokumen & Panduan</h4>
                <p className="text-[10px] text-white/80 mt-0.5 mb-2 leading-tight">
                  Akses berkas & standar ISAK 35
                </p>
                <button
                  onClick={() => window.open('/reports/balance-sheet', '_self')}
                  className="w-full py-1 px-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold transition-all border border-white/30 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Buka Laporan</span>
                  <ExternalLink style={{ color: accentColor }} className="w-3 h-3" />
                </button>
              </div>
            )
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
