# Tour App visitor OTP: Twilio text like the legacy app, built-in reviewer phone

Branch `feature/tour-app-otp-twilio-test-phone` → `main`.

## What changed

- **The code SMS is queued the way the legacy `generate_otp` queued it**: `TwilioSmsWorker.perform_async(message, number)` with no community. Before, the property id was passed along and `NotificationValidatorService` silently dropped every code text on a "Test Company 123" property, so OTP sign-in could never work there.
- **Built-in reviewer phone `+123456789`, code `123456`** (`Visitors::Otp::TEST_PHONE` / `TEST_CODE`), the counterpart of the legacy app's `+10123456789`: no normalization, no one-a-minute or five-a-day cap, no expiry or attempt counter, no SMS, no `visitor_otps` row. The server returns the code as `debug_code`, so the app's code step shows "your code is 123456 (tap to fill)". Typed without the plus or with spaces it still matches. The first sign-in still asks for name and email (no visitor row exists yet); after that it signs straight in.
- **Rack::Attack**: the per-phone throttles ignore that number; the per-address limits stay.
- The env-driven `PYN_TOUR_OTP_TEST_PHONES` / `PYN_TOUR_OTP_TEST_CODE` list keeps working alongside.

No Capacitor app file changed: the phone step, code step, debug-code display and `one-time-code` autofill were already there, so the Android and iOS builds pick this up from the server.

## Tests

`test/controllers/api/tour_app/v1/visitor_auth_test.rb`: two new tests (the reviewer phone end to end; the SMS job carries no community). 14 runs, 129 assertions, 0 failures.

## Risk

The reviewer phone is live on every server that ships this code, production included: anyone who knows the number and `123456` can sign in as that one visitor profile.
