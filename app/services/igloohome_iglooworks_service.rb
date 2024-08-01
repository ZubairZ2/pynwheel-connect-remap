class IgloohomeIglooworksService < BaseService

  def initialize(community)
    @community = community
    @igloohome_account =  @community.igloohome
  end

  def get_locks
    HTTParty.get(
      "#{api_base_url}/locks", 
      :headers => api_request_header
    ) 
  end

  def get_device lock_id
    HTTParty.get(
      "#{api_base_url}/locks/#{device_id}", 
      :headers => api_request_header
    ) 
  end

  private

    def api_request_header
      { 
        'X-IGLOOWORKS-APIKEY' => iglooworks_api_key,
        'Content-Type' => 'application/json' 
      }
    end

    def iglooworks_api_key
      @igloohome_account.iglooworks_api_key
    end

    def api_base_url
      "https://api.iglooworks.co/v1"
    end

    def department_id
      @department_id = "656653557c505c00096a8acd"
    end
end