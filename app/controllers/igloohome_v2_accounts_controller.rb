class IgloohomeV2AccountsController < ApplicationController
  before_action :set_user
  before_action :set_igloohome, only: [:map_igloohome_locks]
  before_action :set_igloohome_property_id, only: [:test_igloohome_connection, :import_igloohome_locks]
  before_action :fetch_property_devices, only: [:test_igloohome_connection, :import_igloohome_locks]

  def new
    @igloohome = Igloohome.new
  end

  def igloohome_code_grant_authorization
    return redirect_with_error("Authorization code missing") unless authorization_params_present?
  
    response = IgloohomeLockService.new(current_community&.id).code_grant_authorization(session[:authorization_code])
    return redirect_with_error("Failed to authorize Igloohome lock") unless response.present?
  
    handle_successful_authorization(response)
  end

  def create
    locks_provider = current_community.multiple_locks_provider
    locks_provider << "Igloohome" unless locks_provider.include?("Igloohome")
    unless @is_already_exists
      @igloohome = Igloohome.new(igloohome_params)
      if @igloohome.save
        current_community.update_columns(multiple_locks_provider: locks_provider)
        Community.find(params[:community_id]).update!(:multiple_locks_provider => locks_provider)
        flash[:notice] = "Igloohome credentails saved successfully"
        redirect_to new_community_dwelo_path
      else
        flash[:error] = @igloohome.errors.full_messages.join(',')
        render :new
      end
    else
      @igloohome = Igloohome.find_by(community_id: current_community.id)
      if @igloohome.update_attributes(igloohome_params)
        current_community.update_columns(:multiple_locks_provider => locks_provider)
        @igloohome.update_attributes(is_authorized_with_pynwheel: false) if @igloohome.is_authorized_with_pynwheel
        flash[:notice] = "Igloohome credentails updated successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = @igloohome.errors.full_messages.join(',') 
        render :new
      end
    end
  end

  def destroy
    @igloohome  = Igloohome.find(params[:id])
    @igloohome.destroy
  end

  def test_igloohome_connection
    render xml: @devices
  end
  
  def import_igloohome_locks
    store_devices
    flash[:notice] = "Igloohome locks imported successfully."
    render :js => "window.location = '/communities/#{current_community&.id}/dwelos/new'"
  end

  def map_igloohome_locks
    @igloohome.map_locks_with_stops
    flash[:notice] =  "Locks are automapped successfully."
    redirect_to new_community_dwelo_path(current_community)
  end

  def remove_igloohome_auth_account
    if current_community.igloohome.present?
      if current_community.igloohome.refresh_token.present?
        current_community.igloohome.update_attributes(refresh_token: nil, is_authorized_with_pynwheel: false)
        flash[:notice] = "Account disconnected successfully"
      else
        flash[:error] = "No account is attached"
      end
    else
      flash[:error] = "Credentials for igloohome are missing"
    end

    redirect_to new_community_dwelo_path(current_community)
  end

  def update_igloo_auth_toggle
    is_authorized = params.dig(:is_authorized_with_pynwheel)
    current_community.igloohome.update(is_authorized_with_pynwheel: is_authorized == "true") if is_authorized.present?
  end

  def update_igloo_home_name
    current_community.igloohome.update(home_name: params.dig("igloohome", "home_name"))
  end
  
  private

    def store_devices
      locks = current_community.igloohome.igloohome_locks
      locks_by_id = locks.index_by(&:device_id)
    
      @devices.each do |device|
        lock = locks_by_id[device["deviceId"]]
        lock ? lock.update(device_name: device["deviceName"]) : locks.create(device_id: device["deviceId"], device_name: device["deviceName"])
      end
    end
  

    def fetch_property_devices
      @devices = IgloohomeLockService.new(current_community&.id).get_property_devices(@property_id)["payload"]
      general_error_redirection unless @devices.present?
    end

    def set_igloohome_property_id
      properties = IgloohomeLockService.new(current_community.id).get_properties
      property_data = properties.fetch("payload", []).find { |property| property["name"] === current_community&.igloohome&.home_name }
      @property_id = property_data["id"]
      
    rescue
      home_name_error
    end

    def home_name_error
      flash[:error] = "No device found, Confirm entered home name is correct"
      redirect_to new_community_dwelo_path
    end

    def authorization_params_present?
      params.present? && session[:authorization_code].present?
    end
    
    def handle_successful_authorization(response)
      begin
        update_community_locks_provider
        session[:authorization_code] = ''
      rescue StandardError => e
        Rails.logger.error("Error while authorizing Igloohome lock: #{e.message}")
      end
    
      flash[:notice] = "Igloohome lock authorized successfully"
      redirect_to new_community_dwelo_path
    end
    
    def general_error_redirection
      flash[:error] = "Something wrong! Please make sure you authorized with Igloohome"
      redirect_to new_community_dwelo_path(current_community)
    end

    def update_igloohome_account(refresh_token)
      igloohome_account = current_community.igloohome
      igloohome_account.update(refresh_token: refresh_token, is_authorized_with_pynwheel: true) if igloohome_account.present?
    end
    
    def update_community_locks_provider
      locks_provider = current_community.multiple_locks_provider
      locks_provider << "Igloohome" unless locks_provider.include?("Igloohome")
      current_community.update_columns(multiple_locks_provider: locks_provider)
    end
    
    def redirect_with_error(message)
      flash[:error] = message
      redirect_to new_community_dwelo_path
    end

    def igloohome_params
      params.require(:igloohome).permit(:client_id, :client_secret, :community_id)
    end

    def set_user
      @is_already_exists = Igloohome.find_by(community_id: current_community.id).present?
    end

    def set_igloohome
      @igloohome = current_community.igloohome

      unless @igloohome.present?
        flash[:error] = "Please enter the igloohome credentials before testing data."
        redirect_to new_community_dwelo_path(current_community)
      end
    end
end