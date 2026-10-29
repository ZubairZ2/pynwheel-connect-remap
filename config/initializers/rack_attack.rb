# frozen_string_literal: true

# Throttles on the endpoints that can be abused by guessing or by volume.
# Every limit answers 429 with a JSON body; the counters live in Rails.cache
# (Redis in production, memory in development). In the test environment the
# middleware is off unless a test turns it on with its own memory store, so
# the ordinary suite never trips a limit.
#
# October 23, 2026: the Tour App's staff sign-in, the visitor sign-in (one-time
# code by SMS: the per-phone limits are what stop SMS pumping and code
# guessing), bookings, lock issuance and visit events joined the original
# `/api/notify-email` rule.
class Rack::Attack
  TOUR_API = '/api/tour/v1'

  # The JSON body of a Tour App request, read once and rewound (Rack's own
  # `params` only parses forms). Only the two keys the throttles need.
  def self.tour_body(req)
    return {} unless req.content_type.to_s.include?('json')

    req.body.rewind
    raw = req.body.read(4096).to_s
    req.body.rewind
    parsed = JSON.parse(raw)
    parsed.is_a?(Hash) ? parsed.slice('email', 'phone') : {}
  rescue JSON::ParserError, IOError
    {}
  end

  # The built-in reviewer phone (Visitors::Otp::TEST_PHONE) has no per-phone limit.
  def self.phone_key(req)
    key = tour_body(req)['phone'].to_s.gsub(/[^0-9+]/, '').presence
    key unless key&.delete('+') == '123456789'
  end

  throttle('notify-email/ip', limit: 10, period: 60) do |req|
    req.ip if req.path == '/api/notify-email' && req.post?
  end

  # Staff sign-in: per address and per account.
  throttle('tour-login/ip', limit: 10, period: 60) do |req|
    req.ip if req.post? && req.path == "#{TOUR_API}/auth/login"
  end
  throttle('tour-login/email', limit: 5, period: 60) do |req|
    tour_body(req)['email'].to_s.strip.downcase.presence if req.post? && req.path == "#{TOUR_API}/auth/login"
  end

  # Visitor sign-in: sending a code (per phone: one a minute, five a day; per
  # address: ten an hour) and verifying one (per phone and per address).
  throttle('tour-otp/phone-minute', limit: 1, period: 60) do |req|
    phone_key(req) if req.post? && req.path == "#{TOUR_API}/visitor/otp"
  end
  throttle('tour-otp/phone-day', limit: 5, period: 24.hours) do |req|
    phone_key(req) if req.post? && req.path == "#{TOUR_API}/visitor/otp"
  end
  throttle('tour-otp/ip', limit: 10, period: 1.hour) do |req|
    req.ip if req.post? && req.path == "#{TOUR_API}/visitor/otp"
  end
  throttle('tour-otp-verify/phone', limit: 10, period: 10.minutes) do |req|
    phone_key(req) if req.post? && req.path == "#{TOUR_API}/visitor/otp/verify"
  end
  throttle('tour-otp-verify/ip', limit: 30, period: 10.minutes) do |req|
    req.ip if req.post? && req.path == "#{TOUR_API}/visitor/otp/verify"
  end

  # Writes that cost something: bookings, door codes, visit events.
  throttle('tour-bookings/ip', limit: 10, period: 60) do |req|
    req.ip if req.post? && req.path.match?(%r{\A#{TOUR_API}/properties/\d+/bookings\z})
  end
  throttle('tour-locks/ip', limit: 20, period: 60) do |req|
    req.ip if req.post? && req.path.match?(%r{\A#{TOUR_API}/properties/\d+/locks/})
  end
  throttle('tour-visits/ip', limit: 120, period: 60) do |req|
    req.ip if req.post? && req.path.match?(%r{\A#{TOUR_API}/properties/\d+/visits})
  end
  # ID verification attempts and card tokens (October 28, 2026): a provider call each; a visitor needs a handful, never a storm.
  throttle('tour-verification/ip', limit: 10, period: 10.minutes) do |req|
    req.ip if req.post? && req.path.match?(%r{\A#{TOUR_API}/properties/\d+/verification(/card)?\z})
  end

  self.throttled_responder = lambda do |req|
    match = req.env['rack.attack.match_data'] || {}
    retry_after = match[:period].to_i
    [
      429,
      { 'Content-Type' => 'application/json', 'Retry-After' => retry_after.to_s },
      [{ success: false, status: 'error', code: 'rate_limit_exceeded', error: { code: 'rate_limit_exceeded', message: 'Too many requests. Please wait and try again.', details: { retry_after: retry_after } },
         message: 'Too many requests. Please wait and try again.' }.to_json]
    ]
  end

  self.enabled = false if Rails.env.test?
end
