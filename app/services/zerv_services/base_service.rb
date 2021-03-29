module ZervServices
    class BaseService
        def self.call(*args, &block)
            new(args[0][:community]).execute(args[0])
        end

        def initialize(community)
            @zerv = community.zerv
        end
        
        def get_id_token
            token  = Rails.cache.fetch(:id_token, expires_in: 20.minutes.from_now) do
                result = generate_id_token
                result[:error].nil? ? result[:id_token] : nil
            end

            if token.nil? or token.blank? or !Rails.cache.exist?(:id_token)
                result = generate_id_token
                token = result[:error].nil? ? result[:id_token] : nil
            end

            return token 
        end

        def generate_id_token

            result = ZervServices::LoginService.call(community: @zerv.community)

            if result.success?
                if result.payload["code"] == "200" and result.payload["status"] == "success"
                    puts "------------------- token --------------"
                    puts result.payload["idToken"]
                    puts "------------------- token --------------"
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
            locks["listGetDevices"] = locks["listGetDevices"].map{|lock| lock if lock["locationName"].downcase.parameterize.gsub("-", "").gsub("_", "") == location_name}.compact
            if locks["listGetDevices"].length == 0
              locks["listGetDevices"] = "No locks are presnet"
            end
            return locks
        end

        def get_community_time_zone(community)
            tz = Ziptz.new
            timezone = nil
        
            if community.latitude.present? and community.longitude.present?
                time_zone = Timezone.lookup(community.latitude, community.longitude)
                timezone = time_zone.name
            end

            if timezone.nil? and community.zip.present?
                timezone = tz.time_zone_name(community.zip)
            end

            return timezone.present? ? timezone : "UTC"
        rescue
            return "UTC"
        end

        def base_url
            "https://accessapi.zervinc.net/v1/portal"
        end

        def check_response(community, tour_user, stop_list, response, errors)
            if response.success?
                create_zerv_guest__success(community, tour_user, stop_list)
            else
                create_zerv_guest__failure(community, tour_user, response.error.merge(errors))
            end
        end

        def create_zerv_guest__success(community, tour_user, stop_list)
            puts '--------------------------    Zerv guest created successfully    ------------------------'
            ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
            if stop_list.present?
                stop_list.each do |stop|
                    stop.zerv_guests.create(community_id: community.id, tour_user_id: tour_user.id, status: "active") if stop.zerv_locks.last.present?
                end
            else
                ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active")
            end
            Rails.cache.delete(:id_token)
        end

        def create_zerv_guest__failure(community, tour_user, errors)
            puts '--------------------------    Failure in creating Zerv User      ------------------------'
            puts errors
            puts '--------------------------    Failure in creating Zerv User      ------------------------'
            ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
            ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active", res_errors: errors)
            Rails.cache.delete(:id_token)
        end
    end
end