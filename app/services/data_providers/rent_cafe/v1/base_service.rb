module DataProviders
  module RentCafe
    module V1
      class BaseService

        def initialize(community_id)
          return unless community_id.present?
          @community_id = community_id
          @community = Community.find_by_id community_id
          @credential = @community&.credential if @community.present?
          @batch_size = 10
          
          return nil unless (@community.present? && @credential.present?)
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

          def get_appartments_availability property_code
            DataProviders::RentCafe::V1ApisService.new(@community_id).get_apartment_availability(property_code)
          end

          def get_apartment_pricing_details property_code, apartment_name, available_date
            DataProviders::RentCafe::V1ApisService.new(@community_id).get_apartment_pricing_matrix(apartment_name, property_code, available_date)
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

          def evaluate_floor(marketing_name)
            marketing_name = marketing_name.gsub('-','')
            floor = 1
            
            if marketing_name.size == 3
              floor = marketing_name.first(1)
            elsif marketing_name.size > 3
              floor = marketing_name.first(2)
            end

            return floor 
          end

          def image_base64(image_url)
            return unless image_url.present?
            encoded_url = URI::DEFAULT_PARSER.escape(image_url) #URI.encode(image_url)
            uri = URI.parse(encoded_url)
            file = uri.open
            image_data = file.read
            encoded_image = Base64.strict_encode64(image_data)
            "data:image/png;base64,#{encoded_image}"
          rescue ::OpenURI::HTTPError => e
            raise e
          rescue StandardError => e
            raise e
          end

          def add_or_update_sub_communities property_name, property_code
            sub = @community.sub_communities.find_or_initialize_by(property_id: property_code)
            sub.assign_attributes(name: property_name)
            sub.save!
            
          rescue StandardError => e
            raise e
          end
      end
    end
  end
end
