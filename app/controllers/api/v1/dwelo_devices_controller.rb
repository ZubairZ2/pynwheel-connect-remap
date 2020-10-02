class Api::V1::DweloDevicesController < ActionController::Base
  # before_action :set_user, only: [:client_credentials, :get_all_deivces, :create_access_guest, :grant_access, :authorization_code]
  before_action :set_dwelo
  include DweloDevicesHelper

  def load_data
    dwelo_client_credentials
    token_type = "Bearer"
    auth_header = token_type + " " + @token

    url = base_url + "/v4/integrations/pynwheel/devices/?community_id=1ee788d2-92d8-43be-ade5-4a6b3cf68ed0"
    response = HTTParty.get(url,
                            :headers => {'Authorization' => auth_header,
                                         'Accept' => 'application/vnd.lockstate+json; version=1'})
    update_deivces_in_db(response, @dwelo_user)

  end

  def update_dwelo_access_guest
    if @dwelo_user.present?
      dwelo_client_credentials
      token_type = "Bearer"
      auth_header = token_type + " " + @token

      url = base_url + "/v4/integrations/pynwheel/access_persons/"

      response = HTTParty.put(url,
                              body: {
                                  id: params[:id],
                                  starts_at: params[:starts_at].to_datetime.strftime('%Y-%m-%dT%H:%M:%SZ'),
                                  ends_at: params[:ends_at].to_datetime.strftime('%Y-%m-%dT%H:%M:%SZ'),

                              }.to_json,
                              :headers => {'Authorization' => auth_header,
                                           'Accept' => 'application/vnd.lockstate+json; version=1',
                                           'Content-Type' => 'application/json'})
      @updated_dwelo_user = response
      return response
    end
  end

  def device_lock_or_unlock
    dwelo_client_credentials
    if @dwelo_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + @token

      url = base_url + "/v4/integrations/pynwheel/devices/commands/"
      response = HTTParty.post(url,
                               body: {
                                       "access_person_id": params[:access_person_id],
                                       "lock_id": params[:lock_id],
                                       "command": params[:command]
                               }.to_json,
                               :headers => {'Authorization' => auth_header,
                                            'Accept' => 'application/vnd.lockstate+json; version=1',
                                            'Content-Type' => 'application/json'})
      if response.nil?
        render :json => {:success => true, :message => "Success"}
      else
        render :json => {:success => false, :message => response["message"]}
      end
      return response
    end


  end

  def base_url
    "https://api-sandbox.dwelo.com"
  end

  private

  def set_dwelo
    @dwelo_user = Dwelo.first
  end

  def set_community
    @community = Community.find(params[:community_id])
  end
end
