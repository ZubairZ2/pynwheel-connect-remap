class IgloohomeAccountsController < ApplicationController
  before_action :set_community
  before_action :set_igloohome
  
  def new
    @igloohome = Igloohome.new
  end

  def create
    unless @igloohome
      @igloohome = Igloohome.new(igloohome_params)
      if @igloohome.save
        # import_igloohome_csv_data
        update_community_lock_provider

        flash[:notice] = "Igloohome credentails saved successfully"
      else
        flash[:error] = igloohome_error
      end
    else
      @igloohome = Igloohome.find_by(community_id: @community.id)
      if @igloohome.update_attributes(igloohome_params)
        # import_igloohome_csv_data
        update_community_lock_provider

        flash[:notice] = "Igloohome credentails updated successfully"
      else
        flash[:error] = igloohome_error
      end
    end

    redirect_to new_community_dwelo_path(@community)
  end

  def remove_igloohome_locks 
    if @community.igloohome.present?
      if @community.igloohome.igloohome_locks.present?
        @community.igloohome.igloohome_locks.destroy_all
        flash[:notice] = "Locks deleted successfully"
      else
        flash[:error] = "No locks are present"
      end
    else
      flash[:error] = "Credentials for igloohome are missing"
    end

    redirect_to new_community_dwelo_path(@community)
  end

  private

  def import_igloohome_csv_data
    # result = parse_csv(params[:file]) if params[:file].present?
  end

  def update_community_lock_provider
    locks_provider = @community.multiple_locks_provider
    locks_provider << "Igloohome" unless locks_provider.include?("Igloohome")

    @community.update_columns(:multiple_locks_provider => locks_provider)
  end

  def igloohome_error
    @igloohome.errors.full_messages.join(',')
  end

  def set_community
    @community ||= Community.find_by_id(params[:community_id])
  end

  def set_igloohome
    @igloohome ||= Igloohome.find_by(community_id: params[:community_id])
  end

  def igloohome_params
    params.require(:igloohome).permit(:username, :password, :community_id)
  end
end