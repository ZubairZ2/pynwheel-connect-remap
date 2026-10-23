# frozen_string_literal: true

module Visitors
  # The visitor's bearer session of the Tour App (October 23, 2026): a random
  # token with the `vst_` prefix (so the API can tell it from a staff
  # Doorkeeper token), stored as a SHA-256 digest on `visitor_sessions`, valid
  # TTL days and sliding on use, revocable one by one (sign-out) or all at
  # once (privacy actions). The token travels to the phone once.
  module Session
    PREFIX = 'vst_'
    TTL = 30.days
    SLIDE_AFTER = 1.hour

    module_function

    def visitor_token?(bearer)
      bearer.to_s.start_with?(PREFIX)
    end

    # [plaintext token, row]
    def issue!(visitor, community_id: nil, ip: nil, user_agent: nil, now: Time.current)
      token = PREFIX + SecureRandom.urlsafe_base64(32)
      row = VisitorSession.create!(
        tour_user_id: visitor.id, token_digest: digest(token), expires_at: now + TTL, last_used_at: now,
        created_ip: ip, user_agent: user_agent.to_s[0, 255].presence, community_id: community_id
      )
      [token, row]
    end

    # The session a bearer proves, or the same ApiErrors the staff check raises.
    def authenticate(bearer, now: Time.current)
      row = VisitorSession.find_by(token_digest: digest(bearer))
      raise TourApi::ApiError.unauthorized('invalid_token', 'That session is not valid. Please sign in again.') if row.nil?
      raise TourApi::ApiError.unauthorized('token_revoked', 'You have been signed out. Please sign in again.') if row.revoked_at.present?
      raise TourApi::ApiError.unauthorized('token_expired', 'Your session has expired. Please sign in again.') if row.expires_at <= now

      if row.last_used_at.nil? || row.last_used_at < now - SLIDE_AFTER
        row.update_columns(last_used_at: now, expires_at: now + TTL)
      end
      row
    end

    def revoke!(row, now: Time.current)
      row.revoke!(now)
    end

    # Every live session of the visitor (sign-out everywhere; privacy actions).
    def revoke_all!(visitor, now: Time.current)
      VisitorSession.where(tour_user_id: visitor.id, revoked_at: nil).update_all(revoked_at: now)
    end

    def digest(token)
      Digest::SHA256.hexdigest(token.to_s)
    end
  end
end
