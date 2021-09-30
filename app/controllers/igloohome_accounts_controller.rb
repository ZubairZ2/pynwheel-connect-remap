class IgloohomeAccountsController < ApplicationController
  before_action :set_community, :only => [:create, :remove_igloohome_locks]
  before_action :set_igloohome, :only => [:create]
  after_action :import_igloohome_locks, :update_community_lock_provider, :only => [:create]

  def create
    unless @igloohome
      @igloohome = Igloohome.new(igloohome_params)
      if @igloohome.save
        flash[:notice] = "Igloohome credentails saved successfully"
      else
        flash[:error] = igloohome_error
      end
    else
      @igloohome = Igloohome.find_by(community_id: @community.id)
      if @igloohome.update_attributes(igloohome_params)
        flash[:notice] = "Igloohome credentails updated successfully"
      else
        flash[:error] = igloohome_error
      end
    end

    redirect_to new_community_dwelo_path(@community)
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