import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Memuat data pengguna...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role?.code || user?.role || '';
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-xs max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
          403
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Akses Ditolak</h2>
        <p className="text-xs text-slate-600 mb-6">
          Anda tidak memiliki hak akses (permission) untuk mengakses halaman ini.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
        >
          Kembali
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
