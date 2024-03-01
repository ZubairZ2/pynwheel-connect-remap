module DataProviders
  module RentManager
    class DataImportService < DataProviders::RentManager::BaseService

      def perform
        property_codes = @credential.rentmanager_property_id.split(',') rescue []

        property_codes.each do |property_code|
          begin

            property_code = property_code&.strip
            # import_property_details(property_code)
            # import_property_floorplans(property_code)
            import_property_units(property_code)

          rescue => exception
            raise exception
          end
        end
      end

      private

        def import_property_details property_code
          response = get_property_details(property_code)
          return unless response.present?
          update_property_details(response)
        end

        def update_property_details details
          @community.update!(
            name: details["Name"],
            address: details["PrimaryAddress"]["Street"],
            city: details["PrimaryAddress"]["City"],
            state: details["PrimaryAddress"]["State"],
            zip: details["PrimaryAddress"]["PostalCode"],
            email: details["Email"],
            phone: details["PrimaryPhoneNumber"]["PhoneNumber"]
          )
        end

        def import_property_floorplans property_code
          response = get_floorplans_list(property_code)
          return unless response.present?
          process_floorplans_response(response)
        end

        def process_floorplans_response response
          response.each_slice(@batch_size) do |batch|
            floorplans = build_floorplans(batch)
            # import_floorplans(floorplans)
          end
        end

        def build_floorplans response
          floorplans = []
          begin
            response.each do |r|
              fp = Floorplan.find_or_initialize_by(provider: 'rentmanager', community_id: @community_id, provider_floorplan_id: floorplan_unit_type(r, "UnitTypeID"))
              next if fp.manual_override
              update_floorplan_attributes(fp, r)
              floorplans << fp
            end
          rescue => exception
            raise exception
          end

          floorplans
        end

        def update_floorplan_attributes(fp, r)
          begin

            update_attribute_if_blank(fp, :name, floorplan_unit_type(r, 'Name')
            update_attribute_if_blank(fp, :bedrooms, floorplan_unit_type(r, 'Bedrooms'), 'bedroom')
            update_attribute_if_blank(fp, :bathrooms, floorplan_unit_type(r, 'Bathrooms'), 'bathroom')

            fp.property_id = r['PropertyID']
            fp.unit_count = r['']
            fp.units_available = r['']

            # update_floorplan_square_feet(fp, r['minimumSQFT'], r['sqft'])
            # update_attribute_if_blank(fp, :market_rent, r['minimumRent'])
            # fp.deposit = r['minimumDeposit']
            # add_floorplan_images(fp, r['floorplanImageURL'])
            # add_floorplan_virtual_url(fp, r["fpVideoEmbedCode"])

            fp.save
          rescue => exception
            raise exception
          end
        end

        def floorplan_unit_type r, attribute_name
          r["FloorplanUnitTypes"][0]["UnitTypes"][0][attribute_name]
        end

        def import_property_units property_code
          response = get_units_list(property_code)
          return unless response.present?
          process_units_response(response, property_code)
        end

        def process_units_response(response, property_code)
          response.each_slice(@batch_size) do |batch|
            units = build_units(batch, property_code)
            import_units(units)
          end
        end

        def build_units(response, property_code)
          units = []

          response.each do |r|
            unit = Unit.find_or_initialize_by(provider: "rentmanager", community_id: @community_id, provider_unit_id: r["UnitID"])
            next if unit.manual_override
            update_unit_attributes(unit, r, property_code)
            units << unit
          end

          units
        end

        def update_unit_attributes(unit, r, property_code)
          begin
            
            update_attribute_if_blank(unit, :marketing_name, r["Name"], 'name')
            update_attribute_if_blank(unit, :floor, get_floor(r) )
            update_attribute_if_blank(unit, :floorplan_id, r["UnitTypeID"])
            update_attribute_if_blank(unit, :effective_rent, get_market_rent(r))
            update_attribute_if_blank(unit, :availability, unit_availability_status(r))
            update_attribute_if_blank(unit, :available_date, set_availabilty_date(r))
            update_attribute_if_blank(unit, :available, r["IsVacant"])
            unit.property_id = r["PropertyID"]
            unit.unit_type = r["Name"]
            unit.square_feet = r["SquareFootage"]
            unit.market_rent = get_market_rent(r)
            unit.min_effective_rent = get_market_rent(r)
            unit.max_effective_rent = get_market_rent(r)
            unit.unit_status = unit_availability_status(r)

            # unit.availability_url = r["applyOnlineURL"] if r["applyOnlineURL"].present?
            # unit.lease_pricing = calculate_lease_pricing(property_code, r["apartmentName"])
            # unit.description = unit_description(r["amenities"]) if r["amenities"].present?
            # unit.effective_rent = 1.0 if unit.effective_rent <= 0

          rescue => exception
            exception
          end
        end

        def get_floor r
          return nil unless r["Floor"].present?
          r["Floor"]
        end

        def unit_availability_status r
          r["IsVacant"] ? "Unoccupied" : "Occupied"
        end

        def set_availabilty_date r
          return "" unless r["IsVacant"]
          r["CurrentOccupancyStatus"]["EndDate"].to_date
        end

        def get_market_rent r
          return 1  unless r["CurrentMarketRent"]["Amount"].present?
          r["CurrentMarketRent"]["Amount"]
        end
    end
  end
end