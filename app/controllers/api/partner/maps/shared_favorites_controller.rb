module Api
  module Partner
    module Maps
      # Frozen share links for favorites. Sharing copies the session's current
      # favorites into a SharedFavorite and hands back its token; the link
      # carries the token, so later changes in the session don't touch it.
      #
      #   POST /api/partner/maps/share_favorites
      #       Header: X-SDK-Session-Id — the sender's session
      #       → { token } for a snapshot of that session's favorites
      #   GET  /api/partner/maps/get_shared_favorites?share=<token>
      #       → the shared list, same shape as get_favorites
      #
      # Authorization: Bearer <session token>, same as every SDK endpoint. The
      # property comes from the token, never from the request, and a share
      # only opens on the property it was made on.
      class SharedFavoritesController < BaseController
        skip_before_action :validate_api_key
        before_action :validate_session_token
        before_action :load_community

        def create
          session_id = request.headers['X-SDK-Session-Id'].presence
          return render_error("X-SDK-Session-Id header is missing.", 400) if session_id.nil?

          favorite = Favorite.find_by(session_id: session_id, community_id: @community.id)
          return render_error("There are no favorites to share.", 422) unless favorite&.any_ids?

          share = SharedFavorite.snapshot_of!(favorite)
          render json: { success: true, token: share.token, status: "success", code: 200 }
        end

        def show
          token = params[:share].to_s.strip
          return render_error("share is required.", 400) if token.blank?

          share = SharedFavorite.find_by(token: token, community_id: @community.id)
          return render_error("Shared favorites not found.", 404) if share.nil?

          payload = SdkFavoritesPayloadService.new(@community, show_ops_map: params[:map_type] == "ops").call(share)
          render json: { success: true, **payload, status: "success", code: 200 }
        end

        private

        # sitemap + floorplates: the unit payload resolves each unit's map
        # through them (same preload as get_favorites).
        def load_community
          @community = Community
            .includes(:sitemap, :floorplates)
            .find_by(id: @session_property_id)
          render_error("Property not found.", 404) if @community.nil?
        end

        def render_error(message, status)
          render json: { message: message, status: "failed", code: status }, status: status
        end
      end
    end
  end
end
