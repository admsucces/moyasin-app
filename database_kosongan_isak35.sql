-- ========================================================
-- DUMP DATABASE KOSONGAN STANDAR ISAK 35 UNTUK PHPMYADMIN
-- Sistem: Moyasin MONEY (Laravel 13 + React/Vite)
-- Tanpa Data Dummy (Hanya Struktur + Master Akun & Login)
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- Struktur Tabel Migrations
DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struktur Seluruh Tabel Sistem
DROP TABLE IF EXISTS `cache`;
create table `cache` (`key` varchar(255) not null, `value` mediumtext not null, `expiration` bigint not null, primary key (`key`));
alter table `cache` add index `cache_expiration_index`(`expiration`);
DROP TABLE IF EXISTS `cache_locks`;
create table `cache_locks` (`key` varchar(255) not null, `owner` varchar(255) not null, `expiration` bigint not null, primary key (`key`));
alter table `cache_locks` add index `cache_locks_expiration_index`(`expiration`);
DROP TABLE IF EXISTS `jobs`;
create table `jobs` (`id` bigint unsigned not null auto_increment primary key, `queue` varchar(255) not null, `payload` longtext not null, `attempts` smallint unsigned not null, `reserved_at` int unsigned null, `available_at` int unsigned not null, `created_at` int unsigned not null);
alter table `jobs` add index `jobs_queue_index`(`queue`);
DROP TABLE IF EXISTS `job_batches`;
create table `job_batches` (`id` varchar(255) not null, `name` varchar(255) not null, `total_jobs` int not null, `pending_jobs` int not null, `failed_jobs` int not null, `failed_job_ids` longtext not null, `options` mediumtext null, `cancelled_at` int null, `created_at` int not null, `finished_at` int null, primary key (`id`));
DROP TABLE IF EXISTS `failed_jobs`;
create table `failed_jobs` (`id` bigint unsigned not null auto_increment primary key, `uuid` varchar(255) not null, `connection` varchar(255) not null, `queue` varchar(255) not null, `payload` longtext not null, `exception` longtext not null, `failed_at` timestamp not null default CURRENT_TIMESTAMP);
alter table `failed_jobs` add index `failed_jobs_connection_queue_failed_at_index`(`connection`, `queue`, `failed_at`);
alter table `failed_jobs` add unique `failed_jobs_uuid_unique`(`uuid`);
DROP TABLE IF EXISTS `roles`;
create table `roles` (`id` bigint unsigned not null auto_increment primary key, `code` varchar(30) not null, `name` varchar(100) not null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `roles` add unique `roles_code_unique`(`code`);
DROP TABLE IF EXISTS `users`;
create table `users` (`id` bigint unsigned not null auto_increment primary key, `role_id` bigint unsigned not null, `name` varchar(150) not null, `email` varchar(190) not null, `password` varchar(255) not null, `status` varchar(20) not null default 'ACTIVE', `last_login_at` timestamp null, `remember_token` varchar(100) null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `users` add constraint `users_role_id_foreign` foreign key (`role_id`) references `roles` (`id`) on delete restrict;
alter table `users` add unique `users_email_unique`(`email`);
DROP TABLE IF EXISTS `accounts`;
create table `accounts` (`id` bigint unsigned not null auto_increment primary key, `parent_id` bigint unsigned null, `code` varchar(30) not null, `name` varchar(150) not null, `type` varchar(30) not null, `normal_balance` varchar(10) not null, `is_postable` tinyint(1) not null default '1', `is_active` tinyint(1) not null default '1', `created_at` timestamp null, `updated_at` timestamp null);
alter table `accounts` add constraint `accounts_parent_id_foreign` foreign key (`parent_id`) references `accounts` (`id`) on delete restrict;
alter table `accounts` add unique `accounts_code_unique`(`code`);
DROP TABLE IF EXISTS `programs`;
create table `programs` (`id` bigint unsigned not null auto_increment primary key, `code` varchar(30) not null, `name` varchar(150) not null, `description` text null, `is_active` tinyint(1) not null default '1', `created_at` timestamp null, `updated_at` timestamp null);
alter table `programs` add unique `programs_code_unique`(`code`);
DROP TABLE IF EXISTS `donors`;
create table `donors` (`id` bigint unsigned not null auto_increment primary key, `name` varchar(200) not null, `phone` varchar(30) null, `email` varchar(190) null, `address` text null, `notes` text null, `is_active` tinyint(1) not null default '1', `created_at` timestamp null, `updated_at` timestamp null);
DROP TABLE IF EXISTS `cash_bank_accounts`;
create table `cash_bank_accounts` (`id` bigint unsigned not null auto_increment primary key, `account_id` bigint unsigned not null, `type` varchar(20) not null, `name` varchar(150) not null, `bank_name` varchar(150) null, `account_number` varchar(100) null, `account_holder` varchar(150) null, `is_active` tinyint(1) not null default '1', `created_at` timestamp null, `updated_at` timestamp null);
alter table `cash_bank_accounts` add constraint `cash_bank_accounts_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on delete restrict;
alter table `cash_bank_accounts` add unique `cash_bank_accounts_account_id_unique`(`account_id`);
DROP TABLE IF EXISTS `accounting_periods`;
create table `accounting_periods` (`id` bigint unsigned not null auto_increment primary key, `name` varchar(100) not null, `start_date` date not null, `end_date` date not null, `status` varchar(20) not null default 'OPEN', `closed_at` timestamp null, `closed_by` bigint unsigned null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `accounting_periods` add constraint `accounting_periods_closed_by_foreign` foreign key (`closed_by`) references `users` (`id`) on delete restrict;
DROP TABLE IF EXISTS `transactions`;
create table `transactions` (`id` bigint unsigned not null auto_increment primary key, `transaction_no` varchar(50) not null, `type` varchar(30) not null, `transaction_date` date not null, `accounting_period_id` bigint unsigned not null, `program_id` bigint unsigned null, `donor_id` bigint unsigned null, `cash_bank_account_id` bigint unsigned null, `income_account_id` bigint unsigned null, `expense_account_id` bigint unsigned null, `counterparty_name` varchar(200) null, `restriction_type` varchar(30) null, `amount` decimal(19, 2) not null, `description` text not null, `status` varchar(30) not null default 'DRAFT', `created_by` bigint unsigned not null, `submitted_at` timestamp null, `approved_at` timestamp null, `posted_at` timestamp null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `transactions` add constraint `transactions_accounting_period_id_foreign` foreign key (`accounting_period_id`) references `accounting_periods` (`id`) on delete restrict;
alter table `transactions` add constraint `transactions_program_id_foreign` foreign key (`program_id`) references `programs` (`id`) on delete restrict;
alter table `transactions` add constraint `transactions_donor_id_foreign` foreign key (`donor_id`) references `donors` (`id`) on delete restrict;
alter table `transactions` add constraint `transactions_cash_bank_account_id_foreign` foreign key (`cash_bank_account_id`) references `cash_bank_accounts` (`id`) on delete restrict;
alter table `transactions` add constraint `transactions_income_account_id_foreign` foreign key (`income_account_id`) references `accounts` (`id`) on delete restrict;
alter table `transactions` add constraint `transactions_expense_account_id_foreign` foreign key (`expense_account_id`) references `accounts` (`id`) on delete restrict;
alter table `transactions` add constraint `transactions_created_by_foreign` foreign key (`created_by`) references `users` (`id`) on delete restrict;
alter table `transactions` add index `transactions_transaction_date_index`(`transaction_date`);
alter table `transactions` add index `transactions_status_index`(`status`);
alter table `transactions` add index `transactions_type_transaction_date_index`(`type`, `transaction_date`);
alter table `transactions` add index `transactions_program_id_transaction_date_index`(`program_id`, `transaction_date`);
alter table `transactions` add index `transactions_accounting_period_id_status_index`(`accounting_period_id`, `status`);
alter table `transactions` add index `transactions_created_by_status_index`(`created_by`, `status`);
alter table `transactions` add unique `transactions_transaction_no_unique`(`transaction_no`);
DROP TABLE IF EXISTS `transaction_attachments`;
create table `transaction_attachments` (`id` bigint unsigned not null auto_increment primary key, `transaction_id` bigint unsigned not null, `original_name` varchar(255) not null, `storage_path` varchar(500) not null, `mime_type` varchar(100) not null, `size_bytes` bigint unsigned not null, `uploaded_by` bigint unsigned not null, `created_at` timestamp not null default CURRENT_TIMESTAMP);
alter table `transaction_attachments` add constraint `transaction_attachments_transaction_id_foreign` foreign key (`transaction_id`) references `transactions` (`id`) on delete cascade;
alter table `transaction_attachments` add constraint `transaction_attachments_uploaded_by_foreign` foreign key (`uploaded_by`) references `users` (`id`) on delete restrict;
DROP TABLE IF EXISTS `approvals`;
create table `approvals` (`id` bigint unsigned not null auto_increment primary key, `transaction_id` bigint unsigned not null, `action` varchar(20) not null, `actor_id` bigint unsigned not null, `comments` text null, `created_at` timestamp not null default CURRENT_TIMESTAMP);
alter table `approvals` add constraint `approvals_transaction_id_foreign` foreign key (`transaction_id`) references `transactions` (`id`) on delete cascade;
alter table `approvals` add constraint `approvals_actor_id_foreign` foreign key (`actor_id`) references `users` (`id`) on delete restrict;
DROP TABLE IF EXISTS `journals`;
create table `journals` (`id` bigint unsigned not null auto_increment primary key, `journal_no` varchar(50) not null, `transaction_id` bigint unsigned null, `journal_date` date not null, `accounting_period_id` bigint unsigned not null, `description` text not null, `status` varchar(20) not null default 'POSTED', `created_by` bigint unsigned not null, `posted_by` bigint unsigned null, `posted_at` timestamp null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `journals` add constraint `journals_transaction_id_foreign` foreign key (`transaction_id`) references `transactions` (`id`) on delete restrict;
alter table `journals` add constraint `journals_accounting_period_id_foreign` foreign key (`accounting_period_id`) references `accounting_periods` (`id`) on delete restrict;
alter table `journals` add constraint `journals_created_by_foreign` foreign key (`created_by`) references `users` (`id`) on delete restrict;
alter table `journals` add constraint `journals_posted_by_foreign` foreign key (`posted_by`) references `users` (`id`) on delete restrict;
alter table `journals` add index `journals_journal_date_index`(`journal_date`);
alter table `journals` add index `journals_status_index`(`status`);
alter table `journals` add index `journals_accounting_period_id_status_index`(`accounting_period_id`, `status`);
alter table `journals` add unique `journals_journal_no_unique`(`journal_no`);
alter table `journals` add unique `journals_transaction_id_unique`(`transaction_id`);
DROP TABLE IF EXISTS `journal_entries`;
create table `journal_entries` (`id` bigint unsigned not null auto_increment primary key, `journal_id` bigint unsigned not null, `account_id` bigint unsigned not null, `program_id` bigint unsigned null, `description` varchar(500) null, `debit` decimal(19, 2) not null default '0', `credit` decimal(19, 2) not null default '0', `created_at` timestamp not null default CURRENT_TIMESTAMP);
alter table `journal_entries` add constraint `journal_entries_journal_id_foreign` foreign key (`journal_id`) references `journals` (`id`) on delete cascade;
alter table `journal_entries` add constraint `journal_entries_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on delete restrict;
alter table `journal_entries` add constraint `journal_entries_program_id_foreign` foreign key (`program_id`) references `programs` (`id`) on delete restrict;
alter table `journal_entries` add index `journal_entries_journal_id_index`(`journal_id`);
alter table `journal_entries` add index `journal_entries_account_id_index`(`account_id`);
alter table `journal_entries` add index `journal_entries_account_id_journal_id_index`(`account_id`, `journal_id`);
alter table `journal_entries` add index `journal_entries_program_id_index`(`program_id`);
alter table `transactions` add `reversal_reason` text null after `status`;
alter table `transactions` add `reversed_at` timestamp null after `reversal_reason`;
alter table `transactions` add `reversed_by` bigint unsigned null after `reversed_at`;
alter table `transactions` add constraint `transactions_reversed_by_foreign` foreign key (`reversed_by`) references `users` (`id`) on delete restrict;
alter table `journals` add `is_reversal` tinyint(1) not null default '0' after `status`;
alter table `journals` add `reversed_journal_id` bigint unsigned null after `is_reversal`;
alter table `journals` add constraint `journals_reversed_journal_id_foreign` foreign key (`reversed_journal_id`) references `journals` (`id`) on delete restrict;
alter table `accounting_periods` add `reopen_reason` text null after `closed_by`;
alter table `accounting_periods` add `reopened_at` timestamp null after `reopen_reason`;
alter table `accounting_periods` add `reopened_by` bigint unsigned null after `reopened_at`;
alter table `accounting_periods` add constraint `accounting_periods_reopened_by_foreign` foreign key (`reopened_by`) references `users` (`id`) on delete restrict;
DROP TABLE IF EXISTS `audit_logs`;
create table `audit_logs` (`id` bigint unsigned not null auto_increment primary key, `user_id` bigint unsigned null, `action` varchar(50) not null, `entity_type` varchar(50) null, `entity_id` bigint unsigned null, `description` text null, `ip_address` varchar(45) null, `user_agent` varchar(255) null, `created_at` timestamp not null default CURRENT_TIMESTAMP);
alter table `audit_logs` add constraint `audit_logs_user_id_foreign` foreign key (`user_id`) references `users` (`id`) on delete set null;
alter table `audit_logs` add index `audit_logs_action_index`(`action`);
alter table `audit_logs` add index `audit_logs_user_id_index`(`user_id`);
alter table `audit_logs` add index `audit_logs_created_at_index`(`created_at`);
alter table `audit_logs` add index `audit_logs_entity_type_entity_id_index`(`entity_type`, `entity_id`);
alter table `audit_logs` add index `audit_logs_user_id_created_at_index`(`user_id`, `created_at`);
DROP TABLE IF EXISTS `fixed_assets`;
create table `fixed_assets` (`id` bigint unsigned not null auto_increment primary key, `asset_code` varchar(50) not null, `name` varchar(150) not null, `acquisition_date` date not null, `acquisition_cost` decimal(15, 2) not null, `useful_life_years` int not null default '5', `salvage_value` decimal(15, 2) not null default '0', `depreciation_method` varchar(30) not null default 'STRAIGHT_LINE', `asset_account_id` bigint unsigned not null, `accumulated_depr_account_id` bigint unsigned null, `depreciation_expense_account_id` bigint unsigned null, `status` varchar(20) not null default 'ACTIVE', `description` text null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `fixed_assets` add constraint `fixed_assets_asset_account_id_foreign` foreign key (`asset_account_id`) references `accounts` (`id`) on delete restrict;
alter table `fixed_assets` add constraint `fixed_assets_accumulated_depr_account_id_foreign` foreign key (`accumulated_depr_account_id`) references `accounts` (`id`) on delete restrict;
alter table `fixed_assets` add constraint `fixed_assets_depreciation_expense_account_id_foreign` foreign key (`depreciation_expense_account_id`) references `accounts` (`id`) on delete restrict;
alter table `fixed_assets` add unique `fixed_assets_asset_code_unique`(`asset_code`);
DROP TABLE IF EXISTS `fixed_asset_depreciations`;
create table `fixed_asset_depreciations` (`id` bigint unsigned not null auto_increment primary key, `fixed_asset_id` bigint unsigned not null, `journal_id` bigint unsigned null, `year` int not null, `month` int not null, `amount` decimal(15, 2) not null, `depreciation_date` date not null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `fixed_asset_depreciations` add constraint `fixed_asset_depreciations_fixed_asset_id_foreign` foreign key (`fixed_asset_id`) references `fixed_assets` (`id`) on delete cascade;
alter table `fixed_asset_depreciations` add constraint `fixed_asset_depreciations_journal_id_foreign` foreign key (`journal_id`) references `journals` (`id`) on delete set null;
alter table `fixed_asset_depreciations` add unique `fixed_asset_depreciations_fixed_asset_id_year_month_unique`(`fixed_asset_id`, `year`, `month`);
DROP TABLE IF EXISTS `payables`;
create table `payables` (`id` bigint unsigned not null auto_increment primary key, `payable_no` varchar(50) not null, `invoice_no` varchar(100) null, `donor_id` bigint unsigned null, `vendor_name` varchar(150) not null, `transaction_date` date not null, `due_date` date not null, `total_amount` decimal(15, 2) not null, `paid_amount` decimal(15, 2) not null default '0', `remaining_balance` decimal(15, 2) not null, `status` varchar(20) not null default 'UNPAID', `payable_account_id` bigint unsigned not null, `description` text null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `payables` add constraint `payables_donor_id_foreign` foreign key (`donor_id`) references `donors` (`id`) on delete restrict;
alter table `payables` add constraint `payables_payable_account_id_foreign` foreign key (`payable_account_id`) references `accounts` (`id`) on delete restrict;
alter table `payables` add unique `payables_payable_no_unique`(`payable_no`);
DROP TABLE IF EXISTS `receivables`;
create table `receivables` (`id` bigint unsigned not null auto_increment primary key, `receivable_no` varchar(50) not null, `invoice_no` varchar(100) null, `donor_id` bigint unsigned null, `customer_name` varchar(150) not null, `transaction_date` date not null, `due_date` date not null, `total_amount` decimal(15, 2) not null, `received_amount` decimal(15, 2) not null default '0', `remaining_balance` decimal(15, 2) not null, `status` varchar(20) not null default 'UNPAID', `receivable_account_id` bigint unsigned not null, `description` text null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `receivables` add constraint `receivables_donor_id_foreign` foreign key (`donor_id`) references `donors` (`id`) on delete restrict;
alter table `receivables` add constraint `receivables_receivable_account_id_foreign` foreign key (`receivable_account_id`) references `accounts` (`id`) on delete restrict;
alter table `receivables` add unique `receivables_receivable_no_unique`(`receivable_no`);
DROP TABLE IF EXISTS `debt_payments`;
create table `debt_payments` (`id` bigint unsigned not null auto_increment primary key, `payment_no` varchar(50) not null, `type` varchar(20) not null, `payable_id` bigint unsigned null, `receivable_id` bigint unsigned null, `payment_date` date not null, `amount` decimal(15, 2) not null, `cash_bank_account_id` bigint unsigned not null, `journal_id` bigint unsigned null, `notes` text null, `created_by` bigint unsigned not null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `debt_payments` add constraint `debt_payments_payable_id_foreign` foreign key (`payable_id`) references `payables` (`id`) on delete cascade;
alter table `debt_payments` add constraint `debt_payments_receivable_id_foreign` foreign key (`receivable_id`) references `receivables` (`id`) on delete cascade;
alter table `debt_payments` add constraint `debt_payments_cash_bank_account_id_foreign` foreign key (`cash_bank_account_id`) references `cash_bank_accounts` (`id`) on delete restrict;
alter table `debt_payments` add constraint `debt_payments_journal_id_foreign` foreign key (`journal_id`) references `journals` (`id`) on delete set null;
alter table `debt_payments` add constraint `debt_payments_created_by_foreign` foreign key (`created_by`) references `users` (`id`) on delete restrict;
alter table `debt_payments` add unique `debt_payments_payment_no_unique`(`payment_no`);
alter table `payables` add `expense_asset_account_id` bigint unsigned null after `payable_account_id`;
alter table `payables` add constraint `payables_expense_asset_account_id_foreign` foreign key (`expense_asset_account_id`) references `accounts` (`id`) on delete restrict;
alter table `payables` add `journal_id` bigint unsigned null after `expense_asset_account_id`;
alter table `payables` add constraint `payables_journal_id_foreign` foreign key (`journal_id`) references `journals` (`id`) on delete set null;
alter table `receivables` add `income_account_id` bigint unsigned null after `receivable_account_id`;
alter table `receivables` add constraint `receivables_income_account_id_foreign` foreign key (`income_account_id`) references `accounts` (`id`) on delete restrict;
alter table `receivables` add `journal_id` bigint unsigned null after `income_account_id`;
alter table `receivables` add constraint `receivables_journal_id_foreign` foreign key (`journal_id`) references `journals` (`id`) on delete set null;
DROP TABLE IF EXISTS `personal_access_tokens`;
create table `personal_access_tokens` (`id` bigint unsigned not null auto_increment primary key, `tokenable_type` varchar(255) not null, `tokenable_id` bigint unsigned not null, `name` text not null, `token` varchar(64) not null, `abilities` text null, `last_used_at` timestamp null, `expires_at` timestamp null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `personal_access_tokens` add index `personal_access_tokens_tokenable_type_tokenable_id_index`(`tokenable_type`, `tokenable_id`);
alter table `personal_access_tokens` add unique `personal_access_tokens_token_unique`(`token`);
alter table `personal_access_tokens` add index `personal_access_tokens_expires_at_index`(`expires_at`);
DROP TABLE IF EXISTS `app_settings`;
create table `app_settings` (`id` bigint unsigned not null auto_increment primary key, `key` varchar(100) not null, `value` longtext null, `created_at` timestamp null, `updated_at` timestamp null);
alter table `app_settings` add unique `app_settings_key_unique`(`key`);

-- ========================================================
-- DATA AWAL / SEEDER (KOSONGAN, BEBAS DARI TRANSAKSI DUMMY)
-- ========================================================

-- Catatan Migrasi
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1, '0001_01_01_000001_create_cache_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2, '0001_01_01_000002_create_jobs_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3, '2026_09_24_000001_create_roles_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4, '2026_09_24_000002_create_users_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5, '2026_09_24_000003_create_accounts_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6, '2026_09_24_000004_create_programs_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7, '2026_09_24_000005_create_donors_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8, '2026_09_24_000006_create_cash_bank_accounts_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9, '2026_09_24_000007_create_accounting_periods_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10, '2026_09_24_000008_create_transactions_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11, '2026_09_24_000009_create_transaction_attachments_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12, '2026_09_24_000010_create_approvals_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13, '2026_09_24_000011_create_journals_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14, '2026_09_24_000012_create_journal_entries_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15, '2026_09_24_000013_add_reversal_and_period_control_columns', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16, '2026_09_24_000014_create_audit_logs_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17, '2026_09_24_000015_create_fixed_assets_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18, '2026_09_24_000016_create_payables_receivables_tables', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19, '2026_09_24_000017_add_journal_and_contra_accounts_to_payables_receivables', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20, '2026_09_24_131045_create_personal_access_tokens_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21, '2026_11_07_000018_create_app_settings_table', 1);

-- Data Awal untuk Tabel `roles`
INSERT INTO `roles` (`id`, `code`, `name`, `created_at`, `updated_at`) VALUES (1, 'ADMIN', 'Administrator', '2026-11-04 11:42:40', '2026-11-04 11:42:40');
INSERT INTO `roles` (`id`, `code`, `name`, `created_at`, `updated_at`) VALUES (2, 'PENGELOLA', 'Pengelola Keuangan', '2026-11-04 11:42:40', '2026-11-04 11:42:40');
INSERT INTO `roles` (`id`, `code`, `name`, `created_at`, `updated_at`) VALUES (3, 'OWNER', 'Owner / Pengawas', '2026-11-04 11:42:40', '2026-11-04 11:42:40');

-- Data Awal untuk Tabel `users`
INSERT INTO `users` (`id`, `role_id`, `name`, `email`, `password`, `status`, `last_login_at`, `remember_token`, `created_at`, `updated_at`) VALUES (1, 1, 'Administrator Utama', 'admin@yayasan.org', '$2y$12$EIFOVEJLEmukXoogCAGlVuS9lwix64BzIcZnYF.etUOCSq400OY3y', 'ACTIVE', '2026-11-06 09:45:22', NULL, '2026-11-04 11:42:43', '2026-11-06 09:45:22');
INSERT INTO `users` (`id`, `role_id`, `name`, `email`, `password`, `status`, `last_login_at`, `remember_token`, `created_at`, `updated_at`) VALUES (2, 2, 'Pengelola Keuangan', 'pengelola@yayasan.org', '$2y$12$8zo5MGccPy4jARz9JEMIP.UEYl1QPn8fC3fEol6hAr/dN/AvgcGgO', 'ACTIVE', NULL, NULL, '2026-11-04 11:42:46', '2026-11-04 11:42:46');
INSERT INTO `users` (`id`, `role_id`, `name`, `email`, `password`, `status`, `last_login_at`, `remember_token`, `created_at`, `updated_at`) VALUES (3, 3, 'Owner Yayasan', 'owner@yayasan.org', '$2y$12$Vv3.ayToyDU0auvCtp00U.1XOaGRVbTCullmbq5c3o1e6zF1tC1ym', 'ACTIVE', NULL, NULL, '2026-11-04 11:42:49', '2026-11-04 11:42:49');

-- Data Awal untuk Tabel `accounts`
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (1, NULL, 1000, 'ASET', 'ASSET', 'DEBIT', '0', 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (2, 1, 1100, 'Aset Lancar', 'ASSET', 'DEBIT', '0', 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (3, 2, 1101, 'Kas Tunai Yayasan', 'ASSET', 'DEBIT', 1, 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (4, 2, 1102, 'Bank Operasional Yayasan', 'ASSET', 'DEBIT', 1, 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (5, 2, 1103, 'Bank Program Yatim', 'ASSET', 'DEBIT', 1, 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (10, NULL, 2000, 'LIABILITAS', 'LIABILITY', 'CREDIT', '0', 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (11, 10, 2100, 'Liabilitas Jangka Pendek', 'LIABILITY', 'CREDIT', '0', 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (12, 11, 2101, 'Utang Operasional', 'LIABILITY', 'CREDIT', 1, 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (20, NULL, 3000, 'ASET NETO', 'EQUITY', 'CREDIT', '0', 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (21, 20, 3101, 'Aset Neto Tanpa Pembatasan', 'EQUITY', 'CREDIT', 1, 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (22, 20, 3201, 'Aset Neto Dengan Pembatasan', 'EQUITY', 'CREDIT', 1, 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (30, NULL, 4000, 'PENERIMAAN DANA', 'INCOME', 'CREDIT', '0', 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (31, 30, 4101, 'Penerimaan Donasi Yatim', 'INCOME', 'CREDIT', 1, 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (32, 30, 4102, 'Penerimaan Donasi Dhuafa', 'INCOME', 'CREDIT', 1, 1, '2026-11-04 11:42:50', '2026-11-04 11:42:50');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (33, 30, 4103, 'Penerimaan Donasi Lansia', 'INCOME', 'CREDIT', 1, 1, '2026-11-04 11:42:51', '2026-11-04 11:42:51');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (34, 30, 4104, 'Penerimaan Sumbangan Umum', 'INCOME', 'CREDIT', 1, 1, '2026-11-04 11:42:51', '2026-11-04 11:42:51');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (40, NULL, 5000, 'BEBAN / PENGELUARAN', 'EXPENSE', 'DEBIT', '0', 1, '2026-11-04 11:42:51', '2026-11-04 11:42:51');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (41, 40, 5101, 'Beban Program Yatim', 'EXPENSE', 'DEBIT', 1, 1, '2026-11-04 11:42:51', '2026-11-04 11:42:51');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (42, 40, 5102, 'Beban Program Dhuafa', 'EXPENSE', 'DEBIT', 1, 1, '2026-11-04 11:42:51', '2026-11-04 11:42:51');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (43, 40, 5103, 'Beban Program Lansia', 'EXPENSE', 'DEBIT', 1, 1, '2026-11-04 11:42:52', '2026-11-04 11:42:52');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (44, 40, 5201, 'Beban Operasional Sekretariat', 'EXPENSE', 'DEBIT', 1, 1, '2026-11-04 11:42:52', '2026-11-04 11:42:52');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (47, 1, 1300, 'Aset Tetap', 'ASSET', 'DEBIT', '0', 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (48, NULL, 1301, 'Peralatan & Inventaris Kantor', 'ASSET', 'DEBIT', 1, 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (49, NULL, 1302, 'Akumulasi Penyusutan Peralatan', 'ASSET', 'CREDIT', 1, 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (50, NULL, 1303, 'Gedung & Bangunan', 'ASSET', 'DEBIT', 1, 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (51, NULL, 1304, 'Akumulasi Penyusutan Gedung', 'ASSET', 'CREDIT', 1, 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (52, NULL, 1305, 'Kendaraan Operasional', 'ASSET', 'DEBIT', 1, 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (53, NULL, 1306, 'Akumulasi Penyusutan Kendaraan', 'ASSET', 'CREDIT', 1, 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');
INSERT INTO `accounts` (`id`, `parent_id`, `code`, `name`, `type`, `normal_balance`, `is_postable`, `is_active`, `created_at`, `updated_at`) VALUES (54, 40, 5202, 'Beban Penyusutan Aset Tetap', 'EXPENSE', 'DEBIT', 1, 1, '2026-11-07 15:47:34', '2026-11-07 15:47:34');

-- Data Awal untuk Tabel `accounting_periods`
INSERT INTO `accounting_periods` (`id`, `name`, `start_date`, `end_date`, `status`, `closed_at`, `closed_by`, `created_at`, `updated_at`, `reopen_reason`, `reopened_at`, `reopened_by`) VALUES (1, 'September 2026', '2026-09-01 00:00:00', '2026-09-30 00:00:00', 'OPEN', '2026-11-04 11:42:56', 1, '2026-11-04 11:42:53', '2026-11-04 11:42:57', 'Penyesuaian transaksi akhir periode', '2026-11-04 11:42:57', 3);
INSERT INTO `accounting_periods` (`id`, `name`, `start_date`, `end_date`, `status`, `closed_at`, `closed_by`, `created_at`, `updated_at`, `reopen_reason`, `reopened_at`, `reopened_by`) VALUES (2, 'November 2026', '2026-11-01 00:00:00', '2026-11-30 00:00:00', 'OPEN', NULL, NULL, '2026-11-05 08:19:32', '2026-11-05 08:19:32', NULL, NULL, NULL);

-- Data Awal untuk Tabel `programs`
INSERT INTO `programs` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (1, 'YATIM', 'Program Yatim Piatu', 'Pelayanan santunan, pendidikan, dan kebutuhan anak yatim piatu.', 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `programs` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (2, 'DHUAFA', 'Program Dhuafa', 'Bantuan sembako, kesehatan, dan pemberdayaan ekonomi keluarga dhuafa.', 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `programs` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (3, 'LANSIA', 'Program Lansia', 'Pelayanan perawatan kesehatan dan kebutuhan lansia terlantar.', 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `programs` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (4, 'OPERASIONAL', 'Operasional Yayasan', 'Kegiatan rutin operasional dan administrasi sekretariat yayasan.', 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');
INSERT INTO `programs` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (5, 'LAINNYA', 'Program Lainnya', 'Kegiatan insidental dan bantuan sosial kemasyarakatan lainnya.', 1, '2026-11-04 11:42:49', '2026-11-04 11:42:49');

-- Data Awal untuk Tabel `app_settings`
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (1, 'app_name', 'Moyasin', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (2, 'app_badge', 'MONEY', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (3, 'organization_name', 'Yasinfoundation', '2026-11-07 01:16:23', '2026-11-07 01:17:39');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (4, 'organization_full_name', 'YAYASAN SALAM ABADI INDONESIA', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (5, 'organization_tagline', 'Yayasan Yatim Piatu, Dhuafa, dan Lansia', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (6, 'organization_address', 'Jl. Raya Bonorong, Mertayasa Kulon, Gumiwang, Kec. Purwanegara, Kab. Banjarnegara, Jawa Tengah 53472', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (7, 'organization_phone', 6285179752018, '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (8, 'organization_email', 'yssalamabadiindonesia@gmail.com', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (9, 'logo_url', '', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (10, 'logo_icon', 'Landmark', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (11, 'theme_preset', 'emerald', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (12, 'primary_color', '#059669', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (13, 'secondary_color', '#064e3b', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (14, 'accent_color', '#6ee7b7', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (15, 'bg_color', '#f0fdf4', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (16, 'report_preparer_name', 'Husna Nur Amanah', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (17, 'report_preparer_role', 'Staff Keuangan Yayasan', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (18, 'report_approver_name', 'Wagino', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (19, 'report_approver_role', 'Ketua Yayasan', '2026-11-07 01:16:23', '2026-11-07 01:16:23');
INSERT INTO `app_settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES (20, 'show_sidebar_promo', 'true', '2026-11-07 01:16:23', '2026-11-07 01:16:23');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
