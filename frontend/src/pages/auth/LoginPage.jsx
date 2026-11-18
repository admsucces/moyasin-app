import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingContext';
import { ICON_MAP } from '../../components/navigation/Sidebar';
import { Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const primaryColor = settings.primary_color || '#4935e4';
  const secondaryColor = settings.secondary_color || '#331ea0';
  const BrandIcon = ICON_MAP[settings.logo_icon] || Sparkles;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg(res.message || 'Email atau password salah.');
        if (res.errors) {
          setFieldErrors(res.errors);
        }
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan atau server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-800/20 space-y-6">
      <div className="text-center space-y-2">
        <div
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }}
          className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-xl mx-auto shadow-lg overflow-hidden p-1.5"
        >
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.app_name || 'Logo'}
              className="w-full h-full object-contain"
            />
          ) : (
            <BrandIcon className="w-7 h-7 text-white" />
          )}
        </div>
        <div className="pt-1">
          <h1 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-1.5">
            <span>{settings.app_name || 'Curadoc'}</span>
            {settings.app_badge && (
              <span
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                  borderColor: `${primaryColor}30`,
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase"
              >
                {settings.app_badge}
              </span>
            )}
          </h1>
          <p className="text-xs font-semibold text-slate-700 mt-1">
            {settings.organization_name || 'Yayasan ISAK 35'}
          </p>
          <p className="text-[11px] text-slate-500">
            {settings.organization_tagline || 'Yayasan Yatim Piatu, Dhuafa, dan Lansia'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.org"
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${fieldErrors.email ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'} rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all`}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi (Password)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${fieldErrors.password ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'} rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all`}
            />
          </div>
          {fieldErrors.password && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.password[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }}
          className="w-full py-3 hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Masuk ke Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
        Prinsip Double-Entry Accounting • ISAK 35
      </div>
    </div>
  );
};

export default LoginPage;
