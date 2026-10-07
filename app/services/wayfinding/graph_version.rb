# frozen_string_literal: true

module Wayfinding
  # One version string for a property's whole wayfinding graph: the cache key
  # and ETag of the Tour App API. It moves whenever anything a route can
  # depend on changes - the levels' `wayfinding_version` counters, the main
  # tour's `tour_setup_version`, and the row counts and latest `updated_at` of
  # every table the graph is built from (which also covers bulk writes that
  # fire no callbacks).
  module GraphVersion
    # The shape served under a version. Bump it when the Tour App payload
    # changes (a key added, a meaning changed): the version string moves with
    # it, so a body cached before the deploy, or a client's ETag from then, is
    # never current again. 1: October 2026.
    PAYLOAD_FORMAT = 1

    module_function

    def for(community)
      ids = { floorplate: community.floorplates.pluck(:id), sitemap: Sitemap.where(community_id: community.id).pluck(:id) }
      tour = community.community_tour
      parts = []
      parts << community.floorplates.sum(:wayfinding_version)
      parts << Sitemap.where(community_id: community.id).sum(:wayfinding_version)
      parts << tour&.tour_setup_version.to_i
      scopes = {
        hallways: Hallway.where(community_id: community.id),
        edges: HallwayEdge.where(community_id: community.id),
        attachments: HallwayAttachment.where(community_id: community.id),
        stops: WayfindingStop.where(community_id: community.id),
        elevators: Elevator.where(community_id: community.id),
        bsps: BuildingStartingPoint.where(community_id: community.id),
        doors: Door.where(community_id: community.id),
        units: Unit.where(community_id: community.id),
        amenities: Amenity.where(community_id: community.id),
        tour_stops: tour ? TourStop.where(tour_id: tour.id) : TourStop.none
      }
      scopes.each_value do |scope|
        parts << scope.count
        parts << scope.maximum(:updated_at)&.to_f&.round(3)
      end
      parts << ids.values.flatten.sort.join('.')
      parts << PAYLOAD_FORMAT
      "wf-#{community.id}-#{Digest::SHA1.hexdigest(parts.join('|'))[0, 16]}"
    end
  end
end
