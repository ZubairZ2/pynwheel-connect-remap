# frozen_string_literal: true

module Connect
  # "Publish to Tour App" (October 25, 2026).
  #   GET  /communities/:community_id/connect/tour/publication.json   when and by whom the tour was last published, and whether it changed since
  #   POST /communities/:community_id/connect/tour/publish.json       record the current configuration as the published one (idempotent)
  # Saving stays live for every reader; see TourSetup::Publish.
  class TourController < BaseController
    CONNECT_READ_ACTIONS = %w[publication].freeze
    CONNECT_WRITE_ACTIONS = %w[publish].freeze

    def publication
      render_connect(TourSetup::Publish.state(@community))
    end

    def publish
      result = TourSetup::Publish.call!(community: @community, user: current_user)
      render json: Connect::ResponseEnvelope.new(data: result.state.merge(already_published: result.already_published),
                                                 meta: connect_write_meta(versions: Connect::WayfindingSerializer.versions(@community))).as_json
    end
  end
end
