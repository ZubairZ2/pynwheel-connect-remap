# frozen_string_literal: true

module Connect
  # The Tour Setup "Stops" tab's rows and the stop editor's content save.
  #   GET /communities/:community_id/connect/stops.json
  #   PUT /communities/:community_id/connect/stops/:id.json   {description, instructions, video_link, virtual_tour_url, name}
  # Membership, order, visibility and dwell time keep going through
  # ToursController#save_setup (TourSetup::Save); locks through Connect::LocksController.
  class StopsController < BaseController
    CONNECT_READ_ACTIONS = %w[index].freeze
    CONNECT_WRITE_ACTIONS = %w[update].freeze

    def index
      render_connect(rows_json)
    end

    def update
      stop = Stops::UpdateContent.call!(community: @community, user: current_user, tour_stop_id: params[:id],
                                        attributes: params.permit(:name, :description, :instructions, :video_link, :virtual_tour_url).to_h)
      render json: Connect::ResponseEnvelope.new(data: rows_json.merge(saved: stop.id), meta: connect_write_meta(versions: Connect::WayfindingSerializer.versions(@community))).as_json
    end

    private

      def rows_json
        Stops::Rows.new(@community, include_codes: current_user&.can_edit_map?(@community) == true).as_json
      end
  end
end
