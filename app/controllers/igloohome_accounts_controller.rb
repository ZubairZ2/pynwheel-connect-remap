class IgloohomeAccountsController < ApplicationController
  before_action :set_community, :only => [:create, :remove_igloohome_locks, :import_single_lock, :add_lock_instructions]
  before_action :create_igloohome_account, :only => [:create, :import_single_lock, :add_lock_instructions] 
  # after_action :import_igloohome_locks, :update_community_lock_provider, :only => [:create]

  def create
    if params[:file].present?
      import_igloohome_locks
      update_community_lock_provider

      flash[:notice] = "Igloohome Locks imported successfully"
    else
      flash[:error] = "To import locks please upload CSV file"
    end

    redirect_to new_community_dwelo_path(@community)
  end

  def import_single_lock
    if params["device_id"].present? && params["device_name"].present?
      igloohome_lock =  @igloohome.igloohome_locks.where(device_id: params["device_id"])
      
      if igloohome_lock.present?
        flash[:alert] = "Igloohome Lock with this device id already present"
      else
        update_community_lock_provider
        @igloohome.igloohome_locks.create(device_id: params["device_id"], device_name: params["device_name"])
        flash[:notice] = "Igloohome Lock added"
      end

    else
      flash[:error] = "Device id and device name is required"
    end

    redirect_to new_community_dwelo_path(@community)
  end

  def add_lock_instructions
    @igloohome.update(lock_instruction_text: params[:igloohome][:lock_instruction_text])
    flash[:notice] = "Updated successfully!"
    redirect_to new_community_dwelo_path(@community)
  end

  def upload_lock_image
    return unless params[:lock_image].present?
     @igloohome = current_community.igloohome || Igloohome.new(community_id: current_community.id)
     @igloohome.update(lock_image: params[:lock_image])
  end

  def remove_igloohome_locks 
    if @community&.igloohome&.igloohome_locks.present?
      @community.igloohome.igloohome_locks.destroy_all
      
      flash[:notice] = "Locks deleted successfully"
    else

      flash[:error] = "No locks are present"
    end

    redirect_to new_community_dwelo_path(@community)
  end

  private

  def create_igloohome_account
    @igloohome = Igloohome.find_by(community_id: params[:community_id])
    
    unless @igloohome.present? 
      @igloohome = Igloohome.create!(username: "testing igloohome lock", password: "igloohome password", community_id: params[:community_id])
    end

    @igloohome
  end

  def import_igloohome_locks
    result = @igloohome.import_data(params[:file]) if params[:file].present?
  end

  def update_community_lock_provider
    locks_provider = @community.multiple_locks_provider

    unless locks_provider.include?("Igloohome")
      locks_provider << "Igloohome" 
      @community.update_columns(:multiple_locks_provider => locks_provider)
    end
  end

  def set_community
    @community ||= Community.find_by_id(params[:community_id])
  end
end