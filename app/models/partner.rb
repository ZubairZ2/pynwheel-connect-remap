# A partner listing site (Rent.com, Apartments.com, Jonah, ...) that may embed
# properties' Pynwheel maps and call the Partner Maps API.
#
# This table is the registry that used to be the hardcoded
# Community::MAP_PARTNERS constant. Everything that renders a partner list —
# the Partner Configuration tabs, the bulk-assign modals, the Map URLs page, the
# SVG Optimizer filters — reads it from here, so adding a partner is a row, not
# a deploy.
#
# Which properties a partner may show is NOT stored here. That stays per
# property in communities.partner_map_settings; see Community#partner_map_enabled?.
#
# NOTE: unrelated to the legacy MapPartner model, which is dead and pending a
# drop migration.
class Partner < ApplicationRecord
  has_many :partner_events, -> { order(created_at: :desc) }, dependent: :destroy

  # `key` is interpolated into the jsonb path expressions that query
  # partner_map_settings, so it is restricted to a slug that is safe there and
  # stable enough to live in stored data forever.
  KEY_FORMAT = /\A[a-z][a-z0-9_]*\z/

  validates :key,   presence: true, uniqueness: { case_sensitive: false },
                    format: { with: KEY_FORMAT, message: "may only contain lowercase letters, numbers and underscores" }
  validates :label, presence: true, uniqueness: { case_sensitive: false }

  scope :ordered, -> { order(:position, :id) }

  before_validation :normalize_key

  EVENTS = %w[created key_issued key_rotated key_revoked key_emailed properties_updated].freeze

  # --- Registry ------------------------------------------------------------

  # The partner list as every consumer sees it: active partners, tab order.
  def self.registry
    where(active: true).ordered.to_a
  end

  # Just the keys — used to whitelist params and to build the jsonb predicates
  # against communities.partner_map_settings.
  def self.registry_keys
    registry.map(&:key)
  end

  # --- Authentication ------------------------------------------------------

  # Resolve an incoming X-API-Key to a partner, or nil.
  #
  # Keys issued through the CMS match on digest — a single indexed lookup.
  # Partners seeded before their key was ever rotated still authenticate
  # against ENV; that fallback only runs when the digest misses, and is dropped
  # for good the moment the key is rotated or revoked.
  def self.authenticate(raw_key)
    return nil if raw_key.blank?

    by_digest = where(active: true).find_by(api_key_digest: PartnerApiKey.digest(raw_key))
    return by_digest if by_digest

    where(active: true).where.not(env_var: nil).detect { |partner| partner.matches_env_key?(raw_key) }
  end

  def matches_env_key?(raw_key)
    return false if env_var.blank? || revoked?
    PartnerApiKey.secure_match?(ENV[env_var].to_s, raw_key.to_s)
  end

  # --- API key lifecycle ---------------------------------------------------

  def api_key?
    api_key_digest.present? || ENV[env_var.to_s].present?
  end

  def revoked?
    key_revoked_at.present? && api_key_digest.blank?
  end

  # What the CMS shows in place of the key, e.g. "pk_jonah_••••••••4f2a".
  def masked_api_key
    return nil unless api_key?
    "#{api_key_prefix.presence || "pk_#{key}_"}#{'•' * 8}#{api_key_last4}"
  end

  # Mint a key for this partner and return the one-time token that delivers it.
  # Replaces any existing key, so this is both "issue" and "rotate"; the event
  # name reflects which one it was.
  def issue_api_key!(actor: nil)
    rotation = api_key?
    raw      = PartnerApiKey.generate(key)

    # Park the plaintext for delivery BEFORE the digest is persisted. If the
    # reveal store is unavailable this raises with nothing changed; the other
    # order would invalidate the partner's current key and leave the new one
    # unreadable, locking them out with no way back.
    token = PartnerApiKey.store_reveal(raw)

    update!(
      api_key_digest: PartnerApiKey.digest(raw),
      api_key_prefix: raw[0, "pk_#{key}_".length],
      api_key_last4:  raw[-4, 4],
      # The CMS-issued key is now the only credential; never fall back to ENV again.
      env_var:        nil,
      key_issued_at:  (key_issued_at || Time.current),
      key_rotated_at: (rotation ? Time.current : nil),
      key_revoked_at: nil
    )

    log_event!(rotation ? "key_rotated" : "key_issued", actor: actor)
    token
  end

  # Kill the credential without removing the partner or its property
  # associations, so it can be re-issued later without redoing the setup.
  def revoke_api_key!(actor: nil)
    update!(
      api_key_digest: nil,
      api_key_prefix: nil,
      api_key_last4:  nil,
      env_var:        nil,
      key_revoked_at: Time.current
    )

    log_event!("key_revoked", actor: actor)
  end

  # --- Per-partner behaviour ----------------------------------------------

  # Apartments.com only ever sees SVG-enabled properties. Configured as data so
  # the next partner with the same requirement is a checkbox, not a constant.
  def svg_only?
    settings["svg_only"] == true
  end

  # --- Audit ---------------------------------------------------------------

  def log_event!(event, actor: nil, metadata: {})
    partner_events.create!(user: actor, event: event, metadata: metadata, created_at: Time.current)
  end

  # Properties currently associated with this partner.
  def communities
    Community.for_partner(key)
  end

  private

  def normalize_key
    self.key = key.to_s.strip.downcase.gsub(/[^a-z0-9]+/, "_").gsub(/\A_+|_+\z/, "").presence
  end
end
