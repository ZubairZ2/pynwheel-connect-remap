# Property clone: test administrator bootstrap

The test administrator is created through the existing Devise + role model, by `PropertyClone::TestAdmin` (`rake property_clone:test_admin[<clone company id>,<clone property id>]`). No new login system, no new role.

## What it creates

| Field | Value | Why |
|---|---|---|
| `users.email` | the requested address (`test@gmail.com`), lower-cased | identity |
| `users.role` | `Community admin` | reach = the assigned properties (`User#can_access_community?`, `AccessibleCommunitiesQuery`) plus read/update of its own company (`Ability`). Not `Company admin`: that role has no rule in `Ability`, `CompaniesController` answers it 403 and Connect's sign-in route (which verifies the session with `GET /companies.json`) then refuses the sign-in altogether (found October 29, 2026) |
| `users.company_id` | the clone company | `Ability` scopes `Company` and `Community` rules to it; it owns exactly the cloned property |
| `users.pynwheel_connect_access` | true | `Users::SessionsController#create` signs out any user without it |
| `users.pynwheel_launch_access` | false | not needed |
| `community_users` | one row for the cloned property (`chat_enable: false`) | the assignment that defines a Community admin's reach (`User#can_access_community?`) |
| password | supplied (`TEST_ADMIN_PASSWORD`, non-production only) or random | see below |

Not granted: Super admin (every property), Company admin (see above), Regional admin (region-wide), Dwelo admin.

## Safeguards

- An existing account with the same e-mail is **never** modified: the task returns `exists` with the user id, role and company, and stops.
- On a **production-like** database (`RAILS_ENV=production`, a database name containing `prod`, or a non-local host) a chosen password is refused. The account is created with a random 32-character password that is not shown anywhere, plus a one-time Devise `reset_password_token`; the reset link (`/users/password/edit?reset_password_token=...`) is written to `tmp/property_clones/test-admin-<user id>-<stamp>.txt` with mode 0600. The administrator opens the link and chooses their password; the file is then deleted. The password is never logged, printed or stored in clear.
- Outside production `TEST_ADMIN_PASSWORD` may be given (the owner asked for `Testing123` for testing); Devise's 6..128 length rule applies.
- The task refuses a company whose name does not end with the clone suffix, and requires `CONFIRM_DATABASE=<db>` and `PROPERTY_CLONE_EXECUTE=1` like the clone itself.

## What was verified (tests)

- `test/services/property_clone/test_admin_test.rb`: reach of the account (clone yes; source, sibling no), the `exists` path leaves the existing account byte-identical, the production path refuses a password and provisions a working reset link in a 0600 file.
- `test/integration/property_clone_access_test.rb`: sign-in through the Devise form, Connect reads/writes on the clone succeed, the same routes on the source and a sibling answer 404/403 and change nothing, the legacy pages redirect home, the source company cannot be updated, the Tour App API (super admins only) refuses the account, and the source fingerprint is identical afterwards.
