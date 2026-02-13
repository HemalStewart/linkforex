# LinkForex Admin Flow Guide

## 1) What This System Does
This platform manages branch-based remittance operations with strict access control, operational approvals, and auditability.

It covers:
- System users and branch users
- Roles and operation-level permissions
- Branch and branch-currency-rate setup
- Sender (remitter) and receiver management
- Transfer lifecycle (create, approve/cancel, print, sign)
- Session logs and audit logs
- Mobile app user/remitter integration

---

## 2) High-Level Architecture
- Frontend: Next.js admin panel (`/Users/lakminiinternational/linkforex`)
- Backend: CodeIgniter API (`/Applications/MAMP/htdocs/linforex_backend`)
- Database: MySQL (MAMP)

Key implementation detail:
- Frontend sends acting-user context on API requests:
  - Header: `X-Acting-User-Id`
  - Query param: `acting_user_id`
- Backend uses this to enforce branch and role permissions consistently.

---

## 3) User Types
1. Privileged users:
- Admin/Super/System-defined users
- Can access cross-branch data and administrative actions

2. Branch users:
- Staff/supervisor users linked to a branch
- Limited to branch scope unless approved cross-branch sharing exists

---

## 4) Branch Model
1. Every system user is linked to a branch.
2. Every sender (remitter) has an owner/home branch.
3. Branch currency rates are configured per branch + payout currency.
4. Transfers are branch-contextual and branch-secured.

---

## 5) Permission Model
Permission is operation-level and role-driven:
- Entity: `permission_groups`
- Keys:
  - `role_name`/`role_id`
  - `page_section`
  - `operation` (`VIEW`, `ADD`, `EDIT`, `DELETE`, `APPROVE`, `CANCEL`, etc.)
  - `active`

Important behavior:
- Sidebar menu visibility is controlled by available `VIEW` permissions.
- Backend always enforces permissions, even if UI is modified.

---

## 6) Branch Access Rules (Core Logic)
### 6.1 Same-Branch Scenario
If sender belongs to current branch:
- Transfer can proceed normally (subject to permissions and validations).

### 6.2 Cross-Branch Scenario
If sender belongs to a different branch:
1. System blocks transfer creation.
2. System creates/uses a `branch_access_requests` record (`pending`).
3. Previous branch (owner branch) must approve/reject.
4. Until approved, transfer remains blocked in requesting branch.

### 6.3 After Approval
1. Request status becomes `approved`.
2. Sender becomes visible in requesting branch as **Shared** (no duplicate sender row).
3. Requesting branch can create transfers for that sender.
4. Owner branch still controls sender master record edit/delete.

---

## 7) Transfer Lifecycle
1. User opens `Create Transfer`.
2. Selects sender and receiver.
3. System checks branch access constraints for sender/receiver.
4. System loads active branch currency rate and calculates transfer amounts.
5. User submits transfer.
6. Transfer starts in `pending`.
7. Authorized user performs `approve` or `cancel`.
8. Transfer can be:
- Printed as invoice
- Signed (canvas/upload signature)
- Reviewed in detail page with audit history

---

## 8) Logs and Audit
1. User Logs:
- Sign-in recorded with IP and country lookup
- Sign-off recorded for manual logout and session timeout
- Session period and sign-off notes visible

2. Audit Logs:
- Change tracking for key entities and actions
- Transfer details page includes history with filters and pagination

---

## 9) Mobile App Flow (Integrated)
1. Mobile user registers as remitter with `registration_source = mobile_app`.
2. OTP verification flow activates account.
3. Mobile login uses app-specific endpoint.
4. KYC status can be retrieved/updated through API endpoints.

---

## 10) End-to-End Demo Script (Client Presentation)
1. Login as Admin.
2. Show Roles and Permission Groups.
3. Show System Users and branch assignment.
4. Open Branches and Branch Currency Rates.
5. Login as Branch A staff and create/verify sender list visibility.
6. Login as Branch B staff and attempt transfer with Branch A sender.
7. Show blocked transfer message and Branch Access Request creation.
8. Login as Branch A reviewer and approve request in `Branch Access Flags`.
9. Login back as Branch B and create transfer successfully.
10. Show transfer list row, detail page, print view, and signature capture.
11. Approve/cancel transfer (with permitted role).
12. Open Logs and show sign-in/sign-off/session records.
13. Open transfer history/audit logs for complete traceability.

---

## 11) Screenshot Checklist
Capture these screens for proposal or handover:
1. Dashboard overview
2. Roles list
3. Permission Groups list
4. System Users list
5. Branches list
6. Branch Currency Rates list
7. Remitters list (normal and shared badge)
8. Receivers list
9. Create Transfer page (all sections visible)
10. Cross-branch blocked warning on transfer
11. Branch Access Flags page with pending request
12. Branch Access Flags page after approval
13. Transfers table (approve/cancel/sign/print actions visible)
14. Transfer detail page (overview/sender/receiver/history)
15. User Logs page
16. Reports page

---

## 12) Notes for Client Communication
1. Branch segregation is enforced by backend, not just UI.
2. Cross-branch transfers require owner-branch approval.
3. Approved cross-branch access is shared logically (no duplicate customer record).
4. Every critical operation is permission-controlled and auditable.
5. This supports operational control, compliance, and accountability.

---

## 13) API Areas Involved (Reference)
- Auth: `Auth.php`
- Users: `Users.php`
- Roles: `Roles.php`
- Permission Groups: `PermissionGroups.php`
- Branches: `Branches.php`
- Branch Currency Rates: `BranchCurrencyRates.php`
- Remitters: `Remitters.php`
- Beneficiaries: `Beneficiaries.php`
- Transfers: `Transfers.php`
- Branch Access Requests: `BranchAccessRequests.php`
- Logs: `Logs.php`
- Audit Logs: `AuditLogs.php`
- Reports: `Reports.php`
- Shared enforcement trait: `ResolvesActingUser.php`

