import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingContext';
import { Menu, LogOut, ChevronDown, Search, Bell, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';

export const Header = ({ onToggleSidebar, isCollapsed }) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getRoleBadgeColor = (roleCode) => {
    switch (roleCode) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'OWNER': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const roleName = user?.role?.name || user?.role?.code || user?.role || 'Pengguna';
  const roleCode = user?.role?.code || user?.role || '';
  const canManageSettings = roleCode === 'ADMIN' || roleCode === 'OWNER';
  const primaryColor = settings.primary_color || '#4935e4';
  const secondaryColor = settings.secondary_color || '#331ea0';
  const bgColor = settings.bg_color || '#f3f5fd';

  return (
    <header
      style={{ backgroundColor: `${bgColor}E6` }}
      className="hidden md:flex sticky top-0 z-20 backdrop-blur-md px-4 md:px-8 py-3 items-center justify-between gap-4 border-b border-slate-200/50 transition-colors duration-300"
    >
      {/* Left: Sidebar Collapse/Expand Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-xs border border-slate-200/80 transition-all flex items-center justify-center shrink-0"
          title={isCollapsed ? 'Perluas Menu (Tampilkan Teks)' : 'Ciutkan Menu (Hanya Ikon)'}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? (
            <PanelLeft className="w-5 h-5 text-indigo-600" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* Integrated Search Bar */}
        <div className="relative w-full max-w-md hidden sm:flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari transaksi, jurnal, akun, atau laporan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-slate-700 placeholder:text-slate-400 text-xs font-medium pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
      </div>

      {/* Right: Notification Icon & Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Button */}
        <button className="w-9 h-9 rounded-xl bg-white shadow-xs border border-slate-200/90 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all"
          >
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'User'}</p>
              <span className={`inline-block text-[9px] font-semibold px-2 py-0.2 rounded-md border ${getRoleBadgeColor(roleCode)}`}>
                {roleName}
              </span>
            </div>
            
            {/* Avatar Pill */}
            <div
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
              className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
          </button>

          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-20 space-y-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                  <p className="text-[10px] text-slate-500">{roleName}</p>
                </div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pengaturan & Akun
                </div>
                {canManageSettings && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 font-medium transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Pengaturan Aplikasi</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
