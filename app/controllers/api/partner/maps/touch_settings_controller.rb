module Api
  module Partner
    module Maps
      # Pynwheel Touch layouts, one per property per screen type (device type ×
      # orientation).
      #
      #   GET /api/partner/maps/touch_settings
      #       → every saved layout for the property (at most six)
      #   GET /api/partner/maps/touch_settings?device_type=ipad&device_orientation=landscape
      #       → just that one, if saved
      #   PUT /api/partner/maps/touch_settings
      #       Body: { "device_type": "ipad", "device_orientation": "landscape",
      #               "settings": { ... }, "device_details": { ... } }
      #       → replaces that one layout
      #
      # Authorization: Bearer <session token>, same as every SDK endpoint. The
      # property comes from the token, never from the request.
      class TouchSettingsController < BaseController
        skip_before_action :validate_api_key
        before_action :validate_session_token
        before_action :load_community

        def show
          scope = TouchSetting.where(community_id: @community.id).order(:device_type, :device_orientation)
          scope = scope.where(device_type: params[:device_type]) if params[:device_type].present?
          scope = scope.where(device_orientation: params[:device_orientation]) if params[:device_orientation].present?

          render json: { success: true, property_id: @community.id, layouts: scope.map(&:as_app_json) }
        end

        def update
          if request.raw_post.bytesize > TouchSetting::MAX_BYTES
            return render_error("Settings are too large.", 413)
          end

          body = JSON.parse(request.raw_post) rescue nil
          return render_error("Body must be a JSON object.", 422) unless body.is_a?(Hash)

          device_type        = body["device_type"].to_s
          device_orientation = body["device_orientation"].to_s
          settings           = body["settings"]
          device_details     = body["device_details"]

          unless TouchSetting::DEVICE_TYPES.include?(device_type)
            return render_error("device_type must be one of: #{TouchSetting::DEVICE_TYPES.join(', ')}.", 422)
          end
          unless TouchSetting::DEVICE_ORIENTATIONS.include?(device_orientation)
            return render_error("device_orientation must be one of: #{TouchSetting::DEVICE_ORIENTATIONS.join(', ')}.", 422)
          end
          return render_error("settings must be a JSON object.", 422) unless settings.is_a?(Hash)
          if !device_details.nil? && !device_details.is_a?(Hash)
            return render_error("device_details must be a JSON object.", 422)
          end

          layout = save_layout(device_type, device_orientation, settings, device_details)
          render json: { success: true, property_id: @community.id, layout: layout.as_app_json }
        end

        private

        # Two first saves for the same screen type can race on the unique
        # index; the loser retries once and updates the row the winner created.
        # device_details is replaced only when sent, so a save without it keeps
        # the last known device.
        def save_layout(device_type, device_orientation, settings, device_details, retried: false)
          layout = TouchSetting.find_or_initialize_by(
            community_id: @community.id, device_type: device_type, device_orientation: device_orientation
          )
          layout.settings = settings
          layout.device_details = device_details unless device_details.nil?
          layout.save!
          layout
        rescue ActiveRecord::RecordNotUnique
          raise if retried
          save_layout(device_type, device_orientation, settings, device_details, retried: true)
        end

        def load_community
          @community = Community.find_by(id: @session_property_id)
          render_error("Property not found.", 404) if @community.nil?
        end

        def render_error(message, status)
          render json: { message: message, status: "failed", code: status }, status: status
        end
      end
    end
  end
end
