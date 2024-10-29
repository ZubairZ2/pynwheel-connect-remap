module ZervServices
  class BaseService
    def self.call(*args, &block)
      new(args[0][:community]).execute(args[0])
    end

    def initialize(community)
      @zerv = community.zerv
    end
    
    def get_id_token
      result = generate_id_token
      token = result[:error].nil? ? result[:id_token] : nil

      return token 
    end

    def generate_id_token

      result = ZervServices::LoginService.call(community: @zerv.community)

      if result.success?
        if result.payload["code"] == "200" and result.payload["status"] == "success"
          {id_token:  result.payload["idToken"], error: nil}
        else
          {id_token:  nil, error: "api executed with status: #{result.payload["status"]}"}
        end
      else
        {id_token:  nil, error: result.error}
      end
    end

    def current_community_zerv_locks(locks)
      community = @zerv.community
      location_name = (community.company.name + ' - ' + community.name).downcase.parameterize.gsub("-", "").gsub("_", "")
      locks["listGetDevices"] = locks["listGetDevices"].map{|lock| lock if lock["locationName"].present? && ( (lock["locationName"].downcase.parameterize.gsub("-", "").gsub("_", "") == location_name) || (community.address.present? && match_address(lock["locationName"], community.address) ) ) }.compact
      if locks["listGetDevices"].length == 0
        locks["listGetDevices"] = "No locks are presnet"
      end

      return locks
    end

    def match_address zerv_device_addr, property_addr
      device_address = zerv_device_addr.split(",")
      street_address = device_address[0]
      street_address == property_addr
    end

    def base_url
      ENV["ZERV_BASE_URL"] || "https://accessapi.zervinc.net/v1/portal"
    end

    def check_response(is_resident, community, tour_user, stop_list, response, errors)
      if response.success?
        is_resident ? resident_create_zerv_guest__success(community, tour_user, stop_list) : create_zerv_guest__success(community, tour_user, stop_list)
      else
        is_resident ? resident_zerv_guest__failure(community, tour_user, response.error.merge(errors)) : create_zerv_guest__failure(community, tour_user, response.error.merge(errors))
      end
    end

    def create_zerv_guest__success(community, tour_user, stop_list)
      ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
      if stop_list.present?
        stop_list.each do |stop|
          stop.zerv_guests.create(community_id: community.id, tour_user_id: tour_user.id, status: "active")
        end
      else
        ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active")
      end

      Rails.cache.delete(:id_token)
    end

    def create_zerv_guest__failure(community, tour_user, errors)
      ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
      ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active", res_errors: errors)
      Rails.cache.delete(:id_token)
    end

    def resident_create_zerv_guest__success(community, tour_user, stop_list)
      ZervGuest.where(community_id: community.id, pynwheel_access_user_id: tour_user.id).update_all(status: "deleted")
      if stop_list.present?
        stop_list.each do |stop|
          stop.zerv_guests.create(community_id: community.id, pynwheel_access_user_id: tour_user.id, status: "active")
        end
      else
        ZervGuest.create(community_id: community.id, pynwheel_access_user_id: tour_user.id, status: "active")
      end

      Rails.cache.delete(:id_token)
    end

    def resident_zerv_guest__failure(community, tour_user, errors)
      ZervGuest.where(community_id: community.id, pynwheel_access_user_id: tour_user.id).update_all(status: "deleted")
      ZervGuest.create(community_id: community.id, pynwheel_access_user_id: tour_user.id, status: "active", res_errors: errors)
      Rails.cache.delete(:id_token)
    end
  end
end