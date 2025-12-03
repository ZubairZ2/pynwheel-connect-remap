module DataProviders
  module RentCafe
    module V1
      class DataImportService < DataProviders::RentCafe::V1::BaseService

        def perform
          property_codes = @credentials.p_code.split(',') rescue []
          property_codes.each do |property_code|
            begin

              import_property_details(property_code)
              import_property_floorplans(property_code)

              @credentials&.get_limit_result_availability()&.each do |limit_result|
                import_property_units(property_code, limit_result)
              end

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
            add_or_update_sub_communities(@community, response["name"], property_code)
          end

          def import_property_floorplans property_code
            response = get_floorplan_details(property_code)
            return unless response.present?
            process_floorplans_response(response)
          end

          def import_property_units property_code, limit_result
            response = get_appartments_availability(property_code, limit_result)
            return unless response.present?
            process_units_response(response, property_code, limit_result)
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

          def process_units_response(response, property_code, limit_result)
            incoming_ids = response.map { |r| r['ApartmentId'] }

            existing_units = Unit.where(
              provider: 'yardirentcafe',
              community_id: @community_id,
              provider_unit_id: incoming_ids
            )

            existing_units_by_id = existing_units.index_by(&:provider_unit_id)
            rentStrsHash = yardi_rent_cafe_property_rent_matrix(property_code, limit_result)

            response.each_slice(@batch_size) do |batch|
              units = build_units(batch, property_code, rentStrsHash, existing_units_by_id, limit_result)
              import_units(units)
            end
          end

          def build_units(response, property_code, rentStrsHash, existing_units_by_id, limit_result)
            units = []

            response.each do |r|
              provider_unit_id = r['ApartmentId']
              existing = existing_units_by_id[provider_unit_id]

              if existing && existing.manual_override
                next
              end

              unit = if existing
                       existing
                     else
                       Unit.new(
                         provider: 'yardirentcafe',
                         community_id: @community_id,
                         provider_unit_id:
                       )
                     end

              rentStrs = rentStrsHash[provider_unit_id] || []
              update_unit_attributes(unit, r, property_code, rentStrs, limit_result)
              units << unit
            end

            units
          end

          def update_unit_attributes(unit, r, property_code, rentStrs = [], limit_result)
            begin
              update_attribute_if_blank(unit, :marketing_name, r["ApartmentName"], 'name')
              update_attribute_if_blank(unit, :floor, evaluate_floor(unit.marketing_name))
              update_attribute_if_blank(unit, :building, evaluate_building(unit.marketing_name))
              update_attribute_if_blank(unit, :floorplan_id, r["FloorplanId"])
              update_attribute_if_blank(unit, :effective_rent, r["MinimumRent"])
              update_attribute_if_blank(unit, :availability, unit_availability(r["AvailableDate"]))
              update_attribute_if_blank(unit, :available_date, set_availabilty_date(r["AvailableDate"]))
              update_attribute_if_blank(unit, :available, unit_availability(r["AvailableDate"]) == "Unoccupied")
              unit.effective_rent = 1.0 if unit.effective_rent <= 0
              unit.availability_url = r["ApplyOnlineURL"] if r["ApplyOnlineURL"].present?
              unit.lease_pricing = calculate_lease_pricing(rentStrs)
              unit.description = unit_description(r["Amenities"]) if r["Amenities"].present?
              unit.property_id = property_code&.strip
              unit.voyager_property_code = r["VoyagerPropertyCode"]
              unit.unit_type = r["ApartmentName"]
              unit.market_rent = r["MinimumRent"]
              unit.square_feet = r["SQFT"] if r["SQFT"].present?
              unit.min_effective_rent = r["MinimumRent"] if r["MinimumRent"].present?
              unit.max_effective_rent = r["MinimumRent"] if r["MinimumRent"].present?
              unit.unit_status = r["UnitStatus"] rescue ""
              unit.show_on_map = limit_result

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
            return unless available_date.present?
            available_date = available_date.split("/")
            Date.parse("#{available_date[2]}-#{available_date[0]}-#{available_date[1]}")
          end
          
          def available_date_convertor available_date
            today_date = Date.today.strftime("%m/%d/%Y")

            if ( available_date != "" && available_date != nil )
              parsed_today_date = Date.parse(set_availabilty_date(today_date))
              parsed_available_date = Date.parse(set_availabilty_date(available_date))

              if parsed_available_date > parsed_today_date
                available_date
              else
                today_date
              end
            else
              today_date
            end
          end

          def calculate_lease_pricing(rentStrs)
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

          def process_floorplans_response(response)
            incoming_ids = response.map { |r| r['FloorplanId'] }

            existing_floorplans = Floorplan.where(
              provider: 'yardirentcafe',
              community_id: @community_id,
              provider_floorplan_id: incoming_ids
            )

            existing_floorplans_by_id = existing_floorplans.index_by(&:provider_floorplan_id)

            response.each_slice(@batch_size) do |batch|
              floorplans = build_floorplans(batch, existing_floorplans_by_id)
              # import_floorplans(floorplans)
            end
          end

          def build_floorplans(response, existing_floorplans_by_id)
            floorplans = []
            begin
              response.each do |r|
                floorplan_id = r['FloorplanId']
                existing = existing_floorplans_by_id[floorplan_id]

                if existing && existing.manual_override
                  next
                end

                fp = if existing
                              existing
                            else
                              Floorplan.new(
                                provider: 'yardirentcafe',
                                community_id: @community_id,
                                provider_floorplan_id: floorplan_id
                              )
                            end

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
              update_attribute_if_blank(fp, :name, r['FloorplanName'])
              update_attribute_if_blank(fp, :bedrooms, r['Beds'], 'bedroom')
              update_attribute_if_blank(fp, :bathrooms, r['Baths'], 'bathroom')
              update_floorplan_square_feet(fp, r['MinimumSQFT'], r['SQFT'])
              update_attribute_if_blank(fp, :market_rent, r['MinimumRent'])
              fp.property_id = r['PropertyId']
              fp.unit_count = r['']
              fp.units_available = r['']
              fp.deposit = r['MinimumDeposit']
              add_floorplan_images(fp, r['FloorplanImageURL'])
              add_floorplan_virtual_url(fp, r["FpVideoEmbedCode"])
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