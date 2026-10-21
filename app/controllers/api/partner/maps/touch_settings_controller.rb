module Api
  module Partner
    module Maps
      # Pynwheel Touch settings, one document per property.
      #
      #   GET /api/partner/maps/touch_settings  → the property's saved settings
      #   PUT /api/partner/maps/touch_settings  → replace them
      #       Body: { "settings": { ... }, "device": { "device_type": "tablet", "platform": "ios", ... } }
      #
      # Authorization: Bearer <session token>, same as every SDK endpoint. The
      # property comes from the token, never from the body.
      class TouchSettingsController < BaseController
        skip_before_action :validate_api_key
        before_action :validate_session_token
        before_action :load_community

        def show
          setting = TouchSetting.find_by(community_id: @community.id)
          render json: setting ? setting.as_app_json : empty_response
        end

        def update
          if request.raw_post.bytesize > TouchSetting::MAX_BYTES
            return render_error("Settings are too large.", 413)
          end

          body     = JSON.parse(request.raw_post) rescue nil
          settings = body["settings"] if body.is_a?(Hash)
          return render_error("settings must be a JSON object.", 422) unless settings.is_a?(Hash)

          setting = save_settings(settings, body["device"])
          render json: setting.as_app_json
        end

        private

        # Two first saves for the same property can race on the unique index;
        # the loser retries once and updates the row the winner created.
        def save_settings(settings, device, retried: false)
          setting = TouchSetting.find_or_initialize_by(community_id: @community.id)
          setting.assign_from_app(settings, device)
          setting.save!
          setting
        rescue ActiveRecord::RecordNotUnique
          raise if retried
          save_settings(settings, device, retried: true)
        end

        def load_community
          @community = Community.find_by(id: @session_property_id)
          render_error("Property not found.", 404) if @community.nil?
        end

        def empty_response
          { success: true, property_id: @community.id, settings: {}, device: {}, updated_at: nil }
        end

        def render_error(message, status)
          render json: { message: message, status: "failed", code: status }, status: status
        end
      end
    end
  end
end
