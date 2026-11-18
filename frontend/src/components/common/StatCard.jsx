import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Modern Stat/Metric Card with Organic Accent Blobs ("Warna Tompel")
 * Inspired by modern SaaS & ISAK 35 financial dashboards.
 */
export const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  badge,
  badgeType = 'neutral', // 'positive' | 'negative' | 'neutral' | 'warning' | 'info'
  trendDirection, // 'up' | 'down' | 'neutral'
  color = 'emerald', // 'emerald' | 'rose' | 'cyan' | 'indigo' | 'amber' | 'blue' | 'purple' | 'teal'
  className = '',
  onClick,
  loading = false,
  centered = false,
  verticalCenter = false,
  children,
}) => {
  // Color configuration for blobs, icon container, borders, and badges
  const colorSchemes = {
    emerald: {
      blobTop: 'bg-emerald-400/15',
      blobMid: 'bg-emerald-500/10',
      blobBottom: 'bg-emerald-500/5',
      iconBg: 'bg-emerald-100/70 text-emerald-600 border-emerald-200/40',
      border: 'border-slate-100 hover:border-emerald-200/80',
      shadow: 'hover:shadow-emerald-500/10',
    },
    rose: {
      blobTop: 'bg-rose-400/15',
      blobMid: 'bg-rose-500/10',
      blobBottom: 'bg-rose-500/5',
      iconBg: 'bg-rose-100/70 text-rose-600 border-rose-200/40',
      border: 'border-slate-100 hover:border-rose-200/80',
      shadow: 'hover:shadow-rose-500/10',
    },
    cyan: {
      blobTop: 'bg-cyan-400/15',
      blobMid: 'bg-cyan-500/10',
      blobBottom: 'bg-cyan-500/5',
      iconBg: 'bg-cyan-100/70 text-cyan-600 border-cyan-200/40',
      border: 'border-slate-100 hover:border-cyan-200/80',
      shadow: 'hover:shadow-cyan-500/10',
    },
    indigo: {
      blobTop: 'bg-indigo-400/15',
      blobMid: 'bg-indigo-500/10',
      blobBottom: 'bg-indigo-500/5',
      iconBg: 'bg-indigo-100/70 text-indigo-600 border-indigo-200/40',
      border: 'border-slate-100 hover:border-indigo-200/80',
      shadow: 'hover:shadow-indigo-500/10',
    },
    amber: {
      blobTop: 'bg-amber-400/15',
      blobMid: 'bg-amber-500/10',
      blobBottom: 'bg-amber-500/5',
      iconBg: 'bg-amber-100/70 text-amber-600 border-amber-200/40',
      border: 'border-slate-100 hover:border-amber-200/80',
      shadow: 'hover:shadow-amber-500/10',
    },
    blue: {
      blobTop: 'bg-blue-400/15',
      blobMid: 'bg-blue-500/10',
      blobBottom: 'bg-blue-500/5',
      iconBg: 'bg-blue-100/70 text-blue-600 border-blue-200/40',
      border: 'border-slate-100 hover:border-blue-200/80',
      shadow: 'hover:shadow-blue-500/10',
    },
    purple: {
      blobTop: 'bg-purple-400/15',
      blobMid: 'bg-purple-500/10',
      blobBottom: 'bg-purple-500/5',
      iconBg: 'bg-purple-100/70 text-purple-600 border-purple-200/40',
      border: 'border-slate-100 hover:border-purple-200/80',
      shadow: 'hover:shadow-purple-500/10',
    },
    teal: {
      blobTop: 'bg-teal-400/15',
      blobMid: 'bg-teal-500/10',
      blobBottom: 'bg-teal-500/5',
      iconBg: 'bg-teal-100/70 text-teal-600 border-teal-200/40',
      border: 'border-slate-100 hover:border-teal-200/80',
      shadow: 'hover:shadow-teal-500/10',
    },
  };

  const scheme = colorSchemes[color] || colorSchemes.emerald;

  const badgeStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    negative: 'bg-rose-50 text-rose-700 border-rose-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    neutral: 'bg-slate-100/90 text-slate-600 border-slate-200/70',
  };

  // Kalkulasi ukuran font adaptif yang pas sesuai panjang karakter dan lebar card
  // Mencegah teks terpotong atau keluar batas di semua resolusi layar (mobile, tablet, desktop)
  const getAdaptiveFontSize = (val) => {
    const str = String(val ?? '');
    const len = str.length;
    if (len >= 22) return 'text-[11px] xs:text-xs sm:text-sm md:text-sm lg:text-base';
    if (len >= 18) return 'text-xs xs:text-sm sm:text-base md:text-base lg:text-lg';
    if (len >= 14) return 'text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl';
    if (len >= 11) return 'text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl';
    if (len >= 8)  return 'text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl';
    return 'text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl';
  };

  const hasBottomContent = Boolean(badge || subtitle || children);
  const isCenteredVertically = verticalCenter || !hasBottomContent;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white p-3.5 sm:p-5 lg:p-6 rounded-[24px] sm:rounded-[28px] border shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-300 ${
        scheme.border
      } ${scheme.shadow} ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''} ${className}`}
    >
      {/* ========================================================
          WARNA TOMPEL (Organic Decorative Background Blobs)
          Persis seperti pada gambar referensi (Tompel Kanan Atas,
          Tompel Kanan Tengah, dan Tompel Kiri Bawah).
          ======================================================== */}
      {/* Tompel 1: Kanan Atas (Besar) */}
      <div
        className={`absolute -top-10 -right-10 w-36 h-36 rounded-full ${scheme.blobTop} pointer-events-none transition-transform duration-700 ease-out group-hover:scale-125`}
        style={{
          borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%',
        }}
      />

      {/* Tompel 2: Kanan Tengah/Bawah (Sedang) */}
      <div
        className={`absolute top-1/2 -right-5 w-24 h-24 rounded-full ${scheme.blobMid} pointer-events-none transition-transform duration-700 ease-out group-hover:scale-125 group-hover:translate-x-1`}
        style={{
          borderRadius: '58% 42% 48% 52% / 38% 52% 48% 62%',
        }}
      />

      {/* Tompel 3: Kiri Bawah (Aksen Halus) */}
      <div
        className={`absolute -bottom-8 -left-8 w-24 h-24 rounded-full ${scheme.blobBottom} pointer-events-none transition-transform duration-700 ease-out group-hover:scale-110`}
        style={{
          borderRadius: '50% 50% 35% 65% / 60% 35% 65% 40%',
        }}
      />

      {/* Konten Card */}
      <div
        className={`relative z-10 flex flex-col h-full ${
          isCenteredVertically
            ? 'justify-center items-center text-center my-auto py-1 sm:py-2 space-y-2 sm:space-y-2.5'
            : 'justify-between space-y-2 sm:space-y-3'
        } ${centered ? 'items-center text-center' : ''}`}
      >
        {/* Baris Atas / Tengah: Icon Squircle */}
        {Icon && (
          <div className={`flex items-start ${centered || isCenteredVertically ? 'justify-center w-full' : 'justify-between'}`}>
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[15px] sm:rounded-[18px] border flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105 ${scheme.iconBg}`}
            >
              {React.isValidElement(Icon) ? (
                Icon
              ) : (
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.3]" />
              )}
            </div>
          </div>
        )}

        {/* Bagian Nominal & Judul (Font otomatis mengecil jika panjang, tanpa ...) */}
        <div className={`w-full max-w-full overflow-hidden ${centered || isCenteredVertically ? 'text-center flex flex-col items-center' : ''} space-y-0.5 sm:space-y-1`}>
          {title && (
            <span
              title={title}
              className="text-[9px] xs:text-[10px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase block font-sans truncate w-full"
            >
              {title}
            </span>
          )}
          <div className="w-full max-w-full flex items-center justify-center overflow-hidden">
            <p
              title={typeof value === 'string' ? value : undefined}
              className={`${getAdaptiveFontSize(value)} font-black tracking-tight font-mono text-slate-800 leading-tight whitespace-nowrap overflow-visible`}
            >
              {loading ? (
                <span className="inline-block animate-pulse text-slate-300">...</span>
              ) : (
                value
              )}
            </p>
          </div>
        </div>

        {/* Bagian Bawah: Badge Status / Trend & Subtitle */}
        {hasBottomContent && (
          <div
            className={`flex items-center gap-1 sm:gap-1.5 pt-0.5 text-xs ${
              centered || isCenteredVertically
                ? 'flex-col justify-center items-center text-center w-full'
                : 'flex-wrap gap-1.5 sm:gap-2'
            }`}
          >
            {badge && (
              <span
                className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full font-bold border text-[10px] sm:text-[11px] tracking-tight shrink-0 ${
                  badgeStyles[badgeType] || badgeStyles.neutral
                }`}
              >
                {trendDirection === 'up' && <TrendingUp className="w-3 h-3" />}
                {trendDirection === 'down' && <TrendingDown className="w-3 h-3" />}
                {trendDirection === 'neutral' && <Minus className="w-3 h-3" />}
                <span>{badge}</span>
              </span>
            )}
            {subtitle && (
              <span
                className={`text-slate-400 font-medium text-[10px] sm:text-xs leading-normal truncate max-w-full text-center ${
                  centered || isCenteredVertically ? 'w-full block' : 'leading-none'
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

/**
 * Wrapper Container Card with subtle "Warna Tompel" background
 * For generic widgets, tables, and form cards.
 */
export const TompelCard = ({
  children,
  color = 'indigo',
  className = '',
}) => {
  const colorSchemes = {
    indigo: {
      blobTop: 'bg-indigo-400/10',
      blobMid: 'bg-indigo-500/5',
      border: 'border-slate-200/80',
    },
    emerald: {
      blobTop: 'bg-emerald-400/10',
      blobMid: 'bg-emerald-500/5',
      border: 'border-emerald-200/60',
    },
    rose: {
      blobTop: 'bg-rose-400/10',
      blobMid: 'bg-rose-500/5',
      border: 'border-rose-200/60',
    },
  };

  const scheme = colorSchemes[color] || colorSchemes.indigo;

  return (
    <div
      className={`group relative overflow-hidden bg-white rounded-[28px] border shadow-[0_4px_24px_rgba(0,0,0,0.03)] ${
        scheme.border
      } ${className}`}
    >
      <div
        className={`absolute -top-14 -right-14 w-44 h-44 rounded-full ${scheme.blobTop} pointer-events-none transition-transform duration-700 group-hover:scale-115`}
        style={{ borderRadius: '42% 58% 65% 35% / 45% 60% 40% 55%' }}
      />
      <div
        className={`absolute top-2/3 -right-6 w-28 h-28 rounded-full ${scheme.blobMid} pointer-events-none transition-transform duration-700 group-hover:scale-120`}
        style={{ borderRadius: '58% 42% 48% 52% / 38% 52% 48% 62%' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default StatCard;
