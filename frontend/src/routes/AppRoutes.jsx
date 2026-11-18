import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from './ProtectedRoute';

import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import UserListPage from '../pages/users/UserListPage';
import CoaListPage from '../pages/master/CoaListPage';
import ProgramListPage from '../pages/master/ProgramListPage';
import DonorListPage from '../pages/master/DonorListPage';
import CashBankListPage from '../pages/master/CashBankListPage';
import AccountingPeriodListPage from '../pages/master/AccountingPeriodListPage';

import TransactionUnifiedListPage from '../pages/transactions/TransactionUnifiedListPage';
import IncomeFormPage from '../pages/transactions/IncomeFormPage';
import ExpenseFormPage from '../pages/transactions/ExpenseFormPage';
import TransactionDetailPage from '../pages/transactions/TransactionDetailPage';
import ApprovalQueuePage from '../pages/approvals/ApprovalQueuePage';

import JournalListPage from '../pages/journals/JournalListPage';
import JournalFormPage from '../pages/journals/JournalFormPage';
import LedgerPage from '../pages/accounting/LedgerPage';
import SubLedgerPage from '../pages/accounting/SubLedgerPage';
import TrialBalancePage from '../pages/accounting/TrialBalancePage';
import PostClosingTrialBalancePage from '../pages/accounting/PostClosingTrialBalancePage';
import InitialBalancePage from '../pages/accounting/InitialBalancePage';
import FixedAssetListPage from '../pages/accounting/FixedAssetListPage';
import FixedAssetFormPage from '../pages/accounting/FixedAssetFormPage';
import PayableReceivableUnifiedListPage from '../pages/accounting/PayableReceivableUnifiedListPage';
import PayableReceivableFormPage from '../pages/accounting/PayableReceivableFormPage';
import PayableListPage from '../pages/accounting/PayableListPage';
import ReceivableListPage from '../pages/accounting/ReceivableListPage';

import BalanceSheetPage from '../pages/reports/BalanceSheetPage';
import IncomeStatementPage from '../pages/reports/IncomeStatementPage';
import ChangesInNetAssetsPage from '../pages/reports/ChangesInNetAssetsPage';
import CashFlowPage from '../pages/reports/CashFlowPage';
import ManagementReportPage from '../pages/reports/ManagementReportPage';

import AuditLogPage from '../pages/audit/AuditLogPage';
import SettingsPage from '../pages/settings/SettingsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* Master Data Routes */}
          <Route path="/master/coa" element={<CoaListPage />} />
          <Route path="/master/programs" element={<ProgramListPage />} />
          <Route path="/master/donors" element={<DonorListPage />} />
          <Route path="/master/rekanan" element={<DonorListPage />} />
          <Route path="/master/cash-bank" element={<CashBankListPage />} />
          <Route path="/master/periods" element={<AccountingPeriodListPage />} />
          <Route path="/accounting/periods" element={<AccountingPeriodListPage />} />

          {/* Unified Transactions Module Routes */}
          <Route path="/transactions" element={<TransactionUnifiedListPage />} />
          <Route path="/transactions/income" element={<TransactionUnifiedListPage />} />
          <Route path="/transactions/expense" element={<TransactionUnifiedListPage />} />
          <Route path="/transactions/expenses" element={<TransactionUnifiedListPage />} />
          <Route path="/transactions/journals" element={<TransactionUnifiedListPage />} />
          <Route path="/transactions/:id" element={<TransactionDetailPage />} />

          {/* Journals, Ledger, Trial Balance, Payables & Receivables (ALL AUTHENTICATED) */}
          <Route path="/journals" element={<JournalListPage />} />
          <Route path="/accounting/journals" element={<JournalListPage />} />
          <Route path="/transactions/journals" element={<JournalListPage />} />
          <Route path="/accounting/ledger" element={<LedgerPage />} />
          <Route path="/accounting/sub-ledger" element={<SubLedgerPage />} />
          <Route path="/accounting/trial-balance" element={<TrialBalancePage />} />
          <Route path="/accounting/post-closing-trial-balance" element={<PostClosingTrialBalancePage />} />
          <Route path="/accounting/initial-balances" element={<InitialBalancePage />} />
          <Route path="/master/initial-balances" element={<InitialBalancePage />} />
          <Route path="/accounting/fixed-assets" element={<FixedAssetListPage />} />
          <Route path="/master/fixed-assets" element={<FixedAssetListPage />} />
          <Route path="/accounting/payables-receivables" element={<PayableReceivableUnifiedListPage />} />
          <Route path="/accounting/payables" element={<PayableReceivableUnifiedListPage />} />
          <Route path="/accounting/receivables" element={<PayableReceivableUnifiedListPage />} />
          <Route path="/master/payables" element={<PayableReceivableUnifiedListPage />} />
          <Route path="/master/receivables" element={<PayableReceivableUnifiedListPage />} />

          {/* Financial & Management Reports (ALL AUTHENTICATED) */}
          <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="/reports/income-statement" element={<IncomeStatementPage />} />
          <Route path="/reports/changes-in-net-assets" element={<ChangesInNetAssetsPage />} />
          <Route path="/reports/cash-flows" element={<CashFlowPage />} />
          <Route path="/reports/post-closing-trial-balance" element={<PostClosingTrialBalancePage />} />
          <Route path="/reports/management" element={<ManagementReportPage />} />

          {/* Audit Logs & App Settings Route (ADMIN & OWNER ONLY) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OWNER']} />}>
            <Route path="/audit-logs" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Transaction Creation & Modification Routes (ADMIN & PENGELOLA) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PENGELOLA']} />}>
            <Route path="/transactions/income/new" element={<IncomeFormPage />} />
            <Route path="/transactions/income/:id/edit" element={<IncomeFormPage />} />
            <Route path="/transactions/expense/new" element={<ExpenseFormPage />} />
            <Route path="/transactions/expense/:id/edit" element={<ExpenseFormPage />} />
            <Route path="/journals/new" element={<JournalFormPage />} />
            <Route path="/accounting/fixed-assets/new" element={<FixedAssetFormPage />} />
            <Route path="/accounting/fixed-assets/:id/edit" element={<FixedAssetFormPage />} />
            <Route path="/master/fixed-assets/new" element={<FixedAssetFormPage />} />
            <Route path="/master/fixed-assets/:id/edit" element={<FixedAssetFormPage />} />
            <Route path="/accounting/payables-receivables/new" element={<PayableReceivableFormPage />} />
            <Route path="/accounting/payables-receivables/:id/edit" element={<PayableReceivableFormPage />} />
            <Route path="/accounting/payables/new" element={<PayableReceivableFormPage />} />
            <Route path="/accounting/payables/:id/edit" element={<PayableReceivableFormPage />} />
            <Route path="/accounting/receivables/new" element={<PayableReceivableFormPage />} />
            <Route path="/accounting/receivables/:id/edit" element={<PayableReceivableFormPage />} />
          </Route>

          {/* Owner Approval Routes */}
          <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
            <Route path="/approvals" element={<ApprovalQueuePage />} />
            <Route path="/approvals/pending" element={<ApprovalQueuePage />} />
          </Route>

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/users" element={<UserListPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
