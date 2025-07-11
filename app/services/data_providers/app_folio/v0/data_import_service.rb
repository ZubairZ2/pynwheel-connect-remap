module DataProviders
  module AppFolio
    module V0
      class DataImportService < DataProviders::AppFolio::V0::BaseService

        def perform
          property_codes = @credential.app_folio_property_id.split(',') rescue []

          property_codes.each do |property_code|
            begin
              property_code = property_code&.strip

              import_property_details(property_code)
              import_property_floorplans(property_code)
              import_property_units(property_code)
              update_floorplan_square_footage()

            rescue => exception
              raise exception
            end
          end
        end

        private

        def import_property_details property_code
          response = get_resource(property_code, "properties")
          return unless response.present?
          update_property_details(response)
        end

        def update_property_details details
          return unless details.present?
          details = details["data"]

          return unless details.present?
          details = details.is_a?(Array) ? details.first : details

          @community.update!(
            name: details["Name"],
            address: details["Address1"] ||  details["Address2"],
            city: details["City"],
            state: details["State"],
            zip: details["Zip"],
            website: details["Link"],
            # email: details["Email"],
            # phone: details["PhoneNumber"]
          )
        end

        def import_property_floorplans property_code
          response = get_resource(property_code, "unit_types")
          return unless response.present?
          response = response["data"]
          process_floorplans_response(response) if response.present? && response.is_a?(Array)
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
              fp = Floorplan.find_or_initialize_by(provider: 'appfolio', community_id: @community_id, provider_floorplan_id: r["Id"])
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

            update_attribute_if_blank(fp, :name, r["Name"])
            update_attribute_if_blank(fp, :bedrooms, r["Bedrooms"], 'bedroom')
            update_attribute_if_blank(fp, :bathrooms, r["Bathrooms"], 'bathroom')
            update_attribute_if_blank(fp, :square_feet, r['SquareFeet'])
            update_attribute_if_blank(fp, :market_rent, r['MarketRent'])
            fp.property_id = r['PropertyId']

            # fp.unit_count = r['']
            # fp.units_available = r['']
            # fp.deposit = r['minimumDeposit']
            # add_floorplan_images(fp, r['floorplanImageURL'])
            # add_floorplan_virtual_url(fp, r["fpVideoEmbedCode"])

            fp.save
          rescue => exception
            raise exception
          end
        end


        def import_property_units property_code
          response = get_resource(property_code, "units")
          return unless response.present?
          response = response["data"]
          process_units_response(response, property_code) if response.present? && response.is_a?(Array)
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
            unit = Unit.find_or_initialize_by(provider: "appfolio", community_id: @community_id, provider_unit_id: r["Id"])
            next if unit.manual_override
            update_unit_attributes(unit, r, property_code)
            units << unit
          end

          units
        end

        def update_unit_attributes(unit, r, property_code)
          begin
            # binding.pry

            update_attribute_if_blank(unit, :marketing_name, r["Name"], 'name')
            # update_attribute_if_blank(unit, :floor, get_floor(r))
            update_attribute_if_blank(unit, :floorplan_id, r["UnitTypeId"])
            update_attribute_if_blank(unit, :effective_rent, unit_market_rent(r))
            update_attribute_if_blank(unit, :availability, unit_availability(r))
            update_attribute_if_blank(unit, :available_date, set_availability_date(r))
            update_attribute_if_blank(unit, :available, is_available?(r))
            # unit.available = is_available?(r)
            unit.property_id = property_code
            unit.unit_type = r["UnitType"]
            unit.square_feet = (r["SquareFeet"].to_f > 0) ? r["SquareFeet"] : 1.0
            unit.market_rent = unit_market_rent(r)
            unit.min_effective_rent = unit_market_rent(r)
            unit.max_effective_rent = unit_market_rent(r)
            unit.unit_status = r["Status"]
            unit.availability_url = r["ApplicationURL"] if r["ApplicationURL"].present?

            # unit.lease_pricing = calculate_lease_pricing(property_code, r["apartmentName"])
            # unit.description = unit_description(r["amenities"]) if r["amenities"].present?
            # binding.pry

          rescue => exception
            exception
          end
        end

        def unit_market_rent r
          market_rent = r['MarketRent'] || r['ListedRent']
          market_rent.to_f > 0 ? market_rent : 1.0
        end

        def is_available? r
          unit_availability(r) === "Unoccupied"
        end

        def unit_availability r
          (r["Status"] === "Vacant") ? "Unoccupied" : "Occupied"
        end

        def set_availability_date(r)
          return "" unless is_available?(r)

          available_on = r["AvailableOn"]
          Date.parse(available_on) rescue Date.today
        end

        def update_floorplan_square_footage
          @community&.floorplans&.each do |floorplan|
            floorplan.update(square_feet: fetch_floorplan_unit_square_feet(floorplan)) rescue next
          end
        end

        def fetch_floorplan_unit_square_feet floorplan
          @community.units.where(floorplan_id: floorplan.provider_floorplan_id).last.square_feet rescue 1
        end

      end
    end
  end
end