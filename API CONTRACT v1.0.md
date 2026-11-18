Kita lanjut ke **API Contract v1.0**. Kontrak ini diturunkan dari PRD v1.0 + Design Spec + Database Spec sebelumnya. PRD tetap menjadi source of truth; API tidak menambah requirement produk baru. Formatnya mengikuti standar handoff: endpoint → authentication → authorization → validation → response → side effect → transaction requirement. 

# API CONTRACT v1.0

## 1. API Conventions

**Base URL**

```text
/api/v1
```

Seluruh request/response menggunakan JSON kecuali upload/download file dan export laporan.

Semua endpoint protected membutuhkan authentication.

### Success envelope

```json
{
  "success": true,
  "message": "Operasi berhasil",
  "data": {}
}
```

### Validation error

```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": {
    "amount": [
      "Nominal harus lebih besar dari 0."
    ]
  }
}
```

### General error

```json
{
  "success": false,
  "message": "Operasi tidak dapat dilakukan."
}
```

Backend tidak boleh mengirim SQL error, stack trace, credential, path internal, atau detail exception sensitif ke client production.

---

# 2. HTTP Status Convention

| Status | Penggunaan                                   |
| ------ | -------------------------------------------- |
| `200`  | Request berhasil                             |
| `201`  | Resource berhasil dibuat                     |
| `204`  | Delete/action berhasil tanpa body            |
| `400`  | Request secara semantik tidak dapat diproses |
| `401`  | Belum/tidak terautentikasi                   |
| `403`  | Tidak mempunyai permission                   |
| `404`  | Resource tidak ditemukan                     |
| `409`  | Konflik state/data                           |
| `422`  | Validation error                             |
| `429`  | Terlalu banyak request                       |
| `500`  | Unexpected server error                      |

State conflict seperti mencoba posting transaksi yang sudah `POSTED` menggunakan `409 Conflict`.

---

# 3. Pagination Convention

Request:

```text
?page=1&per_page=20
```

Response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 127,
    "total_pages": 7
  }
}
```

`per_page` memiliki batas maksimum server-side untuk mencegah query yang berlebihan.

---

# 4. Filtering & Sorting

Convention:

```text
?status=SUBMITTED
&type=INCOME
&program_id=3
&date_from=2026-09-01
&date_to=2026-09-30
&search=donasi
&sort=-transaction_date
```

Prefix `-` berarti descending.

Backend hanya mengizinkan field sorting/filtering yang telah di-whitelist.

---

# 5. Authentication APIs

### API-001 — Login

```http
POST /api/v1/auth/login
```

**Actor:** Public

Request:

```json
{
  "email": "user@example.org",
  "password": "********"
}
```

Validation:

* email required;
* password required;
* user harus aktif;
* credential diverifikasi server-side.

Success:

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": 10,
      "name": "Nama Pengguna",
      "role": "PENGELOLA"
    }
  }
}
```

Credential salah menggunakan response generik sehingga tidak mengungkap apakah alamat email tertentu terdaftar.

Repeated failed login harus mendapatkan rate protection.

### API-002 — Logout

```http
POST /api/v1/auth/logout
```

Session/token aktif dinonaktifkan.

### API-003 — Current User

```http
GET /api/v1/auth/me
```

Mengembalikan profile, role dan permission efektif untuk membangun permission-aware UI.

---

# 6. User Management

### API-010 — User List

```http
GET /api/v1/users
```

**Permission:** Admin

Filter: `status`, `role`, `search`.

### API-011 — Create User

```http
POST /api/v1/users
```

```json
{
  "name": "Pengelola Keuangan",
  "email": "finance@example.org",
  "role_id": 2,
  "password": "********"
}
```

Backend memastikan email unik dan role valid.

Password tidak pernah dikembalikan pada response.

### API-012 — Update User

```http
PUT /api/v1/users/{id}
```

### API-013 — Change User Status

```http
POST /api/v1/users/{id}/status
```

```json
{
  "status": "INACTIVE"
}
```

User tidak dihapus hanya karena tidak lagi bekerja; account dapat dinonaktifkan agar histori transaksi tetap mempunyai actor.

---

# 7. Chart of Accounts API

### API-020 — Account List

```http
GET /api/v1/accounts
```

Filter:

```text
type
parent_id
is_active
is_postable
search
```

### API-021 — Create Account

```http
POST /api/v1/accounts
```

**Permission:** Admin

```json
{
  "code": "4101",
  "name": "Donasi Tanpa Pembatasan",
  "type": "INCOME",
  "normal_balance": "CREDIT",
  "parent_id": 20,
  "is_postable": true
}
```

Validation:

* code unique;
* name required;
* type valid;
* normal balance valid;
* parent exists jika diberikan;
* struktur parent tidak boleh membentuk circular hierarchy.

### API-022 — Update Account

```http
PUT /api/v1/accounts/{id}
```

Perubahan tidak boleh merusak transaksi historis.

### API-023 — Deactivate Account

```http
POST /api/v1/accounts/{id}/deactivate
```

Akun yang telah digunakan tidak di-hard-delete.

---

# 8. Program API

### API-030

```http
GET /api/v1/programs
```

### API-031

```http
POST /api/v1/programs
```

**Permission:** Admin

Request:

```json
{
  "code": "YATIM",
  "name": "Yatim Piatu",
  "description": "Program pelayanan yatim piatu"
}
```

### API-032

```http
PUT /api/v1/programs/{id}
```

### API-033

```http
POST /api/v1/programs/{id}/deactivate
```

Program historis tidak dihapus.

---

# 9. Donor API

### API-040 — Donor List

```http
GET /api/v1/donors
```

Admin/Pengelola dapat search donor untuk input penerimaan.

### API-041 — Create Donor

```http
POST /api/v1/donors
```

```json
{
  "name": "Hamba Allah",
  "phone": null,
  "email": null,
  "address": null,
  "notes": null
}
```

### API-042 — Update Donor

```http
PUT /api/v1/donors/{id}
```

Data donor hanya dikembalikan sesuai kebutuhan UI untuk mengurangi exposure data pribadi.

---

# 10. Kas & Bank API

### API-050

```http
GET /api/v1/cash-bank-accounts
```

Response dapat menampilkan derived balance sesuai permission:

```json
{
  "id": 4,
  "name": "Bank Operasional",
  "type": "BANK",
  "account": {
    "id": 21,
    "code": "1102"
  },
  "balance": "25450000.00"
}
```

`balance` merupakan hasil ledger, bukan mutable database field.

### API-051

```http
POST /api/v1/cash-bank-accounts
```

**Permission:** Admin.

---

# 11. Transaction List

### API-060 — Transaction List

```http
GET /api/v1/transactions
```

Filters:

```text
type
status
program_id
donor_id
created_by
date_from
date_to
search
```

Pengelola menerima data sesuai authorization policy.

---

# 12. API-061 — Create Income

```http
POST /api/v1/transactions/income
```

**Actors:** Admin, Pengelola

Request:

```json
{
  "transaction_date": "2026-09-24",
  "cash_bank_account_id": 2,
  "donor_id": 15,
  "program_id": 1,
  "restriction_type": "WITH_RESTRICTION",
  "income_account_id": 41,
  "amount": "1000000.00",
  "description": "Donasi program yatim September"
}
```

Server validation:

* tanggal valid;
* period harus `OPEN`;
* kas/bank aktif;
* account aktif dan postable;
* amount `> 0`;
* donor valid jika diberikan;
* program valid;
* restriction value valid.

Backend membuat transaction dalam `DRAFT`.

Response `201 Created`.

---

# 13. API-062 — Create Expense

```http
POST /api/v1/transactions/expense
```

Request:

```json
{
  "transaction_date": "2026-09-24",
  "cash_bank_account_id": 2,
  "program_id": 1,
  "expense_account_id": 5101,
  "counterparty_name": "Toko ABC",
  "amount": "750000.00",
  "description": "Pembelian kebutuhan program yatim"
}
```

Server melakukan validasi periode, akun, program, amount dan permission.

---

# 14. API-063 — Transaction Detail

```http
GET /api/v1/transactions/{id}
```

Response konseptual:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "transaction_no": "TRX-2026-000123",
    "type": "INCOME",
    "transaction_date": "2026-09-24",
    "amount": "1000000.00",
    "status": "SUBMITTED",
    "program": {},
    "donor": {},
    "attachments": [],
    "journal_preview": {
      "debit": [],
      "credit": []
    },
    "approval_history": [],
    "allowed_actions": [
      "VIEW"
    ]
  }
}
```

Untuk Owner yang sedang meninjau, `allowed_actions` dapat berisi `APPROVE`, `REJECT`.

UI dapat menggunakan data tersebut untuk presentation, tetapi backend tetap memvalidasi action.

---

# 15. API-064 — Update Draft Transaction

```http
PUT /api/v1/transactions/{id}
```

Allowed jika:

```text
status = DRAFT
```

atau sesuai correction workflow setelah rejection.

Pengelola hanya boleh mengubah transaksi sesuai ownership policy.

`POSTED` menghasilkan:

```http
409 Conflict
```

---

# 16. API-065 — Submit Transaction

```http
POST /api/v1/transactions/{id}/submit
```

Preconditions:

* transaction editable;
* required data lengkap;
* accounting period open;
* journal preview valid;
* attachment requirement terpenuhi;
* user authorized.

State:

```text
DRAFT → SUBMITTED
```

Side effects:

* `submitted_at` diset;
* audit event dibuat.

---

# 17. Approval APIs

### API-070 — Approval Queue

```http
GET /api/v1/approvals/pending
```

**Permission:** Owner

Filters: type, date, program, creator.

### API-071 — Approve

```http
POST /api/v1/transactions/{id}/approve
```

**Permission:** Owner

Precondition:

```text
status = SUBMITTED
```

Request:

```json
{
  "comments": "Disetujui"
}
```

Atomic side effects:

```text
Create approval history
+
SUBMITTED → APPROVED
+
approved_at
+
audit log
```

### API-072 — Reject

```http
POST /api/v1/transactions/{id}/reject
```

Request:

```json
{
  "reason": "Bukti transaksi belum lengkap."
}
```

Reason required.

State:

```text
SUBMITTED → REJECTED
```

Rejection tidak menghapus transaksi.

---

# 18. Correction After Rejection

Untuk menghindari ambiguous transition, saya finalkan workflow:

```text
REJECTED
    ↓
Edit oleh creator/Admin
    ↓
DRAFT
    ↓
Resubmit
    ↓
SUBMITTED
```

Riwayat rejection lama tetap berada di approval history.

Ini memperjelas BR dan implementation state machine tanpa menghapus histori.

---

# 19. API-080 — Posting

```http
POST /api/v1/transactions/{id}/post
```

**Permission:** Admin

Ini endpoint finansial paling kritis.

Preconditions:

```text
Transaction status = APPROVED
Accounting period = OPEN
Not already posted
Valid account mapping
Journal balanced
```

Backend harus melakukan row lock yang sesuai dan menjalankan operasi dalam database transaction.

Pseudo-flow:

```text
BEGIN

LOCK transaction

verify APPROVED
verify OPEN period
verify not posted

generate/finalize journal
validate entries

SUM(debit) == SUM(credit)

save journal
save entries
mark journal POSTED
mark transaction POSTED
write audit log

COMMIT
```

Success:

```json
{
  "success": true,
  "message": "Transaksi berhasil diposting.",
  "data": {
    "transaction_id": 123,
    "status": "POSTED",
    "journal": {
      "id": 87,
      "journal_no": "JRN-2026-000087"
    }
  }
}
```

Repeated posting:

```http
409 Conflict
```

Tidak boleh menghasilkan jurnal kedua.

---

# 20. Manual Journal API

### API-090 — Create Journal

```http
POST /api/v1/journals
```

Request:

```json
{
  "journal_date": "2026-09-24",
  "description": "Penyesuaian akhir bulan",
  "entries": [
    {
      "account_id": 31,
      "program_id": null,
      "debit": "500000.00",
      "credit": "0.00"
    },
    {
      "account_id": 62,
      "program_id": null,
      "debit": "0.00",
      "credit": "500000.00"
    }
  ]
}
```

Validation:

```text
entries >= 2
debit >= 0
credit >= 0
one side per line
all accounts active/postable
period OPEN
SUM(debit) = SUM(credit)
```

Jurnal manual tetap mengikuti approval/posting control sesuai policy PRD; pembuatan jurnal tidak otomatis berarti ledger telah berubah.

---

# 21. Journal APIs

```http
GET /api/v1/journals
GET /api/v1/journals/{id}
```

Journal detail menampilkan entries, source transaction, status, creator dan posting information.

Posted journal bersifat read-only.

---

# 22. Reversal APIs

### API-100 — Request Reversal

```http
POST /api/v1/transactions/{id}/reversal-request
```

Admin mengirim:

```json
{
  "reason": "Nominal transaksi salah."
}
```

Preconditions:

* original transaction `POSTED`;
* period policy memungkinkan reversal;
* tidak mempunyai reversal aktif.

### API-101 — Approve Reversal

```http
POST /api/v1/reversals/{id}/approve
```

**Permission:** Owner

Reversal harus membuat transaksi/jurnal pembalik; tidak mengubah nominal journal asli.

Contoh:

Original:

```text
Debit  Kas             1.000.000
Credit Pendapatan      1.000.000
```

Reversal:

```text
Debit  Pendapatan      1.000.000
Credit Kas             1.000.000
```

Original dan reversal saling mereferensikan.

---

# 23. Attachment APIs

### API-110

```http
POST /api/v1/transactions/{id}/attachments
```

Gunakan `multipart/form-data`.

Allowed:

```text
PDF
JPG
JPEG
PNG
```

Server memvalidasi MIME, extension dan ukuran.

### API-111

```http
GET /api/v1/transactions/{id}/attachments/{attachmentId}
```

Download membutuhkan authentication + authorization terhadap transaction.

Storage tidak dibuat public hanya karena user mengetahui URL/path.

---

# 24. Ledger API

### API-120

```http
GET /api/v1/ledger
```

Parameters:

```text
account_id      required
date_from       required
date_to         required
program_id      optional
page            optional
per_page        optional
```

Response:

```json
{
  "success": true,
  "data": {
    "account": {
      "code": "1101",
      "name": "Kas"
    },
    "opening_balance": "5000000.00",
    "entries": [
      {
        "date": "2026-09-24",
        "reference": "JRN-2026-000087",
        "description": "Donasi",
        "debit": "1000000.00",
        "credit": "0.00",
        "balance": "6000000.00"
      }
    ],
    "closing_balance": "6000000.00"
  }
}
```

Hanya `POSTED journals` diperhitungkan.

---

# 25. Trial Balance API

### API-121

```http
GET /api/v1/trial-balance
```

Parameters:

```text
date_from
date_to
program_id optional
```

Response harus menyertakan control totals:

```json
{
  "success": true,
  "data": {
    "accounts": [],
    "total_debit": "175000000.00",
    "total_credit": "175000000.00",
    "balanced": true
  }
}
```

`balanced=false` harus diperlakukan sebagai integrity warning.

---

# 26. Accounting Period APIs

### API-130

```http
GET /api/v1/accounting-periods
```

### API-131 — Request Closing

```http
POST /api/v1/accounting-periods/{id}/close-request
```

**Admin**

Pre-closing checks minimal:

* tidak ada transaksi `SUBMITTED`;
* tidak ada transaksi `APPROVED` belum posted;
* journal posted balance valid;
* period belum closed.

### API-132 — Approve Closing

```http
POST /api/v1/accounting-periods/{id}/close-approve
```

**Owner**

State:

```text
OPEN
 ↓
CLOSING_REQUESTED
 ↓
CLOSED
```

### API-133 — Request Reopen

```http
POST /api/v1/accounting-periods/{id}/reopen-request
```

Reason wajib.

### API-134 — Approve Reopen

```http
POST /api/v1/accounting-periods/{id}/reopen-approve
```

**Owner**

Audit log wajib.

---

# 27. Financial Report APIs

### API-140 — Financial Position

```http
GET /api/v1/reports/financial-position
```

### API-141 — Comprehensive Income

```http
GET /api/v1/reports/comprehensive-income
```

### API-142 — Changes in Net Assets

```http
GET /api/v1/reports/net-assets
```

### API-143 — Cash Flow

```http
GET /api/v1/reports/cash-flow
```

Common parameters:

```text
date_from
date_to
program_id optional
```

Semua angka berasal dari ledger/journal posted.

API tidak menerima angka laporan dari frontend.

Mapping akun ke presentation report akan mengikuti konfigurasi/mapping COA final yang masih menjadi checkpoint PRD.

---

# 28. Operational Reports

```http
GET /api/v1/reports/income
GET /api/v1/reports/expenses
GET /api/v1/reports/programs
GET /api/v1/reports/donors
GET /api/v1/reports/cash-bank
```

Filter dapat mencakup periode, program, sumber dana dan account sesuai report.

---

# 29. Export

Contoh:

```http
GET /api/v1/reports/financial-position/export?format=pdf
```

atau:

```text
format=xlsx
```

Export wajib menggunakan filter/periode yang sama dengan report screen.

Generated document mencantumkan nama yayasan, nama laporan, periode dan generated timestamp.

---

# 30. Audit API

### API-150

```http
GET /api/v1/audit-logs
```

**Permission:** Admin, Owner

Filters:

```text
actor_id
action
entity_type
entity_id
date_from
date_to
```

Tidak ada API normal untuk:

```text
DELETE /audit-logs/{id}
```

Audit log bukan CRUD biasa.

---

# 31. Dashboard API

### API-160

```http
GET /api/v1/dashboard
```

Backend menentukan data berdasarkan role.

Owner response dapat berisi:

```json
{
  "cash_bank_balance": "45250000.00",
  "period_income": "18500000.00",
  "period_expense": "11750000.00",
  "pending_approvals": 8,
  "program_summary": [],
  "fund_restriction_summary": [],
  "income_expense_trend": []
}
```

Pengelola mendapat operational summary, bukan administrative information yang tidak dibutuhkan.

---

# 32. Authorization Matrix pada API

| Domain                |  Admin |  Pengelola | Owner |
| --------------------- | :----: | :--------: | :---: |
| Users                 | Manage |      —     |   —   |
| COA                   | Manage |    Read    |  Read |
| Program               | Manage |    Read    |  Read |
| Donor                 | Manage |   Manage   |  Read |
| Transaction           | Manage | Own/manage |  Read |
| Submit                |    ✓   |      ✓     |   —   |
| Approve               |    —   |      —     |   ✓   |
| Post                  |    ✓   |      —     |   —   |
| Reversal Request      |    ✓   |      —     |   —   |
| Reversal Approval     |    —   |      —     |   ✓   |
| Ledger                |    ✓   |      ✓     |   ✓   |
| Reports               |    ✓   |      ✓     |   ✓   |
| Period Close Request  |    ✓   |      —     |   —   |
| Period Close Approval |    —   |      —     |   ✓   |
| Audit                 |    ✓   |      —     |   ✓   |

Endpoint tidak boleh hanya mengandalkan role string dari request/client.

Identity berasal dari authenticated principal.

---

# 33. Financial State Machine

State transition harus dikendalikan service/domain layer:

```text
              ┌──────── REJECT ────────┐
              │                         ↓
DRAFT ──→ SUBMITTED ──→ APPROVED ──→ POSTED
 ↑              │                       │
 │              ↓                       ↓
 └────────── REJECTED              REVERSAL
                                      ↓
                                   REVERSED
```

Transition ilegal menghasilkan `409 Conflict`.

Contoh:

```text
DRAFT → POSTED       ✗
SUBMITTED → POSTED   ✗
POSTED → DRAFT       ✗
POSTED → DELETE      ✗
```

---

# 34. Error Codes

Selain HTTP status, domain error sebaiknya memiliki machine-readable code.

Contoh:

```json
{
  "success": false,
  "message": "Periode akuntansi telah ditutup.",
  "error": {
    "code": "ACCOUNTING_PERIOD_CLOSED"
  }
}
```

Core codes:

```text
VALIDATION_FAILED
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND

INVALID_STATE_TRANSITION
ACCOUNTING_PERIOD_CLOSED
JOURNAL_NOT_BALANCED
ACCOUNT_INACTIVE
PROGRAM_INACTIVE
TRANSACTION_ALREADY_POSTED
REVERSAL_ALREADY_EXISTS
ATTACHMENT_REQUIRED
```

Frontend menggunakan `message` untuk user; `code` dapat menentukan behavior yang konsisten.

---

# 35. API Security Requirements

Semua financial mutation wajib melewati:

```text
Authentication
      ↓
Authorization
      ↓
Payload Validation
      ↓
Resource/State Validation
      ↓
Accounting Rules
      ↓
Database Transaction jika kritis
      ↓
Audit
```

Mass assignment harus dikontrol. Client tidak boleh dapat mengirim:

```text
status = POSTED
approved_at = ...
posted_by = ...
role = OWNER
```

dan mengubah state internal melalui generic update endpoint.

State hanya berubah melalui domain action endpoint.

---

# 36. API Traceability

| Requirement | Screen         | API         |
| ----------- | -------------- | ----------- |
| FR-001      | PG-001         | API-001–003 |
| FR-002      | PG-020         | API-010–013 |
| FR-003      | PG-015         | API-020–023 |
| FR-004      | PG-016         | API-030–033 |
| FR-005      | PG-017         | API-040–042 |
| FR-006      | PG-018         | API-050–051 |
| FR-007      | PG-004         | API-061     |
| FR-008      | PG-006         | API-062     |
| FR-011      | PG-010         | API-065     |
| FR-012      | PG-009         | API-070–072 |
| FR-013      | PG-010         | API-080     |
| FR-014      | PG-011         | API-120     |
| FR-015      | PG-012         | API-121     |
| FR-016/017  | PG-019         | API-130–134 |
| FR-018      | PG-010         | API-100–101 |
| FR-019      | PG-013         | API-140–143 |
| FR-021      | PG-004/006/010 | API-110–111 |
| FR-022      | PG-021         | API-150     |
| FR-023      | PG-002         | API-160     |

---

# 37. API Quality Gate

API Contract telah diperiksa terhadap requirement utama:

**Authentication:** ✓
**Backend authorization:** ✓
**Object/state authorization:** ✓
**Validation:** ✓
**Approval:** ✓
**Posting transaction:** ✓
**Double-post protection:** ✓
**Closed-period protection:** ✓
**Balanced journal:** ✓
**Reversal instead of destructive editing:** ✓
**Private attachments:** ✓
**Auditability:** ✓
**Ledger/report from posted entries:** ✓
**Consistent errors:** ✓
**Pagination/filtering:** ✓

---

# 38. Development Plan

Dengan PRD, Design Spec, Database Spec, dan API Contract sekarang tersedia, dependency pembangunan sudah cukup jelas.

Saya rekomendasikan development menggunakan **vertical slices**, bukan membuat seluruh database lalu seluruh backend lalu seluruh frontend. Ini juga sesuai prinsip handoff pada standar Anda. 

Urutan implementasi:

```text
PHASE 0
Project Foundation
       ↓
PHASE 1
Authentication + RBAC
       ↓
PHASE 2
Accounting Master Data
       ↓
PHASE 3
Income Vertical Slice
       ↓
PHASE 4
Expense Vertical Slice
       ↓
PHASE 5
Approval
       ↓
PHASE 6
Accounting Engine + Posting
       ↓
PHASE 7
Ledger + Trial Balance
       ↓
PHASE 8
Reversal + Period Closing
       ↓
PHASE 9
Financial Reports
       ↓
PHASE 10
Audit + Export + Hardening
       ↓
PHASE 11
UAT + Production
```

### Phase 0 — Foundation

`DEV-001` Setup React + Vite + Tailwind.

`DEV-002` Setup Laravel REST API.

`DEV-003` Configure MySQL/MariaDB.

`DEV-004` Configure environment Development/Staging.

`DEV-005` API response/error convention.

`DEV-006` Base frontend layout/design system.

### Phase 1 — Authentication & RBAC

`DEV-010` roles/users migration.

`DEV-011` authentication backend.

`DEV-012` authorization policies.

`DEV-013` login frontend.

`DEV-014` protected routes.

`DEV-015` user management.

`DEV-016` permission tests.

### Phase 2 — Accounting Master

`DEV-020` COA domain + API + UI.

`DEV-021` Program domain + API + UI.

`DEV-022` Donor domain + API + UI.

`DEV-023` Cash/Bank domain + API + UI.

`DEV-024` Accounting Period domain.

### Phase 3 — Income Vertical Slice

```text
Migration
→ Model
→ Validation
→ Service
→ API
→ Permission
→ UI
→ Attachment
→ Test
```

`DEV-030` Transaction foundation.

`DEV-031` Income API.

`DEV-032` Income form/list/detail.

`DEV-033` journal preview.

`DEV-034` attachment handling.

`DEV-035` income tests.

### Phase 4 — Expense

`DEV-040` Expense API/domain.

`DEV-041` Expense UI.

`DEV-042` Program classification.

`DEV-043` Expense validation.

`DEV-044` Expense tests.

### Phase 5 — Approval

`DEV-050` approval schema/domain.

`DEV-051` approval queue.

`DEV-052` approve action.

`DEV-053` reject/correction workflow.

`DEV-054` permission/concurrency tests.

### Phase 6 — Accounting Engine

Ini phase dengan risiko teknis tertinggi.

`DEV-060` Journal service.

`DEV-061` Journal entry validation.

`DEV-062` automatic journal generation.

`DEV-063` posting transaction service.

`DEV-064` row locking/double-post protection.

`DEV-065` posted transaction lock.

`DEV-066` accounting integrity tests.

### Phase 7 — Ledger

`DEV-070` ledger query.

`DEV-071` opening/closing balance.

`DEV-072` ledger UI.

`DEV-073` trial balance.

`DEV-074` reconciliation tests.

### Phase 8 — Controls

`DEV-080` reversal workflow.

`DEV-081` reversal journal.

`DEV-082` period closing.

`DEV-083` period reopening.

`DEV-084` audit verification.

### Phase 9 — Reporting

Dilaksanakan setelah **COA → report mapping** tervalidasi.

`DEV-090` report mapping layer.

`DEV-091` financial position.

`DEV-092` comprehensive income.

`DEV-093` changes in net assets.

`DEV-094` cash flow.

`DEV-095` management reports.

### Phase 10 — Hardening

`DEV-100` audit log UI.

`DEV-101` PDF/XLSX export.

`DEV-102` security testing.

`DEV-103` responsive QA.

`DEV-104` regression accounting.

`DEV-105` performance/query optimization.

### Phase 11 — Release

`DEV-110` staging deployment.

`DEV-111` migration verification.

`DEV-112` backup automation.

`DEV-113` restore test.

`DEV-114` UAT.

`DEV-115` production deployment.

`DEV-116` production smoke test.

---

# 39. Coding Gate

Kita sekarang sudah memiliki:

```text
PRD
 ↓
Design Spec
 ↓
Database Spec
 ↓
API Contract
 ↓
Development Plan
```

Semua layer utama sudah traceable dan mengikuti prinsip source-of-truth pada PRD Master Standard. 
