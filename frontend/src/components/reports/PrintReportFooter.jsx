import React from 'react';
import { useSettings } from '../../context/SettingContext';

export const PrintReportFooter = () => {
  const { settings } = useSettings();
  const brandTitle = [settings.app_name || 'Curadoc', settings.app_badge].filter(Boolean).join(' ');

  const todayStr = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="print-report-footer mt-10 pt-6 hidden print:block text-slate-900 page-break-inside-avoid border-t border-slate-300">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mb-8">
        <span>{brandTitle} &bull; Sistem Informasi Akuntansi Entitas Nirlaba</span>
        <span>Tanggal Pengesahan: {todayStr}</span>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-8 text-center text-xs font-semibold">
        {/* Column 1: Penyusun */}
        <div className="flex flex-col justify-between h-32">
          <p className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">
            Dibuat Oleh (Penyusun)
          </p>
          <div>
            <p className="font-bold text-slate-900 border-b border-slate-900 inline-block px-10 pb-0.5">
              {settings.report_preparer_name || 'Staf Akuntansi & Keuangan'}
            </p>
            <p className="text-[10px] text-slate-500 font-normal pt-1">
              {settings.report_preparer_role || 'Bagian Keuangan Yayasan'}
            </p>
          </div>
        </div>

        {/* Column 2: Disetujui */}
        <div className="flex flex-col justify-between h-32">
          <p className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">
            Disetujui Oleh
          </p>
          <div>
            <p className="font-bold text-slate-900 border-b border-slate-900 inline-block px-10 pb-0.5">
              {settings.report_approver_name || 'Ketua Pengurus Yayasan'}
            </p>
            <p className="text-[10px] text-slate-500 font-normal pt-1">
              {settings.report_approver_role || 'Pimpinan Lembaga'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintReportFooter;
