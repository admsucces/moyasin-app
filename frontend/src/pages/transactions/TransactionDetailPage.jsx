import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transactionService } from '../../services/transactionService';
import approvalService from '../../services/approvalService';
import journalService from '../../services/journalService';
import reversalService from '../../services/reversalService';
import useAuth from '../../hooks/useAuth';
import PageHeaderCard from '../../components/common/PageHeaderCard';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Upload, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User, 
  Calendar, 
  Paperclip, 
  CheckSquare,
  BookOpen,
  RotateCcw,
  Edit3,
  Trash2,
  X
} from 'lucide-react';

export const TransactionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role || '';
  const isOwner = roleCode === 'OWNER';
  const isAdmin = roleCode === 'ADMIN';
  const canManage = roleCode === 'ADMIN' || roleCode === 'PENGELOLA';

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Reversal Modal State
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await transactionService.getTransaction(id);
      if (res.success && res.data) {
        setTransaction(res.data);
      } else {
        setToastMsg('Gagal memuat detail transaksi.');
      }
    } catch (err) {
      setToastMsg('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const res = await transactionService.uploadAttachment(id, selectedFile);
      if (res.success) {
        showToast('Bukti transaksi berhasil diunggah.');
        setSelectedFile(null);
        fetchDetail();
      } else {
        showToast(res.message || 'Gagal mengunggah bukti transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi saat upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitTransaction = async () => {
    if (!window.confirm('Apakah Anda yakin ingin mengajukan (submit) transaksi ini?')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await transactionService.submitTransaction(id);
      if (res.success) {
        showToast('Transaksi berhasil diajukan (SUBMITTED).');
        fetchDetail();
      } else {
        showToast(res.message || 'Gagal mengajukan transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerApprove = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menyetujui (APPROVE) transaksi ini?')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await approvalService.approveTransaction(id, 'Disetujui oleh Owner.');
      if (res.success) {
        showToast('Transaksi berhasil disetujui (APPROVED).');
        fetchDetail();
      } else {
        showToast(res.message || 'Gagal menyetujui transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi saat approval.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setSubmitting(true);
    try {
      const res = await approvalService.rejectTransaction(id, rejectReason);
      if (res.success) {
        showToast('Transaksi berhasil ditolak (REJECTED).');
        setRejectModalOpen(false);
        fetchDetail();
      } else {
        showToast(res.message || 'Gagal menolak transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostTransaction = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memposting transaksi ini ke Jurnal Umum?')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await journalService.postTransaction(id);
      if (res && res.success) {
        showToast('Transaksi berhasil diposting ke Jurnal Umum (POSTED).');
        fetchDetail();
      } else {
        showToast(res?.message || 'Gagal memposting transaksi.');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan koneksi saat posting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReversal = async (e) => {
    e.preventDefault();
    if (!reversalReason.trim()) return;

    setSubmitting(true);
    try {
      const res = await reversalService.reverseTransaction(id, reversalReason);
      if (res && res.success) {
        showToast('Transaksi berhasil di-reverse (Dibalik). Jurnal pembalik telah diposting.');
        setReverseModalOpen(false);
        fetchDetail();
      } else {
        showToast(res?.message || 'Gagal membalik transaksi.');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan koneksi saat reversal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus transaksi ${transaction?.transaction_no || ''}? Data yang dihapus tidak dapat dikembalikan.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await transactionService.deleteTransaction(id);
      if (res.success) {
        showToast('Transaksi berhasil dihapus.');
        navigate('/transactions');
      } else {
        showToast(res.message || 'Gagal menghapus transaksi.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Draft</span>;
      case 'SUBMITTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Send className="w-3 h-3" /> Diajukan</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><CheckSquare className="w-3 h-3" /> Disetujui</span>;
      case 'POSTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Posted</span>;
      case 'REVERSED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"><RotateCcw className="w-3 h-3" /> Reversed</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3 h-3" /> Ditolak</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top Header Card Otomatis Sesuai Warna Pengaturan */}
      <PageHeaderCard
        icon={FileText}
        badge={transaction ? `Status: ${transaction.status}` : 'Detail'}
        title="Detail Transaksi"
        subtitle="Metadata transaksi, bukti penerimaan/pengeluaran & audit trail pembukuan"
        actions={
          <button
            onClick={() => navigate('/transactions')}
            className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-extrabold backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Transaksi</span>
          </button>
        }
      />

      {toastMsg && (
        <div className="p-3 bg-slate-900 text-white rounded-lg text-xs flex items-center justify-between shadow-md">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-100">
          Memuat detail transaksi...
        </div>
      ) : !transaction ? (
        <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-100">
          Transaksi tidak ditemukan.
        </div>
      ) : (
        <>
          {/* Compact 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Transaction Metadata & Attachments (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Main Details Card */}
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc p-5 space-y-4">
              
              {/* Header Summary */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mb-1 ${
                    transaction.type === 'INCOME' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {transaction.type === 'INCOME' ? 'PENERIMAN KAS' : 'PENGELUARAN KAS'}
                  </span>
                  <h2 className="text-base font-bold text-slate-800">{transaction.transaction_no}</h2>
                </div>
                
                <div className="text-right bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">Total Nominal</span>
                  <span className="text-base font-extrabold text-emerald-700">{formatCurrency(transaction.amount)}</span>
                </div>
              </div>

              {/* Compact 3-Column Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Tanggal Transaksi</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {transaction.transaction_date}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Kas / Bank</span>
                  <span className="font-semibold text-slate-800">
                    {transaction.cash_bank_account?.name || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">
                    {transaction.type === 'INCOME' ? 'Akun COA Penerimaan' : 'Akun COA Beban'}
                  </span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {transaction.type === 'INCOME' 
                      ? (transaction.income_account ? `[${transaction.income_account.code}] ${transaction.income_account.name}` : '-')
                      : (transaction.expense_account ? `[${transaction.expense_account.code}] ${transaction.expense_account.name}` : '-')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">
                    {transaction.type === 'INCOME' ? 'Donatur / Sumber' : 'Penerima / Vendor'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {transaction.type === 'INCOME' 
                      ? (transaction.donor?.name || 'Hamba Allah (Anonim)')
                      : (transaction.counterparty_name || '-')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Program Yayasan</span>
                  <span className="font-semibold text-slate-800">
                    {transaction.program?.name || 'Umum / Non-Program'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Klasifikasi ISAK 35</span>
                  <span className="font-semibold text-slate-800">
                    {transaction.restriction_type === 'WITH_RESTRICTION' ? 'Dengan Pembatasan' : 'Tanpa Pembatasan'}
                  </span>
                </div>
              </div>

              {/* Description Box */}
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block text-[11px] mb-1">Keterangan Transaksi:</span>
                <p className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/60 text-slate-700 font-medium">
                  {transaction.description}
                </p>
              </div>
            </div>

            {/* Bukti Transaksi Card */}
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc p-4 space-y-3">
              <h3 className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                Bukti Transaksi & Lampiran ({transaction.attachments?.length || 0})
              </h3>

              {transaction.attachments?.length === 0 ? (
                <p className="text-[11px] text-slate-400">Belum ada bukti transaksi yang diunggah.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {transaction.attachments.map((att) => (
                    <div key={att.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                      <div className="truncate mr-2">
                        <div className="font-semibold text-slate-800 text-[11px] truncate">{att.original_name}</div>
                        <div className="text-[10px] text-slate-400">{(att.size_bytes / 1024).toFixed(1)} KB</div>
                      </div>
                      <a
                        href={att.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3 h-3" /> Unduh
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {canManage && (transaction.status === 'DRAFT' || transaction.status === 'REJECTED') && (
                <form onSubmit={handleUploadAttachment} className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                    className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700"
                  />
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 disabled:opacity-50 shrink-0"
                  >
                    <Upload className="w-3 h-3" />
                    {uploading ? 'Mengunggah...' : 'Unggah'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Journal Simulation & Approval History (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Journal Simulation Box */}
            <div className="bg-slate-900 text-white rounded-xl p-4.5 shadow-sm space-y-3">
              <h3 className="font-semibold text-xs text-emerald-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Simulasi Jurnal (Double-Entry)
              </h3>

              {transaction.journal_preview && (
                <div className="space-y-2 text-xs font-mono">
                  {transaction.journal_preview.debit?.map((d, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                      <div className="truncate mr-2">
                        <span className="text-[9px] font-bold uppercase text-emerald-400 block">DEBIT</span>
                        <span className="font-medium text-slate-200 text-[11px] truncate block">[{d.account_code}] {d.account_name}</span>
                      </div>
                      <span className="font-bold text-emerald-300 text-xs shrink-0">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}

                  {transaction.journal_preview.credit?.map((c, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                      <div className="truncate mr-2">
                        <span className="text-[9px] font-bold uppercase text-cyan-400 block">KREDIT</span>
                        <span className="font-medium text-slate-200 text-[11px] truncate block">[{c.account_code}] {c.account_name}</span>
                      </div>
                      <span className="font-bold text-cyan-300 text-xs shrink-0">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                <div>Dibuat oleh: <span className="text-slate-200 font-semibold">{transaction.creator?.name || 'Sistem'}</span></div>
                {transaction.submitted_at && (
                  <div>Diajukan: <span className="text-slate-200 font-semibold">{transaction.submitted_at}</span></div>
                )}
                {transaction.approved_at && (
                  <div>Disetujui: <span className="text-slate-200 font-semibold">{transaction.approved_at}</span></div>
                )}
              </div>
            </div>

            {/* Approval History Timeline Section */}
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-curadoc p-4 space-y-3">
              <h3 className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                Riwayat Persetujuan Owner ({transaction.approval_history?.length || 0})
              </h3>

              {!transaction.approval_history || transaction.approval_history.length === 0 ? (
                <p className="text-[11px] text-slate-400">Belum ada riwayat peninjauan oleh Owner.</p>
              ) : (
                <div className="space-y-2">
                  {transaction.approval_history.map((appr) => (
                    <div key={appr.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {appr.action === 'APPROVED' ? (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">APPROVED</span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[9px] font-bold">REJECTED</span>
                          )}
                          <span className="text-slate-800 text-[11px]">{appr.actor_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{appr.created_at}</span>
                      </div>
                      {appr.comments && (
                        <p className="text-slate-600 bg-white p-2 rounded border border-slate-100 text-[10px]">
                          "{appr.comments}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-curadoc flex items-center justify-between gap-3 mb-6">
          <span className="text-xs font-semibold text-slate-500">Aksi Transaksi:</span>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {transaction && canManage && (
              <>
                <button
                  onClick={() => navigate(transaction.type === 'INCOME' ? `/transactions/income/${transaction.id}/edit` : `/transactions/expense/${transaction.id}/edit`)}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200 flex items-center gap-1.5 transition-colors"
                  title="Edit Transaksi"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>

                <button
                  onClick={handleDeleteTransaction}
                  disabled={submitting}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-semibold border border-rose-200 flex items-center gap-1.5 disabled:opacity-60 transition-colors"
                  title="Hapus Transaksi"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </>
            )}

            {transaction && canManage && (transaction.status === 'DRAFT' || transaction.status === 'REJECTED') && (
              <button
                onClick={handleSubmitTransaction}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Memproses...' : 'Ajukan (Submit)'}</span>
              </button>
            )}

            {transaction && isAdmin && transaction.status === 'APPROVED' && (
              <button
                onClick={handlePostTransaction}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{submitting ? 'Memposting...' : 'Posting ke Jurnal'}</span>
              </button>
            )}

            {transaction && (isAdmin || isOwner) && transaction.status === 'POSTED' && (
              <button
                onClick={() => { setReversalReason(''); setReverseModalOpen(true); }}
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reverse Transaksi</span>
              </button>
            )}

            {transaction && isOwner && transaction.status === 'SUBMITTED' && (
              <>
                <button
                  onClick={() => { setRejectReason(''); setRejectModalOpen(true); }}
                  disabled={submitting}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <XCircle className="w-3.5 h-3.5" /> Tolak
                </button>
                <button
                  onClick={handleOwnerApprove}
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Setujui (Approve)
                </button>
              </>
            )}
          </div>
        </div>
        </>
      )}

      {/* Reject Modal Dialog for Owner */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                Penolakan Transaksi #{transaction?.transaction_no}
              </h3>
              <button onClick={() => setRejectModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas agar pembuat dapat melakukan koreksi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  Tolak Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Modal Dialog */}
      {reverseModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                Pembalikan (Reversal) Transaksi #{transaction?.transaction_no}
              </h3>
              <button onClick={() => setReverseModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleConfirmReversal} className="space-y-3">
              <p className="text-xs text-slate-600 bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                Pembalikan akan membuat Jurnal Pembalik (*Reversal Journal*) yang membalik posisi Debet & Kredit transaksi asli tanpa menghapus data secara permanen.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembalikan (Reversal) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Tuliskan alasan koreksi / pembalikan transaksi secara jelas (minimal 5 karakter)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReverseModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!reversalReason.trim() || reversalReason.length < 5}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  Proses Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;
