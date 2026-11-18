import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import settingService from '../services/settingService';

export const SETTINGS_STORAGE_KEY = 'curadoc_app_settings_v1';

export const DEFAULT_SETTINGS = {
  app_name: 'Curadoc',
  app_badge: 'MONEY',
  organization_name: 'Yayasan ISAK 35',
  organization_full_name: 'YAYASAN ISAK 35 INDONESIA',
  organization_tagline: 'Yayasan Yatim Piatu, Dhuafa, dan Lansia',
  organization_address: 'Jl. Sosial Kemanusiaan No. 35, Indonesia',
  organization_phone: '(021) 555-0135',
  organization_email: 'keuangan@yayasan-isak35.or.id',
  logo_url: '',
  logo_icon: 'Sparkles',
  theme_preset: 'indigo',
  primary_color: '#4935e4',
  secondary_color: '#331ea0',
  accent_color: '#67e8f9',
  bg_color: '#f3f5fd',
  report_preparer_name: 'Staf Akuntansi & Keuangan',
  report_preparer_role: 'Bagian Keuangan Yayasan',
  report_approver_name: 'Ketua Pengurus Yayasan',
  report_approver_role: 'Pimpinan Lembaga',
  show_sidebar_promo: 'true',
};

export const THEME_PRESETS = [
  {
    id: 'indigo',
    name: 'Royal Indigo (Default)',
    description: 'Gradasi ungu-biru modern dengan aksen cyan cerah',
    primary_color: '#4935e4',
    secondary_color: '#331ea0',
    accent_color: '#67e8f9',
    bg_color: '#f3f5fd',
  },
  {
    id: 'emerald',
    name: 'Emerald Nirlaba',
    description: 'Nuansa hijau zamrud yang asri dan menenangkan',
    primary_color: '#059669',
    secondary_color: '#064e3b',
    accent_color: '#6ee7b7',
    bg_color: '#f0fdf4',
  },
  {
    id: 'blue',
    name: 'Ocean Corporate',
    description: 'Biru profesional korporat yang tegas dan bersih',
    primary_color: '#1d4ed8',
    secondary_color: '#1e3a8a',
    accent_color: '#7dd3fc',
    bg_color: '#f0f9ff',
  },
  {
    id: 'slate',
    name: 'Dark Slate Executive',
    description: 'Tampilan gelap elegan berkelas eksekutif',
    primary_color: '#1e293b',
    secondary_color: '#0f172a',
    accent_color: '#38bdf8',
    bg_color: '#f8fafc',
  },
  {
    id: 'teal',
    name: 'Teal Harmoni',
    description: 'Perpaduan hijau toska dan biru laut yang seimbang',
    primary_color: '#0d9488',
    secondary_color: '#115e59',
    accent_color: '#5eead4',
    bg_color: '#f0fdfa',
  },
  {
    id: 'purple',
    name: 'Violet Prestige',
    description: 'Ungu royal dengan sentuhan aksen lavender',
    primary_color: '#7c3aed',
    secondary_color: '#4c1d95',
    accent_color: '#f0abfc',
    bg_color: '#faf5ff',
  },
  {
    id: 'rose',
    name: 'Crimson Sosial',
    description: 'Merah marun hangat dan penuh semangat kemanusiaan',
    primary_color: '#be123c',
    secondary_color: '#881337',
    accent_color: '#fda4af',
    bg_color: '#fff1f2',
  },
  {
    id: 'amber',
    name: 'Warm Bronze',
    description: 'Nuansa emas kecokelatan klasik yang hangat',
    primary_color: '#b45309',
    secondary_color: '#78350f',
    accent_color: '#fde68a',
    bg_color: '#fffbeb',
  },
];

let memorySettings = null;

export const setMemorySettings = (newSettings) => {
  if (!newSettings) return;
  memorySettings = { ...DEFAULT_SETTINGS, ...(memorySettings || {}), ...newSettings };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(memorySettings));
  } catch (e) {
    // Fallback without large base64 logo_url if quota exceeded
    try {
      const { logo_url, ...lightSettings } = memorySettings;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(lightSettings));
    } catch (innerErr) {
      console.error('Failed to save settings to localStorage:', innerErr);
    }
  }
};

export const getStoredSettings = () => {
  let stored = {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read stored settings:', e);
  }
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    ...(memorySettings || {}),
  };
};

const SettingContext = createContext(null);

export const SettingProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => getStoredSettings());
  const [loading, setLoading] = useState(false);

  const syncToDomAndStorage = useCallback((newSettings) => {
    setMemorySettings(newSettings);

    // Update document title
    const appTitle = [
      newSettings.app_name || 'Curadoc',
      newSettings.app_badge || '',
    ]
      .filter(Boolean)
      .join(' ');
    const orgName = newSettings.organization_name || '';
    document.title = orgName ? `${appTitle} — ${orgName}` : appTitle;

    // Update favicon if logo_url is provided
    if (newSettings.logo_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = newSettings.logo_url;
    }

    // Set CSS variables on root for easy styling
    const root = document.documentElement;
    root.style.setProperty('--app-primary', newSettings.primary_color || '#4935e4');
    root.style.setProperty('--app-secondary', newSettings.secondary_color || '#331ea0');
    root.style.setProperty('--app-accent', newSettings.accent_color || '#67e8f9');
    root.style.setProperty('--app-bg', newSettings.bg_color || '#f3f5fd');
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settingService.getSettings();
      if (res?.success && res.data) {
        const merged = { ...DEFAULT_SETTINGS, ...res.data };
        setSettings(merged);
        syncToDomAndStorage(merged);
      }
    } catch (err) {
      // Fallback to localStorage/defaults silently
    } finally {
      setLoading(false);
    }
  }, [syncToDomAndStorage]);

  useEffect(() => {
    syncToDomAndStorage(settings);
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newValues) => {
    const optimistic = { ...settings, ...newValues };
    setSettings(optimistic);
    syncToDomAndStorage(optimistic);

    const res = await settingService.updateSettings(optimistic);
    if (res?.success && res.data) {
      const confirmed = { ...DEFAULT_SETTINGS, ...res.data };
      setSettings(confirmed);
      syncToDomAndStorage(confirmed);
    }
    return res;
  };

  const resetToDefault = async () => {
    return await saveSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingContext.Provider
      value={{
        settings,
        loading,
        saveSettings,
        resetToDefault,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingContext);
  if (!ctx) {
    return {
      settings: getStoredSettings(),
      loading: false,
      saveSettings: async () => {},
      resetToDefault: async () => {},
      refreshSettings: async () => {},
    };
  }
  return ctx;
};

export default SettingContext;

