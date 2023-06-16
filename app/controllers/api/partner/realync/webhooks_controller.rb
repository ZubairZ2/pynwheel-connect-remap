module Api
  module Partner
    module Realync
      class WebhooksController < BaseController
        
        before_action :load_pyn_properties

        def update_video_links
          return unless video_params.present?
          
          begin
            video_params.each do |video_obj_param|
              next unless video_obj_param.present?
              video_provider = filter_video_object_provider(video_obj_param)
              
            end

          rescue => e
            render :json {message: e.message, status: :unprocessable_entity}
          end

        end

        private

          def filter_video_object_provider video_obj_param
            obj_hash = Hash.new()
            if video_param["yardiPropertyId"].present?
              obj_hash = {provider: "yardi", property_id: video_param["yardiPropertyId"]}
              obj_hash.merge!({unit_id: video_obj_param["entrataUnitId"]}) if video_obj_param["videoType"] == "Unit"
              obj_hash.merge!({amenity_name: video_obj_param["videoName"]}) if video_obj_param["videoType"] == "Amenity"

            elsif video_param["entrataPropertyId"].present?
              {"psi", video_param["entrataPropertyId"]}

            else
              {"", nil}
            end
          end

          def get_property_info video_provider
            return unless video_provider.present?

          end

          def load_pyn_properties
            @pyn_properties = Community.includes(:credential, :units, :amenities)
          end

          def video_params
            params.dig("videos")
          end

      end
    end
  end
end