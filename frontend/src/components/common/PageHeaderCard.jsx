import React from 'react';
import { useSettings } from '../../context/SettingContext';
import { Sparkles } from 'lucide-react';

/**
 * Reusable Page Header Card with dynamic theme gradient from Settings
 * Supports centered layout on mobile, elegant blobs, icon badge, and actions.
 */
export const PageHeaderCard = ({
  icon: Icon,
  badge,
  badgeIcon: BadgeIcon = Sparkles,
  title,
  subtitle,
  actions,
  children,
  className = '',
  hideActionsOnMobile = false,
}) => {
  const { settings } = useSettings();
  const primaryColor = settings?.primary_color || '#4935e4';
  const secondaryColor = settings?.secondary_color || '#331ea0';
  const accentColor = settings?.accent_color || '#67e8f9';

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
      }}
      className={`p-5 sm:p-6 lg:p-7 rounded-[26px] sm:rounded-[32px] text-white shadow-xl relative overflow-hidden flex flex-col transition-all duration-300 ${className}`}
    >
      {/* Decorative Organic Tompel Blobs */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none"
        style={{ borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%' }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none"
        style={{ borderRadius: '58% 42% 48% 52% / 38% 52% 48% 62%' }}
      />
      <div
        style={{ backgroundColor: `${accentColor}25` }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-36 rounded-full blur-3xl pointer-events-none"
      />

      {/* Main Bar: Content & Actions */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Konten Judul & Icon: Rata Tengah di HP, Rata Kiri di PC */}
        <div className="flex flex-col md:flex-row items-center md:items-center gap-3.5 sm:gap-4 text-center md:text-left w-full md:w-auto">
          {Icon && (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center font-bold shadow-lg shadow-black/10 shrink-0">
              {React.isValidElement(Icon) ? (
                Icon
              ) : (
                <Icon className="w-6 h-6 stroke-[2.2]" />
              )}
            </div>
          )}

          <div className="flex flex-col items-center md:items-start">
            {badge && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-white/90 mb-1">
                {BadgeIcon && <BadgeIcon className="w-3 h-3 text-cyan-200" />}
                <span>{badge}</span>
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/85 mt-0.5 font-medium max-w-xl text-center md:text-left leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {actions && (
          <div
            className={`relative z-10 ${
              hideActionsOnMobile ? 'hidden md:flex' : 'flex'
            } flex-wrap items-center justify-center md:justify-end gap-2.5 shrink-0 w-full md:w-auto`}
          >
            {actions}
          </div>
        )}
      </div>

      {/* Optional Children (misal tabs, extra info) */}
      {children && (
        <div className="relative z-10 w-full pt-4 mt-4 border-t border-white/15">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeaderCard;

