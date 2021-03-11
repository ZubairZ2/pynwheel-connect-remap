class Api::V1::DweloDevicesController < ActionController::Base
  # before_action :set_user, only: [:client_credentials, :get_all_deivces, :create_access_guest, :grant_access, :authorization_code]
  include DweloDevicesHelper
  include Error::ErrorHandler
  def load_data
    dwelo_community_account = Dwelo.find(params[:dwelo_account_id]) rescue nil
    @community = dwelo_community_account.community
    dwelo_client_credentials(dwelo_community_account)
    token_type = "Bearer"
    auth_header = token_type + " " + @token rescue ''

    url = base_url + "/v4/integrations/pynwheel/devices/?community_id=" + dwelo_community_account.default_community_id + "&per_page=1000"
    response = HTTParty.get(url,
                            :headers => {'Authorization' => auth_header,
                                         'Accept' => 'application/vnd.lockstate+json; version=1'})
    if response["data"].present?
      update_deivces_in_db(response, dwelo_community_account)
      flash[:notice] = "Locks imported successfully."
      render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
    elsif response["data"].class == Array and response["data"].length == 0
      flash[:notice] = "No locks are present against your account"
      render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
    else
      flash[:error] = "Something went wrong, please check your credentials."
      render :js => "window.location = '/communities/#{@community.id}/dwelos/new'"
    end
  end

  def update_dwelo_access_guest
    if @dwelo_user.present?
      # dwelo_client_credentials
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
    # dwelo_client_credentials
    # 422eacec-dfac-4cca-bf40-6fe5d43a09ce

      dwelo_community_account= Dwelo.find_by(community_id: params[:community_id])
      token_type = "Bearer"
      dwelo_client_credentials(dwelo_community_account)
      auth_header = token_type + " " + @token
      tour_user = TourUser.find_by_id params[:tour_user_id]

      guest_id = tour_user.as_guests.where(community_id: params[:community_id]).last.guest_id if tour_user.present? and tour_user.as_guests.where(community_id: params[:community_id]).present?

      request_body = { "access_person_id": guest_id, "lock_id": params[:lock_id], "command": params[:command] }
      puts "--------------------------- commands request ----------------------------"
      puts request_body

      url = base_url + "/v4/integrations/pynwheel/devices/commands/"
      response = HTTParty.post(url,
                               body: {
                                   "access_person_id": guest_id,
                                   "lock_id": params[:lock_id],
                                   "command": params[:command]
                               }.to_json,
                               :headers => {'Authorization' => auth_header,
                                            'Accept' => 'application/vnd.lockstate+json; version=1',
                                            'Content-Type' => 'application/json'})

      puts "--------------------------- commands response ----------------------------"
      puts response

      if response.nil?
        render :json => {:success => true, :message => "Success"}
      else
        render :json => {:success => false, :message => response["message"]}
      end
      return response



  end

  def base_url
    "https://api.dwelo.com"
  end

  private

  def set_dwelo
    @dwelo_user = Dwelo.find_by(community_id: params[:community_id])
  end

  def set_community
    @community = Community.find(params[:community_id])
  end
end