# frozen_string_literal: true

module TourApi
  # One version string for everything the Tour App shows of a property's
  # published configuration (October 25, 2026): the wayfinding graph and the
  # stops list (`Wayfinding::GraphVersion`, which already covers the stops,
  # their order, content and the tour setup), plus the booking rules the
  # Schedule screen reads - the tour row, its settings, both lanes of visiting
  # hours, the closures, and the two widget gates. It moves whenever any of
  # them is saved, so a client that holds a version can ask one cheap question
  # ("is this still current?") instead of re-reading everything.
  #
  # Served as `config_version` on `GET /properties/{id}` and as the ETag of
  # `/stops` and `/booking/settings`; recorded on the tour by `TourSetup::Publish`.
  module ConfigVersion
    # Bump when the payloads under a version change shape.
    PAYLOAD_FORMAT = 1

    module_function

    def for(community)
      tour = community.community_tour
      setting = tour&.tour_setting
      parts = [Wayfinding::GraphVersion.for(community)]
      parts << tour&.updated_at&.to_f&.round(3)
      parts << setting&.updated_at&.to_f&.round(3)
      [OpeningHour.where(community_id: community.id), GuidedOpeningHour.where(community_id: community.id), TourClosure.where(community_id: community.id)].each do |scope|
        parts << scope.count
        parts << scope.maximum(:updated_at)&.to_f&.round(3)
      end
      parts << (community.scheduler_widget != false)
      parts << (community.locked == true)
      parts << PAYLOAD_FORMAT
      "cfg-#{community.id}-#{Digest::SHA1.hexdigest(parts.join('|'))[0, 16]}"
    end
  end
end
