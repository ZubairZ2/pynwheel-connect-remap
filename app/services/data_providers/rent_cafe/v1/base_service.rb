module DataProviders
  module RentCafe
    module V1
      class BaseService < ::BaseService

        def initialize(community_id)
          return unless community_id.present?
          @community_id = community_id
          @community = Community.find_by_id community_id
          @credentials = @community&.credential if @community.present?
          @batch_size = 20
          
          return nil unless (@community.present? && @credentials.present?)
        end

        protected

          def update_launch_forms_status
            if @community.pynwheel_launch_access
              @community.update_community_details_form_status()
              
              @community.update_property_management_form_status()
              @community.update_status_and_remarks(PROPERTY_MANAGEMENT_SYSTEM, APPROVED)

              @community.update_floorplans_form_status()
              @community.update_status_and_remarks(FLOORPLAN_IMAGES, APPROVED) if @community.check_all_floorplans_form_status_is_submitted()
            end
          end

          def get_property_details property_code
            DataProviders::RentCafe::V1ApisService.new(@community_id).get_property_details(property_code)            
          end

          def get_appartments_availability property_code, limit_result
            DataProviders::RentCafe::V1ApisService.new(@community_id).get_apartment_availability(property_code, limit_result)
          end

          def get_floorplan_details property_code
            DataProviders::RentCafe::V1ApisService.new(@community_id).get_floorplans(property_code)
          end

          def update_attribute_if_blank(object, attribute, value, diff_name = nil)
            updatedColumn = diff_name.present? ? diff_name : attribute
            object.send("#{attribute}=", value) if value.present? && !object.send("#{updatedColumn}_is_updated")
          end

          def import_floorplans(floorplans)
            return if floorplans.empty?
            ProvidersDataUpdationService.new().update_or_create_floorplans_records(floorplans)
          end

          def import_units(units)
            return if units.empty?
            ProvidersDataUpdationService.new().update_or_create_units_records(units)
          end

          def yardi_rent_cafe_property_rent_matrix(property_code, limit_result)
            begin
              rent_matrix = get_property_pricing_details(property_code, limit_result)
              if rent_matrix.present?
                grouped = rent_matrix.group_by { |u| u["apartmentId"] }

                result = {}

                grouped.each do |apartment_id, listings|
                  best_per_term = listings
                    .group_by { |u| u["term"] }
                    .values
                    .map { |term_listings| term_listings.min_by { |u| u["rent"] } }

                  result[apartment_id] = best_per_term.map do |u|
                    [u["rent"], u["term"], u["start_Date"], u["end_Date"]]
                  end
                end

                return result
              else
                return {}
              end
            rescue => ex
              raise ex
            end
          end

          def get_property_pricing_details property_code, limit_result
            DataProviders::RentCafe::V1ApisService.new(@credentials.community_id).get_apartment_pricing_matrix(property_code, limit_result)
          end
      end
    end
  end
end
