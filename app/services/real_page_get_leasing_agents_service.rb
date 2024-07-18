class RealPageGetLeasingAgentsService < BaseService
    def perform(community)
        get_leasing_agents(community)
    end

    def get_leasing_agents(community)
        use_crm_credentials = community.use_crm_credentials?
        site_ids = (use_crm_credentials ? community.crm_credential.realpage_site_id.split(',') : credentials.site_id.split(',')) rescue []
        site_ids.each do |site_id|
          begin
            site_id = site_id&.strip
            community_id = credentials.community_id
            response = DataProviders::RealPage::V1ApisService.new(community_id).fetch_leasing_agents_by_property(site_id)
            result = Ox.load(response.body, mode: :hash)

            begin
              agents = result[:"s:Envelope"][1][:"s:Body"][1][:getleasingagentsbypropertyResponse][1][:getleasingagentsbypropertyResult][:GetLeasingAgentsByProperty][1][:Contents][:PicklistItem]
              if agents.include?({:Value=>"0", :Text=>"House"})
                agent = {:Value=>"0", :Text=>"House"}
              else
                agent = nil
              end
            rescue => e
              agent = {:Value=>"0", :Text=>"House"}
            end
            puts agent
            return agent
          rescue => e
            begin
              cred = Credential.find credentials.id
              cred.data_error_message = "Get Leasing Agents from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
              PaperTrail.enabled = false
              cred.save
              PaperTrail.enabled = true
            rescue => err
            end
          end
        end
    end
end