require 'zlib'

module Api
  module Partner
    module Maps
      class SdkController < BaseController
        include ApplicationHelper
        include CommunitiesHelper

        # `authorized` → still uses X-API-Key (one-time exchange)
        before_action :load_property, only: [:authorized]

        # `fetch_data`, `fetch_svg_image`, `save_favorites`, `delete_favorites`,
        # `clear_all_favorites`, `get_favorites` → session token only
        SESSION_ACTIONS = [
          :fetch_data, :fetch_svg_image,
          :save_favorites, :delete_favorites, :clear_all_favorites,
          :get_favorites, :share_favorites_email, :track_events
        ].freeze

        skip_before_action :validate_api_key,   only: SESSION_ACTIONS
        skip_before_action :load_partner_name,  only: SESSION_ACTIONS
        before_action :validate_session_token,      only: SESSION_ACTIONS
        # get_favorites only needs sitemap + floorplates for map_for_unit — skip the
        # 6 other heavy includes (floorplans, map_filter, font_setting, credential,
        # calculator_config, three_d_maps_configuration) that it never uses.
        # track_events only needs community_id, timezone — use a lightweight load.
        before_action :load_community_from_session, only: SESSION_ACTIONS - [:get_favorites, :fetch_svg_image, :share_favorites_email, :track_events]
        before_action :load_community_for_analytics, only: [:track_events]
        before_action :load_community_for_svg,      only: [:fetch_svg_image]
        before_action :load_community_for_favorites, only: [:get_favorites]
        before_action :load_community_for_email,     only: [:share_favorites_email]

        # ------------------------------------------------------------------
        # GET /api/partner/maps/authorized?propertyId=:id
        # Validates X-API-Key + propertyId, returns a short-lived session token.
        # The API key is used exactly once here and never again.
        # ------------------------------------------------------------------
        def authorized
          token = generate_session_token(@api_key, @community.id)

          # Echo back the src and partner params unchanged (client is authoritative).
          # This confirms the server received them and they're valid.
          src = params[:src].to_s.strip.presence || "web"
          partner = params[:partner].to_s.strip.presence || nil

          render json: {
            success: true,
            session_token: token,
            message: "Partner verified and property is accessible."
          }, status: :ok
        end

        # ------------------------------------------------------------------
        # GET /api/partner/maps/fetch_data
        # Authorization: Bearer <session_token>
        # Property ID is taken from the session token — NOT from query params.
        # Response intentionally omits svgUrl; callers use mapId to fetch SVGs.
        #
        # Payload is built fresh on every request — no caching layer. Favorites
        # are merged in-memory at serve time.
        # ------------------------------------------------------------------
        def fetch_data
          fav = favorite_record
          fav_unit_ids      = favorite_ids(fav, "unit")
          fav_amenity_ids   = favorite_ids(fav, "amenity")
          fav_floorplan_ids = favorite_ids(fav, "floorplan")

          built = build_sdk_payload(show_ops_map?)

          units      = merge_favorites(built[:units],      :unitId,      fav_unit_ids)
          amenities  = merge_favorites(built[:amenities],  :amenityId,   fav_amenity_ids)
          floorplans = merge_favorites(built[:floorplans], :floorplanId, fav_floorplan_ids)

          payload = built.merge(
            units:              units,
            amenities:          amenities,
            floorplans:         floorplans,
            favorite_units:     units.select      { |u| u[:isFavorite] },
            favorite_amenities: amenities.select  { |a| a[:isFavorite] },
            favorite_floorplans: floorplans.select { |f| f[:isFavorite] }
          )

          response.headers['Cache-Control']    = 'private, no-store'
          response.headers['Content-Encoding'] = 'gzip'
          response.headers['Vary']             = 'Accept-Encoding'

          send_data gzip_json(payload), type: 'application/json; charset=utf-8', disposition: 'inline'
        end

        # ------------------------------------------------------------------
        # POST /api/partner/maps/save_favorites
        # Body: ids[] (or legacy unit_ids[]) — single ID or array of IDs
        #       type — "unit" (default), "amenity", or "floorplan"
        # Authorization: Bearer <session_token>  +  X-SDK-Session-Id header
        # ------------------------------------------------------------------
        def save_favorites
          return render_error("X-SDK-Session-Id header is missing.", 400) unless sdk_session_id.present?
          return render_error("Invalid favorite type.", 400) unless Favorite.valid_type?(favorite_type)

          ids = parse_ids
          return render_error("ids is required.", 400) if ids.empty?

          valid_ids = valid_ids_for_type(favorite_type, ids)

          favorite = Favorite.find_or_initialize_by(session_id: sdk_session_id, community_id: @community.id)
          current  = favorite.ids_for(favorite_type)
          favorite.set_ids(favorite_type, (current + valid_ids).uniq)
          favorite.save!

          render json: favorites_response(favorite.ids_for(favorite_type))
        end

        # ------------------------------------------------------------------
        # DELETE /api/partner/maps/delete_favorites
        # Body: ids[] (or legacy unit_ids[]) — single ID or array of IDs
        #       type — "unit" (default), "amenity", or "floorplan"
        # Authorization: Bearer <session_token>  +  X-SDK-Session-Id header
        # ------------------------------------------------------------------
        def delete_favorites
          return render_error("X-SDK-Session-Id header is missing.", 400) unless sdk_session_id.present?
          return render_error("Invalid favorite type.", 400) unless Favorite.valid_type?(favorite_type)

          ids = parse_ids
          return render_error("ids is required.", 400) if ids.empty?

          favorite = Favorite.find_by(session_id: sdk_session_id, community_id: @community.id)

          if favorite
            favorite.set_ids(favorite_type, favorite.ids_for(favorite_type) - ids)
            favorite.save!
          end

          render json: favorites_response(favorite&.ids_for(favorite_type) || [])
        end

        # ------------------------------------------------------------------
        # DELETE /api/partner/maps/clear_all_favorites
        # Authorization: Bearer <session_token>  +  X-SDK-Session-Id header
        # Removes ALL favorited items — units, amenities, and floorplans — for
        # this session in one shot.
        # ------------------------------------------------------------------
        def clear_all_favorites
          return render_error("X-SDK-Session-Id header is missing.", 400) unless sdk_session_id.present?

          favorite = Favorite.find_by(session_id: sdk_session_id, community_id: @community.id)

          if favorite
            Favorite::TYPE_COLUMNS.each_key { |type| favorite.set_ids(type, []) }
            favorite.save!
          end

          render json: {
            success:       true,
            unit_ids:      [],
            amenity_ids:   [],
            floorplan_ids: [],
            status:        "success",
            code:          200
          }
        end

        # ------------------------------------------------------------------
        # GET /api/partner/maps/get_favorites
        # Authorization: Bearer <session_token>  +  X-SDK-Session-Id  +  X-Community-Id
        # Returns full objects for the favorited units, amenities, and floorplans
        # of the given session. The front-end builds its own shareable URL using
        # getCurrentSessionId() + communityId, then passes those values here to
        # display a shared list.
        # ------------------------------------------------------------------
        def get_favorites
          return render_error("X-SDK-Session-Id header is missing.", 400) unless sdk_session_id.present?

          fav = favorite_record
          unit_ids      = favorite_ids(fav, "unit")
          amenity_ids   = favorite_ids(fav, "amenity")
          floorplan_ids = favorite_ids(fav, "floorplan")

          builder = SdkPayloadBuilderService.new(@community)

          units_ar = @community.units.visible_units.without_hidden_names.where(id: unit_ids.to_a).includes(:floorplan).to_a
          units_ar.each { |u| u.association(:community).target = @community }
          favorite_units = builder.units_json(unit_ids, show_ops_map?, units_ar)

          favorite_amenities  = builder.amenities_json(amenity_ids).select { |a| a[:isFavorite] }
          favorite_floorplans = builder.floorplans_json(nil, floorplan_ids).select { |f| f[:isFavorite] }

          render json: {
            success:       true,
            units:         favorite_units,
            unit_ids:      unit_ids.to_a,
            amenities:     favorite_amenities,
            amenity_ids:   amenity_ids.to_a,
            floorplans:    favorite_floorplans,
            floorplan_ids: floorplan_ids.to_a,
            status:        "success",
            code:          200
          }
        end

        # ------------------------------------------------------------------
        # POST /api/partner/maps/share_favorites_email
        # Body: email, favorites_url
        # Authorization: Bearer <session_token>  +  X-SDK-Session-Id header
        # Sends a branded favorites email to the supplied address using the
        # community's logo, name, address, and tour / apply configuration.
        # ------------------------------------------------------------------
        def share_favorites_email
          email        = params[:email].to_s.strip
          favorites_url = params[:favorites_url].to_s.strip

          return render_error("Email is required.", 400)         if email.blank?
          return render_error("Invalid email address.", 400)     unless email.match?(URI::MailTo::EMAIL_REGEXP)
          return render_error("Favorites URL is required.", 400) if favorites_url.blank?

          FavoriteMailer.share_favorites(email, @community, favorites_url).deliver_now

          render json: { success: true, message: "Email sent successfully.", status: "success", code: 200 }
        rescue StandardError => e
          render_error("Failed to send email.", 500)
        end

        # ------------------------------------------------------------------
        # POST /api/partner/maps/events
        # Authorization: Bearer <session_token>
        # Body: { session_id, product_src, events: [...], device_context? }
        # Receives a batch of analytics events from the SDK (flushed every 5s or
        # on page hide via sendBeacon). Fire-and-forget from the client — always 204.
        # ------------------------------------------------------------------
        def track_events
          session_id            = params[:session_id].to_s.strip
          return render_error("session_id is required.", 400) if session_id.blank?

          parent_sdk_session_id = params[:parent_sdk_session_id].to_s.strip.presence
          partner               = params[:partner].to_s.strip.presence
          product_src           = params[:product_src].to_s.strip.presence || "web"
          events                = Array(params[:events]).first(100)
          context               = params[:device_context]&.permit!

          Analytics::SdkAnalyticsService.new(
            community:             @community,
            client_type:           product_src,
            session_id:            session_id,
            parent_sdk_session_id: parent_sdk_session_id,
            partner:               partner,
            product:               product_src
          ).process_batch(events: events, device_context: context)

          head :no_content
        end

        # ------------------------------------------------------------------
        # GET /api/partner/maps/fetch_svg_image?map_id=:id&map_type=sitemap|floorplate
        # Authorization: Bearer <session_token>
        # Resolves the real storage URL server-side — it never reaches the client.
        # Ownership is validated: map must belong to the session's property.
        # ------------------------------------------------------------------
        def fetch_svg_image
          map_id   = params[:map_id]   || params[:mapId]
          map_type = params[:map_type] || params[:mapType]

          svg_url = resolve_svg_url(map_id, map_type)

          if svg_url.nil?
            render plain: "Map not found.", status: :not_found
            return
          end

          etag = svg_etag(map_id, map_type)
          if etag && request.headers['If-None-Match'] == etag
            head :not_modified
            return
          end

          compressed = SvgFetchService.fetch(svg_url)

          unless compressed
            render plain: "Failed to fetch SVG.", status: :bad_request
            return
          end

          response.headers['Content-Encoding'] = 'gzip'
          response.headers['Cache-Control']    = 'private, max-age=3600'
          response.headers['ETag']             = etag if etag
          response.headers['Vary']             = 'Accept-Encoding'
          send_data compressed, type: 'image/svg+xml', disposition: 'inline'
        rescue StandardError => e
          render plain: "Failed to fetch SVG: #{e.message}", status: :bad_request
        end

        private

        def build_sdk_payload(ops_map = false)
          SdkPayloadBuilderService.new(@community).build(ops_map: ops_map)
        end

        def gzip_json(payload)
          buf = StringIO.new.binmode
          gz  = Zlib::GzipWriter.new(buf)
          gz.write(payload.to_json)
          gz.close
          buf.string
        end

        # ------------------------------------------------------------------
        # SESSION TOKEN — signed with Rails' MessageVerifier (HMAC-SHA256).
        # Token is scoped to one partner + one property and expires in 1 hour.
        # ------------------------------------------------------------------
        def generate_session_token(api_key, property_id)
          payload = {
            api_key:     api_key,
            property_id: property_id.to_s,
            exp:         1.hour.from_now.to_i
          }
          Rails.application.message_verifier(:pyn_sdk_v1).generate(payload)
        end

        # ------------------------------------------------------------------
        # Resolve SVG URL from map_id + map_type, enforcing community ownership.
        # The actual storage URL is never sent to the browser.
        # ------------------------------------------------------------------
        def resolve_svg_url(map_id, map_type)
          return nil unless map_id.present?

          # get_environment_based_svg_url returns svg_image.path in development
          # (because fetch_svg_by_url does File.read in dev) and the S3 URL in production.
          case map_type
          when 'sitemap'
            sitemap = @community.sitemap
            return nil unless sitemap&.id == map_id.to_i
            get_environment_based_svg_url(sitemap)
          when 'floorplate'
            fp = @community.floorplates.find_by(id: map_id)
            get_environment_based_svg_url(fp)
          else
            if @community.sitemap&.id == map_id.to_i
              get_environment_based_svg_url(@community.sitemap)
            else
              fp = @community.floorplates.find_by(id: map_id)
              get_environment_based_svg_url(fp)
            end
          end
        end

        # ------------------------------------------------------------------
        # Load community for the one-time authorized endpoint (from params).
        # ------------------------------------------------------------------
        def load_property
          property_id = params[:property_id] || params[:propertyId]
          return render_error("Property ID is missing.", 400) if property_id.blank?

          @community = Community.find_by(id: property_id)
          return render_error("Invalid Property ID or not associated.", 404) if @community.nil?
        end

        # ------------------------------------------------------------------
        # Load community for session-based endpoints (from session token).
        # ------------------------------------------------------------------
        def load_community_from_session
          @community = Community
            .includes(:sitemap, :floorplates, :floorplans, :map_filter,
                      :font_setting, :credential, :calculator_config,
                      :three_d_maps_configuration, :design_system_config)
            .find_by(id: @session_property_id)
          return render_error("Property not found.", 404) if @community.nil?
        end

        def load_community_for_svg
          @community = Community
            .includes(:sitemap, :floorplates)
            .find_by(id: @session_property_id)
          return render_error("Property not found.", 404) if @community.nil?
        end

        def svg_etag(map_id, map_type)
          record = case map_type
            when 'sitemap'    then @community.sitemap
            when 'floorplate' then @community.floorplates.detect { |fp| fp.id == map_id.to_i }
            else
              @community.sitemap&.id == map_id.to_i ?
                @community.sitemap :
                @community.floorplates.detect { |fp| fp.id == map_id.to_i }
            end
          return nil unless record&.updated_at
          "\"#{map_id}-#{record.updated_at.to_i}\""
        end

        def load_community_for_analytics
          @community = Community.find_by(id: @session_property_id)
          return render_error("Property not found.", 404) if @community.nil?
        end

        def load_community_for_favorites
          @community = Community
            .includes(:sitemap, :floorplates)
            .find_by(id: @session_property_id)
          return render_error("Property not found.", 404) if @community.nil?
        end

        def load_community_for_email
          @community = Community
            .includes(:credential)
            .find_by(id: @session_property_id)
          return render_error("Property not found.", 404) if @community.nil?
        end

        def show_ops_map?
          params[:map_type] == "ops"
        end

        # The single Favorite row for this session + community (may be nil).
        # Memoised so fetch_data / get_favorites hit the DB only once.
        def favorite_record
          return @favorite_record if defined?(@favorite_record)
          @favorite_record = sdk_session_id.present? ?
            Favorite.find_by(session_id: sdk_session_id, community_id: @community.id) :
            nil
        end

        # Favorited ids of the given type as a Set of strings.
        def favorite_ids(favorite, type)
          (favorite&.ids_for(type) || []).to_set
        end

        def sdk_session_id
          @sdk_session_id ||= request.headers['X-SDK-Session-Id'].presence
        end

        # "unit" (default), "amenity", or "floorplan".
        def favorite_type
          @favorite_type ||= params[:type].to_s.strip.presence || "unit"
        end

        # Accepts ids[] and falls back to the legacy unit_ids[] param.
        def parse_ids
          raw = params[:ids].presence || params[:unit_ids]
          Array(raw).map(&:to_s).map(&:strip).reject(&:empty?).uniq
        end

        # Validate the submitted ids against the correct community association,
        # returning only the ones that actually exist as strings.
        def valid_ids_for_type(type, ids)
          scope = case type
            when "amenity"   then Amenity.where(community_id: @community.id)
            when "floorplan" then @community.floorplans
            else                  @community.units
            end
          scope.where(id: ids).pluck(:id).map(&:to_s)
        end

        # Standard success body. Echoes the ids under a generic `ids` key plus the
        # resolved `type`. For unit calls it also keeps the legacy `unit_ids` key
        # so existing integrations keep working unchanged.
        def favorites_response(ids)
          body = {
            success: true,
            type:    favorite_type,
            ids:     ids,
            status:  "success",
            code:    200
          }
          body[:unit_ids] = ids if favorite_type == "unit"
          body
        end

        # Merge isFavorite: true into cached payload items whose id is favorited.
        def merge_favorites(items, id_key, fav_ids)
          return items || [] unless fav_ids.any?
          (items || []).map { |item| fav_ids.include?(item[id_key].to_s) ? item.merge(isFavorite: true) : item }
        end

        def render_error(message, status)
          render json: { message: message, status: "failed", code: status }, status: status
        end

      end
    end
  end
end
