module LatchOpenkit
  class LatchLocksService < LatchOpenkit::BaseService
    def generate_latch_doors_accesses(start_time, end_time, key_ids)
      set_parameter_for_latch(start_time, end_time, key_ids)
      token = partner_scoped_access_token
      return unless token

      response = invite_user(token)
      update_latch_lock_access(response)
    end

    def generate_latch_verification_code
      user_scoped_passwordless_start
    end

    def generate_latch_sdk_token(verification_code)
      user_scoped_passwordless_token(verification_code)
    end

    def test_connection
      token = partner_scoped_access_token
      return error_response("Invalid latch credentials") unless token

      buildings_list = get_buildings(token)
      building = filter_property_uuid(buildings_list)
      return error_response("No exact matches for property name") unless building_present?(building)

      doors = get_doors(token, building["uuid"], 5, 0)
      success_response(building, doors)
    end

    def import_property_latch_locks_data
      token = partner_scoped_access_token
      buildings_list = get_buildings(token)
      building = filter_property_uuid(buildings_list)
      get_all_doors(token, building["uuid"]) if building
    end

    private

    def get_all_doors(token, building_uuid, page_size = 10)
      all_doors = []
      page_token = 0

      loop do
        response = get_doors(token, building_uuid, page_size, page_token)
        doors = response["doors"]
        import_latch_locks_in_database(doors)
        page_token = response["nextPageToken"]
        break if doors.empty? || page_token.nil?

        all_doors.concat(doors)
      end

      all_doors
    end

    def get_doors(token, building_uuid, page_size, page_token)
      url = "#{ENV['Latch_OPENKIT_URL']}/v1/doors"
      query = { buildingUuid: building_uuid, pageSize: page_size, pageToken: page_token }
      HTTParty.get(url, query: query, headers: auth_headers(token))
    end

    def get_buildings(token)
      url = "#{ENV["Latch_OPENKIT_URL"]}/v1/buildings"
      HTTParty.get(url, headers: auth_headers(token))
    end

    def filter_property_uuid(buildings_list)
      return unless buildings_list&.dig("buildings")

      buildings_list["buildings"].find do |building|
        building["name"]&.strip == @latch.latch_property_name&.strip
      end
    end

    def partner_scoped_access_token
      url = "#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token"
      response = HTTParty.post(url, body: partner_scoped_access_token_payload.to_json, headers: json_headers)
      create_access_log(url, partner_scoped_access_token_payload, response)
      response["access_token"]
    end

    def user_scoped_passwordless_start
      url = "#{ENV["Latch_OPENKIT_AUTH_URL"]}/passwordless/start"
      response = HTTParty.post(url, body: user_scoped_passwordless_start_payload.to_json, headers: json_headers)
      create_access_log(url, user_scoped_passwordless_start_payload, response)
      response
    end

    def user_scoped_passwordless_token(verification_code)
      url = "#{ENV["Latch_OPENKIT_AUTH_URL"]}/v1/oauth/token"
      response = HTTParty.post(url, body: user_scoped_passwordless_token_payload(verification_code).to_json, headers: json_headers)
      create_access_log(url, user_scoped_passwordless_token_payload(verification_code), response)
      response
    end

    def invite_user(token)
      url = "#{ENV["Latch_OPENKIT_URL"]}/v1/users"
      response = HTTParty.post(url, body: invite_user_payload.to_json, headers: auth_headers(token))
      create_access_log(url, invite_user_payload, response)
      response
    end

    def auth_headers(token)
      { 'Content-Type' => 'application/json', 'Authorization' => "Bearer #{token}" }
    end

    def invite_user_payload
      {
        firstName: @tour_user&.first_name,
        lastName: @tour_user&.last_name,
        email: @tour_user&.email,
        startTime: @start_time&.to_i,
        endTime: @end_time&.to_i,
        doorUuids: @key_ids,
        shareable: true,
        passcodeType: "PERMANENT",
        shouldNotify: false
      }
    end

    def user_scoped_passwordless_token_payload(verification_code)
      {
        audience: ENV["Latch_OPENKIT_URL"],
        client_id: ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_ID"],
        client_secret: ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_SECRET"],
        grant_type: "http://auth0.com/oauth/grant-type/passwordless/otp",
        realm: "email",
        scope: "openid profile email offline_access",
        username: @tour_user&.email,
        otp: verification_code
      }
    end

    def partner_scoped_access_token_payload
      {
        audience: ENV["Latch_OPENKIT_URL"],
        client_id: ENV["Latch_OPENKIT_M2M_CLIENT_ID"],
        client_secret: ENV["Latch_OPENKIT_M2M_CLIENT_SECRET"],
        grant_type: "client_credentials"
      }
    end

    def user_scoped_passwordless_start_payload
      {
        client_id: ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_ID"],
        client_secret: ENV["Latch_OPENKIT_PASSWORDLESS_CLIENT_SECRET"],
        email: @tour_user&.email,
        connection: "email",
        send: "code"
      }
    end

    def create_access_log(url, payload, response)
      AccessLogsService.new.create_access_log(
        @tour_user&.id, @community&.id, @key_ids, "latch", payload, response, url, false
      )
    end

    def update_latch_lock_access(response)
      begin
        granted_accesses = response&.dig("doors")&.compact&.uniq
        granted_accesses&.each do |lock|
          LatchLock.where(lock_id: lock["uuid"], latch_id: @community&.latch&.id).each do |stop_data|
            @tour_user.latch_guests.create(
              community_id: @community.id,
              latch_link: "#{lock['uuid']} | #{lock['name']}",
              guest_of_stop_type: stop_data.stop_type.classify,
              guest_of_stop_id: stop_data.stop_id,
              start_time: @start_time.to_i,
              end_time: @end_time.to_i,
              status: "active"
            ) if stop_data.stop_type.present? && stop_data.stop_id.present?
          end
        end
      rescue => e
        log_error(e, "Error updating latch lock access", response)
      end
    end
    
    def import_latch_locks_in_database(doors)
      begin
        doors&.each do |door|
          LatchLock.find_or_create_by(lock_id: door["uuid"], lock_name: door["name"], latch_id: @community&.latch&.id)
        end
      rescue => e
        log_error(e, "Error importing latch locks into database", doors)
      end
    end
    
    private
    
    def log_error(error, message, data)
      AccessLogsService.new.create_access_log(
        @tour_user&.id,
        @community&.id,
        @key_ids,
        "latch",
        data,
        "#{message}: #{error.message}\n#{error.backtrace&.join("\n")}"
      )
    end
    
    def error_response(message)
      { message: message, status: :unprocessable_entity, code: 400 }
    end

    def success_response(building, doors)
      { building: building, doors: doors, status: :OK, code: 200 }
    end

    def building_present?(building)
      building.present? && @latch.latch_property_name&.strip == building["name"]&.strip
    end

    def json_headers
      { 'Content-Type' => 'application/json' }
    end
  end
end
