# Application Points Implementation

## Scope

This document records the implemented requirements from the application-points review. It is intended for release verification and describes product behavior, not source-code internals.

## Remitters

### Branch access

- `MULTI_BRANCH` is a Remitters permission. It is no longer a Branches permission.
- A staff member without `REMITTERS > MULTI_BRANCH` is automatically assigned to their own branch. The branch selector is not shown on create or edit.
- A staff member with `REMITTERS > MULTI_BRANCH` can select a branch, see remitter records from all branches, and use permitted Dilisense report actions across those branches.
- The list page only shows the Branch filter to users with `MULTI_BRANCH`.
- Branch display labels use the branch name. Internal branch codes are not intentionally shown to the user.

### Reference identity

- Reference ID is required for web-created remitters and is unique within the selected branch.
- Matching is case-insensitive and ignores leading/trailing or repeated spaces, preventing superficial duplicates.
- The create form displays the most recently saved Reference ID for the active branch as context only; it does not generate or alter the entered ID.
- Existing historic duplicate reference IDs are retained without alteration. New records and changed IDs are protected by application validation and a database unique index.

### Profile fields and statuses

- Gender is a dropdown with `Male`, `Female`, `Other`, and `Prefer not to say` choices.
- The remitter list and overview calculate ID status from the expiry date: `ID Expired` is red and `Valid ID` is green. Records without sufficient verification data remain `Pending`.
- `Suspended` remains an account status where it is already used by the mobile-profile workflow; it is not a duplicate permission or an unused display value.
- Mobile-number duplicate checks remain active across remitters and receivers.
- File controls retain their selected-file feedback. The API only accepts supported files and returns a validation error when storage rejects a file.

### AML screening

- Dilisense actions remain permission-gated: `DILISENSE_SCREENING`, `RE_SCREENING`, `BATCH_SCREENING`, report access, and delete access are independently controlled.
- When the Dilisense provider reports exhausted credits, the API responds with HTTP `429` and `quota_limit_reached` instead of a generic server error.
- Remitter and receiver interfaces show `Dilisense quota reached` with an actionable provider-allowance message.
- Standard screening failures still show their provider message and do not get mislabeled as quota failures.

### Removed obsolete remitter permissions

- The legacy Remitters `EXPORT` grant and its unused CSV implementation are removed.
- The legacy Branches `MULTI_BRANCH` grant is migrated to Remitters `MULTI_BRANCH`.
- No active operation is removed solely because it was not listed in the review; permissions such as `VIEW`, `EDIT`, `DELETE`, screening, compliance reports, and batch screening remain because they guard real actions.
- Legacy `ADD` permissions are normalized to the single canonical `CREATE` permission, and the catalogue migration removes unsupported or duplicate permission rows across every page section.

## Receivers

- Receiver visibility follows the parent remitter's branch. A user with Remitters `MULTI_BRANCH` can access receivers for remitters they are permitted to see.
- Receiver Dilisense report generation uses the same quota-aware response and UI as remitters.
- Own/Agent is a receiver ownership choice, while the default transaction type is a separate configuration concern. These fields must not be coupled without a confirmed business rule.

## Dashboard and transaction settings

- Dashboard cards are permission-aware and only render data/actions relevant to the signed-in role.
- Transaction settings remain available to the Flutter client because the application uses them to enforce rolling three-month and calendar-year transaction limits. Restricting the public configuration read endpoint behind an admin permission would break that mobile safeguard.

## Profile photos

- The administration profile page uploads a cropped JPG through `POST /users/{id}/profile-photo`.
- The backend accepts JPG, PNG, and WebP up to 5 MB and saves them under `public/uploads/users`.
- The deployment must include the route and must allow the web-server user to create and write `public/uploads/users`. If uploads fail on live while the UI is present, verify deployment first, then filesystem ownership/permissions.

## Database migration

### Remitters table structure

`remitters` is the primary customer table. Its main field groups are:

| Group | Fields |
| --- | --- |
| Identity | `id` (primary key), `sender_id`, `sender_id_key`, `sender_id_branch_key`, `name`, `sender_name`, `dob`, `gender`, `place_of_birth`, `occupation` |
| Contact and address | `email`, `phone`, `address_1`, `address_2`, `city`, `county`, `postcode`, `country` |
| Branch and operational state | `branch`, `status`, `registration_source`, `role`, `client_type`, `use_in` |
| Identity documents | `id_type`, `id_number`, `id_issued_date`, `id_expiry`, `id_copy`, `passport_copy`, `proof_of_address_doc`, `work_related_docs`, `other_doc` |
| AML | `sanction_status`, `sanction_score`, `sanction_reference`, `sanction_checked_at`, `sanction_raw_payload`, `sender_aml_result`, `sender_details_aml_screening_doc` |
| KYC and Veriff | `kyc_status`, `kyc_updated_at`, `veriff_session_id`, `veriff_attempt_id`, `veriff_status`, `veriff_decision`, `veriff_checked_at`, `veriff_media_files` |
| Audit | `created_at`, `updated_at`, `created_by`, `updated_by` |

The migration adds a composite unique index on `(sender_id_branch_key, sender_id_key)`. Those normalized fields are internal safeguards; the user-facing field remains `sender_id`.

### Branches table structure

`branches` defines the operational branch catalog. Core fields are `id` (primary key), `name`, `code`, `transaction_prefix`, `type`, `status`, default transaction configuration, branch ownership type, contact/address values, and audit timestamps. Remitters store a branch value and the API resolves that value to the corresponding branch `code`/`name` for access control and display.

Receivers are stored in `beneficiaries`; their `customer_id` relates them to `remitters.id`. Therefore receiver branch visibility is derived from the owning remitter instead of duplicating a separate branch-access model.

Apply the backend migration after deploying the backend code:

```bash
php spark migrate
```

Migration `2026-08-17-095000_MoveMultiBranchAndAddRemitterIdentityFields`:

- adds `gender`, `sender_id_key`, and `sender_id_branch_key` to `remitters` when absent;
- moves active legacy `MULTI_BRANCH` grants from Branches to Remitters;
- removes legacy Remitters `EXPORT` grants;
- backfills unambiguous reference-ID keys; and
- creates the branch/reference uniqueness index.

Run `php spark migrate:status` before and after deployment. Back up the production database before migration. Do not import a full development SQL dump over production for this change.

## Release verification

1. Sign in as a role without `REMITTERS > MULTI_BRANCH`: create/edit a remitter and confirm no Branch selector is shown and the saved record belongs to that user’s branch.
2. Sign in as a role with `REMITTERS > MULTI_BRANCH`: confirm branch selector and branch filter are available, select another branch, and save a remitter.
3. Attempt to create the same Reference ID twice in the same branch: the second attempt must be rejected. Use the same ID in another branch: it must be accepted.
4. Set an ID expiry date in the past and confirm `ID Expired`; use a future date and confirm `Valid ID`.
5. Trigger a Dilisense provider quota response and confirm the UI displays `Dilisense quota reached`, not `Failed to run Dilisense check`.
6. Upload a JPG profile photo and confirm it displays after page refresh. If it fails, inspect the backend response and writable status of `public/uploads/users`.

## Business decisions still required

- Define the business meaning of Receiver `Own` versus `Agent` and any workflow consequences. The system stores the selection but should not invent accounting, settlement, or approval behavior without a signed-off rule.

Company values remain as historical remitter attributes where data exists, but the Remitters Directory does not display a Company column.
