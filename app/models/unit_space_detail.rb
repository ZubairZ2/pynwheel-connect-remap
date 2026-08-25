# One leasable space's feed-derived detail: its letter, its amenities, and the
# lease term the pop-up shows.
#
# One row per Unit, written only when the feed actually carried something --
# a row earns its place by having at least one of amenities, space_letter or
# lease_terms. A conventional property whose feed names no letters and no
# per-space amenities therefore stores nothing at all, rather than a blank row
# per unit. See UnitSpaceDetails::Collector.
class UnitSpaceDetail < ApplicationRecord
  belongs_to :unit

  scope :for_community, ->(community_id) { where(community_id: community_id) }
  # The only rows that can produce a floor-plan tab set.
  scope :lettered, -> { where.not(space_letter: nil) }

  # A space is premium when it carries at least one amenity that is not on every
  # other space of the property. Derived at sync time; this is the only place the
  # predicate is expressed.
  def premium?
    premium_amenities.present?
  end

  # "2027-2028 Academic Year", or "2027 Academic Year" when a term does not span
  # a year boundary. Derived rather than stored: it is a formatting of two
  # columns, and storing it would be a third thing to keep in sync.
  def academic_year_label
    return nil if lease_start_date.blank? || lease_end_date.blank?

    years = [lease_start_date.year, lease_end_date.year].uniq
    "#{years.join('–')} Academic Year"
  end
end
