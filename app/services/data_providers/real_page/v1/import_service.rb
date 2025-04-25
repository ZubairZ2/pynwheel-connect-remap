# TODO - INPROGRESS
module DataProviders
  module RealPage
    module V1
      class ImportService < DataProviders::RealPage::V1::BaseService

        def perform
          site_ids = @credential.site_id.split(',') rescue []
          site_ids.each do |site_id|
            begin
              site_id = site_id&.strip
              import_property_units(site_id)

            rescue => exception
              raise exception
            end 
          end
        end

        private

          def import_property_units site_id
            response = fetch_units_data(site_id)
            
            return unless response.present?

            process_units_response(response, site_id)
          end

          def process_units_response(response, site_id)
            response.each_slice(@batch_size) do |batch|
              units = build_units(batch, site_id)
              import_units(units)
            end
          end

          def build_units(response, site_id)
            units = []

            response.each do |u|
              unit = Unit.find_or_initialize_by(provider: "realpagesvc", community_id: @community.id, provider_unit_id: get_provider_unit_id(u, site_id))

              next if unit.manual_override
              update_unit_attributes(unit, u, site_id)
              units << unit
            end

            units
          end

          def update_unit_attributes(unit, u, site_id)
            begin
              unit.property_id = site_id #get_unit_site_id(u)
              unit.provider_unit_id = get_provider_unit_id(u, site_id)
              unit.unit_type = get_unit_number(u)
              unit.unit_status = get_unit_status(u)
              unit.building = get_unit_building_number(u)
              unit.square_feet = get_unit_square_feet(u)
              update_attribute_if_blank(unit, :marketing_name, get_unit_number(u), 'name')
              update_attribute_if_blank(unit, :floorplan_id, get_unit_floorplan_id(u, site_id))
              update_attribute_if_blank(unit, :effective_rent, get_unit_effective_rent(u))
              update_attribute_if_blank(unit, :floor, get_unit_floor_number(u))
              update_attribute_if_blank(unit, :availability, get_unit_availability(u))
              update_attribute_if_blank(unit, :available_date, get_unit_available_date(u))
              update_attribute_if_blank(unit, :available, get_unit_available(unit))
              unit.manually_updated = false
            rescue => exception
              exception
            end
          end
      end
    end
  end
end