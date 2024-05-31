module LatchOpenkit
  class LatchLocksService < LatchOpenkit::BaseService

    def generate_latch_doors_accesses(start_time, end_time, key_ids)
      set_parameter_for_latch(start_time, end_time, key_ids)
      partner_scopped_token = parner_scopped_access_token()

      if partner_scopped_token.present?
        response = invite_user(partner_scopped_token)
        update_latch_lock_access(response)        
      end
    end

    def generate_latch_verification_code
      user_scopped_passwordless_start()
    end

    def generate_latch_sdk_token verfication_code
      user_scopped_passwordless_token(verfication_code)
    end

    def property_latch_locks_data
      partner_scopped_token = parner_scopped_access_token()

      if partner_scopped_token.present?
        
        buildings_list = get_buildings(partner_scopped_token)
        building = filter_property_uuid(buildings_list)

        puts "\n\n\n\n Time Before: #{Time.now} \n\n\n\n"
        # doors = get_all_doors(partner_scopped_token, building["uuid"])
        doors = get_doors(partner_scopped_token, building["uuid"])
        puts "\n\n\n\n Time After: #{Time.now} \n\n\n\n"

        if building.present? && (@latch.latch_property_name&.strip === building["name"]&.strip)
          {building: building, doors: doors, status: :OK, code: 200}
        else
          {message: "No exact matches for property name", status: :unprocessable_entity, code: 400}
        end

      else
        {message: "Invalid latch credentials", status: :unprocessable_entity, code: 400}
      end
    end

    private

      # def get_all_doors(partner_scopped_token, building_uuid, page_size = 50)
      #   all_doors = []
      #   page_token = 0
      
      #   loop do
      #     response = get_doors(partner_scopped_token, building_uuid, page_size, page_token)
      #     doors = response["doors"]
      #     page_token = response["nextPageToken"]
      #     puts "\n\n\n\n nextPageToken: #{response["nextPageToken"]} \n\n\n\n"
      
      #     break if doors.empty? || page_token.nil?
      
      #     all_doors.concat(doors)
      #   end
      
      #   all_doors
      # end

      # def get_doors partner_scopped_token, building_uuid, page_size, page_token
      #   url = "#{ENV['Latch_OPENKIT_URL']}/v1/doors"

      #   query = {
      #     buildingUuid: building_uuid,
      #     pageSize: page_size,
      #     pageToken: page_token
      #   }

      #   headers = auth_headers(partner_scopped_token)

      #   HTTParty.get(url, query: query, headers: headers)
      # end

      def get_doors partner_scopped_token, building_uuid
        url = "#{ENV['Latch_OPENKIT_URL']}/v1/doors?buildingUuid=#{building_uuid}"
        headers = auth_headers(partner_scopped_token)
        HTTParty.get(url, headers: headers)
      end

      def get_buildings partner_scopped_token
        HTTParty.get(
          "#{ENV["Latch_OPENKIT_URL"]}/v1/buildings", 
          headers: auth_headers(partner_scopped_token)
        )
      end

      def filter_property_uuid(buildings_list)
        return nil if buildings_list.nil? || buildings_list["buildings"].nil?

        property = buildings_list["buildings"].find do |building|
          building["name"]&.strip == @latch.latch_property_name&.strip
        end

        property
      end

    
      def parner_scopped_access_token

        response = HTTParty.post("#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token",
                                  body: parner_scopped_access_token_payload.to_json,
                                  headers: { 'Content-Type' => 'application/json' }
                                )
        response["access_token"]
      end

      def user_scopped_passwordless_start
        HTTParty.post("#{ENV["Latch_OPENKIT_AUTH_URL"]}/passwordless/start",
                        body: user_scopped_passwordless_start_payload.to_json,
                        headers: { 'Content-Type' => 'application/json' }
                      )
      end

      def user_scopped_passwordless_token verfication_code
        HTTParty.post("#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token",
                        body: user_scopped_passwordless_token_payload(verfication_code).to_json,
                        headers: { 'Content-Type' => 'application/json' }
                      )
      end

      def invite_user partner_scopped_token
        HTTParty.post("#{ENV["Latch_OPENKIT_URL"]}/v1/users",
                        body: invite_user_payload.to_json,
                        headers: { 
                          'Content-Type' => 'application/json',
                          'Authorization' => "Bearer #{partner_scopped_token}"
                        }                                  
                      )
      end

      def auth_headers partner_scopped_token
        { 
          'Content-Type' => 'application/json',
          'Authorization' => "Bearer #{partner_scopped_token}"
        }
      end

      def invite_user_payload
        {
          "firstName": @tour_user&.first_name,
          "lastName":  @tour_user&.last_name,
          "email": @tour_user&.email,
          "startTime": @start_time&.to_i,
          "endTime": @end_time&.to_i,
          "doorUuids": @key_ids,
          "shareable": true,
          "passcodeType": "PERMANENT",
          "shouldNotify": false
        }
      end

      def user_scopped_passwordless_token_payload verfication_code
        {
          "audience": ENV["Latch_OPENKIT_URL"],
          "client_id": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_ID"],
          "client_secret": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_SECRET"],
          "grant_type": "http://auth0.com/oauth/grant-type/passwordless/otp",
          "realm": "email",
          "scope": "openid profile email offline_access",
          "username": @tour_user&.email,
          "otp": verfication_code
        }
      end

      def parner_scopped_access_token_payload
        {
          "audience": ENV["Latch_OPENKIT_URL"],
          "client_id": ENV["Latch_OPENKIT_M2M_CLIENT_ID"],
          "client_secret": ENV["Latch_OPENKIT_M2M_CLIENT_SECRET"],
          "grant_type": "client_credentials"
        }
      end

      def user_scopped_passwordless_start_payload
        {
          "client_id": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_ID"],
          "client_secret": ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_SECRET"],
          "email": @tour_user&.email,
          "connection": "email",
          "send": "code"
        }
      end

      def update_latch_lock_access response
        granted_accesses = response&.dig("doors")&.compact&.uniq

        granted_accesses&.each do |lock|
          LatchLock.where(lock_id: lock["uuid"], latch_id: @community&.latch&.id).map{|stop_data| @tour_user.latch_guests.create(community_id: @community.id, latch_link: "#{lock["uuid"]} | #{lock["name"]}", guest_of_stop_type: stop_data.stop_type.classify , guest_of_stop_id: stop_data.stop_id, start_time: @start_time.to_i, end_time: @end_time.to_i, status: "active") if stop_data.stop_type.present? and stop_data.stop_id.present?}
        end
      end
  end
end