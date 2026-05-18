# Workplan: Sales Email Notification API — POST /api/notify-email

## Overview

Add a lightweight `POST /api/notify-email` endpoint that accepts a fully-rendered HTML email payload from the frontend order form and relays it to specified recipients via SendGrid (existing SMTP). No server-side templating. No business logic.

---

## Scope

| In scope | Out of scope |
|---|---|
| Route, controller, mailer | Frontend order form HTML rendering |
| Input validation (400) | Any email templating on the server |
| Rate limiting 10 req/min per IP (429) | Auth/token system (unauthenticated public endpoint) |
| JSON success/error responses | Logging to DB or analytics |

---

## Files to Create / Modify

### New files

| File | Purpose |
|---|---|
| `app/controllers/api/notify_email_controller.rb` | Single `create` action — validates, rate-checks, calls mailer |
| `app/mailers/notify_email_mailer.rb` | `send_notification` — delivers html body as-is via existing SMTP |
| `config/initializers/rack_attack.rb` | Rack::Attack throttle rule (10 req/min per IP on this endpoint) |

### Modified files

| File | Change |
|---|---|
| `config/routes.rb` | Add `post 'notify-email', to: 'api/notify_email#create'` inside `namespace :api` |
| `Gemfile` | Add `gem 'rack-attack'` (no existing rate limiting in repo) |

---

## Implementation Steps

### 1. Add rack-attack gem
- Add `gem 'rack-attack'` to `Gemfile`
- Run `bundle install`
- Mount in `config/application.rb`: `config.middleware.use Rack::Attack`

### 2. Route
Add inside the existing `namespace :api, constraints: { format: 'json' }` block in `config/routes.rb`:

```ruby
post 'notify-email', to: 'notify_email#create'
```

Note: the namespace already scopes to `/api/`, so the resolved path is `POST /api/notify-email`.

### 3. Mailer — `NotifyEmailMailer`
```ruby
class NotifyEmailMailer < ApplicationMailer
  def send_notification(to:, cc:, subject:, html:)
    mail(
      to: to,
      cc: cc.presence,
      subject: subject,
      content_type: 'text/html',
      body: html
    )
  end
end
```
- Inherits `ApplicationMailer` → uses existing SendGrid SMTP config (`smtp.sendgrid.net`, env vars `SMTP_USER_NAME` / `SMTP_PASSWORD`)
- `cc` is optional at the mailer level (controller enforces it as required per spec)

### 4. Controller — `Api::NotifyEmailController`
```ruby
module Api
  class NotifyEmailController < ActionController::Base
    before_action :validate_params

    def create
      NotifyEmailMailer.send_notification(
        to:      params[:to],
        cc:      params[:cc],
        subject: params[:subject],
        html:    params[:html]
      ).deliver_now

      render json: { status: 'ok', notification_id: "ntf_#{SecureRandom.hex(6)}" }
    rescue => e
      render json: { status: 'error', code: 'delivery_failed', message: e.message }, status: :internal_server_error
    end

    private

    def validate_params
      required = %w[to cc subject html]
      missing = required.select { |k| params[k].blank? }
      if missing.any?
        render json: {
          status: 'error',
          code: 'missing_params',
          message: "Missing required fields: #{missing.join(', ')}"
        }, status: :bad_request
      end
    end
  end
end
```
- Inherits `ActionController::Base` (public endpoint, no Devise auth)
- No CSRF token needed — JSON API with `constraints: { format: 'json' }`
- `deliver_now` keeps it synchronous; swap to `deliver_later` if Sidekiq queue is preferred

### 5. Rate Limiting — `config/initializers/rack_attack.rb`
```ruby
class Rack::Attack
  throttle('notify-email/ip', limit: 10, period: 60) do |req|
    req.ip if req.path == '/api/notify-email' && req.post?
  end

  self.throttled_responder = lambda do |_req|
    [
      429,
      { 'Content-Type' => 'application/json' },
      [{ status: 'error', code: 'rate_limit_exceeded', message: 'Too many requests. Limit is 10 per minute.' }.to_json]
    ]
  end
end
```

---

## Validation Rules (400 Bad Request)

| Field | Rule |
|---|---|
| `to` | Required, must be non-blank (array of strings) |
| `cc` | Required per spec (non-blank) |
| `subject` | Required, non-blank string |
| `html` | Required, non-blank string |

---

## Success / Error Response Shape

```json
// 200
{ "status": "ok", "notification_id": "ntf_abc123" }

// 400
{ "status": "error", "code": "missing_params", "message": "Missing required fields: to, subject" }

// 429
{ "status": "error", "code": "rate_limit_exceeded", "message": "Too many requests. Limit is 10 per minute." }

// 500
{ "status": "error", "code": "delivery_failed", "message": "..." }
```

---

## Testing Checklist

- [ ] `POST /api/notify-email` with valid payload → 200, email delivered in dev mail catcher (e.g. Letter Opener)
- [ ] Missing `to` → 400 with `missing_params`
- [ ] Missing `html` → 400
- [ ] 11 requests in under 60s from same IP → 11th returns 429
- [ ] Invalid SMTP credentials in staging → 500 with `delivery_failed`
- [ ] `cc` is optional at mailer level but validated as required at controller level per spec

---

## Open Questions / Decisions

| # | Question | Recommendation |
|---|---|---|
| 1 | `deliver_now` vs `deliver_later`? | Start with `deliver_now`; switch to `deliver_later` if order volume warrants it |
| 2 | Should `cc` truly be required (spec says so)? | Frontend can send `"cc": []` when unused — controller treats empty array as blank and will 400; confirm with FE |
| 3 | Auth? Spec says none, but endpoint is public | Add a static `SALES_NOTIFY_EMAIL_API_KEY` header check as a low-friction guard if needed later |
| 4 | Rate limit scope: per-IP vs global? | Per-IP per spec; adjust if behind a proxy that flattens IPs |

---

## Estimated Effort

| Task | Est. |
|---|---|
| Gem + middleware setup | 15 min |
| Route | 5 min |
| Mailer | 15 min |
| Controller | 20 min |
| Rack::Attack initializer | 15 min |
| Manual smoke test | 20 min |
| **Total** | **~90 min** |
