module DataProviders
  module RealPage
    module V1
      class BaseService

        def initialize(community_id)
          @community = Community.find_by_id community_id
          @credential = @community&.credential
          @site_ids = @credential&.site_id&.split(",")
          @pmc_id = @credential&.pmc_id
          @batch_size = 10
        end

        protected

          def fetch_units_data site_id
            DataProviders::RealPage::V1ApisService.new(@community.id).fetch_units_data(site_id)
          end

          def update_attribute_if_blank(object, attribute, value, diff_name = nil)
            updatedColumn = diff_name.present? ? diff_name : attribute
            object.send("#{attribute}=", value) if value.present? && !object.send("#{updatedColumn}_is_updated")
          end

          def import_units(units)
            return if units.empty?
            ProvidersDataUpdationService.new().update_or_create_units_records(units)
          end

          def get_provider_unit_id u, site_id
            "#{u["UnitID"]}-#{site_id.to_s}"
          end

          def get_unit_floorplan_id u, site_id
            "#{u["FloorplanID"]}-#{site_id}"
          end

          def get_unit_status u
            u["MadeReadyBit"] == "true" ? "Unoccupied" : "Occupied"
          end

          def get_unit_building_number u
            u["BuildingNumber"] unless u["BuildingNumber"] == "N/A"
          end

          def get_unit_site_id u
            u["SiteID"]
          end

          def get_unit_number u
            u["UnitNumber"]
          end

          def get_unit_effective_rent u
            u["BaseRentAmount"].to_f > 0 ? u["BaseRentAmount"] : 1
          end

          def get_unit_square_feet u
            u["RentSqFtCount"]
          end

          def get_unit_floor_number u
            u["FloorNumber"]
          end

          def get_unit_availability u
            u["AvailableBit"] == "true" ? "Unoccupied" : "Occupied"
          end

          def get_unit_available_date u
            if u["MadeReadyDate"].present?
              u["MadeReadyDate"]
            elsif u["AvailableDate"].present?
              u["AvailableDate"]
            else
              ""
            end
          end

          def set_unit_available unit
            unit.availability == "Occupied" ? false : true
          end
        
      end
    end
  end
end