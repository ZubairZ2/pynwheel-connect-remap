# frozen_string_literal: true

# A signed-in visitor (prospect) of the new Pynwheel Tour app: one row per
# device sign-in, holding only the SHA-256 digest of the bearer token the app
# received once (`Visitors::Session`). Revoked on sign-out, on "remove
# personal data" and when the visitor is deleted; expiry slides on use.
# Created October 23, 2026; the legacy app's JWT is unrelated.
class VisitorSession < ApplicationRecord
  belongs_to :tour_user

  scope :active, ->(now = Time.current) { where(revoked_at: nil).where('expires_at > ?', now) }

  def active?(now = Time.current)
    revoked_at.nil? && expires_at > now
  end

  def revoke!(now = Time.current)
    update_columns(revoked_at: now) if revoked_at.nil?
    self
  end
end
