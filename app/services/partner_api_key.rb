require "digest"
require "securerandom"

# Generation, hashing and one-time delivery of Partner Maps API keys.
#
# The plaintext key is never persisted. It exists for one request — the one that
# issues or rotates it — and is then parked in Redis behind a random token so it
# can be handed to the partner through a single-use link that can be emailed.
# Reading the link consumes it; after that the key is unrecoverable and the only
# way to give the partner a working key again is to rotate.
module PartnerApiKey
  # `pk_<partner key>_<32 hex>` — self-identifying in logs and support threads
  # without exposing anything that can be used to authenticate.
  SECRET_BYTES   = 16
  REVEAL_TTL     = 72.hours
  REVEAL_PREFIX  = "partner:key_reveal:".freeze

  module_function

  # A fresh plaintext key for the given partner key, e.g. "pk_jonah_a1b2…4f2a".
  def generate(partner_key)
    "pk_#{partner_key}_#{SecureRandom.hex(SECRET_BYTES)}"
  end

  def digest(raw)
    return nil if raw.blank?
    Digest::SHA256.hexdigest(raw)
  end

  # Constant-time comparison so a digest match cannot be timed out byte by byte.
  def secure_match?(a, b)
    return false if a.blank? || b.blank?
    ActiveSupport::SecurityUtils.secure_compare(a, b)
  end

  # Park a plaintext key behind a one-time token and return the token.
  def store_reveal(raw)
    token = SecureRandom.urlsafe_base64(32)
    $redis.setex("#{REVEAL_PREFIX}#{token}", REVEAL_TTL.to_i, raw)
    token
  end

  # Fetch and consume a one-time token. Returns the plaintext key, or nil when
  # the token is unknown, already used or expired. The GET and DEL run in one
  # MULTI so two simultaneous readers cannot both come away with the key.
  def consume_reveal(token)
    return nil if token.blank?

    redis_key = "#{REVEAL_PREFIX}#{token}"
    raw, _deleted = $redis.multi do |tx|
      tx.get(redis_key)
      tx.del(redis_key)
    end
    raw.presence
  rescue => e
    Rails.logger.error("[PartnerApiKey] reveal lookup failed: #{e.class}: #{e.message}")
    nil
  end

  # Whether a one-time token is still redeemable, without consuming it.
  def reveal_pending?(token)
    return false if token.blank?
    $redis.exists?("#{REVEAL_PREFIX}#{token}")
  rescue => e
    Rails.logger.error("[PartnerApiKey] reveal check failed: #{e.class}: #{e.message}")
    false
  end
end
