class IgloohomeIglooworksAccountsController < ApplicationController
  before_action :create_igloohome_account
  before_action :fetch_property_locks, only: [:test_igloohome_connection, :import_igloohome_locks]

  def create
    @igloohome.update(iglooworks_api_key: params[:iglooworks_api_key])
    redirect_to new_community_dwelo_path(current_community)
    flash[:notice] = "API key added successfully!"
  end

  def test_igloohome_connection
    render xml: @locks
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

  private

    def store_devices
      locks = current_community.igloohome.igloohome_locks
      locks_by_id = locks.index_by(&:device_id)
    
      @locks.each do |device|
        lock = locks_by_id[device["lockId"]]
        lock ? lock.update(device_name: device["lockName"]) : locks.create(device_id: device["lockId"], device_name: device["lockName"])
      end
    end

    def fetch_property_locks
      @locks = IgloohomeIglooworksService.new(current_community.id).get_locks()["payload"]
      general_error_redirection unless @locks.present?
    end

    def create_igloohome_account
      @igloohome = Igloohome.find_or_create_by(community_id: params[:community_id]) do |igloohome|
        igloohome.username = "testing igloohome lock"
        igloohome.password = "igloohome password"
      end
    end

    def general_error_redirection
      flash[:error] = "Something wrong! Please make sure you entered the correct API key"
      redirect_to new_community_dwelo_path(current_community)
    end
end