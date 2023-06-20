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
              communities = load_realync_property(video_obj_param)
              filter_video_object_provider(video_obj_param, communities) unless communities.empty?            
            end
          rescue => e
            render :json {message: e.message, status: :unprocessable_entity}
          end
        end

        private

          def filter_video_object_provider video_obj_param, communities
            case video_obj_param["videoType"].downcase
            when "unit"
              update_unit_video_link(video_obj_param, communities)
            when "amenity"
              update_amenity_video_link(video_obj_param, communities)
            end
          end

          def update_unit_video_link video_obj_param, communities
            communities.each do |community|
              units = community.where(units: {id: realync_unit_id(video_obj_param)})
              units.update_all(virtual_tour_button_label: video_obj_param["videoName"], virtual_tour_url: video_obj_param["shareLink"])
            end
          end

          def update_amenity_video_link video_obj_param, communities

          end

          def realync_unit_id video_obj_param
            unit_id = video_obj_param["yardiUnitId"] || video_obj_param["entrataUnitId"]
          end

          def realync_property_id video_obj_param
            video_obj_param["yardiPropertyId"] || video_obj_param["entrataPropertyId"]
            492165
          end

          def realync_data_provider video_obj_param
            if video_obj_param["yardiPropertyId"].present?
              "yardi"
            elsif video_obj_param["entrataPropertyId"].present?
              "psi"
            else
              ""
            end
          end

          def load_realync_property video_obj_param
            return unless video_obj_param.present?
            data_provider = realync_data_provider(video_obj_param)
            property_id = realync_property_id(video_obj_param)
            @pyn_properties.where(data_provider: data_provider, credentials:{ property_id: property_id})
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