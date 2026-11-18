import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import Header from '../components/navigation/Header';
import MobileBottomDock from '../components/navigation/MobileBottomDock';
import { useSettings } from '../context/SettingContext';

export const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const { settings } = useSettings();

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div
      style={{ backgroundColor: settings.bg_color || '#f3f5fd' }}
      className="min-h-screen flex transition-colors duration-300"
    >
      {/* Sidebar Navigation (Desktop & Tablet) - Collapsible to Icon Only */}
      <Sidebar isCollapsed={sidebarCollapsed} setIsCollapsed={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <Header
          isCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />
        
        <main className="flex-1 px-3 md:px-8 pt-3 md:pt-4 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Dock Menu per Group (Tampil Khusus di HP) */}
      <MobileBottomDock />
    </div>
  );
};

export default AppLayout;
