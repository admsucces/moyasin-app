import React from 'react';
import { Landmark } from 'lucide-react';
import { useSettings } from '../../context/SettingContext';

export const PrintReportHeader = ({ title, subtitle, periodLabel }) => {
  const { settings } = useSettings();
  const brandTitle = [settings.app_name || 'Curadoc', settings.app_badge].filter(Boolean).join(' ');
  const orgFullName = settings.organization_full_name || settings.organization_name || 'YAYASAN ISAK 35 INDONESIA';

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="print-report-header mb-6 hidden print:block text-slate-900 font-sans">
      {/* Official Lembaga Kop Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-lg border-2 border-slate-900 flex items-center justify-center text-slate-900">
            <Landmark className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wide text-slate-900 uppercase">
              {orgFullName}
            </h1>
            <p className="text-[11px] text-slate-600 font-medium">
              Sistem Pelaporan Keuangan Entitas Nirlaba Standar ISAK 35
            </p>
            <p className="text-[10px] text-slate-500">
              {brandTitle} Enterprise Edition
            </p>
          </div>
        </div>

        <div className="text-right text-[10px] text-slate-600 font-mono space-y-0.5">
          <div className="font-bold text-slate-900 border border-slate-900 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider inline-block">
            DOKUMEN RESMI ISAK 35
          </div>
          <div>Dicetak: {currentDateStr}</div>
        </div>
      </div>

      {/* Official Report Title & Subtitle */}
      <div className="text-center pt-4 pb-2">
        <h2 className="text-base font-black uppercase text-slate-900 tracking-wider">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            {subtitle}
          </p>
        )}
        {periodLabel && (
          <p className="text-xs font-medium text-slate-600 font-mono mt-0.5">
            {periodLabel}
          </p>
        )}
        <div className="flex justify-end mt-1">
          <span className="text-[10px] italic text-slate-500 font-mono">
            (Disajikan dalam Rupiah, kecuali dinyatakan lain)
          </span>
        </div>
      </div>
    </div>
  );
};

export default PrintReportHeader;
