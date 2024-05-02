class IgloohomeV1AccountsController < ApplicationController
  before_action :create_igloohome_account

  def create
    import_igloohome_locks_and_update_provider if params[:file].present?
    redirect_with_flash_notice_or_error
  end

  def import_single_lock
    handle_single_lock_import
    redirect_with_flash_notice_or_error
  end

  private

  def create_igloohome_account
    @igloohome = Igloohome.find_or_create_by(community_id: params[:community_id]) do |igloohome|
      igloohome.username = "testing igloohome lock"
      igloohome.password = "igloohome password"
    end
  end

  def import_igloohome_locks_and_update_provider
    @igloohome.import_data(params[:file])
    update_community_lock_provider
  end

  def update_community_lock_provider
    current_community.update_columns(multiple_locks_provider: current_community.multiple_locks_provider.concat(["Igloohome"]).uniq)
  end

  def handle_single_lock_import
    if params["device_id"].present? && params["device_name"].present?
      handle_valid_single_lock_params
    else
      flash[:error] = "Device id and device name are required"
    end
  end

  def handle_valid_single_lock_params
    igloohome_lock = @igloohome.igloohome_locks.find_by(device_id: params["device_id"])
    if igloohome_lock.present?
      flash[:alert] = "Igloohome lock with this device id already exists"
    else
      @igloohome.igloohome_locks.create(device_id: params["device_id"], device_name: params["device_name"])
      flash[:notice] = "Igloohome lock added successfully!"
    end
  end

  def redirect_with_flash_notice_or_error
    redirect_to new_community_dwelo_path(current_community)
  end
end
