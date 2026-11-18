# DEVELOPMENT PLAN v1.0

## 1. Document Control

| Field              | Value                                      |
| ------------------ | ------------------------------------------ |
| Product            | Sistem Informasi Keuangan Yayasan          |
| Organization       | Yayasan Yatim Piatu, Dhuafa, dan Lansia    |
| Document           | Development Plan                           |
| Version            | 1.0                                        |
| Status             | Approved Baseline for Implementation       |
| Product Type       | Web Application                            |
| Source of Truth    | PRD v1.0                                   |
| Design Reference   | Design Spec v1.0                           |
| Database Reference | Database Spec v1.0                         |
| API Reference      | API Contract v1.0                          |
| Frontend           | React + Vite + Tailwind CSS + React Router |
| Backend            | Laravel REST API                           |
| Database           | MySQL/MariaDB                              |
| Architecture       | Modular Monolith                           |
| Language           | Bahasa Indonesia                           |
| Currency           | IDR                                        |
| Timezone           | Asia/Jakarta                               |

---

# 2. Purpose

Development Plan ini menerjemahkan PRD dan technical specification menjadi urutan pembangunan yang dapat dieksekusi oleh developer maupun AI Coding Agent.

Dokumen ini menentukan:

* urutan pembangunan;
* dependency antar-phase;
* task development;
* deliverable;
* requirement/API/screen terkait;
* testing gate;
* Definition of Done;
* release sequence;
* pembagian AI Coding Handoff Package.

Development Plan **tidak menggantikan PRD**.

Urutan otoritas:

```text
PRD v1.0
   ↓
Design Spec v1.0
   ↓
Database Spec v1.0
   ↓
API Contract v1.0
   ↓
Development Plan v1.0
   ↓
AI Coding Handoff Package
   ↓
Implementation
   ↓
Testing
   ↓
Release
```

Jika Development Plan membutuhkan perubahan requirement, perubahan tersebut harus dievaluasi sebagai Change Request terhadap source of truth terlebih dahulu.

---

# 3. Development Principles

Implementasi mengikuti prinsip berikut.

### DP-001 — Vertical Slice

Fitur dibangun end-to-end bila memungkinkan:

```text
Database
→ Backend Domain
→ Validation
→ Authorization
→ API
→ Frontend
→ Test
```

Jangan menyelesaikan seluruh backend terlebih dahulu lalu baru membangun seluruh frontend.

### DP-002 — Dependency Driven

Urutan pembangunan mengikuti dependency teknis dan bisnis.

Contoh:

```text
Authentication
→ Master Data
→ Transaction
→ Approval
→ Posting
→ Ledger
→ Reporting
```

Reporting tidak dibangun sebelum accounting engine dapat dipercaya.

### DP-003 — Security by Default

Authentication, authorization, validation, file security, auditability, dan secret management bukan pekerjaan Future Phase.

### DP-004 — Financial Integrity First

Pada modul accounting:

```text
Correctness
> Data Integrity
> Security
> Maintainability
> Performance
> Convenience
```

### DP-005 — No Silent Requirement Change

Developer/AI Agent tidak boleh mengubah:

* workflow;
* permission;
* financial state;
* accounting rule;
* API behavior;
* database relationship penting;

secara sepihak.

---

# 4. Development Phases Overview

| Phase | Scope                       | Package              |
| ----- | --------------------------- | -------------------- |
| 0     | Project Foundation          | Package 1            |
| 1     | Authentication & RBAC       | Package 1            |
| 2     | Accounting Master Data      | Package 2            |
| 3     | Income                      | Package 3            |
| 4     | Expense                     | Package 4            |
| 5     | Approval Workflow           | Package 5            |
| 6     | Accounting Engine & Posting | Package 6            |
| 7     | Ledger & Trial Balance      | Package 7            |
| 8     | Reversal & Period Control   | Package 8            |
| 9     | Financial Reporting         | Package 9            |
| 10    | Audit, Export & Hardening   | Package 10           |
| 11    | UAT & Production Release    | Package 10 / Release |

Dependency utama:

```text
Phase 0
  ↓
Phase 1
  ↓
Phase 2
  ↓
Phase 3 ──→ Phase 4
              ↓
           Phase 5
              ↓
           Phase 6
              ↓
           Phase 7
              ↓
           Phase 8
              ↓
           Phase 9
              ↓
          Phase 10
              ↓
          Phase 11
```

---

# 5. PHASE 0 — Project Foundation

## Objective

Membangun foundation frontend, backend, database, environment dan convention yang digunakan seluruh aplikasi.

## Tasks

### DEV-001 — Frontend Foundation

Setup:

```text
React
Vite
Tailwind CSS
React Router
```

Struktur minimal:

```text
src/
├── components/
├── layouts/
├── pages/
├── routes/
├── services/
├── hooks/
├── context/
├── utils/
└── styles/
```

### DEV-002 — Backend Foundation

Setup Laravel REST API.

Siapkan separation:

```text
Route
→ Middleware
→ Form Request
→ Controller
→ Service
→ Model
→ Resource
```

### DEV-003 — Database Connection

Konfigurasi MySQL/MariaDB melalui environment.

Database credential tidak boleh berada di frontend/repository.

### DEV-004 — Environment Configuration

Minimal:

```text
Development
Staging
Production
```

### DEV-005 — API Convention

Implementasikan standard response, validation response, exception handling, HTTP status convention dan API versioning.

Base:

```text
/api/v1
```

### DEV-006 — Frontend Application Shell

Implementasikan foundation:

* responsive layout;
* header;
* sidebar;
* content container;
* loading component;
* error component;
* empty state;
* confirmation dialog;
* toast/feedback.

## Deliverable

Frontend dan backend dapat dijalankan secara lokal dan berkomunikasi melalui API.

## Exit Gate

* frontend build berhasil;
* Laravel berjalan;
* DB connection berhasil;
* environment tidak mengekspos secret;
* API health/basic response berhasil.

---

# 6. PHASE 1 — Authentication & RBAC

## Objective

Membangun identity dan authorization foundation sebelum financial modules.

## Requirements

```text
FR-001 Authentication
FR-002 User Management
```

## APIs

```text
API-001 Login
API-002 Logout
API-003 Current User

API-010 User List
API-011 Create User
API-012 Update User
API-013 User Status
```

## Screens

```text
PG-001 Login
PG-002 Dashboard Shell
PG-020 User Management
```

## Tasks

### DEV-010

Migration dan seeder `roles`.

Roles:

```text
ADMIN
PENGELOLA
OWNER
```

### DEV-011

Migration/model `users`.

### DEV-012

Laravel Sanctum authentication.

### DEV-013

Login/logout/current-user APIs.

### DEV-014

Backend RBAC Policies/Gates.

### DEV-015

Login UI + protected routes + role-aware navigation.

### DEV-016

User Management API/UI + tests.

## Security Gate

Wajib:

* secure password hashing;
* backend authorization;
* login rate protection;
* secure session;
* no plaintext password;
* no frontend secrets;
* inactive account protection.

## Exit Gate

Ketiga role dapat login, tetapi hanya Admin dapat mengelola users.

Direct unauthorized API access menghasilkan `403`.

---

# 7. PHASE 2 — Accounting Master Data

## Objective

Membangun master yang menjadi dependency transaksi dan accounting engine.

## Requirements

```text
FR-003 Chart of Accounts
FR-004 Program
FR-005 Donatur/Sumber Dana
FR-006 Kas & Bank
FR-016 Accounting Period
```

## Tasks

### DEV-020 — Chart of Accounts

Implementasikan:

* migration;
* model;
* hierarchy;
* account type;
* normal balance;
* active/inactive;
* postable/non-postable;
* CRUD API;
* UI;
* validation;
* tests.

Akun yang digunakan transaksi tidak boleh destructive delete.

### DEV-021 — Program

Implementasikan:

```text
Yatim Piatu
Dhuafa
Lansia
Operasional
Program Lainnya
```

sebagai seed awal, bukan hardcoded UI value.

### DEV-022 — Donatur

Implementasikan donor/source master.

Donatur anonim tetap dapat dicatat tanpa memaksa record donor.

### DEV-023 — Kas & Bank

Kas/bank harus mereferensikan akun ledger.

Saldo tidak menjadi editable field.

### DEV-024 — Accounting Period

Implementasikan:

```text
OPEN
CLOSING_REQUESTED
CLOSED
REOPEN_REQUESTED
```

Pada phase ini fokus master dan status foundation; closing workflow penuh diselesaikan Phase 8.

## Exit Gate

Master dapat digunakan transaction form dan seluruh permission sesuai PRD.

---

# 8. PHASE 3 — Income Vertical Slice

## Objective

Menyelesaikan penerimaan secara end-to-end sampai status Draft/Submit.

## Requirement

```text
FR-007 Penerimaan
FR-009 Journal Generation foundation
FR-011 Submit
FR-021 Attachment foundation
```

## Tasks

### DEV-030 — Transaction Foundation

Implementasikan `transactions`.

Initial types:

```text
INCOME
EXPENSE
MANUAL_JOURNAL
ADJUSTMENT
```

Initial lifecycle:

```text
DRAFT
SUBMITTED
REJECTED
APPROVED
POSTED
REVERSED
```

### DEV-031 — Income API

Create, read, update Draft dan list/filter.

### DEV-032 — Income UI

Implementasikan:

```text
PG-003 Penerimaan List
PG-004 Form Penerimaan
PG-010 Transaction Detail foundation
```

### DEV-033 — Journal Preview

Penerimaan dapat menampilkan journal preview sebelum posting.

### DEV-034 — Attachment Foundation

Private attachment upload dengan:

* MIME validation;
* extension validation;
* size validation;
* safe/random filename;
* authorization.

### DEV-035 — Income Testing

Test:

* valid transaction;
* invalid amount;
* closed period;
* inactive account;
* inactive program;
* ownership;
* submit;
* duplicate request behavior.

## Exit Gate

Pengelola/Admin dapat:

```text
Create Income
→ Save Draft
→ Edit Draft
→ Attach Evidence
→ Submit
```

Belum ada posting.

---

# 9. PHASE 4 — Expense Vertical Slice

## Objective

Menyelesaikan workflow pengeluaran sampai submit.

## Requirement

```text
FR-008 Pengeluaran
FR-011 Submit
FR-021 Attachment
```

## Tasks

### DEV-040

Expense domain/API.

### DEV-041

Expense list/form/detail UI.

### DEV-042

Program classification.

### DEV-043

Expense account/cash-bank validation.

### DEV-044

Expense integration tests.

## Exit Gate

```text
Create Expense
→ Save Draft
→ Edit
→ Attach Evidence
→ Submit
```

berfungsi end-to-end.

---

# 10. PHASE 5 — Approval Workflow

## Objective

Mengimplementasikan maker-reviewer workflow.

## Requirement

```text
FR-012 Approval
```

## APIs

```text
API-070 Approval Queue
API-071 Approve
API-072 Reject
```

## Tasks

### DEV-050

Approval schema/domain.

### DEV-051

Owner Approval Queue.

### DEV-052

Approve transaction.

### DEV-053

Reject + correction + resubmit.

### DEV-054

Approval authorization/concurrency tests.

## State

```text
DRAFT
 ↓
SUBMITTED
 ├──→ APPROVED
 └──→ REJECTED
         ↓
        DRAFT
         ↓
      RESUBMIT
```

Owner tidak mengedit transaction financial values.

## Exit Gate

Owner dapat approve/reject dan seluruh history tersimpan.

---

# 11. PHASE 6 — Accounting Engine & Posting

## Objective

Membangun accounting core yang mengubah approved business transaction menjadi posted double-entry journal.

Ini merupakan **Critical Development Phase**.

## Requirements

```text
FR-009 Journal Generation
FR-010 Manual Journal
FR-013 Posting
```

## Tasks

### DEV-060 — Journal Schema

Implementasikan:

```text
journals
journal_entries
```

### DEV-061 — Journal Validation

Enforce:

```text
SUM(debit) = SUM(credit)
```

dan satu sisi per journal entry.

### DEV-062 — Automatic Journal Generation

Income dan Expense menghasilkan journal sesuai account mapping.

### DEV-063 — Posting Service

Implementasikan atomic posting.

### DEV-064 — Concurrency Protection

Cegah duplicate/double posting.

Gunakan status validation, transaction boundary dan row locking yang sesuai.

### DEV-065 — Posted Transaction Lock

Setelah posting:

```text
POSTED → direct edit prohibited
POSTED → delete prohibited
```

### DEV-066 — Accounting Integrity Tests

Test minimal:

```text
balanced journal
unbalanced rejection
duplicate posting
closed period posting
invalid account
inactive account
transaction rollback
posted lock
```

## Critical Transaction

```text
BEGIN
 ↓
Lock transaction
 ↓
Verify APPROVED
 ↓
Verify OPEN period
 ↓
Generate journal
 ↓
Validate Debit = Credit
 ↓
Persist journal entries
 ↓
Journal POSTED
 ↓
Transaction POSTED
 ↓
Audit
 ↓
COMMIT
```

Failure:

```text
ROLLBACK
```

## Exit Gate

Income dan Expense dapat menyelesaikan:

```text
Create
→ Submit
→ Approve
→ Post
→ Journal Entries
```

tanpa data inconsistency.

---

# 12. PHASE 7 — Ledger & Trial Balance

## Objective

Membangun accounting projection dari posted journals.

## Requirements

```text
FR-014 Ledger
FR-015 Trial Balance
```

## Tasks

### DEV-070 — Ledger Query

Ledger hanya membaca:

```text
POSTED journals
```

### DEV-071 — Opening/Running/Closing Balance

Implementasikan balance calculation.

### DEV-072 — Ledger UI

Implementasikan PG-011.

### DEV-073 — Trial Balance

Implementasikan PG-012 + API-121.

### DEV-074 — Reconciliation Tests

Invariant:

```text
Total Debit = Total Credit
```

## Exit Gate

Setiap posted transaction dapat ditelusuri:

```text
Transaction
→ Journal
→ Journal Entries
→ Ledger
→ Trial Balance
```

---

# 13. PHASE 8 — Reversal & Period Control

## Objective

Melindungi historical integrity dan period closing.

## Requirements

```text
FR-016 Accounting Period
FR-017 Period Closing
FR-018 Reversal
```

## Tasks

### DEV-080 — Reversal Request

Admin dapat mengajukan reversal dengan alasan.

### DEV-081 — Reversal Journal

Sistem menghasilkan jurnal pembalik tanpa menghapus original.

### DEV-082 — Period Closing

Flow:

```text
OPEN
→ CLOSING_REQUESTED
→ CLOSED
```

### DEV-083 — Period Reopening

Flow:

```text
CLOSED
→ REOPEN_REQUESTED
→ OPEN
```

Owner approval + reason required.

### DEV-084 — Control Tests

Test:

* posting to closed period;
* transaction edit in closed period;
* reversal;
* duplicate reversal;
* closing with pending transaction;
* unauthorized reopen.

## Exit Gate

Historical transaction tidak perlu diubah secara destruktif untuk melakukan koreksi.

---

# 14. PHASE 9 — Financial Reporting

## Objective

Menghasilkan laporan dari authoritative ledger.

## Requirement

```text
FR-019 Financial Reporting
FR-020 Operational Reporting
```

## Critical Dependency

Sebelum phase ini dinyatakan final:

```text
COA
↓
Report Mapping
↓
Accounting Validation
```

harus tervalidasi.

## Tasks

### DEV-090 — Report Mapping Layer

Mapping COA ke struktur report.

### DEV-091 — Laporan Posisi Keuangan

### DEV-092 — Laporan Penghasilan Komprehensif

### DEV-093 — Laporan Perubahan Aset Neto

### DEV-094 — Laporan Arus Kas

### DEV-095 — Management Reports

Termasuk:

* penerimaan;
* pengeluaran;
* kas/bank;
* program;
* sumber dana;
* dana dengan/tanpa pembatasan.

## Financial Report Rule

Frontend **tidak menghitung authoritative report**.

Flow:

```text
POSTED Journal Entries
       ↓
Ledger
       ↓
Report Mapping
       ↓
Report Service
       ↓
API
       ↓
UI / Export
```

## Exit Gate

Report totals dapat direconcile terhadap ledger/trial balance.

---

# 15. PHASE 10 — Audit, Export & Hardening

## Objective

Menyiapkan aplikasi untuk UAT dan production.

## Requirements

```text
FR-022 Audit Trail
FR-024 Export
FR-025 Search/Filter
NFR Security
NFR Performance
```

## Tasks

### DEV-100 — Audit Log

Audit event minimal:

```text
TRANSACTION_CREATED
TRANSACTION_UPDATED
TRANSACTION_SUBMITTED
TRANSACTION_APPROVED
TRANSACTION_REJECTED
TRANSACTION_POSTED
REVERSAL_REQUESTED
TRANSACTION_REVERSED
PERIOD_CLOSED
PERIOD_REOPENED
USER_ROLE_CHANGED
```

### DEV-101 — Export

PDF/XLSX sesuai kebutuhan laporan.

### DEV-102 — Security Testing

Test:

* authentication;
* authorization;
* IDOR/object authorization;
* mass assignment;
* XSS handling;
* CSRF/session;
* file upload;
* secret exposure;
* error leakage.

### DEV-103 — Responsive QA

Desktop, tablet dan mobile.

### DEV-104 — Accounting Regression

Seluruh financial workflow diuji kembali.

### DEV-105 — Performance Optimization

Optimasi berdasarkan evidence/query profiling.

Jangan melakukan premature optimization yang menambah complexity tanpa kebutuhan.

## Exit Gate

Tidak ada unresolved Critical/High issue yang menghalangi UAT.

---

# 16. PHASE 11 — UAT & Production Release

## Objective

Memvalidasi aplikasi terhadap workflow nyata dan melakukan production release terkontrol.

## Tasks

### DEV-110

Deploy staging.

### DEV-111

Migration test dari clean environment.

### DEV-112

Automated backup.

### DEV-113

Restore verification.

### DEV-114

User Acceptance Testing.

UAT actors:

```text
Admin
Pengelola
Owner
```

### DEV-115

Production deployment.

### DEV-116

Production smoke test.

## Smoke Test

Minimal:

```text
Login
Role access
Create transaction
Submit
Approve
Post
Ledger
Trial Balance
Report
Logout
```

Tidak perlu membuat transaksi production palsu jika environment/policy tidak memungkinkan; gunakan prosedur release yang aman.

---

# 17. AI Coding Handoff Mapping

Development Plan dibagi menjadi paket berikut.

| Package    | Scope                            | Tasks       |
| ---------- | -------------------------------- | ----------- |
| Package 1  | Foundation + Authentication/RBAC | DEV-001–016 |
| Package 2  | Accounting Master Data           | DEV-020–024 |
| Package 3  | Income                           | DEV-030–035 |
| Package 4  | Expense                          | DEV-040–044 |
| Package 5  | Approval                         | DEV-050–054 |
| Package 6  | Accounting Engine                | DEV-060–066 |
| Package 7  | Ledger & Trial Balance           | DEV-070–074 |
| Package 8  | Reversal & Period Control        | DEV-080–084 |
| Package 9  | Reporting                        | DEV-090–095 |
| Package 10 | Hardening + Release              | DEV-100–116 |

AI Coding Agent hanya menerima package berikutnya setelah package sebelumnya memenuhi gate yang relevan.

---

# 18. Package Dependency

```text
PACKAGE 1
Foundation + Auth
      ↓
PACKAGE 2
Accounting Master
      ↓
PACKAGE 3
Income
      ↓
PACKAGE 4
Expense
      ↓
PACKAGE 5
Approval
      ↓
PACKAGE 6
Accounting Engine
      ↓
PACKAGE 7
Ledger
      ↓
PACKAGE 8
Controls
      ↓
PACKAGE 9
Reports
      ↓
PACKAGE 10
Hardening + Release
```

Package boleh dipecah lebih kecil jika implementasi nyata menunjukkan scope terlalu besar.

Jangan menggabungkan beberapa package hanya untuk mempercepat coding apabila hal tersebut menghilangkan validation gate.

---

# 19. Testing Strategy per Layer

## Unit Tests

Fokus pada:

```text
validation
state transition
journal balancing
accounting calculations
permission decisions
```

## Integration Tests

Fokus:

```text
Database
+
Service
+
API
```

Critical integration:

```text
Transaction
→ Approval
→ Posting
→ Ledger
```

## E2E

Critical journeys:

### Journey 1

```text
Pengelola
→ Login
→ Create Income
→ Submit
```

### Journey 2

```text
Owner
→ Login
→ Approval Queue
→ Approve
```

### Journey 3

```text
Admin
→ Login
→ Post
→ Ledger
```

### Journey 4

```text
Admin
→ Reversal Request
→ Owner Approval
→ Reversal
```

### Journey 5

```text
Admin
→ Close Period
→ Owner Approval
→ Closed
```

---

# 20. Quality Gates

Setiap package melewati:

```text
Code Complete
      ↓
Static/Build Check
      ↓
Unit Tests
      ↓
Integration Tests
      ↓
Permission Tests
      ↓
Security Check
      ↓
Acceptance Criteria
      ↓
Completion Report
```

Package tidak dianggap selesai hanya karena UI terlihat bekerja.

---

# 21. Financial Quality Gate

Sebelum release, seluruh kondisi berikut harus benar:

```text
FQ-001
Every posted journal is balanced.

FQ-002
Every posted operational transaction has journal entries.

FQ-003
Ledger only includes posted journals.

FQ-004
Trial balance debit equals credit.

FQ-005
Posted transaction cannot be directly edited.

FQ-006
Posted transaction cannot be destructively deleted.

FQ-007
Reversal preserves original transaction.

FQ-008
Closed period blocks financial mutation.

FQ-009
Reports reconcile with ledger.

FQ-010
Posting operation is atomic.
```

Failure salah satu critical invariant merupakan release blocker.

---

# 22. Security Release Gate

Sebelum production:

```text
✓ password securely hashed
✓ backend RBAC active
✓ object authorization tested
✓ SQL parameter binding/ORM
✓ CSRF/session protection
✓ HTTPS production
✓ secure cookies
✓ login rate protection
✓ upload restrictions
✓ private evidence storage
✓ environment secrets protected
✓ production debug disabled
✓ sensitive logs reviewed
✓ authorization tests passed
```

---

# 23. Data & Migration Strategy

Setiap schema change harus menggunakan migration.

Dilarang menjadikan manual production SQL sebagai normal deployment strategy.

Flow:

```text
Migration Development
       ↓
Automated/Test DB
       ↓
Staging Migration
       ↓
Verification
       ↓
Backup Production
       ↓
Production Migration
       ↓
Smoke Test
```

Destructive migration membutuhkan review tambahan.

---

# 24. Backup & Recovery Gate

Sebelum production:

* automated database backup tersedia;
* private attachments ikut strategi backup;
* backup memiliki retention;
* akses backup dibatasi;
* restore procedure terdokumentasi;
* minimal satu restore verification dilakukan.

Backup yang belum pernah diuji restore tidak dianggap cukup.

---

# 25. Definition of Ready for a Development Package

Package boleh dimulai jika:

```text
✓ requirement tersedia
✓ dependency sebelumnya selesai
✓ relevant API contract tersedia
✓ relevant DB design tersedia
✓ screen behavior cukup jelas
✓ permission jelas
✓ acceptance criteria tersedia
✓ material open question sudah diselesaikan
```

Jika salah satu poin kritis belum tersedia, developer harus melaporkannya sebelum coding.

---

# 26. Definition of Done for Development Package

Package selesai jika:

```text
✓ implementation complete
✓ migration works from clean DB
✓ API implemented
✓ UI implemented jika required
✓ backend authorization implemented
✓ validation implemented
✓ loading/error/empty states implemented
✓ tests added
✓ tests pass
✓ production build pass
✓ no exposed secrets
✓ acceptance criteria pass
✓ completion report submitted
✓ no unresolved critical issue
```

---

# 27. Completion Report Standard

Setiap AI Coding Handoff harus menghasilkan:

```text
IMPLEMENTATION COMPLETION REPORT

Package:
...

Tasks Completed:
...

Requirements Covered:
...

Screens Implemented:
...

APIs Implemented:
...

Database Changes:
...

Files Created:
...

Files Modified:
...

Tests Added:
...

Tests Executed:
...

Build Result:
PASS / FAIL

Security Checks:
...

Acceptance Criteria:
PASS / FAIL

Known Limitations:
...

Open Issues:
...

Change Requests:
...

Ready for Next Package:
YES / NO
```

---

# 28. Change Management

Jika requirement berubah setelah development dimulai, lakukan impact analysis:

```text
Requirement Change
       ↓
Scope
       ↓
Workflow
       ↓
UI
       ↓
Permission
       ↓
API
       ↓
Database
       ↓
Security
       ↓
Reporting
       ↓
Acceptance Criteria
       ↓
Tests
```

Contoh format:

```text
CR-001

Requested Change:
...

Reason:
...

Affected Requirement:
...

Affected Screen:
...

Affected API:
...

Affected Database:
...

Security Impact:
...

Testing Impact:
...

Recommendation:
...

PRD Update Required:
YES / NO
```

Jika `YES`, PRD diperbarui terlebih dahulu.

---

# 29. Critical Project Checkpoints

## CP-01 — Foundation Ready

Setelah Package 1.

## CP-02 — Master Data Ready

Setelah Package 2.

## CP-03 — Transaction Capture Ready

Setelah Package 3–4.

## CP-04 — Controlled Transaction Workflow Ready

Setelah Package 5.

## CP-05 — Accounting Core Ready

Setelah Package 6.

Ini checkpoint terpenting sebelum reporting.

## CP-06 — Ledger Integrity Ready

Setelah Package 7.

## CP-07 — Period Control Ready

Setelah Package 8.

## CP-08 — Financial Reporting Ready

Setelah Package 9.

## CP-09 — Production Candidate

Setelah Package 10 hardening.

## CP-10 — Production

Setelah UAT dan release gate.

---

# 30. Reporting Dependency Warning

Financial reporting **tidak boleh dianggap selesai hanya karena UI laporan tersedia**.

Sebelum Package 9 selesai:

```text
Chart of Accounts
       ↓
Account Classification
       ↓
Report Mapping
       ↓
Accounting Validation
       ↓
Report Calculation
       ↓
Reconciliation
```

harus tervalidasi.

Mapping laporan merupakan dependency material yang masih perlu dikunci bersama pihak yang bertanggung jawab atas kebijakan akuntansi yayasan.

---

# 31. Project Risk Register

| ID    | Risk                                 | Impact   | Mitigation                                      |
| ----- | ------------------------------------ | -------- | ----------------------------------------------- |
| R-001 | Salah account mapping                | High     | Accounting validation sebelum reporting         |
| R-002 | Double posting                       | Critical | Transaction + locking + idempotency/state check |
| R-003 | Unauthorized financial action        | Critical | Backend RBAC + tests                            |
| R-004 | Posted data berubah                  | Critical | Immutable posted transaction + reversal         |
| R-005 | Closed period berubah                | High     | Backend period enforcement                      |
| R-006 | Ledger/report berbeda                | Critical | Single posted journal source                    |
| R-007 | File evidence exposure               | High     | Private storage + authorization                 |
| R-008 | Data loss                            | Critical | Backup + restore test                           |
| R-009 | Scope creep                          | Medium   | Package boundaries + Change Control             |
| R-010 | AI coding agent mengubah requirement | High     | Explicit handoff + completion report            |

---

# 32. Development Priority

Prioritas keseluruhan:

```text
P0 — Critical
Authentication
Authorization
Financial integrity
Posting
Ledger integrity
Period protection
Backup/security

P1 — Core
Transaction UX
Approval
Reporting
Audit

P2 — Improvement
Export
Advanced filtering
Performance optimization

P3 — Future
Bank integration
Payment gateway
Donor portal
Advanced budgeting
Mobile application
```

---

# 33. Release Strategy

Gunakan controlled release:

```text
Development
     ↓
Automated Tests
     ↓
Staging
     ↓
Internal QA
     ↓
UAT
     ↓
Backup Verification
     ↓
Production Migration
     ↓
Smoke Test
     ↓
Production Monitoring
```

Rollback procedure harus tersedia sebelum deployment yang memiliki migration berisiko.

---

# 34. MVP Completion Criteria

MVP dianggap selesai apabila user dapat menjalankan:

```text
Admin
→ Setup Master Data

Pengelola
→ Record Transaction
→ Submit

Owner
→ Review
→ Approve

Admin
→ Post

System
→ Journal
→ Ledger
→ Trial Balance
→ Financial Report

Admin/Owner
→ Period Closing
```

serta seluruh security dan audit controls utama aktif.

---

# 35. Development Plan Traceability

Contoh utama:

| Task        | Requirement    | Screen           | API                 | Database                  |
| ----------- | -------------- | ---------------- | ------------------- | ------------------------- |
| DEV-010–016 | FR-001/002     | PG-001/020       | API-001–013         | users, roles              |
| DEV-020     | FR-003         | PG-015           | API-020–023         | accounts                  |
| DEV-021     | FR-004         | PG-016           | API-030–033         | programs                  |
| DEV-030–035 | FR-007         | PG-003/004       | API-060–065         | transactions              |
| DEV-040–044 | FR-008         | PG-005/006       | API-060–065         | transactions              |
| DEV-050–054 | FR-012         | PG-009           | API-070–072         | approvals                 |
| DEV-060–066 | FR-009/010/013 | PG-007/008/010   | API-080/090         | journals, journal_entries |
| DEV-070–074 | FR-014/015     | PG-011/012       | API-120/121         | journal_entries           |
| DEV-080–084 | FR-016/017/018 | PG-010/019       | API-100/101/130–134 | reversals, periods        |
| DEV-090–095 | FR-019/020     | PG-013/014       | API-140–143         | ledger + mapping          |
| DEV-100+    | FR-022/024/025 | PG-021 + reports | API-150 + export    | audit_logs                |

---

# 36. Current Project Status

```text
PRD v1.0
STATUS: READY FOR REVIEW

Design Spec v1.0
STATUS: DRAFT COMPLETE

Database Spec v1.0
STATUS: DRAFT COMPLETE

API Contract v1.0
STATUS: DRAFT COMPLETE

Development Plan v1.0
STATUS: BASELINE COMPLETE

AI Coding Handoff Package 1
STATUS: READY FOR IMPLEMENTATION
```

---

# 37. Next Execution Point

Development **tidak perlu kembali ke planning dari awal**.

Execution point sekarang adalah:

```text
Development Plan v1.0
        ↓
AI Coding Handoff Package 1
        ↓
DEV-001 — DEV-016
        ↓
Implementation Completion Report
        ↓
Quality Gate
        ↓
PASS?
   ├── NO → Fix Package 1
   └── YES
        ↓
AI Coding Handoff Package 2
        ↓
DEV-020 — DEV-024
```

Package berikutnya tidak boleh dianggap otomatis approved hanya karena package sebelumnya menghasilkan code.

Setiap package harus melewati quality gate.

---

# 38. Final Development Plan Quality Check

**PRD traceability:** PASS
**Phase dependency:** PASS
**Task identification:** PASS
**Screen/API/database linkage:** PASS
**Security included:** PASS
**Financial integrity included:** PASS
**Testing gates:** PASS
**AI Coding package mapping:** PASS
**Completion reporting:** PASS
**Change management:** PASS
**Deployment strategy:** PASS
**Backup/recovery:** PASS
**MVP end-to-end workflow:** PASS

# DEVELOPMENT PLAN v1.0 — BASELINE COMPLETE
