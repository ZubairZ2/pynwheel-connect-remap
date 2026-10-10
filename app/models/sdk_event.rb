# One row per meaningful map interaction. Append-only: written once by
# Analytics::SdkAnalyticsService and never updated.
#
# The counters on SdkSession answer "how busy was this session". This answers
# "which unit, which floor plan, which link, when" -- the questions the
# client-facing data layer publishes and the weekly per-property digest
# aggregates. See Analytics::MapEventContract for what earns a row.
class SdkEvent < ApplicationRecord
  belongs_to :sdk_session, optional: true
  belongs_to :community

  # No `belongs_to :unit` / `:floorplan`. The ids are historical facts, not live
  # associations -- a unit deleted from a PMS feed must not take its analytics
  # with it, and nothing here ever needs to walk back to the record.

  scope :for_community, ->(id)    { where(community_id: id) }
  scope :for_company,   ->(id)    { where(company_id: id) }
  scope :with_action,   ->(names) { where(action: names) }
  scope :between,       ->(from, to) { where(occurred_at: from..to) }

  # A visitor's whole journey, across the segment UUIDs the SDK rotates on idle.
  scope :for_visitor, ->(parent_id) { where(parent_sdk_session_id: parent_id) }

  # ── Digest support ────────────────────────────────────────────────────────
  # The shape the weekly per-property email needs: one property, one action, a
  # count per day. Kept here rather than in the mailer so the index it relies on
  # (idx_sdk_events_community_action_time) and the query that uses it stay in
  # sight of each other.
  def self.daily_action_counts(community_id:, from:, to:, actions: nil)
    scope = for_community(community_id).between(from, to).where.not(action: nil)
    scope = scope.with_action(actions) if actions.present?

    scope.group(:action, Arel.sql("DATE(occurred_at)")).count
  end

  # Which units drew the most of a given action in the window -- "top applied-to
  # units this week". Ordered and capped in SQL; the caller never loads rows.
  def self.top_units(community_id:, action:, from:, to:, limit: 10)
    for_community(community_id)
      .with_action(action)
      .between(from, to)
      .where.not(unit_name: nil)
      .group(:unit_name)
      .order(Arel.sql("COUNT(*) DESC"))
      .limit(limit)
      .count
  end
end
