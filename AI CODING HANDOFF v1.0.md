# AI CODING HANDOFF v1.0

## 1. Document Control

| Field                 | Value                                      |
| --------------------- | ------------------------------------------ |
| Product               | Sistem Informasi Keuangan Yayasan          |
| Organization          | Yayasan Yatim Piatu, Dhuafa, dan Lansia    |
| Document              | AI Coding Handoff                          |
| Version               | 1.0                                        |
| Status                | Baseline                                   |
| Source of Truth       | PRD v1.0                                   |
| Design Reference      | Design Spec v1.0                           |
| Database Reference    | Database Spec v1.0                         |
| API Reference         | API Contract v1.0                          |
| Development Reference | Development Plan v1.0                      |
| Architecture          | Modular Monolith                           |
| Frontend              | React + Vite + Tailwind CSS + React Router |
| Backend               | Laravel REST API                           |
| Database              | MySQL/MariaDB                              |
| Language              | Bahasa Indonesia                           |
| Currency              | IDR                                        |
| Timezone              | Asia/Jakarta                               |

---

# 2. Purpose

Dokumen ini merupakan **baseline instruction untuk AI Coding Agent** yang akan mengimplementasikan Sistem Informasi Keuangan Yayasan.

Dokumen ini belum menentukan package implementasi tertentu.

Scope pekerjaan aktual harus diberikan melalui **Execution Package** terpisah yang mengacu kepada Development Plan v1.0.

Hierarki dokumen:

```text id="4fqlq1"
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
AI Coding Handoff v1.0
   ↓
Execution Package
   ↓
Implementation
   ↓
Tests
   ↓
Completion Report
```

---

# 3. Source of Truth

PRD v1.0 merupakan **source of truth produk**.

Dokumen turunan tidak boleh mengubah requirement produk secara diam-diam.

Urutan referensi:

1. PRD v1.0 — requirement produk.
2. Design Spec v1.0 — behavior dan UI/UX.
3. Database Spec v1.0 — struktur data.
4. API Contract v1.0 — kontrak komunikasi frontend/backend.
5. Development Plan v1.0 — urutan pembangunan.
6. AI Coding Handoff v1.0 — aturan implementasi oleh coding agent.
7. Execution Package — scope coding yang sedang dikerjakan.

Jika terjadi konflik, agent harus melaporkan konflik tersebut dan tidak membuat perubahan material secara sepihak.

---

# 4. Product Context

Aplikasi merupakan sistem keuangan untuk Yayasan Yatim Piatu, Dhuafa, dan Lansia.

Core workflow:

```text id="ykxv6w"
Transaction
   ↓
Draft
   ↓
Submit
   ↓
Owner Review
   ↓
Approve / Reject
   ↓
Posting
   ↓
Journal
   ↓
Ledger
   ↓
Trial Balance
   ↓
Financial Reporting
```

Core roles:

```text id="6hx46d"
ADMIN
PENGELOLA
OWNER
```

Sistem menggunakan double-entry accounting dan harus menjaga financial integrity.

---

# 5. Technology Baseline

## Frontend

```text id="j1mwco"
React
Vite
Tailwind CSS
React Router
```

## Backend

```text id="u9e9ts"
Laravel
REST API
Laravel Sanctum
```

## Database

```text id="i99eop"
MySQL / MariaDB
InnoDB
utf8mb4
```

## Architecture

```text id="2wh27o"
Modular Monolith
```

Jangan mengganti technology baseline tanpa Change Request.

---

# 6. General Implementation Principles

AI Coding Agent harus memprioritaskan:

```text id="vxdfqh"
Correctness
   ↓
Security
   ↓
Data Integrity
   ↓
Maintainability
   ↓
Testability
   ↓
Usability
   ↓
Performance
```

Untuk accounting domain:

```text id="wqvh7f"
Financial Correctness
>
Convenience
```

Jangan mengorbankan integritas data untuk menyederhanakan implementation.

---

# 7. Scope Control

AI Coding Agent hanya boleh mengimplementasikan task yang disebutkan pada **Execution Package aktif**.

Contoh:

```text id="5dqk70"
AI Coding Handoff v1.0
        ↓
Execution Package
        ↓
DEV-xxx
DEV-xxx
DEV-xxx
```

Agent tidak boleh secara otomatis melanjutkan ke task berikutnya setelah scope selesai.

Agent harus:

1. menyelesaikan scope aktif;
2. menjalankan tests;
3. melakukan verification;
4. menghasilkan Completion Report;
5. berhenti.

Package berikutnya dimulai melalui instruksi terpisah.

---

# 8. Architecture Rules — Frontend

Gunakan separation of concerns yang proporsional.

Recommended structure:

```text id="b1sm50"
src/
├── assets/
├── components/
│   ├── common/
│   ├── forms/
│   ├── feedback/
│   └── navigation/
├── layouts/
├── pages/
├── routes/
├── services/
├── hooks/
├── context/
├── utils/
└── styles/
```

Tidak wajib mengikuti struktur ini secara literal apabila repository mempunyai convention yang lebih baik.

Namun separation harus tetap jelas.

Flow:

```text id="7nclbb"
Page / Component
       ↓
Hook / Service
       ↓
HTTP API
```

Frontend tidak boleh mengakses database secara langsung.

---

# 9. Frontend Security Rules

Frontend tidak boleh menyimpan:

```text id="0vnh1o"
Database credentials
APP_KEY
Server secrets
Production passwords
Private API credentials
```

Authorization tidak boleh hanya bergantung pada:

```text id="fz2cjr"
hidden button
hidden menu
disabled input
route hiding
```

Frontend permission hanya untuk UX.

Backend tetap authoritative.

---

# 10. Frontend State Requirements

Setiap page yang mengambil data harus mempertimbangkan:

```text id="9bep8f"
Initial
Loading
Success
Empty
Validation Error
Authorization Error
Server Error
```

Financial action juga harus mempunyai explicit feedback.

Contoh:

```text id="0z3xwv"
Posting...
Posting berhasil
Posting gagal
```

Jangan membuat user menebak apakah operasi berhasil.

---

# 11. Responsive Rules

Target:

```text id="6bdv97"
Desktop
Tablet
Mobile
```

Accounting data entry dioptimalkan untuk desktop tetapi tetap usable pada tablet/mobile.

Financial tables dapat menggunakan horizontal scrolling jika memaksa card layout akan merusak keterbacaan hubungan data.

---

# 12. Backend Architecture Rules

Recommended request flow:

```text id="d86j6o"
Route
  ↓
Middleware
  ↓
Form Request
  ↓
Controller
  ↓
Service / Domain
  ↓
Model / Repository Query
  ↓
Database
```

Controller harus tipis.

Business logic kritis tidak boleh seluruhnya berada di Controller.

Accounting logic tidak boleh berada di React.

---

# 13. Validation Rules

Frontend validation digunakan untuk UX.

Backend validation adalah authoritative.

Flow:

```text id="ubgtt6"
Client Validation
       ↓
Server Validation
       ↓
Business Rule Validation
       ↓
Database Constraint
```

Contoh aturan penting:

```text id="e53zck"
amount > 0
account exists
account active
program valid
accounting period open
valid state transition
debit = credit
```

sesuai requirement masing-masing module.

---

# 14. Authentication

Gunakan Laravel Sanctum sesuai API Contract.

Untuk first-party SPA prioritaskan secure cookie/session authentication.

Production harus mempertimbangkan:

```text id="7qt6by"
HttpOnly
Secure
SameSite
HTTPS
CSRF protection
```

Jangan menyimpan authentication credential secara tidak aman hanya untuk mempermudah frontend.

---

# 15. Authorization

Authorization harus dilakukan backend.

Roles:

```text id="h11a29"
ADMIN
PENGELOLA
OWNER
```

Agent tidak boleh membuat role tambahan tanpa requirement/change approval.

Setiap sensitive endpoint harus memiliki permission enforcement.

---

# 16. Object-Level Authorization

Memiliki permission terhadap module tidak otomatis berarti user boleh mengakses setiap record.

Contoh:

```text id="5fm1dt"
Pengelola A
        ↓
Transaction B
        ↓
Ownership / permission check
```

ID yang valid bukan bukti authorization.

Semua endpoint detail/update/action harus mempertimbangkan object-level authorization sesuai requirement.

---

# 17. Mass Assignment Protection

Client tidak boleh mengubah internal/system-controlled fields melalui generic update.

Contoh protected fields:

```text id="9m4clv"
status
approved_at
approved_by
posted_at
posted_by
created_by
role
journal status
```

State transition harus dilakukan melalui domain action.

---

# 18. Database Principles

Gunakan:

```text id="g09vcr"
Primary Key
Foreign Key
Unique Constraint
Indexes
NOT NULL
Appropriate DECIMAL
Transaction Boundary
```

sesuai Database Spec.

Financial values tidak menggunakan floating point.

Gunakan fixed precision decimal.

---

# 19. Historical Data Integrity

Master data yang sudah digunakan transaksi tidak boleh destructive delete apabila penghapusan akan merusak histori.

Gunakan pola:

```text id="kvfp83"
ACTIVE
INACTIVE
```

untuk master data yang relevan.

Posted financial records tidak boleh dihapus hanya untuk memperbaiki kesalahan.

---

# 20. Accounting Invariants

Aturan berikut merupakan **hard constraints** implementation.

## INV-001

```text id="2ve25n"
SUM(Debit) = SUM(Credit)
```

untuk setiap posted journal.

## INV-002

Posted transaction tidak dapat diedit langsung.

## INV-003

Posted transaction tidak dapat destructive delete.

## INV-004

Ledger hanya berasal dari posted journal.

## INV-005

Closed period tidak menerima financial mutation.

## INV-006

Reversal mempertahankan original transaction.

## INV-007

Setiap posted operational transaction memiliki valid journal.

## INV-008

Posting merupakan atomic operation.

## INV-009

Financial balance berasal dari journal entries sebagai authoritative accounting data.

## INV-010

Frontend authorization tidak menggantikan backend authorization.

Pelanggaran invariant kritis harus dianggap defect/blocker.

---

# 21. Posting Rules

Financial posting harus menggunakan database transaction.

Conceptual flow:

```text id="4lzzl3"
BEGIN

Lock transaction
       ↓
Validate current state
       ↓
Validate permission
       ↓
Validate accounting period
       ↓
Generate/finalize journal
       ↓
Validate journal balance
       ↓
Persist entries
       ↓
Mark journal POSTED
       ↓
Mark transaction POSTED
       ↓
Write audit event

COMMIT
```

Jika gagal:

```text id="2vg4ci"
ROLLBACK
```

Tidak boleh terjadi partial posting.

---

# 22. Concurrency

Sensitive operations harus mempertimbangkan concurrency.

Terutama:

```text id="21dfqw"
Posting
Approval
Reversal
Period Closing
Period Reopening
```

Contoh risiko:

```text id="8ivbwp"
Admin A → POST
Admin B → POST
```

tidak boleh menghasilkan dua journal untuk transaksi yang sama.

Gunakan kombinasi state validation, database constraint, transaction dan locking yang tepat.

---

# 23. Financial State Machine

Core transaction lifecycle:

```text id="xmr2u7"
DRAFT
  ↓
SUBMITTED
  ├────→ REJECTED
  │        ↓
  │       DRAFT
  │        ↓
  │     SUBMITTED
  │
  └────→ APPROVED
           ↓
         POSTED
           ↓
        REVERSAL
           ↓
        REVERSED
```

Illegal transition harus ditolak.

Contoh:

```text id="0wh2ny"
DRAFT → POSTED       ✗
SUBMITTED → POSTED   ✗
POSTED → DRAFT       ✗
POSTED → DELETE      ✗
```

---

# 24. API Contract Rules

Endpoint harus mengikuti API Contract v1.0.

Base:

```text id="v8fwg5"
/api/v1
```

Success convention:

```json id="3vif1x"
{
  "success": true,
  "message": "Operasi berhasil",
  "data": {}
}
```

Validation:

```json id="ix0a50"
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {}
}
```

Jangan mengubah nama endpoint, request semantics, response semantics, atau state action tanpa approval apabila API Contract telah menetapkannya.

---

# 25. HTTP Rules

Gunakan status code secara konsisten.

```text id="nxvvxb"
200 Success
201 Created
204 No Content
400 Bad Request
401 Unauthenticated
403 Forbidden
404 Not Found
409 State/Data Conflict
422 Validation Error
429 Rate Limited
500 Unexpected Server Error
```

Validation failure bukan `500`.

Authorization failure bukan `404` kecuali policy secara sengaja menentukan resource concealment.

---

# 26. Error Security

Production response dilarang mengekspos:

```text id="p2w5jj"
Stack trace
SQL query
DB credentials
Filesystem path
APP_KEY
Environment secrets
Internal token
```

Detailed errors dapat dicatat server-side dengan sanitization yang sesuai.

---

# 27. File Upload Rules

Untuk bukti transaksi, gunakan private storage.

Allowed baseline:

```text id="x8c00b"
PDF
JPG
JPEG
PNG
```

Validasi:

```text id="xxmhw4"
extension
MIME
file size
authorization
```

Filename storage harus aman/random.

File tidak boleh menjadi executable.

Download harus melewati authentication dan authorization.

---

# 28. Audit Rules

Sensitive actions harus meninggalkan audit event sesuai PRD/API.

Contoh:

```text id="25ncpv"
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

Audit log tidak boleh menyimpan:

```text id="2hl89b"
password
session secret
token
database password
raw sensitive credential
```

---

# 29. Reporting Rules

Authoritative financial report harus berasal dari:

```text id="cvcebw"
POSTED JOURNAL ENTRIES
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

Frontend tidak boleh menjadi authoritative financial calculation engine.

Jangan membuat report menggunakan transaction table saja jika requirement menetapkan ledger sebagai source.

---

# 30. Query & Performance Rules

Gunakan pagination untuk data list yang berpotensi besar.

Gunakan index berdasarkan query pattern yang benar-benar dibutuhkan.

Hindari:

```text id="61n97a"
N+1 queries
unbounded list endpoints
SELECT all unnecessary columns
full-table loading into frontend
```

Jangan melakukan premature optimization yang membuat accounting logic sulit diverifikasi.

---

# 31. Code Quality

Code harus:

```text id="l3on8g"
readable
consistent
testable
maintainable
reasonably modular
```

Hindari:

```text id="6x6f1d"
god controller
god component
duplicate accounting logic
magic numbers
hardcoded role checks everywhere
unused abstraction
speculative framework
```

Buat abstraction jika ada kebutuhan nyata.

---

# 32. Naming

Gunakan naming konsisten.

Database/API/internal code sebaiknya menggunakan English technical naming.

UI menggunakan Bahasa Indonesia.

Contoh:

```text id="mkvgql"
Internal:
accounting_period
journal_entry
cash_bank_account

UI:
Periode Akuntansi
Jurnal
Kas & Bank
```

Jangan mencampur istilah secara acak dalam domain layer.

---

# 33. Testing Baseline

Setiap Execution Package harus menentukan test spesifik.

Namun baseline seluruh implementation mencakup:

```text id="3g52tb"
Unit Tests
Integration Tests
Authorization Tests
Validation Tests
Critical Workflow Tests
Regression Tests
```

Financial modules membutuhkan accounting integrity tests.

---

# 34. Test Integrity

Agent tidak boleh:

```text id="v8zbja"
delete failing test just to pass
skip critical test without reason
change expected behavior to match buggy implementation
mock away the behavior being tested
```

Jika test menemukan konflik requirement, laporkan sebagai issue/change request.

---

# 35. Security Testing

Area minimal:

```text id="pf4umv"
Authentication
Authorization
Object-level access
Mass assignment
SQL injection protection
XSS
CSRF/session
File upload
Secret exposure
Error leakage
```

Security test harus dilakukan sesuai relevansi Execution Package.

---

# 36. Responsive Testing

Untuk UI package:

test minimal pada:

```text id="ctdfjq"
Desktop
Tablet
Mobile
```

Pastikan:

* navigation usable;
* form usable;
* action tidak tersembunyi;
* financial value terbaca;
* table behavior terkendali.

---

# 37. Database Migration Rules

Schema changes menggunakan migration.

Jangan mengandalkan manual SQL sebagai normal workflow.

Migration harus dapat dijalankan pada clean database.

Jika migration destructive diperlukan, dokumentasikan risk dan rollback/backup requirement.

---

# 38. Environment Rules

Environment:

```text id="bz8m9w"
Development
Staging
Production
```

Configuration yang berbeda antar-environment harus berasal dari environment configuration.

Jangan menggunakan production credential pada development.

---

# 39. Logging

Application logs harus membantu diagnosis tanpa membocorkan sensitive information.

Boleh log:

```text id="2pr3so"
request correlation
error class
safe entity identifier
safe operation context
```

Jangan log:

```text id="bjz0f4"
password
auth cookie
access token
DB password
private secret
```

---

# 40. Backup Awareness

Coding Agent tidak bertanggung jawab otomatis terhadap infrastructure backup kecuali Execution Package menetapkannya.

Namun perubahan schema/storage tidak boleh membuat backup/restore strategy mustahil atau tidak konsisten.

File evidence dan database harus dapat direcover secara terkoordinasi.

---

# 41. Execution Package Contract

Setiap package implementasi harus menyebutkan minimal:

```text id="tzb8js"
Package ID
Objective
Scope
Out of Scope
DEV Tasks
Requirements
Screens
APIs
Database Objects
Business Rules
Security Requirements
Acceptance Criteria
Required Tests
Definition of Done
```

Contoh struktur:

```text id="7dnw4v"
EXECUTION PACKAGE

Package:
EP-XXX

Objective:
...

Tasks:
DEV-xxx
DEV-xxx

Requirements:
FR-xxx

Screens:
PG-xxx

APIs:
API-xxx

Database:
...

Acceptance Criteria:
...

Tests:
...

Definition of Done:
...
```

AI Coding Handoff v1.0 tetap sama ketika package berubah.

---

# 42. Definition of Ready

Agent hanya memulai package jika:

```text id="zyf4v7"
✓ scope jelas
✓ relevant requirement tersedia
✓ dependencies terpenuhi
✓ relevant API contract tersedia
✓ relevant database design tersedia
✓ relevant screen behavior tersedia
✓ permission jelas
✓ acceptance criteria tersedia
```

Jika material requirement tidak cukup jelas, jangan menebaknya secara diam-diam.

---

# 43. Definition of Done

Baseline DoD:

```text id="22w29g"
✓ scoped implementation completed
✓ migration works
✓ backend validation implemented
✓ authorization implemented
✓ API behavior matches contract
✓ UI states implemented when applicable
✓ tests added
✓ tests pass
✓ build passes
✓ security constraints reviewed
✓ no secrets exposed
✓ acceptance criteria pass
✓ completion report generated
✓ no unresolved critical defect
```

Execution Package dapat menambahkan DoD khusus.

---

# 44. Completion Report

Setelah scope selesai, AI Coding Agent harus berhenti dan memberikan:

```text id="uk0tpi"
IMPLEMENTATION COMPLETION REPORT

Execution Package:
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

Migrations:
...

Files Created:
...

Files Modified:
...

Tests Added:
...

Tests Executed:
...

Test Result:
PASS / FAIL

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

Technical Decisions:
...

Ready for Next Package:
YES / NO
```

Agent tidak cukup hanya mengatakan:

```text id="36ylh6"
Done
```

---

# 45. Change Control

Jika ditemukan kebutuhan perubahan material:

```text id="7sacpb"
CHANGE REQUEST

ID:
CR-xxx

Trigger:
...

Current Requirement:
...

Problem:
...

Proposed Change:
...

Impact:
- PRD
- Workflow
- UI
- API
- Database
- Permission
- Security
- Reporting
- Tests

Recommendation:
...

Implementation Blocked:
YES / NO
```

Jangan implementasikan perubahan material sebelum keputusan dibuat apabila perubahan memengaruhi source of truth.

---

# 46. Technical Decision Rule

Agent boleh mengambil keputusan teknis sendiri jika:

```text id="p75r68"
tidak mengubah requirement
tidak mengubah workflow
tidak mengubah permission
tidak mengubah API contract
tidak mengubah financial behavior
tidak menurunkan security
```

Contoh:

* nama helper internal;
* pembagian service class;
* internal component extraction;
* harmless refactoring.

Dokumentasikan keputusan material pada Completion Report.

---

# 47. Prohibited Actions

AI Coding Agent dilarang:

```text id="9hj8of"
✗ mengubah PRD diam-diam
✗ membuat role baru tanpa requirement
✗ membuat workflow baru tanpa requirement
✗ mengubah financial state machine sepihak
✗ bypass backend authorization
✗ menyimpan plaintext password
✗ hardcode production secrets
✗ menyimpan financial amount dengan float
✗ mengedit posted financial data secara langsung
✗ menghapus original journal untuk koreksi
✗ membiarkan unbalanced journal diposting
✗ membiarkan posting ke closed period
✗ membuat duplicate posting
✗ menghapus audit history
✗ membuat public evidence file tanpa authorization
✗ menonaktifkan security untuk mempercepat development
✗ menghapus test hanya agar build hijau
✗ melanjutkan scope berikutnya tanpa instruksi
```

---

# 48. Required Implementation Workflow

Untuk setiap Execution Package:

```text id="9t77e4"
Read Package
      ↓
Check Dependencies
      ↓
Inspect Existing Code
      ↓
Plan Implementation
      ↓
Implement Small Increment
      ↓
Test
      ↓
Continue
      ↓
Run Full Relevant Tests
      ↓
Build
      ↓
Security Review
      ↓
Acceptance Verification
      ↓
Completion Report
      ↓
STOP
```

---

# 49. Existing Code Rule

Jika agent bekerja pada repository yang sudah memiliki code:

**jangan langsung mengganti architecture hanya karena berbeda dari preferensi agent.**

Pertama:

1. inspect;
2. pahami convention;
3. evaluasi terhadap specification;
4. reuse jika aman;
5. refactor hanya jika diperlukan.

Existing implementation yang memenuhi requirement tidak perlu ditulis ulang.

---

# 50. Failure Handling

Jika implementation gagal:

```text id="ck8w1u"
Identify Failure
      ↓
Determine Root Cause
      ↓
Fix Within Scope
      ↓
Retest
```

Jika root cause berasal dari requirement conflict:

```text id="ymzhon"
STOP
 ↓
Report Issue / Change Request
```

Jangan menyembunyikan failure dengan fallback yang mengubah business behavior.

---

# 51. Financial Release Blockers

Kondisi berikut merupakan blocker:

```text id="w58b5m"
Unbalanced posted journal
Duplicate posting
Unauthorized posting
Posted transaction editable
Closed period mutation
Ledger mismatch
Trial balance mismatch
Report not reconciling to ledger
Destructive reversal
Missing critical audit trail
```

Jangan menandai package/release `PASS` jika blocker terkait scope masih ada.

---

# 52. Traceability Requirement

Coding harus dapat ditelusuri:

```text id="45sjag"
Requirement
     ↓
Screen
     ↓
API
     ↓
Database
     ↓
Acceptance Criteria
     ↓
Test
```

Completion Report harus menyebut requirement yang benar-benar telah diimplementasikan.

Jangan mengklaim coverage requirement hanya karena sebagian UI telah dibuat.

---

# 53. Development Plan Relationship

Execution Package harus mengambil task dari:

```text id="l6zzws"
Development Plan v1.0
```

Baseline sequence:

```text id="vr2qps"
Foundation
→ Authentication & RBAC
→ Accounting Master
→ Income
→ Expense
→ Approval
→ Accounting Engine
→ Ledger & Trial Balance
→ Reversal & Period Control
→ Reporting
→ Hardening
→ UAT / Release
```

Dokumen ini tidak mengunci ukuran package.

Satu phase dapat menjadi satu atau beberapa Execution Package jika dibutuhkan.

---

# 54. Quality Gate

Sebelum Completion Report menyatakan `PASS`, lakukan:

```text id="l3fwj8"
Scope Check
Architecture Check
Validation Check
Authorization Check
Database Integrity Check
Security Check
Test Check
Build Check
Acceptance Check
Regression Check
```

Untuk financial package tambahkan:

```text id="id6op3"
Accounting Integrity Check
```

---

# 55. Final Instruction to AI Coding Agent

Anda mengimplementasikan Sistem Informasi Keuangan Yayasan berdasarkan dokumentasi proyek yang tersedia.

**Jangan mulai coding hanya berdasarkan dokumen ini tanpa Execution Package aktif.**

Ketika Execution Package diberikan:

1. baca requirement dan dependency;
2. inspect repository;
3. implementasikan hanya scope tersebut;
4. ikuti architecture, database, API, security dan accounting rules;
5. jangan mengubah requirement material;
6. tambahkan tests;
7. jalankan relevant test suite;
8. jalankan production build jika relevan;
9. verifikasi acceptance criteria;
10. hasilkan Completion Report;
11. berhenti setelah scope selesai.

Jika menemukan ambiguity implementation-level yang tidak mengubah behavior, pilih solusi sederhana, aman, maintainable dan dokumentasikan.

Jika ambiguity memengaruhi product behavior, accounting rule, permission, API, database relationship, atau security, buat Change Request.

# AI CODING HANDOFF v1.0 — BASELINE COMPLETE
