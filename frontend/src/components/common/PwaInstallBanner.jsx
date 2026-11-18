import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../../context/SettingContext';

export const PwaInstallBanner = () => {
  const { settings } = useSettings();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  const primaryColor = settings?.primary_color || '#059669';
  const secondaryColor = settings?.secondary_color || '#064e3b';
  const accentColor = settings?.accent_color || '#6ee7b7';

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode standalone (sudah terinstal)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 2. Cek apakah user baru saja dismiss banner dalam 2 hari terakhir
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 2) {
        return; // Jangan ganggu user jika baru di-dismiss
      }
    }

    // 3. Deteksi platform iOS (iPhone/iPad)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // Di iOS Safari tidak ada event beforeinstallprompt, tampilkan banner setelah 2 detik
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 4. Untuk Android, Chrome, Edge, dll.
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Munculkan banner setelah delay halus
      setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Deteksi jika user berhasil menginstal
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(!showIosGuide);
      return;
    }

    if (!deferredPrompt) {
      // Fallback jika browser belum menembakkan event prompt
      alert('Untuk menginstal aplikasi ini, buka menu opsi browser Anda (titik tiga di kanan atas) lalu pilih "Tambahkan ke Layar Utama" / "Instal Aplikasi".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed_at', String(Date.now()));
  };

  if (!showPrompt || installed) {
    return null;
  }

  return (
    <aside aria-label="Instal Aplikasi" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white overflow-hidden">
        {/* Tompel Aksen Header */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none opacity-40 blur-xl"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full pointer-events-none opacity-30 blur-xl"
          style={{ backgroundColor: accentColor }}
        />

        {/* Tombol Tutup Silang */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all"
          aria-label="Tutup pemberitahuan"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Header Konten */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shrink-0 shadow-md shadow-emerald-900/50 flex items-center justify-center overflow-hidden">
            <img
              src="/pwa-192x192.png"
              alt="Moyasin MONEY"
              className="w-full h-full object-cover rounded-[14px]"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider">
                Aplikasi Tersedia
              </span>
            </div>
            <h4 className="text-sm font-black text-white mt-1 leading-snug">
              Instal Moyasin MONEY
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Aplikasi ini bisa diinstal di <b>HP & Tablet</b> untuk akses lebih cepat, nyaman, dan layar penuh tanpa perlu lewat Play Store.
            </p>
          </div>
        </div>

        {/* Panduan Khusus iOS jika diklik */}
        {showIosGuide && (
          <div className="mt-3.5 p-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
            <p className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cara instal di iPhone & iPad (Safari):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
              <li>
                Ketuk tombol <b>Bagikan (Share)</b> <Share className="w-3 h-3 inline mx-0.5 text-cyan-300" /> di bagian bawah layar Safari.
              </li>
              <li>
                Gulir ke bawah, lalu pilih <b>"Tambahkan ke Layar Utama" (Add to Home Screen)</b> <PlusSquare className="w-3 h-3 inline mx-0.5 text-cyan-300" />.
              </li>
              <li>Ketuk <b>Tambah</b> di pojok kanan atas. Selesai!</li>
            </ol>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="mt-4 flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2.5 px-3.5 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              boxShadow: `0 4px 14px ${primaryColor}40`,
            }}
          >
            {isIos ? (
              <>
                <Share className="w-3.5 h-3.5" />
                <span>{showIosGuide ? 'Tutup Panduan' : 'Petunjuk Instal iOS'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Instal di HP / Tablet</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PwaInstallBanner;
