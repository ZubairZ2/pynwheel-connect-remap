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
  end

  def map_igloohome_locks
  end

  private

    def fetch_property_locks
      @locks = IgloohomeIglooworksService.new(current_community).get_locks()["payload"]
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