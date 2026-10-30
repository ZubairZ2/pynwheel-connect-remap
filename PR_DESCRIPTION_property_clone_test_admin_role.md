# Property clone: the test administrator is a Community admin

Branch `fix/property-clone-test-admin-role` → `main`. Follow-up to PR #49.

## Why

Running Rails and Connect locally against the rehearsal clone showed that the bootstrapped `Company admin` could not sign in to Connect: Rails accepted the credentials, Connect's sign-in route then verified the session with `GET /companies.json`, which answers 403 for that role (`Ability` has no rule for `Company admin`), and Connect returned 401.

## What

- `PropertyClone::TestAdmin` creates a `Community admin` of the clone company, assigned to the cloned property. Reach: the assigned clone (`User#can_access_community?`, `AccessibleCommunitiesQuery`) and its own company (`Ability`: read/update Company, manage that company's properties). Nothing of the source.
- Tests, `script/property_clone/isolation_rehearsal.rb`, `docs/property_clone/TEST_ADMIN.md`, the report's October 29 addendum and context.md §46 follow.
- `.claude/launch.json` is not part of this PR (local launch entry only).

Verified: 22 runs / 1030 assertions green; Connect sign-in as the test admin on the local pair lists only the clone and its company.
