module Api
  module Partner
    module Realync
      class WebhooksController < BaseController
        before_action :load_pyn_properties

        def update_video_links
          return unless params.dig("videos").present?

          begin
            params.dig("videos").each do |video_obj_param|
              next unless video_obj_param.present

              communities = load_realync_property(video_obj_param)
              filter_video_object_provider(video_obj_param, communities) unless communities.empty?
            end
          rescue => e
            render json: { message: e.message, status: :unprocessable_entity }
          end
        end

        private

          def filter_video_object_provider(video_obj_param, communities)
            case video_obj_param["videoType"].downcase
            when "unit"
              update_unit_video_link(video_obj_param, communities)
            when "amenity"
              update_amenity_video_link(video_obj_param, communities)
            end
          end

          def update_unit_video_link(video_obj_param, communities)
            # units = Unit.joins(community: :credential).where(marketing_name: video_obj_param["unitName"], provider_unit_id: realync_unit_id(video_obj_param), communities: { id: communities })
            units = Unit.joins(community: :credential).where(provider: realync_data_provider, property_id: realync_property_id, marketing_name: video_obj_param["unitName"], communities: { id: communities })
            units.update_all(virtual_tour_button_label: video_obj_param["videoName"], virtual_tour_url: video_obj_param["shareLink"])
          end

          def update_amenity_video_link(video_obj_param, communities)
            amenities = Amenity.joins(community: :credential).where(name: video_obj_param["videoName"], communities: { id: communities })
            amenities.update_all(video_link_button_label: video_obj_param["videoName"], video_link: video_link["shareLink"])
          end

          def realync_unit_id(video_obj_param)
            if video_obj_param["yardiPropertyId"].present?
              yardi_provider_unit_id()
            elsif video_obj_param["entrataPropertyId"].present?
              entrata_provider_unit_id()
            end
          end

          def yardi_provider_unit_id
            "#{video_obj_param["yardiUnitId"]}-#{video_obj_param["yardiPropertyId"]}"
          end

          def entrata_provider_unit_id
            "#{video_obj_param["entrataUnitId"]}-#{video_obj_param["entrataPropertyId"]}"
          end

          def realync_property_id(video_obj_param)
            if video_obj_param["yardiPropertyId"].present?
              video_obj_param["yardiPropertyId"]
            elsif video_obj_param["entrataPropertyId"].present?
              video_obj_param["entrataPropertyId"]
            else
              nil
            end
          end

          def realync_data_provider(video_obj_param)
            if video_obj_param["yardiPropertyId"].present?
              "yardi"
            elsif video_obj_param["entrataPropertyId"].present?
              "psi"
            else
              ""
            end
          end

          def load_realync_property(video_obj_param)
            return unless video_obj_param.present?

            data_provider = realync_data_provider(video_obj_param)
            property_id = realync_property_id(video_obj_param)
            @pyn_properties.where(data_provider: data_provider, credentials: { property_id: property_id })
          end

          def load_pyn_properties
            if ENV["PROPERTIES"] == "TRUE"
              @pyn_properties = Community.includes(:credential, :units, :amenities)
            else
              @pyn_properties = Community.where(id: [2194]).includes(:credential, :units, :amenities)
            end
          end
      end
    end
  end
end
