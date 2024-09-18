module DataProviders
  module RentCafe
    module V2
      class DataImportService < DataProviders::RentCafe::V2::BaseService

        def perform
          begin
            property_codes = @credential.p_code.split(',') rescue []
            property_codes.each do |property_code|
              import_property_details(property_code)
              import_property_floorplans(property_code)
              import_property_units(property_code)
              yardi_rent_cafe_rent_matrix(property_code)
            end

            update_launch_forms_status()
          rescue => exception
            raise exception
          end
        end

        private

          def import_property_details property_code
            response = get_property_details(property_code)
            return unless response.present?
            update_property_details(response)
          end

          def import_property_floorplans property_code
            response = get_floorplan_details(property_code)
            return unless response.present?
            process_floorplans_response(response)
          end

          def import_property_units property_code
            response = get_appartments_availability(property_code)
            return unless response.present?
            process_units_response(response, property_code)
          end

          def update_property_details details
            @community.update!(
              name: details["name"],
              address: details["address"],
              city: details["city"],
              state: details["state"],
              zip: details["zipcode"],
              email: details["email"],
              phone: details["phone"],
              latitude: details["latitude"],
              longitude: details["longitude"],
              website: details["url"]
            )
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
              unit = Unit.find_or_initialize_by(provider: "yardirentcafe", community_id: @community_id, provider_unit_id: r["apartmentId"])
              next if unit.manual_override
              update_unit_attributes(unit, r, property_code)
              units << unit
            end

            units
          end

          def update_unit_attributes(unit, r, property_code)
            update_attribute_if_blank(unit, :marketing_name, r["apartmentName"], 'name')
            update_attribute_if_blank(unit, :floor, evaluate_floor(unit.marketing_name))
            update_attribute_if_blank(unit, :floorplan_id, r["floorplanId"])
            update_attribute_if_blank(unit, :effective_rent, r["minimumRent"])
            update_attribute_if_blank(unit, :availability, unit_availability(r["availableDate"]))
            update_attribute_if_blank(unit, :available_date, set_availabilty_date(r["availableDate"]))
            update_attribute_if_blank(unit, :available, unit_availability(r["availableDate"]) == "Unoccupied")
            unit.effective_rent = 1.0 if unit.effective_rent <= 0
            unit.availability_url = r["applyOnlineURL"] if r["applyOnlineURL"].present?
            unit.description = unit_description(r["amenities"]) if r["amenities"].present?
            unit.property_id = r["propertyId"]
            unit.unit_type = r["apartmentName"]
            unit.market_rent = r["minimumRent"]
            unit.square_feet = r["sqft"] if r["sqft"].present?
            unit.min_effective_rent = r["minimumRent"] if r["minimumRent"].present?
            unit.max_effective_rent = r["minimumRent"] if r["minimumRent"].present?
            unit.unit_status = r["unitStatus"] rescue ""
          end

          def unit_description description
            return "" unless description.present?
            "<ul>#{description&.split("^")&.map{|desc| "<li>#{desc}</li>"}&.join("")}</ul>"
          end

          def unit_availability(available_date)
            return "Unoccupied" if available_date.present?
            "Occupied"
          end

          def set_availabilty_date(available_date)
            return unless available_date.present?
            available_date = available_date.split("/")
            Date.parse("#{available_date[2]}-#{available_date[0]}-#{available_date[1]}")
          end

          def yardi_rent_cafe_rent_matrix(property_code)
            rent_matrix = get_apartment_pricing_details(property_code)
            if rent_matrix.present?
              uniq_units = rent_matrix.map{|x| x["apartmentId"].to_i }&.compact&.uniq
              uniq_units.each do |apartment_id|
                unit = Unit.find_by(provider: "yardirentcafe", community_id: @community_id, provider_unit_id: apartment_id)

                if unit.present?
                  apartment_pricing = rent_matrix.map{|data| data if data["apartmentId"] == apartment_id}.compact
                  uniq_terms = rent_matrix.map{|x| x["term"].to_i }.uniq
                  distinct_data = uniq_terms.map{|term| apartment_pricing.map{|data| data if data["term"] == term.to_s}.compact}.compact
                  rentStrs = distinct_data.map{|data| data.map{|r| [r["rent"].to_i, r["term"], r["start_Date"], r["end_Date"]]}.min}
                  calculate_lease_pricing(unit, rentStrs.compact)
                end
              end
            end
          end

          def calculate_lease_pricing(unit, rentStrs)
            leasing = ""
            lease_prices_array = []
            if rentStrs.present?
              rentStrs.each do |rentStr|
                if rentStr[0].to_i > 0
                  lease_prices_array << rentStr[0].to_i
                  leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" + rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                end
              end
            end

            min_term_rent = lease_prices_array&.min
            max_term_rent = lease_prices_array&.max
            
            unit.effective_rent = min_term_rent if min_term_rent.present?
            unit.market_rent = min_term_rent if min_term_rent.present?
            unit.min_effective_rent = min_term_rent if min_term_rent.present?
            unit.max_effective_rent = max_term_rent if max_term_rent.present?
            unit.lease_pricing = leasing
            unit.save(validate: false)
          end

          def process_floorplans_response(response)
            response.each_slice(@batch_size) do |batch|
              floorplans = build_floorplans(batch)
              # import_floorplans(floorplans)
            end
          end

          def build_floorplans(response)
            floorplans = []

            response.each do |r|
              fp = Floorplan.find_or_initialize_by(provider: 'yardirentcafe', community_id: @community_id, provider_floorplan_id: r['floorplanId'])
              next if fp.manual_override
              update_floorplan_attributes(fp, r)
              floorplans << fp
            end

            floorplans
          end

          def update_floorplan_attributes(fp, r)
            update_attribute_if_blank(fp, :name, r['floorplanName'])
            update_attribute_if_blank(fp, :bedrooms, r['beds'], 'bedroom')
            update_attribute_if_blank(fp, :bathrooms, r['baths'], 'bathroom')
            update_floorplan_square_feet(fp, r['minimumSQFT'], r['sqft'])
            update_attribute_if_blank(fp, :market_rent, r['minimumRent'])
            fp.property_id = r['propertyId']
            fp.unit_count = r['']
            fp.units_available = r['']
            fp.deposit = r['minimumDeposit']
            add_floorplan_images(fp, r['floorplanImageURL'])
            add_floorplan_virtual_url(fp, r["fpVideoEmbedCode"])
            fp.save
          end

          def add_floorplan_virtual_url fp, embedded_video
            virtual_url = embedded_video&.match(/src=\"(.*?)\"/)[1] rescue ""
            fp.virtual_tour_url = virtual_url
          end


          def add_floorplan_images fp, image_urls
            primary_image = fetch_floorplan_image_url(image_urls, 0)
            secondary_image = fetch_floorplan_image_url(image_urls, 1)
            fp.image = image_base64(primary_image) if primary_image.present?
            fp.secondary_image = image_base64(secondary_image) if secondary_image.present?
          end

          def fetch_floorplan_image_url image_urls, index
            return unless image_urls.present?
            urls = image_urls&.split(",")&.reverse  
            urls[index]
          end

          def image_base64(image_url)
            return unless image_url.present?
            encoded_url = URI.encode(image_url)
            uri = URI.parse(encoded_url)
            file = uri.open
            image_data = file.read
            encoded_image = Base64.strict_encode64(image_data)
            "data:image/png;base64,#{encoded_image}"
          end

          def update_floorplan_square_feet(fp, min_sqft, sqft)
            if min_sqft.present?
              fp.square_feet = update_attribute_if_blank(fp, :square_feet, min_sqft)
            elsif sqft.present?
              fp.square_feet = update_attribute_if_blank(fp, :square_feet, sqft)
            end
          end
      end
    end
  end
end