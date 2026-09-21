# Append-only audit trail for a partner: when its API key was issued, rotated
# or revoked, and which properties were associated or removed, and by whom.
#
# Bulk association writes a single row carrying the affected community ids in
# `metadata` rather than one row per property, so the set-based bulk updates in
# Community stay a single UPDATE.
class PartnerEvent < ApplicationRecord
  belongs_to :partner
  belongs_to :user, optional: true

  validates :event, presence: true

  scope :recent, -> { order(created_at: :desc) }

  # "Salahudin Sallu" / "System" — who the trail attributes the action to.
  def actor_name
    user&.try(:name).presence || user&.email.presence || "System"
  end
end
