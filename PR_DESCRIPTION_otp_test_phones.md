Open the PR here: https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...feature/otp-test-phones-staging?expand=1

# Tour App sign-in: test phones take a fixed code in every environment

One commit. The Heroku app `pyn-system` runs in production mode, where (by design) the one-time code is never disclosed and
`PYN_TOUR_OTP_DEBUG` is ignored. For testing the visitor sign-in on that app, the existing test-phone allowlist now applies
in every environment:

- `PYN_TOUR_OTP_TEST_PHONES` (comma list, E.164) and `PYN_TOUR_OTP_TEST_CODE`: the listed numbers accept the fixed code, get
  no SMS, and the "code sent" answer carries the code so the app shows it on the Enter your code step (tap to fill).
- Every other phone is unchanged: a real SMS through Twilio, nothing disclosed.
- `PYN_TOUR_OTP_DEBUG` (every phone) stays non-production only.

List only numbers nobody owns (or your own), never a visitor's: a listed number can be signed in with the fixed code by
anyone who knows it. This is the legacy app's App Store reviewer bypass, made explicit and configurable.

Tests: `visitor_auth_test.rb` (12 runs, 118 assertions): the listed phone gets the code and no SMS, an unlisted phone gets
its SMS and no code, and the same holds with `Rails.env.production?` stubbed.

Heroku config needed on `pyn-system` after merging and deploying (the visitor switches default off in production):
`PYN_TOUR_VISITS=on`, `PYN_TOUR_VISITOR_AUTH=on`, `PYN_TOUR_OTP_TEST_PHONES=+1111111111`, `PYN_TOUR_OTP_TEST_CODE=123456`,
then the three October 23 migrations (`rails db:migrate`), which are additive.
