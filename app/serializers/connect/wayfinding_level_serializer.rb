module Connect
  # One level's wayfinding graph as a Connect save answers it: the level's new
  # version, its hallway nodes (every space and review state), edge rows, stop
  # links and additional stops, in the same row shapes `automate_plotting.json`
  # uses, so the screen's parser can read either.
  class WayfindingLevelSerializer
    def initialize(level, community:)
      @level = level
      @community = community
    end

    def as_json(*)
      {
        level: { kind: @level.class.base_class.name.underscore, id: @level.id, version: @level.wayfinding_version },
        hallways: Hallway.on_level(@level).order(:id).map { |row| WayfindingSerializer.hallway_row(row) },
        hallway_edges: HallwayEdge.on_level(@level).order(:id).map { |row| WayfindingSerializer.edge_row(row) },
        hallway_attachments: HallwayAttachment.on_level(@level).order(:id).map { |row| WayfindingSerializer.attachment_row(row) },
        wayfinding_stops: WayfindingStop.on_level(@level).active.order(:id).map { |row| WayfindingSerializer.stop_row(row) },
        suppressions: HallwaySuppression.on_level(@level).count
      }
    end
  end
end
