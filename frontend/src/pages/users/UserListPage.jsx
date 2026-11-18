import React, { useState, useEffect } from 'react';
import userService from '../../services/userService';
import Pagination from '../../components/common/Pagination';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  X,
  Lock,
  Mail,
  User as UserIcon,
  Shield
} from 'lucide-react';

export const UserListPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [meta, setMeta] = useState({ page: 1, per_page: 25, total: 0, total_pages: 1 });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role_id: '2', // default Pengelola (2)
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const rolesList = [
    { id: '1', code: 'ADMIN', name: 'Admin' },
    { id: '2', code: 'PENGELOLA', name: 'Pengelola' },
    { id: '3', code: 'OWNER', name: 'Owner' },
  ];

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        per_page: 25,
      };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await userService.getUsers(params);
      if (res.success && res.data) {
        setUsers(Array.isArray(res.data) ? res.data : res.data.data || []);
        if (res.meta) {
          setMeta(res.meta);
        } else {
          setMeta(prev => ({ ...prev, page, total: (res.data || []).length }));
        }
      } else {
        setError(res.message || 'Gagal mengambil data pengguna.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [search, roleFilter, statusFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role_id: '2', password: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role_id: String(user.role_id || user.role?.id || '2'),
      password: '', // optional on edit
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setFormSubmitting(true);

    try {
      let res;
      if (editingUser) {
        const payload = {
          name: formData.name,
          email: formData.email,
          role_id: Number(formData.role_id),
        };
        if (formData.password) payload.password = formData.password;
        res = await userService.updateUser(editingUser.id, payload);
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          role_id: Number(formData.role_id),
          password: formData.password,
        };
        res = await userService.createUser(payload);
      }

      if (res.success) {
        setModalOpen(false);
        showToast(editingUser ? 'Pengguna berhasil diperbarui.' : 'Pengguna baru berhasil dibuat.');
        fetchUsers();
      } else {
        if (res.errors) setFormErrors(res.errors);
        else showToast(res.message || 'Gagal menyimpan pengguna.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMsg = user.status === 'ACTIVE'
      ? `Apakah Anda yakin ingin MENONAKTIFKAN akun ${user.name}? User ini tidak akan dapat login.`
      : `Apakah Anda yakin ingin MENGAKTIFKAN kembali akun ${user.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await userService.toggleUserStatus(user.id, newStatus);
      if (res.success) {
        showToast(`Status ${user.name} diubah menjadi ${newStatus}.`);
        fetchUsers();
      } else {
        showToast(res.message || 'Gagal mengubah status pengguna.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat mengubah status.');
    }
  };

  const getRoleBadge = (role) => {
    const code = role?.code || role || '';
    switch (code) {
      case 'ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">Admin</span>;
      case 'OWNER':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Owner</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Pengelola</span>;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Aktif</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"><XCircle className="w-3 h-3" /> Nonaktif</span>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={Users}
        badge="Pengaturan Akses"
        title="Manajemen Pengguna (Users)"
        subtitle="Kelola akun, role, dan hak akses pengguna sistem keuangan"
        actions={
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-2 transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            Tambah User Baru
          </button>
        }
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-lg">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama atau email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Role</option>
            <option value="ADMIN">Admin</option>
            <option value="PENGELOLA">Pengelola</option>
            <option value="OWNER">Owner</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Data List (Cards on Mobile/Tablet, Table on PC) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Memuat data pengguna...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">Tidak ada data pengguna ditemukan.</div>
        ) : (
          <>
            {/* MOBILE & TABLET CARD VIEW */}
            <div className="lg:hidden p-4 bg-slate-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {users.map((u) => {
                  const uRoleCode = u.role?.code || u.role || '';
                  const isActive = u.status === 'ACTIVE';

                  return (
                    <div
                      key={u.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          !isActive
                            ? 'bg-slate-400'
                            : uRoleCode === 'ADMIN'
                            ? 'bg-purple-500'
                            : uRoleCode === 'OWNER'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />

                      <div className="space-y-3 pl-1.5">
                        {/* Header: Avatar Inisial, Nama, Email & Status */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                uRoleCode === 'ADMIN'
                                  ? 'bg-purple-50 border-purple-100 text-purple-700'
                                  : uRoleCode === 'OWNER'
                                  ? 'bg-amber-50 border-amber-100 text-amber-700'
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              }`}
                            >
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                                {u.name}
                              </h4>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 min-w-0 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{u.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0">{getStatusBadge(u.status)}</div>
                        </div>

                        {/* Role & Terakhir Login */}
                        <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Shield className="w-3.5 h-3.5 text-slate-400" />
                            {getRoleBadge(u.role)}
                          </div>
                          <div className="text-right min-w-0">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                              Terakhir Login
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium block truncate mt-0.5">
                              {u.last_login_at
                                ? new Date(u.last_login_at).toLocaleString('id-ID')
                                : 'Belum pernah'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Aksi */}
                      <div className="pl-1.5 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Nama & Email</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Terakhir Login</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4">{getStatusBadge(u.status)}</td>
                      <td className="px-6 py-4 text-slate-400 text-[11px]">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString('id-ID') : 'Belum pernah'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${
                            u.status === 'ACTIVE' 
                              ? 'text-rose-600 hover:bg-rose-50' 
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          currentPage={meta.page}
          totalItems={meta.total}
          itemsPerPage={meta.per_page || 25}
          onPageChange={(page) => fetchUsers(page)}
        />
      </div>

      {/* Modal Form Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama Pengelola / Owner / Admin"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.org"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {formErrors.email && <p className="text-[11px] text-rose-600 mt-1">{formErrors.email[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Peran</label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>
                {formErrors.role_id && <p className="text-[11px] text-rose-600 mt-1">{formErrors.role_id[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {formErrors.password && <p className="text-[11px] text-rose-600 mt-1">{formErrors.password[0]}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-60"
                >
                  {formSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;
