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
            location_name_1 = community.company.name.downcase + ' - ' + community.name.downcase
            location_name_2 = community.company.name.downcase + '-' + community.name.downcase
            locks["listGetDevices"] = locks["listGetDevices"].map{|lock| lock if lock["locationName"].downcase == location_name_1 or lock["locationName"].downcase == location_name_2}.compact
            if locks["listGetDevices"].length == 0
              locks["listGetDevices"] = "No locks are presnet"
            end
            return locks
        end

        def base_url
            "https://api.zervinc.net/v1/portal"
        end
    end
end