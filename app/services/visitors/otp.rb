# frozen_string_literal: true

module Visitors
  # The visitor (prospect) sign-in of the Tour App: a six-digit code sent by
  # SMS to a phone number, then a session for the `tour_users` row that owns
  # that phone (October 23, 2026).
  #
  # * `request!` stores the code's digest on a `visitor_otps` row keyed by
  #   the phone (whether or not a visitor exists yet) and queues the SMS
  #   through the CMS's own TwilioSmsWorker. It answers the same whether the
  #   phone is known or not, so the endpoint cannot be used to list visitors.
  # * `verify!` compares in constant time, allows MAX_ATTEMPTS wrong codes per
  #   code and TTL minutes, and on success resolves the visitor: the newest
  #   `tour_users` row with that phone (what the legacy app's `get_tour_user`
  #   does), else a new row from the profile the app sent, found through the
  #   legacy dedupe (TourUserSearcherService) so an earlier widget booking
  #   with the same email is reused. The legacy `pin_code` flow is untouched.
  #
  # Nothing here logs a phone, a code or a token.
  module Otp
    CODE_LENGTH = 6
    TTL = 10.minutes
    MAX_ATTEMPTS = 5
    RESEND_AFTER = 60
    MAX_SENDS_PER_DAY = 5
    E164 = /\A\+[1-9]\d{6,14}\z/

    class Normalizer
      include SchedualTours::Notifications
      public :normalize_phone
    end

    module_function

    # The E.164 form of what the app typed, or nil when it is not a phone.
    def normalize(raw, country_code)
      digits = raw.to_s.gsub(/[^0-9+]/, '')
      return nil if digits.gsub('+', '').length < 7

      phone = Normalizer.new.normalize_phone(digits, country_code.presence || 'US').to_s
      E164.match?(phone) ? phone : nil
    end

    # Always `{sent: true, resend_after: RESEND_AFTER}` for a valid phone: a
    # phone that was asked again inside RESEND_AFTER, or MAX_SENDS_PER_DAY
    # times today, gets the same answer and no SMS.
    def request!(phone:, country_code: nil, ip: nil, community_id: nil, now: Time.current)
      number = normalize(phone, country_code)
      raise TourApi::ApiError.validation([{ loc: %w[body phone], message: 'Enter a valid phone number with its country code.' }]) if number.nil?

      row = VisitorOtp.find_or_initialize_by(phone_number: number)
      sends_today = row.last_sent_at && row.last_sent_at.to_date == now.to_date ? row.sends_today : 0
      too_soon = row.last_sent_at && row.last_sent_at > now - RESEND_AFTER.seconds
      return { sent: true, resend_after: RESEND_AFTER } if too_soon || sends_today >= MAX_SENDS_PER_DAY

      code = generate_code(number)
      row.assign_attributes(code_digest: digest(number, code), expires_at: now + TTL, attempts: 0, sends_today: sends_today + 1, last_sent_at: now, created_ip: ip)
      row.save!
      deliver(number, code, community_id) unless test_phone?(number)
      answer = { sent: true, resend_after: RESEND_AFTER }
      answer[:debug_code] = code if debug_codes?
      answer
    end

    # Testing on a machine that cannot send SMS: `PYN_TOUR_OTP_DEBUG=on` makes
    # the "code sent" answer carry the code, and the app shows it on the code
    # step. Never honoured in production, whatever the variable says.
    def debug_codes?
      !Rails.env.production? && ENV['PYN_TOUR_OTP_DEBUG'].to_s.strip.downcase == 'on'
    end

    # The visitor the code proves, or ApiError 401 `invalid_code` (one message
    # for a wrong, expired, exhausted or never-sent code) / 422
    # `profile_required` (a new phone without first name, last name and email).
    def verify!(phone:, code:, profile: {}, country_code: nil, now: Time.current)
      number = normalize(phone, country_code)
      raise invalid_code if number.nil?

      row = VisitorOtp.find_by(phone_number: number)
      raise invalid_code if row.nil? || row.expired?(now) || row.attempts >= MAX_ATTEMPTS

      unless ActiveSupport::SecurityUtils.secure_compare(row.code_digest, digest(number, code.to_s.strip))
        row.update_columns(attempts: row.attempts + 1)
        raise invalid_code
      end

      visitor = resolve_visitor!(number, profile)
      row.destroy
      visitor
    end

    def resolve_visitor!(number, profile)
      visitor = TourUser.where(phone_number: number).order(created_at: :desc).first
      return visitor if visitor

      profile = profile.to_h.with_indifferent_access
      first = profile[:first_name].to_s.strip
      last = profile[:last_name].to_s.strip
      email = profile[:email].to_s.strip.downcase
      if first.blank? || last.blank? || email.blank?
        raise TourApi::ApiError.unprocessable('profile_required', 'Tell us your name and email to finish signing in.', { fields: %w[first_name last_name email] })
      end

      visitor = TourUserSearcherService.new(number, email).find_tour_user || TourUser.new(is_sms_enabled: true)
      visitor.assign_attributes(first_name: first, last_name: last, name: "#{first} #{last}", email: email, phone_number: number)
      unless visitor.save
        raise TourApi::ApiError.validation(visitor.errors.map { |e| { loc: ['body', e.attribute.to_s], message: e.message } })
      end

      visitor
    end

    def invalid_code
      TourApi::ApiError.unauthorized('invalid_code', 'That code is not valid. Ask for a new one.')
    end

    def generate_code(number)
      return test_code if test_phone?(number)

      SecureRandom.random_number(10**CODE_LENGTH).to_s.rjust(CODE_LENGTH, '0')
    end

    # HMAC over phone and code with the app secret: the table never holds a
    # code, and a leaked digest cannot be checked offline without the secret.
    def digest(number, code)
      OpenSSL::HMAC.hexdigest('SHA256', Rails.application.secret_key_base.to_s, "visitor-otp:#{number}:#{code}")
    end

    # Queued, never sent inline. A queue that cannot be reached is logged
    # (without the code or the number) and answered like a sent code: the
    # visitor can ask again, and nothing says whether the phone is known.
    def deliver(number, code, community_id)
      TwilioSmsWorker.perform_async("Your Pynwheel Tour sign-in code is #{code}. It expires in #{TTL.in_minutes.to_i} minutes.", number, nil, community_id)
    rescue StandardError => e
      Rails.logger.error("[tour-api] visitor otp not queued #{e.class}")
    end

    # Store-review accounts outside production: `PYN_TOUR_OTP_TEST_PHONES`
    # (comma list, E.164) accept `PYN_TOUR_OTP_TEST_CODE` and get no SMS.
    # Never honoured in production.
    def test_phone?(number)
      return false if Rails.env.production?

      ENV['PYN_TOUR_OTP_TEST_PHONES'].to_s.split(/[\s,]+/).include?(number) && test_code.present?
    end

    def test_code
      ENV['PYN_TOUR_OTP_TEST_CODE'].to_s.strip.presence
    end
  end
end
