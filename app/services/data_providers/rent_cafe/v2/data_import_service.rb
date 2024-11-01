module DataProviders
  module RentCafe
    module V2
      class DataImportService < DataProviders::RentCafe::V2::BaseService

        def perform
          property_codes = @credential.p_code.split(',') rescue []
          property_codes.each do |property_code|
            begin

              import_property_details(property_code)
              import_property_floorplans(property_code)
              import_property_units(property_code)

            rescue => exception
              raise exception
            end 
          end

          update_launch_forms_status()

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
            begin
              update_attribute_if_blank(unit, :marketing_name, r["apartmentName"], 'name')
              update_attribute_if_blank(unit, :floor, evaluate_floor(unit.marketing_name))
              update_attribute_if_blank(unit, :floorplan_id, r["floorplanId"])
              update_attribute_if_blank(unit, :effective_rent, r["minimumRent"])
              update_attribute_if_blank(unit, :availability, unit_availability(r["availableDate"]))
              update_attribute_if_blank(unit, :available_date, set_availabilty_date(r["availableDate"]))
              update_attribute_if_blank(unit, :available, unit_availability(r["availableDate"]) == "Unoccupied")
              unit.effective_rent = 1.0 if unit.effective_rent <= 0
              unit.availability_url = r["applyOnlineURL"] if r["applyOnlineURL"].present?
              unit.lease_pricing = calculate_lease_pricing(property_code, r["apartmentName"], available_date_convertor(r["availableDate"]))
              unit.description = unit_description(r["amenities"]) if r["amenities"].present?
              unit.property_id = r["propertyId"]
              unit.unit_type = r["apartmentName"]
              unit.market_rent = r["minimumRent"]
              unit.square_feet = r["sqft"] if r["sqft"].present?
              unit.min_effective_rent = r["minimumRent"] if r["minimumRent"].present?
              unit.max_effective_rent = r["minimumRent"] if r["minimumRent"].present?
              unit.unit_status = r["unitStatus"] rescue ""
            rescue => exception
              exception
            end
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
            available_date = available_date.split("/")
            "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
          end
          
          def available_date_convertor(available_date)
            today_date = Date.today.strftime("%Y-%m-%d")
          
            if available_date.present?
              parsed_today_date = Date.parse(today_date)
              parsed_available_date = Date.parse(set_availabilty_date(available_date))
          
              if parsed_available_date > parsed_today_date
                parsed_available_date.strftime("%Y-%m-%d")
              else
                today_date
              end
            else
              today_date
            end
          end

          def calculate_lease_pricing(property_code, apartment_name, available_date)
            rentStrs = yardi_rent_cafe_rent_matrix(property_code, apartment_name, available_date)
            leasing = ""

            if rentStrs.present?
              rentStrs.each do |rentStr|
                if rentStr[0].to_i > 0
                  leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" + rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                end
              end
            end

            leasing
          end

          def yardi_rent_cafe_rent_matrix(property_code, apartment_name, available_date)
            begin
              rent_matrix = get_apartment_pricing_details(property_code, apartment_name, available_date)

              if rent_matrix.present?
                uniq_terms = rent_matrix.map{|x| x["term"].to_i }.distinct
                distinct_data = uniq_terms.map{|term| rent_matrix.map{|data| data if data["term"] == term.to_s}.compact}.compact
                return distinct_data.map{|data| data.map{|r| [r["rent"].to_i, r["term"], r["start_Date"], r["end_Date"]]}.min}
              else
                return nil
              end
            rescue => exception
              raise exception
            end
          end

          def process_floorplans_response(response)
            response.each_slice(@batch_size) do |batch|
              floorplans = build_floorplans(batch)
              # import_floorplans(floorplans)
            end
          end

          def build_floorplans(response)
            floorplans = []
            begin
              response.each do |r|
                fp = Floorplan.find_or_initialize_by(provider: 'yardirentcafe', community_id: @community_id, provider_floorplan_id: r['floorplanId'])
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
            rescue => exception
              raise exception
            end
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