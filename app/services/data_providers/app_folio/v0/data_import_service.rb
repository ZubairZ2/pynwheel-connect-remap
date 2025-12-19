module DataProviders
  module AppFolio
    module V0
      class DataImportService < DataProviders::AppFolio::V0::BaseService
        def perform
          property_ids = @credential.resolved_app_folio_property_ids(@app_folio_service)
          return if property_ids.blank?

          property_ids = property_ids.map(&:strip).uniq

          import_property_details(property_ids.first) if @update_property_info
          import_property_units(property_ids)
          import_property_floorplans(property_ids)
          update_floorplan_square_footage
        end

        private

        def import_property_details property_id
          response = get_resource(property_id, "properties", "Id")
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
          )
        end

        def import_property_floorplans(property_ids)
          response = get_resource(property_ids, "unit_types")
          return unless response.present?

          unit_types = response["data"]
          return unless unit_types.is_a?(Array)

          property_ids = normalize_ids(property_ids)

          filtered_unit_types =
            unit_types.select { |u| property_ids.include?(u["PropertyId"]) }

          process_floorplans_response(filtered_unit_types) if filtered_unit_types.any?
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
            fp.save

          rescue => exception
            raise exception
          end
        end

        def import_property_units property_ids
          response = get_resource(property_ids, "units", "PropertyId")
          return unless response.present?
          response = response["data"]
          process_units_response(response) if response.present? && response.is_a?(Array)
        end

        def process_units_response(response)
          response.each_slice(@batch_size) do |batch|
            units = build_units(batch)
            import_units(units)
          end
        end

        def build_units(response)
          units = []

          response.each do |r|
            unit = Unit.find_or_initialize_by(provider: "appfolio", community_id: @community_id, provider_unit_id: r["Id"])
            next if unit.manual_override
            update_unit_attributes(unit, r)
            units << unit
          end

          units
        end

        def update_unit_attributes(unit, r)
          begin
            
            update_attribute_if_blank(unit, :marketing_name, @credential&.resolved_unit_name(r), 'name')
            update_attribute_if_blank(unit, :floorplan_id, r["UnitTypeId"])
            update_attribute_if_blank(unit, :effective_rent, unit_market_rent(r))
            update_attribute_if_blank(unit, :availability, unit_availability(r))
            update_attribute_if_blank(unit, :available_date, set_availability_date(r))
            update_attribute_if_blank(unit, :available, is_available?(r))

            unit.property_id = r["PropertyId"]
            unit.unit_type = r["UnitType"]
            unit.square_feet = unit_sqft(r)
            unit.market_rent = unit_market_rent(r)
            unit.min_effective_rent = unit_min_rent(r)
            unit.max_effective_rent = unit_max_rent(r)
            unit.unit_status = r["Status"]
            unit.availability_url = r["ApplicationURL"] if r["ApplicationURL"].present?

          rescue => exception
            exception
          end
        end

        def unit_sqft r
          return 1.0 unless r["SquareFeet"].present?
          r["SquareFeet"].to_f > 0 ? r["SquareFeet"].to_f : 1.0
        end

        def unit_min_rent r
          min_rent = r['LowAdvertisedRent'] || r['ListedRent']
          min_rent.to_f > 0 ? min_rent : 1.0
        end

        def unit_max_rent r
          min_rent = r['HighAdvertisedRent'] || r['ListedRent']
          min_rent.to_f > 0 ? min_rent : 1.0
        end

        def unit_market_rent r
          market_rent = r['MarketRent'] || r['ListedRent']
          market_rent.to_f > 0 ? market_rent : 1.0
        end

        def is_available?(r)
          unit_availability(r) == "Unoccupied"
        end

        def unit_availability(r)
          status       = r["Status"]
          available_on = r["AvailableOn"]
          posted       = r["PostedToWebsite"]

          return "Occupied" unless posted

          if status == "Vacant"
            "Unoccupied"
          elsif status == "Notice" && available_on.present?
            "Unoccupied"
          else
            "Occupied"
          end
        end

        def set_availability_date(r)
          return "" unless is_available?(r)

          available_on = r["AvailableOn"]
          available_on.present? ? (Date.parse(available_on) rescue Date.today) : Date.today
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