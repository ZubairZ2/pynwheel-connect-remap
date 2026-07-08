module DataProviders
  module RentCafe
    module V2
      class DataImportService < DataProviders::RentCafe::V2::BaseService

        def perform
          property_codes = @credentials.p_code.split(',') rescue []
          property_codes.each do |property_code|
            begin

              import_property_details(property_code)
              floorplans = get_floorplan_details(property_code)
              indexed_floorplans = import_property_floorplans(floorplans, property_code)

              @credentials&.get_limit_result_availability()&.each do |limit_result|
                import_property_units(indexed_floorplans, property_code, limit_result)
              end

            rescue => exception
              raise exception
            end
          end

          update_launch_forms_status()
          update_floorplan_unit_counts()

        end

        private

          # Recomputes each floorplan's unit_count from the units actually imported.
          # Units store the floorplan's provider_floorplan_id in units.floorplan_id
          # (indexed), so a single grouped COUNT gives every floorplan's total at once
          # instead of one query per floorplan. We only write the rows whose count
          # changed, and via update_columns to skip validations/callbacks.
          def update_floorplan_unit_counts
            counts = Unit.where(community_id: @community_id, provider: 'yardirentcafe')
                         .where.not(floorplan_id: nil)
                         .group(:floorplan_id)
                         .count

            changed = false
            Floorplan.where(community_id: @community_id, provider: 'yardirentcafe').find_each do |fp|
              new_count = counts[fp.provider_floorplan_id].to_i
              next if fp.unit_count == new_count

              fp.update_columns(unit_count: new_count)
              changed = true
            end

            SdkCacheService.invalidate_fetch_data(@community_id) if changed
          end

          def import_property_details property_code
            response = get_property_details(property_code)

            return unless response.present?

            update_property_details(response)
            add_or_update_sub_communities(@community, response["name"], property_code)
          end

          def import_property_floorplans(floorplans, property_code)
            
            return unless floorplans.present?
            process_floorplans_response(floorplans)
          end

          def import_property_units(indexed_floorplans, property_code, limit_result)
            response = get_appartments_availability(property_code, limit_result)
            return unless response.present?
            process_units_response(response, property_code, indexed_floorplans, limit_result)
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

          def process_units_response(response, property_code, indexed_floorplans, limit_result)
            incoming_ids = response.map { |r| r['apartmentId'] }

            existing_units = Unit.where(
              provider: 'yardirentcafe',
              community_id: @community_id,
              provider_unit_id: incoming_ids
            )

            existing_units_by_id = existing_units.index_by(&:provider_unit_id)
            rentStrsHash = yardi_rent_cafe_property_rent_matrix(property_code, limit_result)

            response.each_slice(@batch_size) do |batch|
              units = build_units(batch, property_code, rentStrsHash, existing_units_by_id, indexed_floorplans, limit_result)
              import_units(units)
            end

            assign_unit_images(response)
          end

          # Units are persisted via bulk `Unit.import`, which bypasses CarrierWave
          # callbacks, so unit images can't be stored during `build_units`. Instead we
          # download and store them here (post-import) via an individual save so the
          # `mount_uploader :image` upload/versioning actually runs.
          def assign_unit_images(response)
            image_urls_by_unit_id = response.each_with_object({}) do |r, memo|
              image_url = fetch_unit_image_url(r["unitImageURLs"])
              provider_unit_id = r['apartmentId']&.to_s&.strip
              memo[provider_unit_id] = image_url if provider_unit_id.present? && image_url.present?
            end

            return if image_urls_by_unit_id.blank?

            # Only load the columns we need to decide eligibility; the slow work
            # (download + RMagick + S3 upload) is fanned out to Sidekiq so the sync
            # thread returns immediately and images process in parallel.
            Unit.where(
              provider: 'yardirentcafe',
              community_id: @community_id,
              provider_unit_id: image_urls_by_unit_id.keys
            ).select(:id, :provider_unit_id, :manual_override, :image).find_each do |unit|
              next if unit.manual_override
              # Only download the first time so we don't re-fetch every unit image on
              # each sync; a manual override / existing image is left untouched.
              next if unit.image.present?

              image_url = image_urls_by_unit_id[unit.provider_unit_id]
              next unless image_url.present?

              AssignUnitImageJob.perform_later(unit.id, image_url)
            end
          end

          def fetch_unit_image_url(image_urls)
            return unless image_urls.present?
            image_urls.to_s.split(",").map(&:strip).reject(&:blank?).find { |url| valid_image_url?(url) }
          end

          # Guards against handing junk to CarrierWave's `remote_image_url=`, which would
          # otherwise attempt (and fail) to download non-HTTP or malformed strings.
          def valid_image_url?(url)
            uri = URI.parse(url)
            uri.is_a?(URI::HTTP) && uri.host.present?
          rescue URI::InvalidURIError
            false
          end

          def build_units(response, property_code, rentStrsHash, existing_units_by_id, indexed_floorplans, limit_result)
            units = []

            response.each do |r|
              provider_unit_id = r['apartmentId']&.to_s&.strip
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
              update_unit_attributes(unit, r, property_code, indexed_floorplans, rentStrs, limit_result)
              units << unit
            end

            units
          end

          def update_unit_attributes(unit, r, property_code, indexed_floorplans, rentStrs = [], limit_result)
            begin
              floorplan = indexed_floorplans[r["floorplanId"].to_s]
              update_attribute_if_blank(unit, :marketing_name, r["apartmentName"], 'name')
              update_attribute_if_blank(unit, :floor, evaluate_floor(unit.marketing_name))
              # update_attribute_if_blank(unit, :building, evaluate_building(unit.marketing_name))

              if floorplan.present?
                update_attribute_if_blank(unit, :floorplan_id, floorplan.provider_floorplan_id)
              end
              update_attribute_if_blank(unit, :effective_rent, r["minimumRent"])
              update_attribute_if_blank(unit, :availability, unit_availability(r["availableDate"]))
              update_attribute_if_blank(unit, :available_date, set_availabilty_date(r["availableDate"]))
              update_attribute_if_blank(unit, :available, unit_availability(r["availableDate"]) == "Unoccupied")
              unit.effective_rent = 1.0 if unit.effective_rent <= 0
              unit.availability_url = r["applyOnlineURL"] if r["applyOnlineURL"].present?
              unit.lease_pricing = calculate_lease_pricing(rentStrs)
              unit.description = unit_description(r["amenities"]) if r["amenities"].present?
              unit.property_id = property_code&.strip
              unit.voyager_property_code = r["voyagerPropertyCode"]
              unit.unit_type = r["apartmentName"]
              unit.market_rent = r["minimumRent"]
              unit.square_feet = r["sqft"] if r["sqft"].present?
              unit.min_effective_rent = r["minimumRent"] if r["minimumRent"].present?
              unit.max_effective_rent = r["maximumRent"] if r["maximumRent"].present?
              unit.unit_status = r["unitStatus"] rescue ""
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
            incoming_ids = response.map { |r| r['floorplanId'] }

            existing_floorplans = Floorplan.where(
              provider: 'yardirentcafe',
              community_id: @community_id,
              provider_floorplan_id: incoming_ids
            )

            existing_floorplans_by_id = existing_floorplans.index_by(&:provider_floorplan_id)

            response.each_slice(@batch_size) do |batch|
              floorplans = build_floorplans(batch, existing_floorplans_by_id)
            end

            existing_floorplans_by_id
          end

          def build_floorplans(response, existing_floorplans_by_id)
            floorplans = []
            begin
              response.each do |r|
                # provider_floorplan_id is a string column, so existing_floorplans_by_id
                # is keyed by strings. RentCafe returns floorplanId as an integer, so we
                # must normalize or the lookup misses, a duplicate Floorplan is built, and
                # the uniqueness validation silently rolls the save back.
                floorplan_id = r['floorplanId'].to_s
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
                existing_floorplans_by_id[floorplan_id] = fp
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
              # RentCafe only reports available units, not a total unit count, so we
              # leave unit_count untouched rather than nil it out on every sync.
              fp.units_available = r['availableUnitsCount']
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