module SalesforceServices
    class BaseService
        def self.call(*args, &block)
            new(args[0][:community]).execute(args[0])
        end

        def initialize(community)
            @sales_force = community.credential.crm_provider == "salesforce" ? community.credential : nil
        end
        
        def get_access_token
            # token  = Rails.cache.fetch(:access_token, expires_in: 1.day.from_now) do
            #     generate_access_token
            # end
            token = generate_access_token # if token.nil? or token.blank?
            return token 
        end

        def generate_access_token
            SalesforceServices::AuthToken.call(community: @sales_force.community)
        end

        def base_url
            "https://prometheusreg--promuat.my.salesforce.com/services/apexrest"
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

            return timezone
        rescue
            return nil
        end
    end
end